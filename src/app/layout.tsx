import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

// One family for the whole interface (docs/DESIGN.md). latin-ext carries the
// Turkish letters (ç, ğ, ı, İ, ş); Figtree also draws ₺ correctly, which many fonts do not.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

/** Absolute base for Open Graph URLs: the configured site, the Vercel production domain, or localhost. */
function siteUrl(): URL {
  const configured = process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return new URL("http://localhost:3000");
  return new URL(configured.startsWith("http") ? configured : `https://${configured}`);
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "StaySplit · Konaklamanı böl, daha az öde",
    template: "%s · StaySplit",
  },
  description:
    "StaySplit, konaklamanı iki tesise bölerek tek otele göre ne kadar tasarruf edebileceğini hesaplar. Her bölünme tarihi, toplam fiyat ve transfer maliyetiyle.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "StaySplit",
    title: "Konaklamanı böl, daha az öde.",
    description: "Tek otel mi, iki otel mi? Her bölünme tarihini hesaplayıp gerçek tasarrufu gösteren konaklama planlayıcı.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d2340" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1b30" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${figtree.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
