"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Building2,
  ChartNoAxesCombined,
  Database,
  FileCheck2,
  FolderOpen,
  LayoutGrid,
  MessageCircleQuestion,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import founderPhoto from "@/assets/photos/founder.jpg";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, AUDIENCE, FAQ, FAQ_TOPICS, FEATURED, LEGACY_ANCHORS } from "@/lib/content";
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
import { SystemsRing } from "./SystemsRing";
import { Statement } from "./Statement";
import { OUTCOME_TONE, OutcomeGraphic } from "./OutcomeGraphic";
import { AreaPhoto } from "./AreaPhoto";
import { AREAS } from "@/lib/areas";
import { AreaRows } from "./AreaRows";
import { LiquidShapes } from "../ui/LiquidShapes";
import { TrailDial } from "./TrailDial";
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

/** A section head: its index on the page, label, two lines (the second in the accent ink) and an
 *  optional lede. Neutral chrome (D6). The indexes run 01 to 07 down the page, the trail and the audit
 *  included (TrailDial.tsx, Audit.tsx). */
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

/** Everything below the story, as one sheet over it. The page renders <Footer /> after <main>. */
export function Editorial() {
  const ref = useReveal();
  return (
    <div ref={ref} className="editorial relative bg-bg">
      <Audience />
      <Statement />
      <Applications />
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
  // The six systems travel round the head as a ring of photographs; the other types follow on a dial.
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
        {/* The three promises, each with its sign. */}
        <ul data-reveal className="orbit-promises">
          {SYSTEMS_STRIP.promises.map((p, i) => {
            const Icon = [FolderOpen, FileCheck2, ShieldCheck][i];
            return (
              <li key={p}>
                <Icon size={15} strokeWidth={2.1} aria-hidden />
                {p}
              </li>
            );
          })}
        </ul>
        <p data-reveal className="t-small works-with-note">
          {SYSTEMS_STRIP.footnote}
        </p>
      </SystemsRing>
      {/* The three groups of records the proposed workflows use (handoff home.systems). */}
      <div className="page-wrap">
        <ul className="record-groups">
          {SYSTEMS_STRIP.groups.map((g) => (
            <li key={g.name} data-reveal className="record-group" style={toneVars(g.tone)}>
              <p className="record-group-k t-label">
                <i aria-hidden />
                {g.name}
              </p>
              <p className="t-body record-group-text">{g.text}</p>
            </li>
          ))}
        </ul>
        <p data-reveal className="t-small record-groups-note">
          {SYSTEMS_STRIP.note}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Applications() {
  return (
    <section
      id="applications"
      className="apps"
      aria-labelledby="applications-title"
    >
      {/* The night band: the head, then the five functions as numbered rows. */}
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
              {APPLICATIONS_COPY.note}{" "}
              <SectionLink href="/solutions" className="ed-link">
                {APPLICATIONS_COPY.all}
                <Arrow />
              </SectionLink>
            </p>
          </div>
        </div>
        <div className="page-wrap">
          <AreaRows />
        </div>
      </div>
      {/* The explorer shows one workflow at a time; this list gives readers and crawlers all six (the
          function rows link to each entry). Old #application-{kind} links land on the workflow that
          replaced them (handoff legacy anchor mapping). */}
      <ol className="sr-only" aria-label={APPLICATIONS_COPY.listAria}>
        {APPLICATIONS.map((a) => (
          <li key={a.id} id={`application-${a.id}`} tabIndex={-1}>
            {Object.entries(LEGACY_ANCHORS)
              .filter(([, to]) => to === a.id)
              .map(([from]) => (
                <span key={from} id={`application-${from}`} />
              ))}
            {a.name}, {a.status.toLowerCase()} in {a.category.toLowerCase()}. {a.text} {APPLICATIONS_COPY.labels.fit}: {a.fit}
          </li>
        ))}
      </ol>
      <ApplicationExplorer apps={[...FEATURED]} />
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** The three customer segments as cards that stack as the page scrolls, each over the last. */
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
                    <span>{seg.industries}</span>
                  </p>
                  <div className="outcome-visual">
                    <OutcomeGraphic index={i} />
                  </div>
                  <div className="outcome-copy">
                    <h3 id={`seg-${i}`} className="outcome-number t-title-card">
                      {seg.name}
                    </h3>
                    <p className="outcome-label t-subtitle">{seg.text}</p>
                    <p className="outcome-description t-body">{seg.example}</p>
                    <figcaption className="t-label segment-flows">
                      <span>{AUDIENCE_COPY.workflows}</span>
                      <ul>
                        {seg.workflows.map((id) => {
                          const w = APPLICATIONS.find((x) => x.id === id)!;
                          return <li key={id}>{w.name}</li>;
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
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** What to measure (handoff home.delivery.measurement), kept at #outcomes for old links. */
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
          {OUTCOMES_COPY.measures.map((m) => (
            <li key={m.k} data-reveal className="record-group" style={toneVars(m.tone)}>
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

/** About (handoff home.about): head and lede, then the place beside the second paragraph, the founder and the call to action, on one pair of columns. */
function About() {
  const f = ABOUT.founder;
  const area = AREAS[1];
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
                  <p className="bento-k t-label">{ABOUT.founderLabel}</p>
                  <p className="t-subtitle about-founder-name">{f.name}</p>
                  <p className="t-small about-founder-role">{f.role}</p>
                </div>
              </div>
              <p className="t-body about-founder-text">{f.experience}</p>
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
