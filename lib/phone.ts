// WhatsApp numbers are stored as digits with the country code ("351912345678"),
// so the same client is recognised however they type their number.

const PT_CODE = "351";
const BR_CODE = "55";

/**
 * "912 345 678", "+351 912345678" and "00351-912-345-678" all become
 * "351912345678". Numbers without a country code are taken as Portuguese.
 * Returns null when it can't be a phone number.
 */
export function normalizePhone(input: string): string | null {
  const value = input.trim();
  if (!/^[+\d\s().-]+$/.test(value)) return null;

  let digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 9) {
    digits = PT_CODE + digits;
  }

  // Portuguese numbers have 9 digits after the code; Brazilian ones a 2-digit area code
  // and 8 or 9 digits; others follow E.164 (max 15).
  if (digits.startsWith(PT_CODE)) return /^351[29]\d{8}$/.test(digits) ? digits : null;
  if (digits.startsWith(BR_CODE)) return /^55[1-9]{2}9?\d{8}$/.test(digits) ? digits : null;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** "351912345678" -> "+351 912 345 678", "5511987654321" -> "+55 11 98765 4321", others -> "+447700900123". */
export function formatPhone(digits: string): string {
  const pt = /^351(\d{3})(\d{3})(\d{3})$/.exec(digits);
  if (pt) return `+351 ${pt[1]} ${pt[2]} ${pt[3]}`;
  const br = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  if (br) return `+55 ${br[1]} ${br[2]} ${br[3]}`;
  return `+${digits}`;
}

/** The countries offered next to a phone field. */
export const PHONE_COUNTRIES = [
  { code: PT_CODE, flag: "🇵🇹", name: "Portugal", placeholder: "Ex.: 912 345 678" },
  { code: BR_CODE, flag: "🇧🇷", name: "Brasil", placeholder: "Ex.: 11 98765 4321" },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

/**
 * The chosen country code and the number typed, as one value for `normalizePhone`.
 * A number typed with its own code ("+44 …", "0044 …") keeps that one.
 */
export function withCountryCode(code: PhoneCountryCode, local: string): string {
  const value = local.trim();
  if (!value || value.startsWith("+") || value.startsWith("00")) return value;
  return `+${code} ${value}`;
}

/**
 * The other way round, to fill the field: a stored number ("5511987654321") or a value
 * from `withCountryCode` becomes the country and the rest. Anything else stays as typed.
 */
export function splitPhone(value: string, fallback: PhoneCountryCode = PT_CODE): { code: PhoneCountryCode; local: string } {
  const trimmed = value.trim();
  const stored = /^\d+$/.test(trimmed) ? formatPhone(trimmed) : trimmed;
  for (const { code } of PHONE_COUNTRIES) {
    const match = new RegExp(`^(?:\\+|00)${code}\\s*(.*)$`).exec(stored);
    if (match) return { code, local: match[1] };
  }
  return { code: fallback, local: stored };
}
