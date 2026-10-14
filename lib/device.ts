// Phone detection shared by the 3D scenes and the phone-only layouts. Phones get the same picture, with
// GPU work sized to a phone screen rather than a desktop one.
import { useSyncExternalStore } from "react";

const PHONE = "(max-width: 767px)";

export const isPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE).matches;

/** A phone in the hand: phone width and a touch screen. A desktop window that merely loads narrow is not
 *  one; it may be widened later, and what is built once (materials) must not stay on the phone budget. */
export const isTouchPhone = () => isPhone() && window.matchMedia("(pointer: coarse) and (hover: none)").matches;

const subscribe = (fn: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};

/** True on a phone-width screen; false while server rendering. */
export const usePhone = () => useSyncExternalStore(subscribe, isPhone, () => false);

/**
 * Canvas settings for the screen in use. Desktop and phone both draw the 3D at up to 2x with MSAA. A
 * phone's own density (often 2.6-3x) without MSAA left stair-steps on edges and cost a mid-range
 * phone GPU half again as many pixels; at 2x with 4x MSAA, which a phone's tiled GPU resolves almost
 * for free, edges come out smoother for about 60% of the shading (user's choice, 2026-10-14).
 */
export function canvasQuality() {
  return { phone: isPhone(), dpr: [1, 2] as [number, number], antialias: true };
}

// A classic scrollbar (Windows, or macOS set to always show scrollbars) narrows the full-width story
// canvas but not the width CSS media queries see. Gates written against the canvas width then disagreed
// with the CSS: between 768 and ~784px both Scale's phone deck (CSS) and its 3D hand (canvas) stepped
// out, and the Industries callout's place flipped against its CSS between 1024 and ~1040px. The bar is
// kept, not read per frame: reading clientWidth in a frame could force a layout. Overlay scrollbars
// (phones, most Macs) take no width, so there nothing changes.
let bar = 0;
if (typeof window !== "undefined" && typeof ResizeObserver !== "undefined") {
  const readBar = () => (bar = Math.max(0, window.innerWidth - document.documentElement.clientWidth));
  readBar();
  // The page's own box narrows when the bar appears (the page grows long after the first paint) and
  // with every resize. Watched from when this module loads, before any canvas: its observer reports
  // first, so a canvas resized by the same change already reads the new bar.
  new ResizeObserver(readBar).observe(document.documentElement);
}

/** The width the CSS media queries see, for a canvas `w` wide that spans the window. */
export const mediaWidth = (w: number) => w + bar;

/** The 3D's phone gate, matching the CSS (max-width: 767px). */
export const phoneWide = (w: number) => mediaWidth(w) < 768;

/** The 3D's portrait framing: phones, and tall screens below 1024px (the CSS's tablet range). */
export function portraitWide(w: number, h: number) {
  const m = mediaWidth(w);
  return m < 768 || (m < 1024 && h > w * 1.15);
}
