import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit Resize Image to KB tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Resize Image to KB",
    subtitle: "Hit 20KB, 50KB, 100KB, 200KB or any size limit.",
  });
}
