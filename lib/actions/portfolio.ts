"use server";

import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS, PORTFOLIO_MAX_ITEMS } from "../constants";
import { connectDB } from "../db/connect";
import { deleteImage, processImage, saveImage } from "../db/images";
import { PortfolioItem } from "../db/models";
import { captionSchema, portfolioUploadSchema } from "../validation/portfolio";
import { objectIdSchema } from "../validation/service";
import type { FormState } from "./form-state";
import { invalidate } from "./invalidate";

const portfolioFullMessage = `Atingiu o limite de ${PORTFOLIO_MAX_ITEMS} fotografias. Remova uma para adicionar outra.`;

/** Uploads one photo. The admin UI calls this once per selected file. */
export async function uploadPortfolioPhoto(formData: FormData): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const parsed = portfolioUploadSchema.safeParse({
    file: formData.get("file"),
    caption: formData.get("caption") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Fotografia inválida." };
  }

  await connectDB();
  if ((await PortfolioItem.countDocuments({ tenantId })) >= PORTFOLIO_MAX_ITEMS) {
    return { status: "error", message: portfolioFullMessage };
  }

  let image;
  try {
    image = await processImage(Buffer.from(await parsed.data.file.arrayBuffer()));
  } catch {
    return { status: "error", message: "Não foi possível ler esta imagem. Tente outra fotografia." };
  }

  const fileId = await saveImage(image.buffer, parsed.data.file.name);
  try {
    await PortfolioItem.create({
      tenantId,
      fileId,
      width: image.width,
      height: image.height,
      blurDataUrl: image.blurDataUrl,
      caption: parsed.data.caption,
    });
  } catch (error) {
    await deleteImage(fileId);
    throw error;
  }

  invalidate(CACHE_TAGS.portfolio(tenantId));
  return { status: "success", message: "Fotografia adicionada." };
}

export async function updatePortfolioCaption(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const itemId = objectIdSchema.safeParse(id);
  const caption = captionSchema.safeParse(formData.get("caption") ?? undefined);
  if (!itemId.success) return { status: "error", message: "Fotografia não encontrada." };
  if (!caption.success) {
    return { status: "error", message: caption.error.issues[0]?.message };
  }

  await connectDB();
  await PortfolioItem.findOneAndUpdate(
    { _id: itemId.data, tenantId },
    caption.data ? { caption: caption.data } : { $unset: { caption: 1 } },
  );
  invalidate(CACHE_TAGS.portfolio(tenantId));
  return { status: "success", message: "Legenda guardada." };
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const { tenantId } = await requireAdmin();
  const itemId = objectIdSchema.parse(id);
  await connectDB();
  const item = await PortfolioItem.findOneAndDelete({ _id: itemId, tenantId });
  if (item) await deleteImage(item.fileId);
  invalidate(CACHE_TAGS.portfolio(tenantId));
}
