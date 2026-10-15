// The story's position follows the scroll, and the 3D on a touch screen draws on a budget
// (components/three/Pacer.tsx): at most 60 frames a second while anything moves (a 120 Hz phone
// otherwise drew twice that) and 30 once the page rests, where only the ambient life moves. Desktop
// draws every frame; Lenis already eases its scroll.
//
// On a touch screen the story keeps to a top speed. A drag follows the thumb exactly; a flick, which
// on a phone crosses a whole chapter in a fraction of a second, plays at most MAX_SPEED and lands just
// after the thumb stops, braking onto the place it scrolled to. Signal to Decision had rushed by, every
// move squeezed into a flick, and the reader missed what each chapter shows.
import { TOTAL_LEN, gToProgress, progressToG, setG, store } from "./story";

const TOUCH = "(pointer: coarse) and (hover: none)";
export const isTouch = () => typeof window !== "undefined" && window.matchMedia(TOUCH).matches;

/** The story's top speed on a touch screen, in screen heights a second: a chapter's move (about two
 *  thirds of a screen) in under half a second, a whole short chapter in about one. */
const MAX_SPEED = 1.5;
/** How hard it brakes onto the place the scroll stopped (screen heights a second, per second). */
const BRAKE = 5;
/** After a jump, the scroll's next reports land at once too (ms). */
const CUT_HOLD = 150;

/** Where the scroll is and where the story shows, in screen heights along the story. */
let target = 0;
let shown = 0;
let lastTarget = 0;
let raf = 0;
let last = 0;
let cutUntil = -Infinity;
let paced: boolean | null = null;

const at = (g: number) => gToProgress(g) * TOTAL_LEN;
const show = () => setG(progressToG(shown / TOTAL_LEN));

function step(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const gap = target - shown;
  // What the thumb moved this frame, up to the top speed; and, once it has stopped, the braking curve
  // onto the place it left (fast while far behind, slowing as it arrives).
  const thumb = Math.min(Math.abs(target - lastTarget), MAX_SPEED * dt);
  lastTarget = target;
  const catchUp = Math.min(MAX_SPEED, Math.sqrt(2 * BRAKE * Math.abs(gap))) * dt;
  shown += Math.sign(gap) * Math.min(Math.abs(gap), Math.max(thumb, catchUp));
  show();
  if (Math.abs(target - shown) > 1e-6) {
    // Still arriving: the page counts as moving (the Pacer keeps its full rate, hovers stay asleep).
    store.scrollAt = now;
    raf = requestAnimationFrame(step);
  } else raf = 0;
}

/** The scroll's story position. */
export function storyTo(g: number) {
  paced ??= isTouch() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target = at(g);
  if (!paced || performance.now() < cutUntil) {
    shown = lastTarget = target;
    show();
    return;
  }
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
}

/** Lands the story at once (a jump, a refresh): on `g`, or where the scroll already is. */
export function storyCut(g?: number) {
  if (g !== undefined) target = at(g);
  else if (paced === null) target = at(store.g);
  shown = lastTarget = target;
  cutUntil = performance.now() + CUT_HOLD;
  cancelAnimationFrame(raf);
  raf = 0;
  show();
}

/** How long after the last scroll or touch the page counts as resting (ms). */
const REST = 250;
/** A tap or drag on the page keeps the 3D at full rate this long (an island lifting, a stage turning). */
const TOUCHED = 1500;

/** Nothing is moving the page: no recent scroll or touch. */
export function resting(now = performance.now()) {
  return now - store.scrollAt > REST && now - store.pointerAt > TOUCHED;
}

/** Switches the on-phone probe (lib/perf-probe.ts) flips to measure what each part costs: the 3D off,
 *  or drawn at another density. Inert unless the page was opened with ?perf. */
export const probe = {
  off3d: false,
  /** The probe holds one density for a run: the touch canvases' motion density steps aside. */
  fixedDpr: false,
  dprSetters: new Set<(dpr: number | [number, number]) => void>(),
  /** Each canvas's draws since the probe last read them: main-thread ms in render(), render calls,
   *  draw calls and triangles. Filled only with ?perf (probeGl). */
  gl: new Map<string, GlTally>(),
};

export type GlTally = { ms: number; renders: number; calls: number; triangles: number; dpr: number };

type Renderer = {
  render: (...a: never[]) => void;
  info: { render: { calls: number; triangles: number } };
  getPixelRatio: () => number;
};

/** With ?perf, counts what `name`'s canvas draws: the probe splits a frame into the 3D's share and the
 *  page's. Each render() is timed, and three's info (reset per render) is added up after it. */
export function probeGl(name: string, gl: Renderer) {
  if (typeof window === "undefined" || !new URLSearchParams(location.search).has("perf")) return;
  const t: GlTally = { ms: 0, renders: 0, calls: 0, triangles: 0, dpr: gl.getPixelRatio() };
  probe.gl.set(name, t);
  if (process.env.NODE_ENV !== "production") Object.assign(window, { __probe: probe });
  const render = gl.render.bind(gl);
  gl.render = ((...a: never[]) => {
    const s = performance.now();
    render(...a);
    t.ms += performance.now() - s;
    t.renders++;
    t.calls += gl.info.render.calls;
    t.triangles += gl.info.render.triangles;
    t.dpr = gl.getPixelRatio();
  }) as Renderer["render"];
}
