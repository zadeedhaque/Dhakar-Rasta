import * as THREE from 'three';
import { GeoBuilder } from '../utils/GeoBuilder';

/**
 * Central model registry. Everything is generated procedurally as merged,
 * vertex-coloured low-poly geometry, but the rest of the game only asks for
 * geometry variants by kind. To use proper GLB models later, call
 * `assets.registerVehicleVariants(kind, geometries)` (or the ped / player
 * equivalents) with geometry extracted from your GLB - no game logic changes.
 *
 * Model convention: ground at y=0, centred on origin, FRONT FACES -Z.
 */
export type VehicleKind = 'car' | 'cng' | 'rickshaw' | 'battery' | 'motorcycle' | 'bus' | 'truck';

export const DIMS: Record<VehicleKind, { halfW: number; halfL: number }> = {
  car: { halfW: 0.92, halfL: 2.1 },
  cng: { halfW: 0.76, halfL: 1.4 },
  rickshaw: { halfW: 0.55, halfL: 1.35 },
  battery: { halfW: 0.8, halfL: 1.45 },
  motorcycle: { halfW: 0.42, halfL: 1.0 },
  bus: { halfW: 1.35, halfL: 5.0 },
  truck: { halfW: 1.25, halfL: 3.4 },
};

const GLASS = 0x1d2a33;
const HEADLIGHT = 0xfff1b5;
const TAILLIGHT = 0xe52222;
const RICK_COLORS = [0xd7263d, 0x1b6ca8, 0x2e933c, 0xf2b705, 0xe86a92, 0xff7f11, 0x7d3cff];
const SKIN = [0xc68642, 0xa9743b, 0x8d5524, 0xd9a066, 0x6f4518];
const SHIRTS = [0xd94f3d, 0x3b7dd8, 0x3aa56a, 0xf0c33c, 0xffffff, 0x8e44ad, 0xe67e22, 0x5dade2, 0xe8d9b5, 0x16a085, 0xc0392b];
const PANTS = [0x4a5d78, 0x5b6b80, 0x7a6248, 0x8a7a5c, 0x4f7a6a];
const LUNGI = [0x2e6f9e, 0x7a3b3b, 0x3d7a4f, 0x6b5b95];
const SAREE = [0xd62839, 0x1f7a8c, 0xf4a259, 0x6a4c93, 0x2a9d8f, 0xe76f51, 0x3a86ff];

const rp = <T,>(a: readonly T[], i: number): T => a[i % a.length];
const rnd = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

function wheelSet(b: GeoBuilder, pts: [number, number, number][], r: number, w: number) {
  for (const [x, y, z] of pts) b.wheel(x, y, z, r, w);
}

// ---------------------------------------------------------------- cars
function buildCar(body: number, taxi = false): THREE.BufferGeometry {
  const b = new GeoBuilder();
  wheelSet(b, [[-0.82, 0.32, -1.3], [0.82, 0.32, -1.3], [-0.82, 0.32, 1.3], [0.82, 0.32, 1.3]], 0.32, 0.24);
  b.box(0, 0.58, 0, 1.8, 0.5, 4.2, body);
  b.box(0, 1.08, 0.35, 1.56, 0.52, 2.1, body);
  b.box(0, 1.1, 0.35, 1.6, 0.34, 1.86, GLASS);
  b.box(0, 1.1, -0.72, 1.4, 0.36, 0.06, GLASS);
  b.box(0, 1.36, 0.35, 1.5, 0.07, 2.0, body);
  b.box(-0.6, 0.62, -2.1, 0.36, 0.14, 0.05, HEADLIGHT);
  b.box(0.6, 0.62, -2.1, 0.36, 0.14, 0.05, HEADLIGHT);
  b.box(-0.62, 0.66, 2.1, 0.4, 0.14, 0.05, TAILLIGHT);
  b.box(0.62, 0.66, 2.1, 0.4, 0.14, 0.05, TAILLIGHT);
  b.box(0, 0.38, -2.1, 1.8, 0.14, 0.1, 0x2a2a2a);
  b.box(0, 0.38, 2.1, 1.8, 0.14, 0.1, 0x2a2a2a);
  b.box(0, 0.52, 2.12, 0.5, 0.14, 0.02, 0xf4f4f4);
  if (taxi) b.box(0, 1.46, 0.35, 0.5, 0.13, 0.22, 0xffffff);
  return b.build();
}

