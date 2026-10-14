"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { PATHS } from "@/lib/content";
import { HOW } from "@/lib/copy";
import { jumpTo, onStep } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { StepArt } from "./StepArt";

type Route = keyof typeof PATHS;
const ROUTES = Object.keys(PATHS) as Route[];
/** Each sheet's solid: calm, distinct, never pink, ink or dark green (the earlier band feedback). The
 * field is the soft bloom and grain laid over it (fields.css). */
const SHEETS = [
  { bg: "var(--color-cobalt)", fg: "#fff", tone: "cobalt", field: "cobalt" },
  { bg: "var(--color-violet)", fg: "#fff", tone: "violet", field: "violet" },
  { bg: "var(--color-saffron)", fg: "var(--color-ink)", tone: "tangerine", field: "saffron" },
  { bg: "var(--color-night)", fg: "#fff", tone: "emerald", field: "night" },
];
const n2 = (i: number) => String(i + 1).padStart(2, "0");

/**
 * How it works as four numbered colour sheets (the Plinth steps): the head, then one full-width sheet
 * per step that slides up over the last as the page scrolls. Both routes read on every sheet, side by
 * side (a switch hid the catalogue route from anyone who only scrolled): custom on the left, the
 * catalogue on the right, each with its timing, sentence and what you get; the step's drawing sits on
 * a white plate and its number stands large in the corner. Below 900px the sheets simply stack.
 */
export function HowSteps({ head }: { head: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const steps = ROUTES.map((r) => PATHS[r].steps);

  // The nav's How it works glance brings a step's sheet to the top.
  useEffect(
    () =>
      onStep((i) => {
        const sheet = root.current?.querySelectorAll<HTMLElement>(".how-sheet")[i];
        if (!sheet) return void jumpTo("#how");
        const top = (root.current?.getBoundingClientRect().top ?? 0) + window.scrollY + sheet.offsetTop;
        void jumpTo(top - 84, { focus: false });
      }),
    [],
  );

  return (
    <div ref={root} className="how-steps">
      <div className="page-wrap how-top">
        {head}
        {/* The two routes, named once; every sheet below reads both. */}
        <ul className="how-legend" aria-label={HOW.routeAria}>
          {ROUTES.map((r, k) => (
            <li key={r}>
              <span className="how-legend-mark" data-k={k} aria-hidden />
              <span>
                <strong>{PATHS[r].label}</strong>
                <span className="t-small">{PATHS[r].total}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ol className="how-sheets">
        {steps[0].map((_, i) => {
          const sheet = SHEETS[i];
          return (
            <li key={i} className="how-sheet" data-field={sheet.field} style={{ ["--sheet" as string]: sheet.bg, ["--sheet-fg" as string]: sheet.fg, ["--i" as string]: i }}>
              <div className="how-sheet-inner">
                <div className="how-sheet-head">
                  <p className="t-label how-when">{HOW.stepWord} {n2(i)}</p>
                  <p className="how-n tabular" aria-hidden>{n2(i)}</p>
                </div>
                <div className="how-sheet-body">
                  {ROUTES.map((r, k) => {
                    const x = steps[k][i];
                    return (
                      <div key={r} className="how-route">
                        <p className="how-route-label t-label">
                          <span className="how-legend-mark" data-k={k} aria-hidden />
                          <span>
                            {PATHS[r].label} <span aria-hidden>·</span>{" "}
                            <span className="whitespace-nowrap">{x.when}</span>
                          </span>
                        </p>
                        <h3 className="how-sheet-title">{x.title}.</h3>
                        <p className="how-text">{x.text}</p>
                        <ul className="how-deliver" aria-label={HOW.youGet}>
                          {HOW.delivers[r][i].map((d) => (
                            <li key={d}>
                              <Check size={15} strokeWidth={2.6} aria-hidden />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  <div className="how-plate" style={toneVars(sheet.tone)}>
                    <StepArt index={i} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
