import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr PDF to JPG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "PDF to JPG",
    subtitle: "Every page as a JPG, at the size you need.",
  });
}
