"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Keeps SVG labels at a legible size (F-10 b): writes the drawing's on-screen scale to `--svg-k`, so CSS
 * can set `font-size: calc(11px / var(--svg-k, 1))` and the text renders at 11px whatever the drawing's
 * width. Under 0.8 the drawing is a thumbnail and `data-small` lets CSS drop its labels instead.
 * Also pauses SMIL motion under reduced motion.
 */
export function useSvgScale<T extends SVGSVGElement>(viewWidth: number, viewHeight?: number) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () => {
      // The drawing's content box: some art sits on a padded well.
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const w = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = box.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (!(w > 0)) return;
      // The drawing is scaled to fit (preserveAspectRatio meet): the tighter axis sets the scale.
      const k = viewHeight && h ? Math.min(w / viewWidth, h / viewHeight) : w / viewWidth;
      el.style.setProperty("--svg-k", k.toFixed(3));
      if (k < 0.8) el.dataset.small = "";
      else delete el.dataset.small;
    };
    set();
    // SMIL motion (a truck on its road, a dot on its rail) ignores CSS; hold it still under reduced motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.pauseAnimations?.();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewWidth, viewHeight]);
  return ref;
}
