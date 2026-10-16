// Phones held upright read the story as a page (components/story/PhoneFlow.tsx): each chapter is a section
// in the normal flow (its 3D window, then its card), and the page scrolls natively, 1:1 with the thumb.
// Nothing is pinned; one 3D canvas moves into whichever window is in view and draws that chapter there.
// Wider screens and landscape phones keep the pinned story (components/story/Story.tsx).
//
// The mode is decided before the first paint (app/layout.tsx FLOW_JS writes html[data-flow]), so the
// CSS shows the right story from the server's markup on; React keeps only that one once it hydrates.

/** An upright phone: phone width, and at least 1.4 times as tall as wide. */
export const FLOW_QUERY = "(max-width: 767px) and (max-aspect-ratio: 5/7)";

/** Sets html[data-flow] before the first paint (and on rotation, from flowMode's subscribe). */
export const FLOW_JS = `try{var m=matchMedia(${JSON.stringify(FLOW_QUERY)});document.documentElement.dataset.flow=m.matches?"phone":"wide"}catch(e){}`;

export type FlowMode = "phone" | "wide";

let mq: MediaQueryList | null = null;
const query = () => (mq ??= window.matchMedia(FLOW_QUERY));

/** The mode now: "phone" for the flowing story, "wide" for the pinned one. */
export function flowMode(): FlowMode {
  if (typeof window === "undefined") return "wide";
  return query().matches ? "phone" : "wide";
}

/** True while the page shows the flowing phone story. Cheap: read per frame by the 3D. */
export const isFlow = () => flow.on;

export function onFlowMode(fn: () => void) {
  const m = query();
  const on = () => {
    document.documentElement.dataset.flow = m.matches ? "phone" : "wide";
    fn();
  };
  m.addEventListener("change", on);
  return () => m.removeEventListener("change", on);
}

/** Shared with the 3D (Scene.tsx, framing.ts, ScreenTag.tsx), written by PhoneFlow. */
export const flow = {
  /** The flowing story is mounted. */
  on: false,
  /** A 3D window is on screen and holds the canvas: the scene may draw. */
  live: false,
  /** Bumped when the canvas moves to another chapter's window: the camera lands at once. */
  cut: 0,
  /** Draws the world's current picture now and returns its canvas, to copy into the window it leaves
   *  (Scene.tsx FlowSnap); null until the scene is up and warm. */
  snap: null as (() => HTMLCanvasElement | null) | null,
  /** How much of the story canvas's top and foot its current window clips (px; flowBand). */
  inset: 0,
  /** Flowing windows of other canvases on the page (the phone explorer, ApplicationFlow). */
  windows: 0,
};

/* ---------------- The 3D windows' heights ---------------- */
// The canvas keeps one size (--win-h, flow.css) so it never resizes as it moves; each window shows the
// band of it its subject needs, centred, and clips the rest. A wide subject (the road, the chart) fills
// the width and needed a third of the window's height: the rest was empty sky above and below it.

/** The room a window keeps above its subject (a pin's label) and below it, and the air between (px). */
export const FLOW_TOP = 40;
export const FLOW_FOOT = 10;
const FLOW_AIR = 16;
/** The sides' margin in a window (px). */
export const FLOW_SIDE = 16;
/** Each 3D chapter's subject height for the window's width (its framed size, lib/framing.ts), by
 *  chapter index. Missing: the whole canvas (the hero's islands fill it). */
export const FLOW_FIT: Readonly<Record<number, number>> = { 1: 0.7, 2: 0.58, 3: 0.56, 4: 0.56, 7: 0.8, 8: 0.6 };
/** A window's visible height (px) for a canvas vw wide and vh tall; flow.css computes the same. */
export function flowBand(ch: number, vw: number, vh: number) {
  const r = FLOW_FIT[ch];
  return r === undefined ? vh : Math.min(vh, FLOW_TOP + FLOW_FOOT + FLOW_AIR + r * (vw - 2 * FLOW_SIDE));
}
/** The CSS for that height (PhoneFlow's windows): FLOW_TOP + FLOW_FOOT + FLOW_AIR, then the fit. */
export const flowBandCss = (ch: number) => {
  const r = FLOW_FIT[ch];
  return r === undefined ? undefined : `min(var(--win-h), calc(${FLOW_TOP + FLOW_FOOT + FLOW_AIR}px + ${r} * (100vw - ${2 * FLOW_SIDE}px)))`;
};

/**
 * How far a stepped window has played, 0..1, from its top's place on the screen (`at`, px): from its
 * centre on the focus line (the moment it becomes the window in view) to half of it gone under the nav.
 * Its steps play while it is the one being read, tied to the thumb: none of them runs before it
 * arrives or after it has gone.
 */
export function windowPlayed(at: number, h: number, vh: number, focus: number, nav: number) {
  const from = focus * vh - h / 2;
  const to = nav - h / 2;
  return Math.min(Math.max((from - at) / Math.max(from - to, 1), 0), 1);
}

/**
 * Moves a window's step position toward where the scroll puts it: an ease of `tau` seconds, never faster
 * than `rate` per second. A flick past a window used to flip through its steps in a few frames, and the
 * reader saw none of them; now each step gets its moment, and the window catches up as it is read.
 */
export function stepToward(from: number, to: number, dt: number, tau: number, rate: number) {
  const want = (to - from) * (1 - Math.exp(-dt / tau));
  const cap = rate * dt;
  const next = from + Math.max(-cap, Math.min(cap, want));
  return Math.abs(to - next) < 1e-4 ? to : next;
}

/** A canvas here may sit in a window of the flow rather than span the screen (ScreenTag's margins). */
export const windowed = () => flow.on || flow.windows > 0;

/** The story's element: the pinned track, or the flowing phone story. */
export function storyTrack(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(flow.on ? "story-flow" : "story");
}

/* ---------------- The page's sky in the flow ---------------- */
// The pinned story paints the sky from g. In the flow, g holds each chapter's own state, so the sky reads a
// position of its own that blends from one section to the next as they pass (PhoneFlow), and the Backdrop
// listens here instead.

let sky = 0;
const skyFns = new Set<(g: number) => void>();
export const skyG = () => sky;
export function setSky(g: number) {
  if (Math.abs(g - sky) < 1e-4) return;
  sky = g;
  skyFns.forEach((f) => f(g));
}
export function onSky(fn: (g: number) => void) {
  skyFns.add(fn);
  fn(sky);
  return () => {
    skyFns.delete(fn);
  };
}

/* ---------------- Moving to a story moment ---------------- */
// Links and tabs that go to a chapter (goToChapter, goToStory) scroll to its section in the flow.

let seek: ((ch: number, local: number | null) => void) | null = null;
export const setFlowSeek = (fn: typeof seek) => void (seek = fn);
/** Scrolls the flow to chapter `ch` (at `local` within it, or its start). False when no flow is mounted. */
export function flowSeek(ch: number, local: number | null) {
  if (!flow.on || !seek) return false;
  seek(ch, local);
  return true;
}
