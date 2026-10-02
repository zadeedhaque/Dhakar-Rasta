import type { World } from '../game/World';
import { CFG } from '../game/GameConfig';
import { LANES } from '../traffic/VehicleAI';

/**
 * Fairness rules. Every dangerous spawn goes through here:
 *  - it must appear far enough away to give the configured reaction window,
 *  - there must be at least one (early game: two) other free lane around the
 *    point where the player and hazard would meet,
 *  - the global hazard budget must not be exceeded.
 */
export function reactionDistance(world: World, approachSpeed: number): number {
  const v = Math.max(world.playerSpeed, 10); // assume the player may speed up
  return (v + Math.max(0, approachSpeed)) * world.difficulty.current.reactionWindow + CFG.events.spawnMargin;
}

export function hazardBudgetOk(world: World): boolean {
  return world.activeHazards() < world.difficulty.hazardCap;
}

/** Predicted meeting point (s) between player and a hazard approaching at `approach` m/s. */
export function meetingPoint(world: World, sHazard: number, approach: number): number {
  const v = Math.max(world.playerSpeed, 0.5);
  const t = Math.max(0, sHazard - world.focusS) / Math.max(1, v + approach);
  return world.focusS + v * t;
}

function laneFree(world: World, x: number, sMeet: number, range: number): boolean {
  return world.traffic.isClearOfSlow(x, 1.2, sMeet - range, sMeet + range);
}

/**
 * Pick a lane for an oncoming/blocking hazard that leaves escape routes.
 * Returns the lane x, or null if no fair lane exists right now.
 */
export function chooseHazardLane(world: World, sSpawn: number, approach: number, halfW: number, preferPlayer = 0.4): number | null {
  const sMeet = meetingPoint(world, sSpawn, approach);
  const free = LANES.map((x) => laneFree(world, x, sMeet, 22));
  const need = world.difficulty.tierIndex >= 2 ? 1 : 2;
  const ok: number[] = [];
  for (let i = 0; i < LANES.length; i++) {
    let others = 0;
    for (let j = 0; j < LANES.length; j++) if (j !== i && free[j]) others++;
    if (others < need) continue;
    if (!world.traffic.isClear(LANES[i], halfW + 0.3, sSpawn - 8, sSpawn + 8, null, false)) continue;
    ok.push(i);
  }
  if (!ok.length) return null;
  if (Math.random() < preferPlayer) {
    // aim at the player's lane: the point is to make them react
    let best = ok[0];
    for (const i of ok) if (Math.abs(LANES[i] - world.focusX) < Math.abs(LANES[best] - world.focusX)) best = i;
    return LANES[best];
  }
  // wrong-way traffic usually hugs the kerb (left in Bangladesh)
  const weights = ok.map((i) => (i === 0 ? 3 : i === 3 ? 1.5 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < ok.length; k++) {
    r -= weights[k];
    if (r <= 0) return LANES[ok[k]];
  }
  return LANES[ok[ok.length - 1]];
}
