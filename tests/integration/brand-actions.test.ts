import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "64b00000000000000000000e";
const TENANT_B = "64b00000000000000000000f";

const session = vi.hoisted(() => ({ platform: false }));

vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ id: "u1", name: "Ana", email: "a@test.pt", tenantId: "64b00000000000000000000e", tenantSlug: "studio-a" })),
  requirePlatformAdmin: vi.fn(async () => {
    if (!session.platform) throw new Error("NEXT_REDIRECT:/backoffice/login");
    return { id: "p1", name: "Leo", email: "leo@test.pt" };
  }),
}));

const { updateTag } = await import("next/cache");
const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { Tenant } = await import("@/lib/db/models");
const { readImage } = await import("@/lib/db/images");
const { removeBrandImage, resetBrandColors, updateBrandColors, uploadBrandImage } = await import("@/lib/actions/brand");
const { idleState } = await import("@/lib/actions/form-state");
const { updateSettings } = await import("@/lib/actions/settings");
const { getTenantById } = await import("@/lib/data/tenants");
const { BRAND_MAX_UPLOAD_BYTES } = await import("@/lib/constants");

let mongo: MongoMemoryServer;

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: { r: 200, g: 0, b: 100, alpha: 0.5 } } }).png().toBuffer();

const upload = async (bytes: Uint8Array, type = "image/png") => {
  const data = new FormData();
  data.set("file", new File([new Uint8Array(bytes)], "imagem.png", { type }));
  return data;
};

const colors = (primaryColor: string, secondaryColor: string) => {
  const data = new FormData();
  data.set("primaryColor", primaryColor);
  data.set("secondaryColor", secondaryColor);
  return data;
};

const fileIdOf = (src?: string) => src?.split("/").pop() ?? "";

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-brand-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  session.platform = false;
  vi.mocked(updateTag).mockClear();
  await Tenant.collection.deleteMany({});
  await Tenant.create({ _id: TENANT_A, slug: "studio-a", name: "A", whatsappNumber: "351900000000" });
  await Tenant.create({ _id: TENANT_B, slug: "studio-b", name: "B", whatsappNumber: "351900000001" });
});

describe("colors", () => {
  it("saves, reaches the site at once and touches no other studio", async () => {
    const state = await updateBrandColors(idleState, colors("#1d4ed8", "#ff66aa"));

    expect(state.status).toBe("success");
    expect((await getTenantById(TENANT_A))?.brand).toMatchObject({ primaryColor: "#1d4ed8", secondaryColor: "#ff66aa" });
    expect((await getTenantById(TENANT_B))?.brand.primaryColor).toBeNull();
    expect(updateTag).toHaveBeenCalledWith("tenant:studio-a");
  });

  it("refuses anything that isn't a color, since it ends up in a style attribute", async () => {
    const state = await updateBrandColors(idleState, colors("red;background:url(x)", "#ff66aa"));

    expect(state.fieldErrors?.primaryColor).toBeDefined();
    expect((await getTenantById(TENANT_A))?.brand.primaryColor).toBeNull();
  });

  it("goes back to the template's colors", async () => {
    await updateBrandColors(idleState, colors("#1d4ed8", "#ff66aa"));
    await resetBrandColors(new FormData());

    expect((await getTenantById(TENANT_A))?.brand).toMatchObject({ primaryColor: null, secondaryColor: null });
  });
});

