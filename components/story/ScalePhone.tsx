"use client";

import { usePhone } from "@/lib/device";
import { FUNCTIONS } from "@/lib/story";
import { STORY_UI } from "@/lib/copy";
import { FUNCTION_FACES, PhoneDeck, useDeck } from "./PhoneDeck";
import { goToFunction } from "./ScaleApps";

/**
 * Phones only, in the band above the story card: the function cards as a deck at reading size, in
 * place of the 3D line. It shows the function the story card has selected, which follows the scroll;
 * tapping the deck scrolls on to the next function.
 */
export function ScalePhone() {
  // Built only on a phone: elsewhere the cards are read in 3D, and the deck would draw for nothing.
  return usePhone() ? <ScalePhoneDeck /> : null;
}

function ScalePhoneDeck() {
  const { at } = useDeck("scale");
  return (
    <div className="scale-phone">
      <PhoneDeck faces={FUNCTION_FACES} at={at} onPick={(i) => goToFunction(i % FUNCTIONS.length)} label={STORY_UI.phoneAria} />
    </div>
  );
}
