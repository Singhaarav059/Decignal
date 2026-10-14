"use client";

// 08 Industries: one service road past six places, one per industry (S69-02). The camera tracks
// along it. On wide screens each place's decision is page text pinned to it (IndustryCallout, the
// leader placed here); on narrower ones the decision board (actors/cards) stands on the near verge.
// Neutral cool greys and whites; each industry's tone sits only on the part that matters.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CH, blendAt, industryF, localIn, smootherstep, smoothstep, store, weight } from "@/lib/story";
import { IND, IND_CALLOUT_MIN, IND_ROAD, indPin, indX, industryTrack } from "@/lib/scene";
import { TINTS } from "../palette";
import { Factory, ServerRacks, Storefront } from "../buildings";
import { SemiTruck, TRUCK } from "../vehicles";
import { Substation } from "../substation";
import { Person } from "../people";
import { aluminium, asphalt, cladding, concrete, enamel, plastic, rubber, steel } from "../materials";
import { box, cylY, geo, merge, rbox } from "../parts";
import { reducedMotion } from "./core";

/* ---------------- The road: asphalt, paint and a verge the board stands on ---------------- */

const ROAD_L = IND_ROAD.x1 - IND_ROAD.x0;
const ROAD_CX = (IND_ROAD.x0 + IND_ROAD.x1) / 2;
/** The near verge reaches past the board's feet: it stands on it, nearer the viewer than the road. */
const VERGE_Z0 = IND.roadZ + IND.roadW / 2;
const VERGE = { z0: VERGE_Z0, w: Math.max(0.85, IND.board[1] + 0.55 - VERGE_Z0) };

/** A concrete apron under each place, with a drive-in crossing to the road: part of the road, so the
 *  ground runs on unbroken while the places themselves go up and down. */
