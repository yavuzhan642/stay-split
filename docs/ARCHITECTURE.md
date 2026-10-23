# StaySplit — Mimari ve Algoritma

Bu belge, StaySplit'in nasıl çalıştığını ve kararların **neden** böyle verildiğini anlatır. Kod tarafında
tanımlayıcılar ve yorumlar İngilizce, kullanıcıya gösterilen metinler Türkçedir.

## 1. Katmanlar

```mermaid
flowchart LR
  UI["app/ (Next.js, Faz 3)"] --> S["services/<br/>searchStays, validateSearchQuery"]
  S --> E["engine/<br/>saf optimizasyon motoru"]
  S --> P["providers/<br/>AccommodationProvider"]
  P --> M["mock/ (simülasyon)"]
  P -.-> R["gerçek sağlayıcı (ileride)"]
  E --> D["domain/<br/>tipler ve değer nesneleri"]
  S --> D
  P --> D
```

| Klasör | Sorumluluk | Neye bağımlı |
| --- | --- | --- |
| `src/domain` | `Money`, `IsoDate`, `Property`, `StayQuote`, `SearchQuery`, `StayPlan`, şehir kataloğu | yalnızca date-fns |
| `src/engine` | Teklif tablosu, optimizasyon (DP), öneri kuralları, plan doğrulama | domain |
| `src/providers` | Sağlayıcı arayüzü, registry, dayanıklılık katmanı (`resilience/`), mock sağlayıcı ve demo verisi | domain, config |
| `src/services` | Arama akışı (orkestrasyon), girdi doğrulama ve HTTP API işleyicisi | hepsi |
| `src/config` | Ortam değişkenlerinin tek noktadan okunup doğrulanması (yalnızca sunucu) | — |
| `src/app` | Next.js sayfaları: `/` (ana sayfa) ve `/search` (sonuçlar) | services, components |
| `src/components` | Arayüz bileşenleri: arama formu, sonuç kartları, zaman çizelgesi; `ui/` altında shadcn/ui | lib, domain |
| `src/lib` | Arayüz yardımcıları: Türkçe biçimlendirme, metinler, URL ↔ arama dönüşümü | domain |
| `src/test` | Test yardımcıları (`makeQuote`, `InMemoryProvider`) | — |
| `scripts` | `npm run demo` terminal demosu | services |

**Kural:** Motor ağ, veritabanı ya da React bilmez. Girdi alır, çıktı verir. Bu yüzden milisaniyeler içinde
test edilir ve ileride bir worker'a ya da ayrı bir servise taşınabilir.

## 2. Veri modeli: üç kritik karar

**Para tam sayıdır (kuruş).** `0.1 + 0.2 !== 0.3`. Kayan noktalı sayılarla yüzlerce teklif toplanınca kuruş
farkları birikir. `Money.amount` her zaman kuruş cinsinden bir tam sayıdır. TL'ye yalnızca sınırlarda
(form, ekran) çevrilir.

**Tarih bir an değil, takvim günüdür.** "20 Ocak gecesi" İstanbul'daki misafir için de Virginia'daki sunucu
için de aynı gecedir. JS `Date` ise bir *andır*. Saat dilimi dönüşümleri gece kaymalarına yol açar. Bu yüzden
tarihler `"2027-01-20"` biçiminde `IsoDate` (branded string) olarak taşınır. Testler bilerek yaz saati
uygulaması olan bir dilimde (`America/New_York`) koşar.

**Fiyat, aralığın toplam teklifidir.** `StayQuote.total`, sağlayıcının *tam o giriş-çıkış çifti* için verdiği
fiyattır. Gecelik fiyatların toplamı değildir:

- 3+ gece %5 indirim → fiyat(20→23) < fiyat(20→21) + fiyat(21→23)
- Konaklama başına temizlik ücreti → iki kısa konaklama bu ücreti iki kez öder
- Yüzdesel vergiler, sabit ücretler, paket fiyatlar…

Motor yalnızca `total`'ı okur. `breakdown` sadece gösterim içindir. Gerçek API'ler de (ör. Booking.com
Demand API) belirli tarih çiftleri için toplam fiyat döndürür. Mimari buna göre kuruldu.

