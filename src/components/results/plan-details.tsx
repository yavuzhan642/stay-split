import { ArrowLeftRightIcon, ArrowUpRightIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { PriceLine, PriceLines } from "@/components/ui/price-lines";
import type { StayPlan, StaySegment, TransferLeg } from "@/domain/search";
import {
  formatCount,
  formatDayWithWeekday,
  formatKm,
  formatMoney,
  formatNights,
  formatRating,
} from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/messages";
import { stayColor } from "./stay-colors";

interface PlanDetailsProps {
  readonly plan: StayPlan;
  /** Whether the search asked for transfer estimates; otherwise legs show distance only. */
  readonly transferPriced: boolean;
}

const linkClass = "inline-flex items-center gap-1 font-semibold text-link hover:underline hover:underline-offset-4";

/** Every stay of a plan as one list; the move between two stays sits between their rows. */
export function PlanDetails({ plan, transferPriced }: PlanDetailsProps) {
  return (
    <ol className="border-t border-line">
      {plan.segments.map((segment, index) => {
        const transfer = plan.transfers[index - 1];
        return (
          <li key={segment.quote.id}>
            {transfer && <TransferRow transfer={transfer} plan={plan} priced={transferPriced} />}
            <SegmentRow segment={segment} index={index} total={plan.segments.length} />
          </li>
        );
      })}
    </ol>
  );
}

function SegmentRow({ segment, index, total }: { segment: StaySegment; index: number; total: number }) {
  const { property, quote } = segment;
  const color = stayColor(index);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${property.location.lat}&mlon=${property.location.lng}#map=16/${property.location.lat}/${property.location.lng}`;

  return (
    <article className="flex items-start gap-3 py-4">
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", color.bar)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4">
          <div className="min-w-0">
            <p className={cn("text-xs font-semibold", color.ink)}>{total > 1 ? `${index + 1}. konaklama` : "Konaklama"}</p>
            <h4 className="text-base font-bold">{property.name}</h4>
          </div>
          <div className="text-right">
            <p className="font-bold tabular-nums">{formatMoney(quote.total)}</p>
            <p className="text-xs text-ink-muted">{formatNights(segment.nights)}, vergiler dahil</p>
          </div>
        </div>

        <p className="mt-0.5 text-sm text-ink-muted">
          {PROPERTY_TYPE_LABELS[property.type]} · {property.neighborhood}
          {property.rating !== null && (
            <>
              {" · "}
              <span className="font-semibold text-ink tabular-nums">{formatRating(property.rating)}</span> puan (
              {formatCount(property.reviewCount)} yorum)
            </>
          )}
        </p>

        <p className="mt-1.5 text-sm tabular-nums">
          {formatDayWithWeekday(segment.checkIn)} → {formatDayWithWeekday(segment.checkOut)}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {quote.breakdown.length > 0 && (
            <details className="group open:basis-full">
              <summary className={cn(linkClass, "cursor-pointer select-none")}>
                Fiyat dökümü
                <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-2.5 max-w-[360px] rounded-lg bg-subtle p-4">
                <PriceLines>
                  {quote.breakdown.map((line, lineIndex) => (
                    <PriceLine
                      key={lineIndex}
                      label={line.label}
                      value={formatMoney(line.amount)}
                      tone={line.amount.amount < 0 ? "saving" : "default"}
                    />
                  ))}
                  <PriceLine tone="total" label="Toplam" value={formatMoney(quote.total)} />
                </PriceLines>
              </div>
            </details>
          )}
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Haritada gör
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </a>
          {quote.bookingUrl ? (
            <a href={quote.bookingUrl} target="_blank" rel="noopener noreferrer sponsored" className={linkClass}>
              Rezervasyon yap
              <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-ink-muted" title="Demo sürümde rezervasyon bağlantısı yoktur">
              Rezervasyon bağlantısı yok (demo)
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function TransferRow({ transfer, plan, priced }: { transfer: TransferLeg; plan: StayPlan; priced: boolean }) {
  const name = (id: string) => plan.segments.find((s) => s.property.id === id)?.property.neighborhood ?? id;
  return (
    <div className="my-1 flex items-center gap-3 rounded-lg bg-subtle px-3 py-2.5 text-sm text-ink-muted">
      <ArrowLeftRightIcon className="size-4 shrink-0 text-ink" aria-hidden="true" />
      <p className="min-w-0">
        <span className="font-semibold text-ink">{formatDayWithWeekday(transfer.date)} · otel değişikliği</span>
        {" · "}
        {name(transfer.fromPropertyId)} → {name(transfer.toPropertyId)}, {formatKm(transfer.distanceKm)}
        {priced ? ` · tahmini ${formatMoney(transfer.estimatedCost)}` : " · transfer maliyeti hesaba katılmadı"}
      </p>
    </div>
  );
}
