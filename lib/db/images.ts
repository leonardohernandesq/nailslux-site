import mongoose from "mongoose";
import sharp from "sharp";
import { Readable } from "node:stream";
import { PORTFOLIO_MAX_EDGE } from "../constants";
import { connectDB } from "./connect";

// Photos live in MongoDB GridFS, so the app needs no extra storage service.
// To move to S3/Cloudinary later, only this module has to change.

const BUCKET = "portfolio";

async function bucket() {
  const { connection } = await connectDB();
  if (!connection.db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(connection.db, { bucketName: BUCKET });
}

export type ProcessedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  blurDataUrl: string;
};

/** Fixes orientation, strips metadata, resizes and converts to WebP. */
export async function processImage(input: Buffer, maxEdge = PORTFOLIO_MAX_EDGE): Promise<ProcessedImage> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/** A square PNG for the browser tab; PNG is what every browser takes as an icon. */
export function processIcon(input: Buffer, size = 180): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * The picture for link previews: the image centered on a white 1200x630 card, the
 * shape WhatsApp and others expect, with margins so their cropping doesn't cut it.
 */
export async function renderShareImage(input: Buffer): Promise<Buffer> {
  const fitted = await sharp(input).resize(1000, 500, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return sharp({ create: { width: 1200, height: 630, channels: 3, background: "#ffffff" } })
    .composite([{ input: fitted }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function saveImage(buffer: Buffer, filename: string, contentType = "image/webp"): Promise<mongoose.Types.ObjectId> {
  const b = await bucket();
  const upload = b.openUploadStream(filename, { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });
  return upload.id as mongoose.Types.ObjectId;
}

export async function readImage(
  id: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  const b = await bucket();
  const objectId = new mongoose.Types.ObjectId(id);
  const [file] = await b.find({ _id: objectId }).limit(1).toArray();
  if (!file) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of b.openDownloadStream(objectId)) chunks.push(chunk as Buffer);
  return {
    buffer: Buffer.concat(chunks),
    contentType: (file.metadata?.contentType as string | undefined) ?? "image/webp",
  };
}

export async function deleteImage(id: mongoose.Types.ObjectId): Promise<void> {
  const b = await bucket();
  try {
    await b.delete(id);
  } catch (error) {
    // Already gone is fine; anything else should surface.
    if (!(error instanceof Error && /File not found/i.test(error.message))) throw error;
  }
}
