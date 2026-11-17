"use server";

import { auth } from "@/auth";
import { escapeHtml, sendMail } from "../mail";
import { PLATFORM } from "../site";
import { contactKindLabel, contactSchema } from "../validation/contact";
import { formValues, validationError, type FormState } from "./form-state";

/**
 * Sends a message from /contacto to the platform's inbox. "Reply" in the email goes
 * to the person who wrote it. A studio owner who is signed in is named in the email,
 * so we know which site it's about even if they leave that field empty.
 */
export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  // Hidden from people; bots that fill in every field stop here, and think it worked.
  if (formData.get("website")) return { status: "success", message: "Mensagem enviada. Obrigado!" };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { kind, name, email, site, message } = parsed.data;

  const session = await auth().catch(() => null);
  const account = session?.user?.tenantSlug ? `${session.user.tenantSlug} (sessão iniciada como ${session.user.email})` : null;

  const label = contactKindLabel(kind);
  const lines: [string, string][] = [
    ["Tipo", label],
    ["Nome", name],
    ["Email", email],
    ...(site ? ([["Site", site]] as [string, string][]) : []),
    ...(account ? ([["Conta", account]] as [string, string][]) : []),
  ];
  // Newlines in a subject break some mail clients, and a name could carry them.
  const subject = `[${label}] ${name}${site ? ` · ${site}` : ""}`.replace(/\s+/g, " ").slice(0, 150);

  const sent = await sendMail({
    to: PLATFORM.contactEmail,
    replyTo: email,
    subject: `${PLATFORM.name} · ${subject}`,
    text: `${lines.map(([key, value]) => `${key}: ${value}`).join("\n")}\n\n${message}`,
    html:
      `<p>${lines.map(([key, value]) => `<strong>${key}:</strong> ${escapeHtml(value)}`).join("<br>")}</p>` +
      `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });

  if (!sent) {
    return {
      status: "error",
      message: `Não foi possível enviar agora. Tente mais tarde ou escreva para ${PLATFORM.contactEmail}.`,
      values,
    };
  }
  return { status: "success", message: "Mensagem enviada. Obrigado! Respondemos para o seu email." };
}
