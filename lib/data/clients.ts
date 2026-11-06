import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { connection } from "next/server";
import { lisbonDay } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { Appointment, Client, type AppointmentStatus } from "@/lib/db/models";
import { fromMinutes } from "@/lib/schedule";

export type ClientSummary = {
  id: string;
  name: string;
  phone: string;
  /** Confirmed appointments up to today. */
  visits: number;
  spentCents: number;
  lastVisit: string | null;
  nextVisit: string | null;
};

export type ClientHistoryItem = {
  id: string;
  date: string;
  time: string;
  endTime: string;
  serviceNames: string[];
  totalCents: number;
  status: AppointmentStatus;
};

export type ClientCard = ClientSummary & {
  handMold?: string;
  footMold?: string;
  notes?: string;
  history: ClientHistoryItem[];
};

type Totals = {
  _id: string; // phone
  name: string;
  visits: number;
  spentCents: number;
  lastVisit: string | null;
  nextVisit: string | null;
};

/** Per phone: latest name, visits and money from confirmed appointments up to today. */
async function totalsByPhone(tenantId: string, today: string, phones?: string[]): Promise<Totals[]> {
  const done = { $and: [{ $eq: ["$status", "confirmed"] }, { $lte: ["$date", today] }] };
  const ahead = { $and: [{ $eq: ["$status", "confirmed"] }, { $gt: ["$date", today] }] };
  return Appointment.aggregate<Totals>([
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        phone: phones ? { $in: phones } : { $type: "string" },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$phone",
        name: { $first: "$name" },
        visits: { $sum: { $cond: [done, 1, 0] } },
        spentCents: { $sum: { $cond: [done, "$totalCents", 0] } },
        lastVisit: { $max: { $cond: [done, "$date", null] } },
        nextVisit: { $min: { $cond: [ahead, "$date", null] } },
      },
    },
  ]);
}

/**
 * Everyone who ever asked for a booking with a WhatsApp number, newest activity
 * first. Each gets a Client record, so the panel can link to them by id instead of
 * putting phone numbers in URLs.
 */
export async function getClients(search = ""): Promise<ClientSummary[]> {
  const { tenantId } = await requireAdmin();
  await connection();
  await connectDB();
  const today = lisbonDay(new Date());

  const totals = await totalsByPhone(tenantId, today);
  if (totals.length === 0) return [];

  const phones = totals.map((t) => t._id);
  let clients = await Client.find({ tenantId, phone: { $in: phones } }, { phone: 1 }).lean();
  const missing = phones.filter((phone) => !clients.some((c) => c.phone === phone));
  if (missing.length > 0) {
    // Unordered, so one created meanwhile by another request doesn't stop the rest.
    await Client.insertMany(
      missing.map((phone) => ({ tenantId, phone })),
      { ordered: false },
    ).catch(() => {});
    clients = await Client.find({ tenantId, phone: { $in: phones } }, { phone: 1 }).lean();
  }
  const idByPhone = new Map(clients.map((c) => [c.phone, String(c._id)]));

  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  return totals
    .filter((t) => idByPhone.has(t._id))
    .filter((t) => !term || t.name.toLowerCase().includes(term) || (digits.length >= 3 && t._id.includes(digits)))
    .map((t) => ({
      id: idByPhone.get(t._id)!,
      name: t.name,
      phone: t._id,
      visits: t.visits,
      spentCents: t.spentCents,
      lastVisit: t.lastVisit,
      nextVisit: t.nextVisit,
    }))
    .sort((a, b) => (b.nextVisit ?? b.lastVisit ?? "").localeCompare(a.nextVisit ?? a.lastVisit ?? "") || a.name.localeCompare(b.name));
}

/** One client's card: molds, notes and every booking request from their number. */
export async function getClient(id: string): Promise<ClientCard | null> {
  const { tenantId } = await requireAdmin();
  await connection();
  if (!isValidObjectId(id)) return null;
  await connectDB();

  const client = await Client.findOne({ _id: id, tenantId }).lean();
  if (!client) return null;
  const today = lisbonDay(new Date());

  const [totals] = await totalsByPhone(tenantId, today, [client.phone]);
  const history = await Appointment.find({ tenantId, phone: client.phone })
    .sort({ date: -1, startMinutes: -1 })
    .limit(200)
    .lean();

  return {
    id: String(client._id),
    name: totals?.name ?? client.phone,
    phone: client.phone,
    visits: totals?.visits ?? 0,
    spentCents: totals?.spentCents ?? 0,
    lastVisit: totals?.lastVisit ?? null,
    nextVisit: totals?.nextVisit ?? null,
    handMold: client.handMold ?? undefined,
    footMold: client.footMold ?? undefined,
    notes: client.notes ?? undefined,
    history: history.map((doc) => ({
      id: String(doc._id),
      date: doc.date,
      time: doc.time,
      endTime: fromMinutes(doc.endMinutes),
      serviceNames: doc.serviceNames,
      totalCents: doc.totalCents,
      status: doc.status,
    })),
  };
}

/** The Client record behind an appointment's number, so the appointment page can link to it. */
export async function getClientIdForPhone(tenantId: string, phone: string): Promise<string> {
  await connectDB();
  const client = await Client.findOneAndUpdate(
    { tenantId, phone },
    { $setOnInsert: { tenantId, phone } },
    { upsert: true, new: true, projection: { _id: 1 } },
  ).lean();
  return String(client!._id);
}
