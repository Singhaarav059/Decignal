// Phones draw the story from pre-rendered stills: one picture per hold (lib/story.ts STOPS), rendered
// from the live 3D at phone framing by scripts/bake-phone-stills.mjs, shown and dissolved by
// components/story/PhoneStory.tsx. A phone then never downloads three.js, builds the world or compiles
// a shader for the story; it decodes one image per swipe. The labels the 3D places (ScreenTag), the
// Industries leader and the island anchors are kept as positions in the manifest, so they stay crisp
// page text over the picture.
//
// Nothing here imports three: this module is in the phone's main bundle.
import { CH, store } from "./story";

/** Where the bake writes, under public/. */
export const STILLS_DIR = "/stills";

/** A label the 3D placed (ScreenTag), as the bake saw it: its pin in bake px, its layer's opacity and
 *  the label's markup (an index into Manifest.tags; the markup carries its own inline styles). */
export type TagAt = { x: number; y: number; o: number; t: number };

/** One island at a hold where islands can be opened (hero, Context): its label as a tap would open it,
 *  and the still with it opened (lifted, the world leaning clear of the panel), with the panel's anchor. */
export type IslandAt = { read: TagAt[]; hit: [number, number, number, number]; img: string | null; anchor: [number, number]; tags: TagAt[] };

export type Hold = {
  g: number;
  /** The chapter the hold belongs to. */
  c: number;
  /** The picture (path under STILLS_DIR without extension), or null where the 3D draws nothing (phones
   *  show Control and Scale as page layouts). */
  img: string | null;
  /** The free band the world was framed into, in bake px: [top, bottom] (bandOf). */
  band: [number, number];
  tags: TagAt[];
  /** Industries: the pin on the place in front, in bake px, for the callout's leader. */
  pin?: [number, number];
  islands?: IslandAt[];
};

/** An application in the explorer at one of its three stages (Signal, Evidence, Action). `box` is the
 *  free area the camera framed it into, as insets in bake px from the stage's edges (left, top, right,
 *  bottom), on a stage Bucket.stage px in size. */
export type AppStill = { img: string | null; box: [number, number, number, number]; tags: TagAt[] };

/** One screen shape's bake (STILLS_DIR/<id>/data.json, loaded once a phone needs it): every hold, the
 *  explorer's stills by APPLICATIONS index x 3 + stage, and its labels' markup (`tags`, inline styles
 *  as lists of indices into Manifest.decls, data-s). */
export type Bucket = { id: string; w: number; h: number; holds: Hold[]; stage?: [number, number]; apps?: AppStill[]; tags: string[] };

/** What a phone needs to choose a shape: each hold's g and band, the explorer's stage and free areas. */
export type Shape = { id: string; w: number; h: number; g: number[]; bands: [number, number][]; stage?: [number, number]; boxes?: [number, number, number, number][] };
export type Manifest = { v: number; dpr: number; formats: string[]; decls: string[]; shapes: Shape[] };

/** `?live3d` opens the story's live 3D on any screen (the bake renders through it; also for A/B). */
export const liveForced = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("live3d");

const PHONE = "(max-width: 767px)";

/** Whether the story is drawn from stills on this screen now. Disabled so all devices run full live 3D. */
export const phoneStills = () => false;

/** The story is read as a scrolling page on this screen. Disabled so all devices run full live 3D. */
export const phoneFlow = () => false;

/** Re-checks phoneStills on resize and on crossing the phone width. */
export function onStillsChange(fn: () => void) {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", fn);
  window.addEventListener("resize", fn, { passive: true });
  return () => {
    m.removeEventListener("change", fn);
    window.removeEventListener("resize", fn);
  };
}

const bottomOf = (sel: string) => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r && r.height > 0 ? r.bottom : 0;
};

/**
 * The band of the screen the 3D frames chapter c's subject into (components/three/Scene.tsx setStage,
 * as it plays out on phones): from under the nav (and the hero's or ending's headline, or the
 * Industries callout) to the top of the chapter's card. Read the same way at bake time and on the
 * phone, so a picture made on one screen size can be laid onto another.
 */
export function bandOf(c: number): [number, number] {
  const vh = window.innerHeight;
  let top = Math.min(bottomOf(".nav-shell") || 72, 120) + 8;
  if (c === CH.fragments) top = Math.max(top, bottomOf(".hero-h1") + 12);
  if (c === CH.final) top = Math.max(top, bottomOf(".final-h1") + 12);
  if (c === CH.industries) top = Math.max(top, bottomOf(".ind-callout") + 10);
  const r = store.cardRect;
  const foot = r ? r.y + r.h : vh - 16;
  const el = document.querySelector<HTMLElement>(".story-overlay");
  const h = el ? parseFloat(el.style.getPropertyValue(`--story-card-h-${c}`)) : NaN;
  const bottom = h > 0 ? foot - h - 10 : r ? r.y - 10 : vh * 0.6;
  return [top, Math.max(bottom, top + 40)];
}

/** How a bake's picture lies on this screen: CSS px offset and scale. */
export type Fit = { x: number; y: number; s: number };

/**
 * Lays bake b's hold onto a screen vw x vh whose band for the chapter is `band`. The picture scales to
 * the screen's width (it is drawn edge to edge: roads and ground run off both sides), unless the band
 * here is shorter than the bake's at that scale, then it scales to fit the band so nothing slips under
 * the card; the band's centres line up.
 */
export function fitOf(b: { w: number }, bakeBand: [number, number], vw: number, band: [number, number]): Fit {
  const sw = vw / b.w;
  const sh = (band[1] - band[0]) / (bakeBand[1] - bakeBand[0]);
  // Up to 4% taller than the band is fine (its empty margins); beyond that, fit the band.
  const s = sh < sw / 1.04 ? sh : sw;
  const x = (vw - b.w * s) / 2;
  const y = (band[0] + band[1]) / 2 - ((bakeBand[0] + bakeBand[1]) / 2) * s;
  return { x, y, s };
}

