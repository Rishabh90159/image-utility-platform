import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr SSC photo and signature tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "SSC Photo & Signature",
    subtitle: "Live photo rules and a 10–20 KB signature.",
  });
}
