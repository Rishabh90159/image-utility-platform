import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Image Resizer";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Resizer",
    subtitle: "Resize JPG, PNG and WebP images by pixels or percentage.",
  });
}
