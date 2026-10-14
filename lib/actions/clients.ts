"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { requireAdmin } from "../auth/dal";
import { connectDB } from "../db/connect";
import { Appointment, Client } from "../db/models";
import { moldsSchema } from "../validation/client";
import { formValues, validationError, type FormState } from "./form-state";

/**
 * Saves the mold numbers of the client who made this appointment. They're kept
 * on the client's WhatsApp number, so every later booking from it shows them.
 */
export async function saveClientMolds(appointmentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = moldsSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isValidObjectId(appointmentId)) return { status: "error", message: "Marcação não encontrada." };

  await connectDB();
  const appointment = await Appointment.findById(appointmentId, { phone: 1 }).lean();
  if (!appointment?.phone) {
    return { status: "error", message: "Esta marcação não tem número de WhatsApp associado." };
  }

  const { handMold, footMold } = parsed.data;
  await Client.updateOne(
    { phone: appointment.phone },
    {
      $set: { ...(handMold && { handMold }), ...(footMold && { footMold }) },
      $unset: { ...(!handMold && { handMold: 1 }), ...(!footMold && { footMold: 1 }) },
    },
    { upsert: true },
  );

  refresh();
  return { status: "success", message: "Moldes guardados." };
}
