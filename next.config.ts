import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Analytics is the only third-party origin the site may talk to, and only when
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

function contentSecurityPolicy(): string {
  const analytics = analyticsOrigin();
  const extra = analytics ? ` ${analytics}` : "";
  return [
    "default-src 'self'",
    // Next.js injects small inline bootstrap scripts; 'unsafe-inline' is needed without nonces.
    // 'wasm-unsafe-eval' lets the HEIC decoder compile its WebAssembly; it does not allow JavaScript eval().
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${extra}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // No remote endpoints except optional analytics: images cannot be uploaded anywhere.
    `connect-src 'self'${extra}`,
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
