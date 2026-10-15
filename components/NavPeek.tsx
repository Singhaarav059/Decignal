"use client";

import Link from "next/link";
import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, CircleAlert, IndianRupee, Layers, Plug, Users, type LucideIcon } from "lucide-react";
import { APPLICATIONS, APPROACH, AUDIENCE, CATEGORIES, FAQ, FAQ_PEEK, PATHS } from "@/lib/content";
import { areaHref, areaOf } from "@/lib/areas";
import { APPROACH_COPY, AUDIENCE_COPY, CTA, HOW, NAV, STORY_PEEK } from "@/lib/copy";
import { CHAPTERS, subscribe } from "@/lib/story";
import { showOutcome, showQuestion, showStep } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { StepArt } from "./sections/StepArt";
import { AreaArt } from "./sections/AreaArt";
import { OUTCOME_TONE, OutcomeGraphic } from "./sections/OutcomeGraphic";
import { TONE, goToChapter } from "./story/chapters";
import { ChapterArt } from "./ChapterArt";
import { SectionLink } from "./ui/SectionLink";
import { AuditLink } from "./CtaPill";

export type PeekId = "platform" | "apps" | "outcomes" | "how" | "faq" | "story";
export type SectionPeek = Exclude<PeekId, "story">;

const LABEL: Record<string, string> = Object.fromEntries(NAV.sections);

/** What each section is, in one line: the glance's foot and the phone menu both use it. */
const PEEKS: Record<SectionPeek, { blurb: string; id: string; label: string }> = {
  platform: { blurb: NAV.blurbs.platform, id: "platform", label: LABEL.platform },
  apps: { blurb: NAV.blurbs.apps, id: "/solutions", label: LABEL["/solutions"] },
  outcomes: { blurb: NAV.blurbs.audience, id: "who-we-help", label: LABEL["who-we-help"] },
  how: { blurb: NAV.blurbs.how, id: "how", label: LABEL.how },
  faq: { blurb: NAV.blurbs.faq, id: "faq", label: "Questions" },
};

const HOME_ORDER: PeekId[] = ["story", "apps", "outcomes", "platform", "how", "faq"];
const PAGE_ORDER: PeekId[] = ["apps", "outcomes", "platform", "how", "faq"];
const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];
/** Icons for FAQ_PEEK, in its order: existing software, audience, integration, exceptions, cost. Neutral. */
const FAQ_ICONS: LucideIcon[] = [Layers, Users, Plug, CircleAlert, IndianRupee];

/** The section glances under the nav. One panel morphs between them: its height follows the open
 *  glance, the content slides in from the side the pointer came from, and a caret tracks the link. */
