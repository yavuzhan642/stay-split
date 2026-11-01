import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold text-ink-muted">404</p>
        <h1 className="text-3xl">Bu sayfa bulunamadı</h1>
        <p className="text-ink-muted">Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <Link href="/" className={buttonVariants({ size: "lg", className: "mt-3" })}>
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
