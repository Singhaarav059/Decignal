"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CATEGORIES, CATEGORY_TONE } from "@/lib/content";
import { scrollToTarget } from "../SmoothScroll";
import { LogoMark } from "../ui/Logo";
import { Arrow } from "../ui/Arrow";

gsap.registerPlugin(ScrollTrigger);

const STRATA = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

const NAV = [
  ["Applications", "#applications"],
  ["Outcomes", "#outcomes"],
  ["How it works", "#how"],
  ["Questions", "#faq"],
  ["Free AI audit", "#audit"],
] as const;

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
        <div className="mx-auto grid max-w-6xl gap-9 md:grid-cols-[1.4fr_1fr_1fr]">
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

          <nav aria-label="Footer">
            <p className="eyebrow">Explore</p>
            <ul className="mt-5 space-y-3 text-[15px]">
              {NAV.map(([label, href]) => (
                <li key={href}>
                  <button onClick={() => scrollToTarget(href)} className="link text-ink-2 hover:text-ink">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow">Where Decignal works</p>
            <ul className="mt-5 space-y-3 text-[15px] text-ink-2">
              {CATEGORIES.map((c) => (
                <li key={c} className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full" style={{ background: `var(--color-${CATEGORY_TONE[c]})` }} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-line pt-6 text-[13px] text-ink-soft md:flex-row md:items-center md:justify-between">
          <span>Decision intelligence for enterprises across India and Africa.</span>
          <div className="flex items-center gap-6">
            <span>© 2026 Decignal</span>
            <button
              onClick={() => scrollToTarget(0)}
              className="inline-flex items-center gap-2 text-ink transition-colors hover:text-cobalt"
            >
              Back to top
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-line-strong" aria-hidden>
                ↑
              </span>
            </button>
          </div>
        </div>

        {/* The wordmark, set across the full width */}
        <div ref={word} className="mt-10 flex items-end justify-center gap-[1.5vw] overflow-hidden pt-[1vw] pb-[4.5vw]" aria-hidden>
          <span data-letter className="inline-block">
            <LogoMark className="block h-[13vw] w-[13vw]" />
          </span>
          <span className="flex font-serif text-[20vw] leading-[0.9] tracking-[-0.06em]">
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
