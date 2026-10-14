// WhatsApp numbers are stored as digits with the country code ("351912345678"),
// so the same client is recognised however they type their number.

const PT_CODE = "351";

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

  // Portuguese numbers have 9 digits after the code; others follow E.164 (max 15).
  if (digits.startsWith(PT_CODE)) return /^351[29]\d{8}$/.test(digits) ? digits : null;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** "351912345678" -> "+351 912 345 678"; other countries -> "+5511987654321". */
export function formatPhone(digits: string): string {
  const pt = /^351(\d{3})(\d{3})(\d{3})$/.exec(digits);
  return pt ? `+351 ${pt[1]} ${pt[2]} ${pt[3]}` : `+${digits}`;
}