function aprons() {
  const S = IND.siteS;
  const front = IND.siteZ + 0.5 * S; // apron front edge
  const edge = IND.roadZ - IND.roadW / 2; // road's far edge
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
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

/** Automotive: a semi with three wire-harness crates strapped on the trailer, the driver checking them. */
const HARNESS = [3.3, 0.6, -2.1];
function HarnessTruck() {
  const crate = geo("ind-harness", () => merge(HARNESS.map((x) => rbox(1.5, 1.05, 2.0, 0.06, x, TRUCK.deckY + 0.525, 0))));
  const lids = geo("ind-harness-lid", () => merge(HARNESS.map((x) => rbox(1.56, 0.08, 2.06, 0.03, x, TRUCK.deckY + 1.07, 0))));
  const straps = geo("ind-harness-strap", () => merge(HARNESS.map((x) => box(0.08, 1.2, 2.1, x, TRUCK.deckY + 0.58, 0))));
  return (
    <group position={[-0.05, 0.012, 0.02]} rotation-y={0.42} scale={0.11}>
      <SemiTruck accent="#9AA3AF" parked>
        <mesh geometry={crate} material={plastic(TINTS.cobalt, 0.45, true)} castShadow receiveShadow />
        <mesh geometry={lids} material={plastic("#E9ECF0", 0.5)} castShadow />
        <mesh geometry={straps} material={steel("#2A2C31", 0.6)} />
      </SemiTruck>
      <Person look="driver" pose="tablet" seed={2.2} position={[-3.6, 0, 2.3]} rotation-y={-0.4} />
    </group>
  );
}

/** Logistics: a quay edge with bollards and fenders, containers stacked three rows deep and two high. */
const ROWS = [-0.3, 0, 0.3];
function Quay() {
  const quay = geo("ind-quay-trim", () =>
    merge([
      ...[-0.5, -0.17, 0.17, 0.5].map((x) => cylY(0.024, 0.05, x, 0.055, -0.43, 16)),
      ...[-0.5, -0.17, 0.17, 0.5].map((x) => cylY(0.032, 0.012, x, 0.084, -0.43, 16)),
    ]),
  );
  const fenders = geo("ind-quay-fend", () => merge([-0.34, 0, 0.34].map((x) => rbox(0.12, 0.024, 0.016, 0.006, x, 0.016, -0.505))));
  return (
    <>
      {/* Quay deck and its white cope line along the water side */}
      <mesh position={[0, 0.021, -0.02]} material={concrete("#DADEE4")} receiveShadow castShadow>
        <boxGeometry args={[1.36, 0.018, 0.96]} />
      </mesh>
      <mesh position={[0, 0.031, -0.47]} material={enamel("#F4F6F8", 0.5)}>
        <boxGeometry args={[1.36, 0.003, 0.02]} />
      </mesh>
      <mesh geometry={quay} material={steel("#2C2F35", 0.5)} castShadow />
      <mesh geometry={fenders} material={rubber()} castShadow />
      {/* The dock basin behind the quay: still water inside a concrete edge */}
      <mesh position={[0, 0.004, -0.74]} material={enamel("#71859A", 0.12)} receiveShadow>
        <boxGeometry args={[1.3, 0.008, 0.5]} />
      </mesh>
      <mesh geometry={geo("ind-basin", () => merge([box(1.36, 0.03, 0.03, 0, 0.015, -1.0), box(0.03, 0.03, 0.5, -0.665, 0.015, -0.75), box(0.03, 0.03, 0.5, 0.665, 0.015, -0.75)]))} material={concrete("#DADEE4")} castShadow receiveShadow />
      {/* The stack: the tangerine box on top of the front row is the one being rerouted */}
      <group position={[-0.08, 0.03, -0.04]}>
        {ROWS.flatMap((z, r) =>
          [0, 1].map((t) => (
            <Container key={`${r}-${t}`} at={[0, t * (CONT.h + 0.004), z]} color={t === 1 && r === 2 ? TINTS.tangerine : ["#C9CED6", "#B4BBC6", "#D8DCE2"][(r + t) % 3]} />
          )),
        )}
      </group>
      <group position={[0.48, 0.03, 0.36]} rotation-y={-2.2} scale={0.1}>
        <Person look="crew" pose="tablet" seed={3.7} />
      </group>
    </>
  );
}

/** A 20 ft box, long side to the road (6.1 x 2.6 x 2.4 m at the crew's scale, 1 unit = 10 m): ribbed
 *  walls, corner posts and rails, and the door end's locking bars. */
const CONT = { l: 0.606, h: 0.259, w: 0.244 };
function Container({ at, color }: { at: [number, number, number]; color: string }) {
  const trim = geo("ind-cont-trim", () => {
    const { l, h, w } = CONT;
    const parts: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(0.012, h, 0.012, (sx * (l - 0.012)) / 2, h / 2, (sz * (w - 0.012)) / 2));
    for (const y of [0.005, h - 0.005]) for (const sz of [-1, 1]) parts.push(box(l, 0.01, 0.008, 0, y, (sz * (w - 0.006)) / 2));
    for (const z of [-0.075, -0.03, 0.03, 0.075]) parts.push(box(0.004, h - 0.02, 0.005, l / 2 + 0.002, h / 2, z));
    return merge(parts);
  });
  return (
    <group position={at}>
      <mesh position-y={CONT.h / 2} material={cladding(color, 40, 0.5)} castShadow receiveShadow>
        <boxGeometry args={[CONT.l - 0.004, CONT.h - 0.004, CONT.w - 0.004]} />
      </mesh>
      <mesh geometry={trim} material={steel("#454A52", 0.5)} castShadow />
    </group>
  );
}

