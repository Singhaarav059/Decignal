"use client";

// 09 Decide (wide screens): the ending's object is Decignal itself. At the hub the six systems' threads
// meet, the logo's three plates come down one by one and stack (systems, context, signal), then turn
// slowly while the reader decides. Phones keep the audit board, which their portrait ending frames alone.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import { CH, smootherstep, store, weight } from "@/lib/story";
import { HUB, ISO } from "@/lib/scene";
import { clay } from "../kit";
import { reducedMotion } from "./core";

/** Bottom to top, as the LogoMark draws them: cobalt, saffron, signal red. */
const PLATES = ["#2E5BFF", "#FFB21E", "#F2361F"];
const SIDE = 0.95;
const THICK = 0.14;
const GAP = 0.34;
const BASE = 0.5;

export function FinalMark() {
  const root = useRef<THREE.Group>(null);
  const plates = useRef<(THREE.Group | null)[]>([]);
  const portrait = useThree((s) => s.size.width < 768 || (s.size.width < 1024 && s.size.height > s.size.width * 1.15));

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    // It stays whole as the page arrives: the world drifts up with the sheet instead of folding away.
    const w = portrait ? 0 : weight(CH.final, store.g);
    g.visible = w > 0.01;
    if (!g.visible) return;
    const still = reducedMotion();
    const time = clock.elapsedTime;
    // The stack turns slowly as a whole; the logo's diamond reads square-on at rest (45° to the camera).
    g.rotation.y = ISO.az + Math.PI / 4 + (still ? 0 : Math.sin(time * 0.35) * 0.18);
    plates.current.forEach((p, i) => {
      if (!p) return;
      // Each plate drops in after the one below it, from above, and settles without overshoot.
      const k = still ? (w > 0.5 ? 1 : 0) : smootherstep(0.25 + i * 0.16, 0.62 + i * 0.16, w);
      const bob = still ? 0 : Math.sin(time * 1.1 + i * 0.9) * 0.025 * k;
      p.position.y = BASE + i * GAP + (1 - k) * (1.6 + i * 0.4) + bob;
      p.scale.setScalar(Math.max(0.001, 0.6 + 0.4 * k));
      p.visible = k > 0.01;
    });
  });

  return (
    <group ref={root} position={[HUB[0], 0, HUB[1]]} visible={false}>
      {PLATES.map((c, i) => (
        <group key={c} ref={(el) => void (plates.current[i] = el)} visible={false}>
          <RoundedBox args={[SIDE, THICK, SIDE]} radius={0.05} smoothness={4} castShadow receiveShadow material={clay(c, 0.38)} />
        </group>
      ))}
    </group>
  );
}
