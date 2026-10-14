// Liquid glass adapts to what is under it: over a dark surface the glass darkens and its type turns
// white (liquid-glass.css [data-dark]). This finds the nearest painted surface at a point, ignoring the
// chrome itself, and says whether it is dark. Bands paint their colour on ::before, so that counts too.

const rgba = (c: string) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
  return { r: +r, g: +g, b: +b, a: +a };
};

/** Relative luminance (sRGB, 0 to 1). */
const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Each element's own surface: dark, light, or null when it paints none (the walk goes on to its
 *  parent). Kept for a second, so scroll ticks over the same section skip the computed-style walk;
 *  a surface can still change colour (a row opening), so the verdicts do not outlive that. */
let verdicts = new WeakMap<Element, boolean | null>();
let keptSince = 0;

function surface(n: Element): boolean | null {
  let v = verdicts.get(n);
  if (v !== undefined) return v;
  v = null;
  for (const pseudo of [null, "::before"] as const) {
    const cs = getComputedStyle(n, pseudo);
    if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
    const c = rgba(cs.backgroundColor);
    if (c && c.a > 0.5) {
      v = lum(c) < 0.18;
      break;
    }
  }
  verdicts.set(n, v);
  return v;
}

export function darkAt(x: number, y: number, skip: (Element | null)[]): boolean {
  const now = performance.now();
  if (now - keptSince > 1000) {
    verdicts = new WeakMap();
    keptSince = now;
  }
  for (const hit of document.elementsFromPoint(x, y)) {
    if (skip.some((s) => s && s.contains(hit))) continue;
    for (let n: Element | null = hit; n && n !== document.documentElement; n = n.parentElement) {
      const v = surface(n);
      if (v !== null) return v;
    }
    return false;
  }
  return false;
}
