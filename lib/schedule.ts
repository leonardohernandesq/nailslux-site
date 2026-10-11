import { parseISODate, toISODate } from "./format";
import type { OpeningHours } from "./site";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
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
