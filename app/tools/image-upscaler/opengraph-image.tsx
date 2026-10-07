import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit image upscaler";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Upscaler",
    subtitle: "Enlarge images 2× or 4× with Lanczos resampling.",
  });
}
