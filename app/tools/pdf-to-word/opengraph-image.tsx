import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr PDF to Word converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "PDF to Word",
    subtitle: "Editable Word documents from text-based PDFs.",
  });
}
