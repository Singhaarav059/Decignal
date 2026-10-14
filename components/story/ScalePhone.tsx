"use client";

import { useEffect, useRef } from "react";
import { usePhone } from "@/lib/device";
import { CH, FUNCTIONS, SCALE_DEAL, clamp01, localIn, scaleDeal, smootherstep, smoothstep, store, subscribe, weight } from "@/lib/story";
import { FACES, STORY_UI } from "@/lib/copy";
import { FACE_H, FACE_W, HAND_ART_BOX, drawFace, drawHandArt, readFonts, type FaceSpec } from "../three/faces";
import { goToFunction } from "./ScaleApps";

/** The hand as dealt on wide screens (actors/cards): the five functions, then the glass layer on top. */
const HAND_FACES: FaceSpec[] = [...FUNCTIONS.map((_, k): FaceSpec => ({ kind: "function", k })), { kind: "glass" }];
const LAST = SCALE_DEAL - 1;
/** Upright cards: the portrait grid the hand faces are drawn on. */
const ASPECT = FACE_H / FACE_W;
/** The turn between neighbouring cards (radians), about the foot of each card. */
const ROLL = 0.035;
/** The widest strip a covered card shows (its badge and the start of its name), in card widths. */
const STRIP_MAX = 0.45;
/** Room above the cards for the one being dealt to rise as it swings in, in card heights. */
const RISE = 0.07;
/** The art canvas over the face's empty box. */
const ART_BOX = { left: `${HAND_ART_BOX.x * 100}%`, top: `${HAND_ART_BOX.y * 100}%`, width: `${HAND_ART_BOX.w * 100}%`, height: `${HAND_ART_BOX.h * 100}%` };
/** The art builds over this long as its card lands; the card in front then keeps moving at ART_FPS. */
const ART_PLAY = 1.5;
const ART_FPS = 30;

type Size = { cw: number; ch: number; w: number; h: number; fixed: number };

/** The largest card that leaves the full hand's covered cards a readable strip each. */
function sizeFor(cw: number, ch: number): Size {
  const turn = (LAST / 2) * ROLL;
  let h = Math.min(ch / (1 + RISE), 320);
  let w = h * ASPECT;
  // The front card plus what the outer cards' tilt adds at either side (each turns about its foot, so
  // its top corner leans out by its height).
  let fixed = w * Math.cos(turn) + 2 * h * Math.sin(turn);
  // Five strips of at least a fifth of a card (the badge) must fit beside it.
  while (h > 80 && (cw - fixed) / LAST < w * 0.2) {
    h -= 4;
    w = h * ASPECT;
    fixed = w * Math.cos(turn) + 2 * h * Math.sin(turn);
  }
  return { cw, ch, w, h, fixed };
}

/**
 * Phones only, in the band above the story card: Scale's hand at reading size, in place of the 3D one.
 * The functions are dealt one per step along the scroll, each in its colour with its evidence chart,
 * and the glass layer lands last over all five, as on wide screens. The hand stays centred and closes
 * up as it fills, so a covered card always shows its badge. Tapping the card in front scrolls on to the
 * next step; tapping a covered one scrolls back to it.
 */
export function ScalePhone() {
  // Built only on a phone: elsewhere the cards are read in 3D, and the hand would draw for nothing.
  return usePhone() ? <PhoneHand /> : null;
}

