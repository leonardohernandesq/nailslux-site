import "server-only";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { getStripe } from "../stripe";
import { nextChargeOf } from "./free-time";

export type SubscriptionDetails = {
  status: string;
  plan: "mensal" | "anual";
  /** When the next charge happens, or when the subscription ends if it's set to. */
  nextDate: string;
  /** The subscription stops at `nextDate` instead of renewing. */
  ending: boolean;
  /** A free period (referral or offered time) runs until `nextDate`. */
  free: boolean;
  hasCard: boolean;
  /** Money in the studio's favour on Stripe, in cents (0 when none). */
  creditCents: number;
};

export type AccessGrant = { at: string; by: string; amount: number; unit: "days" | "months"; until: string };

/**
 * The studio's subscription as Stripe has it now, read live for the billing pages.
 * Null without a subscription, or when Stripe can't be reached (the page then
 * shows the stored status only).
 */
export async function getSubscriptionDetails(tenantId: string): Promise<SubscriptionDetails | null> {
  await connectDB();
  const tenant = await Tenant.findById(tenantId, { stripeSubscriptionId: 1, stripeCustomerId: 1 }).lean();
  if (!tenant?.stripeSubscriptionId) return null;

  try {
    const stripe = getStripe();
    const [subscription, customer] = await Promise.all([
      stripe.subscriptions.retrieve(tenant.stripeSubscriptionId),
      tenant.stripeCustomerId ? stripe.customers.retrieve(tenant.stripeCustomerId) : null,
    ]);
    const ending = subscription.cancel_at_period_end || Boolean(subscription.cancel_at);
    const next = subscription.cancel_at ?? nextChargeOf(subscription);
    const balance = customer && !customer.deleted ? customer.balance : 0;
    return {
      status: subscription.status,
      plan: subscription.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal",
      nextDate: new Date((subscription.ended_at ?? next) * 1000).toISOString(),
      ending: ending || Boolean(subscription.ended_at),
      free: subscription.status === "trialing",
      hasCard: Boolean(
        subscription.default_payment_method || (customer && !customer.deleted && customer.invoice_settings.default_payment_method),
      ),
      // Stripe keeps credit as a negative balance.
      creditCents: balance < 0 ? -balance : 0,
    };
  } catch (error) {
    console.error("Could not read the subscription from Stripe.", error);
    return null;
  }
}

export async function getAccessGrants(tenantId: string): Promise<AccessGrant[]> {
  await connectDB();
  const tenant = await Tenant.findById(tenantId, { accessGrants: 1 }).lean();
  return (tenant?.accessGrants ?? [])
    .map((grant) => ({
      at: grant.at.toISOString(),
      by: grant.by,
      amount: grant.amount,
      unit: grant.unit as AccessGrant["unit"],
      until: grant.until.toISOString(),
    }))
    .reverse();
}

/** Whole days from `now` until `date`, never below zero. */
export function daysUntil(date: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000));
}
