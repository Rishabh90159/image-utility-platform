import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr 100KB Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "100KB Photo",
    subtitle: "Reduce any photo to 100 KB, keeping it sharp.",
  });
}
