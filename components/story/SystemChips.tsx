"use client";

import { useEffect, useState } from "react";
import { onSelect, select, store, subscribe, weight } from "@/lib/story";
import { toneVars } from "@/lib/tone";
import { SYSTEMS } from "../ui/systems";

/**
 * The six systems as a legend that drives the scene: pointing at a chip lifts its island, clicking
 * opens it. Where islands are not opened (`pin` = that chapter), a click keeps the island lifted
 * instead, until the next click or until the chapter leaves.
 */
export function SystemChips({ className = "", label = "Source systems", pin }: { className?: string; label?: string; pin?: number }) {
  const [open, setOpen] = useState(-1);
  const [pinned, setPinned] = useState(-1);
  useEffect(() => onSelect(setOpen), []);
  useEffect(() => {
    if (pin === undefined || pinned < 0) return;
    return subscribe((g) => {
      if (weight(pin, g) > 0.5) return;
      setPinned(-1);
      if (store.islandHint === pinned) store.islandHint = -1;
    });
  }, [pin, pinned]);
  const lifts = pin !== undefined;
  const point = (i: number) => () => (store.islandHint = i);
  const rest = () => (store.islandHint = lifts ? pinned : -1);
  const press = (i: number) => () => {
    if (!lifts) return select(open === i ? -1 : i);
    const n = pinned === i ? -1 : i;
    setPinned(n);
    store.islandHint = n;
  };
  return (
    <ul className={`sys-chips ${className}`} aria-label={label}>
      {SYSTEMS.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            aria-pressed={lifts ? pinned === i : open === i}
            title={`${s.full}: ${s.knows}, ${s.value}`}
            onPointerEnter={point(i)}
            onPointerLeave={rest}
            onFocus={point(i)}
            onBlur={rest}
            onClick={press(i)}
            className="sys-chip"
            data-lift={lifts || undefined}
            style={toneVars(s.tone)}
          >
            <span className="sys-chip-dot" aria-hidden />
            {s.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
