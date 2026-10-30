import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppointmentStatus } from "@/lib/db/models";

const TENANT_A = "64b00000000000000000000a";
const TENANT_B = "64b00000000000000000000b";

// Every test acts as the owner of studio A and goes after studio B's data.
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({
    id: "u1",
    name: "Ana",
    email: "ana@test.pt",
    tenantId: "64b00000000000000000000a",
    tenantSlug: "studio-a",
  })),
}));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/db/images", () => ({ deleteImage: vi.fn(async () => {}) }));

const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { AnalyticsEvent, Appointment, Client, PortfolioItem, Service, Tenant } = await import("@/lib/db/models");
const { decideAppointment, requestAppointment } = await import("@/lib/actions/appointments");
const { saveClientMolds } = await import("@/lib/actions/clients");
const portfolio = await import("@/lib/actions/portfolio");
const services = await import("@/lib/actions/services");
const { idleState } = await import("@/lib/actions/form-state");
const { getAppointment, getAppointmentsOverview, getBusyIntervals } = await import("@/lib/data/appointments");
const { getAnalytics } = await import("@/lib/data/analytics");
const { getAdminPortfolio } = await import("@/lib/data/portfolio");
const { getAllServices, getServiceById } = await import("@/lib/data/services");
const { getActiveTenant } = await import("@/lib/data/tenants");
const { recordEvent } = await import("@/lib/analytics/server");
const { GET: availability } = await import("@/app/api/availability/route");
const { migrateToTenants } = await import("@/lib/db/migrate-tenants");

let mongo: MongoMemoryServer;