describe("editing from the backoffice", () => {
  const forStudio = (data: FormData, id: unknown = TENANT_B) => {
    data.set("studioId", String(id));
    return data;
  };
  const settings = () => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ name: "Novo nome", tagline: "Frase nova", whatsappNumber: "912345678", instagramUrl: "", address: "", opens: "09:00", lastStart: "18:00", days: "1" })) {
      data.set(key, value);
    }
    return data;
  };

  it("lets the platform admin change any studio, and only that one", async () => {
    session.platform = true;

    await updateSettings(idleState, forStudio(settings()));
    await updateBrandColors(idleState, forStudio(colors("#1d4ed8", "#ff66aa")));
    await uploadBrandImage("banner", forStudio(await upload(await png(400, 400))));

    const edited = await getTenantById(TENANT_B);
    expect(edited).toMatchObject({ name: "Novo nome", brand: { primaryColor: "#1d4ed8" } });
    expect(edited?.brand.banner).not.toBeNull();
    expect((await getTenantById(TENANT_A))?.name).toBe("A");
    expect(updateTag).toHaveBeenCalledWith("tenant:studio-b");

    await removeBrandImage("banner", TENANT_B);
    expect((await getTenantById(TENANT_B))?.brand.banner).toBeNull();
  });

  it("turns away a studio owner who names another studio", async () => {
    await expect(updateSettings(idleState, forStudio(settings()))).rejects.toThrow("/backoffice/login");
    await expect(updateBrandColors(idleState, forStudio(colors("#000000", "#000000")))).rejects.toThrow("/backoffice/login");
    await expect(uploadBrandImage("logo", forStudio(await upload(await png(10, 10))))).rejects.toThrow("/backoffice/login");
    await expect(removeBrandImage("logo", TENANT_B)).rejects.toThrow("/backoffice/login");
    await expect(resetBrandColors(forStudio(new FormData()))).rejects.toThrow("/backoffice/login");

    expect((await getTenantById(TENANT_B))?.name).toBe("B");
  });

  it("refuses ids that aren't a studio", async () => {
    session.platform = true;

    await expect(updateSettings(idleState, forStudio(settings(), "nope"))).rejects.toThrow("Unknown studio");
    await expect(updateSettings(idleState, forStudio(settings(), "64b000000000000000000099"))).rejects.toThrow("Unknown studio");
  });
});

describe("images", () => {
  it("turns the logo into a square PNG icon too", async () => {
    await uploadBrandImage("logo", await upload(await png(1200, 400)));

    const { logo, iconSrc } = (await getTenantById(TENANT_A))!.brand;
    expect(logo).toMatchObject({ width: 800, height: 267 });

    const icon = await readImage(fileIdOf(iconSrc ?? undefined));
    expect(icon?.contentType).toBe("image/png");
    expect(await sharp(icon!.buffer).metadata()).toMatchObject({ width: 180, height: 180, hasAlpha: true });
  });

  it("stores the banner with its blur placeholder, without touching the logo", async () => {
    await uploadBrandImage("banner", await upload(await png(800, 600)));

    const { banner, logo } = (await getTenantById(TENANT_A))!.brand;
    expect(banner?.blurDataURL).toContain("data:image/webp");
    expect(logo).toBeNull();
  });

  it("deletes the files it replaces and removes", async () => {
    await uploadBrandImage("logo", await upload(await png(300, 300)));
    const first = (await getTenantById(TENANT_A))!.brand;

    await uploadBrandImage("logo", await upload(await png(400, 400)));
    expect(await readImage(fileIdOf(first.logo?.src))).toBeNull();
    expect(await readImage(fileIdOf(first.iconSrc ?? undefined))).toBeNull();

    const second = (await getTenantById(TENANT_A))!.brand;
    await removeBrandImage("logo");
    expect(await readImage(fileIdOf(second.logo?.src))).toBeNull();
    expect((await getTenantById(TENANT_A))?.brand).toMatchObject({ logo: null, iconSrc: null });
  });

  it("refuses what isn't a usable image and keeps the current one", async () => {
    await uploadBrandImage("logo", await upload(await png(300, 300)));
    const before = (await getTenantById(TENANT_A))!.brand.logo;

    expect((await uploadBrandImage("logo", await upload(new Uint8Array([1, 2, 3])))).status).toBe("error");
    expect((await uploadBrandImage("logo", await upload(await png(10, 10), "image/svg+xml"))).status).toBe("error");
    expect((await uploadBrandImage("logo", await upload(new Uint8Array(BRAND_MAX_UPLOAD_BYTES + 1)))).status).toBe("error");

    expect((await getTenantById(TENANT_A))?.brand.logo).toEqual(before);
  });

  it("only accepts the two known kinds", async () => {
    await expect(uploadBrandImage("slug" as never, await upload(await png(10, 10)))).rejects.toThrow();
    await expect(removeBrandImage("whatsappNumber" as never)).rejects.toThrow();
  });
});
