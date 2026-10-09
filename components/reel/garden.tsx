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
import { skyUniforms } from "./sky";
import { reel } from "@/lib/reel";
import { canvasQuality } from "@/lib/device";

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
/** The shaded heart of a pine pad and of a blossom spray, seen between the tufts. */
const PINE_CORE = "#2A4038";
const BLOSSOM_CORE = "#E4A9BB";

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
/* Foliage: needle tufts and blossom sprays on cut-out cards            */
/* ------------------------------------------------------------------ */

/**
 * One texture for every canopy on the bay, painted once: on the left a tuft of pine needles fanning
 * up from its twig, dark at the base and lit at the tips; on the right a spray of cherry blossom,
 * five-petal flowers white at the rim and pink at the heart. Alpha is the cut-out.
 */
let atlas: THREE.CanvasTexture | null = null;
function foliageAtlas() {
  if (atlas) return atlas;
  const T = 512;
  const c = document.createElement("canvas");
  c.width = T * 2;
  c.height = T;
  const g = c.getContext("2d")!;
  const r = rng(91);
  // Needles: a few hundred strokes from a short twig, longest straight up, shorter to the sides.
  g.lineCap = "round";
  const greens = ["#24392F", "#2D463B", "#365449", "#3F5E52", "#4C6D60"];
  for (let i = 0; i < 360; i++) {
    const side = (r() - 0.5) * 2;
    const ang = side * 1.25 + (r() - 0.5) * 0.25;
    const len = T * (0.22 + 0.4 * (1 - Math.abs(side) * 0.55) * (0.6 + r() * 0.4));
    const x0 = T / 2 + (r() - 0.5) * T * 0.16;
    const y0 = T * 0.9 - r() * T * 0.12;
    const x1 = x0 + Math.sin(ang) * len;
    const y1 = y0 - Math.cos(ang) * len;
    const bend = (r() - 0.5) * len * 0.18;
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    const k = Math.floor(r() * 3);
    grad.addColorStop(0, greens[k]);
    grad.addColorStop(1, greens[k + 2]);
    g.strokeStyle = grad;
    g.lineWidth = 2.4 + r() * 2.2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
    g.stroke();
  }
  // The twig the tuft grows from, cool grey bark.
  g.strokeStyle = "#3D4552";
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(T / 2, T);
  g.lineTo(T / 2, T * 0.84);
  g.stroke();
  // Blossom: overlapping flowers in a loose round spray, the ones behind a little deeper pink.
  const flower = (x: number, y: number, rad: number, back: boolean) => {
    const turn = r() * Math.PI * 2;
    for (let p = 0; p < 5; p++) {
      const a = turn + (p / 5) * Math.PI * 2;
      const px = x + Math.cos(a) * rad * 0.52;
      const py = y + Math.sin(a) * rad * 0.52;
      const pg = g.createRadialGradient(x, y, rad * 0.1, x, y, rad);
      pg.addColorStop(0, back ? "#E592AB" : "#EFA7BD");
      pg.addColorStop(0.55, back ? "#F2C3D1" : "#F8D6E0");
      pg.addColorStop(1, back ? "#F6DCE4" : "#FFF3F6");
      g.fillStyle = pg;
      g.beginPath();
      g.ellipse(px, py, rad * 0.55, rad * 0.4, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#C9566F";
    g.beginPath();
    g.arc(x, y, rad * 0.13, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(214,110,138,0.8)";
    g.lineWidth = 1.2;
    for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * rad * 0.3, y + Math.sin(a) * rad * 0.3);
      g.stroke();
    }
  };
  // Sakura flower in bunches of three to six on short stalks: bunches packed into a round spray,
  // the ones behind a little deeper pink, so from any distance it reads as soft massed bloom.
  for (const back of [true, false]) {
    for (let i = 0; i < (back ? 16 : 20); i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * T * 0.36;
      const bx = T * 1.5 + Math.cos(a) * d;
      const by = T / 2 + Math.sin(a) * d * 0.9;
      const n = 3 + Math.floor(r() * 4);
      const rad = T * (0.05 + r() * 0.025);
      for (let k = 0; k < n; k++) {
        const ka = (k / n) * Math.PI * 2 + r();
        flower(bx + Math.cos(ka) * rad * 0.95, by + Math.sin(ka) * rad * 0.85, rad * (0.85 + r() * 0.3), back);
      }
    }
  }
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  return atlas;
}

/**
 * Canopy material: cut-out cards that sway in a light breeze (each vertex by its aSway weight, in
 * world space, so it still works once Bake has merged every tree into one mesh). Normals are left
 * as built (rounded over the whole pad, see canopy) on both faces, so a canopy shades as a soft
 * volume rather than as a pile of flat cards.
 */
function foliageMaterial() {
  return mat("foliage", () => {
    const m = new THREE.MeshStandardMaterial({ map: foliageAtlas(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85, metalness: 0 });
    m.alphaToCoverage = canvasQuality().antialias;
    m.userData.bakeSafe = true;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = skyUniforms.uTime;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aSway;\nuniform float uTime;").replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 swayAt = modelMatrix * vec4(transformed, 1.0);
        float ph = uTime * 1.1 + swayAt.x * 0.23 + swayAt.z * 0.19;
        transformed.x += (sin(ph) * 0.045 + sin(ph * 2.9 + swayAt.y) * 0.012) * aSway;
        transformed.z += cos(ph * 0.83) * 0.032 * aSway;
        transformed.y += sin(ph * 1.7) * 0.01 * aSway;`,
      );
      sh.fragmentShader = sh.fragmentShader.replace("normal *= faceDirection;", "");
    };
    m.customProgramCacheKey = () => "foliage-1";
    return m;
  }) as THREE.MeshStandardMaterial;
}

type Canopy = { x: number; y: number; z: number; rx: number; ry: number; rz: number };

/**
 * Cards scattered through each pad of a canopy, most of them out near its surface. Every vertex's
 * normal points out from the pad's centre (so the pad is lit like a soft cloud of foliage), the
 * card's colour darkens towards the pad's underside and core (the light the outer layer blocks),
 * and its sway grows with height.
 */
function canopy(pads: Canopy[], kind: "pine" | "blossom", seed: number, height: number) {
  const r = rng(seed * 17 + 3);
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const sway: number[] = [];
  const idx: number[] = [];
  const u0 = kind === "pine" ? 0 : 0.5;
  const dir = new THREE.Vector3();
  const n0 = new THREE.Vector3();
  const t = new THREE.Vector3();
  const b = new THREE.Vector3();
  const v = new THREE.Vector3();
  const helper = new THREE.Vector3();
  for (const p of pads) {
    const count = Math.round((kind === "pine" ? 16 : 22) * Math.max(p.rx * p.rz, 0.6) + (kind === "pine" ? 10 : 18));
    for (let i = 0; i < count; i++) {
      // A direction out from the pad's centre; pine pads keep their cards on top and round the rim.
      dir.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
      if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
      dir.normalize();
      if (kind === "pine") dir.y = Math.abs(dir.y) * 0.85 - 0.15;
      dir.normalize();
      const depth = 0.55 + 0.45 * Math.sqrt(r());
      const cx = p.x + dir.x * p.rx * depth;
      const cy = p.y + dir.y * p.ry * depth;
      const cz = p.z + dir.z * p.rz * depth;
      const size = (kind === "pine" ? 0.95 : 1.3) * (0.75 + r() * 0.5) * Math.min(1.25, 0.6 + p.rx * 0.3);
      // The card faces outwards and up, turned a random way about that.
      n0.set(dir.x + (r() - 0.5) * 0.9, dir.y + (kind === "pine" ? 0.9 : 0.3), dir.z + (r() - 0.5) * 0.9).normalize();
      helper.set(r() - 0.5, r() - 0.5, r() - 0.5);
      t.crossVectors(n0, helper).normalize();
      // Needle tufts grow outwards: their "up" leans along the direction out of the pad.
      if (kind === "pine") {
        b.copy(dir).addScaledVector(n0, -dir.dot(n0));
        if (b.lengthSq() < 1e-4) b.crossVectors(t, n0);
        b.normalize();
        t.crossVectors(b, n0).normalize();
      } else b.crossVectors(n0, t).normalize();
      const base = pos.length / 3;
      const shade = (kind === "pine" ? 0.62 : 0.78) + (kind === "pine" ? 0.38 : 0.26) * (0.5 + 0.5 * dir.y) * depth;
      const tint = 0.9 + r() * 0.2;
      for (const [su, sv] of [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ]) {
        // Tufts are anchored at their twig (bottom edge); blossom sprays at their centre.
        const sy = kind === "pine" ? sv : sv - 0.5;
        v.set(cx, cy, cz).addScaledVector(t, su * size).addScaledVector(b, sy * size);
        pos.push(v.x, v.y, v.z);
        helper.set((v.x - p.x) / p.rx, (v.y - p.y) / p.ry, (v.z - p.z) / p.rz).normalize();
        nor.push(helper.x, helper.y, helper.z);
        uvs.push(u0 + (su + 0.5) * 0.5, sv);
        const k = shade * tint;
        col.push(k, k * (kind === "pine" ? 1.02 : 1), k);
        sway.push(Math.min(Math.max(v.y / height, 0), 1) * (0.7 + r() * 0.6));
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
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
      pads.push({ x: px, y: y + 0.2, z: pz, rx: size, ry: size * 0.36, rz: size * 0.85, c: Math.floor(r() * 3) });
      if (reach > 0) branches.push(limb([[cx, y - 0.3, 0], [(cx + px) / 2, y + 0.15, pz / 2], [px, y + 0.1, pz]], 0.1, 0.05));
    }
  });
  return { pads, branches: merge(branches) };
}

export function Pine({ seed = 1, h = 8, ...p }: React.ComponentProps<"group"> & { seed?: number; h?: number }) {
  const { pads, branches, needles } = useMemo(() => {
    const { pads, branches } = pinePads(seed);
    return { pads, branches, needles: canopy(pads, "pine", seed, 8.6) };
  }, [seed]);
  return (
    <group {...p} scale={h / 8.6}>
      <mesh geometry={pineParts(seed)} material={soft(BARK)} castShadow />
      <mesh geometry={branches} material={soft(BARK)} castShadow />
      {/* Each pad: a dark core of dense needles, and the lit tufts round it */}
      {pads.map((d, i) => (
        <mesh key={i} geometry={lump(seed * 10 + i)} material={soft(PINE_CORE, 0.9)} position={[d.x, d.y - d.ry * 0.12, d.z]} scale={[d.rx * 0.74, d.ry * 0.7, d.rz * 0.74]} castShadow receiveShadow />
      ))}
      <mesh geometry={needles} material={foliageMaterial()} castShadow receiveShadow />
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
      puffs.push({ x: ex, y: ey + 0.3, z: ez, rx: s, ry: s * 0.78, rz: s, c: Math.floor(r() * 3) });
    }
    puffs.push({ x: 0, y: 5.2, z: 0, rx: 2.0, ry: 1.4, rz: 1.9, c: 0 });
    puffs.push({ x: 0.8, y: 4.4, z: -0.9, rx: 1.5, ry: 1.1, rz: 1.4, c: 2 });
    return { wood: merge(limbs), puffs };
  }, [seed]);
  const bloom = useMemo(() => canopy(puffs, "blossom", seed + 50, 6.5), [puffs, seed]);
  return (
    <group {...p} scale={h / 6.5}>
      <mesh geometry={wood} material={soft("#474D5B")} castShadow />
      {/* Each spray: a deeper pink core, and the open flowers round it */}
      {puffs.map((d, i) => (
        <mesh key={i} geometry={lump(seed * 13 + i, 3)} material={soft(BLOSSOM_CORE, 0.85)} position={[d.x, d.y - d.ry * 0.08, d.z]} scale={[d.rx * 0.84, d.ry * 0.8, d.rz * 0.84]} castShadow receiveShadow />
      ))}
      <mesh geometry={bloom} material={foliageMaterial()} castShadow receiveShadow />
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
