import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Time off, client cards, the calendar feed, new-request emails and referrals.

const TENANT_ID = "64b0000000000000000000e1";
const OTHER_ID = "64b0000000000000000000e2";

const pending = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }));
const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text: string; html: string }[] }));

vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ id: "u1", name: "Ana", email: "ana@test.pt", tenantId: "64b0000000000000000000e1", tenantSlug: "studio-e" })),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
  after: (task: () => unknown) => void pending.tasks.push(Promise.resolve().then(task)),
}));
vi.mock("@/lib/mail", () => ({
  canSendMail: () => true,
  sendMail: vi.fn(async (message: (typeof mail.sent)[number]) => {
    mail.sent.push(message);
    return true;
  }),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_x";

const { updateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Appointment, Client, Service, Tenant, User } = await import("@/lib/db/models");
const { addTimeOff, removeTimeOff } = await import("@/lib/actions/time-off");
const { requestAppointment } = await import("@/lib/actions/appointments");
const { saveClientCard } = await import("@/lib/actions/clients");
const { resetCalendarLink } = await import("@/lib/actions/panel-settings");
const { getClients, getClient } = await import("@/lib/data/clients");
const { getActiveTenant, getPanelSettings } = await import("@/lib/data/tenants");
const { applySubscription } = await import("@/lib/billing/subscription");
const { getStripe } = await import("@/lib/stripe");
const { idleState } = await import("@/lib/actions/form-state");
const { GET: calendarFeed } = await import("@/app/api/agenda/[token]/route");

let mongo: MongoMemoryServer;
let gel: string;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A Saturday a couple of weeks ahead (always bookable). */
function saturdayAhead(weeks = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7 + ((6 - d.getDay() + 7) % 7));
  return iso(d);
}
const DAY = saturdayAhead();

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const book = (time: string, name = "Maria", phone = "912 345 678") =>
  requestAppointment("studio-e", { name, phone, serviceIds: [gel], date: DAY, time, notes: "" });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-features-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  mail.sent.length = 0;
  pending.tasks.length = 0;
  vi.mocked(updateTag).mockClear();
  for (const model of [Appointment, Client, Service, Tenant, User]) await model.collection.deleteMany({});
  await Tenant.create({ _id: TENANT_ID, slug: "studio-e", name: "Studio E", whatsappNumber: "351900000000" });
  await User.create({ tenantId: TENANT_ID, name: "Ana", email: "ana@test.pt", passwordHash: "x" });
  gel = String((await Service.create({ tenantId: TENANT_ID, name: "Verniz gel", priceCents: 2500, durationMinutes: 60 }))._id);
});

afterEach(() => vi.restoreAllMocks());

describe("time off", () => {
  it("closes a whole day on the public site and refuses bookings there", async () => {
    const result = await addTimeOff(idleState, form({ start: DAY, span: "day", note: "Férias" }));
    expect(result).toMatchObject({ status: "success" });
    expect(updateTag).toHaveBeenCalledWith("tenant:studio-e");

    const tenant = await getActiveTenant("studio-e");
    expect(tenant?.hours.timeOff).toEqual([{ id: expect.any(String), start: DAY, end: DAY }]); // no private note
    expect(await book("10:00")).toMatchObject({ ok: false, field: "date" });
  });

  it("blocks only the chosen hours, including services that would run into them", async () => {
    await addTimeOff(idleState, form({ start: DAY, span: "hours", from: "14:00", to: "16:00" }));
    expect(await book("13:30")).toMatchObject({ ok: false, field: "time" }); // 1h service would end at 14:30
    expect(await book("15:00")).toMatchObject({ ok: false, field: "time" });
    expect(await book("16:00")).toMatchObject({ ok: true });
    expect(await book("12:00", "Rita", "913 000 000")).toMatchObject({ ok: true });
  });

  it("warns about confirmed appointments in the period, and can be removed", async () => {
    const booked = await book("10:00");
    if (!booked.ok) throw new Error("booking failed");
    await Appointment.updateOne({ _id: booked.id, tenantId: TENANT_ID }, { status: "confirmed" });

    const result = await addTimeOff(idleState, form({ start: DAY, end: DAY, span: "day" }));
    expect(result.message).toContain("há 1 marcação confirmada");

    const [off] = (await getPanelSettings(TENANT_ID, "2000-01-01")).timeOff;
    await removeTimeOff(off.id);
    expect((await getPanelSettings(TENANT_ID, "2000-01-01")).timeOff).toEqual([]);
  });

  it("rejects past dates, reversed ranges and reversed hours", async () => {
    expect((await addTimeOff(idleState, form({ start: "2020-01-01", span: "day" }))).fieldErrors?.start).toBeDefined();
    const later = saturdayAhead(3);
    expect((await addTimeOff(idleState, form({ start: later, end: DAY, span: "day" }))).fieldErrors?.end).toBeDefined();
    expect((await addTimeOff(idleState, form({ start: DAY, span: "hours", from: "16:00", to: "14:00" }))).fieldErrors?.to).toBeDefined();
  });
});

