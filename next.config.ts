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
    `script-src 'self' 'unsafe-inline'${extra}`,
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
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    ];
    if (isProd) security.push({ key: "Content-Security-Policy", value: contentSecurityPolicy() });
    return [{ source: "/:path*", headers: security }];
  },
};

export default nextConfig;
