"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Building2,
  ChartNoAxesCombined,
  Database,
  LayoutGrid,
  MessageCircleQuestion,
  Users,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import founderPhoto from "@/assets/photos/founder.jpg";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AUDIENCE, FAQ, FAQ_TOPICS, FEATURED, LEGACY_ANCHORS, SOURCE_GROUPS, appById } from "@/lib/content";
import {
  ABOUT,
  APPLICATIONS_COPY,
  AUDIENCE_COPY,
  CTA,
  FAQ_COPY,
  HOW,
  OUTCOMES_COPY,
  SYSTEMS_STRIP,
  type Headline,
} from "@/lib/copy";
import { jumpTo, onOutcome } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import SectionTitle from "../ui/SectionTitle";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { CountUp } from "../ui/CountUp";
import { SystemsRing } from "./SystemsRing";
import { ReadWheel } from "./ReadWheel";
import { Statement } from "./Statement";
import { OUTCOME_TONE, OutcomeGraphic } from "./OutcomeGraphic";
import { AreaPhoto } from "./AreaPhoto";
import { AREAS, appHref } from "@/lib/areas";
import { FeaturedApps } from "./FeaturedApps";
import { AreaRows } from "./AreaRows";
import { MeasureArt } from "./MeasureArt";
import { TrailDial } from "./TrailDial";
import { LiquidShapes } from "../ui/LiquidShapes";
import { Demonstrations } from "./Demonstrations";
import { HowSteps } from "./HowSteps";
import { FaqList } from "./FaqList";
import { FaqFigure, useFaqFigure } from "./FaqArt";
import { Audit } from "./Audit";
import { ApplicationExplorer } from "./ApplicationExplorer";

gsap.registerPlugin(ScrollTrigger);

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paragraphs fade and rise into place; headlines rise word by word out of their own masks, a wave
 *  across both lines (a heading whose lines are not plain text rises line by line). */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>(
          "[data-reveal], .ed-title .section-title-label, .ed-title .section-title-lede",
        )
        .forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            },
          );
        });
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
        const words = el.querySelectorAll(".word > span");
        gsap.fromTo(
          words.length ? words : el.querySelectorAll(".line-mask > span"),
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 1.2,
            ease: "expo.out",
            stagger: words.length ? 0.055 : 0.09,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}

const two = (h: Headline): [string, string] => [h[0], h[1]];

/** A section head: label, two lines (the second in the accent ink) and an optional lede. Neutral
 *  chrome (D6). */
function Head({
  id,
  label,
  headline,
  lede,
  className,
  align,
  icon,
}: {
  id: string;
  label: string;
  headline: Headline;
  lede?: string;
  className?: string;
  align?: "start" | "center";
  icon?: ReactNode;
}) {
  return (
    <SectionTitle
      id={id}
      label={label}
      lines={two(headline)}
      lede={lede}
      tone="ink"
      align={align}
      icon={icon}
      reveal="lines"
      className={`ed-title${className ? ` ${className}` : ""}`}
    />
  );
}

/** Everything below the story, as one sheet over it, in the handoff's order (§11): applications,
 *  problem, how we build, industries, examples (tabs, then the worked dial), systems, delivery, what we
 *  measure, about, questions and the enquiry.
 *  The page renders <Footer /> after <main>. */
