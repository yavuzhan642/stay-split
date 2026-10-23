import { describe, expect, it } from "vitest";
import { requiredRanges } from "./ranges";

describe("requiredRanges", () => {
  it("asks only for the full stay when switching is not allowed", () => {
    expect(requiredRanges(5, 0)).toEqual([{ from: 0, to: 5 }]);
  });

  it("asks for 2N − 1 intervals with one switch: the full stay, prefixes and suffixes", () => {
    const ranges = requiredRanges(5, 1);
    expect(ranges).toHaveLength(2 * 5 - 1);
    expect(ranges.every((r) => r.from === 0 || r.to === 5)).toBe(true);
  });

  it("asks for every interval, N(N + 1) / 2, with two or more switches", () => {
    expect(requiredRanges(5, 2)).toHaveLength((5 * 6) / 2);
    expect(requiredRanges(5, 4)).toHaveLength((5 * 6) / 2);
  });

  it("skips intervals that would force a segment shorter than the minimum", () => {
    // 4 nights, segments of ≥ 2 nights, one switch: [0,4], [0,2] + [2,4] only.
    expect(requiredRanges(4, 1, 2)).toEqual([
      { from: 0, to: 2 },
      { from: 0, to: 4 },
      { from: 2, to: 4 },
    ]);
  });

  it("returns nothing when the trip is shorter than the minimum segment", () => {
    expect(requiredRanges(1, 1, 2)).toEqual([]);
  });
});
