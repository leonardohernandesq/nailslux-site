// Platform identity and opening-hours helpers. Each studio's own details live on
// its Tenant document (see lib/data/tenants.ts).

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 0; // 1 = Monday

export type OpeningHours = {
  /** Days the studio takes appointments. */
  days: readonly Weekday[];
  /** First bookable start time, "HH:mm". */
  opens: string;
  /** Last bookable start time, "HH:mm". */
  lastStart: string;
  /** Minutes between bookable start times. */
  slotMinutes: number;
  /** How many days ahead clients can pick. */
  maxDaysAhead: number;
};

/** What a new studio starts with until it sets its own hours. */
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
  opens: "09:00",
  lastStart: "20:00",
  slotMinutes: 30,
  maxDaysAhead: 60,
};

/** Indexed by JavaScript's Date#getDay(), so 0 is Sunday (same as `Weekday`). */
const DAY_NAMES: Record<Weekday, string> = {
  0: "domingo",
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
};

/** Position in a Portuguese week, which starts on Monday: Sunday comes last. */
const weekPosition = (day: Weekday) => (day === 0 ? 7 : day);

/**
 * [1..6] -> "segunda a sábado"; [1..6, 0] -> "segunda a domingo";
 * [2,4,6] -> "terça, quinta e sábado"
 */
export function formatOpeningDays(days: readonly Weekday[]): string {
  const sorted = [...days].sort((a, b) => weekPosition(a) - weekPosition(b));
  const consecutive = sorted.every(
    (day, i) => i === 0 || weekPosition(day) === weekPosition(sorted[i - 1]) + 1,
  );
  if (sorted.length > 2 && consecutive) {
    return `${DAY_NAMES[sorted[0]]} a ${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  const names = sorted.map((day) => DAY_NAMES[day]);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
    : (names[0] ?? "");
}

/** Sign-up stays closed until payments exist; see REGISTRATION_OPEN in .env.example. */
export function isRegistrationOpen(): boolean {
  return process.env.REGISTRATION_OPEN === "true";
}

/** Studios with their own logo and photos in the code, until studios can upload them. */
const STUDIOS_WITH_BRAND_ASSETS = ["nailslux"];

export function hasBrandAssets(slug: string): boolean {
  return STUDIOS_WITH_BRAND_ASSETS.includes(slug);
}

export const PLATFORM = {
  name: "Nailo App",
  description: "Site, marcações e gestão para studios de unhas.",
  locale: "pt-PT",
  currency: "EUR",
} as const;

/** "351922269283" -> "+351 922 269 283" for display. */
export function formatPhoneForDisplay(digits: string): string {
  const match = digits.match(/^(351)(\d{3})(\d{3})(\d{3})$/);
  if (match) return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  return `+${digits}`;
}
