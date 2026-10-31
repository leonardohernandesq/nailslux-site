import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const TENANT_ID = "64b00000000000000000000d";
const WEBHOOK_SECRET = "whsec_test";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({
    id: "u1",
    name: "Ana",
    email: "ana@test.pt",
    tenantId: "64b00000000000000000000d",
    tenantSlug: "studio-d",
  })),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_PRICE_ID = "price_x";
process.env.STRIPE_PRICE_ID_YEARLY = "price_y";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const { revalidateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Tenant } = await import("@/lib/db/models");
const { openBilling } = await import("@/lib/actions/billing");
const { idleState } = await import("@/lib/actions/form-state");
const { getStripe } = await import("@/lib/stripe");
const { POST } = await import("@/app/api/stripe/webhook/route");

const stripe = getStripe();
let mongo: MongoMemoryServer;

const subscription = (status: string, id = "sub_1", metadata: Record<string, string> = { tenantId: TENANT_ID }, unit_amount = 999, interval = "month") =>
  ({ id, status, metadata, customer: "cus_1", items: { data: [{ price: { unit_amount, recurring: { interval } } }] } }) as unknown as Stripe.Subscription;

const billing = (plan?: string) => {
  const data = new FormData();
  if (plan) data.set("plan", plan);
  return openBilling(idleState, data);
};

/** Stripe's current state of a subscription, then a correctly signed event about it. */
function webhook(current: Stripe.Subscription, type = "customer.subscription.updated", signature?: string) {
  vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(current as never);
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { id: current.id } } });
  const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
}

const tenant = () => Tenant.findById(TENANT_ID).lean();

const seed = (fields: Record<string, unknown>) =>
  Tenant.create({ _id: TENANT_ID, slug: "studio-d", name: "D", whatsappNumber: "351900000000", ...fields });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-billing-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  vi.mocked(revalidateTag).mockClear();
  await Tenant.collection.deleteMany({});
});

afterEach(() => vi.restoreAllMocks());

describe("webhook security", () => {
  it("rejects events without a valid signature and changes nothing", async () => {
    await seed({ status: "pending", emailConfirmedAt: new Date() });
    const response = await webhook(subscription("active"), undefined, "t=1,v1=forged");

    expect(response.status).toBe(400);
    expect((await tenant())?.status).toBe("pending");
  });

  it("trusts Stripe's current state, not what the event said", async () => {
    await seed({ status: "pending", emailConfirmedAt: new Date() });
    await webhook(subscription("canceled"));

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");
    expect((await tenant())?.subscriptionStatus).toBe("canceled");
  });

  it("ignores subscriptions that belong to no studio", async () => {
    await seed({ status: "active" });
    const response = await webhook(subscription("canceled", "sub_x", {}));

    expect(response.status).toBe(204);
    expect((await tenant())?.status).toBe("active");
  });
});

describe("publishing", () => {
  it("goes public once paid, if the email is confirmed", async () => {
    await seed({ status: "pending", emailConfirmedAt: new Date() });
    await webhook(subscription("active"));

    expect(await tenant()).toMatchObject({ status: "active", subscriptionStatus: "active", stripeCustomerId: "cus_1" });
    expect(revalidateTag).toHaveBeenCalledWith("tenant:studio-d", { expire: 0 });
  });

  it("records what each plan is worth per month", async () => {
    await seed({ status: "pending", emailConfirmedAt: new Date() });

    await webhook(subscription("active"));
    expect((await tenant())?.subscriptionMonthlyCents).toBe(999);

    await webhook(subscription("active", "sub_1", { tenantId: TENANT_ID }, 9999, "year"));
    expect((await tenant())?.subscriptionMonthlyCents).toBe(833);
  });

  it("stays private when paid before the email is confirmed", async () => {
    await seed({ status: "pending" });
    await webhook(subscription("active"));

    expect((await tenant())?.status).toBe("pending");
  });

  it("doesn't wait for a confirmation that can't be sent, but still for the payment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    await seed({ status: "pending" });

    await webhook(subscription("incomplete"));
    expect((await tenant())?.status).toBe("pending");

    await webhook(subscription("active"));
    expect((await tenant())?.status).toBe("active");
    vi.unstubAllEnvs();
  });

  it("asks for the confirmation again once email works", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    await seed({ status: "pending" });

    await webhook(subscription("active"));
    expect((await tenant())?.status).toBe("pending");
    vi.unstubAllEnvs();
  });

  it("stays private while the first payment is incomplete", async () => {
    await seed({ status: "pending", emailConfirmedAt: new Date() });
    await webhook(subscription("incomplete"));

    expect((await tenant())?.status).toBe("pending");
  });
});

