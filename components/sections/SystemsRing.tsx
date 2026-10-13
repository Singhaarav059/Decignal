"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { CONNECTS } from "@/lib/content";
import { pageBox } from "@/lib/offsets";
import { toneVars } from "@/lib/tone";
import { SystemIcon } from "../ui/SystemIcon";
import erp from "@/assets/photos/sys-erp.jpg";
import crm from "@/assets/photos/sys-crm.jpg";
import mes from "@/assets/photos/sys-mes.jpg";
import wms from "@/assets/photos/sys-wms.jpg";
import sup from "@/assets/photos/sys-sup.jpg";
import ext from "@/assets/photos/sys-ext.jpg";

/** The place each system type keeps its facts (assets/photos/CREDITS.md), shown as a duotone in its colour. */
const PHOTO: Record<string, { src: StaticImageData; alt: string }> = {
  erp: { src: erp, alt: "A data-centre aisle of server racks" },
  crm: { src: crm, alt: "Three colleagues reviewing charts at a desk" },
  mes: { src: mes, alt: "An automated production line" },
  wms: { src: wms, alt: "A warehouse aisle of stocked racking" },
  sup: { src: sup, alt: "Trailers parked in a truck yard, seen from above" },
  ext: { src: ext, alt: "A container port and a ship at the quay, from the air" },
};

/**
 * The six systems as a ring of photographs that turns around the section's copy (the Plinth and
 * Koushik rings): the scroll turns it, and a slow drift keeps it alive while the reader rests. Tiles
 * stay upright; the ones at the front of the ellipse come forward, the ones at the back recede. Each
 * caption names the system and, on hover or focus, what Decignal reads from it in the running example.
 * Below 768px the ring lays out as a still grid under the copy.
 */
export function SystemsRing({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".orbit-tile"));
    const threads = Array.from(el.querySelectorAll<SVGPathElement>(".orbit-thread"));
    const wide = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    let rx = 0;
    let ry = 0;
    const t0 = performance.now();
    const measure = () => {
      // Wide and tall enough that a tile passing above or below the copy clears it.
      rx = el.clientWidth * (el.clientWidth > 1200 ? 0.36 : 0.39);
      ry = Math.min(el.clientHeight * 0.37, rx * 0.62);
    };
    const frame = (now: number) => {
      raf = 0;
      if (!wide.matches) {
        tiles.forEach((t) => {
          t.style.transform = "";
          t.style.zIndex = "";
        });
        return;
      }
      const box = pageBox(el);
      const p = (window.scrollY + window.innerHeight - box.top) / (window.innerHeight + box.height);
      const spin = reduced ? 0 : p * 150 + (now - t0) * 0.0035;
      tiles.forEach((t, i) => {
        const a = ((i * 60 + spin + 90) * Math.PI) / 180;
        const depth = (Math.sin(a) + 1) / 2;
        const s = 0.72 + 0.28 * depth;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        t.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        t.style.zIndex = String(Math.round(depth * 10));
        // Each system's thread runs from its photo into the middle, bowing like the hero's network.
        const th = threads[i];
        if (th) th.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} Q ${(x * 0.35).toFixed(1)} ${(y * 0.9).toFixed(1)} 0 0`);
      });
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    measure();
    kick();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    const ro = new ResizeObserver(() => {
      measure();
      kick();
    });
    ro.observe(el);
    wide.addEventListener("change", kick);
    window.addEventListener("scroll", kick, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wide.removeEventListener("change", kick);
      window.removeEventListener("scroll", kick);
    };
  }, []);

  return (
    <div ref={root} className="orbit">
      {/* The threads, drawn from the middle of the section (the copy panel's centre). */}
      <svg className="orbit-threads" aria-hidden>
        <g>
          {CONNECTS.map((c) => (
            <path key={c.id} className="orbit-thread" style={toneVars(c.tone)} pathLength={1} />
          ))}
        </g>
      </svg>
      <div className="orbit-copy" data-lens>
        {children}
      </div>
      <ul className="orbit-tiles" aria-label="Systems Decignal reads">
        {CONNECTS.map((c) => {
          const photo = PHOTO[c.id];
          return (
            <li key={c.id} className="orbit-tile" style={toneVars(c.tone)} tabIndex={0}>
              <figure className="orbit-photo">
                <Image src={photo.src} alt={photo.alt} sizes="(min-width: 768px) 240px, 45vw" className="orbit-photo-img" />
              </figure>
              <p className="orbit-cap">
                <span className="orbit-cap-icon" aria-hidden>
                  <SystemIcon id={c.id} size={14} />
                </span>
                <span className="orbit-cap-name">{c.name}</span>
              </p>
              <p className="orbit-read t-small">{c.read}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
