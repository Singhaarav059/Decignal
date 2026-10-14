"use client";

// Drives a canvas whose frameloop is "never" on a phone's budget (lib/pace.ts): at most 60 frames a
// second while anything moves, 30 once the page rests. Every useFrame runs at that rate too (the
// contact shadows' passes, the ambient life), and each frame's delta is the real time since the last
// one, so motion keeps its speed.
//
// `still` (the story on phones): the story is a sequence of stills, one per hold. A mid-range phone's
// GPU could not draw the moves between holds and keep the swipe itself smooth, so nothing is drawn
// while a swipe runs: the last picture stays up. Near the end of the move the scene wakes, a copy of
// the old picture dissolves away over the new one as it lands, and a moment later the scene freezes
// again (ambient life included) until the next swipe or tap. The labels and callouts placed from the
// 3D freeze with it, so they always match the picture.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { paceLeft, paceTarget, pacing, probe, resting, stillCut } from "@/lib/pace";
import { store } from "@/lib/story";

/** A frame may come this much early (ms): rAF times jitter, and a strict gap would skip every other one. */
const SLACK = 4;

/** The scene wakes when this much of a move is left (0..1): the camera is nearly there. */
const NEAR = 0.25;
/** The old picture's dissolve (ms). */
const FADE = 420;
/** How long the scene plays after waking before it freezes (ms): the move's tail, eases, labels. */
const LIVE = 900;
/** After load, a context restore or a resize, the scene plays this long (ms): entrances, uploads. */
const BOOT = 1600;
/** A tap that is not a scroll keeps the scene playing this long (an island lifting, a card opening). */
const TAPPED = 1500;

/** Still stories only on phone-sized touch screens; a tablet's GPU draws the moves. */
const phone = () => Math.min(window.innerWidth, window.innerHeight) < 600;

/** A live story with nothing drawn this long (ms) while the page rests has come to rest itself. */
const QUIET = 1000;
/** Updates a second for a world at rest: each only looks for the next change. */
const QUIET_FPS = 8;

/**
 * `paused`: the owner's own reasons to draw nothing (the story warming up, or out of sight).
 * `drawnAt`: when the owner last drew (FrameGate). A tablet's live story at rest in a still chapter
 * (Signal, Control, the ending) drew nothing, yet every update still ran each scene part and read the
 * whole picture for a change, 30 times a second. Once nothing has drawn for a second and the page
 * rests, it updates 8 times a second instead; a scroll or touch brings it back at once.
 */
export function Pacer({ paused, still, drawnAt }: { paused?: () => boolean; still?: boolean; drawnAt?: () => number }) {
  const get = useThree((s) => s.get);
  const advance = useThree((s) => s.advance);
  const setDpr = useThree((s) => s.setDpr);
  const size = useThree((s) => s.size);
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
    // Still mode: whether the scene plays, until when, and the target it froze at.
    let live = true;
    let liveUntil = -1;
    let frozeAt = paceTarget();
    let tapSeen = store.pointerAt;
    let fingers = 0;
    // The first frames after mounting (or a resize, which clears the canvas) always play.
    let wake = true;
    const gl = get().gl;
    const shot = still ? document.createElement("canvas") : null;
    let hasShot = false;
    if (shot) {
      shot.setAttribute("aria-hidden", "true");
      Object.assign(shot.style, { position: "absolute", inset: "0", width: "100%", height: "100%", opacity: "0", pointerEvents: "none" });
      gl.domElement.parentElement?.appendChild(shot);
    }
    /** Draws the current picture once more and keeps a copy: the next move dissolves from it. */
    const keep = () => {
      if (!shot) return;
      const { gl, scene, camera } = get();
      const c = gl.domElement;
      try {
        gl.render(scene, camera);
        if (shot.width !== c.width || shot.height !== c.height) {
          shot.width = c.width;
          shot.height = c.height;
        }
        const ctx = shot.getContext("2d");
        ctx?.clearRect(0, 0, shot.width, shot.height);
        ctx?.drawImage(c, 0, 0);
        hasShot = !!ctx;
      } catch {
        hasShot = false;
      }
      shot.style.transition = "none";
      shot.style.opacity = "0";
    };
    const freeze = () => {
      live = false;
      frozeAt = paceTarget();
      keep();
    };
    const wakeUp = (t: number, ms: number, dissolve: boolean) => {
      live = true;
      liveUntil = t + ms;
      last = -1e9;
      stillCut();
      if (shot && dissolve && hasShot) {
        // The copy is the picture on screen now: showing it changes nothing, and it fades as the new
        // frames draw underneath.
        shot.style.transition = "none";
        shot.style.opacity = "1";
        void shot.offsetWidth;
        shot.style.transition = `opacity ${FADE}ms cubic-bezier(0.33, 0, 0.2, 1)`;
        shot.style.opacity = "0";
      }
    };
    const restart = () => {
      hasShot = false;
      wake = true;
    };
    const down = (e: TouchEvent) => (fingers = e.touches.length);
    if (still) {
      window.addEventListener("touchstart", down, { passive: true });
      window.addEventListener("touchend", down, { passive: true });
      window.addEventListener("touchcancel", down, { passive: true });
      gl.domElement.addEventListener("webglcontextrestored", restart);
    }

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (paused?.() || probe.off3d) {
        last = -1e9;
        // Back in sight (or warmed up): play a moment before the first still.
        wake = true;
        return;
      }
      const stills = !!still && probe.still && phone();
      if (stills) {
        const moving = fingers > 0 || (pacing() && paceLeft() > NEAR);
        if (wake) {
          wake = false;
          wakeUp(t, BOOT, false);
        } else {
          // A tap, not a swipe: the pointer went down and the page did not scroll after it. Read once
          // the finger is up (a swipe also starts with a pointer down).
          const tapped = !moving && store.pointerAt > tapSeen && store.scrollAt < store.pointerAt;
          if (!moving) tapSeen = store.pointerAt;
          if (live) {
            if (tapped) liveUntil = Math.max(liveUntil, t + TAPPED);
            if (moving || t > liveUntil) {
              freeze();
              return;
            }
          } else {
            if (moving) return;
            const moved = Math.abs(paceTarget() - frozeAt) > 1e-6;
            if (!moved && !tapped) return;
            wakeUp(t, moved ? LIVE : TAPPED, true);
          }
        }
      }
      // A still story's waking frames sit under the dissolve, where the camera barely moves: 30 a second.
      const rest = resting(t);
      const quiet = !stills && rest && !!drawnAt && t - drawnAt() > QUIET;
      const gap = quiet ? 1000 / QUIET_FPS : stills || rest ? 1000 / 30 : 1000 / 60;
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
    return () => {
      cancelAnimationFrame(raf);
      shot?.remove();
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchend", down);
      window.removeEventListener("touchcancel", down);
      gl.domElement.removeEventListener("webglcontextrestored", restart);
    };
  }, [advance, get, paused, still, drawnAt, size.width, size.height]);
  return null;
}
