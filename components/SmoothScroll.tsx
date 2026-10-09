"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";

let lenis: Lenis | null = null;
export const getLenis = () => lenis;
export const scrollToTarget = (target: string | number, immediate = false) => {
  if (lenis) lenis.scrollTo(target, immediate ? { immediate: true, force: true } : { duration: 1.6 });
  else if (immediate && typeof target === "number") window.scrollTo({ top: target, behavior: "instant" });
  else if (typeof target === "string") document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  else window.scrollTo({ top: target, behavior: "smooth" });
};

/** Lenis drives the scroll on GSAP's ticker, the same ticker the world draws on. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animate = (t: number) => lenis?.raf(t * 1000);
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    gsap.ticker.add(animate);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(animate);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
