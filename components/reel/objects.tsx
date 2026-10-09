"use client";

// The reel's object kit, each one a thing the story is about:
// - DecisionPlate: the decision, engraved on a porcelain plate posted on Plant 02's dispatch board.
// - Rack: Plant 01's pallet rack, whose totes run down towards safety stock.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { forwardRef } from "react";
import { TINTS } from "../three/palette";
import { paint, plastic, steel } from "../three/materials";
import { CRATE } from "../three/parts";
import { displayText, porcelain } from "./sets";

/** The decision plate's size in its own units: a slab lying flat. */
export const PLATE = { w: 1.7, d: 1.08, h: 0.16 };

const TEX_W = 1024;

function bodyFont() {
  if (typeof document === "undefined") return "Helvetica, Arial, sans-serif";
  return getComputedStyle(document.body).fontFamily || "Helvetica, Arial, sans-serif";
}

/** Rounded slab with truly flat faces, so the printed face shades evenly and every edge catches a highlight. */
export function slab(w: number, h: number, d: number, r: number) {
  return new RoundedBoxGeometry(w, h, d, 6, r);
}

/* ------------------------------------------------------------------ */
/* The decision plate                                                   */
/* ------------------------------------------------------------------ */

let plateGeo: THREE.BufferGeometry | undefined;
const plateTopGeo = new THREE.PlaneGeometry(PLATE.w - 0.08, PLATE.d - 0.08).rotateX(-Math.PI / 2);

