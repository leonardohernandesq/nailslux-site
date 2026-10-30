import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// --- Next.js / auth boundaries -------------------------------------------------
const session = vi.hoisted(() => ({ admin: true }));

vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => {
    if (!session.admin) throw new Error("NEXT_REDIRECT:/admin/login");
    return { id: "u1", name: "Admin", email: "admin@test.pt", tenantId: "64b000000000000000000001", tenantSlug: "studio" };
  }),
}));
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  refresh: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const { updateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Service } = await import("@/lib/db/models");
const actions = await import("@/lib/actions/services");
const { idleState } = await import("@/lib/actions/form-state");

const TENANT_ID = "64b000000000000000000001";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  session.admin = true;
  vi.mocked(updateTag).mockClear();
  await Service.collection.deleteMany({});
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("service actions", () => {
  it("creates a service, stores the price in cents and refreshes the public cache", async () => {
    await expect(
      actions.createService(idleState, form({ name: "Verniz gel", price: "25,50", durationMinutes: "60", active: "on" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/servicos?saved=1");

    const saved = await Service.findOne({ tenantId: TENANT_ID }).lean();
    expect(saved).toMatchObject({ name: "Verniz gel", priceCents: 2550, durationMinutes: 60, active: true, order: 1 });
    expect(updateTag).toHaveBeenCalledWith(`services:${TENANT_ID}`);
  });

  it("returns field errors and the typed values when validation fails", async () => {
    const state = await actions.createService(idleState, form({ name: "X", price: "abc" }));
    expect(state.status).toBe("error");
    expect(Object.keys(state.fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "price"]));
    expect(state.values).toMatchObject({ name: "X", price: "abc" });
    expect(await Service.countDocuments({ tenantId: TENANT_ID })).toBe(0);
  });

  it("refuses to write without an admin session", async () => {
    session.admin = false;
    await expect(actions.createService(idleState, form({ name: "Gel", price: "20" }))).rejects.toThrow(
      "/admin/login",
    );
    await expect(actions.deleteService("0123456789abcdef01234567")).rejects.toThrow("/admin/login");
    expect(await Service.countDocuments({ tenantId: TENANT_ID })).toBe(0);
  });

  it("updates a service and clears optional fields left empty", async () => {
    const service = await Service.create({ tenantId: TENANT_ID, name: "Gel", description: "Antiga", priceCents: 2000, durationMinutes: 30 });
    await expect(
      actions.updateService(String(service._id), idleState, form({ name: "Gel novo", price: "22", description: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    const updated = await Service.findOne({ _id: service._id, tenantId: TENANT_ID }).lean();
    expect(updated).toMatchObject({ name: "Gel novo", priceCents: 2200, active: false });
    expect(updated?.description).toBeUndefined();
    expect(updated?.durationMinutes).toBeUndefined();
  });

  it("reorders, hides and deletes services", async () => {
    const [a, b, c] = await Service.create([
      { tenantId: TENANT_ID, name: "A", priceCents: 1, order: 1 },
      { tenantId: TENANT_ID, name: "B", priceCents: 1, order: 2 },
      { tenantId: TENANT_ID, name: "C", priceCents: 1, order: 3 },
    ]);

    await actions.moveService(String(c._id), "up");
    const names = (await Service.find({ tenantId: TENANT_ID }).sort({ order: 1 }).lean()).map((s) => s.name);
    expect(names).toEqual(["A", "C", "B"]);

    await actions.setServiceActive(String(a._id), false);
    expect((await Service.findOne({ _id: a._id, tenantId: TENANT_ID }).lean())?.active).toBe(false);

    await actions.deleteService(String(b._id));
    expect(await Service.countDocuments({ tenantId: TENANT_ID })).toBe(2);
  });

  it("rejects malformed ids", async () => {
    await expect(actions.deleteService("not-an-id")).rejects.toThrow();
  });
});
