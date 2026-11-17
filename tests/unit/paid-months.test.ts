import { describe, expect, it } from "vitest";
import { formatMonth, paidMonths } from "@/lib/billing/paid-months";

const at = (iso: string) => Date.parse(iso) / 1000;

describe("paidMonths", () => {
  it("counts a monthly period as the month it starts in", () => {
    expect(paidMonths([{ start: at("2026-01-15T10:00:00Z"), end: at("2026-02-15T10:00:00Z") }])).toEqual(["2026-01"]);
  });

  it("doesn't skip or double February for a period starting on the 31st", () => {
    expect(
      paidMonths([
        { start: at("2026-01-31T10:00:00Z"), end: at("2026-02-28T10:00:00Z") },
        { start: at("2026-02-28T10:00:00Z"), end: at("2026-03-31T10:00:00Z") },
      ]),
    ).toEqual(["2026-01", "2026-02"]);
  });

  it("spreads a yearly plan over twelve months, across the new year", () => {
    const months = paidMonths([{ start: at("2026-03-10T10:00:00Z"), end: at("2027-03-10T10:00:00Z") }]);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-03");
    expect(months.at(-1)).toBe("2027-02");
  });

  it("merges repeated months, sorts them and keeps gaps", () => {
    expect(
      paidMonths([
        { start: at("2026-05-01T10:00:00Z"), end: at("2026-06-01T10:00:00Z") },
        { start: at("2026-02-01T10:00:00Z"), end: at("2026-03-01T10:00:00Z") },
        { start: at("2026-05-20T10:00:00Z"), end: at("2026-05-30T10:00:00Z") },
      ]),
    ).toEqual(["2026-02", "2026-05"]);
  });

  it("uses Lisbon time, so a period starting at midnight there counts in that month", () => {
    // 1 Jul 00:30 in Lisbon is still 30 Jun in UTC.
    expect(paidMonths([{ start: at("2026-06-30T23:30:00Z"), end: at("2026-07-31T23:30:00Z") }])).toEqual(["2026-07"]);
  });
});

describe("formatMonth", () => {
  it("names the month in Portuguese", () => {
    expect(formatMonth("2026-01")).toBe("jan 2026");
    expect(formatMonth("2027-12")).toBe("dez 2027");
  });
});
