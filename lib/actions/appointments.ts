"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { Appointment, Service, type AppointmentStatus } from "@/lib/db/models";
import { getBusyIntervals } from "@/lib/data/appointments";
import { getActiveTenant } from "@/lib/data/tenants";
import { bookingDuration, fromMinutes, isSlotFree, overlaps, toMinutes } from "@/lib/schedule";
import { createBookingSchema, type BookingInput } from "@/lib/validation/booking";
import type { FormState } from "./form-state";

export type BookingField = "name" | "phone" | "serviceIds" | "date" | "time" | "notes";

export type RequestAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; field?: BookingField; message: string };

const TAKEN_MESSAGE = "Esta hora acabou de ficar ocupada. Escolha outra, por favor.";

/** The studio's wall-clock time, whatever timezone the server runs in. */
function lisbonNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
}

/**
 * Saves a booking request as "pending", to be confirmed in the admin (Marcações).
 * Everything is re-checked here: services, date, time and that the slot is still
 * free for the full duration of the chosen services.
 */
export async function requestAppointment(tenantSlug: string, input: BookingInput): Promise<RequestAppointmentResult> {
  const tenant = await getActiveTenant(tenantSlug);
  if (!tenant) return { ok: false, message: "Este studio não está disponível de momento." };

  await connectDB();
  const services = await Service.find({ tenantId: tenant.id, active: true }, { name: 1, priceCents: 1, durationMinutes: 1 }).lean();

  const schema = createBookingSchema({
    serviceIds: services.map((s) => String(s._id)),
    hours: tenant.hours,
    now: lisbonNow(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: issue.path[0] as BookingField, message: issue.message };
  }

  const { name, phone, date, time, notes } = parsed.data;
  const chosen = parsed.data.serviceIds
    .map((id) => services.find((s) => String(s._id) === id))
    .filter((s) => s !== undefined);
  const duration = bookingDuration(chosen);

  if (!isSlotFree(time, duration, await getBusyIntervals(tenant.id, date))) {
    return { ok: false, field: "time", message: TAKEN_MESSAGE };
  }

  const start = toMinutes(time);
  const appointment = await Appointment.create({
    tenantId: tenant.id,
    name,
    phone,
    serviceIds: chosen.map((s) => String(s._id)),
    serviceNames: chosen.map((s) => s.name),
    totalCents: chosen.reduce((sum, s) => sum + s.priceCents, 0),
    date,
    time,
    startMinutes: start,
    endMinutes: start + duration,
    notes,
  });

  return { ok: true, id: String(appointment._id) };
}

async function decide(
  id: string,
  from: AppointmentStatus[],
  to: AppointmentStatus,
  success: string,
): Promise<FormState> {
  const { tenantId } = await requireAdmin();
  if (!isValidObjectId(id)) return { status: "error", message: "Marcação não encontrada." };
  await connectDB();

  const doc = await Appointment.findOne({ _id: id, tenantId }).lean();
  if (!doc) return { status: "error", message: "Marcação não encontrada." };
  if (!from.includes(doc.status)) {
    return { status: "error", message: "Esta marcação já foi tratada. Atualize a página." };
  }

  if (to === "confirmed") {
    const range = { start: doc.startMinutes, end: doc.endMinutes };
    const clash = await Appointment.findOne({
      tenantId,
      _id: { $ne: doc._id },
      date: doc.date,
      status: "confirmed",
      startMinutes: { $lt: range.end },
      endMinutes: { $gt: range.start },
    }).lean();
    if (clash && overlaps(range, { start: clash.startMinutes, end: clash.endMinutes })) {
      return {
        status: "error",
        message: `Este horário choca com a marcação de ${clash.name} (${clash.time}–${fromMinutes(clash.endMinutes)}), já confirmada.`,
      };
    }
  }

  // Only move on if nobody changed it in the meantime.
  const updated = await Appointment.updateOne(
    { _id: doc._id, tenantId, status: doc.status },
    { $set: { status: to, decidedAt: new Date() } },
  );
  if (updated.modifiedCount === 0) {
    return { status: "error", message: "Esta marcação já foi tratada. Atualize a página." };
  }

  refresh();
  return { status: "success", message: success };
}

/** The studio's answer to a request; the form says which with `intent`. */
export async function decideAppointment(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  switch (formData.get("intent")) {
    case "confirm":
      return decide(id, ["pending", "declined"], "confirmed", "Marcação confirmada. O horário ficou bloqueado no site.");
    case "decline":
      return decide(id, ["pending"], "declined", "Pedido recusado.");
    case "cancel":
      return decide(id, ["confirmed"], "cancelled", "Marcação cancelada. O horário voltou a ficar livre no site.");
    default:
      return { status: "error", message: "Ação desconhecida." };
  }
}
