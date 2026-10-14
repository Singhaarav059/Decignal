"use client";

// The story's world on phones: a pre-rendered still per hold (lib/stills.ts), in place of the live 3D.
// It behaves as the phone's still story did (components/three/Pacer.tsx `still`): nothing changes while
// a swipe runs, and near the end of the move the next picture lands with the old one dissolving off it
// (420 ms). The labels, the Industries leader and the island anchors come from the bake's manifest and
// stay page text. A tap on an island reads its label and a second tap opens it, as in the 3D.
//
// Per swipe a phone decodes one image (its neighbours load while the reader reads); no WebGL, no
// three.js. Re-bake after any change to the 3D: scripts/bake-phone-stills.mjs.
import { useEffect, useRef } from "react";
import { CH, CHAPTERS, EXIT_DRIFT, STOPS, finalExit, onSelect, select, setSceneReady, store, subscribe, weight } from "@/lib/story";
import { paceLeft, paceTarget, pacing } from "@/lib/pace";
import { markSceneReady } from "@/lib/chrome";
import { STILLS_DIR, bandOf, fitOf, labelsOf, loadBucket, loadManifest, loadStill, pickShape, placeLabels, type Bucket, type Fit, type Hold, type Manifest, type TagAt } from "@/lib/stills";

/** The new picture lands when this much of the move is left (as Pacer NEAR). */
const NEAR = 0.25;
/** The old picture's dissolve (ms), as Pacer FADE. */
const FADE = 420;
/** Which picture a moment shows: a hold, and on the islands' holds an island read (tap) or opened. */
type Want = { k: number; read: number; open: number };
const keyOf = (w: Want) => `${w.k}:${w.read}:${w.open}`;

/** The chapter hold k belongs to. */
const chapterOf = (k: number) => Math.min(Math.floor(STOPS[k] + 1e-6), CHAPTERS.length - 1);

/** The hold nearest story position g. */
function holdAt(g: number) {
  let k = 0;
  for (let i = 1; i < STOPS.length; i++) if (Math.abs(STOPS[i] - g) < Math.abs(STOPS[k] - g)) k = i;
  return k;
}

