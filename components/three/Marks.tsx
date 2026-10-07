"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { CH, clamp01, smoothstep, store, weight } from "@/lib/story";
import { signalCratePose, CRATE, DAYS, DAY_X, HUB_Y, RING, SAFETY_UNITS, SAFETY_Y, STEP_Y, dayUnits } from "@/lib/scene";
import { COLORS, FONTS } from "./palette";

type TroikaText = THREE.Mesh & { fillOpacity: number };

const Z = CRATE.d / 2 + 0.16;

/** Demand curve, safety stock and day scale for the problem chapter. */
export function ChartMarks() {
  const group = useRef<THREE.Group>(null);
  const tubeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.demand, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const tube = useMemo(() => {
    const pts = DAYS.map((_, d) => new THREE.Vector3(DAY_X(d), 1.25 + Math.pow(d / 6, 1.35) * 1.15, Z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    return { geo: new THREE.TubeGeometry(curve, 160, 0.016, 10), end: pts[pts.length - 1] };
  }, []);
  const lineRef = useRef<{ material: THREE.Material & { opacity: number } }>(null);
  const head = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const w = smoothstep(0.55, 0.98, weight(CH.problem, store.g));
    if (!group.current) return;
    group.current.visible = w > 0.01;
    // The demand line draws itself left to right: time passing.
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

  const day = (d: number) => (d === 0 ? "TODAY" : `DAY ${d}`);
  const text = { font: FONTS.mono, fontSize: 0.09, letterSpacing: 0.06 };

  return (
    <group ref={group} visible={false}>
      <mesh geometry={tube.geo} material={tubeMat} />
      <mesh ref={head} position={tube.end} material={tubeMat} scale={0}>
        <sphereGeometry args={[0.05, 24, 24]} />
      </mesh>
      <Line
        ref={lineRef as never}
        points={[
          [-3.7, SAFETY_Y, Z],
          [3.7, SAFETY_Y, Z],
        ]}
        color={COLORS.signal}
        lineWidth={1.6}
        dashed
        dashSize={0.09}
        gapSize={0.06}
        transparent
      />
      <Text {...text} color={COLORS.signal} anchorX="right" anchorY="middle" position={[-3.8, SAFETY_Y, Z]}>
        {`SAFETY STOCK  ${SAFETY_UNITS}`}
      </Text>
      <Text {...text} color={COLORS.demand} anchorX="left" anchorY="middle" position={[tube.end.x + 0.16, tube.end.y, tube.end.z]}>
        DEMAND +18%
      </Text>
      {/* Units on hand, read off the top of every column */}
      {DAYS.map((n, d) => (
        <Text
          key={`u${d}`}
          {...text}
          fontSize={0.105}
          color={d === 6 ? COLORS.signal : COLORS.ink}
          userData={{ alpha: d === 6 ? 1 : 0.75 }}
          anchorX="center"
          anchorY="bottom"
          position={[DAY_X(d), n * STEP_Y + 0.08, 0]}
        >
          {d === 0 ? `${dayUnits(d)} ON HAND` : String(dayUnits(d))}
        </Text>
      ))}
      {/* The day scale, painted on the floor in front of the columns */}
      {DAYS.map((_, d) => (
        <Text
          key={d}
          {...text}
          fontSize={0.1}
          color={d === 6 ? COLORS.signal : COLORS.inkSoft}
          anchorX="center"
          anchorY="top"
          // Stands just in front of the floor line; drawn over the ground so it never clips.
          material-depthTest={false}
          renderOrder={5}
          position={[DAY_X(d), -0.04, Z + 0.15]}
        >
          {day(d)}
        </Text>
      ))}
      {/* The gap that rules out waiting: the next supplier delivery is far off the chart. */}
      <Line
        points={[
          [DAY_X(6) + 0.45, -0.1, Z + 0.15],
          [DAY_X(6) + 2.1, -0.1, Z + 0.15],
        ]}
        depthTest={false}
        renderOrder={5}
        color={COLORS.inkSoft}
        lineWidth={1.2}
        dashed
        dashSize={0.05}
        gapSize={0.05}
        transparent
        opacity={0.7}
      />
      <Text {...text} fontSize={0.1} color={COLORS.ink} anchorX="left" anchorY="middle" material-depthTest={false} renderOrder={5} position={[DAY_X(6) + 2.2, -0.1, Z + 0.15]}>
        DAY 21 · SUPPLIER
      </Text>
    </group>
  );
}

/** Context threads: each system's part flows into the signal. */
export function Threads() {
  const items = useMemo(
    () =>
      Array.from({ length: 6 }, (_, s) => {
        const [x, z] = RING(s);
        const a = new THREE.Vector3(x * 0.86, 1.05, z * 0.86);
        const b = new THREE.Vector3(0, HUB_Y, 0);
        const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.9, 0));
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        return { curve, geo: new THREE.TubeGeometry(curve, 96, 0.008, 8), phase: s / 6 };
      }),
    [],
  );
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const pulseMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.demand, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const w = weight(CH.context, store.g);
    if (!group.current) return;
    group.current.visible = w > 0.01;
    const draw = smoothstep(0.35, 0.95, w);
    items.forEach((it) => it.geo.setDrawRange(0, Math.floor((it.geo.index?.count ?? 0) * draw)));
    mat.opacity = 0.45 * w;
    pulseMat.opacity = smoothstep(0.9, 1, w);
    // Information travelling toward the signal.
    items.forEach((it, i) => {
      const p = pulses.current[i];
      if (!p) return;
      const t = (clock.elapsedTime * 0.3 + it.phase) % 1;
      it.curve.getPoint(t, p.position);
    });
  });

  return (
    <group ref={group} visible={false}>
      {items.map((it, i) => (
        <group key={i}>
          <mesh geometry={it.geo} material={mat} />
          <mesh
            ref={(el) => {
              pulses.current[i] = el;
            }}
            material={pulseMat}
          >
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Six days of cover, drawn around the signal as it is found: five quiet days, then the day
 * Plant 01 falls below safety stock. It draws in with the chapter instead of pulsing.
 */
export function SignalPing() {
  // Sits on the ground under the crate's Signal pose, sized to the crate, on any screen shape.
  const portrait = useThree((st) => st.size.width < 768 || (st.size.width < 1024 && st.size.height > st.size.width * 1.15));
  const pose = signalCratePose(CH.signal, 0, portrait)!;
  const k = (pose.s ?? 1) / 1.2;
  const at: [number, number, number] = [pose.p[0], Math.max(0.004, pose.p[1] - 0.416 * k), pose.p[2]];
  const N = 6;
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
            color: k === N - 1 ? COLORS.signal : "#14130F",
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
      ),
    [],
  );
  const group = useRef<THREE.Group>(null);
  const still = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useFrame(() => {
    const w = weight(CH.signal, store.g);
    if (!group.current) return;
    group.current.visible = w > 0.01;
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
    <group ref={group} position={at} scale={k} rotation-x={-Math.PI / 2} visible={false}>
      {geos.map((geo, k) => (
        <mesh key={k} geometry={geo} material={mats[k]} />
      ))}
    </group>
  );
}
