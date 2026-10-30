"use server";

import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { requireAdmin } from "../auth/dal";
import { consumeAuthToken, createAuthToken, lastTokenAt } from "../auth/tokens";
import { createCheckoutUrl } from "../billing/checkout";
import { publishIfReady } from "../billing/subscription";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Tenant, User } from "../db/models";
import { actionMail, sendMail } from "../mail";
import { toPlan } from "../plans";
import { isRegistrationOpen, PLATFORM } from "../site";
import { isBillingConfigured } from "../stripe";
import { loginSchema } from "../validation/auth";
import { passwordSchema, registerSchema } from "../validation/registration";
import { formValues, validationError, type FormState } from "./form-state";

const RESEND_WAIT_MS = 60 * 1000;

const baseUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

async function sendConfirmation(user: { _id: Types.ObjectId; email: string }): Promise<boolean> {
  const token = await createAuthToken(user._id, "confirm-email");
  return sendMail({
    to: user.email,
    subject: `Confirme o seu email no ${PLATFORM.name}`,
    ...actionMail(
      "Falta só um passo para publicar o site do seu studio.",
      "Confirmar email",
      `${baseUrl()}/registo/confirmar?token=${token}`,
    ),
  });
}

/**
 * Creates a studio and its owner, logs them in and sends them to pay for the plan
 * they chose. The studio starts "pending": the owner can set it up, but its site
 * stays private until the email is confirmed and the subscription is active.
 */
export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isRegistrationOpen()) return { status: "error", message: "Os registos ainda não estão abertos." };

  const values = formValues(formData);
  delete values.password; // never sent back to the browser
  // Hidden from people; bots that fill in every field stop here.
  if (formData.get("website")) return { status: "error", message: "Não foi possível criar a conta.", values };

  const parsed = registerSchema.safeParse({ ...formValues(formData), terms: formData.get("terms") ?? "" });
  if (!parsed.success) return validationError(parsed.error, values);
  const { studioName, slug, whatsappNumber, ownerName, email, password } = parsed.data;

  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);

  let tenant;
  try {
    tenant = await Tenant.create({ slug, name: studioName, whatsappNumber, status: "pending" });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    return { status: "error", message: "Corrija os campos assinalados.", fieldErrors: { slug: ["Este endereço já está ocupado."] }, values };
  }

  let user;
  try {
    user = await User.create({ tenantId: tenant._id, name: ownerName, email, passwordHash });
  } catch (error) {
    await Tenant.deleteOne({ _id: tenant._id });
    if (!isDuplicate(error)) throw error;
    return { status: "error", message: "Corrija os campos assinalados.", fieldErrors: { email: ["Já existe uma conta com este email."] }, values };
  }

  await sendConfirmation(user);
  // No redirectTo: Auth.js only redirects within the site, and Stripe is elsewhere.
  await signIn("credentials", { email, password, redirect: false });

  // The account exists by now, so a Stripe failure must not look like a failed sign-up:
  // the panel can open the payment page again.
  const plan = toPlan(formData.get("plan"));
  let checkoutUrl: string | null = null;
  if (isBillingConfigured(plan.id)) {
    try {
      checkoutUrl = await createCheckoutUrl({ tenantId: String(tenant._id), email, name: studioName, plan: plan.id });
    } catch (error) {
      console.error("Could not open checkout after sign-up.", error);
    }
  }
  redirect(checkoutUrl ?? "/admin/definicoes?novo=1");
}

/** Publishes the studio if it's paying. Only a pending one: this can't undo a suspension. */
export async function confirmEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  await connectDB();
  const userId = await consumeAuthToken(String(formData.get("token") ?? ""), "confirm-email");
  const user = userId && (await User.findById(userId, { tenantId: 1 }).lean());
  if (!user?.tenantId) return { status: "error", message: "Este link já foi usado ou expirou. Peça outro no painel." };

  await Tenant.updateOne({ _id: user.tenantId }, { emailConfirmedAt: new Date() });
  const tenant = await publishIfReady(user.tenantId);
  if (!tenant) return { status: "success", message: "Email confirmado. Falta ativar a subscrição para publicar o site." };

  // A visit to this address before it existed may have cached "no such studio".
  updateTag(CACHE_TAGS.tenant(tenant.slug));
  return { status: "success", message: "Email confirmado. O seu site já está online." };
}

export async function resendConfirmation(): Promise<FormState> {
  const { id, tenantId } = await requireAdmin();
  await connectDB();
  const tenant = await Tenant.findOne({ _id: tenantId, emailConfirmedAt: null }, { _id: 1 }).lean();
  const user = await User.findById(id, { email: 1 }).lean();
  if (!tenant || !user) return { status: "error", message: "Este email já está confirmado." };

  const last = await lastTokenAt(user._id, "confirm-email");
  if (last && Date.now() - last.getTime() < RESEND_WAIT_MS) {
    return { status: "error", message: "Enviámos há pouco. Aguarde um minuto e veja o spam." };
  }
  const sent = await sendConfirmation(user);
  refresh();
  return sent
    ? { status: "success", message: "Enviámos um novo email." }
    : { status: "error", message: "Não foi possível enviar o email. Tente mais tarde." };
}

/** Answers the same whether or not the email exists, so accounts can't be discovered. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = loginSchema.shape.email.safeParse(formData.get("email") ?? "");
  if (!email.success) {
    return { status: "error", message: "Corrija os campos assinalados.", fieldErrors: { email: ["Indique um email válido."] } };
  }

  await connectDB();
  const user = await User.findOne({ email: email.data }, { email: 1 }).lean();
  if (user) {
    const last = await lastTokenAt(user._id, "reset-password");
    if (!last || Date.now() - last.getTime() >= RESEND_WAIT_MS) {
      const token = await createAuthToken(user._id, "reset-password");
      await sendMail({
        to: user.email,
        subject: `Recuperar a palavra-passe do ${PLATFORM.name}`,
        ...actionMail(
          "Recebemos um pedido para alterar a sua palavra-passe. O link é válido durante 1 hora.",
          "Escolher nova palavra-passe",
          `${baseUrl()}/recuperar/nova?token=${token}`,
        ),
      });
    }
  }
  return { status: "success", message: "Se existir uma conta com este email, enviámos um link para o recuperar." };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = passwordSchema.safeParse(formData.get("password") ?? "");
  if (!password.success) {
    return { status: "error", message: "Corrija os campos assinalados.", fieldErrors: { password: [password.error.issues[0].message] } };
  }

  await connectDB();
  const userId = await consumeAuthToken(String(formData.get("token") ?? ""), "reset-password");
  if (!userId) return { status: "error", message: "Este link já foi usado ou expirou. Peça outro." };

  await User.updateOne({ _id: userId }, { passwordHash: await bcrypt.hash(password.data, 12) });
  return { status: "success", message: "Palavra-passe alterada. Já pode entrar." };
}
