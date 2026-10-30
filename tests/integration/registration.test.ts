import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "64b00000000000000000000c";
const session = vi.hoisted(() => ({ user: { id: "", email: "" } }));
const mail = vi.hoisted(() => ({ sent: [] as { to: string; text: string }[] }));

vi.mock("@/auth", () => ({ signIn: vi.fn(async () => {}) }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/mail", () => ({
  canSendMail: () => true,
  actionMail: (_intro: string, _label: string, url: string) => ({ text: url, html: url }),
  sendMail: vi.fn(async (message: { to: string; text: string }) => {
    mail.sent.push(message);
    return true;
  }),
}));
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({
    id: session.user.id,
    name: "Ana",
    email: session.user.email,
    tenantId: "64b00000000000000000000c",
    tenantSlug: "studio-c",
  })),
}));

const bcrypt = (await import("bcryptjs")).default;
const { updateTag } = await import("next/cache");
const { redirect } = await import("next/navigation");
const { signIn } = await import("@/auth");
const { getStripe } = await import("@/lib/stripe");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { AuthToken, Tenant, User } = await import("@/lib/db/models");
const actions = await import("@/lib/actions/registration");
const { updateSettings } = await import("@/lib/actions/settings");
const { idleState } = await import("@/lib/actions/form-state");
const { getActiveTenant } = await import("@/lib/data/tenants");
const { slugify } = await import("@/lib/validation/registration");

let mongo: MongoMemoryServer;

const form = (values: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of [value].flat()) data.append(key, item);
  }
  return data;
};

const signup = (overrides: Record<string, string> = {}) =>
  form({
    studioName: "Unhas da Inês",
    slug: "unhas-da-ines",
    whatsappNumber: "912 345 678",
    ownerName: "Inês",
    email: "ines@test.pt",
    password: "uma-frase-longa",
    terms: "on",
    ...overrides,
  });

const lastToken = () => new URL(mail.sent.at(-1)!.text).searchParams.get("token")!;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-registration-test");
  await connectDB();
  await Promise.all([Tenant.init(), User.init(), AuthToken.init()]);
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  process.env.REGISTRATION_OPEN = "true";
  mail.sent = [];
  vi.mocked(signIn).mockClear();
  vi.mocked(redirect).mockClear();
  vi.mocked(updateTag).mockClear();
  for (const model of [AuthToken, Tenant, User]) await model.collection.deleteMany({});
});

describe("slugify", () => {
  it("turns a name into an address", () => {
    expect(slugify("Unhas da Inês!")).toBe("unhas-da-ines");
    expect(slugify("  São  João ")).toBe("sao-joao");
  });
});

