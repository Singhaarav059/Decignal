// Phones: the story keeps its own pace, and the 3D draws on a budget.
//
// A phone's swipe snaps the page from one hold to the next in a few hundred milliseconds (story.css),
// and the story's moves, made for a long scroll, rushed through in that time. On touch screens the
// story's position (g) follows the scroll on a critically damped spring instead: a swipe plays its move
// over about a second, and a long fling runs through at a capped speed. Jumps and refreshes still land
// at once.
//
// The 3D on a phone draws at most 60 frames a second while anything moves (a 120 Hz phone otherwise
// drew twice that) and 30 once the page rests, where only the ambient life moves (user's choice,
// 2026-10-14). Desktop is untouched: Lenis already eases the scroll, and the canvas draws every frame.
import { setG, store } from "./story";

const TOUCH = "(pointer: coarse) and (hover: none)";
export const isTouch = () => typeof window !== "undefined" && window.matchMedia(TOUCH).matches;

/** Spring stiffness (1/s): settles a swipe's move in about a second. */
const OMEGA = 4.6;
/** Fastest the story runs through on a long fling, in chapters per second. */
const MAX_SPEED = 2.4;

let target = 0;
/** Where the current move started (the story's position when the spring last left rest). */
let from = 0;
let v = 0;
let raf = 0;
let last = 0;
let eased = false;

function step(t: number) {
  const dt = Math.min((t - last) / 1000, 1 / 30);
  last = t;
  const x = store.g;
  v += (OMEGA * OMEGA * (target - x) - 2 * OMEGA * v) * dt;
  v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));
  const nx = x + v * dt;
  if (Math.abs(target - nx) < 1e-4 && Math.abs(v) < 1e-3) {
    v = 0;
    raf = 0;
    setG(target);
    return;
  }
  setG(nx);
  raf = requestAnimationFrame(step);
}

/** Starts easing the story on touch screens; elsewhere storyTo sets g at once. */
export function startPace() {
  eased = isTouch();
  target = store.g;
  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    eased = false;
  };
}

/** The scroll's story position. On touch screens the story eases toward it. */
export function storyTo(g: number) {
  // A new target mid-ease (a second swipe) starts a new move from where the story is now, so
  // paceLeft measures the move that is left, not one from a hold the story has already passed.
  if (g !== target) from = store.g;
  target = g;
  if (!eased) return setG(g);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
}

/** Lands the story on the scroll's position at once (a jump, a refresh). */
export function storyCut(g = target) {
  target = g;
  v = 0;
  cancelAnimationFrame(raf);
  raf = 0;
  setG(g);
}

/** The story is still easing toward the scroll. */
export const pacing = () => raf !== 0;

/** Where the scroll has sent the story (the hold a swipe snaps to). */
export const paceTarget = () => target;

/** How much of the current move is left, 0..1 (0 at rest). */
export const paceLeft = () => (raf ? Math.min(1, Math.abs(target - store.g) / Math.max(Math.abs(target - from), 1e-6)) : 0);

/** How long after the last scroll or touch the page counts as resting (ms). */
const REST = 250;
/** A tap or drag on the page keeps the 3D at full rate this long (an island lifting, a stage turning). */
const TOUCHED = 1500;

/** Nothing is moving the page: no scroll, no story easing, no recent touch. */
export function resting(now = performance.now()) {
  return !pacing() && now - store.scrollAt > REST && now - store.pointerAt > TOUCHED;
}

let cuts = 0;
/** The phone story woke from a still (components/three/Pacer.tsx): the camera lands on its framing at
 *  once rather than flying in from the old hold, since the move between was never drawn. */
export const stillCut = () => void cuts++;
export const stillCuts = () => cuts;

/** Switches the on-phone probe (lib/perf-probe.ts) flips to measure what each part costs: the 3D off,
 *  or drawn at another density. Inert unless the page was opened with ?perf. */
export const probe = {
  off3d: false,
  /** Phones draw the story as stills at each hold (components/three/Pacer.tsx); false draws every move. */
  still: true,
  dprSetters: new Set<(dpr: number | [number, number]) => void>(),
};
