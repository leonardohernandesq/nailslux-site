"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { getStripe, isBillingConfigured } from "../stripe";
import type { FormState } from "./form-state";

// Still has a subscription to manage, so a new one would mean paying twice.
const MANAGED_IN_PORTAL = ["active", "trialing", "past_due", "unpaid", "paused"];

const returnUrl = () => `${process.env.SITE_URL ?? "http://localhost:3000"}/admin/subscricao`;

const UNAVAILABLE: FormState = { status: "error", message: "Os pagamentos ainda não estão disponíveis." };

/** Sends the owner to Stripe to subscribe, or to manage the subscription they have. */
export async function openBilling(): Promise<FormState> {
  const { tenantId, email } = await requireAdmin();
  if (!isBillingConfigured()) return UNAVAILABLE;

  await connectDB();
  const tenant = await Tenant.findById(tenantId, { name: 1, stripeCustomerId: 1, subscriptionStatus: 1 }).lean();
  if (!tenant) return UNAVAILABLE;

  const stripe = getStripe();
  let url: string | null;
  if (tenant.stripeCustomerId && MANAGED_IN_PORTAL.includes(tenant.subscriptionStatus ?? "")) {
    const portal = await stripe.billingPortal.sessions.create({ customer: tenant.stripeCustomerId, return_url: returnUrl() });
    url = portal.url;
  } else {
    let customer = tenant.stripeCustomerId;
    if (!customer) {
      const created = await stripe.customers.create(
        { email, name: tenant.name, metadata: { tenantId } },
        { idempotencyKey: `customer-${tenantId}` },
      );
      customer = created.id;
      await Tenant.updateOne({ _id: tenantId }, { stripeCustomerId: customer });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      locale: "pt",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // How the webhook finds the studio. Payment methods come from the Stripe dashboard.
      subscription_data: { metadata: { tenantId } },
      success_url: `${returnUrl()}?pago=1`,
      cancel_url: returnUrl(),
    });
    url = session.url;
  }

  if (!url) return { status: "error", message: "Não foi possível abrir a página de pagamento." };
  redirect(url);
}
