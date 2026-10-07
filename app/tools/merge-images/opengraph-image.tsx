import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit merge images tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Merge Images",
    subtitle: "Combine images side by side, stacked or in a grid.",
  });
}
