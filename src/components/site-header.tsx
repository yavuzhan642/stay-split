import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/** Two bars meeting on one date: the product in one glance. */
function Logo() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden="true">
      <rect x="2" y="9" width="13" height="10" rx="3" className="fill-stay-1" />
      <rect x="16" y="9" width="10" height="10" rx="3" className="fill-stay-2" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight">
          <Logo />
          <span className="text-lg">StaySplit</span>
          <Badge variant="demo" className="ml-1">
            Demo
          </Badge>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link href="/#nasil-calisir" className="hidden hover:text-foreground sm:inline">
            Nasıl çalışır?
          </Link>
          <Link href="/search" className="hover:text-foreground">
            Arama
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>StaySplit, geliştirme aşamasında bir demodur. Tesisler hayali, fiyatlar simülasyondur.</p>
        <p>Rezervasyon ve ödeme alınmaz.</p>
      </div>
    </footer>
  );
}
