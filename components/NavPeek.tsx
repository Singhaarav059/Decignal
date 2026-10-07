"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  CalendarClock,
  CheckCheck,
  Database,
  Factory,
  Layers,
  Lock,
  Radar,
  ScanSearch,
  ShieldCheck,
  TrendingDown,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, FAQ, OUTCOMES, PATHS } from "@/lib/content";
import { CHAPTERS, subscribe } from "@/lib/story";
import { showOutcome, showQuestion, showStep } from "@/lib/jump";
import { showArea } from "./sections/GrowlioSections";
import { goToChapter, toneVar } from "./story/chapters";
import { scrollToTarget } from "./SmoothScroll";

export type PeekId = "apps" | "outcomes" | "how" | "faq" | "story";

/** What each section is, in one line: the glance's side card and the phone menu both use it. */
export const PEEKS: Record<Exclude<PeekId, "story">, { blurb: string; tone: string; href: string }> = {
  apps: { blurb: "Eight applications across five business areas.", tone: "cobalt", href: "#applications" },
  outcomes: { blurb: "What changed, and why it matters.", tone: "emerald", href: "#outcomes" },
  how: { blurb: "One decision first, live in weeks.", tone: "violet", href: "#how" },
  faq: { blurb: "What enterprise teams ask first.", tone: "tangerine", href: "#faq" },
};

const ORDER: PeekId[] = ["story", "apps", "outcomes", "how", "faq"];
const OUTCOME_TONES = ["cobalt", "tangerine", "emerald"];
const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];
const FAQ_ICONS: [LucideIcon, string][] = [[Layers, "cobalt"], [Database, "saffron"], [Lock, "violet"], [Bot, "emerald"], [CalendarClock, "emerald"]];
const FAQ_PICK = [0, 1, 2, 3, 7];

/** The section glances under the nav. One panel morphs between them: its height follows the open
 *  glance, the content slides in from the side the pointer came from, and a caret tracks the link. */
