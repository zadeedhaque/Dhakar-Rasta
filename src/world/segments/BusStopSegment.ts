import { DecorCtx, busShelter, addSign } from '../Decor';
import { buildNormal } from './NormalSegment';
import { chance, rand, randInt } from '../../utils/math';
import { T } from '../../i18n/bn';

/** BUS_STOP: shelter on the left footpath (left-hand traffic), crowd waiting, a bus at the kerb. */
export function buildBusStop(ctx: DecorCtx) {
  const seg = ctx.seg;
  buildNormal(ctx, false);
  const s = seg.s0 + 55;
  seg.busStopS = s;
  busShelter(ctx.b, -9.4, s);
  ctx.b.box(-8.0, 1.3, -(s - 4), 0.08, 2.6, 0.08, 0x666666);
  addSign(seg, T.busStopSign, 1.8, 0.6, -8.0, 2.7, s - 4, 0, ['#1565c0', '#ffffff']);
  for (let i = 0; i < randInt(5, 9); i++) {
    seg.pedSpawns.push({ behavior: 'STANDING', s: s + rand(-5, 6), x: rand(-10.2, -7.9), faceRoad: true });
  }
  if (chance(0.85)) seg.vehicleSpawns.push({ kind: 'bus', s: s + 2, x: -5.35, speed: 0, mode: 'busstop' });
  if (chance(0.6)) seg.vehicleSpawns.push({ kind: 'rickshaw', s: s + 13, x: -6.1, speed: 0, mode: 'parked' });
  if (chance(0.4)) seg.pedSpawns.push({ behavior: 'CROSSER', s: s + rand(10, 20), x: -7.7 });
}
