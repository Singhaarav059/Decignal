"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  CH,
  CONTEXT,
  FUNCTIONS,
  INDUSTRIES,
  LAYERS,
  SYSTEMS,
  localIn,
  smoothstep,
  store,
  weight,
} from "@/lib/story";
import { BACK, BOOK_ORDER, FRONT, H, SIG, contextTop, tintOf, industryF } from "@/lib/layouts";
import { COLORS, FONTS, INK_ON } from "./palette";
type PlateRefs = React.RefObject<(THREE.Mesh | null)[]>;

/** Text fades in only once its plate has arrived, and leaves before the plate moves. */
const shown = (chapters: number[]) => (g: number) =>
  chapters.reduce((s, c) => s + smoothstep(0.6, 0.98, weight(c, g)), 0);

const inkFor = (plate: number) => INK_ON[tintOf(plate)].ink;
const softFor = (plate: number) => INK_ON[tintOf(plate)].soft;

const TOP = new THREE.Matrix4().compose(
  new THREE.Vector3(0, H / 2 + 0.0025, 0),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
  new THREE.Vector3(1, 1, 1),
);
const BOTTOM = new THREE.Matrix4().compose(
  new THREE.Vector3(0, -H / 2 - 0.0025, 0),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI)),
  new THREE.Vector3(1, 1, 1),
);

type TroikaText = THREE.Mesh & { fillOpacity: number };

