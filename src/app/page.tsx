import { CalendarRangeIcon, CarTaxiFrontIcon, HandCoinsIcon, ReceiptTextIcon, ShieldCheckIcon } from "lucide-react";
import { cn } from "cn";
import { SearchForm } from "@/components/search/search-form";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <HowItWorks />
      <Features />
    </main>
  );
}

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-5";

/** The navy band continues the header; the search form is the first thing on the page. */
function Hero() {
  return (
    <section className="bg-brand pt-6 pb-12 text-on-brand sm:pt-10 sm:pb-16">
      <div className={WRAP}>
        <h1 className="max-w-3xl text-[32px] leading-tight tracking-tight sm:text-5xl sm:leading-[1.1]">
          Konaklamanı böl, daha az öde.
        </h1>
        <p className="mt-3 max-w-2xl text-on-brand-muted sm:text-lg">
          Bir otel tüm tarihlerinde müsait değilse ya da bazı geceler pahalıysa, StaySplit konaklamanı iki tesise
          bölmenin ne kadar kazandıracağını saniyeler içinde hesaplar.
        </p>
        <div id="arama" className="mt-8 scroll-mt-6">
          <SearchForm />
        </div>
        <p className="mt-4 text-sm text-on-brand-muted">Şimdilik İstanbul, Kahire ve Roma için demo verisiyle çalışıyor.</p>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Tarihlerini gir", body: "Şehir, tarih ve kişi sayısı yeterli. İstersen tür, bütçe ve transfer ekle." },
  { title: "Her ihtimali hesaplayalım", body: "Tüm tesisler için her tarih aralığının fiyatını alır, geçerli her kombinasyonu karşılaştırırız." },
  { title: "Kararını ver", body: "Tek otel mi, bölünmüş mü, kaç değişiklik, ne kadar tasarruf: hepsi tek ekranda." },
];

function HowItWorks() {
  return (
    <section id="nasil-calisir" className="scroll-mt-4 py-14 sm:py-20">
      <div className={cn(WRAP, "grid items-center gap-10 lg:grid-cols-2 lg:gap-16")}>
        <div>
          <h2 className="text-2xl sm:text-3xl">Nasıl çalışır</h2>
          <ol className="mt-6 flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg">{step.title}</h3>
                  <p className="mt-0.5 text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ExampleCard />
      </div>
    </section>
  );
}

/** The example from the product brief, drawn in the same visual language as real results. */
function ExampleCard() {
  const days = ["20 Oca", "21 Oca", "22 Oca"];
  return (
    <figure className="rounded-xl bg-card p-5 shadow-card sm:p-6" aria-label="Örnek: aynı üç gece tek otelde ₺4.500, ikiye bölünce ₺2.700">
      <p className="font-bold">Örnek: aynı üç gece</p>
      <div className="mt-4 grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-4 gap-y-3" aria-hidden="true">
        <span />
        <div className="grid grid-cols-3 gap-1 text-center text-xs text-ink-muted">
          {days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <PlanLabel label="Tek otel" amount="₺4.500" />
        <div className="grid h-12 grid-cols-3">
          <Bar className="col-span-3 bg-subtle text-ink" name="Otel A" detail="3 gece" />
        </div>

        <PlanLabel label="StaySplit" amount="₺2.700" />
        <div className="grid h-12 grid-cols-3 gap-1">
          <Bar className="bg-stay-1 text-on-stay-1" name="Otel B" detail="₺900" />
          <Bar className="col-span-2 bg-stay-2 text-on-stay-2" name="Otel C · 2 gece" detail="₺1.800" />
        </div>
      </div>
      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm text-ink-muted">
        Tek bir otel değişikliğiyle
        <Badge variant="savings">₺1.800 tasarruf · %40</Badge>
      </figcaption>
    </figure>
  );
}

function PlanLabel({ label, amount }: { label: string; amount: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-bold tabular-nums">{amount}</p>
    </div>
  );
}

function Bar({ className, name, detail }: { className: string; name: string; detail: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-center rounded-lg px-3", className)}>
      <span className="truncate text-sm font-semibold">{name}</span>
      <span className="truncate text-xs">{detail}</span>
    </div>
  );
}

const FEATURES = [
  {
    icon: CalendarRangeIcon,
    title: "Her bölünme tarihi",
    body: "Her olası değişiklik gününü ve her otel çiftini dinamik programlamayla tarıyoruz; en ucuz kombinasyon gözden kaçmaz.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Gerçek toplam fiyat",
    body: "Gecelik fiyatları toplamıyoruz. Uzun konaklama indirimi, temizlik ücreti ve vergiler dahil, tesisin o tarihler için verdiği teklif.",
  },
  { icon: CarTaxiFrontIcon, title: "Transfer dahil", body: "İki otel arasındaki mesafeye göre tahmini taksi ücreti toplama eklenir." },
  { icon: HandCoinsIcon, title: "Değmezse söyler", body: "Fark küçükse ya da transfer tasarrufu siliyorsa, tek otelde kalmanı öneririz." },
  { icon: ShieldCheckIcon, title: "Boşluk yok, çakışma yok", body: "Her gece tam bir kez kapsanır. Çıkış günü, bir sonraki otelin giriş günüdür." },
];

function Features() {
  return (
    <section id="ozellikler" className="scroll-mt-4 border-t border-line bg-card py-14 sm:py-20">
      <div className={WRAP}>
        <h2 className="text-2xl sm:text-3xl">Doğru hesap, dürüst öneri</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <Icon className="size-6 text-link" aria-hidden="true" />
              <h3 className="mt-3 text-lg">{title}</h3>
              <p className="mt-1 text-ink-muted">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
