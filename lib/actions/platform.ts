"use server";

import { isValidObjectId } from "mongoose";
import { AuthError } from "next-auth";
import { refresh, updateTag } from "next/cache";
import { signIn, signOut } from "@/auth";
import { requirePlatformAdmin } from "../auth/dal";
import { ENDED_SUBSCRIPTIONS } from "../billing/subscription";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { loginSchema } from "../validation/auth";
import { validationError, type FormState } from "./form-state";

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
