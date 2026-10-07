import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr PNG to SVG Converter tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "PNG to SVG",
    subtitle: "Trace logos and icons into real vector paths.",
  });
}
