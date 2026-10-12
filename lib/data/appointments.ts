import "server-only";
import { isValidObjectId } from "mongoose";
import { connection } from "next/server";
import { lisbonDay } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { Appointment, type AppointmentStatus } from "@/lib/db/models";
import { fromMinutes, overlaps, type BusyInterval } from "@/lib/schedule";

export type AppointmentDTO = {
  id: string;
  name: string;
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

function toDTO(doc: AppointmentLean): AppointmentDTO {
  return {
    id: String(doc._id),
    name: doc.name,
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
  return { today, pending: pending.map(toDTO), upcoming: upcoming.map(toDTO) };
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
    appointment: toDTO(doc),
    conflicts: conflicts.map(toDTO),
    isPast: doc.date < lisbonDay(new Date()),
  };
}
