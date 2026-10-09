"use client";

// The harbour the plants work beside: the sea wall the whole site stands on, the
// container quay behind the plants with its two cranes and a moored ship, an inbound ship out in
// the bay (the suppliers' delivery, due on day 21), a wooden pier and a small fishing boat.
// Metres, ground at y = 0, the water a little below it.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { box, cylY, geo, merge } from "../three/parts";
import { cladding, steel } from "../three/materials";
import { nightGlow } from "./glow";
import { canvasTexture } from "./sets";
import { S, reel, story } from "@/lib/reel";
import { WATER_Y } from "./water";

export { WATER_Y };

/** The site, as the sea wall draws it: the industrial island and the land running on east. */
export const SITE = {
  west: -36,
  east: 700,
  north: -52,
  south: 14,
  /** The container quay along the north edge: crane legs and the moored ship. */
  quay: { seaLegs: -50, landLegs: -38, cranes: [82, 108], ship: { x: 96, z: -60.6 } },
  /** The inbound ship's track across the bay, as story time moves on. */
  inbound: { x0: 190, x1: 156, z: -122 },
  pier: { x0: -36, x1: -70, z: -3, w: 3.6 },
};

const mats = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T {
  let m = mats.get(key);
  if (!m) mats.set(key, (m = make()));
  return m as T;
}
const flat = (color: string, rough = 0.8, metal = 0) => mat(`flat-${color}-${rough}-${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));

/* ------------------------------------------------------------------ */
/* Sea wall                                                             */
/* ------------------------------------------------------------------ */

/**
 * Cast concrete for the sea wall, one 8 m bay of it: pale grey panels between dark vertical joints,
 * faint formwork lifts, rows of tie holes, rust-free streaks of run-off, and the wet band the tide
 * leaves (darkest at the water, fading up the wall). v runs from the wall's foot (0) to its top (1).
 */
function wallTexture() {
  const W = 1024;
  const H = 512;
  const depth = 3.2;
  const tex = canvasTexture(W, H, (g) => {
    const r = rng(77);
    g.fillStyle = "#BEC6D0";
    g.fillRect(0, 0, W, H);
    // Cloudy variation in the pour.
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = 20 + r() * 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() > 0.5 ? "rgba(96,108,126,0.10)" : "rgba(240,244,248,0.12)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Formwork lifts and panel joints.
    const Y = (m: number) => H - (m / depth) * H;
    g.fillStyle = "rgba(78,90,108,0.16)";
    for (let m = 0.6; m < depth; m += 0.6) g.fillRect(0, Y(m), W, 1.5);
    g.fillStyle = "rgba(52,62,78,0.5)";
    for (let x = 0; x <= W; x += W / 2) g.fillRect(x - 1.5, 0, 3, H);
    // Tie holes on a grid.
    g.fillStyle = "rgba(60,70,86,0.45)";
    for (let x = W / 8; x < W; x += W / 4) for (let m = 0.9; m < depth; m += 1.2) {
      g.beginPath();
      g.arc(x, Y(m), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Run-off streaks down from the coping.
    for (let i = 0; i < 46; i++) {
      const x = r() * W;
      const len = H * (0.1 + r() * 0.35);
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, "rgba(70,80,96,0.16)");
      gr.addColorStop(1, "rgba(70,80,96,0)");
      g.fillStyle = gr;
      g.fillRect(x, 0, 2 + r() * 6, len);
    }
    // The wet band: soaked dark at the water line, drying up the wall.
    const water = Y(depth + WATER_Y);
    const wet = g.createLinearGradient(0, water - H * 0.32, 0, water);
    wet.addColorStop(0, "rgba(58,70,88,0)");
    wet.addColorStop(0.65, "rgba(58,70,88,0.38)");
    wet.addColorStop(1, "rgba(44,54,70,0.72)");
    g.fillStyle = wet;
    g.fillRect(0, water - H * 0.32, W, H * 0.32);
    g.fillStyle = "rgba(40,50,66,0.78)";
    g.fillRect(0, water, W, H - water);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Box UVs in metres along each face (8 m per texture repeat), v from the foot of the wall to its top. */
function wallBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const along = Math.abs(n.getZ(i)) > 0.5 ? p.getX(i) : p.getZ(i);
    uv.setXY(i, along / 8, p.getY(i) / h + 0.5);
  }
  return g;
}

/** Tetrapods: four tapered legs from one centre, the shape every Japanese sea wall is armoured with. */
function tetrapodGeometry() {
  return geo("tetrapod", () => {
    const legs = [
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ].map(([x, y, z]) => {
      const dir = new THREE.Vector3(x, y, z).normalize();
      const leg = new THREE.CylinderGeometry(0.27, 0.4, 1, 12, 1).translate(0, 0.5, 0);
      leg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      return leg;
    });
    const hub = new THREE.IcosahedronGeometry(0.46, 1);
    const g = merge([...legs.map((l) => l.toNonIndexed()), hub.toNonIndexed()]);
    g.computeVertexNormals();
    return g;
  });
}

/**
 * The armour along the open sides of the island: two loose rows of tetrapods at the foot of the
 * wall, half in the water, every one turned its own way. One instanced draw for all of them.
 */
function Tetrapods() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const r = rng(303);
    const out: { x: number; y: number; z: number; s: number; q: THREE.Quaternion; c: number }[] = [];
    const add = (x: number, z: number) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2));
      out.push({ x, y: WATER_Y - 0.3 + r() * 0.5, z, s: 0.9 + r() * 0.3, q, c: r() });
    };
    // South: along the promenade's wall, out of the way of nothing (the sea is open there).
    for (let x = SITE.west + 1.2; x < 220; x += 1.9 + r() * 0.5) {
      add(x, SITE.south + 1.15 + r() * 0.35);
      if (r() > 0.25) add(x + 0.9, SITE.south + 2.6 + r() * 0.6);
    }
    // West tip: either side of the pier's root.
    for (let z = SITE.north + 2; z < SITE.south - 1; z += 1.9 + r() * 0.5) {
      if (Math.abs(z - SITE.pier.z) < SITE.pier.w + 1.2) continue;
      add(SITE.west - 1.15 - r() * 0.35, z);
      if (r() > 0.3) add(SITE.west - 2.6 - r() * 0.6, z + 0.9);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((p, i) => {
      m4.compose(new THREE.Vector3(p.x, p.y, p.z), p.q, new THREE.Vector3(p.s, p.s, p.s));
      m.setMatrixAt(i, m4);
      // Weathered concrete: each one a slightly different grey.
      m.setColorAt(i, c.set("#98A1AD").offsetHSL(0, 0, (p.c - 0.5) * 0.1));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots]);
  return <instancedMesh ref={mesh} args={[tetrapodGeometry(), tetrapodMaterial(), spots.length]} castShadow receiveShadow />;
}

/** Concrete that the sea keeps wet: darker and a little glossier from just above the water down. */
function tetrapodMaterial() {
  return mat("tetrapod", () => {
    const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.94, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vWetY;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWetY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vWetY;")
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          float dry = smoothstep(${(WATER_Y - 0.1).toFixed(2)}, ${(WATER_Y + 0.55).toFixed(2)}, vWetY);
          diffuseColor.rgb *= mix(0.52, 1.0, dry);
          roughnessFactor = mix(0.55, roughnessFactor, dry);`,
        );
    };
    m.customProgramCacheKey = () => "tetrapod-1";
    return m;
  });
}

