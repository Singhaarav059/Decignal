"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Plant, Storefront } from "./buildings";
import { Forklift, SemiTruck, TRUCK } from "./vehicles";
import { LoadedPallet, Bearing, box, cylX, geo, merge } from "./parts";
import { aluminium, chrome, enamel, plastic, steel, cladding, darkGlass } from "./materials";
import { Yard } from "./Actors";
import { SLOT_X, STAGE_Z, DECK_Z, liftAt, palletStates, type Lift } from "./transfer-motion";
import { M, ROAD_Z, truckX } from "@/lib/scene";
import { AssetLabel, Bolts, Bollards, Box, Floor, Route, phase, type Motion, type Vec } from "./SceneKit";
import { COLORS, TINTS } from "./palette";

export type SceneProps={motion:Motion;step:number;still:boolean;tone:string};

/** The same physical loading choreography as the lead story, seen from above. */
export function Logistics({motion,step}:SceneProps){
  const truck=useRef<THREE.Group>(null), fork=useRef<THREE.Group>(null);
  const lift=useMemo<Lift>(()=>({x:0,z:0,yaw:0,h:0.06,trip:-1,carry:false}),[]);
  const height=useRef(0.06);const [states,setStates]=useState([0,0,0]);const [arrived,setArrived]=useState(false);
  const tote=plastic(TINTS.saffron,0.5,true);
  useFrame(()=>{
    const t=phase(motion.current.progress,0.35,0.96);liftAt(t,lift);height.current=lift.h;
    if(truck.current)truck.current.position.x=truckX(t);
    if(fork.current){fork.current.position.set(lift.x,0,lift.z);fork.current.rotation.y=lift.yaw;}
    const next=palletStates(t,lift);if(next.some((v,i)=>v!==states[i]))setStates(next);
    if((t>=0.78)!==arrived)setArrived(t>=0.78);
  });
  const sent=states.filter(v=>v===2).length*80;
  return <group dispose={null}>
    <Yard roadLength={8.9}/>
    <group position={[-2.55,0,-1.6]} scale={M}><Plant accent={TINTS.saffron} name="PLANT 02"/></group>
    <group position={[2.55,0,-1.6]} scale={M}><Plant accent={TINTS.cobalt} name="PLANT 01"/></group>
    <Bollards x={-1.9} z={-0.76}/><Bollards x={2.4} z={-0.76}/>
    {SLOT_X.map((x,i)=>states[i]===0&&<group key={i} position={[x,0,STAGE_Z]} scale={M}><LoadedPallet tote={tote}/></group>)}
    <group ref={truck} position={[truckX(0),0,ROAD_Z]} scale={M}><SemiTruck accent={TINTS.emerald}>{TRUCK.slots.map((x,i)=>states[i]===2&&<group key={i} position={[x,TRUCK.deckY,DECK_Z]}><LoadedPallet tote={tote}/></group>)}</SemiTruck></group>
    <group ref={fork} scale={M}><Forklift color={TINTS.saffron} lift={()=>height.current}>{states.includes(1)&&<group rotation-y={Math.PI/2}><LoadedPallet tote={tote}/></group>}</Forklift></group>
    <AssetLabel position={[-2.55,1.4,-1.6]} title="PLANT 02 / DOCK 03" detail={`${620-sent} on hand · 380 reserved`} color={TINTS.saffron} width={2.05}/>
    <AssetLabel position={[2.55,1.4,-1.6]} title="PLANT 01 / BEARING X90" detail={arrived?"240 units received":"Day 6 forecast · 140 units"} color={arrived?TINTS.emerald:COLORS.signal} width={2.05}/>
    <AssetLabel position={[0,0.1,1.25]} title={step===0?"SHORTAGE DETECTED":step===1?"POLICY CHECK · 240 AVAILABLE":arrived?"TRF-0240 · DELIVERY CONFIRMED":"TRF-0240 · TRANSFER IN PROGRESS"} color={TINTS.emerald} width={2.6}/>
  </group>;
}

