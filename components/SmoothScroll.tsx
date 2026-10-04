"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gToProgress, progressToG, setG, store } from "@/lib/story";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
export const getLenis = () => lenis;
export const scrollToTarget = (target: string | number) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else if (typeof target === "string") document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  else window.scrollTo({ top: target, behavior: "smooth" });
};

/** Lenis drives the scroll, GSAP's ticker drives Lenis, ScrollTrigger maps the story. */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      lenis.on("scroll", (l: Lenis) => (store.velocity = l.velocity));
      gsap.ticker.add((t) => lenis?.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const st = ScrollTrigger.create({
      trigger: "#story",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setG(progressToG(self.progress)),
      onRefresh: (self) => setG(progressToG(self.progress)),
    });

    const onPointer = (e: PointerEvent) => {
      store.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      store.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      store.pointerIn = true;
    };
    const onLeave = () => (store.pointerIn = false);
    window.addEventListener("pointermove", onPointer, { passive: true });
    // A tap counts as hover on touch screens.
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    if (process.env.NODE_ENV !== "production") {
      // Dev only: jump to a story moment for frame-by-frame review.
      (window as unknown as { __goto: (g: number) => void }).__goto = (g: number) => {
        const y = st.start + gToProgress(g) * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      };
    }

    return () => {
      st.kill();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
