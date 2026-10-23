# StaySplit Search API

Web sayfasının yaptığı aramanın JSON hâli. Mobil uygulama, iş ortakları ya da testler gibi başka istemciler
için tasarlandı.

> Bu belge demo sürümü anlatır: veriler simülasyondur (`data.dataSource.isDemo: true`) ve
> `bookingUrl` her zaman `null` döner.

## `GET /api/search`

Parametre adları, sonuç sayfasının URL'indekilerle aynıdır. Bir sonuç sayfasının adresindeki `/search`
kısmını `/api/search` ile değiştirmek, aynı aramanın JSON'ını verir.

| Parametre | Zorunlu | Örnek | Açıklama |
| --- | --- | --- | --- |
| `city` | evet | `istanbul` | `istanbul`, `cairo`, `rome` |
| `checkIn` | evet | `2027-01-20` | `YYYY-MM-DD`; geçmişte olamaz, en fazla 365 gün sonrası |
| `checkOut` | evet | `2027-01-23` | Girişten sonra; en fazla 30 gece |
| `adults` | evet | `2` | 1–8 |
| `types` | hayır | `types=hotel&types=apartment` | Tekrarlanabilir: `hotel`, `hostel`, `apartment`. Verilmezse tümü |
| `switches` | hayır | `1` | En fazla otel değişikliği: `0` veya `1` (varsayılan `1`) |
| `budget` | hayır | `3000` | Toplam bütçe, TL (kuruş değil) |
| `transfer` | hayır | `1` | `1`/`true`: tahmini transfer maliyetini toplama ekle |

Örnek:

```bash
curl "http://localhost:3000/api/search?city=istanbul&checkIn=2027-01-20&checkOut=2027-01-23&adults=2&transfer=1"
```

## Yanıt

Her yanıt ya `{ "data": … }` ya da `{ "error": … }` biçimindedir. İstemci tek bir alana bakarak dallanır.

### 200: arama tamamlandı

`data`, `src/domain/search.ts` dosyasındaki `SearchResult` tipidir. Özetle:

```jsonc
{
  "data": {
    "recommendation": {
      "planId": "…",
      "kind": "split",                       // "single" | "split"
      "reason": "split-saves-money",         // gerekçe kodu, bkz. docs/ARCHITECTURE.md
      "savings": { "amount": { "amount": 180000, "currency": "TRY" }, "percent": 40 },
      "savingsBeforeTransfer": null
    },
    "emptyReason": null,                     // "no-matching-properties" | "no-availability" | "over-budget"
    "recommended": { /* StayPlan */ },
    "bestSingle": { /* StayPlan, bütçeyi aşsa bile referans olarak döner */ },
    "bestSplit": { /* StayPlan */ },
    "alternatives": [ /* bütçe içindeki en iyi planlar, ucuzdan pahalıya */ ],
    "stats": { "propertiesConsidered": 10, "validCombinations": 92, "durationMs": 12, … },
    "dataSource": { "providerId": "mock", "providerName": "…", "isDemo": true },
    "warnings": []
  }
}
```

- **Para:** Tüm tutarlar `{ amount, currency }` biçimindedir ve `amount` **kuruş** cinsinden bir tam sayıdır
  (`180000` = 1.800 TL).
- **Tarihler:** Saat dilimi olmayan `YYYY-MM-DD` takvim günleridir. `checkOut` hariçtir (o gece konaklanmaz).
- **Sonuç bulunamaması** bir hata değildir. Bu durumda yanıt 200 döner, `emptyReason` doludur ve
  `recommendation` alanı `null` olur.
- `Cache-Control: private, max-age=60`: Tarayıcı aynı yanıtı bir dakika kullanabilir, CDN'ler ise saklamaz.

### Hatalar

| Durum | `error.code` | Anlamı | İstemci ne yapmalı |
| --- | --- | --- | --- |
| 400 | `INVALID_QUERY` | Parametreler geçersiz; `error.issues` alan bazlı mesajları içerir | Girdiyi düzelt |
| 503 | `PROVIDER_UNAVAILABLE` | Sağlayıcı geçici olarak yanıt vermiyor (zaman aşımı, rate limit) | `Retry-After` saniye sonra tekrar dene |
| 502 | `PROVIDER_ERROR` | Sağlayıcı isteği reddetti, tekrar denemek işe yaramaz | Tekrar deneme; logları incele |
| 500 | `INTERNAL` | Beklenmeyen hata. Ayrıntılar yanıtta değil, sunucu loglarındadır | Tekrar deneme; logları incele |

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Arama parametreleri geçersiz.",
    "issues": [{ "field": "checkOut", "message": "Çıkış tarihi giriş tarihinden sonra olmalı." }]
  }
}
```

`error.message` kullanıcıya gösterilebilir. İç ayrıntı (hata mesajı, stack, sağlayıcı yanıtı) hiçbir zaman
yanıta konmaz; tek satır JSON olarak sunucu loguna yazılır.
