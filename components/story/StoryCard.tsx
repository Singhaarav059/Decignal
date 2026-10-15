"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  BEATS,
  CH,
  CHAPTERS,
  CONTEXT_PINS,
  EXIT_DRIFT,
  activePin,
  blendAt,
  clamp01,
  smoothstep,
  finalExit,
  localIn,
  select,
  setCardRect,
  setPinHint,
  store,
  subscribe,
} from "@/lib/story";
import { transferredUnits } from "@/lib/scene";
import { CHAPTER_COPY, CTA, EVIDENCE_CHECKS, EXAMPLE_LABEL, HERO, SIGNAL_ARIA, STEPPER, STORY_UI, type Headline } from "@/lib/copy";
import { EXAMPLE, units } from "@/lib/example";
import { accentVars, toneVars } from "@/lib/tone";
import { TONE } from "./chapters";
import { SystemChips } from "./SystemChips";
import { DecisionControls } from "./DecisionControls";
import { ScaleCard } from "./ScaleApps";
import { IndustryCard, IndustryTitle } from "./IndustryDetail";
import { FinalCard } from "./FinalCard";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";

/**
 * The story's one info card, bottom-left on the shared edge, from the hero to the final chapter.
 * The frame never fades between chapters: each chapter's content sits in the same grid cell (all of
 * it server-rendered). A hand-off scrolls the content inside the card with the page: the old chapter
 * slides up out of the card as the next one follows from below, one stack tied to the scroll, while
 * the frame eases from one height to the other. Nothing waits on a timer, so nothing blinks.
 * Inactive panes are hidden and inert. The card reports its rect so the 3D framing stays clear of it.
 */
