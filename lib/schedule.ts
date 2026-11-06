import { parseISODate, toISODate } from "./format";
import type { DayHours, OpeningHours, TimeOff } from "./site";

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
export function allSlots(day: DayHours, slotMinutes: number): string[] {
  const slots: string[] = [];
  for (let t = toMinutes(day.opens); t <= toMinutes(day.lastStart); t += slotMinutes) {
    slots.push(fromMinutes(t));
  }
  return slots;
}

/** Time off that covers this date (all of it, or part of it). */
function timeOffOn(isoDate: string, hours: OpeningHours): TimeOff[] {
  return (hours.timeOff ?? []).filter(({ start, end }) => start <= isoDate && isoDate <= end);
}

/** True when the time off takes the whole day rather than a few hours. */
export const isWholeDay = (off: Pick<TimeOff, "from" | "to">) => !off.from || !off.to;

/** That weekday's times, or undefined if the studio is closed (including days off). */
function hoursOn(isoDate: string, hours: OpeningHours): DayHours | undefined {
  if (timeOffOn(isoDate, hours).some(isWholeDay)) return undefined;
  const weekday = parseISODate(isoDate).getDay();
  return hours.days.find(({ day }) => day === weekday);
}

/**
 * Hours off on this date, as busy intervals. They join the booked times, so a
 * service that would run into the break can't start before it either.
 */
export function timeOffIntervals(isoDate: string, hours: OpeningHours): BusyInterval[] {
  return timeOffOn(isoDate, hours)
    .filter((off) => !isWholeDay(off))
    .map((off) => ({ start: toMinutes(off.from!), end: toMinutes(off.to!) }));
}

export function isOpenOn(isoDate: string, hours: OpeningHours): boolean {
  return hoursOn(isoDate, hours) !== undefined;
}

/** Slots for a given date; for today, only times that haven't passed yet. */
export function slotsFor(isoDate: string, hours: OpeningHours, now: Date): string[] {
  const day = hoursOn(isoDate, hours);
  if (!day) return [];
  const slots = allSlots(day, hours.slotMinutes);
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