/** A real motor assembly: finned housing, shaft, bearing race, sensor and exposed fasteners. */
export function Motor({motion,still}:Pick<SceneProps,"motion"|"still">){
  const rotor=useRef<THREE.Group>(null), cover=useRef<THREE.Group>(null), bearing=useRef<THREE.Group>(null);
  const geometry=useMemo(()=>geo("motor-finned-body",()=>merge([
    cylX(0.57,1.7,0,0,0,64),
    ...Array.from({length:15},(_,i)=>cylX(0.66,0.026,-0.75+i*0.105,0,0,64)),
    box(1.5,0.16,1.2,0,-0.61,0),box(0.42,0.26,0.38,-0.3,0.65,0),
  ])),[]);
  useFrame((state)=>{
    const p=motion.current.progress;const open=phase(p,0.2,0.46)*(1-phase(p,0.73,0.94));
    if(cover.current)cover.current.position.x=1.04+open*1.25;
    if(bearing.current)bearing.current.position.x=0.96+open*0.55;
    if(rotor.current)rotor.current.rotation.x=still?0:state.clock.elapsedTime*(p>0.72?0.22:0.7);
  });
  return <group position={[-0.65,1,0]} dispose={null}>
    <mesh geometry={geometry} material={enamel("#385C84",0.38)} castShadow receiveShadow/>
    <mesh position={[-0.9,0,0]} rotation-z={Math.PI/2} material={enamel("#313B46")} castShadow><cylinderGeometry args={[0.65,0.65,0.18,64]}/></mesh>
    <group ref={rotor}><mesh rotation-z={Math.PI/2} position-x={0.72} material={chrome()} castShadow><cylinderGeometry args={[0.13,0.13,2.1,48]}/></mesh><Box at={[1.62,0.13,0]} size={[0.28,0.04,0.06]} metal/></group>
    <group ref={bearing} rotation-z={Math.PI/2} scale={6.5}><Bearing/></group>
    <group ref={cover} position-x={1.04} rotation-y={Math.PI/2}><mesh material={aluminium(0.28)} castShadow><torusGeometry args={[0.53,0.12,16,64]}/></mesh><Bolts radius={0.54} z={0.12}/></group>
    <Box at={[-0.3,0.85,0]} size={[0.2,0.13,0.18]} color={TINTS.saffron}/>
    <Route points={[[-0.3,0.91,0],[-0.3,1.13,0],[-1.35,1.13,0],[-1.35,-0.8,0]]} color="#41464D" radius={0.016}/>
    {[-0.5,0.5].map(x=>[-0.45,0.45].map(z=><mesh key={`${x}-${z}`} position={[x,-0.48,z]} material={steel()}><cylinderGeometry args={[0.035,0.035,0.17,6]}/></mesh>))}
  </group>;
}
export function Maintenance(props:SceneProps){
  return <group>
    <Floor size={[5.5,0.035,3.2]}/><Motor {...props}/>
    <Route points={[[-2.35,0.015,0.85],[-2.35,0.015,1.25],[2.3,0.015,1.25],[2.3,0.015,0.85]]} color={TINTS.saffron} radius={0.012}/>
    <AssetLabel position={[-1,2.45,0]} title="LINE 04 / DRIVE MOTOR" detail="Sensor V-04 · drive-end bearing" width={2.5} color={TINTS.emerald}/>
    <AssetLabel position={[2.15,1.3,0]} title={props.step===2?"WORK ORDER CM-041":"BEARING X90"} detail={props.step===2?"Friday · service window reserved":"Inspect inner race"} width={1.65} color={props.step===2?TINTS.emerald:COLORS.signal}/>
  </group>;
}

