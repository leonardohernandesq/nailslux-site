import { parseISODate, toISODate } from "./format";
import type { OpeningHours } from "./site";

/** Services without a duration block this long. */
export const DEFAULT_SERVICE_MINUTES = 60;

/** A blocked stretch of a day, in minutes from midnight; `end` is exclusive. */
export type BusyInterval = { start: number; end: number };

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Every bookable start time in a day, e.g. ["09:00", "09:30", ...]. */
export function allSlots(hours: OpeningHours): string[] {
  const slots: string[] = [];
  for (let t = toMinutes(hours.opens); t <= toMinutes(hours.lastStart); t += hours.slotMinutes) {
    slots.push(fromMinutes(t));
  }
  return slots;
}

export function isOpenOn(isoDate: string, hours: OpeningHours): boolean {
  return hours.days.includes(parseISODate(isoDate).getDay() as OpeningHours["days"][number]);
}

/** Slots for a given date; for today, only times that haven't passed yet. */
export function slotsFor(isoDate: string, hours: OpeningHours, now: Date): string[] {
  if (!isOpenOn(isoDate, hours)) return [];
  const slots = allSlots(hours);
  if (isoDate !== toISODate(now)) return slots;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => toMinutes(slot) > nowMinutes);
}

export function dateBounds(hours: OpeningHours, now: Date): { min: string; max: string } {
  const max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + hours.maxDaysAhead);
  return { min: toISODate(now), max: toISODate(max) };
}

/** How long a booking takes: the sum of its services (unknown durations count as 1h). */
export function bookingDuration(services: readonly { durationMinutes?: number | null }[]): number {
  return services.reduce((sum, service) => sum + (service.durationMinutes || DEFAULT_SERVICE_MINUTES), 0);
}

/** Half-open intervals: one ending at 21:00 doesn't clash with one starting at 21:00. */
export function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Whether a booking of `durationMinutes` can start at `time` without clashing with `busy`. */
export function isSlotFree(time: string, durationMinutes: number, busy: readonly BusyInterval[]): boolean {
  const start = toMinutes(time);
  const wanted = { start, end: start + Math.max(durationMinutes, 1) };
  return !busy.some((interval) => overlaps(wanted, interval));
}
