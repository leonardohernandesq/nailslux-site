// Studio information and opening hours. Contact details come from env vars so they
// can change without a code change; opening hours live here.

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

export const OPENING_HOURS: OpeningHours = {
  days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
  opens: "09:00",
  lastStart: "20:00",
  slotMinutes: 30,
  maxDaysAhead: 60,
};

const DAY_NAMES = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

/** [1..6] -> "segunda a sábado"; [2,4,6] -> "terça, quinta e sábado" */
export function formatOpeningDays(days: readonly Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every(
    (day, i) => i === 0 || day === sorted[i - 1] + 1,
  );
  if (sorted.length > 2 && consecutive) {
    return `${DAY_NAMES[sorted[0]]} a ${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  const names = sorted.map((day) => DAY_NAMES[day]);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
    : (names[0] ?? "");
}

export const SITE = {
  name: "NailsLux",
  tagline: "Studio de unhas",
  description:
    "Studio de unhas NailsLux: manicure, pedicure, gel e nail art. Escolha o serviço, a data e a hora e marque pelo WhatsApp.",
  locale: "pt-PT",
  currency: "EUR",
} as const;

/** WhatsApp number in international format, digits only (e.g. 351922269283). */
export function getWhatsAppNumber(): string {
  return (process.env.WHATSAPP_NUMBER ?? "351922269283").replace(/\D/g, "");
}

export function getInstagramUrl(): string | null {
  return process.env.INSTAGRAM_URL || null;
}

export function getStudioAddress(): string | null {
  return process.env.STUDIO_ADDRESS || null;
}

/** "351922269283" -> "+351 922 269 283" for display. */
export function formatPhoneForDisplay(digits: string): string {
  const match = digits.match(/^(351)(\d{3})(\d{3})(\d{3})$/);
  if (match) return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  return `+${digits}`;
}
