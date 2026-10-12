import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr PDF tools";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "PDF Tools",
    subtitle: "Convert, merge and create PDFs in your browser.",
  });
}
