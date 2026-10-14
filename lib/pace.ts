// The story's position follows the scroll 1:1 on every screen (a swipe moves the world with the
// thumb), and the 3D on a touch screen draws on a budget (components/three/Pacer.tsx): at most 60
// frames a second while anything moves (a 120 Hz phone otherwise drew twice that) and 30 once the page
// rests, where only the ambient life moves. Desktop draws every frame; Lenis already eases its scroll.
import { setG, store } from "./story";

const TOUCH = "(pointer: coarse) and (hover: none)";
export const isTouch = () => typeof window !== "undefined" && window.matchMedia(TOUCH).matches;

/** The scroll's story position. */
export const storyTo = (g: number) => setG(g);

/** Lands the story on a position at once (a jump, a refresh); by default where it already is. */
export const storyCut = (g = store.g) => setG(g);

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
  dprSetters: new Set<(dpr: number | [number, number]) => void>(),
};
