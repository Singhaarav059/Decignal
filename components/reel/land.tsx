"use client";

// The island the whole story happens on, in metres, x along the road, z towards the viewer, ground
// at y = 0: the container quay along the north edge, Plant 02 with its dispatch yard on the left,
// Plant 01 on the right, the head office, sales and service beside them, the road the transfer
// truck drives, and a promenade along the south sea wall. The ground is painted into one texture
// (grass, concrete, asphalt, markings); the land runs on east as a simpler strip.
import * as THREE from "three";
import { useMemo } from "react";
import { TINTS } from "../three/palette";
import { aluminium, enamel, lamp, steel } from "../three/materials";
import { Cherry, Petals, Pine, StoneLantern } from "./garden";
import { Houses } from "./town";
import { SITE } from "./harbour";
import { nightGlow } from "./glow";
import { RECORDS } from "@/lib/records";
import { asGround, canvasTexture, displayText, fitDisplay, sans } from "./sets";

/* ------------------------------------------------------------------ */
/* Painted ground                                                       */
/* ------------------------------------------------------------------ */

type Painter = (g: CanvasRenderingContext2D, X: (x: number) => number, Z: (z: number) => number, s: number) => void;

function rng(seed: number) {
  let s = Math.abs(Math.round(seed)) * 7919 + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Grass: a soft sage with mown stripes, gentle patches and fine speckle. */
function grass(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed = 1) {
  g.fillStyle = "#A9BC9C";
  g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < 60; i++) {
    const cx = x + r() * w;
    const cy = y + r() * h;
    const rad = 30 + r() * 140;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, r() > 0.5 ? "rgba(112,146,120,0.2)" : "rgba(214,228,206,0.22)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < (w * h) / 60; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(84,116,96,0.16)" : "rgba(232,240,226,0.18)";
    g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
  }
}

/** Concrete paving: cool grey slabs with saw-cut joints and faint weathering. */
function concreteSlab(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, joint: number, seed = 2, base = "#D5DAE0") {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 9000; i++) {
    const cx = x + r() * w;
    const cy = y + r() * h;
    const rad = 10 + r() * 60;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, r() > 0.6 ? "rgba(90,104,124,0.07)" : "rgba(250,252,255,0.1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.fillStyle = "rgba(70,84,104,0.2)";
  for (let jx = x + joint; jx < x + w; jx += joint) g.fillRect(jx, y, 1.2, h);
  for (let jy = y + joint; jy < y + h; jy += joint) g.fillRect(x, jy, w, 1.2);
}

