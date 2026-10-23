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
 * One column per night, one colored bar per stay. Bars are placed with CSS
 * grid columns computed from the dates, so a gap or overlap between stays
 * would be visible at a glance (the engine guarantees there is none).
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

  return (
    <figure className="w-full" aria-label={`Konaklama zaman çizelgesi. ${description}`}>
      {!compact && (
        <div className="mb-1.5 grid gap-x-1 text-center text-[11px] leading-tight text-muted-foreground" style={columns} aria-hidden="true">
          {nights.map((night, index) => (
            <div key={night} className="min-w-0">
              {index % labelEvery === 0 && (
                <>
                  <span className="block truncate">{formatWeekday(night)}</span>
                  <span className="block font-medium text-foreground tabular-nums">{formatDayOfMonth(night)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative grid gap-x-1" style={columns} aria-hidden="true">
        {plan.segments.map((segment, index) => {
          const offset = nightsBetween(first.checkIn, segment.checkIn);
          return (
            <div
              key={segment.quote.id}
              className={cn(
                "flex min-w-0 items-center rounded-md text-white",
                stayColor(index).bar,
                compact ? "h-2" : "h-11 px-2.5",
              )}
              style={{ gridColumn: `${offset + 1} / span ${segment.nights}` }}
            >
              {!compact && (
                <span className="min-w-0 truncate text-xs font-semibold">
                  {segment.property.name}
                  <span className="font-normal opacity-85"> · {formatNights(segment.nights)}</span>
                </span>
              )}
            </div>
          );
        })}

        {!compact &&
          plan.transfers.map((transfer) => {
            const position = (nightsBetween(first.checkIn, transfer.date) / nights.length) * 100;
            return (
              <span
                key={transfer.date}
                className="absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm"
                style={{ left: `${position}%` }}
              >
                <ArrowLeftRightIcon className="size-3.5" />
              </span>
            );
          })}
      </div>

      {!compact && (
        <figcaption className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Giriş {formatDay(first.checkIn)}</span>
          <span>Çıkış {formatDay(last.checkOut)}</span>
        </figcaption>
      )}
    </figure>
  );
}
