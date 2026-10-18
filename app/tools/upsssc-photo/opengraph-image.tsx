import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr UPSSSC OTR photo and signature tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "UPSSSC Photo & Signature",
    subtitle: "OTR photo 50–100 KB, signature 30–50 KB.",
  });
}
