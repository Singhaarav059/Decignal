"use client";

// Shared story actor pieces: the chapter-pose blend (useActor/Actor) and the Rise entrance.
// Labels on the actors are page text: see ../ScreenTag.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { easing } from "maath";
import { blendAt, clamp01, smootherstep, smoothstep, store } from "@/lib/story";
import { type Pose, type Vec3 } from "@/lib/scene";
import { hero } from "@/lib/hero-video";

/* ------------------------------------------------------------------ */
/* Actor: blends between its chapter poses; scales in and out of scenes */
/* ------------------------------------------------------------------ */

/** A small overshoot, kept for UI-sized things only (opt in with overshoot). */
const backOut = (x: number) => {
  const c = 0.65;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const tmpV = new THREE.Vector3();

let motionQuery: MediaQueryList | null = null;
/** Reduced motion: hand-offs cut at the midpoint and settle, as the camera does. */
export const reducedMotion = () => {
  if (typeof window === "undefined") return false;
  motionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return motionQuery.matches;
};

export type Track = (c: number, t: number) => Pose | null;
/** Where an actor travels to as it leaves chapter c, instead of shrinking in place. */
type Exit = (c: number) => Vec3 | null;
/**
 * How an actor enters a chapter it was absent from:
 * - rise: comes up into place as it grows (the default);
 * - drop: falls into place from above, as stock lands on a stack;
 * - build: grows up out of the ground (height only), as a building goes up.
 * `leave: "build"` takes it back down into the ground the same way.
 */
type ActorOpts = {
  arrive?: "rise" | "drop" | "build";
  leave?: "shrink" | "build";
  overshoot?: boolean;
  /** The stretch of the hand-off blend (e) over which it arrives in chapter c, instead of arriveK's. */
  enter?: (c: number) => readonly [number, number] | null;
};

/** Arrival progress for an actor entering with blend e, staggered by delay. */
export const arriveK = (e: number, delay: number) => clamp01((e - 0.25 - delay) / (0.75 - delay));

export function useActor(ref: React.RefObject<THREE.Group | null>, track: Track, delay = 0, damp = 0.1, exit?: Exit, opts?: ActorOpts) {
  const goal = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 0, sy: 1 }), []);
  const ready = useRef(false);
  const ys = useRef(1);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { i, j, local, e: raw } = blendAt(store.g);
    // Reduced motion: the hand-off cuts at its midpoint; damping settles it.
    const e = reducedMotion() ? (raw < 0.5 ? 0 : 1) : raw;
    const A = track(i, local);
    const B = raw > 0 && j !== i ? track(j, 0) : null;
    let rx = 0;
    let ry = 0;
    goal.sy = 1;
    if (A && B && B.s === 0) {
      // Folding into the next chapter's subject: travel to it and shrink into it.
      const k = clamp01(e / (1 - delay * 0.5));
      goal.p.set(...A.p).lerp(tmpV.set(...B.p), smootherstep(0, 0.85, k));
      rx = A.rx ?? 0;
      ry = A.ry ?? 0;
      goal.s = (A.s ?? 1) * (1 - smoothstep(0.35, 0.9, k));
    } else if (A && B && A.s === 0) {
      // Growing out of the previous chapter's subject (the same hand-off, scrolled back).
      const k = clamp01((e - delay * 0.5) / (1 - delay * 0.5));
      goal.p.set(...A.p).lerp(tmpV.set(...B.p), smootherstep(0.15, 1, k));
      rx = B.rx ?? 0;
      ry = B.ry ?? 0;
      goal.s = (B.s ?? 1) * smoothstep(0.1, 0.65, k);
    } else if (A && B) {
      goal.p.set(...A.p).lerp(tmpV.set(...B.p), e);
      rx = THREE.MathUtils.lerp(A.rx ?? 0, B.rx ?? 0, e);
      ry = THREE.MathUtils.lerp(A.ry ?? 0, B.ry ?? 0, e);
      goal.s = THREE.MathUtils.lerp(A.s ?? 1, B.s ?? 1, e);
    } else if (A) {
      // Leaving: shrink away a little ahead of the next scene.
      const k = clamp01(e / (1 - delay * 0.5));
      const to = exit?.(i);
      goal.p.set(...A.p);
      rx = A.rx ?? 0;
      ry = A.ry ?? 0;
      if (to) {
        // Converging: travel to the target and fold into it, so the hand-off reads as cause and effect.
        goal.p.lerp(tmpV.set(...to), smootherstep(0, 0.85, k));
        goal.s = (A.s ?? 1) * (1 - smoothstep(0.35, 0.9, k));
      } else if (opts?.leave === "build") {
        goal.s = A.s ?? 1;
        goal.sy = 1 - smoothstep(0.05, 0.75, k);
      } else goal.s = (A.s ?? 1) * (1 - smoothstep(0, 0.7, k));
    } else if (B) {
      const win = opts?.enter?.(j);
      const k = win ? clamp01((e - win[0]) / (win[1] - win[0])) : arriveK(e, delay);
      goal.p.set(...B.p);
      rx = B.rx ?? 0;
      ry = B.ry ?? 0;
      const mode = opts?.arrive ?? "rise";
      if (mode === "drop") {
        // Falls the last stretch onto its stack, growing in as it comes into sight.
        goal.p.y += (1 - easeOut(k)) * 0.7;
        goal.s = (B.s ?? 1) * smoothstep(0, 0.45, k);
      } else if (mode === "build") {
        goal.s = B.s ?? 1;
        goal.sy = smootherstep(0, 1, k);
      } else {
        // Rises into place as it grows; no overshoot unless asked for (UI-sized things only).
        goal.p.y -= (1 - k) * 0.25;
        goal.s = (B.s ?? 1) * (k > 0 ? (opts?.overshoot ? backOut(k) : smootherstep(0, 1, k)) : 0);
      }
    } else {
      goal.s = 0;
    }
    goal.q.setFromEuler(euler.set(rx, ry, 0, "YXZ"));
    const delta = Math.min(dt, 1 / 30);
    if (!ready.current) {
      g.position.copy(goal.p);
      g.quaternion.copy(goal.q);
      g.scale.set(goal.s, goal.s * goal.sy, goal.s);
      ys.current = goal.sy;
      ready.current = true;
    }
    easing.damp3(g.position, goal.p, damp, delta);
    easing.dampQ(g.quaternion, goal.q, damp, delta);
    const s = THREE.MathUtils.damp(g.scale.x, goal.s, 1 / damp, delta);
    ys.current = THREE.MathUtils.damp(ys.current, goal.sy, 1 / damp, delta);
    const y = Math.max(ys.current, 0.001);
    g.scale.set(s, s * y, s);
    g.visible = s > 0.002 && ys.current > 0.01;
  });
}

