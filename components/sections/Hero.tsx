"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, Check, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { scrollToTarget } from "../SmoothScroll";
import { reducedMotion } from "../ui/Section";
import { SYSTEMS, tint, tone } from "../ui/systems";

const SIGNALS = [
  { name: "Bearing X90", where: "Plant 01", note: "Below safety stock in 6 days", risk: true },
  { name: "Seal kit S12", where: "Plant 03", note: "Lead time up 4 days", risk: false },
  { name: "Line 04 motor", where: "Plant 01", note: "Vibration trending up", risk: false },
  { name: "Harness H7", where: "West DC", note: "Demand above forecast", risk: false },
  { name: "Invoice 8812", where: "Finance", note: "Awaiting goods receipt", risk: false },
];

export function Hero() {
  const shot = useRef<HTMLDivElement>(null);

  // The product shot settles into place as the page starts to move, like a lid closing.
  useEffect(() => {
    const el = shot.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.4, ease: "expo.out", delay: 0.25 });
      gsap.fromTo(
        el,
        { rotateX: 14, scale: 0.94 },
        {
          rotateX: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 90%", end: "top 25%", scrub: 0.5 },
        },
      );
      gsap.fromTo(
        "[data-hero]",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="overflow-hidden px-6 pt-32 md:pt-40">
      <div className="mx-auto max-w-[900px] text-center">
        <p
          data-hero
          className="mx-auto inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-2"
        >
          <span className="pulse-dot size-1.5 rounded-full bg-emerald" />
          Decision intelligence for India and Africa
        </p>
        <h1 data-hero className="headline mt-6 text-[clamp(46px,7.6vw,96px)] leading-[1]">
          Turn information
          <br />
          into decisions.
        </h1>
        <p data-hero className="lede mx-auto mt-6 max-w-[600px]">
          Decignal connects the systems you already run and turns what they know into clear, explainable decisions
          your teams approve.
        </p>
        <div data-hero className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary">
            Book a free AI audit
          </button>
          <button onClick={() => scrollToTarget("#systems")} className="more text-[17px]">
            See how it works <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1180px] [perspective:1600px] md:mt-20">
        <div ref={shot} className="origin-top">
          <AppWindow />
        </div>
      </div>
    </section>
  );
}

/** The product, drawn in code: a planner's inbox with one recommendation open. */
export function AppWindow() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_50px_100px_-40px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.02)] md:rounded-[28px]">
      {/* Title bar */}
      <div className="flex h-11 items-center gap-4 border-b border-line bg-bg-2/70 px-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <p className="flex-1 truncate text-center text-[12.5px] font-medium text-ink-soft">Decignal · Inventory Intelligence</p>
        <span className="w-[52px]" />
      </div>

      <div className="grid md:grid-cols-[300px_1fr]">
        {/* Signals */}
        <aside className="hidden border-r border-line md:block">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-[13px] font-semibold">Signals</p>
            <p className="label">Today</p>
          </div>
          <ul className="px-2 pb-3">
            {SIGNALS.map((s) => (
              <li
                key={s.name}
                className="flex items-start gap-3 rounded-xl px-3 py-3"
                style={s.risk ? { background: tint("signal", 9) } : undefined}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${s.risk ? "pulse-dot" : ""}`}
                  style={{ background: s.risk ? tone("signal") : "var(--color-line-strong)" }}
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold">
                    {s.name} <span className="font-normal text-ink-soft">· {s.where}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px]" style={{ color: s.risk ? tone("signal") : undefined }}>
                    {s.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Recommendation */}
        <div className="p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label">Recommended action</p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
              style={{ background: tint("emerald", 14), color: tone("emerald") }}
            >
              <Check size={13} strokeWidth={2.6} /> Ready for approval
            </span>
          </div>
          <p className="headline mt-4 text-[clamp(26px,3.2vw,40px)]">
            Transfer 240 units from Plant 02 to Plant 01
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
            {[
              ["Units", "240"],
              ["Cover", "34 days"],
              ["Cost", "INR 38,000"],
              ["Expedite", "Not needed"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-4 py-3.5">
                <dt className="text-[12px] text-ink-soft">{k}</dt>
                <dd className="tabular mt-0.5 text-[17px] font-semibold tracking-[-0.01em]">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-7 text-[13px] font-semibold">Evidence</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SYSTEMS.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: tint(s.tone), color: tone(s.tone) }}
                >
                  <s.Icon size={15} strokeWidth={2} />
                </span>
                <span className="min-w-0 text-[13px] leading-tight">
                  <span className="block font-semibold">{s.knows}</span>
                  <span className="text-ink-soft">
                    {s.name} · {s.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className="btn btn-dark min-h-10! px-5! text-[14px]!">
              <Check size={16} strokeWidth={2.4} /> Approve
            </span>
            <span className="btn btn-ghost min-h-10! px-5! text-[14px]!">
              <SlidersHorizontal size={15} /> Adjust
            </span>
            <span className="btn btn-ghost min-h-10! px-5! text-[14px]!">
              <X size={16} /> Reject
            </span>
            <span className="ml-auto hidden items-center gap-1.5 self-center text-[12.5px] text-ink-soft lg:inline-flex">
              Creates a stock transfer order in SAP <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
