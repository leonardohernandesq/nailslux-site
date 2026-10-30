import "server-only";
import { requirePlatformAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Appointment, Service, Tenant, User, type TenantStatus } from "../db/models";

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
  monthlyCents: number;
  billedByStripe: boolean;
  services: number;
  bookingsLast30Days: number;
  createdAt: string;
};

export type PlatformOverview = {
  studios: StudioRow[];
  totals: { all: number; online: number; pending: number; suspended: number; paying: number; paymentIssues: number };
  /** What paying studios add up to per month, with yearly plans divided by 12. */
  monthlyRevenueCents: number;
};

type Count = { _id: unknown; count: number };

/** `.collection` on purpose: these are the only reads that span every studio. */
async function countsByTenant(run: () => Promise<Count[]>): Promise<Map<string, number>> {
  return new Map((await run()).map(({ _id, count }) => [String(_id), count]));
}

export async function getPlatformOverview(at?: Date): Promise<PlatformOverview> {
  await requirePlatformAdmin();
  // "Now" must be read per request, never baked into a prerender.
  const now = at ?? new Date();
  await connectDB();

  const group = { $group: { _id: "$tenantId", count: { $sum: 1 } } };
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const [tenants, owners, services, bookings] = await Promise.all([
    Tenant.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: { $ne: "platform" } }, { tenantId: 1, email: 1 }).sort({ createdAt: -1 }).lean(),
    countsByTenant(() => Service.collection.aggregate<Count>([group]).toArray()),
    countsByTenant(() =>
      Appointment.collection.aggregate<Count>([{ $match: { createdAt: { $gte: since } } }, group]).toArray(),
    ),
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
      monthlyCents: tenant.subscriptionMonthlyCents ?? 0,
      billedByStripe: Boolean(tenant.stripeSubscriptionId),
      services: services.get(id) ?? 0,
      bookingsLast30Days: bookings.get(id) ?? 0,
      createdAt: new Date(tenant.createdAt).toISOString(),
    };
  });

  const countBy = (test: (studio: StudioRow) => boolean) => studios.filter(test).length;
  const paying = studios.filter((s) => PAYING.includes(s.subscriptionStatus ?? ""));

  return {
    studios,
    totals: {
      all: studios.length,
      online: countBy((s) => s.status === "active"),
      pending: countBy((s) => s.status === "pending"),
      suspended: countBy((s) => s.status === "suspended"),
      paying: paying.length,
      paymentIssues: countBy((s) => s.subscriptionStatus === "past_due"),
    },
    monthlyRevenueCents: paying.reduce((sum, studio) => sum + studio.monthlyCents, 0),
  };
}
