import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/** Two stays meeting on one date: a long block and a short one. */
export function LogoMark({ className, onBrand = false }: { className?: string; onBrand?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect x="2" y="9" width="19" height="14" rx="2" className={onBrand ? "fill-on-brand" : "fill-stay-1"} />
      <rect x="23" y="9" width="7" height="14" rx="2" className="fill-stay-2" />
    </svg>
  );
}

/** Navy bar across the top; on the home and search pages it runs straight into the navy search band. */
export function SiteHeader() {
  return (
    <header className="bg-brand text-on-brand">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand">
          <LogoMark onBrand />
          <span className="text-xl font-bold tracking-tight">StaySplit</span>
          <Badge variant="demo">Demo</Badge>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <Link href="/#nasil-calisir" className="hidden text-on-brand-muted hover:text-on-brand sm:inline">
            Nasıl çalışır
          </Link>
          <Link href="/#ozellikler" className="hidden text-on-brand-muted hover:text-on-brand sm:inline">
            Özellikler
          </Link>
          <Link href="/search" className="text-on-brand-muted hover:text-on-brand">
            Ara
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:px-5">
        <p className="max-w-[44rem]">
          StaySplit geliştirme aşamasında bir demodur. Gösterilen tesisler hayalidir; fiyatlar ve müsaitlik
          simülasyondur. StaySplit rezervasyon ya da ödeme almaz ve hiçbir konaklama sağlayıcısıyla bağlantılı
          değildir.
        </p>
        <div className="flex flex-col gap-1 text-xs sm:flex-row sm:justify-between">
          <p>© 2026 StaySplit</p>
          <p>İstanbul, Kahire ve Roma için demo verisi</p>
        </div>
      </div>
    </footer>
  );
}
