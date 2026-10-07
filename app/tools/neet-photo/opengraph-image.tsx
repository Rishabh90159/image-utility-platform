import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr NEET Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "NEET Photo Resizer",
    subtitle: "A NEET (UG) photo within 10–200 KB.",
  });
}