function Conveyor({x,z,length=3.4}:{x:number;z:number;length?:number}){
  const metal=useMemo(()=>geo(`conveyor-${length}`,()=>merge([
    box(length,0.1,0.08,0,0.45,-0.36),box(length,0.1,0.08,0,0.45,0.36),
    ...[-1,1].flatMap(a=>[-1,1].map(b=>box(0.07,0.48,0.07,a*(length/2-0.18),0.24,b*0.3))),
  ])),[length]);
  return <group position={[x,0,z]}><mesh geometry={metal} material={aluminium()} castShadow/>{Array.from({length:22},(_,i)=><mesh key={i} position={[-length/2+0.08+i*(length-0.16)/21,0.44,0]} rotation-x={Math.PI/2} material={steel("#737A81")} castShadow><cylinderGeometry args={[0.055,0.055,0.61,12]}/></mesh>)}</group>;
}
function Machine({at,color,number}:{at:Vec;color:string;number:string}){
  return <group position={at}>
    <Box at={[0,0.16,0]} size={[1.06,0.32,1.05]} color="#ABB1B5"/>
    {[-0.43,0.43].map(x=><Box key={x} at={[x,0.75,0]} size={[0.09,0.9,0.97]} color="#DADDDC"/>)}
    <Box at={[0,1.19,0]} size={[1.04,0.16,1.04]} color={color}/>
    <Box at={[0,0.7,-0.45]} size={[0.78,0.91,0.06]} color="#D5D8D6"/>
    <Box at={[0,0.83,0.15]} size={[0.38,0.18,0.32]} color="#535D64"/>
    <mesh position={[0,0.65,0.15]} material={chrome()} castShadow><cylinderGeometry args={[0.065,0.065,0.22,24]}/></mesh>
    {[-0.22,0.22].map(x=><mesh key={x} position={[x,0.77,-0.12]} material={steel()} castShadow><cylinderGeometry args={[0.025,0.025,0.7,12]}/></mesh>)}
    <Box at={[0,0.39,0.1]} size={[0.74,0.07,0.7]} metal/>
    <mesh position={[0,0.75,0.49]}><planeGeometry args={[0.77,0.75]}/><meshPhysicalMaterial color="#789397" transparent opacity={0.22} roughness={0.12} metalness={0.15} depthWrite={false}/></mesh>
    <Box at={[0.6,0.82,0.28]} size={[0.24,0.42,0.13]} color="#EAE8E1"/>
    <mesh position={[0.6,0.9,0.353]} material={darkGlass()}><planeGeometry args={[0.17,0.2]}/></mesh>
    {[0,1,2].map(i=><mesh key={i} position={[0.54+i*0.055,0.72,0.354]} rotation-x={Math.PI/2} material={enamel(i===0?COLORS.signal:i===1?TINTS.emerald:TINTS.saffron)}><cylinderGeometry args={[0.014,0.014,0.008,12]}/></mesh>)}
    <Box at={[0.44,1.37,-0.2]} size={[0.035,0.22,0.035]} color="#51585B"/>
    <Box at={[0.44,1.49,-0.2]} size={[0.065,0.07,0.065]} color={color}/>
    <AssetLabel position={[0,1.75,0]} title={number} detail={color===COLORS.signal?"Capacity constrained":"Capacity available"} width={1.35} color={color}/>
  </group>;
}
export function Production({motion,step}:SceneProps){
  const carriers=useRef<(THREE.Group|null)[]>([]);
  const shuttle=useRef<THREE.Group>(null);
  useFrame(()=>{carriers.current.forEach((g,i)=>{if(!g)return;const t=phase(motion.current.progress,0.42,0.72);const run=phase(motion.current.progress,0.76,0.96);g.position.set(-2.5+i*0.47+(i<3?run*1.8:0),0.57,i<3?0.8-t*1.6:0.8);if(shuttle.current)shuttle.current.position.z=0.8-t*1.6;});});
  return <group dispose={null}><Floor size={[7,0.04,4]}/>
    <group ref={shuttle} position={[-2.03,0,0.8]}><Box at={[0,0.5,0]} size={[1.4,0.06,0.56]} color="#99A7B4"/></group>{[-2.7,-1.35].map(x=><Box key={x} at={[x,0.12,0]} size={[0.04,0.1,2.3]} metal/>)}
    <Conveyor x={-0.7} z={0.8} length={4.9}/><Conveyor x={-0.7} z={-0.8} length={4.9}/>
    <Machine at={[2.05,0,0.8]} color={step===2?TINTS.emerald:COLORS.signal} number="LINE 03"/><Machine at={[2.05,0,-0.8]} color={TINTS.emerald} number="LINE 02"/>
    {Array.from({length:6},(_,i)=><group key={i} ref={g=>{carriers.current[i]=g;}}><Box at={[0,0,0]} size={[0.33,0.055,0.42]} color={TINTS.saffron}/><group position-y={0.12} rotation-x={Math.PI/2} scale={2.2}><Bearing/></group></group>)}
    <Route points={[[-1.2,0.025,1.65],[-1.2,0.025,1.35],[1.5,0.025,1.35]]} color={TINTS.saffron} radius={0.012}/>
    <AssetLabel position={[-2,1.4,0.8]} title="ORDER PO-2207" detail={step===2?"3 lots moved to Line 02":"Queue building at Line 03"} width={2} color={step===2?TINTS.emerald:COLORS.signal}/>
  </group>;
}

