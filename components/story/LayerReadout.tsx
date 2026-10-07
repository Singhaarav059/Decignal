"use client";

import { usePhone } from "@/lib/device";
import { CH, LAYERS } from "@/lib/story";
import { DECK_STEP_MS, LAYER_FACES, PhoneDeck, useDeckCycle } from "./PhoneDeck";

const TONES = ["signal", "violet", "saffron", "cobalt", "emerald"];

/**
 * Phones only. The layer cards behind the decision, as a deck at reading size: the tabs step
 * through them on their own, and tapping a tab (or the deck) holds that layer.
 */
export function LayerReadout() {
  // Built only on a phone: elsewhere the cards are read in 3D, and the decks would draw for nothing.
  return usePhone() ? <LayerReadoutDeck /> : null;
}

function LayerReadoutDeck() {
  const { at, held, pick } = useDeckCycle(LAYERS.length, CH.control);
  return (
    <div className="layer-readout md:hidden" data-held={held || undefined} style={{ ["--step" as string]: `${DECK_STEP_MS}ms` }}>
      <ol className="layer-readout-steps" aria-label="Layers behind the decision">
        {LAYERS.map((l, i) => (
          <li key={l.name}>
            <button type="button" aria-current={i === at ? "step" : undefined} onClick={() => pick(i)} style={{ ["--tone" as string]: `var(--color-${TONES[i]})` }}>
              <span className="tabular">0{i + 1}</span>
              {l.name}
              {/* Restarts with each step: a thin bar that fills while the layer is shown. */}
              <i key={`${at}-${held}`} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">{LAYERS[at].name}: {LAYERS[at].text}</p>
      <PhoneDeck faces={LAYER_FACES} at={at} onPick={pick} label="Layers behind the decision" />
    </div>
  );
}
