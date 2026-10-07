import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit image quality enhancer";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Quality Enhancer",
    subtitle: "Levels, contrast, colour, clarity and sharpening.",
  });
}
