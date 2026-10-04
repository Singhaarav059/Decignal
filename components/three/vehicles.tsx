"use client";

// Vehicles, modelled at 1 unit = 1 metre and scaled into the scene by their parent.
// The truck is a European cab-over tractor with a flatbed trailer; the forklift is a
// counterbalance truck with a working mast. Wheels roll exactly as far as the vehicle travels.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { aluminium, chrome, darkGlass, enamel, lamp, paint, rubber, steel } from "./materials";
import { Wheel, box, cylX, cylY, cylZ, geo, merge, profile, rbox } from "./parts";

/* ------------------------------------------------------------------ */
/* Shared: rolling wheels and a body that settles on its suspension    */
/* ------------------------------------------------------------------ */

function useRolling(radius: number, idle = 0) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const state = useMemo(() => ({ last: null as THREE.Vector3 | null, lean: 0, v: new THREE.Vector3(), s: new THREE.Vector3(), fwd: new THREE.Vector3() }), []);
  useFrame(({ clock }, dt) => {
    const r = root.current;
    if (!r) return;
    r.getWorldPosition(state.v);
    r.getWorldScale(state.s);
    state.fwd.set(1, 0, 0).transformDirection(r.matrixWorld);
    let d = 0;
    if (state.last) d = state.fwd.dot(state.v.clone().sub(state.last)) / Math.max(state.s.x, 1e-4);
    state.last = (state.last ?? new THREE.Vector3()).copy(state.v);
    // Each wheel turns by distance / its own radius (stored on the group).
    wheels.current.forEach((w) => w && (w.rotation.z -= d / ((w.userData.r as number) ?? radius)));
    const speed = dt > 0 ? d / dt : 0;
    // Pitch back under acceleration, forward under braking, settle when parked.
    state.lean = THREE.MathUtils.damp(state.lean, THREE.MathUtils.clamp(speed * 0.0016, -0.012, 0.012), 4, Math.min(dt, 1 / 30));
    if (body.current) {
      body.current.rotation.z = state.lean;
      // Rolling: a slow road bounce. Parked with the engine on: a faint, fast idle shiver.
      body.current.position.y = Math.abs(speed) > 0.2 ? Math.sin(clock.elapsedTime * 13) * 0.006 : Math.sin(clock.elapsedTime * 41) * idle;
    }
  });
  const spin = (r: number) => (g: THREE.Group | null) => {
    if (g) {
      g.userData.r = r;
      if (!wheels.current.includes(g)) wheels.current.push(g);
    }
  };
  return { root, body, spin };
}

/* ------------------------------------------------------------------ */
/* Semi truck                                                           */
/* ------------------------------------------------------------------ */

export const TRUCK = {
  length: 13.3,
  front: 8.3, // x of the front bumper
  rear: -5.0, // x of the trailer's rear
  deckY: 1.56, // trailer deck height
  slots: [3.6, 0.95, -1.7], // pallet positions on the deck (x), loaded front to back
  axles: [-2.75, -4.06], // trailer axles
};

function cabShell() {
  return geo("cab-shell", () =>
    profile(
      [
        [5.95, 1.22],
        [8.08, 1.22],
        [8.22, 1.34],
        [8.25, 2.3],
        [8.14, 3.18],
        [8.06, 3.42],
        [7.9, 3.62],
        [7.62, 3.78],
        [7.2, 3.86],
        [6.15, 3.88],
        [6.0, 3.8],
        [5.95, 3.6],
      ],
      2.46,
      0.09,
    ),
  );
}

