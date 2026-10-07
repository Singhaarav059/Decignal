"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Plant, Storefront } from "./buildings";
import { Forklift, SemiTruck, TRUCK } from "./vehicles";
import { LOOKS, Person, Walker } from "./people";
import { LoadedPallet, Bearing, box, cylX, geo, merge } from "./parts";
import { aluminium, brass, chrome, enamel, paint, plastic, steel, cladding, darkGlass } from "./materials";
import { Yard } from "./Actors";
import { SLOT_X, STAGE_Z, DECK_Z, liftAt, palletStates, type Lift } from "./transfer-motion";
import { M, ROAD_Z, truckX } from "@/lib/scene";
import { AssetLabel, Bolts, Bollards, Box, Floor, Route, phase, type Motion, type Vec } from "./SceneKit";
import { COLORS, TINTS } from "./palette";

export type SceneProps = { motion: Motion; step: number; still: boolean; tone: string };

/* ------------------------------------------------------------------ */
/* 01. LOGISTICS: Complete loading at source + deloading at dock      */
/* ------------------------------------------------------------------ */
export function Logistics({ motion, step }: SceneProps) {
  const truck = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null);
  const unloadFork = useRef<THREE.Group>(null);
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0.06, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
  const height = useRef(0.06);
  const unloadHeight = useRef(0.06);
  const [states, setStates] = useState([0, 0, 0]);
  const [delivered, setDelivered] = useState(0); // 0 none, 1-3 deloaded at Plant 01
  const [carryingUnload, setCarryingUnload] = useState(false);
  const [arrived, setArrived] = useState(false);
  const tote = plastic(TINTS.saffron, 0.5, true);

  // Exact truck trailer slot positions in world coordinates when stopped at Plant 01 (truckX = 2.3)
  // TRUCK.slots = [3.6, 0.95, -1.7]; M = 0.135 -> 2.3 + slot * 0.135
  const RECEIVE_SLOTS = [2.79, 2.43, 2.07];

  useFrame(() => {
    const p = motion.current.progress;
    const t = phase(p, 0.25, 0.94);
    liftAt(t, lift);
    height.current = lift.h;

    if (truck.current) truck.current.position.x = truckX(t);
    if (fork.current) {
      fork.current.position.set(lift.x, 0, lift.z);
      fork.current.rotation.y = lift.yaw;
      fork.current.rotation.x = lift.pitch;
      fork.current.rotation.z = lift.roll;
    }

    const next = palletStates(t, lift);
    if (next.some((v, i) => v !== states[i])) setStates(next);

    const isArrived = t >= 0.74;
    if (isArrived !== arrived) setArrived(isArrived);

    // Deloading choreography at Plant 01: blue forklift unloads each pallet off truck deck
    const unloadProgress = phase(p, 0.76, 0.96);

    // Blue forklift at Plant 01:
    // Parked stance: waiting at Plant 01 dock apron facing the road
    if (unloadFork.current) {
      if (!isArrived) {
        // Naturally parked at Plant 01 apron, sits flat on ground (y = 0), aligned straight with yard
        unloadFork.current.position.set(3.4, 0, -0.65);
        unloadFork.current.rotation.set(0, -Math.PI / 2, 0);
        unloadHeight.current = 0.06;
        if (carryingUnload) setCarryingUnload(false);
        if (delivered !== 0) setDelivered(0);
      } else {
        // 3 consecutive unloading trips for the 3 pallets
        const totalTrips = 3;
        const tripIndex = Math.min(2, Math.floor(unloadProgress * totalTrips));
        const u = (unloadProgress * totalTrips) % 1;
        const slotX = RECEIVE_SLOTS[tripIndex];

        let curZ = -0.65;
        let curH = 0.06;
        let isCarrying = false;

        if (unloadProgress >= 0.98) {
          // Finished all unloads: parked back at Plant 01 apron
          unloadFork.current.position.set(3.4, 0, -0.65);
          unloadFork.current.rotation.set(0, -Math.PI / 2, 0);
          unloadHeight.current = 0.06;
          if (carryingUnload) setCarryingUnload(false);
          if (delivered !== 3) setDelivered(3);
        } else {
          if (u < 0.35) {
            // Stage A: Approach truck trailer from Plant 01 apron (z = STAGE_Z to deck pick Z = 0.05)
            const k = u / 0.35;
            curZ = THREE.MathUtils.lerp(STAGE_Z, 0.05, THREE.MathUtils.smoothstep(k, 0, 1));
            // Raise mast to truck trailer deck height (1.56)
            curH = THREE.MathUtils.lerp(0.06, 1.56, THREE.MathUtils.smoothstep(k, 0.2, 1));
            isCarrying = false;
          } else if (u < 0.5) {
            // Stage B: Forks engage under pallet on deck, lift load clear
            const k = (u - 0.35) / 0.15;
            curZ = 0.05;
            curH = THREE.MathUtils.lerp(1.56, 1.72, THREE.MathUtils.smoothstep(k, 0, 1));
            isCarrying = true; // pallet lifts off trailer
          } else if (u < 0.85) {
            // Stage C: Reverse straight back to Plant 01 apron, lowering the mast
            const k = (u - 0.5) / 0.35;
            curZ = THREE.MathUtils.lerp(0.05, STAGE_Z, THREE.MathUtils.smoothstep(k, 0, 1));
            curH = THREE.MathUtils.lerp(1.72, 0.06, THREE.MathUtils.smoothstep(k, 0, 0.9));
            isCarrying = true;
          } else {
            // Stage D: Deposit pallet onto Plant 01 receiving bay, back off slightly
            const k = (u - 0.85) / 0.15;
            curZ = THREE.MathUtils.lerp(STAGE_Z, STAGE_Z - 0.15, k);
            curH = 0.06;
            isCarrying = false; // pallet resting on ground
          }

          unloadFork.current.position.set(slotX, 0, curZ);
          // Aligned straight with the yard grid lines (forks pointing toward the road / truck)
          unloadFork.current.rotation.set(0, -Math.PI / 2, 0);
          unloadHeight.current = curH;

          if (isCarrying !== carryingUnload) setCarryingUnload(isCarrying);

          // Update delivered count
          const nextDelivered = tripIndex + (u >= 0.82 ? 1 : 0);
          if (nextDelivered !== delivered) setDelivered(nextDelivered);
        }
      }
    }
  });

  const sent = states.filter((v) => v === 2).length * 80;

  return (
    <group dispose={null}>
      <Yard roadLength={8.9} />
      <group position={[-2.55, 0, -1.6]} scale={M}>
        <Plant accent={TINTS.saffron} name="PLANT 02" />
      </group>
      <group position={[2.55, 0, -1.6]} scale={M}>
        <Plant accent={TINTS.cobalt} name="PLANT 01" />
      </group>
      <Bollards x={-1.9} z={-0.76} />
      <Bollards x={2.4} z={-0.76} />

      {/* Pallets staged at Plant 02 (loading source) */}
      {SLOT_X.map(
        (x, i) =>
          states[i] === 0 && (
            <group key={`p2-${i}`} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ),
      )}

      {/* Truck transporting pallets: pallet stays until blue forklift unloads it */}
      <group ref={truck} position={[truckX(0), 0, ROAD_Z]} scale={M}>
        <SemiTruck accent={TINTS.emerald}>
          {TRUCK.slots.map(
            (x, i) => {
              // Visible on truck if loaded at Plant 02 AND not yet picked by Plant 01 forklift
              const isStillOnTruck = states[i] === 2 && i >= delivered && !(carryingUnload && Math.min(2, Math.floor(phase(motion.current.progress, 0.76, 0.96) * 3)) === i);
              return (
                isStillOnTruck && (
                  <group key={`trk-${i}`} position={[x, TRUCK.deckY, DECK_Z]}>
                    <LoadedPallet tote={tote} />
                  </group>
                )
              );
            },
          )}
        </SemiTruck>
      </group>

      {/* Loading forklift at Plant 02 */}
      <group ref={fork} scale={M}>
        <Forklift color={TINTS.saffron} lift={() => height.current}>
          {states.includes(1) && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>

      {/* Receiving deloaded pallets resting on ground at Plant 01 receiving bay */}
      {RECEIVE_SLOTS.map(
        (x, i) =>
          i < delivered && (
            <group key={`deliv-${i}`} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ),
      )}

      {/* Receiving forklift at Plant 01: sits flat on ground, properly scaled and aligned */}
      <group ref={unloadFork} scale={M}>
        <Forklift color={TINTS.cobalt} lift={() => unloadHeight.current}>
          {carryingUnload && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>

      <AssetLabel
        position={[-2.55, 1.45, -1.6]}
        title="PLANT 02 / DOCK 03"
        detail={`${620 - sent} on hand · 380 reserved`}
        color={TINTS.saffron}
        width={2.2}
      />
      <AssetLabel
        position={[2.55, 1.45, -1.6]}
        title="PLANT 01 / BEARING X90"
        detail={delivered >= 2 ? "240 units received · Restored" : arrived ? "Receiving in progress" : "Day 6 forecast · 140 units"}
        color={delivered >= 2 ? TINTS.emerald : COLORS.signal}
        width={2.2}
      />
      <AssetLabel
        position={[0, 0.25, 1.55]}
        title={step === 0 ? "SHORTAGE DETECTED" : step === 1 ? "POLICY CHECK · 240 AVAILABLE" : delivered >= 2 ? "TRF-0240 · DELIVERED & RECEIVED" : "TRF-0240 · IN TRANSIT"}
        color={delivered >= 2 ? TINTS.emerald : TINTS.saffron}
        width={2.6}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 02. PRODUCTION: Line 03 queue transfer & deloading onto Line 02    */
/* ------------------------------------------------------------------ */
function Conveyor({ x, z, length = 4.9, active = true }: { x: number; z: number; length?: number; active?: boolean }) {
  const beltProgress = useRef(0);
  const cleats = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, dt) => {
    if (!active) return;
    const speed = 0.42;
    beltProgress.current = (beltProgress.current + (dt > 0 ? Math.min(dt, 0.05) : 1 / 60) * speed) % 1;
    cleats.current.forEach((m, i) => {
      if (!m) return;
      const k = (i / 14 + beltProgress.current) % 1;
      m.position.x = -length / 2 + 0.22 + k * (length - 0.44);
    });
  });

  return (
    <group position={[x, 0, z]}>
      {/* Heavy structural side channels (stationary frame) */}
      <Box at={[0, 0.44, -0.32]} size={[length, 0.12, 0.05]} color="#939AA0" metal />
      <Box at={[0, 0.44, 0.32]} size={[length, 0.12, 0.05]} color="#939AA0" metal />
      {/* Stainless guide retaining lips */}
      <Box at={[0, 0.51, -0.31]} size={[length, 0.035, 0.02]} color="#D1D5DA" />
      <Box at={[0, 0.51, 0.31]} size={[length, 0.035, 0.02]} color="#D1D5DA" />

      {/* Stationary floor support stanchions with base mounting pads */}
      {[-length / 2 + 0.45, 0, length / 2 - 0.45].map((sx) => (
        <group key={sx} position={[sx, 0, 0]}>
          <Box at={[0, 0.21, -0.28]} size={[0.06, 0.42, 0.06]} color="#3E454B" />
          <Box at={[0, 0.21, 0.28]} size={[0.06, 0.42, 0.06]} color="#3E454B" />
          <Box at={[0, 0.015, -0.28]} size={[0.14, 0.025, 0.14]} color="#23272C" metal />
          <Box at={[0, 0.015, 0.28]} size={[0.14, 0.025, 0.14]} color="#23272C" metal />
          <Box at={[0, 0.16, 0]} size={[0.04, 0.04, 0.52]} color="#3E454B" />
        </group>
      ))}

      {/* Stationary terminal pulleys (infeed and discharge drums) */}
      {[-length / 2 + 0.12, length / 2 - 0.12].map((px) => (
        <mesh key={px} position={[px, 0.445, 0]} rotation-x={Math.PI / 2} material={steel("#6A7178")}>
          <cylinderGeometry args={[0.06, 0.06, 0.58, 24]} />
        </mesh>
      ))}

      {/* Stationary intermediate roller bed supporting belt */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + 0.5 + (i * (length - 1.0)) / 8, 0.435, 0]}
          rotation-x={Math.PI / 2}
          material={steel("#767E86")}
        >
          <cylinderGeometry args={[0.038, 0.038, 0.58, 16]} />
        </mesh>
      ))}

      {/* Continuous vulcanized synthetic rubber belt top surface */}
      <Box at={[0, 0.485, 0]} size={[length - 0.18, 0.018, 0.58]} color="#1E2328" />

      {/* Tracking cleats moving continuously forward (+X) with the belt surface */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            cleats.current[i] = el;
          }}
          position={[0, 0.495, 0]}
        >
          <boxGeometry args={[0.032, 0.006, 0.54]} />
          <meshStandardMaterial color="#2C343B" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function Machine({ at, color, number }: { at: Vec; color: string; number: string }) {
  return (
    <group position={at}>
      <Box at={[0, 0.16, 0]} size={[1.06, 0.32, 1.05]} color="#ABB1B5" />
      {[-0.43, 0.43].map((x) => (
        <Box key={x} at={[x, 0.75, 0]} size={[0.09, 0.9, 0.97]} color="#DADDDC" />
      ))}
      <Box at={[0, 1.19, 0]} size={[1.04, 0.16, 1.04]} color={color} />
      <Box at={[0, 0.7, -0.45]} size={[0.78, 0.91, 0.06]} color="#D5D8D6" />
      <Box at={[0, 0.83, 0.15]} size={[0.38, 0.18, 0.32]} color="#535D64" />
      <mesh position={[0, 0.65, 0.15]} material={chrome()} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.22, 24]} />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.77, -0.12]} material={steel()} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.7, 12]} />
        </mesh>
      ))}
      <Box at={[0, 0.39, 0.1]} size={[0.74, 0.07, 0.7]} metal />
      <mesh position={[0, 0.75, 0.49]}>
        <planeGeometry args={[0.77, 0.75]} />
        <meshPhysicalMaterial color="#789397" transparent opacity={0.22} roughness={0.12} metalness={0.15} depthWrite={false} />
      </mesh>
      <Box at={[0.6, 0.82, 0.28]} size={[0.24, 0.42, 0.13]} color="#EAE8E1" />
      <mesh position={[0.6, 0.9, 0.353]} material={darkGlass()}>
        <planeGeometry args={[0.17, 0.2]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.54 + i * 0.055, 0.72, 0.354]} rotation-x={Math.PI/2} material={enamel(i === 0 ? COLORS.signal : i === 1 ? TINTS.emerald : TINTS.saffron)}>
          <cylinderGeometry args={[0.014, 0.014, 0.008, 12]} />
        </mesh>
      ))}
      <Box at={[0.44, 1.37, -0.2]} size={[0.035, 0.22, 0.035]} color="#51585B" />
      <Box at={[0.44, 1.49, -0.2]} size={[0.065, 0.07, 0.065]} color={color} />
      <AssetLabel phone={false} position={[0, 1.65, 0]} title={number} detail={color === COLORS.signal ? "Capacity constrained" : "Balanced operation"} width={1.5} color={color} />
    </group>
  );
}

