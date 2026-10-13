"use client";

import { useEffect } from "react";
import { useSvgScale } from "../sections/svgScale";

/**
 * The service pages' small drawings: labels held at 11px on screen (useSvgScale), and a one-time
 * draw-on when the drawing scrolls into view. Server HTML and reduced motion show the drawing complete:
 * the hidden start state only applies once `data-arm` is set here, and `data-in` then plays it once.
 */
export function useServiceArt(viewWidth: number, viewHeight: number) {
  const ref = useSvgScale<SVGSVGElement>(viewWidth, viewHeight);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    el.dataset.arm = "";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.in = "";
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return ref;
}

/** A check mark centred on (x, y), drawn as one stroke. */
export function Tick({ x, y, s = 1, className = "k-tick" }: { x: number; y: number; s?: number; className?: string }) {
  return <path d={`M${x - 4 * s} ${y}l${3 * s} ${3 * s} ${5.5 * s} ${-6 * s}`} className={className} pathLength={1} />;
}