function cabDark() {
  return geo("cab-dark", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Grille and its frame
    parts.push(rbox(0.06, 0.62, 1.82, 0.03, 8.24, 1.66, 0));
    // Bumper
    parts.push(rbox(0.38, 0.5, 2.5, 0.08, 8.12, 0.92, 0));
    // Steps under the door, both sides
    for (const s of [-1, 1]) {
      parts.push(rbox(0.62, 0.05, 0.24, 0.02, 7.55, 0.58, s * 1.12));
      parts.push(rbox(0.62, 0.05, 0.24, 0.02, 7.55, 0.92, s * 1.12));
      parts.push(box(0.04, 0.5, 0.2, 7.25, 0.78, s * 1.12));
      parts.push(box(0.04, 0.5, 0.2, 7.85, 0.78, s * 1.12));
    }
    // Front mudguard over the steer axle
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 32, 1, true, Math.PI * 0.05, Math.PI * 0.9);
      g.rotateX(Math.PI / 2).rotateZ(Math.PI / 2 + Math.PI * 0.0).translate(7.05, 0.52, s * 1.03);
      parts.push(g);
    }
    // Door seams and the sleeper panel seam
    for (const s of [-1, 1]) {
      const z = s * 1.236;
      parts.push(box(0.014, 2.05, 0.006, 6.92, 2.28, z));
      parts.push(box(0.014, 0.95, 0.006, 8.0, 1.78, z));
      parts.push(box(1.08, 0.014, 0.006, 7.46, 1.27, z));
      // Sleeper vent
      for (let i = 0; i < 4; i++) parts.push(box(0.36, 0.016, 0.006, 6.42, 2.0 + i * 0.06, z));
    }
    // Rubber surround of the windshield
    const a = Math.atan2(0.11, 0.88);
    const ws = (g: THREE.BufferGeometry) => g.rotateZ(a).translate(8.21, 2.74, 0);
    parts.push(ws(box(0.04, 0.06, 2.3, 0, 0.45, 0)), ws(box(0.04, 0.06, 2.3, 0, -0.45, 0)));
    for (const s of [-1, 1]) parts.push(ws(box(0.04, 0.96, 0.06, 0, 0, s * 1.14)));
    // Wipers resting at the base of the glass
    for (const z of [-0.55, 0.45]) parts.push(box(0.03, 0.025, 0.85, 8.25, 2.36, z).rotateX(0));
    // Sun visor
    parts.push(rbox(0.36, 0.07, 2.36, 0.03).rotateZ(-0.1).translate(8.14, 3.3, 0));
    return merge(parts);
  });
}

function cabGlass() {
  return geo("cab-glass", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Windshield, raked back
    // The windshield follows the cab's raked front: bottom (8.25, 2.3), top (8.14, 3.18).
    parts.push(rbox(0.03, 0.84, 2.2, 0.012, 0, 0, 0).rotateZ(Math.atan2(0.11, 0.88)).translate(8.208, 2.74, 0));
    // Side windows in the doors
    for (const s of [-1, 1]) parts.push(rbox(0.86, 0.72, 0.02, 0.04, 7.5, 2.82, s * 1.242));
    return merge(parts);
  });
}

function cabChrome() {
  return geo("cab-chrome", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Grille slats
    for (let i = 0; i < 5; i++) parts.push(rbox(0.03, 0.035, 1.66, 0.012, 8.28, 1.42 + i * 0.12, 0));
    // Badge on the painted panel between grille and windshield
    parts.push(rbox(0.03, 0.07, 0.46, 0.02, 8.27, 2.12, 0));
    // Mirror arms
    for (const s of [-1, 1]) {
      parts.push(cylZ(0.022, 0.32, 8.0, 3.1, s * 1.38));
      parts.push(cylZ(0.022, 0.32, 8.0, 2.45, s * 1.38));
    }
    // Door handles
    for (const s of [-1, 1]) parts.push(rbox(0.16, 0.03, 0.03, 0.012, 7.05, 2.34, s * 1.25));
    // Air horns on the roof
    for (const z of [-0.35, 0.35]) parts.push(new THREE.CylinderGeometry(0.035, 0.07, 0.5, 20).rotateZ(Math.PI / 2).translate(6.6, 3.95, z));
    // Exhaust stack behind the cab
    parts.push(cylY(0.075, 2.6, 5.78, 2.55, -0.98, 24));
    parts.push(cylY(0.085, 0.3, 5.78, 3.9, -0.98, 24, 0.075));
    return merge(parts);
  });
}

function cabMirrors() {
  return geo("cab-mirrors", () =>
    merge([-1, 1].flatMap((s) => [rbox(0.1, 0.46, 0.2, 0.04, 8.02, 2.78, s * 1.56), rbox(0.08, 0.16, 0.18, 0.03, 8.02, 2.4, s * 1.56)])),
  );
}

