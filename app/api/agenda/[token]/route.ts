import { lisbonDay } from "@/lib/analytics/server";
import { buildCalendar } from "@/lib/calendar";
import { connectDB } from "@/lib/db/connect";
import { Appointment, Tenant } from "@/lib/db/models";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { fromMinutes } from "@/lib/schedule";
import { CALENDAR_TOKEN_PATTERN } from "@/lib/constants";

/** Confirmed appointments this far back stay in the feed, so recent history shows too. */
const PAST_DAYS = 60;

/**
 * GET /api/agenda/<token> → the studio's confirmed appointments as an .ics feed.
 * The token is the only key, so the response never says whether one exists.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/agenda/[token]">) {
  const { token } = await ctx.params;
  if (!CALENDAR_TOKEN_PATTERN.test(token)) return new Response("Not found", { status: 404 });

  await connectDB();
  const tenant = await Tenant.findOne({ calendarToken: token }, { name: 1 }).lean();
  if (!tenant) return new Response("Not found", { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - PAST_DAYS);
  const appointments = await Appointment.find({ tenantId: tenant._id, status: "confirmed", date: { $gte: lisbonDay(since) } })
    .sort({ date: 1, startMinutes: 1 })
    .limit(2000)
    .lean();

  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const body = buildCalendar(
    tenant.name,
    appointments.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      serviceNames: doc.serviceNames,
      date: doc.date,
      time: doc.time,
      endTime: fromMinutes(doc.endMinutes),
      totalLabel: formatPrice(doc.totalCents),
      phoneLabel: doc.phone ? formatPhone(doc.phone) : undefined,
      notes: doc.notes ?? undefined,
      url: `${base}/admin/marcacoes/${String(doc._id)}`,
    })),
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="marcacoes.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
