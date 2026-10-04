// Real-world materials for the story's models, all generated in code.
// Each surface reads as what it is: paint, rubber, chrome, aluminium, ribbed steel, plastic, glass, concrete.
import * as THREE from "three";

const cache = new Map<string, THREE.Material>();
function memo<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

/* ---------------- Procedural textures ---------------- */

const texCache = new Map<string, THREE.Texture>();
function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, img: ImageData | null) => void, normal = false) {
  let t = texCache.get(key);
  if (t) return t;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  draw(c, null);
  t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = normal ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Normal map from a 1D height profile repeated along one axis (ribs, corrugation, tread). */
function profileNormal(key: string, size: number, height: (u: number) => number, strength = 1, vertical = true) {
  return canvasTex(
    key,
    vertical ? size : 4,
    vertical ? 4 : size,
    (c) => {
      const w = vertical ? size : 4;
      const h = vertical ? 4 : size;
      const img = c.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = vertical ? x : y;
          const u0 = (i - 0.5) / size;
          const u1 = (i + 0.5) / size;
          const slope = ((height(u1) - height(u0)) * size) / 64 * strength;
          const n = new THREE.Vector3(vertical ? -slope : 0, vertical ? 0 : -slope, 1).normalize();
          const o = (y * w + x) * 4;
          img.data[o] = (n.x * 0.5 + 0.5) * 255;
          img.data[o + 1] = (n.y * 0.5 + 0.5) * 255;
          img.data[o + 2] = (n.z * 0.5 + 0.5) * 255;
          img.data[o + 3] = 255;
        }
      c.putImageData(img, 0, 0);
    },
    true,
  );
}

/** Trapezoidal steel cladding / container corrugation, one rib per texture repeat. */
export const corrugation = () =>
  profileNormal("corrugation", 256, (u) => {
    const x = ((u % 1) + 1) % 1;
    // flat crest, sloped flanks, flat valley
    if (x < 0.3) return 1;
    if (x < 0.45) return 1 - (x - 0.3) / 0.15;
    if (x < 0.85) return 0;
    return (x - 0.85) / 0.15;
  }, 6);

/** Fine ribs on moulded plastic (totes) or sectional door panels. */
export const fineRibs = () =>
  profileNormal("ribs", 128, (u) => {
    const x = ((u % 1) + 1) % 1;
    return Math.pow(Math.sin(x * Math.PI), 0.6);
  }, 3.5);

/** Tyre tread: blocks across the tread band. */
export const tread = () =>
  profileNormal("tread", 128, (u) => {
    const x = ((u % 1) + 1) % 1;
    return x < 0.62 ? 1 : 0;
  }, 9, true);

/** Soft concrete / asphalt mottling for roughness. */
export const grain = (key: string, base: number, spread: number) =>
  canvasTex(`grain-${key}`, 256, 256, (c) => {
    const img = c.createImageData(256, 256);
    let s = 1234567;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 256 * 256; i++) {
      const v = Math.max(0, Math.min(255, base + (rnd() - 0.5) * spread));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, true);

/* ---------------- Materials ---------------- */

/** Automotive paint: colour coat under a hard clear coat. */
export const paint = (color: string, rough = 0.32) =>
  memo(`paint-${color}-${rough}`, () =>
    new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06 }),
  );

/** Powder-coated or industrial enamel: satin, no clear coat. */
export const enamel = (color: string, rough = 0.5) =>
  memo(`enamel-${color}-${rough}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.1 }));

export const rubber = () =>
  memo("rubber", () => new THREE.MeshStandardMaterial({ color: "#1E1F22", roughness: 0.88, metalness: 0 }));

export const tyre = () =>
  memo("tyre", () => {
    const t = tread().clone();
    t.repeat.set(1, 1);
    const m = new THREE.MeshStandardMaterial({ color: "#1C1D20", roughness: 0.82, normalMap: t, normalScale: new THREE.Vector2(0.9, 0.9) });
    return m;
  });

export const chrome = () =>
  memo("chrome", () => new THREE.MeshStandardMaterial({ color: "#F1F2F4", roughness: 0.08, metalness: 1 }));

export const aluminium = (rough = 0.32) =>
  memo(`alu-${rough}`, () => new THREE.MeshStandardMaterial({ color: "#C9CCD2", roughness: rough, metalness: 1 }));

export const steel = (color = "#3A3D43", rough = 0.45) =>
  memo(`steel-${color}-${rough}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.65 }));

/** Tinted automotive / architectural glass: dark, glossy, reflects the studio. */
export const darkGlass = () =>
  memo("darkglass", () =>
    new THREE.MeshPhysicalMaterial({ color: "#1B232C", roughness: 0.03, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
  );

/** Shopfront / skylight glass: pale and reflective. */
export const clearGlass = () =>
  memo("clearglass", () =>
    new THREE.MeshPhysicalMaterial({ color: "#C9D9E6", roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5 }),
  );

/** Light lens: emissive behind a clear cover. */
export const lamp = (color: string, power = 1.4) =>
  memo(`lamp-${color}-${power}`, () =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: power, roughness: 0.15 }),
  );

/** Injection-moulded plastic (totes, cases). */
export const plastic = (color: string, rough = 0.5, ribbed = false) =>
  memo(`plastic-${color}-${rough}-${ribbed}`, () => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.15, clearcoatRoughness: 0.5 });
    if (ribbed) {
      m.normalMap = fineRibs();
      m.normalScale = new THREE.Vector2(0.6, 0.6);
    }
    return m;
  });

/** Ribbed steel cladding / container walls. `repeat` = ribs across the UV width. */
export const cladding = (color: string, repeat = 12, rough = 0.48) =>
  memo(`clad-${color}-${repeat}-${rough}`, () => {
    const n = corrugation().clone();
    n.needsUpdate = true;
    n.repeat.set(repeat, 1);
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25, normalMap: n, normalScale: new THREE.Vector2(1, 1) });
  });

export const concrete = (color = "#E2DED6") =>
  memo(`concrete-${color}`, () => {
    const r = grain("concrete", 225, 40).clone();
    r.needsUpdate = true;
    r.repeat.set(3, 3);
    return new THREE.MeshStandardMaterial({ color, roughness: 0.92, roughnessMap: r, metalness: 0 });
  });

export const asphalt = () =>
  memo("asphalt", () => {
    const r = grain("asphalt", 210, 70).clone();
    r.needsUpdate = true;
    r.repeat.set(8, 2);
    return new THREE.MeshStandardMaterial({ color: "#4A4C50", roughness: 0.95, roughnessMap: r });
  });

export const wood = () => memo("wood", () => new THREE.MeshStandardMaterial({ color: "#C9A274", roughness: 0.85 }));

/** Brass for the globe stand. */
export const brass = () => memo("brass", () => new THREE.MeshStandardMaterial({ color: "#D9B36A", roughness: 0.25, metalness: 1 }));

/** Shrink wrap over a loaded pallet. */
export const wrap = () =>
  memo("wrap", () =>
    new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.18, transmission: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false }),
  );