function chassis() {
  return geo("chassis", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.44, 0.44]) parts.push(box(6.5, 0.3, 0.1, 4.85, 0.98, z));
    for (const x of [2.2, 3.7, 5.2, 6.6, 7.9]) parts.push(box(0.1, 0.18, 0.9, x, 0.98, 0));
    // Fifth wheel coupling
    parts.push(cylY(0.5, 0.07, 3.68, 1.2, 0, 40));
    parts.push(box(1.0, 0.1, 0.9, 3.68, 1.13, 0));
    // Rear mudguards and flaps
    for (const s of [-1, 1]) {
      parts.push(rbox(2.8, 0.05, 0.66, 0.02, 3.68, 1.2, s * 0.98));
      parts.push(box(0.02, 0.58, 0.62, 2.22, 0.66, s * 0.98));
    }
    // Battery box (far side) and air tanks
    parts.push(rbox(0.9, 0.55, 0.5, 0.04, 5.25, 0.88, -0.84));
    parts.push(cylX(0.13, 1.0, 6.6, 0.72, 0.72));
    return merge(parts);
  });
}

function fuelTank() {
  return geo("fuel", () => {
    const parts: THREE.BufferGeometry[] = [];
    const g = rbox(1.5, 0.62, 0.62, 0.22, 5.25, 0.86, 0.86, 6);
    parts.push(g);
    return merge(parts);
  });
}

function fuelStraps() {
  return geo("fuel-straps", () => merge([4.75, 5.75].map((x) => rbox(0.06, 0.66, 0.66, 0.24, x, 0.86, 0.86, 6))));
}

function trailerFrame() {
  return geo("trailer-frame", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Main beams, deep at the front and tapering over the axles
    for (const z of [-0.5, 0.5]) {
      parts.push(box(7.6, 0.42, 0.12, 1.2, 1.22, z));
      parts.push(box(2.6, 0.22, 0.12, -3.7, 1.32, z));
    }
    // Cross members
    for (let i = 0; i < 11; i++) parts.push(box(0.08, 0.14, 2.3, 5.0 - i * 0.97, 1.36, 0));
    // Landing legs with crank and feet
    for (const z of [-0.78, 0.78]) {
      parts.push(box(0.14, 1.05, 0.14, 2.55, 0.82, z));
      parts.push(box(0.36, 0.06, 0.3, 2.55, 0.28, z));
    }
    parts.push(cylZ(0.035, 1.7, 2.55, 0.98, 0));
    // Air suspension hangers over the three axles
    for (const x of TRUCK.axles) for (const z of [-0.65, 0.65]) parts.push(rbox(0.5, 0.26, 0.16, 0.05, x, 1.0, z));
    // Axles
    for (const x of TRUCK.axles) parts.push(cylZ(0.07, 2.0, x, 0.52, 0));
    // Rear underrun bar and its posts
    parts.push(rbox(0.12, 0.14, 2.3, 0.03, -4.9, 0.55, 0));
    for (const z of [-0.7, 0.7]) parts.push(box(0.1, 0.65, 0.1, -4.85, 0.9, z));
    // Continuous mudguard over the axle group
    for (const s of [-1, 1]) parts.push(rbox(2.9, 0.05, 0.66, 0.02, -3.4, 1.15, s * 0.98));
    // Kingpin plate
    parts.push(box(1.8, 0.06, 1.4, 3.7, 1.28, 0));
    return merge(parts);
  });
}

function trailerAlu() {
  return geo("trailer-alu", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Deck
    parts.push(rbox(10.3, 0.1, 2.48, 0.02, 0.15, TRUCK.deckY - 0.05, 0));
    // Headboard: frame and bars
    for (const z of [-1.18, 1.18]) parts.push(rbox(0.1, 1.75, 0.1, 0.02, 5.18, TRUCK.deckY + 0.87, z));
    parts.push(rbox(0.12, 0.1, 2.46, 0.02, 5.18, TRUCK.deckY + 1.72, 0));
    for (let i = 0; i < 6; i++) parts.push(rbox(0.06, 0.06, 2.3, 0.02, 5.18, TRUCK.deckY + 0.2 + i * 0.25, 0));
    for (const z of [-0.4, 0.4]) parts.push(box(0.06, 1.6, 0.06, 5.18, TRUCK.deckY + 0.86, z));
    // Side underrun guards between the legs and the axles
    for (const s of [-1, 1]) for (const y of [0.52, 0.86]) parts.push(rbox(4.2, 0.1, 0.04, 0.02, 0.25, y, s * 1.2));
    for (const s of [-1, 1]) for (const x of [-1.75, 0.25, 2.25]) parts.push(box(0.05, 0.6, 0.06, x, 0.9, s * 1.17));
    return merge(parts);
  });
}

