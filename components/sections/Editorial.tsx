"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, FAQ, OUTCOMES, PATHS } from "@/lib/content";
import { SystemsRibbon } from "./SystemsRibbon";
import { AreaStack, GlanceGrid, PipelineStrip, Roadmap } from "./GrowlioSections";
import { Audit } from "./Audit";
import { Footer } from "./Footer";
import { ApplicationExplorer } from "./ApplicationExplorer";
import { CountUp } from "../ui/CountUp";
import { scrollToTarget } from "../SmoothScroll";
import { Bot, CalendarClock, CircleCheck, Database, KeyRound, Layers, Lock, MessageCircle, Plug, ScanSearch, ShieldCheck, Target, type LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paragraphs come into focus; headlines rise line by line out of their own masks. */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
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

function Lines({ lines }: { lines: React.ReactNode[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span>{l}</span>
        </span>
      ))}
    </>
  );
}

function Heading({
  eyebrow,
  tone,
  lines,
  intro,
}: {
  eyebrow: string;
  tone: string;
  lines: React.ReactNode[];
  intro?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl text-center">
      <p data-reveal className="eyebrow inline-flex items-center gap-2.5">
        <span className="diamond" style={{ color: `var(--color-${tone})` }} />
        {eyebrow}
      </p>
      <h2 data-lines className="display mt-5 text-[clamp(32px,4.2vw,60px)]">
        <Lines lines={lines} />
      </h2>
      {intro && (
        <p data-reveal className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          {intro}
        </p>
      )}
    </div>
  );
}

