import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Instagram Image Resizer";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Instagram Image Resizer",
    subtitle: "Posts, Stories and Reel covers: crop or fit, then download.",
  });
}
