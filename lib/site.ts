/**
 * Site-wide configuration. The production domain is resolved from the
 * environment so nothing in the codebase hard-codes a temporary URL.
 *
 * Server-only values (like VERCEL_PROJECT_PRODUCTION_URL) are read here, so
 * import `siteConfig.url` from server components, metadata and route handlers.
 */
/** The one canonical origin: www, HTTPS. imgifyr.com and http:// redirect here. */
export const PRODUCTION_URL = "https://www.imgifyr.com";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  // Production builds (and Vercel previews, which are noindex) always point canonicals at the real
  // domain. Using Vercel's project URL here would make *.vercel.app the canonical host.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return PRODUCTION_URL;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Imgifyr",
  tagline: "Fast, private image tools that make your image fit the exact requirement.",
  description:
    "Free online image tools to resize, crop, compress and convert JPG, PNG, WebP, HEIC and SVG images. Everything runs in your browser, so your images are never uploaded.",
  url: resolveSiteUrl(),
  locale: "en_US",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null,
  /** Preview deployments must never be indexed. */
  isIndexable: process.env.VERCEL_ENV !== "preview",
} as const;

/** Absolute URL on the production domain. The homepage has no trailing slash, matching how Next.js emits canonicals. */
export function absoluteUrl(path: string = "/"): string {
  if (path === "/" || path === "") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
