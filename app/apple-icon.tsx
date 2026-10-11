import { ImageResponse } from "next/og";
import { BRAND_BLUE, logoMarkSvg } from "@/lib/seo/og-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS. Full-bleed blue: iOS applies its own rounded mask. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_BLUE }}>
        {logoMarkSvg(180, { tile: false })}
      </div>
    ),
    size,
  );
}
