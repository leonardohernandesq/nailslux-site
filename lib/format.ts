import { PLATFORM } from "./site";

const currency = new Intl.NumberFormat(PLATFORM.locale, {
  style: "currency",
  currency: PLATFORM.currency,
});

export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

/** 90 -> "1h30", 45 -> "45 min", 60 -> "1h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Parses "YYYY-MM-DD" as a local calendar date (no timezone shift). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-10-18" -> "sábado, 18 de outubro de 2026" */
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat(PLATFORM.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(isoDate));
}
