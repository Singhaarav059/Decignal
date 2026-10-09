// Mirrors the CSS tokens in app/globals.css.
export const COLORS = {
  bg: "#F3F5F7",
  envBase: "#EAECF0",
  shadow: "#262C37",
  porcelain: "#FFFDF8",
  plinth: "#1C2C8C",
  ink: "#101113",
  inkSoft: "#5C6370",
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
