// Mirrors the CSS tokens in app/globals.css. The world is cool neutral; colour lives on the objects.
export const COLORS = {
  bg: "#EEF1F7",
  envBase: "#EEF1F5",
  shadow: "#1B2230",
  porcelain: "#FFFFFF",
  ink: "#0F1217",
  inkSoft: "#5E6675",
  inkOnDark: "#FFFFFF",
  signal: "#F2361F", // risk
  demand: "#2E5BFF", // demand / information
  ok: "#0FA874", // approved / protected
};

/** Glazed ceramic, one colour per source system: ERP, CRM, MES, WMS, suppliers, external. */
export const TINTS = {
  cobalt: "#2E5BFF",
  violet: "#7C5CFF",
  emerald: "#0FA874",
  saffron: "#FFB21E",
  tangerine: "#FF7438",
  pink: "#FF5FA2",
  porcelain: COLORS.porcelain,
} as const;

/** Text colour that reads on each glaze. */
export const INK_ON: Record<keyof typeof TINTS, { ink: string; soft: string }> = {
  cobalt: { ink: "#FFFFFF", soft: "#C6D3FF" },
  violet: { ink: "#FFFFFF", soft: "#DDD4FF" },
  emerald: { ink: "#FFFFFF", soft: "#C4EEDF" },
  saffron: { ink: "#0F1217", soft: "#3D4350" },
  tangerine: { ink: "#FFFFFF", soft: "#FFE0D1" },
  pink: { ink: "#FFFFFF", soft: "#FFE1EE" },
  porcelain: { ink: COLORS.ink, soft: COLORS.inkSoft },
};

export const FONTS = {
  // Bricolage Grotesque for headings and labels, Figtree for running text: the page's two families.
  serif: "/fonts/bricolage-grotesque-latin-700-normal.woff",
  serifItalic: "/fonts/bricolage-grotesque-latin-600-normal.woff",
  sans: "/fonts/figtree-latin-600-normal.woff",
  mono: "/fonts/bricolage-grotesque-latin-600-normal.woff",
};
