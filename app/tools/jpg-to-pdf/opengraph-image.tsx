import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr JPG to PDF converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "JPG to PDF",
    subtitle: "JPG photos to PDF without recompression.",
  });
}
