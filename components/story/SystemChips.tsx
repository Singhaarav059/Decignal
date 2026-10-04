"use client";

import { useEffect, useState } from "react";
import { onSelect, select, store } from "@/lib/story";
import { SYSTEMS, tone } from "../ui/systems";

/** The six systems as a legend that drives the scene: hover lifts an island, click opens it. */
export function SystemChips({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(-1);
  useEffect(() => onSelect(setOpen), []);
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Source systems">
      {SYSTEMS.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            aria-pressed={open === i}
            onPointerEnter={() => (store.islandHint = i)}
            onPointerLeave={() => (store.islandHint = -1)}
            onFocus={() => (store.islandHint = i)}
            onBlur={() => (store.islandHint = -1)}
            onClick={() => select(open === i ? -1 : i)}
            className="sys-chip"
          >
            <span className="size-[7px] rounded-full" style={{ background: tone(s.tone) }} aria-hidden />
            {s.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
