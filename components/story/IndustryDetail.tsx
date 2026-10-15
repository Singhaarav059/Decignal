"use client";

import { useLayoutEffect, useState } from "react";
import { CH, CHAPTERS, INDUSTRIES, INDUSTRY_TONE, industryF, subscribe } from "@/lib/story";
import { appHref } from "@/lib/areas";
import { appById } from "@/lib/content";
import { CHAPTER_COPY, INDUSTRY } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { TONE, goToStory, industryAt } from "./chapters";
import { StoryPills } from "./StoryPills";
import { Arrow } from "../ui/Arrow";

/**
 * Local progress in Industries where industry k holds still: the middle of the span where industryF
 * rests on k, found from industryF itself so it stays right whatever the timeline's holds are.
 */
function holdAt(k: number) {
  const ts = CHAPTERS[CH.industries].ts;
  let lo = -1;
  let hi = -1;
  for (let t = 0; t <= ts; t += 0.002) {
    if (Math.abs(industryF(t) - k) < 0.004) {
      if (lo < 0) lo = t;
      hi = t;
    }
  }
  return lo < 0 ? ((k + 0.5) / INDUSTRIES.length) * ts : (lo + hi) / 2;
}

const goToIndustry = (k: number) => goToStory(CH.industries, holdAt(k));

/** The industry facing the front, as React state: it changes once, at the middle of the board's half-turn. */
export function useIndustryAt() {
  const [at, setAt] = useState(0);
  useLayoutEffect(() => {
    let last = -1;
    return subscribe((g) => {
      const v = industryAt(g);
      if (v === last) return;
      last = v;
      setAt(v);
    });
  }, []);
  return at;
}

/**
 * 08's title: "Built for" over the industry's name. The name swaps once, at the middle of the board's
 * half-turn (with the pills and the body): a short reel on a timer, so a scroll stopped mid-turn never
 * holds two names. The old name leaves first, the new one rolls in after it, in the scroll's direction.
 */
export function IndustryTitle() {
  const at = useIndustryAt();
  const lines = CHAPTER_COPY[CH.industries]?.title ?? INDUSTRY.title("");
  return (
    <h2 className="t-title-card story-title" style={accentVars(TONE[CH.industries])}>
      <span className="story-title-line">{lines[0]}</span>{" "}
      <span className="accent ind-roll" aria-hidden>
        {INDUSTRIES.map((ind, k) => (
          <span key={ind.name} data-at={k < at ? "past" : k > at ? "next" : "on"} style={accentVars(INDUSTRY_TONE[k])}>
            {INDUSTRY.title(ind.name)[1]}
          </span>
        ))}
      </span>
      {/* The heading as one sentence for assistive tech: the slot above is decoration. */}
      <span className="sr-only">{lines[1]}</span>
    </h2>
  );
}

/**
 * Industries, inside the story card: every industry as one selector (click turns the road to it), then
 * who it is for, its three application examples (each a link to its record) and its filtered examples.
 * The card never fades between industries; the text swaps in place.
 */
export function IndustryCard() {
  const at = useIndustryAt();

  return (
    <div className="ind-card">
      <StoryPills
        label={INDUSTRY.indexAria}
        items={INDUSTRIES.map((ind, k) => ({ label: ind.name, tone: INDUSTRY_TONE[k], controls: `ind-${k}` }))}
        value={at}
        onChange={goToIndustry}
      />
      <div className="story-stack">
        {INDUSTRIES.map((ind, k) => (
          <div key={ind.name} id={`ind-${k}`} role="tabpanel" className="story-stack-item ind-block" data-on={k === at || undefined} style={toneVars(INDUSTRY_TONE[k])}>
            <p className="t-body ind-challenge">{ind.challenge}</p>
            <p className="t-label ind-label">{INDUSTRY.decisions}</p>
            <ul className="ind-rows">
              {ind.apps.map((id) => {
                const app = appById(id)!;
                return (
                  <li key={id} className="t-small">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="ind-check" aria-hidden>
                      <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />
                    </svg>
                    <a href={appHref(app)}>{app.name}</a>
                  </li>
                );
              })}
            </ul>
            <a href={ind.href} className="story-link t-small">
              {INDUSTRY.startLink}
              <Arrow />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
