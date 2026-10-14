import "server-only";
import { isValidObjectId } from "mongoose";
import { connection } from "next/server";
import { lisbonDay } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { Appointment, Client, type AppointmentStatus } from "@/lib/db/models";
import { fromMinutes, overlaps, type BusyInterval } from "@/lib/schedule";

export type ClientMolds = { handMold?: string; footMold?: string };

export type AppointmentDTO = {
  id: string;
  name: string;
  /** WhatsApp, digits with country code. Older requests have none. */
  phone?: string;
  /** The client's saved mold numbers, looked up by phone. */
  molds: ClientMolds;
  serviceNames: string[];
  totalCents: number;
  date: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
};

type AppointmentLean = {
  _id: unknown;
  name: string;
  phone?: string | null;
  serviceNames: string[];
  totalCents: number;
  date: string;
  time: string;
  startMinutes: number;
  endMinutes: number;
  notes?: string | null;
  status: AppointmentStatus;
  createdAt?: Date;
};

type MoldsByPhone = Map<string, ClientMolds>;

function toDTO(doc: AppointmentLean, molds: MoldsByPhone = new Map()): AppointmentDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    phone: doc.phone ?? undefined,
    molds: (doc.phone && molds.get(doc.phone)) || {},
    serviceNames: doc.serviceNames,
    totalCents: doc.totalCents,
    date: doc.date,
    time: doc.time,
    endTime: fromMinutes(doc.endMinutes),
    durationMinutes: doc.endMinutes - doc.startMinutes,
    notes: doc.notes ?? undefined,
    status: doc.status,
    createdAt: (doc.createdAt ?? new Date(0)).toISOString(),
  };
}

/** Saved mold numbers for the clients behind these appointments. */
async function moldsFor(docs: AppointmentLean[]): Promise<MoldsByPhone> {
  const phones = [...new Set(docs.map((d) => d.phone).filter((p): p is string => Boolean(p)))];
  if (phones.length === 0) return new Map();
  const clients = await Client.find({ phone: { $in: phones } }, { phone: 1, handMold: 1, footMold: 1 }).lean();
  return new Map(
    clients.map((c) => [c.phone, { handMold: c.handMold ?? undefined, footMold: c.footMold ?? undefined }]),
  );
}

/**
 * Times already taken on a date (confirmed appointments only). Public: it returns
 * no names or details, just the blocked ranges.
 */
export async function getBusyIntervals(date: string, excludeId?: string): Promise<BusyInterval[]> {
  await connectDB();
  const filter: Record<string, unknown> = { date, status: "confirmed" };
  if (excludeId && isValidObjectId(excludeId)) filter._id = { $ne: excludeId };
  const docs = await Appointment.find(filter, { startMinutes: 1, endMinutes: 1 }).sort({ startMinutes: 1 }).lean();
  return docs.map((d) => ({ start: d.startMinutes, end: d.endMinutes }));
}

/** Requests waiting for an answer, and confirmed appointments from today on. */
export async function getAppointmentsOverview() {
  await requireAdmin();
  await connection(); // "today" is per request
  const today = lisbonDay(new Date());
  await connectDB();

  const [pending, upcoming] = await Promise.all([
    Appointment.find({ status: "pending" }).sort({ date: 1, startMinutes: 1 }).lean<AppointmentLean[]>(),
    Appointment.find({ status: "confirmed", date: { $gte: today } })
      .sort({ date: 1, startMinutes: 1 })
      .limit(100)
      .lean<AppointmentLean[]>(),
  ]);
  const molds = await moldsFor([...pending, ...upcoming]);
  return {
    today,
    pending: pending.map((doc) => toDTO(doc, molds)),
    upcoming: upcoming.map((doc) => toDTO(doc, molds)),
  };
}

/** One appointment, plus the confirmed ones it would clash with. */
export async function getAppointment(id: string) {
  await requireAdmin();
  await connection();
  if (!isValidObjectId(id)) return null;
  await connectDB();

  const doc = await Appointment.findById(id).lean<AppointmentLean>();
  if (!doc) return null;

  const sameDay = await Appointment.find({ _id: { $ne: doc._id }, date: doc.date, status: "confirmed" })
    .sort({ startMinutes: 1 })
    .lean<AppointmentLean[]>();
  const range = { start: doc.startMinutes, end: doc.endMinutes };
  const conflicts = sameDay.filter((other) => overlaps(range, { start: other.startMinutes, end: other.endMinutes }));

  return {
    appointment: toDTO(doc, await moldsFor([doc])),
    conflicts: conflicts.map((other) => toDTO(other)),
    isPast: doc.date < lisbonDay(new Date()),
  };
}
