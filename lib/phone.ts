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

/** The countries offered next to a phone field, with how many digits follow the code. */
export const PHONE_COUNTRIES = [
  { code: PT_CODE, name: "Portugal", placeholder: "Ex.: 912 345 678", digits: 9 },
  { code: BR_CODE, name: "Brasil", placeholder: "Ex.: (11) 98765-4321", digits: 11 },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

const countryOf = (code: PhoneCountryCode) => PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];

/** Only the digits that fit the country. A number pasted with its code loses the code. */
export function localDigits(code: PhoneCountryCode, input: string): string {
  let digits = input.replace(/\D/g, "");
  const max = countryOf(code).digits;
  for (const prefix of [`00${code}`, code]) {
    if (digits.length > max && digits.startsWith(prefix)) digits = digits.slice(prefix.length);
  }
  return digits.slice(0, max);
}

/**
 * The digits as the field shows them while they're typed: "912 345 678" in Portugal,
 * "(11) 98765-4321" or "(11) 3456-7890" in Brazil, where the hyphen moves once the
 * eleventh digit (a mobile) arrives.
 */
export function maskPhone(code: PhoneCountryCode, digits: string): string {
  if (code === PT_CODE) return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
  if (!digits) return "";
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (!rest) return `(${area}`;
  const split = digits.length === 11 ? 5 : 4;
  return rest.length > split ? `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}` : `(${area}) ${rest}`;
}

/** What the form sends: "+5511987654321", or "" when empty. The server keeps only the digits. */
export function withCountryCode(code: PhoneCountryCode, digits: string): string {
  return digits ? `+${code}${digits}` : "";
}

/** The other way round, to fill the field: a stored number ("5511987654321") or a sent value. */
export function splitPhone(value: string, fallback: PhoneCountryCode = PT_CODE): { code: PhoneCountryCode; digits: string } {
  const trimmed = value.trim();
  const all = trimmed.replace(/\D/g, "");
  // Stored numbers are digits with the code; a local number has at most 9 digits.
  const international = trimmed.startsWith("+") || trimmed.startsWith("00") || (/^\d+$/.test(trimmed) && all.length > 9);
  if (international) {
    const withCode = trimmed.startsWith("00") ? all.slice(2) : all;
    for (const { code } of PHONE_COUNTRIES) {
      if (withCode.startsWith(code)) return { code, digits: localDigits(code, withCode.slice(code.length)) };
    }
  }
  return { code: fallback, digits: localDigits(fallback, trimmed) };
}
