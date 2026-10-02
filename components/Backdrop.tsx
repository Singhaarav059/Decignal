"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/story";
import { bgAt } from "@/lib/scene";

/** One flat tint per chapter behind the stage, easing from one to the next as the story moves. */
export function Backdrop() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let last = "";
    return subscribe((g) => {
      const rgb = `rgb(${bgAt(g).join(" ")})`;
      if (rgb !== last && root.current) {
        last = rgb;
        root.current.style.backgroundColor = rgb;
      }
    });
  }, []);
  return <div ref={root} className="pointer-events-none fixed inset-0 -z-10" aria-hidden />;
}
