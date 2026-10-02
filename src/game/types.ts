/** Shared lightweight types. Simulation is 2D: x lateral, s along the road. */
export interface Body {
  x: number;
  s: number;
  halfW: number;
  halfL: number;
  vs: number; // forward velocity (negative = oncoming)
  vx: number;
}

export type HazardKey =
  | 'wrongWayRickshaw'
  | 'wrongWayBattery'
  | 'pedestrian'
  | 'bus'
  | 'motoCrash'
  | 'suddenStop'
  | 'suddenEntry';

/** Anything the player can pass / near-miss / collide with. */
export interface Trackable extends Body {
  id: number;
  passed: boolean;
  collided: boolean;
  minGap: number;
  prevDs: number | null;
  hazardKey: HazardKey | null;
  isPedestrian: boolean;
}

/** Static colliders owned by road segments (stalls, barriers, cones...). */
export interface Collider extends Body {
  kind: 'stall' | 'barrier' | 'cone' | 'crate' | 'pole' | 'bridge';
  hard: boolean;
}

export const LANE_COUNT = 4;
