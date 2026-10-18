import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr DSSSB photo, signature and ID scan tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "DSSSB Photo & Signature",
    subtitle: "Photo rules and a 15–60 KB photo ID scan.",
  });
}
