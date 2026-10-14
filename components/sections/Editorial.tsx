"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChartNoAxesCombined,
  Database,
  Eye,
  LayoutGrid,
  MessageCircleQuestion,
  Plug,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, FAQ, FAQ_TOPICS, OUTCOMES } from "@/lib/content";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import {
  APPLICATIONS_COPY,
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
import { ReadWheel } from "./ReadWheel";
import { SystemsRing } from "./SystemsRing";
import { Statement } from "./Statement";
import { OUTCOME_TONE, OutcomeGraphic } from "./OutcomeGraphic";
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
  index,
  label,
  headline,
  lede,
  className,
  align,
  icon,
}: {
  id: string;
  index: string;
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
      index={index}
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
      <Systems />
      <Statement index="02" />
      <Applications />
      <TrailDial index="04" />
      <Outcomes />
      <HowItWorks />
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
          index="01"
          label={SYSTEMS_STRIP.eyebrow}
          headline={SYSTEMS_STRIP.headline}
          align="center"
        />
        {/* The three promises, each with its sign. */}
        <ul data-reveal className="orbit-promises">
          {SYSTEMS_STRIP.promises.map((p, i) => {
            const Icon = [Eye, Plug, ShieldCheck][i];
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
      {/* The other kinds of system, on a dial the scroll turns. */}
      <ReadWheel />
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
      {/* The night band (Orvan's services): the head, then the five areas as numbered rows. */}
      <div className="night-panel">
        <div className="page-wrap apps-head">
          <Head
            icon={<LayoutGrid size={13} strokeWidth={2.2} />}
            id="applications-title"
            index="03"
            label={APPLICATIONS_COPY.eyebrow}
            headline={APPLICATIONS_COPY.headline}
          />
          <div className="apps-head-side">
            <p data-reveal className="t-lede">
              {APPLICATIONS_COPY.intro}
            </p>
          </div>
        </div>
        <div className="page-wrap">
          <AreaRows />
        </div>
      </div>
      {/* The explorer shows one application at a time; this list gives readers and crawlers all eight
          (the area panels link to each entry). */}
      <ol className="sr-only" aria-label={APPLICATIONS_COPY.listAria}>
        {APPLICATIONS.map((a, i) => {
          const d = APPLICATION_DEMOS[i];
          return (
            <li key={a.name} id={`application-${d.kind}`} tabIndex={-1}>
              {a.name}, {a.category}. {d.headline.replace("\n", " ")}{" "}
              {d.steps.join(" ")}
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
  const [seen, setSeen] = useState<boolean[]>(() => OUTCOMES.map(() => false));
  // The nav's Outcomes glance brings its case to the front of the stack.
  useEffect(
    () =>
      onOutcome((i) => {
        const card = root.current?.querySelectorAll<HTMLElement>(
          ".outcome-stack-card",
        )[i];
        if (card)
          void jumpTo(
            card.offsetTop + (root.current?.offsetTop ?? 0) - 96 - i * 18,
          );
      }),
    [],
  );
  useEffect(() => {
    const cards = Array.from(
      root.current?.querySelectorAll<HTMLElement>(".outcome-stack-card") ?? [],
    );
    // Each number counts up once its card's top clears the lower quarter of the view.
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = cards.indexOf(e.target as HTMLElement);
          setSeen((s) => (s[i] ? s : s.map((v, k) => v || k === i)));
          io.unobserve(e.target);
        }),
      { threshold: 0, rootMargin: "0px 0px -25% 0px" },
    );
    cards.forEach((c) => io.observe(c));
    if (!root.current || reduced()) return () => io.disconnect();
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const scrollTrigger = { trigger: card, start: "top 70%" };
        gsap.fromTo(
          card.querySelectorAll(".outcome-stroke"),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger,
          },
        );
        gsap.fromTo(
          card.querySelectorAll(".outcome-bar"),
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 1.4, ease: "power2.out", scrollTrigger },
        );
        // A card steps back as the next one slides over it (the stacked cards of the Koushik reference).
        const next = cards[i + 1];
        if (next) {
          gsap.to(card.querySelector(".outcome-figure"), {
            scale: 0.94,
            ease: "none",
            scrollTrigger: {
              trigger: next,
              start: "top bottom",
              end: "top 30%",
              scrub: true,
            },
          });
        }
      });
    }, root);
    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);
  // The head, then the three cases as cards that stack as the page scrolls, each over the last.
  return (
    <section
      ref={root}
      id="outcomes"
      className="results band"
      data-band="mist"
      aria-labelledby="outcomes-title"
    >
      <div className="page-wrap">
        <div className="results-head">
          <Head
            icon={<ChartNoAxesCombined size={13} strokeWidth={2.2} />}
            id="outcomes-title"
            index="05"
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
        <div className="outcome-wrap">
          <LiquidShapes preset="outcomes" />
          <ol className="outcome-stack" aria-label={OUTCOMES_COPY.tabsAria}>
            {OUTCOMES.map((o, i) => (
              <li
                key={o.sector}
                className="outcome-stack-card"
                style={{ ...toneVars(OUTCOME_TONE[i]), ["--i" as string]: i }}
              >
                <figure className="outcome-figure" aria-label={o.sector}>
                  <p className="outcome-top t-label">
                    <span>
                      <span className="tabular outcome-n">
                        {String(i + 1).padStart(2, "0")}
                      </span>{" "}
                      / {o.sector}
                    </span>
                    <span className="outcome-of tabular">
                      {String(i + 1).padStart(2, "0")} of{" "}
                      {String(OUTCOMES.length).padStart(2, "0")}
                    </span>
                  </p>
                  <div className="outcome-visual">
                    <OutcomeGraphic index={i} />
                  </div>
                  <div className="outcome-copy">
                    <p className="outcome-number t-num-lg">
                      <CountUp value={o.value} play={seen[i]} duration={1100} />
                    </p>
                    <p className="outcome-label t-subtitle">{o.label}</p>
                    <p className="outcome-description t-body">{o.quote}</p>
                    <figcaption className="t-label">{o.context}</figcaption>
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

function HowItWorks() {
  return (
    <section id="how" className="how" aria-labelledby="how-title">
      <HowSteps
        head={
          <Head
            icon={<Workflow size={13} strokeWidth={2.2} />}
            id="how-title"
            index="06"
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
            index="07"
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
