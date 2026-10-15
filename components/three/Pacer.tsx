"use client";

// Drives a canvas whose frameloop is "never" on a touch screen's budget (lib/pace.ts): at most 60
// frames a second while anything moves, 30 once the page rests. Every useFrame runs at that rate too
// (the contact shadows' passes, the ambient life), and each frame's delta is the real time since the
// last one, so motion keeps its speed.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { probe, resting } from "@/lib/pace";

/** A frame may come this much early (ms): rAF times jitter, and a strict gap would skip every other one. */
const SLACK = 4;

/** A world with nothing drawn this long (ms) while the page rests has come to rest itself. */
const QUIET = 1000;
/** Updates a second for a world at rest: each only looks for the next change. */
const QUIET_FPS = 8;

/**
 * `paused`: the owner's own reasons to draw nothing (the story warming up, or out of sight).
 * `drawnAt`: when the owner last drew (FrameGate). A story at rest in a still chapter (Signal, Control,
 * the ending) drew nothing, yet every update still ran each scene part and read the whole picture for
 * a change, 30 times a second. Once nothing has drawn for a second and the page rests, it updates 8
 * times a second instead; a scroll or touch brings it back at once.
 */
export function Pacer({ paused, drawnAt }: { paused?: () => boolean; drawnAt?: () => number }) {
  const get = useThree((s) => s.get);
  const advance = useThree((s) => s.advance);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    probe.dprSetters.add(setDpr);
    return () => {
      probe.dprSetters.delete(setDpr);
    };
  }, [setDpr]);
  useEffect(() => {
    let raf = 0;
    let last = -1e9;
    let slept = false;

    // Held (out of sight, warming up): no frame is asked for, so a page scrolled past the story can go
    // idle; a scroll, or a check every few hundred ms (the warm-up ending), starts the loop again.
    let held = 0;
    const resume = () => {
      if (!held) return;
      clearTimeout(held);
      held = 0;
      raf = requestAnimationFrame(tick);
    };
    const tick = (t: number) => {
      if (paused?.() || probe.off3d) {
        last = -1e9;
        raf = 0;
        held = window.setTimeout(resume, 300);
        return;
      }
      raf = requestAnimationFrame(tick);
      const rest = resting(t);
      const quiet = rest && !!drawnAt && t - drawnAt() > QUIET;
      const gap = quiet ? 1000 / QUIET_FPS : rest ? 1000 / 30 : 1000 / 60;
      if (t - last < gap - SLACK) return;
      // In "never" mode R3F takes the clock's next time, in seconds, and the delta from it. At rest, and
      // on the first update after it, a step counts as one frame: motion that starts again picks up
      // where it was instead of jumping by the gap.
      const dt = Math.min(last < 0 ? gap : quiet || slept ? 1000 / 30 : t - last, 100) / 1000;
      slept = quiet;
      last = t;
      advance(get().clock.elapsedTime + dt);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", resume, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(held);
      held = 0;
      window.removeEventListener("scroll", resume);
    };
  }, [advance, get, paused, drawnAt]);
  return null;
}
