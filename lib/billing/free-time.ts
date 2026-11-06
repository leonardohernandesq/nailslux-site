import "server-only";
import type Stripe from "stripe";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { getStripe, priceIdFor } from "../stripe";
import type { PlanId } from "../plans";

export type FreeTime = { amount: number; unit: "days" | "months" };

const PAYING = ["active", "trialing"];

/** `from` plus the free time, in UTC. A month is a calendar month (6 Dec → 6 Jan). */
export function addFreeTime(from: Date, time: FreeTime): Date {
  const result = new Date(from);
  if (time.unit === "months") result.setUTCMonth(result.getUTCMonth() + time.amount);
  else result.setUTCDate(result.getUTCDate() + time.amount);
  return result;
}

/** When the subscription will next charge: the end of the paid period or of a free one. */
export function nextChargeOf(subscription: Stripe.Subscription): number {
  return Math.max(subscription.trial_end ?? 0, ...subscription.items.data.map((item) => item.current_period_end));
}

/**
 * Moves a paying subscription's next charge later by `time`: the days until then
 * become a free trial in Stripe. Nothing is charged or refunded now, it works for
 * monthly and yearly plans alike, and extensions add up. Returns the new date, or
 * null when the subscription isn't paying (nothing to extend).
 */
export async function extendSubscription(subscriptionId: string, time: FreeTime, key: string): Promise<Date | null> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!PAYING.includes(subscription.status)) return null;

  const nextCharge = nextChargeOf(subscription);
  const until = addFreeTime(new Date(nextCharge * 1000), time);
  await stripe.subscriptions.update(
    subscriptionId,
    // "none": the time already paid for is kept, nothing is refunded or charged now.
    { trial_end: Math.floor(until.getTime() / 1000), proration_behavior: "none" },
    // Tied to the date being extended, so a retry can't add the time twice.
    { idempotencyKey: `${key}-${nextCharge}` },
  );
  return until;
}

/** The studio's Stripe customer, created the first time (as Checkout would). */
async function ensureCustomer(tenant: { _id: unknown; name: string; stripeCustomerId?: string | null }, email: string | undefined) {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const tenantId = String(tenant._id);
  const created = await getStripe().customers.create(
    { email, name: tenant.name, metadata: { tenantId } },
    { idempotencyKey: `customer-${tenantId}` },
  );
  await Tenant.updateOne({ _id: tenantId }, { stripeCustomerId: created.id });
  return created.id;
}

export type GrantResult =
  | { ok: true; until: Date; started: boolean; subscription: Stripe.Subscription | null }
  | { ok: false; message: string };

/**
 * Free time given by the platform admin. A paying subscription has its next charge
 * moved later. Otherwise a subscription starts as a free trial until the chosen
 * date, with no card: if the studio adds one in the meantime it carries on paid,
 * and if not Stripe cancels it at the end and the webhook suspends the site.
 */
export async function grantFreeTime(input: {
  tenantId: string;
  time: FreeTime;
  plan: PlanId;
  ownerEmail?: string;
}): Promise<GrantResult> {
  await connectDB();
  const tenant = await Tenant.findById(input.tenantId, {
    name: 1,
    status: 1,
    stripeCustomerId: 1,
    stripeSubscriptionId: 1,
    subscriptionStatus: 1,
  }).lean();
  if (!tenant) return { ok: false, message: "Studio não encontrado." };
  if (tenant.status === "active" && !tenant.stripeCustomerId) {
    return { ok: false, message: "Este studio é pago fora da Stripe, não tem subscrição para estender." };
  }
  if (tenant.subscriptionStatus === "past_due") {
    return { ok: false, message: "A subscrição tem um pagamento em falta. Resolva-o primeiro (ou espere que termine) e ofereça o tempo depois." };
  }

  const stripe = getStripe();
  const key = `grant-${input.tenantId}-${Date.now()}`;

  if (tenant.stripeSubscriptionId && PAYING.includes(tenant.subscriptionStatus ?? "")) {
    const until = await extendSubscription(tenant.stripeSubscriptionId, input.time, key);
    if (until) return { ok: true, until, started: false, subscription: null };
  }

  const price = priceIdFor(input.plan);
  if (!price) return { ok: false, message: "Os preços da Stripe não estão configurados." };
  const customer = await ensureCustomer(tenant, input.ownerEmail);
  const until = addFreeTime(new Date(), input.time);
  const subscription = await stripe.subscriptions.create(
    {
      customer,
      items: [{ price }],
      trial_end: Math.floor(until.getTime() / 1000),
      // Without a card by the end of the free time, the subscription ends by itself.
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      // How the webhook finds the studio, as with Checkout.
      metadata: { tenantId: input.tenantId },
    },
    { idempotencyKey: key },
  );
  return { ok: true, until, started: true, subscription };
}
