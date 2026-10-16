import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/site";
import { WaterFill } from "@/lib/water";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the name's first letter on a white tile filled halfway with water (iOS fills transparency with black). */
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
          position: "relative",
          paddingBottom: 18,
          background: BRAND.surface,
          color: BRAND.ink,
          fontFamily: "Bricolage",
          fontWeight: 700,
          fontSize: 148,
          lineHeight: 1,
        }}
      >
        <WaterFill w={180} h={180} level={0.44} period={60} amp={8} />
        <div style={{ display: "flex", position: "relative" }}>d</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage", data: display700, weight: 700 }] },
  );
}
