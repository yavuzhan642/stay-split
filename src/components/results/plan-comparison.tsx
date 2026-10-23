import { cn } from "cn";
import type { SearchResult, StayPlan } from "@/domain/search";
import { formatDay } from "@/lib/format";
import { PlanTotal, SavingsBadge } from "./plan-summary";
import { StayTimeline } from "./stay-timeline";

/** Best single stay next to the cheapest split, so the trade-off is visible at a glance. */
export function PlanComparison({ result }: { result: SearchResult }) {
  const { bestSingle, bestSplit, recommended } = result;
  if (!bestSingle && !bestSplit) return null;

  return (
    <section aria-labelledby="comparison-title" className="flex flex-col gap-3">
      <h2 id="comparison-title" className="text-lg font-semibold">
        Tek otel mi, bölünmüş mü?
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <ComparisonCard
          title="En iyi tek otel"
          plan={bestSingle}
          recommended={bestSingle?.id === recommended?.id}
          missing="Tüm geceler boyunca müsait tek bir tesis yok."
        />
        <ComparisonCard
          title="En ucuz bölünmüş konaklama"
          plan={bestSplit}
          recommended={bestSplit?.id === recommended?.id}
          missing={
            result.query.maxSwitches === 0
              ? "Otel değişikliğine izin vermediğin için hesaplanmadı."
              : "Geçerli bir bölünmüş kombinasyon bulunamadı."
          }
        />
      </div>
    </section>
  );
}

function ComparisonCard({
  title,
  plan,
  recommended,
  missing,
}: {
  title: string;
  plan: StayPlan | null;
  recommended: boolean;
  missing: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", recommended && "border-primary/50 ring-1 ring-primary/20")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {plan && (
            <p className="mt-1 text-sm font-medium">
              {plan.segments.map((s) => s.property.name).join(" → ")}
            </p>
          )}
        </div>
        {plan && <PlanTotal plan={plan} />}
      </div>
      {plan ? (
        <>
          <StayTimeline plan={plan} compact />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {plan.segments.map((s) => `${formatDay(s.checkIn)}–${formatDay(s.checkOut)}`).join(" · ")}
              {!plan.withinBudget && <span className="ml-1 font-medium text-destructive">· bütçeni aşıyor</span>}
            </span>
            {recommended ? (
              <span className="font-medium text-primary">Önerilen</span>
            ) : (
              plan.switchCount > 0 && <SavingsBadge savings={plan.savingsVsBestSingle} />
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{missing}</p>
      )}
    </div>
  );
}
