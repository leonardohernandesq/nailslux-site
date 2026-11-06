import { MongoMemoryServer } from "mongodb-memory-server";
import type Stripe from "stripe";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Free time from the backoffice, and what a studio sees about its subscription.

const STUDIO = "64b0000000000000000000f1";
const REFERRED = "64b0000000000000000000f2";

vi.mock("next-auth", () => ({ AuthError: class extends Error {} }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({ requirePlatformAdmin: vi.fn(async () => ({ id: "p1", name: "Leo", email: "leo@test.pt" })) }));

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_PRICE_ID = "price_month";
process.env.STRIPE_PRICE_ID_YEARLY = "price_year";

const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Tenant, User } = await import("@/lib/db/models");
const { grantStudioTime } = await import("@/lib/actions/platform");
const { idleState } = await import("@/lib/actions/form-state");
const { addFreeTime } = await import("@/lib/billing/free-time");
const { daysUntil, getAccessGrants, getSubscriptionDetails } = await import("@/lib/billing/details");
const { getReferredStudios } = await import("@/lib/billing/referral");
const { getStripe } = await import("@/lib/stripe");

let mongo: MongoMemoryServer;
const stripe = getStripe();

const PERIOD_END = Date.UTC(2026, 11, 6) / 1000;

const subscription = (fields: Partial<Record<string, unknown>> = {}) =>
  ({
    id: "sub_1",
    status: "active",
    metadata: { tenantId: STUDIO },
    customer: "cus_1",
    trial_end: null,
    cancel_at: null,
    cancel_at_period_end: false,
    ended_at: null,
    default_payment_method: "pm_1",
    items: { data: [{ current_period_end: PERIOD_END, price: { unit_amount: 999, recurring: { interval: "month" } } }] },
    ...fields,
  }) as unknown as Stripe.Subscription;

const grant = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return grantStudioTime(STUDIO, idleState, data);
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-free-time-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await Tenant.collection.deleteMany({});
  await User.collection.deleteMany({});
  await User.create({ tenantId: STUDIO, name: "Ana", email: "ana@test.pt", passwordHash: "x" });
});

afterEach(() => vi.restoreAllMocks());

describe("addFreeTime", () => {
  it("adds calendar months and days", () => {
    const from = new Date(Date.UTC(2026, 0, 31));
    expect(addFreeTime(from, { amount: 10, unit: "days" }).toISOString()).toBe("2026-02-10T00:00:00.000Z");
    expect(addFreeTime(new Date(Date.UTC(2026, 11, 6)), { amount: 2, unit: "months" }).toISOString()).toBe("2027-02-06T00:00:00.000Z");
  });
});

describe("grantStudioTime", () => {
  it("moves a paying studio's next charge later, and records who did it", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", subscriptionStatus: "active" });
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(subscription() as never);
    const update = vi.spyOn(stripe.subscriptions, "update").mockResolvedValue({} as never);

    const result = await grant({ amount: "15", unit: "days" });
    expect(result).toMatchObject({ status: "success" });
    expect(result.message).toContain("21 de dezembro de 2026");
    expect(update).toHaveBeenCalledWith("sub_1", { trial_end: Date.UTC(2026, 11, 21) / 1000, proration_behavior: "none" }, expect.anything());
    expect(await getAccessGrants(STUDIO)).toEqual([
      { at: expect.any(String), by: "leo@test.pt", amount: 15, unit: "days", until: "2026-12-21T00:00:00.000Z" },
    ]);
  });

  it("starts a free subscription without a card when there's none, ending by itself", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000", status: "pending" });
    vi.spyOn(stripe.customers, "create").mockResolvedValue({ id: "cus_new" } as never);
    const create = vi.spyOn(stripe.subscriptions, "create").mockResolvedValue(
      subscription({ id: "sub_new", status: "trialing", customer: "cus_new", items: { data: [{ current_period_end: PERIOD_END, price: { unit_amount: 9999, recurring: { interval: "year" } } }] } }) as never,
    );

    const result = await grant({ amount: "1", unit: "months", plan: "anual" });
    expect(result).toMatchObject({ status: "success" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_new",
        items: [{ price: "price_year" }],
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: { tenantId: STUDIO },
      }),
      expect.anything(),
    );
    // Synced at once, without waiting for the webhook.
    expect(await Tenant.findById(STUDIO).lean()).toMatchObject({ stripeSubscriptionId: "sub_new", subscriptionStatus: "trialing" });
  });

  it("refuses studios billed outside Stripe, failed payments and bad amounts", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000", status: "active" });
    expect((await grant({ amount: "1", unit: "months" })).message).toContain("fora da Stripe");

    await Tenant.updateOne({ _id: STUDIO }, { stripeCustomerId: "cus_1", subscriptionStatus: "past_due" });
    expect((await grant({ amount: "1", unit: "months" })).message).toContain("pagamento em falta");

    expect((await grant({ amount: "13", unit: "months" })).fieldErrors?.amount).toBeDefined();
    expect((await grant({ amount: "0", unit: "days" })).fieldErrors?.amount).toBeDefined();
  });
});

describe("subscription details", () => {
  it("reads the next date, free period, card and credit from Stripe", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" });
    const trialEnd = Date.UTC(2027, 0, 6) / 1000;
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(subscription({ status: "trialing", trial_end: trialEnd, default_payment_method: null }) as never);
    vi.spyOn(stripe.customers, "retrieve").mockResolvedValue({ balance: -999, invoice_settings: { default_payment_method: null } } as never);

    expect(await getSubscriptionDetails(STUDIO)).toEqual({
      status: "trialing",
      plan: "mensal",
      nextDate: "2027-01-06T00:00:00.000Z",
      ending: false,
      free: true,
      hasCard: false,
      creditCents: 999,
    });
  });

  it("says when a cancelled subscription ends, and survives Stripe being down", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000", stripeSubscriptionId: "sub_1" });
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValueOnce(subscription({ cancel_at_period_end: true }) as never);
    expect(await getSubscriptionDetails(STUDIO)).toMatchObject({ ending: true, nextDate: "2026-12-06T00:00:00.000Z" });

    vi.spyOn(stripe.subscriptions, "retrieve").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getSubscriptionDetails(STUDIO)).toBeNull();
  });

  it("counts whole days left", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(daysUntil("2026-11-07T00:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-12-06T00:00:00Z", now)).toBe(30);
    expect(daysUntil("2026-11-01T00:00:00Z", now)).toBe(0);
  });

  it("lists the studios referred, with whether each one earned the free month", async () => {
    await Tenant.create({ _id: STUDIO, slug: "a", name: "A", whatsappNumber: "351900000000" });
    await Tenant.create({ _id: REFERRED, slug: "b", name: "Studio B", whatsappNumber: "351911111111", referredBy: STUDIO, subscriptionStatus: "trialing", referrerFreeMonthAt: new Date() });
    await Tenant.create({ slug: "c", name: "Studio C", whatsappNumber: "351922222222", referredBy: STUDIO, status: "pending" });

    const referred = await getReferredStudios(STUDIO);
    expect(referred.map(({ name, paying, rewarded }) => ({ name, paying, rewarded }))).toEqual([
      { name: "Studio C", paying: false, rewarded: false },
      { name: "Studio B", paying: true, rewarded: true },
    ]);
  });
});
