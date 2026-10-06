"use client";

import { useEffect, useRef, useState } from "react";
import { onSelect, select, store } from "@/lib/story";
import { SYSTEMS, tone } from "../ui/systems";

const N = SYSTEMS.length;

/** An opened system: a spec sheet tied to its island by a leader line. */
export function IslandPanel() {
  const [i, setI] = useState(-1);
  // Keep the last system on screen while the panel animates out.
  const [shown, setShown] = useState(-1);
  const panel = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);

  useEffect(
    () =>
      onSelect((n) => {
        setI(n);
        if (n >= 0) setShown(n);
      }),
    [],
  );

  // Arrow keys step through the systems while one is open.
  useEffect(() => {
    if (i < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") select((i + 1) % N);
      if (e.key === "ArrowLeft") select((i + N - 1) % N);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]);

  // The leader line follows the island as the camera settles and the island floats.
  useEffect(() => {
    if (i < 0) return;
    let raf = 0;
    let rect = panel.current?.getBoundingClientRect();
    const updateRect = () => { rect = panel.current?.getBoundingClientRect(); };
    window.addEventListener("resize", updateRect, { passive: true });
    window.addEventListener("scroll", updateRect, { passive: true });
    const timer = setTimeout(updateRect, 350);

    const tick = () => {
      const p = rect || panel.current?.getBoundingClientRect();
      if (p && line.current && dot.current) {
        const { x, y } = store.anchor;
        const phone = window.innerWidth < 768;
        // Desktop: into the panel's left edge. Phone: into its top edge.
        const ex = phone ? Math.min(Math.max(x, p.left + 24), p.right - 24) : p.left;
        const ey = phone ? p.top : Math.min(Math.max(y, p.top + 40), p.bottom - 40);
        const mx = x + (ex - x) * 0.55;
        line.current.setAttribute(
          "d",
          phone ? `M${x},${y} L${x},${(y + ey) / 2} L${ex},${(y + ey) / 2} L${ex},${ey}` : `M${x},${y} L${mx},${y} L${mx},${ey} L${ex},${ey}`,
        );
        dot.current.setAttribute("cx", String(x));
        dot.current.setAttribute("cy", String(y));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [i]);

  const sys = SYSTEMS[shown];
  const open = i >= 0;
  const prev = SYSTEMS[(shown + N - 1) % N];
  const next = SYSTEMS[(shown + 1) % N];
  return (
    <>
      <svg className="island-leader" data-open={open ? "" : undefined} aria-hidden style={sys ? { color: tone(sys.tone) } : undefined}>
        <path ref={line} fill="none" stroke="currentColor" strokeWidth="1.25" />
        <circle ref={dot} r="4" fill="var(--color-paper)" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div
        ref={panel}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-label={sys ? `${sys.name}: ${sys.full}` : undefined}
        data-open={open ? "" : undefined}
        className="island-panel"
        style={sys ? ({ "--tone": tone(sys.tone) } as React.CSSProperties) : undefined}
      >
        {sys && (
          <>
            <div className="flex items-center justify-between">
              <p className="spec-label tabular">
                Source {String(shown + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
              </p>
              <span className="spec-label inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: "var(--color-emerald)" }}>
                <span className="size-1.5 rounded-full bg-current" />
                Synced {sys.sync}
              </span>
            </div>

            <p className="mt-3 text-[30px] font-semibold max-md:mt-2 max-md:text-[24px] leading-none tracking-[-0.03em]">{sys.name}</p>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              {sys.full} · {sys.product}
            </p>

            <p className="mt-4 text-[13.5px] leading-[1.5] text-ink-2 max-md:mt-2.5 max-md:text-[13px]">{sys.role}</p>

            {/* The comparison that makes this system's fact matter */}
            <div className="mt-4 space-y-2.5">
              {sys.compare.map((c) => (
                <div key={c.label}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="text-ink-soft">{c.label}</span>
                    <span className="tabular font-semibold" style={c.risk ? { color: "var(--color-signal)" } : undefined}>
                      {c.value}
                    </span>
                  </div>
                  <div className="mt-1 h-[5px] rounded-full bg-ink/[0.06]">
                    <div
                      className="spec-bar h-full rounded-full"
                      style={{ width: `${c.f * 100}%`, background: c.risk ? "var(--color-signal)" : "var(--tone)" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Phones keep the sheet short: the comparison carries the point, the field list waits for a larger screen. */}
            <p className="spec-label mt-5 flex justify-between max-md:hidden">
              <span>Read for this decision</span>
              <span className="tabular">of {sys.records}</span>
            </p>
            <dl className="mt-1.5 max-md:hidden">
              {sys.reads.map(([k, v]) => (
                <div key={k} className="spec-row">
                  <dt>{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select((shown + N - 1) % N)} className="spec-nav">
                <span aria-hidden>←</span> {prev.name}
              </button>
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select(-1)} className="spec-nav" aria-label="Close">
                Close <kbd className="kbd pointer-coarse:hidden">Esc</kbd>
              </button>
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select((shown + 1) % N)} className="spec-nav">
                {next.name} <span aria-hidden>→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
