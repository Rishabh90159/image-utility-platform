import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path of the canonical URL, e.g. "/tools/image-resizer". */
  path: string;
}

/** Site-wide social image (app/opengraph-image.tsx), for pages without their own. */
const siteImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} – free online image tools`,
};

/**
 * Every page under /tools/ has its own opengraph-image file. Setting `images`
 * explicitly would override that file, so it is only set for the other pages,
 * whose own `openGraph` object would otherwise drop the inherited site image.
 */
function hasOwnImage(path: string): boolean {
  return path.startsWith("/tools/");
}

/**
 * Builds complete per-page metadata: unique title and description, a canonical
 * URL on the production domain, and matching Open Graph / Twitter tags.
 */
export function pageMetadata({ title: pageTitle, description, path }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  // Every title ends with the brand once, e.g. "Image Resizer – … | Imgifyr".
  const title = pageTitle.includes(siteConfig.name) ? pageTitle : `${pageTitle} | ${siteConfig.name}`;
  const images = hasOwnImage(path) ? undefined : [siteImage];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images: [siteImage.url] } : {}),
    },
  };
}
