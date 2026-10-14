// Touch screens: fluid, continuous smooth scrolling matching laptop.
// Snapping and artificial scroll clamping are disabled to guarantee zero lag, zero stutter, and buttery smooth scrolling.

/** Re-reads the live stops, after SmoothScroll has moved them (a story trigger refresh). */
export const rearmSnap = () => {};

/** Starts the guard; returns its cleanup. Mounted once per page by SmoothScroll (story pages only). */
export function startSnap(storyEl?: HTMLElement) {
  void storyEl;
  return () => {};
}
