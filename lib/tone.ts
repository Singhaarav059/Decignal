import type { CSSProperties } from "react";

/**
 * System tones. `--tone` is the raw colour (dots, strokes, fills, drawings); `--tone-ink` is its
 * text-safe ink (app/styles/tokens.css). CSS reads text colour as `var(--tone-ink, var(--color-ink))`,
 * so text in a tone is never a mix with ink (that renders brown) and saffron text is plain ink.
 */
export const TONES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink", "signal", "demand", "ok", "ink"] as const;
export type Tone = (typeof TONES)[number];

const isTone = (t: string): t is Tone => (TONES as readonly string[]).includes(t);

/** Raw system hexes (the same values as the CSS tokens and three/palette TINTS). */
const HEX: Record<string, Tone> = {
  "#2e5bff": "cobalt",
  "#7c5cff": "violet",
  "#0fa874": "emerald",
  "#ffb21e": "saffron",
  "#ff7438": "tangerine",
  "#ff5fa2": "pink",
  "#f2361f": "signal",
};

/** The raw colour of a tone, for fills and strokes. */
export const toneColor = (t: Tone) => `var(--color-${t})`;

/** The text-safe ink of a tone. Saffron and ink resolve to ink. */
export const toneInk = (t: Tone) => (t === "ink" ? "var(--color-ink)" : `var(--tone-ink-${t})`);

/**
 * Resolves a tone name, a `var(--color-x)` reference or a raw system hex to its tone name.
 * Returns undefined for anything else.
 */
export function toneOf(value: string | null | undefined): Tone | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (isTone(v)) return v;
  const m = /^var\(--color-([a-z]+)\)$/.exec(v);
  if (m && isTone(m[1])) return m[1];
  return HEX[v];
}

/**
 * Inline style for anything coloured by a tone: `style={toneVars("emerald")}` or
 * `style={{ ...toneVars(c), ["--k" as string]: i }}`. Accepts a tone name, `var(--color-x)` or a
 * system hex. Unknown values keep the raw colour and fall back to ink for text.
 */
export function toneVars(tone: Tone | string | null | undefined): CSSProperties {
  const t = toneOf(tone);
  if (!t) return (tone ? { "--tone": tone, "--tone-ink": "var(--color-ink)" } : {}) as CSSProperties;
  return { "--tone": toneColor(t), "--tone-ink": toneInk(t) } as CSSProperties;
}

/** Inline style for a headline's accent line (SectionTitle, .accent): `--accent-ink` only. */
export function accentVars(tone: Tone | string | null | undefined): CSSProperties {
  const t = toneOf(tone);
  return { "--accent-ink": t ? toneInk(t) : "var(--color-cobalt-ink)" } as CSSProperties;
}
