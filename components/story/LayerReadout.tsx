"use client";

import { usePhone } from "@/lib/device";
import { useEffect } from "react";
import { CH, LAYERS, store, subscribe, weight } from "@/lib/story";
import { STORY_UI } from "@/lib/copy";
import { LAYER_FACES, PhoneDeck, useDeckCycle } from "./PhoneDeck";
import { StoryPills } from "./StoryPills";

/**
 * Phones only, in the band above the story card. The layer cards behind the decision, as a deck at
 * reading size: it steps through them on its own, a pill holds one, and a finger on the deck pauses it.
 */
export function LayerReadout({ live = false }: { live?: boolean }) {
  // Built only on a phone: elsewhere the cards are read in 3D, and the deck would draw for nothing.
  return usePhone() ? <LayerReadoutDeck live={live} /> : null;
}

function LayerReadoutDeck({ live }: { live: boolean }) {
  const { at, held, pick, hold } = useDeckCycle("layers", LAYERS.length, CH.control);
  useEffect(() => {
    if (!live) return;
    let owned = false;
    const off = subscribe((g) => {
      if (weight(CH.control, g) > 0.9) {
        owned = true;
        store.focusHint = at;
      } else if (owned) {
        owned = false;
        store.focusHint = -1;
      }
    });
    return () => {
      off();
      if (owned) store.focusHint = -1;
    };
  }, [at, live]);
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
      {!live && <PhoneDeck faces={LAYER_FACES} at={at} onPick={pick} onTouch={hold} label={STORY_UI.layers} />}
    </div>
  );
}
