"use client";

// 05 Decision: the yard, both plants, the forklift loading 240 units and the truck taking them across.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { CH, activePin, blendAt, localIn, smootherstep, smoothstep, store, weight } from "@/lib/story";
import { BEATS, M, PLANT_01, PLANT_02, PLANT_FRONT, ROAD_LENGTH, ROAD_Z, transferredUnits, truckX, type Pose } from "@/lib/scene";
import { TINTS } from "../palette";
import { Plant } from "../buildings";
import { Forklift, SemiTruck, TRUCK } from "../vehicles";
import { LoadedPallet } from "../parts";
import { DROP_X, PALLETS, SLOT_X, STAGE_Z, DECK_Z, liftAt, palletStates, unloadAt, type Lift } from "../transfer-motion";
import { asphalt, concrete, enamel, plastic } from "../materials";
import { useDisposeOnUnmount } from "../kit";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ScreenTag } from "../ScreenTag";
import { Actor, arriveK, reducedMotion, type Track } from "./core";

/** Top of the concrete apron in front of each plant (scene units); the plant's markings and crew stand on it. */
const APRON_TOP = 0.012;

/* ------------------------------------------------------------------ */
/* 05 Decision: a forklift loads 240 units, the truck takes them across */
/* ------------------------------------------------------------------ */

const inDecision = (p: Pose): Track => (c) => (c === CH.decision ? p : null);

function roadLines(roadLength: number) {
  const parts: THREE.BufferGeometry[] = [];
  // Road edge lines and a dashed centre line
  for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(roadLength, 0.002, 0.018).translate(0, 0.0165, ROAD_Z + s * 0.33));
  for (let i = 0; i < Math.floor(roadLength / 0.52); i++) parts.push(new THREE.BoxGeometry(0.22, 0.002, 0.016).translate(-roadLength / 2 + 0.3 + i * 0.52, 0.0165, ROAD_Z));
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
}

/** The aprons in front of both plants and the painted bays where the pallets are staged. */
function YardPads() {
  const bays = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [...SLOT_X, ...DROP_X]) {
      for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.008, 0.002, 0.15).translate(x + s * 0.092, 0.0135, STAGE_Z));
      for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.19, 0.002, 0.008).translate(x, 0.0135, STAGE_Z + s * 0.072));
    }
    return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  }, []);
  return (
    <>
      {[PLANT_02, PLANT_01].map((p) => (
        <mesh key={p[0]} position={[p[0], APRON_TOP / 2, (PLANT_FRONT + ROAD_Z - 0.36) / 2]} receiveShadow material={concrete("#E3E6EB")}>
          <boxGeometry args={[2.9, APRON_TOP, ROAD_Z - 0.36 - PLANT_FRONT + 0.02]} />
        </mesh>
      ))}
      <mesh geometry={bays} material={enamel("#F3F5F7", 0.5)} />
    </>
  );
}

/** The road, the aprons and the bays. Also used by the applications explorer. */
export function Yard({ roadLength = 16 }: { roadLength?: number }) {
  const lines = useMemo(() => roadLines(roadLength), [roadLength]);
  return (
    <group>
      <mesh position={[0, 0.0075, ROAD_Z]} receiveShadow material={asphalt()}>
        <boxGeometry args={[roadLength, 0.015, 0.72]} />
      </mesh>
      <mesh geometry={lines} material={enamel("#FFFFFF", 0.6)} />
      <YardPads />
    </group>
  );
}

/**
 * The story's road runs off both sides of every Decision frame, so it never ends mid-frame. It draws
 * out from the yard as the chapter arrives and stays at full length until the camera has turned to
 * Control, then fades (its own materials, so the explorer's road is untouched).
 */