describe("failed payments", () => {
  beforeEach(() => seed({ status: "active", stripeSubscriptionId: "sub_1", subscriptionStatus: "active" }));

  it("keeps the site online while Stripe retries", async () => {
    await webhook(subscription("past_due"));
    expect(await tenant()).toMatchObject({ status: "active", subscriptionStatus: "past_due" });
  });

  it("suspends when the subscription ends, and is safe to repeat", async () => {
    await webhook(subscription("canceled"), "customer.subscription.deleted");
    await webhook(subscription("canceled"), "customer.subscription.deleted");

    expect(await tenant()).toMatchObject({ status: "suspended", suspendedFor: "billing" });
    expect(revalidateTag).toHaveBeenCalledWith("tenant:studio-d", { expire: 0 });
  });

  it("comes back by itself once paid again", async () => {
    await webhook(subscription("unpaid"));
    await webhook(subscription("active"));

    const after = await tenant();
    expect(after?.status).toBe("active");
    expect(after?.suspendedFor).toBeUndefined();
  });

  it("an old subscription ending can't suspend a studio with a new one", async () => {
    await webhook(subscription("active", "sub_2"));
    await webhook(subscription("canceled", "sub_1"), "customer.subscription.deleted");

    expect(await tenant()).toMatchObject({ status: "active", stripeSubscriptionId: "sub_2", subscriptionStatus: "active" });
  });
});

it("payment doesn't lift a suspension made by hand", async () => {
  await seed({ status: "suspended", suspendedFor: "manual" });
  await webhook(subscription("active"));

  expect(await tenant()).toMatchObject({ status: "suspended", suspendedFor: "manual" });
});

describe("openBilling", () => {
  const checkout = () =>
    vi.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.test/checkout" } as never);
  const portal = () =>
    vi.spyOn(stripe.billingPortal.sessions, "create").mockResolvedValue({ url: "https://stripe.test/portal" } as never);

  it("creates one customer and sends a new studio to checkout, tagged with its id", async () => {
    await seed({ status: "pending" });
    vi.spyOn(stripe.customers, "create").mockResolvedValue({ id: "cus_new" } as never);
    const create = checkout();

    await expect(billing()).rejects.toThrow("NEXT_REDIRECT:https://stripe.test/checkout");

    expect((await tenant())?.stripeCustomerId).toBe("cus_new");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_new",
        line_items: [{ price: "price_x", quantity: 1 }],
        subscription_data: { metadata: { tenantId: TENANT_ID } },
      }),
    );
  });

  it("charges the yearly price for the yearly plan, and refuses it if it isn't set up", async () => {
    await seed({ status: "pending", stripeCustomerId: "cus_1" });
    const create = checkout();

    await expect(billing("anual")).rejects.toThrow("NEXT_REDIRECT");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ line_items: [{ price: "price_y", quantity: 1 }] }));

    delete process.env.STRIPE_PRICE_ID_YEARLY;
    expect((await billing("anual")).status).toBe("error");
    process.env.STRIPE_PRICE_ID_YEARLY = "price_y";
  });

  it("sends a subscribed studio to the portal, so it can't pay twice", async () => {
    await seed({ status: "active", stripeCustomerId: "cus_1", subscriptionStatus: "past_due" });
    const create = checkout();
    portal();

    await expect(billing()).rejects.toThrow("NEXT_REDIRECT:https://stripe.test/portal");
    expect(create).not.toHaveBeenCalled();
  });

  it("lets a cancelled studio subscribe again with the same customer", async () => {
    await seed({ status: "suspended", stripeCustomerId: "cus_1", subscriptionStatus: "canceled" });
    const customers = vi.spyOn(stripe.customers, "create");
    checkout();

    await expect(billing()).rejects.toThrow("NEXT_REDIRECT:https://stripe.test/checkout");
    expect(customers).not.toHaveBeenCalled();
  });

  it("shows a message instead of crashing when Stripe refuses", async () => {
    await seed({ status: "pending", stripeCustomerId: "cus_1" });
    vi.spyOn(stripe.checkout.sessions, "create").mockRejectedValue(new Error("No such price"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await billing()).toMatchObject({ status: "error", message: "Não foi possível abrir a página de pagamento." });
  });

  it("says so when Stripe isn't configured", async () => {
    await seed({ status: "pending" });
    const price = process.env.STRIPE_PRICE_ID;
    delete process.env.STRIPE_PRICE_ID;

    expect((await billing()).status).toBe("error");
    process.env.STRIPE_PRICE_ID = price;
  });
});
