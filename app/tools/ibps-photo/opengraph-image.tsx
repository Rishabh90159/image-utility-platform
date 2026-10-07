import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit IBPS Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "IBPS Photo Resizer",
    subtitle: "200 × 230 px, 20–50 KB, from the CRP notifications.",
  });
}
