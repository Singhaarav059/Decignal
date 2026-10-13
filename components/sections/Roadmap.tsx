"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PATHS } from "@/lib/content";
import { HOW } from "@/lib/copy";
import { jumpTo, onStep } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import SegmentedControl from "../ui/SegmentedControl";
import { StepArt } from "./StepArt";

type Route = keyof typeof PATHS;

/** Each step's drawing colour. The step numbers and labels stay neutral (D6). */
const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];
const ROUTES = Object.keys(PATHS) as Route[];
const n2 = (i: number) => String(i + 1).padStart(2, "0");

/** What each step delivers, as a checked list. */
function Delivers({ items }: { items: readonly string[] }) {
  return (
    <ul className="road-deliver">
      {items.map((d) => <li key={d}><Check size={14} strokeWidth={2.6} aria-hidden />{d}</li>)}
    </ul>
  );
}

/**
 * How it works. Wide screens pin one panel for 260svh and scroll walks steps 01 to 04: a numbered
 * rail on the left (a neutral pill slides to the current row), then the current step: its number,
 * title, sentence and what you get beside its drawing. The four steps stay mounted and crossfade, so
 * a step change never blanks the panel; the drawing draws itself on as it arrives. Phones read the
 * four steps as cards, each with its drawing. The route switch is a selector pill.
 */
export function Roadmap({ head }: { head?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const [path, setPath] = useState<Route>("custom");
  const [step, setStep] = useState(0);
  // The pin only exists on wide screens; the chrome store keeps the nav up while it holds (D13).
  const [pinned, setPinned] = useState(false);
  const intro = useId();
  const panels = useId();
  const steps = PATHS[path].steps;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => {
        setStep(Math.min(3, Math.floor(s.progress * 4)));
        // The rail's fill follows every scroll frame: write it directly instead of re-rendering.
        rail.current?.style.setProperty("--p", s.progress.toFixed(4));
      },
    });
    return () => st.kill();
  }, []);

  // The rail's pill sits behind the current row; rows wrap differently per route and width.
  useEffect(() => {
    const ol = rail.current;
    const wrap = ol?.parentElement;
    if (!ol || !wrap || !pinned) return;
    const place = () => {
      const li = ol.children[step] as HTMLElement | undefined;
      if (!li) return;
      wrap.style.setProperty("--hl-y", `${li.offsetTop}px`);
      wrap.style.setProperty("--hl-h", `${li.offsetHeight}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(ol);
    return () => ro.disconnect();
  }, [step, path, pinned]);

  const go = (i: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    void jumpTo(top + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / 4), { focus: false });
  };

  // The nav's How it works glance walks straight to a step. Phones read the steps as a list.
  useEffect(() => onStep((i) => (window.matchMedia("(min-width: 900px)").matches ? go(i) : void jumpTo("#how"))), []);

  const toggle = (
    <div className="road-route" role="group" aria-label={HOW.routeAria} aria-describedby={intro}>
      <SegmentedControl
        label={HOW.routeAria}
        items={ROUTES.map((k) => ({ value: k, label: PATHS[k].label, controls: `${panels}-stage ${panels}-list` }))}
        value={path}
        onChange={setPath}
        variant="selector"
      />
      <p id={intro} className="sr-only">{PATHS[path].intro}</p>
    </div>
  );

  const s = steps[step];
  return (
    <div ref={root} className="roadmap" data-pin={pinned ? "" : undefined}>
      {/* Phones: the head and the route switch, then the steps as cards. Wide screens: one pinned stage. */}
      <div className="roadmap-stage">
        <div className="roadmap-top">
          {head}
          {toggle}
        </div>
        <div className="roadmap-panel" id={`${panels}-stage`}>
          <div className="road-rail">
            <span className="road-hl" aria-hidden />
            <ol ref={rail} className="roadmap-list">
              {steps.map((x, i) => (
                <li key={x.title} data-state={i < step ? "done" : i === step ? "now" : "next"}>
                  <button onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                    <span className="road-n t-num-md">{n2(i)}</span>
                    <span className="road-row-text">
                      <strong>{x.title}</strong>
                      <small className="t-label">{x.when}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="roadmap-step">
            {/* A stable live region announces the step; the four bodies below stay mounted and crossfade. */}
            <p className="sr-only" aria-live="polite">{`${HOW.stepLabel(s.when, PATHS[path].total)}. ${s.title}. ${s.text}`}</p>
            {steps.map((x, i) => {
              const on = i === step;
              return (
                <div
                  key={i}
                  className="road-step-body"
                  data-on={on || undefined}
                  aria-hidden={!on || undefined}
                  inert={!on}
                  style={toneVars(STEP_TONES[i])}
                >
                  {/* Keyed by route: switching routes replays the copy's rise. */}
                  <div className="road-copy" key={`c-${path}`}>
                    <p className="road-numeral t-num-lg" aria-hidden>{n2(i)}</p>
                    <p className="t-label road-when">{HOW.stepLabel(x.when, PATHS[path].total)}</p>
                    <h3 className="t-title-card">{x.title}</h3>
                    <p className="t-lede road-text">{x.text}</p>
                  </div>
                  <div className="road-gets-block" key={`g-${path}`}>
                    <p className="t-label road-gets">{HOW.youGet}</p>
                    <Delivers items={HOW.delivers[path][i]} />
                  </div>
                  <div className="road-art">
                    <StepArt index={i} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ol className="roadmap-mobile" id={`${panels}-list`}>
        {steps.map((x, i) => (
          <li key={x.title} className="road-card" style={toneVars(STEP_TONES[i])}>
            <StepArt index={i} />
            <p className="road-numeral t-num-md" aria-hidden>{n2(i)}</p>
            <p className="t-label road-when">{HOW.stepLabel(x.when, PATHS[path].total)}</p>
            <h3 className="t-subtitle">{x.title}</h3>
            <p className="t-body road-text">{x.text}</p>
            <p className="t-label road-gets">{HOW.youGet}</p>
            <Delivers items={HOW.delivers[path][i]} />
          </li>
        ))}
      </ol>
    </div>
  );
}
