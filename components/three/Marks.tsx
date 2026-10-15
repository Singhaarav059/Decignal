"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { CH, clamp01, smoothstep, store, weight } from "@/lib/story";
import { signalCratePose, ARRIVED, CONTEXT_CRATE_S, CRATE, CRATE_UNITS, DAYS, DAY_NAMES, DAY_X, GAP_DAY, ISLAND_TOP, ISO, NEED, PROMISED_UNITS, PROMISED_Y, RING, STEP_Y, dayUnits, unitsY } from "@/lib/scene";
import { STORY } from "@/lib/example";
import { COLORS, FONTS, TINTS } from "./palette";
import { SYSTEMS } from "@/components/ui/systems";
import { concrete } from "./materials";
import { padGeometry, useDisposeOnUnmount } from "./kit";
import { islandAccent } from "./actors/islands";
import { mediaWidth, phoneWide, portraitWide, tallTouch } from "@/lib/device";

type TroikaText = THREE.Mesh & { fillOpacity: number };

/** Height of the revised delivery's line over day d: 60 from Friday, 100 from Wednesday. */
const arrivedY = (d: number) => unitsY(ARRIVED[d]);
/** The day the rest arrives (where the line steps up). */
const REST_DAY = ARRIVED.findIndex((u) => u >= PROMISED_UNITS);
/** A column's figure sits on its top, or just over the delivery line where the line, drawn in front of
 *  the columns (so it reads about Z/2 lower), would cross the figure. */
const figureY = (d: number, n: number) => {
  const top = Math.min(n, NEED[d] / CRATE_UNITS) * STEP_Y + 0.08;
  const line = arrivedY(d) - Z * 0.5;
  return line > top - 0.05 && line < top + 0.3 ? line + 0.1 : top;
};

/** Labels stand square to the story's one camera azimuth. */
const FACE_CAMERA: [number, number, number] = [0, ISO.az, 0];

const Z = CRATE.d / 2 + 0.16;
/** The revised delivery came in the supplier's email (Business communications), so its line is in that pink. */
const SUPPLY = TINTS.pink;
const short = (d: number) => NEED[d] > ARRIVED[d];
const DAY3 = DAY_NAMES.map((n) => n.slice(0, 3).toUpperCase());

/** Top of the narrow-screen legend under the axis: on phones the day names stand taller, so it sits lower. */
const LEGEND_Y = (k: number, phone: boolean) => (phone ? -0.66 : -0.3) * k;

