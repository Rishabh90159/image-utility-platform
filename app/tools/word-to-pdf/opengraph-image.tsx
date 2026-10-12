import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Word to PDF converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Word to PDF",
    subtitle: "Convert DOCX documents to PDF in your browser.",
  });
}
