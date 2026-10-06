import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit Signature Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Signature Resizer",
    subtitle: "Clean up and resize a signature for online forms.",
  });
}
