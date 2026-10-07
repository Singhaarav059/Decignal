"use client";

import { useEffect, useState } from "react";
import { CH, LAYERS, store, subscribe, weight } from "@/lib/story";

// One layer every 2.6s: long enough to read the line, short enough that the stack feels alive.
const STEP_MS = 2600;
const TONES = ["signal", "violet", "saffron", "cobalt", "emerald"];

/**
 * Phones only. The layer cards are too small to read on a narrow screen and there is no hover,
 * so this readout walks through them: each step brings its card forward and prints its line
 * at reading size. Tapping a step holds it.
 */
export function LayerReadout() {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const [live, setLive] = useState(false);

  // Only while the chapter is on screen: elsewhere the hint would pull a card out of another layout.
  useEffect(() => {
    let on = false;
    const off = subscribe((g) => {
      const now = weight(CH.control, g) > 0.9;
      if (now === on) return;
      on = now;
      setLive(now);
      if (!now) setHeld(false);
    });
    return () => {
      off();
      store.focusHint = -1;
    };
  }, []);

  useEffect(() => {
    if (!live || !window.matchMedia("(max-width: 767px)").matches) return;
    store.focusHint = at;
    return () => {
      store.focusHint = -1;
    };
  }, [at, live]);

  useEffect(() => {
    if (!live || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setAt((a) => (a + 1) % LAYERS.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [live, held]);

  const layer = LAYERS[at];
  return (
    <div className="layer-readout md:hidden" data-held={held || undefined} style={{ ["--tone" as string]: `var(--color-${TONES[at]})`, ["--step" as string]: `${STEP_MS}ms` }}>
      <ol className="layer-readout-steps" aria-label="Layers behind the decision">
        {LAYERS.map((l, i) => (
          <li key={l.name}>
            <button
              type="button"
              aria-current={i === at ? "step" : undefined}
              onClick={() => {
                setAt(i);
                setHeld(true);
              }}
              style={{ ["--tone" as string]: `var(--color-${TONES[i]})` }}
            >
              <span className="tabular">0{i + 1}</span>
              {l.name}
              {/* Restarts with each step: a thin bar that fills while the layer is shown. */}
              <i key={`${at}-${held}`} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p className="layer-readout-line" key={at} aria-live="polite">
        {layer.text}
      </p>
    </div>
  );
}
