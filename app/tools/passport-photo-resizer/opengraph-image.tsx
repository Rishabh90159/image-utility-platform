import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr Passport Photo Resizer tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Passport Photo Resizer",
    subtitle: "Crop and resize to your application's size and KB limit.",
  });
}
