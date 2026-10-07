"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileCheck2,
  Layers,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { STACK } from "@/lib/content";
import { Header, Stage, reducedMotion, useReveal } from "../ui/Section";
import { IconChip, SYSTEMS, tint, tone } from "../ui/systems";
import { DecisionControls } from "./DecisionControls";

gsap.registerPlugin(ScrollTrigger);

const wrap = "mx-auto max-w-[1180px] px-6";

/* ------------------------------------------------------------------ */
/* 01 Fragmented: every system holds one piece                          */
/* ------------------------------------------------------------------ */

export function Systems() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id="systems" className="scroll-mt-14 bg-bg-2 py-28 md:py-36">
      <div className={wrap}>
        <Header
          kicker="The problem"
          tone="signal"
          title={
            <>
              Every system knows something.
              <br className="hidden md:block" /> None of them sees the whole.
            </>
          }
          lede="Your ERP, CRM, production, warehouse, suppliers and the outside world each hold part of the truth. The decision needs all of it."
        />
        <ul data-stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((s) => (
            <li key={s.id} className="flex flex-col rounded-[24px] bg-white p-7">
              <div className="flex items-center gap-3">
                <IconChip Icon={s.Icon} t={s.tone} />
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.01em]">{s.name}</p>
                  <p className="text-[13px] text-ink-soft">{s.full}</p>
                </div>
              </div>
              <p className="mt-10 text-[13px] text-ink-soft">{s.knows}</p>
              <p className="tabular mt-1 text-[34px] font-semibold tracking-[-0.017em]" style={{ color: tone(s.tone) }}>
                {s.value}
              </p>
              <p className="mt-1 text-[14px] text-ink-2">{s.detail}</p>
            </li>
          ))}
        </ul>
        <div data-reveal className="mt-16 text-center">
          <p className="text-[14px] text-ink-soft">Works across the platforms you already run</p>
          <ul className="mx-auto mt-6 flex max-w-[900px] flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {STACK.map((s) => (
              <li key={s} className="text-[19px] font-semibold tracking-[-0.02em] text-ink/40">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 Signal: one row among millions                                    */
/* ------------------------------------------------------------------ */

const FEED = [
  ["09:41:02", "ERP", "Goods receipt posted", "PO 4500018833 · Plant 03"],
  ["09:41:05", "CRM", "Order line created", "SO 77120 · 40 units"],
  ["09:41:07", "MES", "Shift output logged", "Line 02 · 412 units"],
  ["09:41:09", "WMS", "Bin transfer", "Plant 02 · Aisle 14"],
  ["09:41:11", "RISK", "Bearing X90 · Plant 01", "Below safety stock in 6 days"],
  ["09:41:12", "SUP", "ASN received", "Vendor 1140 · 21 days"],
  ["09:41:14", "EXT", "Lane status updated", "Inter-plant · clear"],
  ["09:41:16", "ERP", "Price condition changed", "Material 88-102"],
];

