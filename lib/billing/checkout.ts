import "server-only";
import { Tenant } from "../db/models";
import type { PlanId } from "../plans";
import { getStripe, priceIdFor } from "../stripe";

export const billingPageUrl = () => `${process.env.SITE_URL ?? "http://localhost:3000"}/admin/subscricao`;

type CheckoutInput = {
  tenantId: string;
  email: string;
  name: string;
  customer?: string | null;
  plan: PlanId;
};

/** A Stripe payment page for this studio, creating its Stripe customer the first time. */
export async function createCheckoutUrl({ tenantId, email, name, customer, plan }: CheckoutInput): Promise<string | null> {
  const stripe = getStripe();
  if (!customer) {
    const created = await stripe.customers.create(
      { email, name, metadata: { tenantId } },
      { idempotencyKey: `customer-${tenantId}` },
    );
    customer = created.id;
    await Tenant.updateOne({ _id: tenantId }, { stripeCustomerId: customer });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    locale: "pt",
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    // How the webhook finds the studio. Payment methods come from the Stripe dashboard.
    subscription_data: { metadata: { tenantId } },
    success_url: `${billingPageUrl()}?pago=1`,
    cancel_url: billingPageUrl(),
  });
  return session.url;
}
