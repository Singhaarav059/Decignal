"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, FAQ, OUTCOMES, PATHS, STACK } from "@/lib/content";
import { Audit } from "./Audit";
import { Footer } from "./Footer";
import { ApplicationExplorer } from "./ApplicationExplorer";

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
      <KineticBand />
      <Outcomes />
      <HowItWorks />
      <Faq />
      <Audit />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */

const SYSTEM_TONES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

function Systems() {
  const row = (reverse: boolean) => (
    <div className="fade-x overflow-hidden">
      <ul
        aria-label="Systems Decignal works across"
        className="marquee items-center"
        style={{ ["--marquee-speed" as string]: "48s", animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[...STACK, ...STACK].map((s, i) => (
          <li
            key={i}
            aria-hidden={i >= STACK.length || undefined}
            className="system-item flex items-center gap-10 pr-10 md:gap-14 md:pr-14"
            style={{ ["--tone" as string]: `var(--color-${SYSTEM_TONES[i % 6]})` }}
          >
            <span className="font-serif text-[clamp(28px,3.4vw,48px)] leading-none whitespace-nowrap">
              {s}
            </span>
            <span aria-hidden className="diamond" style={{ color: "var(--tone)" }} />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className="pt-20 md:pt-24">
      <p data-reveal className="mx-auto max-w-[46ch] px-6 text-center text-[17px] leading-relaxed text-ink-2">
        Decignal works across the systems you already run. No rip-and-replace programme, no perfect data lake.
      </p>
      <div data-reveal className="mt-12 space-y-4 md:mt-10">
        {row(false)}
      </div>
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
      <ApplicationExplorer indices={APPLICATIONS.map((_, i) => i)} />
    </section>
  );
}

/* ------------------------------------------------------------------ */

const BAND = ["Signal", "Evidence", "Context", "Policy", "Decision", "Approval"];

/** The pipeline, written large, sliding with the scroll. */
function KineticBand() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const rows = ref.current.querySelectorAll<HTMLElement>("[data-band]");
    const ctx = gsap.context(() => {
      rows.forEach((r, i) => {
        gsap.fromTo(
          r,
          { xPercent: i ? -28 : 0 },
          {
            xPercent: i ? 0 : -28,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const words = [...BAND, ...BAND, ...BAND];
  return (
    <section ref={ref} className="overflow-hidden py-12 md:py-16" aria-label="Signal, evidence, context, policy, decision, approval">
      {[0].map((r) => (
        <div key={r} data-band className="flex w-max items-center gap-[4vw] pr-[4vw]" aria-hidden>
          {words.map((w, i) => {
            const k = (i + r * 3) % 6;
            const tone = SYSTEM_TONES[k];
            return (
              <span key={i} className="flex items-center gap-[4vw]">
                <span
                  className="display text-[clamp(38px,6vw,88px)] whitespace-nowrap"
                  style={k % 2 ? { color: `var(--color-${tone})` } : undefined}
                >
                  {w}
                </span>
                <span className="size-[1.6vw] min-h-3 min-w-3 rotate-45" style={{ background: `var(--color-${tone})` }} />
              </span>
            );
          })}
        </div>
      ))}
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
    <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
      {OUTCOMES.map((o,i)=><figure key={o.sector} data-reveal className="outcome-figure" style={{background:OUTCOME_FILL[i]}}>
        <p className="eyebrow text-white/80!">{o.sector}</p><p className="outcome-number">{o.value}</p><p className="outcome-label">{o.label}</p>
        <OutcomeGraphic index={i}/><p className="outcome-description">{o.quote}</p><figcaption>{o.context}</figcaption>
      </figure>)}
    </div><p className="mx-auto mt-5 max-w-6xl text-[11px] text-ink-soft">Illustrative decisions from the scenes above. Deployment results are measured against your own baseline.</p>
  </section>;
}

/* ------------------------------------------------------------------ */

const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];

function HowItWorks() {
  const [path, setPath] = useState<keyof typeof PATHS>("custom");
  const keys = Object.keys(PATHS) as (keyof typeof PATHS)[];
  const p = PATHS[path];
  const track = useRef<HTMLDivElement>(null);

  const list = useRef<HTMLOListElement>(null);
  // Steps count as "reached" once the route gets to them.
  const [reached, setReached] = useState(0);

  // The route draws itself as you scroll, and each step lights up as the line arrives.
  useEffect(() => {
    // Reduced motion: CSS shows every step lit and the route fully drawn.
    if (!track.current || !list.current || reduced()) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      const at = [0.01, 0.33, 0.66, 0.97];
      gsap.fromTo(
        track.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: track.current,
            start: "top 85%",
            end: "top 35%",
            scrub: 0.6,
            onUpdate: (st) => setReached(at.filter((t) => st.progress >= t).length),
          },
        },
      );
    });
    mm.add("(max-width: 767px)", () => {
      // Stacked steps: each lights as it crosses the lower third of the screen.
      ScrollTrigger.create({
        trigger: list.current,
        start: "top 70%",
        end: "bottom 70%",
        onUpdate: (st) => setReached(Math.min(4, Math.floor(st.progress * 4) + 1)),
        onLeaveBack: () => setReached(0),
      });
    });
    return () => mm.revert();
  }, []);

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
        intro="Two practical routes to the same outcome: an application working safely inside your operation."
      />
      <div data-reveal className="relative mx-auto mt-9 grid w-fit grid-cols-2 rounded-full border border-line bg-white/60 p-1">
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
          style={{ transform: path === "catalogue" ? "translateX(100%)" : "none" }}
          aria-hidden
        />
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => setPath(k)}
            aria-pressed={path === k}
            className={`relative min-h-11 rounded-full px-6 text-sm font-medium transition-colors duration-500 ${
              path === k ? "text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {PATHS[k].label}
          </button>
        ))}
      </div>
      <p key={p.intro} className="how-swap mx-auto mt-10 max-w-[56ch] text-center text-[16px] leading-relaxed text-ink-2">{p.intro}</p>

      <div className="relative mx-auto mt-10 max-w-6xl">
        <div className="absolute top-[22px] right-[12%] left-[12%] hidden h-px bg-line md:block" aria-hidden />
        <div
          ref={track}
          className="absolute top-[22px] right-[12%] left-[12%] hidden h-[2px] origin-left md:block"
          style={{ background: "var(--spectrum)" }}
          aria-hidden
        />
        <ol ref={list} className="relative grid gap-4 md:grid-cols-4 md:gap-5" aria-live="polite">
          {p.steps.map((s, i) => {
            const on = i < reached;
            const tone = `var(--color-${STEP_TONES[i]})`;
            return (
              <li key={i} className="how-step flex flex-col items-center text-center" data-on={on || undefined}>
                <span
                  className="how-badge tabular relative z-10 flex size-11 items-center justify-center rounded-full text-[13px] font-semibold ring-8 ring-bg"
                  style={{ ["--tone" as string]: tone }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mt-5 w-full flex-1 px-3 pb-3">
                  {/* Keyed by content: only what differs between the two routes re-enters. */}
                  <p
                    key={s.when}
                    className="how-swap eyebrow mt-4"
                    style={{ color: `color-mix(in oklab, ${tone} 62%, var(--color-ink))`, ["--i" as string]: i, ["--dir" as string]: path === "catalogue" ? 1 : -1 }}
                  >
                    {s.when}
                  </p>
                  <div
                    key={s.title}
                    className="how-swap"
                    style={{ ["--i" as string]: i + 0.5, ["--dir" as string]: path === "catalogue" ? 1 : -1 }}
                  >
                    <p className="mt-3 font-serif text-[23px] leading-[1.1]">{s.title}</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <p key={p.total} className="how-swap mx-auto mt-10 w-fit rounded-full border border-line bg-white/60 px-5 py-2.5 font-mono text-[11.5px] tracking-[0.1em] text-ink uppercase">
        {p.total}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 px-6 pt-16 md:px-10 md:pt-24">
      <Heading
        eyebrow="Before you begin"
        tone="tangerine"
        lines={[
          "Questions enterprise",
          <>
            teams <em className="spectrum-text">ask first.</em>
          </>,
        ]}
      />
      <div data-reveal className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2 text-sm text-ink-2">
        {["No rip-and-replace programme", "No perfect data lake required", "Human control stays visible"].map((t, i) => (
          <span key={t} className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2">
            <span className="size-1.5 rounded-full" style={{ background: `var(--color-${["cobalt", "saffron", "emerald"][i]})` }} />
            {t}
          </span>
        ))}
      </div>
      <ul className="mx-auto mt-9 max-w-4xl border-t border-line">
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <li key={f.q} className="border-b border-line">
              <button
                onClick={() => setOpen(on ? null : i)}
                aria-expanded={on}
                className="group flex w-full items-center gap-6 py-7 text-left"
              >
                <span
                  className="eyebrow tabular w-8 shrink-0 transition-colors duration-300"
                  style={on ? { color: "var(--color-cobalt)" } : undefined}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-serif text-[clamp(18px,1.7vw,23px)] leading-[1.25] tracking-[-0.02em]">
                  {f.q}
                </span>
                <span
                  className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-500 ease-[var(--ease-out-expo)] ${
                    on ? "rotate-45 border-cobalt bg-cobalt text-white" : "border-line-strong group-hover:border-ink"
                  }`}
                  aria-hidden
                >
                  <span className="absolute h-px w-3.5 bg-current" />
                  <span className="absolute h-3.5 w-px bg-current" />
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)]"
                style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p
                    className="max-w-[62ch] pb-8 pl-14 text-[16px] leading-relaxed text-ink-2 transition-[opacity,transform] duration-500 ease-[var(--ease-out-quint)]"
                    style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(-6px)", transitionDelay: on ? "120ms" : "0ms" }}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
