"use client";

// Drives a canvas whose frameloop is "never" on a phone's budget (lib/pace.ts): at most 60 frames a
// second while anything moves, 30 once the page rests. Every useFrame runs at that rate too (the
// contact shadows' passes, the ambient life), and each frame's delta is the real time since the last
// one, so motion keeps its speed.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { resting } from "@/lib/pace";

/** A frame may come this much early (ms): rAF times jitter, and a strict gap would skip every other one. */
const SLACK = 4;

/** `paused`: the owner's own reasons to draw nothing (the story warming up, or out of sight). */
export function Pacer({ paused }: { paused?: () => boolean }) {
  const get = useThree((s) => s.get);
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    let raf = 0;
    let last = -1e9;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (paused?.()) {
        last = -1e9;
        return;
      }
      const gap = resting(t) ? 1000 / 30 : 1000 / 60;
      if (t - last < gap - SLACK) return;
      // In "never" mode R3F takes the clock's next time, in seconds, and the delta from it.
      const dt = Math.min(last < 0 ? gap : t - last, 100) / 1000;
      last = t;
      advance(get().clock.elapsedTime + dt);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [advance, get, paused]);
  return null;
}
