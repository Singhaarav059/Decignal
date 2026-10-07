"use client";

import { usePhone } from "@/lib/device";
import { CH, FUNCTIONS } from "@/lib/story";
import { APPLICATIONS, CATEGORY_TONE, type Category } from "@/lib/content";
import { tone } from "../ui/systems";
import { DECK_STEP_MS, FUNCTION_FACES, PhoneDeck, useDeckCycle } from "./PhoneDeck";

/**
 * Phones only. One function at a time: pick it from the row, read its card at full width,
 * and see the applications Decignal offers there underneath.
 */
export function ScalePhone() {
  // Built only on a phone: elsewhere the cards are read in 3D, and the decks would draw for nothing.
  return usePhone() ? <ScalePhoneDeck /> : null;
}

function ScalePhoneDeck() {
  const { at, held, pick } = useDeckCycle(FUNCTIONS.length, CH.scale);
  const fn = FUNCTIONS[at];
  const apps = APPLICATIONS.filter((a) => a.category === (fn.name as Category));
  return (
    <div className="scale-phone md:hidden" data-held={held || undefined} style={{ ["--step" as string]: `${DECK_STEP_MS}ms` }}>
      <ul className="scale-phone-tabs" aria-label="Business functions">
        {FUNCTIONS.map((f, i) => (
          <li key={f.name}>
            <button
              type="button"
              aria-pressed={i === at}
              onClick={() => pick(i)}
              style={{ ["--tone" as string]: tone(CATEGORY_TONE[f.name as Category]) }}
            >
              <i aria-hidden />
              {f.name}
            </button>
          </li>
        ))}
      </ul>
      <PhoneDeck faces={FUNCTION_FACES} at={at} onPick={pick} label="Decisions by business function" />
      <p className="scale-phone-apps" aria-live="polite" style={{ ["--tone" as string]: tone(CATEGORY_TONE[fn.name as Category]) }}>
        <span className="tabular">{apps.length} {apps.length === 1 ? "application" : "applications"}</span>
        {apps.map((a) => a.name).join(" · ")}
      </p>
    </div>
  );
}
