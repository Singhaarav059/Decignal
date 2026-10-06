"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CH, store, weight, smoothstep } from "@/lib/story";
import { islandPose } from "@/lib/scene";
import { SYSTEMS } from "../ui/systems";
import { TINTS } from "./palette";

/** Quiet information paths put the six source models in one operational space. */
export function SystemNetwork() {
  const portrait = useThree((state) => state.size.width < 768 || (state.size.width < 1024 && state.size.height > state.size.width * 1.15));
  const root = useRef<THREE.Group>(null);
  const still = useRef(false);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => SYSTEMS.map((system, index) => {
    const pose = islandPose(index, CH.fragments, portrait)!;
    const start = new THREE.Vector3(pose.p[0], 0.025, pose.p[2]);
    const end = new THREE.Vector3(0, 0.025, -1.2);
    const middle = start.clone().lerp(end, .5);
    middle.z += portrait ? 0 : .4;
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const material = new THREE.MeshBasicMaterial({ color: TINTS[system.tone as keyof typeof TINTS], transparent: true, opacity: .2, depthWrite: false });
    return { curve, geometry: new THREE.TubeGeometry(curve, 48, .008, 5), material };
  }), [portrait]);
  useEffect(() => () => items.forEach(item => { item.geometry.dispose(); item.material.dispose(); }), [items]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { still.current = media.matches; };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useFrame(({ clock }) => {
    const opacity = smoothstep(.35, 1, weight(CH.fragments, store.g));
    if (root.current) root.current.visible = opacity > .01;
    items.forEach((item, index) => {
      item.material.opacity = opacity * (store.selected === index ? .65 : .22);
      const pulse = pulses.current[index];
      if (pulse) {
        item.curve.getPoint(still.current ? .45 : (clock.elapsedTime * .13 + index / 6) % 1, pulse.position);
        pulse.scale.setScalar(opacity);
      }
    });
  });
  return <group ref={root} dispose={null}>{items.map((item,index)=><group key={index}>
    <mesh geometry={item.geometry} material={item.material}/>
    <mesh ref={mesh=>{pulses.current[index]=mesh;}}><sphereGeometry args={[.025,12,12]}/><meshBasicMaterial color={TINTS[SYSTEMS[index].tone as keyof typeof TINTS]} transparent opacity={.7}/></mesh>
  </group>)}<mesh position={[0,.024,-1.2]} rotation-x={-Math.PI/2}><ringGeometry args={[.12,.15,48]}/><meshBasicMaterial color="#B8B2A8" transparent opacity={.55}/></mesh></group>;
}
