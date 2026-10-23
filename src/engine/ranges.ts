/**
 * Nights are numbered 0 … N-1 and the dates between them are "boundaries"
 * 0 … N, where boundary 0 is check-in and boundary N is check-out. A segment
 * is the half-open range [from, to): it covers nights from … to-1, i.e. it
 * checks in on boundary `from` and checks out on boundary `to`.
 *
 * Half-open ranges make the no-gap/no-overlap rule trivial: consecutive
 * segments are valid exactly when one's `to` equals the next one's `from`.
 */
export interface NightRange {
  readonly from: number;
  readonly to: number;
}

/**
 * The stay intervals that can appear in at least one valid plan, i.e. the
 * only ones worth asking the provider to price. Each request costs latency
 * and, with real APIs, rate-limit budget.
 *
 * A segment [i, j) leaves [0, i) before it and [j, N) after it. Each
 * non-empty leftover needs at least one more segment (so one more switch)
 * and must itself be at least `minNights` long. That gives:
 *
 *   K = 0 → only the full stay                                   1 interval
 *   K = 1 → full stay, prefixes [0, j], suffixes [i, N]          2N − 1 intervals
 *   K ≥ 2 → every [i, j]                                         N(N + 1) / 2 intervals
 *
 * (counts for minNights = 1). The linear growth for K = 1 is one reason the
 * MVP caps switches at 1.
 */
export function requiredRanges(nights: number, maxSwitches: number, minNights = 1): NightRange[] {
  const ranges: NightRange[] = [];
  for (let from = 0; from < nights; from++) {
    for (let to = from + minNights; to <= nights; to++) {
      const before = from;
      const after = nights - to;
      if ((before > 0 && before < minNights) || (after > 0 && after < minNights)) continue;
      const switchesNeeded = (before > 0 ? 1 : 0) + (after > 0 ? 1 : 0);
      if (switchesNeeded <= maxSwitches) ranges.push({ from, to });
    }
  }
  return ranges;
}
