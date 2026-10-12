import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ admin: true }));

vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => {
    if (!session.admin) throw new Error("NEXT_REDIRECT:/admin/login");
    return { id: "u1", name: "Admin", email: "admin@test.pt" };
  }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Appointment, Service } = await import("@/lib/db/models");
const { requestAppointment, decideAppointment } = await import("@/lib/actions/appointments");
const { getBusyIntervals, getAppointment } = await import("@/lib/data/appointments");
const { idleState } = await import("@/lib/actions/form-state");

let mongo: MongoMemoryServer;
let gel: string; // 60 min
let pedi: string; // no duration -> 1h
let longService: string; // 3h

/** A Saturday a couple of weeks ahead (always bookable). */
function saturdayAhead(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14 + ((6 - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DAY = saturdayAhead();

const intent = (value: string) => {
  const data = new FormData();
  data.set("intent", value);
  return data;
};
const request = (serviceIds: string[], time: string, name = "Maria") =>
  requestAppointment({ name, serviceIds, date: DAY, time, notes: "" });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-appointments-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  session.admin = true;
  await Appointment.deleteMany({});
  await Service.deleteMany({});
  gel = String((await Service.create({ name: "Verniz gel", priceCents: 2500, durationMinutes: 60 }))._id);
  pedi = String((await Service.create({ name: "Pedicure", priceCents: 1800 }))._id);
  longService = String((await Service.create({ name: "Pé completo", priceCents: 4000, durationMinutes: 180 }))._id);
});

describe("requestAppointment", () => {
  it("saves a pending request with the full duration", async () => {
    const result = await request([gel, pedi], "10:00");
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;

    const saved = await Appointment.findById(result.id).lean();
    expect(saved).toMatchObject({
      status: "pending",
      serviceNames: ["Verniz gel", "Pedicure"],
      totalCents: 4300,
      startMinutes: 600,
      endMinutes: 600 + 60 + 60, // pedicure has no duration: counts as 1h
    });
    // Pending requests don't block anything yet.
    expect(await getBusyIntervals(DAY)).toEqual([]);
  });

  it("rejects invalid input and unknown services", async () => {
    expect(await requestAppointment({ name: "M", serviceIds: [gel], date: DAY, time: "10:00" })).toMatchObject({
      ok: false,
      field: "name",
    });
    expect(await request(["000000000000000000000000"], "10:00")).toMatchObject({ ok: false, field: "serviceIds" });
    expect(await Appointment.countDocuments()).toBe(0);
  });

  it("refuses a time that clashes with a confirmed appointment, for the whole duration", async () => {
    // 3h at 17:00 takes 17:00–20:00 (20:00 is the last bookable start).
    const first = await request([longService], "17:00");
    if (!first.ok) throw new Error(first.message);
    await decideAppointment(first.id, idleState, intent("confirm"));

    expect(await getBusyIntervals(DAY)).toEqual([{ start: 17 * 60, end: 20 * 60 }]);
    expect(await request([gel], "18:00")).toMatchObject({ ok: false, field: "time" });
    expect(await request([gel], "16:30")).toMatchObject({ ok: false, field: "time" }); // runs into 17:00
    expect(await request([gel], "16:00")).toMatchObject({ ok: true }); // ends at 17:00
    expect(await request([gel], "20:00")).toMatchObject({ ok: true }); // starts as the other ends
  });
});

describe("decideAppointment", () => {
  it("requires the admin", async () => {
    const created = await request([gel], "10:00");
    if (!created.ok) throw new Error(created.message);
    session.admin = false;
    await expect(decideAppointment(created.id, idleState, intent("confirm"))).rejects.toThrow("NEXT_REDIRECT");
  });

  it("confirms, then cancels to free the time again", async () => {
    const created = await request([gel], "10:00");
    if (!created.ok) throw new Error(created.message);

    expect(await decideAppointment(created.id, idleState, intent("confirm"))).toMatchObject({ status: "success" });
    expect(await getBusyIntervals(DAY)).toEqual([{ start: 600, end: 660 }]);
    // Can't confirm twice.
    expect(await decideAppointment(created.id, idleState, intent("confirm"))).toMatchObject({ status: "error" });

    expect(await decideAppointment(created.id, idleState, intent("cancel"))).toMatchObject({ status: "success" });
    expect(await getBusyIntervals(DAY)).toEqual([]);
  });

  it("won't confirm two overlapping requests", async () => {
    const a = await request([longService], "18:00", "Ana");
    const b = await request([gel], "19:30", "Bia");
    if (!a.ok || !b.ok) throw new Error("setup");

    await decideAppointment(a.id, idleState, intent("confirm"));
    const second = await decideAppointment(b.id, idleState, intent("confirm"));
    expect(second.status).toBe("error");
    expect(second.message).toContain("Ana (18:00–21:00)");

    const detail = await getAppointment(b.id);
    expect(detail?.conflicts.map((c) => c.name)).toEqual(["Ana"]);
  });

  it("declines a request without blocking the time", async () => {
    const created = await request([gel], "10:00");
    if (!created.ok) throw new Error(created.message);
    expect(await decideAppointment(created.id, idleState, intent("decline"))).toMatchObject({ status: "success" });
    expect((await Appointment.findById(created.id).lean())?.status).toBe("declined");
    expect(await getBusyIntervals(DAY)).toEqual([]);
  });
});
