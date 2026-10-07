import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit 20KB Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "20KB Photo",
    subtitle: "Get a photo or signature under 20 KB.",
  });
}
