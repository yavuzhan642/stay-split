import { ArrowLeftRightIcon, MapPinIcon, StarIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { StayPlan, StaySegment, TransferLeg } from "@/domain/search";
import {
  formatCount,
  formatDay,
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

/** Every stay of a plan as a card, with the move between them. */
export function PlanDetails({ plan, transferPriced }: PlanDetailsProps) {
  return (
    <ol className="flex flex-col gap-2">
      {plan.segments.map((segment, index) => {
        const transfer = plan.transfers[index - 1];
        return (
          <li key={segment.quote.id} className="flex flex-col gap-2">
            {transfer && <TransferRow transfer={transfer} plan={plan} priced={transferPriced} />}
            <SegmentCard segment={segment} index={index} total={plan.segments.length} />
          </li>
        );
      })}
    </ol>
  );
}

function SegmentCard({ segment, index, total }: { segment: StaySegment; index: number; total: number }) {
  const { property, quote } = segment;
  const color = stayColor(index);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${property.location.lat}&mlon=${property.location.lng}#map=16/${property.location.lat}/${property.location.lng}`;

  return (
    <article className={cn("rounded-xl border border-l-4 bg-card p-4", color.accent)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold tracking-wide uppercase", color.text)}>
            {total > 1 ? `${index + 1}. konaklama` : "Konaklama"}
          </p>
          <h4 className="mt-0.5 text-base font-semibold">{property.name}</h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="outline">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {property.neighborhood}
            </span>
            {property.rating !== null && (
              <span className="inline-flex items-center gap-1">
                <StarIcon className="size-3.5 fill-current text-amber-500" aria-hidden="true" />
                <span className="font-medium text-foreground">{formatRating(property.rating)}</span>
                <span>({formatCount(property.reviewCount)} değerlendirme)</span>
              </span>
            )}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-semibold tabular-nums">{formatMoney(quote.total)}</p>
          <p className="text-xs text-muted-foreground">{formatNights(segment.nights)}, vergiler dahil</p>
        </div>
      </div>

      <p className="mt-3 text-sm">
        <span className="font-medium">{formatDayWithWeekday(segment.checkIn)}</span>
        <span className="text-muted-foreground"> → </span>
        <span className="font-medium">{formatDayWithWeekday(segment.checkOut)}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {quote.breakdown.length > 0 && (
          <details className="group w-full sm:w-auto">
            <summary className="cursor-pointer font-medium text-primary select-none hover:underline">Fiyat dökümü</summary>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm">
              {quote.breakdown.map((line, lineIndex) => (
                <div key={lineIndex} className="contents">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className={cn("text-right tabular-nums", line.amount.amount < 0 && "text-savings")}>
                    {formatMoney(line.amount)}
                  </dd>
                </div>
              ))}
              <dt className="border-t pt-1 font-medium">Toplam</dt>
              <dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatMoney(quote.total)}</dd>
            </dl>
          </details>
        )}
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          Haritada gör
        </a>
        {quote.bookingUrl ? (
          <a href={quote.bookingUrl} target="_blank" rel="noopener noreferrer sponsored" className="font-medium text-primary hover:underline">
            Rezervasyon yap
          </a>
        ) : (
          <span className="text-muted-foreground" title="Demo sürümde rezervasyon bağlantısı yoktur">
            Rezervasyon bağlantısı yok (demo)
          </span>
        )}
      </div>
    </article>
  );
}

function TransferRow({ transfer, plan, priced }: { transfer: TransferLeg; plan: StayPlan; priced: boolean }) {
  const name = (id: string) => plan.segments.find((s) => s.property.id === id)?.property.neighborhood ?? id;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-2.5 text-sm">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <ArrowLeftRightIcon className="size-3.5" aria-hidden="true" />
      </span>
      <p className="min-w-0">
        <span className="font-medium">{formatDay(transfer.date)}: otel değişikliği</span>
        <span className="text-muted-foreground">
          {" "}
          · {name(transfer.fromPropertyId)} → {name(transfer.toPropertyId)} · {formatKm(transfer.distanceKm)}
          {priced ? ` · tahmini transfer ${formatMoney(transfer.estimatedCost)}` : " · transfer maliyeti hesaba katılmadı"}
        </span>
      </p>
    </div>
  );
}