## 3. Arama akışı (`searchStays`)

1. **Aday tesisler:** `provider.searchProperties(şehir, kişi sayısı, türler)`
2. **Gerekli aralıklar:** `requiredRanges(N, K, m)`. Yalnızca geçerli bir planda yer alabilecek aralıklar istenir.
3. **Teklifler:** `provider.getQuotes(tesisler × aralıklar)`
4. **Teklif tablosu:** `QuoteTable` teklifleri doğrular (para birimi, kişi sayısı, tarih penceresi, fiyat),
   bozukları reddedip raporlar ve c(p, i, j) maliyetine O(1) erişim sağlar.
5. **Optimizasyon:** `optimizeStay` her otel değişikliği sayısı için en iyi k planı ve toplam geçerli plan
   sayısını bulur.
6. **Öneri:** `recommend` iş kurallarını uygular ve bir gerekçe kodu üretir.
7. **Sunum:** `toStayPlan` indeksleri tarihlere, tesislere ve transfer bacaklarına çevirir.
   `findPlanViolations` her çıktıyı yeniden doğrular (savunma derinliği).

## 4. Optimizasyon algoritması

### Model

Sınırlar 0 … N seyahatin tarihleridir (0 = giriş, N = çıkış). Gece t, [t, t+1) aralığıdır. Bir plan şöyle
bir segment dizisidir:

```
[b₀=0, b₁) tesis p₁,  [b₁, b₂) tesis p₂,  …,  [b_s, b_{s+1}=N) tesis p_{s+1}
```

Kısıtlar ve nasıl sağlandıkları:

| Gereksinim | Nasıl sağlanıyor |
| --- | --- |
| Tüm geceler eksiksiz | b₀ = 0, b_{s+1} = N |
| Boşluk/çakışma yok | Yarı açık aralıklar ve kesin artan b: bir segmentin çıkışı = sonrakinin girişi |
| Gerçek müsaitlik | Teklif yoksa aralık rezerve edilemez (c = ∞) |
| Minimum konaklama | Tesis kuralı → sağlayıcı teklif vermez. Kullanıcı tercihi → `minNightsPerSegment` |
| Maksimum değişiklik | s ≤ K |
| Aynı tesise "geçiş" yok | p_t ≠ p_{t+1} |

Maliyet: `Σ c(p_t, b_{t-1}, b_t) + Σ τ(p_t, p_{t+1})`. Burada c teklif toplamı, τ tahmini transfer
maliyetidir.

### DAG üzerinde en kısa yol

Durum (j, p, s) şu anlama gelir: "[0, j) geceleri kapsandı, son segment p'de, s değişiklik kullanıldı."
Her durum yalnızca daha küçük j'li durumlara bağlıdır. Yani durumlar tarihe göre sıralı, yönlü ve döngüsüz bir
graf (DAG) oluşturur, plan da bu grafta bir yoldur. En ucuz plan en kısa yoldur:

```
D(j, p, 0) = c(p, 0, j)
D(j, p, s) = min_{i<j, q≠p}  D(i, q, s−1) + τ(q, p) + c(p, i, j)
Cevap      = min_{p, s≤K}    D(N, p, s)
```

**Optimal alt yapı:** (i, q, s) durumundan sonrası, oraya nasıl gelindiğinden bağımsızdır. Bu yüzden her
durum için en iyi öneki saklamak yeterlidir.

### Tek çözüm yerine en iyi k çözüm

Arayüz alternatifleri de gösterdiği için her durum en iyi **k** öneki tutar. Bu yaklaşım hâlâ kesindir.
Global en iyi k içindeki bir planın öneki, kendi durumunda en iyi k içinde olmak zorundadır. Aksi halde orada
k tane daha ucuz önek olurdu. Her birine aynı sonek eklenince k tane daha iyi plan çıkardı, bu da çelişkidir.
Eşitlikler sabit bir **tam sıralama** ile bozulur: (toplam maliyet, değişiklik sayısı, segment tarihleri,
tesis). Böylece argüman geçerli kalır ve çıktı deterministik olur.