function trailerRail() {
  return geo("trailer-rail", () => merge([-1, 1].map((s) => rbox(10.3, 0.26, 0.06, 0.02, 0.15, TRUCK.deckY - 0.12, s * 1.24))));
}

/** Stake pockets along the side rail: small dark recesses at even spacing. */
function stakePockets() {
  return geo("stakes", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) parts.push(box(0.08, 0.12, 0.012, 4.6 - i * 1.12, TRUCK.deckY - 0.12, s * 1.274));
    return merge(parts);
  });
}

type TruckProps = {
  cab?: string;
  accent: string;
  /** Rendered in the trailer's frame, in metres; use TRUCK.slots and TRUCK.deckY to place cargo. */
  children?: React.ReactNode;
};

/** Idling engine: thin puffs leave the stack, drift back and fade. */
function Exhaust({ at }: { at: [number, number, number] }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(
    () => [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: "#E9E6E1", roughness: 1, transparent: true, depthWrite: false })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.55 + i / 4) % 1;
      m.position.set(at[0] - k * 0.9, at[1] + k * 1.1, at[2] + Math.sin(k * 3 + i) * 0.08);
      m.scale.setScalar(0.12 + k * 0.32);
      mats[i].opacity = Math.sin(k * Math.PI) * 0.38 * (1 - k * 0.5);
    });
  });
  return (
    <>
      {mats.map((m, i) => (
        <mesh key={i} ref={(r) => void (puffs.current[i] = r)} material={m}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      ))}
    </>
  );
}

export function SemiTruck({ cab = "#30343B", accent, children }: TruckProps) {
  const { root, body, spin } = useRolling(0.52, 0.0035);
  const steer = { r: 0.52, w: 0.32 };
  const drive = { r: 0.52, w: 0.6, dual: true };
  const trail = { r: 0.5, w: 0.56, dual: true, rim: "alu" as const };
  return (
    <group ref={root}>
      {/* Wheels stay on the road; the body rides above them on its suspension. */}
      {[7.05].map((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0.52, s * 1.03]}>
            <Wheel spec={steer} side={s as 1 | -1} spin={spin(0.52)} />
          </group>
        )),
      )}
      {[4.35, 3.0].map((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0.52, s * 0.95]}>
            <Wheel spec={drive} side={s as 1 | -1} spin={spin(0.52)} />
          </group>
        )),
      )}
      {TRUCK.axles.map((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0.5, s * 0.97]}>
            <Wheel spec={trail} side={s as 1 | -1} spin={spin(0.5)} />
          </group>
        )),
      )}
      <group ref={body}>
        <Exhaust at={[5.78, 4.08, -0.98]} />
        {/* Tractor */}
        <mesh geometry={cabShell()} material={paint(cab)} castShadow receiveShadow />
        <mesh geometry={cabDark()} material={enamel("#2E3035", 0.55)} castShadow />
        <mesh geometry={cabGlass()} material={darkGlass()} />
        <mesh geometry={cabChrome()} material={chrome()} castShadow />
        <mesh geometry={cabMirrors()} material={paint(cab)} castShadow />
        <mesh geometry={chassis()} material={steel("#2A2C31", 0.55)} castShadow />
        <mesh geometry={fuelTank()} material={aluminium(0.18)} castShadow />
        <mesh geometry={fuelStraps()} material={steel("#2A2C31", 0.5)} />
        {/* Accent band along the cab, the one colour that ties the truck to its story */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[7.0, 1.52, s * 1.233]} material={paint(accent, 0.3)}>
            <boxGeometry args={[2.12, 0.1, 0.008]} />
          </mesh>
        ))}
        {/* Lamps: headlights, indicators, roof marker row */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[8.31, 1.02, s * 0.9]} material={lamp("#FFF6E0", 1.6)}>
              <boxGeometry args={[0.03, 0.16, 0.46]} />
            </mesh>
            <mesh position={[8.31, 1.02, s * 1.18]} material={lamp("#FFA21E", 1.0)}>
              <boxGeometry args={[0.03, 0.12, 0.08]} />
            </mesh>
          </group>
        ))}
        {[-0.6, -0.2, 0.2, 0.6].map((z) => (
          <mesh key={z} position={[7.98, 3.86, z]} material={lamp("#FFB03A", 0.9)}>
            <boxGeometry args={[0.08, 0.05, 0.14]} />
          </mesh>
        ))}

        {/* Trailer */}
        <mesh geometry={trailerFrame()} material={steel("#2A2C31", 0.55)} castShadow receiveShadow />
        <mesh geometry={trailerAlu()} material={aluminium(0.34)} castShadow receiveShadow />
        <mesh geometry={trailerRail()} material={paint(accent, 0.34)} castShadow />
        <mesh geometry={stakePockets()} material={steel("#1F2125", 0.6)} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[-5.02, 1.12, s * 0.98]} material={lamp("#E5281B", 1.2)}>
              <boxGeometry args={[0.03, 0.14, 0.32]} />
            </mesh>
            <mesh position={[-5.02, 1.12, s * 0.7]} material={lamp("#FFA21E", 0.9)}>
              <boxGeometry args={[0.03, 0.14, 0.14]} />
            </mesh>
          </group>
        ))}
        {children}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Forklift                                                             */
