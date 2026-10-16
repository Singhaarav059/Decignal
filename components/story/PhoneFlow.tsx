"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CH, CHAPTERS, setG, store } from "@/lib/story";
import { FINAL, HERO } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { flow, flowBandCss, setFlowSeek, setSky, stepToward, windowPlayed } from "@/lib/flow";
import { jumpTo } from "@/lib/jump";
import { SceneBoundary } from "../three/SceneBoundary";
import { SystemIcon } from "../ui/SystemIcon";
import { SYSTEMS } from "../ui/systems";
import { Words, wordCount } from "../ui/Words";
import { ChapterBody } from "./StoryCard";
import { IslandPanel } from "./IslandPanel";
import { LayerReadout } from "./LayerReadout";
import { ScalePhone } from "./ScalePhone";
import { TONE } from "./chapters";

const Scene = dynamic(() => import("../three/Scene"), { ssr: false });

const [EYEBROW_A, EYEBROW_B] = HERO.eyebrow.split(" · ");

/** Chapters whose window is a DOM deck (the phone's stand-ins for the 3D cards), not the 3D world. */
const DECK = new Set<number>([CH.control, CH.scale]);
/** Chapters that step through something as their window passes (beats, layers, a hand, places). */
const STEPPED = new Set<number>([CH.context, CH.decision, CH.control, CH.scale, CH.industries]);
/** Where a still chapter rests: inside its hold, before its hand-off to the next one begins. */
const restAt = (i: number) => Math.min(CHAPTERS[i].ts * 0.5, 0.3);
/** Where a stepped chapter's steps end: just before its hand-off. */
const holdEnd = (i: number) => CHAPTERS[i].ts - 0.015;

/** The steps follow the scroll through a short ease (s): a flick never flips several in one frame, and
 *  a drag keeps them under the thumb. */
const EASE = 0.1;
/** The least time a stepped chapter takes to play through (s): only a flick ever meets it. */
const MIN_PLAY = 1.2;
/** The focus line, as a share of the screen's height from its top, and the lead the window already
 *  showing keeps (px), so the canvas never swaps back and forth at the midpoint. */
const FOCUS = 0.62;
const HOLD = 40;
/** The nav's bottom edge, which the windows scroll under. */
const NAV = 72;

type Geo = { top: number; h: number }[];

/** Hides the canvas's element (moved, it still holds the window it left until it draws again). */
const veil = (el: HTMLElement, on: boolean) => void (el.style.visibility = on ? "hidden" : "");

/**
 * The story on an upright phone: one section per chapter in the page's normal flow, so the page scrolls
 * natively and 1:1 with the thumb. Each section is the chapter's window, then its card (the same content
 * as the pinned story's card). One 3D canvas moves into whichever 3D window is most in view and draws
 * that chapter there; the window it leaves keeps a copy of its last picture. Control and Scale show
 * their phone decks. Nothing is pinned and nothing snaps.
 *
 * `live`: false while React hydrates the server's markup (both stories are in it; the CSS shows this
 * one on an upright phone), true once this is the page's story.
 */
