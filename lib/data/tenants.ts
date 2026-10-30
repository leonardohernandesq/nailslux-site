import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS, TENANT_SLUG_PATTERN } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant, type TenantStatus } from "../db/models";
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
  status: TenantStatus;
  emailConfirmed: boolean;
  /** Stripe's status for the subscription, null if there has never been one. */
  subscriptionStatus: string | null;
  hasBillingAccount: boolean;
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
  status: TenantStatus;
  emailConfirmedAt?: Date | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
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
    status: doc.status,
    emailConfirmed: Boolean(doc.emailConfirmedAt),
    subscriptionStatus: doc.subscriptionStatus ?? null,
    hasBillingAccount: Boolean(doc.stripeCustomerId),
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

/** Tells a suspended site, which gets a notice, from an unknown slug, which gets a 404. */
export async function isTenantSuspended(slug: string): Promise<boolean> {
  return TENANT_SLUG_PATTERN.test(slug) ? loadTenantSuspended(slug) : false;
}

async function loadTenantSuspended(slug: string): Promise<boolean> {
  "use cache";
  cacheTag(CACHE_TAGS.tenant(slug));
  cacheLife("days");

  await connectDB();
  return (await Tenant.exists({ slug, status: "suspended" })) !== null;
}

export async function getTenantById(id: string): Promise<TenantDTO | null> {
  await connection(); // per request: the panel must never show a stale status
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