export function Production({ motion, step }: SceneProps) {
  const carriers = useRef<(THREE.Group | null)[]>([]);
  const shuttle = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = motion.current.progress;
    const transfer = phase(p, 0.38, 0.72);
    const feed = phase(p, 0.75, 0.95);

    // Shuttle picks up 3 lots from Line 03 (z=0.8) and deloads onto Line 02 (z=-0.8)
    const shuttleZ = THREE.MathUtils.lerp(0.8, -0.8, transfer);
    if (shuttle.current) shuttle.current.position.z = shuttleZ;

    carriers.current.forEach((g, i) => {
      if (!g) return;
      if (i < 3) {
        // First 3 lots remain on Line 03 and advance into Machine 03
        g.position.set(-2.5 + i * 0.55 + feed * 1.8, 0.522, 0.8);
      } else {
        // Last 3 lots transfer via shuttle onto Line 02 and deload into Machine 02 feed
        const lotOffset = (i - 3) * 0.52;
        const lotZ = THREE.MathUtils.lerp(0.8, -0.8, transfer);
        const lotX = THREE.MathUtils.lerp(-1.0 + lotOffset, -1.0 + lotOffset + feed * 1.8, transfer);
        g.position.set(lotX, 0.522, lotZ);
      }
    });
  });

  return (
    <group dispose={null}>
      <Floor size={[7.6, 0.04, 4.4]} />
      {/* Safety floor walk aisle markings */}
      <Route points={[[-3.4, 0.015, 0], [3.4, 0.015, 0]]} color="#D8B150" radius={0.012} dashed />
      {/* Overhead structural truss linkage */}
      <group position={[0, 2.1, 0]}>
        <Box at={[-2.3, 0, 0]} size={[0.08, 0.08, 2.1]} metal />
        <Box at={[0, 0, 0]} size={[0.08, 0.08, 2.1]} metal />
        <Box at={[2.3, 0, 0]} size={[0.08, 0.08, 2.1]} metal />
        <Route points={[[-2.3, 0, 0], [2.3, 0, 0]]} color="#5B656E" radius={0.015} />
      </group>
      {/* Raw material staged pallet near line infeed */}
      <group position={[-3.1, 0, 0]} scale={0.7}>
        <LoadedPallet tote={plastic(TINTS.cobalt)} />
      </group>

      {/* Cross-bay shuttle transfer carrier frame */}
      <group ref={shuttle} position={[-0.8, 0, 0.8]}>
        <Box at={[0, 0.49, 0]} size={[1.8, 0.06, 0.56]} color="#99A7B4" />
        <mesh position={[-0.85, 0.44, 0]} material={steel()}><cylinderGeometry args={[0.04, 0.04, 0.1, 12]} /></mesh>
        <mesh position={[0.85, 0.44, 0]} material={steel()}><cylinderGeometry args={[0.04, 0.04, 0.1, 12]} /></mesh>
      </group>
      {/* Structural transverse shuttle rails */}
      {[-1.65, 0.05].map((x) => (
        <Box key={x} at={[x, 0.12, 0]} size={[0.05, 0.1, 2.3]} metal />
      ))}

      <Conveyor x={-0.7} z={0.8} length={4.9} />
      <Conveyor x={-0.7} z={-0.8} length={4.9} />
      <Machine at={[2.05, 0, 0.8]} color={step === 2 ? TINTS.emerald : COLORS.signal} number="LINE 03" />
      <Machine at={[2.05, 0, -0.8]} color={TINTS.emerald} number="LINE 02" />

      {/* Production lot carriers with precision bearing components */}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} ref={(g) => { carriers.current[i] = g; }}>
          <Box at={[0, 0, 0]} size={[0.33, 0.055, 0.42]} color={TINTS.saffron} />
          <group position-y={0.12} rotation-x={Math.PI / 2} scale={2.2}>
            <Bearing />
          </group>
        </group>
      ))}

      {/* Operators at each line's control panel, and a supervisor watching the infeed */}
      <group position={[2.68, 0, 1.5]} rotation-y={Math.PI / 2 + 0.25} scale={0.5}>
        <Person look="crew" pose={step === 2 ? "stand" : "point"} seed={0.6} />
      </group>
      <group position={[2.68, 0, -0.08]} rotation-y={Math.PI / 2 + 0.25} scale={0.5}>
        <Person look="warehouse" pose="stand" seed={2.2} />
      </group>
      <group position={[-3.1, 0, 1.55]} rotation-y={-0.6} scale={0.5}>
        <Person look="planner" pose="tablet" seed={4.1} />
      </group>
      <Route points={[[-1.2, 0.025, 1.65], [-1.2, 0.025, 1.35], [1.5, 0.025, 1.35]]} color={TINTS.saffron} radius={0.012} flow speed={0.4} pulseColor={TINTS.saffron} />
      <AssetLabel position={[-2, 1.45, 0.8]} title="ORDER PO-2207" detail={step === 2 ? "3 lots transferred to Line 02" : "Queue congesting Line 03"} width={2.2} color={step === 2 ? TINTS.emerald : COLORS.signal} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 03. SUPPLY RISK: Gantry crane running trolley, hoist & deloading   */