/** A Saturday a couple of weeks ahead (always bookable). */
function saturdayAhead(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14 + ((6 - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DAY = saturdayAhead();

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const booking = (serviceId: string, time = "10:00") => ({
  name: "Maria",
  phone: "912 345 678",
  serviceIds: [serviceId],
  date: DAY,
  time,
  notes: "",
});

const appointmentOf = (tenantId: string, status: AppointmentStatus = "pending") =>
  Appointment.create({
    tenantId,
    name: "Cliente da B",
    phone: "351912345678",
    serviceIds: ["x"],
    serviceNames: ["Gel"],
    totalCents: 2000,
    date: DAY,
    time: "10:00",
    startMinutes: 600,
    endMinutes: 660,
    status,
  });

const photoOf = (tenantId: string) =>
  PortfolioItem.create({
    tenantId,
    fileId: "64b0000000000000000000ff",
    width: 10,
    height: 10,
    blurDataUrl: "data:,",
    caption: "Original",
  });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-isolation-test");
  await connectDB();
  await Promise.all([Client.init(), Tenant.init()]);
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  for (const model of [AnalyticsEvent, Appointment, Client, PortfolioItem, Service, Tenant]) {
    await model.collection.deleteMany({});
  }
  await Tenant.create([
    { _id: TENANT_A, slug: "studio-a", name: "Studio A", whatsappNumber: "351900000001" },
    { _id: TENANT_B, slug: "studio-b", name: "Studio B", whatsappNumber: "351900000002" },
  ]);
});

describe("admin reads stay inside the studio", () => {
  it("doesn't list or open another studio's records", async () => {
    const theirs = await appointmentOf(TENANT_B);
    const service = await Service.create({ tenantId: TENANT_B, name: "Gel da B", priceCents: 2000 });
    await photoOf(TENANT_B);

    expect(await getAppointment(String(theirs._id))).toBeNull();
    expect((await getAppointmentsOverview()).pending).toEqual([]);
    expect(await getAllServices()).toEqual([]);
    expect(await getServiceById(String(service._id))).toBeNull();
    expect(await getAdminPortfolio()).toEqual([]);
  });

  it("counts only the studio's own analytics", async () => {
    const at = new Date();
    await recordEvent(TENANT_A, { type: "pageview" }, { ip: "1.1.1.1", userAgent: "UA", at });
    await recordEvent(TENANT_B, { type: "pageview" }, { ip: "2.2.2.2", userAgent: "UA", at });
    await recordEvent(TENANT_B, { type: "pageview" }, { ip: "3.3.3.3", userAgent: "UA", at });

    expect((await getAnalytics(7, at)).pageviews).toBe(1);
  });
});

describe("admin writes can't reach another studio", () => {
  it("can't decide another studio's appointment", async () => {
    const theirs = await appointmentOf(TENANT_B);
    const state = await decideAppointment(String(theirs._id), idleState, form({ intent: "confirm" }));

    expect(state.status).toBe("error");
    expect((await Appointment.findOne({ _id: theirs._id, tenantId: TENANT_B }).lean())?.status).toBe("pending");
  });

  it("can't save molds through another studio's appointment", async () => {
    const theirs = await appointmentOf(TENANT_B);
    const state = await saveClientMolds(String(theirs._id), idleState, form({ handMold: "1-2-3-4-5", footMold: "" }));

    expect(state.status).toBe("error");
    expect(await Client.countDocuments({ tenantId: TENANT_B })).toBe(0);
    expect(await Client.countDocuments({ tenantId: TENANT_A })).toBe(0);
  });

  it("can't change, hide or delete another studio's service", async () => {
    const theirs = await Service.create({ tenantId: TENANT_B, name: "Gel da B", priceCents: 2000 });
    const id = String(theirs._id);

    const state = await services.updateService(id, idleState, form({ name: "Roubado", price: "1", active: "on" }));
    expect(state.status).toBe("error");
    await services.setServiceActive(id, false);
    await services.deleteService(id);

    const after = await Service.findOne({ _id: id, tenantId: TENANT_B }).lean();
    expect(after).toMatchObject({ name: "Gel da B", active: true });
  });

  it("reorders only the studio's own services", async () => {
    const mine = await Service.create([
      { tenantId: TENANT_A, name: "A1", priceCents: 1, order: 1 },
      { tenantId: TENANT_A, name: "A2", priceCents: 1, order: 2 },
    ]);
    const theirs = await Service.create({ tenantId: TENANT_B, name: "B1", priceCents: 1, order: 50 });

    await services.moveService(String(mine[1]._id), "up");

    const names = (await Service.find({ tenantId: TENANT_A }).sort({ order: 1 }).lean()).map((s) => s.name);
    expect(names).toEqual(["A2", "A1"]);
    expect((await Service.findOne({ _id: theirs._id, tenantId: TENANT_B }).lean())?.order).toBe(50);
  });

  it("can't caption or delete another studio's photo", async () => {
    const theirs = await photoOf(TENANT_B);
    const id = String(theirs._id);

    await portfolio.updatePortfolioCaption(id, idleState, form({ caption: "Alterada" }));
    await portfolio.deletePortfolioItem(id);

    const after = await PortfolioItem.findOne({ _id: id, tenantId: TENANT_B }).lean();
    expect(after?.caption).toBe("Original");
  });

  it("the photo limit is per studio", async () => {
    await PortfolioItem.insertMany(
      Array.from({ length: 30 }, () => ({
        tenantId: TENANT_B,
        fileId: "64b0000000000000000000ff",
        width: 10,
        height: 10,
        blurDataUrl: "data:,",
      })),
    );
    const data = form({});
    data.set("file", new File(["not an image"], "a.webp", { type: "image/webp" }));

    // Gets past the limit check and fails on the (fake) image itself.
    expect((await portfolio.uploadPortfolioPhoto(data)).message).not.toContain("limite");
  });
});

describe("public booking stays inside the studio", () => {
  it("refuses a service from another studio", async () => {
    const theirs = await Service.create({ tenantId: TENANT_B, name: "Gel da B", priceCents: 2000 });
    const result = await requestAppointment("studio-a", booking(String(theirs._id)));

    expect(result).toMatchObject({ ok: false, field: "serviceIds" });
    expect(await Appointment.countDocuments({ tenantId: TENANT_A })).toBe(0);
    expect(await Appointment.countDocuments({ tenantId: TENANT_B })).toBe(0);
  });

  it("keeps each studio's agenda apart: the same time can be booked at both", async () => {
    await appointmentOf(TENANT_B, "confirmed");
    const mine = await Service.create({ tenantId: TENANT_A, name: "Gel", priceCents: 2000, durationMinutes: 60 });

    expect(await getBusyIntervals(TENANT_A, DAY)).toEqual([]);
    expect(await getBusyIntervals(TENANT_B, DAY)).toEqual([{ start: 600, end: 660 }]);
    expect(await requestAppointment("studio-a", booking(String(mine._id)))).toMatchObject({ ok: true });
  });

  it("availability answers for the studio in the URL", async () => {
    await appointmentOf(TENANT_B, "confirmed");
    const get = (tenant: string) => availability(new Request(`http://x/api/availability?tenant=${tenant}&date=${DAY}`));

    expect((await (await get("studio-a")).json()).busy).toEqual([]);
    expect((await (await get("studio-b")).json()).busy).toHaveLength(1);
    expect((await get("nao-existe")).status).toBe(404);
  });

  it("lets the same person be a client of two studios", async () => {
    await Client.create({ tenantId: TENANT_A, phone: "351912345678", handMold: "1-1-1-1-1" });
    await Client.create({ tenantId: TENANT_B, phone: "351912345678", handMold: "2-2-2-2-2" });

    expect(await Client.countDocuments({ phone: "351912345678", tenantId: TENANT_A })).toBe(1);
    await expect(Client.create({ tenantId: TENANT_A, phone: "351912345678" })).rejects.toThrow(/duplicate/i);
  });

  it("hides a suspended studio and refuses its bookings", async () => {
    const service = await Service.create({ tenantId: TENANT_A, name: "Gel", priceCents: 2000 });
    await Tenant.updateOne({ _id: TENANT_A }, { status: "suspended" });

    expect(await getActiveTenant("studio-a")).toBeNull();
    expect(await requestAppointment("studio-a", booking(String(service._id)))).toMatchObject({ ok: false });
  });

  it("treats a slug that isn't a plain string as unknown", async () => {
    const injected = { $ne: null } as unknown as string;
    expect(await getActiveTenant(injected)).toBeNull();
    expect(await requestAppointment(injected, booking("x"))).toMatchObject({ ok: false });
  });
});

describe("tenant guard", () => {
  it("rejects queries with no tenant", async () => {
    await expect(Service.find().lean()).rejects.toThrow("no tenantId");
    await expect(Appointment.findById("64b000000000000000000001").lean()).rejects.toThrow("no tenantId");
    await expect(Client.deleteMany({})).rejects.toThrow("no tenantId");
    await expect(Service.findByIdAndUpdate("64b000000000000000000001", { active: false })).rejects.toThrow("no tenantId");
  });

  it("rejects aggregations that don't start with the tenant", async () => {
    await expect(AnalyticsEvent.aggregate([{ $match: { type: "pageview" } }])).rejects.toThrow("no tenantId");
  });
});

describe("migrateToTenants", () => {
  const first = { slug: "nailslux", name: "NailsLux", whatsappNumber: "351922269283" };

  it("hands existing records to the first studio, and can run again", async () => {
    await Service.collection.insertOne({ name: "Antigo", priceCents: 1000 } as never);
    await Client.collection.insertOne({ phone: "351911111111" } as never);
    await Service.collection.insertOne({ name: "Da B", priceCents: 1, tenantId: new (await import("mongoose")).Types.ObjectId(TENANT_B) } as never);

    expect(await migrateToTenants(first)).toMatchObject({ Service: 1, Client: 1 });
    const tenant = await Tenant.findOne({ slug: "nailslux" }).lean();
    expect(tenant).toMatchObject({ name: "NailsLux", status: "active" });

    expect(await Service.countDocuments({ tenantId: tenant!._id })).toBe(1);
    expect(await Service.countDocuments({ tenantId: TENANT_B })).toBe(1);

    expect(await migrateToTenants(first)).toMatchObject({ Service: 0, Client: 0 });
    expect(await Tenant.countDocuments({ slug: "nailslux" })).toBe(1);
  });

  it("drops the old global unique index on the client's phone", async () => {
    await Client.collection.dropIndexes().catch(() => {});
    await Client.collection.createIndex({ phone: 1 }, { unique: true });

    await migrateToTenants(first);

    const indexes = await Client.collection.indexes();
    expect(indexes.some((index) => index.name === "phone_1")).toBe(false);
    expect(indexes.some((index) => index.unique && index.key.tenantId === 1 && index.key.phone === 1)).toBe(true);
  });
});
