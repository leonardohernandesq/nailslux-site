"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { Appointment, Service, Tenant, User, type AppointmentStatus } from "@/lib/db/models";
import { getBusyIntervals } from "@/lib/data/appointments";
import { getActiveTenant } from "@/lib/data/tenants";
import { bookingDuration, fromMinutes, isSlotFree, overlaps, timeOffIntervals, toMinutes } from "@/lib/schedule";
import { createBookingSchema, type BookingInput } from "@/lib/validation/booking";
import { formatLongDate, formatPrice } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { formatPhone } from "@/lib/phone";
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

  const busy = [...(await getBusyIntervals(tenant.id, date)), ...timeOffIntervals(date, tenant.hours)];
  if (!isSlotFree(time, duration, busy)) {
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

  const id = String(appointment._id);
  // After the response: the client shouldn't wait on the email, nor see it fail.
  after(() =>
    notifyStudio(tenant.id, {
      id,
      name,
      phone,
      serviceNames: chosen.map((s) => s.name),
      totalCents: chosen.reduce((sum, s) => sum + s.priceCents, 0),
      date,
      time,
      notes,
    }),
  );
  return { ok: true, id };
}

type NewRequest = {
  id: string;
  name: string;
  phone: string;
  serviceNames: string[];
  totalCents: number;
  date: string;
  time: string;
  notes?: string;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * Emails the owner about a new request, unless they turned it off in Definições.
 * Not exported: everything exported from a "use server" file is callable from browsers.
 */
async function notifyStudio(tenantId: string, request: NewRequest): Promise<void> {
  try {
    await connectDB();
    const tenant = await Tenant.findById(tenantId, { notifyNewBookings: 1 }).lean();
    if (!tenant || tenant.notifyNewBookings === false) return;
    const owner = await User.findOne({ tenantId, role: "owner" }, { email: 1 }).sort({ createdAt: 1 }).lean();
    if (!owner) return;

    const url = `${process.env.SITE_URL ?? "http://localhost:3000"}/admin/marcacoes/${request.id}`;
    const when = `${formatLongDate(request.date)} às ${request.time}`;
    const lines = [
      ["Cliente", request.name],
      ["WhatsApp", formatPhone(request.phone)],
      [request.serviceNames.length === 1 ? "Serviço" : "Serviços", request.serviceNames.join(", ")],
      ["Quando", when],
      ["Total estimado", formatPrice(request.totalCents)],
      ...(request.notes ? [["Observações", request.notes]] : []),
    ];

    await sendMail({
      to: owner.email,
      subject: `Novo pedido: ${request.name.replace(/\s+/g, " ")}, ${when}`,
      text: [
        "Recebeu um novo pedido de marcação.",
        "",
        ...lines.map(([label, value]) => `${label}: ${value}`),
        "",
        `Confirmar ou recusar: ${url}`,
      ].join("\n"),
      // The client typed the name and notes, so they're escaped.
      html:
        "<p>Recebeu um novo pedido de marcação.</p><ul>" +
        lines.map(([label, value]) => `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>`).join("") +
        `</ul><p><a href="${url}">Confirmar ou recusar no painel</a></p>`,
    });
  } catch (error) {
    console.error("Could not email the studio about a new request.", error);
  }
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