export function buildPlayerCar(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const body = 0xb3242b;
  wheelSet(b, [[-0.84, 0.33, -1.35], [0.84, 0.33, -1.35], [-0.84, 0.33, 1.35], [0.84, 0.33, 1.35]], 0.33, 0.26);
  b.box(0, 0.6, 0, 1.86, 0.52, 4.3, body);
  b.box(0, 1.1, 0.4, 1.6, 0.54, 2.2, body);
  b.box(0, 1.12, 0.4, 1.64, 0.36, 1.96, GLASS);
  b.box(0, 1.12, -0.75, 1.44, 0.38, 0.06, GLASS);
  b.box(0, 1.39, 0.4, 1.56, 0.08, 2.1, 0xf1e6cf);
  b.box(0, 0.9, 2.16, 1.3, 0.08, 0.05, 0x7a1519);
  b.box(-0.6, 0.64, -2.15, 0.38, 0.14, 0.05, HEADLIGHT);
  b.box(0.6, 0.64, -2.15, 0.38, 0.14, 0.05, HEADLIGHT);
  b.box(0, 0.38, 2.16, 1.86, 0.14, 0.1, 0x222222);
  b.box(0, 0.38, -2.16, 1.86, 0.14, 0.1, 0x222222);
  b.box(0, 0.52, 2.2, 0.5, 0.14, 0.02, 0xf4f4f4);
  return b.build();
}

/** Player tail lights are a separate mesh so they can glow when braking. */
export function buildPlayerTailLights(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.box(-0.62, 0.68, 2.17, 0.46, 0.16, 0.06, 0xffffff);
  b.box(0.62, 0.68, 2.17, 0.46, 0.16, 0.06, 0xffffff);
  return b.build();
}

// ---------------------------------------------------------------- CNG
function buildCNG(body: number, trim: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.wheel(0, 0.28, -1.0, 0.28, 0.16);
  b.wheel(-0.68, 0.28, 0.8, 0.28, 0.18);
  b.wheel(0.68, 0.28, 0.8, 0.28, 0.18);
  b.box(0, 0.62, 0.25, 1.4, 0.55, 1.9, body);
  b.box(0, 0.78, -0.9, 0.85, 0.7, 0.7, body);
  b.box(0, 0.5, 0.25, 1.42, 0.12, 1.92, trim);
  for (const sx of [-0.66, 0.66]) {
    b.box(sx, 1.25, -0.55, 0.06, 1.0, 0.06, 0x1a1a1a);
    b.box(sx, 1.2, 1.1, 0.06, 0.95, 0.06, 0x1a1a1a);
    b.box(sx, 1.15, 0.28, 0.04, 0.8, 1.5, 0x232323);
  }
  b.box(0, 1.75, 0.3, 1.5, 0.1, 2.05, 0x161c17);
  b.box(0, 1.35, -0.58, 1.3, 0.8, 0.05, 0xa8cfdc);
  b.box(0, 0.95, 0.6, 1.1, 0.2, 0.75, 0x3a2a20);
  b.box(0, 1.2, 1.12, 1.1, 0.5, 0.1, 0x3a2a20);
  b.sphere(0, 1.45, -0.15, 0.26, 0.28, 0.26, rnd(SKIN));
  b.box(0, 1.1, -0.15, 0.4, 0.5, 0.25, rnd(SHIRTS));
  b.box(0, 0.88, -1.27, 0.26, 0.2, 0.05, HEADLIGHT);
  b.box(-0.55, 0.72, 1.22, 0.2, 0.14, 0.05, TAILLIGHT);
  b.box(0.55, 0.72, 1.22, 0.2, 0.14, 0.05, TAILLIGHT);
  return b.build();
}

