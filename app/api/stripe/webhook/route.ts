import type Stripe from "stripe";
import { applySubscription } from "@/lib/billing/subscription";
import { getStripe } from "@/lib/stripe";

const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

/**
 * Called by Stripe. Anything but a 2xx makes Stripe retry, so failures are left to
 * surface. Events can arrive twice or out of order, so each one only says which
 * subscription to look at, and its current state is read back from Stripe.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (SUBSCRIPTION_EVENTS.includes(event.type)) {
    const { id } = event.data.object as Stripe.Subscription;
    await applySubscription(await stripe.subscriptions.retrieve(id));
  }
  return new Response(null, { status: 204 });
}
