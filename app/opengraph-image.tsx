import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, HERO_LINES, LOGO_ICON_VIEWBOX, LOGO_PLATES, OG_FOOTER, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: ${HERO_LINES.join(" ")} ${OG_FOOTER}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori reads woff (not woff2): the same static files troika uses for the 3D labels.
const font = (file: string) => readFile(join(process.cwd(), "public/fonts", file));

export default async function OpengraphImage() {
  const [display700, display600, body600] = await Promise.all([
    font("bricolage-grotesque-latin-700-normal.woff"),
    font("bricolage-grotesque-latin-600-normal.woff"),
    font("figtree-latin-600-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: BRAND.bg,
          color: BRAND.ink,
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 600, letterSpacing: -0.6 }}>
          <svg width={50} height={50} viewBox={LOGO_ICON_VIEWBOX}>
            {LOGO_PLATES.map((p) => (
              <path key={p.d} d={p.d} fill={p.fill} />
            ))}
          </svg>
          decignal
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -2,
          }}
        >
          <div>{HERO_LINES[0]}</div>
          <div style={{ color: BRAND.cobalt }}>{HERO_LINES[1]}</div>
        </div>
        <div style={{ display: "flex", maxWidth: 820, fontFamily: "Figtree", fontSize: 30, fontWeight: 600, lineHeight: 1.35, color: BRAND.inkSoft }}>
          {OG_FOOTER}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: display700, weight: 700, style: "normal" },
        { name: "Bricolage", data: display600, weight: 600, style: "normal" },
        { name: "Figtree", data: body600, weight: 600, style: "normal" },
      ],
    },
  );
}
