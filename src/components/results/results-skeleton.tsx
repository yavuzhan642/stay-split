import { Skeleton } from "@/components/ui/skeleton";

const Bar = ({ className }: { className: string }) => <Skeleton className={className} />;

/** Shown while the search runs; mirrors the real layout so nothing jumps when results arrive. */
export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Tüm kombinasyonlar hesaplanıyor…</span>
      <div className="flex flex-col gap-2">
        <Bar className="h-8 w-80 max-w-full" />
        <Bar className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex flex-col gap-6 rounded-xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div className="flex flex-col gap-3">
            <Bar className="h-6 w-56" />
            <Bar className="h-8 w-80 max-w-full" />
            <Bar className="h-4 w-96 max-w-full" />
          </div>
          <Bar className="h-14 w-56" />
        </div>
        <Bar className="h-14 w-full" />
        <Bar className="h-40 w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Bar className="h-36 rounded-xl" />
        <Bar className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
