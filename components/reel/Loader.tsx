"use client";

// The original opening, restored: six systems arrive one by one while the count runs to 100, then
// the curtain lifts off the bay. It holds the scroll until it lifts, waits for the fonts, and is
// shorter on a return visit in the same session. Reduced motion skips it.
import { useEffect, useRef, useState } from "react";
import { getLenis } from "../SmoothScroll";

const TONES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

export function Loader() {
  const [phase, setPhase] = useState<"load" | "leave" | "done">("load");
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      html.classList.add("ready");
      const t = window.setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(t);
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem("decignal:intro") === "1";
      sessionStorage.setItem("decignal:intro", "1");
    } catch {}
    getLenis()?.stop();
    const duration = seen ? 700 : 1700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      // Runs to 92 on its own; the last stretch to 100 waits for the bay to be drawn.
      const p = Math.min((t - t0) / duration, 1);
      if (count.current) count.current.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 92)).padStart(3, "0");
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    let leave = 0;
    let alive = true;
    // The bay's first frame, or a ceiling so a slow device is never held behind the curtain.
    const drawn = new Promise<void>((r) => {
      if (html.dataset.world === "drawn") return r();
      window.addEventListener("world-drawn", () => r(), { once: true });
      setTimeout(r, 8000);
    });
    Promise.all([new Promise((r) => setTimeout(r, duration + 120)), document.fonts.ready, drawn]).then(() => {
      if (!alive) return;
      if (count.current) count.current.textContent = "100";
      setPhase("leave");
      html.classList.add("ready");
      getLenis()?.start();
      leave = window.setTimeout(() => setPhase("done"), 1100);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(leave);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div className="r-loader" data-phase={phase} aria-hidden>
      <div className="r-loader-mid">
        <div className="r-loader-dots">
          {TONES.map((t, i) => (
            <span key={t} style={{ "--tone": `var(--color-${t})`, "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <p className="r-loader-name">decignal</p>
      </div>
      <div className="r-loader-foot">
        <p className="r-eyebrow">Decision intelligence for enterprises across India and Africa</p>
        <span ref={count} className="r-loader-count">
          000
        </span>
      </div>
      {/* Six solid bands, one per system, in place of the old spectrum gradient */}
      <div className="r-loader-bar">
        {TONES.map((t) => (
          <i key={t} style={{ "--tone": `var(--color-${t})` } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
