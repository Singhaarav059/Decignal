"use client";

// 08 Industries: one service road past six places, one per industry (S69-02). The camera tracks
// along it. Each place's decision is page text pinned to it (IndustryCallout, the leader placed here):
// beside the card on wide screens, above the place on narrower ones.
// Neutral cool greys and whites; each industry's tone sits only on the part that matters.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CH, blendAt, industryF, localIn, smootherstep, smoothstep, store, weight } from "@/lib/story";
import { IND, IND_BESIDE_MIN, IND_N, IND_ROAD, indLayout, indPin, indX, industryTrack } from "@/lib/scene";
import { TINTS } from "../palette";
import { Factory, Warehouse } from "../buildings";
import { SemiTruck, TRUCK } from "../vehicles";
import { Person } from "../people";
import { asphalt, concrete, enamel, plastic, steel } from "../materials";
import { box, cylX, cylY, cylZ, geo, merge, rbox } from "../parts";
import { reducedMotion } from "./core";
import { mediaWidth, tallTouch } from "@/lib/device";

/* ---------------- The road: asphalt, paint and a near verge ---------------- */

const ROAD_L = IND_ROAD.x1 - IND_ROAD.x0;
const ROAD_CX = (IND_ROAD.x0 + IND_ROAD.x1) / 2;
/** The near verge, between the road and the viewer. */
const VERGE_Z0 = IND.roadZ + IND.roadW / 2;
const VERGE = { z0: VERGE_Z0, w: Math.max(0.85, IND.verge + 0.55 - VERGE_Z0) };

/** A concrete apron under each place, with a drive-in crossing to the road: part of the road, so the
 *  ground runs on unbroken while the places themselves go up and down. */
function aprons() {
  const S = IND.siteS;
  const front = IND.siteZ + 0.5 * S; // apron front edge
  const edge = IND.roadZ - IND.roadW / 2; // road's far edge
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < IND_N; k++) {
    parts.push(box(1.36 * S, 0.012, 1.0 * S, indX(k), 0.006, IND.siteZ));
    parts.push(box(0.36 * S, 0.008, edge - front + 0.02, indX(k) + 0.3 * S, 0.004, (front + edge) / 2));
  }
  return merge(parts);
}

function roadPaint() {
  const parts: THREE.BufferGeometry[] = [];
  const hw = IND.roadW / 2 - 0.06;
  for (const s of [-1, 1]) parts.push(box(ROAD_L, 0.002, 0.022, ROAD_CX, 0.0165, IND.roadZ + s * hw));
  for (let i = 0; i < Math.floor(ROAD_L / 0.62); i++) parts.push(box(0.3, 0.002, 0.02, IND_ROAD.x0 + 0.3 + i * 0.62, 0.0165, IND.roadZ));
  return merge(parts);
}

