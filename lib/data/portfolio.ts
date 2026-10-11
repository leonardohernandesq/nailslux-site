import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { PortfolioItem } from "../db/models";

export type PortfolioItemDTO = {
  id: string;
  src: string;
  width: number;
  height: number;
  blurDataUrl: string;
  caption?: string;
};

type LeanItem = {
  _id: unknown;
  fileId: unknown;
  width: number;
  height: number;
  blurDataUrl: string;
  caption?: string | null;
};

export function toPortfolioDTO(doc: LeanItem): PortfolioItemDTO {
  return {
    id: String(doc._id),
    src: `/api/images/${String(doc.fileId)}`,
    width: doc.width,
    height: doc.height,
    blurDataUrl: doc.blurDataUrl,
    caption: doc.caption ?? undefined,
  };
}

// Newest first by default; `order` lets the admin pin photos to the top.
const SORT = { order: -1, createdAt: -1 } as const;

export async function getPublicPortfolio(): Promise<PortfolioItemDTO[]> {
  "use cache";
  cacheTag(CACHE_TAGS.portfolio);
  cacheLife("days");

  await connectDB();
  const docs = await PortfolioItem.find().sort(SORT).limit(60).lean<LeanItem[]>();
  return docs.map(toPortfolioDTO);
}

export async function getAdminPortfolio(): Promise<PortfolioItemDTO[]> {
  await requireAdmin();
  await connectDB();
  const docs = await PortfolioItem.find().sort(SORT).lean<LeanItem[]>();
  return docs.map(toPortfolioDTO);
}
