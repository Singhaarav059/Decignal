"use client";

import { useEffect, useRef, useState } from "react";
import { usePhone } from "@/lib/device";
import { CH, LAYERS, controlLayer, controlSettle, localIn, store, subscribe, weight } from "@/lib/story";
import { goToStory } from "./chapters";
import { LAYER_TONE } from "../three/faces";
import { STORY_UI } from "@/lib/copy";
import { LAYER_FACES, PhoneDeck, useDeckCycle } from "./PhoneDeck";
import { StoryPills } from "./StoryPills";

/**
 * Phones only, in the band above the story card. The layer cards behind the decision, as a deck at
 * reading size: it steps through them on its own, a pill holds one, and a finger on the deck pauses it.
 */
export function LayerReadout() {
  // Built only on a phone: elsewhere the cards are read in 3D, and the deck would draw for nothing.
  return usePhone() ? <LayerReadoutDeck /> : null;
}

function LayerReadoutDeck() {
  const { at, held, pick, hold } = useDeckCycle("layers", LAYERS.length, CH.control);
  return (
    <div className="layer-readout">
      {/* Five layers share one row at 360px, so these pills carry no tone dot: the card below has the colour. */}
      <StoryPills
        label={STORY_UI.layers}
        className="story-seg--fit"
        items={LAYERS.map((l) => ({ label: l.name }))}
        value={at}
        onChange={pick}
      />
      {/* Read out only when the reader picks a layer, not on every step of the cycle. */}
      <p className="sr-only" aria-live={held ? "polite" : "off"}>
        {LAYERS[at].name}: {LAYERS[at].text}
      </p>
      <PhoneDeck faces={LAYER_FACES} at={at} onPick={pick} onTouch={hold} label={STORY_UI.layers} />
    </div>
  );
}

/**
 * Wide screens: the pills under the middle of Control's 3D row (they hold still as it slides). The
 * scroll steps the row through the layers and the selected pill follows it; pointing at a pill shows its
 * card in front until the pointer leaves, and a click scrolls to it. Pointing never touches the moving
 * cards (cards.tsx LayerRow).
 */
export function LayerPills() {
  return usePhone() ? null : <LayerPillsRow />;
}

function LayerPillsRow() {
  const ref = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [hover, setHover] = useState(-1);
  useEffect(() => subscribe((g) => setBeat(Math.round(controlLayer(localIn(CH.control, g))))), []);
  // Unmounted while pointed at (a resize to phone width), the card would stay held in front.
  useEffect(() => () => void (store.focusHint = -1), []);
  // Follows the row (the camera moves it on screen) only while Control is on screen.
  useEffect(() => {
    let raf = 0;
    let x = -1;
    let y = -1;
    const step = () => {
      const el = ref.current;
      const fx = Math.round(store.layerFoot.x);
      const fy = Math.round(store.layerFoot.y);
      if (el && (fx !== x || fy !== y)) {
        x = fx;
        y = fy;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translateX(-50%)`;
      }
      raf = requestAnimationFrame(step);
    };
    const off = subscribe((g) => {
      const on = weight(CH.control, g) > 0.01;
      if (on && !raf) raf = requestAnimationFrame(step);
      if (!on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className="layer-pills">
      <StoryPills
        label={STORY_UI.layers}
        items={LAYERS.map((l, k) => ({ label: l.name, tone: LAYER_TONE[k] }))}
        // The selected pill always names the card in front.
        value={hover >= 0 ? hover : beat}
        onChange={(i) => goToStory(CH.control, controlSettle(i))}
        onHover={(i) => {
          setHover(i);
          store.focusHint = i;
        }}
      />
    </div>
  );
}
