"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOVER_REST, gToProgress, progressToG, setAfter, store } from "@/lib/story";
import { storyCut, storyTo } from "@/lib/pace";
import { jumpTo, onJumpCut, setLenis } from "@/lib/jump";
import { getChrome, startChrome, type ChromeSection } from "@/lib/chrome";
import { startStill } from "@/lib/still";
import { flowMode, onFlowMode } from "@/lib/flow";
import { dropEmptyRafLoops } from "@/lib/idle-raf";

gsap.registerPlugin(ScrollTrigger);

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

    // The story's track: its scroll position drives the story (g) on every screen but an upright phone,
    // whose flowing story (components/story/PhoneFlow.tsx) sets g from its own sections. Set up again when
    // the screen turns between the two (the page swaps its story then).
    let st: ScrollTrigger | null = null;
    let after: ScrollTrigger | null = null;
    let offCut = () => {};
    const storyOff = () => {
      offCut();
      st?.kill();
      after?.kill();
      st = after = null;
      offCut = () => {};
    };
    const storyOn = () => {
      storyOff();
      const storyEl = flowMode() === "phone" ? null : document.getElementById("story");
      if (!storyEl) return;
      // A jump that moves the page at once lands the story there too, without easing in.
      offCut = onJumpCut(() => storyCut());
      st = ScrollTrigger.create({
        trigger: storyEl,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => storyTo(progressToG(self.progress)),
        onRefresh: (self) => {
          storyCut(progressToG(self.progress));
        },
      });
      // The page below sliding over the finished story: the closing layer drifts up with it (finalExit).
      after = ScrollTrigger.create({
        trigger: storyEl,
        start: "bottom bottom",
        end: "bottom top",
        onUpdate: (self) => setAfter(self.progress),
        onRefresh: (self) => setAfter(self.progress),
      });
    };
    storyOn();
    let modeTimer = 0;
    const offMode = onFlowMode(() => {
      storyOff();
      setAfter(0);
      // After React has swapped the story for the new mode.
      clearTimeout(modeTimer);
      modeTimer = window.setTimeout(() => {
        storyOn();
        ScrollTrigger.refresh();
      }, 80);
    });

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
      // Read at call time: the trigger is set up again when the screen turns (none on an upright phone).
      const track = () => st as ScrollTrigger | null;
      w.__storyY = (g: number) => {
        const t = track();
        return t ? t.start + gToProgress(g) * (t.end - t.start) : 0;
      };
      w.__goto = (g: number) => {
        const y = w.__storyY!(g);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      };
    }

    return () => {
      gone = true;
      storyOff();
      offMode();
      clearTimeout(modeTimer);
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
