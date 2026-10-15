"use client";

import { useLayoutEffect } from "react";
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

/** The chapters between the hero and the ending: each gets a head on wide screens. */
const HEADS = CHAPTERS.map((_, i) => i).filter((i) => CHAPTER_FACTS[i]);

/**
 * Wide screens: each chapter's headline at display size top-left, over three figures from the systems it
 * reads. They sit behind the world on the story's back layer. Every head stands in the same place, and a
 * hand-off rolls the old one up out of its masks as the new one rolls in from below, piece by piece and
 * tied to the scroll (Story.tsx, [data-roll]), so the corner is never empty. The 3D framing keeps the
 * world clear of them ([data-head], Scene measurePage) and the card below drops its own title. Phones
 * keep the title in the card.
 */
export function ChapterHeads() {
  useFitHeads();
  return (
    <>
      {HEADS.map((c) => (
        <ChapterHead key={c} c={c} />
      ))}
    </>
  );
}

/** One line's width as set on one row: from its first word to its last (a word's mask pads its sides). */
function lineWidth(line: HTMLElement) {
  const words = line.querySelectorAll<HTMLElement>(".word > span");
  if (words.length) return words[words.length - 1].getBoundingClientRect().right - words[0].getBoundingClientRect().left;
  const range = document.createRange();
  range.selectNodeContents(line);
  return range.getBoundingClientRect().width;
}

/**
 * Wide screens: when any head's longest line would overrun its column, every head steps its type down
 * together, just enough for that line to fit (--fit, story-heads.css), so the chapters keep one display
 * size. At 78px the Industries head's "Financial Services." needs 589px where screens 1536px and wider
 * leave it about 510, and its mask cut it off mid-word. Measured once the fonts are in, and again
 * whenever a column or the viewport changes width.
 */
function useFitHeads() {
  useLayoutEffect(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>(".chapter-head .chapter-h"));
    const fit = () => {
      let k = 1;
      heads.forEach((h) => {
        const room = h.clientWidth;
        if (!room) return;
        const was = parseFloat(h.style.getPropertyValue("--fit")) || 1;
        // On one row each, as the lines are meant to sit (a too-long one would otherwise wrap). Only the
        // text is measured, never a box that fills the column (the Industries roll), or the type would
        // shrink a little more on every pass.
        h.style.whiteSpace = "nowrap";
        let need = 0;
        h.querySelectorAll<HTMLElement>(".line-mask > [data-roll]:not(:has(.ind-roll)), .ind-roll > span").forEach((line) => (need = Math.max(need, lineWidth(line))));
        h.style.whiteSpace = "";
        if (need) k = Math.min(k, Math.floor(((room - 4) / (need / was)) * 1000) / 1000);
      });
      heads.forEach((h) => {
        const was = parseFloat(h.style.getPropertyValue("--fit")) || 1;
        if (Math.abs(k - was) > 0.002) h.style.setProperty("--fit", String(k));
      });
    };
    fit();
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    const ro = new ResizeObserver(fit);
    heads.forEach((h) => ro.observe(h));
    // The type follows the viewport (vw, vh) while a capped column can keep its width: refit on resize too.
    addEventListener("resize", fit);
    return () => {
      live = false;
      ro.disconnect();
      removeEventListener("resize", fit);
    };
  }, []);
}

function ChapterHead({ c }: { c: number }) {
  const copy = CHAPTER_COPY[c];
  const facts = CHAPTER_FACTS[c] ?? [];
  const Icon = ICON[c];
  if (!copy) return null;
  return (
    <div data-ch={c} className="story-statement chapter-head" aria-hidden>
      <div className="chapter-head-in" data-head style={toneVars(TONE[c])}>
        <p className="chapter-kicker t-label">
          <span className="chapter-kicker-in" data-roll="1.4">
            {Icon && (
              <span className="chapter-kicker-icon">
                <Icon size={12} strokeWidth={2.4} />
              </span>
            )}
            <span>{CHAPTERS[c].label}</span>
            <span className="chapter-kicker-note">{EXAMPLE_LABEL}</span>
          </span>
        </p>
        <p className="t-display chapter-h" style={accentVars(TONE[c])}>
          <span className="line-mask">
            <span data-roll="1.2"><Words>{copy.title[0]}</Words></span>
          </span>{" "}
          <span className="line-mask accent">
            <span data-roll="1.2">
              {c === CH.industries ? <IndustryLine /> : <Words from={wordCount(copy.title[0])}>{copy.title[1]}</Words>}
            </span>
          </span>
        </p>
        {/* The whole head is aria-hidden (the card holds the same words), so the figures are plain spans. */}
        <div className="chapter-facts">
          {facts.map((f) => (
            <div key={f.label} className="chapter-fact" data-risk={f.risk || undefined} style={toneVars(f.tone)}>
              <div className="chapter-fact-in" data-roll="1.05">
                <Source name={f.source} />
                <span className="chapter-fact-value tabular">
                  {f.value}
                  {f.unit && <small>{f.unit}</small>}
                </span>
                <span className="chapter-fact-label">{f.label}</span>
              </div>
            </div>
          ))}
        </div>
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
    <span className="ind-roll chapter-roll">
      {INDUSTRIES.map((ind, k) => (
        <span key={ind.name} data-at={k < at ? "past" : k > at ? "next" : "on"} style={accentVars(INDUSTRY_TONE[k])}>
          {INDUSTRY.title(ind.name)[1]}
        </span>
      ))}
    </span>
  );
}
