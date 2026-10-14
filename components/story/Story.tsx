"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CH, EXIT_DRIFT, STOPS, TOTAL_LEN, blendAt, clamp01, finalExit, onSelect, smoothstep, store, subscribe, weight } from "@/lib/story";
import { CTA, FINAL, HERO } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { SceneBoundary } from "../three/SceneBoundary";
import { Arrow } from "../ui/Arrow";
import { SectionLink } from "../ui/SectionLink";
import { SystemIcon } from "../ui/SystemIcon";
import { SYSTEMS } from "../ui/systems";
import { Words, wordCount } from "../ui/Words";
import { StoryCard } from "./StoryCard";
import { ChapterHeads } from "./ChapterHeads";
import { FinalBar } from "./FinalCard";
import { IslandPanel } from "./IslandPanel";
import { LayerReadout } from "./LayerReadout";
import { ScalePhone } from "./ScalePhone";
import { IndustryCallout } from "./IndustryCallout";
import { TONE } from "./chapters";
import { PhoneStory } from "./PhoneStory";
import { PhoneFlow } from "./PhoneFlow";
import { liveForced, onStillsChange, phoneFlow, phoneStills } from "@/lib/stills";
import { exposeLive3d } from "@/lib/live3d";

/** The eyebrow's two halves: one line on wide screens, two beside the systems on phones. */
const [EYEBROW_A, EYEBROW_B] = HERO.eyebrow.split(" · ");

const Scene = dynamic(() => import("../three/Scene"), { ssr: false });

/** How the story's world is drawn here: from stills on an upright phone (lib/stills.ts), the live 3D
 *  elsewhere. Undecided while hydrating, so a phone never starts fetching the 3D's code. */
function useEngine(): "pending" | "flow" | "stills" | "live" {
  return useSyncExternalStore(onStillsChange, () => (phoneFlow() ? "flow" : phoneStills() ? "stills" : "live"), () => "pending");
}

// A statement leaves before the next chapter arrives: the gap between them belongs to the object moving.
const shown = (w: number) => smoothstep(0.7, 1, w);

/** A chapter head's hand-off, as shares of it: each piece (kicker, two lines, three figures) takes ROLL to
 *  move, the pieces start STAGGER apart top to bottom, the old head is gone by OUT_END and the new one
 *  starts at IN_START, so a piece's mask never holds two heads at once. */
const ROLL = 0.3;
const STAGGER = 0.2;
const IN_START = 0.4;

/**
 * One piece of a chapter head in its mask: 0 in place, 1 rolled fully out. `p` is the head's place
 * against the story (-1 gone up, 0 here, 1 waiting below). The old head peels away from the top while
 * the new one fills in from the top, a relay rather than a swap: one of them is always in the corner.
 */
function rollOf(p: number, k: number, n: number) {
  const lag = n > 1 ? (STAGGER * k) / (n - 1) : 0;
  if (p <= 0) return clamp01((-p - lag) / ROLL);
  return 1 - clamp01((1 - p - IN_START - lag) / ROLL);
}

/**
 * The story: one 3D world and one info card. Behind the world, the two statement headlines (the hero's,
 * the page's h1, and the final one). In front, the StoryCard (bottom-left, every chapter) and, on phones,
 * the decks that stand in for the 3D cards in Control and Scale.
 */
