import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr JPG to PNG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "JPG to PNG Converter",
    subtitle: "Convert JPG and JPEG images to lossless PNG.",
  });
}
