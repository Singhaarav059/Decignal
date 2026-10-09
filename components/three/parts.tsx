"use client";

// Shared real-world parts: wheels, totes, bearings, pallets. Geometry is built once in code,
// merged per material, and reused, so detailed objects stay cheap to draw.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { aluminium, chrome, darkGlass, plastic, rubber, shipLabel, steel, tyre, wood, wrap } from "./materials";

/* ---------------- Geometry helpers ---------------- */

const geos = new Map<string, THREE.BufferGeometry>();
export function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}

/** Normalises attributes so any set of primitives can be merged into one draw call. */
export function merge(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p.clone();
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  });
  const m = mergeGeometries(flat, false)!;
  flat.forEach((g) => g.dispose());
  return m;
}

export const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
export const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0, seg = 3) =>
  new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)).translate(x, y, z);
/** Cylinder whose axis runs along X. */
export const cylX = (r: number, len: number, x = 0, y = 0, z = 0, seg = 24) =>
  new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2).translate(x, y, z);
/** Cylinder whose axis runs along Z. */
export const cylZ = (r: number, len: number, x = 0, y = 0, z = 0, seg = 24) =>
  new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z);
export const cylY = (r: number, len: number, x = 0, y = 0, z = 0, seg = 24, r2 = r) =>
  new THREE.CylinderGeometry(r, r2, len, seg).translate(x, y, z);

/** A side profile (x, y) extruded across Z and centred, with a soft bevel on its edges. */
export function profile(points: [number, number][], depth: number, bevel = 0.04) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 24 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/* ---------------- Wheel ---------------- */

type WheelSpec = { r: number; w: number; dual?: boolean; rim?: "steel" | "alu" };

function tyreGeometry(r: number, w: number) {
  const h = w / 2;
  const rim = r * 0.6;
  const side: [number, number][] = [
    [rim, -h * 0.86],
    [r * 0.72, -h * 0.97],
    [r * 0.88, -h],
    [r * 0.965, -h * 0.9],
    [r * 0.995, -h * 0.72],
  ];
  const s1 = new THREE.LatheGeometry(side.map(([a, b]) => new THREE.Vector2(a, b)), 72);
  const s2 = new THREE.LatheGeometry(side.map(([a, b]) => new THREE.Vector2(a, -b)).reverse(), 72);
  const sidewall = merge([s1, s2]).rotateX(Math.PI / 2);
  const band = new THREE.LatheGeometry(
    [
      [r * 0.995, -h * 0.72],
      [r, -h * 0.4],
      [r, h * 0.4],
      [r * 0.995, h * 0.72],
    ].map(([a, b]) => new THREE.Vector2(a, b)),
    72,
  ).rotateX(Math.PI / 2);
  // Tread blocks: the lathe U runs around the tyre, so the tread repeats around the circumference.
  const uv = band.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 46);
  return { sidewall, band };
}

function rimGeometry(r: number, w: number, dual: boolean) {
  const h = w / 2;
  const rr = r * 0.6;
  // Dished steel disc, seen from the outside: rim lip, dish, hub.
  const face = new THREE.LatheGeometry(
    [
      [rr * 1.02, h * 0.86],
      [rr * 0.97, h * 0.8],
      [rr * 0.93, h * (dual ? 0.3 : 0.55)],
      [rr * 0.55, h * (dual ? 0.25 : 0.5)],
      [rr * 0.42, h * (dual ? 0.42 : 0.66)],
      [rr * 0.3, h * (dual ? 0.44 : 0.68)],
      [0.0001, h * (dual ? 0.44 : 0.68)],
    ].map(([a, b]) => new THREE.Vector2(a, b)),
    48,
  ).rotateX(Math.PI / 2);
  const back = new THREE.CylinderGeometry(rr * 0.98, rr * 0.98, w * 0.8, 48, 1, true).rotateX(Math.PI / 2);
  return merge([face, back]);
}

