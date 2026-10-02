import { DecorCtx, buildRoadBase, buildBuildingRow, buildPolesAndWires, buildBackdrop } from '../Decor';
import { addCollider, footpathProps, footpathWalkers } from './common';
import { foodCart } from '../Decor';
import { chance, pick, rand, randInt } from '../../utils/math';
import { CFG } from '../../game/GameConfig';
import type { VehicleKind } from '../../assets/Models';

const LANES = [-5.25, -1.75, 1.75, 5.25];

/** NORMAL_ROAD and COMMERCIAL share a builder; COMMERCIAL is taller, glassier, busier. */
export function buildNormal(ctx: DecorCtx, commercial: boolean) {
  buildRoadBase(ctx);
  const opts = commercial ? { tall: true, glassChance: 0.3, signChance: 0.95 } : { signChance: 0.6, glassChance: 0.04 };
  buildBuildingRow(ctx, -1, opts);
  buildBuildingRow(ctx, 1, opts);
  buildPolesAndWires(ctx);
  buildBackdrop(ctx);
  footpathProps(ctx, commercial ? 4 : 2, commercial ? 1 : randInt(1, 4));
  footpathWalkers(ctx.seg, commercial ? 9 : 5);
  // street carts parked on the road edge (outer ~1.6 m only, inner lanes stay open)
  for (let i = 0; i < randInt(1, 3); i++) {
    const side = chance(0.5) ? -1 : 1;
    const s = ctx.seg.s0 + rand(8, ctx.seg.length - 8);
    const x = side * (CFG.world.roadHalfWidth - 0.85);
    foodCart(ctx.b, x, s);
    addCollider(ctx.seg, 'stall', x, s, 0.7, 1.05);
    ctx.seg.pedSpawns.push({ behavior: 'STANDING', s: s + 1.6, x: side * (CFG.world.roadHalfWidth + 0.2), vendor: true, faceRoad: true });
  }
}

/**
 * JAM: normal street plus a block of crawling traffic. Rows leave at least
 * one free lane, and the free lane only shifts by one lane per row so there
 * is always a drivable path through.
 */
export function buildJam(ctx: DecorCtx) {
  buildNormal(ctx, false);
  const seg = ctx.seg;
  let free = Math.floor(rand(0, 4));
  for (let s = seg.s0 + 12; s < seg.s1 - 8; s += rand(11, 14)) {
    for (let l = 0; l < 4; l++) {
      if (l === free) continue;
      if (chance(0.25)) continue; // extra gaps
      const kind: VehicleKind = pick(['car', 'car', 'cng', 'cng', 'rickshaw', 'battery', 'bus']);
      const x = LANES[l] + (kind === 'rickshaw' ? rand(-0.5, 0.5) : rand(-0.25, 0.25));
      seg.vehicleSpawns.push({ kind, s: s + rand(-2, 2), x, speed: rand(0.6, 1.8) * CFG.difficulty.tiers[0].speedFactor, mode: 'jam' });
    }
    free = Math.max(0, Math.min(3, free + pick([-1, 0, 0, 1])));
  }
}
