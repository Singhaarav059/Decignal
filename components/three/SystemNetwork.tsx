"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { useDisposeOnUnmount } from "./kit";
import * as THREE from "three";
import { CH, store, weight, smoothstep } from "@/lib/story";
import { HUB as HUB_XZ, islandPose } from "@/lib/scene";
import { SYSTEMS } from "../ui/systems";
import { COLORS, TINTS } from "./palette";
import { portraitWide } from "@/lib/device";

const UP = new THREE.Vector3(0, 1, 0);
/** Where the threads meet on the ground: the spot the decision card comes to rest at the end. */
const HUB: [number, number, number] = [HUB_XZ[0], 0.012, HUB_XZ[1]];

/** A rounded-square outline lying on the ground, `size` across, `t` thick. */
function hubMark(size: number, t: number, r: number) {
  const shape = (s: number, rr: number) => {
    const p = new THREE.Shape();
    const h = s / 2;
    p.moveTo(-h + rr, -h);
    p.lineTo(h - rr, -h);
    p.quadraticCurveTo(h, -h, h, -h + rr);
    p.lineTo(h, h - rr);
    p.quadraticCurveTo(h, h, h - rr, h);
    p.lineTo(-h + rr, h);
    p.quadraticCurveTo(-h, h, -h, h - rr);
    p.lineTo(-h, -h + rr);
    p.quadraticCurveTo(-h, -h, -h + rr, -h);
    return p;
  };
  const outer = shape(size, r);
  outer.holes.push(shape(size - t * 2, Math.max(r - t, 0.005)));
  return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
}

/**
 * The threads from the six systems to the hub, drawn on the ground. Quiet ink lines with one packet
 * each; a thread takes its system's colour only while that system is pointed at or opened, and all
 * six resolve into colour at the end, when every system feeds the one decision.
 */
export function SystemNetwork() {
  const portrait = useThree((state) => portraitWide(state.size.width, state.size.height));
  const root = useRef<THREE.Group>(null);
  const still = useRef(false);
  const packets = useRef<(THREE.Mesh | null)[]>([]);

  const items = useMemo(() => {
    return SYSTEMS.map((system, index) => {
      const pose = islandPose(index, CH.fragments, portrait)!;
      const start = new THREE.Vector3(pose.p[0], 0.025, pose.p[2]);
      const end = new THREE.Vector3(HUB[0], 0.025, HUB[2]);
      const middle = start.clone().lerp(end, 0.5);
      middle.z += portrait ? 0 : 0.4;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const tone = new THREE.Color(TINTS[system.tone as keyof typeof TINTS]);
      const material = new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0, depthWrite: false });
      const packetMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0, depthWrite: false });
      return { curve, geometry: new THREE.TubeGeometry(curve, 48, 0.009, 6), material, packetMaterial, tone, lit: 0 };
    });
  }, [portrait]);
  const hub = useMemo(() => ({ geo: hubMark(0.6, 0.012, 0.07), mat: new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0, depthWrite: false }) }), []);
  const ink = useMemo(() => new THREE.Color(COLORS.ink), []);

  useDisposeOnUnmount(items, (list) =>
    list.forEach((item) => {
      item.geometry.dispose();
      item.material.dispose();
      item.packetMaterial.dispose();
    }),
  );
  useDisposeOnUnmount(hub, (h) => {
    h.geo.dispose();
    h.mat.dispose();
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      still.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const tVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    // At the end the same threads return, held firm: every system connected to the decision. A
    // portrait ending frames the audit board alone (no islands), so its threads stay away too.
    const resolved = portrait ? 0 : smoothstep(0.35, 1, weight(CH.final, store.g));
    const opacity = Math.max(smoothstep(0.35, 1, weight(CH.fragments, store.g)), resolved);
    if (!root.current) return;
    root.current.visible = opacity > 0.01;
    // Most of the story the network is gone: nothing to move.
    if (!root.current.visible) return;

    const time = clock.elapsedTime;
    const d = Math.min(dt, 1 / 30);
    hub.mat.opacity = 0.25 * opacity;

    items.forEach((item, index) => {
      const pointed = store.selected === index ? 1 : store.islandHint === index ? 0.75 : 0;
      // Colour eases in and out with the pointer, and is held once the story resolves.
      item.lit = THREE.MathUtils.damp(item.lit, Math.max(pointed, resolved), 8, d);
      item.material.color.lerpColors(ink, item.tone, item.lit);
      item.material.opacity = opacity * (0.18 + 0.52 * item.lit + (store.selected === index ? 0.15 : 0));
      item.packetMaterial.color.copy(item.material.color);
      item.packetMaterial.opacity = opacity * (0.55 + 0.4 * item.lit);

      // One packet per thread, travelling in to the hub.
      const p = packets.current[index];
      if (p) {
        const u = still.current ? 0.5 : (time * 0.14 + index / 6) % 1;
        item.curve.getPoint(u, p.position);
        item.curve.getTangent(u, tVec);
        p.quaternion.setFromUnitVectors(UP, tVec);
        p.scale.setScalar(opacity);
      }
    });
  });

  return (
    <group ref={root} dispose={null}>
      {items.map((item, index) => (
        <group key={index}>
          <mesh geometry={item.geometry} material={item.material} />
          <mesh
            ref={(m) => {
              packets.current[index] = m;
            }}
            material={item.packetMaterial}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.07, 8]} />
          </mesh>
        </group>
      ))}
      {/* The hub: a square painted on the ground where the threads meet and the decision lands */}
      <mesh geometry={hub.geo} material={hub.mat} position={HUB} />
    </group>
  );
}
