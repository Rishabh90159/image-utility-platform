import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit SBI Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "SBI Photo Resizer",
    subtitle: "Photo and signature sizes from SBI advertisements.",
  });
}
