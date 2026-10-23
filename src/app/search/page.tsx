import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ResultsSkeleton } from "@/components/results/results-skeleton";
import { SearchResults } from "@/components/results/search-results";
import { SearchForm } from "@/components/search/search-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formDefaults, searchKey, searchParamsToInput } from "@/lib/search-params";
import { validateSearchQuery } from "@/services/search-query";

export const metadata: Metadata = {
  title: "Konaklama kombinasyonları · StaySplit",
};

/**
 * The static shell (layout, form placeholder, skeleton) is prerendered;
 * everything that depends on the URL streams in at request time.
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Suspense
        fallback={
          <>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <ResultsSkeleton />
          </>
        }
      >
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
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
      <section id="search-form" aria-label="Arama" className="scroll-mt-20 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <SearchForm
          key={key}
          variant="compact"
          defaults={formDefaults(params)}
          issues={hasInput && !validation.ok ? validation.issues : []}
        />
      </section>

      {validation.ok ? (
        <Suspense key={key} fallback={<ResultsSkeleton />}>
          <SearchResults query={validation.query} />
        </Suspense>
      ) : (
        <p className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-muted-foreground">
          {hasInput
            ? "Aramayı tamamlamak için yukarıda işaretlenen alanları düzelt."
            : "Şehir ve tarihleri seç; tek otel ile bölünmüş konaklamanın tüm kombinasyonlarını karşılaştıralım."}
        </p>
      )}
    </>
  );
}
