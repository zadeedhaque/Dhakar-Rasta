import * as THREE from 'three';
import { GeoBuilder } from '../utils/GeoBuilder';
import { chance, pick, rand, randInt } from '../utils/math';
import { signMesh, SIGN_COLORS } from '../assets/Signs';
import { T } from '../i18n/bn';
import { CFG } from '../game/GameConfig';
import type { RoadSegment } from './RoadSegment';
import { PALETTE } from '../assets/Models';

/**
 * Reusable decoration builders. All write into one GeoBuilder per segment so a
 * whole 100 m chunk of Dhaka renders in a handful of draw calls.
 * World mapping: s (forward) -> z = -s.
 */
export const Z = (s: number) => -s;

export interface DecorCtx {
  b: GeoBuilder;
  wires: number[];
  seg: RoadSegment;
}

const W = CFG.world;
const FACADES = [0xe8dcc4, 0xd9cbb0, 0xcfd6d8, 0xe0b8a0, 0xd8e0c0, 0xbfb6a8, 0xf0e2b8, 0xc9a98c, 0xa9b8c4, 0xe6c9c9, 0xd4c4a8];
const AWNINGS = [0x1b6ca8, 0xd7263d, 0x2e933c, 0xf2b705, 0x5a5a5a, 0xe67e22];
const GOODS = [0xd7263d, 0x1b6ca8, 0x2e933c, 0xf2b705, 0xe86a92, 0xffffff, 0x8e44ad, 0xff7f11];

export function addSign(seg: RoadSegment, text: string, w: number, h: number, x: number, y: number, s: number, ry = 0, colors?: [string, string]) {
  const [bg, fg] = colors ?? pick(SIGN_COLORS);
  seg.group.add(signMesh(text, bg, fg, w, h, x, y, Z(s), ry));
}

// ------------------------------------------------------------------ road
export function buildRoadBase(ctx: DecorCtx, opts: { dirty?: boolean } = {}) {
  const { b, seg } = ctx;
  const s0 = seg.s0;
  const L = seg.length;
  const zc = Z(s0 + L / 2);
  b.box(0, -0.05, zc, W.roadHalfWidth * 2 + 0.8, 0.1, L, opts.dirty ? 0x4a4640 : 0x3d3d40);
  // asphalt patches & potholes
  for (let i = 0; i < 7; i++) {
    const shade = chance(0.5) ? 0x333336 : 0x48484a;
    b.box(rand(-6, 6), 0.004, Z(s0 + rand(3, L - 3)), rand(1, 3.5), 0.006, rand(1, 5), opts.dirty && chance(0.6) ? 0x6b5a45 : shade);
  }
  // lane markings
  for (const lx of [-W.laneWidth, 0, W.laneWidth]) {
    for (let s = s0 + 1; s < s0 + L - 2; s += 9) b.box(lx, 0.008, Z(s + 1.5), 0.14, 0.012, 3, lx === 0 ? 0xe9c94a : 0xe6e6dc);
  }
  for (const side of [-1, 1]) {
    b.box(side * (W.roadHalfWidth - 0.2), 0.008, zc, 0.14, 0.012, L, 0xe6e6dc);
    // kerb: Dhaka-style painted black/yellow blocks
    for (let s = s0; s < s0 + L; s += 2) {
      b.box(side * (W.roadHalfWidth + 0.2), 0.13, Z(s + 1), 0.4, 0.26, 2, (Math.floor(s / 2) & 1) === 0 ? 0xe6c229 : 0x222222);
    }
    // footpath
    const fpW = W.footpathOuter - W.footpathInner;
    const paving = seg.index % 3 === 0 ? 0xa0614f : 0x9b978d;
    b.box(side * (W.footpathInner + fpW / 2), 0.1, zc, fpW, 0.2, L, paving);
    for (let i = 0; i < 4; i++) b.box(side * rand(W.footpathInner + 0.4, W.footpathOuter - 0.4), 0.205, Z(s0 + rand(2, L - 2)), rand(0.6, 1.5), 0.01, rand(0.6, 2), 0x7f7a70);
    // ground under buildings
    b.box(side * (W.footpathOuter + 25), 0.0, zc, 50, 0.1, L, 0x6d665c);
  }
}

