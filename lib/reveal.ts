/** Touch screens whose browser runs scroll-driven animations: the section reveals there are CSS tied
 *  to the scroll (base.css), so the timed GSAP reveals stand down. */
export const scrollReveals = () =>
  typeof CSS !== "undefined" &&
  CSS.supports("animation-timeline: view()") &&
  window.matchMedia("(pointer: coarse) and (hover: none)").matches;
