"use client";

import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Shown when the search itself fails (e.g. the provider is down), not for "no results". */
export default function SearchError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Arama şu an tamamlanamadı</h1>
      <p className="text-muted-foreground">
        Konaklama verilerine ulaşırken bir sorun oluştu. Birkaç saniye sonra yeniden dene; sorun sürerse farklı tarihlerle
        aramayı dene.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>
          <RefreshCwIcon aria-hidden="true" />
          Yeniden dene
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
