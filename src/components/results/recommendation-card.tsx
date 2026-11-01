import { Badge } from "@/components/ui/badge";
import { PriceLine, PriceLines } from "@/components/ui/price-lines";
import type { SearchResult } from "@/domain/search";
import { formatMoney } from "@/lib/format";
import { recommendationCopy } from "@/lib/messages";
import { PlanDetails } from "./plan-details";
import { SavingsBadge, switchLabel } from "./plan-summary";
import { StayTimeline } from "./stay-timeline";

/** The answer to the search: what we recommend, why, the total, and the plan night by night. */
export function RecommendationCard({ result }: { result: SearchResult }) {
  const { recommendation, recommended, bestSingle, query } = result;
  if (!recommendation || !recommended) return null;

  const copy = recommendationCopy(recommendation, result);
  const savings = recommendation.savings && recommendation.savings.amount.amount > 0 ? recommendation.savings : null;
  const showSingleReference = recommendation.kind === "split" && bestSingle && bestSingle.id !== recommended.id;

  return (
    <section aria-labelledby="recommendation-title" className="rounded-xl bg-card shadow-card">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="recommended">Önerimiz</Badge>
              <Badge variant="secondary">{recommendation.kind === "split" ? `Bölünmüş · ${switchLabel(recommended)}` : "Tek otel"}</Badge>
              {savings && <SavingsBadge savings={savings} />}
            </div>
            <h2 id="recommendation-title" className="mt-3 text-2xl text-balance">
              {copy.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-ink-muted">{copy.body}</p>
          </div>

          <div className="md:text-right">
            <p className="text-[32px] leading-none font-bold tracking-tight tabular-nums">{formatMoney(recommended.totalCost)}</p>
            <p className="mt-1 text-xs text-ink-muted">toplam, vergiler dahil</p>
            {(recommended.transferCost.amount > 0 || showSingleReference) && (
              <PriceLines className="mt-4 text-left">
                <PriceLine label="Konaklama" value={formatMoney(recommended.lodgingCost)} />
                {recommended.transferCost.amount > 0 && (
                  <PriceLine label="Transfer (tahmini)" value={formatMoney(recommended.transferCost)} />
                )}
                {showSingleReference && (
                  <>
                    <PriceLine tone="total" label="Tek otelde" value={formatMoney(bestSingle.totalCost)} strike />
                    {savings && <PriceLine tone="saving" label="Tasarruf" value={formatMoney(savings.amount)} />}
                  </>
                )}
              </PriceLines>
            )}
          </div>
        </div>

        <StayTimeline plan={recommended} />
        <PlanDetails plan={recommended} transferPriced={query.includeTransferCost} />
      </div>

      <p className="border-t border-line px-5 py-3 text-xs text-ink-muted sm:px-6">
        {recommended.segments.length > 1 ? "Her konaklama ayrı bir rezervasyondur. " : ""}
        StaySplit rezervasyon yapmaz; demo sürümde sağlayıcı bağlantısı bulunmuyor.
      </p>
    </section>
  );
}
