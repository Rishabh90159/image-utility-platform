import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit Passport photo requirements tool";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Passport Photo Requirements",
    subtitle: "Officially sourced sizes by country.",
  });
}
