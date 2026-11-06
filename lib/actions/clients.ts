"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Appointment, Client } from "../db/models";
import { clientCardSchema, moldsSchema } from "../validation/client";
import { formValues, validationError, type FormState } from "./form-state";

/**
 * Saves the mold numbers of the client who made this appointment. They're kept
 * on the client's WhatsApp number, so every later booking from it shows them.
 */
export async function saveClientMolds(appointmentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const values = formValues(formData);
  const parsed = moldsSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isValidObjectId(appointmentId)) return { status: "error", message: "Marcação não encontrada." };

  await connectDB();
  const appointment = await Appointment.findOne({ _id: appointmentId, tenantId }, { phone: 1 }).lean();
  if (!appointment?.phone) {
    return { status: "error", message: "Esta marcação não tem número de WhatsApp associado." };
  }

  const { handMold, footMold } = parsed.data;
  await Client.updateOne(
    { tenantId, phone: appointment.phone },
    {
      $set: { ...(handMold && { handMold }), ...(footMold && { footMold }) },
      $unset: { ...(!handMold && { handMold: 1 }), ...(!footMold && { footMold: 1 }) },
    },
    { upsert: true },
  );

  refresh();
  return { status: "success", message: "Moldes guardados." };
}

/** The client card's molds and private notes, saved together. */
export async function saveClientCard(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  const values = formValues(formData);
  const parsed = clientCardSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isValidObjectId(clientId)) return { status: "error", message: "Cliente não encontrada." };

  const { handMold, footMold, notes } = parsed.data;
  await connectDB();
  const updated = await Client.updateOne(
    { _id: clientId, tenantId },
    {
      $set: { ...(handMold && { handMold }), ...(footMold && { footMold }), ...(notes && { notes }) },
      $unset: { ...(!handMold && { handMold: 1 }), ...(!footMold && { footMold: 1 }), ...(!notes && { notes: 1 }) },
    },
  );
  if (updated.matchedCount === 0) return { status: "error", message: "Cliente não encontrada." };

  refresh();
  return { status: "success", message: "Ficha guardada." };
}