describe("new request emails", () => {
  it("emails the owner after the response, with the client's text escaped", async () => {
    await requestAppointment("studio-e", { name: "Ana <b>", phone: "912 345 678", serviceIds: [gel], date: DAY, time: "10:00", notes: "" });
    await Promise.all(pending.tasks);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("ana@test.pt");
    expect(mail.sent[0].text).toContain("Verniz gel");
    expect(mail.sent[0].html).toContain("Ana &lt;b&gt;");
    expect(mail.sent[0].html).not.toContain("<b>");
  });

  it("stays quiet when the studio turned it off", async () => {
    await Tenant.updateOne({ _id: TENANT_ID }, { notifyNewBookings: false });
    await book("10:00");
    await Promise.all(pending.tasks);
    expect(mail.sent).toHaveLength(0);
  });
});

describe("client cards", () => {
  it("groups requests by number, counting only confirmed visits up to today", async () => {
    const past = await Appointment.create({
      tenantId: TENANT_ID, name: "Maria Silva", phone: "351912345678", serviceIds: [gel], serviceNames: ["Verniz gel"],
      totalCents: 2500, date: "2025-01-04", time: "10:00", startMinutes: 600, endMinutes: 660, status: "confirmed",
    });
    await book("10:00", "Maria"); // pending, ahead
    await book("12:00", "Joana", "913 111 111");

    const clients = await getClients();
    const maria = clients.find((c) => c.phone === "351912345678")!;
    expect(maria).toMatchObject({ name: "Maria", visits: 1, spentCents: 2500, lastVisit: "2025-01-04", nextVisit: null });
    expect(await getClients("joa")).toHaveLength(1);
    expect(await getClients("912 345")).toHaveLength(1);

    const card = await getClient(maria.id);
    expect(card?.history.map((h) => h.id)).toContain(String(past._id));
    expect(card?.history).toHaveLength(2);
  });

  it("saves notes and molds, and never another studio's client", async () => {
    await book("10:00");
    const [client] = await getClients();
    const saved = await saveClientCard(client.id, idleState, form({ notes: "Alergia a acetona", handMold: "3-6-5-7-9", footMold: "" }));
    expect(saved).toMatchObject({ status: "success" });
    expect(await getClient(client.id)).toMatchObject({ notes: "Alergia a acetona", handMold: "3-6-5-7-9" });

    const foreign = await Client.create({ tenantId: OTHER_ID, phone: "351999999999" });
    expect(await saveClientCard(String(foreign._id), idleState, form({ notes: "x" }))).toMatchObject({ status: "error" });
    expect(await getClient(String(foreign._id))).toBeNull();
  });
});

describe("calendar feed", () => {
  const feed = (token: string) => calendarFeed(new Request(`http://x/api/agenda/${token}`), { params: Promise.resolve({ token }) });

  it("lists confirmed appointments only, behind the studio's secret link", async () => {
    const confirmed = await book("10:00", "Maria");
    await book("12:00", "Joana", "913 111 111"); // stays pending
    if (!confirmed.ok) throw new Error("booking failed");
    await Appointment.updateOne({ _id: confirmed.id, tenantId: TENANT_ID }, { status: "confirmed" });

    await resetCalendarLink();
    const { calendarToken } = (await getPanelSettings(TENANT_ID, "2000-01-01"));
    const response = await feed(calendarToken!);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    const body = await response.text();
    expect(body).toContain("SUMMARY:Maria · Verniz gel");
    expect(body).not.toContain("Joana");

    // A new link shuts the old one out.
    await resetCalendarLink();
    expect((await feed(calendarToken!)).status).toBe(404);
    expect((await feed("not-a-token")).status).toBe(404);
  });
});

describe("referrals", () => {
  const subscription = (tenantId: string, customer: string) =>
    ({ id: `sub_${tenantId}`, status: "active", metadata: { tenantId }, customer, items: { data: [{ price: { unit_amount: 999, recurring: { interval: "month" } } }] } }) as unknown as Stripe.Subscription;

  it("credits both studios once, when the referred one starts paying", async () => {
    await Tenant.updateOne({ _id: TENANT_ID }, { stripeCustomerId: "cus_referrer" });
    await Tenant.create({ _id: OTHER_ID, slug: "novo", name: "Novo", whatsappNumber: "351911111111", status: "pending", referredBy: TENANT_ID });
    const credit = vi.spyOn(getStripe().customers, "createBalanceTransaction").mockResolvedValue({} as never);

    await applySubscription(subscription(OTHER_ID, "cus_new"));
    await applySubscription(subscription(OTHER_ID, "cus_new")); // the webhook again

    expect(credit).toHaveBeenCalledTimes(2);
    expect(credit).toHaveBeenCalledWith("cus_new", expect.objectContaining({ amount: -999, currency: "eur" }), expect.anything());
    expect(credit).toHaveBeenCalledWith("cus_referrer", expect.objectContaining({ amount: -999 }), expect.anything());
    expect((await Tenant.findById(OTHER_ID).lean())?.referralRewardedAt).toBeInstanceOf(Date);
  });

  it("releases the claim when Stripe fails, so the webhook's retry can credit", async () => {
    await Tenant.create({ _id: OTHER_ID, slug: "novo", name: "Novo", whatsappNumber: "351911111111", status: "pending", referredBy: TENANT_ID });
    vi.spyOn(getStripe().customers, "createBalanceTransaction").mockRejectedValue(new Error("stripe down"));

    await expect(applySubscription(subscription(OTHER_ID, "cus_new"))).rejects.toThrow("stripe down");
    expect((await Tenant.findById(OTHER_ID).lean())?.referralRewardedAt).toBeUndefined();
  });
});
