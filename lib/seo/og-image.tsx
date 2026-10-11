import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

// Image generation can't read CSS variables, so the brand tokens from app/globals.css are repeated here.
export const BRAND_BLUE = "#2563eb";
const INK = "#0f172a";
const MUTED = "#64748b";
const SOFT = "#eff6ff";

/** The Imgifyr mark (see components/layout/logo.tsx) as an SVG element for image generation. */
export function logoMarkSvg(size: number, { tile = true }: { tile?: boolean } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {tile ? <rect width="32" height="32" rx="8" fill={BRAND_BLUE} /> : null}
      <path
        d="M8 13V8h5M19 8h5v5M24 19v5h-5M13 24H8v-5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.5 20.5l3.6-4.6 2.6 3.1 1.5-1.8 2.3 3.3z" fill="#ffffff" />
      <circle cx="19.2" cy="12.9" r="1.7" fill="#ffffff" />
    </svg>
  );
}

/** Shared Open Graph image design: product name, page title and the privacy promise. */
export function renderOgImage({ title, subtitle }: { title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#ffffff",
          borderTop: `14px solid ${BRAND_BLUE}`,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {logoMarkSvg(60)}
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{siteConfig.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ fontSize: 32, color: MUTED, lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: BRAND_BLUE,
              fontWeight: 600,
              background: SOFT,
              borderRadius: 999,
              padding: "12px 26px",
            }}
          >
            Free · Runs in your browser · Images are not uploaded
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
