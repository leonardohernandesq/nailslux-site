import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";

const PAYING: string[] = ["active", "trialing"];

// past_due is left out on purpose: Stripe is still retrying the card, and that is
// the grace period. Once its retries run out it ends the subscription (see the
// "Subscriptions and emails" setting in the Stripe dashboard) and lands here.
const ENDED: string[] = ["canceled", "unpaid", "paused", "incomplete_expired"];

/** A studio's site goes public once its email is confirmed and it's paying, in either order. */
export async function publishIfReady(tenantId: Types.ObjectId | string) {
  return Tenant.findOneAndUpdate(
    { _id: tenantId, status: "pending", emailConfirmedAt: { $ne: null }, subscriptionStatus: { $in: PAYING } },
    { status: "active" },
  ).lean();
}

/**
 * Brings a studio in line with its subscription. Safe to run repeatedly and in any
 * order: pass the subscription as Stripe has it now, not as an event described it.
 * Only studios with a subscription ever get here, so a studio billed outside Stripe
 * can't be suspended by this.
 */
export async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata.tenantId;
  if (!isValidObjectId(tenantId)) return;

  await connectDB();
  const tenant = await Tenant.findById(tenantId, { slug: 1, stripeSubscriptionId: 1 }).lean();
  if (!tenant) return;

  const paying = PAYING.includes(subscription.status);
  // An old subscription ending must not touch a studio that has since taken a new one.
  const replaced = tenant.stripeSubscriptionId && tenant.stripeSubscriptionId !== subscription.id;
  if (replaced && !paying) return;

  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await Tenant.updateOne(
    { _id: tenantId },
    { stripeCustomerId: customer, stripeSubscriptionId: subscription.id, subscriptionStatus: subscription.status },
  );

  if (paying) {
    await publishIfReady(tenantId);
    // Only undoes a billing suspension; one made by hand stays.
    await Tenant.updateOne(
      { _id: tenantId, status: "suspended", suspendedFor: "billing" },
      { $set: { status: "active" }, $unset: { suspendedFor: 1 } },
    );
  } else if (ENDED.includes(subscription.status)) {
    await Tenant.updateOne({ _id: tenantId, status: "active" }, { status: "suspended", suspendedFor: "billing" });
  }

  // { expire: 0 }: a suspended site must not be served stale. updateTag needs a Server Action.
  revalidateTag(CACHE_TAGS.tenant(tenant.slug), { expire: 0 });
}
