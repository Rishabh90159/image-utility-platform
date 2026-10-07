import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Bulk Image Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Bulk Image Resizer",
    subtitle: "Resize many images at once and download a ZIP.",
  });
}
