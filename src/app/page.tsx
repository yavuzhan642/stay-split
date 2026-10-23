import { CalendarRangeIcon, CheckCircle2Icon, GitCompareArrowsIcon, ReceiptTextIcon } from "lucide-react";
import { DemoNotice } from "@/components/demo-notice";
import { SearchForm } from "@/components/search/search-form";

const STEPS = [
  {
    icon: CalendarRangeIcon,
    title: "Tarihlerini gir",
    body: "Şehir, tarih ve kişi sayısını seç. İstersen konaklama türü, bütçe ve transfer maliyeti ekle.",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Her bölünmeyi hesaplıyoruz",
    body: "Her olası değişiklik tarihini ve her otel çiftini, sağlayıcının o tarihler için verdiği toplam fiyatla karşılaştırıyoruz.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Gerçek tasarrufu gör",
    body: "Tek otel mi bölmek mi daha mantıklı, kaç kez otel değiştireceğin ve ne kadar kazanacağın tek bakışta.",
  },
];

const GUARANTEES = [
  "Her gece kapsanır: tarihler arasında boşluk ya da çakışma olmaz.",
  "İndirimler, temizlik ücreti ve vergiler dahil toplam fiyatla hesaplanır.",
  "Tasarruf küçükse ya da transfer maliyeti siliyorsa, tek otelde kalmanı öneririz.",
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b bg-[radial-gradient(ellipse_at_top,var(--stay-1-soft),transparent_70%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Akıllı konaklama planlayıcı</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Konaklamanı böl, daha az öde.
            </h1>
            <p className="mt-4 text-lg text-pretty text-muted-foreground">
              Bir otel tüm tarihlerinde müsait değilse ya da bazı geceler çok pahalıysa, StaySplit konaklamanı iki tesise
              bölerek tek otele göre ne kadar tasarruf edeceğini hesaplar.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)] sm:p-6">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Aynı tatil, iki otel, daha düşük fiyat</h2>
          <p className="mt-3 text-muted-foreground">
            Otel fiyatları geceden geceye değişir. Hafta sonu pahalanan bir otelden, o gece daha uygun olan başka bir
            otele geçmek toplamı ciddi şekilde düşürebilir. Biz bu hesabı senin yerine yapıyoruz.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {GUARANTEES.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-savings" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <ExampleSplit />
      </section>

      <section id="nasil-calisir" className="scroll-mt-20 border-t bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Nasıl çalışır?</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 rounded-xl border bg-background p-5">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">{index + 1}. adım</span>
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
          <DemoNotice className="mt-8" />
        </div>
      </section>
    </main>
  );
}

/** The example from the product brief, drawn with the same visual language as the results. */
function ExampleSplit() {
  return (
    <figure className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <figcaption className="text-sm font-medium text-muted-foreground">Örnek: 20–23 Ocak, 3 gece</figcaption>
      <div className="mt-4 flex flex-col gap-5">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Tek otel</span>
            <span className="font-semibold tabular-nums">₺4.500</span>
          </div>
          <div className="mt-2 flex h-10 items-center rounded-md bg-muted-foreground/25 px-3 text-xs font-semibold">
            Otel A · 3 gece
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">StaySplit</span>
            <span className="font-semibold tabular-nums">₺2.700</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="flex h-10 items-center rounded-md bg-stay-1 px-3 text-xs font-semibold text-white">Otel B · ₺900</div>
            <div className="col-span-2 flex h-10 items-center rounded-md bg-stay-2 px-3 text-xs font-semibold text-white">
              Otel C · 2 gece · ₺1.800
            </div>
          </div>
        </div>
        <p className="rounded-lg bg-savings-soft px-3 py-2 text-sm font-medium text-savings">
          ₺1.800 tasarruf (%40), tek bir otel değişikliğiyle
        </p>
      </div>
    </figure>
  );
}
