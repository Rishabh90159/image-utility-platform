import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Resize GIF";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Resize GIF",
    subtitle: "Resize animated GIFs and keep every frame and the timing.",
  });
}
