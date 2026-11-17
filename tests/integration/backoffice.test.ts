import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Deleting a studio, partner links and the referrals page, from the backoffice.

const STUDIO_ID = "64b0000000000000000000f1";
const OTHER_ID = "64b0000000000000000000f2";

vi.mock("@/lib/auth/dal", () => ({
  requirePlatformAdmin: vi.fn(async () => ({ id: "p1", name: "Leo", email: "leo@test.pt" })),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

process.env.STRIPE_SECRET_KEY = "sk_test_x";

const { updateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { AnalyticsEvent, Appointment, AuthToken, Client, PortfolioItem, Service, Tenant, User } = await import("@/lib/db/models");
const { saveImage, readImage } = await import("@/lib/db/images");
const { deleteStudio } = await import("@/lib/actions/platform");
const { idleState } = await import("@/lib/actions/form-state");
const { findReferrer, rewardReferral } = await import("@/lib/billing/referral");
const { getReferralOverview } = await import("@/lib/data/referrals");
const { getStripe } = await import("@/lib/stripe");

let mongo: MongoMemoryServer;
const stripe = getStripe();

const confirm = (text: string) => {
  const data = new FormData();
  data.set("confirm", text);
  return data;
};

const studio = (fields: Record<string, unknown> = {}) =>
  Tenant.create({ _id: STUDIO_ID, slug: "studio-f", name: "Studio F", whatsappNumber: "351911111111", ...fields });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-backoffice-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteStudio", () => {
  it("asks for the studio's address before deleting anything", async () => {
    await studio();
    const state = await deleteStudio(STUDIO_ID, idleState, confirm("studio-x"));
    expect(state.status).toBe("error");
    expect(state.message).toContain("studio-f");
    expect(await Tenant.countDocuments()).toBe(1);
  });

  it("cancels the subscription and deletes the studio with everything that's its own", async () => {
    const logo = await saveImage(Buffer.from("logo"), "logo.webp");
    const photo = await saveImage(Buffer.from("photo"), "photo.webp");
    await studio({ stripeSubscriptionId: "sub_f", subscriptionStatus: "active", logo: { fileId: logo, width: 10, height: 10 } });
    await Tenant.create({ _id: OTHER_ID, slug: "outro", name: "Outro", whatsappNumber: "351922222222" });
    const owner = await User.create({ tenantId: STUDIO_ID, name: "Ana", email: "ana@test.pt", passwordHash: "x" });
    await AuthToken.create({ userId: owner._id, type: "reset-password", tokenHash: "h", expiresAt: new Date(Date.now() + 60_000) });
    await Service.create({ tenantId: STUDIO_ID, name: "Gel", priceCents: 2000 });
    await Service.create({ tenantId: OTHER_ID, name: "Gel", priceCents: 2000 });
    await PortfolioItem.create({ tenantId: STUDIO_ID, fileId: photo, width: 10, height: 10, blurDataUrl: "x" });
    await Client.create({ tenantId: STUDIO_ID, phone: "351933333333" });
    await Appointment.create({
      tenantId: STUDIO_ID,
      name: "Rita",
      serviceIds: ["s"],
      serviceNames: ["Gel"],
      totalCents: 2000,
      date: "2026-12-01",
      time: "10:00",
      startMinutes: 600,
      endMinutes: 660,
    });
    await AnalyticsEvent.create({ tenantId: STUDIO_ID, type: "pageview", visitorId: "v" });
    const cancel = vi.spyOn(stripe.subscriptions, "cancel").mockResolvedValue({} as never);

    await expect(deleteStudio(STUDIO_ID, idleState, confirm(" Studio-F "))).rejects.toThrow("NEXT_REDIRECT:/backoffice");

    expect(cancel).toHaveBeenCalledWith("sub_f");
    expect(await Tenant.exists({ _id: STUDIO_ID })).toBeNull();
    expect(await User.countDocuments({ tenantId: STUDIO_ID })).toBe(0);
    expect(await AuthToken.countDocuments()).toBe(0);
    for (const model of [Service, PortfolioItem, Client, Appointment, AnalyticsEvent] as const) {
      expect(await (model as typeof Service).countDocuments({ tenantId: STUDIO_ID })).toBe(0);
    }
    await expect(readImage(String(logo))).resolves.toBeNull();
    await expect(readImage(String(photo))).resolves.toBeNull();
    // Another studio's data stays.
    expect(await Service.countDocuments({ tenantId: OTHER_ID })).toBe(1);
    expect(updateTag).toHaveBeenCalled();
  });

  it("keeps the studio when Stripe won't cancel its subscription", async () => {
    await studio({ stripeSubscriptionId: "sub_f", subscriptionStatus: "active" });
    vi.spyOn(stripe.subscriptions, "cancel").mockRejectedValue(Object.assign(new Error("down"), { code: "api_error" }));

    const state = await deleteStudio(STUDIO_ID, idleState, confirm("studio-f"));
    expect(state.status).toBe("error");
    expect(await Tenant.exists({ _id: STUDIO_ID })).not.toBeNull();
  });

  it("doesn't call Stripe for a subscription that already ended", async () => {
    await studio({ stripeSubscriptionId: "sub_f", subscriptionStatus: "canceled" });
    const cancel = vi.spyOn(stripe.subscriptions, "cancel");
    await expect(deleteStudio(STUDIO_ID, idleState, confirm("studio-f"))).rejects.toThrow("NEXT_REDIRECT");
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("partner links", () => {
  it("knows the markaii link without a studio behind it", async () => {
    expect(await findReferrer("markaii")).toEqual({ name: "Markaii", partner: "markaii" });
  });

  it("gives only the new studio its free month", async () => {
    await studio({ referralPartner: "markaii", stripeSubscriptionId: "sub_f", subscriptionStatus: "active" });
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
      id: "sub_f",
      status: "active",
      trial_end: null,
      items: { data: [{ current_period_end: Date.UTC(2026, 11, 6) / 1000 }] },
    } as never);
    const update = vi.spyOn(stripe.subscriptions, "update").mockResolvedValue({} as never);

    await rewardReferral(STUDIO_ID);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("sub_f", expect.objectContaining({ proration_behavior: "none" }), expect.anything());
    expect((await Tenant.findById(STUDIO_ID).lean())?.referredFreeMonthAt).toBeInstanceOf(Date);
  });
});

describe("getReferralOverview", () => {
  it("groups referred studios by who referred them, with their paid months", async () => {
    await Tenant.create({ _id: OTHER_ID, slug: "madrinha", name: "Madrinha", whatsappNumber: "351922222222" });
    await studio({ referredBy: OTHER_ID, stripeCustomerId: "cus_f", subscriptionStatus: "active", referredFreeMonthAt: new Date() });
    await Tenant.create({ slug: "via-parceiro", name: "Via parceiro", whatsappNumber: "5511987654321", referralPartner: "markaii", status: "pending" });
    await Tenant.create({ slug: "orfao", name: "Órfão", whatsappNumber: "351944444444", referredBy: new mongoose.Types.ObjectId(), subscriptionStatus: "canceled" });

    const period = (start: string, end: string) => ({ amount: 490, period: { start: Date.parse(start) / 1000, end: Date.parse(end) / 1000 } });
    vi.spyOn(stripe.invoices, "list").mockReturnValue(
      [
        { amount_paid: 490, lines: { data: [period("2026-09-10T10:00:00Z", "2026-10-10T10:00:00Z")] } },
        { amount_paid: 490, lines: { data: [period("2026-11-10T10:00:00Z", "2026-12-10T10:00:00Z")] } },
        { amount_paid: 0, lines: { data: [] } },
      ] as never,
    );

    const groups = await getReferralOverview();
    const byName = Object.fromEntries(groups.map((group) => [group.name, group]));

    expect(groups[0].kind).toBe("partner"); // partners come first
    expect(byName.Markaii.url).toMatch(/\/registo\?ref=markaii$/);
    expect(byName.Markaii.referred.map((s) => s.name)).toEqual(["Via parceiro"]);
    expect(byName.Markaii.referred[0].paidMonths).toBeNull(); // no Stripe customer

    const referred = byName.Madrinha.referred[0];
    expect(referred).toMatchObject({ name: "Studio F", paying: true, freeMonth: true, paidMonths: ["2026-09", "2026-11"] });
    expect(byName.Madrinha.url).toMatch(/ref=madrinha$/);

    expect(byName["Studio eliminado"]).toMatchObject({ kind: "removed", url: null });
    expect(byName["Studio eliminado"].referred[0].paying).toBe(false);
  });
});