export function Editorial() {
  const ref = useReveal();
  return (
    <div ref={ref} className="editorial relative bg-bg">
      <Applications />
      <Statement />
      <Audience />
      <Demonstrations />
      <TrailDial />
      <Systems />
      <HowItWorks />
      <Measure />
      <About />
      <Faq />
      <Audit />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Systems() {
  // The six kinds of record travel round the head as a ring of photographs; the three groups follow.
  return (
    <section
      id="systems"
      className="works-with-section"
      aria-labelledby="systems-title"
    >
      <SystemsRing>
        <Head
          icon={<Database size={13} strokeWidth={2.2} />}
          id="systems-title"
          label={SYSTEMS_STRIP.eyebrow}
          headline={SYSTEMS_STRIP.headline}
          align="center"
        />
        <p data-reveal className="t-small works-with-note">
          {SYSTEMS_STRIP.intro}
        </p>
      </SystemsRing>
      {/* The three source groups (handoff §5 systems): simple labels, no live integration implied. */}
      <div className="page-wrap">
        <ul className="record-groups">
          {SOURCE_GROUPS.map((g) => (
            <li key={g.name} data-reveal className="record-group" style={toneVars(g.tone)}>
              <p className="record-group-k t-label">
                <i aria-hidden />
                {g.name}
              </p>
              <p className="t-body record-group-text">{g.text}</p>
            </li>
          ))}
        </ul>
        {/* The ask: a panel of its own so it isn't read as a footnote. */}
        <div data-reveal className="record-groups-note">
          <Database size={18} strokeWidth={2} aria-hidden className="record-groups-note-icon" />
          <p className="t-body">
            <strong>{SYSTEMS_STRIP.note.lead}</strong> {SYSTEMS_STRIP.note.text}
          </p>
          <SectionLink href="#audit" className="ed-link record-groups-note-link">
            {SYSTEMS_STRIP.note.link}
            <Arrow />
          </SectionLink>
        </div>
      </div>
      {/* The records the applications read, on a dial the scroll turns. */}
      <ReadWheel />
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** Old #application-{id} links (the earlier workflows and scene kinds) open the record that replaced
 *  them on its function page (handoff §4 "Preserve old links"). */
function useLegacyApplicationLinks() {
  useEffect(() => {
    const m = /^#application-(.+)$/.exec(window.location.hash);
    if (!m) return;
    const app = appById(LEGACY_ANCHORS[m[1]] ?? m[1]);
    if (app) window.location.replace(appHref(app));
  }, []);
}

function Applications() {
  useLegacyApplicationLinks();
  return (
    <section
      id="applications"
      className="apps"
      aria-labelledby="applications-title"
    >
      {/* The night band: the head, then the six featured applications as equal cards. */}
      <div className="night-panel">
        <div className="page-wrap apps-head">
          <Head
            icon={<LayoutGrid size={13} strokeWidth={2.2} />}
            id="applications-title"
            label={APPLICATIONS_COPY.eyebrow}
            headline={APPLICATIONS_COPY.headline}
          />
          <div className="apps-head-side">
            <p data-reveal className="t-lede">
              {APPLICATIONS_COPY.intro}
            </p>
            <p data-reveal className="t-small apps-note">
              <SectionLink href="/solutions" className="ed-link">
                {APPLICATIONS_COPY.all}
                <Arrow />
              </SectionLink>
            </p>
          </div>
        </div>
        <div className="page-wrap">
          <FeaturedApps />
          {/* All five functions as rows, each opening to its examples. */}
          <AreaRows />
        </div>
      </div>
      {/* The same six, one at a time in 3D. */}
      <ApplicationExplorer apps={FEATURED.map((_, i) => i)} />
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** The four industries as cards that stack as the page scrolls, each over the last. */
function Audience() {
  const root = useRef<HTMLElement>(null);
  // The nav's audience glance brings its card to the front of the stack.
  useEffect(
    () =>
      onOutcome((i) => {
        const card = root.current?.querySelectorAll<HTMLElement>(".outcome-stack-card")[i];
        if (card) void jumpTo(card.offsetTop + (root.current?.offsetTop ?? 0) - 96 - i * 18);
      }),
    [],
  );
  useEffect(() => {
    if (!root.current || reduced()) return;
    const cards = Array.from(root.current.querySelectorAll<HTMLElement>(".outcome-stack-card"));
    // A card steps back as the next one slides over it.
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (next) {
          gsap.to(card.querySelector(".outcome-figure"), {
            scale: 0.94,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true },
          });
        }
      });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      id="who-we-help"
      className="results band"
      data-band="mist"
      aria-labelledby="who-we-help-title"
    >
      <div className="page-wrap">
        <div className="results-head">
          <Head
            icon={<Users size={13} strokeWidth={2.2} />}
            id="who-we-help-title"
            label={AUDIENCE_COPY.eyebrow}
            headline={AUDIENCE_COPY.headline}
          />
          <div className="results-head-side">
            <p data-reveal className="t-lede">
              {AUDIENCE_COPY.intro}
            </p>
          </div>
        </div>
        <div className="outcome-wrap">
          <LiquidShapes preset="outcomes" />
          <ol className="outcome-stack" aria-label={AUDIENCE_COPY.listAria}>
            {AUDIENCE.map((seg, i) => (
              <li
                key={seg.name}
                className="outcome-stack-card"
                style={{ ...toneVars(OUTCOME_TONE[i]), ["--i" as string]: i }}
              >
                <figure className="outcome-figure" aria-labelledby={`seg-${i}`}>
                  <p className="outcome-top t-label">
                    {/* The functions its three examples come from. */}
                    <span>{[...new Set(seg.apps.map((id) => appById(id)!.category.split(" ")[0]))].join(" · ")}</span>
                  </p>
                  <div className="outcome-visual">
                    <OutcomeGraphic index={i} />
                  </div>
                  <div className="outcome-copy">
                    <h3 id={`seg-${i}`} className="outcome-number t-title-card">
                      {seg.name}
                    </h3>
                    <p className="outcome-label t-subtitle">{seg.text}</p>
                    <figcaption className="t-label segment-flows">
                      <span>{AUDIENCE_COPY.examples}</span>
                      <ul>
                        {seg.apps.map((id) => {
                          const w = appById(id)!;
                          return (
                            <li key={id}>
                              <a href={appHref(w)}>{w.name}</a>
                            </li>
                          );
                        })}
                      </ul>
                      <SectionLink href={seg.href} className="ed-link">
                        {AUDIENCE_COPY.link}
                        <Arrow />
                      </SectionLink>
                    </figcaption>
                  </div>
                </figure>
              </li>
            ))}
          </ol>
        </div>
        <p data-reveal className="t-body audience-other">
          {AUDIENCE_COPY.closing}{" "}
          <SectionLink href={CTA.href} className="ed-link">
            {AUDIENCE_COPY.closingLink}
            <Arrow />
          </SectionLink>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */

/** What we measure (#outcomes): the baseline agreed for the chosen application. */
function Measure() {
  return (
    <section id="outcomes" className="results measure" aria-labelledby="outcomes-title">
      <div className="page-wrap">
        <div className="results-head">
          <Head
            icon={<ChartNoAxesCombined size={13} strokeWidth={2.2} />}
            id="outcomes-title"
            label={OUTCOMES_COPY.eyebrow}
            headline={OUTCOMES_COPY.headline}
          />
          <div className="results-head-side">
            <p data-reveal className="t-lede">
              {OUTCOMES_COPY.intro}
            </p>
            <p data-reveal className="t-small results-note">
              {OUTCOMES_COPY.note}
            </p>
          </div>
        </div>
        <ul className="record-groups measure-list">
          {OUTCOMES_COPY.measures.map((m, i) => (
            <li key={m.k} data-reveal className="record-group" style={toneVars(m.tone)}>
              <MeasureArt k={i} />
              <p className="record-group-k t-label">
                <i aria-hidden />
                {m.k}
              </p>
              <p className="t-body record-group-text">{m.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** About (handoff §5 about): head and lede, then the place beside the second paragraph, the founder and the call to action, on one pair of columns. */
function About() {
  const f = ABOUT.founder;
  const area = AREAS[2];
  return (
    <section id="about" className="results about band" data-band="mist" aria-labelledby="about-title">
      <div className="page-wrap">
        <div className="about-grid">
          <Head
            icon={<Building2 size={13} strokeWidth={2.2} />}
            id="about-title"
            label={ABOUT.eyebrow}
            headline={ABOUT.headline}
          />
          <p data-reveal className="t-lede about-lede">
            {ABOUT.body}
          </p>
          <div data-reveal className="about-photo">
            <AreaPhoto area={area} sizes="(min-width: 1024px) 640px, 92vw" />
          </div>
          <div className="about-side">
            <p data-reveal className="t-body about-second">
              {ABOUT.second}
            </p>
            <div data-reveal className="about-founder bento-card" style={toneVars("cobalt")}>
              <div className="about-founder-head">
                <div className="about-founder-photo">
                  <Image src={founderPhoto} alt={f.photoAlt} sizes="180px" />
                </div>
                <div className="about-founder-id">
                  <p className="t-subtitle about-founder-name">{f.name}</p>
                  <p className="t-small about-founder-role">{f.role}</p>
                </div>
              </div>
              <p className="t-body about-founder-text">{f.experience}</p>
              <FounderFacts />
              <a className="ed-link about-founder-link" href={f.linkedin} target="_blank" rel="noopener noreferrer">
                {ABOUT.linkedin}
                <Arrow />
              </a>
            </div>
            <SectionLink href={CTA.href} className="btn btn-primary about-cta">
              {ABOUT.cta}
              <Arrow />
            </SectionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The founder's company in three figures, each over a small unit chart with one mark per person,
 *  project or year. The figures count up and the marks draw in once, when the card comes into view;
 *  reduced motion shows both at rest. */
function FounderFacts() {
  const f = ABOUT.founder;
  const ref = useRef<HTMLUListElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setOn(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <ul ref={ref} className="about-facts" aria-label={f.company} data-on={on || undefined}>
      {f.figures.map((x) => (
        <li key={x.label} className="about-fact" data-kind={x.kind} style={toneVars(x.tone)}>
          <span className="about-fact-v tabular">
            <CountUp value={x.value} play={on} duration={1200} />
          </span>
          <span className="about-fact-art" aria-hidden>
            {Array.from({ length: x.n }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i } as CSSProperties} />
            ))}
          </span>
          <span className="t-label about-fact-l">{x.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function HowItWorks() {
  return (
    <section id="how" className="how" aria-labelledby="how-title">
      <HowSteps
        head={
          <Head
            icon={<Workflow size={13} strokeWidth={2.2} />}
            id="how-title"
            label={HOW.eyebrow}
            headline={HOW.headline}
            lede={HOW.intro}
            className="how-title"
          />
        }
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** Each question answers in one of the system colours, in turn. */
const FAQ_TONES = [
  "cobalt",
  "violet",
  "emerald",
  "saffron",
  "tangerine",
  "pink",
] as const;

/** Buyer objections on their own screen: the head, one link to the audit and the answer's figure left, the questions right. */
function Faq() {
  const fig = useFaqFigure();
  return (
    <section id="faq" className="faq" aria-labelledby="faq-title">
      <div className="page-wrap faq-grid">
        <LiquidShapes preset="faq" />
        <div className="faq-side">
          <Head
            icon={<MessageCircleQuestion size={13} strokeWidth={2.2} />}
            id="faq-title"
            label={FAQ_COPY.eyebrow}
            headline={FAQ_COPY.headline}
          />
          <p data-reveal className="faq-help">
            <span>{FAQ_COPY.helpTitle}</span>
            <SectionLink href="#audit" className="ed-link">
              {FAQ_COPY.helpLink}
              <Arrow />
            </SectionLink>
          </p>
          <FaqFigure index={fig.index} />
        </div>
        <FaqList
          items={FAQ.map((f, i) => ({
            ...f,
            topic: FAQ_TOPICS[i],
            tone: FAQ_TONES[i % FAQ_TONES.length],
          }))}
          jump
          {...fig.list}
        />
      </div>
    </section>
  );
}
