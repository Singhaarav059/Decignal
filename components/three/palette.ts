// Mirrors the CSS tokens in app/globals.css.
export const COLORS = {
  bg: "#FBF6EF",
  envBase: "#F6EEE4",
  shadow: "#3B2A22",
  porcelain: "#FFFDF8",
  plinth: "#1C2C8C",
  ink: "#14130F",
  inkSoft: "#6E685E",
  inkOnDark: "#FFFDF8",
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
  saffron: { ink: "#2A1A00", soft: "#6B4800" },
  tangerine: { ink: "#FFFFFF", soft: "#FFE0D1" },
  pink: { ink: "#FFFFFF", soft: "#FFE1EE" },
  porcelain: { ink: COLORS.ink, soft: COLORS.inkSoft },
};

export const FONTS = {
  serif: "/fonts/bodoni-moda-latin-500-normal.woff",
  serifItalic: "/fonts/bodoni-moda-latin-400-italic.woff",
  sans: "/fonts/manrope-latin-600-normal.woff",
  mono: "/fonts/geist-mono-latin-500-normal.woff",
};
