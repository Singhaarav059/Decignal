"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { enamel, aluminium, concrete } from "./materials";

export type Motion = RefObject<{ progress: number }>;
export type Vec = [number, number, number];
export const phase = (p: number, a: number, b: number) => THREE.MathUtils.smoothstep(p, a, b);

/** Flat, legible equipment tags: attached to an asset, with no decorative pop. */
export function AssetLabel({ title, detail, position, color = "#6E685E", width = 1.4 }: { title: string; detail?: string; position: Vec; color?: string; width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = detail ? 190 : 100;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#FFFDF9"; c.beginPath(); c.roundRect(2,2,764,canvas.height-4,16); c.fill();
    c.strokeStyle = "#E7E1D8"; c.lineWidth=2; c.stroke();
    c.fillStyle=color; c.fillRect(24,28,8,canvas.height-56);
    c.fillStyle="#14130F"; c.font="600 38px Inter, sans-serif"; c.fillText(title,54,detail?70:63);
    if(detail){c.fillStyle=color;c.font="400 30px Inter, sans-serif";c.fillText(detail,54,132);}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  },[title,detail,color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={position}><Billboard><mesh renderOrder={20}><planeGeometry args={[width,width*(detail?190:100)/768]} /><meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} /></mesh></Billboard></group>;
}

export function Route({points,color="#CBC6BD",radius=0.018,dashed=false}:{points:Vec[];color?:string;radius?:number;dashed?:boolean}){
  const geometry=useMemo(()=>{
    const curve=new THREE.CurvePath<THREE.Vector3>();
    points.slice(1).forEach((p,i)=>curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]),new THREE.Vector3(...p))));
    if(!dashed)return [new THREE.TubeGeometry(curve,64,radius,6,false)];
    const n=Math.max(1,Math.ceil(curve.getLength()/0.19));
    return Array.from({length:n},(_,i)=>new THREE.TubeGeometry(new THREE.LineCurve3(curve.getPoint(i/n),curve.getPoint((i+0.56)/n)),2,radius,5,false));
  },[points,radius,dashed]);
  useEffect(()=>()=>geometry.forEach(g=>g.dispose()),[geometry]);
  return <group>{geometry.map((g,i)=><mesh key={i} geometry={g}><meshBasicMaterial color={color} toneMapped={false}/></mesh>)}</group>;
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