Aynı döngüde bir **sayma DP'si** de çalışır: `count(j,p,s) = Σ count(i,q,s−1)`. Bu, toplam geçerli plan
sayısını (`validCombinations`) verir. Hem istatistik olarak işe yarar hem de brute-force ile karşılaştırılabilir.

### Karmaşıklık

- Zaman: **O(K · N² · P² · k)**. 14 gece, 50 tesis, K = 1, k = 10 için yaklaşık 5 milyon basit adım (ms
  mertebesi).
- Kaba kuvvet K = 1 için benzerdir ama P^(K+1) ile büyür. DP formu K ≥ 2 olduğunda önem kazanır.
- **Sağlayıcı istek sayısı** gerçek API'lerde asıl darboğazdır. Bir aralık ancak kalan parçaları
  (önce/sonra) boş ya da ≥ m gece ise ve her boş olmayan parça bir değişiklik gerektiriyorsa istenir:

| K | İstenen aralık sayısı (m = 1) |
| --- | --- |
| 0 | 1 (yalnızca tam konaklama) |
| 1 | 2N − 1 (tam + önekler + sonekler) |
| ≥ 2 | N(N+1)/2 |

MVP'nin K ≤ 1 ile sınırlı olmasının bir nedeni de budur: istek sayısı doğrusal kalır.

## 5. Öneri kuralları (`recommend`)

Optimizer "her değişiklik sayısı için en ucuzu ne?" sorusunu cevaplar. Öneri katmanı ise "misafire ne
söyleyelim?" sorusunu. Az değişiklikten çoğa doğru ilerlenir. Daha fazla değişiklik içeren bir plan ancak
**kesinlikle daha ucuzsa** ve tasarruf politika eşiğini geçiyorsa seçilir. Varsayılan eşik %5'tir
(`DEFAULT_RECOMMENDATION_POLICY`), çünkü otel değiştirmenin bir zahmeti vardır: bavul, 11:00 çıkış ile 14:00
giriş arasındaki boşluk. Eşit fiyatta daha az değişiklik kazanır.

| Gerekçe | Anlamı |
| --- | --- |
| `split-saves-money` | Bölmek eşiği aşan tasarruf sağlıyor |
| `no-single-available` | Hiçbir tesis tüm gecelerde müsait değil |
| `single-only-requested` | Kullanıcı K = 0 seçti |
| `no-split-available` | Geçerli bölünmüş plan yok |
| `tie-prefers-fewer-switches` | Fiyat eşit, tek otel önerildi |
| `savings-below-threshold` | Bölmek ucuz ama değmez |
| `transfer-cost-cancels-savings` | Konaklamada ucuz ama transfer tasarrufu siliyor (ayrıca hesaplanan transfersiz geçişle tespit edilir) |
| `single-is-cheapest` | Tüm bölünmüş planlar transfer olmadan da pahalı |

**Bütçe** öneriyi ve alternatifleri filtreler. En iyi tek otel ise bütçeyi aşsa bile referans fiyat
olarak döner (`withinBudget: false`). Böylece "bütçeni aşan 4.500 TL'lik otel yerine 2.700 TL" diyebiliriz.

## 6. Mock sağlayıcı

- 3 şehirde (İstanbul, Kahire, Roma) 29 **hayali** tesis var. Koordinatlar gerçek semtlere ait, böylece
  mesafe ve transfer tahminleri gerçekçi oluyor. İsimler ve fiyatlar uydurma.
- Fiyat = baz × sezon × hafta sonu × talep gürültüsü. Bunun üzerine kişi başı/oda başı fiyatlandırma, uzun
  konaklama indirimi, temizlik ücreti, şehre özgü vergiler (İstanbul %2 konaklama vergisi, Kahire servis +
  KDV, Roma kişi başı şehir vergisi) eklenir. Vergi oranları gösterim amaçlıdır, güncel yasal oranlar değildir.
- Müsaitlik ve talep, `(tesis, tarih, amaç)` anahtarının hash'inden üretilir. Aynı arama her zaman aynı
  sonucu verir: testler kararlı kalır, hatalar yeniden üretilebilir.
- `bookingUrl` her zaman `null`, `info.isDemo` her zaman `true`. Arayüz bunu her fiyatın yanında belirtmek
  zorundadır.

