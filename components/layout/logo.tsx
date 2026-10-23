import { siteConfig } from "@/lib/site";

/**
 * The Imgifyr mark: a picture framed by crop corners ("make it fit") on a blue tile.
 * The same drawing is used for the favicon (app/icon.svg), the Apple touch icon and
 * Open Graph images, so keep them in sync when changing it.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
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

/** Mark plus wordmark, used in the header and footer. `light` is for the dark navy header and footer. */
export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${tone === "light" ? "text-white" : "text-ink"}`}>
      <LogoMark />
      <span className="font-display text-[1.1875rem] font-extrabold tracking-[-0.02em]">{siteConfig.name}</span>
    </span>
  );
}
