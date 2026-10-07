"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import {
  CH,
  INDUSTRIES,
  TOTAL_LEN,
  clamp01,
  localIn,
  onSelect,
  select,
  smoothstep,
  store,
  subscribe,
  weight,
} from "@/lib/story";
import { industryF } from "@/lib/layouts";
import { BEATS, transferredUnits } from "@/lib/scene";
import { DecisionControls } from "./DecisionControls";
import { IslandPanel } from "./IslandPanel";
import { SystemChips } from "./SystemChips";
import { ScaleApps } from "./ScaleApps";
import { IndustryDetail } from "./IndustryDetail";
import { scrollToTarget } from "../SmoothScroll";
import { TONE } from "./chapters";
import { Arrow } from "../ui/Arrow";


/** One word per chapter, set huge and faint behind the 3D. */
const GHOSTS: [number, string][] = [
  [CH.signal, "SIGNAL"],
  [CH.problem, "SHORTAGE"],
  [CH.context, "CONTEXT"],
  [CH.decision, "TRANSFER"],
  [CH.control, "APPROVAL"],
  [CH.scale, "FUNCTIONS"],
];

const Scene = dynamic(() => import("../three/Scene"), { ssr: false });

// Copy leaves before the next arrives: the gap between them belongs to the object moving.
const shown = (w: number) => smoothstep(0.7, 1, w);

