import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("reads Portuguese numbers however they're typed", () => {
    for (const input of ["912345678", "912 345 678", "+351 912 345 678", "00351912345678", "351-912-345-678"]) {
      expect(normalizePhone(input)).toBe("351912345678");
    }
    expect(normalizePhone("213 456 789")).toBe("351213456789"); // landline
  });

  it("keeps other countries when typed with their code", () => {
    expect(normalizePhone("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("0044 7700 900123")).toBe("447700900123");
  });

  it("rejects things that can't be a phone number", () => {
    for (const input of ["", "12345", "812345678", "+351 91234", "abc", "912345678x", "+12345678901234567"]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });
});

describe("formatPhone", () => {
  it("groups Portuguese numbers and prefixes the rest with +", () => {
    expect(formatPhone("351912345678")).toBe("+351 912 345 678");
    expect(formatPhone("5511987654321")).toBe("+5511987654321");
  });
});