function Container({at,color}:{at:Vec;color:string}){
  return <group position={at}><mesh material={cladding(color,14)} castShadow receiveShadow><boxGeometry args={[1.1,0.48,0.46]}/></mesh><Box at={[0.56,0,0]} size={[0.02,0.42,0.42]} color="#D8DAD6"/>{[-0.12,0.12].map(z=><Box key={z} at={[0.58,0,z]} size={[0.02,0.39,0.014]} metal/>)}</group>;
}

function CargoVessel(){
  const hull=useMemo(()=>geo("supply-cargo-hull",()=>{
    const shape=new THREE.Shape();shape.moveTo(-1.8,-0.4);shape.lineTo(1.35,-0.4);shape.lineTo(1.85,0);shape.lineTo(1.35,0.4);shape.lineTo(-1.8,0.4);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:0.26,bevelEnabled:true,bevelSize:0.06,bevelThickness:0.06,bevelSegments:2});g.rotateX(-Math.PI/2);return g;
  }),[]);
  return <group position={[0.35,0.03,-2.85]}><mesh geometry={hull} material={enamel("#42566A")} castShadow/>
    <Box at={[-1.25,0.48,0]} size={[0.45,0.42,0.62]} color="#F6F1E6"/>
    <Box at={[-1.25,0.74,0]} size={[0.48,0.11,0.64]} color="#E1DDD3"/>
    {[-0.2,0,0.2].map(z=><Box key={z} at={[-1.016,0.53,z]} size={[0.012,0.1,0.1]} color="#385C71"/>)}
    <Box at={[-1.55,0.84,0]} size={[0.12,0.2,0.12]} color={TINTS.tangerine}/>
    {[0,1,2].map(i=><group key={i} scale={0.5} position={[-0.55+i*0.62,0.24,0]}><Container at={[0,0.24,0]} color={i===1?TINTS.saffron:"#91A7A0"}/></group>)}
    <Route points={[[-1.7,0.42,-0.35],[1.3,0.42,-0.35],[1.7,0.42,0],[1.3,0.42,0.35],[-1.7,0.42,0.35]]} color="#D0CEC5" radius={0.009}/>
  </group>;
}
export function SupplyRisk({motion,step}:SceneProps){
  const rig=useRef<THREE.Group>(null);
  const route=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(-2.8,0,0.45),new THREE.Vector3(-2,0,1.4),new THREE.Vector3(1.3,0,1.4),new THREE.Vector3(2.6,0,0.6)]),[]);
  useFrame(()=>{if(!rig.current)return;const t=phase(motion.current.progress,0.52,0.95);const p=route.getPoint(t);const tangent=route.getTangent(t);rig.current.position.copy(p);rig.current.rotation.y=Math.atan2(-tangent.z,tangent.x);});
  return <group dispose={null}><Floor size={[7.5,0.04,4.2]}/>
    <Box at={[0,-0.08,-2.85]} size={[7.5,0.05,1.5]} color="#BDCFCA"/><CargoVessel/>
    <Box at={[0,0.07,-1.91]} size={[7.5,0.16,0.13]} color="#8E9590"/>
    {Array.from({length:12},(_,i)=><Box key={i} at={[-3.4+i*0.6,0.18,-1.8]} size={[0.1,0.05,0.17]} color="#4B5556"/>)}
    {Array.from({length:8},(_,i)=><Container key={i} at={[-2.5+(i%4)*1.2,0.26+Math.floor(i/4)*0.5,-0.9]} color={i%3===0?TINTS.cobalt:i%3===1?"#9AAEAA":"#DDD7CA"}/>)}
    {[-2.9,0].map(x=><Box key={x} at={[x,1.15,-0.7]} size={[0.12,2.3,0.15]} color={TINTS.saffron}/>)}<Box at={[-1.45,2.28,-0.7]} size={[3.15,0.16,0.3]} color={TINTS.saffron}/>
    <Box at={[-1.1,1.68,-0.7]} size={[0.025,1.15,0.025]} metal/>
    <Box at={[-0.35,2.1,-0.58]} size={[0.34,0.28,0.35]} color="#F0EEE6"/><Box at={[-0.35,2.13,-0.397]} size={[0.24,0.13,0.012]} color="#35525B"/>
    <Route points={[[-2.8,2.42,-0.82],[-0.1,2.42,-0.82]]} color="#6D797B" radius={0.012}/>
    {Array.from({length:10},(_,i)=><Box key={i} at={[-2.8+i*0.3,2.35,-0.82]} size={[0.013,0.14,0.013]} metal/>)}
    <Box at={[0,0.006,0.5]} size={[7,0.015,0.72]} color="#969D9B"/>
    {Array.from({length:14},(_,i)=><Box key={i} at={[-3.25+i*0.48,0.02,0.5]} size={[0.22,0.008,0.018]} color="#ECE7DA"/>)}
    <Route points={[[-2.8,0.06,0.45],[-2,0.06,1.4],[1.3,0.06,1.4],[2.6,0.06,0.6]]} color={step>0?TINTS.emerald:"#D0CABE"} radius={0.025} dashed/>
    <Box at={[0.25,0.24,0.45]} size={[0.16,0.48,0.16]} color={COLORS.signal}/><Box at={[0.65,0.45,0.45]} size={[1.1,0.07,0.06]} color={COLORS.signal}/>
    <group ref={rig} scale={0.13}><SemiTruck accent={TINTS.cobalt}><group position={[TRUCK.slots[1],TRUCK.deckY,0]}><LoadedPallet tote={plastic(TINTS.saffron)}/></group></SemiTruck></group>
    <AssetLabel position={[-1.4,2.65,-0.7]} title="PORT / PRIMARY LANE" detail="Bearing X90 · Seal S02 delayed" color={COLORS.signal} width={2.5}/>
    <AssetLabel position={[1.5,0.35,1.7]} title={step===2?"ALTERNATIVE CONFIRMED":"SECOND SUPPLIER"} detail="Capacity and lead time checked" color={TINTS.emerald} width={2.25}/>
  </group>;
}

