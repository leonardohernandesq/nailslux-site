import { describe, expect, it } from "vitest";
import { allSlots, dateBounds, slotsFor } from "@/lib/schedule";
import type { OpeningHours } from "@/lib/site";
import { createBookingSchema } from "@/lib/validation/booking";

const hours: OpeningHours = {
  days: [1, 2, 3, 4, 5, 6],
  opens: "09:00",
  lastStart: "11:00",
  slotMinutes: 30,
  maxDaysAhead: 30,
};

// Wednesday 14 Oct 2026, 09:40 local time
const now = new Date(2026, 9, 14, 9, 40);

describe("schedule", () => {
  it("lists every slot between opening and last start", () => {
    expect(allSlots(hours)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("hides slots that already passed today", () => {
    expect(slotsFor("2026-10-14", hours, now)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("offers all slots on future open days and none on closed days", () => {
    expect(slotsFor("2026-10-15", hours, now)).toHaveLength(5);
    expect(slotsFor("2026-10-18", hours, now)).toEqual([]); // Sunday
  });

  it("computes the bookable date range", () => {
    expect(dateBounds(hours, now)).toEqual({ min: "2026-10-14", max: "2026-11-13" });
  });
});

describe("createBookingSchema", () => {
  const schema = createBookingSchema({ serviceIds: ["a", "b"], hours, now });
  const valid = { name: "Ana", phone: "351912345678", serviceIds: ["a"], date: "2026-10-15", time: "10:30", notes: "" };

  const errorsFor = (input: object) => {
    const result = schema.safeParse(input);
    return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
  };

  it("accepts a valid request and drops empty notes", () => {
    expect(schema.parse(valid)).toEqual({ ...valid, notes: undefined });
  });

  it("requires at least one known service", () => {
    expect(errorsFor({ ...valid, serviceIds: [] })).toHaveProperty("serviceIds");
    expect(errorsFor({ ...valid, serviceIds: ["zzz"] })).toHaveProperty("serviceIds");
  });

  it("rejects past dates, closed days and dates too far ahead", () => {
    expect(errorsFor({ ...valid, date: "2026-10-13" }).date).toMatch(/a partir de hoje/);
    expect(errorsFor({ ...valid, date: "2026-10-18" }).date).toMatch(/fechado/);
    expect(errorsFor({ ...valid, date: "2026-12-01" }).date).toMatch(/30 dias/);
  });

  it("rejects times outside the slots or already passed", () => {
    expect(errorsFor({ ...valid, time: "10:15" })).toHaveProperty("time");
    expect(errorsFor({ ...valid, date: "2026-10-14", time: "09:30" })).toHaveProperty("time");
    expect(errorsFor({ ...valid, date: "2026-10-14", time: "10:00" })).toEqual({});
  });

  it("requires a name", () => {
    expect(errorsFor({ ...valid, name: " " })).toHaveProperty("name");
  });

  it("requires a valid WhatsApp number and stores it with the country code", () => {
    expect(errorsFor({ ...valid, phone: "" }).phone).toMatch(/WhatsApp/);
    expect(errorsFor({ ...valid, phone: "12345" })).toHaveProperty("phone");
    expect(schema.parse({ ...valid, phone: "912 345 678" }).phone).toBe("351912345678");
  });
});
