"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { StayPlan } from "@/domain/search";
import { formatDay } from "@/lib/format";
import { PlanDetails } from "./plan-details";
import { PlanTotal, SavingsBadge, switchLabel } from "./plan-summary";
import { StayTimeline } from "./stay-timeline";

const SORTS = {
  "price-asc": { label: "En ucuz", compare: (a: StayPlan, b: StayPlan) => a.totalCost.amount - b.totalCost.amount },
  "price-desc": { label: "En pahalı", compare: (a: StayPlan, b: StayPlan) => b.totalCost.amount - a.totalCost.amount },
  "fewest-switches": { label: "Az değişiklik", compare: (a: StayPlan, b: StayPlan) => a.switchCount - b.switchCount },
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
          <h2 id="alternatives-title" className="text-xl">
            Tüm seçenekler
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">En uygun {plans.length} kombinasyon. Ayrıntı için birine dokun.</p>
        </div>
        {/* Sort tabs built on native radios, so arrow keys and screen readers work for free. */}
        <fieldset className="inline-flex gap-1 rounded-lg bg-card p-1 shadow-card">
          <legend className="sr-only">Sıralama</legend>
          {Object.entries(SORTS).map(([key, option]) => (
            <label
              key={key}
              className="flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-ink-muted transition-colors select-none hover:text-ink has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="alternatives-sort"
                value={key}
                checked={sort === key}
                onChange={() => setSort(key as SortKey)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </div>

      <ol className="flex flex-col gap-3">
        {sorted.map(({ plan }) => {
          const isRecommended = plan.id === recommendedId;
          return (
            <li key={plan.id} className={cn("rounded-xl bg-card shadow-card", isRecommended && "ring-2 ring-primary")}>
              <details className="group">
                <summary className="flex cursor-pointer flex-col gap-3 rounded-xl p-4 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-bold">{switchLabel(plan)}</span>
                      {isRecommended && <Badge variant="recommended">Önerilen</Badge>}
                      {plan.switchCount > 0 && <SavingsBadge savings={plan.savingsVsBestSingle} />}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-muted">
                      {plan.segments.map((s) => `${s.property.name} (${formatDay(s.checkIn)}–${formatDay(s.checkOut)})`).join(" → ")}
                    </p>
                    <div className="mt-3">
                      <StayTimeline plan={plan} compact />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <PlanTotal plan={plan} />
                    <ChevronDownIcon
                      className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </div>
                </summary>
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
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
