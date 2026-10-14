import { describe, expect, it } from "vitest";
import { moldsSchema } from "@/lib/validation/client";

const parse = (handMold?: string) => moldsSchema.safeParse({ handMold });

describe("moldsSchema", () => {
  it("accepts five sizes from 0 to 20 and normalises them", () => {
    expect(parse("3-10-5-7-9").data?.handMold).toBe("3-10-5-7-9");
    expect(parse("0-20-05-13-1").data?.handMold).toBe("0-20-5-13-1");
  });

  it("treats all-empty boxes as no mold", () => {
    expect(parse("----").data?.handMold).toBeUndefined();
    expect(parse("").data?.handMold).toBeUndefined();
    expect(parse(undefined).data?.handMold).toBeUndefined();
  });

  it("rejects partial molds, sizes over 20 and anything that isn't a number", () => {
    expect(parse("3--5--").error?.issues[0].message).toMatch(/Preencha os 5/);
    expect(parse("3-6-5-7").error?.issues[0].message).toMatch(/Preencha os 5/);
    expect(parse("3-6-5-7-21").error?.issues[0].message).toMatch(/de 0 a 20/);
    expect(parse("3-6-5-7-a").success).toBe(false);
  });
});
