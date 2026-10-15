"use client";

// Story tags as page text. A tag is a pin on its object (a small tone dot) that opens into a label
// when it is the chapter's subject or the reader points at it. The label is real HTML placed on whole
// device pixels at the projected 3D anchor, so it is crisp at any pixel density and the same size on
// screen however far away the camera is. One label is open at a time: the next opens once the last has
// closed. Nothing here reads the layout while the page scrolls: on a phone each read laid out the whole
// page, a hitch several times a second through every chapter with a label open.

import * as THREE from "three";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { store } from "@/lib/story";

type ScreenTagProps = {
  title: string;
  value?: string;
  /** The dot's colour: the system or object the tag names. */
  tone: string;
  /** Risk: the value reads in signal red. */
  alert?: boolean;
  /** 0..1: how present the tag's object is right now. */
  show: () => number;
  /** True while this tag is the open label: the chapter's pin, or the one pointed at. */
  open: () => boolean;
  /** What a closed tag leaves on its object: the pin dot, or nothing. */
  rest?: "dot" | "none";
  /** The pointer is over the dot or the label. Tags with a handler take the pointer. */
  onHover?: (on: boolean) => void;
};

type Els = { root: HTMLDivElement; dot: HTMLSpanElement; pad: HTMLSpanElement; stem: HTMLSpanElement; card: HTMLDivElement; title: HTMLSpanElement; value: HTMLSpanElement };

type Entry = {
  anchor: React.RefObject<THREE.Group | null>;
  props: React.RefObject<ScreenTagProps>;
  get: () => { camera: THREE.Camera; size: { width: number; height: number } };
  els: Els;
  /** Presence, label openness and the update pop, each 0..1. */
  p: number;
  k: number;
  pop: number;
  /** Label size in px, measured when its text changes. */
  w: number;
  h: number;
  /** The label would sit on the page's copy: it stays closed. */
  blocked: boolean;
  /** Which side of its pin the label sits on. */
  side: Side;
  /** Last written style values, so a still tag writes nothing. */
  last: Record<string, string>;
};

const entries = new Set<Entry>();
/** Per camera (one per canvas): the two most open labels, rewritten each tick. */
const most = new Map<THREE.Camera, { first: number; second: number; top: Entry | null }>();
const v = new THREE.Vector3();
let stop: (() => void) | null = null;
let prevT = 0;
let frame = 0;
let reduced = false;
/** Labels stay clear of the fixed nav bar. */
const TOP_SAFE = 76;
/** The page counts as scrolling this long after its last scroll frame (ms): the copy is re-read after. */
const SCROLL_QUIET = 200;
let dpr = 1;
/**
 * A CSS length on whole device pixels. Whole CSS pixels are not whole device pixels at 2.625x (a
 * Realme 11 Pro) or 3x: each label's layer then sat between device pixels and was resampled, and its
 * text read soft on the phone while it was sharp on a 2x screen.
 */
const snap = (n: number) => Math.round(n * dpr) / dpr;
let blocksRead = false;

// Flat: white, a hairline, a tone dot. No shadows, no blur.
const CARD_CSS =
  "position:absolute;left:0;top:0;display:flex;flex-direction:column;gap:1px;padding:7px 11px 8px 10px;" +
  "background:#fff;border:1px solid var(--color-line-strong);border-radius:var(--radius-sm,10px);white-space:nowrap;" +
  "font-family:var(--font-sans);-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;transform-origin:50% 100%;opacity:0;pointer-events:none";
const DOT_CSS =
  "position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3px var(--color-line-strong);pointer-events:none";
/** The dot's hit area: 10px was a target the pointer slid off; this one is a finger's or a cursor's size. */
const PAD = 32;
const PAD_CSS = `position:absolute;left:${-PAD / 2}px;top:${-PAD / 2}px;width:${PAD}px;height:${PAD}px;border-radius:50%;pointer-events:none`;
/** Leaving the dot or the label lets go after this long (ms): a pointer crossing the gap between them,
 *  or grazing the edge, does not drop the island and lift it again. */
const LEAVE = 120;
const STEM_CSS = "position:absolute;left:0;bottom:5px;width:1px;height:8px;background:var(--color-line-strong);opacity:0";