export function StoryCard() {
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = card.current;
    const inner = body.current;
    const outer = wrap.current;
    const overlay = outer?.parentElement;
    if (!frame || !inner || !outer || !overlay) return;
    const panes = Array.from(inner.querySelectorAll<HTMLElement>(":scope > [data-ch]"));
    const stock = inner.querySelector<HTMLElement>("[data-stock]");
    const heights = panes.map((p) => p.offsetHeight);
    // The body clips the incoming pane while the card eases; its padding keeps focus rings unclipped.
    const pad = parseFloat(getComputedStyle(inner).paddingTop) + parseFloat(getComputedStyle(inner).paddingBottom);
    let chrome = frame.offsetHeight - inner.offsetHeight;
    let lastStock = "";
    let lastRect = "";
    let left = false;
    // Wide screens: the hero carries its own line and CTA in its corners, so the card waits for 02; the
    // ending carries them on its own bar.
    const wideMq = window.matchMedia("(min-width: 1024px)");
    let away = false;

    // Write a style only when its value moves: most frames change nothing.
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement, prop: string, value: string) => {
      let w = written.get(el);
      if (!w) written.set(el, (w = {}));
      if (w[prop] === value) return false;
      w[prop] = value;
      el.style.setProperty(prop, value);
      return true;
    };

    // An open Details list grows the card upward over the world for a moment. The 3D framing keeps to
    // the closed card, so opening one never dollies the camera in and out.
    const openExtra = (p: Element | null | undefined) => {
      const d = p?.querySelector<HTMLElement>(".story-details:not([hidden])");
      return d ? d.offsetHeight + (parseFloat(getComputedStyle(d).marginTop) || 0) : 0;
    };
    const report = () => {
      const gone = finalExit(store.g) > 0.98 || away;
      const r = frame.getBoundingClientRect();
      const extra = gone ? 0 : openExtra(inner.querySelector(":scope > [data-on]"));
      const key = gone ? "" : `${Math.round(r.left)},${Math.round(r.top + extra)},${Math.round(r.width)},${Math.round(r.height - extra)}`;
      if (key === lastRect) return;
      lastRect = key;
      setCardRect(gone ? null : { x: r.left, y: r.top + extra, w: r.width, h: r.height - extra });
    };

    // Each chapter's closed card height, for the 3D framing and the phone layouts that stack a deck above the card.
    const writeHeights = () => panes.forEach((p, k) => put(overlay, `--story-card-h-${k}`, `${heights[k] - openExtra(p) + pad + chrome}px`));

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /** Space between two chapters' content while they scroll through the card together. */
    const GAP = 32;
    // Wide screens show no card in the hero or the ending (their copy stands in the corners and on the bar).
    const awayAt = (k: number) => wideMq.matches && (k === CH.fragments || k === CH.final);
    // The chapter whose content the card holds: the swap point is the middle of each hand-off.
    const onAt = (g: number) => {
      const { i, j, e } = blendAt(g);
      if (awayAt(i) !== awayAt(j)) return awayAt(i) ? j : i;
      return e < 0.5 ? i : j;
    };
    /** The hand-off under way inside the card, or null while a chapter holds (or the card comes and goes). */
    const rollAt = (g: number) => {
      const { i, j, e } = blendAt(g);
      return !still && j !== i && e > 0.0005 && e < 0.9995 && !awayAt(i) && !awayAt(j) ? { i, j, e } : null;
    };
    // The frame's ResizeObserver reports the new rect after layout, so this write forces no reflow.
    const layout = (g: number) => {
      const r = rollAt(g);
      const h = r ? heights[r.i] + (heights[r.j] - heights[r.i]) * r.e : heights[onAt(g)];
      put(inner, "height", `${(h + pad).toFixed(1)}px`);
    };

    const off = subscribe((g) => {
      const on = onAt(g);
      const r = rollAt(g);
      frame.toggleAttribute("data-rolling", !!r);
      // Held: one chapter in place. Rolling: the old chapter and the next one as one stack, the next
      // a gap below the old, both moving up with the scroll inside the card's clip.
      panes.forEach((p, k) => {
        const shown = r ? k === r.i || k === r.j : k === on;
        const y = !r ? 0 : (k === r.i ? -r.e : 1 - r.e) * (heights[r.i] + GAP);
        put(p, "opacity", shown ? "1" : "0");
        put(p, "transform", shown && y ? `translate3d(0, ${y.toFixed(1)}px, 0)` : "none");
        put(p, "visibility", shown ? "visible" : "hidden");
        p.toggleAttribute("data-on", k === on);
        if (p.inert !== (k !== on)) p.inert = k !== on;
      });
      layout(g);

      // The ending turns the card to the night of the closing bands. Not where the card is away in the
      // ending (wide screens): there nobody sees it, and its colour transition restyled the card's ~800
      // elements on every frame for 0.6s as the story closed.
      const night = on === CH.final && !awayAt(on);
      if (frame.hasAttribute("data-night") !== night) frame.toggleAttribute("data-night", night);

      // Wide screens: the card rises in after the hero and leaves before the ending with the scroll.
      const { i, j, e } = blendAt(g);
      const presence = awayAt(i) === awayAt(j) ? (awayAt(i) ? 0 : 1) : awayAt(i) ? smoothstep(0.3, 0.8, e) : 1 - smoothstep(0.2, 0.7, e);
      const shownCard = still ? (presence > 0.5 ? 1 : 0) : presence;
      if (wideMq.matches) {
        put(frame, "opacity", shownCard.toFixed(3));
        put(frame, "transform", shownCard < 1 ? `translate3d(0, ${((1 - shownCard) * 28).toFixed(1)}px, 0)` : "none");
        put(frame, "visibility", shownCard < 0.002 ? "hidden" : "visible");
      } else if (written.get(frame)?.opacity !== undefined) {
        put(frame, "opacity", "1");
        put(frame, "transform", "none");
        put(frame, "visibility", "visible");
      }
      const isAway = shownCard < 0.5;
      if (isAway !== away) {
        away = isAway;
        outer.toggleAttribute("data-away", away);
        frame.inert = away;
        report();
      }

      // The final card stays while the world leaves; the page below slides over it (the wrapper keeps
      // the intro fade). Once the world has gone, the 3D framing stops keeping clear of it (and back).
      const exit = finalExit(g);
      // Phones keep the card in the ending: it drifts up with the world as the page arrives.
      put(outer, "translate", exit > 0 ? `0 ${(-exit * EXIT_DRIFT * window.innerHeight).toFixed(1)}px` : "none");
      if (exit > 0.98 !== left) {
        left = !left;
        report();
      }

      // Plant 02's stock counts down as each pallet goes onto the truck.
      if (stock) {
        const t = g >= CH.decision + 1 ? 1 : localIn(CH.decision, g);
        const v = units(EXAMPLE.plant02.stock - transferredUnits(t));
        if (v !== lastStock) {
          stock.textContent = v;
          lastStock = v;
        }
      }
    });

    // Hidden only once the page below has covered the story completely.
    const track = document.getElementById("story");
    const io = new IntersectionObserver(([en]) => {
      put(frame, "visibility", !en.isIntersecting && en.boundingClientRect.top < 0 ? "hidden" : "visible");
    });
    if (track) io.observe(track);

    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const en of entries) {
        const k = panes.indexOf(en.target as HTMLElement);
        if (k < 0) continue;
        const h = (en.target as HTMLElement).offsetHeight;
        if (h !== heights[k]) {
          heights[k] = h;
          changed = true;
        }
      }
      if (changed) {
        chrome = frame.offsetHeight - inner.offsetHeight;
        writeHeights();
        layout(store.g);
      }
      report();
    });
    panes.forEach((p) => ro.observe(p));
    ro.observe(frame);
    writeHeights();
    layout(store.g);
    // The first height lands without easing; later changes inside a chapter ease.
    requestAnimationFrame(() => frame.setAttribute("data-ready", ""));
    const onResize = () => report();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      off();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      setCardRect(null);
    };
  }, []);

  return (
    <div ref={wrap} className="story-card-wrap intro-fade">
      <section ref={card} className="card card--story story-card" data-lens aria-label={STORY_UI.cardAria}>
        {/* Phones: the card's glass rim and shadow, painted once in two halves that slide with its edges
            (liquid-glass.css), so a hand-off that changes the card's height re-rasters none of them. */}
        <span className="story-card-glass" aria-hidden>
          <i />
        </span>
        <span className="story-card-glass" data-end aria-hidden>
          <i />
        </span>
        <div ref={body} className="story-card-body">
          {/* 01 Systems: one line, the six systems, the call to action (narrow screens). The headline sits behind the 3D. */}
          <Pane ch={CH.fragments}>
            <ChapterBody ch={CH.fragments} />
          </Pane>
          {/* 02 Signal: pointing at the card lifts the crate */}
          <Pane ch={CH.signal} hint="signal">
            <ChapterBody ch={CH.signal} />
          </Pane>
          {/* 03 Problem */}
          <Pane ch={CH.problem}>
            <ChapterBody ch={CH.problem} />
          </Pane>
          {/* 04 Context: each check opens the island it came from */}
          <Pane ch={CH.context}>
            <ChapterBody ch={CH.context} />
          </Pane>
          {/* 05 Decision: the transfer order, step by step with the forklift and the truck */}
          <Pane ch={CH.decision}>
            <ChapterBody ch={CH.decision} />
          </Pane>
          {/* 06 Control: the approval panel, linked to the 3D decision card */}
          <Pane ch={CH.control}>
            <ChapterBody ch={CH.control} />
          </Pane>
          {/* 07 Scale: the five functions, linked both ways to the 3D cards */}
          <Pane ch={CH.scale}>
            <ChapterBody ch={CH.scale} />
          </Pane>
          {/* 08 Industries: the name rolls with the board's half-turn */}
          <Pane ch={CH.industries}>
            <ChapterBody ch={CH.industries} />
          </Pane>
          {/* 09 Decide: the example's results, the six systems behind it, the call to action */}
          <Pane ch={CH.final}>
            <ChapterBody ch={CH.final} />
          </Pane>
        </div>
      </section>
    </div>
  );
}

