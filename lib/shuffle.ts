/** Same seed, same order. Seed 0 keeps the order as it is, for the server's render. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  if (seed === 0) return result;

  let state = Math.floor(seed * 2147483646) + 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 48271) % 2147483647; // Lehmer generator
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
