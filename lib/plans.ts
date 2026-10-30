/** Shown to customers; what's charged is the matching price in Stripe, see `priceIdFor`. */
export const PLANS = [
  { id: "mensal", name: "Mensal", priceCents: 999, period: "mês" },
  { id: "anual", name: "Anual", priceCents: 9999, period: "ano" },
] as const;

export type Plan = (typeof PLANS)[number];
export type PlanId = Plan["id"];

export const YEARLY_SAVING_CENTS = PLANS[0].priceCents * 12 - PLANS[1].priceCents;

/** `value` comes from the browser; anything unknown falls back to the monthly plan. */
export function toPlan(value: unknown): Plan {
  return PLANS.find((plan) => plan.id === value) ?? PLANS[0];
}