/** Story text: one dominant idea per chapter, layered behind and in front of the object. */
export function Story() {
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const roots = [back.current, front.current].filter(Boolean) as HTMLDivElement[];
    const chEls = roots.flatMap((r) => Array.from(r.querySelectorAll<HTMLElement>("[data-ch]")));
    const indEls = Array.from(back.current?.querySelectorAll<HTMLElement>("[data-ind]") ?? []);
    const ghosts = Array.from(back.current?.querySelectorAll<HTMLElement>("[data-ghost]") ?? []);
    const stock = front.current?.querySelector<HTMLElement>("[data-stock]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastStock = "";
    // While a system is open, the giant headline steps back so the island and its panel lead.
    const offSelect = onSelect((n) => {
      back.current?.toggleAttribute("data-dim", n >= 0);
      front.current?.toggleAttribute("data-dim", n >= 0);
    });

    const off = subscribe((g) => {
      chEls.forEach((el) => {
        const w = shown(weight(Number(el.dataset.ch), g));
        el.style.opacity = String(w);
        el.style.transform = `translate3d(0, ${(1 - w) * 18}px, 0)`;
        el.style.filter = w > 0.98 ? "none" : `blur(${(1 - w) * 2}px)`;
        el.style.visibility = w < 0.005 ? "hidden" : "visible";
        // Headings resolve from a red and blue split into one sharp line as they settle.
        if (!still) {
          el.style.setProperty("--split", `${(1 - w) * 8}px`);
          el.style.setProperty("--split-k", String(Math.min(1, (1 - w) * 3)));
        }
        if (el.dataset.interactive !== undefined) el.style.pointerEvents = w > 0.6 ? "auto" : "none";
      });

      // Giant chapter words drift slowly behind the object, the way a camera passes type on a wall.
      ghosts.forEach((el) => {
        const c = Number(el.dataset.ghost);
        const w = weight(c, g);
        el.style.opacity = String(smoothstep(0.3, 1, w));
        el.style.visibility = w < 0.005 ? "hidden" : "visible";
        if (!still) el.style.transform = `translate3d(${(0.5 - (g - c)) * 18}vw, 0, 0)`;
      });

      // Plant 02's stock counts down as each pallet goes onto the truck.
      if (stock) {
          const t = g >= CH.decision + 1 ? 1 : localIn(CH.decision, g);
        const v = `${Math.round(620 - transferredUnits(t))} units`;
        if (v !== lastStock) {
          stock.textContent = v;
          lastStock = v;
        }
      }

      const f = industryF(localIn(CH.industries, g));
      const wi = shown(weight(CH.industries, g));
      indEls.forEach((el) => {
        const k = Number(el.dataset.ind);
        const w = wi * (1 - clamp01(Math.abs(f - k) * 2.4));
        el.style.opacity = String(w);
        el.style.filter = w > 0.98 ? "none" : `blur(${(1 - w) * 12}px)`;
        el.style.transform = `translate3d(0, ${(f - k) * -40}px, 0)`;
        el.style.visibility = w < 0.005 ? "hidden" : "visible";
      });

      // Leave the stage once the story is told.
      const out = 1 - smoothstep(0.72, 1, localIn(CH.final, g));
      if (canvas.current) canvas.current.style.opacity = String(out);
    });
    return () => {
      off();
      offSelect();
    };
  }, []);

  return (
    <>
      {/* Behind the object: the giant statements */}
      <div ref={back} className="pointer-events-none fixed inset-0 z-0 select-none" aria-hidden>
        <div data-ch={CH.fragments} className="absolute inset-x-0 top-[13vh] px-6 text-center">
          <p className="story-positioning eyebrow intro-fade">Decision intelligence · Your systems, connected</p>
          <p className="display mt-3 text-[clamp(36px,6.2vw,100px)]">
            <span className="intro-line line-mask">
              <span>Your operation.</span>
            </span>
            <span className="intro-line line-mask">
              <span>
                <em className="spectrum-text">Seen as a whole.</em>
              </span>
            </span>
          </p>
        </div>
        {GHOSTS.map(([c, word]) => (
          <p key={word} data-ghost={c} className="ghost-word" style={{ opacity: 0 }}>
            {word}
          </p>
        ))}
        <div data-ch={CH.decision} className="story-decision-heading absolute inset-x-0 top-[11vh] px-6 text-center">
          <p className="display text-[clamp(36px,6.5vw,108px)]">
            One clear
            <br />
            <em className="spectrum-text" style={{ ["--accent" as string]: "var(--color-emerald)" }}>decision.</em>
          </p>
        </div>
        {INDUSTRIES.map((ind, k) => (
          <div key={ind.name} data-ind={k} className="absolute inset-x-0 top-[12vh] px-6 text-center">
            <p className="display text-[clamp(36px,6.2vw,100px)]">{ind.name}</p>
          </div>
        ))}
        <div data-ch={CH.final} className="absolute inset-x-0 top-[14vh] px-6 text-center">
          <p className="display text-[clamp(36px,6.2vw,100px)]">
            Turn information
            <br />
            <em className="spectrum-text">into decisions.</em>
          </p>
        </div>
      </div>

      {/* The object */}
      <div ref={canvas} className="pointer-events-none fixed inset-0 z-10">
        <div className="intro-stage size-full">
          <Scene />
        </div>
      </div>

      {/* In front of the object: the explanation */}
      <div ref={front} className="story-overlay pointer-events-none fixed inset-0 z-20">
        {/* 01 Fragmented */}
        <div data-ch={CH.fragments} data-interactive className="story-intro absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
          <div className="intro-fade flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="max-w-[34ch] text-[15px] leading-relaxed text-ink-2 md:text-base">
                Six systems. One shortage to solve. Follow the evidence from the first signal to the approved action.
              </p>
              <SystemChips className="mt-4 max-w-[520px]" />
            </div>
            <div className="flex items-center gap-5">
              <span className="eyebrow hidden items-center gap-3 xl:inline-flex">
                <ScrollCue />
                Scroll to see how Decignal works
              </span>
              <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary">
                Book a free AI audit
                <Arrow />
              </button>
            </div>
          </div>
        </div>

        {/* 02 Signal */}
        <Copy ch={CH.signal} n="02" eyebrow="Signal" title={<>One signal<br />matters.</>}>
          Bearing X90 is running short at Plant 01. Decignal finds the risk while there is time to act.
        </Copy>

        {/* 02 Signal: the facts behind the alert, at reading size, linked to the crate */}
        <div data-ch={CH.signal} data-interactive className="story-facts absolute bottom-8 left-6 md:bottom-10 md:left-10">
          <SignalReadout />
        </div>

        {/* 03 Problem */}
        <Copy
          ch={CH.problem}
          n="03"
          eyebrow="Problem"
          title={<>Demand is rising.<br />Stock is falling.</>}
        >
          In six days Plant 01 drops below safety stock. The next supplier delivery is 21 days away.
        </Copy>

        {/* 03 Problem: the figures behind the chart */}
        <div data-ch={CH.problem} className="story-facts absolute bottom-8 left-6 md:bottom-10 md:left-10">
          <Facts
            items={[
              ["Daily usage", "45 units"],
              ["Safety breach", "Day 6", true],
              ["Supplier ETA", "21 days"],
            ]}
          />
        </div>

        {/* 04 Context */}
        <Copy dims ch={CH.context} n="04" eyebrow="Context" title={<>Every fact.<br />One picture.</>} after={<EvidenceChecks />}>
          Stock, supplier timing and the route are checked together. Select a system to inspect its evidence.
        </Copy>

        {/* 05 Decision */}
        <div data-ch={CH.decision} className="story-footer-safe absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-[36ch] text-[15px] leading-relaxed text-ink-2 md:text-base">
              Move 240 units from Plant 02 to Plant 01. The source retains its own planned stock.
            </p>
            <div className="flex flex-col gap-3">
            <Stepper />
            <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-white/80 bg-white/60 text-left shadow-[0_10px_40px_-20px_rgba(20,19,15,0.3)] backdrop-blur-md">
              {[
                ["Arrives", "2 days"],
                ["Plant 02 left", "380 units"],
                ["Cost", "INR 38k"],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 px-3 py-3 md:px-5">
                  <dt className="eyebrow md:whitespace-nowrap">{k}</dt>
                  <dd data-stock={k === "Plant 02 left" ? "" : undefined} className="tabular mt-1 font-serif text-xl whitespace-nowrap md:text-[26px]">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            </div>
          </div>
        </div>

        {/* 06 Control */}
        <div
          data-ch={CH.control}
          data-interactive
          className="absolute left-6 top-[15vh] max-w-[560px] max-md:right-6 max-md:bottom-8 max-md:flex max-md:flex-col md:left-10 md:top-[18vh]"
        >
          <Tag n="06" tone={TONE[CH.control]}>Human control</Tag>
          <h2 className="display mt-4 text-[clamp(36px,3.8vw,60px)]">
            You see why.
            <br />
            You decide.
          </h2>
          <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">
            Inspect the evidence. Adjust the quantity. Approve the action. Your policy and your team stay in control.
          </p>
          {/* On phones the controls sit at the foot of the screen, leaving the layers visible above. */}
          <div className="max-md:mt-auto">
            <DecisionControls />
          </div>
        </div>

        {/* 07 Scale */}
        <div data-ch={CH.scale} className="absolute inset-x-0 top-[13vh] px-6 text-center">
          <div className="flex justify-center">
            <Tag n="07" tone={TONE[CH.scale]}>Scale</Tag>
          </div>
          <h2 className="display mt-4 text-[clamp(44px,6vw,96px)]">One layer. Every function.</h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
            From stock transfers to service cases, every application reuses the same context and controls.
          </p>
        </div>

        {/* 07 Scale: what Decignal offers in each function */}
        <div data-ch={CH.scale} data-interactive className="absolute inset-x-0 bottom-[8vh] px-6 md:px-10 lg:bottom-[4vh]">
          <ScaleApps />
        </div>

        {/* 08 Industries: detail and index */}
        <div data-ch={CH.industries} className="absolute inset-0">
          <IndustryDetail />
        </div>

        {/* 08 Industries */}
        <div data-ch={CH.industries} className="story-footer-safe absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
          <div className="flex items-end justify-between gap-6">
            <p className="max-w-[34ch] text-[15px] leading-relaxed text-ink-2">
              One foundation, configured around the systems and decisions of your industry.
            </p>
            <div className="hidden md:block">
              <Tag n="08" tone={TONE[CH.industries]}>Industries</Tag>
            </div>
          </div>
        </div>

        {/* 09 Final */}
        <div
          data-ch={CH.final}
          data-interactive
          className="absolute inset-x-0 bottom-[10vh] flex flex-col items-center gap-6 px-6 text-center"
        >
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
            Start with one decision that should move faster. We will show you what it looks like inside your
            operation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary">
              Book a free AI audit
              <Arrow />
            </button>
            <button onClick={() => scrollToTarget("#applications")} className="btn btn-ghost">
              See applications
            </button>
          </div>
        </div>

      </div>

      <IslandPanel />

      {/* The scroll track the story is mapped onto */}
      <div id="story" style={{ height: `${TOTAL_LEN * 100}svh` }} aria-hidden />
    </>
  );
}

/** Count up to a value whenever the chapter arrives; reduced motion shows the value at once. */
function useCountUp(target: number, ch: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let on = false;
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        // Ease-out quint over --dur-5 (900ms), matching the page's one curve.
        const k = Math.min((now - t0) / 900, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 5))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const off = subscribe((g) => {
      const now = weight(ch, g) > 0.75;
      if (now && !on) {
        if (still) el.textContent = String(target);
        else run();
      }
      on = now;
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [target, ch]);
  return ref;
}

function SignalReadout() {
  const onHand = useCountUp(410, CH.signal);
  const hint = (v: boolean) => () => {
    store.signalHint = v;
  };
  return (
    <div
      className="signal-readout"
      tabIndex={0}
      aria-label="Bearing X90 at Plant 01: 410 units on hand, safety stock 175, breach on day 6"
      onPointerEnter={hint(true)}
      onPointerLeave={hint(false)}
      onFocus={hint(true)}
      onBlur={hint(false)}
    >
      <p className="eyebrow flex items-center gap-2">
        <span className="signal-readout-dot" aria-hidden />
        Bearing X90 · Plant 01
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <dt className="eyebrow">On hand</dt>
          <dd className="tabular mt-1 text-[22px] font-semibold tracking-[-0.02em]"><span ref={onHand}>410</span></dd>
        </div>
        <div>
          <dt className="eyebrow">Safety</dt>
          <dd className="tabular mt-1 text-[22px] font-semibold tracking-[-0.02em]">175</dd>
        </div>
        <div>
          <dt className="eyebrow">Breach</dt>
          <dd className="tabular mt-1 text-[22px] font-semibold tracking-[-0.02em] text-signal">Day 6</dd>
        </div>
      </dl>
      {/* The same six days the ring draws around the crate */}
      <ol className="signal-days" aria-hidden>
        {[1, 2, 3, 4, 5, 6].map((d) => (
          <li key={d} data-risk={d === 6 ? "" : undefined} style={{ ["--i" as string]: d - 1 }}>
            <span />
            <small>D{d}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Each check names the system it came from: pointing at it lifts that island, clicking opens its evidence. */
function EvidenceChecks() {
  return <ul className="evidence-checks" aria-label="Evidence behind this transfer">
    {([
      ["saffron", "Stock available", "620 − 380 = 240 units", 3, "WMS"],
      ["tangerine", "Supplier timing", "21 days · too late", 4, "Suppliers"],
      ["pink", "Transfer route", "2 days · lane clear", 5, "External"],
    ] as const).map(([tone, label, value, sys, name]) => <li key={label}>
      <button
        type="button"
        aria-label={`${label}: ${value}. From ${name}. Open its evidence.`}
        onPointerEnter={() => (store.islandHint = sys)}
        onPointerLeave={() => (store.islandHint = -1)}
        onFocus={() => (store.islandHint = sys)}
        onBlur={() => (store.islandHint = -1)}
        onClick={() => select(store.selected === sys ? -1 : sys)}
        style={{ ["--tone" as string]: `var(--color-${tone})` }}
      >
        <span className="evidence-check-dot" />
        <span>{label}</span><strong>{value}</strong>
      </button>
    </li>)}
  </ul>;
}

/** The transfer order's progress, driven by the same beats as the forklift and the truck. */
const STEPS: [string, number][] = [
  ["Approved", 0],
  ["Picking", BEATS.load[0]],
  ["Loaded", BEATS.load[1]],
  ["In transit", BEATS.drive[0]],
  ["Received", BEATS.drive[1] - 0.02],
];

function Stepper() {
  const root = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    const fills = Array.from(el.querySelectorAll<HTMLElement>("[data-fill]"));
    let lastAt = -1;
    return subscribe((g) => {
      const t = g >= CH.decision + 1 ? 1 : g < CH.decision ? 0 : localIn(CH.decision, g);
      let at = 0;
      STEPS.forEach(([, s], i) => {
        if (t >= s) at = i;
      });
      // Each connector fills as the work between two steps happens.
      fills.forEach((f, i) => {
        const a = STEPS[i][1];
        const b = STEPS[i + 1][1];
        f.style.transform = `scaleX(${clamp01((t - a) / (b - a))})`;
      });
      if (at !== lastAt) {
        lastAt = at;
        items.forEach((it, i) => (it.dataset.state = i < at ? "done" : i === at ? "now" : "next"));
        el.setAttribute("aria-label", `Transfer TRF-0240: ${STEPS[at][0]}`);
      }
    });
  }, []);
  return (
    <ol ref={root} className="stepper" aria-live="polite">
      {STEPS.map(([name], i) => (
        <li key={name} data-step data-state="next" className="stepper-step">
          <span className="stepper-dot" aria-hidden />
          <span className="stepper-label">{name}</span>
          {i < STEPS.length - 1 && (
            <span className="stepper-line" aria-hidden>
              <span data-fill className="stepper-fill" />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Copy({
  ch,
  n,
  eyebrow,
  title,
  children,
  after,
  dims,
}: {
  dims?: boolean;
  ch: number;
  n: string;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
  after?: React.ReactNode;
}) {
  return (
    <div data-copy data-ch={ch} data-dims={dims ? "" : undefined} data-interactive={after ? "" : undefined} className="absolute right-6 left-6 top-[15vh] max-w-[480px] md:left-10 md:top-[18vh]">
      <Tag n={n} tone={TONE[ch]}>
        {eyebrow}
      </Tag>
      <h2 className="display mt-4 text-[clamp(36px,3.8vw,60px)]">{title}</h2>
      <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">{children}</p>
      {after}
    </div>
  );
}

/** A short row of the figures behind a chapter, hairline-ruled. */
function Facts({ items }: { items: [string, string, boolean?][] }) {
  return (
    <dl className="grid w-[min(420px,calc(100vw-48px))] grid-cols-3 border-t border-line">
      {items.map(([k, v, risk]) => (
        <div key={k} className="border-line py-3 pr-3 [&+&]:border-l [&+&]:pl-4">
          <dt className="eyebrow">{k}</dt>
          <dd className="tabular mt-1 text-[22px] font-semibold tracking-[-0.02em]" style={risk ? { color: "var(--color-signal)" } : undefined}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Chapter tag: number in a coloured capsule, then the chapter name. */
function Tag({ n, tone, children }: { n: string; tone: string; children: React.ReactNode }) {
  return (
    <p className="eyebrow inline-flex items-center gap-2.5">
      <span
        className="tabular inline-flex h-5 items-center rounded-full px-2 text-[10px] tracking-[0.08em] text-white"
        style={{ background: `var(--color-${tone || "ink"})` }}
      >
        {n}
      </span>
      {children}
    </p>
  );
}

/** A small mouse with a wheel that keeps rolling down. */
function ScrollCue() {
  return (
    <span className="relative inline-block h-[22px] w-[14px] rounded-full border border-ink-soft/60" aria-hidden>
      <span className="scroll-cue absolute left-1/2 top-[4px] h-[5px] w-[2px] -translate-x-1/2 rounded-full bg-ink-soft" />
      <style>{`
        .scroll-cue { animation: cue 1.8s var(--ease-out-quint) infinite; }
        @keyframes cue { 0% { opacity: 0; transform: translate(-50%, -2px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, 8px); } }
        @media (prefers-reduced-motion: reduce) { .scroll-cue { animation: none; } }
      `}</style>
    </span>
  );
}