/** Draws out along the road from the first stop as the chapter arrives; fades as it leaves. */
function Road({ presence }: { presence: React.RefObject<{ len: number; alpha: number; from: number }> }) {
  const mats = useMemo(() => {
    const road = asphalt().clone();
    if (road.map) {
      road.map = road.map.clone();
      road.map.repeat.set(ROAD_L / (4 * (IND.roadW / 0.72)), 1);
      road.map.needsUpdate = true;
    }
    const paint = enamel("#FFFFFF", 0.6).clone();
    const verge = concrete("#E3E6EB").clone();
    const kerb = concrete("#CDD2D9").clone();
    for (const m of [road, paint, verge, kerb]) m.transparent = true;
    return [road, paint, verge, kerb] as const;
  }, []);
  const lines = useMemo(() => roadPaint(), []);
  const pads = useMemo(() => aprons(), []);
  useEffect(
    () => () => {
      mats[0].map?.dispose();
      mats.forEach((m) => m.dispose());
      lines.dispose();
      pads.dispose();
    },
    [mats, lines, pads],
  );
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    const p = presence.current;
    if (!g || !inner.current) return;
    g.visible = p.len > 0.002 && p.alpha > 0.005;
    // Scaled about the stop it draws out from.
    g.position.x = p.from;
    inner.current.position.x = -p.from;
    g.scale.x = Math.max(p.len, 0.001);
    for (const m of mats) {
      m.opacity = p.alpha;
      m.depthWrite = p.alpha > 0.99;
    }
  });
  const [road, paint, verge, kerb] = mats;
  return (
    <group ref={ref} visible={false}>
      <group ref={inner}>
        <mesh position={[ROAD_CX, 0.0075, IND.roadZ]} receiveShadow material={road}>
          <boxGeometry args={[ROAD_L, 0.015, IND.roadW]} />
        </mesh>
        <mesh geometry={lines} material={paint} />
        <mesh geometry={pads} material={verge} receiveShadow />
        {/* The near verge: a kerb, then a paved strip the board stands on */}
        <mesh position={[ROAD_CX, 0.009, VERGE.z0 + 0.03]} receiveShadow material={kerb}>
          <boxGeometry args={[ROAD_L, 0.018, 0.06]} />
        </mesh>
        <mesh position={[ROAD_CX, 0.003, VERGE.z0 + 0.06 + VERGE.w / 2]} receiveShadow material={verge}>
          <boxGeometry args={[ROAD_L, 0.006, VERGE.w]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------- The six places (island units, scaled by IND.siteS) ---------------- */

/** Metal products: a semi carrying three steel coils on cradles to a job worker, the driver checking
 *  the load; one coil's band in the industry's tone (the batch being reconciled). */
const COILS = [3.3, 0.6, -2.1];
function CoilTruck() {
  const coils = geo("ind-coils", () => merge(COILS.map((x) => cylZ(0.62, 1.15, x, TRUCK.deckY + 0.68, 0, 32))));
  const eyes = geo("ind-coil-eyes", () => merge(COILS.map((x) => cylZ(0.26, 1.17, x, TRUCK.deckY + 0.68, 0, 24))));
  const cradles = geo("ind-coil-cradle", () => merge(COILS.map((x) => box(1.2, 0.16, 1.0, x, TRUCK.deckY + 0.08, 0))));
  const bands = geo("ind-coil-band", () => merge(COILS.slice(0, 2).map((x) => cylZ(0.635, 0.08, x, TRUCK.deckY + 0.68, 0, 32))));
  return (
    <group position={[-0.05, 0.012, 0.02]} rotation-y={0.42} scale={0.11}>
      <SemiTruck accent="#9AA3AF" parked>
        <mesh geometry={cradles} material={enamel("#3A3E45", 0.6)} castShadow receiveShadow />
        <mesh geometry={coils} material={steel("#B9C0C9", 0.35)} castShadow receiveShadow />
        <mesh geometry={eyes} material={steel("#2A2C31", 0.6)} />
        <mesh geometry={bands} material={steel("#2A2C31", 0.6)} castShadow />
        <mesh position={[COILS[2], TRUCK.deckY + 0.68, 0]} rotation-x={Math.PI / 2} material={plastic(TINTS.cobalt, 0.45)} castShadow>
          <cylinderGeometry args={[0.64, 0.64, 0.12, 32]} />
        </mesh>
      </SemiTruck>
      <Person look="driver" pose="tablet" seed={2.2} position={[-3.6, 0, 2.3]} rotation-y={-0.4} />
    </group>
  );
}

/** Equipment service: a pump set on its skid at a customer's site, the coupling and seal housing in the
 *  industry's tone, the service technician writing up the visit. */
function PumpService() {
  const skid = geo("ind-skid", () => merge([rbox(0.66, 0.035, 0.3, 0.008, 0, 0.0375, 0), ...[-0.12, 0.12].map((z) => box(0.66, 0.02, 0.03, 0, 0.012, z))]));
  const motor = geo("ind-motor", () =>
    merge([
      cylX(0.075, 0.26, -0.13, 0.135, 0, 32),
      ...[0, 1, 2, 3, 4, 5].map((i) => box(0.24, 0.006, 0.006, -0.13, 0.135 + Math.sin((i / 6) * Math.PI * 2) * 0.078, Math.cos((i / 6) * Math.PI * 2) * 0.078)),
      box(0.18, 0.06, 0.12, -0.13, 0.085, 0),
    ]),
  );
  const pump = geo("ind-pump", () =>
    merge([
      cylZ(0.085, 0.09, 0.15, 0.135, 0, 32),
      box(0.1, 0.07, 0.1, 0.15, 0.085, 0),
      cylX(0.032, 0.34, 0.37, 0.135, 0, 20),
      cylY(0.028, 0.3, 0.15, 0.36, 0, 20),
      cylX(0.048, 0.016, 0.3, 0.135, 0, 24),
      cylY(0.044, 0.014, 0.15, 0.24, 0, 24),
    ]),
  );
  return (
    <>
      <mesh position={[0, 0.02, 0]} material={concrete("#D6DAE0")} receiveShadow castShadow>
        <boxGeometry args={[1.3, 0.016, 0.9]} />
      </mesh>
      <group position={[-0.05, 0.028, -0.06]} rotation-y={0.25}>
        <mesh geometry={skid} material={enamel("#3A3E45", 0.55)} castShadow receiveShadow />
        <mesh geometry={motor} material={enamel("#9AA3AF", 0.4)} castShadow receiveShadow />
        <mesh geometry={pump} material={steel("#B9C0C9", 0.35)} castShadow receiveShadow />
        {/* The coupling guard over the seal housing: the recommendation in the report */}
        <mesh position={[0.04, 0.135, 0]} material={plastic(TINTS.saffron, 0.45)} castShadow>
          <boxGeometry args={[0.07, 0.09, 0.1]} />
        </mesh>
      </group>
      {/* A toolbox and the technician with the service report */}
      <mesh position={[0.36, 0.06, 0.28]} rotation-y={0.3} material={enamel("#C23A2B", 0.45)} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.06]} />
      </mesh>
      <group position={[0.18, 0.028, 0.32]} rotation-y={-2.6} scale={0.1}>
        <Person look="crew" pose="tablet" seed={3.7} />
      </group>
    </>
  );
}

