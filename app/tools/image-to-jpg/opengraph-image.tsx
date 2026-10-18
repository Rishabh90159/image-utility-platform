import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Image to JPG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image to JPG",
    subtitle: "PNG, WebP, HEIC, GIF, BMP or AVIF to JPG.",
  });
}
