import "server-only";
import { requirePlatformAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Appointment, Service, Tenant, User, type TenantStatus } from "../db/models";
import { getStripe, isBillingConfigured } from "../stripe";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAYING = ["active", "trialing"];

export type StudioRow = {
  id: string;
  slug: string;
  name: string;
  ownerEmail: string | null;
  status: TenantStatus;
  suspendedFor: "billing" | "manual" | null;
  subscriptionStatus: string | null;
  billedByStripe: boolean;
  services: number;
  bookingsLast30Days: number;
  createdAt: string;
};

export type PlatformOverview = {
  studios: StudioRow[];
  totals: { all: number; online: number; pending: number; suspended: number; paying: number; paymentIssues: number };
  /** Paying studios x the monthly price; null if Stripe can't tell us the price. */
  monthlyRevenueCents: number | null;
};

type Count = { _id: unknown; count: number };

/** `.collection` on purpose: these are the only reads that span every studio. */
async function countsByTenant(run: () => Promise<Count[]>): Promise<Map<string, number>> {
  return new Map((await run()).map(({ _id, count }) => [String(_id), count]));
}

async function monthlyPriceCents(): Promise<number | null> {
  if (!isBillingConfigured()) return null;
  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID!);
    return price.unit_amount;
  } catch (error) {
    console.error("Could not read the Stripe price.", error);
    return null;
  }
}

export async function getPlatformOverview(at?: Date): Promise<PlatformOverview> {
  await requirePlatformAdmin();
  // "Now" must be read per request, never baked into a prerender.
  const now = at ?? new Date();
  await connectDB();

  const group = { $group: { _id: "$tenantId", count: { $sum: 1 } } };
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const [tenants, owners, services, bookings, priceCents] = await Promise.all([
    Tenant.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: { $ne: "platform" } }, { tenantId: 1, email: 1 }).sort({ createdAt: -1 }).lean(),
    countsByTenant(() => Service.collection.aggregate<Count>([group]).toArray()),
    countsByTenant(() =>
      Appointment.collection.aggregate<Count>([{ $match: { createdAt: { $gte: since } } }, group]).toArray(),
    ),
    monthlyPriceCents(),
  ]);

  const ownerByTenant = new Map(owners.map((owner) => [String(owner.tenantId), owner.email]));
  const studios: StudioRow[] = tenants.map((tenant) => {
    const id = String(tenant._id);
    return {
      id,
      slug: tenant.slug,
      name: tenant.name,
      ownerEmail: ownerByTenant.get(id) ?? null,
      status: tenant.status,
      suspendedFor: tenant.suspendedFor ?? null,
      subscriptionStatus: tenant.subscriptionStatus ?? null,
      billedByStripe: Boolean(tenant.stripeSubscriptionId),
      services: services.get(id) ?? 0,
      bookingsLast30Days: bookings.get(id) ?? 0,
      createdAt: new Date(tenant.createdAt).toISOString(),
    };
  });

  const countBy = (test: (studio: StudioRow) => boolean) => studios.filter(test).length;
  const paying = countBy((s) => PAYING.includes(s.subscriptionStatus ?? ""));

  return {
    studios,
    totals: {
      all: studios.length,
      online: countBy((s) => s.status === "active"),
      pending: countBy((s) => s.status === "pending"),
      suspended: countBy((s) => s.status === "suspended"),
      paying,
      paymentIssues: countBy((s) => s.subscriptionStatus === "past_due"),
    },
    monthlyRevenueCents: priceCents === null ? null : paying * priceCents,
  };
}
