import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit SVG to PNG Converter tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "SVG to PNG",
    subtitle: "Render SVG graphics as PNG at any size.",
  });
}
