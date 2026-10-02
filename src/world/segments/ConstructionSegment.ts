import { DecorCtx, buildRoadBase, buildBuildingRow, buildPolesAndWires, buildBackdrop, cone, fencePanel, addSign, Z } from '../Decor';
import { addCollider, footpathWalkers } from './common';
import { chance, rand } from '../../utils/math';
import { T } from '../../i18n/bn';

/**
 * CONSTRUCTION: one outer lane closed by cones then a tin fence, with dirt,
 * a digger and workers behind it. At most one extra pile in the adjacent lane,
 * so at least two lanes always stay open.
 */
export function buildConstruction(ctx: DecorCtx) {
  const { b, seg } = ctx;
  seg.narrow = true;
  buildRoadBase(ctx, { dirty: true });
  buildBuildingRow(ctx, -1, {});
  buildBuildingRow(ctx, 1, {});
  buildPolesAndWires(ctx);
  buildBackdrop(ctx);
  const side = chance(0.5) ? -1 : 1;
  const inner = 3.75;
  // warning sign + entry taper
  b.box(side * 5.2, 0.7, Z(seg.s0 + 4), 0.08, 1.4, 0.08, 0x555555);
  addSign(seg, T.constructionSign, 3.6, 0.9, side * 5.2, 1.7, seg.s0 + 4, 0, ['#f9a825', '#000000']);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const x = side * (6.6 - (6.6 - inner) * t);
    const s = seg.s0 + 7 + 20 * t;
    cone(b, x, s);
    addCollider(seg, 'cone', x, s, 0.25, 0.25, false);
  }
  // fence + closed-lane collider
  let alt = false;
  for (let s = seg.s0 + 28; s < seg.s0 + 88; s += 4) {
    fencePanel(b, side * inner, s, 4, (alt = !alt));
  }
  for (let s = seg.s0 + 28; s < seg.s0 + 88; s += 10) addCollider(seg, 'barrier', side * 5.35, s + 5, 1.65, 5);
  // exit taper
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    const x = side * (inner + (6.6 - inner) * t);
    const s = seg.s0 + 89 + 8 * t;
    cone(b, x, s);
    addCollider(seg, 'cone', x, s, 0.25, 0.25, false);
  }
  // works behind the fence
  b.cone(side * 5.4, 0.7, Z(seg.s0 + 40), 3, 1.4, 5, 0x7a5a3a);
  b.box(side * 5.3, 0.9, Z(seg.s0 + 58), 2.4, 1.6, 3.6, 0xf2b705); // digger body
  b.box(side * 5.3, 2.2, Z(seg.s0 + 56.5), 0.4, 0.4, 3.5, 0xf2b705, -0.5);
  b.box(side * 5.3, 0.3, Z(seg.s0 + 58), 2.6, 0.6, 3.9, 0x2b2b2b);
  for (let i = 0; i < 3; i++) b.cyl(side * 5.6, 0.5, Z(seg.s0 + 72 + i * 2.2), 0.5, 2.6, 0x9a9a92, Math.PI / 2);
  for (let i = 0; i < 3; i++) seg.pedSpawns.push({ behavior: 'STANDING', s: seg.s0 + rand(32, 84), x: side * rand(4.8, 6.4), faceRoad: true });
  // brick pile in the adjacent open lane (fairness: only one lane affected at a time)
  if (chance(0.7)) {
    const s = seg.s0 + rand(45, 70);
    const x = side * 1.9;
    b.box(x, 0.35, Z(s), 1.4, 0.7, 1.6, 0xa0442c);
    b.box(x, 0.8, Z(s), 1.0, 0.3, 1.1, 0xb5532f);
    addCollider(seg, 'crate', x, s, 0.7, 0.8);
  }
  footpathWalkers(seg, 4);
}
