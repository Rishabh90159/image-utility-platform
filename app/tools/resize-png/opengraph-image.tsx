import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Resize PNG";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Resize PNG",
    subtitle: "Resize PNG images and keep the transparent background.",
  });
}
