import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit image size increase tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Size Increase",
    subtitle: "Bigger in pixels, or bigger in KB for upload minimums.",
  });
}
