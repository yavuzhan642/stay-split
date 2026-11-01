import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ResultsSkeleton } from "@/components/results/results-skeleton";
import { SearchResults } from "@/components/results/search-results";
import { SearchForm } from "@/components/search/search-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formDefaults, searchKey, searchParamsToInput } from "@/lib/search-params";
import { validateSearchQuery } from "@/services/search-query";

export const metadata: Metadata = {
  title: "Konaklama kombinasyonları",
};

/**
 * The static shell (layout, form placeholder, skeleton) is prerendered;
 * everything that depends on the URL streams in at request time.
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="flex-1">
      <Suspense
        fallback={
          <>
            <SearchBand>
              <Skeleton className="h-[120px] w-full rounded-xl bg-white/10" />
            </SearchBand>
            <ResultsArea>
              <ResultsSkeleton />
            </ResultsArea>
          </>
        }
      >
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-5";

/** The navy band under the header that carries the search form, as on the home page. */
function SearchBand({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand pt-2 pb-6">
      <div className={WRAP}>{children}</div>
    </div>
  );
}

function ResultsArea({ children }: { children: ReactNode }) {
  return <div className={`${WRAP} pt-8 pb-16`}>{children}</div>;
}

async function SearchContent({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  // Validation reads the current date ("is check-in in the past?"), so this must run per request.
  await connection();
  const hasInput = Object.keys(params).length > 0;
  const validation = validateSearchQuery(searchParamsToInput(params));
  // Remount the form and the results for every new search, so the form shows
  // what was submitted and the skeleton reappears while the next search runs.
  const key = searchKey(params);

  return (
    <>
      <SearchBand>
        <section id="search-form" aria-label="Arama" className="scroll-mt-4">
          <SearchForm
            key={key}
            variant="compact"
            defaults={formDefaults(params)}
            issues={hasInput && !validation.ok ? validation.issues : []}
          />
        </section>
      </SearchBand>

      <ResultsArea>
        {validation.ok ? (
          <Suspense key={key} fallback={<ResultsSkeleton />}>
            <SearchResults query={validation.query} />
          </Suspense>
        ) : (
          <div className="rounded-xl bg-card px-6 py-12 text-center shadow-card">
            <h1 className="text-xl">{hasInput ? "Aramayı tamamlamak için birkaç alanı düzelt." : "Nereye gidiyorsun?"}</h1>
            <p className="mx-auto mt-1.5 max-w-md text-ink-muted">
              {hasInput
                ? "İşaretlenen alanlar yukarıda. Düzelttikten sonra yeniden ara."
                : "Şehri ve tarihleri seç; tek otel ile bölünmüş konaklamanın tüm kombinasyonlarını karşılaştıralım."}
            </p>
          </div>
        )}
      </ResultsArea>
    </>
  );
}
