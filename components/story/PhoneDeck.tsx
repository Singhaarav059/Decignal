"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribe, weight } from "@/lib/story";
import { FACE_H, FACE_W, drawFace, readFonts, type FaceSpec } from "../three/faces";

// One card every 2.8s: long enough to read its headline, short enough that the deck feels alive.
const DECK_STEP_MS = 2800;
// A finger on the deck pauses the cycle; it resumes this long after the last touch.
const TOUCH_HOLD_MS = 6000;

/* A deck's state is shared by the deck in the stage and the pills in the story card. */
type DeckState = { at: number; held: boolean };
const decks = new Map<string, { s: DeckState; fns: Set<() => void> }>();
const deckOf = (key: string) => {
  let d = decks.get(key);
  if (!d) decks.set(key, (d = { s: { at: 0, held: false }, fns: new Set() }));
  return d;
};
const setDeck = (key: string, patch: Partial<DeckState>) => {
  const d = deckOf(key);
  const next = { ...d.s, ...patch };
  if (next.at === d.s.at && next.held === d.s.held) return;
  d.s = next;
  d.fns.forEach((f) => f());
};
const SERVER: DeckState = { at: 0, held: false };

/** Moves a deck to card `at` from outside it (the story card drives the Scale deck from the scroll). */
export const setDeckAt = (key: string, at: number) => setDeck(key, { at });

/** The deck's current card and whether the reader holds it, plus a picker (a pick holds the card). */
export function useDeck(key: string) {
  const s = useSyncExternalStore(
    (fn) => {
      const d = deckOf(key);
      d.fns.add(fn);
      return () => d.fns.delete(fn);
    },
    () => deckOf(key).s,
    () => SERVER,
  );
  return { at: s.at, held: s.held, pick: (i: number) => setDeck(key, { at: i, held: true }) };
}

/**
 * Steps the deck through n cards while chapter `ch` is on screen, until the reader picks one.
 * A touch on the deck pauses the cycle for a few seconds. Mounted once per deck (the stage deck).
 */
export function useDeckCycle(key: string, n: number, ch: number) {
  const { at, held, pick } = useDeck(key);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const resume = useRef(0);
  useEffect(() => {
    let on = false;
    return subscribe((g) => {
      const now = weight(ch, g) > 0.9;
      if (now === on) return;
      on = now;
      setLive(now);
      if (!now) setDeck(key, { held: false });
    });
  }, [ch, key]);
  useEffect(() => {
    if (!live || held || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setDeck(key, { at: (deckOf(key).s.at + 1) % n }), DECK_STEP_MS);
    return () => window.clearInterval(id);
  }, [live, held, paused, n, key]);
  useEffect(() => () => window.clearTimeout(resume.current), []);
  const hold = () => {
    setPaused(true);
    window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => setPaused(false), TOUCH_HOLD_MS);
  };
  return { at, held, paused, pick, hold };
}

/** One card face, drawn by the same code that paints the 3D cards, at the screen's full density. */
function Face({ spec }: { spec: FaceSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      // Drawn at the exact device pixels the card fills (it is never wider than the screen), so the
      // browser shows it 1:1 instead of resampling a larger bitmap.
      const scale = Math.min(1, (Math.min(window.innerWidth, 480) * window.devicePixelRatio) / FACE_W);
      canvas.width = Math.round(FACE_W * scale);
      canvas.height = Math.round(FACE_H * scale);
      readFonts();
      drawFace(canvas, spec, false, scale);
    });
    return () => {
      live = false;
    };
  }, [spec]);
  return <canvas ref={ref} width={FACE_W} height={FACE_H} className="phone-deck-face" aria-hidden />;
}

/**
 * Phones only: the chapter's cards as a deck at reading size. The current card sits in front,
 * the next ones peek out above it in order; tapping the deck moves to the next card.
 */
export function PhoneDeck({
  faces,
  at,
  onPick,
  onTouch,
  label,
}: {
  faces: FaceSpec[];
  at: number;
  onPick: (i: number) => void;
  onTouch?: () => void;
  label: string;
}) {
  const n = faces.length;
  return (
    <div className="phone-deck" onPointerDown={onTouch} onTouchStart={onTouch}>
      <button type="button" className="phone-deck-stack" onClick={() => onPick((at + 1) % n)} aria-label={`${label}: card ${at + 1} of ${n}. Show the next card.`}>
        {faces.map((spec, i) => {
          // Rank 0 is the card in front; the rest wait behind it in reading order.
          const rank = (i - at + n) % n;
          return (
            <span key={i} className="phone-deck-card" data-rank={rank} style={{ ["--rank" as string]: rank, zIndex: n - rank }}>
              <Face spec={spec} />
            </span>
          );
        })}
      </button>
    </div>
  );
}

export const LAYER_FACES: FaceSpec[] = [0, 1, 2, 3].map((k) => ({ kind: "layer", k }) as FaceSpec).concat({ kind: "decision" });
export const FUNCTION_FACES: FaceSpec[] = [0, 1, 2, 3, 4].map((k) => ({ kind: "function", k }) as FaceSpec);
