"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe, weight } from "@/lib/story";
import { FACE_H, FACE_W, drawFace, readFonts, type FaceSpec } from "../three/faces";

// One card every 2.8s: long enough to read its headline, short enough that the deck feels alive.
export const DECK_STEP_MS = 2800;

/**
 * Steps through n items while chapter `ch` is on screen, until the reader picks one.
 * Returns the current index, whether the reader is holding it, and a picker.
 */
export function useDeckCycle(n: number, ch: number) {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let on = false;
    return subscribe((g) => {
      const now = weight(ch, g) > 0.9;
      if (now === on) return;
      on = now;
      setLive(now);
      if (!now) setHeld(false);
    });
  }, [ch]);
  useEffect(() => {
    if (!live || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setAt((a) => (a + 1) % n), DECK_STEP_MS);
    return () => window.clearInterval(id);
  }, [live, held, n]);
  const pick = (i: number) => {
    setAt(i);
    setHeld(true);
  };
  return { at, held, pick };
}

/** One card face, drawn by the same code that paints the 3D cards, at the screen's full density. */
function Face({ spec }: { spec: FaceSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live || !ref.current) return;
      readFonts();
      drawFace(ref.current, spec);
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
export function PhoneDeck({ faces, at, onPick, label }: { faces: FaceSpec[]; at: number; onPick: (i: number) => void; label: string }) {
  const n = faces.length;
  return (
    <div className="phone-deck">
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
