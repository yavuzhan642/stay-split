import { ImageResponse } from "next/og";

export const alt = "StaySplit: Konaklamanı böl, daha az öde.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#0d2340";
const BRAND_MUTED = "#b7c4d6";
const INK = "#121a26";
const INK_MUTED = "#5a6576";
const STAY_1 = "#1e3a6e";
const STAY_2 = "#f2a313";
const SAVINGS = "#0f7a43";
const SAVINGS_SOFT = "#e1f4e8";

/**
 * The preview card shown when a StaySplit link is shared (WhatsApp, X,
 * LinkedIn…): the navy brand band with a white example card. Rendered once at
 * build time from JSX. The bundled font has no ₺ glyph, so prices are written
 * with "TL" here.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", background: BRAND, color: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 54, height: 40, borderRadius: 6, background: "#ffffff" }} />
            <div style={{ width: 20, height: 40, borderRadius: 6, background: STAY_2 }} />
          </div>
          StaySplit
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>Konaklamanı böl, daha az öde.</span>
          <span style={{ fontSize: 30, color: BRAND_MUTED }}>Tek otel mi, iki otel mi? Her bölünme tarihini hesaplıyoruz.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 28, borderRadius: 20, background: "#ffffff", color: INK }}>
          <div style={{ display: "flex", gap: 8, height: 60 }}>
            <div style={{ display: "flex", alignItems: "center", width: 340, paddingLeft: 22, borderRadius: 12, background: STAY_1, color: "#ffffff", fontSize: 26 }}>
              Otel B · 900 TL
            </div>
            <div style={{ display: "flex", alignItems: "center", flexGrow: 1, paddingLeft: 22, borderRadius: 12, background: STAY_2, color: INK, fontSize: 26 }}>
              Otel C · 2 gece · 1.800 TL
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26 }}>
            <span style={{ color: INK_MUTED }}>Tek otel 4.500 TL yerine 2.700 TL</span>
            <span style={{ display: "flex", padding: "6px 14px", borderRadius: 8, background: SAVINGS_SOFT, color: SAVINGS, fontWeight: 700 }}>
              1.800 TL tasarruf · %40
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
