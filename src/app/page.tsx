// Placeholder until Phase 3 builds the search UI on top of `searchStays`.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-widest text-teal-700 dark:text-teal-400">StaySplit</p>
      <h1 className="text-4xl font-semibold tracking-tight">Konaklamanı böl, daha az öde.</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Bir otel tüm tarihlerinde müsait değilse ya da bazı geceler çok pahalıysa, StaySplit konaklamanı iki
        tesise bölerek tek otele göre ne kadar tasarruf edeceğini hesaplar: toplam fiyat, otel değişikliği ve
        tahmini transfer maliyetiyle birlikte.
      </p>
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Geliştirme aşamasında: optimizasyon motoru hazır, arama arayüzü yakında. Gösterilecek tüm tesisler ve
        fiyatlar demo verisidir; gerçek rezervasyon bağlantısı yoktur.
      </p>
    </main>
  );
}
