"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { canvasQuality } from "@/lib/device";
import { probe, resting } from "@/lib/pace";

/** Adjust pixel cost, never scene content. Measure wall-clock spacing while the
 *  reader interacts, ignoring capped ambient updates, uploads, and tab restores.
 *  Hysteresis keeps the canvas from repeatedly reallocating at the threshold. */
export function AdaptiveQuality() {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const sample = useRef({ last: 0, count: 0, total: 0, changed: 0 });
  useEffect(() => {
    let width = window.innerWidth;
    const reset = () => {
      sample.current = { last: 0, count: 0, total: 0, changed: performance.now() };
      setDpr(canvasQuality().dpr);
    };
    const resize = () => {
      // Mobile browser bars change height during scrolling. Keep the measured
      // budget then; only a width change (rotation/breakpoint) starts it afresh.
      if (width === window.innerWidth) return;
      width = window.innerWidth;
      reset();
    };
    probe.dprSetters.add(setDpr);
    window.addEventListener("resize", resize, { passive: true });
    gl.domElement.addEventListener("webglcontextrestored", reset);
    return () => {
      probe.dprSetters.delete(setDpr);
      window.removeEventListener("resize", resize);
      gl.domElement.removeEventListener("webglcontextrestored", reset);
    };
  }, [gl, setDpr]);
  useFrame(() => {
    const now = performance.now();
    const s = sample.current;
    const dt = now - s.last;
    s.last = now;
    const density = gl.getPixelRatio().toFixed(2);
    if (gl.domElement.dataset.dpr !== density) gl.domElement.dataset.dpr = density;
    if (document.hidden || resting(now) || dt > 250 || now - s.changed < 3000) {
      s.count = s.total = 0;
      return;
    }
    s.total += dt;
    if (++s.count < 90) return;
    const mean = s.total / s.count;
    s.count = s.total = 0;
    const current = gl.getPixelRatio();
    const cap = Math.min(window.devicePixelRatio || 1, canvasQuality().dpr[1]);
    const next = mean > 23 ? Math.max(1, current - 0.25)
      : mean < 18 && now - s.changed > 10000 ? Math.min(cap, current + 0.25) : current;
    if (next !== current) {
      s.changed = now;
      setDpr(next);
    }
  });
  return null;
}