function StoryRoad() {
  const lines = useMemo(() => roadLines(ROAD_LENGTH), []);
  const mats = useMemo(() => {
    const road = asphalt().clone();
    if (road.map) {
      road.map = road.map.clone();
      road.map.repeat.set((4 * ROAD_LENGTH) / 16, 1);
      road.map.needsUpdate = true;
    }
    road.transparent = true;
    const paint = enamel("#FFFFFF", 0.6).clone();
    paint.transparent = true;
    return { road, paint };
  }, []);
  useDisposeOnUnmount(mats, (m) => {
    m.road.map?.dispose();
    m.road.dispose();
    m.paint.dispose();
  });
  useDisposeOnUnmount(lines, (g) => g.dispose());
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { i, j, e } = blendAt(store.g);
    const still = reducedMotion();
    let len = 0;
    let alpha = 1;
    if (i === CH.decision) {
      len = 1;
      // Leaving for Control: full length until the camera has arrived, then it fades.
      if (j === CH.control) alpha = 1 - (still ? (e < 0.5 ? 0 : 1) : smoothstep(0.85, 1, e));
    } else if (j === CH.decision) {
      // Arriving: the road draws out from the yard in both directions, past the frame's edges.
      len = still ? (e < 0.5 ? 0 : 1) : smootherstep(0.2, 0.75, e);
    }
    g.visible = len > 0.002 && alpha > 0.005;
    g.scale.set(Math.max(len, 0.001), 1, 1);
    mats.road.opacity = alpha;
    mats.paint.opacity = alpha;
    mats.road.depthWrite = alpha > 0.99;
  });
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, 0.0075, ROAD_Z]} receiveShadow material={mats.road}>
        <boxGeometry args={[ROAD_LENGTH, 0.015, 0.72]} />
      </mesh>
      <mesh geometry={lines} material={mats.paint} />
    </group>
  );
}

/** Labels come in once the yard has assembled and leave before it breaks up. */
const tagShown = () => smoothstep(0.75, 1, weight(CH.decision, store.g));
/** The one label open in this chapter is handed along the action (lib/story pinAt). */
const pinned = (id: string) => () => activePin() === id;
const PLANT_02_POSE: Pose = { p: PLANT_02, s: M };
const PLANT_01_POSE: Pose = { p: PLANT_01, s: M };
const YARD_POSE: Pose = { p: [0, 0, 0] };