describe("register", () => {
  it("stays closed until REGISTRATION_OPEN is on", async () => {
    process.env.REGISTRATION_OPEN = "false";
    const state = await actions.register(idleState, signup());

    expect(state.status).toBe("error");
    expect(await Tenant.countDocuments()).toBe(0);
  });

  it("creates a private studio and its owner, emails a link and logs in", async () => {
    await actions.register(idleState, signup());

    const tenant = await Tenant.findOne({ slug: "unhas-da-ines" }).lean();
    expect(tenant).toMatchObject({ name: "Unhas da Inês", whatsappNumber: "351912345678", status: "pending" });
    const user = await User.findOne({ email: "ines@test.pt" }).select("+passwordHash").lean();
    expect(String(user?.tenantId)).toBe(String(tenant?._id));
    expect(await bcrypt.compare("uma-frase-longa", user!.passwordHash)).toBe(true);

    expect(mail.sent).toHaveLength(1);
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "ines@test.pt" }));
    expect(await getActiveTenant("unhas-da-ines")).toBeNull();
  });

  describe("with Stripe configured", () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = "sk_test_x";
      process.env.STRIPE_PRICE_ID = "price_month";
      process.env.STRIPE_PRICE_ID_YEARLY = "price_year";
      vi.spyOn(getStripe().customers, "create").mockResolvedValue({ id: "cus_new" } as never);
    });
    afterEach(() => {
      for (const key of ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_PRICE_ID_YEARLY"]) delete process.env[key];
      vi.restoreAllMocks();
    });

    it("goes straight to paying for the chosen plan", async () => {
      const create = vi.spyOn(getStripe().checkout.sessions, "create").mockResolvedValue({ url: "https://stripe.test/pay" } as never);

      await actions.register(idleState, signup({ plan: "anual" }));

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ line_items: [{ price: "price_year", quantity: 1 }] }));
      expect(redirect).toHaveBeenCalledWith("https://stripe.test/pay");
      expect((await Tenant.findOne({ slug: "unhas-da-ines" }).lean())?.stripeCustomerId).toBe("cus_new");
    });

    it("keeps the account when Stripe fails, and falls back to the panel", async () => {
      vi.spyOn(getStripe().checkout.sessions, "create").mockRejectedValue(new Error("offline"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      await actions.register(idleState, signup());

      expect(await Tenant.countDocuments({ slug: "unhas-da-ines" })).toBe(1);
      expect(redirect).toHaveBeenCalledWith("/admin/definicoes?novo=1");
    });
  });

  it("never echoes the password back", async () => {
    const state = await actions.register(idleState, signup({ email: "invalido" }));
    expect(state.fieldErrors?.email).toBeDefined();
    expect(JSON.stringify(state)).not.toContain("uma-frase-longa");
  });

  it("refuses reserved and taken addresses", async () => {
    const reserved = await actions.register(idleState, signup({ slug: "admin" }));
    expect(reserved.fieldErrors?.slug).toBeDefined();

    await Tenant.create({ slug: "unhas-da-ines", name: "Outra", whatsappNumber: "351900000000" });
    const taken = await actions.register(idleState, signup());
    expect(taken.fieldErrors?.slug).toEqual(["Este endereço já está ocupado."]);
  });

  it("leaves no orphan studio when the email is taken", async () => {
    await actions.register(idleState, signup());
    const state = await actions.register(idleState, signup({ slug: "outro-studio" }));

    expect(state.fieldErrors?.email).toBeDefined();
    expect(await Tenant.countDocuments({ slug: "outro-studio" })).toBe(0);
  });

  it("requires the terms, and stops bots on the hidden field", async () => {
    const noTerms = signup();
    noTerms.delete("terms");
    expect((await actions.register(idleState, noTerms)).fieldErrors?.terms).toBeDefined();

    await actions.register(idleState, signup({ website: "spam.example" }));
    expect(await Tenant.countDocuments()).toBe(0);
  });
});

describe("confirmEmail", () => {
  it("doesn't publish a studio that isn't paying yet", async () => {
    await actions.register(idleState, signup());

    expect((await actions.confirmEmail(idleState, form({ token: lastToken() }))).status).toBe("success");
    expect(await Tenant.findOne({ slug: "unhas-da-ines" }).lean()).toMatchObject({ status: "pending", emailConfirmedAt: expect.any(Date) });
  });

  it("publishes a paying studio, clears its cached 404 and works only once", async () => {
    await actions.register(idleState, signup());
    await Tenant.updateOne({ slug: "unhas-da-ines" }, { subscriptionStatus: "active" });
    const token = lastToken();

    const state = await actions.confirmEmail(idleState, form({ token }));
    expect(state.status).toBe("success");
    expect((await getActiveTenant("unhas-da-ines"))?.name).toBe("Unhas da Inês");
    expect(updateTag).toHaveBeenCalledWith("tenant:unhas-da-ines");

    expect((await actions.confirmEmail(idleState, form({ token }))).status).toBe("error");
  });

  it("can't bring a suspended studio back", async () => {
    await actions.register(idleState, signup());
    await Tenant.updateOne({ slug: "unhas-da-ines" }, { status: "suspended" });

    await actions.confirmEmail(idleState, form({ token: lastToken() }));
    expect((await Tenant.findOne({ slug: "unhas-da-ines" }).lean())?.status).toBe("suspended");
  });

  it("rejects unknown and expired tokens", async () => {
    await actions.register(idleState, signup());
    const token = lastToken();
    await AuthToken.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });

    expect((await actions.confirmEmail(idleState, form({ token: "inventado" }))).status).toBe("error");
    expect((await actions.confirmEmail(idleState, form({ token }))).status).toBe("error");
  });

  it("stores only a hash of the token", async () => {
    await actions.register(idleState, signup());
    expect(JSON.stringify(await AuthToken.find().lean())).not.toContain(lastToken());
  });
});