export function wheelParts({ r, w, dual = false }: WheelSpec) {
  const key = `${r}-${w}-${dual}`;
  const tw = dual ? w / 2 - 0.01 : w;
  const tyres = geo(`tyre-${key}`, () => {
    const one = tyreGeometry(r, tw);
    if (!dual) return merge([one.sidewall]);
    return merge([one.sidewall.clone().translate(0, 0, w / 4 + 0.005), one.sidewall.clone().translate(0, 0, -w / 4 - 0.005)]);
  });
  const bands = geo(`band-${key}`, () => {
    const one = tyreGeometry(r, tw);
    if (!dual) return one.band;
    return merge([one.band.clone().translate(0, 0, w / 4 + 0.005), one.band.clone().translate(0, 0, -w / 4 - 0.005)]);
  });
  const rimG = geo(`rim-${key}`, () => {
    const g = rimGeometry(r, tw, dual);
    return dual ? g.translate(0, 0, w / 4 + 0.005) : g;
  });
  const nuts = geo(`nuts-${key}`, () => {
    const rr = r * 0.6;
    const zf = (dual ? w / 4 + 0.005 : 0) + (tw / 2) * (dual ? 0.46 : 0.7);
    const parts: THREE.BufferGeometry[] = [];
    const n = r > 0.4 ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      parts.push(new THREE.CylinderGeometry(rr * 0.045, rr * 0.05, rr * 0.08, 6).rotateX(Math.PI / 2).translate(Math.cos(a) * rr * 0.36, Math.sin(a) * rr * 0.36, zf));
    }
    parts.push(new THREE.CylinderGeometry(rr * 0.2, rr * 0.24, rr * 0.16, 32).rotateX(Math.PI / 2).translate(0, 0, zf + rr * 0.02));
    return merge(parts);
  });
  // Hand holes in the disc: dark recesses between the nuts and the rim lip.
  const holes = geo(`holes-${key}`, () => {
    const rr = r * 0.6;
    const zf = (dual ? w / 4 + 0.005 : 0) + (tw / 2) * (dual ? 0.28 : 0.53);
    const parts: THREE.BufferGeometry[] = [];
    const n = r > 0.4 ? 8 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      parts.push(new THREE.CylinderGeometry(rr * 0.09, rr * 0.09, 0.004, 20).rotateX(Math.PI / 2).translate(Math.cos(a) * rr * 0.72, Math.sin(a) * rr * 0.72, zf));
    }
    return merge(parts);
  });
  return { tyres, bands, rimG, nuts, holes };
}

/**
 * A wheel whose axle runs along Z, outer face toward +Z. Mirror with `side={-1}`.
 * `rimColor` paints the disc; trucks use white or silver, forklifts use the body colour.
 */
export function Wheel({ spec, side = 1, rimColor = "#E9EAEC", spin }: { spec: WheelSpec; side?: 1 | -1; rimColor?: string; spin?: (g: THREE.Group | null) => void }) {
  const p = wheelParts(spec);
  return (
    <group scale-z={side}>
      <group ref={spin}>
        <mesh geometry={p.tyres} material={rubber()} castShadow receiveShadow />
        <mesh geometry={p.bands} material={tyre()} castShadow />
        <mesh geometry={p.rimG} material={spec.rim === "alu" ? aluminium(0.22) : rimEnamel(rimColor)} castShadow />
        <mesh geometry={p.nuts} material={chrome()} />
        <mesh geometry={p.holes} material={steel("#202226", 0.6)} />
      </group>
    </group>
  );
}

const rimMats = new Map<string, THREE.Material>();
function rimEnamel(color: string) {
  let m = rimMats.get(color);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    rimMats.set(color, m);
  }
  return m;
}

/* ---------------- Tote: a stackable plastic container ---------------- */

/** A stock tote, in metres. */
export const CRATE = { w: 0.6, h: 0.3, d: 0.42 };
const T = { w: CRATE.w, h: CRATE.h, d: CRATE.d };

