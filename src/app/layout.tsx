import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// latin-ext carries the Turkish letters (ç, ğ, ı, İ, ş); without it they fall back to another font.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "StaySplit — Konaklamanı böl, daha az öde",
  description:
    "StaySplit, konaklamanı iki tesise bölerek tek otele göre ne kadar tasarruf edebileceğini hesaplar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