export function Distribution({motion,step,tone,commercial=false}:SceneProps&{commercial?:boolean}){
  const vehicle=useRef<THREE.Group>(null);
  useFrame(()=>{if(vehicle.current)vehicle.current.position.x=-2.2+phase(motion.current.progress,0.45,0.94)*4.1;});
  return <group dispose={null}>
    <Floor size={[7.3,0.03,4]}/>
    <group position={[-2.3,0,-0.85]} scale={0.14}><Plant accent={TINTS.saffron} name="CENTRAL DC"/></group>
    {[0,1,2].map(i=><group key={i} position={[0.6+i*1.02,0,-0.65]} scale={0.65}><Storefront/></group>)}
    <Route points={[[-3.3,0.02,0.8],[3.2,0.02,0.8]]} radius={0.12} color="#B7B5AD"/>
    <Route points={[[-2.3,0.15,0.8],[2.5,0.15,0.8]]} radius={0.018} color={step===2?TINTS.emerald:tone} dashed/>
    <group ref={vehicle} position={[-2.2,0,0.8]} scale={0.12}><SemiTruck accent={tone}><group position={[TRUCK.slots[1],TRUCK.deckY,0]}><LoadedPallet tote={plastic(tone)}/></group></SemiTruck></group>
    <AssetLabel position={[-2.3,1.5,-0.85]} title="CENTRAL DISTRIBUTION" detail={step===2?"Dispatch plan updated":"Stock and capacity checked"} width={2.4} color={TINTS.saffron}/>
    <AssetLabel position={[1.65,1.35,-0.65]} title={commercial?"WEST / DEALER NETWORK":"WEST / REGIONAL DEMAND"} detail={commercial?"Allocation +12%":"Replenishment +1,800 units"} width={2.45} color={tone}/>
  </group>;
}

