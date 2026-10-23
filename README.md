# StaySplit

**Konaklamanı böl, daha az öde.** StaySplit, bir seyahatin gecelerini iki tesise bölerek tek otelde kalmaya
göre ne kadar tasarruf edilebileceğini hesaplar. Sonuçta toplam fiyat, tasarruf miktarı ve yüzdesi, otel
değişikliği sayısı ve isteğe bağlı tahmini transfer maliyeti gösterilir.

```
Tek otel:   Otel A  20–23 Ocak                         4.500 TL
Bölünmüş:   Otel B  20–21 Ocak  900 TL
            Otel C  21–23 Ocak  1.800 TL     toplam    2.700 TL   → 1.800 TL (%40) tasarruf
```

> **Demo verisi.** Şu anki tüm tesisler hayali, fiyatlar simülasyondur. Booking.com veya başka bir
> sağlayıcıya bağlantı yoktur ve rezervasyon bağlantıları bilerek boş bırakılmıştır.

## Durum

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1 | Mimari, kurulum, TypeScript veri modelleri | ✅ |
| 2 | Optimizasyon motoru, mock veri, testler, terminal demosu | ✅ |
| 3 | Arama arayüzü: form, sonuçlar, zaman çizelgesi, mobil uyum | ✅ |
| 4 | API/entegrasyon hazırlığı | ⏳ |

## Kurulum

Gereksinim: Node.js 22.12+ veya 24 LTS (`.nvmrc`).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Uygulamayı başlatıp http://localhost:3000 adresini açın:

```bash
npm run dev
```

`.env.local` içinde `MOCK_PROVIDER_LATENCY_MS=400` gibi bir değer, gerçek bir API'nin gecikmesini taklit eder;
yükleme durumlarını görmek için kullanışlıdır.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm test` | Tüm birim testleri (Vitest) |
| `npm run test:watch` | Testleri izleme modunda çalıştırır |
| `npm run demo` | Demo verisiyle bir arama yapıp sonucu terminale yazar |
| `npm run check` | typecheck + lint + test; commit öncesi çalıştırın |
| `npm run dev` | Next.js geliştirme sunucusu (http://localhost:3000) |
| `npm run build` | Üretim derlemesi |

Demo örnekleri:

```bash
npm run demo -- --city istanbul --in 2027-01-20 --out 2027-01-23
```

```bash
npm run demo -- --city rome --in 2027-05-12 --out 2027-05-17 --adults 2 --transfer
```

```bash
npm run demo -- --city cairo --types hotel,hostel --switches 0 --budget 15000
```

Seçenekler: `--city` (istanbul | cairo | rome), `--in`/`--out` (YYYY-MM-DD), `--adults`, `--types`
(hotel, hostel, apartment), `--switches` (0 | 1), `--budget` (TL), `--transfer`.

## Proje yapısı

```
src/
  domain/      Tipler ve değer nesneleri: Money, IsoDate, Property, StayQuote, SearchQuery, StayPlan
  engine/      Saf optimizasyon motoru: teklif tablosu, DP optimizer, öneri kuralları, plan doğrulama
  providers/   AccommodationProvider arayüzü, registry ve mock (simüle) sağlayıcı
  services/    searchStays (arama akışı) ve validateSearchQuery (girdi doğrulama)
  app/         Next.js App Router: / (ana sayfa) ve /search (sonuçlar)
  components/  Arama formu, sonuç kartları, zaman çizelgesi; ui/ altında shadcn/ui
  lib/         Türkçe biçimlendirme, arayüz metinleri, URL ↔ arama dönüşümü
  test/        Test yardımcıları
scripts/       Terminal demosu
docs/          Mimari ve algoritma belgesi
```

Mimarinin, algoritmanın matematiğinin ve test stratejisinin ayrıntıları için
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) dosyasına bakın.

## Teknoloji

Next.js 16 (App Router, Cache Components), TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind CSS 4,
shadcn/ui (Base UI), lucide-react, date-fns, Vitest, tsx (yalnızca demo betiği için).
