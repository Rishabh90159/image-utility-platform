import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr UPSC Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "UPSC Photo Resizer",
    subtitle: "Apply the limits from your UPSC instructions.",
  });
}