/** The bake closest to this screen for hold k: the one whose band has the nearest shape, then the
 *  nearest width. A bake that would have to shrink to fit the band (fitOf) leaves the roads and ground
 *  ending short of the screen's sides, a hard edge on each: it loses to any bake that fills the width. */
export function pickShape(m: Manifest, k: number, vw: number, band: [number, number]): Shape {
  const want = (band[1] - band[0]) / vw;
  let best = m.shapes[0];
  let cost = Infinity;
  for (const s of m.shapes) {
    const b = s.bands[k];
    if (!b) continue;
    const fit = fitOf(s, b, vw, band);
    const short = Math.max(0, Math.log(vw / (s.w * fit.s)));
    const c = Math.abs(Math.log((b[1] - b[0]) / s.w / want)) + 0.25 * Math.abs(Math.log(s.w / vw)) + (short > 0.002 ? 10 + short : 0);
    if (c < cost) {
      cost = c;
      best = s;
    }
  }
  return best;
}

/** The explorer's bake whose free area is closest in shape to this one (fw x fh), then in width. */
export function pickAppShape(m: Manifest, fw: number, fh: number) {
  let best: Shape | null = null;
  let cost = Infinity;
  for (const s of m.shapes) {
    const a = s.boxes?.[0];
    if (!a || !s.stage) continue;
    const bw = s.stage[0] - a[0] - a[2];
    const bh = s.stage[1] - a[1] - a[3];
    const c = Math.abs(Math.log(bh / bw / (fh / fw))) + 0.25 * Math.abs(Math.log(bw / fw));
    if (c < cost) {
      cost = c;
      best = s;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Loading and labels                                                   */
/* ------------------------------------------------------------------ */

/** A 1x1 AVIF: whether this browser decodes AVIF (else the WebP stills). */
const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";

/** The manifest and the format this browser takes, fetched once for the story and the explorer. */
let manifest: Promise<{ m: Manifest; fmt: string }> | null = null;
export function loadManifest() {
  manifest ??= (async () => {
    const res = await fetch(`${STILLS_DIR}/manifest.json`);
    if (!res.ok) throw new Error(String(res.status));
    const m = (await res.json()) as Manifest;
    const other = m.formats.find((f) => f !== "avif") ?? m.formats[0];
    const fmt = !m.formats.includes("avif")
      ? other
      : await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.width > 0 ? "avif" : other);
          img.onerror = () => resolve(other);
          img.src = AVIF_PROBE;
        });
    return { m, fmt };
  })();
  // A failed fetch may be tried again later.
  manifest.catch(() => (manifest = null));
  return manifest;
}

/** One shape's bake data, fetched once it is needed (a phone mostly needs one). */
const buckets = new Map<string, Promise<Bucket>>();
export function loadBucket(id: string) {
  let p = buckets.get(id);
  if (!p) {
    p = fetch(`${STILLS_DIR}/${id}/data.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Bucket>;
    });
    p.catch(() => buckets.delete(id));
    buckets.set(id, p);
  }
  return p;
}

/** Decoded pictures kept: the ones on screen, one dissolving and the neighbours. */
const KEEP = 6;
const cache = new Map<string, Promise<HTMLImageElement>>();

/** A still, fetched and decoded off the main thread; the last few stay decoded. */
export function loadStill(url: string) {
  let p = cache.get(url);
  if (p) {
    cache.delete(url);
    cache.set(url, p);
    return p;
  }
  const img = new Image();
  img.decoding = "async";
  img.alt = "";
  img.src = url;
  p = img.decode().then(() => img);
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  while (cache.size > KEEP) cache.delete(cache.keys().next().value!);
  return p;
}

const LABEL_CSS = "position:absolute;left:0;top:0;width:0;height:0";

/** A still's labels, as ScreenTag builds them (crisp page text); placeLabels puts them on their pins. */
export function labelsOf(m: Manifest, b: Bucket, tags: TagAt[]) {
  const layer = document.createElement("div");
  layer.className = "phone-still-tags";
  for (const t of tags) {
    const tag = document.createElement("div");
    tag.dataset.stag = "";
    tag.style.cssText = LABEL_CSS;
    tag.style.opacity = String(t.o);
    tag.innerHTML = b.tags[t.t] ?? "";
    // Each part's inline style, from the declarations the manifest keeps once (data-s lists them).
    tag.querySelectorAll<HTMLElement>("[data-s]").forEach((el) => {
      el.setAttribute("style", (el.dataset.s ?? "").split(",").map((i) => m.decls[Number(i)] ?? "").join(";"));
      el.removeAttribute("data-s");
    });
    layer.appendChild(tag);
  }
  return layer;
}

/** Puts labels on their pins (bake px through the fit), each kept on screen as ScreenTag does. */
export function placeLabels(layer: HTMLElement, tags: TagAt[], fit: Fit, vw: number) {
  const els = layer.querySelectorAll<HTMLElement>(":scope > [data-stag]");
  tags.forEach((t, i) => {
    const el = els[i];
    if (!el) return;
    const x = Math.round(fit.x + t.x * fit.s);
    const y = Math.round(fit.y + t.y * fit.s);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const card = el.lastElementChild as HTMLElement | null;
    if (!card) return;
    const left = Number(card.dataset.left ?? (parseFloat(card.style.left) || 0));
    card.dataset.left = String(left);
    const w = card.offsetWidth;
    if (w > 0) card.style.left = `${Math.round(Math.min(Math.max(left, 8 - x), vw - 8 - x - w))}px`;
  });
}
