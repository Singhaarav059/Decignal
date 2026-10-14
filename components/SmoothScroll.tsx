"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOVER_REST, gToProgress, progressToG, setAfter, store } from "@/lib/story";
import { startPace, storyCut, storyTo } from "@/lib/pace";
import { jumpTo, onJumpCut, setLenis } from "@/lib/jump";
import { getChrome, startChrome, type ChromeSection } from "@/lib/chrome";
import { startStill } from "@/lib/still";
import { rearmSnap, startSnap } from "@/lib/snap";
import { dropEmptyRafLoops } from "@/lib/idle-raf";

gsap.registerPlugin(ScrollTrigger);


/** Puts each touch snap stop (Story.tsx) at the scroll y where the story reaches its g, read from the
 *  trigger's own range so a stop lands on the exact frame the story maps there. */
function placeStops(storyEl: HTMLElement, start: number, end: number) {
  const top = storyEl.getBoundingClientRect().top + window.scrollY;
  storyEl.querySelectorAll<HTMLElement>(".story-stop").forEach((el) => {
    el.style.top = `${Math.round(start + gToProgress(Number(el.dataset.g)) * (end - start) - top)}px`;
  });
}

/** What Lenis reports on other screens, from the native scroll: its speed in px per frame (the story
 *  camera eases faster while the page moves fast) and the times hover effects wait on. */
function trackNative() {
  let y = window.scrollY;
  let t = performance.now();
  let rest = 0;
  const onScroll = () => {
    const now = performance.now();
    const ny = window.scrollY;
    store.velocity = ((ny - y) * 16.7) / Math.max(now - t, 1);
    y = ny;
    t = now;
    if (now - store.scrollAt >= HOVER_REST) store.scrollFrom = now;
    store.scrollAt = now;
    clearTimeout(rest);
    rest = window.setTimeout(() => (store.velocity = 0), 120);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    clearTimeout(rest);
    window.removeEventListener("scroll", onScroll);
  };
}

/** Lenis drives the scroll, GSAP's ticker drives Lenis, ScrollTrigger maps the story (on pages that
 *  have one), and the chrome driver works out where the reader is. Mounted by each page, never a
 *  layout, so every route starts with a fresh Lenis and its own triggers. Touch screens skip Lenis. */
export function SmoothScroll({ sections }: { sections?: ChromeSection[] }) {
  useEffect(() => {
    dropEmptyRafLoops();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Touch screens scroll natively. Lenis only smooths the wheel, yet it still listens to touchmove
    // with passive: false, so the phone waited on the main thread (busy with the 3D) before moving the
    // page under the thumb: the scroll felt heavy and late.
    const touch = window.matchMedia("(pointer: coarse) and (hover: none)").matches;
    let lenis: Lenis | null = null;
    let gone = false;
    const animate = (t: number) => lenis?.raf(t * 1000);
    let offNative: (() => void) | null = null;
    // Without Lenis (touch, or reduced motion on a desktop) the native scroll feeds the same readings,
    // or the hover guards that wait on store.scrollAt would never see the page move.
    if (touch || reduce) offNative = trackNative();
    else {
      // Its own chunk, so touch screens never download it. Until it lands (a moment after hydration,
      // under the loader) the wheel scrolls natively.
      void import("lenis").then(({ default: Smooth }) => {
        if (gone) return;
        lenis = new Smooth({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        lenis.on("scroll", (l: Lenis) => {
          store.velocity = l.velocity;
          const now = performance.now();
          if (now - store.scrollAt >= HOVER_REST) store.scrollFrom = now;
          store.scrollAt = now;
        });
        gsap.ticker.add(animate);
        gsap.ticker.lagSmoothing(0);
        setLenis(lenis);
      });
    }
    setLenis(null);

    // Before the story trigger: its first reading goes through the pace.
    const offPace = startPace();
    // A jump that moves the page at once lands the story there too, without easing in.
    const offCut = onJumpCut(() => storyCut());
    const storyEl = document.getElementById("story");
    const st = storyEl
      ? ScrollTrigger.create({
          trigger: storyEl,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => storyTo(progressToG(self.progress)),
          onRefresh: (self) => {
            storyCut(progressToG(self.progress));
            placeStops(storyEl, self.start, self.end);
            rearmSnap();
          },
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

    const offSnap = storyEl ? startSnap(storyEl) : null;

    let px = NaN;
    let py = NaN;
    const onPointer = (e: PointerEvent) => {
      store.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      store.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      store.pointerIn = true;
      // Only a real move counts: hover that wakes under a still pointer as the page scrolls past it
      // makes things open and close on their own.
      if (e.type === "pointerdown" || Math.abs(e.clientX - px) + Math.abs(e.clientY - py) >= 2) store.pointerAt = performance.now();
      px = e.clientX;
      py = e.clientY;
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
      gone = true;
      offSnap?.();
      offCut();
      offPace();
      st?.kill();
      after?.kill();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      offNative?.();
      gsap.ticker.remove(animate);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  // Started after Lenis and the story trigger, so its first reading sees them.
  useEffect(() => startChrome(sections), [sections]);
  useEffect(() => startStill(), []);
  return null;
}
