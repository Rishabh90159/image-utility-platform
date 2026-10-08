import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Resize WebP";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Resize WebP",
    subtitle: "Resize WebP images and save as WebP, JPG or PNG.",
  });
}
