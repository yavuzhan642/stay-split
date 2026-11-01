"use client";

import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Shown when the search itself fails (e.g. the provider is down), not for "no results". */
export default function SearchError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <CloudOffIcon className="size-10 text-link [stroke-width:1.5]" aria-hidden="true" />
        <h1 className="text-2xl">Arama şu an tamamlanamadı</h1>
        <p className="text-ink-muted">Konaklama verilerine ulaşırken bir sorun oluştu. Birkaç saniye sonra yeniden dene.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button size="lg" onClick={() => retry()}>
            <RefreshCwIcon aria-hidden="true" />
            Yeniden dene
          </Button>
          <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