export function NavPeek({
  variant = "home",
  hrefFor,
  peek,
  caret,
  onEnter,
  onLeave,
  onDone,
}: {
  variant?: "home" | "page";
  hrefFor: (id: string) => string;
  peek: PeekId | null;
  caret: number;
  onEnter: () => void;
  onLeave: () => void;
  onDone: () => void;
}) {
  const order = variant === "home" ? HOME_ORDER : PAGE_ORDER;
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
    setDir(order.indexOf(peek) > order.indexOf(last) ? 1 : -1);
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
  // Where the panel will rest (not where it is mid-glide): centred under the links, or on the page
  // grid's left edge (the nav's own inset) under the readout for the chapter list.
  const wide = shown === "story";
  useLayoutEffect(() => {
    const place = () => {
      const vw = document.documentElement.clientWidth;
      const w = Math.min(wide ? 840 : 820, vw - 40);
      const shell = panel.current?.closest(".nav-shell");
      const edge = shell ? parseFloat(getComputedStyle(shell).paddingLeft) || 20 : 20;
      setLeft(wide ? Math.min(edge, vw - w - 20) : (vw - w) / 2);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [wide]);

  const act = (fn: () => void) => () => {
    onDone();
    fn();
  };
  const ctx: Ctx = { act, onDone, hrefFor, home: variant === "home" };

  return (
    <div
      ref={panel}
      className="nav-peek hidden lg:block"
      data-open={peek ? "" : undefined}
      data-wide={wide || undefined}
      style={{ left, ["--h" as string]: `${h}px`, ["--caret" as string]: `${caret - left}px` }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      inert={!peek}
    >
      <i className="nav-peek-caret" aria-hidden />
      <div className="nav-peek-body">
        {order.map((id) => (
          <div
            key={id}
            id={`peek-${id}`}
            ref={(n) => {
              panes.current[id] = n;
            }}
            className="nav-peek-pane"
            role="region"
            aria-label={`${id === "story" ? "Chapters" : PEEKS[id].label} preview`}
            data-on={id === shown || undefined}
            data-from={id === shown ? undefined : order.indexOf(id) < order.indexOf(shown) ? "left" : "right"}
            style={{ ["--dir" as string]: dir }}
            inert={id !== shown || !peek}
          >
            <Fragment key={id === shown ? `${id}-${epoch}` : id}>
              {id === "story" && <StoryPeek act={act} />}
              {id === "platform" && <PlatformPeek ctx={ctx} />}
              {id === "apps" && <AppsPeek ctx={ctx} />}
              {id === "outcomes" && <OutcomesPeek ctx={ctx} />}
              {id === "how" && <HowPeek ctx={ctx} />}
              {id === "faq" && <FaqPeek ctx={ctx} />}
            </Fragment>
          </div>
        ))}
      </div>
    </div>
  );
}

type Act = (fn: () => void) => () => void;
type Ctx = { act: Act; onDone: () => void; hrefFor: (id: string) => string; home: boolean };

/** A glance tile that opens one item of a home section: a button driving the section on the home page,
 *  a link to that section elsewhere. */
function Tile({ ctx, className, style, onOpen, section, label, children }: { ctx: Ctx; className: string; style?: CSSProperties; onOpen: () => void; section: string; label?: string; children: ReactNode }) {
  if (ctx.home) {
    return (
      <button type="button" className={className} style={style} onClick={ctx.act(onOpen)} aria-label={label}>
        {children}
      </button>
    );
  }
  return (
    <SectionLink href={`/#${section}`} className={className} style={style} onDone={ctx.onDone} aria-label={label}>
      {children}
    </SectionLink>
  );
}

/** The strip under a visual glance: what the section holds, and a way into it. */
function Foot({ id, ctx, figure, label }: { id: SectionPeek; ctx: Ctx; figure: string; label: string }) {
  const p = PEEKS[id];
  return (
    <div className="peek-foot" style={{ ["--k" as string]: 6 }}>
      <p>
        <b className="tabular">{figure}</b>
        <span>{label}</span>
        <small>{p.blurb}</small>
      </p>
      <SectionLink href={ctx.hrefFor(p.id)} className="peek-go" onDone={ctx.onDone}>
        Open section
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
      </SectionLink>
    </div>
  );
}

/** The approach in four steps, each a row in its own colour, and the approach in one line beside
 *  them: the same shape as the FAQ glance. */
function PlatformPeek({ ctx }: { ctx: Ctx }) {
  const href = ctx.hrefFor(PEEKS.platform.id);
  return (
    <div className="peek-grid">
      <ul className="peek-list" aria-label={NAV.platformSide.label}>
        {APPROACH.map((g, k) => (
          <li key={g.title} style={{ ...toneVars(APPROACH_COPY.tones[k]), ["--k" as string]: k }}>
            <SectionLink href={href} className="peek-row peek-fact" onDone={ctx.onDone}>
              <span className="peek-row-text">
                <b>{g.title}</b>
                <small>{g.text}</small>
              </span>
              <ArrowRight className="peek-arrow" size={14} strokeWidth={2.2} aria-hidden />
            </SectionLink>
          </li>
        ))}
      </ul>
      <div className="peek-side">
        <p className="peek-side-label">{NAV.platformSide.label}</p>
        <p className="peek-side-blurb">{NAV.platformSide.blurb}</p>
        <SectionLink href={href} className="peek-go" onDone={ctx.onDone}>
          Open section
          <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </SectionLink>
      </div>
    </div>
  );
}

/** Each business function as its own tile with its line art, linking to its solution page. */
function AppsPeek({ ctx }: { ctx: Ctx }) {
  return (
    <div className="peek-visual">
      <ul className="peek-areas" aria-label="Business functions">
        {CATEGORIES.map((c, i) => {
          const apps = APPLICATIONS.filter((a) => a.category === c);
          return (
            <li key={c} style={{ ...toneVars(areaOf(c).tone), ["--k" as string]: i }}>
              <Link href={areaHref(c)} className="peek-tile peek-area" onClick={ctx.onDone} aria-label={`${c}: ${apps.map((a) => a.name).join(", ")}`}>
                <AreaArt area={c} />
                <span className="peek-tile-meta">
                  <b>{c}</b>
                  <span className="peek-tile-chip tabular">{NAV.appsCount(apps.length)}</span>
                </span>
                <small className="peek-tile-hint">{areaOf(c).lead}</small>
              </Link>
            </li>
          );
        })}
      </ul>
      <Foot id="apps" ctx={ctx} figure={NAV.foot.apps.figure} label={NAV.foot.apps.label} />
    </div>
  );
}

/** The four industries, each with the drawing of its example. */
function OutcomesPeek({ ctx }: { ctx: Ctx }) {
  return (
    <div className="peek-visual">
      <p className="peek-eyebrow t-label" style={{ ["--k" as string]: 0 }}>
        {AUDIENCE_COPY.eyebrow}
      </p>
      <ul className="peek-outcomes">
        {AUDIENCE.map((o, i) => (
          <li key={o.name} style={{ ...toneVars(OUTCOME_TONE[i]), ["--k" as string]: i }}>
            <Tile ctx={ctx} className="peek-tile peek-outcome" onOpen={() => showOutcome(i)} section="who-we-help">
              <span className="peek-outcome-sector">{o.name}</span>
              <OutcomeGraphic index={i} />
              <span className="peek-outcome-label">{o.text}</span>
            </Tile>
          </li>
        ))}
      </ul>
      <Foot id="outcomes" ctx={ctx} figure={NAV.foot.outcomes.figure} label={NAV.foot.outcomes.label} />
    </div>
  );
}

/** The delivery process as four pictures, joined by the dotted line the roadmap uses. */
function HowPeek({ ctx }: { ctx: Ctx }) {
  const steps = PATHS.steps;
  return (
    <div className="peek-visual">
      <ol className="peek-route">
        {steps.map((s, i) => (
          <li key={s.title} style={{ ...toneVars(STEP_TONES[i]), ["--k" as string]: i }}>
            <Tile ctx={ctx} className="peek-tile peek-step" onOpen={() => showStep(i)} section="how">
              <StepArt index={i} />
              <span className="peek-step-n">{HOW.stepWords[i]}</span>
              <b>{s.title}</b>
            </Tile>
          </li>
        ))}
      </ol>
      <Foot id="how" ctx={ctx} figure="4 steps" label={NAV.foot.how.label} />
    </div>
  );
}

function FaqPeek({ ctx }: { ctx: Ctx }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list" aria-label="FAQ">
        {FAQ_PEEK.map((q, k) => {
          const Icon = FAQ_ICONS[k];
          return (
            <li key={q} style={{ ["--k" as string]: k }}>
              <Tile ctx={ctx} className="peek-row peek-q" onOpen={() => showQuestion(q)} section="faq">
                <span className="peek-q-icon" aria-hidden>
                  <Icon size={15} />
                </span>
                <span className="peek-row-text">
                  <b>{FAQ[q].q}</b>
                </span>
                <ArrowRight className="peek-arrow" size={14} strokeWidth={2.2} aria-hidden />
              </Tile>
            </li>
          );
        })}
      </ul>
      <div className="peek-side peek-audit">
        <p className="peek-side-label">{NAV.faqSide.label}</p>
        <p className="peek-side-blurb">{NAV.faqSide.blurb}</p>
        <AuditLink className="peek-go" onDone={ctx.onDone}>
          {CTA.primary}
          <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </AuditLink>
        <SectionLink href={ctx.home ? "#faq" : "/#faq"} className="peek-go peek-go-quiet" onDone={ctx.onDone}>
          {NAV.faqSide.all()}
        </SectionLink>
      </div>
    </div>
  );
}

/** The story's chapters grouped into acts, each with its picture and how far the reader has got, so
 *  the readout doubles as a table of contents. */
function StoryPeek({ act }: { act: Act }) {
  const root = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-chapter]") ?? []);
    const total = root.current?.querySelector<HTMLElement>(".peek-story-bar");
    // Written only when they change: this runs on every scroll frame, mostly with the glance closed.
    let lastHere = -1;
    let lastPct = -1;
    let lastText = "";
    return subscribe((g) => {
      const here = Math.min(Math.floor(g + 0.5), CHAPTERS.length - 1);
      if (here !== lastHere) {
        lastHere = here;
        items.forEach((el, i) => {
          el.toggleAttribute("data-here", here === i);
          el.toggleAttribute("data-read", i < here);
        });
      }
      const p = Math.min(Math.max(g / (CHAPTERS.length - 1), 0), 1);
      const n = Math.round(p * 1000);
      if (n === lastPct) return;
      lastPct = n;
      total?.style.setProperty("--fill", (n / 1000).toFixed(3));
      // The figure moves by whole percents: rewriting its text each step replaced the node and laid out the nav.
      const text = `${Math.round(p * 100)}%`;
      if (pct.current && text !== lastText) pct.current.textContent = lastText = text;
    });
  }, []);
  return (
    <div ref={root} className="peek-story">
      <div className="peek-story-head" style={{ ["--k" as string]: 0 }}>
        <div>
          <p className="peek-story-title">{STORY_PEEK.title}</p>
          <p className="peek-story-sub">{STORY_PEEK.sub}</p>
        </div>
        <div className="peek-story-progress">
          <span ref={pct} className="tabular">
            0%
          </span>
          <span className="peek-story-bar" aria-hidden>
            <span />
          </span>
        </div>
      </div>
      <div className="peek-acts">
        {STORY_PEEK.groups.map((a, ai) => (
          <section key={a.name} className="peek-act" aria-label={`Act ${ai + 1}, ${a.name}`} style={{ ["--k" as string]: ai + 1 }}>
            <p className="peek-act-name">
              <span className="tabular">Act {ai + 1}</span>
              {a.name}
            </p>
            <ol>
              {CHAPTERS.slice(a.from, a.from + 3).map((c, j) => {
                const i = a.from + j;
                const blurb = STORY_PEEK.chapters[i];
                return (
                  <li key={c.id} data-chapter style={toneVars(TONE[i] || "ink")}>
                    <button type="button" onClick={act(() => goToChapter(i))} title={blurb}>
                      <ChapterArt i={i} />
                      <span className="peek-chapter-top">
                        <b>{c.label}</b>
                        <em className="peek-chapter-now">Now</em>
                        <span className="sr-only">: {blurb}</span>
                      </span>
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
