import { describe, expect, it } from "vitest";
import { formatPlanPrice } from "@/lib/format";
import { currencyForCountry, PLANS, taxNote, twelveMonthsCents, yearlySavingCents } from "@/lib/plans";

describe("plan currency", () => {
  it("charges studios in Brazil in reais and everyone else in euros", () => {
    expect(currencyForCountry("BR")).toBe("BRL");
    expect(currencyForCountry("br")).toBe("BRL");
    expect(currencyForCountry("PT")).toBe("EUR");
    expect(currencyForCountry("US")).toBe("EUR");
    expect(currencyForCountry(null)).toBe("EUR");
    expect(currencyForCountry(undefined)).toBe("EUR");
  });

  it("formats each currency the way its country writes it", () => {
    expect(formatPlanPrice(PLANS[0].prices.EUR, "EUR").replace(/\s/g, " ")).toBe("4,90 €");
    expect(formatPlanPrice(PLANS[0].prices.BRL, "BRL").replace(/\s/g, " ")).toBe("R$ 19,90");
  });

  it("only adds VAT to euro prices", () => {
    expect(taxNote("EUR")).toBe(" + IVA");
    expect(taxNote("BRL")).toBe("");
  });

  it("makes the yearly plan cheaper than twelve months in both currencies", () => {
    expect(yearlySavingCents("EUR")).toBe(twelveMonthsCents("EUR") - 4690);
    expect(yearlySavingCents("EUR")).toBeGreaterThan(0);
    expect(yearlySavingCents("BRL")).toBeGreaterThan(0);
  });
});
