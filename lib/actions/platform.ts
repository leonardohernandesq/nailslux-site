"use server";

import { isValidObjectId } from "mongoose";
import { AuthError } from "next-auth";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { requirePlatformAdmin } from "../auth/dal";
import { grantFreeTime } from "../billing/free-time";
import { applySubscription, ENDED_SUBSCRIPTIONS } from "../billing/subscription";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { AnalyticsEvent, Appointment, AuthToken, Client, PortfolioItem, Service, Tenant, User } from "../db/models";
import { deleteImage } from "../db/images";
import { getStripe } from "../stripe";
import { toPlan } from "../plans";
import { isBillingConfigured } from "../stripe";
import { grantTimeSchema } from "../validation/grant";
import { loginSchema } from "../validation/auth";
import { formValues, validationError, type FormState } from "./form-state";

export async function platformLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) return validationError(parsed.error, { email });

  try {
    await signIn("credentials", { ...parsed.data, scope: "platform", redirectTo: "/backoffice" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Email ou palavra-passe incorretos.", values: { email } };
    }
    throw error; // includes the success redirect
  }
  return { status: "success" };
}

export async function platformLogout(): Promise<void> {
  await signOut({ redirectTo: "/backoffice/login" });
}

/** Takes a live site down by hand. Only a person can undo this, never a payment. */
export async function suspendStudio(id: string): Promise<void> {
  await requirePlatformAdmin();
  if (!isValidObjectId(id)) return;

  await connectDB();
  const tenant = await Tenant.findOneAndUpdate(
    { _id: id, status: "active" },
    { status: "suspended", suspendedFor: "manual" },
  ).lean();
  if (tenant) updateTag(CACHE_TAGS.tenant(tenant.slug));
  refresh();
}

/**
 * Lifts a suspension made by hand. A billing suspension is left to Stripe, and if
 * the subscription ended in the meantime the site stays down as a billing case.
 */
export async function reactivateStudio(id: string): Promise<void> {
  await requirePlatformAdmin();
  if (!isValidObjectId(id)) return;

  await connectDB();
  const tenant = await Tenant.findOne({ _id: id, status: "suspended", suspendedFor: "manual" }).lean();
  if (!tenant) return;

  if (ENDED_SUBSCRIPTIONS.includes(tenant.subscriptionStatus ?? "")) {
    await Tenant.updateOne({ _id: id }, { suspendedFor: "billing" });
  } else {
    await Tenant.updateOne({ _id: id }, { $set: { status: "active" }, $unset: { suspendedFor: 1 } });
  }
  updateTag(CACHE_TAGS.tenant(tenant.slug));
  refresh();
}

const dateFormat = new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeZone: "Europe/Lisbon" });

/**
 * Free time for a studio, chosen by the platform admin: moves a paying
 * subscription's next charge later, or starts a free trial subscription that ends
 * by itself unless the studio adds a card (see grantFreeTime).
 */
export async function grantStudioTime(studioId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requirePlatformAdmin();
  const values = formValues(formData);
  const parsed = grantTimeSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isValidObjectId(studioId)) return { status: "error", message: "Studio não encontrado." };
  const plan = toPlan(parsed.data.plan);
  if (!isBillingConfigured(plan.id)) return { status: "error", message: "A Stripe não está configurada." };

  await connectDB();
  const owner = await User.findOne({ tenantId: studioId, role: "owner" }, { email: 1 }).sort({ createdAt: 1 }).lean();
  const time = { amount: parsed.data.amount, unit: parsed.data.unit };
  const result = await grantFreeTime({ tenantId: studioId, time, plan: plan.id, ownerEmail: owner?.email });
  if (!result.ok) return { status: "error", message: result.message, values };

  // Brings the studio in line now; the webhook will do the same moments later.
  if (result.subscription) await applySubscription(result.subscription);
  const tenant = await Tenant.findOneAndUpdate(
    { _id: studioId },
    { $push: { accessGrants: { at: new Date(), by: admin.email, ...time, until: result.until } } },
    { projection: { slug: 1 } },
  ).lean();
  if (tenant) updateTag(CACHE_TAGS.tenant(tenant.slug));
  refresh();

  const until = dateFormat.format(result.until);
  return {
    status: "success",
    message: result.started
      ? `Subscrição gratuita ativa até ${until}. Se o studio não puser um cartão até lá, termina sozinha.`
      : `Próxima cobrança adiada para ${until}.`,
  };
}

/**
 * Deletes a studio for good: its site, account, services, photos, bookings, client
 * cards and statistics. A live Stripe subscription is cancelled first, so a deleted
 * studio is never charged again; if Stripe refuses, nothing is deleted. `confirm`
 * must be the studio's address, typed by hand in the dialog.
 */
export async function deleteStudio(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  if (!isValidObjectId(id)) return { status: "error", message: "Studio não encontrado." };

  await connectDB();
  const tenant = await Tenant.findById(id).lean();
  if (!tenant) return { status: "error", message: "Studio não encontrado." };
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== tenant.slug) {
    return { status: "error", message: `Escreva ${tenant.slug} para confirmar.` };
  }

  if (tenant.stripeSubscriptionId && !ENDED_SUBSCRIPTIONS.includes(tenant.subscriptionStatus ?? "")) {
    try {
      await getStripe().subscriptions.cancel(tenant.stripeSubscriptionId);
    } catch (error) {
      // Already cancelled in Stripe is fine; anything else keeps the studio.
      const code = (error as { code?: string }).code;
      if (code !== "resource_missing") {
        console.error("Could not cancel the subscription of a studio being deleted.", error);
        return { status: "error", message: "A Stripe não cancelou a subscrição, por isso o studio não foi eliminado. Tente de novo." };
      }
    }
  }

  const tenantId = tenant._id;
  const portfolio = await PortfolioItem.find({ tenantId }, { fileId: 1 }).lean();
  const users = await User.find({ tenantId }, { _id: 1 }).lean();
  const fileIds = [
    tenant.logo?.fileId,
    tenant.logo?.iconFileId,
    tenant.banner?.fileId,
    tenant.favicon?.fileId,
    ...portfolio.map((item) => item.fileId),
  ].filter((fileId) => fileId != null);

  await Promise.all(fileIds.map((fileId) => deleteImage(fileId)));
  await Promise.all([
    Service.deleteMany({ tenantId }),
    PortfolioItem.deleteMany({ tenantId }),
    Appointment.deleteMany({ tenantId }),
    Client.deleteMany({ tenantId }),
    AnalyticsEvent.deleteMany({ tenantId }),
    AuthToken.deleteMany({ userId: { $in: users.map((user) => user._id) } }),
    User.deleteMany({ tenantId }),
  ]);
  // Studios it referred keep `referredBy`; the referrals page shows it as removed.
  await Tenant.deleteOne({ _id: tenantId });

  updateTag(CACHE_TAGS.tenant(tenant.slug));
  redirect("/backoffice");
}
