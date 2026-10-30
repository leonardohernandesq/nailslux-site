import "server-only";
import { createHmac } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AnalyticsEvent, Service } from "@/lib/db/models";
import { parseISODate } from "@/lib/format";
import type { TrackEvent } from "@/lib/validation/analytics";

export const ANALYTICS_TIMEZONE = "Europe/Lisbon";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|node-fetch|axios/i;

export function isBot(userAgent: string): boolean {
  return userAgent.trim() === "" || BOT_PATTERN.test(userAgent);
}

/** Calendar day in Lisbon, as YYYY-MM-DD. */
export function lisbonDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ANALYTICS_TIMEZONE }).format(at);
}

/**
 * Anonymous visitor id: a keyed hash of IP + browser + day. Same person, same day,
 * same id; next day a new one. The IP itself is never stored.
 */
export function visitorHash(ip: string, userAgent: string, at: Date): string {
  const secret = process.env.AUTH_SECRET ?? "nailslux-analytics";
  return createHmac("sha256", secret)
    .update(`${lisbonDay(at)}|${ip}|${userAgent}`)
    .digest("base64url")
    .slice(0, 22);
}

export async function recordEvent(
  tenantId: string,
  event: TrackEvent,
  { ip, userAgent, at }: { ip: string; userAgent: string; at: Date },
): Promise<void> {
  await connectDB();
  const visitorId = visitorHash(ip, userAgent, at);

  if (event.type === "pageview") {
    await AnalyticsEvent.create({ tenantId, type: "pageview", visitorId, createdAt: at });
    return;
  }

  if (event.type === "whatsapp_click" || event.type === "instagram_click") {
    await AnalyticsEvent.create({ tenantId, type: event.type, visitorId, source: event.source, createdAt: at });
    return;
  }

  // Booking: trust only ids of services that exist, and take names/prices from
  // the database (names are kept, so stats survive a service being deleted).
  const ids = [...new Set(event.serviceIds)].filter((id) => isValidObjectId(id));
  const services = await Service.find({ tenantId, _id: { $in: ids } }, { name: 1, priceCents: 1 }).lean();
  if (services.length === 0) return;

  await AnalyticsEvent.create({
    tenantId,
    type: "booking",
    visitorId,
    serviceIds: services.map((s) => String(s._id)),
    serviceNames: services.map((s) => s.name),
    totalCents: services.reduce((sum, s) => sum + s.priceCents, 0),
    requestedDate: event.date,
    requestedWeekday: parseISODate(event.date).getDay(),
    requestedHour: Number(event.time.slice(0, 2)),
    createdAt: at,
  });
}