/** One layer of tags per canvas, over the canvas and under the story copy. */
const layers = new WeakMap<HTMLElement, HTMLDivElement>();
function layerFor(canvas: HTMLCanvasElement) {
  const host = canvas.parentElement!;
  let layer = layers.get(host);
  if (!layer) {
    layer = document.createElement("div");
    layer.dataset.stagLayer = "";
    // The facts a label shows are also in the page's copy; screen readers read them there once.
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:layout style";
    host.appendChild(layer);
    layers.set(host, layer);
  }
  return layer;
}

function build(layer: HTMLDivElement, entry: () => Entry | null) {
  const root = document.createElement("div");
  root.dataset.stag = "";
  root.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;will-change:transform";
  const dot = document.createElement("span");
  dot.style.cssText = DOT_CSS;
  const stem = document.createElement("span");
  stem.style.cssText = STEM_CSS;
  const pad = document.createElement("span");
  pad.style.cssText = PAD_CSS;
  const card = document.createElement("div");
  card.style.cssText = CARD_CSS;
  const head = document.createElement("span");
  head.style.cssText = "display:flex;align-items:center;gap:6px;font-size:13px;line-height:16px;font-weight:600;color:var(--color-ink)";
  const chip = document.createElement("i");
  chip.style.cssText = "width:6px;height:6px;border-radius:50%;flex:none";
  const title = document.createElement("span");
  head.append(chip, title);
  const value = document.createElement("span");
  value.style.cssText = "padding-left:12px;font-size:12px;line-height:15px;font-weight:500;color:var(--color-ink-soft)";
  card.append(head, value);
  root.append(stem, dot, pad, card);
  layer.appendChild(root);
  // Pointing at the dot or the label counts as pointing at the object.
  let leave = 0;
  const enter = () => {
    clearTimeout(leave);
    entry()?.props.current.onHover?.(true);
  };
  const out = () => {
    clearTimeout(leave);
    leave = window.setTimeout(() => entry()?.props.current.onHover?.(false), LEAVE);
  };
  for (const el of [pad, card]) {
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", out);
  }
  return { root, dot, pad, stem, card, title, value, chip };
}

const put = (e: Entry, el: HTMLElement, key: string, prop: string, value: string) => {
  if (e.last[key] === value) return;
  e.last[key] = value;
  el.style.setProperty(prop, value);
};

const damp = (a: number, b: number, lambda: number, dt: number) => b + (a - b) * Math.exp(-lambda * dt);

/** Text blocks of the story copy that are on screen; a label never sits on them. */
let blocks: DOMRect[] = [];
function readBlocks() {
  blocks = [];
  const seen = new Set<Element>();
  document.querySelectorAll<HTMLElement>("[data-ch], [data-ind]").forEach((ch) => {
    const o = parseFloat(ch.style.opacity || "1");
    if (o < 0.3 || ch.style.visibility === "hidden") return;
    ch.querySelectorAll<HTMLElement>("h1, h2, h3, p, dl, ul, ol, button, a, [data-obstacle]").forEach((el) => {
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) blocks.push(r);
    });
  });
  // Page copy marked as an obstacle anywhere else (the explorer's head and card), when on screen.
  document.querySelectorAll<HTMLElement>("[data-obstacle]").forEach((el) => {
    if (seen.has(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) return;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    blocks.push(r);
  });
}

type Side = "up" | "right" | "left" | "down";
const SIDES: Side[] = ["up", "right", "left", "down"];
const ORIGIN: Record<Side, string> = { up: "50% 100%", down: "50% 0", right: "0 50%", left: "100% 50%" };
const SLIDE: Record<Side, [number, number]> = { up: [0, 6], down: [0, -6], right: [-6, 0], left: [6, 0] };
const GAP = 13;

/** The label's top-left corner in page pixels for a side of its pin at (x, y); above and below, it
 *  slides along the pin to stay on screen. */
function place(side: Side, x: number, y: number, e: Entry, size: { width: number }): [number, number] {
  if (side === "right") return [x + GAP, y - snap(e.h / 2)];
  if (side === "left") return [x - GAP - e.w, y - snap(e.h / 2)];
  const left = x + snap(THREE.MathUtils.clamp(-e.w / 2, 8 - x, size.width - 8 - x - e.w));
  return [left, side === "up" ? y - GAP - e.h : y + GAP];
}

