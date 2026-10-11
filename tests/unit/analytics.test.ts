import { describe, expect, it, vi } from "vitest";
import { isBot, lisbonDay, visitorHash } from "@/lib/analytics/server";
import { lastDays, parsePeriod } from "@/lib/data/analytics";
import { trackEventSchema } from "@/lib/validation/analytics";

// Pure helpers only; keep Auth.js (and Next's server runtime) out of this test.
vi.mock("@/lib/auth/dal", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));

const CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("analytics helpers", () => {
  it("recognises bots and link previews", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isBot("")).toBe(true);
  });

  it("gives the same visitor the same id within a day, and a new one the next day", () => {
    const morning = new Date("2026-10-14T08:00:00Z");
    const evening = new Date("2026-10-14T20:00:00Z");
    const nextDay = new Date("2026-10-15T08:00:00Z");
    const id = visitorHash("1.2.3.4", CHROME, morning);
    expect(visitorHash("1.2.3.4", CHROME, evening)).toBe(id);
    expect(visitorHash("1.2.3.4", CHROME, nextDay)).not.toBe(id);
    expect(visitorHash("5.6.7.8", CHROME, morning)).not.toBe(id);
    expect(id).not.toContain("1.2.3.4");
  });

  it("uses Lisbon calendar days", () => {
    // 23:30 UTC in summer is already the next day in Lisbon (UTC+1).
    expect(lisbonDay(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(lastDays(3, new Date("2026-10-14T12:00:00Z"))).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
  });

  it("only accepts the known periods", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });

  it("validates events sent by the browser", () => {
    expect(trackEventSchema.safeParse({ type: "pageview" }).success).toBe(true);
    expect(
      trackEventSchema.safeParse({ type: "booking", serviceIds: ["a"], date: "2026-10-16", time: "10:30" }).success,
    ).toBe(true);
    expect(trackEventSchema.safeParse({ type: "booking", serviceIds: [], date: "x", time: "25:00" }).success).toBe(
      false,
    );
    expect(trackEventSchema.safeParse({ type: "whatsapp_click", source: "<script>" }).success).toBe(false);
    expect(trackEventSchema.safeParse({ type: "other" }).success).toBe(false);
  });
});