/** Financial services: the racks behind glass and a small operations desk, one violet status lamp. */
function OpsRoom() {
  const desk = geo("ind-desk", () =>
    merge([
      rbox(0.5, 0.018, 0.22, 0.006, 0, 0.18, 0),
      ...[-1, 1].map((s) => box(0.016, 0.17, 0.2, s * 0.23, 0.085, 0)),
    ]),
  );
  const screens = geo("ind-screens", () => merge([-0.12, 0.12].map((x) => rbox(0.2, 0.12, 0.012, 0.004, x, 0.29, -0.06)).concat([box(0.02, 0.08, 0.02, -0.12, 0.22, -0.07), box(0.02, 0.08, 0.02, 0.12, 0.22, -0.07)])));
  return (
    <>
      <group position={[-0.3, 0.012, -0.14]} scale={0.62}>
        <ServerRacks />
      </group>
      <group position={[0.38, 0.012, 0.18]} rotation-y={-0.35}>
        <mesh geometry={desk} material={enamel("#F1F3F6", 0.5)} castShadow receiveShadow />
        <mesh geometry={screens} material={enamel("#2A2D33", 0.5)} castShadow />
        {/* Screens showing the review queue: light, flat, a violet header on the one being worked */}
        {[-0.12, 0.12].map((x, i) => (
          <group key={x}>
            <mesh position={[x, 0.29, -0.0535]} material={enamel("#E4E8EE", 0.6)}>
              <planeGeometry args={[0.185, 0.105]} />
            </mesh>
            <mesh position={[x, 0.33, -0.053]} material={enamel(i ? "#AEB6C2" : TINTS.violet, 0.5)}>
              <planeGeometry args={[0.185, 0.016]} />
            </mesh>
            {[0, 1, 2].map((r) => (
              <mesh key={r} position={[x - 0.02, 0.305 - r * 0.022, -0.053]} material={enamel("#BCC3CD", 0.6)}>
                <planeGeometry args={[0.13, 0.008]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* The status lamp: violet enamel, not lit */}
        <mesh position={[0.2, 0.2, 0.05]} material={enamel(TINTS.violet, 0.35)} castShadow>
          <cylinderGeometry args={[0.014, 0.016, 0.03, 20]} />
        </mesh>
        {/* The operator faces the screens, at the same scale as the engineer at the racks (0.34 x 0.62) */}
        <group position={[0, 0.106, 0.165]} rotation-y={Math.PI / 2} scale={0.21}>
          <Person look="planner" pose="sit" seed={5.1} />
        </group>
        <mesh position={[0, 0.1, 0.17]} material={steel("#30343B", 0.5)} castShadow>
          <boxGeometry args={[0.12, 0.012, 0.12]} />
        </mesh>
        <mesh position={[0, 0.05, 0.17]} material={aluminium(0.35)}>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
        </mesh>
      </group>
    </>
  );
}

const SITES: (() => React.ReactNode)[] = [
  () => (
    <group position={[0.06, 0.012, -0.02]}>
      <Factory />
    </group>
  ),
  () => <HarnessTruck />,
  () => (
    <group position={[0, 0.012, -0.08]} scale={1.1}>
      <Storefront accent={TINTS.pink} />
    </group>
  ),
  () => <Quay />,
  () => <OpsRoom />,
  () => <Substation />,
];

/* ---------------- The chapter: presence, the build in and out, and culling ---------------- */

const sphere = new THREE.Sphere();
const frustum = new THREE.Frustum();
const pv = new THREE.Matrix4();

/* The callout's leader (wide screens): from the callout's edge, level with its chip, to the pin on
   the place in front. Drawn while the camera holds at a place; gone while it travels to the next. The
   callout's box is read on entry and then every half second (its slot only moves with the card). */
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
  const ax = r.right;
  const ay = r.top + 30;
  const dx = px - ax;
  const dy = py - ay;
  // At a place (its pin clear of the callout), and only as the chapter is fully in.
  const at = 1 - smoothstep(0.04, 0.2, Math.abs(track - Math.round(track)));
  const o = r.width > 0 && dx > 28 ? at * smoothstep(0.85, 1, w) : 0;
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
    p.from = j === CH.industries && i !== j ? indX(0) : indX(5);
    p.len = i === CH.industries ? 1 : j === CH.industries ? (still ? (e < 0.5 ? 0 : 1) : smootherstep(0.2, 0.75, e)) : 0;
    p.alpha = i === CH.industries && j === CH.final ? 1 - (still ? (e < 0.5 ? 0 : 1) : smoothstep(0.45, 0.9, e)) : 1;
    // The places go up out of the ground with the chapter and back down as it leaves.
    const b = still ? (w > 0.5 ? 1 : 0) : smootherstep(0.35, 0.95, w);
    const track = industryTrack(localIn(CH.industries, store.g));
    camera.updateMatrixWorld();
    if (w > 0.01 && size.width >= IND_CALLOUT_MIN) placeLeader(camera, size, w, track);
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
