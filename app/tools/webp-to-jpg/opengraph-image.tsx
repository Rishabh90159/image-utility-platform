import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr WebP to JPG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "WebP to JPG Converter",
    subtitle: "Turn WebP images from websites into JPGs that open everywhere.",
  });
}
