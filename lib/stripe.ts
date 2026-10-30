import "server-only";
import Stripe from "stripe";
import type { PlanId } from "./plans";

let client: Stripe | undefined;

export function priceIdFor(plan: PlanId): string | undefined {
  return plan === "anual" ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID;
}

export function isBillingConfigured(plan: PlanId = "mensal"): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && priceIdFor(plan));
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return (client ??= new Stripe(key));
}