/** One chapter's content, as the card shows it. */
export function ChapterBody({ ch }: { ch: number }) {
  switch (ch) {
    case CH.fragments:
      return (
        <>
      <Label ch={CH.fragments} />
      <Rest>
        <p className="t-body story-body">{HERO.card}</p>
        <SystemChips className="story-chips" />
        <div className="story-actions">
          {/* Phones and tablets only: wide screens hide the card in the hero (Story.tsx .hero-actions). */}
          <SectionLink href={CTA.href} className="btn btn-primary story-hero-cta">
            {CTA.primary}
            <Arrow />
          </SectionLink>
          <span className="story-cue t-label" aria-hidden>
            <ScrollCue />
            {HERO.scrollCue}
          </span>
        </div>
      </Rest>
        </>
      );
    case CH.signal:
      return (
        <>
      <Head ch={CH.signal} />
      <Rest>
        <Body ch={CH.signal} />
        <Readout ch={CH.signal} details={<SignalDetails />} />
      </Rest>
        </>
      );
    case CH.problem:
      return (
        <>
      <Head ch={CH.problem} />
      <Rest>
        <Body ch={CH.problem} />
        <Readout ch={CH.problem} details={<DetailRows ch={CH.problem} />} />
      </Rest>
        </>
      );
    case CH.context:
      return (
        <>
      <Head ch={CH.context} />
      <Rest>
        <Body ch={CH.context} />
        <EvidenceChecks />
      </Rest>
        </>
      );
    case CH.decision:
      return (
        <>
      <Head ch={CH.decision} />
      <Rest>
        <Body ch={CH.decision} />
        <Stepper />
        <Readout ch={CH.decision} details={<DecisionDetails />} />
      </Rest>
        </>
      );
    case CH.control:
      return (
        <>
      <Head ch={CH.control} />
      <Rest>
        <Body ch={CH.control} optional />
        <DecisionControls />
      </Rest>
        </>
      );
    case CH.scale:
      return (
        <>
      <Head ch={CH.scale} example={false} />
      <Rest>
        <Body ch={CH.scale} optional />
        <ScaleCard />
      </Rest>
        </>
      );
    case CH.industries:
      return (
        <>
      <Label ch={CH.industries} />
      <IndustryTitle />
      <Rest>
        <Body ch={CH.industries} optional />
        <IndustryCard />
      </Rest>
        </>
      );
    case CH.final:
      return (
        <>
      <Label ch={CH.final} example={false} />
      <Rest>
        <FinalCard />
      </Rest>
        </>
      );
    default:
      return null;
  }
}

