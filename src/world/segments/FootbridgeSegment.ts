import { DecorCtx, footbridge, BRIDGE } from '../Decor';
import { buildNormal } from './NormalSegment';
import { zebra } from './common';
import { chance, rand, randInt } from '../../utils/math';
import { CFG } from '../../game/GameConfig';

/**
 * FOOTBRIDGE: a perfectly good foot-overbridge... and people crossing the
 * road right underneath it anyway.
 */
export function buildFootbridge(ctx: DecorCtx) {
  const seg = ctx.seg;
  buildNormal(ctx, false);
  const bs = seg.s0 + 50;
  seg.footbridgeS = bs;
  footbridge(ctx, bs);
  zebra(ctx, bs + 6);
  for (let i = 0; i < randInt(2, 4); i++) {
    const side = chance(0.5) ? -1 : 1;
    seg.pedSpawns.push({ behavior: 'FOOTBRIDGE_IGNORER', s: bs + rand(-3, 8), x: side * (CFG.world.footpathInner + rand(0.2, 0.8)) });
  }
  for (let i = 0; i < randInt(2, 4); i++) {
    seg.pedSpawns.push({ behavior: 'BRIDGE_WALKER', s: bs + rand(-0.6, 0.6), x: rand(-BRIDGE.halfSpan + 1, BRIDGE.halfSpan - 1), y: BRIDGE.deckY + 0.15, dir: chance(0.5) ? 1 : -1 });
  }
}