/** The label at [left, top] would leave the screen, slip under the nav, or sit on the copy. */
function hits([l, t]: [number, number], e: Entry, size: { width: number; height: number }) {
  if (t < TOP_SAFE || t + e.h > size.height - 8 || l < 8 || l + e.w > size.width - 8) return true;
  return blocks.some((b) => l < b.right + 8 && l + e.w > b.left - 8 && t < b.bottom + 8 && t + e.h > b.top - 8);
}

const visibleChain = (o: THREE.Object3D | null) => {
  for (let x = o; x; x = x.parent) if (!x.visible) return false;
  return true;
};

/** The longest step one update damps by (s): a phone at rest updates 8 times a second (Pacer). */
const MAX_DT = 0.15;

function tick() {
  // Real time, not the loop's timestamp: on a touch screen the Pacer advances R3F with the scene clock
  // in seconds, which read as milliseconds slowed every fade a thousandfold. The labels crept open over
  // minutes and old ones never quite left: half-clear ghosts on the phone, never seen on a desktop.
  const t = performance.now();
  const dt = Math.min(Math.max((t - prevT) / 1000, 0), MAX_DT);
  prevT = t;
  // Refresh the copy's footprint a few times a second, only while a label wants to open, and only while
  // the page rests (the copy hardly moves under a label mid-scroll; the next rest corrects it).
  if (frame++ % 12 === 0 && (!blocksRead || t - store.scrollAt > SCROLL_QUIET) && [...entries].some((e) => e.props.current.open())) {
    readBlocks();
    blocksRead = true;
  }

  // The most open label other than each tag, per world: a tag opens only once the previous one in its
  // own canvas has closed (the explorer's labels below the story never hold the story's shut).
  most.forEach((m) => {
    m.first = 0;
    m.second = 0;
    m.top = null;
  });
  for (const e of entries) {
    const cam = e.get().camera;
    let m = most.get(cam);
    if (!m) most.set(cam, (m = { first: 0, second: 0, top: null }));
    if (e.k > m.first) {
      m.second = m.first;
      m.first = e.k;
      m.top = e;
    } else if (e.k > m.second) m.second = e.k;
  }

  for (const e of entries) {
    const P = e.props.current;
    const a = e.anchor.current;
    const { camera, size } = e.get();
    const { root, dot, pad, stem, card } = e.els;
    const show = a && visibleChain(a) ? THREE.MathUtils.clamp(P.show(), 0, 1) : 0;
    e.p = damp(e.p, show, 10, dt);
    if (!a || (e.p < 0.004 && e.k < 0.004 && show === 0)) {
      e.p = 0;
      e.k = 0;
      put(e, root, "r.vis", "visibility", "hidden");
      continue;
    }
    a.getWorldPosition(v).project(camera);
    const behind = v.z > 1;
    const x = snap((v.x * 0.5 + 0.5) * size.width);
    const y = snap((-v.y * 0.5 + 0.5) * size.height);
    // Where the label goes: above its pin by default; beside it, or below it, when the page's copy
    // (or the nav) is in the way; if every side is taken it stays shut. Chosen while it is closed.
    if (e.k < 0.02) e.side = SIDES.find((side) => !hits(place(side, x, y, e, size), e, size)) ?? "up";
    const at = place(e.side, x, y, e, size);
    e.blocked = hits(at, e, size);
    const left = at[0] - x;
    const top_ = at[1] - y;

    const near = most.get(camera);
    const others = !near ? 0 : e === near.top ? near.second : near.first;
    // Measured (its ResizeObserver) before it may open: unmeasured, it would be placed as if empty.
    const want = P.open() && show > 0.5 && !behind && !e.blocked && e.w > 0;
    e.k = damp(e.k, want && (others < 0.08 || e.k > 0.02) ? 1 : 0, want ? 14 : 18, dt);
    if (e.k < 0.002) e.k = 0;
    if (e.k > 0.998) e.k = 1;
    e.pop = Math.max(0, e.pop - dt * 2.4);

    const rest = P.rest ?? "dot";
    const dotO = behind ? 0 : rest === "dot" ? 1 : Math.min(1, e.k * 2);
    put(e, root, "r.vis", "visibility", "visible");
    put(e, root, "r.tf", "transform", `translate3d(${x}px, ${y}px, 0)`);
    put(e, root, "r.op", "opacity", e.p > 0.995 ? "1" : e.p.toFixed(3));
    put(e, dot, "d.op", "opacity", dotO.toFixed(3));
    // An update gives the dot one small pulse; the text itself never scales at rest.
    const bump = Math.sin(Math.min(1, (1 - e.pop) * 2) * Math.PI) * e.pop;
    put(e, dot, "d.tf", "transform", bump > 0.001 && !reduced ? `scale(${(1 + bump * 0.7).toFixed(3)})` : "none");
    const vertical = e.side === "up" || e.side === "down";
    put(e, stem, "s.op", "opacity", vertical ? e.k.toFixed(3) : "0");
    put(e, stem, "s.side", "transform", e.side === "down" ? "translateY(18px)" : "none");
    put(e, card, "c.left", "left", `${left}px`);
    put(e, card, "c.top", "top", `${top_}px`);
    put(e, card, "c.origin", "transform-origin", ORIGIN[e.side]);
    put(e, card, "c.op", "opacity", e.k.toFixed(3));
    // Opening: a short slide out from the pin; fully open it sits on whole pixels with no transform.
    const [dx, dy] = SLIDE[e.side];
    const m = reduced ? 0 : 1 - e.k;
    put(e, card, "c.tf", "transform", e.k === 1 || reduced ? "none" : `translate3d(${snap(dx * m)}px, ${snap(dy * m)}px, 0) scale(${(0.96 + 0.04 * e.k).toFixed(4)})`);
    const takes = !!P.onHover && e.p > 0.5;
    put(e, card, "c.pe", "pointer-events", takes && e.k > 0.5 ? "auto" : "none");
    put(e, pad, "p.pe", "pointer-events", takes && rest === "dot" && dotO > 0.5 ? "auto" : "none");
    put(e, card, "c.cur", "cursor", takes ? "pointer" : "");
    put(e, pad, "p.cur", "cursor", takes ? "pointer" : "");
  }
}