/** One place per industry, in INDUSTRIES order: manufacturing, distribution, logistics, services. */
const SITES: (() => React.ReactNode)[] = [
  () => (
    <group position={[0.06, 0.012, -0.02]}>
      <Factory />
    </group>
  ),
  () => (
    <group position={[-0.05, 0.012, 0]} scale={0.95}>
      <Warehouse accent={TINTS.violet} name="DISTRIBUTOR" />
    </group>
  ),
  () => <CoilTruck />,
  () => <PumpService />,
];

/* ---------------- The chapter: presence, the build in and out, and culling ---------------- */

const sphere = new THREE.Sphere();
const frustum = new THREE.Frustum();
const pv = new THREE.Matrix4();

/* The callout's leader: from the callout's edge to the pin on the place in front. Wide screens run it
   from the right edge, level with the chip; narrower ones drop it from the foot, straight down where it
   can (the callout stands above the place). Drawn while the camera holds at a place; gone while it
   travels to the next. The callout's box is read on entry and then every half second (its slot only
   moves with the card). */
const lead = { stage: null as HTMLElement | null, box: null as HTMLElement | null, rect: null as DOMRect | null, read: 0, last: "" };
const pin = new THREE.Vector3();
function placeLeader(camera: THREE.Camera, size: { width: number; height: number }, w: number, track: number) {
  if (!lead.stage?.isConnected) {
    lead.stage = document.querySelector<HTMLElement>(".ind-callout-stage");
    lead.box = lead.stage?.querySelector<HTMLElement>(".ind-callout") ?? null;
    lead.rect = null;
  }
  const { stage, box } = lead;
  if (!stage || !box) return;
  const now = performance.now();
  if (!lead.rect || now - lead.read > 500) {
    lead.rect = box.getBoundingClientRect();
    lead.read = now;
  }
  const r = lead.rect;
  const k = Math.round(industryF(localIn(CH.industries, store.g)));
  pin.set(...indPin(k)).project(camera);
  const px = ((pin.x + 1) / 2) * size.width;
  const py = ((1 - pin.y) / 2) * size.height;
  // A tall tablet frames the place above the callout (Scene setStage): the leader leaves its top edge.
  const above = tallTouch(size.width, size.height);
  const beside = !above && !indLayout.under && mediaWidth(size.width) >= IND_BESIDE_MIN;
  const ax = beside ? r.right : Math.min(Math.max(px, r.left + 28), r.right - 28);
  const ay = beside ? r.top + 30 : above ? r.top : r.bottom;
  const dx = px - ax;
  const dy = py - ay;
  // At a place (its pin clear of the callout), and only as the chapter is fully in.
  const at = 1 - smoothstep(0.04, 0.2, Math.abs(track - Math.round(track)));
  const o = r.width > 0 && (beside ? dx : above ? -dy : dy) > 28 ? at * smoothstep(0.85, 1, w) : 0;
  const v = `${px.toFixed(1)}|${py.toFixed(1)}|${o.toFixed(3)}|${ax}|${ay}`;
  if (v === lead.last) return;
  lead.last = v;
  stage.style.setProperty("--pin-x", `${px.toFixed(1)}px`);
  stage.style.setProperty("--pin-y", `${py.toFixed(1)}px`);
  stage.style.setProperty("--lead-x", `${ax.toFixed(1)}px`);
  stage.style.setProperty("--lead-y", `${ay.toFixed(1)}px`);
  // It stops short of the pin's white ring.
  stage.style.setProperty("--lead-l", `${Math.max(0, Math.hypot(dx, dy) - 9).toFixed(1)}px`);
  stage.style.setProperty("--lead-a", `${Math.atan2(dy, dx).toFixed(4)}rad`);
  stage.style.setProperty("--lead-o", o.toFixed(3));
}

