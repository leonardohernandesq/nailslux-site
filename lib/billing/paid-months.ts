const MONTH_SECONDS = (365.25 / 12) * 24 * 60 * 60;

/** A billed period, in Unix seconds as Stripe gives it. */
export type BilledPeriod = { start: number; end: number };

/**
 * The months a studio paid for, as "YYYY-MM", oldest first. Each period counts
 * from the month it starts in: 15 Jan to 15 Feb is January, and a yearly plan
 * from 15 Jan 2026 is January to December 2026.
 * Months are taken in Lisbon time, like the rest of the platform.
 */
export function paidMonths(periods: BilledPeriod[]): string[] {
  const months = new Set<string>();
  const monthOf = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Lisbon" });
  for (const { start, end } of periods) {
    // Counted in average months, so 31 Jan to 28 Feb is one month, not two;
    // a shorter prorated period still counts its first month. At most 3 years.
    const count = Math.min(36, Math.max(1, Math.round((end - start) / MONTH_SECONDS)));
    const [year, month] = monthOf.format(new Date(start * 1000)).split("-").map(Number);
    for (let i = 0; i < count; i++) {
      const index = month - 1 + i;
      months.add(`${year + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`);
    }
  }
  return [...months].sort();
}

// Spelled out: Intl's short pt-PT months vary between runtimes ("jan." or "01/2026").
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-01" -> "jan 2026" */
export function formatMonth(month: string): string {
  const [year, index] = month.split("-");
  return `${MONTHS[Number(index) - 1]} ${year}`;
}
