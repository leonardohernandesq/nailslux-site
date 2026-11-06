"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import type { FormState } from "./form-state";

/**
 * Creates the calendar feed link, or replaces it: the old link stops working at
 * once, so it's how a studio shuts out anyone it was shared with by mistake.
 */
export async function resetCalendarLink(): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, { calendarToken: randomBytes(32).toString("base64url") });
  refresh();
  return { status: "success", message: "Link criado. Copie-o para o seu calendário." };
}

export async function setBookingEmails(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const on = formData.get("notifyNewBookings") === "on";
  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, { notifyNewBookings: on });
  refresh();
  return { status: "success", message: on ? "Vai receber um email a cada novo pedido." : "Deixa de receber emails de novos pedidos." };
}
