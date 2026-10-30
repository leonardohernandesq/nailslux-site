import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, TENANT_SLUG_PATTERN } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import type { OpeningHours, Weekday } from "../site";

export type TenantDTO = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  whatsappNumber: string;
  instagramUrl: string | null;
  address: string | null;
  hours: OpeningHours;
};

type LeanTenant = {
  _id: unknown;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  whatsappNumber: string;
  instagramUrl?: string | null;
  address?: string | null;
  hours: Omit<OpeningHours, "days"> & { days: number[] };
};

function toTenantDTO(doc: LeanTenant): TenantDTO {
  const tagline = doc.tagline ?? "Studio de unhas";
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    tagline,
    description:
      doc.description ??
      `${doc.name}: ${tagline.toLowerCase()}. Escolha o serviço, a data e a hora e marque pelo WhatsApp.`,
    whatsappNumber: doc.whatsappNumber,
    instagramUrl: doc.instagramUrl ?? null,
    address: doc.address ?? null,
    hours: {
      days: doc.hours.days as Weekday[],
      opens: doc.hours.opens,
      lastStart: doc.hours.lastStart,
      slotMinutes: doc.hours.slotMinutes,
      maxDaysAhead: doc.hours.maxDaysAhead,
    },
  };
}

/**
 * The studio behind a public URL, or null if there's none or it's suspended.
 * `slug` comes from the browser, so it's checked before reaching the database.
 */
export async function getActiveTenant(slug: string): Promise<TenantDTO | null> {
  return TENANT_SLUG_PATTERN.test(slug) ? loadActiveTenant(slug) : null;
}

async function loadActiveTenant(slug: string): Promise<TenantDTO | null> {
  "use cache";
  cacheTag(CACHE_TAGS.tenant(slug));
  cacheLife("days");

  await connectDB();
  const doc = await Tenant.findOne({ slug, status: "active" }).lean<LeanTenant>();
  return doc ? toTenantDTO(doc) : null;
}

export async function getTenantById(id: string): Promise<TenantDTO | null> {
  await connectDB();
  const doc = await Tenant.findById(id).lean<LeanTenant>();
  return doc ? toTenantDTO(doc) : null;
}

/** Studios prerendered at build time; the rest render on their first visit. */
export async function getActiveTenantSlugs(): Promise<string[]> {
  await connectDB();
  const docs = await Tenant.find({ status: "active" }, { slug: 1 }).lean();
  return docs.map((doc) => doc.slug);
}