// ------------------------------------------------------------------ buildings
export function building(ctx: DecorCtx, side: number, sStart: number, w: number, floors: number, opts: { glass?: boolean; signChance?: number }) {
  const { b, seg } = ctx;
  const front = W.footpathOuter + 0.3;
  const depth = rand(9, 13);
  const H = 4 + floors * 3.1;
  const mid = sStart + w / 2;
  const color = opts.glass ? pick([0x5d8aa8, 0x4f7f7a, 0x6c8ea0]) : pick(FACADES);
  b.box(side * (front + depth / 2), H / 2, Z(mid), depth, H, w - 0.2, color);
  // parapet / roof edge
  b.box(side * (front + 0.15), H + 0.35, Z(mid), 0.3, 0.7, w - 0.2, 0xb8b0a2);
  // ground-floor shop front
  const fx = side * (front - 0.03);
  const open = chance(0.65);
  b.box(fx, 1.75, Z(mid), 0.06, 3.1, w - 1.0, open ? 0x2e241d : 0x8f9396);
  if (open) {
    for (let i = 0; i < 4; i++) b.box(side * (front - 0.35), rand(0.4, 1.6), Z(mid + rand(-w / 2 + 1, w / 2 - 1)), 0.5, rand(0.4, 1.0), rand(0.4, 0.9), pick(GOODS));
  } else {
    for (let y = 0.6; y < 3.2; y += 0.35) b.box(side * (front - 0.06), y, Z(mid), 0.02, 0.05, w - 1.0, 0x6f7275);
  }
  b.box(side * (front - 0.45), 3.3, Z(mid), 0.9, 0.08, w - 0.5, pick(AWNINGS), 0, 0, side * 0.25);
  // upper floors
  const balcony = !opts.glass && chance(0.55);
  const nWin = Math.max(1, Math.floor((w - 1.2) / 2.6));
  const spacing = (w - 0.6) / nWin;
  for (let f = 0; f < floors; f++) {
    const y = 4 + f * 3.1 + 1.4;
    if (opts.glass) {
      b.box(side * (front - 0.02), y, Z(mid), 0.05, 2.4, w - 0.8, 0x2c4a5e);
      continue;
    }
    for (let i = 0; i < nWin; i++) {
      const ws = sStart + 0.3 + spacing * (i + 0.5);
      b.box(side * (front - 0.02), y, Z(ws), 0.06, 1.35, 1.4, 0x27313c);
      if (chance(0.12)) b.box(side * (front - 0.3), y - 0.9, Z(ws), 0.5, 0.45, 0.7, 0xe8e8e8); // AC unit
    }
    if (balcony) {
      b.box(side * (front - 0.4), y - 0.85, Z(mid), 0.8, 0.12, w - 0.8, 0xbdb6aa);
      b.box(side * (front - 0.78), y - 0.4, Z(mid), 0.05, 0.8, w - 0.8, chance(0.5) ? 0x3c3c3c : 0x4f6b5a);
    }
  }
  if (chance(0.65)) b.cyl(side * (front + rand(2, depth - 2)), H + 0.8, Z(mid + rand(-w / 4, w / 4)), 0.7, 1.4, 0x1d1d1d); // rooftop water tank
  // signboards
  if (chance(opts.signChance ?? 0.7)) {
    addSign(seg, pick(T.signs), Math.min(w - 1.2, 6), 1.0, side * (front - 0.1), 3.95, mid, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  if (chance(0.35)) addSign(seg, pick(T.signs), 2.6, 0.85, side * (front - 1.5), rand(5.2, 8.5), mid, 0);
}

export function buildBuildingRow(ctx: DecorCtx, side: number, opts: { tall?: boolean; glassChance?: number; signChance?: number } = {}) {
  const { seg } = ctx;
  let s = seg.s0;
  while (s < seg.s1 - 1) {
    let w = opts.tall ? rand(10, 18) : rand(7, 14);
    if (s + w > seg.s1 - 2.5) w = seg.s1 - s;
    if (w < 2.5) break;
    const glass = chance(opts.glassChance ?? 0);
    const floors = opts.tall ? randInt(5, 10) : randInt(2, 7);
    building(ctx, side, s, w, glass ? floors + 3 : floors, { glass, signChance: opts.signChance });
    s += w + (chance(0.15) ? rand(1.5, 3) : 0); // occasional alley gap
  }
}

// ------------------------------------------------------------------ poles, wires, lights
const POLE_X = W.roadHalfWidth + 0.75;

function sagWire(wires: number[], x0: number, y0: number, s0: number, x1: number, y1: number, s1: number, sag: number, clip0: number, clip1: number) {
  const steps = 6;
  let px = 0, py = 0, ps = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const s = s0 + (s1 - s0) * t;
    const y = y0 + (y1 - y0) * t - sag * 4 * t * (1 - t);
    if (i > 0 && ps >= clip0 - 1e-3 && s <= clip1 + 1e-3 && ps <= clip1 + 1e-3 && s >= clip0 - 1e-3) {
      wires.push(px, py, Z(ps), x, y, Z(s));
    }
    px = x; py = y; ps = s;
  }
}

/** Concrete utility poles with the famous tangle of Dhaka overhead wires. */
export function buildPolesAndWires(ctx: DecorCtx) {
  const { b, wires, seg } = ctx;
  for (const side of [-1, 1]) {
    const x = side * POLE_X;
    for (let s = seg.s0 + 12.5; s < seg.s1; s += 25) {
      b.box(x, 4.6, Z(s), 0.3, 9.2, 0.3, 0x9d9a90);
      b.box(x, 8.5, Z(s), 1.6, 0.14, 0.14, 0x6e6e6e);
      if (chance(0.3)) b.box(x + side * 0.4, 6.6, Z(s), 0.7, 1.0, 0.6, 0x5b5f61); // transformer
      if (chance(0.5)) b.box(x - side * 0.17, rand(2, 3), Z(s), 0.03, 0.8, 0.55, pick(GOODS)); // poster
    }
    // wires: spans run pole-to-pole across segment borders, clipped to this segment
    const heights = [7.7, 8.1, 8.45, 7.3];
    for (let k = 0; k < heights.length; k++) {
      const wx = x + (k - 1.5) * 0.25;
      for (let sp = seg.s0 - 12.5; sp < seg.s1; sp += 25) {
        sagWire(wires, wx, heights[k], sp, wx, heights[k], sp + 25, 0.45 + k * 0.12, seg.s0, seg.s1);
      }
    }
  }
  // cables crossing the road
  for (let s = seg.s0 + 12.5; s < seg.s1; s += 50) {
    if (chance(0.7)) for (let k = 0; k < 3; k++) sagWire(wires, -POLE_X, 8.2 - k * 0.2, s, POLE_X, 8.0 - k * 0.15, s + rand(-1, 1), 0.9 + k * 0.2, -1e9, 1e9);
  }
}

export function streetLight(b: GeoBuilder, side: number, s: number) {
  const x = side * (W.roadHalfWidth + 0.5);
  b.box(x, 4.5, Z(s), 0.18, 9, 0.18, 0x7c8085);
  b.box(x - side * 1.4, 8.9, Z(s), 2.8, 0.12, 0.12, 0x7c8085);
  b.box(x - side * 2.7, 8.8, Z(s), 0.6, 0.12, 0.3, 0xf3f0d8);
}

export function tree(b: GeoBuilder, x: number, s: number) {
  b.cyl(x, 1.6, Z(s), 0.18, 3.2, 0x5b4636);
  b.sphere(x, 4.0, Z(s), rand(2.6, 3.6), rand(2.2, 3), rand(2.6, 3.6), pick([0x3f7a3a, 0x4e8a3e, 0x356b35]));
}

export function buildBackdrop(ctx: DecorCtx) {
  const { b, seg } = ctx;
  for (const side of [-1, 1]) {
    let s = seg.s0;
    while (s < seg.s1) {
      const w = Math.min(rand(12, 24), seg.s1 - s);
      if (w < 4) break;
      const h = rand(16, 46);
      b.box(side * rand(28, 42), h / 2, Z(s + w / 2), rand(10, 16), h, w, pick([0xb9bcb8, 0xc4bfb2, 0xaeb7bb, 0xcbc2b4]));
      s += w + rand(2, 8);
    }
  }
}

// ------------------------------------------------------------------ street furniture
/** Clothing stall: frame, tarp roof and hanging garments. x is stall centre. */
export function clothStall(b: GeoBuilder, x: number, s: number, side: number) {
  const z = Z(s);
  for (const dx of [-0.8, 0.8]) for (const dz of [-1.1, 1.1]) b.box(x + dx, 1.15, z + dz, 0.06, 2.3, 0.06, 0x4a3b2a);
  b.box(x, 2.35, z, 2.0, 0.06, 2.6, pick(AWNINGS), 0, 0, side * 0.12);
  b.box(x, 0.75, z, 1.5, 0.08, 2.2, 0x7a5a3a);
  for (let i = 0; i < 5; i++) {
    const c = pick(PALETTE.RICK_COLORS.concat(PALETTE.SAREE));
    b.box(x - side * 0.85, 1.6, z - 1.0 + i * 0.5, 0.04, 0.75, 0.42, c);
  }
  for (let i = 0; i < 4; i++) b.box(x + rand(-0.5, 0.5), 0.86, z + rand(-0.9, 0.9), 0.5, 0.12, 0.4, pick(GOODS));
}

/** Food cart (bhaji / jhalmuri / chotpoti) with big pot and umbrella. */
export function foodCart(b: GeoBuilder, x: number, s: number) {
  const z = Z(s);
  b.wheel(x - 0.55, 0.3, z + 0.6, 0.3, 0.06, 0x2b2b2b);
  b.wheel(x + 0.55, 0.3, z + 0.6, 0.3, 0.06, 0x2b2b2b);
  b.box(x, 0.85, z, 1.2, 0.5, 1.8, 0x8b5a2b);
  b.box(x, 1.25, z - 0.2, 1.0, 0.35, 0.9, 0xd8e8ef);
  b.cyl(x, 1.3, z + 0.55, 0.32, 0.4, 0xb8b8b8);
  b.cyl(x, 1.9, z, 0.04, 1.4, 0x555555);
  b.cone(x, 2.65, z, 2.2, 0.5, 2.2, pick([0x1b6ca8, 0xd7263d, 0xf2b705, 0x2e933c]));
}

export function busShelter(b: GeoBuilder, x: number, s: number) {
  const z = Z(s);
  for (const dz of [-2.8, 2.8]) b.box(x, 1.4, z + dz, 0.12, 2.8, 0.12, 0x5a6b7a);
  b.box(x, 2.85, z, 1.9, 0.1, 6.4, 0x2f6fdf);
  b.box(x + 0.6, 1.4, z, 0.05, 2.0, 6.0, 0x8fb3c7);
  b.box(x + 0.2, 0.5, z, 0.5, 0.08, 4.5, 0x6b4b2a);
}

export function cone(b: GeoBuilder, x: number, s: number) {
  b.cone(x, 0.36, Z(s), 0.42, 0.72, 0.42, 0xff6d00);
  b.box(x, 0.36, Z(s), 0.3, 0.1, 0.3, 0xffffff);
  b.box(x, 0.03, Z(s), 0.5, 0.06, 0.5, 0x222222);
}

/** Corrugated tin construction fence panel spanning s .. s+len at x. */
export function fencePanel(b: GeoBuilder, x: number, s: number, len: number, alt: boolean) {
  b.box(x, 1.1, Z(s + len / 2), 0.08, 2.2, len - 0.05, alt ? 0x2f6fdf : 0xe8e8e8);
  b.box(x, 2.25, Z(s + len / 2), 0.1, 0.1, len, 0xd7263d);
}

// ------------------------------------------------------------------ foot-overbridge
export const BRIDGE = { deckY: 5.6, halfSpan: 10.6, width: 2.6 };

/** Foot-overbridge spanning the road at s, with stairs down onto both footpaths. */
export function footbridge(ctx: DecorCtx, s: number) {
  const { b, seg } = ctx;
  const z = Z(s);
  const col = pick([0xc0392b, 0x2f6fdf, 0x2e8b57]);
  const y = BRIDGE.deckY;
  b.box(0, y, z, BRIDGE.halfSpan * 2, 0.3, BRIDGE.width, 0x8d8d86);
  for (const dz of [-BRIDGE.width / 2, BRIDGE.width / 2]) {
    b.box(0, y + 0.6, z + dz, BRIDGE.halfSpan * 2, 0.08, 0.08, col);
    b.box(0, y + 0.35, z + dz, BRIDGE.halfSpan * 2, 0.5, 0.03, col);
  }
  // roof
  b.box(0, y + 2.6, z, BRIDGE.halfSpan * 2, 0.1, BRIDGE.width + 0.6, col);
  for (let x = -BRIDGE.halfSpan; x <= BRIDGE.halfSpan + 0.01; x += BRIDGE.halfSpan / 2) {
    for (const dz of [-BRIDGE.width / 2, BRIDGE.width / 2]) b.box(x, y + 1.3, z + dz, 0.1, 2.6, 0.1, col);
  }
  // pillars on the footpaths (never on the road)
  for (const side of [-1, 1]) {
    b.box(side * (W.footpathInner + 0.5), y / 2, z, 0.5, y, 0.5, 0x8d8d86);
    // stairs run forward along the footpath
    const sx = side * (W.footpathOuter - 1.2);
    const run = 10.5;
    const len = Math.hypot(run, y);
    const ang = Math.atan2(y, run);
    b.box(sx, y / 2, Z(s + BRIDGE.width / 2 + run / 2), 1.8, 0.25, len, 0x8d8d86, -ang);
    b.box(sx - 0.9, y / 2 + 0.5, Z(s + BRIDGE.width / 2 + run / 2), 0.06, 0.08, len, col, -ang);
    b.box(sx + 0.9, y / 2 + 0.5, Z(s + BRIDGE.width / 2 + run / 2), 0.06, 0.08, len, col, -ang);
    b.box(sx, y, z, 2.2, 0.3, BRIDGE.width, 0x8d8d86);
  }
  // the irony: a zebra crossing nobody needs, and a banner nobody reads
  addSign(seg, T.bridgeBanner, 13, 1.0, 0, y + 0.3, s - BRIDGE.width / 2 - 0.05, 0, ['#c62828', '#ffffff']);
}

// ------------------------------------------------------------------ finalise
const WIRE_MAT = new THREE.LineBasicMaterial({ color: 0x1b1b1b });
import { VERTEX_MATERIAL } from '../utils/GeoBuilder';

/** Turn the accumulated builder + wires into meshes on the segment group. */
export function finalize(ctx: DecorCtx) {
  const mesh = new THREE.Mesh(ctx.b.build(), VERTEX_MATERIAL);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  ctx.seg.group.add(mesh);
  if (ctx.wires.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(ctx.wires, 3));
    const lines = new THREE.LineSegments(g, WIRE_MAT);
    lines.matrixAutoUpdate = false;
    ctx.seg.group.add(lines);
  }
  for (const c of ctx.seg.group.children) {
    c.matrixAutoUpdate = false;
    c.updateMatrix();
  }
}
