import { DecorCtx, buildRoadBase, buildBuildingRow, buildPolesAndWires, buildBackdrop, clothStall, foodCart } from '../Decor';
import { addCollider, footpathWalkers } from './common';
import { chance, rand, randInt } from '../../utils/math';
import { CFG } from '../../game/GameConfig';

const W = CFG.world;

/**
 * MARKET: stalls line both footpaths and some carts/stalls spill onto the
 * outer lanes (colliders), narrowing the usable road. Crowds of shoppers.
 */
export function buildMarket(ctx: DecorCtx) {
  const { b, seg } = ctx;
  seg.narrow = true;
  buildRoadBase(ctx);
  buildBuildingRow(ctx, -1, { signChance: 0.95 });
  buildBuildingRow(ctx, 1, { signChance: 0.95 });
  buildPolesAndWires(ctx);
  buildBackdrop(ctx);

  for (const side of [-1, 1]) {
    for (let s = seg.s0 + 3; s < seg.s1 - 3; s += rand(3.0, 4.2)) {
      if (chance(0.78)) clothStall(b, side * 9.6, s, side);
      else foodCart(b, side * 9.5, s);
      if (chance(0.45)) seg.pedSpawns.push({ behavior: 'STANDING', s: s + rand(-0.8, 0.8), x: side * 10.3, vendor: true, faceRoad: true });
    }
  }
  // encroachment onto the outer lanes (only the outer ~1.6 m, never more)
  let s = seg.s0 + 10;
  while (s < seg.s1 - 8) {
    const side = chance(0.5) ? -1 : 1;
    const x = side * (W.roadHalfWidth - 0.85);
    if (chance(0.5)) {
      foodCart(b, x, s);
      addCollider(seg, 'stall', x, s, 0.7, 1.05);
    } else {
      clothStall(b, x, s, side);
      addCollider(seg, 'stall', x, s, 0.85, 1.3);
    }
    seg.pedSpawns.push({ behavior: 'STANDING', s: s + 1.6, x: side * (W.roadHalfWidth + 0.2), vendor: true, faceRoad: true });
    s += rand(13, 22);
  }
  for (let i = 0; i < randInt(10, 15); i++) {
    const side = chance(0.5) ? -1 : 1;
    seg.pedSpawns.push({ behavior: 'MARKET', s: seg.s0 + rand(3, seg.length - 3), x: side * rand(W.footpathInner + 0.2, W.footpathOuter - 1.6) });
  }
  if (chance(0.6)) seg.pedSpawns.push({ behavior: 'ROAD_WALKER', s: seg.s0 + rand(20, 80), x: (chance(0.5) ? -1 : 1) * 6.0 });
  footpathWalkers(seg, 3);
}
