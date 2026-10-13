"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gToProgress, progressToG, setAfter, setG, store } from "@/lib/story";
import { getLenis, jumpTo, scrollToTarget, setLenis } from "@/lib/jump";
import { getChrome, startChrome, type ChromeSection } from "@/lib/chrome";

gsap.registerPlugin(ScrollTrigger);

// Existing callers import these from here; they live in lib/jump.
export { getLenis, jumpTo, scrollToTarget };

/** Lenis drives the scroll, GSAP's ticker drives Lenis, ScrollTrigger maps the story (on pages that
 *  have one), and the chrome driver works out where the reader is. Mounted by each page, never a
 *  layout, so every route starts with a fresh Lenis and its own triggers. */
export function SmoothScroll({ sections }: { sections?: ChromeSection[] }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    const animate = (t: number) => lenis?.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      lenis.on("scroll", (l: Lenis) => {
        store.velocity = l.velocity;
        store.scrollAt = performance.now();
      });
      gsap.ticker.add(animate);
      gsap.ticker.lagSmoothing(0);
    }
    setLenis(lenis);

    const storyEl = document.getElementById("story");
    const st = storyEl
      ? ScrollTrigger.create({
          trigger: storyEl,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => setG(progressToG(self.progress)),
          onRefresh: (self) => setG(progressToG(self.progress)),
        })
      : null;
    // The page below sliding over the finished story: the closing layer drifts up with it (finalExit).
    const after = storyEl
      ? ScrollTrigger.create({
          trigger: storyEl,
          start: "bottom bottom",
          end: "bottom top",
          onUpdate: (self) => setAfter(self.progress),
          onRefresh: (self) => setAfter(self.progress),
        })
      : null;

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
      // Dev only: jump to a story moment for frame-by-frame review, or try a jump as a reader would.
      const w = window as unknown as {
        __goto?: (g: number) => void;
        __jump: typeof jumpTo;
        __chrome: typeof getChrome;
        __storyY?: (g: number) => number;
      };
      w.__jump = jumpTo;
      w.__chrome = getChrome;
      if (st) {
        w.__storyY = (g: number) => st.start + gToProgress(g) * (st.end - st.start);
        w.__goto = (g: number) => {
          const y = st.start + gToProgress(g) * (st.end - st.start);
          if (lenis) lenis.scrollTo(y, { immediate: true });
          else window.scrollTo(0, y);
        };
      }
    }

    return () => {
      st?.kill();
      after?.kill();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(animate);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  // Started after Lenis and the story trigger, so its first reading sees them.
  useEffect(() => startChrome(sections), [sections]);
  return null;
}