/** Body, lip and moulded ribs as one shell. `open` leaves a recess on top for contents. */
function toteShell(open: boolean) {
  return geo(`tote-${open}`, () => {
    const { w, h, d } = T;
    const parts: THREE.BufferGeometry[] = [];
    // Body is slightly narrower than the lip, as real nesting totes are.
    parts.push(rbox(w - 0.03, h - 0.045, d - 0.03, 0.025, 0, -0.022, 0, 3));
    // Top lip: a solid rim on a lidded tote, a frame around the opening on an open one
    if (open) {
      const t = 0.03;
      for (const s of [-1, 1]) {
        parts.push(rbox(w + 0.006, 0.045, t, 0.01, 0, h / 2 - 0.0225, s * (d / 2 + 0.003 - t / 2), 2));
        parts.push(rbox(t, 0.045, d + 0.006, 0.01, s * (w / 2 + 0.003 - t / 2), h / 2 - 0.0225, 0, 2));
      }
    } else parts.push(rbox(w + 0.006, 0.045, d + 0.006, 0.014, 0, h / 2 - 0.0225, 0, 2));
    // Foot band
    parts.push(rbox(w - 0.045, 0.018, d - 0.045, 0.008, 0, -h / 2 + 0.009, 0, 2));
    // Vertical ribs on the long sides and short ends
    const ribs = 7;
    for (let i = 0; i < ribs; i++) {
      const x = -w / 2 + 0.06 + (i * (w - 0.12)) / (ribs - 1);
      for (const s of [-1, 1]) parts.push(rbox(0.016, h - 0.07, 0.012, 0.005, x, -0.03, s * (d / 2 - 0.012)));
    }
    for (let i = 0; i < 4; i++) {
      const z = -d / 2 + 0.07 + (i * (d - 0.14)) / 3;
      for (const s of [-1, 1]) parts.push(rbox(0.012, h - 0.07, 0.016, 0.005, s * (w / 2 - 0.012), -0.03, z));
    }
    // A horizontal stiffening band below the lip
    parts.push(rbox(w - 0.016, 0.016, d - 0.016, 0.006, 0, h / 2 - 0.07, 0, 2));
    if (!open) {
      // Attached lid: two hinged flaps with a ridge where they meet
      parts.push(rbox(w - 0.004, 0.014, d - 0.004, 0.006, 0, h / 2 + 0.007, 0, 2));
      parts.push(rbox(w - 0.06, 0.008, 0.01, 0.003, 0, h / 2 + 0.017, 0, 2));
    }
    return merge(parts);
  });
}

/** Dark parts: handle cut-outs on both ends, and the open recess. */
function toteDark(open: boolean) {
  return geo(`tote-dark-${open}`, () => {
    const { w, h, d } = T;
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) parts.push(rbox(0.006, 0.05, 0.16, 0.012, s * (w / 2 - 0.006), h / 2 - 0.105, 0, 3));
    if (open) parts.push(box(w - 0.05, 0.004, d - 0.05, 0, h / 2 - 0.042, 0));
    return merge(parts);
  });
}

/** White card in its label holder on the long side. */
const toteLabel = () => geo("tote-label", () => merge([rbox(0.2, 0.085, 0.004, 0.006, 0.12, h0(), T.d / 2 - 0.008)]));
const h0 = () => -0.025;

export function Tote({ material, open = false, children }: { material: THREE.Material; open?: boolean; children?: React.ReactNode }) {
  return (
    <group>
      <mesh geometry={toteShell(open)} material={material} castShadow receiveShadow />
      <mesh geometry={toteDark(open)} material={plastic("#2B2A27", 0.7)} />
      <mesh geometry={toteLabel()} material={plastic("#FFFFFF", 0.6)} />
      {children}
    </group>
  );
}

/* ---------------- Bearing: deep-groove ball bearing ---------------- */

