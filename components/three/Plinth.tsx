"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CH, INDUSTRIES, INDUSTRY_TONE, localIn, smoothstep, store, weight } from "@/lib/story";
import { industryF, PLINTH_H } from "@/lib/layouts";
import { COLORS, TINTS } from "./palette";

// Each industry's glaze: its accent deepened toward ink, so the white engraving still reads.
const GLAZE = INDUSTRY_TONE.map((t) => new THREE.Color(COLORS.ink).lerp(new THREE.Color(TINTS[t]), 0.42));

const R = 2.15;
const STEP = (Math.PI * 2) / INDUSTRIES.length;

/** Every industry engraved around the rim, each one centred on its own sixth of the circle. */
function drawRim(canvas: HTMLCanvasElement, family: string) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const radius = size * 0.425;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = COLORS.inkOnDark;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.038)}px ${family}`;

  INDUSTRIES.forEach((ind, k) => {
    const word = ind.name.toUpperCase();
    const spacing = size * 0.006;
    const widths = [...word].map((ch) => ctx.measureText(ch).width + spacing);
    const total = widths.reduce((s, w) => s + w, 0);
    // α = 0 is the front edge. Characters run left to right as seen from the front.
    let a = -k * STEP + total / radius / 2;
    [...word].forEach((ch, i) => {
      a -= widths[i] / radius / 2;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(a);
      ctx.translate(0, radius);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a -= widths[i] / radius / 2;
    });
    // A small diamond between industries, as on Agrumea's rim.
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-k * STEP - STEP / 2);
    ctx.translate(0, radius);
    ctx.rotate(Math.PI / 4);
    const d = size * 0.007;
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  });

  // Hairlines framing the type.
  ctx.strokeStyle = "rgba(255,253,248,0.3)";
  ctx.lineWidth = size * 0.0012;
  [0.385, 0.465].forEach((r) => {
    ctx.beginPath();
    ctx.arc(c, c, size * r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function Plinth() {
  const group = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const body = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: COLORS.plinth,
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.45,
        transparent: true,
      }),
    [],
  );
  const { texture, canvas } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2048;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { texture, canvas };
  }, []);
  const typeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
    [texture],
  );

  useEffect(() => {
    const el = document.querySelector(".display");
    const family = el ? getComputedStyle(el).fontFamily : "Georgia, serif";
    document.fonts.ready.then(() => {
      drawRim(canvas, family);
      texture.needsUpdate = true;
    });
  }, [canvas, texture]);

  useFrame(() => {
    const w = weight(CH.industries, store.g);
    const g = group.current;
    if (!g || !top.current) return;
    g.visible = w > 0.01;
    const leaving = store.g > CH.industries + 0.5;
    // Rises into place; on the way out it sinks and clears early, so the card can lie down above it.
    const appear = leaving ? smoothstep(0.35, 1, w) : smoothstep(0, 1, w);
    body.opacity = appear;
    body.depthWrite = appear > 0.9;
    typeMat.opacity = smoothstep(0.5, 1, w) * appear;
    g.position.y = (appear - 1) * (leaving ? 0.6 : 0.08);
    // The rim turns with the object: the active industry always sits at the front.
    const f = industryF(localIn(CH.industries, store.g));
    top.current.rotation.y = -f * STEP;
    // The glaze turns with the rim, blending between neighbouring industries.
    const i = Math.min(Math.floor(f), GLAZE.length - 1);
    body.color.lerpColors(GLAZE[i], GLAZE[Math.min(i + 1, GLAZE.length - 1)], f - i);
  });

  return (
    <group ref={group} visible={false}>
      <mesh position-y={PLINTH_H / 2} material={body} receiveShadow castShadow>
        <cylinderGeometry args={[R, R, PLINTH_H, 160, 1]} />
      </mesh>
      <group ref={top} position-y={PLINTH_H + 0.0015}>
        <mesh rotation-x={-Math.PI / 2} material={typeMat}>
          <circleGeometry args={[R, 160]} />
        </mesh>
      </group>
    </group>
  );
}
