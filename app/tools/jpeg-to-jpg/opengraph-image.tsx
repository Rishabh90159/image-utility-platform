import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr JPEG to JPG converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "JPEG to JPG",
    subtitle: "Rename or re-save .jpeg and .jfif files as .jpg.",
  });
}
