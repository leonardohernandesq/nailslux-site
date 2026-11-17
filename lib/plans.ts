/** The currencies the plans are sold in. Each one must also be on the Stripe prices. */
export type PlanCurrency = "EUR" | "BRL";

/**
 * Shown to customers; what's charged is the matching price in Stripe, see `priceIdFor`.
 * The BRL amounts must match the `brl` currency option on those Stripe prices.
 */
export const PLANS = [
  { id: "mensal", name: "Mensal", prices: { EUR: 490, BRL: 1990 }, period: "mês" },
  { id: "anual", name: "Anual", prices: { EUR: 4690, BRL: 18990 }, period: "ano" },
] as const;

export type Plan = (typeof PLANS)[number];
export type PlanId = Plan["id"];

/** A year of the monthly plan, to compare with the yearly one. */
export const twelveMonthsCents = (currency: PlanCurrency) => PLANS[0].prices[currency] * 12;
export const yearlySavingCents = (currency: PlanCurrency) => twelveMonthsCents(currency) - PLANS[1].prices[currency];

/** VAT is added in Portugal; a studio in Brazil pays the price as shown. */
export const taxNote = (currency: PlanCurrency) => (currency === "EUR" ? " + IVA" : "");

/** Studios in Brazil pay in reais, everyone else in euros. `country` is an ISO code like "BR". */
export function currencyForCountry(country: string | null | undefined): PlanCurrency {
  return country?.trim().toUpperCase() === "BR" ? "BRL" : "EUR";
}

/** `value` comes from the browser; anything unknown falls back to the monthly plan. */
export function toPlan(value: unknown): Plan {
  return PLANS.find((plan) => plan.id === value) ?? PLANS[0];
}
