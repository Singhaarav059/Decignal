"use client";

import { useEffect, useRef } from "react";
import { FUNCTIONS, store } from "@/lib/story";
import { APPLICATIONS, CATEGORY_TONE, type Category } from "@/lib/content";
import { tone } from "../ui/systems";

/** Under each function's card: the applications Decignal offers there. Pointing at one reads its card. */
export function ScaleApps() {
  const root = useRef<HTMLDivElement>(null);
  // A card under the pointer lights its column, so the two read as one thing.
  useEffect(() => {
    let raf = 0;
    let last = -2;
    const cols = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-fn]") ?? []);
    const tick = () => {
      if (store.focus !== last) {
        last = store.focus;
        cols.forEach((c, k) => c.toggleAttribute("data-active", k === last));
        root.current?.toggleAttribute("data-any", last >= 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="scale-apps mx-auto grid max-w-[1280px] grid-cols-1 gap-y-2 md:grid-cols-5 md:gap-6">
      {FUNCTIONS.map((f, k) => {
        const apps = APPLICATIONS.filter((a) => a.category === (f.name as Category));
        return (
          <div
            key={f.name}
            data-fn
            tabIndex={0}
            onPointerEnter={() => (store.focusHint = k)}
            onPointerLeave={() => (store.focusHint = -1)}
            onFocus={() => (store.focusHint = k)}
            onBlur={() => (store.focusHint = -1)}
            className="scale-col"
            style={{ "--tone": tone(CATEGORY_TONE[f.name as Category]) } as React.CSSProperties}
          >
            <p className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold">
              <span className="size-[7px] rounded-full" style={{ background: "var(--tone)" }} aria-hidden />
              {f.name}
              <span className="truncate font-normal text-ink-soft md:hidden">· {apps.map((a) => a.name).join(", ")}</span>
            </p>
            <ul className="mt-2 space-y-1.5 max-md:hidden">
              {apps.map((a) => (
                <li key={a.name} className="text-[12.5px] leading-snug">
                  <span className="text-ink-2">{a.name}</span>
                  <span className="tabular block text-[11px] text-ink-soft">
                    {a.weeks} weeks · {a.connects.slice(0, 3).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
