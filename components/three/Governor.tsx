"use client";

// The 3D's density on a weak device (lib/tier.ts "low"; a capable one never mounts this and stays at
// 2x). As on yuyafilmstudio.dev and tenpoundfeather.com: every animation plays the same, and only the
// pixels per frame change, from what the device actually manages. It reads the time between drawn
// frames; when the slowest of them fall under 50 fps it steps the density down a quarter, then checks
// the step helped. When the median frame is not 15% faster the GPU was not what held it back (script,
// the page's own paint), so the density goes back and stays. It steps up again only after a long
// smooth stretch and never back to the level that struggled until a minute has passed, so it cannot
// see-saw.
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { isTouch, resting } from "@/lib/pace";
import { deviceTier, softwareGL } from "@/lib/tier";

/** Lowest density: a CSS pixel per pixel. */
const FLOOR = 1;
const STEP = 0.25;
/** The slowest 15% of drawn frames above this (ms) is a device that cannot hold the density. */
const SLOW = 1000 / 50;
/** Every frame but the slowest 5% under this (ms) has room to spare. */
const SMOOTH = 1000 / 58;
/** Frames judged at once: at least, and at most (the oldest drop out). */
const MIN = 60;
const MAX = 90;
/** After the canvas mounts (shaders, first uploads) and after any change (a new buffer size), ms. */
const SETTLE = 3000;
/** A step up waits this long after a step down (ms); the level that struggled is retried after FORGET. */
const RISE = 12000;
const FORGET = 60000;
/** A step down is kept only when it made the median frame at least this much faster. */
const GAIN = 0.85;
/** A longer gap is a pause (out of sight, a tab away), not a slow frame (ms). */
const GAP = 100;

/** The canvas's `dpr` prop: its own on a capable device, the governor's on a weak one. The prop, not
 *  R3F's setDpr, carries the value, so a parent re-render cannot put the old density back. */
export function useGovernedDpr(base: number | [number, number]) {
  const low = useState(() => deviceTier() === "low")[0];
  const [dpr, setDpr] = useState<number | [number, number]>(() =>
    low && softwareGL() ? FLOOR : base,
  );
  return { dpr, govern: low ? setDpr : null };
}

type State = {
  pr: number;
  max: number;
  ceiling: number;
  /** A step down being judged: the density before it (0 when none), and its median frame. */
  from: number;
  before: number;
  locked: boolean;
  changedAt: number;
  droppedAt: number;
  times: number[];
  t: number;
  frame: number;
  drew: boolean;
};

/** `at`: the density the canvas has now; a governor mounted again (the explorer between plays) picks up
 *  from it instead of starting over at the top. */
export function Governor({ at, set }: { at: number | [number, number]; set: (dpr: number) => void }) {
  const gl = useThree((s) => s.gl);
  const st = useRef<State | null>(null);
  const touch = useRef(false);
  const start = useRef(at);
  useEffect(() => {
    touch.current = isTouch();
    const max = Math.max(FLOOR, Math.min(window.devicePixelRatio || 1, 2));
    const soft = softwareGL();
    const now = performance.now();
    st.current = {
      pr: soft ? FLOOR : typeof start.current === "number" ? start.current : max,
      max,
      ceiling: max,
      from: 0,
      before: 0,
      // A CPU-drawn canvas starts at the floor (useGovernedDpr) and has nowhere lower to go.
      locked: soft,
      changedAt: now,
      droppedAt: -1e9,
      times: [],
      t: now,
      frame: gl.info.render.frame,
      drew: false,
    };
  }, [gl]);

  // After the frame's draw (FrameGate is priority 1): whether this update drew anything, so the gap to
  // the next one is that draw's cost. A world at rest draws nothing and is not judged.
  useFrame(() => {
    const s = st.current;
    if (!s || s.max <= FLOOR) return;
    const now = performance.now();
    const gap = now - s.t;
    s.t = now;
    // A touch screen at rest draws at 30 on purpose (Pacer): only frames while it moves are judged.
    if (s.drew && gap < GAP && !(touch.current && resting(now))) {
      s.times.push(gap);
      if (s.times.length > MAX) s.times.shift();
    }
    const frame = gl.info.render.frame;
    s.drew = frame !== s.frame;
    s.frame = frame;

    if (now - s.droppedAt > FORGET) s.ceiling = s.max;
    if (s.times.length < MIN || now - s.changedAt < SETTLE) return;
    const sorted = [...s.times].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    const p50 = at(0.5);
    let next = s.pr;
    if (s.from) {
      // Judging the last step down: no real gain means the density was not the cost.
      if (p50 > s.before * GAIN) {
        next = s.from;
        s.locked = true;
      } else s.ceiling = s.from;
      s.from = 0;
    } else if (!s.locked && at(0.85) > SLOW && s.pr > FLOOR) {
      s.from = s.pr;
      s.before = p50;
      next = Math.max(FLOOR, s.pr - (p50 > 1000 / 30 ? 2 * STEP : STEP));
      s.droppedAt = now;
    } else if (at(0.95) < SMOOTH && s.pr + STEP < s.ceiling - 1e-6 && now - s.droppedAt > RISE) {
      next = Math.min(s.max, s.pr + STEP);
    }
    if (next === s.pr) return;
    s.pr = next;
    s.changedAt = now;
    s.times.length = 0;
    set(next);
  }, 2);
  return null;
}
