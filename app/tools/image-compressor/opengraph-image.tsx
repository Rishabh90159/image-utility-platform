import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit Image Compressor";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Image Compressor",
    subtitle: "Reduce the file size of JPG, PNG and WebP images.",
  });
}
