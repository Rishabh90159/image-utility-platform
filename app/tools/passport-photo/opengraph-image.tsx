import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Imgifyr passport size photo requirements and maker";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Passport Size Photo",
    subtitle: "Officially sourced sizes by country.",
  });
}
