"use client";

import { useEffect } from "react";

/** The on-phone performance probe (lib/perf-probe.ts), loaded only when the page is opened with ?perf. */
export function PerfProbe() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("perf")) return;
    let stop: (() => void) | undefined;
    let live = true;
    void import("@/lib/perf-probe").then((m) => {
      if (live) stop = m.startProbe();
    });
    return () => {
      live = false;
      stop?.();
    };
  }, []);
  return null;
}
