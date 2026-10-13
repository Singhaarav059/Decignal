import { ImageResponse } from "next/og";
import { BRAND, LOGO_ICON_VIEWBOX, LOGO_PLATES } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the logo mark on a solid white tile (iOS fills transparency with black). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.surface,
        }}
      >
        <svg width={120} height={120} viewBox={LOGO_ICON_VIEWBOX}>
          {LOGO_PLATES.map((p) => (
            <path key={p.d} d={p.d} fill={p.fill} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
