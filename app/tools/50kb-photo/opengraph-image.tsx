import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr 50KB Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "50KB Photo",
    subtitle: "A clear photo under 50 KB for application forms.",
  });
}
