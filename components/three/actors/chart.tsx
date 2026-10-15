"use client";

// 03 Problem: the shipment's delivery lines as stacks of crates, the line under the pointer labelled.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { CH, store, weight } from "@/lib/story";
import { CHART_CRATES, DAYS, DAY_X, STEP_Y, WMS, crateFill, chartPos, chartSlot, islandPose, type Pose, type Vec3 } from "@/lib/scene";
import { COLORS } from "../palette";
import { Crate } from "../kit";
import { ScreenTag } from "../ScreenTag";
import { Actor } from "./core";

/* ------------------------------------------------------------------ */
/* 03 Problem: stock as crates, day by day                             */
/* ------------------------------------------------------------------ */

/** The week's stock is neutral; only the day that breaches safety stock carries the signal red. */
const STOCK = "#DFE2E7";
const BREACH_DAY = DAYS.length - 1;

/* Pointing at a day labels it with that day's stock. */
const crateRoots: (THREE.Group | null)[] = [];
const liveRoots: THREE.Group[] = [];
let dayHover = -1;

function ChartFocus({ onDay }: { onDay: (d: number) => void }) {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const live = useRef(false);
  useFrame(({ camera }) => {
    const on = weight(CH.problem, store.g) > 0.9;
    let hit = -1;
    if (on && store.pointerIn) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      liveRoots.length = 0;
      for (const g of crateRoots) if (g) liveRoots.push(g);
      const first = ray.intersectObjects(liveRoots, true)[0];
      if (first) {
        let o: THREE.Object3D | null = first.object;
        while (o && !crateRoots.includes(o as THREE.Group)) o = o.parent;
        const k = crateRoots.indexOf(o as THREE.Group);
        if (k >= 0) hit = chartSlot(k).d;
      }
    }
    if (hit !== dayHover) {
      dayHover = hit;
      onDay(hit);
      if (on || live.current) document.body.style.cursor = hit >= 0 ? "pointer" : "";
    }
    live.current = on;
  });
  return null;
}

function ChartCrate({ k }: { k: number }) {
  const { d, l } = chartSlot(k);
  // The columns stay put under the pointer (a lifting column read as the chart rocking back and
  // forth); the day's label alone answers the hover.
  return (
    <group
      ref={(g) => {
        crateRoots[k] = g;
      }}
    >
      <group scale-y={crateFill(d, l)}>
        <Crate color={d === BREACH_DAY ? COLORS.signal : STOCK} />
      </group>
    </group>
  );
}

// Each crate's pose is fixed: built once, never per frame.
const POSES: Pose[] = Array.from({ length: CHART_CRATES }, (_, k) => ({ p: chartPos(k) }));
const TRACKS = POSES.map((pose) => (c: number) => (c === CH.problem ? pose : null));
/** Leaving for Context, the week's stock folds back into the warehouse system that tracks it. */
const WAREHOUSE: Vec3 | null = islandPose(WMS, CH.context)?.p ?? null;
const toWarehouse = (c: number): Vec3 | null => (c === CH.problem ? WAREHOUSE : null);

export function ChartCrates() {
  return (
    <>
      <DayTag />
      {POSES.map((_, k) => {
        const { d, l } = chartSlot(k);
        // Stock lands column by column, today first, each stack from the bottom up.
        return (
          <Actor key={k} track={TRACKS[k]} delay={d * 0.05 + l * 0.015} arrive="drop" exit={toWarehouse}>
            <ChartCrate k={k} />
          </Actor>
        );
      })}
    </>
  );
}

/** The day pointed at, and its label pinned to the top of its column. Its own state: a new day
 *  re-renders the label, not every crate of the chart. */
function DayTag() {
  const [day, setDay] = useState(-1);
  // The last day pointed at stays on the label while it closes.
  const [d, setShown] = useState(-1);
  const onDay = (n: number) => {
    setDay(n);
    if (n >= 0) setShown(n);
  };
  // Line 12 (the last column) is the one whose certificate does not match.
  const short = d === DAYS.length - 1;
  return (
    <>
      <ChartFocus onDay={onDay} />
      <group position={[DAY_X(Math.max(d, 0)), (DAYS[Math.max(d, 0)] + 0.9) * STEP_Y + 0.1, 0]}>
        <ScreenTag
          title={`Line ${6 + Math.max(d, 0)}`}
          value={short ? "Heat H241 · certificate says H214" : "Certificate matches · supported"}
          tone={short ? COLORS.signal : COLORS.inkSoft}
          alert={short}
          rest="none"
          show={() => (d >= 0 ? weight(CH.problem, store.g) : 0)}
          open={() => day >= 0}
        />
      </group>
    </>
  );
}