// ---------------------------------------------------------------- rickshaw (pedal)
function buildRickshaw(hood: number, accent: number, panel: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.wheel(-0.5, 0.42, 0.5, 0.42, 0.05);
  b.wheel(0.5, 0.42, 0.5, 0.42, 0.05);
  b.wheel(0, 0.34, -1.05, 0.34, 0.05);
  b.box(0, 0.62, -0.25, 0.07, 0.07, 1.5, 0x2b2b2b);
  b.box(0, 0.5, -1.0, 0.05, 0.5, 0.05, 0x2b2b2b);
  b.box(0, 0.56, 0.5, 0.95, 0.06, 0.9, 0x3a3a3a);
  b.box(0, 0.78, 0.55, 0.85, 0.24, 0.75, 0x8b2e2e);
  b.box(0, 1.05, 0.92, 0.85, 0.46, 0.1, 0x8b2e2e);
  b.box(0, 1.62, 0.55, 1.0, 0.07, 1.0, hood, -0.22);
  b.box(0, 1.66, 0.0, 1.02, 0.12, 0.06, accent, -0.22);
  for (const sx of [-0.46, 0.46]) b.box(sx, 1.3, 0.5, 0.04, 0.6, 0.04, 0x333333);
  b.box(0, 0.98, 1.02, 0.92, 0.7, 0.06, panel);
  b.box(0, 0.98, 1.06, 0.52, 0.38, 0.02, accent);
  b.sphere(0, 1.62, -0.32, 0.27, 0.3, 0.27, rnd(SKIN));
  b.box(0, 1.2, -0.32, 0.4, 0.55, 0.25, rnd(SHIRTS));
  b.box(-0.12, 0.78, -0.3, 0.13, 0.5, 0.15, rnd(LUNGI));
  b.box(0.12, 0.78, -0.3, 0.13, 0.5, 0.15, rnd(LUNGI));
  b.box(0, 1.02, -0.88, 0.72, 0.05, 0.05, 0x2b2b2b);
  return b.build();
}

// ---------------------------------------------------------------- battery rickshaw
function buildBattery(roof: number, curtain: number, chassis: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.wheel(0, 0.3, -1.15, 0.3, 0.16);
  b.wheel(-0.7, 0.3, 0.85, 0.3, 0.2);
  b.wheel(0.7, 0.3, 0.85, 0.3, 0.2);
  b.box(0, 0.58, 0.1, 1.45, 0.3, 2.7, chassis);
  b.box(0, 0.9, -1.0, 0.9, 0.7, 0.7, chassis);
  for (const sx of [-0.7, 0.7]) {
    b.box(sx, 1.4, -0.45, 0.06, 1.3, 0.06, 0x2a2a2a);
    b.box(sx, 1.4, 1.35, 0.06, 1.3, 0.06, 0x2a2a2a);
    b.box(sx, 1.15, 0.45, 0.03, 0.7, 1.7, curtain);
  }
  b.box(0, 2.08, 0.45, 1.6, 0.1, 2.15, roof);
  b.box(0, 2.0, -0.62, 1.6, 0.12, 0.08, 0xffe45c);
  b.box(0, 1.5, -0.68, 1.3, 0.75, 0.05, 0xa8cfdc);
  b.box(0, 0.95, 0.75, 1.2, 0.22, 0.9, 0x3d3d46);
  b.box(0, 1.3, 1.34, 1.2, 0.5, 0.1, 0x3d3d46);
  b.sphere(0, 1.55, -0.95, 0.26, 0.28, 0.26, rnd(SKIN));
  b.box(0, 1.2, -0.95, 0.4, 0.5, 0.25, rnd(SHIRTS));
  b.box(0, 0.98, -1.5, 0.3, 0.2, 0.05, HEADLIGHT);
  b.box(-0.6, 0.7, 1.46, 0.22, 0.14, 0.05, TAILLIGHT);
  b.box(0.6, 0.7, 1.46, 0.22, 0.14, 0.05, TAILLIGHT);
  b.sphere(-0.25, 1.48, 0.75, 0.24, 0.26, 0.24, rnd(SKIN));
  b.sphere(0.25, 1.48, 0.75, 0.24, 0.26, 0.24, rnd(SKIN));
  return b.build();
}

