import * as THREE from "three";
import { BEATS, M, ROAD_Z, TRUCK_X0 } from "@/lib/scene";
import { clamp01, smoothstep } from "@/lib/story";
import { FORK, TRUCK } from "./vehicles";

export const PALLETS = 3;
export const SLOT_X = TRUCK.slots.map((x) => TRUCK_X0 + x * M);
export const STAGE_Z = -0.42; // staged pallets wait here in the Plant 02 yard
const PICK_Z = STAGE_Z - FORK.load * M; // forklift origin when its forks are under a staged pallet
const BACK_Z = -0.76; // forklift origin clear of the pallets
const PLACE_Z = 0.05; // forklift origin when the pallet is over the deck
export const DECK_Z = (PLACE_Z + FORK.load * M - ROAD_Z) / M; // pallet z on the deck, in truck metres
const PARK: [number, number] = [-3.5, -0.74];
const FACE_Z = -Math.PI / 2; // the forklift model faces +x; this turns it toward the road

export type Lift = { x: number; z: number; yaw: number; h: number; trip: number; carry: boolean; pitch: number; roll: number };

const bez = (a: number, b: number, c: number, d: number, u: number) => {
  const v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
};

/** Where the forklift is, how high its forks are, and which pallet it holds, at decision progress t. */
export function liftAt(t: number, out: Lift): Lift {
  const [l0, l1] = BEATS.load;
  const all = clamp01((t - l0) / (l1 - l0)) * PALLETS;
  const k = Math.min(Math.floor(all), PALLETS - 1);
  const u = t >= l1 ? 1 : all - k;
  const x = SLOT_X[k];
  out.trip = t < l0 ? -1 : k;
  out.yaw = FACE_Z;
  out.carry = false;
  out.pitch = 0;
  out.roll = 0;
  if (t < l0) return Object.assign(out, { x: SLOT_X[0], z: BACK_Z, h: 0.06 });
  if (u < 0.12) {
    // Forks slide under the staged pallet
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(BACK_Z, PICK_Z, smoothstep(0, 0.12, u)), h: 0.06 });
  }
  if (u < 0.55) {
    // Lift clear, then drive to the trailer while raising the load over the deck
    out.carry = true;
    const h = u < 0.2 ? THREE.MathUtils.lerp(0.06, 0.2, smoothstep(0.12, 0.2, u)) : THREE.MathUtils.lerp(0.2, 1.72, smoothstep(0.24, 0.5, u));
    // Load mass deflection: chassis dips forward under load, then settles
    out.pitch = u < 0.28 ? -0.018 * Math.sin(smoothstep(0.12, 0.28, u) * Math.PI) : 0;
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(PICK_Z, PLACE_Z, smoothstep(0.2, 0.55, u)), h });
  }
  if (u < 0.64) {
    // Set it down on the deck; the forks drop out of the pallet
    out.carry = u < 0.6;
    out.pitch = 0.012 * Math.sin(smoothstep(0.55, 0.64, u) * Math.PI);
    return Object.assign(out, { x, z: PLACE_Z, h: THREE.MathUtils.lerp(1.72, 1.44, smoothstep(0.55, 0.63, u)) });
  }
  // Reverse out on a curve to the next pallet's lane (or to park), lowering the forks
  const r = smoothstep(0.64, 1, u);
  const [nx, nz] = k < PALLETS - 1 ? [SLOT_X[k + 1], BACK_Z] : PARK;
  const px = bez(x, x, nx, nx, r);
  const pz = bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r);
  // Heading follows the path: reversing, so the forks point away from the direction of travel.
  const e = 0.01;
  const r2 = Math.min(r + e, 1);
  const r1 = r2 - e;
  const dx = bez(x, x, nx, nx, r2) - bez(x, x, nx, nx, r1);
  const dz = bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r2) - bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r1);
  out.yaw = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dz, -dx) : FACE_Z;
  // Centrifugal body roll while curving
  out.roll = THREE.MathUtils.clamp((out.yaw - FACE_Z) * 0.08, -0.02, 0.02);
  return Object.assign(out, { x: px, z: pz, h: THREE.MathUtils.lerp(1.44, 0.06, smoothstep(0.64, 0.9, u)) });
}

/** Where each pallet is: 0 staged in the yard, 1 on the forks, 2 on the trailer. */
export function palletStates(t: number, lift: Lift) {
  return Array.from({ length: PALLETS }, (_, i) => {
    if (t >= BEATS.load[1] || i < lift.trip) return 2;
    if (i > lift.trip) return 0;
    if (lift.carry) return 1;
    return lift.h > 1 || lift.z > PICK_Z + 0.05 ? 2 : 0;
  });
}

