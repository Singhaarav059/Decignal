"use client";

// The story on an upright phone: a page that scrolls with the thumb. Each moment of the story is a block
// down the page, its pre-rendered picture (the live 3D's own framing at that hold, lib/stills.ts) with the
// labels as page text, and the chapter's card under it. Nothing is pinned, nothing snaps, nothing waits
// for a swipe to end: the page moves 1:1 with the finger, the way a plain page does.
//
// The story's position (g) still drives what reads it (the card's stepper and rolls, the sky, the Scale
// hand): it follows the block under the middle of the screen, and through the Scale chapter it runs with
// the scroll so the hand deals as the reader moves. Pictures load lazily, a screen ahead.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CH, CHAPTERS, INDUSTRIES, INDUSTRY_TONE, STOPS, setG, setSceneReady, store } from "@/lib/story";
import { bgAt } from "@/lib/scene";
import { markSceneReady } from "@/lib/chrome";
import { FACES, FINAL, HERO, INDUSTRY } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { STILLS_DIR, labelsOf, loadBucket, loadManifest, placeLabels, type Manifest, type Shape } from "@/lib/stills";
import { SystemIcon } from "../ui/SystemIcon";
import { SYSTEMS } from "../ui/systems";
import { Words, wordCount } from "../ui/Words";
import { ChapterBody } from "./StoryCard";
import { LayerReadout } from "./LayerReadout";
import { ScalePhone } from "./ScalePhone";
import { TONE } from "./chapters";

const [EYEBROW_A, EYEBROW_B] = HERO.eyebrow.split(" · ");

/** The chapter hold k belongs to. */
const chapterOf = (k: number) => Math.min(Math.floor(STOPS[k] + 1e-6), CHAPTERS.length - 1);
/** Each chapter's holds, in order. */
const HOLDS = CHAPTERS.map((_, c) => STOPS.map((_, k) => k).filter((k) => chapterOf(k) === c));
/** Room kept above and below a hold's framed band, in bake px, so labels near its edge stay whole. */
const PAD = 14;

const sky = (g: number) => `rgb(${bgAt(g).join(" ")})`;

/** The bake nearest this screen's width (the picture is drawn edge to edge at the screen's width). */
function shapeFor(m: Manifest, vw: number) {
  let best = m.shapes[0];
  for (const s of m.shapes) if (Math.abs(Math.log(s.w / vw)) < Math.abs(Math.log(best.w / vw))) best = s;
  return best;
}

type Bake = { m: Manifest; fmt: string; shape: Shape; vw: number };

