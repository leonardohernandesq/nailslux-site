import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Service } from "../db/models";

export type ServiceDTO = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes?: number;
  active: boolean;
  order: number;
};

type LeanService = {
  _id: unknown;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes?: number | null;
  active?: boolean | null;
  order?: number | null;
};

export function toServiceDTO(doc: LeanService): ServiceDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description ?? undefined,
    priceCents: doc.priceCents,
    durationMinutes: doc.durationMinutes ?? undefined,
    active: doc.active ?? true,
    order: doc.order ?? 0,
  };
}

const SORT = { order: 1, createdAt: 1 } as const;

/** Active services shown on the public site. Cached until a service changes. */
export async function getPublicServices(): Promise<ServiceDTO[]> {
  "use cache";
  cacheTag(CACHE_TAGS.services);
  cacheLife("days");

  await connectDB();
  const docs = await Service.find({ active: true }).sort(SORT).lean<LeanService[]>();
  return docs.map(toServiceDTO);
}

/** All services, including hidden ones. Admin only. */
export async function getAllServices(): Promise<ServiceDTO[]> {
  await requireAdmin();
  await connectDB();
  const docs = await Service.find().sort(SORT).lean<LeanService[]>();
  return docs.map(toServiceDTO);
}

export async function getServiceById(id: string): Promise<ServiceDTO | null> {
  await requireAdmin();
  await connectDB();
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  const doc = await Service.findById(id).lean<LeanService>();
  return doc ? toServiceDTO(doc) : null;
}
