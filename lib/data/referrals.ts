import "server-only";
import { requirePlatformAdmin } from "../auth/dal";
import { PARTNERS } from "../billing/partners";
import { paidMonths, type BilledPeriod } from "../billing/paid-months";
import { referralUrl } from "../billing/referral";
import { connectDB } from "../db/connect";
import { Tenant, type TenantStatus } from "../db/models";
import { getStripe } from "../stripe";

const PAYING = ["active", "trialing"];

export type ReferredRow = {
  id: string;
  name: string;
  slug: string;
  joinedAt: string;
  status: TenantStatus;
  /** Has a paying (or free-time) subscription right now. */
  paying: boolean;
  /** "YYYY-MM" months covered by paid invoices, oldest first; null outside Stripe or if Stripe failed. */
  paidMonths: string[] | null;
  /** The new studio's free month was given. */
  freeMonth: boolean;
};

export type ReferrerGroup = {
  key: string;
  name: string;
  kind: "studio" | "partner" | "removed";
  /** The link they share, while it still works. */
  url: string | null;
  referred: ReferredRow[];
};

/** Paid subscription periods of one Stripe customer. */
async function billedPeriods(customer: string): Promise<BilledPeriod[]> {
  const periods: BilledPeriod[] = [];
  const invoices = getStripe().invoices.list({ customer, status: "paid", limit: 100, expand: ["data.lines"] });
  for await (const invoice of invoices) {
    if (invoice.amount_paid <= 0) continue;
    for (const line of invoice.lines.data) {
      if (line.amount > 0) periods.push({ start: line.period.start, end: line.period.end });
    }
  }
  return periods;
}

async function monthsFor(customer: string | null | undefined): Promise<string[] | null> {
  if (!customer || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    return paidMonths(await billedPeriods(customer));
  } catch (error) {
    console.error(`Could not list the invoices of ${customer}.`, error);
    return null;
  }
}

/**
 * Everyone who referred a studio: studios and partners, with the studios that
 * signed up through their link. Partners show even before anyone used their link.
 */
export async function getReferralOverview(): Promise<ReferrerGroup[]> {
  await requirePlatformAdmin();
  await connectDB();

  const referred = await Tenant.find(
    { $or: [{ referredBy: { $ne: null } }, { referralPartner: { $ne: null } }] },
    {
      name: 1,
      slug: 1,
      status: 1,
      createdAt: 1,
      subscriptionStatus: 1,
      stripeCustomerId: 1,
      referredBy: 1,
      referralPartner: 1,
      referredFreeMonthAt: 1,
    },
  )
    .sort({ createdAt: -1 })
    .lean();

  const referrerIds = [...new Set(referred.flatMap((doc) => (doc.referredBy ? [String(doc.referredBy)] : [])))];
  const [referrers, months] = await Promise.all([
    Tenant.find({ _id: { $in: referrerIds } }, { name: 1, slug: 1, status: 1 }).lean(),
    Promise.all(referred.map((doc) => monthsFor(doc.stripeCustomerId))),
  ]);
  const referrerById = new Map(referrers.map((doc) => [String(doc._id), doc]));

  const groups = new Map<string, ReferrerGroup>();
  for (const partner of PARTNERS) {
    groups.set(`partner:${partner.code}`, { key: `partner:${partner.code}`, name: partner.name, kind: "partner", url: referralUrl(partner.code), referred: [] });
  }

  referred.forEach((doc, index) => {
    let key: string;
    if (doc.referralPartner) {
      key = `partner:${doc.referralPartner}`;
      if (!groups.has(key)) groups.set(key, { key, name: doc.referralPartner, kind: "partner", url: null, referred: [] });
    } else {
      const id = String(doc.referredBy);
      const referrer = referrerById.get(id);
      key = `studio:${id}`;
      if (!groups.has(key)) {
        groups.set(
          key,
          referrer
            ? { key, name: referrer.name, kind: "studio", url: referrer.status === "active" ? referralUrl(referrer.slug) : null, referred: [] }
            : { key, name: "Studio eliminado", kind: "removed", url: null, referred: [] },
        );
      }
    }
    groups.get(key)!.referred.push({
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      joinedAt: new Date(doc.createdAt).toISOString(),
      status: doc.status,
      paying: PAYING.includes(doc.subscriptionStatus ?? ""),
      paidMonths: months[index],
      freeMonth: Boolean(doc.referredFreeMonthAt),
    });
  });

  // Partners first, then whoever referred most.
  return [...groups.values()].sort((a, b) => {
    if ((a.kind === "partner") !== (b.kind === "partner")) return a.kind === "partner" ? -1 : 1;
    return b.referred.length - a.referred.length || a.name.localeCompare(b.name, "pt");
  });
}
