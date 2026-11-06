// The studio's confirmed appointments as an iCalendar feed (RFC 5545), for the
// owner to subscribe to in Google Calendar, Apple Calendar or Outlook.

const STUDIO_TIMEZONE = "Europe/Lisbon";

export type CalendarEvent = {
  id: string;
  name: string;
  serviceNames: string[];
  date: string; // YYYY-MM-DD, studio time
  time: string; // HH:mm, studio time
  endTime: string; // HH:mm
  totalLabel: string;
  phoneLabel?: string;
  notes?: string;
  url: string;
};

/** How far `at` is from UTC in Lisbon, in milliseconds (summer time included). */
function lisbonOffset(at: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: STUDIO_TIMEZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(at))
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - at;
}

/** A wall-clock time in Lisbon as an instant. */
export function lisbonToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  // Measured twice so a time next to a summer-time change still lands right.
  const first = asUtc - lisbonOffset(asUtc);
  return new Date(asUtc - lisbonOffset(first));
}

/** 20261107T093000Z */
function icsDate(at: Date): string {
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 75) {
      out.push(current);
      current = " " + char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join("\r\n");
}

export function buildCalendar(studioName: string, events: readonly CalendarEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nailo App//Marcacoes//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`Marcações · ${studioName}`)}`,
    `X-WR-TIMEZONE:${STUDIO_TIMEZONE}`,
    // Asks calendar apps to check for changes every hour.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    const description = [
      `${event.serviceNames.length === 1 ? "Serviço" : "Serviços"}: ${event.serviceNames.join(", ")}`,
      `Total estimado: ${event.totalLabel}`,
      ...(event.phoneLabel ? [`WhatsApp: ${event.phoneLabel}`] : []),
      ...(event.notes ? [`Observações: ${event.notes}`] : []),
    ].join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@nailo.app`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(lisbonToDate(event.date, event.time))}`,
      `DTEND:${icsDate(lisbonToDate(event.date, event.endTime))}`,
      `SUMMARY:${escapeText(`${event.name} · ${event.serviceNames.join(", ")}`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${event.url}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
