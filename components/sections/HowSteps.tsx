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

  // A sheet's route leg draws once the sheet is on screen (a class, not a view timeline: the sheets stick).
  useEffect(() => {
    const sheets = root.current?.querySelectorAll<HTMLElement>(".how-sheet");
    if (!sheets) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.5 },
    );
    sheets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="how-steps">
      <div className="page-wrap how-top">
        {head}
        {/* The promise: a panel of its own so it isn't read as a footnote. */}
        <div className="how-timing">
          <p className="how-timing-lead">{PATHS.timing.lead}</p>
          <ul className="how-timing-list">
            {PATHS.timing.items.map((t) => (
              <li key={t}>
                <Check size={15} strokeWidth={2.6} aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
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
                    {/* The step as a ledger: who is in it, what it looks at, what it hands over. */}
                    <dl className="how-ledger">
                      <div>
                        <dt>{HOW.ledger.people}</dt>
                        <dd>{x.people}</dd>
                      </div>
                      <div>
                        <dt>{HOW.ledger.inputs}</dt>
                        <dd>{x.inputs}</dd>
                      </div>
                      <div className="how-ledger-out">
                        <dt>{HOW.youGet}</dt>
                        <dd>
                          <Check size={18} strokeWidth={2.6} aria-hidden />
                          {x.deliverable}
                        </dd>
                      </div>
                    </dl>
                    {/* The whole route at the foot of the words: steps behind are ticked, this one is lit
                        and its leg draws in as the sheet arrives. */}
                    <ol className="how-track" aria-label={HOW.track}>
                      {steps.map((s, j) => (
                        <li
                          key={j}
                          className={j < i ? "is-done" : j === i ? "is-now" : undefined}
                          aria-current={j === i ? "step" : undefined}
                        >
                          <i aria-hidden>{j < i && <Check size={11} strokeWidth={3} />}</i>
                          <span>{s.title}</span>
                        </li>
                      ))}
                    </ol>
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