/** A group glued to one face of one plate. Face space: x across 1.5, y up 1.0. */
function Face({
  plates,
  plate,
  face = "top",
  vis,
  children,
}: {
  plates: PlateRefs;
  plate: number;
  face?: "top" | "bottom";
  vis: (g: number) => number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const offset = face === "top" ? TOP : BOTTOM;
  useFrame(() => {
    const g = ref.current;
    const m = plates.current[plate];
    if (!g || !m) return;
    const plateOpacity = (m.material as THREE.Material).opacity;
    const v = Math.min(vis(store.g), 1) * (m.visible ? plateOpacity : 0);
    g.visible = v > 0.01;
    if (!g.visible) return;
    g.matrix.compose(m.position, m.quaternion, m.scale).multiply(offset);
    g.children.forEach((c) => {
      const t = c as TroikaText;
      if ("fillOpacity" in t) t.fillOpacity = v * ((t.userData.alpha as number) ?? 1);
    });
  });
  return (
    <group ref={ref} matrixAutoUpdate={false} visible={false}>
      {children}
    </group>
  );
}

type TProps = React.ComponentProps<typeof Text> & { alpha?: number };

function Mono({ alpha = 1, ...p }: TProps) {
  return (
    <Text
      font={FONTS.mono}
      fontSize={0.052}
      letterSpacing={0.08}
      anchorX="left"
      anchorY="top"
      userData={{ alpha }}
      {...p}
    />
  );
}

function Serif({ alpha = 1, ...p }: TProps) {
  return (
    <Text
      font={FONTS.serif}
      fontSize={0.14}
      lineHeight={1.02}
      letterSpacing={-0.01}
      anchorX="left"
      anchorY="bottom"
      userData={{ alpha }}
      {...p}
    />
  );
}

const L = -0.64; // left margin in face space
const T = 0.4; // top margin
const B = -0.38; // bottom baseline

export function Labels({ plates }: { plates: PlateRefs }) {
  const fragmentsVis = useMemo(() => shown([CH.fragments]), []);
  const signalVis = useMemo(() => shown([CH.signal]), []);
  const contextVis = useMemo(() => shown([CH.context]), []);
  const decisionVis = useMemo(() => shown([CH.decision]), []);
  const controlVis = useMemo(() => shown([CH.control]), []);
  const scaleVis = useMemo(() => shown([CH.scale]), []);
  const industriesVis = useMemo(() => shown([CH.industries]), []);

  return (
    <>
      {/* Fragmentation: each system knows its own part */}
      {SYSTEMS.map((name, s) => {
        const plate = s * 5 + 4;
        return (
          <Face key={name} plates={plates} plate={plate} vis={plate === SIG ? shown([CH.fragments]) : fragmentsVis}>
            <Mono position={[L, T, 0]} color={inkFor(plate)} fontSize={0.075}>
              {name}
            </Mono>
            <Mono position={[L, B + 0.06, 0]} color={softFor(plate)} anchorY="bottom" alpha={0.9}>
              {["4.1M rows", "212K accounts", "38 lines", "9 sites", "1,140 vendors", "6 feeds"][s]}
            </Mono>
          </Face>
        );
      })}

      {/* Signal */}
      <Face plates={plates} plate={SIG} vis={signalVis}>
        <Mono position={[L, T, 0]} color={COLORS.inkOnDark}>
          BEARING X90 · PLANT 01
        </Mono>
        <Serif position={[L, B, 0]} color={COLORS.inkOnDark} fontSize={0.17} maxWidth={1.3}>
          {"Below safety stock\nin 6 days"}
        </Serif>
      </Face>

      {/* Context */}
      {CONTEXT.map((c, s) => {
        const plate = contextTop(s);
        return (
          <Face key={c.system} plates={plates} plate={plate} vis={contextVis}>
            <Mono position={[L, T, 0]} color={softFor(plate)}>
              {c.system}
            </Mono>
            <Serif position={[L, B, 0]} color={inkFor(plate)} fontSize={0.15} maxWidth={1.3}>
              {c.title}
            </Serif>
          </Face>
        );
      })}
      <Face plates={plates} plate={SIG} vis={contextVis}>
        <Mono position={[L, T, 0]} color={COLORS.inkOnDark}>
          SIGNAL
        </Mono>
        <Serif position={[L, B, 0]} color={COLORS.inkOnDark} fontSize={0.15}>
          Bearing X90
        </Serif>
      </Face>

      {/* Decision: the engraved front face */}
      <Face plates={plates} plate={FRONT} vis={decisionVis}>
        <Mono position={[L, T, 0]} color={COLORS.inkSoft}>
          RECOMMENDED ACTION
        </Mono>
        <Mono position={[-L, T, 0]} anchorX="right" color={COLORS.ok}>
          ● READY
        </Mono>
        <Serif position={[L, -0.02, 0]} fontSize={0.2} color={COLORS.ink}>
          Transfer 240 units
        </Serif>
        <Serif position={[L, -0.17, 0]} fontSize={0.13} color={COLORS.inkSoft} font={FONTS.serifItalic}>
          from Plant 02 to Plant 01
        </Serif>
        <Mono position={[L, B, 0]} anchorY="bottom" color={COLORS.inkSoft} fontSize={0.044}>
          {"COVER 34 DAYS   ·   INR 38,000   ·   NO EXPEDITE"}
        </Mono>
      </Face>

      {/* Control: every layer is inspectable */}
      {LAYERS.map((layer, k) => {
        const plate = BOOK_ORDER[k * 6 + 5];
        return (
          <Face key={layer.name} plates={plates} plate={plate} vis={controlVis}>
            <Mono position={[L, T, 0]} color={k === 0 ? COLORS.signal : softFor(plate)}>
              {`0${k + 1}  ${layer.name.toUpperCase()}`}
            </Mono>
            <Serif position={[L, B, 0]} color={inkFor(plate)} fontSize={0.105} maxWidth={0.66}>
              {layer.text}
            </Serif>
          </Face>
        );
      })}

      {/* Scale: the same layer, every function */}
      {FUNCTIONS.map((f, k) => {
        const plate = BOOK_ORDER[k * 6 + 5];
        return (
          <Face key={f.name} plates={plates} plate={plate} vis={scaleVis}>
            <Mono position={[L, T, 0]} color={softFor(plate)}>
              {f.name.toUpperCase()}
            </Mono>
            <Serif position={[L, B, 0]} color={inkFor(plate)} fontSize={0.135} maxWidth={1.28}>
              {f.decision}
            </Serif>
          </Face>
        );
      })}

      <IndustryFaces plates={plates} vis={industriesVis} />
    </>
  );
}

/** Two faces, one turning object: the hidden face is rewritten while it faces away. */
function IndustryFaces({ plates, vis }: { plates: PlateRefs; vis: (g: number) => number }) {
  const [idx, setIdx] = useState({ front: 0, back: 1 });
  useFrame(() => {
    const f = industryF(localIn(CH.industries, store.g));
    const front = Math.min(2 * Math.round(f / 2), INDUSTRIES.length - 1);
    const back = Math.min(2 * Math.round((f - 1) / 2) + 1, INDUSTRIES.length - 1);
    if (front !== idx.front || back !== idx.back) setIdx({ front, back });
  });
  const face = (i: number) => {
    const ind = INDUSTRIES[Math.max(i, 0)];
    return (
      <>
        <Mono position={[L, T, 0]} color={COLORS.inkSoft}>
          {ind.name.toUpperCase()}
        </Mono>
        <Mono position={[-L, T, 0]} anchorX="right" color={COLORS.ok}>
          ● READY
        </Mono>
        <Serif position={[L, 0.27, 0]} anchorY="top" fontSize={0.15} maxWidth={1.22} color={COLORS.ink}>
          {ind.decision}
        </Serif>
        <Mono position={[L, B, 0]} anchorY="bottom" color={COLORS.inkSoft} fontSize={0.044}>
          {ind.system.toUpperCase()}
        </Mono>
      </>
    );
  };
  return (
    <>
      <Face plates={plates} plate={FRONT} vis={vis}>
        {face(idx.front)}
      </Face>
      <Face plates={plates} plate={BACK} face="bottom" vis={vis}>
        {face(idx.back)}
      </Face>
    </>
  );
}
