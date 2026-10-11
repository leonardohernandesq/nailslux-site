import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as null | { id: string } }));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => (session.user ? { user: session.user } : null)) }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ id: "u1", name: "Admin", email: "admin@test.pt" })),
}));

const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { AnalyticsEvent, Service } = await import("@/lib/db/models");
const { recordEvent } = await import("@/lib/analytics/server");
const { getAnalytics } = await import("@/lib/data/analytics");
const { POST } = await import("@/app/api/analytics/route");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36";
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-analytics-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  session.user = null;
  await AnalyticsEvent.deleteMany({});
  await Service.deleteMany({});
});

function post(body: unknown, { userAgent = UA, ip = "10.0.0.1" } = {}) {
  return POST(
    new Request("http://localhost/api/analytics", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "user-agent": userAgent, "x-forwarded-for": `${ip}, 70.0.0.1` },
    }),
  );
}

describe("POST /api/analytics", () => {
  it("records a page view without storing the IP", async () => {
    expect((await post({ type: "pageview" })).status).toBe(204);
    const events = await AnalyticsEvent.find().lean();
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("10.0.0.1");
  });

  it("ignores bots and the logged-in owner, and rejects bad input", async () => {
    expect((await post({ type: "pageview" }, { userAgent: "Googlebot/2.1" })).status).toBe(204);
    session.user = { id: "u1" };
    expect((await post({ type: "pageview" })).status).toBe(204);
    session.user = null;
    expect((await post("not json")).status).toBe(400);
    expect((await post({ type: "booking", serviceIds: [] })).status).toBe(400);
    expect(await AnalyticsEvent.countDocuments()).toBe(0);
  });

  it("stores bookings with names and prices from the database, not the browser", async () => {
    const gel = await Service.create({ name: "Verniz gel", priceCents: 2500 });
    await post({ type: "booking", serviceIds: [String(gel._id), "not-an-id"], date: "2026-10-16", time: "10:30" });
    const booking = await AnalyticsEvent.findOne({ type: "booking" }).lean();
    expect(booking).toMatchObject({
      serviceNames: ["Verniz gel"],
      totalCents: 2500,
      requestedWeekday: 5, // Friday
      requestedHour: 10,
    });
  });
});

describe("getAnalytics", () => {
  it("summarises visitors, contacts, conversion, services and demand", async () => {
    const now = new Date();
    const gel = await Service.create({ name: "Verniz gel", priceCents: 2500 });
    const pedi = await Service.create({ name: "Pedicure", priceCents: 1800 });
    const at = now;

    // Four visitors; two contact (one books twice, one clicks WhatsApp).
    for (const ip of ["1.1.1.1", "2.2.2.2", "3.3.3.3", "4.4.4.4"]) {
      await recordEvent({ type: "pageview" }, { ip, userAgent: UA, at });
    }
    const booking = (serviceIds: string[], date: string, time: string) =>
      recordEvent({ type: "booking", serviceIds, date, time }, { ip: "1.1.1.1", userAgent: UA, at });
    await booking([String(gel._id), String(pedi._id)], "2026-10-16", "10:30"); // Friday
    await booking([String(gel._id)], "2026-10-17", "15:00"); // Saturday
    await recordEvent({ type: "whatsapp_click", source: "hero" }, { ip: "2.2.2.2", userAgent: UA, at });
    // Instagram is interest, not a contact: it must not change the conversion rate.
    await recordEvent({ type: "instagram_click", source: "portfolio" }, { ip: "3.3.3.3", userAgent: UA, at });
    // Outside the period: ignored.
    await AnalyticsEvent.create({ type: "pageview", visitorId: "old", createdAt: new Date(now.getTime() - 40 * 86_400_000) });

    const stats = await getAnalytics(30, now);

    expect(stats).toMatchObject({
      visitors: 4,
      pageviews: 4,
      bookings: 2,
      whatsappClicks: 1,
      contacts: 2,
      conversionRate: 0.5,
      requestedValueCents: 2500 + 1800 + 2500,
    });
    expect(stats.services).toEqual([
      { name: "Verniz gel", count: 2 },
      { name: "Pedicure", count: 1 },
    ]);
    expect(stats.weekdays.map((w) => w.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(stats.weekdays.find((w) => w.weekday === 5)?.count).toBe(1);
    expect(stats.weekdays.find((w) => w.weekday === 6)?.count).toBe(1);
    expect(stats.hours.find((h) => h.hour === 10)?.count).toBe(1);
    expect(stats.hours.find((h) => h.hour === 15)?.count).toBe(1);
    // Ties are ordered by channel name.
    expect(stats.linkClicks).toEqual([
      { channel: "instagram", source: "portfolio", count: 1 },
      { channel: "whatsapp", source: "hero", count: 1 },
    ]);
    expect(stats.instagramClicks).toBe(1);
    expect(stats.daily).toHaveLength(30);
    expect(stats.daily.at(-1)).toMatchObject({ visitors: 4, contacts: 2 });
  });

  it("reports no conversion rate when nobody visited", async () => {
    const stats = await getAnalytics(7);
    expect(stats.visitors).toBe(0);
    expect(stats.conversionRate).toBeNull();
    expect(stats.daily).toHaveLength(7);
  });
});
