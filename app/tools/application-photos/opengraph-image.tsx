import { ogSize, renderOgImage } from "@/lib/seo/og-image";

export const alt = "Pixfit exam and passport photo requirements compared";
export const size = ogSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgImage({
    title: "Exam Photo Requirements",
    subtitle: "IBPS, SBI, SSC, NEET and UPSC, from official sources.",
  });
}
