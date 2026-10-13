import * as THREE from "three";
import { BEATS, M, ROAD_Z, TRUCK_X0, TRUCK_X1 } from "@/lib/scene";
import { clamp01, smoothstep } from "@/lib/story";
import { FORK, TRUCK } from "./vehicles";

export const PALLETS = 3;
export const SLOT_X = TRUCK.slots.map((x) => TRUCK_X0 + x * M);
/** Plant 01's bays: where the unloaded pallets are set down, across the road from the parked trailer. */
export const DROP_X = TRUCK.slots.map((x) => TRUCK_X1 + x * M);
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

const UNLOAD_END: [number, number] = [DROP_X[PALLETS - 1] - 0.62, -0.74];

/**
 * Plant 01's forklift at decision progress t: it waits in lane 0, then for each pallet drives up to the
 * trailer with its forks raised, lifts the pallet off the deck, reverses back to the bay while lowering,
 * sets it down and backs out to the next lane (the loading trip in reverse). Parks clear after the last.
 */
export function unloadAt(t: number, out: Lift): Lift {
  const [a, b] = BEATS.unload;
  const all = clamp01((t - a) / (b - a)) * PALLETS;
  const k = Math.min(Math.floor(all), PALLETS - 1);
  const u = t >= b ? 1 : all - k;
  const x = DROP_X[k];
  out.trip = t < a ? -1 : t >= b ? PALLETS : k;
  out.yaw = FACE_Z;
  out.carry = false;
  out.pitch = 0;
  out.roll = 0;
  if (t < a) return Object.assign(out, { x: DROP_X[0], z: BACK_Z, h: 0.06 });
  if (u < 0.28) {
    // Forward to the trailer, raising the forks to the deck as it comes
    const h = THREE.MathUtils.lerp(0.06, 1.44, smoothstep(0.06, 0.26, u));
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(BACK_Z, PLACE_Z, smoothstep(0, 0.28, u)), h });
  }
  if (u < 0.36) {
    // Lift the pallet clear of the deck
    out.carry = u > 0.3;
    return Object.assign(out, { x, z: PLACE_Z, h: THREE.MathUtils.lerp(1.44, 1.72, smoothstep(0.28, 0.36, u)) });
  }
  if (u < 0.72) {
    // Reverse to the bay, lowering the load; the chassis dips as the weight comes on
    out.carry = true;
    out.pitch = u < 0.5 ? -0.016 * Math.sin(smoothstep(0.36, 0.5, u) * Math.PI) : 0;
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(PLACE_Z, PICK_Z, smoothstep(0.36, 0.72, u)), h: THREE.MathUtils.lerp(1.72, 0.2, smoothstep(0.42, 0.7, u)) });
  }
  if (u < 0.8) {
    // Set it down in the bay
    out.carry = u < 0.77;
    return Object.assign(out, { x, z: PICK_Z, h: THREE.MathUtils.lerp(0.2, 0.06, smoothstep(0.72, 0.78, u)) });
  }
  // Back out of the pallet, on a curve to the next lane (or to park)
  const r = smoothstep(0.8, 1, u);
  const [nx, nz] = k < PALLETS - 1 ? [DROP_X[k + 1], BACK_Z] : UNLOAD_END;
  const px = bez(x, x, nx, nx, r);
  const pz = bez(PICK_Z, PICK_Z - 0.12, nz + 0.1, nz, r);
  const e = 0.01;
  const r2 = Math.min(r + e, 1);
  const r1 = r2 - e;
  const dx = bez(x, x, nx, nx, r2) - bez(x, x, nx, nx, r1);
  const dz = bez(PICK_Z, PICK_Z - 0.12, nz + 0.1, nz, r2) - bez(PICK_Z, PICK_Z - 0.12, nz + 0.1, nz, r1);
  out.yaw = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dz, -dx) : FACE_Z;
  out.roll = THREE.MathUtils.clamp((out.yaw - FACE_Z) * 0.08, -0.02, 0.02);
  return Object.assign(out, { x: px, z: pz, h: 0.06 });
}

/**
 * Where each pallet is: 0 staged in the Plant 02 yard, 1 on the loading forks, 2 on the trailer, and,
 * when Plant 01's forklift is given, 4 on its forks and 3 set down in Plant 01's bays. Writes into `out`.
 */
export function palletStates(t: number, lift: Lift, out: number[] = new Array(PALLETS), unload?: Lift) {
  for (let i = 0; i < PALLETS; i++) {
    if (t >= BEATS.load[1] || i < lift.trip) out[i] = 2;
    else if (i > lift.trip) out[i] = 0;
    else if (lift.carry) out[i] = 1;
    else out[i] = lift.h > 1 || lift.z > PICK_Z + 0.05 ? 2 : 0;
    if (!unload || unload.trip < 0 || out[i] !== 2) continue;
    if (i < unload.trip) out[i] = 3;
    else if (i === unload.trip) out[i] = unload.carry ? 4 : unload.h < 1 && unload.z < PLACE_Z - 0.2 ? 3 : 2;
  }
  return out;
}