/* ------------------------------------------------------------------ */
function Container({ at, color }: { at: Vec; color: string }) {
  return (
    <group position={at}>
      <mesh material={cladding(color, 14)} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.48, 0.46]} />
      </mesh>
      <Box at={[0.56, 0, 0]} size={[0.02, 0.42, 0.42]} color="#D8DAD6" />
      {[-0.12, 0.12].map((z) => (
        <Box key={z} at={[0.58, 0, z]} size={[0.02, 0.39, 0.014]} metal />
      ))}
    </group>
  );
}

function CargoVessel() {
  const hull = useMemo(
    () =>
      geo("supply-cargo-hull", () => {
        const shape = new THREE.Shape();
        shape.moveTo(-1.8, -0.4);
        shape.lineTo(1.35, -0.4);
        shape.lineTo(1.85, 0);
        shape.lineTo(1.35, 0.4);
        shape.lineTo(-1.8, 0.4);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
        g.rotateX(-Math.PI / 2);
        return g;
      }),
    [],
  );
  return (
    <group position={[0.35, 0.03, -2.85]}>
      <mesh geometry={hull} material={enamel("#42566A")} castShadow />
      <Box at={[-1.25, 0.48, 0]} size={[0.45, 0.42, 0.62]} color="#F6F1E6" />
      <Box at={[-1.25, 0.74, 0]} size={[0.48, 0.11, 0.64]} color="#E1DDD3" />
      {[-0.2, 0, 0.2].map((z) => (
        <Box key={z} at={[-1.016, 0.53, z]} size={[0.012, 0.1, 0.1]} color="#385C71" />
      ))}
      <Box at={[-1.55, 0.84, 0]} size={[0.12, 0.2, 0.12]} color={TINTS.tangerine} />
      {[0, 1, 2].map((i) => (
        <group key={i} scale={0.5} position={[-0.55 + i * 0.62, 0.24, 0]}>
          <Container at={[0, 0.24, 0]} color={i === 1 ? TINTS.saffron : "#91A7A0"} />
        </group>
      ))}
      <Route points={[[-1.7, 0.42, -0.35], [1.3, 0.42, -0.35], [1.7, 0.42, 0], [1.3, 0.42, 0.35], [-1.7, 0.42, 0.35]]} color="#D0CEC5" radius={0.009} />
    </group>
  );
}