function PhoneHand() {
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const faces = useRef<(HTMLCanvasElement | null)[]>([]);
  const arts = useRef<(HTMLCanvasElement | null)[]>([]);
  const front = useRef(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size: Size | null = null;
    let scale = 0;
    let deal = -1;
    const art = HAND_FACES.map(() => ({ p: 0, t: 0, wait: 0 }));
    const last = HAND_FACES.map(() => "");

    const drawArt = (i: number) => {
      const c = arts.current[i];
      if (c && scale) drawHandArt(c, HAND_FACES[i], art[i].p, art[i].t, scale, true);
    };

    /** Sizes the cards and draws their faces at the device pixels they fill. */
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      size = sizeFor(r.width, r.height);
      el.style.setProperty("--hand-w", `${size.w.toFixed(1)}px`);
      el.style.setProperty("--hand-h", `${size.h.toFixed(1)}px`);
      const px = Math.round(size.w * window.devicePixelRatio);
      const s = px / FACE_H;
      if (s !== scale) {
        scale = s;
        readFonts();
        HAND_FACES.forEach((spec, i) => {
          const f = faces.current[i];
          if (f) {
            f.width = px;
            f.height = Math.round(FACE_W * s);
            drawFace(f, spec, false, s, true);
          }
          const a = arts.current[i];
          if (a) {
            a.width = Math.round(px * HAND_ART_BOX.w);
            a.height = Math.round(FACE_W * s * HAND_ART_BOX.h);
            drawArt(i);
          }
        });
      }
      deal = -1;
      place(store.g);
    };

    /** Lays the hand out for story position g: dealt cards on an arc, centred, the next one on its way. */
    const place = (g: number) => {
      if (!size || weight(CH.scale, g) <= 0) return;
      // Back on screen, the card in front picks up its motion again.
      wake();
      const d = scaleDeal(localIn(CH.scale, g));
      if (d === deal) return;
      deal = d;
      const { cw, w, h, fixed } = size;
      // The strips narrow as the hand fills, so the full hand always fits the band.
      const step = Math.min(w * STRIP_MAX, (cw - fixed) / Math.max(d, 1));
      front.current = Math.min(Math.round(d), LAST);
      HAND_FACES.forEach((_, i) => {
        const card = cards.current[i];
        if (!card) return;
        // Card i lands as the deal goes from i - 1 to i (the first is in from the start).
        const k = clamp01(d - (i - 1));
        const a = (i - d / 2) * ROLL;
        let x = (step / ROLL) * Math.sin(a);
        let y = (step / ROLL) * (1 - Math.cos(a));
        let r = a;
        let o = 1;
        if (k < 1) {
          // On its way: in from past the band's right edge, rising over the hand and turning into its slot.
          const e = smootherstep(0, 1, k);
          const x0 = cw / 2 + w * 0.75;
          x = x0 + (x - x0) * e;
          y -= Math.sin(Math.PI * e) * RISE * h;
          r += (1 - e) * 0.45;
          o = smoothstep(0, 0.3, k);
        }
        const v = k <= 0 ? "off" : `${x.toFixed(1)}|${y.toFixed(1)}|${r.toFixed(4)}|${o.toFixed(3)}`;
        if (v === last[i]) return;
        last[i] = v;
        card.style.visibility = k <= 0 ? "hidden" : "visible";
        if (k <= 0) return;
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(4)}rad)`;
        card.style.opacity = o.toFixed(3);
      });
    };

    // The art: each card's builds as it lands; the card in front keeps its idle motion. Runs only while
    // the chapter is on screen and something moves.
    let raf = 0;
    let then = 0;
    const tick = (now: number) => {
      raf = 0;
      const dt = then ? Math.min((now - then) / 1000, 1 / 20) : 0;
      then = now;
      if (weight(CH.scale, store.g) <= 0) {
        then = 0;
        return;
      }
      let busy = false;
      HAND_FACES.forEach((_, i) => {
        const s = art[i];
        const dealt = deal >= i - 0.15;
        const was = s.p;
        s.p = !dealt ? 0 : still.matches ? 1 : Math.min(1, s.p + dt / ART_PLAY);
        let redraw = s.p !== was;
        if (dealt && s.p < 1) busy = true;
        if (i === front.current && s.p >= 1 && !still.matches) {
          busy = true;
          s.t += dt;
          s.wait += dt;
          if (s.wait >= 1 / ART_FPS) {
            s.wait = 0;
            redraw = true;
          }
        } else if (s.t !== 0 && i !== front.current) {
          // Stops where it is when another card comes in front; its idle motion starts again from rest.
          s.t = 0;
          redraw = true;
        }
        if (redraw) drawArt(i);
      });
      if (busy) raf = requestAnimationFrame(tick);
      else then = 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      scale = 0;
      fit();
    });
    const off = subscribe(place);
    return () => {
      live = false;
      ro.disconnect();
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  // The card in front moves on to the next step (the glass, then back to the first function); a covered
  // card is read again by scrolling back to it.
  const pick = (i: number) => goToFunction(i === front.current ? (i + 1) % SCALE_DEAL : i);

  return (
    <div className="scale-phone">
      <div ref={box} className="phone-hand" role="group" aria-label={STORY_UI.phoneAria}>
        {HAND_FACES.map((spec, i) => {
          const name = spec.kind === "function" ? FUNCTIONS[spec.k].name : FACES.layer.title;
          const text = spec.kind === "function" ? FUNCTIONS[spec.k].decision : FACES.layer.body;
          return (
            <button
              key={i}
              type="button"
              ref={(b) => {
                cards.current[i] = b;
              }}
              className="phone-hand-card"
              data-glass={spec.kind === "glass" || undefined}
              style={{ zIndex: i + 1, visibility: "hidden" }}
              aria-label={`${name}: ${text}`}
              onClick={() => pick(i)}
            >
              <canvas
                ref={(c) => {
                  faces.current[i] = c;
                }}
                className="phone-hand-face"
                aria-hidden
              />
              <canvas
                ref={(c) => {
                  arts.current[i] = c;
                }}
                className="phone-hand-art"
                style={ART_BOX}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
