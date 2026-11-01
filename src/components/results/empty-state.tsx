import { ArrowRightIcon, CalendarXIcon, FilterXIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { EmptyReason, SearchQuery, SearchResult } from "@/domain/search";
import { formatMoney } from "@/lib/format";
import { EMPTY_STATE_COPY } from "@/lib/messages";
import { searchHref } from "@/lib/search-params";

const ICONS: Record<EmptyReason, typeof CalendarXIcon> = {
  "no-matching-properties": FilterXIcon,
  "no-availability": CalendarXIcon,
  "over-budget": WalletIcon,
};

interface Suggestion {
  readonly label: string;
  readonly href: string;
}

/** Each empty result explains why and offers one-click ways out, built from the same query. */
function suggestionsFor(reason: EmptyReason, query: SearchQuery): Suggestion[] {
  switch (reason) {
    case "no-matching-properties":
      return [
        ...(query.propertyTypes.length > 0 ? [{ label: "Tüm konaklama türlerini ara", href: searchHref(query, { propertyTypes: [] }) }] : []),
        ...(query.adults > 2 ? [{ label: "2 yetişkin için ara", href: searchHref(query, { adults: 2 }) }] : []),
      ];
    case "no-availability":
      return [
        ...(query.maxSwitches === 0 ? [{ label: "Otel değişikliğine izin ver", href: searchHref(query, { maxSwitches: 1 }) }] : []),
        ...(query.propertyTypes.length > 0 ? [{ label: "Tüm konaklama türlerini ara", href: searchHref(query, { propertyTypes: [] }) }] : []),
      ];
    case "over-budget":
      return [
        { label: "Bütçesiz ara", href: searchHref(query, { budget: null }) },
        ...(query.maxSwitches === 0 ? [{ label: "Otel değişikliğine izin ver", href: searchHref(query, { maxSwitches: 1 }) }] : []),
      ];
  }
}

export function EmptyState({ result, reason }: { result: SearchResult; reason: EmptyReason }) {
  const Icon = ICONS[reason];
  const copy = EMPTY_STATE_COPY[reason];
  const suggestions = suggestionsFor(reason, result.query);
  const cheapest = [result.bestSingle, result.bestSplit]
    .filter((plan) => plan !== null)
    .sort((a, b) => a.totalCost.amount - b.totalCost.amount)[0];

  return (
    <section className="flex flex-col items-center gap-4 rounded-xl bg-card px-6 py-12 text-center shadow-card">
      <Icon className="size-10 text-link [stroke-width:1.5]" aria-hidden="true" />
      <div className="max-w-md">
        <h2 className="text-xl">{copy.title}</h2>
        <p className="mt-1.5 text-ink-muted">{copy.body}</p>
        {reason === "over-budget" && cheapest && (
          <p className="mt-2">
            En uygun seçenek <span className="font-bold tabular-nums">{formatMoney(cheapest.totalCost)}</span>.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {suggestions.map((suggestion, index) => (
            <Link
              key={suggestion.href}
              href={suggestion.href}
              className={buttonVariants({ variant: index === 0 ? "default" : "secondary" })}
            >
              {suggestion.label}
            </Link>
          ))}
          <Link href="#search-form" className={buttonVariants({ variant: "link", className: "ml-1" })}>
            Tarihleri değiştir
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
