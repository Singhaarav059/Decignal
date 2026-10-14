"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { probe, resting } from "@/lib/pace";

/** Run every animation during a swipe. Cap high-refresh touch screens at 60 Hz,
 *  use 30 Hz for ambient motion, and check a settled world at 8 Hz. Hidden tabs
 *  have no animation clock; an offscreen or warming canvas checks only on a timer. */
export function Pacer({ paused, drawnAt }: { paused?: () => boolean; drawnAt?: () => number }) {
  const get = useThree((s) => s.get);
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let last = 0;
    let quietBefore = false;
    const tick = (t: number) => {
      raf = 0;
      if (document.hidden) return;
      if (paused?.() || probe.off3d) {
        last = 0;
        timer = window.setTimeout(resume, 250);
        return;
      }
      raf = requestAnimationFrame(tick);
      const rest = resting(t);
      const quiet = rest && !!drawnAt && t - drawnAt() > 1000;
      const gap = 1000 / (quiet ? 8 : rest ? 30 : 60);
      if (last && t - last < gap - 2) return;
      // Never replay the time spent hidden or idle as one giant animation step.
      const dt = Math.min(!last || quietBefore ? gap : t - last, 1000 / 30) / 1000;
      quietBefore = quiet;
      last = t;
      advance(get().clock.elapsedTime + dt);
    };
    function resume() {
      clearTimeout(timer);
      timer = 0;
      if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
    }
    const visibility = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      raf = timer = last = 0;
      if (!document.hidden) resume();
    };
    resume();
    window.addEventListener("scroll", resume, { passive: true });
    window.addEventListener("pointerdown", resume, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("scroll", resume);
      window.removeEventListener("pointerdown", resume);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [advance, get, paused, drawnAt]);
  return null;
}