export function Story() {
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const engine = useEngine();
  // Stills that cannot load (a missing or stale manifest) hand the phone to the live 3D.
  const [stillsFailed, setStillsFailed] = useState(false);
  const failStills = useCallback(() => {
    // The scrolling page has no stills to show: load again as the pinned story with the live 3D (once).
    if (document.documentElement.dataset.flow === "phone") {
      try {
        sessionStorage.setItem("decignal:noflow", "1");
      } catch {}
      window.location.reload();
      return;
    }
    setStillsFailed(true);
  }, []);
  const world = engine === "pending" ? null : engine === "flow" && !stillsFailed ? "flow" : engine === "stills" && !stillsFailed ? "stills" : "live";
  useEffect(() => {
    if (liveForced()) exposeLive3d();
  }, []);

  useEffect(() => {
    // The card handles its own panes; these are the statements and the phone decks.
    const els = [
      ...[back.current, close.current].flatMap((r) => Array.from(r?.querySelectorAll<HTMLElement>(":scope > [data-ch]") ?? [])),
      ...Array.from(front.current?.querySelectorAll<HTMLElement>(":scope > [data-stage]") ?? []),
    ];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // While a system is open, the headline steps back so the island and its panel lead.
    const offSelect = onSelect((n) => {
      [back.current, close.current, front.current].forEach((r) => r?.toggleAttribute("data-dim", n >= 0));
    });

    // Write a style only when its value moves, so most frames leave the browser nothing to recalculate.
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement, prop: string, value: string) => {
      let w = written.get(el);
      if (!w) written.set(el, (w = {}));
      if (w[prop] === value) return;
      w[prop] = value;
      el.style.setProperty(prop, value);
    };

    // Chapter heads roll rather than fade: each piece in its own mask, tied to the scroll.
    const rolls = new Map(els.filter((el) => el.classList.contains("chapter-head")).map((el) => [el, Array.from(el.querySelectorAll<HTMLElement>("[data-roll]"))]));

    const off = subscribe((g) => {
      const { i, e } = blendAt(g);
      els.forEach((el) => {
        const ch = Number(el.dataset.ch);
        const pieces = rolls.get(el);
        if (pieces) {
          // The head's place against the story: the outgoing one rises from 0 to -1 as the incoming
          // one comes up from 1 to 0, both with the hand-off, so one of them always fills the corner.
          let p = Math.min(Math.max(ch - (i + e), -1), 1);
          if (still) p = Math.abs(p) < 0.5 ? 0 : Math.sign(p);
          pieces.forEach((piece, k) => {
            const r = rollOf(p, k, pieces.length);
            const by = Number(piece.dataset.roll) || 1.1;
            put(piece, "transform", r > 0 ? `translate3d(0, ${(Math.sign(p) * r * by * 100).toFixed(2)}%, 0)` : "none");
            put(piece, "opacity", (1 - 0.5 * r).toFixed(3));
          });
          put(el, "opacity", "1");
          put(el, "visibility", Math.abs(p) > 0.999 ? "hidden" : "visible");
          return;
        }
        let w = shown(weight(ch, g));
        if (still) w = w > 0.5 ? 1 : 0;
        // The closing layer drifts up with the page below as its sheet slides over (the world drifts
        // by the same amount, Scene frameShot), so the two leave as one.
        const drift = ch === CH.final ? -finalExit(g) * EXIT_DRIFT * window.innerHeight : 0;
        put(el, "opacity", w.toFixed(3));
        // A phone deck sits 12px above the card, so it travels less than that and never crosses it.
        put(el, "transform", `translate3d(0, ${((1 - w) * (el.dataset.stage !== undefined ? 10 : 18) + drift).toFixed(2)}px, 0)`);
        put(el, "visibility", w < 0.005 ? "hidden" : "visible");
        // Gone, its loops hold still (story.css: the hero's scroll cue).
        if (el.hasAttribute("data-gone") !== w < 0.005) el.toggleAttribute("data-gone", w < 0.005);
        // The closing statement's words rise once it is mostly in, and drop back only once it has gone.
        if (el.classList.contains("statement-rise")) {
          const on = el.hasAttribute("data-on") ? w > 0.02 : w > 0.4;
          if (on !== el.hasAttribute("data-on")) el.toggleAttribute("data-on", on);
        }
        if (el.dataset.stage !== undefined && el.inert !== w < 0.6) el.inert = w < 0.6;
        // The hero's buttons take clicks only while the hero is mostly in.
        const act = el.dataset.hero !== undefined ? actions.current : null;
        if (act && act.inert !== w < 0.6) act.inert = w < 0.6;
      });
    });
    return () => {
      off();
      offSelect();
    };
  }, []);

  // An upright phone reads the story as a page that scrolls with the thumb (PhoneFlow); without its
  // stills it falls back to the pinned story with the live 3D.
  if (world === "flow")
    return (
      <>
        <PhoneFlow onFail={failStills} />
        <IslandPanel />
      </>
    );

  return (
    <>
      {/* Behind the world: the hero, on one centre line (Orvan, Koushik). The systems tag and the h1 at the
          top, the world under them; on wide screens what Decignal does and the two actions sit bottom-left
          and the scroll cue bottom-right, where the story card stands in later chapters. */}
      <div ref={back} className="story-back pointer-events-none fixed inset-0 select-none">
        <div data-ch={CH.fragments} className="story-statement hero" data-hero>
          <div className="hero-head">
            {/* The six systems the world below is built from; pointing at one lifts its island. */}
            <p className="hero-tag intro-fade" data-lens="clear">
              <span className="hero-tag-stack" aria-hidden>
                {SYSTEMS.map((s, i) => (
                  <span
                    key={s.id}
                    className="hero-tag-sys"
                    style={{ ...toneVars(s.tone), ["--i" as string]: i }}
                    onPointerEnter={() => (store.islandHint = i)}
                    onPointerLeave={() => (store.islandHint = -1)}
                  >
                    <SystemIcon id={s.id} size={12} />
                  </span>
                ))}
              </span>
              <span className="t-label hero-tag-text">
                <span>{EYEBROW_A}</span>
                <span className="hero-tag-sep"> · </span>
                <span>{EYEBROW_B}</span>
              </span>
            </p>
            <h1 className="t-display hero-h1" style={accentVars(TONE[CH.fragments])}>
              <span className="intro-line line-mask">
                <span><Words>{HERO.headline[0]}</Words></span>
              </span>{" "}
              <span className="intro-line line-mask accent">
                <span><Words from={wordCount(HERO.headline[0])}>{HERO.headline[1]}</Words></span>
              </span>
            </h1>
          </div>
          {/* The camera keeps the world clear of each corner (Scene measurePage reads [data-frame]). */}
          <div className="hero-aside" data-frame>
            <p className="t-lede hero-lede intro-fade">{HERO.lede}</p>
            <div ref={actions} className="hero-actions intro-fade">
              <SectionLink href={CTA.href} className="btn btn-primary">
                {CTA.primary}
                <Arrow />
              </SectionLink>
              <SectionLink href="#how" className="story-link hero-link">
                {HERO.secondary}
                <Arrow />
              </SectionLink>
            </div>
          </div>
          <div className="hero-meta intro-fade" data-frame>
            <p className="t-small hero-meta-text">{HERO.card}</p>
            <span className="hero-cue t-label" aria-hidden>
              <span className="story-cue-mouse">
                <span className="story-cue-wheel" />
              </span>
              {HERO.scrollCue}
            </span>
          </div>
        </div>
        {/* Wide screens: each chapter's headline and figures top-left, behind the world. */}
        <ChapterHeads />
      </div>

      {/* The world */}
      <div className="story-canvas pointer-events-none fixed inset-0" aria-hidden>
        <div className="intro-stage size-full">
          {/* Without WebGL (or after a lost context) the chapter's flat drawing stands in. Upright phones
              draw the world from pre-rendered stills and never load the 3D. */}
          {world === "live" && (
            <SceneBoundary story label="Drawing of the story's scene: six business systems and one stock transfer">
              <Scene />
            </SceneBoundary>
          )}
          {world === "stills" && <PhoneStory onFail={failStills} />}
        </div>
      </div>

      {/* In front of the world: the one card, and on phones the decks above it */}
      <div ref={front} className="story-overlay pointer-events-none fixed inset-0">
        <StoryCard />
        <div data-ch={CH.control} data-stage className="story-stage" style={{ ["--stage-card" as string]: `var(--story-card-h-${CH.control})` }}>
          <LayerReadout />
        </div>
        <div data-ch={CH.scale} data-stage className="story-stage" style={{ ["--stage-card" as string]: `var(--story-card-h-${CH.scale})` }}>
          <ScalePhone />
        </div>
        <IndustryCallout />
      </div>

      {/* The closing statement, also behind the world; after the card in reading order. */}
      <div ref={close} className="story-back pointer-events-none fixed inset-0 select-none">
        <div data-ch={CH.final} className="story-statement statement-rise final-stage">
          <div className="final-head">
            <h2 className="t-display final-h1" style={accentVars(TONE[CH.final])}>
              <span className="line-mask">
                <span><Words>{FINAL.headline[0]}</Words></span>
              </span>{" "}
              <span className="line-mask accent">
                <span><Words from={wordCount(FINAL.headline[0])}>{FINAL.headline[1]}</Words></span>
              </span>
            </h2>
            <p className="t-lede final-sub" data-frame>{FINAL.sub}</p>
          </div>
          {/* Wide screens: the ending mirrors the hero on its centre line, the card's results and the
              call to action on one bar at the foot; the camera keeps the world clear of it. */}
          <FinalBar />
        </div>
      </div>

      <IslandPanel />

      {/* The scroll track the story is mapped onto */}
      <div id="story" style={{ ["--story-len" as string]: TOTAL_LEN }} aria-hidden>
        {/* Where a swipe rests on touch screens; SmoothScroll places them on the story's scroll map. */}
        {STOPS.map((g) => (
          <i key={g} className="story-stop" data-g={g} />
        ))}
      </div>
    </>
  );
}