/** One hold's picture, cropped to the band the 3D framed its subject into, at the screen's width. */
function Shot({ bake, k }: { bake: Bake; k: number }) {
  const tags = useRef<HTMLDivElement>(null);
  const { shape, vw, fmt, m } = bake;
  const band = shape.bands[k];
  const s = vw / shape.w;
  const top = Math.max(0, band[0] - PAD);
  const bottom = Math.min(shape.h, band[1] + PAD);
  const name = `h${String(k).padStart(2, "0")}`;

  useEffect(() => {
    const host = tags.current;
    if (!host) return;
    let live = true;
    loadBucket(shape.id)
      .then((b) => {
        const hold = b.holds[k];
        if (!live || !hold?.tags.length) return;
        const layer = labelsOf(m, b, hold.tags);
        layer.className = "pf-tags";
        host.replaceChildren(layer);
        placeLabels(layer, hold.tags, { x: 0, y: -top * s, s }, vw);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shape.id, k, m, s, top, vw]);

  return (
    <div className="pf-shot" data-g={STOPS[k]} style={{ height: `${((bottom - top) * s).toFixed(1)}px` }}>
      <picture>
        {fmt === "avif" && <source type="image/avif" srcSet={`${STILLS_DIR}/${shape.id}/${name}.avif`} />}
        <img
          src={`${STILLS_DIR}/${shape.id}/${name}.webp`}
          alt=""
          loading={k === 0 ? "eager" : "lazy"}
          decoding="async"
          width={shape.w}
          height={shape.h}
          style={{ top: `${(-top * s).toFixed(1)}px`, height: `${(shape.h * s).toFixed(1)}px` }}
        />
      </picture>
      <div ref={tags} aria-hidden />
    </div>
  );
}

/** A chapter's card, as the pinned card shows it, in the page's flow. */
function Card({ ch, g }: { ch: number; g: number }) {
  return (
    // The closing card is on the night surface, as in the pinned story.
    <div className="card card--story story-card pf-card" data-g={g} data-night={ch === CH.final || undefined}>
      <div className="story-pane" data-ch={ch}>
        <ChapterBody ch={ch} />
      </div>
    </div>
  );
}

/** The Industries callout for one place, under its picture. */
function IndustryNote({ k }: { k: number }) {
  const ind = INDUSTRIES[k];
  return (
    <div className="ind-callout pf-note" style={toneVars(INDUSTRY_TONE[k])}>
      <div className="ind-callout-item" data-at="on">
        <p className="ind-callout-top">
          <span className="ind-callout-chip">
            <i />
            {ind.name}
          </span>
          <span className="ind-callout-status">
            <i />
            {FACES.ready}
          </span>
        </p>
        <p className="t-label ind-callout-label">{INDUSTRY.action}</p>
        <p className="ind-callout-decision">{ind.decision}</p>
        <p className="t-label ind-callout-foot">{ind.system}</p>
      </div>
    </div>
  );
}

export function PhoneFlow({ onFail }: { onFail: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [bake, setBake] = useState<Bake | null>(null);

  useEffect(() => {
    let live = true;
    loadManifest()
      .then(({ m, fmt }) => {
        if (!live) return;
        const vw = document.documentElement.clientWidth;
        const shape = shapeFor(m, vw);
        if (shape.g.length !== STOPS.length || shape.g.some((g, k) => Math.abs(g - STOPS[k]) > 1e-3)) return onFail();
        setBake({ m, fmt, shape, vw });
      })
      .catch(() => live && onFail());
    return () => {
      live = false;
    };
  }, [onFail]);

  useEffect(() => {
    const host = root.current;
    if (!bake || !host) return;
    // The page is ready to show once the first picture is in (the loader waits for it).
    const first = host.querySelector("img");
    const ready = () => {
      setSceneReady(true);
      markSceneReady();
    };
    if (first && !first.complete) {
      first.addEventListener("load", ready, { once: true });
      first.addEventListener("error", ready, { once: true });
    } else ready();

    // The story's position follows the block under the middle of the screen; through Scale it runs
    // with the scroll. Offsets are measured once per layout, so a scroll frame reads only scrollY.
    type Span = { top: number; bottom: number; g: number; to?: number };
    let spans: Span[] = [];
    const measure = () => {
      const y = window.scrollY;
      spans = Array.from(host.querySelectorAll<HTMLElement>("[data-g]")).map((el) => {
        const r = el.getBoundingClientRect();
        const to = el.dataset.gTo;
        return { top: r.top + y, bottom: r.bottom + y, g: Number(el.dataset.g), to: to ? Number(to) : undefined };
      });
      update();
    };
    let last = -1;
    const update = () => {
      raf = 0;
      const mid = window.scrollY + window.innerHeight * 0.5;
      let g = last < 0 ? 0 : last;
      for (const sp of spans) {
        if (mid < sp.top) break;
        if (sp.to === undefined) g = sp.g;
        else g = sp.g + (sp.to - sp.g) * Math.min(1, Math.max(0, (mid - sp.top) / Math.max(1, sp.bottom - sp.top - window.innerHeight * 0.5)));
      }
      if (Math.abs(g - last) > 1e-4) {
        last = g;
        store.after = 0;
        setG(g);
      }
    };
    let raf = 0;
    const onScroll = () => {
      raf ||= requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [bake]);

  const shots = (c: number) => (bake ? HOLDS[c].map((k) => <Shot key={k} bake={bake} k={k} />) : null);
  const style = (c: number, prev: number): CSSProperties => ({ ["--pf-sky" as string]: sky(STOPS[HOLDS[c][0]]), ["--pf-from" as string]: sky(STOPS[HOLDS[prev].at(-1)!]) });
  const lastOf = (c: number) => STOPS[HOLDS[c].at(-1)!];

  return (
    <div ref={root} className="pf">
      {/* 01 The hero: the systems tag and the h1, the world, then what Decignal does */}
      <section className="pf-ch pf-hero" style={style(CH.fragments, CH.fragments)}>
        <div className="pf-head" data-g={0}>
          <p className="hero-tag">
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
          <h1 className="t-display hero-h1" style={accentVars(TONE[CH.fragments])}>
            <span className="line-mask">
              <span><Words>{HERO.headline[0]}</Words></span>
            </span>{" "}
            <span className="line-mask accent">
              <span><Words from={wordCount(HERO.headline[0])}>{HERO.headline[1]}</Words></span>
            </span>
          </h1>
        </div>
        {shots(CH.fragments)}
        <Card ch={CH.fragments} g={0} />
      </section>

      {/* 02-05 and 08: each hold's picture, then the chapter's card */}
      {[CH.signal, CH.problem, CH.context, CH.decision].map((c) => (
        <section key={c} className="pf-ch" data-ch={c} style={style(c, c - 1)}>
          {shots(c)}
          <Card ch={c} g={lastOf(c)} />
        </section>
      ))}

      {/* 06 Control: the layer deck stands in for the 3D cards, as on the pinned phone story */}
      <section className="pf-ch" data-ch={CH.control} style={style(CH.control, CH.decision)}>
        <div className="pf-stage" data-g={STOPS[HOLDS[CH.control][0]]}>
          <LayerReadout />
        </div>
        <Card ch={CH.control} g={lastOf(CH.control)} />
      </section>

      {/* 07 Scale: the dealt hand, dealt as the reader scrolls through it */}
      <section className="pf-ch" data-ch={CH.scale} style={style(CH.scale, CH.control)}>
        <div className="pf-scale" data-g={STOPS[HOLDS[CH.scale][0]]} data-g-to={lastOf(CH.scale)}>
          <div className="pf-scale-hand">
            <ScalePhone />
          </div>
        </div>
        <Card ch={CH.scale} g={lastOf(CH.scale)} />
      </section>

      {/* 08 Industries: each place, its recommended action under it */}
      <section className="pf-ch" data-ch={CH.industries} style={style(CH.industries, CH.scale)}>
        {bake &&
          HOLDS[CH.industries].map((k, i) => (
            <div key={k} className="pf-place">
              <IndustryNote k={i} />
              <Shot bake={bake} k={k} />
            </div>
          ))}
        <Card ch={CH.industries} g={lastOf(CH.industries)} />
      </section>

      {/* 09 Decide: the closing statement, the world, the results and the call to action */}
      <section className="pf-ch pf-final" data-ch={CH.final} style={style(CH.final, CH.industries)}>
        <div className="pf-head" data-g={lastOf(CH.final)}>
          <h2 className="t-display final-h1" style={accentVars(TONE[CH.final])}>
            <span className="line-mask">
              <span><Words>{FINAL.headline[0]}</Words></span>
            </span>{" "}
            <span className="line-mask accent">
              <span><Words from={wordCount(FINAL.headline[0])}>{FINAL.headline[1]}</Words></span>
            </span>
          </h2>
          <p className="t-lede final-sub">{FINAL.sub}</p>
        </div>
        {shots(CH.final)}
        <Card ch={CH.final} g={lastOf(CH.final)} />
      </section>
    </div>
  );
}
