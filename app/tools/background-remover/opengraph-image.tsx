import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit background remover";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Background Remover",
    subtitle: "Cut out the subject as a transparent PNG, in your browser.",
  });
}
