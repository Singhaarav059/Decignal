"use client";

import { useEffect, useRef } from "react";
import { SKY_KEYS, bgAt, skyWeights } from "@/lib/scene";
import { store, subscribe } from "@/lib/story";
import { flow, onSky, skyG } from "@/lib/flow";

const rgb = (g: number) => `rgb(${bgAt(g).join(" ")})`;

/**
 * The sky behind the stage: the chapter's pale solid (the same colour as the 3D fog, eased with the
 * scroll) and each chapter's field over it, soft blooms and film grain (fields.css). The fields
 * cross-fade by opacity only, so the scroll never repaints them; a field at zero is hidden.
 */
export function Backdrop() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fields = new Map<string, HTMLElement>();
    el.current?.querySelectorAll<HTMLElement>("[data-sky]").forEach((f) => fields.set(f.dataset.sky!, f));
    let last = "";
    const shown = new Map<string, number>();
    const paint = (g: number) => {
      const c = rgb(g);
      if (c !== last && el.current) el.current.style.backgroundColor = last = c;
      const w = skyWeights(g);
      for (const k of SKY_KEYS) {
        const o = Math.round(w[k] * 1000) / 1000;
        const f = fields.get(k);
        if (!f || shown.get(k) === o) continue;
        shown.set(k, o);
        f.style.opacity = String(o);
        f.style.visibility = o > 0 ? "visible" : "hidden";
      }
    };
    // The flowing phone story paints the sky from its own blended position (lib/flow.ts setSky).
    paint(flow.on ? skyG() : store.g);
    const offStory = subscribe((g) => !flow.on && paint(g));
    const offSky = onSky((g) => flow.on && paint(g));
    return () => {
      offStory();
      offSky();
    };
  }, []);
  const start = skyWeights(0);
  return (
    <div ref={el} className="backdrop pointer-events-none fixed inset-0 -z-10" style={{ backgroundColor: rgb(0) }} aria-hidden>
      {SKY_KEYS.map((k) => (
        <div key={k} className="backdrop-field" data-sky={k} style={{ opacity: start[k], visibility: start[k] > 0 ? "visible" : "hidden" }} />
      ))}
    </div>
  );
}
