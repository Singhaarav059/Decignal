"use client";

// 05 Decision: the supplier's site and your warehouse, the forklift loading the 60 contactors the
// supplier can send on Friday and the truck bringing them across (lib/example STORY).
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState } from "react";
import { BEATS, CH, activePin, blendAt, localIn, smootherstep, smoothstep, store, weight } from "@/lib/story";
import { M, PLANT_01, PLANT_02, ROAD_LENGTH, ROAD_Z, transferredUnits, truckX, type Pose } from "@/lib/scene";
import { STORY } from "@/lib/example";
import { TINTS } from "../palette";
import { Plant } from "../buildings";
import { Forklift, SemiTruck, TRUCK } from "../vehicles";
import { LoadedPallet } from "../parts";
import { DROP_X, PALLETS, SLOT_X, STAGE_Z, DECK_Z, liftAt, palletStates, unloadAt, type Lift } from "../transfer-motion";
import { asphalt, enamel, plastic } from "../materials";
import { useDisposeOnUnmount } from "../kit";
import { APRON_TOP, YardPads, roadLines } from "./yard";
import { ScreenTag } from "../ScreenTag";
import { Actor, arriveK, reducedMotion, type Track } from "./core";

/* ------------------------------------------------------------------ */
/* 05 Decision: a forklift loads the 60, the truck brings them across */
/* ------------------------------------------------------------------ */

const inDecision = (p: Pose): Track => (c) => (c === CH.decision ? p : null);

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
/** The yard's own beat when the timeline names no pin: the supplier's site while loading, the truck
 *  on the road, then your warehouse. Between chapters nothing is pinned. */
function yardPin() {
  const { i, local, e } = blendAt(store.g);
  if (i !== CH.decision || e > 0.4) return null;
  return local < BEATS.drive[0] ? "plant02" : local < BEATS.drive[1] - 0.05 ? "truck" : "plant01";
}
/** The one label open in this chapter is handed along the action (lib/story pinAt, else yardPin). */
const pinned = (id: string) => () => (activePin() ?? yardPin()) === id;
const PLANT_02_POSE: Pose = { p: PLANT_02, s: M };
const PLANT_01_POSE: Pose = { p: PLANT_01, s: M };
const YARD_POSE: Pose = { p: [0, 0, 0] };

/** The yard's words as they change frame by frame: the contactors loaded, the truck's status, the warehouse's Friday. */
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

const [FIRST_ORDER] = STORY.orders;
const plant02Text = (l: Live) => [`${l.sent} of ${STORY.first.qty} loaded · ${STORY.rest.qty} on ${STORY.rest.day}`, TINTS.saffron] as const;
const plant01Text = (l: Live) =>
  l.arrived
    ? ([`${STORY.first.qty} received · ${FIRST_ORDER.id} covered`, TINTS.emerald] as const)
    : ([`${STORY.first.qty} due ${STORY.first.day} · ${FIRST_ORDER.id} needs ${FIRST_ORDER.qty}`, TINTS.cobalt] as const);
const truckText = (l: Live) => [l.order, TINTS.emerald] as const;
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
  // Contactors on their way (counted exactly as the page's figure counts them), the truck's status and
  // the warehouse's receipt: read by the tags (LiveTag), never re-rendering the yard.
  const live = useMemo<Live>(() => ({ sent: 0, arrived: false, order: "Confirmed · loading next" }), []);
  const read02 = useCallback(() => plant02Text(live), [live]);
  const read01 = useCallback(() => plant01Text(live), [live]);
  const readTruck = useCallback(() => truckText(live), [live]);
  const lift1H = useCallback(() => height.current, []);
  const lift2H = useCallback(() => height2.current, []);
  // The delivery's cargo: emerald, the colour of the confirmed follow-up.
  const tote = useMemo(() => plastic(TINTS.emerald, 0.5, true), []);
  const height = useRef(0.06);
  const scratch = useMemo(() => [0, 0, 0], []);

  useFrame(() => {
    const { i, j, e: raw, local } = blendAt(store.g);
    const e = reducedMotion() ? (raw < 0.5 ? 0 : 1) : raw;
    const here = i === CH.decision || j === CH.decision;
    const t = i === CH.decision ? local : 0;
    // Arriving from Context: the truck drives in along the road to the supplier's site. Leaving for Control:
    // it drives on along the road and out of frame, never off the end of it.
    const inK = j === CH.decision && i !== CH.decision ? smootherstep(0, 1, arriveK(e, 0.05)) : here ? 1 : 0;
    const exit = i === CH.decision ? e : 0;

    liftAt(t, lift);
    unloadAt(t, lift2);
    height.current = lift.h;
    height2.current = lift2.h;
    live.sent = Math.round(transferredUnits(store.g >= CH.decision + 1 ? 1 : localIn(CH.decision, store.g)));
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
      // The warehouse's forklift waits in its yard from the start and leaves with the yard.
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
    live.arrived = done;
    // The truck's own status, in step with the follow-up panel on the page.
    let onDeck = 0;
    for (const v of next) if (v === 2) onDeck++;
    const status = done
      ? `Received · ${STORY.first.qty} of ${STORY.qty}`
      : atPlant
        ? `Unloading · ${PALLETS - onDeck} of ${PALLETS} pallets`
        : t >= BEATS.drive[0]
        ? `In transit · due ${STORY.first.day}`
        : t >= BEATS.load[0]
          ? `Loading · ${onDeck} of ${PALLETS} pallets`
          : "Confirmed · loading next";
    live.order = status;
  });

  // Built once: a pallet moving re-renders the pallets, not the plants, their crews or the road.
  const fixed = useMemo(
    () => ({
      road: <StoryRoad />,
      plant02: (
        <Actor track={inDecision(PLANT_02_POSE)} arrive="build" leave="build">
          <Plant accent={TINTS.saffron} name={STORY.supplier.toUpperCase()} ground={APRON_TOP / M} neutral />
          <group position={[0, 7.8, 0]}>
            <LiveTag title={STORY.supplier} read={read02} open={openPlant02} />
          </group>
        </Actor>
      ),
      plant01: (
        <Actor track={inDecision(PLANT_01_POSE)} delay={0.08} arrive="build" leave="build">
          <Plant accent={TINTS.cobalt} name="YOUR WAREHOUSE" ground={APRON_TOP / M} neutral />
          <group position={[0, 7.8, 0]}>
            <LiveTag title="Your warehouse" read={read01} open={openPlant01} />
          </group>
        </Actor>
      ),
      pads: <YardPads />,
      truckTag: (
        <group position={[6.2, 4.6, 0]}>
          <LiveTag title={`${STORY.po} · line ${STORY.poLine}`} read={readTruck} open={openTruck} />
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
        {/* Pallets received in the warehouse's bays */}
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
