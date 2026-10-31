import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseName } from "@/lib/db/connect";

afterEach(() => vi.unstubAllEnvs());

describe("databaseName", () => {
  it("uses the production database only on production deployments", () => {
    vi.stubEnv("MONGODB_DB", "");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(databaseName()).toBe("production");

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(databaseName()).toBeUndefined();

    vi.stubEnv("VERCEL_ENV", "");
    expect(databaseName()).toBeUndefined();
  });

  it("lets a script choose it by hand", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MONGODB_DB", "production");
    expect(databaseName()).toBe("production");
  });
});
