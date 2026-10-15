"use client";

import { useEffect, useRef, useState } from "react";
import { onSelect, select, store } from "@/lib/story";
import { toneVars } from "@/lib/tone";
import { STORY_UI } from "@/lib/copy";
import { SYSTEMS } from "../ui/systems";

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
    // Written only when the island has moved, so a still frame costs no style work.
    let lastD = "";

    const tick = () => {
      const p = rect || panel.current?.getBoundingClientRect();
      if (p && line.current && dot.current) {
        const { x, y } = store.anchor;
        const phone = window.innerWidth < 768;
        let d: string;
        if (phone) {
          // Phone: down into the sheet's top edge.
          const ex = Math.min(Math.max(x, p.left + 24), p.right - 24);
          const my = (y + p.top) / 2;
          d = `M${x},${y} L${x},${my} L${ex},${my} L${ex},${p.top}`;
        } else {
          // Desktop: up off the island first, across above the islands (clear of the nav), then into
          // the panel's top edge, or its left edge when the panel reaches higher than that line.
          const ty = Math.max(72, Math.min(y, p.top) - Math.min(110, window.innerHeight * 0.12));
          d =
            ty < p.top + 16
              ? `M${x},${y} L${x},${ty} L${p.left + 32},${ty} L${p.left + 32},${p.top}`
              : `M${x},${y} L${x},${ty} L${p.left},${ty}`;
        }
        if (d !== lastD) {
          lastD = d;
          line.current.setAttribute("d", d);
          dot.current.setAttribute("cx", String(x));
          dot.current.setAttribute("cy", String(y));
        }
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
      <svg className="island-leader" data-open={open ? "" : undefined} aria-hidden>
        <path ref={line} fill="none" stroke="var(--color-ink)" strokeWidth="1" />
        <circle ref={dot} r="3.5" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
      </svg>
      <div
        ref={panel}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-label={sys ? `${sys.name}: ${sys.full}` : undefined}
        data-open={open ? "" : undefined}
        className="island-panel"
        style={sys ? toneVars(sys.tone) : undefined}
      >
        {sys && (
          <>
            <div className="flex items-center justify-between">
              <p className="t-label tabular">
                {STORY_UI.source(shown + 1, N)}
              </p>
              <span className="t-label inline-flex items-center gap-1.5 whitespace-nowrap text-emerald-ink">
                <span className="size-1.5 rounded-full bg-current" />
                {sys.sync}
              </span>
            </div>

            <p className="t-title-card mt-3 max-md:mt-2">{sys.name}</p>
            <p className="t-small mt-1.5 text-ink-soft">
              {sys.full} · {sys.product}
            </p>

            <p className="t-small mt-4 text-ink-2 max-md:mt-2.5">{sys.role}</p>

            {/* The comparison that makes this system's fact matter */}
            <div className="mt-4 space-y-2.5">
              {sys.compare.map((c) => (
                <div key={c.label}>
                  <div className="t-small flex items-baseline justify-between">
                    <span className="text-ink-soft">{c.label}</span>
                    <span className="tabular font-semibold" style={c.risk ? { color: "var(--color-signal-ink)" } : undefined}>
                      {c.value}
                    </span>
                  </div>
                  <div className="mt-1 h-[5px] rounded-full bg-wash">
                    <div
                      className="spec-bar h-full rounded-full"
                      style={{ width: `${c.f * 100}%`, background: c.risk ? "var(--color-signal)" : "var(--tone)" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Phones keep the sheet short: the comparison carries the point, the field list waits for a larger screen. */}
            <p className="t-label mt-5 flex justify-between max-md:hidden">
              <span>{STORY_UI.readFor}</span>
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
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select((shown + N - 1) % N)} className="spec-nav t-small">
                <span aria-hidden>←</span> {prev.name}
              </button>
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select(-1)} className="spec-nav t-small" aria-label={STORY_UI.close}>
                {STORY_UI.close} <kbd className="kbd pointer-coarse:hidden">Esc</kbd>
              </button>
              <button type="button" tabIndex={open ? 0 : -1} onClick={() => select((shown + 1) % N)} className="spec-nav t-small">
                {next.name} <span aria-hidden>→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
