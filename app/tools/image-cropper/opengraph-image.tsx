import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit Image Cropper tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Cropper",
    subtitle: "Crop to 1:1, 4:3, 16:9 or any ratio.",
  });
}
