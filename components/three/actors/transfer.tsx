"use client";

// 05 Decision: the yard, your plant and the customer, the forklift loading shipment SHP-0612, and the
// truck held at the bay: line 12 is flagged for review, so nothing leaves (handoff: dispatch not approved).
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState } from "react";
import { BEATS, CH, activePin, blendAt, localIn, smootherstep, smoothstep, store, weight } from "@/lib/story";
import { M, PLANT_01, PLANT_02, PLANT_FRONT, ROAD_LENGTH, ROAD_Z, transferredUnits, truckX, type Pose } from "@/lib/scene";
import { COLORS, TINTS } from "../palette";
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
/* 05 Decision: the shipment is loaded, and held at the bay for review   */
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

/** The yard's words as they change frame by frame: the pallets loaded, the truck's status. */
type Live = { sent: number; order: string; arrived: boolean };

/**
 * A tag whose words follow the yard: only the tag re-renders when they change. Held in the yard's own
 * state, every unit loaded (nearly every scroll frame through the loading) re-rendered both plants and
 * their crews, the truck and the forklifts: a phone's frames through Decision went to React.
 */
function LiveTag({ title, read, open }: { title: string; read: () => readonly [string, string]; open: () => boolean }) {
  const [[value, tone], set] = useState(read);
  const cur = useRef<readonly [string, string]>([value, tone]);
  useFrame(() => {
    const next = read();
    if (next[0] !== cur.current[0] || next[1] !== cur.current[1]) set((cur.current = next));
  });
  return <ScreenTag title={title} value={value} tone={tone} rest="none" show={tagShown} open={open} />;
}

const plant02Text = (l: Live) => [l.arrived ? "Line 12 held for review" : `${l.sent} of 3 pallets loaded`, TINTS.saffron] as const;
const plant01Text = () => ["Awaiting the document pack", TINTS.cobalt] as const;
const truckText = (l: Live) => [l.order, l.arrived ? COLORS.signal : TINTS.emerald] as const;
const openPlant02 = pinned("plant02");
const openPlant01 = pinned("plant01");
const openTruck = pinned("truck");

export function Transfer() {
  const truck = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null);
  const fork2 = useRef<THREE.Group>(null);
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
  const lift2 = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
  const height2 = useRef(0.06);
  // Where each pallet is: changes a dozen times through the chapter, so it stays React state.
  const [states, setStates] = useState<number[]>([0, 0, 0]);
  const statesRef = useRef(states);
  // Units on their way (counted exactly as the page's "Plant 02 left" figure counts them), the truck's
  // status and Plant 01's arrival: read by the tags (LiveTag), never re-rendering the yard.
  const live = useMemo<Live>(() => ({ sent: 0, arrived: false, order: "Staged for loading" }), []);
  const read02 = useCallback(() => plant02Text(live), [live]);
  const read01 = useCallback(() => plant01Text(), []);
  const readTruck = useCallback(() => truckText(live), [live]);
  const lift1H = useCallback(() => height.current, []);
  const lift2H = useCallback(() => height2.current, []);
  // The transfer's cargo: emerald, the colour of the moving order.
  const tote = useMemo(() => plastic(TINTS.emerald, 0.5, true), []);
  const height = useRef(0.06);
  const scratch = useMemo(() => [0, 0, 0], []);

  useFrame(() => {
    const { i, j, e: raw, local } = blendAt(store.g);
    const e = reducedMotion() ? (raw < 0.5 ? 0 : 1) : raw;
    const here = i === CH.decision || j === CH.decision;
    // The yard plays only as far as the loading: the shipment is held at the bay, so the truck never
    // drives across and the customer's forklift never unloads (dispatch has not been approved).
    const t = Math.min(i === CH.decision ? local : 0, BEATS.drive[0] - 0.001);
    // Arriving from Context: the truck drives in along the road to your plant. Leaving for Control: it
    // stays at the bay and fades with the yard.
    const inK = j === CH.decision && i !== CH.decision ? smootherstep(0, 1, arriveK(e, 0.05)) : here ? 1 : 0;
    const exit = i === CH.decision ? e : 0;

    liftAt(t, lift);
    unloadAt(t, lift2);
    height.current = lift.h;
    height2.current = lift2.h;
    live.sent = Math.round(transferredUnits(store.g >= CH.decision + 1 ? 1 : localIn(CH.decision, store.g)) / 80);
    if (truck.current) {
      const inX = (1 - inK) * (1 - inK) * 9;
      const fade = 1 - smoothstep(0, 0.6, exit);
      truck.current.visible = here && inK > 0.002 && fade > 0.002;
      truck.current.position.set(truckX(t) - inX, 0, ROAD_Z);
      truck.current.scale.setScalar(M * smoothstep(0, 0.25, inK) * fade);
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
    // The truck's own status, in step with the review panel on the page.
    let onDeck = 0;
    for (const v of next) if (v === 2) onDeck++;
    const loaded = onDeck === PALLETS;
    live.arrived = loaded;
    live.order = loaded ? "Held at the bay · for review" : t >= BEATS.load[0] ? `Loading · ${onDeck} of ${PALLETS} pallets` : "Staged for loading";
  });

  // Built once: a pallet moving re-renders the pallets, not the plants, their crews or the road.
  const fixed = useMemo(
    () => ({
      road: <StoryRoad />,
      plant02: (
        <Actor track={inDecision(PLANT_02_POSE)} arrive="build" leave="build">
          <Plant accent={TINTS.saffron} name="YOUR PLANT" ground={APRON_TOP / M} neutral />
          <group position={[0, 7.8, 0]}>
            <LiveTag title="Dispatch bay" read={read02} open={openPlant02} />
          </group>
        </Actor>
      ),
      plant01: (
        <Actor track={inDecision(PLANT_01_POSE)} delay={0.08} arrive="build" leave="build">
          <Plant accent={TINTS.cobalt} name="CUSTOMER A" ground={APRON_TOP / M} neutral />
          <group position={[0, 7.8, 0]}>
            <LiveTag title="Customer A" read={read01} open={openPlant01} />
          </group>
        </Actor>
      ),
      pads: <YardPads />,
      truckTag: (
        <group position={[6.2, 4.6, 0]}>
          <LiveTag title="SHP-0612" read={readTruck} open={openTruck} />
        </group>
      ),
    }),
    [read02, read01, readTruck],
  );

  return (
    <>
      {fixed.road}
      {/* The plants go up from the ground as the yard assembles, and back down as it leaves. */}
      {fixed.plant02}
      {fixed.plant01}
      <Actor track={inDecision(YARD_POSE)} delay={0.04} arrive="build" leave="build">
        {fixed.pads}
        {/* Pallets waiting in the yard */}
        {SLOT_X.map((x, n) =>
          states[n] === 0 ? (
            <group key={n} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ) : null,
        )}
        {/* The customer's bays stay empty: nothing is dispatched in this example. */}
        {DROP_X.map((x, n) =>
          states[n] === 3 ? (
            <group key={`r${n}`} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ) : null,
        )}
      </Actor>
      <group ref={truck} visible={false}>
        {fixed.truckTag}
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
        <Forklift color={TINTS.cobalt} lift={lift2H}>
          {states.some((v) => v === 4) && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>
      <group ref={fork} visible={false}>
        <Forklift color={TINTS.saffron} lift={lift1H}>
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
