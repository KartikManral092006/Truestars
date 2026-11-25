import { ImageResponse } from "next/og";

export const alt = "TrueStars: know what goes wrong before you buy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAR = [
  { c: "#e5484d", w: 17 },
  { c: "#e2711d", w: 6 },
  { c: "#a3abb8", w: 5 },
  { c: "#f5c84c", w: 17 },
  { c: "#e0a100", w: 55 },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px 80px",
          color: "#0e1116",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
          <svg width="48" height="48" viewBox="0 0 24 24">
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#e0a100" />
            <path d="M8.2 12.2l2.6 2.5 5-5.2" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          TrueStars
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", maxWidth: 900 }}>
            Know what goes wrong before you buy.
          </div>
          <div style={{ fontSize: 30, color: "#5b6270", maxWidth: 880, lineHeight: 1.35 }}>
            Every review read, the real dealbreakers counted, and every claim linked to the reviews behind it.
          </div>
        </div>
        <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden" }}>
          {BAR.map((b) => (
            <div key={b.c} style={{ width: `${b.w}%`, background: b.c }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
