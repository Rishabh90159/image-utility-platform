import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Resize JPG";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Resize JPG",
    subtitle: "Resize JPG photos by pixels or percentage, with quality and print DPI.",
  });
}