/** The original promise, the revised delivery as a stepped line, and the day scale for the problem chapter. */
export function ChartMarks() {
  // Phones fit seven columns into 390px, so labels grow and shorten to stay readable.
  const phone = useThree((st) => phoneWide(st.size.width));
  const narrow = useThree((st) => mediaWidth(st.size.width) < 1024 || tallTouch(st.size.width, st.size.height));
  // The chart's labels scale with it; on short screens the chart is framed smaller, so they grow back.
  const short_ = useThree((st) => THREE.MathUtils.clamp(900 / st.size.height, 1, 1.35));
  const k = phone ? 1.9 : short_;
  const group = useRef<THREE.Group>(null);
  const tubeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SUPPLY, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const tube = useMemo(() => {
    // Square steps: flat across each day, rising between Tuesday and Wednesday.
    const x0 = DAY_X(0) - 0.5;
    const x1 = DAY_X(DAYS.length - 1) + 0.5;
    const xr = DAY_X(REST_DAY) - 0.5;
    const pts = [
      new THREE.Vector3(x0, arrivedY(0), Z),
      new THREE.Vector3(xr, arrivedY(0), Z),
      new THREE.Vector3(xr, arrivedY(REST_DAY), Z),
      new THREE.Vector3(x1, arrivedY(REST_DAY), Z),
    ];
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    return { geo: new THREE.TubeGeometry(path, 160, 0.016, 10), start: pts[0], riser: pts[2], end: pts[3] };
  }, []);
  useDisposeOnUnmount(tube, (t) => t.geo.dispose());
  useDisposeOnUnmount(tubeMat, (m) => m.dispose());
  const lineRef = useRef<{ material: THREE.Material & { opacity: number } }>(null);
  const head = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const w = smoothstep(0.55, 0.98, weight(CH.problem, store.g));
    if (!group.current) return;
    // Out of its chapter: hidden, and nothing to update.
    if (w <= 0.01) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;
    // The delivery line draws itself left to right: the week passing.
    const draw = clamp01((w - 0.2) / 0.8);
    tube.geo.setDrawRange(0, Math.floor((tube.geo.index?.count ?? 0) * draw));
    tubeMat.opacity = w;
    // The end point lands only once the line has reached it.
    if (head.current) head.current.scale.setScalar(smoothstep(0.92, 1, draw));
    if (lineRef.current) lineRef.current.material.opacity = w * 0.9;
    group.current.traverse((o) => {
      const t = o as TroikaText;
      if ("fillOpacity" in t) t.fillOpacity = w * ((t.userData.alpha as number) ?? 1);
    });
  });

  // Sized so the smallest label is at least 11 CSS px where the chapter frames the chart. Each label
  // turns to the camera's azimuth, so it reads square on instead of skewed along the chart's plane.
  const text = { font: FONTS.mono, fontSize: 0.12 * k, letterSpacing: phone ? 0.02 : 0.06 };
  const gap = NEED[GAP_DAY] - ARRIVED[GAP_DAY];

  return (
    <group ref={group} visible={false}>
      <mesh geometry={tube.geo} material={tubeMat} />
      <mesh ref={head} position={tube.end} material={tubeMat} scale={0}>
        <sphereGeometry args={[0.05, 24, 24]} />
      </mesh>
      {/* The original promise: all 100 on Friday, dashed across the week */}
      <Line
        ref={lineRef as never}
        points={[
          [-3.7, PROMISED_Y, Z],
          [3.7, PROMISED_Y, Z],
        ]}
        color={COLORS.inkSoft}
        lineWidth={1.6}
        dashed
        dashSize={0.09}
        gapSize={0.06}
        transparent
      />
      {/* Narrow screens have no margin left of the chart, so the two labels join a legend under the axis. */}
      <Text {...text} rotation={FACE_CAMERA} color={COLORS.inkSoft} anchorX={narrow ? "left" : "right"} anchorY={narrow ? "top" : "middle"} material-depthTest={false} renderOrder={5} position={narrow ? [DAY_X(0) - 0.3, LEGEND_Y(k, phone), Z + 0.15] : [-3.8, PROMISED_Y, Z]}>
        {narrow ? `- - PROMISED ${PROMISED_UNITS}` : `PROMISED ${PROMISED_UNITS} ${DAY3[0]}`}
      </Text>
      <Text {...text} rotation={FACE_CAMERA} color={SUPPLY} anchorX={narrow ? "left" : "right"} anchorY={narrow ? "top" : "middle"} material-depthTest={false} renderOrder={5} position={narrow ? [DAY_X(0) - 0.3, LEGEND_Y(k, phone) - 0.2 * k, Z + 0.15] : [tube.start.x - 0.12, tube.start.y, Z]}>
        {narrow ? `— NOW ${ARRIVED[0]} ${DAY3[0]}` : `NOW ${ARRIVED[0]} ${DAY3[0]}`}
      </Text>
      {/* Where the rest lands: beside the step, inside the chart. Phones have no room beside Tuesday's
          figure, so the step line and the legend carry it there. */}
      {!phone && <Text {...text} rotation={FACE_CAMERA} color={SUPPLY} anchorX="right" anchorY="bottom" position={[tube.riser.x - 0.08, tube.riser.y + 0.06, Z]}>
        {`+${PROMISED_UNITS - ARRIVED[0]} ${DAY3[REST_DAY]}`}
      </Text>}
      {/* What the orders need by each day, read off the top of every column */}
      {DAYS.map((n, d) => (
        <Text
          key={`u${d}`}
          {...text}
          rotation={FACE_CAMERA}
          fontSize={0.13 * k}
          color={short(d) ? COLORS.signal : COLORS.ink}
          userData={{ alpha: short(d) ? 1 : 0.75 }}
          anchorX="center"
          anchorY="bottom"
          position={[DAY_X(d), figureY(d, n), 0]}
        >
          {d === 0 && !phone ? `${dayUnits(d)} NEEDED` : String(dayUnits(d))}
        </Text>
      ))}
      {/* The day scale, painted on the floor in front of the columns */}
      {DAYS.map((_, d) => (
        <Text
          key={d}
          {...text}
          rotation={FACE_CAMERA}
          fontSize={0.12 * k}
          color={short(d) ? COLORS.signal : COLORS.inkSoft}
          anchorX="center"
          anchorY="top"
          // Stands just in front of the floor line; drawn over the ground so it never clips.
          material-depthTest={false}
          renderOrder={5}
          position={[DAY_X(d), -0.04, Z + 0.15]}
        >
          {DAY3[d]}
        </Text>
      ))}
      {/* The gap the changed promise opens: the order it leaves short, under its days */}
      <Text {...text} rotation={FACE_CAMERA} fontSize={0.12 * k} color={COLORS.signal} anchorX="left" anchorY="top" material-depthTest={false} renderOrder={5} position={[DAY_X(GAP_DAY) - 0.4, -0.3 * k, Z + 0.15]}>
        {phone ? `${STORY.short.order} −${gap}` : `${STORY.short.order} SHORT ${gap}`}
      </Text>
    </group>
  );
}

/** Where the Context threads meet the tote turning at the ring's centre: just clear of its corners. */
const TOTE_R = (Math.hypot(CRATE.w, CRATE.d) * CONTEXT_CRATE_S) / 2 + 0.08;

/** Context threads: each system's part flows into the signal. A thread is ink until its system is
 *  the evidence in focus, then it takes that system's colour with its island. */