// ---------------------------------------------------------------- motorcycle + rider
function buildMotorcycle(bike: number, shirt: number, helmet: number | null): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.wheel(0, 0.33, -0.7, 0.33, 0.14);
  b.wheel(0, 0.33, 0.7, 0.33, 0.14);
  b.box(0, 0.62, 0.0, 0.3, 0.32, 1.1, bike);
  b.box(0, 0.88, -0.1, 0.32, 0.18, 0.55, bike);
  b.box(0, 0.85, 0.5, 0.3, 0.12, 0.5, 0x222222);
  b.box(0, 1.08, -0.55, 0.72, 0.06, 0.06, 0x2b2b2b);
  b.box(0, 0.8, -0.85, 0.06, 0.55, 0.06, 0x888888);
  b.box(0, 0.7, -0.98, 0.18, 0.14, 0.05, HEADLIGHT);
  b.box(0, 0.78, 1.0, 0.2, 0.1, 0.05, TAILLIGHT);
  b.box(-0.14, 0.82, 0.35, 0.14, 0.5, 0.2, rnd(PANTS));
  b.box(0.14, 0.82, 0.35, 0.14, 0.5, 0.2, rnd(PANTS));
  b.box(0, 1.3, 0.25, 0.44, 0.6, 0.26, shirt, -0.2);
  b.box(-0.28, 1.2, -0.1, 0.1, 0.1, 0.55, shirt);
  b.box(0.28, 1.2, -0.1, 0.1, 0.1, 0.55, shirt);
  if (helmet !== null) {
    b.sphere(0, 1.78, 0.18, 0.4, 0.38, 0.42, helmet);
    b.box(0, 1.74, 0.0, 0.3, 0.12, 0.04, 0x222222);
  } else {
    b.sphere(0, 1.76, 0.18, 0.28, 0.3, 0.28, rnd(SKIN));
    b.sphere(0, 1.88, 0.2, 0.3, 0.16, 0.3, 0x141414);
  }
  return b.build();
}

// ---------------------------------------------------------------- bus & truck
function buildBus(body: number, stripe: number, roof: number, double: boolean): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const h = double ? 4.2 : 3.0;
  wheelSet(b, [[-1.2, 0.55, -3.3], [1.2, 0.55, -3.3], [-1.2, 0.55, 3.3], [1.2, 0.55, 3.3]], 0.55, 0.36);
  b.box(0, 0.3 + (h - 0.3) / 2, 0, 2.5, h - 0.3, 10, body);
  const bands = double ? [2.0, 3.45] : [2.1];
  for (const y of bands) {
    b.box(0, y, 0, 2.54, double ? 0.78 : 1.0, 8.8, GLASS);
    b.box(0, y, -5.02, 2.2, double ? 0.78 : 1.0, 0.05, GLASS);
    b.box(0, y, 5.02, 2.0, double ? 0.7 : 0.9, 0.05, GLASS);
  }
  b.box(0, 1.0, 0, 2.52, 0.28, 10.02, stripe);
  b.box(0, h + 0.05, 0, 2.3, 0.1, 9.7, roof);
  b.box(-0.9, 0.72, -5.02, 0.36, 0.2, 0.05, HEADLIGHT);
  b.box(0.9, 0.72, -5.02, 0.36, 0.2, 0.05, HEADLIGHT);
  b.box(-0.9, 0.82, 5.02, 0.36, 0.2, 0.05, TAILLIGHT);
  b.box(0.9, 0.82, 5.02, 0.36, 0.2, 0.05, TAILLIGHT);
  b.box(0, 0.45, -5.03, 2.55, 0.25, 0.1, 0x333333);
  b.box(0, 0.45, 5.03, 2.55, 0.25, 0.1, 0x333333);
  b.box(0, h - 0.25, -5.03, 1.8, 0.25, 0.04, 0xffe9a0);
  // patched panels: Dhaka buses are rarely pristine
  b.box(1.26, 1.7, 1.2, 0.04, 0.5, 1.4, stripe);
  b.box(-1.26, 1.7, -1.5, 0.04, 0.5, 1.4, stripe);
  return b.build();
}

