import { describe, expect, it } from "vitest";
import { bookingDuration, isSlotFree, overlaps, toMinutes } from "@/lib/schedule";

const at = (start: string, minutes: number) => ({ start: toMinutes(start), end: toMinutes(start) + minutes });

describe("availability", () => {
  it("adds up service durations, counting unknown ones as 1 hour", () => {
    expect(bookingDuration([{ durationMinutes: 60 }, { durationMinutes: 45 }])).toBe(105);
    expect(bookingDuration([{ durationMinutes: 90 }, {}])).toBe(150);
    expect(bookingDuration([{ durationMinutes: null }])).toBe(60);
  });

  it("treats appointments as half-open ranges", () => {
    expect(overlaps(at("18:00", 180), at("20:30", 30))).toBe(true);
    expect(overlaps(at("18:00", 180), at("21:00", 60))).toBe(false); // back to back
    expect(overlaps(at("16:00", 120), at("18:00", 180))).toBe(false);
  });

  it("blocks 18:00 to 21:00 for a confirmed 3-hour appointment at 18:00", () => {
    const busy = [at("18:00", 180)];
    for (const time of ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"]) {
      expect(isSlotFree(time, 30, busy), time).toBe(false);
    }
    expect(isSlotFree("21:00", 60, busy)).toBe(true);
    expect(isSlotFree("17:30", 30, busy)).toBe(true);
  });

  it("also blocks earlier starts whose own duration runs into a booked range", () => {
    const busy = [at("18:00", 180)];
    expect(isSlotFree("17:00", 120, busy)).toBe(false); // would run until 19:00
    expect(isSlotFree("16:00", 120, busy)).toBe(true); // ends exactly at 18:00
  });
});
