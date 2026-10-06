/**
 * Site-wide configuration. The production domain is resolved from the
 * environment so nothing in the codebase hard-codes a temporary URL.
 *
 * Server-only values (like VERCEL_PROJECT_PRODUCTION_URL) are read here, so
 * import `siteConfig.url` from server components, metadata and route handlers.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Pixfit",
  tagline: "Fast, private image tools that make your image fit the exact requirement.",
  description:
    "Free online image tools to resize, compress and convert JPG, PNG and WebP images. Everything runs in your browser, so your images are never uploaded.",
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
