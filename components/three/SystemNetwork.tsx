"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CH, store, weight, smoothstep } from "@/lib/story";
import { islandPose } from "@/lib/scene";
import { SYSTEMS } from "../ui/systems";
import { TINTS } from "./palette";

/** Architectural Decignal Synthesis Nexus & Enterprise Telemetry Bus */
export function SystemNetwork() {
  const portrait = useThree((state) => state.size.width < 768 || (state.size.width < 1024 && state.size.height > state.size.width * 1.15));
  const root = useRef<THREE.Group>(null);
  const still = useRef(false);
  const corePrism = useRef<THREE.Mesh>(null);
  const coreRing = useRef<THREE.Group>(null);

  // 3 distinct telemetry packets per system path (18 total active packets)
  const packetsA = useRef<(THREE.Group | null)[]>([]);
  const packetsB = useRef<(THREE.Group | null)[]>([]);
  const packetsC = useRef<(THREE.Group | null)[]>([]);

  const items = useMemo(() => {
    return SYSTEMS.map((system, index) => {
      const pose = islandPose(index, CH.fragments, portrait)!;
      const start = new THREE.Vector3(pose.p[0], 0.025, pose.p[2]);
      const end = new THREE.Vector3(0, 0.025, -1.2);
      const middle = start.clone().lerp(end, 0.5);
      middle.z += portrait ? 0 : 0.4;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const material = new THREE.MeshBasicMaterial({
        color: TINTS[system.tone as keyof typeof TINTS],
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const tubeGeo = new THREE.TubeGeometry(curve, 54, 0.009, 6);
      return { curve, geometry: tubeGeo, material, tone: TINTS[system.tone as keyof typeof TINTS] };
    });
  }, [portrait]);

  // Cross-system pairwise integration chords (ERP <-> MES, WMS <-> Suppliers, CRM <-> WMS)
  const pairwiseChords = useMemo(() => {
    const pairs: [number, number][] = [
      [0, 2], // ERP <-> MES
      [3, 4], // WMS <-> Suppliers
      [1, 3], // CRM <-> WMS
    ];
    return pairs.map(([a, b]) => {
      const poseA = islandPose(a, CH.fragments, portrait)!;
      const poseB = islandPose(b, CH.fragments, portrait)!;
      const p1 = new THREE.Vector3(poseA.p[0], 0.015, poseA.p[2]);
      const p2 = new THREE.Vector3(poseB.p[0], 0.015, poseB.p[2]);
      const mid = p1.clone().lerp(p2, 0.5);
      mid.y = 0.015;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const geo = new THREE.TubeGeometry(curve, 36, 0.004, 4);
      const mat = new THREE.MeshBasicMaterial({ color: "#B8B3A8", transparent: true, opacity: 0.15, depthWrite: false });
      return { geo, mat };
    });
  }, [portrait]);

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        item.geometry.dispose();
        item.material.dispose();
      });
      pairwiseChords.forEach((chord) => {
        chord.geo.dispose();
        chord.mat.dispose();
      });
    };
  }, [items, pairwiseChords]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      still.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const pVec = useMemo(() => new THREE.Vector3(), []);
  const tVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const opacity = smoothstep(0.35, 1, weight(CH.fragments, store.g));
    if (root.current) root.current.visible = opacity > 0.01;

    const time = clock.elapsedTime;

    // Pulse Decignal central synthesis core
    if (coreRing.current) {
      coreRing.current.rotation.z = time * 0.12;
    }
    if (corePrism.current) {
      const pulseK = 0.5 + 0.5 * Math.sin(time * 2.2);
      (corePrism.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + pulseK * 0.5;
    }

    items.forEach((item, index) => {
      const isSelected = store.selected === index;
      const isHovered = store.islandHint === index;
      item.material.opacity = opacity * (isSelected ? 0.85 : isHovered ? 0.6 : 0.22);

      // Packet A
      const pA = packetsA.current[index];
      if (pA) {
        const uA = still.current ? 0.25 : (time * 0.14 + index / 6) % 1;
        item.curve.getPoint(uA, pVec);
        item.curve.getTangent(uA, tVec);
        pA.position.copy(pVec);
        pA.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tVec);
        pA.scale.setScalar(opacity * (isSelected ? 1.4 : 1));
      }

      // Packet B (Staggered offset)
      const pB = packetsB.current[index];
      if (pB) {
        const uB = still.current ? 0.6 : (time * 0.14 + index / 6 + 0.35) % 1;
        item.curve.getPoint(uB, pVec);
        item.curve.getTangent(uB, tVec);
        pB.position.copy(pVec);
        pB.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tVec);
        pB.scale.setScalar(opacity * 0.85);
      }

      // Packet C (Reverse outbound confirmation response)
      const pC = packetsC.current[index];
      if (pC) {
        const uC = still.current ? 0.85 : 1 - ((time * 0.11 + index / 6 + 0.6) % 1);
        item.curve.getPoint(uC, pVec);
        item.curve.getTangent(uC, tVec);
        pC.position.copy(pVec);
        pC.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tVec);
        pC.scale.setScalar(opacity * 0.7);
      }
    });
  });

  return (
    <group ref={root} dispose={null}>
      {/* Pairwise cross-system integration chords */}
      {pairwiseChords.map((chord, i) => (
        <mesh key={`chord-${i}`} geometry={chord.geo} material={chord.mat} />
      ))}

      {/* Main system telemetry bus conduits & multi-packet streams */}
      {items.map((item, index) => (
        <group key={index}>
          <mesh geometry={item.geometry} material={item.material} />

          {/* Inbound primary data packet A */}
          <group
            ref={(g) => {
              packetsA.current[index] = g;
            }}
          >
            <mesh>
              <cylinderGeometry args={[0.016, 0.016, 0.07, 8]} />
              <meshBasicMaterial color={item.tone} transparent opacity={0.88} />
            </mesh>
          </group>

          {/* Inbound secondary data packet B */}
          <group
            ref={(g) => {
              packetsB.current[index] = g;
            }}
          >
            <mesh>
              <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
              <meshBasicMaterial color={item.tone} transparent opacity={0.65} />
            </mesh>
          </group>

          {/* Outbound synthesis decision packet C */}
          <group
            ref={(g) => {
              packetsC.current[index] = g;
            }}
          >
            <mesh>
              <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Central Decignal Synthesis Nexus Hub at (0, 0.024, -1.2) */}
      <group position={[0, 0.024, -1.2]}>
        {/* Outer machined aluminum plinth base */}
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.34, 0.36, 64]} />
          <meshBasicMaterial color="#B0ABA0" transparent opacity={0.55} />
        </mesh>

        {/* Precision graduation division ring */}
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.22, 0.226, 48]} />
          <meshBasicMaterial color="#C5BFB5" transparent opacity={0.4} />
        </mesh>

        {/* 6 Cardinal vector ticks aligning with the 6 enterprise systems */}
        <group ref={coreRing} rotation-x={-Math.PI / 2}>
          {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((rad, i) => (
            <mesh key={i} position={[Math.cos(rad) * 0.28, Math.sin(rad) * 0.28, 0]}>
              <planeGeometry args={[0.045, 0.006]} />
              <meshBasicMaterial color={TINTS[SYSTEMS[i].tone as keyof typeof TINTS]} transparent opacity={0.65} />
            </mesh>
          ))}
        </group>

        {/* Inner frosted quartz core halo */}
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.09, 0.13, 32]} />
          <meshBasicMaterial color="#E8E4DA" transparent opacity={0.7} />
        </mesh>

        {/* Central Monolithic Decignal Synthesis Core Node */}
        <mesh ref={corePrism} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.09, 6]} />
          <meshStandardMaterial
            color="#252D35"
            roughness={0.25}
            metalness={0.7}
            emissive={TINTS.emerald}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}
