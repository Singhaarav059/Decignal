"use client";

import { useEffect, useRef, useState } from "react";
import { getLenis } from "./SmoothScroll";

const PLATES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

/** Six systems stack into one while the stage loads, then the curtain lifts. */
export function Loader() {
  const [phase, setPhase] = useState<"load" | "leave" | "done">("load");
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("decignal:intro") === "1";
      sessionStorage.setItem("decignal:intro", "1");
    } catch {}
    if (reduce) {
      html.classList.add("ready");
      const t = window.setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(t);
    }

    getLenis()?.stop();
    const duration = seen ? 700 : 1700;
    const t0 = performance.now();
    let raf = 0;
    let finished = false;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (count.current) count.current.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (p < 1) raf = requestAnimationFrame(tick);
      else finished = true;
    };
    raf = requestAnimationFrame(tick);

    const minTime = new Promise((r) => setTimeout(r, duration + 120));
    let leaveTimer = 0;
    Promise.all([minTime, document.fonts.ready]).then(() => {
      if (!finished && count.current) count.current.textContent = "100";
      setPhase("leave");
      html.classList.add("ready");
      getLenis()?.start();
      leaveTimer = window.setTimeout(() => setPhase("done"), 1100);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg"
      style={{
        clipPath: phase === "leave" ? "inset(0 0 100% 0)" : "inset(0 0 0 0)",
        transition: "clip-path 1000ms var(--ease-in-out-quart)",
      }}
      aria-hidden
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-7">
        {/* Six systems arrive, one by one */}
        <div className="flex gap-2.5" aria-hidden>
          {PLATES.map((c, i) => (
            <span
              key={c}
              className="loader-dot size-3.5 rounded-full"
              style={{ background: `var(--color-${c})`, animationDelay: `${i * 110}ms` }}
            />
          ))}
        </div>
        <p className="font-serif text-[30px] leading-none">decignal</p>
      </div>
      <div className="flex items-end justify-between px-6 pb-7 md:px-10 md:pb-9">
        <p className="eyebrow max-w-[30ch]">Decision intelligence for enterprises across India and Africa</p>
        <span ref={count} className="tabular font-serif text-[clamp(48px,7vw,96px)] leading-[0.8] tracking-[-0.022em]">
          000
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: "var(--spectrum)" }} />
      <style>{`
        .loader-dot { animation: dot-in 800ms var(--ease-out-expo) both; }
        @keyframes dot-in { from { opacity: 0; transform: translateY(14px) scale(0.4); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
