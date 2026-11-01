import { ArrowLeftRightIcon } from "lucide-react";
import { cn } from "cn";
import { eachNight, nightsBetween } from "@/domain/dates";
import type { StayPlan } from "@/domain/search";
import { formatDay, formatDayOfMonth, formatNights, formatWeekday } from "@/lib/format";
import { stayColor } from "./stay-colors";

interface StayTimelineProps {
  readonly plan: StayPlan;
  /** Thin bars without labels, for list rows. */
  readonly compact?: boolean;
}

/**
 * One column per night, one bar per stay. Bars are placed with CSS grid
 * columns computed from the dates, so a gap or an overlap between stays would
 * be visible at a glance (the engine guarantees there is none). Each change
 * day gets a small round marker on the seam between two bars.
 */
export function StayTimeline({ plan, compact = false }: StayTimelineProps) {
  const first = plan.segments[0];
  const last = plan.segments.at(-1);
  if (!first || !last) return null;

  const nights = eachNight(first.checkIn, last.checkOut);
  const columns = { gridTemplateColumns: `repeat(${nights.length}, minmax(0, 1fr))` };
  // Long trips would crowd the date row; label every 2nd or 3rd night instead.
  const labelEvery = nights.length <= 10 ? 1 : nights.length <= 20 ? 2 : 3;

  const description = plan.segments
    .map((s) => `${s.property.name}: ${formatDay(s.checkIn)} – ${formatDay(s.checkOut)}, ${formatNights(s.nights)}`)
    .join("; ");

  if (compact) {
    return (
      <div className="grid gap-x-1" style={columns} role="img" aria-label={`Zaman çizelgesi. ${description}`}>
        {plan.segments.map((segment, index) => (
          <div
            key={segment.quote.id}
            className={cn("h-1.5 rounded-full", stayColor(index).bar)}
            style={{ gridColumn: `${nightsBetween(first.checkIn, segment.checkIn) + 1} / span ${segment.nights}` }}
          />
        ))}
      </div>
    );
  }

  return (
    <figure className="w-full" aria-label={`Konaklama zaman çizelgesi. ${description}`}>
      <div className="mb-2 grid gap-x-1 text-center" style={columns} aria-hidden="true">
        {nights.map((night, index) => (
          <div key={night} className="min-w-0">
            {index % labelEvery === 0 && (
              <>
                <span className="block truncate text-xs text-ink-muted">{formatWeekday(night)}</span>
                <span className="block text-sm font-bold tabular-nums">{formatDayOfMonth(night)}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="relative grid h-14 gap-x-1" style={columns} aria-hidden="true">
        {plan.segments.map((segment, index) => (
          <div
            key={segment.quote.id}
            className={cn("flex min-w-0 flex-col justify-center rounded-lg px-3", stayColor(index).fill)}
            style={{ gridColumn: `${nightsBetween(first.checkIn, segment.checkIn) + 1} / span ${segment.nights}` }}
          >
            <span className="truncate text-sm font-semibold">{segment.property.name}</span>
            <span className="truncate text-xs">{formatNights(segment.nights)}</span>
          </div>
        ))}

        {plan.transfers.map((transfer) => (
          <span
            key={transfer.date}
            className="absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line"
            style={{ left: `${(nightsBetween(first.checkIn, transfer.date) / nights.length) * 100}%` }}
          >
            <ArrowLeftRightIcon className="size-3.5" />
          </span>
        ))}
      </div>

      <figcaption className="mt-2 flex justify-between text-xs text-ink-muted">
        <span>Giriş · {formatDay(first.checkIn)}</span>
        <span>Çıkış · {formatDay(last.checkOut)}</span>
      </figcaption>
    </figure>
  );
}