export function bearingGeometry() {
  return geo("bearing", () => {
    const ring = (ro: number, ri: number, wd: number) =>
      new THREE.LatheGeometry(
        [
          [ri + 0.002, -wd / 2],
          [ro - 0.002, -wd / 2],
          [ro, -wd / 2 + 0.002],
          [ro, wd / 2 - 0.002],
          [ro - 0.002, wd / 2],
          [ri + 0.002, wd / 2],
          [ri, wd / 2 - 0.002],
          [ri, -wd / 2 + 0.002],
          [ri + 0.002, -wd / 2],
        ].map(([a, b]) => new THREE.Vector2(a, b)),
        48,
      );
    const parts: THREE.BufferGeometry[] = [ring(0.06, 0.047, 0.026), ring(0.033, 0.02, 0.026)];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      parts.push(new THREE.SphereGeometry(0.0085, 14, 10).translate(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04));
    }
    return merge(parts);
  });
}

const bearingSteel = () => steel("#D7DADF", 0.16);
export function Bearing(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh geometry={bearingGeometry()} material={bearingSteel()} castShadow />
    </group>
  );
}

/* ---------------- Pallet with a wrapped load of totes ---------------- */

/** Euro pallet, 1.2 x 0.8 m, built at 1 unit = 1 m. */
export function palletGeometry() {
  return geo("pallet", () => {
    const parts: THREE.BufferGeometry[] = [];
    const L = 1.2;
    const W = 0.8;
    for (let i = 0; i < 5; i++) parts.push(box(L, 0.022, i % 2 ? 0.1 : 0.145, 0, 0.133, -W / 2 + 0.072 + (i * (W - 0.144)) / 4));
    for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) parts.push(box(L, 0.022, 0.1, 0, 0.111, z));
    for (const x of [-L / 2 + 0.05, 0, L / 2 - 0.05]) for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) parts.push(box(0.1, 0.078, z === 0 ? 0.1 : 0.1, x, 0.061, z));
    for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) parts.push(box(L, 0.022, 0.1, 0, 0.011, z));
    return merge(parts);
  });
}

/** Small totes stacked on a pallet, 3 x 2 x 3, at 1 unit = 1 m. */
function loadGeometry() {
  return geo("load", () => {
    const parts: THREE.BufferGeometry[] = [];
    const tw = 0.39;
    const td = 0.39;
    const th = 0.3;
    for (let l = 0; l < 3; l++)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) {
          const x = -0.39 + i * 0.395;
          const z = -0.197 + j * 0.394;
          const y = 0.144 + th / 2 + l * (th + 0.005);
          parts.push(rbox(tw - 0.02, th - 0.02, td - 0.02, 0.02, x, y - 0.006, z, 2));
          parts.push(rbox(tw, 0.02, td, 0.006, x, y + th / 2 - 0.01, z, 1));
        }
    return merge(parts);
  });
}

function labelGeometry() {
  return geo("pallet-labels", () => {
    const side = new THREE.PlaneGeometry(0.21, 0.145).translate(0.28, 0.64, 0.408);
    const end = new THREE.PlaneGeometry(0.21, 0.145).rotateY(Math.PI / 2).translate(0.608, 0.64, -0.14);
    return merge([side, end]);
  });
}

export function LoadedPallet({ tote, wrapped = true }: { tote: THREE.Material; wrapped?: boolean }) {
  return (
    <group>
      <mesh geometry={palletGeometry()} material={wood()} castShadow receiveShadow />
      <mesh geometry={loadGeometry()} material={tote} castShadow receiveShadow />
      {wrapped && (
        <mesh position-y={0.144 + 0.46} material={wrap()} renderOrder={2}>
          <boxGeometry args={[1.21, 0.92, 0.81]} />
        </mesh>
      )}
      {/* Shipping labels on the long side and one end */}
      <mesh geometry={labelGeometry()} material={shipLabel()} />
    </group>
  );
}

/** Dark glass helper re-exported for models that compose windows. */
export { darkGlass };