export function Editorial() {
  const ref = useReveal();
  return (
    <main
      ref={ref as React.RefObject<HTMLElement>}
      className="editorial relative z-30 rounded-t-[36px] bg-bg shadow-[0_-1px_0_rgba(20,19,15,0.06),0_-28px_70px_-36px_rgba(20,19,15,0.22)] md:rounded-t-[56px]"
    >
      <Systems />
      <Applications />
      <PipelineStrip />
      <Outcomes />
      <GlanceGrid />
      <HowItWorks />
      <Faq />
      <Audit />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */

const CONNECT_STEPS = [
  { Icon: Plug, t: "Connect", d: "Read-only links to what you run", c: "cobalt" },
  { Icon: ScanSearch, t: "Read", d: "Live context, refreshed in minutes", c: "violet" },
  { Icon: CircleCheck, t: "Recommend", d: "One action, sent for approval", c: "emerald" },
];

function Systems() {
  return (
    <section className="works-with-section">
      <div data-reveal className="works-with">
        <p className="eyebrow inline-flex items-center gap-2"><span className="diamond" style={{ color: "var(--color-emerald)" }} />Works with what you run</p>
        <p className="works-with-title">Decignal reads across the systems <em className="spectrum-text">you already run.</em></p>
        <ul className="works-with-pills">
          {[["No rip-and-replace programme", "cobalt"], ["No perfect data lake", "saffron"], ["Read-only to start", "emerald"]].map(([t, c]) => (
            <li key={t} style={{ ["--tone" as string]: `var(--color-${c})` }}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="7" /><path d="M4.6 8.3l2.2 2.2 4.6-4.8" /></svg>
              {t}
            </li>
          ))}
        </ul>
        <ol className="connect-steps">
          {CONNECT_STEPS.map(({ Icon, t, d, c }, i) => (
            <li key={t} style={{ ["--tone" as string]: `var(--color-${c})` }}>
              <span className="connect-icon"><Icon size={17} strokeWidth={2} /></span>
              <span className="connect-n tabular">0{i + 1}</span>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </div>
      <SystemsRibbon />
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Applications() {
  return (
    <section id="applications" className="scroll-mt-24 pt-16 md:pt-24">
      <div className="px-6 md:px-10"><Heading
        eyebrow="Applications" tone="cobalt"
        lines={["The same intelligence.", <>Every <em className="spectrum-text">part of your operation.</em></>]}
        intro="From the first signal to the right action. Follow the decisions as you scroll."
      /></div>
      <AreaStack />
      <ApplicationExplorer indices={APPLICATIONS.map((_, i) => i)} />
    </section>
  );
}

/* ------------------------------------------------------------------ */


const OUTCOME_FILL = ["var(--color-cobalt)", "var(--color-tangerine)", "var(--color-emerald)"];

function OutcomeGraphic({ index }: { index: number }) {
  return <svg className="outcome-diagram" viewBox="0 0 300 100" role="img" aria-label={["Transfer arrives on day 2, before the day 6 safety breach", "380 units retained equals the source plant’s reserved plan", "Fourteen service cases linked to one escalation"][index]}>
    {index === 0 ? <>
      <path d="M12 58H288" stroke="currentColor" strokeOpacity=".3" />
      {[0,1,2,3,4,5,6].map(i=><g key={i}><path d={`M${12+i*46} 52v12`} stroke="currentColor" strokeOpacity=".5"/><text x={12+i*46} y="88" textAnchor="middle">{i===0?"NOW":`D${i}`}</text></g>)}
      <path className="outcome-stroke" pathLength="1" d="M12 58H104" stroke="white" strokeWidth="4"/><circle cx="104" cy="58" r="6" fill="white"/><text x="104" y="30" textAnchor="middle">ARRIVES</text><text x="274" y="30" textAnchor="end">RISK</text>
    </> : index === 1 ? <>
      <text x="0" y="19">RETAINED</text><text x="300" y="19" textAnchor="end">380</text><rect x="0" y="29" width="300" height="11" rx="3" fill="white" fillOpacity=".2"/><rect className="outcome-bar" x="0" y="29" width="184" height="11" rx="3" fill="white"/>
      <text x="0" y="70">RESERVED PLAN</text><text x="300" y="70" textAnchor="end">380</text><rect x="0" y="80" width="184" height="5" rx="2" fill="white" fillOpacity=".6"/><path d="M184 24V92" stroke="white" strokeDasharray="3 3"/>
    </> : <>
      {Array.from({length:14},(_,i)=><g key={i}><path d={`M${8+i%7*22} ${24+Math.floor(i/7)*40}L232 44`} stroke="white" strokeOpacity=".18"/><rect x={i%7*22} y={12+Math.floor(i/7)*40} width="14" height="22" rx="2" fill="white" fillOpacity=".7"/></g>)}<circle cx="249" cy="44" r="24" fill="none" stroke="white" strokeWidth="2"/><path d="M238 44l8 8 14-16" stroke="white" strokeWidth="2" fill="none"/><text x="249" y="92" textAnchor="middle">ONE OWNER</text>
    </>}
  </svg>;
}

function Outcomes() {
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const grid = root.current?.querySelector(".outcome-grid");
    if (!grid) return;
    // Fires once the grid's top clears the lower quarter of the viewport. A ratio threshold
    // never trips on phones, where the stacked cards are taller than the screen.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -25% 0px" });
    io.observe(grid);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!root.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".outcome-stroke", {strokeDasharray: 1, strokeDashoffset: 1}, {strokeDashoffset:0, duration:1.4, ease:"power2.out", scrollTrigger:{trigger:root.current,start:"top 65%"}});
      gsap.fromTo(".outcome-bar", {scaleX:0,transformOrigin:"left"}, {scaleX:1,duration:1.4,ease:"power2.out",scrollTrigger:{trigger:root.current,start:"top 65%"}});
    }, root);
    return () => ctx.revert();
  }, []);
  return <section ref={root} id="outcomes" className="scroll-mt-24 px-6 md:px-10">
    <Heading eyebrow="The outcome" tone="emerald" lines={["Know what changed.", <>See <em className="spectrum-text">why it matters.</em></>]} intro="Every recommendation should end in an operating result you can check." />
    <div className="outcome-grid outcome-cases mx-auto mt-10 max-w-6xl">
      <div className="case-tabs" role="tablist" aria-label="Outcomes">
        {OUTCOMES.map((o,i)=><button key={o.sector} role="tab" aria-selected={tab===i} onClick={()=>setTab(i)} style={{["--tone" as string]:OUTCOME_FILL[i]}}><i />{o.sector}</button>)}
      </div>
      {OUTCOMES.map((o,i)=><figure key={o.sector} role="tabpanel" hidden={tab!==i} className="outcome-figure case-card" style={{background:OUTCOME_FILL[i]}}>
        <div className="case-visual"><p className="eyebrow text-white/80!">{o.sector}</p><OutcomeGraphic index={i}/></div>
        <div className="case-copy"><p className="outcome-number"><CountUp value={o.value} play={seen && tab===i} duration={1100} /></p><p className="outcome-label">{o.label}</p>
        <p className="outcome-description">{o.quote}</p><figcaption>{o.context}</figcaption></div>
      </figure>)}
    </div><p className="mx-auto mt-5 max-w-6xl text-[11px] text-ink-soft">Illustrative decisions from the scenes above. Deployment results are measured against your own baseline.</p>
  </section>;
}

/* ------------------------------------------------------------------ */

function HowItWorks() {
  const [path, setPath] = useState<keyof typeof PATHS>("custom");
  return (
    <section id="how" className="scroll-mt-24 px-6 pt-16 md:px-10 md:pt-24">
      <Heading
        eyebrow="How it works"
        tone="violet"
        lines={[
          "One decision first.",
          <>
            Then <em className="spectrum-text">build from there.</em>
          </>,
        ]}
        intro="Two practical routes to the same outcome: an application working safely inside your operation. Scroll to walk the route."
      />
      <Roadmap path={path} setPath={setPath} />
    </section>
  );
}

/* ------------------------------------------------------------------ */

const FAQ_META: { Icon: LucideIcon; topic: string; tone: string }[] = [
  { Icon: Layers, topic: "Integration", tone: "cobalt" },
  { Icon: Database, topic: "Data", tone: "saffron" },
  { Icon: Lock, topic: "Security", tone: "violet" },
  { Icon: Bot, topic: "Automation", tone: "emerald" },
  { Icon: ShieldCheck, topic: "Control", tone: "tangerine" },
  { Icon: KeyRound, topic: "Ownership", tone: "pink" },
  { Icon: Target, topic: "Getting started", tone: "cobalt" },
  { Icon: CalendarClock, topic: "Timeline", tone: "emerald" },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="faq scroll-mt-24">
      <div className="faq-side">
        <div className="faq-sticky">
          <p data-reveal className="eyebrow inline-flex items-center gap-2.5">
            <span className="diamond" style={{ color: "var(--color-tangerine)" }} />
            Before you begin
          </p>
          <h2 data-lines className="display faq-title">
            <Lines lines={["Questions enterprise", <>teams <em className="spectrum-text">ask first.</em></>]} />
          </h2>
          <ul className="faq-trust">
            {[[Layers, "No rip-and-replace programme", "cobalt"], [Database, "No perfect data lake required", "saffron"], [ShieldCheck, "Human control stays visible", "emerald"]].map(([Icon, t, c]) => {
              const I = Icon as LucideIcon;
              return (
                <li key={t as string} style={{ ["--tone" as string]: `var(--color-${c})` }}>
                  <span><I size={15} /></span>
                  {t as string}
                </li>
              );
            })}
          </ul>
          <div className="faq-help">
            <div className="faq-help-art" aria-hidden>
              {["cobalt", "violet", "emerald"].map((t, i) => <span key={t} style={{ ["--tone" as string]: `var(--color-${t})`, ["--i" as string]: i }}>{["RK", "AM", "SN"][i]}</span>)}
              <i><MessageCircle size={15} /></i>
            </div>
            <p className="faq-help-title">Still have a question?</p>
            <p className="faq-help-text">Bring it to the free AI audit: 30 minutes with the team, about one decision in your operation.</p>
            <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary">
              Book a free AI audit
            </button>
          </div>
        </div>
      </div>
      <ul className="faq-list">
        {FAQ.map((f, i) => {
          const on = open === i;
          const { Icon, topic, tone } = FAQ_META[i];
          return (
            <li key={f.q} className="faq-item" data-open={on || undefined} style={{ ["--tone" as string]: `var(--color-${tone})` }}>
              <button id={`faq-q-${i}`} onClick={() => setOpen(on ? null : i)} aria-expanded={on} aria-controls={`faq-a-${i}`} className="faq-q">
                <span className="faq-icon"><Icon size={18} /></span>
                <span className="faq-q-text">
                  <span className="faq-topic">{String(i + 1).padStart(2, "0")} · {topic}</span>
                  <span className="faq-q-title">{f.q}</span>
                </span>
                <span className="faq-plus" aria-hidden><i /><i /></span>
              </button>
              <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} inert={!on} className="faq-a" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                <div className="min-h-0 overflow-hidden">
                  <p>{f.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
