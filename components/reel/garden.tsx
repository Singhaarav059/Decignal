"use client";

// The Japanese details of the bay, each one built in code: black pines along the sea wall, cherry
// trees by the promenade, stone lanterns that light at dusk, and a vermilion torii standing in the
// water off a small islet. Metres throughout, ground at y = 0.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { box, cylY, geo, merge } from "../three/parts";
import { nightGlow } from "./glow";
import { reel } from "@/lib/reel";

/* ------------------------------------------------------------------ */
/* Materials                                                            */
/* ------------------------------------------------------------------ */

const mats = new Map<string, THREE.Material>();
function mat(key: string, make: () => THREE.Material) {
  let m = mats.get(key);
  if (!m) mats.set(key, (m = make()));
  return m;
}
const soft = (color: string, rough = 0.9) => mat(`soft-${color}-${rough}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));

export const STONE = "#A7B0BC";
export const VERMILION = "#D9563F";
const BARK = "#4D5666";
const PINE = ["#3E5E57", "#47695E", "#365449"];
const BLOSSOM = ["#F3C6D1", "#EDB4C4", "#F7D7DF"];

function rng(seed: number) {
  let s = Math.abs(Math.round(seed * 7919)) + 3;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A lumpy mass of foliage: a sphere pushed in and out, welded so it shades smoothly. */
function lump(seed: number, detail = 2) {
  return geo(`lump-${seed}-${detail}`, () => {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 4.1 + seed) * Math.cos(v.z * 3.7 - v.y * 2.3 + seed) * 0.1 + Math.sin(v.x * 9 + v.z * 7 + seed) * 0.04;
      v.multiplyScalar(1 + n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    const w = mergeVertices(g.index ? g.toNonIndexed() : g, 1e-4);
    w.computeVertexNormals();
    return w;
  });
}

/** A tapering limb along a curve, as one tube. */
function limb(points: [number, number, number][], r0: number, r1: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, 16, 1, 7, false);
  // Taper: scale each ring's radius from r0 to r1 along the tube.
  const p = g.attributes.position as THREE.BufferAttribute;
  const ring = 8;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j < ring; j++) {
      const k = i * ring + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Black pine                                                           */
/* ------------------------------------------------------------------ */

/** A Japanese black pine: a leaning, twisting trunk and flat cloud-pads of needles. */
function pineParts(seed: number) {
  return geo(`pine-${seed}`, () => {
    const r = rng(seed);
    const lean = (r() - 0.5) * 2.2;
    const trunk: [number, number, number][] = [
      [0, 0, 0],
      [lean * 0.3, 2.2, (r() - 0.5) * 0.6],
      [lean * 0.8, 4.4, (r() - 0.5) * 0.9],
      [lean * 1.0, 6.4, (r() - 0.5) * 0.8],
      [lean * 0.7, 8.0, 0],
    ];
    const parts = [limb(trunk, 0.32, 0.12)];
    return merge(parts);
  });
}

type PadSpec = { x: number; y: number; z: number; rx: number; ry: number; rz: number; c: number };
function pinePads(seed: number): { pads: PadSpec[]; branches: THREE.BufferGeometry } {
  const r = rng(seed + 5);
  const lean = (rng(seed)() - 0.5) * 2.2;
  const pads: PadSpec[] = [];
  const branches: THREE.BufferGeometry[] = [];
  const levels = [3.2, 4.6, 5.8, 7.0, 8.2];
  levels.forEach((y, i) => {
    const k = y / 8;
    const cx = lean * Math.min(k * 1.1, 1);
    const n = i === levels.length - 1 ? 1 : 2;
    for (let j = 0; j < n; j++) {
      const ang = r() * Math.PI * 2;
      const reach = i === levels.length - 1 ? 0 : 1.4 + r() * 1.6 * (1 - k * 0.5);
      const px = cx + Math.cos(ang) * reach;
      const pz = Math.sin(ang) * reach * 0.8;
      const size = 1.2 + (1 - k) * 1.1 + r() * 0.5;
      pads.push({ x: px, y: y + 0.2, z: pz, rx: size, ry: size * 0.36, rz: size * 0.85, c: Math.floor(r() * PINE.length) });
      if (reach > 0) branches.push(limb([[cx, y - 0.3, 0], [(cx + px) / 2, y + 0.15, pz / 2], [px, y + 0.1, pz]], 0.1, 0.05));
    }
  });
  return { pads, branches: merge(branches) };
}

export function Pine({ seed = 1, h = 8, ...p }: React.ComponentProps<"group"> & { seed?: number; h?: number }) {
  const { pads, branches } = useMemo(() => pinePads(seed), [seed]);
  return (
    <group {...p} scale={h / 8.6}>
      <mesh geometry={pineParts(seed)} material={soft(BARK)} castShadow />
      <mesh geometry={branches} material={soft(BARK)} castShadow />
      {pads.map((d, i) => (
        <mesh key={i} geometry={lump(seed * 10 + i)} material={soft(PINE[d.c], 0.85)} position={[d.x, d.y, d.z]} scale={[d.rx, d.ry, d.rz]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cherry                                                               */
/* ------------------------------------------------------------------ */

export function Cherry({ seed = 1, h = 6.5, ...p }: React.ComponentProps<"group"> & { seed?: number; h?: number }) {
  const { wood, puffs } = useMemo(() => {
    const r = rng(seed + 31);
    const limbs: THREE.BufferGeometry[] = [limb([[0, 0, 0], [0.2, 1.4, 0.1], [0.1, 2.6, 0]], 0.26, 0.17)];
    const puffs: PadSpec[] = [];
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + r() * 0.6;
      const reach = 1.6 + r() * 1.3;
      const ex = Math.cos(ang) * reach;
      const ez = Math.sin(ang) * reach * 0.85;
      const ey = 3.8 + r() * 1.3;
      limbs.push(limb([[0.1, 2.4, 0], [ex * 0.5, 3.2 + r() * 0.4, ez * 0.5], [ex, ey, ez]], 0.13, 0.05));
      const s = 1.3 + r() * 0.7;
      puffs.push({ x: ex, y: ey + 0.3, z: ez, rx: s, ry: s * 0.78, rz: s, c: Math.floor(r() * BLOSSOM.length) });
    }
    puffs.push({ x: 0, y: 5.2, z: 0, rx: 2.0, ry: 1.4, rz: 1.9, c: 0 });
    puffs.push({ x: 0.8, y: 4.4, z: -0.9, rx: 1.5, ry: 1.1, rz: 1.4, c: 2 });
    return { wood: merge(limbs), puffs };
  }, [seed]);
  return (
    <group {...p} scale={h / 6.5}>
      <mesh geometry={wood} material={soft("#474D5B")} castShadow />
      {puffs.map((d, i) => (
        <mesh key={i} geometry={lump(seed * 13 + i, 3)} material={soft(BLOSSOM[d.c], 0.8)} position={[d.x, d.y, d.z]} scale={[d.rx, d.ry, d.rz]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Petals drifting down past the promenade's cherry trees: a few dozen, slow, never in a hurry. */
export function Petals({ centres }: { centres: [number, number][] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = centres.length * 14;
  const seeds = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: count }, (_, i) => ({ c: centres[i % centres.length], a: r() * Math.PI * 2, d: 0.5 + r() * 3.4, sp: 0.25 + r() * 0.35, ph: r() * 10, spin: r() * 6 }));
  }, [centres, count]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(0.09, 0.06, 0.09), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reel.calm ? 0 : clock.elapsedTime;
    seeds.forEach((s, i) => {
      // Each petal falls from the canopy (about 5 m) to the ground, drifting downwind, then starts over.
      const life = ((t * s.sp * 0.25 + s.ph) % 1 + 1) % 1;
      const y = 5.2 * (1 - life);
      pos.set(s.c[0] + Math.cos(s.a) * s.d + life * 2.2 + Math.sin(t * 0.8 + s.ph) * 0.25, y, s.c[1] + Math.sin(s.a) * s.d * 0.8);
      e.set(t * s.spin * 0.3, s.ph, t * s.spin * 0.2);
      q.setFromEuler(e);
      m4.compose(pos, q, sc);
      m.setMatrixAt(i, m4);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <circleGeometry args={[1, 6]} />
      <meshStandardMaterial color="#F6CCD6" side={THREE.DoubleSide} roughness={0.8} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Stone lantern (Kasuga style)                                         */
/* ------------------------------------------------------------------ */

function lanternStone() {
  return geo("lantern-stone", () =>
    merge([
      cylY(0.42, 0.18, 0, 0.09, 0, 6, 0.5), // foot
      cylY(0.3, 0.14, 0, 0.25, 0, 6, 0.4),
      cylY(0.12, 0.85, 0, 0.74, 0, 16), // shaft
      cylY(0.36, 0.16, 0, 1.24, 0, 6, 0.24), // platform
      // fire box corner posts
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return box(0.07, 0.36, 0.07, Math.cos(a) * 0.24, 1.5, Math.sin(a) * 0.24);
      }),
      cylY(0.3, 0.06, 0, 1.33, 0, 6),
      cylY(0.04, 0.12, 0, 2.06, 0, 6, 0.48), // roof underside
      new THREE.ConeGeometry(0.5, 0.34, 6).translate(0, 2.24, 0), // roof
      cylY(0.07, 0.1, 0, 2.45, 0, 12),
      new THREE.SphereGeometry(0.1, 12, 8).scale(1, 1.3, 1).translate(0, 2.58, 0), // jewel
    ]),
  );
}

export function StoneLantern(p: React.ComponentProps<"group">) {
  return (
    <group {...p}>
      <mesh geometry={lanternStone()} material={soft(STONE, 0.95)} castShadow receiveShadow />
      {/* The light inside the fire box, through its paper windows */}
      <mesh position-y={1.52} material={nightGlow("#FFD9A0", 2.2, 0.0, "#DDE0E5")}>
        <cylinderGeometry args={[0.2, 0.2, 0.32, 6]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Torii, standing in the water off a small islet                       */
/* ------------------------------------------------------------------ */

function kasagi() {
  // The top beam, its ends sweeping up: a side profile extruded through the beam's depth.
  return geo("kasagi", () => {
    const s = new THREE.Shape();
    const L = 5.6;
    s.moveTo(-L, 0.55);
    s.quadraticCurveTo(-L * 0.55, 0.05, 0, 0.0);
    s.quadraticCurveTo(L * 0.55, 0.05, L, 0.55);
    s.lineTo(L + 0.1, 0.95);
    s.quadraticCurveTo(L * 0.55, 0.5, 0, 0.45);
    s.quadraticCurveTo(-L * 0.55, 0.5, -L - 0.1, 0.95);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false, curveSegments: 20 });
    g.translate(0, 0, -0.35);
    g.computeVertexNormals();
    return g;
  });
}

function toriiRed() {
  return geo("torii-red", () =>
    merge([
      // Pillars, slightly tapered and splayed
      cylY(0.36, 9, -3.4, 4.5, 0, 20, 0.42).rotateZ(0.025),
      cylY(0.36, 9, 3.4, 4.5, 0, 20, 0.42).rotateZ(-0.025),
      // Shimaki, under the top beam
      box(10.2, 0.5, 0.62, 0, 9.05, 0),
      // Nuki, the tie beam, through both pillars
      box(9.6, 0.5, 0.42, 0, 7.4, 0),
      // Gakuzuka, the centre strut
      box(0.4, 1.2, 0.36, 0, 8.2, 0),
    ]),
  );
}

export function Torii(p: React.ComponentProps<"group">) {
  return (
    <group {...p}>
      <mesh geometry={toriiRed()} material={soft(VERMILION, 0.6)} castShadow />
      <mesh geometry={kasagi()} material={soft("#1F2638", 0.6)} position-y={9.3} castShadow />
      {/* Black footings where the pillars meet the water */}
      {[-3.4, 3.4].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} material={soft("#1F2638", 0.7)}>
          <cylinderGeometry args={[0.5, 0.55, 1.6, 20]} />
        </mesh>
      ))}
    </group>
  );
}

/** A low islet of rounded rocks with a pine on it and a small shrine roof among the trees. */
export function Islet(p: React.ComponentProps<"group">) {
  const rocks = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 9 }, (_, i) => ({ x: (r() - 0.5) * 22, z: (r() - 0.5) * 12, s: 3 + r() * 4, h: 0.8 + r() * 1.4, i }));
  }, []);
  return (
    <group {...p}>
      {rocks.map((k) => (
        <mesh key={k.i} geometry={lump(500 + k.i, 2)} material={soft(k.i % 3 ? "#7C889A" : "#8D98A8", 0.95)} position={[k.x, 0, k.z]} scale={[k.s, k.h, k.s * 0.8]} receiveShadow castShadow />
      ))}
      <mesh geometry={lump(520, 3)} material={soft("#6F8C7E", 0.9)} position={[1, 0.8, -1]} scale={[9, 1.6, 6]} receiveShadow />
      <Pine seed={9} h={9} position={[-3, 1.2, -2]} />
      <Pine seed={12} h={7} position={[5, 1.2, -3]} />
      {/* A small shrine: white walls under a dark sweeping roof */}
      <group position={[0.5, 1.6, -1]}>
        <mesh material={soft("#EEF1F5")} position-y={1.1} castShadow>
          <boxGeometry args={[3.2, 2.2, 2.4]} />
        </mesh>
        <mesh material={soft("#2A3248", 0.7)} position-y={2.75} rotation-y={Math.PI / 4} scale={[1, 0.5, 1]} castShadow>
          <coneGeometry args={[3.0, 2.2, 4]} />
        </mesh>
      </group>
    </group>
  );
}