export function SupplyRisk({ motion, step }: SceneProps) {
  const rig = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const spreader = useRef<THREE.Group>(null);
  const hoistCables = useRef<(THREE.Mesh | null)[]>([]);
  const singleContainer = useRef<THREE.Group>(null);

  const route = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8, 0, 0.45),
        new THREE.Vector3(-2, 0, 1.4),
        new THREE.Vector3(1.3, 0, 1.4),
        new THREE.Vector3(2.6, 0, 0.6),
      ]),
    [],
  );

  useFrame(() => {
    // 1. Quayside logistics highway transport
    if (rig.current) {
      const tTruck = phase(motion.current.progress, 0.48, 0.95);
      const p = route.getPoint(tTruck);
      const tangent = route.getTangent(tTruck);
      rig.current.position.copy(p);
      rig.current.rotation.y = Math.atan2(-tangent.z, tangent.x);
    }

    // 2. Quay Crane & Single Continuous Container Lifecycle
    // One single container travels from the ship hold to the quayside staging dock:
    // [0..0.18] Spreader lowers onto container in vessel hold
    // [0.18..0.36] Twistlocks lock, container hoisted up to boom level
    // [0.36..0.66] Trolley & spreader traverse along boom to quayside, carrying container
    // [0.66..0.82] Spreader lowers container down onto quayside staging pad, touches down
    // [0.82..1.0] Twistlocks unlock, spreader lifts back up empty; CONTAINER REMAINS AT DOCK!
    const t = phase(motion.current.progress, 0.22, 0.92);

    let trolleyX = -2.0;
    let spreaderY = 1.84;
    let contX = -2.0;
    let contY = 0.26;
    const contZ = -0.7;

    if (t < 0.18) {
      // Spreader descends from 1.84 down to container in hold (0.54)
      const u = t / 0.18;
      trolleyX = -2.0;
      spreaderY = THREE.MathUtils.lerp(1.84, 0.54, THREE.MathUtils.smoothstep(u, 0, 1));
      contX = -2.0;
      contY = 0.26;
    } else if (t < 0.36) {
      // Hoisting container up to boom level
      const u = (t - 0.18) / 0.18;
      trolleyX = -2.0;
      spreaderY = THREE.MathUtils.lerp(0.54, 1.84, THREE.MathUtils.smoothstep(u, 0, 1));
      contX = -2.0;
      contY = THREE.MathUtils.lerp(0.26, 1.56, THREE.MathUtils.smoothstep(u, 0, 1));
    } else if (t < 0.66) {
      // Trolley traverses along boom girder to quayside, carrying container
      const u = (t - 0.36) / 0.30;
      trolleyX = THREE.MathUtils.lerp(-2.0, 0.35, THREE.MathUtils.smoothstep(u, 0, 1));
      spreaderY = 1.84;
      contX = trolleyX;
      contY = 1.56;
    } else if (t < 0.82) {
      // Lowering container down onto quayside staging pad
      const u = (t - 0.66) / 0.16;
      trolleyX = 0.35;
      spreaderY = THREE.MathUtils.lerp(1.84, 0.54, THREE.MathUtils.smoothstep(u, 0, 1));
      contX = 0.35;
      contY = THREE.MathUtils.lerp(1.56, 0.26, THREE.MathUtils.smoothstep(u, 0, 1));
    } else {
      // Spreader lifts back up empty; container stays resting on quayside pad
      const u = (t - 0.82) / 0.18;
      trolleyX = 0.35;
      spreaderY = THREE.MathUtils.lerp(0.54, 1.84, THREE.MathUtils.smoothstep(u, 0, 1));
      contX = 0.35;
      contY = 0.26; // PERMANENTLY RESTS AT DESTINATION
    }

    if (trolley.current) trolley.current.position.set(trolleyX, 2.32, -0.7);
    if (spreader.current) spreader.current.position.set(trolleyX, spreaderY, -0.7);
    if (singleContainer.current) singleContainer.current.position.set(contX, contY, contZ);

    // Hoist cables stretch dynamically between trolley and spreader
    const cableLength = Math.max(0.1, 2.32 - spreaderY);
    const cableCenterY = (2.32 + spreaderY) / 2;
    hoistCables.current.forEach((cable) => {
      if (!cable) return;
      cable.position.x = trolleyX;
      cable.position.y = cableCenterY;
      cable.scale.y = cableLength / 0.8;
    });
  });

  return (
    <group dispose={null}>
      <Floor size={[7.5, 0.04, 4.2]} />
      <Box at={[0, -0.08, -2.85]} size={[7.5, 0.05, 1.5]} color="#BDCFCA" />
      <CargoVessel />
      <Box at={[0, 0.07, -1.91]} size={[7.5, 0.16, 0.13]} color="#8E9590" />
      {/* Yellow quayside hazard curb */}
      <Box at={[0, 0.09, -1.84]} size={[7.5, 0.04, 0.06]} color="#DFB84E" />

      {/* Crane ground travel rails */}
      {[-0.78, -0.62].map((z) => (
        <Box key={z} at={[0, 0.015, z]} size={[7.5, 0.015, 0.03]} metal />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} at={[-3.4 + i * 0.6, 0.18, -1.8]} size={[0.1, 0.05, 0.17]} color="#4B5556" />
      ))}

      {/* Staged container stacks on port terminal */}
      {Array.from({ length: 8 }, (_, i) => (
        <Container key={i} at={[-2.5 + (i % 4) * 1.2, 0.26 + Math.floor(i / 4) * 0.5, -0.9]} color={i % 3 === 0 ? TINTS.cobalt : i % 3 === 1 ? "#9AAEAA" : "#DDD7CA"} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Container key={`right-${i}`} at={[1.8 + (i % 2) * 1.2, 0.26 + Math.floor(i / 2) * 0.5, -0.9]} color={i === 1 ? TINTS.tangerine : "#839793"} />
      ))}

      {/* Heavy Gantry Crane Portal Columns & Boom Girder */}
      {[-2.9, 0].map((x) => (
        <Box key={x} at={[x, 1.15, -0.7]} size={[0.14, 2.3, 0.18]} color={TINTS.saffron} />
      ))}
      <Box at={[-1.2, 2.28, -0.7]} size={[3.8, 0.16, 0.32]} color={TINTS.saffron} />
      {[-0.8, -0.6].map((z) => (
        <Box key={z} at={[-1.2, 2.37, z]} size={[3.8, 0.02, 0.028]} metal />
      ))}

      {/* 4 Dynamic Vertical Hoist Wire Cables connecting Trolley to Spreader */}
      {[-0.22, 0.22].flatMap((cx) =>
        [-0.12, 0.12].map((cz, ci) => (
          <mesh
            key={`cable-${cx}-${cz}`}
            ref={(el) => {
              hoistCables.current[ci + (cx > 0 ? 2 : 0)] = el;
            }}
            position={[0, 2.0, -0.7 + cz]}
            material={steel("#888E94")}
          >
            <cylinderGeometry args={[0.007, 0.007, 0.8, 8]} />
          </mesh>
        )),
      )}

      {/* Precision Structural Crane Trolley Carriage with Wheel Bogies on Rails */}
      <group ref={trolley} position={[-0.8, 2.32, -0.7]}>
        <Box at={[0, 0.06, 0]} size={[0.58, 0.12, 0.38]} color="#F0EEE6" />
        <mesh position={[0, 0.16, 0]} rotation-z={Math.PI / 2} material={steel("#3E464E")}>
          <cylinderGeometry args={[0.07, 0.07, 0.34, 16]} />
        </mesh>
        {[-0.22, 0.22].map((wx) =>
          [-0.1, 0.1].map((wz) => (
            <mesh key={`whl-${wx}-${wz}`} position={[wx, 0.015, wz]} rotation-x={Math.PI / 2} material={chrome()}>
              <cylinderGeometry args={[0.045, 0.045, 0.035, 16]} />
            </mesh>
          )),
        )}
        <Box at={[0.18, -0.16, 0.12]} size={[0.18, 0.22, 0.18]} color="#2C333A" />
        <mesh position={[0.18, -0.16, 0.215]} material={darkGlass()}><planeGeometry args={[0.14, 0.16]} /></mesh>
      </group>

      {/* Industrial Spreader with twistlock flippers */}
      <group ref={spreader} position={[-0.8, 1.84, -0.7]}>
        <Box at={[0, 0, 0]} size={[1.16, 0.07, 0.46]} color="#2B3037" />
        {[-0.56, 0.56].map((fx) =>
          [-0.22, 0.22].map((fz) => (
            <Box key={`flp-${fx}-${fz}`} at={[fx, -0.06, fz]} size={[0.04, 0.1, 0.04]} color="#DFB84E" />
          )),
        )}
      </group>

      {/* SINGLE CONTINUOUS PHYSICAL CONTAINER: preserves full object continuity */}
      <group ref={singleContainer} position={[-2.0, 0.26, -0.7]}>
        <Container at={[0, 0, 0]} color={TINTS.saffron} />
      </group>

      {/* Port crew: a tally clerk logging the lift, a banksman guiding the crane, a checker walking the stacks */}
      <group scale={0.11}>
        <Person look="planner" pose="tablet" seed={0.2} position={[-17, 0, -2.2]} rotation-y={Math.PI / 2 - 0.4} />
        <Person look="crew" pose="point" seed={1.4} position={[6, 0, -2.4]} rotation-y={Math.PI * 0.75} />
        <Walker look="warehouse" speed={1.1} path={[[-28, -2.6], [12, -2.6], [12, -1.8], [-28, -1.8]]} />
      </group>
      {/* Quayside logistics roadway */}
      <Box at={[0, 0.006, 0.5]} size={[7, 0.015, 0.72]} color="#969D9B" />
      {Array.from({ length: 14 }, (_, i) => (
        <Box key={i} at={[-3.25 + i * 0.48, 0.02, 0.5]} size={[0.22, 0.008, 0.018]} color="#ECE7DA" />
      ))}
      <Route
        points={[[-2.8, 0.06, 0.45], [-2, 0.06, 1.4], [1.3, 0.06, 1.4], [2.6, 0.06, 0.6]]}
        color={step > 0 ? TINTS.emerald : "#D0CABE"}
        radius={0.025}
        dashed
        flow
        speed={0.32}
        pulseColor={step > 0 ? TINTS.emerald : COLORS.signal}
      />
      <Box at={[0.25, 0.24, 0.45]} size={[0.16, 0.48, 0.16]} color={COLORS.signal} />
      <Box at={[0.65, 0.45, 0.45]} size={[1.1, 0.07, 0.06]} color={COLORS.signal} />
      <group ref={rig} scale={0.13}>
        <SemiTruck accent={TINTS.cobalt}>
          <group position={[TRUCK.slots[1], TRUCK.deckY, 0]}>
            <LoadedPallet tote={plastic(TINTS.saffron)} />
          </group>
        </SemiTruck>
      </group>

      <AssetLabel position={[-1.4, 2.75, -0.7]} title="PORT / PRIMARY LANE" detail="Bearing X90 · Seal S02 delayed" color={COLORS.signal} width={2.4} />
      <AssetLabel position={[1.65, 0.45, 1.6]} title={step === 2 ? "ALTERNATIVE CONFIRMED" : "SECOND SUPPLIER"} detail="Capacity and lead time checked" color={TINTS.emerald} width={2.2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 04. DISTRIBUTION: Central DC to Storefronts with Dock Deloading    */
/* ------------------------------------------------------------------ */
export function Distribution({ motion, step, tone, commercial = false }: SceneProps & { commercial?: boolean }) {
  const vehicle = useRef<THREE.Group>(null);
  const [unloadedAtStore, setUnloadedAtStore] = useState(false);

  useFrame(() => {
    const p = motion.current.progress;
    const t = phase(p, 0.35, 0.92);
    if (vehicle.current) {
      // Truck drives along roadway to Storefront delivery apron
      const truckX = THREE.MathUtils.lerp(-2.2, 1.62, t);
      vehicle.current.position.x = truckX;
    }
    // Deloading pallet onto dedicated storefront receiving pad upon arrival
    const reachedStore = t >= 0.72;
    if (reachedStore !== unloadedAtStore) setUnloadedAtStore(reachedStore);
  });

  return (
    <group dispose={null}>
      <Floor size={[7.6, 0.03, 4.2]} />
      <Route points={[[-3.5, 0.015, 0.8], [3.5, 0.015, 0.8]]} radius={0.01} color="#E8E2D6" dashed />
      <group position={[-2.3, 0, -0.85]} scale={0.14}>
        <Plant accent={TINTS.saffron} name="CENTRAL DC" />
      </group>

      {/* Permanent, continuous storefront buildings: Storefront 1 is the West Store */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0.6 + i * 1.02, 0, -0.65]} scale={0.65}>
          <Storefront />
        </group>
      ))}

      {/* Pedestrian sidewalk in front of storefronts */}
      <Box at={[1.62, 0.02, -0.05]} size={[3.4, 0.03, 0.6]} color="#DFDCD4" />

      {/* Shoppers on the pavement, and the store's receiver waiting at the pad */}
      <group scale={0.1}>
        <Walker look="shopper" speed={0.9} path={[[1, -1.7], [32, -1.7], [32, 0.4], [1, 0.4]]} />
        <Walker look="planner" speed={1.1} offset={0.5} path={[[1, -1.7], [32, -1.7], [32, 0.4], [1, 0.4]]} />
        <Walker look={{ ...LOOKS.shopper, shirt: "#2F6DF6", skin: "#8A5A3C", hair: "#141210" }} speed={0.8} offset={0.25} path={[[1, -1.7], [32, -1.7], [32, 0.4], [1, 0.4]]} />
      </group>
      <group position={[2.3, 0, 0.3]} rotation-y={Math.PI - 0.3} scale={0.11}>
        <Person look="warehouse" pose={commercial ? "stand" : "tablet"} seed={2.4} />
      </group>
      {/* Dedicated Storefront receiving staging pad in front of West Store (NOT inside the building!) */}
      <Box at={[1.62, 0.035, 0.16]} size={[0.95, 0.012, 0.62]} color="#C9AA62" />

      {/* Staged replenishment inventory at Central DC */}
      <group position={[-1.2, 0, -0.7]} scale={0.6}>
        <LoadedPallet tote={plastic(tone)} />
      </group>
      <Route points={[[-3.3, 0.02, 0.8], [3.2, 0.02, 0.8]]} radius={0.12} color="#B7B5AD" />
      <Route
        points={[[-2.3, 0.15, 0.8], [2.5, 0.15, 0.8]]}
        radius={0.018}
        color={step === 2 ? TINTS.emerald : tone}
        dashed
        flow
        speed={0.35}
        pulseColor={step === 2 ? TINTS.emerald : tone}
      />

      {/* Delivery transport truck: pallet deloads once arrived at storefront receiving pad */}
      <group ref={vehicle} position={[-2.2, 0, 0.8]} scale={0.12}>
        <SemiTruck accent={tone}>
          {!unloadedAtStore && (
            <group position={[TRUCK.slots[1], TRUCK.deckY, 0]}>
              <LoadedPallet tote={plastic(tone)} />
            </group>
          )}
        </SemiTruck>
      </group>

      {/* Pallet DELOADED onto dedicated receiving pad in front of storefront */}
      {unloadedAtStore && (
        <group position={[1.62, 0.045, 0.16]} scale={0.58}>
          <LoadedPallet tote={plastic(step === 2 ? TINTS.emerald : tone)} />
        </group>
      )}

      <AssetLabel position={[-2.3, 1.5, -0.85]} title="CENTRAL DISTRIBUTION" detail={step === 2 ? "Dispatch plan updated" : "Stock and capacity checked"} width={2.3} color={TINTS.saffron} />
      <AssetLabel
        position={[1.62, 1.45, -0.65]}
        title={commercial ? "WEST / DEALER NETWORK" : "WEST / REGIONAL DEMAND"}
        detail={unloadedAtStore ? "Replenishment fulfilled (+1,800)" : commercial ? "Allocation +12%" : "Replenishment +1,800 units"}
        width={2.4}
        color={unloadedAtStore ? TINTS.emerald : tone}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 05. DEALER NETWORK: Forklift Picks Surplus from East, Deloads West  */
