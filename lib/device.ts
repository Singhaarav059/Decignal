// Phone detection shared by the 3D scenes and the phone-only layouts. Phones get the same picture at
// their own pixel density, with GPU work sized to a phone screen rather than a desktop one.
import { useSyncExternalStore } from "react";

export const PHONE = "(max-width: 767px)";

export const isPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE).matches;

const subscribe = (fn: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};

/** True on a phone-width screen; false while server rendering. */
export const usePhone = () => useSyncExternalStore(subscribe, isPhone, () => false);

/**
 * Canvas settings for the screen in use. Desktop keeps [1, 2] with MSAA. A phone renders at its full
 * density (up to 3x, never less sharp than its own text); at 2.5x and above a pixel is too small for
 * stair-steps to show, so MSAA, which would multiply every pixel's cost by four, is left off.
 */
export function canvasQuality() {
  const phone = isPhone();
  const dense = phone && window.devicePixelRatio >= 2.5;
  return { phone, dpr: (phone ? [1, 3] : [1, 2]) as [number, number], antialias: !dense };
}
