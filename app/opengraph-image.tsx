import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr free online image tools";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Free Online Image Tools",
    subtitle: "Resize, compress and convert JPG, PNG and WebP images.",
  });
}