/* ------------------------------------------------------------------ */

export const FORK = {
  /** x of the fork tips' heel (where a pallet's back edge sits). */
  heel: 0.86,
  /** x of a carried pallet's centre (a euro pallet taken from its 0.8 m side). */
  load: 0.86 + 0.45,
  maxLift: 2.4,
};

function forkBody() {
  return geo("fork-body", () =>
    profile(
      [
        [-1.12, 0.26],
        [0.58, 0.26],
        [0.64, 0.42],
        [0.62, 0.86],
        [0.46, 0.98],
        [-0.5, 0.98],
        [-0.56, 1.12],
        [-0.84, 1.2],
        [-1.08, 1.16],
        [-1.2, 1.0],
        [-1.24, 0.6],
        [-1.2, 0.34],
      ],
      1.1,
      0.05,
    ),
  );
}

function forkDark() {
  return geo("fork-dark", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Counterweight face and towing pin
    parts.push(rbox(0.12, 0.62, 1.04, 0.05, -1.22, 0.66, 0));
    // Overhead guard: posts, frame and slats
    for (const z of [-0.48, 0.48]) {
      parts.push(rbox(0.07, 1.22, 0.07, 0.02, 0.38, 1.6, z).rotateZ(0));
      parts.push(rbox(0.07, 1.0, 0.07, 0.02, -0.82, 1.68, z));
    }
    parts.push(rbox(1.36, 0.06, 1.04, 0.02, -0.22, 2.2, 0));
    // Seat and backrest
    parts.push(rbox(0.46, 0.12, 0.5, 0.05, -0.42, 1.08, 0));
    parts.push(rbox(0.1, 0.5, 0.5, 0.05, -0.66, 1.34, 0).rotateZ(0));
    // Steering column
    parts.push(cylY(0.03, 0.42, 0.18, 1.18, 0, 12).rotateZ(0));
    // Wheel arches
    for (const z of [-0.56, 0.56]) {
      const a = new THREE.CylinderGeometry(0.4, 0.4, 0.06, 28, 1, true, Math.PI * 0.5, Math.PI);
      a.rotateX(Math.PI / 2).translate(0.28, 0.33, z);
      parts.push(a);
    }
    return merge(parts);
  });
}

function forkGuardSlats() {
  return geo("fork-slats", () => merge(Array.from({ length: 5 }, (_, i) => rbox(1.3, 0.03, 0.05, 0.01, -0.22, 2.24, -0.36 + i * 0.18))));
}

function steeringWheel() {
  return geo("fork-steer", () => new THREE.TorusGeometry(0.15, 0.022, 10, 32).rotateX(Math.PI / 2).rotateZ(0.6).translate(0.08, 1.4, 0));
}

