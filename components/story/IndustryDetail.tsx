"use client";

import { useEffect, useRef } from "react";
import { CH, INDUSTRIES, INDUSTRY_TONE, clamp01, gToProgress, localIn, subscribe } from "@/lib/story";
import { industryF } from "@/lib/layouts";
import { scrollToTarget } from "../SmoothScroll";

/** Local progress in the Industries chapter where industry k has settled (inverse of industryF). */
const settleAt = (k: number) => 0.04 + (Math.min(k + 0.1, INDUSTRIES.length - 1) / (INDUSTRIES.length - 1)) * 0.86;

/** What Decignal does in the industry on screen, and an index to jump between them. */
export function IndustryDetail() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-ind-detail]"));
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-ind-item]"));
    const bar = el.querySelector<HTMLElement>("[data-ind-bar]");
    let last = -1;
    return subscribe((g) => {
      const f = industryF(localIn(CH.industries, g));
      blocks.forEach((b, k) => {
        // Each block holds while its industry faces the viewer, then hands over.
        const w = 1 - clamp01(Math.abs(f - k) * 2.6);
        b.style.opacity = String(w);
        b.style.transform = `translate3d(0, ${(k - f) * 14}px, 0)`;
        b.style.visibility = w < 0.01 ? "hidden" : "visible";
        // The card unfolds as soon as its frame starts to appear, so the glass is never seen empty:
        // rows, checks and figures arrive in sequence while the frame fades in, and leave as it fades out.
        b.toggleAttribute("data-on", w > 0.08);
      });
      const now = Math.round(f);
      if (bar) bar.style.transform = `translateY(${f * 100}%)`;
      if (now !== last) {
        last = now;
        items.forEach((it, k) => it.toggleAttribute("aria-current", k === now));
        // The index bar takes the colour of the industry facing the viewer.
        el.style.setProperty("--ind-tone", `var(--color-${INDUSTRY_TONE[now]})`);
      }
    });
  }, []);

  const go = (k: number) => {
    const el = document.getElementById("story");
    if (!el) return;
    const start = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    scrollToTarget(start + gToProgress(CH.industries + clamp01(settleAt(k))) * range);
  };

  return (
    <div ref={root} className="ind-detail pointer-events-none absolute inset-x-6 top-[25vh] bottom-[13vh] md:inset-x-10 md:bottom-[14vh]">
      {/* Left: the industry's challenge, the decisions Decignal makes there, how to start */}
      <div className="absolute inset-x-0 bottom-0 h-[180px] md:h-[250px] md:max-w-[560px] lg:relative lg:h-full lg:w-[min(310px,24vw)] lg:max-w-none">
        {INDUSTRIES.map((ind, k) => (
          <div
            key={ind.name}
            data-ind-detail
            className="absolute inset-x-0 max-lg:bottom-0 lg:top-0"
            style={{ opacity: 0, "--tone": `var(--color-${INDUSTRY_TONE[k]})` } as React.CSSProperties}
          >
            <div className="ind-card">
              <span className="ind-card-rule" aria-hidden />
              <p className="ind-eyebrow ind-reveal eyebrow tabular max-md:hidden" style={{ ["--d" as string]: 0 }}>
                {String(k + 1).padStart(2, "0")} / {String(INDUSTRIES.length).padStart(2, "0")} · The challenge
              </p>
              <p className="ind-reveal mt-2 text-[15.5px] font-medium max-md:hidden leading-[1.4] tracking-[-0.01em] text-ink" style={{ ["--d" as string]: 1 }}>{ind.challenge}</p>
              <p className="ind-reveal eyebrow md:mt-5" style={{ ["--d" as string]: 2 }}>Decisions Decignal makes</p>
              <ul className="mt-2">
                {ind.decisions.map((d, i) => (
                  <li key={d} className="ind-row ind-reveal" style={{ ["--d" as string]: 3 + i }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" className="ind-check shrink-0" aria-hidden>
                      <circle cx="8" cy="8" r="7" />
                      <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />
                    </svg>
                    {d}
                  </li>
                ))}
              </ul>
              <dl className="ind-reveal ind-facts" style={{ ["--d" as string]: 3 + ind.decisions.length }}>
                <div>
                  <dt className="eyebrow">Connects</dt>
                  <dd className="ind-chips">
                    {ind.system.split(/\s*·\s*|,\s*/).map((sys) => <span key={sys}>{sys}</span>)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Typical start</dt>
                  <dd className="mt-1.5 text-[13px] font-medium text-ink">
                    {ind.start}
                    <span className="tabular block text-[12px] font-normal text-ink-soft">{ind.weeks} weeks</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ))}
      </div>

      {/* Right: every industry, the current one marked; click to turn the card to it */}
      <nav aria-label="Industries" className="ind-index pointer-events-auto absolute right-0 top-0 max-md:hidden">
        <ol className="relative border-l border-line">
          <span data-ind-bar className="ind-bar absolute -left-px top-0 h-[34px] w-[2px]" aria-hidden />
          {INDUSTRIES.map((ind, k) => (
            <li key={ind.name}>
              <button type="button" data-ind-item onClick={() => go(k)} className="ind-item">
                <span className="tabular eyebrow w-6">{String(k + 1).padStart(2, "0")}</span>
                <span className="ind-item-dot" style={{ background: `var(--color-${INDUSTRY_TONE[k]})` }} aria-hidden />
                {ind.name}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