/** Asphalt: cool dark grey, aggregate speckle, two worn wheel tracks per lane, a few sealed cracks. */
function asphaltStrip(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: number, seed = 3) {
  g.fillStyle = "#555C67";
  g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 14; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(0,0,0,${0.05 + r() * 0.08})`;
    g.fillRect(x + r() * w, y + r() * h, 1.2, 1.2);
  }
  for (const k of [0.2, 0.36, 0.64, 0.8]) {
    const cy = y + h * k;
    const gr = g.createLinearGradient(0, cy - 0.4 * s, 0, cy + 0.4 * s);
    gr.addColorStop(0, "rgba(20,24,32,0)");
    gr.addColorStop(0.5, "rgba(20,24,32,0.14)");
    gr.addColorStop(1, "rgba(20,24,32,0)");
    g.fillStyle = gr;
    g.fillRect(x, cy - 0.4 * s, w, 0.8 * s);
  }
  g.strokeStyle = "rgba(18,22,30,0.35)";
  g.lineWidth = 1.2;
  for (let i = 0; i < w / (8 * s); i++) {
    let cx = x + r() * w;
    let cy = y + r() * h;
    g.beginPath();
    g.moveTo(cx, cy);
    for (let k = 0; k < 6; k++) g.lineTo((cx += (r() - 0.3) * 0.8 * s), (cy += (r() - 0.5) * 0.6 * s));
    g.stroke();
  }
}

/** One flat mesh carrying a painted ground, W x D metres, centred on (cx, cz). */
function PaintedGround({ W, D, cx = 0, cz = 0, ppm, paint }: { W: number; D: number; cx?: number; cz?: number; ppm: number; paint: Painter }) {
  const { geometry, material } = useMemo(() => {
    const cw = Math.min(4096, Math.round(W * ppm));
    const ch = Math.round((cw * D) / W);
    const map = canvasTexture(cw, ch, (g, w) => {
      const s = w / W;
      paint(g, (x) => (x - cx + W / 2) * s, (z) => (z - cz + D / 2) * s, s);
    });
    map.anisotropy = 16;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 });
    const geometry = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2).translate(cx, 0, cz);
    return { geometry, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, D, cx, cz, ppm]);
  return <mesh ref={asGround} geometry={geometry} material={material} receiveShadow />;
}

/** Road markings: edge lines and a dashed centre line, in metres along the road. */
function roadLines(g: CanvasRenderingContext2D, X: (x: number) => number, Z: (z: number) => number, s: number, x0: number, x1: number, z0: number, z1: number) {
  g.fillStyle = "rgba(240,244,248,0.92)";
  const lw = Math.max(0.12 * s, 1.2);
  for (const z of [z0 + 0.35, z1 - 0.35]) g.fillRect(X(x0), Z(z) - lw / 2, (x1 - x0) * s, lw);
  const mid = (z0 + z1) / 2;
  for (let x = x0; x < x1; x += 6) g.fillRect(X(x), Z(mid) - lw / 2, 3 * s, lw);
}

/* ------------------------------------------------------------------ */
/* Street lamps                                                         */
/* ------------------------------------------------------------------ */

/** A street lamp: a slim steel column, an outreach arm and a flat LED head that lights at dusk. */
export function StreetLamp(p: React.ComponentProps<"group">) {
  return (
    <group {...p}>
      <mesh position-y={3.5} material={steel("#5A6476", 0.45)} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 7, 12]} />
      </mesh>
      <mesh position={[0, 6.95, 0.6]} rotation-x={Math.PI / 2} material={steel("#5A6476", 0.45)} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.2, 8]} />
      </mesh>
      <mesh position={[0, 6.9, 1.25]} material={enamel("#2E3646", 0.4)} castShadow>
        <boxGeometry args={[0.32, 0.1, 0.6]} />
      </mesh>
      <mesh position={[0, 6.845, 1.25]} material={nightGlow("#FFF1D8", 2.6, 0.15, "#E6EAF0")}>
        <boxGeometry args={[0.26, 0.01, 0.5]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The site: two plants, the container quay, the road, the promenade   */
/* ------------------------------------------------------------------ */

export const LAND = {
  /** Each plant's centre: Plant 02 on the left, Plant 01 on the right. Each faces the road at plantZ + 5. */
  plants: [-14, 14],
  plantZ: -10,
  road: { z0: 1.2, z1: 8.2 },
  /** The promenade along the south sea wall. */
  walk: { z0: 8.2, z1: 9.6 },
  /** Where the other systems live, beside the plants. */
  office: { x: 36, z: -9.5 },
  sales: { x: 54, z: -6.5 },
  service: { x: 54, z: -21 },
};

/**
 * Plant 02's dispatch yard, in world metres: the apron runs from the plant to the kerb, the six
 * pallets are staged in painted bays, and the truck waits at the kerb alongside them.
 */
export const YARD = {
  /** The truck's origin while it loads, on the lane by the kerb, facing Plant 01 (+x). */
  truckX: -18.4,
  truckZ: 3.1,
  bayZ: -1.3,
  board: { x: -24.2, z: -2.2 },
};

/** Pallet positions along the trailer deck, rear to front, in truck metres. */
export const PALLET_SLOTS = [-4.1, -2.7, -1.3, 0.1, 1.5, 2.9];
/** x of staging bay i (and of pallet slot i on the trailer). */
export const bayX = (i: number) => YARD.truckX + PALLET_SLOTS[i];

/** The painted core of the site, from the west tip to the service centre, quay to sea wall. */
const CORE = { x0: SITE.west, x1: 64, z0: SITE.north, z1: SITE.south };
/** Where the eastern container quay ends and the plain coast begins. */
const EAST_QUAY = 130;

export function Ground() {
  const { road, walk, plants, plantZ, office, sales, service } = LAND;
  const front = plantZ + 5;
  const W = CORE.x1 - CORE.x0;
  const D = CORE.z1 - CORE.z0;
  return (
    <>
      <PaintedGround
        W={W}
        D={D}
        cx={(CORE.x0 + CORE.x1) / 2}
        cz={(CORE.z0 + CORE.z1) / 2}
        ppm={41}
        paint={(g, X, Z, s) => {
          grass(g, 0, 0, g.canvas.width, g.canvas.height, 7);
          // The container quay: one paved apron from the quay edge back to the plants
          concreteSlab(g, X(CORE.x0), Z(CORE.z0), W * s, (-16.6 - CORE.z0) * s, 6 * s, 41, "#CCD3DB");
          // Crane rails, the quay's safety line and the container slots
          g.fillStyle = "rgba(60,70,88,0.75)";
          for (const z of [SITE.quay.seaLegs, SITE.quay.landLegs]) g.fillRect(X(CORE.x0), Z(z) - 0.08 * s, W * s, 0.16 * s);
          g.fillStyle = "rgba(242,194,48,0.9)";
          g.fillRect(X(CORE.x0), Z(CORE.z0 + 0.9), W * s, 0.12 * s);
          g.strokeStyle = "rgba(248,250,252,0.55)";
          g.lineWidth = Math.max(0.08 * s, 1);
          for (const x of [-30, -17.2, -2, 10.8, 40]) for (let row = 0; row < 4; row++) g.strokeRect(X(x - 6.2), Z(-33.5 + row * 2.7 - 1.25), 12.4 * s, 2.5 * s);
          // Plant 01: an apron and a driveway down to the road
          const p1 = plants[1];
          concreteSlab(g, X(p1 - 11), Z(plantZ - 6.6), 22 * s, (front + 0.4 - (plantZ - 6.6)) * s, 6 * s, 3 + p1);
          concreteSlab(g, X(p1 - 7.6), Z(front), 5.2 * s, (road.z0 - front) * s, 6 * s, 9 + p1);
          g.fillStyle = "rgba(242,194,48,0.85)";
          for (const dx of [0.6, 4.6]) for (const sx of [-1, 1]) g.fillRect(X(p1 + dx + sx * 1.75) - 0.06 * s, Z(front + 0.2), 0.12 * s, 4.6 * s);
          // Plant 02: its dispatch yard runs from the plant right down to the kerb
          const p2 = plants[0];
          concreteSlab(g, X(p2 - 12), Z(plantZ - 6.6), 24 * s, (road.z0 - (plantZ - 6.6)) * s, 6 * s, 21);
          g.strokeStyle = "rgba(242,194,48,0.95)";
          g.lineWidth = 0.08 * s;
          for (let i = 0; i < 6; i++) g.strokeRect(X(bayX(i) - 0.55), Z(YARD.bayZ - 0.75), 1.1 * s, 1.5 * s);
          g.fillStyle = "rgba(242,194,48,0.85)";
          g.fillRect(X(p2 - 10), Z(front + 0.9), 20 * s, 0.1 * s);
          // Office forecourt, with two lawn panels, and the sales and service forecourts
          concreteSlab(g, X(office.x - 9.5), Z(office.z - 7), 19 * s, (road.z0 - (office.z - 7)) * s, 3 * s, 51, "#DDE2E8");
          grass(g, X(office.x - 8), Z(office.z + 7), 5 * s, 3.4 * s, 52);
          grass(g, X(office.x + 3), Z(office.z + 7), 5 * s, 3.4 * s, 53);
          concreteSlab(g, X(sales.x - 8), Z(service.z - 6), 16 * s, (road.z0 - (service.z - 6)) * s, 3 * s, 54, "#DDE2E8");
          // The west tip: paving at the root of the pier
          concreteSlab(g, X(SITE.west), Z(SITE.pier.z - 3), 7 * s, 6 * s, 1.2 * s, 61, "#DDE2E8");
          // The road both plants share, its kerbs, and the promenade along the sea wall
          g.fillStyle = "#C8CFD8";
          g.fillRect(0, Z(road.z0 - 0.3), g.canvas.width, 0.3 * s);
          g.fillRect(X(p2 + 12), Z(road.z0 - 1.1), (office.x - 9.5 - (p2 + 12)) * s, 1.1 * s);
          asphaltStrip(g, 0, Z(road.z0), g.canvas.width, (road.z1 - road.z0) * s, s, 4);
          roadLines(g, X, Z, s, CORE.x0, CORE.x1, road.z0, road.z1);
          concreteSlab(g, 0, Z(walk.z0), g.canvas.width, (walk.z1 - walk.z0) * s, 1.4 * s, 71, "#E1E5EA");
          // A gravel strip under the lanterns, raked along the promenade
          g.fillStyle = "#D2D8DF";
          g.fillRect(0, Z(walk.z1 + 1.1), g.canvas.width, 1.4 * s);
          g.strokeStyle = "rgba(150,162,178,0.35)";
          g.lineWidth = 1;
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.moveTo(0, Z(walk.z1 + 1.25 + k * 0.25));
            g.lineTo(g.canvas.width, Z(walk.z1 + 1.25 + k * 0.25));
            g.stroke();
          }
        }}
      />
      {/* The container quay east of the offices, under the cranes, and the coast road past it */}
      <PaintedGround
        W={EAST_QUAY - CORE.x1}
        D={D}
        cx={(EAST_QUAY + CORE.x1) / 2}
        cz={(CORE.z0 + CORE.z1) / 2}
        ppm={30}
        paint={(g, X, Z, s) => {
          grass(g, 0, 0, g.canvas.width, g.canvas.height, 27);
          concreteSlab(g, 0, Z(CORE.z0), g.canvas.width, (-14 - CORE.z0) * s, 6 * s, 43, "#CCD3DB");
          g.fillStyle = "rgba(60,70,88,0.75)";
          for (const z of [SITE.quay.seaLegs, SITE.quay.landLegs]) g.fillRect(0, Z(z) - 0.08 * s, g.canvas.width, 0.16 * s);
          g.fillStyle = "rgba(242,194,48,0.9)";
          g.fillRect(0, Z(CORE.z0 + 0.9), g.canvas.width, 0.12 * s);
          g.strokeStyle = "rgba(248,250,252,0.55)";
          g.lineWidth = Math.max(0.08 * s, 1);
          for (const x of [70, 82.8, 95.6]) for (let row = 0; row < 4; row++) g.strokeRect(X(x - 6.2), Z(-33.5 + row * 2.7 - 1.25), 12.4 * s, 2.5 * s);
          // A gate road from the quay down to the coast road
          concreteSlab(g, X(112), Z(-14), 8 * s, (road.z0 + 14) * s, 4 * s, 44, "#D5DAE0");
          g.fillStyle = "#C8CFD8";
          g.fillRect(0, Z(road.z0 - 0.3), g.canvas.width, 0.3 * s);
          asphaltStrip(g, 0, Z(road.z0), g.canvas.width, (road.z1 - road.z0) * s, s, 24);
          roadLines(g, X, Z, s, CORE.x1, EAST_QUAY, road.z0, road.z1);
          concreteSlab(g, 0, Z(walk.z0), g.canvas.width, (walk.z1 - walk.z0) * s, 1.4 * s, 72, "#E1E5EA");
        }}
      />
      {/* The land running on east along the coast: the road, the promenade, grass */}
      <PaintedGround
        W={SITE.east - EAST_QUAY}
        D={D}
        cx={(SITE.east + EAST_QUAY) / 2}
        cz={(CORE.z0 + CORE.z1) / 2}
        ppm={6}
        paint={(g, X, Z, s) => {
          grass(g, 0, 0, g.canvas.width, g.canvas.height, 17);
          g.fillStyle = "#C8CFD8";
          g.fillRect(0, Z(road.z0 - 0.3), g.canvas.width, 0.3 * s);
          asphaltStrip(g, 0, Z(road.z0), g.canvas.width, (road.z1 - road.z0) * s, s, 14);
          roadLines(g, X, Z, s, EAST_QUAY, SITE.east, road.z0, road.z1);
          g.fillStyle = "#E1E5EA";
          g.fillRect(0, Z(walk.z0), g.canvas.width, (walk.z1 - walk.z0) * s);
        }}
      />
    </>
  );
}

/** Houses running on east along the coast road. */
const HOUSE_SPOTS = [
  { x: 140, z: -10, w: 8, d: 7 },
  { x: 152, z: -12, w: 9, d: 7, ry: 0.05 },
  { x: 165, z: -9, w: 7, d: 6 },
  { x: 144, z: -26, w: 9, d: 8 },
  { x: 159, z: -28, w: 8, d: 7, ry: -0.06 },
  { x: 178, z: -12, w: 9, d: 7 },
  { x: 192, z: -10, w: 8, d: 6 },
  { x: 174, z: -30, w: 10, d: 8 },
  { x: 206, z: -14, w: 9, d: 7 },
  { x: 222, z: -11, w: 8, d: 7 },
  { x: 198, z: -32, w: 8, d: 7 },
];

/**
 * Planting and furniture: black pines on the west tip and between the plants, cherry trees at
 * either end of the promenade, stone lanterns along it, street lamps along the road. Nothing tall
 * stands on the promenade in front of the yard, so the truck is never hidden on its drive.
 */
export function Verges() {
  const { road, walk } = LAND;
  const lanternZ = walk.z1 + 1.8;
  return (
    <group>
      <Pine seed={1} h={9} position={[-32.5, 0, 9.5]} />
      <Pine seed={2} h={7.5} position={[-29, 0, -9]} />
      <Pine seed={3} h={8.5} position={[0, 0, -6.5]} />
      <Pine seed={4} h={7} position={[25.5, 0, -15.5]} />
      <Pine seed={5} h={8} position={[45, 0, -15]} />
      <Pine seed={6} h={9.5} position={[62, 0, 11.6]} />
      <Cherry seed={1} h={6.8} position={[38, 0, 11.6]} />
      <Cherry seed={2} h={6} position={[46, 0, 12]} />
      <Cherry seed={3} h={6.4} position={[-27, 0, 11.8]} />
      <Petals centres={[[38, 11.6], [46, 12], [-27, 11.8]]} />
      {[-21, -7, 7, 21, 31].map((x) => (
        <StoneLantern key={x} position={[x, 0, lanternZ]} />
      ))}
      <StoneLantern position={[-34.2, 0, SITE.pier.z - 2.6]} />
      <StoneLantern position={[-34.2, 0, SITE.pier.z + 2.6]} />
      {[-30, -6, 8, 22, 44, 60].map((x) => (
        <StreetLamp key={x} position={[x, 0, road.z0 - 0.6]} />
      ))}
      <Houses spots={HOUSE_SPOTS} />
      {[146, 170, 186, 214].map((x, i) => (
        <Pine key={x} seed={20 + i} h={8 + (i % 2) * 2} position={[x, 0, -19 - (i % 2) * 4]} />
      ))}
    </group>
  );
}

/** The dispatch board, on two posts at the end of the bays: the decision is posted on it (`children`). */
export function DispatchBoard({ children }: { children?: React.ReactNode }) {
  const { board } = YARD;
  return (
    <group position={[board.x, 0, board.z]} rotation-y={0.35}>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} material={steel("#5A6476", 0.45)} castShadow>
          <boxGeometry args={[0.1, 2.5, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 2.35, -0.04]} material={enamel("#222A3A", 0.45)} castShadow>
        <boxGeometry args={[2.7, 1.75, 0.08]} />
      </mesh>
      <mesh position={[0, 3.32, 0.12]} material={aluminium(0.3)} castShadow>
        <boxGeometry args={[1.4, 0.06, 0.32]} />
      </mesh>
      <mesh position={[0, 3.285, 0.16]} material={lamp("#FFF4DE", 1.1)}>
        <boxGeometry args={[1.3, 0.01, 0.2]} />
      </mesh>
      <group position={[0, 2.35, 0.03]}>{children}</group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Plant 01's operations display                                        */
/* ------------------------------------------------------------------ */

export type OpsState = { step: number; facts: number; units: number };

/** What the display shows: the stock running down, then the six facts, then the recommendation. */
export function drawOps(g: CanvasRenderingContext2D, w: number, h: number, st: OpsState) {
  const f = sans();
  g.fillStyle = "#101318";
  g.fillRect(0, 0, w, h);
  // Header
  g.fillStyle = "#1B2028";
  g.fillRect(0, 0, w, 120);
  g.fillStyle = "#FFFFFF";
  g.font = `700 52px ${f}`;
  g.textBaseline = "middle";
  g.fillText("SKU 4471 · BEARING 6204 · PLANT 01", 48, 62);
  const chip = st.step === 2 ? ["RECOMMENDATION", "#0A7A55"] : st.units < 175 ? ["BELOW SAFETY STOCK", "#F2361F"] : ["ON PLAN", "#3A4250"];
  g.font = `800 38px ${f}`;
  const cw = g.measureText(chip[0]).width + 60;
  g.fillStyle = chip[1];
  g.beginPath();
  g.roundRect(w - cw - 40, 30, cw, 64, 32);
  g.fill();
  g.fillStyle = "#FFFFFF";
  g.fillText(chip[0], w - cw - 10, 63);
  g.textBaseline = "alphabetic";

  if (st.step === 0) {
    // On hand, large, and the stock line falling through safety stock
    g.fillStyle = "#FFFFFF";
    displayText(g, String(st.units), 60, 420, 260);
    g.fillStyle = "#DCE2EA";
    g.font = `600 54px ${f}`;
    g.fillText("units on hand", 66, 500);
    g.fillText("Short on day 6", 66, 570);
    const x0 = 760, x1 = w - 60, y0 = 200, y1 = h - 90;
    const Y = (v: number) => y1 - ((v - 100) / 160) * (y1 - y0);
    g.strokeStyle = "#3A4250";
    g.lineWidth = 3;
    g.setLineDash([16, 14]);
    g.beginPath();
    g.moveTo(x0, Y(175));
    g.lineTo(x1, Y(175));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#C3CBD6";
    g.font = `600 40px ${f}`;
    g.fillText("Safety stock 175", x0 + 10, Y(175) - 18);
    const pts = [240, 228, 212, 196, 181, 163, 145, 128, 110];
    g.strokeStyle = TINTS.cobalt;
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.beginPath();
    pts.forEach((v, i) => {
      const x = x0 + (i / (pts.length - 1)) * (x1 - x0);
      if (i === 0) g.moveTo(x, Y(v));
      else g.lineTo(x, Y(v));
    });
    g.stroke();
    const xd = x0 + (6 / 8) * (x1 - x0);
    g.fillStyle = "#F2361F";
    g.beginPath();
    g.arc(xd, Y(145), 16, 0, Math.PI * 2);
    g.fill();
    g.font = `700 42px ${f}`;
    g.fillText("Day 6", xd - 56, Y(145) + 70);
    return;
  }

  if (st.step === 1) {
    // Six facts, one per system, arriving one by one
    const cols = 3;
    const pad = 40;
    const tw = (w - pad * (cols + 1)) / cols;
    const th = (h - 120 - pad * 3) / 2;
    RECORDS.forEach((r, i) => {
      const x = pad + (i % cols) * (tw + pad);
      const y = 120 + pad + Math.floor(i / cols) * (th + pad);
      const on = i < st.facts;
      g.globalAlpha = on ? 1 : 0.22;
      g.fillStyle = "#1B2028";
      g.beginPath();
      g.roundRect(x, y, tw, th, 22);
      g.fill();
      g.fillStyle = r.tone;
      g.beginPath();
      g.roundRect(x, y, 14, th, [22, 0, 0, 22]);
      g.fill();
      g.fillStyle = r.tone;
      g.font = `800 44px ${f}`;
      g.fillText(r.sys.toUpperCase(), x + 44, y + 72);
      g.fillStyle = "#E3E8EF";
      g.font = `600 42px ${f}`;
      g.fillText(r.field, x + 44, y + 128);
      g.fillStyle = "#FFFFFF";
      // Each value sized to fit its card, so long ones (Planner approves) never run off the edge.
      const value = r.value.toUpperCase();
      displayText(g, value, x + 44, y + th - 50, fitDisplay(g, value, tw - 80, 96));
      g.globalAlpha = 1;
    });
    return;
  }

  // The recommendation, with its reasons counted
  // A deeper green than the brand emerald, so white text on it passes AA contrast.
  g.fillStyle = "#0A7A55";
  g.beginPath();
  g.roundRect(48, 168, w - 96, h - 216, 30);
  g.fill();
  g.fillStyle = "#FFFFFF";
  g.font = `700 46px ${f}`;
  g.fillText("TRF-0240 · 6 FACTS · 6 SYSTEMS", 100, 262);
  g.fillStyle = "#FFFFFF";
  displayText(g, "TRANSFER 240 UNITS", 92, 430, 128);
  displayText(g, "FROM PLANT 02", 92, 560, 128);
  g.fillStyle = "#FFFFFF";
  g.font = `600 50px ${f}`;
  g.fillText("Arrives day 4, two days before the shortfall", 100, 690);
  g.fillText("Awaiting planner approval", 100, 760);
}

/** The display's texture and a redraw that only repaints when what it shows changes. */
export function opsScreen() {
  const w = 1800;
  const h = 1000;
  let last = "";
  let st: OpsState = { step: 0, facts: 0, units: 240 };
  const texture = canvasTexture(w, h, (g) => drawOps(g, w, h, st));
  texture.anisotropy = 8;
  const update = (next: OpsState) => {
    const key = `${next.step}-${next.facts}-${next.units}`;
    if (key === last) return;
    last = key;
    st = next;
    const g = (texture.image as HTMLCanvasElement).getContext("2d")!;
    drawOps(g, w, h, st);
    texture.needsUpdate = true;
  };
  return { texture, update };
}
