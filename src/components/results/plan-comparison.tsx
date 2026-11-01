import { Badge } from "@/components/ui/badge";
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
      <h2 id="comparison-title" className="text-xl">
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
    <div className={cn("flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card", recommended && "ring-2 ring-primary")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {title}
            {recommended && <Badge variant="recommended">Önerilen</Badge>}
          </p>
          {plan && <p className="mt-1 font-bold">{plan.segments.map((s) => s.property.name).join(" → ")}</p>}
        </div>
        {plan && <PlanTotal plan={plan} />}
      </div>
      {plan ? (
        <>
          <StayTimeline plan={plan} compact />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <span>
              {plan.segments.map((s) => `${formatDay(s.checkIn)}–${formatDay(s.checkOut)}`).join(" · ")}
              {!plan.withinBudget && <span className="ml-1 font-semibold text-danger">· bütçeni aşıyor</span>}
            </span>
            {!recommended && plan.switchCount > 0 && <SavingsBadge savings={plan.savingsVsBestSingle} />}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">{missing}</p>
      )}
    </div>
  );
}
