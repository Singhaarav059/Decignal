// Scroll state for the page: which section is on screen, how far a pinned section has played,
// and the pointer. Written by the DOM (Reel.tsx), read every frame by the world (World.tsx).

export const SECTIONS = ["hero", "systems", "signal", "decision", "foundation", "yours", "industries", "outcome", "how", "ask"] as const;
export const N = SECTIONS.length;
export type SectionKey = (typeof SECTIONS)[number];

/** Index of each section, by name. */
export const S = Object.fromEntries(SECTIONS.map((k, i) => [k, i])) as Record<SectionKey, number>;

/**
 * How much of each section's stretch of story time plays while it is pinned (the rest plays as it
 * hands over to the next section). Sections with no pin hand over across their whole stretch.
 */
export const PLAY: Record<SectionKey, number> = {
  hero: 0,
  systems: 0.4,
  signal: 0.7,
  decision: 0.8,
  foundation: 0.5,
  yours: 0.4,
  industries: 0.5,
  outcome: 0.4,
  how: 0.4,
  ask: 0,
};

export const reel = {
  /** Section coordinate: i while section i holds the screen, i..i+1 while i+1 scrolls in. */
  s: 0,
  /** How far each pinned section has played, 0..1 (unpinned sections stay at 0). */
  u: new Array<number>(N).fill(0),
  pointer: { x: 0, y: 0 },
  /** The decision has been approved on the page. */
  approved: false,
  /** The reader asked for less motion. */
  calm: false,
};

type Anchor = { top: number; end: number };
let anchors: Anchor[] = [];

/** Measures each section: where it reaches the top of the screen and where its pin lets go. */
export function measure() {
  const vh = window.innerHeight;
  anchors = SECTIONS.map((k) => {
    const el = document.querySelector<HTMLElement>(`[data-reel="${k}"]`);
    if (!el) return { top: 0, end: 0 };
    const top = el.getBoundingClientRect().top + window.scrollY;
    // The last section is as long as its content: it never pins, it just reads.
    const pinned = PLAY[k] > 0;
    return { top, end: pinned ? top + Math.max(el.offsetHeight - vh, 0) : top };
  });
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** Maps the scroll position to the section coordinate and each pinned section's progress. */
export function update(y: number) {
  if (!anchors.length) return;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const a = anchors[i];
    reel.u[i] = a.end > a.top ? clamp01((y - a.top) / (a.end - a.top)) : y >= a.top ? 1 : 0;
    if (y >= a.end) {
      const next = anchors[i + 1];
      s = next ? i + clamp01((y - a.end) / Math.max(next.top - a.end, 1)) : i;
    }
  }
  reel.s = s;
}

/** Scroll position at which a section has settled (pinned sections: a given share of the way in). */
export function anchorOf(i: number, u = 0) {
  const a = anchors[i];
  return a ? a.top + (a.end - a.top) * u : 0;
}

/**
 * One clock for the whole page, 0 at the top of the hero to N - 1 once the last section has
 * arrived. Section i owns i..i+1: the first PLAY share plays while it is pinned, the rest while
 * the next section scrolls in. Everything the camera and the daylight do is a function of this one
 * number, which only ever moves forward with the scroll.
 */
export function story() {
  const { s, u } = reel;
  const i = Math.min(Math.floor(s), N - 1);
  if (i >= N - 1) return N - 1;
  const w = PLAY[SECTIONS[i]];
  return i + w * u[i] + (1 - w) * (s - i);
}

/** Story time at which section i has played a share `u` of its pin. */
export const atSection = (i: number, u = 0) => i + PLAY[SECTIONS[i]] * u;

/** The decision, as decision progress: approval, then six pallets loaded, then the drive to Plant 01. */
export const DECISION = {
  approve: 0.2,
  load: 0.24,
  /** Progress per pallet. */
  each: 0.07,
  drive: [0.7, 0.94] as const,
};

/** Pallets on the trailer at decision progress u (each is set down 64% of the way through its turn). */
export function loadedAt(u: number) {
  const all = (u - DECISION.load) / DECISION.each;
  if (all <= 0) return 0;
  if (all >= 6) return 6;
  const k = Math.floor(all);
  return k + (all - k >= 0.64 ? 1 : 0);
}

/** Decision progress, held at 0 before the decision and at 1 after it. */
export const decisionU = () => (reel.s > S.decision + 0.001 ? 1 : reel.s >= S.decision ? reel.u[S.decision] : 0);
