"use client";

import { useEffect, useRef } from "react";
import { bgAt } from "@/lib/scene";
import { store, subscribe } from "@/lib/story";

const rgb = (g: number) => `rgb(${bgAt(g).join(" ")})`;

/** The flat sky behind the stage: the chapter's pale solid, the same colour as the 3D fog, eased with the scroll. */
export function Backdrop() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let last = "";
    const paint = (g: number) => {
      const c = rgb(g);
      if (c !== last && el.current) el.current.style.backgroundColor = last = c;
    };
    paint(store.g);
    return subscribe(paint);
  }, []);
  return <div ref={el} className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundColor: rgb(0) }} aria-hidden />;
}
