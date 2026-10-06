import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit HEIC to JPG Converter tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "HEIC to JPG",
    subtitle: "Convert iPhone photos to JPG that open everywhere.",
  });
}
