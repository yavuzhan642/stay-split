import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the search runs; mirrors the real layout so nothing jumps when results arrive. */
export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Tüm kombinasyonlar hesaplanıyor…</span>
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
