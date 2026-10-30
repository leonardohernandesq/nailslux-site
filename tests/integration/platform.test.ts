import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import type Stripe from "stripe";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "64b00000000000000000000a";
const TENANT_B = "64b00000000000000000000b";
const session = vi.hoisted(() => ({ platform: true }));

vi.mock("next-auth", () => ({ AuthError: class extends Error {} }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({
  requirePlatformAdmin: vi.fn(async () => {
    if (!session.platform) throw new Error("NEXT_REDIRECT:/backoffice/login");
    return { id: "p1", name: "Leo", email: "leo@test.pt" };
  }),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_PRICE_ID = "price_x";

const { updateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Appointment, Service, Tenant, User } = await import("@/lib/db/models");
const { reactivateStudio, suspendStudio } = await import("@/lib/actions/platform");
const { getPlatformOverview } = await import("@/lib/data/platform");
const { applySubscription } = await import("@/lib/billing/subscription");
const { getStripe } = await import("@/lib/stripe");
const { authConfig } = await import("@/auth.config");

let mongo: MongoMemoryServer;

const studio = (id: string, slug: string, fields: Record<string, unknown> = {}) =>
  Tenant.create({ _id: id, slug, name: slug, whatsappNumber: "351900000000", ...fields });

const statusOf = async (id: string) => (await Tenant.findById(id).lean())?.status;

const booking = (tenantId: string, createdAt: Date) =>
  Appointment.collection.insertOne({ tenantId: new Types.ObjectId(tenantId), createdAt } as never);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-platform-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  session.platform = true;
  vi.mocked(updateTag).mockClear();
  for (const model of [Appointment, Service, Tenant, User]) await model.collection.deleteMany({});
  vi.spyOn(getStripe().prices, "retrieve").mockResolvedValue({ unit_amount: 2500 } as never);
});

afterEach(() => vi.restoreAllMocks());

describe("access", () => {
  it("refuses everything without a platform session", async () => {
    session.platform = false;
    await studio(TENANT_A, "studio-a");

    await expect(getPlatformOverview()).rejects.toThrow("/backoffice/login");
    await expect(suspendStudio(TENANT_A)).rejects.toThrow("/backoffice/login");
    await expect(reactivateStudio(TENANT_A)).rejects.toThrow("/backoffice/login");
    expect(await statusOf(TENANT_A)).toBe("active");
  });

  const authorized = (pathname: string, user?: Record<string, unknown>) =>
    authConfig.callbacks.authorized({
      auth: user ? ({ user } as never) : null,
      request: { nextUrl: new URL(`http://x${pathname}`) } as never,
    });
  const owner = { id: "u", tenantId: TENANT_A };
  const platform = { id: "p", platformAdmin: true };
  const redirectOf = (result: unknown) => (result as Response).headers.get("location");

  it("keeps studio owners and visitors out of the backoffice", () => {
    expect(redirectOf(authorized("/backoffice", owner))).toBe("http://x/backoffice/login");
    expect(redirectOf(authorized("/backoffice"))).toBe("http://x/backoffice/login");
    expect(authorized("/backoffice/login", owner)).toBe(true);
  });

  it("sends the platform admin to the backoffice, not a studio panel", () => {
    expect(authorized("/backoffice", platform)).toBe(true);
    expect(redirectOf(authorized("/backoffice/login", platform))).toBe("http://x/backoffice");
    expect(redirectOf(authorized("/admin/marcacoes", platform))).toBe("http://x/backoffice");
    expect(redirectOf(authorized("/admin/login", platform))).toBe("http://x/backoffice");
  });

  it("leaves studio owners in their panel", () => {
    expect(authorized("/admin/marcacoes", owner)).toBe(true);
    expect(authorized("/admin/marcacoes")).toBe(false);
  });
});

describe("overview", () => {
  it("sums up every studio and doesn't list the platform login", async () => {
    await studio(TENANT_A, "studio-a", { subscriptionStatus: "active", stripeSubscriptionId: "sub_1" });
    await studio(TENANT_B, "studio-b", { status: "pending" });
    await User.create({ tenantId: TENANT_A, name: "Ana", email: "ana@test.pt", passwordHash: "x" });
    await User.create({ role: "platform", name: "Leo", email: "leo@test.pt", passwordHash: "x" });
    await Service.create({ tenantId: TENANT_A, name: "Gel", priceCents: 1000 });

    const at = new Date();
    await booking(TENANT_A, at);
    await booking(TENANT_A, new Date(at.getTime() - 40 * 86_400_000));

    const { studios, totals, monthlyRevenueCents } = await getPlatformOverview(at);
    expect(totals).toMatchObject({ all: 2, online: 1, pending: 1, paying: 1 });
    expect(monthlyRevenueCents).toBe(2500);

    const row = studios.find((s) => s.slug === "studio-a");
    expect(row).toMatchObject({ ownerEmail: "ana@test.pt", services: 1, bookingsLast30Days: 1 });
    expect(JSON.stringify(studios)).not.toContain("leo@test.pt");
  });

  it("still works when Stripe can't answer", async () => {
    vi.mocked(getStripe().prices.retrieve).mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await studio(TENANT_A, "studio-a");

    const { totals, monthlyRevenueCents } = await getPlatformOverview();
    expect(totals.all).toBe(1);
    expect(monthlyRevenueCents).toBeNull();
  });
});

describe("suspending by hand", () => {
  it("takes the site down at once, and reactivating brings it back", async () => {
    await studio(TENANT_A, "studio-a");

    await suspendStudio(TENANT_A);
    expect(await Tenant.findById(TENANT_A).lean()).toMatchObject({ status: "suspended", suspendedFor: "manual" });
    expect(updateTag).toHaveBeenCalledWith("tenant:studio-a");

    await reactivateStudio(TENANT_A);
    const after = await Tenant.findById(TENANT_A).lean();
    expect(after?.status).toBe("active");
    expect(after?.suspendedFor).toBeUndefined();
  });

  it("can't publish a studio that hasn't finished signing up", async () => {
    await studio(TENANT_A, "studio-a", { status: "pending" });

    await suspendStudio(TENANT_A);
    await reactivateStudio(TENANT_A);
    expect(await statusOf(TENANT_A)).toBe("pending");
  });

  it("can't override a billing suspension", async () => {
    await studio(TENANT_A, "studio-a", { status: "suspended", suspendedFor: "billing" });

    await reactivateStudio(TENANT_A);
    expect(await statusOf(TENANT_A)).toBe("suspended");
  });

  it("keeps the site down if the subscription ended meanwhile", async () => {
    await studio(TENANT_A, "studio-a", { status: "suspended", suspendedFor: "manual", subscriptionStatus: "canceled" });

    await reactivateStudio(TENANT_A);
    expect(await Tenant.findById(TENANT_A).lean()).toMatchObject({ status: "suspended", suspendedFor: "billing" });
  });

  it("isn't lifted by a payment", async () => {
    await studio(TENANT_A, "studio-a", { stripeSubscriptionId: "sub_1", subscriptionStatus: "active" });
    await suspendStudio(TENANT_A);

    await applySubscription({ id: "sub_1", status: "active", metadata: { tenantId: TENANT_A }, customer: "cus_1" } as unknown as Stripe.Subscription);
    expect(await statusOf(TENANT_A)).toBe("suspended");
  });

  it("ignores ids that aren't valid", async () => {
    await expect(suspendStudio("nope")).resolves.toBeUndefined();
    await expect(reactivateStudio({ $ne: null } as unknown as string)).resolves.toBeUndefined();
  });
});
