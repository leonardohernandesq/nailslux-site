"use server";

import { isValidObjectId } from "mongoose";
import { lisbonDay } from "../analytics/server";
import { requireAdmin } from "../auth/dal";
import { CACHE_TAGS } from "../constants";
import { connectDB } from "../db/connect";
import { Appointment, Tenant } from "../db/models";
import { toMinutes } from "../schedule";
import { createTimeOffSchema, MAX_TIME_OFF_ENTRIES } from "../validation/time-off";
import { formValues, validationError, type FormState } from "./form-state";
import { invalidate } from "./invalidate";

/**
 * Adds days or hours off. The site stops offering those times at once; bookings
 * already confirmed in that period are kept, and the message says how many there
 * are so the studio can rearrange them.
 */
export async function addTimeOff(_prev: FormState, formData: FormData): Promise<FormState> {
  const { tenantId, tenantSlug } = await requireAdmin();
  const values = formValues(formData);
  const today = lisbonDay(new Date());
  const parsed = createTimeOffSchema(today).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const off = parsed.data;

  await connectDB();
  // Past entries do nothing any more, so they make room for new ones.
  await Tenant.updateOne({ _id: tenantId }, { $pull: { timeOff: { end: { $lt: today } } } });
  const updated = await Tenant.updateOne(
    { _id: tenantId, [`timeOff.${MAX_TIME_OFF_ENTRIES - 1}`]: { $exists: false } },
    { $push: { timeOff: off } },
  );
  if (updated.modifiedCount === 0) {
    return { status: "error", message: `Já tem ${MAX_TIME_OFF_ENTRIES} folgas marcadas. Apague uma para acrescentar outra.`, values };
  }

  const clashes = await Appointment.countDocuments({
    tenantId,
    status: "confirmed",
    date: { $gte: off.start, $lte: off.end },
    ...("from" in off && { startMinutes: { $lt: toMinutes(off.to!) }, endMinutes: { $gt: toMinutes(off.from!) } }),
  });

  invalidate(CACHE_TAGS.tenant(tenantSlug));
  if (clashes > 0) {
    return {
      status: "success",
      message: `Folga guardada. Atenção: ${clashes === 1 ? "há 1 marcação confirmada" : `há ${clashes} marcações confirmadas`} nesse período, combine outra hora com ${clashes === 1 ? "a cliente" : "as clientes"}.`,
    };
  }
  return { status: "success", message: "Folga guardada. O site já não oferece essas horas." };
}

export async function removeTimeOff(id: string): Promise<void> {
  const { tenantId, tenantSlug } = await requireAdmin();
  if (!isValidObjectId(id)) return;
  await connectDB();
  await Tenant.updateOne({ _id: tenantId }, { $pull: { timeOff: { _id: id } } });
  invalidate(CACHE_TAGS.tenant(tenantSlug));
}