function buildTruck(cab: number, load: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  wheelSet(b, [[-1.05, 0.5, -2.2], [1.05, 0.5, -2.2], [-1.05, 0.5, 1.4], [1.05, 0.5, 1.4], [-1.05, 0.5, 2.5], [1.05, 0.5, 2.5]], 0.5, 0.32);
  b.box(0, 1.3, -2.3, 2.3, 1.6, 1.6, cab);
  b.box(0, 1.75, -3.12, 2.0, 0.7, 0.05, GLASS);
  b.box(0, 0.75, 0.5, 2.3, 0.4, 6.4, 0x2d2d2d);
  b.box(0, 1.3, 1.0, 2.4, 0.15, 4.8, 0x6b4b2a);
  b.box(0, 2.15, 1.0, 2.3, 1.4, 4.6, load);
  b.box(0, 2.9, 1.0, 1.9, 0.3, 4.2, load);
  b.box(-0.8, 0.9, -3.12, 0.4, 0.2, 0.05, HEADLIGHT);
  b.box(0.8, 0.9, -3.12, 0.4, 0.2, 0.05, HEADLIGHT);
  b.box(-0.8, 0.95, 3.42, 0.4, 0.2, 0.05, TAILLIGHT);
  b.box(0.8, 0.95, 3.42, 0.4, 0.2, 0.05, TAILLIGHT);
  return b.build();
}

// ---------------------------------------------------------------- people
export interface PedLook {
  type: 'man' | 'woman' | 'child' | 'burqa' | 'police' | 'vendor';
  shirt: number;
  pants: number;
  skin: number;
  extra: number; // hair / cap / headscarf
}

export function buildPerson(l: PedLook): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const k = l.type === 'child' ? 0.68 : 1;
  const dress = l.type === 'woman' || l.type === 'burqa';
  if (dress) {
    b.cone(0, 0.62 * k, 0, 0.62 * k, 1.25 * k, 0.45 * k, l.shirt);
    b.box(0, 1.28 * k, 0, 0.42 * k, 0.5 * k, 0.24 * k, l.shirt);
  } else {
    const legs = l.type === 'vendor' ? rp(LUNGI, 1) : l.pants;
    b.box(-0.1 * k, 0.45 * k, 0, 0.16 * k, 0.9 * k, 0.2 * k, legs);
    b.box(0.1 * k, 0.45 * k, 0, 0.16 * k, 0.9 * k, 0.2 * k, legs);
    b.box(0, 1.2 * k, 0, 0.46 * k, 0.6 * k, 0.26 * k, l.shirt);
  }
  b.box(-0.3 * k, 1.2 * k, 0, 0.12 * k, 0.55 * k, 0.14 * k, l.shirt);
  b.box(0.3 * k, 1.2 * k, 0, 0.12 * k, 0.55 * k, 0.14 * k, l.shirt);
  b.sphere(0, 1.68 * k, 0, 0.27 * k, 0.3 * k, 0.27 * k, l.type === 'burqa' ? l.shirt : l.skin);
  if (l.type === 'woman' || l.type === 'burqa') b.sphere(0, 1.7 * k, 0.03 * k, 0.33 * k, 0.34 * k, 0.32 * k, l.extra);
  else if (l.type === 'police') {
    b.cyl(0, 1.84 * k, 0, 0.17 * k, 0.12 * k, 0x1f2a44);
    b.box(0, 1.77 * k, -0.14 * k, 0.3 * k, 0.03, 0.14 * k, 0x1f2a44);
  } else if (l.type === 'man' && l.extra === 0xffffff) b.cyl(0, 1.86 * k, 0, 0.14 * k, 0.1 * k, 0xffffff); // topi
  else b.sphere(0, 1.78 * k, 0.02 * k, 0.28 * k, 0.16 * k, 0.28 * k, l.extra);
  if (l.type === 'police') b.box(0, 1.25 * k, -0.14 * k, 0.5 * k, 0.06, 0.02, 0xc9b458);
  return b.build();
}

class AssetManager {
  private vehicles = new Map<VehicleKind, THREE.BufferGeometry[]>();
  private peds: THREE.BufferGeometry[] | null = null;
  private police: THREE.BufferGeometry | null = null;
  private player: THREE.BufferGeometry | null = null;

  /** Replace generated geometry with real models (e.g. from GLB). */
  registerVehicleVariants(kind: VehicleKind, geos: THREE.BufferGeometry[]): void {
    this.vehicles.set(kind, geos);
  }
  registerPedVariants(geos: THREE.BufferGeometry[]): void {
    this.peds = geos;
  }
  registerPlayerGeometry(g: THREE.BufferGeometry): void {
    this.player = g;
  }

  vehicleVariants(kind: VehicleKind): THREE.BufferGeometry[] {
    let v = this.vehicles.get(kind);
    if (!v) {
      v = this.generateVehicle(kind);
      this.vehicles.set(kind, v);
    }
    return v;
  }

