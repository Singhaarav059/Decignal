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
  /** Flowing windows of other canvases on the page (the phone explorer, ApplicationFlow). */
  windows: 0,
};

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
