import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the name's first letter on a solid white tile (iOS fills transparency with black). */
export default async function AppleIcon() {
  const display700 = await readFile(join(process.cwd(), "public/fonts/bricolage-grotesque-latin-700-normal.woff"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 18,
          background: BRAND.surface,
          color: BRAND.ink,
          fontFamily: "Bricolage",
          fontWeight: 700,
          fontSize: 148,
          lineHeight: 1,
        }}
      >
        d
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage", data: display700, weight: 700 }] },
  );
}
