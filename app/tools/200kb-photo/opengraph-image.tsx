import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr 200KB Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "200KB Photo",
    subtitle: "Compress a large photo to 200 KB.",
  });
}