/* ------------------------------------------------------------------ */
export function DealerNetwork({ motion, step, tone }: SceneProps) {
  const forkliftGroup = useRef<THREE.Group>(null);
  const forkHeight = useRef(0.06);
  const [pickedFromEast, setPickedFromEast] = useState(false);
  const [droppedAtWest, setDroppedAtWest] = useState(false);

  useFrame(() => {
    const p = motion.current.progress;
    const t = phase(p, 0.25, 0.94);

    // Tangent-aligned realistic movement sequence:
    // [0..0.20]: Approach East bay from transit aisle (z: 0.95 -> 0.38), yaw: -PI/2 (facing -Z / bay)
    // [0.20..0.28]: Lift forks under top surplus pallet (h: 0.22 -> 0.38)
    // [0.28..0.42]: Reverse straight out to aisle (z: 0.38 -> 0.95), pivot smoothly to face +X (yaw: -PI/2 -> 0)
    // [0.42..0.72]: Transit along aisle to West (x: -2.3 -> 2.3), yaw: 0 (facing +X, wheels rolling)
    // [0.72..0.82]: Pivot to face West bay (yaw: 0 -> -PI/2), drive forward into bay (z: 0.95 -> 0.38)
    // [0.82..0.90]: Lower mast (h: 0.38 -> 0.05), deposit pallet onto West receiving pad
    // [0.90..1.0]: Reverse empty back out to aisle (z: 0.38 -> 0.88), forks lowered
    let fx = -2.3;
    let fz = 0.95;
    let fyaw = -Math.PI / 2;
    let fh = 0.06;
    let isPicked = false;
    let isDropped = false;

    if (t < 0.20) {
      // Approach East bay
      const u = t / 0.20;
      fx = -2.3;
      fz = THREE.MathUtils.lerp(0.95, 0.38, THREE.MathUtils.smoothstep(u, 0, 1));
      fyaw = -Math.PI / 2;
      fh = THREE.MathUtils.lerp(0.06, 0.22, u);
      isPicked = false;
      isDropped = false;
    } else if (t < 0.28) {
      // Mast lifts top pallet
      const u = (t - 0.20) / 0.08;
      fx = -2.3;
      fz = 0.38;
      fyaw = -Math.PI / 2;
      fh = THREE.MathUtils.lerp(0.22, 0.38, THREE.MathUtils.smoothstep(u, 0, 1));
      isPicked = u > 0.4;
      isDropped = false;
    } else if (t < 0.42) {
      // Reverse straight out to aisle, then turn into +X travel heading
      const u = (t - 0.28) / 0.14;
      fx = -2.3;
      fz = THREE.MathUtils.lerp(0.38, 0.95, THREE.MathUtils.smoothstep(u, 0, 1));
      // Tangent turn: yaw turns smoothly from -PI/2 to 0 as it enters aisle
      fyaw = u < 0.5 ? -Math.PI / 2 : THREE.MathUtils.lerp(-Math.PI / 2, 0, THREE.MathUtils.smoothstep((u - 0.5) * 2, 0, 1));
      fh = 0.38;
      isPicked = true;
      isDropped = false;
    } else if (t < 0.72) {
      // Transiting along central aisle facing +X
      const u = (t - 0.42) / 0.30;
      fx = THREE.MathUtils.lerp(-2.3, 2.3, THREE.MathUtils.smoothstep(u, 0, 1));
      fz = 0.95;
      fyaw = 0; // facing direction of travel (+X)
      fh = 0.38;
      isPicked = true;
      isDropped = false;
    } else if (t < 0.82) {
      // Turn into West bay and drive in
      const u = (t - 0.72) / 0.10;
      fx = 2.3;
      // Tangent turn: yaw turns from 0 to -PI/2 (facing into bay)
      fyaw = THREE.MathUtils.lerp(0, -Math.PI / 2, THREE.MathUtils.smoothstep(u, 0, 0.5));
      fz = u < 0.4 ? 0.95 : THREE.MathUtils.lerp(0.95, 0.38, THREE.MathUtils.smoothstep((u - 0.4) / 0.6, 0, 1));
      fh = 0.38;
      isPicked = true;
      isDropped = false;
    } else if (t < 0.90) {
      // Lower pallet onto West receiving pad
      const u = (t - 0.82) / 0.08;
      fx = 2.3;
      fz = 0.38;
      fyaw = -Math.PI / 2;
      fh = THREE.MathUtils.lerp(0.38, 0.05, THREE.MathUtils.smoothstep(u, 0, 1));
      isPicked = u < 0.6;
      isDropped = u >= 0.6;
    } else {
      // Reverse empty back to aisle
      const u = (t - 0.90) / 0.10;
      fx = 2.3;
      fz = THREE.MathUtils.lerp(0.38, 0.88, THREE.MathUtils.smoothstep(u, 0, 1));
      fyaw = -Math.PI / 2;
      fh = 0.05;
      isPicked = false;
      isDropped = true;
    }

    if (forkliftGroup.current) {
      forkliftGroup.current.position.set(fx, 0, fz);
      forkliftGroup.current.rotation.y = fyaw;
    }
    forkHeight.current = fh;

    if (isPicked !== pickedFromEast) setPickedFromEast(isPicked);
    if (isDropped !== droppedAtWest) setDroppedAtWest(isDropped);
  });

  return (
    <group dispose={null}>
      <Floor size={[7.6, 0.04, 4.5]} />
      {["EAST", "CENTRAL", "WEST"].map((region, i) => (
        <group key={region} position={[-2.3 + i * 2.3, 0, -0.75]}>
          <group scale={1.15}>
            <Storefront />
          </group>
          <AssetLabel
            phone={false}
            position={[0, 1.45, 0]}
            title={`${region} / DEALERS`}
            detail={i === 2 ? (droppedAtWest ? "Allocation +12% fulfilled" : "Orders exceed allocation") : i === 0 ? (droppedAtWest ? "Surplus transferred" : "Surplus within policy") : "Balanced demand"}
            color={i === 2 && droppedAtWest ? TINTS.emerald : i === 2 ? tone : TINTS.emerald}
            width={1.9}
          />
          <Box at={[0, 0.015, 0.72]} size={[1.65, 0.012, 0.045]} color="#D1B16E" />
          {[-0.65, 0.65].map((x) => (
            <Box key={x} at={[x, 0.015, 0.38]} size={[0.018, 0.012, 0.7]} color="#D1B16E" />
          ))}
        </group>
      ))}

      {/* East surplus bay: 2-tier stack (base pallet stays, top pallet picked) */}
      <group position={[-2.3, 0, 0.22]} scale={0.65}>
        {/* Base pallet: stays at East permanently */}
        <LoadedPallet tote={plastic(TINTS.saffron)} />
        {/* Top surplus pallet: picked by forklift, visible only before pickup */}
        {!pickedFromEast && !droppedAtWest && (
          <group position={[0, 0.22, 0]}>
            <LoadedPallet tote={plastic(tone)} />
          </group>
        )}
      </group>

      {/* West receiving slot: pallet DELOADED at West bay after transfer */}
      {droppedAtWest && (
        <group position={[2.3, 0, 0.22]} scale={0.65}>
          <LoadedPallet tote={plastic(step === 2 ? TINTS.emerald : tone)} />
        </group>
      )}

      {/* Dealer staff: the West account manager checks the allocation, East signs off the surplus */}
      <group position={[2.95, 0, 0.32]} rotation-y={Math.PI * 0.85} scale={0.15}>
        <Person look="planner" pose={droppedAtWest ? "wave" : "tablet"} seed={1.7} />
      </group>
      <group position={[-1.6, 0, 0.36]} rotation-y={Math.PI * 1.15} scale={0.15}>
        <Person look="crew" pose="tablet" seed={0.3} />
      </group>
      {/* Central transit corridor track */}
      <Box at={[0, 0.002, 0.95]} size={[7, 0.01, 0.65]} color="#AAAFAA" />
      {Array.from({ length: 14 }, (_, i) => (
        <Box key={i} at={[-3.2 + i * 0.48, 0.012, 0.95]} size={[0.22, 0.006, 0.018]} color="#F5F0E5" />
      ))}

      {/* Transfer forklift: enters naturally, turns with tangent heading, carries top pallet */}
      <group ref={forkliftGroup} position={[-2.3, 0, 0.95]} scale={M}>
        <Forklift color={TINTS.saffron} lift={() => forkHeight.current}>
          {pickedFromEast && !droppedAtWest && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={plastic(tone)} />
            </group>
          )}
        </Forklift>
      </group>

      <Route points={[[-2.3, 0.016, 1.55], [2.3, 0.016, 1.55], [2.3, 0.016, 1.1]]} color={droppedAtWest ? TINTS.emerald : tone} radius={0.014} dashed flow speed={0.32} pulseColor={droppedAtWest ? TINTS.emerald : tone} />
      <AssetLabel position={[0, 0.25, 1.65]} title={droppedAtWest ? "WEST +12% CONFIRMED" : "EAST RESERVE SECURED"} color={droppedAtWest ? TINTS.emerald : tone} width={2.2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 06. MAINTENANCE: Diagnostic Motor & Vibration Decoupling           */
/* ------------------------------------------------------------------ */
export function Motor({ motion, still }: Pick<SceneProps, "motion" | "still">) {
  const rotor = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const bearing = useRef<THREE.Group>(null);
  const rotorAngle = useRef(0);
  const geometry = useMemo(
    () =>
      geo("motor-finned-body", () =>
        merge([
          cylX(0.57, 1.7, 0, 0, 0, 64),
          ...Array.from({ length: 15 }, (_, i) => cylX(0.66, 0.026, -0.75 + i * 0.105, 0, 0, 64)),
          box(1.5, 0.16, 1.2, 0, -0.61, 0),
          box(0.42, 0.26, 0.38, -0.3, 0.65, 0),
        ]),
      ),
    [],
  );

  useFrame((state, dt) => {
    const p = motion.current.progress;
    const open = phase(p, 0.2, 0.46) * (1 - phase(p, 0.73, 0.94));
    if (cover.current) cover.current.position.x = 1.04 + open * 1.25;
    if (bearing.current) {
      bearing.current.position.x = 0.96 + open * 0.55;
      if (!still && open > 0.05) bearing.current.rotation.x = state.clock.elapsedTime * 0.45;
    }
    if (rotor.current && !still) {
      const targetSpeed = p > 0.72 ? 0.22 : 0.7;
      rotorAngle.current += targetSpeed * (dt > 0 ? Math.min(dt, 0.05) : 1 / 60) * 4;
      rotor.current.rotation.x = rotorAngle.current;
    }
  });

  return (
    <group position={[-0.65, 1, 0]} dispose={null}>
      <mesh geometry={geometry} material={enamel("#385C84", 0.38)} castShadow receiveShadow />
      <mesh position={[-0.9, 0, 0]} rotation-z={Math.PI / 2} material={enamel("#313B46")} castShadow>
        <cylinderGeometry args={[0.65, 0.65, 0.18, 64]} />
      </mesh>
      <group ref={rotor}>
        <mesh rotation-z={Math.PI / 2} position-x={0.72} material={chrome()} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 2.1, 48]} />
        </mesh>
        <Box at={[1.62, 0.13, 0]} size={[0.28, 0.04, 0.06]} metal />
      </group>
      <group ref={bearing} rotation-z={Math.PI / 2} scale={6.5}>
        <Bearing />
      </group>
      <group ref={cover} position-x={1.04} rotation-y={Math.PI / 2}>
        <mesh material={aluminium(0.28)} castShadow>
          <torusGeometry args={[0.53, 0.12, 16, 64]} />
        </mesh>
        <Bolts radius={0.54} z={0.12} />
      </group>
      <Box at={[-0.3, 0.85, 0]} size={[0.2, 0.13, 0.18]} color={TINTS.saffron} />
      <Route points={[[-0.3, 0.91, 0], [-0.3, 1.13, 0], [-1.35, 1.13, 0], [-1.35, -0.8, 0]]} color="#41464D" radius={0.016} flow speed={0.4} pulseColor={TINTS.saffron} />
      {[-0.5, 0.5].map((x) =>
        [-0.45, 0.45].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.48, z]} material={steel()}>
            <cylinderGeometry args={[0.035, 0.035, 0.17, 6]} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Maintenance(props: SceneProps) {
  return (
    <group>
      <Floor size={[6.4, 0.035, 3.6]} />
      <Box at={[-0.65, 0.04, 0]} size={[3.5, 0.08, 1.9]} color="#2D3339" metal />
      <Route points={[[-2.6, 0.012, -1.3], [1.4, 0.012, -1.3], [1.4, 0.012, 1.3], [-2.6, 0.012, 1.3], [-2.6, 0.012, -1.3]]} color="#D8B150" radius={0.009} dashed />
      <group position={[2.25, 0, -0.65]}>
        <Box at={[0, 0.34, 0]} size={[0.65, 0.68, 0.52]} color="#424D56" />
        <Box at={[0, 0.71, 0]} size={[0.7, 0.06, 0.56]} metal />
        <Box at={[0, 0.92, -0.12]} size={[0.42, 0.3, 0.04]} color="#21262B" />
        <mesh position={[0, 0.92, -0.09]} material={darkGlass()}>
          <planeGeometry args={[0.38, 0.26]} />
        </mesh>
        <group position={[0.18, 0.77, 0.1]} scale={2.8} rotation-x={Math.PI / 2}>
          <Bearing />
        </group>
      </group>
      {/* The maintenance technician at the bench, and a reliability engineer pointing at the drive end */}
      <group position={[2.25, 0, 0.02]} rotation-y={Math.PI / 2} scale={0.72}>
        <Person look="engineer" pose="tablet" seed={1.1} />
      </group>
      <group position={[0.55, 0, 1.3]} rotation-y={Math.PI * 0.6} scale={0.72}>
        <Person look="crew" pose="point" seed={3.3} />
      </group>
      {/* Motor lowered slightly to guarantee generous camera ceiling headroom */}
      <group position={[0, -0.22, 0]}>
        <Motor {...props} />
      </group>
      <Route points={[[-2.35, 0.015, 0.85], [-2.35, 0.015, 1.25], [2.3, 0.015, 1.25], [2.3, 0.015, 0.85]]} color={TINTS.saffron} radius={0.012} flow speed={0.32} pulseColor={TINTS.saffron} />
      <AssetLabel position={[-1, 1.95, 0]} title="LINE 04 / DRIVE MOTOR" detail="Sensor V-04 · drive-end bearing" width={2.4} color={TINTS.emerald} />
      <AssetLabel position={[2.25, 1.25, -0.65]} title={props.step === 2 ? "WORK ORDER CM-041" : "BEARING X90"} detail={props.step === 2 ? "Friday · service window reserved" : "Inspect inner race"} width={2.0} color={props.step === 2 ? TINTS.emerald : COLORS.signal} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 07. CUSTOMER / SERVICE: 14 Service Cases Converging on Bearing X90 */
/* ------------------------------------------------------------------ */
function CaseTicket({ id, step }: { id: number; step: number }) {
  const isEscalated = step === 2;
  const tagColor = isEscalated ? TINTS.emerald : TINTS.pink;
  return (
    <group>
      {/* Heavy cardstock case file card */}
      <Box at={[0, 0, 0]} size={[0.44, 0.035, 0.56]} color="#FFFDF9" />
      {/* Case record top header tab */}
      <Box at={[0, 0.022, -0.21]} size={[0.36, 0.008, 0.08]} color={tagColor} />
      {/* Case ID badge dot */}
      <mesh position={[-0.13, 0.028, -0.21]}>
        <cylinderGeometry args={[0.016, 0.016, 0.006, 12]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Case record metadata lines */}
      <Box at={[0.03, 0.022, -0.21]} size={[0.2, 0.006, 0.022]} color="#FFFFFF" />
      <Box at={[-0.03, 0.022, -0.09]} size={[0.3, 0.005, 0.018]} color="#384048" />
      <Box at={[0, 0.022, -0.02]} size={[0.36, 0.005, 0.014]} color="#A39F97" />
      <Box at={[0, 0.022, 0.05]} size={[0.36, 0.005, 0.014]} color="#A39F97" />
      <Box at={[-0.05, 0.022, 0.12]} size={[0.26, 0.005, 0.014]} color="#A39F97" />
      {/* Barcode / tracking index */}
      <Box at={[0.11, 0.022, 0.19]} size={[0.14, 0.005, 0.036]} color="#2C3238" />
    </group>
  );
}

export function Customer({ motion, step }: SceneProps) {
  const tickets = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const t = phase(motion.current.progress, 0.2, 0.76);
    tickets.current.forEach((g, i) => {
      if (!g) return;
      const a = (i / 14) * Math.PI * 2;
      g.position.set(
        THREE.MathUtils.lerp(-2.8 + (i % 4) * 0.48, Math.cos(a) * 2.3, t),
        0.12 + Math.sin(i) * 0.015,
        THREE.MathUtils.lerp(-1 + Math.floor(i / 4) * 0.5, Math.sin(a) * 1.7, t),
      );
      g.rotation.y = THREE.MathUtils.lerp((i % 3 - 1) * 0.16, -a, t);
    });
  });

  return (
    <group dispose={null}>
      {/* Machined inspection pedestal base */}
      <mesh position={[0, 0.04, 0]} material={steel("#2B3137")} receiveShadow>
        <cylinderGeometry args={[2.65, 2.75, 0.08, 64]} />
      </mesh>
      {/* Diagnostic radar reticle concentric rings */}
      <mesh position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 0.88, 48]} />
        <meshBasicMaterial color={step === 2 ? TINTS.emerald : TINTS.pink} opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.65, 1.68, 64]} />
        <meshBasicMaterial color={step === 2 ? TINTS.emerald : TINTS.pink} opacity={0.35} transparent />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.35, 2.38, 64]} />
        <meshBasicMaterial color={step === 2 ? TINTS.emerald : TINTS.pink} opacity={0.2} transparent />
      </mesh>

      {/* Optical probe sensor arm */}
      <group position={[1.05, 0.35, 0]}>
        <mesh material={chrome()}>
          <cylinderGeometry args={[0.035, 0.035, 0.65, 16]} />
        </mesh>
        <Box at={[0, 0.34, 0]} size={[0.22, 0.18, 0.16]} color="#242B30" />
        <mesh position={[0, 0.34, 0.09]} material={darkGlass()}>
          <planeGeometry args={[0.16, 0.12]} />
        </mesh>
      </group>

      {/* Central inspected component: Bearing X90 */}
      <group position={[0, 0.8, 0]} rotation-x={Math.PI / 2} scale={10}>
        <Bearing />
      </group>

      {/* A quality engineer inspects the part; a service lead briefs from the far side */}
      <group position={[2.95, 0, 0.95]} rotation-y={Math.PI * 0.9} scale={0.78}>
        <Person look="engineer" pose="tablet" seed={0.7} />
      </group>
      <group position={[-3.0, 0, -0.7]} rotation-y={-0.25} scale={0.78}>
        <Person look="planner" pose={step === 2 ? "point" : "stand"} seed={2.9} />
      </group>
      {/* The 14 Service Case Ticket Cards (CAS-01 through CAS-14) */}
      {Array.from({ length: 14 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            tickets.current[i] = g;
          }}
        >
          <CaseTicket id={i + 1} step={step} />
        </group>
      ))}

      {/* Dynamic telemetry lines linking all 14 service tickets to Bearing X90 */}
      {step > 0 &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return (
            <Route
              key={i}
              points={[[Math.cos(a) * 2.1, 0.04, Math.sin(a) * 1.5], [0, 0.04, 0]]}
              color={step === 2 ? "#A9CDBA" : "#D9BEC9"}
              radius={0.012}
              flow
              speed={0.4}
              pulseColor={step === 2 ? TINTS.emerald : TINTS.pink}
            />
          );
        })}

      <AssetLabel
        position={[0, 1.85, 0]}
        title="COMMON PART / BEARING X90"
        detail={step === 2 ? "14 isolated service cases consolidated into 1 escalation" : "Common root cause identified across 14 field cases"}
        color={step === 2 ? TINTS.emerald : TINTS.pink}
        width={3.1}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 08. FINANCE: Three-way Match & Held Disbursement Ledger            */