## 7. Sağlayıcı entegrasyonu

### Dayanıklılık katmanı

Gerçek konaklama API'leri yavaştır, bazen hata verir, istek başına sınır koyar ve kota uygular. Bu sorunlar
her sağlayıcıda aynıdır. Bu yüzden her adaptörde ayrı ayrı çözülmez; adaptörün etrafına sarılan katmanlarla
bir kez çözülür (decorator deseni). Her katman `AccommodationProvider` arayüzünü kendisi uygular. Bu sayede
katmanlar üst üste dizilebilir ve arama servisi onların varlığından habersiz kalır.

```
istek → önbellek → bölme (batching) → yeniden deneme → zaman aşımı → adaptör → API
```

| Katman | Ne yapar | Neden bu sırada |
| --- | --- | --- |
| `withQuoteCache` | (tesis, aralık, kişi, para birimi) başına cevabı TTL süresince saklar; "müsait değil" cevabını da saklar | En dışta: önbellekteyse hiçbir ağ işi yapılmaz |
| `withBatching` | Sağlayıcının `limits` sınırını aşan isteği parçalara böler, eşzamanlılığı sınırlar; bir parça düşerse diğerlerini iptal eder | Parçalar ayrı ayrı yeniden denenebilsin |
| `withRetry` | Yalnızca `retryable` hatalarda, üstel bekleme + rastgele sapma (full jitter) ile tekrar dener | Her denemeye zaman aşımı katmanı yeni bir süre verir |
| `withTimeout` | Her çağrıya süre sınırı koyar; süre dolunca isteği iptal eder | En içte: adaptörün tek bir denemesini sınırlar |

Ayrıntılar:

- **Neden jitter?** Bir kesinti anında binlerce istemci aynı anda düşer. Hepsi aynı aralıklarla tekrar
  denerse, toparlanmaya çalışan API'yi yeniden çökertirler. Rastgele bekleme, denemeleri zamana yayar.
- **Önbellek anahtarı istek değil, (tesis, aralık) çiftidir.** Kullanıcı aynı aramayı bütçe ya da transfer
  ayarını değiştirerek tekrarladığında hiçbir yeni istek gitmez. Canlı ölçümde aynı arama ilk seferde 820 ms,
  ikincisinde 3 ms sürdü. Önbellekten dönen tekliflerin `retrievedAt` değeri korunur, yani fiyatın yaşı
  dürüst kalır.
- **Kısmi sonuç yok.** Bir parça tüm denemelere rağmen düşerse arama da düşer. Eksik bir fiyat listesiyle
  "en ucuz" demek yanıltıcı olurdu.
- **Yapılandırma:** `src/config/server-config.ts` ortam değişkenlerini bir kez okur ve doğrular. Hatalı bir
  değer, uygulamanın açılışında hangi değişkenin neden yanlış olduğunu söyleyerek durur.
- **Sunucu sınırı:** `registry.ts` ve `server-config.ts` dosyaları `import "server-only"` içerir. Bu
  dosyaları tarayıcı koduna dahil etmeye çalışmak derlemeyi bozar. API anahtarlarının sızamamasını derleyici
  garanti eder, geliştiricinin dikkatine kalmaz.

### Gerçek sağlayıcı eklemek

1. `src/providers/<ad>/` altında `AccommodationProvider`'ı uygulayan bir adaptör yazın. API'nin istek
   sınırlarını `limits` alanında bildirin; bölme işini pipeline yapar.
2. Sağlayıcının yanıtını domain tiplerine çevirin. Rezerve edilemeyen aralıklar için teklif döndürmeyin.
   `total` o aralığın gerçek toplam fiyatı olmalı.
3. Hataları `ProviderError` ile sarın. Zaman aşımı, 429 ve 5xx hataları `retryable: true`, geçersiz anahtar ya
   da hatalı istek `retryable: false` olmalı. `AbortSignal`'ı HTTP isteğine iletin.
4. `PROVIDER_IDS` listesine adını, `registry.ts` içindeki `createAdapter` fonksiyonuna bir `case` ekleyin.
   Kimlik bilgilerini `loadServerConfig` üzerinden ortam değişkenlerinden okuyun.