/** One chapter's content. `hint="signal"` makes pointing at it lift the signal crate. */
function Pane({ ch, hint, children }: { ch: number; hint?: "signal"; children: ReactNode }) {
  const on = (v: boolean) => (hint === "signal" ? () => (store.signalHint = v) : undefined);
  return (
    <div data-ch={ch} className="story-pane" onPointerEnter={on(true)} onPointerLeave={on(false)} onFocus={on(true)} onBlur={on(false)}>
      {children}
      {/* The whole card is an obstacle for the 3D labels, not only its text (ScreenTag). */}
      <i data-obstacle className="story-card-hit" aria-hidden />
    </div>
  );
}

/** Everything under the title, so it can arrive a beat after the title. */
const Rest = ({ children }: { children: ReactNode }) => <div className="story-pane-rest">{children}</div>;

/**
 * The card's head, on every chapter: a strip of nine segments (one per chapter, each in its own
 * colour, filled up to this one), then the chapter's name and the honesty label for the running example.
 */
function Label({ ch, example = true }: { ch: number; example?: boolean }) {
  return (
    <div className="story-head" style={toneVars(TONE[ch])}>
      <ol className="story-progress" aria-hidden>
        {CHAPTERS.map((c, k) => (
          <li key={c.id} data-past={k < ch || undefined} data-on={k === ch || undefined} style={toneVars(TONE[k])} />
        ))}
      </ol>
      <p className="story-label t-label">
        <span className="story-label-name">{CHAPTERS[ch].label}</span>
        {example && <span className="story-label-note">{EXAMPLE_LABEL}</span>}
      </p>
    </div>
  );
}