/** A tag on a 3D anchor: place it where the label's pin should sit (above the object). */
export function ScreenTag(props: ScreenTagProps) {
  const anchor = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const latest = useRef(props);
  const entry = useRef<Entry | null>(null);
  const els = useRef<(Els & { chip: HTMLElement }) | null>(null);

  useLayoutEffect(() => {
    latest.current = props;
  });

  useLayoutEffect(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dpr = window.devicePixelRatio || 1;
    const built = build(layerFor(gl.domElement), () => entry.current);
    els.current = built;
    const e: Entry = { anchor, props: latest, get, els: built, p: 0, k: 0, pop: 0, w: 0, h: 0, blocked: false, side: "up", last: {} };
    entry.current = e;
    entries.add(e);
    if (!stop) {
      prevT = performance.now();
      stop = addAfterEffect(tick);
    }
    // The label's size, as the browser lays it out (new text, the web fonts arriving): reported after its
    // own layout, never read in a frame. Snapped to device pixels, as everything placed from it.
    const ro = new ResizeObserver(([en]) => {
      const b = en.borderBoxSize?.[0];
      e.w = snap(b ? b.inlineSize : built.card.offsetWidth);
      e.h = snap(b ? b.blockSize : built.card.offsetHeight);
    });
    ro.observe(built.card);
    return () => {
      ro.disconnect();
      entries.delete(e);
      built.root.remove();
      entry.current = null;
      if (!entries.size) most.clear();
      if (!entries.size && stop) {
        stop();
        stop = null;
      }
    };
  }, [gl, get]);

  const { title, value = "", tone, alert = false } = props;
  useLayoutEffect(() => {
    const el = els.current;
    const e = entry.current;
    if (!el || !e) return;
    const changed = el.value.textContent !== "" && el.value.textContent !== value;
    el.title.textContent = title;
    el.value.textContent = value;
    el.value.style.display = value ? "" : "none";
    el.value.style.color = alert ? "var(--color-signal-ink)" : "var(--color-ink-soft)";
    el.dot.style.background = tone;
    el.chip.style.background = tone;
    if (changed) e.pop = 1;
  }, [title, value, tone, alert]);

  return <group ref={anchor} />;
}
