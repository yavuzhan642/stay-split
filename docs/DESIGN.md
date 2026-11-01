# StaySplit · Tasarım sistemi

Hedef his: **sade ve işlevsel**, bir seyahat arama aracı gibi. Skyscanner gibi uçuş ve otel arama sitelerinin
düzeninden ilham alır: üstte lacivert bir bant ve içinde arama kutusu, altında açık gri zemin üstünde beyaz
kartlar, eylemler için tek bir mavi. Bu bir ilhamdır; hiçbir sitenin logosu, yazı tipi ya da görseli
kullanılmaz.

## İlkeler

1. **Önce arama.** Ana sayfada ilk görünen şey arama kutusudur. Sonuç sayfasında da aynı kutu en üstte durur.
2. **Önce fiyat.** Her kartta fiyat sağda, en kalın metindir.
3. **Tek mavi.** Mavi yalnızca eylem (Ara), bağlantı ve seçili durumdur. Önerilen kartın mavi çerçevesi de bu
   yüzden mavidir.
4. **Renk = konaklama.** Lacivert ve kehribar her yerde 1. ve 2. konaklamadır. Yeşil yalnızca tasarruftur.
5. **Dürüstlük görünür.** Logonun yanında `Demo` etiketi, her sonuç sayfasında mavi bir demo bildirimi
   bulunur.

Kaçınılanlar: gradyan, renkli bulanık lekeler, cam efekti, emoji, renkli kutular içinde ikon, sol kenarı renkli
kartlar.

## Tokenlar

Hepsi `src/app/globals.css` dosyasında CSS değişkeni olarak tanımlı ve Tailwind sınıfı olarak kullanılıyor
(`bg-card`, `text-ink-muted`, `bg-stay-1 text-on-stay-1` gibi). Gece teması işletim sisteminin ayarını
(`prefers-color-scheme`) izler; aynı token adları, farklı değerler.

### Renkler

| Token | Gündüz | Gece | Kullanım |
| --- | --- | --- | --- |
| `canvas` | `#f5f7fa` | `#0e141c` | Sayfa zemini |
| `card` | `#ffffff` | `#161e29` | Kartlar, arama kutusu, alt bilgi |
| `subtle` | `#eef1f5` | `#1d2733` | Fiyat dökümü, transfer satırı, iskelet, hover |
| `ink` / `ink-muted` | `#121a26` / `#5a6576` | `#e9eef5` / `#9eabbd` | Metin / ikincil metin |
| `line` / `line-strong` | `#dde2e9` / `#8792a2` | `#2a3544` / `#66748a` | Ayraç / kontrol kenarı (3:1) |
| `brand` · `on-brand` · `on-brand-muted` | `#0d2340` · beyaz · `#b7c4d6` | `#0b1b30` · beyaz · `#b7c4d6` | Üst bant ve içindeki metin |
| `primary` · `primary-hover` | `#1460d8` · `#0f4fb5` | `#2f6fe4` · `#4a83ec` | Ara düğmesi, sayaç |
| `primary-soft` · `primary-ink` | `#e6effc` · `#0f4fb5` | `#1a2c4a` · `#9cc0ff` | Seçili seçenek, "Önerimiz", demo bildirimi |
| `link` / `focus` | `#1460d8` | `#8cb6ff` / `#6ea2ff` | Bağlantılar / odak halkası |
| `stay-1` · `on-stay-1` · `stay-1-ink` | lacivert `#1e3a6e` | `#8fb0ec` | 1. konaklama |
| `stay-2` · `on-stay-2` · `stay-2-ink` | kehribar `#f2a313` | `#f5b335` | 2. konaklama |
| `stay-3` · `on-stay-3` · `stay-3-ink` | petrol `#0f766e` | `#4fc3b5` | 3. konaklama (K ≥ 2 için hazır) |
| `savings` · `savings-soft` | `#0f7a43` · `#e1f4e8` | `#5fd08f` · `#143323` | Yalnızca tasarruf |
| `danger` · `danger-soft` | `#c0261c` · `#fde8e6` | `#ff8a80` · `#3a1b1b` | Form hatası, "bütçeni aşıyor" |

Konaklama çubukları dolgu rengiyle çizilir ve üstüne `on-stay-n` yazılır; kehribarın üstüne beyaz yazılmaz.
Kehribar beyaz üstünde 3:1'i tutmadığı için ince çubuklarda 1px `stay-2-ink` iç kenar alır
(`stay-colors.ts`). Gece temasında mavi bağlantılar `link` ile açık tona döner, çünkü `primary` koyu kart
üstünde metin olarak okunmaz. Bütün metin çiftleri iki temada da 4,5:1'in üstündedir.

