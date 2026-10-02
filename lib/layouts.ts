import * as THREE from "three";
import { CH, INDUSTRIES, smootherstep, clamp01 } from "./story";

// Plate dimensions (world units). One plate = one layer of information.
export const W = 1.5;
export const H = 0.07;
export const D = 1.0;
export const N = 30;
export const PLINTH_H = 0.07;

/** The plate that carries the signal through the whole story. */
export const SIG = 19; // top plate of the WMS stack

export type PlateState = {
  p: THREE.Vector3;
  q: THREE.Quaternion;
  s: THREE.Vector3;
  o: number; // opacity
  r: number; // 0..1 mix toward signal red
  f: number; // 0..1 fade toward the paper colour (quiet, out of focus)
  n: number; // 0..1 neutral finish (when the material would carry no meaning)
};

export type CameraState = { p: THREE.Vector3; t: THREE.Vector3 };

const mk = (): PlateState => ({
  p: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  s: new THREE.Vector3(1, 1, 1),
  o: 1,
  r: 0,
  f: 0,
  n: 0,
});

export const makeStates = () => Array.from({ length: N }, mk);

// Deterministic jitter so the stacks feel physically placed, never random per load.
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const e = new THREE.Euler();
const setQ = (q: THREE.Quaternion, x: number, y: number, z: number) => q.setFromEuler(e.set(x, y, z));

/* ---------------- Fragmentation: six isolated systems ---------------- */

export const STACKS: [number, number, number][] = [
  [-4.3, -0.6, 0.32],
  [-1.5, 1.5, -0.38],
  [1.3, -2.2, 0.12],
  [4.1, 0.8, -0.26],
  [-2.9, -4.6, 0.48],
  [3.4, -5.4, -0.55],
];

function fragments(out: PlateState[], quiet = 0) {
  for (let i = 0; i < N; i++) {
    const s = Math.floor(i / 5);
    const l = i % 5;
    const [cx, cz, ry] = STACKS[s];
    const st = out[i];
    st.p.set(cx + (hash(i) - 0.5) * 0.06, H / 2 + l * 0.085, cz + (hash(i + 50) - 0.5) * 0.06);
    setQ(st.q, 0, ry + (hash(i + 99) - 0.5) * 0.08, 0);
    st.s.set(1, 1, 1);
    st.o = 1;
    st.r = 0;
    st.f = quiet;
    st.n = 0;
  }
}

/* ---------------- Book form: plates stood up and stacked along z ---------------- */

const tmpObj = new THREE.Object3D();
const tmpM = new THREE.Matrix4();
const objM = new THREE.Matrix4();
const standUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

/**
 * Back-to-front plate order for the decision object. Signal sits inside the back layer,
 * plate 0 (ceramic) is the engraved front face.
 */
export const BOOK_ORDER: number[] = (() => {
  const rest = Array.from({ length: N }, (_, i) => i).filter((i) => i !== SIG && i !== 0);
  rest.splice(2, 0, SIG);
  rest.push(0);
  return rest;
})();

/**
 * Each system has its own glaze, so the unified object shows where its layers came from.
 * Plate 0 is porcelain: it becomes the engraved front face of the decision.
 */
export type Tint = "cobalt" | "violet" | "emerald" | "saffron" | "tangerine" | "pink" | "porcelain";
export const SYSTEM_TINT: Tint[] = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];
export const tintOf = (i: number): Tint => (i === 0 ? "porcelain" : SYSTEM_TINT[Math.floor(i / 5)]);
export const FRONT = BOOK_ORDER[N - 1];
export const BACK = BOOK_ORDER[0];

type BookOpts = {
  order: number[];
  pos: [number, number, number];
  rotY: number;
  step?: number;
  groupSize?: number;
  groupGap?: number;
};

function book(out: PlateState[], { order, pos, rotY, step = 0.074, groupSize = 0, groupGap = 0 }: BookOpts) {
  const n = order.length;
  const groups = groupSize ? Math.ceil(n / groupSize) : 1;
  const depth = (n - 1) * step + (groups - 1) * groupGap;
  tmpObj.position.set(pos[0], pos[1], pos[2]);
  tmpObj.rotation.set(0, rotY, 0);
  tmpObj.updateMatrix();
  objM.copy(tmpObj.matrix);
  order.forEach((idx, k) => {
    const g = groupSize ? Math.floor(k / groupSize) : 0;
    const z = k * step + g * groupGap - depth / 2;
    tmpM.compose(new THREE.Vector3(0, 0, z), standUp, new THREE.Vector3(1, 1, 1));
    tmpM.premultiply(objM);
    const st = out[idx];
    tmpM.decompose(st.p, st.q, st.s);
    st.o = 1;
    st.r = idx === SIG ? 1 : 0;
    st.f = 0;
    st.n = 0;
  });
}

/* ---------------- Problem: plates become the inventory chart ---------------- */

export const DAYS = [6, 5, 5, 4, 4, 4, 2];
export const BAR_STEP = 0.135;
export const DAY_X = (d: number) => (d - 3) * 1.0;
export const SAFETY_Y = H / 2 + 2.5 * BAR_STEP;

function chart(out: PlateState[]) {
  const order = Array.from({ length: N }, (_, i) => i).filter((i) => i !== SIG);
  order.push(SIG); // SIG ends up as the top plate of the last day: the one below safety stock
  let k = 0;
  DAYS.forEach((h, d) => {
    for (let l = 0; l < h; l++) {
      const st = out[order[k++]];
      st.p.set(DAY_X(d), H / 2 + l * BAR_STEP, 0);
      setQ(st.q, 0, 0, 0);
      st.s.set(0.6, 1, 0.6);
      st.o = 1;
      st.r = order[k - 1] === SIG ? 1 : 0;
      st.f = 0;
      st.n = 1;
    }
  });
}

