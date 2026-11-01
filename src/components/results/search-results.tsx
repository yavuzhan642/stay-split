import { DemoNotice } from "@/components/demo-notice";
import { findCity } from "@/domain/cities";
import { nightsBetween } from "@/domain/dates";
import type { SearchQuery } from "@/domain/search";
import { formatCount, formatDateRange, formatMoney, formatNights } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/messages";
import { getAccommodationProvider } from "@/providers/registry";
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
  const result = await searchStays(query, { provider: getAccommodationProvider() });
  const city = findCity(query.cityId);
  const nights = nightsBetween(query.checkIn, query.checkOut);

  const filters = [
    formatNights(nights),
    `${query.adults} yetişkin`,
    query.propertyTypes.length > 0 ? query.propertyTypes.map((t) => PROPERTY_TYPE_LABELS[t]).join(", ") : null,
    query.maxSwitches === 0 ? "Tek otel" : "En fazla 1 otel değişikliği",
    query.budget ? `Bütçe ${formatMoney(query.budget)}` : null,
    query.includeTransferCost ? "Transfer dahil" : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px]">
            {city?.name ?? query.cityId}
            <span className="font-semibold text-ink-muted"> · {formatDateRange(query.checkIn, query.checkOut)}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{filters.join(" · ")}</p>
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

      <p className="text-center text-xs text-ink-muted">
        {formatCount(result.stats.propertiesConsidered)} tesis, {formatCount(result.stats.stayIntervalsRequested)} tarih
        aralığı ve {formatCount(result.stats.quotesReceived)} fiyat teklifiyle{" "}
        {formatCount(result.stats.validCombinations)} geçerli kombinasyon değerlendirildi.
      </p>
    </div>
  );
}