/** Engraving: dark-filled letters cut into porcelain, with a bump map so the cuts catch light. */
function plateTexture(approved: boolean) {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = Math.round((TEX_W * (PLATE.d - 0.08)) / (PLATE.w - 0.08));
  const g = c.getContext("2d")!;
  const sans = bodyFont();
  g.fillStyle = "#F4F5F7";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#141619";
  g.font = `700 30px ${sans}`;
  g.fillText("DECISION · TRF-0240", 64, 92);
  displayText(g, "TRANSFER", 60, 230, 112);
  displayText(g, "240 UNITS", 60, 340, 112);
  g.font = `600 40px ${sans}`;
  g.fillStyle = "#2F3339";
  g.fillText("Plant 02  →  Plant 01", 64, 430);
  // Status pill
  const label = approved ? "APPROVED · PLANNER" : "AWAITING APPROVAL";
  g.font = `700 30px ${sans}`;
  const w = g.measureText(label).width + 56;
  g.fillStyle = approved ? TINTS.emerald : "#141619";
  g.beginPath();
  g.roundRect(64, 492, w, 64, 32);
  g.fill();
  g.fillStyle = "#FFFDF8";
  g.textBaseline = "middle";
  g.fillText(label, 92, 525);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const plateMats: Partial<Record<"pending" | "approved", THREE.MeshPhysicalMaterial>> = {};
function plateMaterial(approved: boolean) {
  const k = approved ? "approved" : "pending";
  return (plateMats[k] ??= (() => {
    const map = plateTexture(approved);
    return new THREE.MeshPhysicalMaterial({ map, bumpMap: map, bumpScale: -0.5, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1 });
  })());
}


/** The decision: a porcelain plate with the recommendation engraved on its face. */
export const DecisionPlate = forwardRef<THREE.Group, { approved?: boolean } & React.ComponentProps<"group">>(function DecisionPlate({ approved = false, ...props }, ref) {
  plateGeo ??= slab(PLATE.w, PLATE.h, PLATE.d, 0.06);
  return (
    <group ref={ref} {...props}>
      <mesh geometry={plateGeo} material={porcelain()} castShadow receiveShadow />
      <mesh geometry={plateTopGeo} material={plateMaterial(approved)} position-y={PLATE.h / 2 + 0.0015} />
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Plant 01's pallet rack                                               */
/* ------------------------------------------------------------------ */

// Metres. Two bays, three beam levels above the floor slots; totes sit two across, one deep.
export const RACK = { bay: 1.5, bays: 2, depth: 0.62, levels: [0.0, 0.62, 1.24, 1.86], height: 2.4, per: 2 };
export const RACK_SLOTS = RACK.bays * RACK.levels.length * RACK.per;

/** Upright with punched holes: a normal map of rounded slots running up the face. */
let uprightTex: THREE.CanvasTexture | undefined;
function uprightNormal() {
  if (uprightTex) return uprightTex;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgb(128,128,255)";
  g.fillRect(0, 0, 32, 64);
  // A teardrop slot: left wall lit from the left, right wall from the right.
  g.fillStyle = "rgb(60,128,200)";
  g.fillRect(12, 18, 4, 26);
  g.fillStyle = "rgb(196,128,200)";
  g.fillRect(16, 18, 4, 26);
  g.fillStyle = "rgb(128,80,200)";
  g.fillRect(12, 42, 8, 3);
  uprightTex = new THREE.CanvasTexture(c);
  uprightTex.wrapS = uprightTex.wrapT = THREE.RepeatWrapping;
  uprightTex.repeat.set(1, 40);
  return uprightTex;
}

let uprightMat: THREE.MeshStandardMaterial | undefined;
const upright = () =>
  (uprightMat ??= new THREE.MeshStandardMaterial({ color: "#2449C8", roughness: 0.42, metalness: 0.3, normalMap: uprightNormal(), normalScale: new THREE.Vector2(0.8, 0.8) }));

/** Slot positions in fill order: bottom level first, left to right, so totes leave from the top. */
export function rackSlot(i: number, out: THREE.Vector3) {
  const per = RACK.per;
  const perLevel = RACK.bays * per;
  const level = Math.floor(i / perLevel);
  const j = i % perLevel;
  const bay = Math.floor(j / per);
  const k = j % per;
  const x = -RACK.bay * (RACK.bays / 2) + bay * RACK.bay + (k + 0.5) * (RACK.bay / per);
  return out.set(x, RACK.levels[level] + 0.07 + CRATE.h / 2, 0);
}

/** The rack frame: uprights, beams, wire decks, bracing and base plates. */
export function RackFrame({ beacon }: { beacon?: React.Ref<THREE.MeshStandardMaterial> }) {
  const W = RACK.bay * RACK.bays;
  const xs = Array.from({ length: RACK.bays + 1 }, (_, i) => -W / 2 + i * RACK.bay);
  const D = RACK.depth;
  return (
    <group>
      {xs.map((x) =>
        [-D / 2, D / 2].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position-y={RACK.height / 2} material={upright()} castShadow receiveShadow>
              <boxGeometry args={[0.07, RACK.height, 0.05]} />
            </mesh>
            {/* Base plate */}
            <mesh position-y={0.006} material={steel("#8A8F98", 0.5)} receiveShadow>
              <boxGeometry args={[0.14, 0.012, 0.12]} />
            </mesh>
          </group>
        )),
      )}
      {/* Frame bracing between front and back uprights: horizontals and a zig-zag of diagonals */}
      {xs.map((x) => (
        <group key={x} position-x={x}>
          {[0.18, 2.25].map((y) => (
            <mesh key={y} position-y={y} material={upright()} castShadow>
              <boxGeometry args={[0.03, 0.03, D]} />
            </mesh>
          ))}
          {[0, 1, 2].map((n) => {
            const y0 = 0.18 + n * 0.69;
            const len = Math.hypot(0.69, D);
            return (
              <mesh key={n} position-y={y0 + 0.345} rotation-x={(n % 2 ? 1 : -1) * Math.atan2(0.69, D)} material={upright()} castShadow>
                <boxGeometry args={[0.025, 0.025, len]} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Beams (front and back) and wire mesh decks at each level */}
      {RACK.levels.slice(1).map((y) =>
        Array.from({ length: RACK.bays }, (_, b) => {
          const cx = -W / 2 + (b + 0.5) * RACK.bay;
          return (
            <group key={`${y}${b}`} position={[cx, y, 0]}>
              {[-D / 2, D / 2].map((z) => (
                <mesh key={z} position-z={z} material={paint(TINTS.tangerine, 0.38)} castShadow receiveShadow>
                  <boxGeometry args={[RACK.bay - 0.07, 0.11, 0.05]} />
                </mesh>
              ))}
              <mesh position-y={0.06} material={wire()} receiveShadow castShadow>
                <boxGeometry args={[RACK.bay - 0.08, 0.012, D - 0.02]} />
              </mesh>
            </group>
          );
        }),
      )}
      {/* Safety-stock marker: a red band on the left upright at the level stock must not fall below */}
      <mesh position={[-W / 2 - 0.045, RACK.levels[2] - 0.12, D / 2 + 0.03]} material={paint("#F2361F", 0.3)}>
        <boxGeometry args={[0.012, 0.08, 0.012]} />
      </mesh>
      {/* Warning beacon on top of the left frame */}
      <mesh position={[-W / 2, RACK.height + 0.05, D / 2]} material={steel("#3A3D43", 0.4)}>
        <cylinderGeometry args={[0.05, 0.06, 0.05, 24]} />
      </mesh>
      <mesh position={[-W / 2, RACK.height + 0.12, D / 2]}>
        <sphereGeometry args={[0.06, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={beacon} color="#F2361F" emissive="#F2361F" emissiveIntensity={0} roughness={0.2} transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

let wireMat: THREE.MeshStandardMaterial | undefined;
function wire() {
  if (wireMat) return wireMat;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 64, 6);
  g.fillRect(0, 0, 6, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 12);
  return (wireMat = new THREE.MeshStandardMaterial({ color: "#B9BEC6", metalness: 0.8, roughness: 0.35, alphaMap: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
}

let toteMat: THREE.Material | undefined;
/** SKU 4471's tote: the same saffron tote everywhere it appears (rack, pallets, truck). */
export const skuTote = () => (toteMat ??= plastic(TINTS.saffron, 0.45, true));