export function PhoneStory({ onFail }: { onFail: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let live = true;
    let m: Manifest | null = null;
    let fmt = "webp";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let fingers = 0;
    let shown = "";
    let pending = "";
    /** A tap read this island's label (first tap), or -1. */
    let read = -1;
    let readySent = false;
    type Frame = { el: HTMLDivElement; img: HTMLImageElement | null; layer: HTMLElement; want: Want; bucket: Bucket; hold: Hold; tags: TagAt[] };
    let current: Frame | null = null;
    const stage = document.querySelector<HTMLElement>(".ind-callout-stage");

    const ready = () => {
      if (readySent) return;
      readySent = true;
      setSceneReady(true);
      markSceneReady();
    };

    const holdOf = (b: Bucket, w: Want) => b.holds[w.k];
    const pictureOf = (h: Hold, w: Want) => (w.open >= 0 && h.islands?.[w.open]?.img) || h.img;
    const urlOf = (name: string) => `${STILLS_DIR}/${name}.${fmt}`;

    /** The bake for hold k on this screen, its data loaded. */
    const bucketFor = (k: number) => loadBucket(pickShape(m!, k, window.innerWidth, bandOf(chapterOf(k))).id);

    const wantNow = (): Want => {
      const k = holdAt(paceTarget());
      const c = chapterOf(k);
      const islands = (c === CH.fragments || c === CH.context) && islandsLive();
      const open = islands && store.selected >= 0 ? store.selected : -1;
      return { k, read: islands && open < 0 ? read : -1, open };
    };

    /** Lays a frame's picture and labels onto the screen as it is now. */
    const place = (f: Frame) => {
      const vw = window.innerWidth;
      const fit: Fit = fitOf(f.bucket, f.hold.band, vw, bandOf(f.hold.c));
      if (f.img) {
        Object.assign(f.img.style, {
          left: `${fit.x.toFixed(2)}px`,
          top: `${fit.y.toFixed(2)}px`,
          width: `${(f.bucket.w * fit.s).toFixed(2)}px`,
          height: `${(f.bucket.h * fit.s).toFixed(2)}px`,
        });
      }
      placeLabels(f.layer, f.tags, fit, vw);
      // The leader from the Industries callout to the place's pin (IndustriesRoad placeLeader).
      if (f.hold.pin && stage) {
        const px = fit.x + f.hold.pin[0] * fit.s;
        const py = fit.y + f.hold.pin[1] * fit.s;
        const r = stage.querySelector(".ind-callout")?.getBoundingClientRect();
        if (r && r.width > 0) {
          const ax = Math.min(Math.max(px, r.left + 28), r.right - 28);
          const ay = r.bottom;
          const dx = px - ax;
          const dy = py - ay;
          stage.style.setProperty("--pin-x", `${px.toFixed(1)}px`);
          stage.style.setProperty("--pin-y", `${py.toFixed(1)}px`);
          stage.style.setProperty("--lead-x", `${ax.toFixed(1)}px`);
          stage.style.setProperty("--lead-y", `${ay.toFixed(1)}px`);
          stage.style.setProperty("--lead-l", `${Math.max(0, Math.hypot(dx, dy) - 9).toFixed(1)}px`);
          stage.style.setProperty("--lead-a", `${Math.atan2(dy, dx).toFixed(4)}rad`);
          leadTo(dy > 28 ? 1 : 0);
        }
      }
      // The opened island's anchor, for the panel's leader line (IslandPanel).
      if (f.want.open >= 0) {
        const a = f.hold.islands?.[f.want.open]?.anchor;
        if (a) {
          store.anchor.x = fit.x + a[0] * fit.s;
          store.anchor.y = fit.y + a[1] * fit.s;
        }
      }
      f.el.dataset.fit = `${fit.x},${fit.y},${fit.s}`;
    };

    // The leader fades in once the place lands and goes as the next move starts.
    let lead = 0;
    let leadGoal = 0;
    let leadRaf = 0;
    const leadTo = (o: number) => {
      leadGoal = o;
      if (!stage || leadRaf) return;
      let last = performance.now();
      const step = (t: number) => {
        const d = (t - last) / 1000;
        last = t;
        lead = leadGoal > lead ? Math.min(leadGoal, lead + d * 5) : Math.max(leadGoal, lead - d * 8);
        if (reduced) lead = leadGoal;
        stage.style.setProperty("--lead-o", lead.toFixed(3));
        leadRaf = lead === leadGoal ? 0 : requestAnimationFrame(step);
      };
      leadRaf = requestAnimationFrame(step);
    };

    const build = (want: Want, bucket: Bucket, img: HTMLImageElement | null) => {
      const hold = holdOf(bucket, want);
      const el = document.createElement("div");
      el.className = "phone-still";
      if (want.k === 0) el.dataset.hero = "";
      let tags = hold.tags;
      const isl = hold.islands;
      if (isl && want.open >= 0) tags = isl[want.open]?.tags ?? [];
      // The island read takes the label slot, as the chapter's own pin gives way to it in the 3D.
      else if (isl && want.read >= 0) tags = isl[want.read]?.read ?? tags;
      if (img) {
        img.className = "phone-still-img";
        el.appendChild(img);
      }
      const layer = labelsOf(m!, bucket, tags);
      el.appendChild(layer);
      return { el, img, layer, want, bucket, hold, tags } as Frame;
    };

    const show = async (want: Want) => {
      const key = keyOf(want);
      if (key === shown || key === pending) return;
      pending = key;
      let bucket: Bucket;
      try {
        bucket = await bucketFor(want.k);
      } catch {
        if (pending === key) pending = "";
        // Offline: the page goes on without the world rather than waiting on the loader's cap.
        ready();
        return;
      }
      const hold = holdOf(bucket, want);
      const name = pictureOf(hold, want);
      let img: HTMLImageElement | null = null;
      if (name && live && pending === key) {
        try {
          const src = await loadStill(urlOf(`${bucket.id}/${name}`));
          // The same picture may still be on screen (an island read keeps the hold's picture): a copy.
          img = src.isConnected ? (src.cloneNode() as HTMLImageElement) : src;
          if (img !== src) await img.decode().catch(() => {});
        } catch {
          img = null;
        }
      }
      if (!live || pending !== key) return;
      pending = "";
      shown = key;
      const next = build(want, bucket, img);
      const old = current;
      current = next;
      // The new picture goes in under the old one, whole; the old one dissolves off it (as Pacer).
      host.insertBefore(next.el, old ? old.el : null);
      place(next);
      if (!hold.pin) leadTo(0);
      requestAnimationFrame(() => next.el.setAttribute("data-in", ""));
      if (old) {
        if (reduced) old.el.remove();
        else {
          old.el.style.transition = `opacity ${FADE}ms cubic-bezier(0.33, 0, 0.2, 1)`;
          old.el.setAttribute("data-out", "");
          window.setTimeout(() => old.el.remove(), FADE + 40);
        }
      }
      ready();
      neighbours(want.k);
    };

    /** The holds either side load while the reader reads this one. */
    const neighbours = (k: number) => {
      const idle = (window as Window & { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const go = () => {
        for (const n of [k + 1, k - 1]) {
          if (n < 0 || n >= STOPS.length || !m) continue;
          void bucketFor(n)
            .then((b) => (b.holds[n].img ? loadStill(urlOf(`${b.id}/${b.holds[n].img}`)) : null))
            .catch(() => {});
        }
      };
      if (idle) idle(go, { timeout: 600 });
      else window.setTimeout(go, 200);
    };

    const moving = () => fingers > 0 || (pacing() && paceLeft() > NEAR);

    const update = () => {
      if (!m) return;
      const want = wantNow();
      // The target loads as soon as the swipe sets it, so it is decoded by the time the move lands.
      if (moving()) {
        void bucketFor(want.k)
          .then((b) => {
            const name = pictureOf(b.holds[want.k], want);
            return name ? loadStill(urlOf(`${b.id}/${name}`)) : null;
          })
          .catch(() => {});
        if (current?.hold.pin && current.want.k !== want.k) leadTo(0);
        return;
      }
      void show(want);
    };

    // The closing world drifts up with the page below as its sheet slides over (Scene frameShot exit).
    let drift = "";
    const exit = (g: number) => {
      const k = finalExit(g);
      const v = k > 0 ? `translate3d(0, ${(-k * EXIT_DRIFT * window.innerHeight).toFixed(1)}px, 0) scale(${(1 / (1 + 0.1 * k)).toFixed(4)})` : "";
      if (v === drift) return;
      drift = v;
      host.style.transform = v;
    };

    // Islands (hero and Context): a tap on one reads its label, a second opens it (IslandFocus).
    const islandsLive = () => Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g)) > 0.9;
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a, button, input, select, textarea, label, [role=dialog]");
    const hitAt = (x: number, y: number) => {
      const f = current;
      const isl = f?.hold.islands;
      if (!f || !isl) return -1;
      const [fx, fy, fs] = (f.el.dataset.fit ?? "0,0,1").split(",").map(Number);
      const bx = (x - fx) / fs;
      const by = (y - fy) / fs;
      let best = -1;
      let dist = Infinity;
      isl.forEach((s, i) => {
        const [x0, y0, x1, y1] = s.hit;
        if (bx < x0 || bx > x1 || by < y0 || by > y1) return;
        const d = Math.hypot(bx - (x0 + x1) / 2, by - (y0 + y1) / 2);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      return best;
    };
    const onClick = (e: MouseEvent) => {
      if (!m || !islandsLive() || interactive(e.target)) return;
      const hit = hitAt(e.clientX, e.clientY);
      if (hit >= 0 && hit !== store.selected && hit !== read) {
        read = hit;
        update();
        return;
      }
      read = -1;
      select(hit >= 0 && hit !== store.selected ? hit : -1);
      update();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(-1);

    const down = (e: TouchEvent) => {
      fingers = e.touches.length;
      update();
    };
    // A touch whose element leaves the page mid-touch ends on that element only, never reaching the
    // window: listen there too, or a finger stays counted down and the picture never lands.
    const start = (e: TouchEvent) => {
      down(e);
      const t = e.target;
      if (!(t instanceof Node)) return;
      const end = (ev: Event) => {
        if (!t.isConnected) down(ev as TouchEvent);
        t.removeEventListener("touchend", end);
        t.removeEventListener("touchcancel", end);
      };
      t.addEventListener("touchend", end, { passive: true });
      t.addEventListener("touchcancel", end, { passive: true });
    };
    const resize = () => {
      if (current) place(current);
    };

    let offG = () => {};
    let offSel = () => {};
    (async () => {
      try {
        const got = await loadManifest();
        if (!live) return;
        // A bake for another set of holds is stale: the live 3D draws instead.
        const stale = !got.m.shapes?.length || got.m.shapes.some((s) => s.g.length !== STOPS.length || s.g.some((g, k) => Math.abs(g - STOPS[k]) > 1e-3));
        if (stale) throw new Error("stale manifest");
        fmt = got.fmt;
        m = got.m;
      } catch {
        if (live) onFail();
        return;
      }
      offG = subscribe((g) => {
        exit(g);
        // Scrolling on to the next chapter closes an opened island and forgets a read one.
        if (!islandsLive()) {
          read = -1;
          if (store.selected >= 0) select(-1);
        }
        update();
      });
      offSel = onSelect(() => update());
    })();

    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", down, { passive: true });
    window.addEventListener("touchcancel", down, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      live = false;
      offG();
      offSel();
      cancelAnimationFrame(leadRaf);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", down);
      window.removeEventListener("touchcancel", down);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
      host.replaceChildren();
      stage?.style.setProperty("--lead-o", "0");
    };
  }, [onFail]);

  return <div ref={root} className="phone-stills" data-chapters={CHAPTERS.length} />;
}
