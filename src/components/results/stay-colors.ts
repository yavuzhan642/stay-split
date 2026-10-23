/**
 * Segment i of a plan always gets color i, in the timeline and in the stay
 * cards, so the eye links "the teal bar" to "the teal card". Class names are
 * spelled out in full because Tailwind only generates classes it can find.
 */
const STAY_COLORS = [
  { bar: "bg-stay-1", soft: "bg-stay-1-soft", text: "text-stay-1", accent: "border-l-stay-1" },
  { bar: "bg-stay-2", soft: "bg-stay-2-soft", text: "text-stay-2", accent: "border-l-stay-2" },
  { bar: "bg-stay-3", soft: "bg-stay-3-soft", text: "text-stay-3", accent: "border-l-stay-3" },
] as const;

export type StayColor = (typeof STAY_COLORS)[number];

export function stayColor(segmentIndex: number): StayColor {
  return STAY_COLORS[segmentIndex % STAY_COLORS.length]!;
}