/* ------------------------------------------------------------------ */
/** A ceramic cup on a saucer with a wisp of steam. */
function DeskCup({ at }: { at: Vec }) {
  const steam = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    steam.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 0.35 + i / 3) % 1;
      m.position.set(Math.sin(k * 6 + i) * 0.04, 0.42 + k * 0.5, 0);
      m.scale.setScalar(0.5 + k);
      (m.material as THREE.MeshStandardMaterial).opacity = Math.sin(k * Math.PI) * 0.35;
    });
  });
  return (
    <group position={at}>
      <mesh material={enamel("#F4F2EE", 0.35)} receiveShadow castShadow>
        <cylinderGeometry args={[0.36, 0.3, 0.035, 40]} />
      </mesh>
      <mesh position-y={0.2} material={enamel("#F7F6F3", 0.3)} castShadow>
        <cylinderGeometry args={[0.24, 0.19, 0.36, 40]} />
      </mesh>
      <mesh position-y={0.37} rotation-x={-Math.PI / 2} material={enamel("#4A2E1E", 0.25)}>
        <circleGeometry args={[0.215, 32]} />
      </mesh>
      <mesh position={[0.26, 0.21, 0]} rotation-x={Math.PI / 2} material={enamel("#F7F6F3", 0.3)} castShadow>
        <torusGeometry args={[0.08, 0.022, 10, 24, Math.PI * 1.3]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { if (m) steam.current[i] = m; }}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function Finance({ step, motion }: SceneProps) {
  const isHeld = step === 2;

  return (
    <group rotation-y={-0.12}>
      {/* Leather ledger audit desk pad */}
      <Box at={[0, 0.01, 0.2]} size={[6.8, 0.02, 3.2]} color="#EAE4D7" />
      <Box at={[0, 0.022, 0.2]} size={[6.3, 0.016, 2.8]} color="#282F35" />
      <Route points={[[-3.1, 0.032, -1.1], [3.1, 0.032, -1.1], [3.1, 0.032, 1.5], [-3.1, 0.032, 1.5], [-3.1, 0.032, -1.1]]} color="#C49B55" radius={0.006} />

      {/* Brass executive paperweight & stamp holder */}
      <Box at={[-2.7, 0.05, -0.6]} size={[0.42, 0.045, 0.24]} color="#C5A059" metal />
      <group position={[2.7, 0.04, -0.6]}>
        <mesh material={aluminium(0.3)}>
          <cylinderGeometry args={[0.13, 0.13, 0.08, 24]} />
        </mesh>
        <mesh position-y={0.07} material={enamel(isHeld ? COLORS.signal : TINTS.emerald)}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 16]} />
        </mesh>
      </group>

      {/* Life on the desk: a coffee going cold and the reviewer's pen */}
      <DeskCup at={[2.65, 0.03, 1.12]} />
      <group position={[-2.3, 0.07, 1.08]} rotation-y={0.35}>
        <mesh rotation-z={Math.PI / 2} material={paint("#1F2228", 0.25)} castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.78, 20]} />
        </mesh>
        <mesh position-x={0.43} rotation-z={-Math.PI / 2} material={brass()} castShadow>
          <coneGeometry args={[0.04, 0.1, 20]} />
        </mesh>
        <mesh position={[-0.22, 0.05, 0]} material={brass()}>
          <boxGeometry args={[0.3, 0.012, 0.02]} />
        </mesh>
      </group>
      {/* Document 1 (Left): PURCHASE ORDER PO-8842 */}
      <group position={[-2.05, 0.05, -0.4]}>
        <Box at={[0, 0, 0]} size={[1.65, 0.035, 1.95]} color="#FFFDF9" />
        {/* PO Header banner */}
        <Box at={[0, 0.022, -0.8]} size={[1.45, 0.008, 0.18]} color={TINTS.emerald} />
        <Box at={[-0.32, 0.028, -0.8]} size={[0.55, 0.004, 0.04]} color="#FFFFFF" />
        {/* PO itemization table lines */}
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} at={[0, 0.022, -0.55 + i * 0.18]} size={[i === 0 ? 1.4 : 1.3, 0.005, 0.025]} color={i === 0 ? "#4A525A" : "#B5B0A6"} />
        ))}
        {/* Green verified checkmark badge stamp */}
        <Box at={[0.42, 0.025, 0.65]} size={[0.44, 0.008, 0.16]} color={TINTS.emerald} />
        <AssetLabel phone={false} position={[0, 0.35, -0.55]} title="PURCHASE ORDER" detail="PO-8842 · 240 units matched" width={1.8} color={TINTS.emerald} />
      </group>

      {/* Document 2 (Middle): GOODS RECEIPT GRN-1049 (MISSING RECEIPT) */}
      <group position={[0, 0.05, -0.4]}>
        <Box at={[0, 0, 0]} size={[1.65, 0.035, 1.95]} color="#FFFDF9" />
        {/* GRN Alert Header */}
        <Box at={[0, 0.022, -0.8]} size={[1.45, 0.008, 0.18]} color={COLORS.signal} />
        <Box at={[-0.32, 0.028, -0.8]} size={[0.55, 0.004, 0.04]} color="#FFFFFF" />
        {/* Dashed alert border framing the missing receipt */}
        <Route points={[[-0.7, 0.024, -0.65], [0.7, 0.024, -0.65], [0.7, 0.024, 0.8], [-0.7, 0.024, 0.8], [-0.7, 0.024, -0.65]]} color={COLORS.signal} radius={0.008} dashed />
        {/* Warning caution stamp: RECEIPT MISSING */}
        <Box at={[0, 0.025, 0.1]} size={[1.1, 0.008, 0.28]} color={COLORS.signal} />
        {Array.from({ length: 4 }, (_, i) => (
          <Box key={i} at={[0, 0.022, -0.45 + i * 0.14]} size={[1.2, 0.004, 0.02]} color="#D4A7A3" />
        ))}
        <AssetLabel phone={false} position={[0, 0.35, -0.55]} title="GOODS RECEIPT" detail="GRN-1049 · Pending delivery" width={1.8} color={COLORS.signal} />
      </group>

      {/* Document 3 (Right Stack): 3 SUPPLIER INVOICES (FANNED PACK) */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[2.05 + i * 0.05, 0.05 + i * 0.03, -0.4 + i * 0.06]}>
          <Box at={[0, 0, 0]} size={[1.65, 0.03, 1.95]} color="#FFFDF9" />
          {/* Invoice Header */}
          <Box at={[0, 0.02, -0.8]} size={[1.45, 0.006, 0.16]} color={TINTS.violet} />
          {/* Invoice line items */}
          {Array.from({ length: 5 }, (_, k) => (
            <Box key={k} at={[0, 0.02, -0.55 + k * 0.18]} size={[1.3, 0.004, 0.022]} color="#A39DAE" />
          ))}
          {/* Top invoice gets the prominent "PAYMENT ON HOLD" audit stamp */}
          {i === 2 && (
            <group position={[0, 0.025, 0.2]}>
              <Box at={[0, 0, 0]} size={[1.35, 0.012, 0.38]} color={isHeld ? COLORS.signal : TINTS.saffron} />
              <Box at={[0, 0.008, 0]} size={[1.25, 0.004, 0.28]} color="#FFFFFF" />
              <Box at={[0, 0.012, 0]} size={[1.15, 0.006, 0.2]} color={isHeld ? COLORS.signal : TINTS.saffron} />
            </group>
          )}
        </group>
      ))}

      {/* Invoice label on top of the pack */}
      <AssetLabel phone={false} position={[2.15, 0.45, -0.34]} title="3 SUPPLIER INVOICES" detail={isHeld ? "INV-901..903 · Payment on hold" : "3 invoices received · Awaiting match"} width={2.2} color={isHeld ? COLORS.signal : TINTS.violet} />

      {/* Dynamic reconciliation audit vector connections */}
      <Route points={[[-2.05, 0.06, 0.7], [-2.05, 0.06, 1.35], [2.15, 0.06, 1.35], [2.15, 0.06, 0.7]]} color={isHeld ? TINTS.saffron : TINTS.violet} radius={0.022} flow speed={0.32} pulseColor={isHeld ? TINTS.saffron : COLORS.signal} />
      <AssetLabel position={[0, 0.25, 1.6]} title={isHeld ? "CONTROL APPLIED · 3 PAYMENTS HELD" : "THREE-WAY MATCH · ONE RECORD MISSING"} color={isHeld ? TINTS.saffron : COLORS.signal} width={3.3} />
    </group>
  );
}