describe("password recovery", () => {
  it("answers the same for known and unknown emails, emailing only the first", async () => {
    await actions.register(idleState, signup());
    mail.sent = [];

    const unknown = await actions.requestPasswordReset(idleState, form({ email: "ninguem@test.pt" }));
    expect(mail.sent).toHaveLength(0);
    const known = await actions.requestPasswordReset(idleState, form({ email: "ines@test.pt" }));
    expect(mail.sent).toHaveLength(1);
    expect(known).toEqual(unknown);
  });

  it("changes the password once per link, and a confirm link can't do it", async () => {
    await actions.register(idleState, signup());
    const confirmToken = lastToken();
    expect((await actions.resetPassword(idleState, form({ token: confirmToken, password: "outra-frase-longa" }))).status).toBe("error");

    await actions.requestPasswordReset(idleState, form({ email: "ines@test.pt" }));
    const token = lastToken();
    expect((await actions.resetPassword(idleState, form({ token, password: "outra-frase-longa" }))).status).toBe("success");

    const user = await User.findOne({ email: "ines@test.pt" }).select("+passwordHash").lean();
    expect(await bcrypt.compare("outra-frase-longa", user!.passwordHash)).toBe(true);
    expect((await actions.resetPassword(idleState, form({ token, password: "terceira-frase-longa" }))).status).toBe("error");
  });

  it("limits how often emails can be requested", async () => {
    await actions.register(idleState, signup());
    mail.sent = [];
    await actions.requestPasswordReset(idleState, form({ email: "ines@test.pt" }));
    await actions.requestPasswordReset(idleState, form({ email: "ines@test.pt" }));
    expect(mail.sent).toHaveLength(1);
  });
});

describe("resendConfirmation", () => {
  it("waits a minute between emails", async () => {
    await Tenant.create({ _id: TENANT_ID, slug: "studio-c", name: "C", whatsappNumber: "351900000000", status: "pending" });
    const user = await User.create({ tenantId: TENANT_ID, name: "Ana", email: "ana@test.pt", passwordHash: "x" });
    session.user = { id: String(user._id), email: user.email };

    expect((await actions.resendConfirmation()).status).toBe("success");
    expect((await actions.resendConfirmation()).status).toBe("error");
    expect(mail.sent).toHaveLength(1);
  });
});

describe("updateSettings", () => {
  const settings = {
    name: "Studio C",
    tagline: "Unhas em Braga",
    whatsappNumber: "912 345 678",
    instagramUrl: "https://www.instagram.com/studio.c/",
    address: "Rua A, 1",
    days: ["1", "2"],
    opens: "10:00",
    lastStart: "18:00",
  };

  beforeEach(async () => {
    await Tenant.create({ _id: TENANT_ID, slug: "studio-c", name: "C", whatsappNumber: "351900000000", address: "Antiga" });
  });

  it("saves the details and refreshes the public site", async () => {
    expect((await updateSettings(idleState, form(settings))).status).toBe("success");

    const tenant = await getActiveTenant("studio-c");
    expect(tenant).toMatchObject({ name: "Studio C", whatsappNumber: "351912345678", address: "Rua A, 1" });
    expect(tenant?.hours).toMatchObject({ days: [1, 2], opens: "10:00", lastStart: "18:00", slotMinutes: 30 });
    expect(updateTag).toHaveBeenCalledWith("tenant:studio-c");
  });

  it("removes optional fields that were cleared", async () => {
    await updateSettings(idleState, form({ ...settings, address: "", instagramUrl: "" }));
    const tenant = await getActiveTenant("studio-c");
    expect(tenant).toMatchObject({ address: null, instagramUrl: null });
  });

  it("refuses links that aren't Instagram over https, and impossible hours", async () => {
    const link = await updateSettings(idleState, form({ ...settings, instagramUrl: "javascript:alert(1)" }));
    expect(link.fieldErrors?.instagramUrl).toBeDefined();

    const hours = await updateSettings(idleState, form({ ...settings, opens: "19:00" }));
    expect(hours.fieldErrors?.lastStart).toBeDefined();

    const days = await updateSettings(idleState, form({ ...settings, days: [] }));
    expect(days.fieldErrors?.days).toBeDefined();
  });
});
