"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { enamel, aluminium, concrete } from "./materials";

export type Motion = RefObject<{ progress: number }>;
export type Vec = [number, number, number];
export const phase = (p: number, a: number, b: number) => THREE.MathUtils.smoothstep(p, a, b);

/** Linear 0..1 progress between a and b (no easing), for choreography that must stay in step. */
export const ramp = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);

/** Canvas px → screen px. Labels keep one reading size in every scene, whatever the camera zoom. */
const LABEL_SCALE = 0.25;
const LABEL_RES = 3;

/**
 * Industrial equipment telemetry tag: razor-sharp retina canvas, soft lift, status dot.
 * Proportioned directly in world units matching the lead story's tags, so it never balloons or clips.
 */
export function AssetLabel({
  title,
  detail,
  position,
  color = "#6E685E",
  width = 2.1,
}: {
  title: string;
  detail?: string;
  position: Vec;
  color?: string;
  width?: number;
  pin?: boolean;
}) {
  const holder = useRef<THREE.Group>(null);
  const pop = useRef(0);
  const first = useRef(true);
  const [fontsReady, setFontsReady] = useState(0);

  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && setFontsReady((n) => n + 1));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pop.current = 1;
  }, [title, detail, color]);

  const sans = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  // The tag grows to fit its text instead of clipping it: long titles widen the pill, never cut it.
  const W = useMemo(() => {
    const m = document.createElement("canvas").getContext("2d")!;
    m.font = `650 34px ${sans}`;
    const t = m.measureText(title).width + 140;
    m.font = `500 27px ${sans}`;
    const d = detail ? m.measureText(detail).width + 96 : 0;
    return Math.ceil(Math.max(680, t, d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, detail, fontsReady]);
  const H = detail ? 210 : 126;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W * LABEL_RES;
    canvas.height = H * LABEL_RES;
    const c = canvas.getContext("2d")!;
    c.setTransform(LABEL_RES, 0, 0, LABEL_RES, 0, 0);

    // Pill background with subtle elevation shadow
    c.save();
    c.shadowColor = "rgba(20, 19, 15, 0.14)";
    c.shadowBlur = 18;
    c.shadowOffsetY = 6;
    c.beginPath();
    c.roundRect(16, 12, W - 32, H - 24, 36);
    c.fillStyle = "#FFFFFF";
    c.fill();
    c.restore();

    // Precision boundary stroke
    c.strokeStyle = "rgba(20, 19, 15, 0.09)";
    c.lineWidth = 2;
    c.stroke();

    const m = document.createElement("canvas").getContext("2d")!;

    // Status dot
    const dotY = detail ? 64 : H / 2;
    c.fillStyle = color;
    c.beginPath();
    c.arc(56, dotY, 13, 0, Math.PI * 2);
    c.fill();

    // Measure and fit title
    let titleSize = 40;
    m.font = `650 ${titleSize}px ${sans}`;
    while (m.measureText(title).width > W - 140 && titleSize > 26) {
      titleSize -= 2;
      m.font = `650 ${titleSize}px ${sans}`;
    }
    c.font = `650 ${titleSize}px ${sans}`;
    c.fillStyle = "#14130F";
    c.fillText(title, 94, detail ? 76 : H / 2 + titleSize * 0.35);

    // Measure and fit detail if present
    if (detail) {
      let detailSize = 31;
      m.font = `500 ${detailSize}px ${sans}`;
      while (m.measureText(detail).width > W - 90 && detailSize > 22) {
        detailSize -= 2;
        m.font = `500 ${detailSize}px ${sans}`;
      }
      c.font = `500 ${detailSize}px ${sans}`;
      c.fillStyle = "#4A463E";
      c.fillText(detail, 56, 146);
    }

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, detail, color, fontsReady, W, H]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, dt) => {
    if (!holder.current) return;
    pop.current = Math.max(0, pop.current - Math.min(dt, 0.05) * 2.4);
    const k = pop.current;
    const bump = Math.sin(Math.min(1, (1 - k) * 2) * Math.PI) * k * 0.12;
    holder.current.scale.setScalar(1 + bump);
  });

  return (
    <group position={position}>
      <Billboard>
        <group ref={holder}>
          <mesh renderOrder={20}>
            <planeGeometry args={[(width * W) / 680, (width * H) / 680]} />
            <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}

export function Route({points,color="#CBC6BD",radius=0.018,dashed=false,flow=false,speed=0.28,pulseCount=2,pulseColor}:
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

export function Box({at,size,color="#E7E3DC",metal=false}:{at:Vec;size:Vec;color?:string;metal?:boolean}){
  return <mesh position={at} material={metal?aluminium():enamel(color)} castShadow receiveShadow><boxGeometry args={size}/></mesh>;
}
export function Floor({size=[7,0.035,4] as Vec}:{size?:Vec}){
  return <mesh position-y={-0.035} material={concrete("#ECE6DC")} receiveShadow><boxGeometry args={size}/></mesh>;
}
export function Bolts({radius=0.6,z=0,count=8}:{radius?:number;z?:number;count?:number}){
  return <>{Array.from({length:count},(_,i)=><mesh key={i} position={[Math.cos(i/count*Math.PI*2)*radius,Math.sin(i/count*Math.PI*2)*radius,z]} material={aluminium(0.25)} rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.035,0.035,0.055,6]}/></mesh>)}</>;
}
export function Bollards({x,z,count=4}:{x:number;z:number;count?:number}){
  return <>{Array.from({length:count},(_,i)=><group key={i} position={[x+i*0.23,0,z]}><mesh position-y={0.09} material={enamel("#FFB21E")} castShadow><cylinderGeometry args={[0.024,0.024,0.18,12]}/></mesh><mesh position-y={0.11} material={enamel("#3A3D43")}><cylinderGeometry args={[0.025,0.025,0.035,12]}/></mesh></group>)}</>;
}