export function PhoneFlow({ live }: { live: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  // The canvas's own element, outside React's tree of the page: it moves between windows without the
  // canvas (and its WebGL context) ever unmounting.
  const [host] = useState(() => (typeof document === "undefined" ? null : Object.assign(document.createElement("div"), { className: "pflow-gl intro-stage" })));

  useLayoutEffect(() => {
    const el = root.current;
    if (!live || !el || !host) return;
    flow.on = true;
    const wins = Array.from(el.querySelectorAll<HTMLElement>("[data-win]"));
    const secs = Array.from(el.querySelectorAll<HTMLElement>("[data-flow-ch]"));
    const stills = wins.map((w) => w.querySelector<HTMLCanvasElement>(".pflow-still"));

    // Page offsets, measured on layout changes only: a scroll frame reads none of the layout.
    let wGeo: Geo = [];
    let sGeo: Geo = [];
    let vh = window.innerHeight;
    // The canvas's own height (one for every window): each window shows a band of it.
    let hostH = 0;
    const inset = (k: number) => (hostH && wGeo[k] ? Math.max(0, (hostH - wGeo[k].h) / 2) : 0);
    const measure = () => {
      if (host.isConnected) hostH = host.offsetHeight;
      const y = window.scrollY;
      vh = window.innerHeight;
      wGeo = wins.map((w) => {
        const r = w.getBoundingClientRect();
        return { top: r.top + y, h: r.height };
      });
      sGeo = secs.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: r.top + y, h: r.height };
      });
    };

    /** How far a stepped chapter's window has played, 0..1, at scroll y (before any tab's offset). */
    const played = (k: number, y: number) => {
      const { top, h } = wGeo[k];
      return windowPlayed(top - y, h, vh, FOCUS, NAV);
    };
    // A tab picked in a card (a function, an industry) moves that chapter's steps, not the page: the
    // offset holds while the chapter stays, so scrolling on carries on from the picked step.
    const offs = new Map<number, number>();
    const playedAt = (k: number, y: number) => Math.min(Math.max(played(k, y) + (offs.get(k) ?? 0), 0), 1);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The eased step position (local progress) and where the scroll puts it.
    let easeCh = -1;
    let eased = 0;
    let goal = 0;
    let easing = 0;
    let easeT = 0;
    const ease = (t: number) => {
      const dt = Math.min((t - easeT) / 1000, 0.05);
      easeT = t;
      eased = stepToward(eased, goal, dt, EASE, holdEnd(easeCh) / MIN_PLAY);
      // Still arriving: the 3D keeps its full frame rate (lib/pace.ts resting).
      store.scrollAt = t;
      setG(easeCh + eased);
      easing = eased === goal ? 0 : requestAnimationFrame(ease);
    };

    let at = -1; // the chapter the story shows
    let held = -1; // the 3D window holding the canvas
    let moves = 0;
    const keep = (k: number) => {
      // The canvas is leaving window k: copy what it shows there.
      const c = stills[k];
      const src = flow.snap?.();
      if (!c || !src || !src.width) return;
      if (c.width !== src.width || c.height !== src.height) {
        c.width = src.width;
        c.height = src.height;
      }
      c.getContext("2d")?.drawImage(src, 0, 0);
      c.toggleAttribute("data-kept", true);
      wins[k].toggleAttribute("data-kept", true);
    };

    const update = () => {
      const y = window.scrollY;
      // The chapter whose window is nearest the focus line (a little below the screen's middle), among
      // those on screen: the canvas reaches a window as it comes in, so its world arrives with it rather
      // than once it is half read. Between windows, the section at the screen's middle.
      let best = -1;
      let most = 1;
      let near = Infinity;
      const focus = y + vh * FOCUS;
      wGeo.forEach(({ top, h }, k) => {
        const seen = Math.min(top + h, y + vh) - Math.max(top, y + NAV);
        if (seen <= 1) return;
        const d = Math.abs(top + h / 2 - focus) - (k === at ? HOLD : 0);
        if (d < near) {
          near = d;
          best = k;
          most = seen;
        }
      });
      if (best < 0) {
        const line = y + vh * 0.5;
        best = 0;
        sGeo.forEach(({ top }, k) => {
          if (top <= line) best = k;
        });
      }

      const ch = best;
      const three = !DECK.has(ch) && most > 1;
      // Leaving a 3D window (to another, or to a deck): its picture stays as a copy.
      if (held >= 0 && (held !== ch || !three) && flow.live) keep(held);
      if (ch !== at) {
        at = ch;
        flow.cut++;
        for (const k of offs.keys()) if (k !== ch) offs.delete(k);
      }
      const local = STEPPED.has(ch) ? playedAt(ch, y) * holdEnd(ch) : restAt(ch);
      const jumped = ch !== easeCh;
      // Scrolled down into a stepped chapter: it plays from its first step, whatever the scroll has passed.
      const fresh = jumped && ch > easeCh && STEPPED.has(ch) && !still;
      easeCh = ch;
      goal = local;
      if (fresh) eased = 0;
      else if (jumped || still || !STEPPED.has(ch)) eased = local;
      if (three && held !== ch) {
        // Hidden until the new chapter has drawn: the canvas still holds the last window's picture.
        veil(host, true);
        wins[ch].appendChild(host);
        if (!hostH) hostH = host.offsetHeight;
        held = ch;
        flow.cut++;
        const m = ++moves;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (moves === m) veil(host, false);
        }));
      }
      flow.live = three;
      if (held >= 0) flow.inset = inset(held);
      // A still chapter holds one g: its readers hear nothing until the story moves.
      if (Math.abs(store.g - (ch + eased)) > 1e-6) setG(ch + eased);
      if (Math.abs(goal - eased) > 1e-4 && !easing) {
        easing = requestAnimationFrame(ease);
        easeT = performance.now();
      }

      // The sky: each section's colour, blended into the next over its last quarter.
      const line = y + vh * 0.5;
      let k = 0;
      sGeo.forEach(({ top }, n) => {
        if (top <= line) k = n;
      });
      const s = sGeo[k];
      const f = s ? (line - s.top) / Math.max(s.h, 1) : 0;
      const ts = CHAPTERS[k].ts;
      setSky(k + (f < 0.75 || k === CHAPTERS.length - 1 ? 0 : ts + (1 - ts) * Math.min((f - 0.75) / 0.25, 1)));
    };

    // The window holding the canvas shows the live picture, not its copy.
    const shown = () =>
      stills.forEach((c, k) => {
        c?.toggleAttribute("data-under", k === held);
        if (wins[k].hasAttribute("data-held") !== (k === held)) wins[k].toggleAttribute("data-held", k === held);
      });

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
        shown();
      });
    };
    measure();
    update();
    shown();
    // Dev only: the poster bake (scripts/bake-flow-posters.mjs) reads the world through this.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __flow: flow });
    const ro = new ResizeObserver(() => {
      measure();
      schedule();
    });
    ro.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    // Fonts settling move the sections: measure again once they have.
    document.fonts?.ready.then(() => {
      measure();
      schedule();
    });

    // Links and tabs that go to a story moment scroll to its section (lib/flow.ts flowSeek).
    setFlowSeek((ch, local) => {
      measure();
      const w = wGeo[ch];
      const s = sGeo[ch];
      if (!w || !s) return;
      const y = window.scrollY;
      // Already in view (a tab in its own card): the page stays where the reader is.
      const inView = w.top + w.h > y + NAV && w.top < y + vh;
      const to = inView ? y : Math.max(0, s.top - NAV - 8);
      if (local !== null && STEPPED.has(ch)) offs.set(ch, Math.min(Math.max(local / holdEnd(ch), 0), 1) - played(ch, to));
      if (inView) schedule();
      else void jumpTo(to, { focus: false });
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(easing);
      ro.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      setFlowSeek(null);
      host.remove();
      flow.on = false;
      flow.live = false;
    };
  }, [live, host]);

  return (
    <div ref={root} id="story-flow" className="pflow">
      {/* 01: the systems tag and the h1, the six islands, then what Decignal does and the call to action. */}
      <section className="pflow-sec pflow-hero" data-flow-ch={CH.fragments} aria-labelledby="pflow-h1">
        <div className="pflow-head">
          <p className="hero-tag intro-fade">
            <span className="hero-tag-stack" aria-hidden>
              {SYSTEMS.map((s, i) => (
                <span key={s.id} className="hero-tag-sys" style={{ ...toneVars(s.tone), ["--i" as string]: i }}>
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
          <h1 id="pflow-h1" className="t-display pflow-h1" style={accentVars(TONE[CH.fragments])}>
            <span className="intro-line line-mask">
              <span><Words>{HERO.headline[0]}</Words></span>
            </span>{" "}
            <span className="intro-line line-mask accent">
              <span><Words from={wordCount(HERO.headline[0])}>{HERO.headline[1]}</Words></span>
            </span>
          </h1>
        </div>
        <Window ch={CH.fragments} />
        <Card ch={CH.fragments} />
      </section>

      {CHAPTERS.map((c, ch) =>
        ch === CH.fragments || ch === CH.final ? null : (
          <section key={c.id} className="pflow-sec" data-flow-ch={ch} aria-label={c.label}>
            <Window ch={ch} />
            <Card ch={ch} />
          </section>
        ),
      )}

      {/* 09: the closing headline, the world's last picture, then the offer and the call to action. */}
      <section className="pflow-sec pflow-final" data-flow-ch={CH.final} aria-labelledby="pflow-final-h">
        <div className="pflow-head">
          <h2 id="pflow-final-h" className="t-display pflow-h1" style={accentVars(TONE[CH.final])}>
            <span>{FINAL.headline[0]}</span> <span className="accent">{FINAL.headline[1]}</span>
          </h2>
        </div>
        <Window ch={CH.final} />
        <Card ch={CH.final} />
      </section>

      <IslandPanel />
      {live && host && createPortal(
        <SceneBoundary story label="Drawing of the story's scene: six kinds of business record, one supplier follow-up, five functions and four industries">
          <Scene />
        </SceneBoundary>,
        host,
      )}
    </div>
  );
}

/** A chapter's window: the 3D world (the canvas moves in while it is the one in view), or a phone deck. */
function Window({ ch }: { ch: number }) {
  if (DECK.has(ch)) {
    return (
      <div className="pflow-win pflow-deck" data-win={ch}>
        {ch === CH.control ? <LayerReadout /> : <ScalePhone />}
      </div>
    );
  }
  // The window's picture from the first paint (public/flow, baked by scripts/bake-flow-posters.mjs), until
  // the live world has drawn here or left its own copy: the 3D builds after the page is up.
  const first = ch === CH.fragments;
  return (
    <div className="pflow-win" data-win={ch} aria-hidden style={{ height: flowBandCss(ch) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size poster, served as baked */}
      <img className="pflow-poster" src={`/flow/${ch}.webp`} alt="" width={780} height={794} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "auto"} decoding="async" />
      <canvas className="pflow-still" />
    </div>
  );
}

/** The chapter's card: the pinned story's card content, as a plain card in the flow. */
function Card({ ch }: { ch: number }) {
  return (
    <div className="pflow-card" data-night={ch === CH.final || undefined} style={toneVars(TONE[ch])}>
      <ChapterBody ch={ch} />
    </div>
  );
}