shadcn'in adları (`background`, `primary-foreground`, `muted-foreground`…) aynı paletle eşlenmiştir.

### Tipografi

Tek aile: **Figtree** (`next/font/google`, `latin-ext` ile). ₺ işaretini doğru çizer ve hizalı rakamları
(`tabular-nums`) destekler; fiyat listelerinde rakamlar alt alta hizalı kalır. Font değiştirmeden önce ₺ test
edilmelidir: Newsreader'da Ł'ye, Schibsted Grotesk'te £'ye benziyor.

| Rol | Boyut |
| --- | --- |
| Hero başlık | 32 → 48 px, 700 |
| Bölüm başlığı | 24 → 30 px, 700 |
| Sonuç başlığı | 24 → 28 px, 700 |
| Öneri fiyatı | 32 px, 700 |
| Kart fiyatı | 20 px, 700 |
| Gövde / arayüz / dipnot | 16 / 14 / 12 px |

### Şekil, gölge, hareket

- Köşeler: düğme, girdi ve çubuk `rounded-lg` (8px), kartlar ve arama kutusu `rounded-xl` (12px), etiketler
  `rounded-sm` (4px).
- Kartlar kenar çizgisi yerine `shadow-card` ile zeminden ayrılır. Arama kutusu lacivert bant üstünde
  `shadow-panel` alır.
- Hareket yalnızca 150 ms renk geçişleri ve açılan okların dönmesidir. İskelet nabzı `motion-safe` ile
  sınırlıdır.
- İkonlar `lucide-react`, çizgi kalınlığı 1,75, renkli kutu içine konmaz.

## Bileşen desenleri

| Desen | Nerede | Not |
| --- | --- | --- |
| Arama kutusu | Ana sayfa, sonuç sayfası (lacivert bant içinde) | Beyaz panel, hücreler arası ince çizgi, sağda mavi "Ara"; telefonda hücreler alt alta |
| Seçenek düğmeleri | Tür, otel değişikliği | Gerçek `checkbox`/`radio`; seçilince açık mavi zemin ve mavi kenar |
| Onay kutusu | Transfer | Gerçek `checkbox`, işaretlenince mavi |
| Sıralama sekmeleri | Tüm seçenekler | Gerçek `radio` girdileri, seçili sekme açık mavi |
| Zaman çizelgesi | Öneri, kartlar | Dolgu çubuklar; değişim gününde yuvarlak ⇄ işareti |
| Öneri kartı | Sonuç sayfası | Etiketler, başlık, sağda büyük fiyat ve kısa döküm, altta konaklama listesi |
| Sonuç kartı | Tüm seçenekler | Her plan ayrı kart; sağda fiyat, açılınca ayrıntılar; önerilen kart mavi çerçeveli |

## Erişilebilirlik

- Tüm etkileşimli öğeler gerçek HTML öğesidir (`select`, `input`, `details`, `button`) ve form JavaScript
  olmadan da çalışır.
- Odak halkası her yerde görünür; lacivert bant üstünde beyaza döner.
- Hata mesajları alanın altında gösterilir ve `aria-describedby` ile alana bağlanır.
- Zaman çizelgesi ekran okuyucular için metin olarak özetlenir.
- Konaklamalar yalnızca renkle ayrılmaz: lacivert koyu, kehribar açıktır ve çubuklarda tesis adı yazar.

## Sonraki tasarım fikirleri

1. **Harita görünümü.** İki otel iki pin olarak, aralarında rota çizgisi ve "1,8 km · ~10 dk".
2. **Fiyat takvimi.** Seçilen otellerin gece gece fiyat şeridi.
3. **Sürüklenebilir değişiklik günü.** Zaman çizelgesindeki ⇄ işareti sürüklenir, toplam anında değişir.
4. **Mobilde alt sayfa.** Filtreler aşağıdan açılan bir sayfada.
5. **Tasarruf kartını paylaş.** Her arama için dinamik Open Graph görseli.
6. **Elle tema seçimi.** Gece teması şimdilik yalnızca işletim sistemini izliyor.
7. **Tesis fotoğrafları.** Gerçek sağlayıcı lisanslı görsel verdiğinde, kartlarda küçük fotoğraf.
