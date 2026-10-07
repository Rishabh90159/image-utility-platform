import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr photo to PDF converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Photo to PDF",
    subtitle: "Combine JPG, PNG, WebP and HEIC photos into one PDF.",
  });
}
