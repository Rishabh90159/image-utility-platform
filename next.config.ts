import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Analytics is the only third-party traffic the site may send, and only when
 * explicitly configured. Image data never leaves the browser; the CSP below
 * enforces that by restricting where the page is allowed to send requests.
 */
function analyticsOrigin(): string | null {
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

/** Google Analytics 4 origins, per Google's CSP guidance. Only allowed when NEXT_PUBLIC_GA_ID is set. */
function googleAnalyticsSources(): { script: string; connect: string; img: string } | null {
  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  return {
    script: " https://*.googletagmanager.com",
    connect: " https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    img: " https://*.google-analytics.com https://*.googletagmanager.com",
  };
}

function contentSecurityPolicy(): string {
  const analytics = analyticsOrigin();
  const ga = googleAnalyticsSources();
  const extra = analytics ? ` ${analytics}` : "";
  return [
    "default-src 'self'",
    // Next.js injects small inline bootstrap scripts; 'unsafe-inline' is needed without nonces.
    // 'wasm-unsafe-eval' lets the HEIC decoder compile its WebAssembly; it does not allow JavaScript eval().
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${extra}${ga?.script ?? ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${ga?.img ?? ""}`,
    // data: lets Word to PDF use fonts embedded in the user's own .docx (read locally, never fetched).
    "font-src 'self' data:",
    // No remote endpoints except optional analytics: images cannot be uploaded anywhere.
    `connect-src 'self'${extra}${ga?.connect ?? ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The project's *.vercel.app address serves the same pages as www.imgifyr.com; send visitors and
  // crawlers to the canonical domain so it isn't indexed twice. Preview URLs are unaffected.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "image-utility-platform.vercel.app" }],
        destination: "https://www.imgifyr.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    ];
    if (isProd) security.push({ key: "Content-Security-Policy", value: contentSecurityPolicy() });
    // The background-removal model is large and rarely changes: let browsers reuse it.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/:path*", headers: security },
      { source: "/models/:file*", headers: longCache },
    ];
  },
};

export default nextConfig;