5. Zaman aşımı, yeniden deneme, bölme ve önbellek otomatik olarak uygulanır. `searchStays`, motor ve
   arayüz değişmez.

Kurallar: uydurma API anahtarı yok, izinsiz scraping yok, sağlayıcı verisini gerçekmiş gibi gösterme yok,
çalışmayan rezervasyon bağlantısı yok.

### HTTP API

`GET /api/search`, sayfanın yaptığı aramayı JSON olarak sunar. Sözleşme [API.md](API.md) dosyasında.
İşleyici (`src/services/search-http.ts`), route dosyasından ayrı ve `(Request, bağımlılıklar) → Response`
biçiminde düz bir fonksiyon. Bu sayede sunucu başlatmadan test edilir. Durum kodları istemciye ne yapacağını
söyler: 400 girdiyi düzelt, 503 sonra tekrar dene (`Retry-After` ile), 502 ve 500 senin hatan değil. İç hata
ayrıntıları yanıta hiç girmez; tek satır JSON olarak loglanır.

## 8. Test stratejisi

```
npm test          # 108 test, ~2 sn
```

| Gereksinim | Test |
| --- | --- |
| Tek otel daha ucuz | `search-stays.test.ts` → *recommends the single property when it is cheaper* |
| İki otel daha ucuz | *recommends splitting when two properties are cheaper* (2.700 TL, %40) |
| Tüm bölünme tarihleri | *considers every split date* |
| Bazı geceler müsait değil | *works around nights on which a property is sold out* |
| Hiç kombinasyon yok | *explains when no combination covers every night* |
| Minimum gece | *respects a minimum number of nights per stay* ve *…property's own minimum-stay rule* |
| Transfer tasarrufu siliyor | *drops the split when the transfer cost cancels the saving* |
| Boşluk/çakışma yok | *never produces gaps or overlaps between stays* (3 şehir × 4 tarih × transfer açık/kapalı) |
| Toplam teklif fiyatı | `mock-provider.test.ts` → *prices a stay as a whole, not as a sum of nights* |
| Zaman aşımı, yeniden deneme, bölme, önbellek | `resilience.test.ts` (sahte zamanlayıcılar ve dengesiz sahte sağlayıcılarla); katmanların arama sonucunu değiştirmediği de test ediliyor |
| HTTP API | `search-http.test.ts` → 200, 400, 503 + `Retry-After`, 502, 500 (iç ayrıntı sızmadan) |

**Diferansiyel test:** `optimizer.test.ts` 400 rastgele küçük örnekte DP'nin çıktısını, tüm planları tek tek
deneyen kaba kuvvet algoritmasıyla birebir karşılaştırır: sıralama, değişiklik sayısına göre listeler ve plan
sayısı. Fiyatlar bilerek dar bir aralıktan seçilir ki eşitlikler sık olsun ve eşitlik bozma kuralları da
sınansın. Optimize edilmiş bir algoritmayı, yavaş ama açıkça doğru bir referansla sınamak üretimde en güvenilir
alışkanlıklardan biridir.

## 9. Arayüz (Next.js)

**Arama URL'de yaşar.** Form, `next/form` ile `/search?city=…&checkIn=…` adresine giden bir GET formudur.
Böylece sonuç sayfası paylaşılabilir, yer imine eklenebilir, yenilenebilir ve geri tuşu çalışır. JavaScript
yüklenmemişse bile form çalışır (progressive enhancement). JS varsa sayfa yenilenmeden istemci tarafında
gezinir. URL parametre adları `src/lib/search-params.ts` içinde tek yerde tanımlıdır ve testler, URL → sorgu
→ URL gidiş-dönüşünün kayıpsız olduğunu doğrular.

**Hesaplama sunucuda yapılır.** `/search` bir Server Component'tir. Sağlayıcıyı çağırır, motoru çalıştırır ve
tarayıcıya yalnızca hazır planları gönderir. Gerçek sağlayıcı geldiğinde API anahtarları bu yüzden hiçbir
zaman tarayıcıya ulaşmaz.

**Cache Components ve akış.** Next 16'da `cacheComponents` açık. Bu ayarla:

- `/` tamamen statik olarak derlenir (`○`).
- `/search` **Partial Prerender** edilir (`◐`). Başlık ve iskelet (skeleton) derleme anında hazırlanır, URL'e
  bağlı kısım ise istek anında `Suspense` ile akar. Her yeni arama için `Suspense` `key` ile yeniden
  oluşturulur, böylece arama sürerken iskelet görünür.
- Render sırasında `new Date()` kullanılamaz, çünkü derleme anına "donar". "Bugün" ihtiyacı iki yerde
  çözüldü. Sunucuda doğrulama `await connection()` sonrasında, yani istek anında çalışır. Formda varsayılan
  tarihler `useSyncExternalStore` ile yalnızca tarayıcıda hesaplanır (sunucuda `null` döner, hydration
  uyuşmazlığı olmaz).

**Etkileşim tarayıcıda kalır.** Alternatiflerin sıralanması bir Client Component'te yapılır. Planlar zaten
sayfada olduğu için sıralamak yeni bir sağlayıcı isteği gerektirmez. Fiyat dökümü ve plan ayrıntıları yerel
`<details>` ile açılır ve JavaScript gerektirmez.

**Görsel dil.** Segment i her yerde i. rengi taşır (`stay-colors.ts`). Zaman çizelgesindeki çubuk ile altındaki
konaklama kartı bu sayede eşleşir. Çubuklar CSS grid sütunlarına tarihlerden hesaplanarak yerleştirilir;
boşluk ya da çakışma olsaydı göze batardı. Demo verisi her sonuç sayfasında ve kartlarda açıkça belirtilir,
rezervasyon bağlantısı yerine "Rezervasyon bağlantısı yok (demo)" yazar.

**Durumlar.** Yükleme (iskelet ve butonda `useFormStatus`), alan bazlı doğrulama hataları, üç boş durum
(tesis yok, müsaitlik yok, bütçe aşımı; her biri tek tıkla deneme bağlantılarıyla) ve sağlayıcı hataları
için `error.tsx`.

## 10. Bilinen sınırlamalar ve sonraki adımlar

- **Yalnızca TRY.** Çoklu para birimi için kur servisi ve para birimi seçici gerekir.
- **K ≤ 1.** Motor her K'yi destekler. Sınır, istek sayısı ve arayüz sadeliği için konuldu.
- **Farklı türleri kıyaslama.** "En iyi tek otel" tür filtresi yoksa hostel ile oteli karşılaştırabilir. İleride
  tasarrufu benzer kalite/tür içinde ölçmek düşünülmeli.
- **Ölçek.** P büyüdüğünde (yüzlerce tesis), P² terimi için aday ön eleme gerekir: fiyat ya da puanla ilk M
  tesis seçilmeli.
- **Önbellek süreç içi.** Sunucusuz barındırmada her örneğin kendi önbelleği olur. Kullanıcı sayısı büyüyünce
  paylaşılan bir depoya (Redis veya `'use cache: remote'`) geçilmeli. Aynı anda gelen iki özdeş istek şu an
  ikisi de sağlayıcıya gider; bunları tek istekte birleştirmek (in-flight dedupe) sonraki adım.
- **Hız sınırı yok.** `/api/search` herkese açık. Gerçek bir sağlayıcının kotası devreye girmeden önce IP ya
  da anahtar bazlı hız sınırlaması (rate limiting) eklenmeli.
- **Fiyat tazeliği.** `retrievedAt` saklanıyor. Rezervasyona yönlendirmeden önce fiyat yeniden doğrulanmalı.

## 11. Yol haritası

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1 — Foundation | Mimari, klasörler, kurulum, tipler | ✅ |
| 2 — Optimization Engine | Mock veri, müsaitlik, fiyat, DP, testler, demo | ✅ |
| 3 — Frontend | Arama formu, sonuçlar, zaman çizelgesi, responsive, loading/boş durumlar | ✅ |
| 4 — Integration Readiness | Dayanıklılık katmanı, yapılandırma, `server-only`, JSON API, hata yönetimi, dokümantasyon | ✅ |
| Sonrası | Yayına alma, gerçek sağlayıcı/affiliate, hız sınırı, paylaşılan önbellek, analitik | — |
