"use client";

// The Applications explorer's world on phones: a pre-rendered still per application and stage (Signal,
// Evidence, Action), baked from the live 3D with the story's stills (scripts/bake-phone-stills.mjs,
// lib/stills.ts), in place of ApplicationScene. A stage change dissolves to the next still (the old one
// fades off the new, as the story does); the labels stay page text. No WebGL, no three.js.
import { useEffect, useRef, type RefObject } from "react";
import type { Frame } from "../three/ApplicationScene";
import { STILLS_DIR, labelsOf, loadBucket, loadManifest, loadStill, pickAppShape, placeLabels, type AppStill, type Bucket, type Fit, type Manifest } from "@/lib/stills";

/** The old still's dissolve (ms), as the story's. */
const FADE = 420;
const STAGES = 3;

type Props = {
  /** APPLICATIONS index of the application shown. */
  app: number;
  step: number;
  /** The free area the copy leaves on the stage (ApplicationExplorer measures it). */
  frame: RefObject<Frame>;
  /** The stills cannot load: the explorer draws its live 3D instead. */
  onFail: () => void;
};

export function ExplorerStills({ app, step, frame, onFail }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<{ show: (app: number, step: number) => void } | null>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let live = true;
    let m: Manifest | null = null;
    let fmt = "webp";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = "";
    let pending = "";
    type Shown = { el: HTMLDivElement; img: HTMLImageElement | null; layer: HTMLElement; still: AppStill; bucket: Bucket };
    let current: Shown | null = null;
    let want = { app, step };

    const free = () => {
      const f = frame.current;
      const W = host.clientWidth;
      const H = host.clientHeight;
      return { W, H, l: f.left, t: f.top, w: Math.max(120, W - f.left - f.right), h: Math.max(120, H - f.top - f.bottom) };
    };
    const urlOf = (b: Bucket, name: string) => `${STILLS_DIR}/${b.id}/${name}.${fmt}`;
    /** The bake for this stage's free area, its data loaded. */
    const bucket = () => {
      const f = free();
      const s = m && pickAppShape(m, f.w, f.h);
      return s ? loadBucket(s.id) : Promise.reject(new Error("no explorer stills"));
    };

    /** The bake's free area onto this one: the same scale law as the camera's (fit both ways), centred. */
    const place = (s: Shown) => {
      const f = free();
      const [l, t, r, b] = s.still.box;
      const [sw, sh] = s.bucket.stage!;
      const bw = sw - l - r;
      const bh = sh - t - b;
      const k = Math.min(f.w / bw, f.h / bh);
      const fit: Fit = { s: k, x: f.l + f.w / 2 - (l + bw / 2) * k, y: f.t + f.h / 2 - (t + bh / 2) * k };
      if (s.img) {
        Object.assign(s.img.style, {
          left: `${fit.x.toFixed(2)}px`,
          top: `${fit.y.toFixed(2)}px`,
          width: `${(sw * k).toFixed(2)}px`,
          height: `${(sh * k).toFixed(2)}px`,
        });
      }
      placeLabels(s.layer, s.still.tags, fit, f.W);
    };

    const show = async (a: number, st: number) => {
      want = { app: a, step: st };
      if (!m) return;
      const key = `${a}:${st}`;
      if (key === shown || key === pending) return;
      pending = key;
      let b: Bucket;
      try {
        b = await bucket();
      } catch {
        if (pending === key) pending = "";
        return;
      }
      const still = b.apps?.[a * STAGES + st];
      if (!still || !b.stage) {
        if (pending === key) pending = "";
        return;
      }
      let img: HTMLImageElement | null = null;
      if (still.img && live && pending === key) {
        try {
          img = await loadStill(urlOf(b, still.img));
        } catch {
          img = null;
        }
      }
      if (!live || pending !== key) return;
      pending = "";
      shown = key;
      const el = document.createElement("div");
      el.className = "phone-still";
      if (img) {
        img.className = "phone-still-img";
        el.appendChild(img);
      }
      const layer = labelsOf(m, b, still.tags);
      el.appendChild(layer);
      const next: Shown = { el, img, layer, still, bucket: b };
      const old = current;
      current = next;
      host.insertBefore(el, old ? old.el : null);
      place(next);
      requestAnimationFrame(() => el.setAttribute("data-in", ""));
      if (old) {
        if (reduced) old.el.remove();
        else {
          old.el.style.transition = `opacity ${FADE}ms cubic-bezier(0.33, 0, 0.2, 1)`;
          old.el.setAttribute("data-out", "");
          window.setTimeout(() => old.el.remove(), FADE + 40);
        }
      }
      // The next stage and the next application load while the reader reads this one.
      const idle = (window as Window & { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const go = () => {
        const near = st < STAGES - 1 ? [a * STAGES + st + 1] : [(a + 1) * STAGES];
        if (st > 0) near.push(a * STAGES + st - 1);
        for (const n of near) {
          const s = b.apps?.[n];
          if (s?.img) void loadStill(urlOf(b, s.img)).catch(() => {});
        }
      };
      if (idle) idle(go, { timeout: 800 });
      else window.setTimeout(go, 300);
    };
    api.current = { show: (a, st) => void show(a, st) };

    // The stage's size, or the copy around the free area, changed: lay the still on again.
    const ro = new ResizeObserver(() => current && place(current));
    ro.observe(host);
    (async () => {
      try {
        const got = await loadManifest();
        if (!live) return;
        if (!got.m.shapes?.some((s) => s.boxes?.length)) throw new Error("no explorer stills");
        m = got.m;
        fmt = got.fmt;
        void show(want.app, want.step);
      } catch {
        if (live) onFail();
      }
    })();
    return () => {
      live = false;
      api.current = null;
      ro.disconnect();
      host.replaceChildren();
    };
    // The application and stage reach the effect through api.show; it runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, onFail]);

  useEffect(() => {
    api.current?.show(app, step);
  }, [app, step]);

  return <div ref={root} className="phone-stills explorer-stills" />;
}
