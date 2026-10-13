"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, FAQ, FAQ_TOPICS, OUTCOMES } from "@/lib/content";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { APPLICATIONS_COPY, FAQ_COPY, HOW, OUTCOMES_COPY, SYSTEMS_STRIP, type Headline } from "@/lib/copy";
import { AREAS } from "@/lib/areas";
import { jumpTo, onOutcome, showArea } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import SectionTitle from "../ui/SectionTitle";
import SegmentedControl from "../ui/SegmentedControl";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { CountUp } from "../ui/CountUp";
import { SystemsRibbon } from "./SystemsRibbon";
import { OUTCOME_TONE, OutcomeGraphic } from "./OutcomeGraphic";
import { AreaStack, plainClick } from "./AreaStack";
import { Trail } from "./Trail";
import { Roadmap } from "./Roadmap";
import { FaqList } from "./FaqList";
import { FaqFigure, useFaqFigure } from "./FaqArt";
import { Audit } from "./Audit";
import { ApplicationExplorer } from "./ApplicationExplorer";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paragraphs fade and rise into place; headlines rise line by line out of their own masks. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal], .ed-title .section-title-label, .ed-title .section-title-lede").forEach((el) => {
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
        gsap.fromTo(
          el.querySelectorAll(".line-mask > span"),
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.3,
            ease: "expo.out",
            stagger: 0.09,
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

/** A section head: label, two lines (the second in the accent ink) and an optional lede. Neutral chrome (D6). */
function Head({ id, label, headline, lede, className }: { id: string; label: string; headline: Headline; lede?: string; className?: string }) {
  return (
    <SectionTitle
      id={id}
      label={label}
      lines={two(headline)}
      lede={lede}
      tone="ink"
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
      <Systems />
      <Applications />
      <Trail />
      <Outcomes />
      <HowItWorks />
      <Faq />
      <Audit />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Systems() {
  return (
    <section className="works-with-section" aria-labelledby="systems-title">
      <div className="works-with page-wrap">
        <Head id="systems-title" label={SYSTEMS_STRIP.eyebrow} headline={SYSTEMS_STRIP.headline} lede={SYSTEMS_STRIP.sub} />
        <p data-reveal className="t-small works-with-more">{SYSTEMS_STRIP.more}</p>
        <p data-reveal className="t-small works-with-note">{SYSTEMS_STRIP.footnote}</p>
      </div>
      <SystemsRibbon />
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Applications() {
  return (
    <section id="applications" className="apps" aria-labelledby="applications-title">
      {/* Title left; the intro and an index of the five areas right. */}
      <div className="page-wrap apps-head">
        <Head id="applications-title" label={APPLICATIONS_COPY.eyebrow} headline={APPLICATIONS_COPY.headline} />
        <div className="apps-head-side">
          <p data-reveal className="t-lede">{APPLICATIONS_COPY.intro}</p>
          <ul data-reveal className="apps-index" aria-label={APPLICATIONS_COPY.indexAria}>
            {AREAS.map((a, i) => (
              <li key={a.slug}>
                <a
                  href={`#area-${a.slug}`}
                  style={toneVars(a.tone)}
                  onClick={(e) => {
                    if (!plainClick(e)) return;
                    e.preventDefault();
                    showArea(i);
                  }}
                >
                  <i aria-hidden />
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AreaStack />
      {/* The explorer shows one application at a time; this list gives readers and crawlers all eight
          (the area panels link to each entry). */}
      <ol className="sr-only" aria-label={APPLICATIONS_COPY.listAria}>
        {APPLICATIONS.map((a, i) => {
          const d = APPLICATION_DEMOS[i];
          return (
            <li key={a.name} id={`application-${d.kind}`} tabIndex={-1}>
              {a.name}, {a.category}. {d.headline.replace("\n", " ")} {d.steps.join(" ")}
            </li>
          );
        })}
      </ol>
      <ApplicationExplorer />
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Outcomes() {
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [tab, setTab] = useState(0);
  // The nav's Outcomes glance opens a case directly.
  useEffect(() => onOutcome((i) => { setTab(i); void jumpTo("#outcomes"); }), []);
  useEffect(() => {
    const card = root.current?.querySelector(".outcome-card");
    if (!card) return;
    // Fires once the card's top clears the lower quarter of the viewport. A ratio threshold never
    // trips on phones, where the stacked card is taller than the screen.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -25% 0px" });
    io.observe(card);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!root.current || reduced()) return;
    const ctx = gsap.context(() => {
      const scrollTrigger = { trigger: ".outcome-card", start: "top 65%" };
      gsap.fromTo(".outcome-stroke", { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out", scrollTrigger });
      gsap.fromTo(".outcome-bar", { scaleX: 0, transformOrigin: "left" }, { scaleX: 1, duration: 1.4, ease: "power2.out", scrollTrigger });
    }, root);
    return () => ctx.revert();
  }, []);
  // One focus: the head, then one case card switched by the tabs. The facts band closes the Trail.
  return (
    <section ref={root} id="outcomes" className="results" aria-labelledby="outcomes-title">
      <div className="page-wrap">
        {/* Title left; the intro and the disclaimer right, so the head, tabs and card share one screen. */}
        <div className="results-head">
          <Head id="outcomes-title" label={OUTCOMES_COPY.eyebrow} headline={OUTCOMES_COPY.headline} />
          <div className="results-head-side">
            <p data-reveal className="t-lede">{OUTCOMES_COPY.intro}</p>
            <p data-reveal className="t-small results-note">{OUTCOMES_COPY.note}</p>
          </div>
        </div>
        <SegmentedControl
          className="results-tabs"
          label={OUTCOMES_COPY.tabsAria}
          items={OUTCOMES.map((o, i) => ({ value: String(i), label: o.sector, tone: OUTCOME_TONE[i], controls: `outcome-panel-${i}` }))}
          value={String(tab)}
          onChange={(v) => setTab(Number(v))}
        />
        <div className="outcome-card">
          {OUTCOMES.map((o, i) => (
            <figure
              key={o.sector}
              id={`outcome-panel-${i}`}
              role="tabpanel"
              aria-label={o.sector}
              hidden={tab !== i}
              className="outcome-figure"
              style={toneVars(OUTCOME_TONE[i])}
            >
              <div className="outcome-visual">
                <OutcomeGraphic index={i} />
              </div>
              <div className="outcome-copy">
                <p className="outcome-number t-num-lg"><CountUp value={o.value} play={seen && tab === i} duration={1100} /></p>
                <p className="outcome-label t-subtitle">{o.label}</p>
                <p className="outcome-description t-body">{o.quote}</p>
                <figcaption className="t-label">{o.context}</figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function HowItWorks() {
  return (
    <section id="how" className="how" aria-labelledby="how-title">
      <div className="page-wrap">
        <Roadmap head={<Head id="how-title" label={HOW.eyebrow} headline={HOW.headline} lede={HOW.intro} className="how-title" />} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** Buyer objections on their own screen: the head, one link to the audit and the answer's figure left, the questions right. */
function Faq() {
  const fig = useFaqFigure();
  return (
    <section id="faq" className="faq" aria-labelledby="faq-title">
      <div className="page-wrap faq-grid">
        <div className="faq-side">
          <Head id="faq-title" label={FAQ_COPY.eyebrow} headline={FAQ_COPY.headline} />
          <p data-reveal className="faq-help">
            <span>{FAQ_COPY.helpTitle}</span>
            <SectionLink href="#audit" className="ed-link">
              {FAQ_COPY.helpLink}
              <Arrow />
            </SectionLink>
          </p>
          <FaqFigure index={fig.index} />
        </div>
        <FaqList items={FAQ.map((f, i) => ({ ...f, topic: FAQ_TOPICS[i] }))} jump {...fig.list} />
      </div>
    </section>
  );
}
