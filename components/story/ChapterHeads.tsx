"use client";

import type { CSSProperties } from "react";
import { ArrowLeftRight, Building2, Layers, Network, ShieldCheck, TrendingDown, TriangleAlert, type LucideIcon } from "lucide-react";
import { CH, CHAPTERS, INDUSTRIES, INDUSTRY_TONE } from "@/lib/story";
import { CHAPTER_COPY, CHAPTER_FACTS, EXAMPLE_LABEL, INDUSTRY } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { Words, wordCount } from "../ui/Words";
import { SYSTEMS } from "../ui/systems";
import { TONE } from "./chapters";
import { useIndustryAt } from "./IndustryDetail";

/** Each chapter's sign in its head's label. */
const ICON: Partial<Record<number, LucideIcon>> = {
  [CH.signal]: TriangleAlert,
  [CH.problem]: TrendingDown,
  [CH.context]: Network,
  [CH.decision]: ArrowLeftRight,
  [CH.control]: ShieldCheck,
  [CH.scale]: Layers,
  [CH.industries]: Building2,
};

/** Heads that stand top-right: Problem's chart falls from top-left to bottom-right, so its empty corners
 *  are top-right (the head) and bottom-left (the card). */
const END = [CH.problem];

/** The chapters between the hero and the ending: each gets a head on wide screens. */
const HEADS = CHAPTERS.map((_, i) => i).filter((i) => CHAPTER_FACTS[i]);

/**
 * Wide screens: each chapter's headline at display size top-left, over three figures from the systems it
 * reads. They sit behind the world on the story's back layer and come and go with the chapter's weight
 * (Story.tsx); the 3D framing keeps the world clear of them ([data-head], Scene measurePage) and the
 * card below drops its own title. Phones keep the title in the card.
 */
export function ChapterHeads() {
  return (
    <>
      {HEADS.map((c) => (
        <ChapterHead key={c} c={c} />
      ))}
    </>
  );
}

function ChapterHead({ c }: { c: number }) {
  const copy = CHAPTER_COPY[c];
  const facts = CHAPTER_FACTS[c] ?? [];
  const Icon = ICON[c];
  if (!copy) return null;
  const n = String(c + 1).padStart(2, "0");
  return (
    <div data-ch={c} className="story-statement chapter-head statement-rise" data-align={END.includes(c) ? "end" : undefined} aria-hidden>
      <div className="chapter-head-in" data-head style={toneVars(TONE[c])}>
        <p className="chapter-kicker t-label">
          <span className="chapter-kicker-n tabular">{n}</span>
          {Icon && (
            <span className="chapter-kicker-icon">
              <Icon size={12} strokeWidth={2.4} />
            </span>
          )}
          <span>{CHAPTERS[c].label}</span>
          <span className="chapter-kicker-note">{EXAMPLE_LABEL}</span>
        </p>
        <p className="t-display chapter-h" style={accentVars(TONE[c])}>
          <span className="line-mask">
            <span><Words>{copy.title[0]}</Words></span>
          </span>{" "}
          {c === CH.industries ? (
            <IndustryLine />
          ) : (
            <span className="line-mask accent">
              <span><Words from={wordCount(copy.title[0])}>{copy.title[1]}</Words></span>
            </span>
          )}
        </p>
        <dl className="chapter-facts">
          {facts.map((f, k) => (
            <div key={f.label} className="chapter-fact" data-risk={f.risk || undefined} style={{ ...toneVars(f.tone), ["--k" as string]: k } as CSSProperties}>
              <dt className="chapter-fact-label">
                <Source name={f.source} />
                <span className="chapter-fact-label">{f.label}</span>
              </dt>
              <dd className="chapter-fact-value tabular">
                {f.value}
                {f.unit && <small>{f.unit}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** The source of a figure: the system's own tone and icon, or six dots for all of them. */
function Source({ name }: { name: string }) {
  const sys = SYSTEMS.find((s) => s.name === name);
  if (name === "All six") {
    return (
      <span className="chapter-src chapter-src-all">
        {SYSTEMS.map((s) => (
          <i key={s.id} style={toneVars(s.tone)} />
        ))}
      </span>
    );
  }
  if (sys) {
    return (
      <span className="chapter-src" style={toneVars(sys.tone)}>
        <sys.Icon size={10} strokeWidth={2.6} />
        {sys.name}
      </span>
    );
  }
  return <span className="chapter-src chapter-src-plain">{name}</span>;
}

/** Industries: line two is the industry facing the reader, rolling with the board's half-turn. */
function IndustryLine() {
  const at = useIndustryAt();
  return (
    <span className="accent ind-roll chapter-roll">
      {INDUSTRIES.map((ind, k) => (
        <span key={ind.name} data-at={k < at ? "past" : k > at ? "next" : "on"} style={accentVars(INDUSTRY_TONE[k])}>
          {INDUSTRY.title(ind.name)[1]}
        </span>
      ))}
    </span>
  );
}