export function DealerNetwork({motion,step,tone}:SceneProps){
  const allocation=useRef<THREE.Group>(null);
  useFrame(()=>{if(allocation.current)allocation.current.position.x=-2.3+phase(motion.current.progress,.5,.94)*4.6;});
  return <group dispose={null}><Floor size={[7.6,.04,4.5]}/>
    {["EAST", "CENTRAL", "WEST"].map((region,i)=><group key={region} position={[-2.3+i*2.3,0,-.75]}>
      <group scale={1.15}><Storefront/></group>
      <AssetLabel position={[0,1.35,0]} title={region+" / DEALERS"} detail={i===2?(step===2?"Allocation +12%":"Orders exceed allocation"):i===0?"Surplus within policy":"Balanced demand"} color={i===2?tone:TINTS.emerald} width={1.85}/>
      <Box at={[0,.015,.72]} size={[1.65,.012,.045]} color="#D1B16E"/>
      {[-.65,.65].map(x=><Box key={x} at={[x,.015,.38]} size={[.018,.012,.7]} color="#D1B16E"/>)}
    </group>)}
    <Box at={[0,.002,.75]} size={[7,.01,.65]} color="#AAAFAA"/>
    {Array.from({length:14},(_,i)=><Box key={i} at={[-3.2+i*.48,.012,.78]} size={[.22,.006,.018]} color="#F5F0E5"/>)}
    <group ref={allocation} position={[-2.3,0,.75]} rotation-y={-Math.PI/2} scale={M}><Forklift color={TINTS.saffron} lift={()=>.22}><group rotation-y={Math.PI/2}><LoadedPallet tote={plastic(tone)}/></group></Forklift></group>
    <Route points={[[-2.3,.016,1.55],[2.3,.016,1.55],[2.3,.016,1.1]]} color={step===2?TINTS.emerald:tone} radius={.014} dashed/>
    <AssetLabel position={[0,.13,1.8]} title={step===2?"ALLOC-012 / WEST +12%":"ALLOCATION POLICY / SOURCE RESERVE PROTECTED"} color={tone} width={3}/>
  </group>;
}

