import { describe, expect, it } from "vitest";
import { shuffled } from "@/lib/shuffle";

const items = Array.from({ length: 20 }, (_, i) => i);

describe("shuffled", () => {
  it("keeps every item and leaves the original alone", () => {
    const copy = [...items];
    expect([...shuffled(items, 0.42)].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(copy);
  });

  it("gives the same order for a seed and another for a different one", () => {
    expect(shuffled(items, 0.42)).toEqual(shuffled(items, 0.42));
    expect(shuffled(items, 0.42)).not.toEqual(shuffled(items, 0.77));
  });

  it("keeps the order with seed 0", () => {
    expect(shuffled(items, 0)).toEqual(items);
  });
});
