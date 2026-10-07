"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, CATEGORIES, CATEGORY_TONE } from "@/lib/content";
import { scrollToTarget } from "../SmoothScroll";
import { LogoMark } from "../ui/Logo";
import { Arrow } from "../ui/Arrow";
import { showArea } from "./GrowlioSections";
import { ArrowUp, ArrowUpRight, LayoutGrid, MessageCircleQuestion, Route, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STRATA = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

/** Each section of the page as a card: its colour, what it holds, and a way in. */
const NAV: { label: string; href: string; tone: string; Icon: LucideIcon; blurb: string }[] = [
  { label: "Applications", href: "#applications", tone: "cobalt", Icon: LayoutGrid, blurb: "Eight applications across five business areas" },
  { label: "Outcomes", href: "#outcomes", tone: "emerald", Icon: TrendingUp, blurb: "What changed, measured in three operations" },
  { label: "How it works", href: "#how", tone: "violet", Icon: Route, blurb: "One decision first, live in weeks" },
  { label: "Questions", href: "#faq", tone: "tangerine", Icon: MessageCircleQuestion, blurb: "What enterprise teams ask first" },
];

export function Footer() {
  const word = useRef<HTMLDivElement>(null);
  const motif = useRef<SVGSVGElement>(null);

  // The six system threads draw in and meet once the footer is in view.
  useEffect(() => {
    const el = motif.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.classList.add("is-on");
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The wordmark rises letter by letter as the page ends.
  useEffect(() => {
    const el = word.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = gsap.fromTo(
      el.querySelectorAll("[data-letter]"),
      { yPercent: 100 },
      {
        yPercent: 0,
        ease: "expo.out",
        duration: 1.4,
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
      },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, []);

  return (
    <footer className="relative mt-16 overflow-hidden md:mt-20">
      {/* Six plate edges: every system, one foundation */}
      <div className="flex h-3" aria-hidden>
        {STRATA.map((c) => (
          <span key={c} className="flex-1" style={{ background: `var(--color-${c})` }} />
        ))}
      </div>

      <div className="bg-paper px-6 pt-16 md:px-10 md:pt-16">
        <div className="mx-auto grid max-w-[71rem] gap-9 gap-y-12 lg:grid-cols-[1fr_1.35fr] lg:gap-x-16">
          <div>
            {/* Six systems, one resolved decision: the story's opening network, closed. */}
            <svg ref={motif} className="footer-motif mb-7 block h-[72px] w-[220px]" viewBox="0 0 220 72" aria-hidden>
              {STRATA.map((c, i) => {
                const y = 6 + i * 12;
                return (
                  <g key={c} style={{ ["--i" as string]: i }}>
                    <path
                      d={`M10 ${y} C 90 ${y}, 120 36, 196 36`}
                      className="footer-thread"
                      pathLength={1}
                      fill="none"
                      stroke={`var(--color-${c})`}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                    <circle cx={10} cy={y} r={4} fill={`var(--color-${c})`} />
                  </g>
                );
              })}
              <g className="footer-motif-node">
                <circle cx={200} cy={36} r={11} fill="var(--color-emerald)" />
                <path d="M195 36.5l3.4 3.4 6.4-7" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
            <p className="display text-[clamp(32px,3.4vw,52px)]">
              Bring us one decision.
              <br />
              <span className="spectrum-text">We will show you</span>
              <br />
              <span className="spectrum-text">the rest.</span>
            </p>
            <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary mt-9">
              Book a free AI audit
              <Arrow />
            </button>
          </div>

          <nav aria-label="Footer" className="footer-nav">
            <p className="eyebrow">Explore</p>
            <ul className="footer-cards mt-4">
              {NAV.map(({ label, href, tone, Icon, blurb }, i) => (
                <li key={href} style={{ ["--tone" as string]: `var(--color-${tone})` }}>
                  <button onClick={() => scrollToTarget(href)} className="footer-card">
                    <span className="footer-card-icon" aria-hidden><Icon size={18} strokeWidth={2} /></span>
                    <span className="footer-card-n tabular" aria-hidden>0{i + 1}</span>
                    <strong>{label}</strong>
                    <small>{blurb}</small>
                    <span className="footer-card-go" aria-hidden><ArrowUpRight size={16} strokeWidth={2.2} /></span>
                  </button>
                </li>
              ))}
              <li className="footer-cards-wide" style={{ ["--tone" as string]: "var(--color-saffron)" }}>
                <button onClick={() => scrollToTarget("#audit")} className="footer-card footer-card-audit">
                  <span className="footer-card-icon" aria-hidden><Sparkles size={18} strokeWidth={2} /></span>
                  <span>
                    <strong>Free AI audit</strong>
                    <small>30 minutes on one decision in your operation. No commitment.</small>
                  </span>
                  <span className="footer-card-go" aria-hidden><ArrowUpRight size={16} strokeWidth={2.2} /></span>
                </button>
              </li>
            </ul>

            <p className="eyebrow mt-9">Where Decignal works</p>
            {/* Each area opens its panel in Applications. */}
            <ul className="footer-areas mt-4">
              {CATEGORIES.map((c, i) => {
                const n = APPLICATIONS.filter((a) => a.category === c).length;
                return (
                  <li key={c}>
                    <button onClick={() => showArea(i)} className="footer-area" style={{ ["--tone" as string]: `var(--color-${CATEGORY_TONE[c]})` }}>
                      <i aria-hidden />
                      {c}
                      <span className="tabular">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="mx-auto mt-12 flex max-w-[71rem] flex-col gap-4 border-t border-line pt-6 text-[13px] text-ink-soft md:flex-row md:items-center md:justify-between">
          <span>Decision intelligence for enterprises across India and Africa.</span>
          <div className="flex items-center gap-6">
            <span>© 2026 Decignal</span>
            <button onClick={() => scrollToTarget(0)} className="footer-top">
              Back to top
              <span aria-hidden>
                <ArrowUp size={14} strokeWidth={2.2} />
              </span>
            </button>
          </div>
        </div>

        {/* The wordmark, set across the full width */}
        <div ref={word} className="mt-10 flex items-end justify-center gap-[1.5vw] overflow-hidden pt-[1vw] pb-[4.5vw]" aria-hidden>
          <span data-letter className="inline-block">
            <LogoMark className="block h-[13vw] w-[13vw]" />
          </span>
          <span className="flex font-serif text-[20vw] leading-[0.9] tracking-[-0.033em]">
            {"decignal".split("").map((ch, i) => (
              <span key={i} data-letter className="inline-block">
                {ch}
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
