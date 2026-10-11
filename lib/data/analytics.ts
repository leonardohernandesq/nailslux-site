import "server-only";
import { connection } from "next/server";
import { ANALYTICS_TIMEZONE, lisbonDay } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/connect";
import { AnalyticsEvent } from "@/lib/db/models";
import { OPENING_HOURS } from "@/lib/site";

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type AnalyticsSummary = {
  days: AnalyticsPeriod;
  /** Unique visitors (an anonymous id per person per day, so summed over days). */
  visitors: number;
  pageviews: number;
  /** Booking requests sent through the form. */
  bookings: number;
  /** Clicks on the plain WhatsApp links (hero, footer, ...). */
  whatsappClicks: number;
  /** Clicks on the Instagram links. Interest, not a contact, so not in the conversion rate. */
  instagramClicks: number;
  /** Unique visitors who sent a booking or clicked a WhatsApp link. */
  contacts: number;
  /** contacts / visitors, 0..1 (null when there were no visitors). */
  conversionRate: number | null;
  /** Total of the prices of the services in booking requests. */
  requestedValueCents: number;
  daily: { day: string; visitors: number; contacts: number }[];
  services: { name: string; count: number }[];
  /** Requested appointment weekday, 0 = Sunday. */
  weekdays: { weekday: number; count: number }[];
  /** Requested appointment start hour. */
  hours: { hour: number; count: number }[];
  /** Link clicks by channel and where on the page they happened. */
  linkClicks: { channel: "whatsapp" | "instagram"; source: string; count: number }[];
};

const CONTACT_TYPES = ["booking", "whatsapp_click"];

export function parsePeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (ANALYTICS_PERIODS as readonly number[]).includes(n) ? (n as AnalyticsPeriod) : 30;
}

/** Last `days` calendar days in Lisbon, oldest first, ending today. */
export function lastDays(days: number, now: Date): string[] {
  return Array.from({ length: days }, (_, i) =>
    lisbonDay(new Date(now.getTime() - (days - 1 - i) * 86_400_000)),
  );
}

type Facets = {
  totals: { _id: string; count: number }[];
  visitors: { ids: string[] }[];
  contacts: { ids: string[] }[];
  value: { cents: number }[];
  daily: { _id: string; visitors: string[]; contacts: string[] }[];
  services: { _id: string; count: number }[];
  weekdays: { _id: number; count: number }[];
  hours: { _id: number; count: number }[];
  sources: { _id: { type: string; source: string }; count: number }[];
};

export async function getAnalytics(days: AnalyticsPeriod, at?: Date): Promise<AnalyticsSummary> {
  await requireAdmin();
  // "Now" must be read per request, never baked into a prerender.
  await connection();
  const now = at ?? new Date();
  await connectDB();

  const dayList = lastDays(days, now);
  // From midnight-ish of the first day; a few hours of slack are filtered out by day below.
  const since = new Date(now.getTime() - days * 86_400_000);
  const isContact = { $in: ["$type", CONTACT_TYPES] };

  const [facets] = await AnalyticsEvent.aggregate<Facets>([
    { $match: { createdAt: { $gte: since } } },
    {
      $addFields: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ANALYTICS_TIMEZONE } },
      },
    },
    { $match: { day: { $in: dayList } } },
    {
      $facet: {
        totals: [{ $group: { _id: "$type", count: { $sum: 1 } } }],
        visitors: [{ $group: { _id: null, ids: { $addToSet: "$visitorId" } } }],
        contacts: [
          { $match: { type: { $in: CONTACT_TYPES } } },
          { $group: { _id: null, ids: { $addToSet: "$visitorId" } } },
        ],
        value: [
          { $match: { type: "booking" } },
          { $group: { _id: null, cents: { $sum: "$totalCents" } } },
        ],
        daily: [
          {
            $group: {
              _id: "$day",
              visitors: { $addToSet: "$visitorId" },
              contacts: { $addToSet: { $cond: [isContact, "$visitorId", "$$REMOVE"] } },
            },
          },
        ],
        services: [
          { $match: { type: "booking" } },
          { $unwind: "$serviceNames" },
          { $group: { _id: "$serviceNames", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ],
        weekdays: [
          { $match: { type: "booking" } },
          { $group: { _id: "$requestedWeekday", count: { $sum: 1 } } },
        ],
        hours: [
          { $match: { type: "booking" } },
          { $group: { _id: "$requestedHour", count: { $sum: 1 } } },
        ],
        sources: [
          { $match: { type: { $in: ["whatsapp_click", "instagram_click"] } } },
          { $group: { _id: { type: "$type", source: "$source" }, count: { $sum: 1 } } },
          { $sort: { count: -1, "_id.type": 1 } },
        ],
      },
    },
  ]);

  const count = (type: string) => facets.totals.find((t) => t._id === type)?.count ?? 0;
  const visitors = facets.visitors[0]?.ids.length ?? 0;
  const contacts = facets.contacts[0]?.ids.length ?? 0;
  const byDay = new Map(facets.daily.map((d) => [d._id, d]));
  const byWeekday = new Map(facets.weekdays.map((w) => [w._id, w.count]));
  const byHour = new Map(facets.hours.map((h) => [h._id, h.count]));
  const hourValues = facets.hours.map((h) => h._id);

  return {
    days,
    visitors,
    pageviews: count("pageview"),
    bookings: count("booking"),
    whatsappClicks: count("whatsapp_click"),
    instagramClicks: count("instagram_click"),
    contacts,
    conversionRate: visitors > 0 ? contacts / visitors : null,
    requestedValueCents: facets.value[0]?.cents ?? 0,
    daily: dayList.map((day) => ({
      day,
      visitors: byDay.get(day)?.visitors.length ?? 0,
      contacts: byDay.get(day)?.contacts.length ?? 0,
    })),
    services: facets.services.map((s) => ({ name: s._id, count: s.count })),
    // Monday first, as in a Portuguese week.
    weekdays: [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, count: byWeekday.get(weekday) ?? 0 })),
    // Every hour the studio takes bookings, plus any requested outside them.
    hours: hourRange(hourValues).map((hour) => ({ hour, count: byHour.get(hour) ?? 0 })),
    linkClicks: facets.sources.map((s) => ({
      channel: s._id.type === "instagram_click" ? "instagram" : "whatsapp",
      source: s._id.source,
      count: s.count,
    })),
  };
}

function hourRange(requested: number[]): number[] {
  const from = Math.min(Number(OPENING_HOURS.opens.slice(0, 2)), ...requested);
  const to = Math.max(Number(OPENING_HOURS.lastStart.slice(0, 2)), ...requested);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
