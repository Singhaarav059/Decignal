"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import {
  CH,
  CHAPTERS,
  INDUSTRIES,
  TOTAL_LEN,
  blendAt,
  clamp01,
  localIn,
  smoothstep,
  subscribe,
  weight,
} from "@/lib/story";
import { industryF } from "@/lib/layouts";
import { DecisionControls } from "./DecisionControls";
import { scrollToTarget } from "../SmoothScroll";
import { Arrow } from "../ui/Arrow";

/** Chapter accent: the colour of what that chapter is about. */
const TONE = ["", "signal", "cobalt", "violet", "saffron", "emerald", "tangerine", "pink", ""];

const Scene = dynamic(() => import("../three/Scene"), { ssr: false });

const shown = (w: number) => smoothstep(0.6, 0.98, w);

/** Story text: one dominant idea per chapter, layered behind and in front of the object. */
export function Story() {
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const roots = [back.current, front.current].filter(Boolean) as HTMLDivElement[];
    const chEls = roots.flatMap((r) => Array.from(r.querySelectorAll<HTMLElement>("[data-ch]")));
    const indEls = Array.from(back.current?.querySelectorAll<HTMLElement>("[data-ind]") ?? []);
    const ticks = Array.from(counter.current?.querySelectorAll<HTMLElement>("[data-tick]") ?? []);
    const label = counter.current?.querySelector<HTMLElement>("[data-label]");
    let last = -1;

    return subscribe((g) => {
      chEls.forEach((el) => {
        const w = shown(weight(Number(el.dataset.ch), g));
        el.style.opacity = String(w);
        el.style.transform = `translate3d(0, ${(1 - w) * 18}px, 0)`;
        el.style.filter = w > 0.98 ? "none" : `blur(${(1 - w) * 10}px)`;
        el.style.visibility = w < 0.005 ? "hidden" : "visible";
        if (el.dataset.interactive !== undefined) el.style.pointerEvents = w > 0.6 ? "auto" : "none";
      });

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
      if (counter.current) counter.current.style.opacity = String(out * (g > 0.35 ? 1 : 0));

      // The counter names whichever chapter is on screen, switching at the midpoint of each transition.
      const { i: from, j: to, e } = blendAt(g);
      const idx = e < 0.5 ? from : to;
      if (idx !== last && label) {
        last = idx;
        label.textContent = `${String(idx + 1).padStart(2, "0")}  ${CHAPTERS[idx].label}`;
        ticks.forEach(
          (t, i) => (t.style.background = i <= idx ? `var(--color-${TONE[i] || "ink"})` : "var(--color-line-strong)"),
        );
      }
    });
  }, []);

  return (
    <>
      {/* Behind the object: the giant statements */}
      <div ref={back} className="pointer-events-none fixed inset-0 z-0 select-none" aria-hidden>
        <div data-ch={CH.fragments} className="absolute inset-x-0 top-[13vh] px-6 text-center">
          <p className="display text-[clamp(44px,7vw,128px)]">
            <span className="intro-line line-mask">
              <span>Every system</span>
            </span>
            <span className="intro-line line-mask">
              <span>
                knows <em className="spectrum-text">something.</em>
              </span>
            </span>
          </p>
        </div>
        <div data-ch={CH.decision} className="absolute inset-x-0 top-[11vh] px-6 text-center">
          <p className="display text-[clamp(44px,7.4vw,136px)]">
            One clear
            <br />
            <em className="spectrum-text" style={{ ["--accent" as string]: "var(--color-emerald)" }}>decision.</em>
          </p>
        </div>
        {INDUSTRIES.map((ind, k) => (
          <div key={ind.name} data-ind={k} className="absolute inset-x-0 top-[12vh] px-6 text-center">
            <p className="display text-[clamp(44px,7vw,128px)]">{ind.name}</p>
          </div>
        ))}
        <div data-ch={CH.final} className="absolute inset-x-0 top-[14vh] px-6 text-center">
          <p className="display text-[clamp(44px,7vw,128px)]">
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
      <div ref={front} className="pointer-events-none fixed inset-0 z-20">
        {/* 01 Fragmented */}
        <div data-ch={CH.fragments} data-interactive className="absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
          <div className="intro-fade flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[34ch] text-[15px] leading-relaxed text-ink-2 md:text-base">
              ERP, CRM, MES, warehouse, suppliers, the outside world. Each holds part of the truth.
              None of them sees the whole.
            </p>
            <div className="flex items-center gap-5">
              <span className="eyebrow hidden items-center gap-3 md:inline-flex">
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
          Among millions of records, Decignal finds the change that will cost you. Bearing X90 at Plant 01
          is about to run short.
        </Copy>

        {/* 03 Problem */}
        <Copy ch={CH.problem} n="03" eyebrow="Problem" title={<>Demand is rising.<br />Stock is falling.</>}>
          In six days Plant 01 drops below safety stock. The next supplier delivery is 21 days away.
        </Copy>

        {/* 04 Context */}
        <Copy ch={CH.context} n="04" eyebrow="Context" title={<>Everything a planner<br />would check.</>}>
          Decignal connects the evidence across systems: open orders, stock at every plant, production plans,
          supplier lead times, transfer policy, freight and weather.
        </Copy>

        {/* 05 Decision */}
        <div data-ch={CH.decision} className="absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-[36ch] text-[15px] leading-relaxed text-ink-2 md:text-base">
              Not a dashboard. Not an alert. A recommendation with a quantity, a source, a destination and a
              cost.
            </p>
            <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-white/80 bg-white/60 text-left shadow-[0_10px_40px_-20px_rgba(20,19,15,0.3)] backdrop-blur-md">
              {[
                ["Arrives", "2 days"],
                ["Plant 02 left", "380 units"],
                ["Cost", "INR 38k"],
              ].map(([k, v]) => (
                <div key={k} className="px-4 py-3 md:px-5">
                  <dt className="eyebrow whitespace-nowrap">{k}</dt>
                  <dd className="mt-1 font-serif text-xl whitespace-nowrap md:text-[26px]">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
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
            Every recommendation opens into its layers: the signal, the evidence, the context and the policy it
            was checked against. Nothing moves until someone approves it.
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
            The same intelligence layer runs across supply chain, operations, commercial, customer, and finance
            and risk. Each new application reuses the context and controls already in place.
          </p>
        </div>

        {/* 08 Industries */}
        <div data-ch={CH.industries} className="absolute inset-x-0 bottom-0 px-6 pb-8 md:px-10 md:pb-10">
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

        {/* Chapter counter */}
        <div ref={counter} className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-4 md:flex" style={{ opacity: 0 }}>
          <div className="flex gap-1.5">
            {CHAPTERS.map((c) => (
              <span key={c.id} data-tick className="h-[2px] w-5 rounded-full bg-line-strong transition-colors duration-500" />
            ))}
          </div>
          <span data-label className="eyebrow tabular min-w-[120px]" />
        </div>
      </div>

      {/* The scroll track the story is mapped onto */}
      <div id="story" style={{ height: `${TOTAL_LEN * 100}svh` }} aria-hidden />
    </>
  );
}

function Copy({
  ch,
  n,
  eyebrow,
  title,
  children,
}: {
  ch: number;
  n: string;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div data-ch={ch} className="absolute left-6 top-[15vh] max-w-[580px] md:left-10 md:top-[18vh]">
      <Tag n={n} tone={TONE[ch]}>
        {eyebrow}
      </Tag>
      <h2 className="display mt-4 text-[clamp(36px,3.8vw,60px)]">{title}</h2>
      <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">{children}</p>
    </div>
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