/** Two-line chapter title: line two in the chapter's text-safe tone. */
function Title({ ch, lines }: { ch: number; lines: Headline | readonly [string, ReactNode] }) {
  return (
    <h2 className="t-title-card story-title" style={accentVars(TONE[ch])}>
      <span className="story-title-line">{lines[0]}</span> <span className="accent">{lines[1]}</span>
    </h2>
  );
}

function Head({ ch, example = true }: { ch: number; example?: boolean }) {
  const copy = CHAPTER_COPY[ch];
  return (
    <>
      <Label ch={ch} example={example} />
      {copy && <Title ch={ch} lines={copy.title} />}
    </>
  );
}

/** The chapter's body line. `optional` bodies step aside on short screens, where the card needs the room. */
function Body({ ch, optional }: { ch: number; optional?: boolean }) {
  const copy = CHAPTER_COPY[ch];
  return copy ? (
    <p className="t-body story-body" data-optional={optional || undefined}>
      {copy.body}
    </p>
  ) : null;
}

/**
 * One number and what it counts, with a Details disclosure for the figures behind it. Details open
 * on hover with a mouse and on click or tap; a click keeps them open until the next click.
 */
function Readout({ ch, details }: { ch: number; details?: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const r = CHAPTER_COPY[ch]?.readout;
  const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  return (
    <div
      className="story-readout"
      onPointerLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <div className="story-readout-row">
        {r && (
          <p className="story-readout-figure">
            <strong className="t-num-md" data-risk={r.risk || undefined}>
              {r.value}
            </strong>
            <span className="t-small">{r.label}</span>
          </p>
        )}
        {details && (
          <button
            type="button"
            className="story-details-btn t-small"
            aria-expanded={open}
            aria-controls={id}
            onPointerEnter={() => {
              if (fine()) setOpen(true);
            }}
            onClick={() => {
              const next = !(open && pinned);
              setOpen(next);
              setPinned(next);
            }}
          >
            {STORY_UI.details}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      {details && (
        <div id={id} className="story-details" hidden={!open}>
          {details}
        </div>
      )}
    </div>
  );
}

/** Detail rows from the copy deck: label and figure, red where the figure is the risk. */
function DetailRows({ ch, skip = [] as string[] }: { ch: number; skip?: string[] }) {
  return (
    <dl className="story-rows">
      {(CHAPTER_COPY[ch]?.details ?? [])
        .filter((d) => !skip.includes(d.label))
        .map((d) => (
          <div key={d.label}>
            <dt>{d.label}</dt>
            <dd className="tabular" data-risk={d.risk || undefined}>
              {d.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** 02: the alert's figures and the same six days the ring draws around the crate. */
function SignalDetails() {
  return (
    <div className="signal-detail" role="group" aria-label={SIGNAL_ARIA}>
      <DetailRows ch={CH.signal} />
      <ol className="signal-days" aria-hidden>
        {Array.from({ length: EXAMPLE.plant01.breachDay }, (_, i) => i + 1).map((d) => (
          <li key={d} data-risk={d === EXAMPLE.plant01.breachDay ? "" : undefined} style={{ ["--i" as string]: d - 1 }}>
            <span />
            <small>D{d}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 05: what the transfer leaves at Plant 02 (live, as pallets load) and what it costs. */
function DecisionDetails() {
  const rows = CHAPTER_COPY[CH.decision]?.details ?? [];
  // "Arrives" is the readout itself; the rest move here (S7).
  const left = rows.find((d) => d.label === "Plant 02 left");
  const rest = rows.filter((d) => d !== left && d.label !== "Arrives");
  return (
    <dl className="story-rows">
      {left && (
        <div onPointerEnter={() => setPinHint("plant02")} onPointerLeave={() => setPinHint(null)}>
          <dt>{left.label}</dt>
          <dd className="tabular" data-stock="">
            {left.value}
          </dd>
        </div>
      )}
      {rest.map((d) => (
        <div key={d.label}>
          <dt>{d.label}</dt>
          <dd className="tabular">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 04: each check names the system it came from. Pointing lifts that island and opens its pin; clicking opens its evidence. */
function EvidenceChecks() {
  const root = useRef<HTMLUListElement>(null);
  // The row whose island pin is open: the timeline's beat, or the row being pointed at.
  const mark = useRef(() => {});
  useLayoutEffect(() => {
    const rows = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-island]") ?? []);
    let last = "";
    mark.current = () => {
      const pin = activePin();
      const v = pin?.startsWith("island:") ? pin.slice(7) : "";
      if (v === last) return;
      last = v;
      rows.forEach((r) => r.toggleAttribute("data-active", r.dataset.island === v));
    };
    return subscribe(() => mark.current());
  }, []);
  const point = (sys: number) => () => {
    store.islandHint = sys;
    setPinHint(`island:${sys}`);
    mark.current();
  };
  const leave = () => {
    store.islandHint = -1;
    setPinHint(null);
    mark.current();
  };
  return (
    <ul ref={root} className="evidence-checks" aria-label={EVIDENCE_CHECKS.aria}>
      {EVIDENCE_CHECKS.rows.map((r) => (
        <li key={r.label}>
          <button
            type="button"
            data-island={r.island}
            aria-label={EVIDENCE_CHECKS.rowAria(r.label, r.value, r.system)}
            onPointerEnter={point(r.island)}
            onPointerLeave={leave}
            onFocus={point(r.island)}
            onBlur={leave}
            onClick={() => select(store.selected === r.island ? -1 : r.island)}
            style={toneVars(r.tone)}
          >
            <span className="evidence-check-dot" aria-hidden />
            <span>{r.label}</span>
            <strong className="tabular">{r.value}</strong>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Keep the card's evidence order and the timeline's pins in step.
if (process.env.NODE_ENV !== "production" && EVIDENCE_CHECKS.rows.some((r, i) => r.island !== CONTEXT_PINS[i])) {
  console.warn("StoryCard: EVIDENCE_CHECKS order differs from CONTEXT_PINS");
}

/** 05: the transfer order's progress, driven by the same beats as the forklift and the truck. */
// Received once Plant 01 has the pallets off the trailer, not when the truck pulls up.
const STEP_AT = [0, BEATS.load[0], BEATS.load[1], BEATS.drive[0], BEATS.unload[1] - 0.02];

function Stepper() {
  const root = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    const fills = Array.from(el.querySelectorAll<HTMLElement>("[data-fill]"));
    const label = el.parentElement?.querySelector<HTMLElement>("[data-step-now]");
    let lastAt = -1;
    return subscribe((g) => {
      const t = g >= CH.decision + 1 ? 1 : g < CH.decision ? 0 : localIn(CH.decision, g);
      let at = 0;
      STEP_AT.forEach((s, i) => {
        if (t >= s) at = i;
      });
      // Each connector fills as the work between two steps happens.
      fills.forEach((f, i) => {
        f.style.transform = `scaleX(${clamp01((t - STEP_AT[i]) / (STEP_AT[i + 1] - STEP_AT[i]))})`;
      });
      if (at !== lastAt) {
        lastAt = at;
        items.forEach((it, i) => (it.dataset.state = i < at ? "done" : i === at ? "now" : "next"));
        if (label) label.textContent = `${EXAMPLE.transfer.id}: ${STEPPER[at]}`;
      }
    });
  }, []);
  return (
    <div className="stepper-wrap">
      <ol ref={root} className="stepper" aria-label={`Transfer ${EXAMPLE.transfer.id}`}>
        {STEPPER.map((name, i) => (
          <li key={name} data-step data-state="next" className="stepper-step">
            <span className="stepper-dot" aria-hidden />
            <span className="stepper-label">{name}</span>
            {i < STEPPER.length - 1 && (
              <span className="stepper-line" aria-hidden>
                <span data-fill className="stepper-fill" />
              </span>
            )}
          </li>
        ))}
      </ol>
      {/* The current step for screen readers, only while this chapter is the active one (inert otherwise). */}
      <p className="sr-only" aria-live="polite" data-step-now />
    </div>
  );
}

/** A small mouse with a wheel that keeps rolling down. */
function ScrollCue() {
  return (
    <span className="story-cue-mouse" aria-hidden>
      <span className="story-cue-wheel" />
    </span>
  );
}
