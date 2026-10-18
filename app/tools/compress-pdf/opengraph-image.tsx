import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Compress PDF tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Compress PDF",
    subtitle: "Reduce a PDF to 100 KB, 200 KB or any size.",
  });
}
