// One scroll position drives the world and its copy on every screen. Native
// touch scrolling already has inertia; adding another spring delayed the scene.
import { setG, store } from "./story";

const TOUCH = "(pointer: coarse) and (hover: none)";
export const isTouch = () => typeof window !== "undefined" && window.matchMedia(TOUCH).matches;

let target = 0;
export function startPace() {
  target = store.g;
  return () => {};
}
export function storyTo(g: number) {
  target = g;
  setG(g);
}
export function storyCut(g = target) {
  target = g;
  setG(g);
}
/** Compatibility with the optional baked artwork: there is no delayed move. */
export const pacing = () => false;
export const paceTarget = () => target;
export const paceLeft = () => 0;

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
  still: false,
  dprSetters: new Set<(dpr: number | [number, number]) => void>(),
};