/** The island the site stands on: a block of fill behind a cast concrete sea wall, armoured with tetrapods on its open sides, fenders along the quay. */
export function SeaWall() {
  const { west, east, north, south } = SITE;
  const w = east - west;
  const d = south - north;
  const depth = 3.2;
  const fenders = useMemo(() => {
    const out: number[] = [];
    for (let x = 46; x < 146; x += 7) out.push(x);
    return out;
  }, []);
  const wall = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.93, metalness: 0 });
    return { m, g: wallBox(w, depth, d) };
  }, [w, d]);
  return (
    <group>
      <mesh position={[(west + east) / 2, -depth / 2 - 0.002, (north + south) / 2]} geometry={wall.g} material={wall.m} receiveShadow />
      {/* Coping along the edge */}
      {[north, south].map((z) => (
        <mesh key={z} position={[(west + east) / 2, 0.06, z]} material={flat("#D9DFE6", 0.85)} receiveShadow castShadow>
          <boxGeometry args={[w, 0.14, 0.6]} />
        </mesh>
      ))}
      <mesh position={[west, 0.06, (north + south) / 2]} material={flat("#D9DFE6", 0.85)} castShadow>
        <boxGeometry args={[0.6, 0.14, d]} />
      </mesh>
      <Tetrapods />
      {/* Rubber fenders and bollards along the container quay */}
      {fenders.map((x) => (
        <group key={x}>
          <mesh position={[x, -0.75, north - 0.35]} material={flat("#1F2433", 0.85)} castShadow>
            <boxGeometry args={[1.4, 1.4, 0.7]} />
          </mesh>
          <mesh position={[x + 3.5, 0.32, north + 0.6]} material={flat("#2A3346", 0.6, 0.3)} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.5, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ship-to-shore crane                                                  */
/* ------------------------------------------------------------------ */

/** The crane's steel, in local metres: x along the quay, z towards the land, seaside legs at z = 0. */
function craneFrame() {
  return geo("crane-frame", () => {
    const G = 12; // gauge between seaside and landside legs
    const X = 7; // half the leg spacing along the quay
    const P = 16; // portal beam height
    const B = 20.5; // boom height
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-X, X]) {
      for (const z of [0, G]) parts.push(box(0.9, P, 0.9, x, P / 2, z));
      // Sill beam and portal beam along the gauge
      parts.push(box(0.7, 0.9, G, x, 1.8, G / 2));
      parts.push(box(0.9, 1.2, G + 0.9, x, P, G / 2));
      // Upper legs carrying the boom
      for (const z of [0, G]) parts.push(box(0.7, B - P, 0.7, x, (P + B) / 2, z));
      // Diagonal brace in each side frame
      const diag = new THREE.BoxGeometry(0.35, Math.hypot(G, P - 3), 0.35);
      diag.rotateX(Math.atan2(G, P - 3));
      diag.translate(x, (P + 3) / 2, G / 2);
      parts.push(diag);
    }
    // Portal beams across the quay
    for (const z of [0, G]) parts.push(box(2 * X + 0.9, 1.4, 0.9, 0, P, z));
    // Boom: two girders from the back reach to the tip over the water, with a walkway between
    const back = G + 9;
    const tip = -36;
    for (const x of [-1.7, 1.7]) {
      parts.push(box(0.5, 1.6, back - tip, x, B, (back + tip) / 2));
      // Lattice suggested by posts along the girder
      for (let z = tip + 2; z < back; z += 4) parts.push(box(0.16, 1.4, 0.16, x, B, z));
    }
    for (let z = tip + 2; z < back; z += 4) parts.push(box(3.4, 0.14, 0.2, 0, B - 0.75, z));
    // A-frame and its stays
    const apex = new THREE.Vector3(0, B + 11, G * 0.45);
    for (const x of [-X + 1, X - 1]) {
      const foot = new THREE.Vector3(x, B, G * 0.62);
      const len = foot.distanceTo(apex);
      const leg = new THREE.CylinderGeometry(0.32, 0.36, len, 10);
      leg.lookAt(new THREE.Vector3().subVectors(apex, foot));
      leg.rotateX(Math.PI / 2);
      const mid = foot.clone().add(apex).multiplyScalar(0.5);
      leg.translate(mid.x, mid.y, mid.z);
      parts.push(leg);
    }
    const stay = (a: THREE.Vector3, b: THREE.Vector3) => {
      const len = a.distanceTo(b);
      const c = new THREE.CylinderGeometry(0.09, 0.09, len, 6);
      c.lookAt(new THREE.Vector3().subVectors(b, a));
      c.rotateX(Math.PI / 2);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      c.translate(mid.x, mid.y, mid.z);
      return c;
    };
    for (const x of [-1.7, 1.7]) {
      parts.push(stay(apex, new THREE.Vector3(x, B + 0.8, tip + 1)));
      parts.push(stay(apex, new THREE.Vector3(x, B + 0.8, tip * 0.45)));
      parts.push(stay(apex, new THREE.Vector3(x, B + 0.8, back - 1)));
    }
    return merge(parts);
  });
}

function craneDark() {
  return geo("crane-dark", () => {
    const G = 12;
    const X = 7;
    const parts: THREE.BufferGeometry[] = [];
    // Bogies with their wheels on the rails
    for (const x of [-X, X]) for (const z of [0, G]) parts.push(box(1.4, 1.0, 2.6, x, 0.5, z));
    return merge(parts);
  });
}

export function Crane({ trolley = -14, hoist = 9, ...p }: React.ComponentProps<"group"> & { trolley?: number; hoist?: number }) {
  const B = 20.5;
  return (
    <group {...p}>
      <mesh geometry={craneFrame()} material={flat("#E7ECF2", 0.55, 0.2)} castShadow receiveShadow />
      <mesh geometry={craneDark()} material={flat("#2A3346", 0.7, 0.3)} castShadow />
      {/* Machinery house on the back reach, and the warning light at the apex */}
      <mesh position={[0, B + 2.2, 17]} material={flat("#2E3C6E", 0.5, 0.2)} castShadow>
        <boxGeometry args={[5.2, 2.8, 7]} />
      </mesh>
      <mesh position={[0, B + 11.6, 5.4]} material={nightGlow("#FF6B52", 2.4, 0.3, "#C24A38")}>
        <sphereGeometry args={[0.3, 12, 8]} />
      </mesh>
      {/* Trolley, operator cab, cables and the spreader on a container */}
      <group position-z={trolley}>
        <mesh position={[0, B - 0.2, 0]} material={flat("#2E3C6E", 0.5, 0.2)} castShadow>
          <boxGeometry args={[3.4, 1.4, 3]} />
        </mesh>
        <mesh position={[1.4, B - 2.1, 0]} material={flat("#E7ECF2", 0.5)} castShadow>
          <boxGeometry args={[1.6, 2, 2.2]} />
        </mesh>
        <mesh position={[1.4, B - 2.0, -1.12]} material={nightGlow("#FFE3B8", 1.3, 0.05, "#1C2436")}>
          <boxGeometry args={[1.3, 0.9, 0.04]} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, (B - 1 + hoist + 1.6) / 2, 0]} material={flat("#3A4458", 0.6, 0.4)}>
            <boxGeometry args={[0.05, B - 1 - hoist - 1.6, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, hoist + 1.4, 0]} material={flat("#D9563F", 0.5, 0.2)} castShadow>
          <boxGeometry args={[2.6, 0.5, 12.4]} />
        </mesh>
        <mesh position={[0, hoist, 0]} material={cladding("#3F5C8C", 24)} castShadow rotation-y={Math.PI / 2}>
          <boxGeometry args={[12.2, 2.6, 2.44]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Containers                                                           */
/* ------------------------------------------------------------------ */

/** Muted container colours: the bay's palette, nothing rusty. */
export const BOX_COLOURS = ["#3F5C8C", "#E7ECF2", "#6E8F86", "#D9634E", "#2E3C6E", "#8FB3D9", "#B7C6D8", "#5E6F95"];

type Slot = { x: number; y: number; z: number; ry?: number; c: number };

/** Container stacks as one instanced mesh: 40 ft boxes with ribbed walls. */
export function Containers({ slots }: { slots: Slot[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => {
    const m = (cladding("#FFFFFF", 24, 0.55) as THREE.MeshStandardMaterial).clone();
    return m;
  }, []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    slots.forEach((s, i) => {
      o.position.set(s.x, s.y + 1.3, s.z);
      o.rotation.set(0, s.ry ?? 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(BOX_COLOURS[s.c % BOX_COLOURS.length]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [slots]);
  return (
    <instancedMesh ref={mesh} args={[undefined, material, slots.length]} castShadow receiveShadow>
      <boxGeometry args={[12.2, 2.6, 2.44]} />
    </instancedMesh>
  );
}

function rng(seed: number) {
  let s = Math.abs(Math.round(seed * 104729)) + 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** The container yard between the crane legs and the plants: blocks of stacks, tidy rows. */
export function yardSlots(): Slot[] {
  const r = rng(3);
  const out: Slot[] = [];
  // Blocks along the quay, each 4 rows deep, with lanes between them.
  const blocks = [
    { x0: -30, bays: 2 },
    { x0: -2, bays: 2 },
    { x0: 40, bays: 1 },
    { x0: 70, bays: 3 },
  ];
  for (const b of blocks) {
    for (let bay = 0; bay < b.bays; bay++) {
      for (let row = 0; row < 4; row++) {
        const tiers = 1 + Math.floor(r() * 3.2);
        for (let tier = 0; tier < tiers; tier++) {
          out.push({ x: b.x0 + bay * 12.8, y: tier * 2.6, z: -33.5 + row * 2.7, c: Math.floor(r() * BOX_COLOURS.length) });
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ships                                                                */
/* ------------------------------------------------------------------ */

/** A container ship's hull seen from above: blunt stern, long parallel body, a fine bow. */
function hullShape(L: number, B: number) {
  const s = new THREE.Shape();
  const h = B / 2;
  s.moveTo(-L / 2, -h * 0.9);
  s.lineTo(L * 0.28, -h);
  s.quadraticCurveTo(L * 0.46, -h, L / 2, 0);
  s.quadraticCurveTo(L * 0.46, h, L * 0.28, h);
  s.lineTo(-L / 2, h * 0.9);
  s.quadraticCurveTo(-L / 2 - 1.2, 0, -L / 2, -h * 0.9);
  return s;
}

function hullGeo(L: number, B: number, y0: number, y1: number, key: string) {
  return geo(`hull-${key}-${L}-${B}-${y0}-${y1}`, () => {
    const g = new THREE.ExtrudeGeometry(hullShape(L, B), { depth: y1 - y0, bevelEnabled: false, curveSegments: 18 });
    // Extruded along z; stand it up so the extrusion runs up y.
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    g.computeVertexNormals();
    return g;
  });
}

/** A feeder container ship, in metres along x (bow towards +x), waterline at y = 0. */
export function Ship({ L = 92, B = 15, tiers = 3, seed = 1, ...p }: React.ComponentProps<"group"> & { L?: number; B?: number; tiers?: number; seed?: number }) {
  const deck = 6.2;
  const slots = useMemo(() => {
    const r = rng(seed);
    const out: Slot[] = [];
    const bays = Math.floor((L * 0.62) / 12.8);
    for (let b = 0; b < bays; b++) {
      for (let row = 0; row < 5; row++) {
        const n = Math.max(1, tiers - Math.floor(r() * 2));
        for (let t = 0; t < n; t++) out.push({ x: -L * 0.22 + b * 12.8, y: deck + t * 2.6, z: (row - 2) * 2.5, c: Math.floor(r() * BOX_COLOURS.length) });
      }
    }
    return out;
  }, [L, tiers, seed]);
  return (
    <group {...p}>
      {/* Bottom paint at the waterline, the hull above, a white sheer strake */}
      <mesh geometry={hullGeo(L, B, -0.5, 1.0, "boot")} material={flat("#D45D49", 0.7)} />
      <mesh geometry={hullGeo(L, B, 1.0, deck - 0.4, "side")} material={flat("#24335C", 0.55, 0.15)} castShadow receiveShadow />
      <mesh geometry={hullGeo(L, B, deck - 0.4, deck, "sheer")} material={flat("#E9EDF2", 0.6)} castShadow />
      {/* Accommodation and bridge at the stern, funnel behind */}
      <group position={[-L * 0.4, deck, 0]}>
        <mesh position-y={5} material={flat("#EEF1F5", 0.6)} castShadow receiveShadow>
          <boxGeometry args={[8, 10, B * 0.86]} />
        </mesh>
        <mesh position={[0.4, 10.6, 0]} material={flat("#EEF1F5", 0.6)} castShadow>
          <boxGeometry args={[6.2, 1.6, B * 1.02]} />
        </mesh>
        <mesh position={[3.12, 10.6, 0]} material={nightGlow("#FFE3B8", 1.2, 0.0, "#1C2436")}>
          <boxGeometry args={[0.05, 0.8, B * 0.96]} />
        </mesh>
        {[2.4, 4.8, 7.2].map((y) => (
          <mesh key={y} position={[4.02, y, 0]} material={nightGlow("#FFE3B8", 1.0, 0.0, "#2A3448")}>
            <boxGeometry args={[0.04, 0.5, B * 0.7]} />
          </mesh>
        ))}
        <mesh position={[-3.6, 12.6, 0]} material={flat("#2E3C6E", 0.5)} castShadow>
          <boxGeometry args={[3, 5, 3.4]} />
        </mesh>
        <mesh position={[-3.6, 14.2, 0]} material={flat("#D9563F", 0.5)}>
          <boxGeometry args={[3.05, 0.8, 3.45]} />
        </mesh>
      </group>
      {/* Forecastle and a mast light at the bow */}
      <mesh position={[L * 0.4, deck + 1, 0]} material={flat("#E9EDF2", 0.6)} castShadow>
        <boxGeometry args={[6, 2, B * 0.5]} />
      </mesh>
      <mesh position={[L * 0.43, deck + 6, 0]} material={flat("#2A3346", 0.5)}>
        <cylinderGeometry args={[0.12, 0.12, 8, 8]} />
      </mesh>
      <mesh position={[L * 0.43, deck + 10.1, 0]} material={nightGlow("#FFF2D6", 2.4, 0.1, "#E9EDF2")}>
        <sphereGeometry args={[0.28, 10, 8]} />
      </mesh>
      <Containers slots={slots} />
    </group>
  );
}

/** The moored ship, alongside the container quay. */
export function MooredShip() {
  const ship = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ship.current || reel.calm) return;
    // A ship at its berth barely moves: a slow heave on its lines.
    ship.current.position.y = WATER_Y + Math.sin(clock.elapsedTime * 0.35) * 0.05;
  });
  const { x, z } = SITE.quay.ship;
  return (
    <group ref={ship} position={[x, WATER_Y, z]} userData={{ live: true }}>
      <Ship L={92} B={15} tiers={3} seed={11} />
    </group>
  );
}

/**
 * The suppliers' delivery, out in the bay: it comes in slowly from the east as the story runs on.
 * Day 21 is past the end of this page, so it never reaches the quay.
 */
export function InboundShip() {
  const ship = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ship.current;
    if (!g) return;
    const { x0, x1, z } = SITE.inbound;
    const k = Math.min(story() / S.ask, 1);
    g.position.set(x0 + (x1 - x0) * k, WATER_Y + (reel.calm ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.08), z);
    g.rotation.z = reel.calm ? 0 : Math.sin(clock.elapsedTime * 0.4) * 0.006;
  });
  return (
    <group ref={ship} rotation-y={Math.PI} userData={{ live: true }}>
      <Ship L={56} B={11} tiers={2} seed={23} />
      <Wake />
    </group>
  );
}

/** A soft wake trailing a moving hull. */
function Wake() {
  const m = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(1, "rgba(255,255,255,0.55)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 6);
    g.lineTo(256, 26);
    g.lineTo(256, 38);
    g.lineTo(0, 58);
    g.closePath();
    g.fill();
    const t = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.5 });
  }, []);
  return (
    <mesh material={m} rotation-x={-Math.PI / 2} position={[-70, 0.05, 0]}>
      <planeGeometry args={[80, 22]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Pier and fishing boat                                                */
/* ------------------------------------------------------------------ */

/** Planks in cool grey wood: stripes of slightly different greys with fine gaps. */
function plankTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 512;
  const g = c.getContext("2d")!;
  const tones = ["#97A3B2", "#8D99A8", "#A0ABB9", "#929EAC"];
  for (let i = 0; i < 16; i++) {
    g.fillStyle = tones[i % tones.length];
    g.fillRect(0, i * 32, 64, 30);
    g.fillStyle = "rgba(40,50,66,0.35)";
    g.fillRect(0, i * 32 + 30, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function Pier() {
  const { x0, x1, z, w } = SITE.pier;
  const len = x0 - x1;
  const deck = useMemo(() => {
    const t = plankTexture();
    t.repeat.set(1, len / 16);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  }, [len]);
  const piles = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let x = x0 - 2; x > x1; x -= 3.2) for (const s of [-1, 1]) parts.push(cylY(0.18, 2.6, x, -1.2, z + (s * w) / 2, 10));
    // A low rail along the north side
    for (let x = x0 - 2; x > x1 + 0.5; x -= 3.2) parts.push(box(0.1, 0.9, 0.1, x, 0.65, z - w / 2 + 0.1));
    parts.push(box(len - 2, 0.08, 0.1, (x0 + x1) / 2 - 1, 1.08, z - w / 2 + 0.1));
    return merge(parts);
  }, [x0, x1, z, w, len]);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.12, z]} rotation-y={Math.PI / 2} material={deck} castShadow receiveShadow>
        <boxGeometry args={[w, 0.24, len]} />
      </mesh>
      <mesh geometry={piles} material={flat("#5D6A7C", 0.9)} castShadow />
    </group>
  );
}

function boatHull() {
  return geo("boat-hull", () => {
    const s = new THREE.Shape();
    s.moveTo(-4, -1.2);
    s.lineTo(2, -1.3);
    s.quadraticCurveTo(4.2, -1.1, 4.8, 0);
    s.quadraticCurveTo(4.2, 1.1, 2, 1.3);
    s.lineTo(-4, 1.2);
    s.quadraticCurveTo(-4.4, 0, -4, -1.2);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 14 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.3, 0);
    g.computeVertexNormals();
    return g;
  });
}

/** A small fishing boat on its mooring off the pier, rocking gently, a fisherman mending gear. */
export function FishingBoat(p: React.ComponentProps<"group">) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current || reel.calm) return;
    const t = clock.elapsedTime;
    g.current.rotation.x = Math.sin(t * 0.9) * 0.025;
    g.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.02;
    g.current.position.y = WATER_Y + Math.sin(t * 0.8) * 0.06;
  });
  return (
    <group {...p}>
      <group ref={g} position-y={WATER_Y} userData={{ live: true }}>
        <mesh geometry={boatHull()} material={flat("#F2F4F7", 0.5)} castShadow />
        <mesh position={[0.3, 0.75, 0]} material={flat("#5D86B8", 0.5)}>
          <boxGeometry args={[8.4, 0.18, 2.66]} />
        </mesh>
        {/* Wheelhouse */}
        <mesh position={[-1.6, 1.9, 0]} material={flat("#F2F4F7", 0.5)} castShadow>
          <boxGeometry args={[2, 1.8, 1.8]} />
        </mesh>
        <mesh position={[-0.58, 2.1, 0]} material={nightGlow("#FFE3B8", 1.4, 0.0, "#22304C")}>
          <boxGeometry args={[0.05, 0.6, 1.5]} />
        </mesh>
        <mesh position={[-1.6, 2.85, 0]} material={flat("#2E3C6E", 0.5)}>
          <boxGeometry args={[2.3, 0.12, 2.1]} />
        </mesh>
        {/* Mast and a small vermilion pennant */}
        <mesh position={[0.8, 3.4, 0]} material={flat("#3A4458", 0.5)}>
          <cylinderGeometry args={[0.05, 0.06, 5, 8]} />
        </mesh>
        <mesh position={[1.15, 5.6, 0]} material={flat("#D9563F", 0.6)}>
          <boxGeometry args={[0.7, 0.36, 0.02]} />
        </mesh>
        {/* Nets in a heap on the after deck */}
        <mesh position={[2.6, 1.05, 0]} scale={[1, 0.35, 0.8]} material={flat("#6E8F86", 0.95)}>
          <sphereGeometry args={[0.8, 12, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Quay lights                                                          */
/* ------------------------------------------------------------------ */

/** Tall quay floodlight masts, lit from dusk. */
export function Floodlight(p: React.ComponentProps<"group">) {
  return (
    <group {...p}>
      <mesh position-y={9} material={steel("#5A6476", 0.5)} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 18, 10]} />
      </mesh>
      <mesh position-y={18.2} material={flat("#2A3346", 0.5)}>
        <boxGeometry args={[2.2, 0.5, 0.8]} />
      </mesh>
      <mesh position={[0, 17.92, 0.41]} material={nightGlow("#FFF1D6", 2.6, 0.0, "#C9D1DC")}>
        <boxGeometry args={[2.0, 0.3, 0.02]} />
      </mesh>
    </group>
  );
}