function mastOuter() {
  return geo("mast-outer", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.34, 0.34]) parts.push(box(0.12, 2.15, 0.09, 0.72, 1.26, z));
    parts.push(box(0.12, 0.1, 0.78, 0.72, 2.3, 0));
    parts.push(box(0.12, 0.1, 0.78, 0.72, 0.28, 0));
    return merge(parts);
  });
}

function mastInner() {
  return geo("mast-inner", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.26, 0.26]) parts.push(box(0.1, 2.05, 0.07, 0.8, 1.24, z));
    parts.push(box(0.1, 0.1, 0.6, 0.8, 2.24, 0));
    return merge(parts);
  });
}

function carriage() {
  return geo("carriage", () => {
    const parts: THREE.BufferGeometry[] = [];
    // Plate
    parts.push(box(0.06, 0.42, 0.98, 0.88, 0.24, 0));
    // Load backrest grid
    for (const z of [-0.45, -0.15, 0.15, 0.45]) parts.push(box(0.04, 0.6, 0.04, 0.88, 0.7, z));
    parts.push(box(0.04, 0.04, 0.98, 0.88, 1.0, 0));
    // Two forks, each an L
    for (const z of [-0.24, 0.24]) {
      parts.push(box(0.05, 0.48, 0.11, 0.93, 0.24, z));
      parts.push(rbox(1.12, 0.045, 0.11, 0.01, 0.93 + 0.56, 0.0225, z));
    }
    return merge(parts);
  });
}

export function Forklift({ color, lift, children }: { color: string; lift?: () => number; children?: React.ReactNode }) {
  const { root, body, spin } = useRolling(0.33);
  const inner = useRef<THREE.Group>(null);
  const carr = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const h = THREE.MathUtils.clamp(lift ? lift() : 0, 0, FORK.maxLift);
    // Free lift first: the carriage rises inside the mast, then the inner mast extends.
    if (carr.current) carr.current.position.y = 0.05 + h;
    if (inner.current) inner.current.position.y = Math.max(0, h - 0.9);
    if (beacon.current) beacon.current.emissiveIntensity = 0.6 + (Math.sin(clock.elapsedTime * 7) > 0.3 ? 1.6 : 0);
  });
  return (
    <group ref={root}>
      {[
        [0.28, 0.33, { r: 0.33, w: 0.24 }],
        [-0.86, 0.27, { r: 0.27, w: 0.2 }],
      ].map(([x, r, spec]) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x as number, r as number, s * 0.5]}>
            <Wheel spec={spec as { r: number; w: number }} side={s as 1 | -1} rimColor="#2E3035" spin={spin(r as number)} />
          </group>
        )),
      )}
      <group ref={body}>
        <mesh geometry={forkBody()} material={paint(color, 0.36)} castShadow receiveShadow />
        <mesh geometry={forkDark()} material={enamel("#26282D", 0.55)} castShadow />
        <mesh geometry={forkGuardSlats()} material={enamel("#26282D", 0.55)} castShadow />
        <mesh geometry={steeringWheel()} material={rubber()} />
        <mesh position={[-0.82, 2.3, 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 20]} />
          <meshStandardMaterial ref={beacon} color="#FF8A1E" emissive="#FF8A1E" emissiveIntensity={1} roughness={0.2} />
        </mesh>
        {/* Work lights on the guard */}
        {[-0.44, 0.44].map((z) => (
          <mesh key={z} position={[0.42, 2.1, z]} material={lamp("#FFF6E0", 1.3)}>
            <boxGeometry args={[0.05, 0.08, 0.1]} />
          </mesh>
        ))}
        <mesh geometry={mastOuter()} material={steel("#2C2E33", 0.5)} castShadow />
        <group ref={inner}>
          <mesh geometry={mastInner()} material={steel("#35373D", 0.45)} castShadow />
          {/* Lift cylinder rod */}
          <mesh position={[0.72, 1.3, 0]} material={chrome()}>
            <cylinderGeometry args={[0.035, 0.035, 2.0, 16]} />
          </mesh>
        </group>
        <group ref={carr}>
          <mesh geometry={carriage()} material={steel("#24262B", 0.5)} castShadow />
          {/* Load on the forks: a pallet centred on the tines, which run through its openings */}
          <group position={[FORK.load, -0.02, 0]}>{children}</group>
        </group>
      </group>
    </group>
  );
}
