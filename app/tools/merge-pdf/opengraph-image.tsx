import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Merge PDF tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Merge PDF",
    subtitle: "Combine PDFs into one, in your order.",
  });
}
