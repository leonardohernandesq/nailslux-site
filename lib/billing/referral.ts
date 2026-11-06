import "server-only";
import type { Types } from "mongoose";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { extendSubscription } from "./free-time";

/** The sign-up link a studio shares. Its slug is the code: readable, and already unique. */
export const referralUrl = (slug: string) => `${process.env.SITE_URL ?? "http://localhost:3000"}/registo?ref=${slug}`;

const PAYING = ["active", "trialing"];

type Side = "referred" | "referrer";
const DONE_FIELD = { referred: "referredFreeMonthAt", referrer: "referrerFreeMonthAt" } as const;

/**
 * Runs one side of the reward once: it's claimed in the database first, so two
 * webhook deliveries can't both extend; if Stripe fails, the claim is released
 * and Stripe's retry of the webhook tries again.
 */
async function rewardSide(referredId: string, side: Side, subscriptionId: string | null | undefined): Promise<void> {
  if (!subscriptionId) return;
  const field = DONE_FIELD[side];
  const claimed = await Tenant.updateOne({ _id: referredId, [field]: null }, { [field]: new Date() });
  if (claimed.modifiedCount === 0) return;

  try {
    // A free month: the next charge moves a month later (see extendSubscription).
    const extended = await extendSubscription(subscriptionId, { amount: 1, unit: "months" }, `referral-${referredId}-${side}`);
    if (!extended) await Tenant.updateOne({ _id: referredId }, { $unset: { [field]: 1 } });
  } catch (error) {
    await Tenant.updateOne({ _id: referredId }, { $unset: { [field]: 1 } });
    throw error;
  }
}

/**
 * When a studio that signed up through a referral link starts paying, it and the
 * studio that referred it each get a free month. A referrer billed outside Stripe,
 * or without a paying subscription, has nothing to extend, so only the new studio
 * gains.
 */
export async function rewardReferral(tenantId: Types.ObjectId | string): Promise<void> {
  await connectDB();
  const referred = await Tenant.findOne(
    { _id: tenantId, referredBy: { $ne: null } },
    { referredBy: 1, stripeSubscriptionId: 1, subscriptionStatus: 1 },
  ).lean();
  if (!referred?.referredBy || !PAYING.includes(referred.subscriptionStatus ?? "")) return;

  const id = String(tenantId);
  await rewardSide(id, "referred", referred.stripeSubscriptionId);

  const referrer = await Tenant.findById(referred.referredBy, { stripeSubscriptionId: 1, subscriptionStatus: 1 }).lean();
  if (referrer && PAYING.includes(referrer.subscriptionStatus ?? "")) {
    await rewardSide(id, "referrer", referrer.stripeSubscriptionId);
  }
}

/** The active studio behind a referral code, or null. `code` comes from the URL. */
export async function findReferrer(code: unknown): Promise<{ id: string; name: string } | null> {
  if (typeof code !== "string" || !/^[a-z0-9-]{1,40}$/.test(code)) return null;
  await connectDB();
  const tenant = await Tenant.findOne({ slug: code, status: "active" }, { name: 1 }).lean();
  return tenant ? { id: String(tenant._id), name: tenant.name } : null;
}

export type ReferredStudio = {
  name: string;
  joinedAt: string;
  /** Has an active or trialing subscription now. */
  paying: boolean;
  /** The referrer's free month for this studio has been given. */
  rewarded: boolean;
};

/** Studios that signed up through this one's link, newest first. */
export async function getReferredStudios(tenantId: string): Promise<ReferredStudio[]> {
  await connectDB();
  const docs = await Tenant.find(
    { referredBy: tenantId },
    { name: 1, createdAt: 1, subscriptionStatus: 1, referrerFreeMonthAt: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return docs.map((doc) => ({
    name: doc.name,
    joinedAt: (doc.createdAt ?? new Date(0)).toISOString(),
    paying: PAYING.includes(doc.subscriptionStatus ?? ""),
    rewarded: Boolean(doc.referrerFreeMonthAt),
  }));
}
