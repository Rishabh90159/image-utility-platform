import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path of the canonical URL, e.g. "/tools/image-resizer". */
  path: string;
}

/**
 * Site-wide social image. Pages with their own opengraph-image file (the tool
 * pages) override this automatically, because file-based metadata takes priority.
 */
const defaultImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} – free online image tools`,
};

/**
 * Builds complete per-page metadata: unique title and description, a canonical
 * URL on the production domain, and matching Open Graph / Twitter tags.
 */
export function pageMetadata({ title: pageTitle, description, path }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  // Every title ends with the brand once, e.g. "Image Resizer – … | Imgifyr".
  const title = pageTitle.includes(siteConfig.name) ? pageTitle : `${pageTitle} | ${siteConfig.name}`;
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
      images: [defaultImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultImage.url],
    },
  };
}
