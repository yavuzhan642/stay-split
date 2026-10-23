import { CalculatorIcon } from "lucide-react";
import { DemoNotice } from "@/components/demo-notice";
import { findCity } from "@/domain/cities";
import { nightsBetween } from "@/domain/dates";
import type { SearchQuery } from "@/domain/search";
import { formatCount, formatDateRange, formatMoney, formatNights } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/messages";
import { createAccommodationProvider } from "@/providers/registry";
import { searchStays } from "@/services/search-stays";
import { AlternativesList } from "./alternatives-list";
import { EmptyState } from "./empty-state";
import { PlanComparison } from "./plan-comparison";
import { RecommendationCard } from "./recommendation-card";

/**
 * Runs the search on the server. The provider (and, later, its API keys)
 * never reaches the browser; only the finished plans are sent down.
 */
export async function SearchResults({ query }: { query: SearchQuery }) {
  const result = await searchStays(query, { provider: createAccommodationProvider() });
  const city = findCity(query.cityId);
  const nights = nightsBetween(query.checkIn, query.checkOut);

  const filters = [
    `${query.adults} yetişkin`,
    query.propertyTypes.length > 0 ? query.propertyTypes.map((t) => PROPERTY_TYPE_LABELS[t]).join(", ") : null,
    query.maxSwitches === 0 ? "Tek otel" : "En fazla 1 otel değişikliği",
    query.budget ? `Bütçe ${formatMoney(query.budget)}` : null,
    query.includeTransferCost ? "Transfer dahil" : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {city?.name ?? query.cityId}, {formatDateRange(query.checkIn, query.checkOut)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatNights(nights)} · {filters.join(" · ")}
          </p>
        </div>
        {result.dataSource.isDemo && <DemoNotice />}
      </header>

      {result.emptyReason ? (
        <EmptyState result={result} reason={result.emptyReason} />
      ) : (
        <>
          <RecommendationCard result={result} />
          <PlanComparison result={result} />
          {result.alternatives.length > 1 && (
            <AlternativesList
              plans={result.alternatives}
              recommendedId={result.recommended?.id ?? null}
              transferPriced={query.includeTransferCost}
            />
          )}
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalculatorIcon className="size-3.5 shrink-0" aria-hidden="true" />
        {formatCount(result.stats.propertiesConsidered)} tesis ve {formatCount(result.stats.stayIntervalsRequested)} tarih
        aralığı için {formatCount(result.stats.quotesReceived)} fiyat teklifi alındı;{" "}
        {formatCount(result.stats.validCombinations)} geçerli kombinasyon değerlendirildi.
      </p>
    </div>
  );
}
