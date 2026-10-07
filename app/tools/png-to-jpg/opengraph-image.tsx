import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr PNG to JPG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "PNG to JPG Converter",
    subtitle: "Convert PNG to JPG with your choice of background colour.",
  });
}
