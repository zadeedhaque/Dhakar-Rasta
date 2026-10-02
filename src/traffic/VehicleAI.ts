import type { TrafficVehicle } from './TrafficVehicle';
import type { World } from '../game/World';
import { CFG } from '../game/GameConfig';
import { clamp } from '../utils/math';

export const LANES = [-5.25, -1.75, 1.75, 5.25];
export const laneIndexOf = (x: number) => {
  let best = 0;
  for (let i = 1; i < LANES.length; i++) if (Math.abs(LANES[i] - x) < Math.abs(LANES[best] - x)) best = i;
  return best;
};

/** Behaviour hook each AI module implements. Runs before generic driving. */
export type BehaviourFn = (v: TrafficVehicle, world: World, dt: number) => void;

/**
 * Would moving to lateral position x be safe for the player? Vehicles never
 * cut in front of / beside the player without a time gap (fairness).
 */
export function safeForPlayer(v: TrafficVehicle, x: number, world: World): boolean {
  if (world.demo) return true;
  const p = world.player;
  if (Math.abs(p.x - x) > p.halfW + v.halfW + 0.6) return true;
  const ds = v.s - p.s; // >0: vehicle ahead of player
  const closing = p.speed - v.speed * v.dir;
  const need = 6 + Math.max(0, closing) * 1.6;
  return ds > need || ds < -(p.halfL + v.halfL + 3);
}

/** Try to move to an adjacent clear lane (or lane-split position for bikes). */
export function tryLaneChange(v: TrafficVehicle, world: World, prefer = 0): boolean {
  if (v.noLaneChange || v.laneChangeCooldown > 0) return false;
  if (v.speed < 1.5 && v.kind !== 'motorcycle') return false; // nobody slides sideways from a standstill
  const cands: number[] = [];
  const li = laneIndexOf(v.x);
  for (const d of prefer ? [prefer, -prefer] : Math.random() < 0.5 ? [-1, 1] : [1, -1]) {
    const ni = li + d;
    if (ni >= 0 && ni < LANES.length) cands.push(LANES[ni]);
  }
  if (v.kind === 'motorcycle') {
    // bikes also squeeze between lanes
    cands.push(clamp(v.x + (Math.random() < 0.5 ? -1.75 : 1.75), -6.2, 6.2));
  }
  const look = 12 + v.speed * 1.5;
  for (const x of cands) {
    const sMin = v.dir > 0 ? v.s - v.halfL - 6 : v.s - look;
    const sMax = v.dir > 0 ? v.s + look : v.s + v.halfL + 6;
    if (!world.traffic.isClear(x, v.halfW + 0.35, sMin, sMax, v)) continue;
    if (!safeForPlayer(v, x, world)) continue;
    v.targetX = x;
    v.setState('CHANGING_LANE');
    v.laneChangeCooldown = 3 + Math.random() * 3;
    return true;
  }
  return false;
}

/** Standard "stuck behind something slow" lane change logic. */
export function laneDiscipline(v: TrafficVehicle, world: World, dt: number, patience: number): void {
  v.laneChangeCooldown -= dt;
  if (v.state === 'CHANGING_LANE') {
    if (Math.abs(v.x - v.targetX) < 0.15) v.setState('DRIVING');
    else if (!safeForPlayer(v, v.targetX, world) && Math.abs(v.x - v.targetX) > 1.2) {
      // abort: the player closed in on the gap we were moving into
      v.targetX = LANES[laneIndexOf(v.x - Math.sign(v.targetX - v.x) * 1.2)];
    }
  }
  const lead = world.traffic.findLeader(v);
  if (lead && lead.gap < 14 + v.speed && lead.speedAlong < v.desired - 1.2) {
    v.blockedTime += dt;
    if (v.state === 'DRIVING') v.setState('SLOWING');
  } else {
    v.blockedTime = Math.max(0, v.blockedTime - dt);
    if (v.state === 'SLOWING') v.setState('DRIVING');
  }
  if (v.blockedTime > patience && v.state !== 'CHANGING_LANE') {
    if (tryLaneChange(v, world)) v.blockedTime = 0;
  }
}

export const jitter = (base: number, frac: number) => base * (1 - frac + Math.random() * frac * 2);
export const MIN_GAP = CFG.traffic.followMinGap;
