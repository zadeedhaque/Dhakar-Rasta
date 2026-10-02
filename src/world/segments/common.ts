import type { Collider } from '../../game/types';
import type { RoadSegment } from '../RoadSegment';
import { chance, pick, rand, randInt } from '../../utils/math';
import { CFG } from '../../game/GameConfig';
import { DecorCtx, streetLight, tree, foodCart, Z } from '../Decor';

const W = CFG.world;

export function addCollider(seg: RoadSegment, kind: Collider['kind'], x: number, s: number, halfW: number, halfL: number, hard = true) {
  seg.colliders.push({ kind, x, s, halfW, halfL, vs: 0, vx: 0, hard });
}

/** Footpath walkers that never step on the road. */
export function footpathWalkers(seg: RoadSegment, count: number) {
  for (let i = 0; i < count; i++) {
    const side = chance(0.5) ? -1 : 1;
    seg.pedSpawns.push({ behavior: 'NORMAL', s: seg.s0 + rand(2, seg.length - 2), x: side * rand(W.footpathInner + 0.8, W.footpathOuter - 0.5), dir: chance(0.5) ? 1 : -1 });
  }
}

/** Generic footpath clutter: lights, trees, carts, parked bikes, bins. */
export function footpathProps(ctx: DecorCtx, lights: number, trees: number) {
  const { b, seg } = ctx;
  for (let i = 0; i < lights; i++) streetLight(b, chance(0.5) ? -1 : 1, seg.s0 + rand(5, seg.length - 5));
  for (let i = 0; i < trees; i++) tree(b, (chance(0.5) ? -1 : 1) * rand(9.8, 10.5), seg.s0 + rand(4, seg.length - 4));
  if (chance(0.5)) foodCart(b, (chance(0.5) ? -1 : 1) * 9.6, seg.s0 + rand(10, seg.length - 10));
  for (let i = 0; i < randInt(0, 3); i++) {
    const side = chance(0.5) ? -1 : 1;
    const s = seg.s0 + rand(5, seg.length - 5);
    // parked motorcycle (decor)
    b.box(side * 10.2, 0.6, Z(s), 1.6, 0.5, 0.35, pick([0xb3242b, 0x1b1b1b, 0x1f5fa6]), 0, Math.PI / 2);
    b.wheel(side * 10.2, 0.3, Z(s) + 0.6, 0.3, 0.12);
  }
  if (chance(0.5)) {
    const side = chance(0.5) ? -1 : 1;
    b.box(side * 10.4, 0.55, Z(seg.s0 + rand(5, seg.length - 5)), 0.9, 1.1, 1.3, 0x1f64c8); // municipal bin
  }
}

/** Zebra crossing across the carriageway. */
export function zebra(ctx: DecorCtx, s: number) {
  for (let x = -W.roadHalfWidth + 0.6; x < W.roadHalfWidth - 0.4; x += 1.1) ctx.b.box(x, 0.009, Z(s), 0.55, 0.012, 3.2, 0xf0f0ea);
}