export function Actor({ track, delay, damp, exit, arrive, leave, overshoot, enter, children }: { track: Track; delay?: number; damp?: number; exit?: Exit; children: React.ReactNode } & ActorOpts) {
  const ref = useRef<THREE.Group>(null);
  const opts = useMemo(() => ({ arrive, leave, overshoot, enter }), [arrive, leave, overshoot, enter]);
  useActor(ref, track, delay, damp, exit, opts);
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

/**
 * Each system rises onto the stage after the loader lifts. Models stand on the ground; `float` opts in
 * to a slow bob. Progress counts this component's own frame time, not the scene clock: the clock
 * restarts from 0 whenever the render loop is switched on again, which would hold a rise back.
 * Taking over from the hero's film (lib/hero-video.ts), it starts as far risen as the film's islands.
 * Reduced motion: already in place.
 */
export function Rise({ delay, float = () => 0, onRise, children }: { delay: number; float?: () => number; onRise?: (k: number) => void; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(-1);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    if (age.current < 0) {
      if (!document.documentElement.classList.contains("ready")) {
        g.scale.setScalar(0.0001);
        onRise?.(0);
        return;
      }
      age.current = hero.rise ?? 0;
    }
    if (age.current < delay + 1.1) age.current += Math.min(dt, 0.1);
    const k = reducedMotion() ? 1 : clamp01((age.current - delay) / 1.1);
    onRise?.(k);
    // Eases up into place: no overshoot, so nothing pops past its size and back.
    g.scale.setScalar(Math.max(easeOut(k), 0.0001));
    g.position.y = -(1 - easeOut(k)) * 0.5 + Math.sin(clock.elapsedTime * 0.8 + delay * 9) * 0.03 * float();
  });
  return <group ref={ref}>{children}</group>;
}
