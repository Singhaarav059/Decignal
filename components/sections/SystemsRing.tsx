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

/** Sync times shown beside each fact (lib/systems: the same freshness the island panels give). */
const SYNC: Record<string, string> = { erp: "2 min ago", crm: "5 min ago", mes: "1 min ago", wms: "1 min ago", sup: "1 hr ago", ext: "15 min ago" };

/**
 * A rounded rectangle traced at an even pace: the track the photographs travel round the panel.
 * u in [0, 1) from the bottom middle, clockwise on screen (left along the bottom first).
 */
function track(u: number, A: number, B: number, R: number, out: { x: number; y: number }) {
  const sx = 2 * (A - R);
  const sy = 2 * (B - R);
  const q = (Math.PI * R) / 2;
  const L = 2 * sx + 2 * sy + 4 * q;
  let d = (((u % 1) + 1) % 1) * L;
  // Bottom edge, from the middle leftwards.
  if (d < sx / 2) return ((out.x = -d), (out.y = B), out);
  d -= sx / 2;
  const arc = (cx: number, cy: number, a0: number) => {
    const a = a0 + (d / q) * (Math.PI / 2);
    out.x = cx + Math.cos(a) * R;
    out.y = cy + Math.sin(a) * R;
    return out;
  };
  if (d < q) return arc(-(A - R), B - R, Math.PI / 2);
  d -= q;
  if (d < sy) return ((out.x = -A), (out.y = B - R - d), out);
  d -= sy;
  if (d < q) return arc(-(A - R), -(B - R), Math.PI);
  d -= q;
  if (d < sx) return ((out.x = -(A - R) + d), (out.y = -B), out);
  d -= sx;
  if (d < q) return arc(A - R, -(B - R), -Math.PI / 2);
  d -= q;
  if (d < sy) return ((out.x = A), (out.y = -(B - R) + d), out);
  d -= sy;
  if (d < q) return arc(A - R, B - R, 0);
  d -= q;
  out.x = A - R - d;
  out.y = B;
  return out;
}

/**
 * The six systems as photographs travelling round the section's glass panel (the Plinth and Koushik
 * rings): the scroll moves them, and a slow drift keeps them going while the reader rests. Their track is
 * a rounded rectangle measured from the panel and the tiles, so a photograph never passes behind the
 * copy. The one passing the front (the bottom middle) is being read: its photo takes a ring in its
 * colour, its thread lights, and the panel shows what Decignal reads from it in the running example.
 * Below 768px the ring lays out as a still grid under the copy.
 */
export function SystemsRing({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".orbit-tile"));
    const threads = Array.from(el.querySelectorAll<SVGPathElement>(".orbit-thread"));
    const lives = Array.from(el.querySelectorAll<HTMLElement>(".orbit-live-item"));
    const panel = el.querySelector<HTMLElement>(".orbit-copy");
    const wide = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    let A = 0;
    let B = 0;
    let R = 0;
    let reading = -1;
    const pt = { x: 0, y: 0 };
    const t0 = performance.now();
    const measure = () => {
      if (!wide.matches || !panel || !tiles[0]) {
        el.style.removeProperty("--orbit-h");
        return;
      }
      // The panel's half sizes plus a tile's (front scale 1) plus a gap: the track clears the copy.
      const tw = tiles[0].offsetWidth / 2;
      const th = tiles[0].offsetHeight / 2;
      const W = panel.offsetWidth / 2;
      const H = panel.offsetHeight / 2;
      const gap = 22;
      A = Math.max(W + tw + gap, Math.min(el.clientWidth * 0.36, el.clientWidth / 2 - tw - 20));
      B = H + th + gap;
      R = Math.min(A, B) * 0.42;
      el.style.setProperty("--orbit-h", `${Math.ceil(2 * (B + th) + 56)}px`);
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
      const spin = reduced ? 0 : p * 0.42 + (now - t0) * 0.0000075;
      let front = 0;
      let best = -Infinity;
      tiles.forEach((t, i) => {
        track(i / tiles.length + spin, A, B, R, pt);
        // The bottom edge is the front: tiles there come forward, the ones along the top recede.
        const depth = (pt.y / B + 1) / 2;
        const sc = 0.76 + 0.24 * depth;
        t.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        const z = String(Math.round(depth * 10));
        if (t.style.zIndex !== z) t.style.zIndex = z;
        // The front is the tile nearest the bottom middle.
        const score = pt.y - Math.abs(pt.x) * 0.6;
        if (score > best) {
          best = score;
          front = i;
        }
        // Each system's thread runs from its photo into the panel, bowing like the hero's network.
        const th = threads[i];
        if (th) th.setAttribute("d", `M${pt.x.toFixed(1)} ${pt.y.toFixed(1)} Q ${(pt.x * 0.35).toFixed(1)} ${(pt.y * 0.9).toFixed(1)} 0 0`);
      });
      if (front !== reading) {
        reading = front;
        tiles.forEach((t, i) => t.toggleAttribute("data-reading", i === front));
        threads.forEach((t, i) => t.toggleAttribute("data-reading", i === front));
        lives.forEach((l, i) => {
          l.toggleAttribute("data-on", i === front);
          l.toggleAttribute("data-past", i !== front && l.hasAttribute("data-on"));
        });
      }
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
    if (panel) ro.observe(panel);
    const onWide = () => {
      measure();
      kick();
    };
    wide.addEventListener("change", onWide);
    // Off screen the ring holds still: scrolling the story above it costs nothing.
    const onScroll = () => visible && kick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wide.removeEventListener("change", onWide);
      window.removeEventListener("scroll", onScroll);
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
        {/* What the system at the front is giving up right now: one fact from the running example. */}
        <div className="orbit-live" aria-hidden>
          <span className="orbit-live-label t-label">
            <i />
            Reading
          </span>
          <span className="orbit-live-stack">
            {CONNECTS.map((c, i) => (
              <span key={c.id} className="orbit-live-item" style={toneVars(c.tone)} data-on={i === 0 || undefined}>
                <span className="orbit-live-sys" data-tone={c.tone}>
                  <SystemIcon id={c.id} size={12} />
                  {c.name}
                </span>
                <span className="orbit-live-fact">{c.read}</span>
                <span className="orbit-live-sync">Example · synced {SYNC[c.id]}</span>
              </span>
            ))}
          </span>
        </div>
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
