import { describe, expect, it } from "vitest";
import { formatPhone, localDigits, maskPhone, normalizePhone, splitPhone, withCountryCode } from "@/lib/phone";

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

describe("the phone field mask", () => {
  it("groups Portuguese numbers in threes as they're typed, up to 9 digits", () => {
    expect(maskPhone("351", "9")).toBe("9");
    expect(maskPhone("351", "9123")).toBe("912 3");
    expect(maskPhone("351", "912345678")).toBe("912 345 678");
    expect(localDigits("351", "912 345 6789")).toBe("912345678");
  });

  it("writes Brazilian numbers as (XX) XXXX-XXXX, moving the hyphen for an 11-digit mobile", () => {
    expect(maskPhone("55", "1")).toBe("(1");
    expect(maskPhone("55", "11")).toBe("(11");
    expect(maskPhone("55", "119876")).toBe("(11) 9876");
    expect(maskPhone("55", "1134567890")).toBe("(11) 3456-7890");
    expect(maskPhone("55", "11987654321")).toBe("(11) 98765-4321");
    expect(localDigits("55", "(11) 98765-43219")).toBe("11987654321");
  });

  it("only keeps digits, and drops the code from a pasted international number", () => {
    expect(localDigits("351", "abc 912-345")).toBe("912345");
    expect(localDigits("351", "+351 912 345 678")).toBe("912345678");
    expect(localDigits("55", "+55 (11) 98765-4321")).toBe("11987654321");
    expect(localDigits("55", "0055 11 98765 4321")).toBe("11987654321");
  });

  it("sends only the code and the digits, which the server accepts as they are", () => {
    expect(withCountryCode("55", "11987654321")).toBe("+5511987654321");
    expect(withCountryCode("351", "")).toBe("");
    expect(normalizePhone(withCountryCode("55", "11987654321"))).toBe("5511987654321");
    expect(normalizePhone(withCountryCode("351", "912345678"))).toBe("351912345678");
    expect(normalizePhone(withCountryCode("351", "9123"))).toBeNull();
  });

  it("splits a stored number or a sent value back into the country and the digits", () => {
    expect(splitPhone("351912345678")).toEqual({ code: "351", digits: "912345678" });
    expect(splitPhone("5511987654321")).toEqual({ code: "55", digits: "11987654321" });
    expect(splitPhone("+5511987")).toEqual({ code: "55", digits: "11987" });
    expect(splitPhone("", "55")).toEqual({ code: "55", digits: "" });
    expect(splitPhone("912 345 678")).toEqual({ code: "351", digits: "912345678" });
  });
});