function Slip({title,sub,at,color,children,motion,label=true}:{title:string;sub:string;at:Vec;color:string;children?:React.ReactNode;motion?:Motion;label?:boolean}){
  const paper=useRef<THREE.Group>(null);
  useFrame(()=>{if(paper.current&&motion){const t=phase(motion.current.progress,0.05,0.43);paper.current.position.x=at[0]*t;paper.current.position.y=at[1]+(1-t)*Math.abs(at[0])*0.06;}});
  return <group ref={paper} position={at}><Box at={[0,0,0]} size={[1.6,0.035,1.9]} color="#FFFDF9"/><group position={[0,0.06,0]} rotation-x={-Math.PI/2}><mesh><planeGeometry args={[1.42,1.68]}/><meshBasicMaterial color="#FFFDF9"/></mesh></group>
    {label&&<AssetLabel position={[0,0.22,-0.55]} title={title} detail={sub} width={1.5} color={color}/>}
    {Array.from({length:5},(_,i)=><Box key={i} at={[-0.12,0.03,-0.05+i*0.19]} size={[i%2?0.95:1.2,0.006,0.025]} color="#C9C6BE"/>)}{children}</group>;
}
export function Finance({step,motion}:SceneProps){
  return <group rotation-y={-0.12}>
    <Slip motion={motion} title="PURCHASE ORDER" sub="PO-8842 · matched" at={[-2,0.15,-0.5]} color={TINTS.emerald}/>
    <Slip motion={motion} title="GOODS RECEIPT" sub="GRN · not received" at={[0,0.15,-0.5]} color={COLORS.signal}><Route points={[[-0.55,0.06,0.76],[0.55,0.06,-0.1]]} color={COLORS.signal} radius={0.014} dashed/></Slip>
    {[0,1,2].map(i=><Slip key={i} motion={motion} label={i===2} title="3 SUPPLIER INVOICES" sub={step===2?"Payment on hold":"Awaiting match"} at={[2+i*0.05,0.15+i*0.09,-0.5+i*0.08]} color={TINTS.violet}/>)}
    <Route points={[[-2,0.05,0.75],[-2,0.05,1.4],[2,0.05,1.4],[2,0.05,0.8]]} color={step===2?TINTS.saffron:TINTS.violet} radius={0.025}/>
    <AssetLabel position={[0,0.2,1.8]} title={step===2?"CONTROL APPLIED · 3 PAYMENTS HELD":"THREE-WAY MATCH · ONE RECORD MISSING"} color={step===2?TINTS.saffron:COLORS.signal} width={3.3}/>
  </group>;
}
export function Customer({motion,step}:SceneProps){
  const tickets=useRef<(THREE.Group|null)[]>([]);
  useFrame(()=>{const t=phase(motion.current.progress,0.2,0.76);tickets.current.forEach((g,i)=>{if(!g)return;const a=i/14*Math.PI*2;g.position.set(THREE.MathUtils.lerp(-2.8+(i%4)*0.48,Math.cos(a)*2.3,t),0.12+Math.sin(i)*0.015,THREE.MathUtils.lerp(-1+Math.floor(i/4)*0.5,Math.sin(a)*1.7,t));g.rotation.y=THREE.MathUtils.lerp((i%3-1)*0.16,-a,t);});});
  return <group dispose={null}>
    <group position={[0,0.8,0]} rotation-x={Math.PI/2} scale={10}><Bearing/></group>
    {Array.from({length:14},(_,i)=><group key={i} ref={g=>{tickets.current[i]=g;}}><Box at={[0,0,0]} size={[0.35,0.035,0.48]} color="#FFFDF9"/><Box at={[0,0.022,-0.14]} size={[0.23,0.006,0.035]} color={step===2?TINTS.emerald:TINTS.pink}/><Box at={[0,0.022,-0.02]} size={[0.23,0.006,0.014]} color="#BDB8AF"/><Box at={[-0.025,0.022,0.08]} size={[0.18,0.006,0.014]} color="#BDB8AF"/></group>)}
    {step>0&&Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return <Route key={i} points={[[Math.cos(a)*2.1,0.04,Math.sin(a)*1.5],[0,0.04,0]]} color={step===2?"#A9CDBA":"#D9BEC9"} radius={0.01}/>;})}
    <AssetLabel position={[0,1.9,0]} title="COMMON PART / BEARING X90" detail={step===2?"One escalation · 14 linked cases":"Same part across 14 service records"} color={TINTS.pink} width={2.8}/>
  </group>;
}
