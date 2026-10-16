import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { WaterFill } from "@/lib/water";
import { AREA_SLUGS, appsOf, areaBySlug, areaEyebrow } from "@/lib/areas";
import { BRAND, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: a business function, its headline and its three application examples`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return AREA_SLUGS.map((slug) => ({ slug }));
}

/** Text-safe inks for the accent line (mirror the --color-*-ink tokens in app/styles/tokens.css). */
const INK: Record<string, string> = {
  cobalt: "#2A52F0",
  violet: "#5B3BE6",
  emerald: "#087A54",
  tangerine: "#C7440F",
  pink: "#C42B70",
  saffron: BRAND.ink,
};

// Satori reads woff (not woff2): the same static files as the root OG image.
const font = (file: string) => readFile(join(process.cwd(), "public/fonts", file));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = areaBySlug(slug) ?? areaBySlug(AREA_SLUGS[0])!;
  const tone = BRAND[area.tone as keyof typeof BRAND] ?? BRAND.cobalt;
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 232, height: 72, paddingBottom: 4, borderRadius: 999, overflow: "hidden", border: "1.5px solid #DCE1EA", background: BRAND.surface, fontSize: 40, fontWeight: 600, letterSpacing: -0.6 }}>
            <WaterFill w={232} h={72} period={32} amp={4} />
            <div style={{ display: "flex", position: "relative" }}>decignal</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Figtree", fontSize: 24, fontWeight: 600, color: BRAND.inkSoft }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: tone }} />
            {area.name} · {areaEyebrow()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 86, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1.8 }}>
          <div>{area.headline[0]}</div>
          <div style={{ color: INK[area.tone] ?? BRAND.ink }}>{area.headline[1]}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontFamily: "Figtree", fontSize: 24, fontWeight: 600 }}>
          {appsOf(area).map((a) => (
            <div
              key={a.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 999,
                background: BRAND.surface,
                border: "1.5px solid #D5D9DF",
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 999, background: tone }} />
              {a.name}
            </div>
          ))}
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
