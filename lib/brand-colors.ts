import type { CSSProperties } from "react";

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** What the color pickers start on, the template's own colors. */
export const DEFAULT_COLORS = { primary: "#c2410c", secondary: "#f25c05" };

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;

const toHex = (rgb: Rgb) => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

/** `amount` of `color` over `base`: mix("#ff0000", "#ffffff", 0.1) is a pale red. */
export function mix(color: string, base: string, amount: number): string {
  const over = toRgb(base);
  return toHex(toRgb(color).map((channel, i) => channel * amount + over[i] * (1 - amount)) as Rgb);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Darkens `color` just enough to read on `background`. */
export function readableOn(background: string, color: string, ratio: number): string {
  let result = color;
  for (let amount = 0.96; contrast(result, background) < ratio && amount > 0; amount -= 0.04) {
    result = mix(color, "#000000", amount);
  }
  return result;
}

/**
 * Rebrands a studio's site by overriding the design tokens, as `.nailo` does in
 * globals.css. Decoration keeps the exact colors; text and buttons use a cut that
 * passes WCAG AA, so a pale color picked by a studio can't make its site unreadable.
 */
export function brandStyle(primary: string | null, secondary: string | null): CSSProperties | undefined {
  if (!primary || !secondary) return undefined;

  const cream = mix(primary, "#ffffff", 0.03);
  const accent = readableOn(cream, primary, 4.5);
  const [r, g, b] = toRgb(mix(primary, "#ffffff", 0.3));

  return {
    "--color-cream": cream,
    "--color-peach-50": mix(primary, "#ffffff", 0.08),
    "--color-peach-100": mix(primary, "#ffffff", 0.14),
    "--color-peach-200": mix(primary, "#ffffff", 0.26),
    "--color-line": mix(primary, "#ffffff", 0.14),
    "--color-line-strong": mix(primary, "#ffffff", 0.28),
    "--color-brand-amber": secondary,
    "--color-brand-flame": primary,
    "--color-brand-coral": primary,
    "--color-brand-rose": secondary,
    "--color-accent": accent,
    "--color-accent-hover": mix(accent, "#000000", 0.85),
    "--text-gradient-start": readableOn(cream, secondary, 3),
    "--text-gradient-end": accent,
    "--glow-rgb": `${r} ${g} ${b}`,
  } as CSSProperties;
}
