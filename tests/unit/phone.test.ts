import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, splitPhone, withCountryCode } from "@/lib/phone";

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
    expect(formatPhone("5511987654321")).toBe("+55 11 98765 4321");
    expect(formatPhone("551134567890")).toBe("+55 11 3456 7890");
    expect(formatPhone("447700900123")).toBe("+447700900123");
  });
});

describe("Brazilian numbers", () => {
  it("need an area code and 8 or 9 digits", () => {
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("+55 11 3456 7890")).toBe("551134567890");
    for (const input of ["+55 11 9876", "+55 01 98765 4321", "+55 11 98765 43210"]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });
});

describe("the country picker next to a phone field", () => {
  it("puts the chosen code in front of the number", () => {
    expect(normalizePhone(withCountryCode("55", "11 98765 4321"))).toBe("5511987654321");
    expect(normalizePhone(withCountryCode("351", "912 345 678"))).toBe("351912345678");
  });

  it("keeps a code the person typed, and leaves an empty field empty", () => {
    expect(withCountryCode("351", "+44 7700 900123")).toBe("+44 7700 900123");
    expect(withCountryCode("55", "0044 7700 900123")).toBe("0044 7700 900123");
    expect(withCountryCode("55", "  ")).toBe("");
  });

  it("splits a stored number or a sent value back into the country and the rest", () => {
    expect(splitPhone("351912345678")).toEqual({ code: "351", local: "912 345 678" });
    expect(splitPhone("5511987654321")).toEqual({ code: "55", local: "11 98765 4321" });
    expect(splitPhone("+55 11 9876")).toEqual({ code: "55", local: "11 9876" });
    expect(splitPhone("", "55")).toEqual({ code: "55", local: "" });
    expect(splitPhone("447700900123")).toEqual({ code: "351", local: "+447700900123" });
  });
});