export function Threads() {
  const items = useMemo(
    () =>
      Array.from({ length: 6 }, (_, s) => {
        const [x, z] = RING(s);
        // A path on the ground, as the hero's network is drawn: from the edge of the system's pad
        // nearest the signal to the foot of the tote, each bending the same way round the ring.
        const r = Math.hypot(x, z);
        const a = new THREE.Vector3(x * (1 - 0.8 / r), 0.025, z * (1 - 0.8 / r));
        const b = new THREE.Vector3(x * (TOTE_R / r), 0.025, z * (TOTE_R / r));
        const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(-z / r, 0, x / r).multiplyScalar(0.3));
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const tone = new THREE.Color(TINTS[SYSTEMS[s].tone as keyof typeof TINTS]);
        const mat = new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0, depthWrite: false });
        return { curve, geo: new THREE.TubeGeometry(curve, 64, 0.008, 6), phase: s / 6, tone, mat };
      }),
    [],
  );
  useDisposeOnUnmount(items, (list) =>
    list.forEach((it) => {
      it.geo.dispose();
      it.mat.dispose();
    }),
  );
  const ink = useMemo(() => new THREE.Color(COLORS.ink), []);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const w = weight(CH.context, store.g);
    if (!group.current) return;
    if (w <= 0.01) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;
    const draw = smoothstep(0.35, 0.95, w);
    const pulse = smoothstep(0.9, 1, w);
    items.forEach((it, i) => {
      it.geo.setDrawRange(0, Math.floor((it.geo.index?.count ?? 0) * draw));
      const focus = islandAccent[i];
      it.mat.color.lerpColors(ink, it.tone, focus);
      it.mat.opacity = (0.32 + 0.48 * focus) * w;
      // Information travelling toward the signal: only along the thread in focus.
      const p = pulses.current[i];
      if (!p) return;
      p.visible = focus > 0.05 && pulse > 0;
      if (!p.visible) return;
      p.scale.setScalar(focus * pulse);
      it.curve.getPoint((clock.elapsedTime * 0.3 + it.phase) % 1, p.position);
    });
  });

  return (
    <group ref={group} visible={false}>
      {items.map((it, i) => (
        <group key={i}>
          <mesh geometry={it.geo} material={it.mat} />
          <mesh
            ref={(el) => {
              pulses.current[i] = el;
            }}
            material={it.mat}
            visible={false}
          >
            <sphereGeometry args={[0.04, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The working days from the supplier's message to the gap, drawn around the signal as it is found:
 * Tuesday to Friday quiet, then Monday, when SO-3318 falls short. It draws in with the chapter instead
 * of pulsing.
 */
export function SignalPing() {
  // Sits on the ground under the crate's Signal pose, sized to the crate, on any screen shape.
  const portrait = useThree((st) => portraitWide(st.size.width, st.size.height));
  const pose = signalCratePose(CH.signal, 0, portrait)!;
  const k = (pose.s ?? 1) / 1.2;
  const at: [number, number, number] = [pose.p[0], Math.max(0.004, pose.p[1] - 0.416 * k), pose.p[2]];
  const N = 5;
  const SEG = 24;
  const geos = useMemo(
    () =>
      Array.from({ length: N }, (_, k) => {
        const gap = 0.05;
        const len = (Math.PI * 2) / N - gap;
        // Clockwise from twelve o'clock, as a countdown reads.
        return new THREE.RingGeometry(1.0, 1.035, SEG, 1, Math.PI / 2 - k * (len + gap) - len, len);
      }),
    [],
  );
  const mats = useMemo(
    () =>
      Array.from(
        { length: N },
        (_, k) =>
          new THREE.MeshBasicMaterial({
            color: k === N - 1 ? COLORS.signal : COLORS.ink,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
      ),
    [],
  );
  const group = useRef<THREE.Group>(null);
  const pad = useRef<THREE.Mesh>(null);
  const still = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useFrame(() => {
    const w = weight(CH.signal, store.g);
    if (!group.current) return;
    if (w <= 0.01) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;
    // The tote's pad spreads out under it as the chapter arrives, flat on the ground.
    const sp = still ? 1 : smoothstep(0.2, 0.9, w);
    pad.current?.scale.set(0.62 * k * sp, 1, 0.62 * k * sp);
    // The ring draws in day by day as the chapter arrives (all at once with reduced motion).
    const p = still ? (w > 0.5 ? 1 : 0) : smoothstep(0.55, 1, w);
    geos.forEach((geo, k) => {
      const f = Math.min(Math.max(p * N - k, 0), 1);
      // Indices run along the arc, six per segment, so the draw range sweeps it clockwise.
      geo.setDrawRange(0, 6 * Math.round(f * SEG));
      mats[k].opacity = (k === N - 1 ? 0.85 : 0.22 + (store.signalHint ? 0.12 : 0)) * Math.min(1, w * 1.4);
    });
  });

  return (
    <group ref={group} visible={false}>
      {/* The tote stands on a poured concrete pad, like every system in the hero */}
      <mesh ref={pad} geometry={padGeometry()} material={concrete("#E6E9ED")} position={[at[0], 0, at[2]]} rotation-y={-0.3} receiveShadow />
      <group position={[at[0], Math.max(at[1], ISLAND_TOP + 0.004), at[2]]} scale={k} rotation-x={-Math.PI / 2}>
        {geos.map((geo, n) => (
          <mesh key={n} geometry={geo} material={mats[n]} />
        ))}
      </group>
    </group>
  );
}
