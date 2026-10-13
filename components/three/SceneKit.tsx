"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { enamel, aluminium, concrete } from "./materials";
import { ScreenTag } from "./ScreenTag";

/** Scroll progress through the current stage (0..1), and the hand-off presence at a chapter's edges. */
export type Motion = RefObject<{ progress: number; edge?: number }>;
export type Vec = [number, number, number];
export const phase = (p: number, a: number, b: number) => THREE.MathUtils.smoothstep(p, a, b);

/** Linear 0..1 progress between a and b (no easing), for choreography that must stay in step. */
export const ramp = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);

/** A pin's hover override: the object the reader points at in the card (or on its dot), else null. */
export type PinRef = RefObject<string | null>;

/** Presence of the explorer's tags: they go with the world through a hand-off and are gone (no ghost
 *  text) while it is under 60%. */
const presence = (motion: Motion) => () => {
  const e = motion.current.edge ?? 1;
  return e < 0.6 ? 0 : e;
};

/**
 * A pin on an object in an application scene: a tone dot that opens into a label of real page text
 * (ScreenTag: 13px title, 12px value, whole pixels at any density). One label is open at a time: the
 * stage's subject (`subject`), or the object the reader points at in the card or on its dot.
 */
export function Pin({ id, at, title, value, tone, alert, motion, pin, subject }: {
  id: string;
  at: Vec;
  title: string;
  value?: string;
  /** The dot: the system colour of the object, signal red at risk, emerald once resolved. */
  tone: string;
  alert?: boolean;
  motion: Motion;
  pin?: PinRef;
  /** The pin the stage opens when the reader is not pointing at anything. */
  subject: string | null;
}) {
  const latest = useRef(subject);
  useEffect(() => {
    latest.current = subject;
  }, [subject]);
  const show = useMemo(() => presence(motion), [motion]);
  return (
    <group position={at}>
      <ScreenTag
        title={title}
        value={value}
        tone={tone}
        alert={alert}
        show={show}
        open={() => (pin?.current ?? latest.current) === id}
        onHover={pin ? (on) => {
          if (on) pin.current = id;
          else if (pin.current === id) pin.current = null;
        } : undefined}
      />
    </group>
  );
}

export function Route({points,color="#C3C8D0",radius=0.018,dashed=false,flow=false,speed=0.28,pulseCount=2,pulseColor}:
  {points:Vec[];color?:string;radius?:number;dashed?:boolean;flow?:boolean;speed?:number;pulseCount?:number;pulseColor?:string}){
  const curve=useMemo(()=>{
    const c=new THREE.CurvePath<THREE.Vector3>();
    points.slice(1).forEach((p,i)=>c.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]),new THREE.Vector3(...p))));
    return c;
  },[points]);

  const geometry=useMemo(()=>{
    if(!dashed)return [new THREE.TubeGeometry(curve,64,radius,6,false)];
    const n=Math.max(1,Math.ceil(curve.getLength()/0.19));
    return Array.from({length:n},(_,i)=>new THREE.TubeGeometry(new THREE.LineCurve3(curve.getPoint(i/n),curve.getPoint((i+0.56)/n)),2,radius,5,false));
  },[curve,radius,dashed]);
  useEffect(()=>()=>geometry.forEach(g=>g.dispose()),[geometry]);

  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const pColor = pulseColor || color;
  const still = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { still.current = media.matches; };
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useFrame(({ clock }) => {
    if (!flow || still.current) return;
    const t = clock.elapsedTime * speed;
    for (let i = 0; i < pulseCount; i++) {
      const mesh = pulses.current[i];
      if (!mesh) continue;
      const frac = (t + i / pulseCount) % 1;
      curve.getPointAt(frac, tmpPos);
      mesh.position.copy(tmpPos);
    }
  });

  return <group>
    {geometry.map((g,i)=><mesh key={i} geometry={g}><meshBasicMaterial color={color} toneMapped={false}/></mesh>)}
    {flow && Array.from({length: pulseCount}, (_, i) => (
      <mesh key={`p-${i}`} ref={el => { pulses.current[i] = el; }}>
        <sphereGeometry args={[radius * 1.7, 12, 12]} />
        <meshBasicMaterial color={pColor} toneMapped={false} />
      </mesh>
    ))}
  </group>;
}

export function Box({at,size,color="#E3E6EB",metal=false}:{at:Vec;size:Vec;color?:string;metal?:boolean}){
  return <mesh position={at} material={metal?aluminium():enamel(color)} castShadow receiveShadow><boxGeometry args={size}/></mesh>;
}
/** The scene's floor: a painted area level with the ground, a hair thick, so it never reads as a raised slab. */
export function Floor({size=[7,0.035,4] as Vec}:{size?:Vec}){
  // Top stays where the old slab's top was (scenes stand on it); only the visible edge goes.
  return <mesh position-y={-0.035+size[1]/2-0.002} material={concrete("#EEF0F3")} receiveShadow><boxGeometry args={[size[0],0.004,size[2]]}/></mesh>;
}
export function Bolts({radius=0.6,z=0,count=8}:{radius?:number;z?:number;count?:number}){
  return <>{Array.from({length:count},(_,i)=><mesh key={i} position={[Math.cos(i/count*Math.PI*2)*radius,Math.sin(i/count*Math.PI*2)*radius,z]} material={aluminium(0.25)} rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.035,0.035,0.055,6]}/></mesh>)}</>;
}