/** How much of place k stands while the camera is at `track` along the road: the place you are at
 *  stands; as the camera leaves, it goes back down and the next one comes up, both well inside the
 *  move, so the frame is never empty and only one place holds the screen. */
const standing = (track: number, k: number) => 1 - smootherstep(0.3, 0.85, Math.abs(track - k));

export function IndustriesRoad() {
  const presence = useRef({ len: 0, alpha: 0, from: 0 });
  const sites = useRef<(THREE.Group | null)[]>([]);
  const size = useThree((state) => state.size);
  useFrame(({ camera }) => {
    const { i, j, e } = blendAt(store.g);
    const still = reducedMotion();
    const w = weight(CH.industries, store.g);
    const p = presence.current;
    // The road: draws out from the first stop as Scale hands over, fades once the camera has
    // pulled back for the ending.
    p.from = j === CH.industries && i !== j ? indX(0) : indX(IND_N - 1);
    p.len = i === CH.industries ? 1 : j === CH.industries ? (still ? (e < 0.5 ? 0 : 1) : smootherstep(0.2, 0.75, e)) : 0;
    p.alpha = i === CH.industries && j === CH.final ? 1 - (still ? (e < 0.5 ? 0 : 1) : smoothstep(0.45, 0.9, e)) : 1;
    // The places go up out of the ground with the chapter and back down as it leaves.
    const b = still ? (w > 0.5 ? 1 : 0) : smootherstep(0.35, 0.95, w);
    const track = industryTrack(localIn(CH.industries, store.g));
    camera.updateMatrixWorld();
    if (w > 0.01) placeLeader(camera, size, w, track);
    frustum.setFromProjectionMatrix(pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    sites.current.forEach((g, k) => {
      if (!g) return;
      const h = b * (still ? (Math.abs(track - k) < 0.5 ? 1 : 0) : standing(track, k));
      // Down, or out of frame (with room for its shadow), a place is not drawn at all: draw calls stay flat.
      sphere.center.set(indX(k), 0.9, IND.siteZ);
      sphere.radius = 3.8;
      g.visible = h > 0.002 && frustum.intersectsSphere(sphere);
      g.scale.set(IND.siteS, IND.siteS * Math.max(h, 0.001), IND.siteS);
    });
  });
  return (
    <group>
      <Road presence={presence} />
      {SITES.map((Site, k) => (
        <group
          key={k}
          ref={(g) => {
            sites.current[k] = g;
          }}
          position={[indX(k), 0, IND.siteZ]}
          visible={false}
        >
          <Site />
        </group>
      ))}
    </group>
  );
}
