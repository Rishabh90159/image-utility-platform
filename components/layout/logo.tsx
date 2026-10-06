import { siteConfig } from "@/lib/site";

/** Wordmark with a "fit" mark: an image frame inside crop corners. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
        <path d="M2 8V2h6M18 2h6v6M24 18v6h-6M8 24H2v-6" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="7" y="7" width="12" height="12" rx="1.5" fill="var(--color-accent)" />
      </svg>
      <span className="text-[1.0625rem] font-semibold tracking-tight">{siteConfig.name}</span>
    </span>
  );
}