export function Transfer() {
  const truck = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null);
  const fork2 = useRef<THREE.Group>(null);
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
  const lift2 = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
  const height2 = useRef(0.06);
  const [states, setStates] = useState<number[]>([0, 0, 0]);
  const statesRef = useRef(states);
  const [arrived, setArrived] = useState(false);
  const [order, setOrder] = useState("Approved · loading next");
  // Units on their way, counted exactly as the page's "Plant 02 left" figure counts them.
  const [sent, setSent] = useState(0);
  const last = useRef({ sent: 0, arrived: false, order: "Approved · loading next" });
  // The transfer's cargo: emerald, the colour of the moving order.
  const tote = useMemo(() => plastic(TINTS.emerald, 0.5, true), []);
  const height = useRef(0.06);
  const scratch = useMemo(() => [0, 0, 0], []);

  useFrame(() => {
    const { i, j, e: raw, local } = blendAt(store.g);
    const e = reducedMotion() ? (raw < 0.5 ? 0 : 1) : raw;
    const here = i === CH.decision || j === CH.decision;
    const t = i === CH.decision ? local : 0;
    // Arriving from Context: the truck drives in along the road to Plant 02. Leaving for Control:
    // it drives on along the road and out of frame, never off the end of it.
    const inK = j === CH.decision && i !== CH.decision ? smootherstep(0, 1, arriveK(e, 0.05)) : here ? 1 : 0;
    const exit = i === CH.decision ? e : 0;

    liftAt(t, lift);
    unloadAt(t, lift2);
    height.current = lift.h;
    height2.current = lift2.h;
    const units = Math.round(transferredUnits(store.g >= CH.decision + 1 ? 1 : localIn(CH.decision, store.g)));
    if (units !== last.current.sent) setSent((last.current.sent = units));
    if (truck.current) {
      const inX = (1 - inK) * (1 - inK) * 9;
      truck.current.visible = here && (inK > 0.002 || exit > 0);
      truck.current.position.set(truckX(t, exit) - inX, 0, ROAD_Z);
      truck.current.scale.setScalar(M * smoothstep(0, 0.25, inK));
    }
    if (fork.current) {
      const s = smootherstep(0, 1, j === CH.decision && i !== CH.decision ? arriveK(e, 0.12) : here ? 1 : 0) * (1 - smoothstep(0, 0.6, exit));
      fork.current.visible = here && s > 0.002;
      fork.current.position.set(lift.x, 0, lift.z);
      fork.current.rotation.y = lift.yaw;
      fork.current.rotation.x = lift.pitch;
      fork.current.rotation.z = lift.roll;
      fork.current.scale.setScalar(M * s);
    }
    if (fork2.current) {
      // Plant 01's forklift waits in its yard from the start and leaves with the yard.
      const s = smootherstep(0, 1, j === CH.decision && i !== CH.decision ? arriveK(e, 0.16) : here ? 1 : 0) * (1 - smoothstep(0, 0.6, exit));
      fork2.current.visible = here && s > 0.002;
      fork2.current.position.set(lift2.x, 0, lift2.z);
      fork2.current.rotation.y = lift2.yaw;
      fork2.current.rotation.x = lift2.pitch;
      fork2.current.rotation.z = lift2.roll;
      fork2.current.scale.setScalar(M * s);
    }
    const next = palletStates(t, lift, scratch, lift2);
    let moved = false;
    for (let n = 0; n < PALLETS; n++) if (next[n] !== statesRef.current[n]) moved = true;
    if (moved) {
      statesRef.current = next.slice();
      setStates(statesRef.current);
    }
    const done = t > BEATS.unload[1] - 0.02;
    const atPlant = t > BEATS.drive[1] - 0.02;
    if (done !== last.current.arrived) setArrived((last.current.arrived = done));
    // The truck's own status, in step with the transfer order panel on the page.
    let onDeck = 0;
    for (const v of next) if (v === 2) onDeck++;
    const status = done
      ? "Received at Plant 01"
      : atPlant
        ? `Unloading at Plant 01 · ${PALLETS - onDeck} of ${PALLETS}`
        : t >= BEATS.drive[0]
        ? "In transit · 2 days"
        : t >= BEATS.load[0]
          ? `Loading · ${onDeck} of ${PALLETS} pallets`
          : "Approved · loading next";
    if (status !== last.current.order) setOrder((last.current.order = status));
  });

  return (
    <>
      <StoryRoad />
      {/* The plants go up from the ground as the yard assembles, and back down as it leaves. */}
      <Actor track={inDecision(PLANT_02_POSE)} arrive="build" leave="build">
        <Plant accent={TINTS.saffron} name="PLANT 02" ground={APRON_TOP / M} neutral />
        <group position={[0, 7.8, 0]}>
          <ScreenTag title="Plant 02" value={`${620 - sent} units · ${sent} sent`} tone={TINTS.saffron} rest="none" show={tagShown} open={pinned("plant02")} />
        </group>
      </Actor>
      <Actor track={inDecision(PLANT_01_POSE)} delay={0.08} arrive="build" leave="build">
        <Plant accent={TINTS.cobalt} name="PLANT 01" ground={APRON_TOP / M} neutral />
        <group position={[0, 7.8, 0]}>
          <ScreenTag
            title="Plant 01"
            value={arrived ? "Day 6 · 380 projected" : "Day 6 · 140 projected"}
            tone={arrived ? TINTS.emerald : TINTS.cobalt}
            rest="none"
            show={tagShown}
            open={pinned("plant01")}
          />
        </group>
      </Actor>
      <Actor track={inDecision(YARD_POSE)} delay={0.04} arrive="build" leave="build">
        <YardPads />
        {/* Pallets waiting in the yard */}
        {SLOT_X.map((x, n) =>
          states[n] === 0 ? (
            <group key={n} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ) : null,
        )}
        {/* Pallets received in Plant 01's bays */}
        {DROP_X.map((x, n) =>
          states[n] === 3 ? (
            <group key={`r${n}`} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ) : null,
        )}
      </Actor>
      <group ref={truck} visible={false}>
        <group position={[6.2, 4.6, 0]}>
          <ScreenTag title="TRF-0240" value={order} tone={TINTS.emerald} rest="none" show={tagShown} open={pinned("truck")} />
        </group>
        <SemiTruck accent={TINTS.emerald}>
          {TRUCK.slots.map((x, n) =>
            states[n] === 2 ? (
              <group key={n} position={[x, TRUCK.deckY, DECK_Z]}>
                <LoadedPallet tote={tote} />
              </group>
            ) : null,
          )}
        </SemiTruck>
      </group>
      <group ref={fork2} visible={false}>
        <Forklift color={TINTS.cobalt} lift={() => height2.current}>
          {states.some((v) => v === 4) && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>
      <group ref={fork} visible={false}>
        <Forklift color={TINTS.saffron} lift={() => height.current}>
          {states.some((v) => v === 1) && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>
    </>
  );
}
