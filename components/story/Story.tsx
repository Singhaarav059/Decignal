"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { CH, TOTAL_LEN, finalExit, onSelect, smoothstep, subscribe, weight } from "@/lib/story";
import { FINAL, HERO } from "@/lib/copy";
import { accentVars } from "@/lib/tone";
import { SceneBoundary } from "../three/SceneBoundary";
import { StoryCard } from "./StoryCard";
import { IslandPanel } from "./IslandPanel";
import { LayerReadout } from "./LayerReadout";
import { ScalePhone } from "./ScalePhone";
import { TONE } from "./chapters";

const Scene = dynamic(() => import("../three/Scene"), { ssr: false });

// A statement leaves before the next chapter arrives: the gap between them belongs to the object moving.
const shown = (w: number) => smoothstep(0.7, 1, w);

/**
 * The story: one 3D world and one info card. Behind the world, the two statement headlines (the hero's,
 * the page's h1, and the final one). In front, the StoryCard (bottom-left, every chapter) and, on phones,
 * the decks that stand in for the 3D cards in Control and Scale.
 */
export function Story() {
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLDivElement>(null);

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

    const off = subscribe((g) => {
      els.forEach((el) => {
        const ch = Number(el.dataset.ch);
        let w = shown(weight(ch, g));
        // The final statement leaves with the story, as the page below arrives.
        if (ch === CH.final) w *= 1 - finalExit(g);
        if (still) w = w > 0.5 ? 1 : 0;
        put(el, "opacity", w.toFixed(3));
        // A phone deck sits 12px above the card, so it travels less than that and never crosses it.
        put(el, "transform", `translate3d(0, ${((1 - w) * (el.dataset.stage !== undefined ? 10 : 18)).toFixed(2)}px, 0)`);
        put(el, "visibility", w < 0.005 ? "hidden" : "visible");
        if (el.dataset.stage !== undefined && el.inert !== w < 0.6) el.inert = w < 0.6;
      });
    });
    return () => {
      off();
      offSelect();
    };
  }, []);

  return (
    <>
      {/* Behind the world: the hero statement. Its line is the page's h1 (S15). */}
      <div ref={back} className="story-back pointer-events-none fixed inset-0 select-none">
        <div data-ch={CH.fragments} className="story-statement">
          <p className="t-label intro-fade">{HERO.eyebrow}</p>
          <h1 className="t-display" style={accentVars(TONE[CH.fragments])}>
            <span className="intro-line line-mask">
              <span>{HERO.headline[0]}</span>
            </span>{" "}
            <span className="intro-line line-mask accent">
              <span>{HERO.headline[1]}</span>
            </span>
          </h1>
        </div>
      </div>

      {/* The world */}
      <div className="story-canvas pointer-events-none fixed inset-0" aria-hidden>
        <div className="intro-stage size-full">
          {/* Without WebGL (or after a lost context) the chapter's flat drawing stands in. */}
          <SceneBoundary story label="Drawing of the story's scene: six business systems and one stock transfer">
            <Scene />
          </SceneBoundary>
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
      </div>

      {/* The closing statement, also behind the world; after the card in reading order. */}
      <div ref={close} className="story-back pointer-events-none fixed inset-0 select-none">
        <div data-ch={CH.final} className="story-statement">
          <h2 className="t-display" style={accentVars(TONE[CH.final])}>
            <span className="line-mask">
              <span>{FINAL.headline[0]}</span>
            </span>{" "}
            <span className="line-mask accent">
              <span>{FINAL.headline[1]}</span>
            </span>
          </h2>
        </div>
      </div>

      <IslandPanel />

      {/* The scroll track the story is mapped onto */}
      <div id="story" style={{ height: `${TOTAL_LEN * 100}svh` }} aria-hidden />
    </>
  );
}
