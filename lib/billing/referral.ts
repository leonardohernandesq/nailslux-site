import "server-only";
import type { Types } from "mongoose";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { formatPrice } from "../format";
import { PLANS } from "../plans";
import { getStripe } from "../stripe";

/** What each side of a referral gets: one month of the monthly plan, as account credit. */
export const REFERRAL_CREDIT_CENTS = PLANS[0].priceCents;

/** The sign-up link a studio shares. Its slug is the code: readable, and already unique. */
export const referralUrl = (slug: string) => `${process.env.SITE_URL ?? "http://localhost:3000"}/registo?ref=${slug}`;

/**
 * Credits both studios once the referred one's first subscription is paying.
 * Claimed in the database first, so two webhook deliveries can't credit twice;
 * if Stripe fails, the claim is released and Stripe's retry of the webhook tries
 * again (the idempotency keys keep a half-done attempt from crediting twice).
 * A referrer billed outside Stripe has no Stripe balance, so only the new studio
 * is credited.
 */
export async function rewardReferral(tenantId: Types.ObjectId | string): Promise<void> {
  await connectDB();
  const claimed = await Tenant.findOneAndUpdate(
    { _id: tenantId, referredBy: { $ne: null }, referralRewardedAt: null, stripeCustomerId: { $ne: null } },
    { referralRewardedAt: new Date() },
    { projection: { referredBy: 1, stripeCustomerId: 1 } },
  ).lean();
  if (!claimed?.referredBy || !claimed.stripeCustomerId) return;

  const referrer = await Tenant.findById(claimed.referredBy, { name: 1, stripeCustomerId: 1 }).lean();
  const credit = (customer: string, side: "referred" | "referrer", description: string) =>
    getStripe().customers.createBalanceTransaction(
      customer,
      { amount: -REFERRAL_CREDIT_CENTS, currency: "eur", description },
      { idempotencyKey: `referral-${String(tenantId)}-${side}` },
    );

  try {
    await credit(claimed.stripeCustomerId, "referred", `Crédito de boas-vindas por indicação (${formatPrice(REFERRAL_CREDIT_CENTS)})`);
    if (referrer?.stripeCustomerId) {
      await credit(referrer.stripeCustomerId, "referrer", `Crédito por indicar um studio (${formatPrice(REFERRAL_CREDIT_CENTS)})`);
    }
  } catch (error) {
    await Tenant.updateOne({ _id: tenantId }, { $unset: { referralRewardedAt: 1 } });
    throw error;
  }
}

/** The active studio behind a referral code, or null. `code` comes from the URL. */
export async function findReferrer(code: unknown): Promise<{ id: string; name: string } | null> {
  if (typeof code !== "string" || !/^[a-z0-9-]{1,40}$/.test(code)) return null;
  await connectDB();
  const tenant = await Tenant.findOne({ slug: code, status: "active" }, { name: 1 }).lean();
  return tenant ? { id: String(tenant._id), name: tenant.name } : null;
}

export async function getReferralStats(tenantId: string): Promise<{ signedUp: number; rewarded: number }> {
  await connectDB();
  const [signedUp, rewarded] = await Promise.all([
    Tenant.countDocuments({ referredBy: tenantId }),
    Tenant.countDocuments({ referredBy: tenantId, referralRewardedAt: { $ne: null } }),
  ]);
  return { signedUp, rewarded };
}
