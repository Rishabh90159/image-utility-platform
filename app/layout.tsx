import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} – Free Online Image Tools`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  // Canonicals are set per page; a root canonical would leak into pages that forget theirs.
  robots: siteConfig.isIndexable ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

// Brand typeface for headings and the wordmark only; body text stays on the system font.
// next/font self-hosts the file at build time, so no request goes to Google at runtime.
const brandFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-brand",
});

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
// Validated because the ID is interpolated into an inline script.
const gaId = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID : undefined;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={brandFont.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <JsonLd data={websiteSchema()} />
        <JsonLd data={organizationSchema()} />
        {plausibleDomain ? (
          <>
            <Script id="plausible-queue" strategy="afterInteractive">
              {"window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}"}
            </Script>
            <Script src={plausibleSrc} data-domain={plausibleDomain} strategy="afterInteractive" />
          </>
        ) : null}
        {gaId ? (
          <>
            {/* The tiny queue stub runs before hydration so events fired on mount (tool_open) aren't lost.
                gtag.js (~150 KB, ~150 ms of main-thread work on a phone) is loaded on the visitor's first
                interaction, or 6 s after the page has loaded, so it never competes with the page while it
                loads. Queued events, page_view included, are sent as soon as it arrives. */}
            <Script id="google-analytics" strategy="beforeInteractive">
              {`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}');` +
                `(function(){var done=false,events=['pointerdown','keydown','touchstart','scroll'];function load(){if(done)return;done=true;` +
                `events.forEach(function(e){removeEventListener(e,load)});var s=document.createElement('script');s.async=true;` +
                `s.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';document.head.appendChild(s)}` +
                `events.forEach(function(e){addEventListener(e,load,{passive:true})});` +
                `function later(){setTimeout(load,6000)}if(document.readyState==='complete')later();else addEventListener('load',later)})();`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
