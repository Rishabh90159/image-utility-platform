import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr RRB NTPC photo and signature tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "RRB NTPC Photo & Signature",
    subtitle: "Live photo rules and a 30–49 KB signature.",
  });
}
