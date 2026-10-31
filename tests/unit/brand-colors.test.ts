import { describe, expect, it } from "vitest";
import { brandStyle, contrast, mix, readableOn } from "@/lib/brand-colors";

const token = (style: ReturnType<typeof brandStyle>, name: string) => (style as Record<string, string>)[name];

describe("brandStyle", () => {
  it("leaves the template alone until both colors are set", () => {
    expect(brandStyle(null, null)).toBeUndefined();
    expect(brandStyle("#123456", null)).toBeUndefined();
  });

  it.each(["#ffee00", "#ffffff", "#ffc0e0", "#7a00ff", "#000000"])("keeps text and buttons readable with %s", (primary) => {
    const style = brandStyle(primary, "#00ffcc");
    const accent = token(style, "--color-accent");

    expect(contrast(accent, token(style, "--color-cream"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(accent, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(style, "--text-gradient-start"), token(style, "--color-cream"))).toBeGreaterThanOrEqual(3);
  });

  it("keeps the exact colors for decoration, and for text when they already read well", () => {
    const style = brandStyle("#1d4ed8", "#ff66aa");

    expect(token(style, "--color-accent")).toBe("#1d4ed8");
    expect(token(style, "--color-brand-flame")).toBe("#1d4ed8");
    expect(token(style, "--color-brand-amber")).toBe("#ff66aa");
  });
});

describe("helpers", () => {
  it("mixes two colors", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("doesn't touch a color that already passes", () => {
    expect(readableOn("#ffffff", "#000000", 4.5)).toBe("#000000");
  });
});