export function Signal() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="py-28 md:py-36">
      <div className={`${wrap} grid items-center gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20`}>
        <div>
          <Header
            align="left"
            kicker="Signal"
            tone="signal"
            title="One signal matters."
            lede="Among millions of records, Decignal finds the change that will cost you. Bearing X90 at Plant 01 is about to run short."
          />
          <dl data-reveal className="mt-10 grid max-w-[460px] grid-cols-2 gap-6 border-t border-line pt-8">
            <div>
              <dt className="text-[13px] text-ink-soft">Records read today</dt>
              <dd className="tabular mt-1 text-[32px] font-semibold tracking-[-0.017em]">4.1M</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-soft">Signals raised</dt>
              <dd className="tabular mt-1 text-[32px] font-semibold tracking-[-0.017em]" style={{ color: tone("signal") }}>
                1
              </dd>
            </div>
          </dl>
        </div>

        <div data-reveal>
          <Stage className="p-4 md:p-6">
            <div className="rounded-[22px] bg-white p-2">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <Radio size={15} className="text-ink-soft" /> Live activity
                </p>
                <p className="label">Across 6 systems</p>
              </div>
              <ul>
                {FEED.map(([t, src, title, detail]) => {
                  const risk = src === "RISK";
                  return (
                    <li
                      key={t}
                      className={`grid grid-cols-[70px_1fr] items-center gap-3 rounded-2xl px-4 py-3 sm:grid-cols-[76px_64px_1fr] ${
                        risk ? "my-1 scale-[1.02] shadow-[0_12px_30px_-14px_rgba(232,52,28,0.45)]" : "opacity-55"
                      }`}
                      style={risk ? { background: tone("signal"), color: "#fff" } : undefined}
                    >
                      <span className={`tabular font-mono text-[11.5px] ${risk ? "text-white/80" : "text-ink-soft"}`}>{t}</span>
                      <span
                        className={`hidden font-mono text-[11px] font-medium tracking-[0.06em] sm:block ${risk ? "text-white" : "text-ink-soft"}`}
                      >
                        {risk ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle size={12} strokeWidth={2.4} /> RISK
                          </span>
                        ) : (
                          src
                        )}
                      </span>
                      <span className="min-w-0 text-[13.5px] leading-snug">
                        <span className={`font-semibold ${risk ? "" : "text-ink"}`}>{title}</span>
                        <span className={risk ? "text-white/85" : "text-ink-soft"}> · {detail}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Stage>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 Problem: the gap between two lines                               */
/* ------------------------------------------------------------------ */

// Chart space: 0..24 days across, 0..500 units up.
const CW = 960;
const CH = 380;
const PAD = { l: 56, r: 24, t: 24, b: 44 };
const X = (d: number) => PAD.l + (d / 24) * (CW - PAD.l - PAD.r);
const Y = (u: number) => CH - PAD.b - (u / 500) * (CH - PAD.t - PAD.b);
const SAFETY = 180;
const stock = Array.from({ length: 25 }, (_, d) => Math.max(410 - d * 38 - d * d * 0.6, 0));
const demand = Array.from({ length: 25 }, (_, d) => 120 + d * 4.2 + Math.sin(d * 0.9) * 6);
const path = (pts: number[]) => pts.map((u, d) => `${d ? "L" : "M"}${X(d).toFixed(1)} ${Y(u).toFixed(1)}`).join(" ");
const CROSS = 6;

export function Trend() {
  const ref = useReveal<HTMLElement>();
  const svg = useRef<SVGSVGElement>(null);

  // The lines draw left to right as the chart comes into view: time passing.
  useEffect(() => {
    const el = svg.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const lines = el.querySelectorAll<SVGPathElement>("[data-draw]");
      lines.forEach((p) => {
        const len = p.getTotalLength();
        gsap.fromTo(
          p,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 2,
            ease: "power2.inOut",
            scrollTrigger: { trigger: el, start: "top 75%", once: true },
          },
        );
      });
      gsap.fromTo(
        el.querySelectorAll("[data-pop]"),
        { opacity: 0, scale: 0.6, transformOrigin: "center" },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out(2)",
          stagger: 0.25,
          delay: 1.4,
          scrollTrigger: { trigger: el, start: "top 75%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="bg-bg-2 py-28 md:py-36">
      <div className={wrap}>
        <Header
          kicker="The risk"
          tone="cobalt"
          title={
            <>
              Demand is rising.
              <br />
              Stock is falling.
            </>
          }
          lede="In six days Plant 01 drops below safety stock. The next supplier delivery is 21 days away."
        />
        <div data-reveal className="mt-16 rounded-[28px] bg-white p-5 md:p-10">
          <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-2">
            <Legend color={tone("ink")} label="Stock on hand, Plant 01" />
            <Legend color={tone("cobalt")} label="Daily demand" />
            <Legend color={tone("signal")} label="Safety stock" dashed />
          </div>
          <svg ref={svg} viewBox={`0 0 ${CW} ${CH}`} className="w-full" role="img" aria-label="Stock falls below safety stock on day 6 while demand rises; the next delivery arrives on day 21.">
            {/* Grid */}
            {[0, 100, 200, 300, 400, 500].map((u) => (
              <g key={u}>
                <line x1={PAD.l} x2={CW - PAD.r} y1={Y(u)} y2={Y(u)} stroke="rgba(0,0,0,0.06)" />
                <text x={PAD.l - 12} y={Y(u) + 4} textAnchor="end" fontSize="12" fill="#6e6e73" className="tabular">
                  {u}
                </text>
              </g>
            ))}
            {[0, 6, 12, 18, 21, 24].map((d) => (
              <text key={d} x={X(d)} y={CH - 14} textAnchor="middle" fontSize="12" fill={d === 6 ? tone("signal") : "#6e6e73"} fontWeight={d === 6 || d === 21 ? 600 : 400}>
                {d === 0 ? "Today" : `Day ${d}`}
              </text>
            ))}

            {/* The shortage window: below safety stock and no delivery yet */}
            <rect x={X(CROSS)} y={PAD.t} width={X(21) - X(CROSS)} height={CH - PAD.t - PAD.b} fill={tint("signal", 7)} />
            <text x={(X(CROSS) + X(21)) / 2} y={PAD.t + 26} textAnchor="middle" fontSize="13" fontWeight="600" fill={tone("signal")}>
              15 days exposed
            </text>

            <line x1={PAD.l} x2={CW - PAD.r} y1={Y(SAFETY)} y2={Y(SAFETY)} stroke={tone("signal")} strokeWidth="1.5" strokeDasharray="6 6" />
            <path data-draw d={path(demand)} fill="none" stroke={tone("cobalt")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path data-draw d={path(stock)} fill="none" stroke={tone("ink")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Crossing point */}
            <g data-pop>
              <circle cx={X(CROSS)} cy={Y(stock[CROSS])} r="14" fill={tint("signal", 25)} />
              <circle cx={X(CROSS)} cy={Y(stock[CROSS])} r="6" fill={tone("signal")} stroke="#fff" strokeWidth="2" />
            </g>
            {/* Next delivery */}
            <g data-pop>
              <line x1={X(21)} x2={X(21)} y1={PAD.t + 40} y2={CH - PAD.b} stroke={tone("tangerine")} strokeWidth="2" />
              <rect x={X(21) - 62} y={PAD.t + 40} width="124" height="28" rx="14" fill={tone("tangerine")} />
              <text x={X(21)} y={PAD.t + 58} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#fff">
                Next delivery
              </text>
            </g>
          </svg>
        </div>
        <ul data-stagger className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Day 6", "Plant 01 falls below safety stock", "signal"],
            ["+18%", "Open orders over three weeks", "cobalt"],
            ["Day 21", "Next supplier delivery arrives", "tangerine"],
          ].map(([v, l, t]) => (
            <li key={l} className="rounded-[24px] bg-white p-6">
              <p className="tabular text-[30px] font-semibold tracking-[-0.017em]" style={{ color: tone(t) }}>
                {v}
              </p>
              <p className="mt-1 text-[15px] text-ink-2">{l}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="22" height="6" aria-hidden>
        <line x1="1" x2="21" y1="3" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? "4 4" : undefined} />
      </svg>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 04 Context: every source feeds the signal                           */
/* ------------------------------------------------------------------ */

const EVIDENCE = [
  "Transfer policy and cost",
  "Open orders up 18%",
  "Production plan for Line 02",
  "Plant 02 holds 620 above plan",
  "Inbound delivery in 21 days",
  "Freight lane clear, no weather risk",
];

export function Context() {
  const ref = useReveal<HTMLElement>();
  // Hub layout in a 600 x 520 box. Nodes sit on an ellipse around the signal.
  const nodes = SYSTEMS.map((s, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: 300 + Math.cos(a) * 225, y: 260 + Math.sin(a) * 195 };
  });
  return (
    <section ref={ref} className="py-28 md:py-36">
      <div className={`${wrap} grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20`}>
        <div data-reveal className="order-2 lg:order-1">
          <Stage className="aspect-[600/520]">
            <svg viewBox="0 0 600 520" className="absolute inset-0 size-full" aria-hidden>
              {nodes.map((n, i) => (
                <g key={n.id}>
                  <path id={`ctx-${i}`} d={`M${n.x} ${n.y} L300 260`} stroke={tone(n.tone)} strokeOpacity="0.35" strokeWidth="2" />
                  <circle r="4.5" fill={tone(n.tone)}>
                    <animateMotion dur="2.6s" begin={`${i * 0.35}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                      <mpath href={`#ctx-${i}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}
            </svg>
            {/* Signal at the centre */}
            <div className="absolute top-1/2 left-1/2 w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[18px] p-3.5 text-center text-white shadow-[0_18px_40px_-16px_rgba(232,52,28,0.6)]" style={{ background: tone("signal") }}>
              <AlertTriangle size={18} className="mx-auto" strokeWidth={2.2} />
              <p className="mt-1.5 text-[clamp(11px,1.3vw,14px)] font-semibold leading-tight">Bearing X90</p>
              <p className="text-[clamp(10px,1.1vw,12px)] text-white/85">Plant 01 · 6 days</p>
            </div>
            {nodes.map((n) => (
              <div
                key={n.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                style={{ left: `${(n.x / 600) * 100}%`, top: `${(n.y / 520) * 100}%` }}
              >
                <span className="rounded-[14px] bg-white p-1.5 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.2)]">
                  <IconChip Icon={n.Icon} t={n.tone} size={36} solid />
                </span>
                <span className="text-[12px] font-semibold">{n.name}</span>
              </div>
            ))}
          </Stage>
        </div>
        <div className="order-1 lg:order-2">
          <Header
            align="left"
            kicker="Context"
            tone="violet"
            title="Everything a planner would check."
            lede="Decignal connects the evidence across systems before it recommends anything."
          />
          <ul data-stagger className="mt-9 space-y-3">
            {SYSTEMS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-[16px]">
                <span className="flex size-6 items-center justify-center rounded-full" style={{ background: tint(s.tone, 16), color: tone(s.tone) }}>
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="text-ink">{EVIDENCE[i]}</span>
                <span className="text-[13px] text-ink-soft">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 05 Decision: a quantity, a source, a destination, a cost            */
/* ------------------------------------------------------------------ */

export function Decision() {
  const ref = useReveal<HTMLElement>();
  const truck = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = truck.current;
    if (!el || reducedMotion()) return;
    const t = gsap.fromTo(
      el,
      { left: "0%" },
      { left: "100%", ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "top 30%", scrub: 0.6 } },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, []);

  return (
    <section ref={ref} className="bg-bg-2 py-28 md:py-36">
      <div className={wrap}>
        <Header
          kicker="Decision"
          tone="emerald"
          title="One clear decision."
          lede="Not a dashboard. Not an alert. A recommendation with a quantity, a source, a destination and a cost."
        />
        <div data-reveal className="mx-auto mt-16 max-w-[980px] rounded-[32px] bg-white p-6 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.3fr_1fr]">
            <Plant name="Plant 02" role="Source" stock={620} after={380} t="saffron" />
            <div className="relative h-16">
              <div className="absolute top-1/2 right-6 left-6 h-[2px] -translate-y-1/2 rounded-full bg-line" />
              <div className="absolute top-1/2 right-6 left-6 -translate-y-1/2">
                <div ref={truck} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: "50%" }}>
                  <span className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold whitespace-nowrap text-white shadow-[0_10px_24px_-10px_rgba(15,168,116,0.7)]" style={{ background: tone("emerald") }}>
                    240 units <ArrowRight size={15} strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            </div>
            <Plant name="Plant 01" role="Destination" stock={140} after={380} t="cobalt" />
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-4">
            {[
              ["Cover after transfer", "34 days"],
              ["Transfer cost", "INR 38,000"],
              ["Expedite needed", "None"],
              ["Plant 02 after", "Above plan"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-5 py-5">
                <dt className="text-[13px] text-ink-soft">{k}</dt>
                <dd className="tabular mt-1 text-[22px] font-semibold tracking-[-0.02em]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Plant({ name, role, stock, after, t }: { name: string; role: string; stock: number; after: number; t: string }) {
  return (
    <div className="text-center">
      <p className="text-[13px] text-ink-soft">{role}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{name}</p>
      <div className="mx-auto mt-5 flex h-28 w-24 items-end justify-center gap-2" aria-hidden>
        <span className="w-8 rounded-t-lg bg-bg-3" style={{ height: `${(stock / 640) * 100}%` }} />
        <span className="w-8 rounded-t-lg" style={{ height: `${(after / 640) * 100}%`, background: tone(t) }} />
      </div>
      <p className="tabular mt-3 text-[13px] text-ink-2">
        {stock} <span className="text-ink-soft">to</span> <span className="font-semibold">{after}</span> units
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 06 Control: every layer inspectable, nothing moves without approval  */
/* ------------------------------------------------------------------ */

const LAYERS = [
  { name: "Signal", text: "Plant 01 short in 6 days", Icon: Radio, t: "signal" },
  { name: "Evidence", text: "Orders up 18% in 3 weeks", Icon: ScrollText, t: "violet" },
  { name: "Context", text: "Plant 02 holds 620 units above plan", Icon: Layers, t: "saffron" },
  { name: "Policy", text: "Inter-plant transfer needs planner approval", Icon: ShieldCheck, t: "cobalt" },
  { name: "Decision", text: "Transfer 240 units, Plant 02 to Plant 01", Icon: FileCheck2, t: "emerald" },
];

export function Control() {
  const ref = useReveal<HTMLElement>();
  const [open, setOpen] = useState(3);
  return (
    <section ref={ref} className="py-28 md:py-36">
      <div className={`${wrap} grid items-start gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-28">
          <Header
            align="left"
            kicker="Human control"
            tone="cobalt"
            title={
              <>
                You see why.
                <br />
                You decide.
              </>
            }
            lede="Every recommendation opens into its layers. Nothing moves until someone approves it. Try it."
          />
          <div data-reveal>
            <DecisionControls />
          </div>
        </div>
        <div data-reveal>
          <Stage className="p-4 md:p-6">
            <p className="flex items-center gap-2 px-2 pt-2 pb-4 text-[13px] font-semibold">
              <Sparkles size={15} className="text-ink-soft" /> Why Decignal recommends this
            </p>
            <ol className="space-y-2">
              {LAYERS.map((l, i) => {
                const on = open === i;
                return (
                  <li key={l.name}>
                    <button
                      onClick={() => setOpen(i)}
                      aria-expanded={on}
                      className={`flex w-full items-center gap-4 rounded-[20px] p-4 text-left transition-[background-color,box-shadow] duration-300 ${
                        on ? "bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.3)]" : "hover:bg-white/60"
                      }`}
                    >
                      <IconChip Icon={l.Icon} t={l.t} size={40} solid={on} />
                      <span className="min-w-0 flex-1">
                        <span className="text-[12px] font-semibold tracking-[0.02em]" style={{ color: tone(l.t) }}>
                          {String(i + 1).padStart(2, "0")} {l.name}
                        </span>
                        <span className="block text-[16px] font-medium tracking-[-0.01em]">{l.text}</span>
                      </span>
                      <Check size={18} className="shrink-0" style={{ color: tone("emerald") }} strokeWidth={2.4} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </Stage>
        </div>
      </div>
    </section>
  );
}
