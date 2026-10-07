import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit MB to KB converter";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "MB to KB Converter",
    subtitle: "Decimal and binary file-size units, explained.",
  });
}
