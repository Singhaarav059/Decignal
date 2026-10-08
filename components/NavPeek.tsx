"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Database,
  Layers,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, FAQ, OUTCOMES, PATHS } from "@/lib/content";
import { CHAPTERS, subscribe } from "@/lib/story";
import { showOutcome, showQuestion, showStep } from "@/lib/jump";
import { showArea, StepArt } from "./sections/GrowlioSections";
import { AreaArt } from "./sections/AreaArt";
import { OUTCOME_FILL, OutcomeGraphic } from "./sections/OutcomeGraphic";
import { goToChapter, toneVar } from "./story/chapters";
import { ChapterArt } from "./ChapterArt";
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
  // Counts openings, so the glance's drawings replay each time it opens rather than once at load.
  const [epoch, setEpoch] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (!!peek !== wasOpen) {
    setWasOpen(!!peek);
    if (peek) setEpoch((n) => n + 1);
  }

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
      const w = Math.min(wide ? 840 : 820, vw - 40);
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
            <Fragment key={id === shown ? `${id}-${epoch}` : id}>
              {id === "story" && <StoryPeek act={act} />}
              {id === "apps" && <AppsPeek act={act} />}
              {id === "outcomes" && <OutcomesPeek act={act} />}
              {id === "how" && <HowPeek act={act} />}
              {id === "faq" && <FaqPeek act={act} />}
            </Fragment>
          </div>
        ))}
      </div>
    </div>
  );
}

type Act = (fn: () => void) => () => void;

/** The strip under a visual glance: what the section holds, and a way into it. */
function Foot({ id, act, figure, label }: { id: Exclude<PeekId, "story">; act: Act; figure: string; label: string }) {
  const p = PEEKS[id];
  return (
    <div className="peek-foot" style={{ ["--tone" as string]: `var(--color-${p.tone})`, ["--k" as string]: 6 }}>
      <p>
        <b className="tabular">{figure}</b>
        <span>{label}</span>
        <small>{p.blurb}</small>
      </p>
      <button className="peek-go" onClick={act(() => scrollToTarget(p.href))}>
        Open section
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}

/** Each business area as its own coloured tile with its line art: the picture says what it does. */
function AppsPeek({ act }: { act: Act }) {
  return (
    <div className="peek-visual">
      <ul className="peek-areas" aria-label="Business areas">
        {CATEGORIES.map((c, i) => {
          const apps = APPLICATIONS.filter((a) => a.category === c);
          return (
            <li key={c} style={{ ["--tone" as string]: `var(--color-${CATEGORY_TONE[c]})`, ["--k" as string]: i }}>
              <button className="peek-tile peek-area" onClick={act(() => showArea(i))} aria-label={`${c}: ${apps.map((a) => a.name).join(", ")}`}>
                <AreaArt area={c} />
                <span className="peek-tile-meta">
                  <b>{c}</b>
                  <span className="peek-tile-chip tabular">{apps.length} {apps.length === 1 ? "app" : "apps"}</span>
                </span>
                <small className="peek-tile-hint">{apps[0].example}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <Foot id="apps" act={act} figure={String(APPLICATIONS.length)} label="ready applications" />
    </div>
  );
}

/** Each outcome as the diagram that proves it, with its number on top. */
function OutcomesPeek({ act }: { act: Act }) {
  return (
    <div className="peek-visual">
      <ul className="peek-outcomes">
        {OUTCOMES.map((o, i) => (
          <li key={o.sector} style={{ ["--tone" as string]: OUTCOME_FILL[i], ["--k" as string]: i }}>
            <button className="peek-tile peek-outcome" onClick={act(() => showOutcome(i))}>
              <span className="peek-outcome-sector">{o.sector}</span>
              <span className="peek-outcome-value tabular">{o.value}</span>
              <OutcomeGraphic index={i} />
              <span className="peek-outcome-label">{o.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <Foot id="outcomes" act={act} figure="0" label="systems replaced" />
    </div>
  );
}

/** The route to production as four pictures, joined by the dotted line the roadmap uses. */
function HowPeek({ act }: { act: Act }) {
  const steps = PATHS.custom.steps;
  // "4 to 8 weeks to the first production release" reads as 4–8.
  const [lo, , hi] = PATHS.catalogue.total.split(" ");
  const fastest = `${lo}–${hi}`;
  return (
    <div className="peek-visual">
      <ol className="peek-route">
        {steps.map((s, i) => (
          <li key={s.title} style={{ ["--tone" as string]: `var(--color-${STEP_TONES[i]})`, ["--k" as string]: i }}>
            <button className="peek-tile peek-step" onClick={act(() => showStep(i))}>
              <StepArt index={i} />
              <span className="peek-step-n tabular">0{i + 1} · {s.when}</span>
              <b>{s.title}</b>
            </button>
          </li>
        ))}
      </ol>
      <Foot id="how" act={act} figure={fastest} label="weeks to a first release" />
    </div>
  );
}

function FaqPeek({ act }: { act: Act }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list" aria-label="FAQ">
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

/** What each chapter shows: the tile's tooltip and its spoken name, while the picture carries it. */
const CHAPTER_INFO = [
  "Six systems, six partial views",
  "One shortage worth acting on",
  "Demand rises while stock runs low",
  "Every fact, checked in one view",
  "Move 240 units, Plant 02 to 01",
  "A named person approves it",
  "The same layer, five functions",
  "Configured for your industry",
  "Information, turned into decisions",
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
                const blurb = CHAPTER_INFO[i];
                return (
                  <li key={c.id} data-chapter style={{ ["--tone" as string]: toneVar(i) }}>
                    <button onClick={act(() => goToChapter(i))} title={blurb}>
                      <ChapterArt i={i} />
                      <span className="peek-chapter-top">
                        <span className="peek-step-n tabular">{String(i + 1).padStart(2, "0")}</span>
                        <b>{c.label}</b>
                        <em className="peek-chapter-now">Now</em>
                        <span className="sr-only">: {blurb}</span>
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
