"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { StayPlan } from "@/domain/search";
import { formatDay } from "@/lib/format";
import { PlanDetails } from "./plan-details";
import { PlanTotal, SavingsBadge, switchLabel } from "./plan-summary";
import { StayTimeline } from "./stay-timeline";

const SORTS = {
  "price-asc": { label: "Fiyat: düşükten yükseğe", compare: (a: StayPlan, b: StayPlan) => a.totalCost.amount - b.totalCost.amount },
  "price-desc": { label: "Fiyat: yüksekten düşüğe", compare: (a: StayPlan, b: StayPlan) => b.totalCost.amount - a.totalCost.amount },
  "fewest-switches": { label: "Önce az otel değişikliği", compare: (a: StayPlan, b: StayPlan) => a.switchCount - b.switchCount },
} as const;

type SortKey = keyof typeof SORTS;

interface AlternativesListProps {
  /** Already ranked by the engine (cheapest first, ties to fewer switches). */
  readonly plans: readonly StayPlan[];
  readonly recommendedId: string | null;
  readonly transferPriced: boolean;
}

/**
 * Sorting happens in the browser: the plans are already here, so re-ordering
 * them must not cost another provider round-trip.
 */
export function AlternativesList({ plans, recommendedId, transferPriced }: AlternativesListProps) {
  const [sort, setSort] = useState<SortKey>("price-asc");
  // The engine's rank breaks ties, so equal prices keep a stable, meaningful order.
  const sorted = plans
    .map((plan, rank) => ({ plan, rank }))
    .sort((a, b) => SORTS[sort].compare(a.plan, b.plan) || a.rank - b.rank);

  return (
    <section aria-labelledby="alternatives-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="alternatives-title" className="text-lg font-semibold">
            Tüm seçenekler
          </h2>
          <p className="text-sm text-muted-foreground">En uygun {plans.length} kombinasyon. Ayrıntılar için birine dokun.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Sırala
          <NativeSelect value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sıralama">
            {Object.entries(SORTS).map(([key, option]) => (
              <NativeSelectOption key={key} value={key}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>

      <ol className="flex flex-col gap-2">
        {sorted.map(({ plan }) => {
          const isRecommended = plan.id === recommendedId;
          return (
            <li key={plan.id}>
              <details className={cn("group rounded-xl border bg-card", isRecommended && "border-primary/50 ring-1 ring-primary/20")}>
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 select-none sm:flex-row sm:items-center sm:gap-5 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">{switchLabel(plan)}</span>
                      {isRecommended && <span className="text-xs font-semibold text-primary">Önerilen</span>}
                      {plan.switchCount > 0 && <SavingsBadge savings={plan.savingsVsBestSingle} />}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {plan.segments.map((s) => `${s.property.name} (${formatDay(s.checkIn)}–${formatDay(s.checkOut)})`).join(" → ")}
                    </p>
                    <div className="mt-2.5">
                      <StayTimeline plan={plan} compact />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <PlanTotal plan={plan} />
                    <ChevronDownIcon
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </div>
                </summary>
                <div className="border-t p-4">
                  <PlanDetails plan={plan} transferPriced={transferPriced} />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
