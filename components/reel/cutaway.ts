// A section cut through a building, so the camera can look inside without leaving the world:
// everything under `root` is clipped by the given world-space planes (a point is cut away when it
// lies on the negative side of any of them), and the cut faces show as solid section caps.
import * as THREE from "three";

/** The colour of a cut face: a cool grey, like the section edges on the plant's walls. */
const CAP = new THREE.Color("#CDD4DD");

/**
 * Gives every mesh under `root` its own copy of its material, clipped by `planes`. The planes are
 * read every frame, so moving them (changing `constant`) opens and closes the cut.
 *
 * Opaque surfaces are drawn double-sided: through the cut you see the inside of a wall, and its
 * back faces are filled with the cap colour so the cut reads as solid material, not a hollow shell.
 */
export function clipUnder(root: THREE.Object3D, planes: THREE.Plane[]) {
  const done = new Map<THREE.Material, THREE.Material>();
  const cap = `vec3(${CAP.r.toFixed(3)}, ${CAP.g.toFixed(3)}, ${CAP.b.toFixed(3)})`;
  const clip = (m: THREE.Material) => {
    const hit = done.get(m);
    if (hit) return hit;
    const c = m.clone();
    c.clippingPlanes = planes;
    c.clipShadows = true;
    if (!c.transparent) {
      c.side = THREE.DoubleSide;
      c.onBeforeCompile = (s) => {
        s.fragmentShader = s.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
          if (!gl_FrontFacing) gl_FragColor = vec4(${cap}, 1.0);`,
        );
      };
      const key = m.customProgramCacheKey();
      c.customProgramCacheKey = () => `cut-${key}`;
    }
    done.set(m, c);
    return c;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clip) : clip(mesh.material);
  });
}
