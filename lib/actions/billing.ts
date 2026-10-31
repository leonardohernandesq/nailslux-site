"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/dal";
import { billingPageUrl, createCheckoutUrl } from "../billing/checkout";
import { MANAGED_IN_PORTAL } from "../billing/subscription";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { toPlan } from "../plans";
import { getStripe, isBillingConfigured } from "../stripe";
import type { FormState } from "./form-state";

const UNAVAILABLE: FormState = { status: "error", message: "Os pagamentos ainda não estão disponíveis." };

/** Sends the owner to Stripe to subscribe, or to manage the subscription they have. */
export async function openBilling(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId, email } = await requireAdmin();
  const plan = toPlan(formData.get("plan"));
  if (!isBillingConfigured(plan.id)) return UNAVAILABLE;

  await connectDB();
  const tenant = await Tenant.findById(tenantId, { name: 1, stripeCustomerId: 1, subscriptionStatus: 1 }).lean();
  if (!tenant) return UNAVAILABLE;

  let url: string | null = null;
  try {
    if (tenant.stripeCustomerId && MANAGED_IN_PORTAL.includes(tenant.subscriptionStatus ?? "")) {
      const portal = await getStripe().billingPortal.sessions.create({ customer: tenant.stripeCustomerId, return_url: billingPageUrl() });
      url = portal.url;
    } else {
      url = await createCheckoutUrl({ tenantId, email, name: tenant.name, customer: tenant.stripeCustomerId, plan: plan.id });
    }
  } catch (error) {
    console.error("Could not open Stripe.", error);
  }

  if (!url) return { status: "error", message: "Não foi possível abrir a página de pagamento." };
  redirect(url);
}
