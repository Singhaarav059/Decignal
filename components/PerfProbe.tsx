"use client";

import { useEffect } from "react";

/** What the probe reports about the page's life before it runs: errors (the 3D's error boundary only
 *  logs them), lost WebGL contexts and long frames. Collected from hydration, so it sees the 3D mount. */
export type ProbeLog = { errors: string[]; lost: number; restored: number; loaf: PerformanceEntry[] };

/** The on-phone performance probe (lib/perf-probe.ts), loaded only when the page is opened with ?perf. */
export function PerfProbe() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("perf")) return;
    const log: ProbeLog = { errors: [], lost: 0, restored: 0, loaf: [] };
    const note = (s: string) => log.errors.length < 6 && log.errors.push(s.slice(0, 220));
    const error = console.error;
    console.error = (...a: unknown[]) => {
      note(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : String(x))).join(" "));
      error.apply(console, a);
    };
    const onError = (e: ErrorEvent) => note(`error: ${e.message}`);
    const onLost = () => log.lost++;
    const onRestored = () => log.restored++;
    window.addEventListener("error", onError);
    document.addEventListener("webglcontextlost", onLost, true);
    document.addEventListener("webglcontextrestored", onRestored, true);
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (log.loaf.length < 4000) log.loaf.push(e);
      });
      po.observe({ type: "long-animation-frame", buffered: true });
    } catch {
      // No long-animation-frame timing in this browser: the probe says so.
    }
    let stop: (() => void) | undefined;
    let live = true;
    void import("@/lib/perf-probe").then((m) => {
      if (live) stop = m.startProbe(log);
    });
    return () => {
      live = false;
      stop?.();
      console.error = error;
      window.removeEventListener("error", onError);
      document.removeEventListener("webglcontextlost", onLost, true);
      document.removeEventListener("webglcontextrestored", onRestored, true);
      po?.disconnect();
    };
  }, []);
  return null;
}
