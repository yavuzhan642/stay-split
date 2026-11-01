/**
 * Segment i of a plan always gets color i, in the timeline and in the stay
 * rows, so the eye links "the navy bar" to "the navy stay". Bars are solid
 * fills with their own text color; "ink" is the same hue for text on white.
 * Amber is too light to stand alone on white, so its thin marks get an inset
 * edge. Class names are spelled out in full because Tailwind only generates
 * classes it can find.
 */
const STAY_COLORS = [
  { fill: "bg-stay-1 text-on-stay-1", bar: "bg-stay-1", ink: "text-stay-1-ink" },
  { fill: "bg-stay-2 text-on-stay-2", bar: "bg-stay-2 shadow-[inset_0_0_0_1px_var(--stay-2-ink)]", ink: "text-stay-2-ink" },
  { fill: "bg-stay-3 text-on-stay-3", bar: "bg-stay-3", ink: "text-stay-3-ink" },
] as const;

export type StayColor = (typeof STAY_COLORS)[number];

export function stayColor(segmentIndex: number): StayColor {
  return STAY_COLORS[segmentIndex % STAY_COLORS.length]!;
}