/* ---------------- Context: everything connects to the signal ---------------- */

export const RING = (s: number) => {
  const a = (s / 6) * Math.PI * 2 + Math.PI / 6;
  return [Math.sin(a) * 3.1, Math.cos(a) * 2.35, a] as const;
};
export const HUB_Y = 0.75;
export const contextTop = (s: number) => (s === 3 ? 18 : s * 5 + 4);

function context(out: PlateState[]) {
  for (let i = 0; i < N; i++) {
    const st = out[i];
    if (i === SIG) {
      st.p.set(0, HUB_Y, 0);
      setQ(st.q, 0, 0, 0);
      st.s.set(1, 1, 1);
      st.o = 1;
      st.r = 1;
      st.f = 0;
      st.n = 0;
      continue;
    }
    const s = Math.floor(i / 5);
    const l = i % 5;
    const [x, z] = RING(s);
    st.p.set(x, H / 2 + l * 0.08, z);
    setQ(st.q, 0, (hash(s + 7) - 0.5) * 0.24, 0); // squared to the reader, so every label reads
    st.s.set(1, 1, 1);
    st.o = 1;
    st.r = 0;
    st.f = 0;
    st.n = 0;
  }
}

/* ---------------- Public: state for chapter c at local progress t ---------------- */

export function plateStates(c: number, t: number, out: PlateState[]) {
  switch (c) {
    case CH.fragments:
      fragments(out);
      break;
    case CH.signal: {
      fragments(out, 0.55);
      // Everything else steps back out of focus; only the signal stays near.
      for (let i = 0; i < N; i++) {
        if (i === SIG) continue;
        out[i].p.x *= 2.5;
        out[i].p.z -= 5.5;
      }
      const st = out[SIG];
      st.p.set(0, 1.25, 1.6);
      setQ(st.q, 0.42, -0.3 + t * 0.12, 0.02);
      st.o = 1;
      st.r = 1;
      st.f = 0;
      break;
    }
    case CH.problem:
      chart(out);
      break;
    case CH.context:
      context(out);
      break;
    case CH.decision:
      book(out, { order: BOOK_ORDER, pos: [0, D / 2 + 0.002, 0], rotY: 0.62 - smootherstep(0, 1, t) * 0.34 });
      break;
    case CH.control:
      book(out, {
        order: BOOK_ORDER,
        pos: [2.0, D / 2 + 0.002, 0],
        rotY: 0.62 - t * 0.05,
        groupSize: 6,
        groupGap: 1.12,
      });
      break;
    case CH.scale: {
      for (let k = 0; k < 5; k++) {
        book(out, {
          order: BOOK_ORDER.slice(k * 6, k * 6 + 6),
          pos: [(k - 2) * 2.2, D / 2 + 0.002, 0],
          rotY: 0.32,
        });
      }
      break;
    }
    case CH.industries: {
      book(out, { order: BOOK_ORDER, pos: [0, D / 2 + PLINTH_H + 0.002, 0], rotY: 0.32 + industryF(t) * Math.PI });
      break;
    }
    case CH.final: {
      for (let i = 0; i < N; i++) {
        const st = out[i];
        st.p.set(0, H / 2, 0);
        setQ(st.q, 0, 0.18, 0);
        st.s.set(1, 1, 1);
        st.o = i === FRONT ? 1 : 0;
        st.r = 0;
        st.f = 0;
        st.n = 0;
      }
      break;
    }
  }
  return out;
}

/** Industry float (0..5). Holds on each industry, turns half a revolution between them. */
export function industryF(t: number) {
  const n = INDUSTRIES.length - 1;
  const raw = clamp01((t - 0.04) / 0.86) * n;
  const k = Math.min(Math.floor(raw), n - 1);
  return k + smootherstep(0.35, 0.85, raw - k);
}

/* ---------------- Camera ---------------- */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function cameraState(c: number, t: number, out: CameraState) {
  const set = (p: THREE.Vector3, tg: THREE.Vector3) => {
    out.p.copy(p);
    out.t.copy(tg);
  };
  switch (c) {
    case CH.fragments:
      set(v(0, 8.6 - t * 0.5, 15.5 - t * 1.0), v(0, 1.35, -1.6));
      break;
    case CH.signal:
      set(v(0.1, 2.8, 7.6 - t * 0.4), v(-0.75, 1.15, 1.2));
      break;
    case CH.problem:
      set(v(-0.3, 2.9, 14.2 - t * 0.4), v(-1.0, 1.2, 0));
      break;
    case CH.context:
      set(v(-1.6, 9.6 - t * 0.5, 11.4 - t * 0.4), v(-2.15, -0.15, 0.2));
      break;
    case CH.decision:
      set(v(0.2, 1.05, 5.6 - t * 0.35), v(0, 0.42, 0));
      break;
    case CH.control:
      set(v(2.3, 2.4, 11.4), v(1.55, 0.62, 0.2));
      break;
    case CH.scale:
      set(v(0, 2.6, 14.5 - t * 0.6), v(0, 0.9, 0));
      break;
    case CH.industries:
      set(v(0, 1.75, 6.6), v(0, 0.3, 0));
      break;
    case CH.final:
      set(v(0, 3.4, 6.8), v(0, -0.25, 0));
      break;
  }
  return out;
}
