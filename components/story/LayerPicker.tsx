"use client";

import { useEffect, useRef, useState } from "react";
import { usePhone } from "@/lib/device";
import { CH, LAYERS, store, subscribe, weight } from "@/lib/story";
import { STORY_UI } from "@/lib/copy";
import { StoryPills } from "./StoryPills";

/** One card every 3.2s: long enough to read its headline as it comes forward. */
const STEP_MS = 3200;
/** After the reader points at a card (in 3D or on a tab), the play waits this long before moving on. */
const REST_MS = 4000;

/**
 * Desktop, in Control's card: the five cards of the fan as tabs. While the chapter is on screen the
 * cards come forward one after another on their own (store.deckAt, read by CardFocus), so the fan never
 * sits still waiting for a hover. Pointing at a tab brings its card forward at once; a click holds it.
 * Pointing at a card in 3D pauses the play, and the tab of the card in front is always the one lit.
 * Phones read the same cards as a flat deck (LayerReadout).
 */
export function LayerPicker() {
  return usePhone() ? null : <Picker />;
}

function Picker() {
  const [live, setLive] = useState(false);
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const [shown, setShown] = useState(0);
  const hovering = useRef(false);

  // Live only while Control holds the screen.
  useEffect(() => {
    let on = false;
    return subscribe((g) => {
      const now = weight(CH.control, g) > 0.9;
      if (now === on) return;
      on = now;
      setLive(now);
      if (!now) setHeld(false);
    });
  }, []);

  // The play: the card it brings forward is CardFocus's fallback when nobody points at one.
  useEffect(() => {
    store.deckAt = live ? at : -1;
    return () => {
      store.deckAt = -1;
    };
  }, [live, at]);

  useEffect(() => {
    if (!live || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (hovering.current || store.focusHint >= 0 || performance.now() - store.hoverAt < REST_MS) return;
      setAt((a) => (a + 1) % LAYERS.length);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [live, held]);

  // The lit tab follows the card actually in front (a hover in 3D, the decision panel, or the play).
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      const f = store.focus;
      if (f >= 0 && f < LAYERS.length) setShown(f);
    }, 120);
    return () => window.clearInterval(id);
  }, [live]);

  const point = (i: number) => {
    hovering.current = i >= 0;
    store.focusHint = i;
    if (i >= 0) {
      setShown(i);
      setAt(i);
    }
  };

  return (
    <div className="layer-picker">
      <StoryPills
        label={STORY_UI.layers}
        className="story-seg--fit"
        // No tone dots: five tabs fit one row in the card; the card in front shows its colour on its rim.
        items={LAYERS.map((l) => ({ label: l.name }))}
        value={shown}
        onHover={point}
        onChange={(i) => {
          setAt(i);
          setShown(i);
          setHeld(true);
        }}
      />
      <p className="t-small layer-picker-text" aria-live={held ? "polite" : "off"}>
        {LAYERS[shown].text}
      </p>
    </div>
  );
}
