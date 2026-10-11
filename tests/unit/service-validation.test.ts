import { describe, expect, it } from "vitest";
import { serviceFormSchema } from "@/lib/validation/service";

const valid = { name: "Verniz gel", price: "25", active: "on" };

describe("serviceFormSchema", () => {
  it.each([
    ["25", 2500],
    ["25,5", 2550],
    ["25,50", 2550],
    ["25.99", 2599],
    [" 7 ", 700],
  ])("parses price %j as %i cents", (price, cents) => {
    const result = serviceFormSchema.parse({ ...valid, price });
    expect(result.price).toBe(cents);
  });

  it.each(["", "abc", "-5", "25,555", "1.000,00", "99999"])("rejects price %j", (price) => {
    expect(serviceFormSchema.safeParse({ ...valid, price }).success).toBe(false);
  });

  it("treats a missing checkbox as hidden and empty optionals as undefined", () => {
    const result = serviceFormSchema.parse({
      name: "Pedicure",
      price: "20",
      description: "   ",
      durationMinutes: "",
      active: undefined,
    });
    expect(result).toEqual({
      name: "Pedicure",
      price: 2000,
      description: undefined,
      durationMinutes: undefined,
      active: false,
    });
  });

  it("validates duration bounds", () => {
    expect(serviceFormSchema.parse({ ...valid, durationMinutes: "90" }).durationMinutes).toBe(90);
    expect(serviceFormSchema.safeParse({ ...valid, durationMinutes: "2" }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...valid, durationMinutes: "1,5" }).success).toBe(false);
  });

  it("requires a name with at least 2 characters", () => {
    const result = serviceFormSchema.safeParse({ ...valid, name: " a " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["name"]);
  });
});
