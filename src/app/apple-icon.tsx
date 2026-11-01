import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS: the logo mark on the navy brand color, generated at build time. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0d2340" }}>
        <div style={{ width: 92, height: 68, borderRadius: 10, background: "#ffffff" }} />
        <div style={{ width: 34, height: 68, borderRadius: 10, background: "#f2a313" }} />
      </div>
    ),
    size,
  );
}
