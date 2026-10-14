// Phone detection shared by the 3D scenes and the phone-only layouts. Phones get the same picture, with
// GPU work sized to a phone screen rather than a desktop one.
import { useSyncExternalStore } from "react";

const PHONE = "(max-width: 767px)";

export const isPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE).matches;

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
