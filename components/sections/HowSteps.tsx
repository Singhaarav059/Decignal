"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { PATHS } from "@/lib/content";
import { HOW } from "@/lib/copy";
import { jumpTo, onStep } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { StepArt } from "./StepArt";

/** Each sheet's solid: calm, distinct, never pink, ink or dark green (the earlier band feedback). The
 * field is the soft bloom and grain laid over it (fields.css). */
const SHEETS = [
  { bg: "var(--color-cobalt)", fg: "#fff", tone: "cobalt", field: "cobalt" },
  // The deeper violet: the sheet's small white labels read at AA on it (tokens.css).
  { bg: "var(--color-violet-deep)", fg: "#fff", tone: "violet", field: "violet" },
  { bg: "var(--color-saffron)", fg: "var(--color-ink)", tone: "tangerine", field: "saffron" },
  { bg: "var(--color-night)", fg: "#fff", tone: "emerald", field: "night" },
];

/**
 * How we work as four colour sheets (the Plinth steps): the head, then one full-width sheet per step
 * that slides up over the last as the page scrolls. Each sheet reads the step, its sentence and its
 * deliverable (handoff home.delivery); no durations. The step's drawing sits on a white plate and its
 * place in the order stands large in the corner. Below 900px the sheets simply stack.
 */
export function HowSteps({ head }: { head: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const steps = PATHS.steps;

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
        <p className="t-small how-timing">{PATHS.timing}</p>
      </div>
      <ol className="how-sheets">
        {steps.map((x, i) => {
          const sheet = SHEETS[i];
          return (
            <li key={i} className="how-sheet" data-field={sheet.field} style={{ ["--sheet" as string]: sheet.bg, ["--sheet-fg" as string]: sheet.fg, ["--i" as string]: i }}>
              <div className="how-sheet-inner">
                <div className="how-sheet-head">
                  <p className="how-n">{HOW.stepWords[i]}</p>
                </div>
                <div className="how-sheet-body">
                  <div className="how-route">
                    <h3 className="how-sheet-title">{x.title}.</h3>
                    <p className="how-text">{x.text}</p>
                    <p className="how-route-label t-label">{HOW.youGet}</p>
                    <ul className="how-deliver" aria-label={HOW.youGet}>
                      <li>
                        <Check size={15} strokeWidth={2.6} aria-hidden />
                        {x.deliverable}
                      </li>
                    </ul>
                  </div>
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