export function NavPeek({
  peek,
  caret,
  onEnter,
  onLeave,
  onDone,
}: {
  peek: PeekId | null;
  caret: number;
  onEnter: () => void;
  onLeave: () => void;
  onDone: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const panes = useRef<Partial<Record<PeekId, HTMLDivElement | null>>>({});
  const [h, setH] = useState(0);
  const [last, setLast] = useState<PeekId>("apps");
  const [dir, setDir] = useState(1);
  const [left, setLeft] = useState(0);

  if (peek && peek !== last) {
    setDir(ORDER.indexOf(peek) > ORDER.indexOf(last) ? 1 : -1);
    setLast(peek);
  }
  const shown = peek ?? last;

  // Height follows the open glance; the caret is placed in the panel's own coordinates.
  useLayoutEffect(() => {
    const el = panes.current[shown];
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);
  // Where the panel will rest (not where it is mid-glide): centred under the links, or under the
  // readout for the chapter list. The caret is placed relative to that.
  const wide = shown === "story";
  useLayoutEffect(() => {
    const place = () => {
      const vw = document.documentElement.clientWidth;
      const w = Math.min(wide ? 840 : 780, vw - 40);
      setLeft(wide ? Math.max(20, (vw - 1180) / 2) : (vw - w) / 2);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [wide]);

  const act = (fn: () => void) => () => {
    onDone();
    fn();
  };
  const tone = shown === "story" ? "ink" : PEEKS[shown].tone;

  return (
    <div
      ref={panel}
      className="nav-peek hidden lg:block"
      data-open={peek ? "" : undefined}
      data-wide={wide || undefined}
      style={{ left, ["--h" as string]: `${h}px`, ["--caret" as string]: `${caret - left}px`, ["--tone" as string]: `var(--color-${tone})` }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      inert={!peek}
    >
      <i className="nav-peek-caret" aria-hidden />
      <div className="nav-peek-body">
        {ORDER.map((id) => (
          <div
            key={id}
            id={`peek-${id}`}
            ref={(n) => {
              panes.current[id] = n;
            }}
            className="nav-peek-pane"
            data-on={id === shown || undefined}
            data-from={id === shown ? undefined : ORDER.indexOf(id) < ORDER.indexOf(shown) ? "left" : "right"}
            style={{ ["--dir" as string]: dir }}
            aria-hidden={id !== shown}
          >
            {id === "story" && <StoryPeek act={act} />}
            {id === "apps" && <AppsPeek act={act} />}
            {id === "outcomes" && <OutcomesPeek act={act} />}
            {id === "how" && <HowPeek act={act} />}
            {id === "faq" && <FaqPeek act={act} />}
          </div>
        ))}
      </div>
    </div>
  );
}

type Act = (fn: () => void) => () => void;

/** The tinted card on the right of each glance: what the section is and a way into it. */
function Side({ id, act, figure, label }: { id: Exclude<PeekId, "story">; act: Act; figure: string; label: string }) {
  const p = PEEKS[id];
  return (
    <div className="peek-side" style={{ ["--tone" as string]: `var(--color-${p.tone})` }}>
      <p className="peek-side-figure tabular">{figure}</p>
      <p className="peek-side-label">{label}</p>
      <p className="peek-side-blurb">{p.blurb}</p>
      <button className="peek-go" onClick={act(() => scrollToTarget(p.href))}>
        Open section
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}

function AppsPeek({ act }: { act: Act }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list" aria-label="Business areas">
        {CATEGORIES.map((c, i) => {
          const apps = APPLICATIONS.filter((a) => a.category === c);
          return (
            <li key={c} style={{ ["--tone" as string]: `var(--color-${CATEGORY_TONE[c]})`, ["--k" as string]: i }}>
              <button className="peek-row" onClick={act(() => showArea(i))}>
                <span className="peek-dot" aria-hidden />
                <span className="peek-row-text">
                  <b>{c}</b>
                  <small>{apps[0].example}</small>
                </span>
                <span className="peek-count tabular">{apps.length} {apps.length === 1 ? "app" : "apps"}</span>
                <ArrowRight className="peek-arrow" size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <Side id="apps" act={act} figure={String(APPLICATIONS.length)} label="ready applications" />
    </div>
  );
}

function OutcomesPeek({ act }: { act: Act }) {
  return (
    <div className="peek-grid">
      <div className="peek-cases">
        {OUTCOMES.map((o, i) => (
          <button
            key={o.sector}
            className="peek-case"
            style={{ ["--tone" as string]: `var(--color-${OUTCOME_TONES[i]})`, ["--k" as string]: i }}
            onClick={act(() => showOutcome(i))}
          >
            <span className="peek-case-sector">{o.sector}</span>
            <span className="peek-case-value tabular">{o.value}</span>
            <span className="peek-case-label">{o.label}</span>
          </button>
        ))}
        <p className="peek-note" style={{ ["--k" as string]: 3 }}>
          <span><b>0</b> systems replaced</span>
          <span><b>1</b> named approver per action</span>
        </p>
      </div>
      <Side id="outcomes" act={act} figure="3" label="decisions, measured" />
    </div>
  );
}

function HowPeek({ act }: { act: Act }) {
  const steps = PATHS.custom.steps;
  return (
    <div className="peek-grid">
      <div>
        <ol className="peek-steps">
          {steps.map((s, i) => (
            <li key={s.title} style={{ ["--tone" as string]: `var(--color-${STEP_TONES[i]})`, ["--k" as string]: i }}>
              <button onClick={act(() => showStep(i))}>
                <span className="peek-step-n tabular">0{i + 1}</span>
                <b>{s.title}</b>
                <small>{s.when}</small>
              </button>
            </li>
          ))}
        </ol>
        <p className="peek-routes" style={{ ["--k" as string]: 4 }}>
          <span><i style={{ background: "var(--color-violet)" }} />Custom · {PATHS.custom.total.split(" to the")[0]}</span>
          <span><i style={{ background: "var(--color-emerald)" }} />Catalogue · {PATHS.catalogue.total.split(" to the")[0]}</span>
        </p>
      </div>
      <Side id="how" act={act} figure="4" label="steps to production" />
    </div>
  );
}

function FaqPeek({ act }: { act: Act }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list" aria-label="Questions">
        {FAQ_PICK.map((q, k) => {
          const [Icon, t] = FAQ_ICONS[k];
          return (
            <li key={q} style={{ ["--tone" as string]: `var(--color-${t})`, ["--k" as string]: k }}>
              <button className="peek-row peek-q" onClick={act(() => showQuestion(q))}>
                <span className="peek-q-icon" aria-hidden><Icon size={15} /></span>
                <span className="peek-row-text"><b>{FAQ[q].q}</b></span>
                <ArrowRight className="peek-arrow" size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="peek-side peek-audit" style={{ ["--tone" as string]: "var(--color-cobalt)" }}>
        <p className="peek-side-label">Free AI audit</p>
        <p className="peek-side-blurb">30 minutes on one decision in your operation. No commitment.</p>
        <button className="peek-go" onClick={act(() => scrollToTarget("#audit"))}>
          Book the audit
          <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </button>
        <button className="peek-go peek-go-quiet" onClick={act(() => scrollToTarget("#faq"))}>
          All {FAQ.length} questions
        </button>
      </div>
    </div>
  );
}

/** What each chapter shows, so the list reads as a table of contents rather than a row of names. */
const CHAPTER_INFO: [LucideIcon, string][] = [
  [Boxes, "Six systems, six partial views"],
  [Radar, "One shortage worth acting on"],
  [TrendingDown, "Demand rises while stock runs low"],
  [ScanSearch, "Every fact, checked in one view"],
  [Truck, "Move 240 units, Plant 02 to 01"],
  [ShieldCheck, "A named person approves it"],
  [Layers, "The same layer, five functions"],
  [Factory, "Configured for your industry"],
  [CheckCheck, "Information, turned into decisions"],
];

/** The story in three acts: what goes wrong, how Decignal answers, and how far it reaches. */
const ACTS = [
  { name: "The problem", from: 0 },
  { name: "The answer", from: 3 },
  { name: "At scale", from: 6 },
];

/** The story's chapters grouped into acts, each with what it shows and how far the reader has got,
 *  so the readout doubles as a table of contents. */
function StoryPeek({ act }: { act: Act }) {
  const root = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-chapter]") ?? []);
    const total = root.current?.querySelector<HTMLElement>(".peek-story-bar");
    return subscribe((g) => {
      const here = Math.min(Math.floor(g + 0.5), CHAPTERS.length - 1);
      items.forEach((el, i) => {
        el.style.setProperty("--fill", String(Math.min(Math.max(g - i, 0), 1)));
        el.toggleAttribute("data-here", here === i);
        el.toggleAttribute("data-read", i < here);
      });
      const p = Math.min(Math.max(g / (CHAPTERS.length - 1), 0), 1);
      total?.style.setProperty("--fill", String(p));
      if (pct.current) pct.current.textContent = `${Math.round(p * 100)}%`;
    });
  }, []);
  return (
    <div ref={root} className="peek-story">
      <div className="peek-story-head" style={{ ["--k" as string]: 0 }}>
        <div>
          <p className="peek-story-title">The story in nine chapters</p>
          <p className="peek-story-sub">One stock shortage, followed from the first signal to an approved transfer.</p>
        </div>
        <div className="peek-story-progress">
          <span ref={pct} className="tabular">0%</span>
          <span className="peek-story-bar" aria-hidden><span /></span>
        </div>
      </div>
      <div className="peek-acts">
        {ACTS.map((a, ai) => (
          <section key={a.name} className="peek-act" aria-label={`Act ${ai + 1}, ${a.name}`} style={{ ["--k" as string]: ai + 1 }}>
            <p className="peek-act-name">
              <span className="tabular">Act {ai + 1}</span>
              {a.name}
            </p>
            <ol>
              {CHAPTERS.slice(a.from, a.from + 3).map((c, j) => {
                const i = a.from + j;
                const [Icon, blurb] = CHAPTER_INFO[i];
                return (
                  <li key={c.id} data-chapter style={{ ["--tone" as string]: toneVar(i) }}>
                    <button onClick={act(() => goToChapter(i))}>
                      <span className="peek-chapter-icon" aria-hidden>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="peek-chapter-text">
                        <span className="peek-chapter-top">
                          <span className="peek-step-n tabular">{String(i + 1).padStart(2, "0")}</span>
                          <b>{c.label}</b>
                          <em className="peek-chapter-now">Now</em>
                        </span>
                        <small>{blurb}</small>
                      </span>
                      <span className="peek-chapter-bar" aria-hidden><span /></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
