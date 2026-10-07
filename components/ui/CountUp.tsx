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
  const [shown, setShown] = useState(value);
  const from = useRef<string | null>(null);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (!play || still) {
      const text = play || still ? value : value.replace(/\d[\d,]*/g, "0");
      raf = requestAnimationFrame(() => setShown(text));
      return () => cancelAnimationFrame(raf);
    }
    const parts = value.split(NUM);
    const prev = (from.current ?? "").split(NUM);
    from.current = value;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 4);
      setShown(parts.map((p, i) => {
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
  return <><span className="sr-only">{value}</span><span aria-hidden className="tabular-nums">{shown}</span></>;
}
