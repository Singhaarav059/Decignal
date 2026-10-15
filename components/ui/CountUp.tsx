"use client";

import { useEffect, useRef, useState } from "react";

const NUM = /(\d[\d,]*)/;
const format = (n: number, sample: string) => (sample.includes(",") ? Math.round(n).toLocaleString("en-US") : String(Math.round(n)));

/**
 * Renders `value` and counts its numeric parts up whenever `play` turns true
 * or the value changes while playing. Text parts stay fixed, so the final
 * string is always the source string; reduced motion shows it immediately.
 */
export function CountUp({ value, play = true, duration = 900 }: { value: string; play?: boolean; duration?: number }) {
  // Each frame of the count writes the text node directly: as React state, every frame re-rendered the
  // component in the middle of the explorer's scroll, on the main thread a phone needs for the page.
  const out = useRef<HTMLSpanElement>(null);
  const from = useRef<string | null>(null);
  // The first value only: later renders hand React the same text, so it never rewrites what the count shows.
  const [first] = useState(value);
  useEffect(() => {
    const el = out.current;
    if (!el) return;
    const show = (text: string) => {
      if (el.textContent !== text) el.textContent = text;
    };
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (!play || still) {
      const text = play || still ? value : value.replace(/\d[\d,]*/g, "0");
      raf = requestAnimationFrame(() => show(text));
      return () => cancelAnimationFrame(raf);
    }
    const parts = value.split(NUM);
    const prev = (from.current ?? "").split(NUM);
    from.current = value;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 4);
      show(parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const to = Number(p.replace(/,/g, ""));
        const start = prev[i] && prev.length === parts.length ? Number(prev[i].replace(/,/g, "")) : 0;
        return format(start + (to - start) * e, p);
      }).join(""));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play, duration]);
  return <><span className="sr-only">{value}</span><span ref={out} aria-hidden className="tabular-nums">{first}</span></>;
}