  playerGeometry(): THREE.BufferGeometry {
    return (this.player ??= buildPlayerCar());
  }

  pedVariants(): THREE.BufferGeometry[] {
    if (!this.peds) {
      const list: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 18; i++) {
        const r = i % 6;
        const type: PedLook['type'] = r === 3 ? 'woman' : r === 4 ? 'child' : r === 5 && i > 10 ? 'woman' : 'man';
        const topi = i % 4 === 0;
        list.push(
          buildPerson({
            type,
            shirt: type === 'woman' ? rp(SAREE, i) : rp(SHIRTS, i * 3),
            pants: rp(PANTS, i),
            skin: rp(SKIN, i * 2),
            extra: type === 'woman' ? rp(SAREE, i + 2) : topi ? 0xffffff : 0x1a1410,
          }),
        );
      }
      for (let i = 0; i < 4; i++)
        list.push(buildPerson({ type: 'vendor', shirt: rp(SHIRTS, i + 5), pants: 0x333333, skin: rp(SKIN, i), extra: 0x1a1410 }));
      this.peds = list;
    }
    return this.peds;
  }
  /** Vendors are the last 4 ped variants. */
  vendorIndex(): number {
    return this.pedVariants().length - 4 + Math.floor(Math.random() * 4);
  }
  policeGeometry(): THREE.BufferGeometry {
    return (this.police ??= buildPerson({ type: 'police', shirt: 0xb7a97a, pants: 0x3e4a3a, skin: 0xb9824a, extra: 0x1a1410 }));
  }

  private generateVehicle(kind: VehicleKind): THREE.BufferGeometry[] {
    const out: THREE.BufferGeometry[] = [];
    switch (kind) {
      case 'car':
        for (const c of [0xf2c230, 0xf2c230, 0xf5f5f5, 0xc9ccd1, 0x2b4a8b, 0x111111, 0x8a1f2d, 0x5d7f6a]) out.push(buildCar(c, c === 0xf2c230));
        break;
      case 'cng':
        out.push(buildCNG(0x1f8a45, 0xf2c230), buildCNG(0x2a9d55, 0x1a1a1a), buildCNG(0x1b7f9e, 0xe8e8e8));
        break;
      case 'rickshaw':
        for (let i = 0; i < 10; i++) out.push(buildRickshaw(rp(RICK_COLORS, i), rp(RICK_COLORS, i + 2), rp(RICK_COLORS, i + 4)));
        break;
      case 'battery':
        out.push(
          buildBattery(0x2f6fdf, 0xffd23c, 0x2b2b30),
          buildBattery(0xf2b705, 0x2e933c, 0x1f4aa0),
          buildBattery(0x2e933c, 0xd7263d, 0x333333),
          buildBattery(0xd7263d, 0x2f6fdf, 0x2a2a2a),
        );
        break;
      case 'motorcycle':
        for (let i = 0; i < 10; i++) {
          const helmet = i % 2 === 0 ? rp(RICK_COLORS, i) : null; // half ride without a helmet (visual only)
          out.push(buildMotorcycle(rp([0xb3242b, 0x1b1b1b, 0x1f5fa6, 0xc9c9c9, 0x2e7d32], i), rp(SHIRTS, i * 2), helmet));
        }
        break;
      case 'bus':
        out.push(
          buildBus(0xc8302f, 0x1f7a3a, 0xe9e9e9, true), // BRTC-style double decker
          buildBus(0xc8302f, 0x1f7a3a, 0xe9e9e9, false),
          buildBus(0x2f6fdf, 0xf5f5f5, 0xdcdcdc, false),
          buildBus(0xf2b705, 0xd7263d, 0xe0e0e0, false),
          buildBus(0x2e933c, 0xf5f5f5, 0xd8d8d8, false),
          buildBus(0xe8d9b5, 0x8b2e2e, 0xcfcfcf, false),
        );
        break;
      case 'truck':
        out.push(buildTruck(0xf2b705, 0xe67e22), buildTruck(0x2e933c, 0x8a8f94), buildTruck(0xd7263d, 0xc9a96e));
        break;
    }
    return out;
  }
}

export const assets = new AssetManager();
export const PALETTE = { RICK_COLORS, SHIRTS, SKIN, SAREE, LUNGI };
