import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// --- Next.js / auth boundaries -------------------------------------------------
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ id: "u1", name: "Admin", email: "admin@test.pt" })),
}));
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  refresh: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { connectDB, disconnectDB } = await import("@/lib/db/connect");
const { PortfolioItem } = await import("@/lib/db/models");
const { PORTFOLIO_MAX_ITEMS } = await import("@/lib/constants");
const actions = await import("@/lib/actions/portfolio");

let mongo: MongoMemoryServer;
let png: Buffer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("nailslux-test");
  await connectDB();
  png = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#f4a582" } }).png().toBuffer();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await PortfolioItem.deleteMany({});
});

function photoForm() {
  const data = new FormData();
  data.set("file", new File([new Uint8Array(png)], "nails.png", { type: "image/png" }));
  return data;
}

async function fillPortfolio(count: number) {
  await PortfolioItem.insertMany(
    Array.from({ length: count }, () => ({
      fileId: new mongoose.Types.ObjectId(),
      width: 40,
      height: 50,
      blurDataUrl: "data:image/webp;base64,",
    })),
  );
}

describe("portfolio upload limit", () => {
  it("accepts a photo while there is room", async () => {
    await fillPortfolio(PORTFOLIO_MAX_ITEMS - 1);
    const result = await actions.uploadPortfolioPhoto(photoForm());
    expect(result.status).toBe("success");
    expect(await PortfolioItem.countDocuments()).toBe(PORTFOLIO_MAX_ITEMS);
  });

  it("refuses a photo once the portfolio is full", async () => {
    await fillPortfolio(PORTFOLIO_MAX_ITEMS);
    const result = await actions.uploadPortfolioPhoto(photoForm());
    expect(result).toMatchObject({ status: "error", message: expect.stringContaining("Remova uma") });
    expect(await PortfolioItem.countDocuments()).toBe(PORTFOLIO_MAX_ITEMS);
  });
});
