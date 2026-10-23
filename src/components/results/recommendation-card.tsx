import { SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/domain/search";
import { formatMoney } from "@/lib/format";
import { recommendationCopy } from "@/lib/messages";
import { PlanDetails } from "./plan-details";
import { PlanTotal, SavingsBadge, switchLabel } from "./plan-summary";
import { StayTimeline } from "./stay-timeline";

/** The answer to the search: what we recommend, why, and what it looks like night by night. */
export function RecommendationCard({ result }: { result: SearchResult }) {
  const { recommendation, recommended, bestSingle } = result;
  if (!recommendation || !recommended) return null;

  const copy = recommendationCopy(recommendation, result);
  const showSingleReference = recommendation.kind === "split" && bestSingle && bestSingle.id !== recommended.id;

  return (
    <section
      aria-labelledby="recommendation-title"
      className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="h-6 gap-1 px-2.5">
            <SparklesIcon aria-hidden="true" />
            Önerimiz
          </Badge>
          <Badge variant="secondary" className="h-6 px-2.5">
            {recommendation.kind === "split" ? `Bölünmüş konaklama · ${switchLabel(recommended)}` : "Tek otel"}
          </Badge>
          {recommendation.savings && <SavingsBadge savings={recommendation.savings} />}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h2 id="recommendation-title" className="text-2xl font-semibold tracking-tight text-balance">
              {copy.title}
            </h2>
            <p className="mt-1.5 text-muted-foreground">{copy.body}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start sm:items-end">
            <PlanTotal plan={recommended} size="lg" align="responsive" />
            {showSingleReference && (
              <p className="mt-1 text-sm text-muted-foreground">
                Tek otel: <span className="line-through">{formatMoney(bestSingle.totalCost)}</span>
              </p>
            )}
          </div>
        </div>

        <StayTimeline plan={recommended} />
        <PlanDetails plan={recommended} transferPriced={result.query.includeTransferCost} />
      </div>

      <p className="border-t bg-muted/50 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        {recommended.segments.length > 1
          ? "Her konaklama ayrı rezervasyondur. "
          : ""}
        Rezervasyon StaySplit üzerinden yapılmaz; demo sürümde sağlayıcı bağlantısı bulunmuyor.
      </p>
    </section>
  );
}
