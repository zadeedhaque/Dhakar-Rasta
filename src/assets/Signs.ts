import * as THREE from 'three';

/** Bengali-capable font stack. Noto Sans Bengali is bundled locally (offline-safe). */
export const FONT_STACK = '"Noto Sans Bengali", "Nirmala UI", "Vrinda", "Shonar Bangla", "Kohinoor Bangla", sans-serif';

const cache = new Map<string, THREE.MeshBasicMaterial>();
export const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
UNIT_PLANE.userData.shared = true;

/**
 * Canvas-textured signboard material with Bangla text. Cached per
 * (text, colours) so each unique board is uploaded to the GPU once.
 */
export function signMaterial(text: string, bg: string, fg: string, aspect = 3.2): THREE.MeshBasicMaterial {
  const key = `${text}|${bg}|${fg}|${aspect}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = 128;
  const w = Math.round(h * aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  let size = 78;
  g.font = `700 ${size}px ${FONT_STACK}`;
  while (g.measureText(text).width > w - 30 && size > 18) {
    size -= 4;
    g.font = `700 ${size}px ${FONT_STACK}`;
  }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.06);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  cache.set(key, mat);
  return mat;
}

/** A flat sign mesh. ry rotates around Y (0 = faces +Z, i.e. toward an approaching player). */
export function signMesh(text: string, bg: string, fg: string, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(UNIT_PLANE, signMaterial(text, bg, fg, w / h));
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  return m;
}

export const SIGN_COLORS: [string, string][] = [
  ['#c62828', '#ffffff'],
  ['#1565c0', '#ffffff'],
  ['#2e7d32', '#fff59d'],
  ['#f9a825', '#3e2723'],
  ['#ffffff', '#c62828'],
  ['#6a1b9a', '#ffffff'],
  ['#00838f', '#ffffff'],
  ['#ef6c00', '#ffffff'],
];
