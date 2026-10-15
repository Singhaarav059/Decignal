"use client";

// The yard: a road, the aprons in front of two plants and the painted bays where pallets are staged.
// The story's Decision chapter (transfer.tsx) and the applications explorer (OperationalScenes) stand on it.
import * as THREE from "three";
import { useMemo } from "react";
import { PLANT_01, PLANT_02, PLANT_FRONT, ROAD_Z } from "@/lib/scene";
import { DROP_X, SLOT_X, STAGE_Z } from "../transfer-motion";
import { asphalt, concrete, enamel } from "../materials";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Top of the concrete apron in front of each plant (scene units). */
export const APRON_TOP = 0.012;

export function roadLines(roadLength: number) {
  const parts: THREE.BufferGeometry[] = [];
  // Road edge lines and a dashed centre line
  for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(roadLength, 0.002, 0.018).translate(0, 0.0165, ROAD_Z + s * 0.33));
  for (let i = 0; i < Math.floor(roadLength / 0.52); i++) parts.push(new THREE.BoxGeometry(0.22, 0.002, 0.016).translate(-roadLength / 2 + 0.3 + i * 0.52, 0.0165, ROAD_Z));
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
}

/** The aprons in front of both plants and the painted bays where the pallets are staged. */
export function YardPads() {
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
