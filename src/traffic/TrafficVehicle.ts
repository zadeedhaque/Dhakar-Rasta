import * as THREE from 'three';
import { VehicleKind, DIMS, assets } from '../assets/Models';
import { VERTEX_MATERIAL } from '../utils/GeoBuilder';
import type { HazardKey, Trackable } from '../game/types';

export type VState =
  | 'DRIVING'
  | 'SLOWING'
  | 'STOPPED'
  | 'CHANGING_LANE'
  | 'OVERTAKING'
  | 'WRONG_WAY'
  | 'RECOVERING'
  | 'DESPAWNING'
  | 'WAITING'
  | 'ENTERING'
  | 'TURNING'
  | 'CRASHED';

/** Behaviour flavour assigned at spawn; each AI module interprets its own modes. */
export type VMode =
  | 'normal'
  | 'jam'
  | 'parked'
  | 'busstop'
  | 'busjam'
  | 'wrongway'
  | 'batteryWrongWay'
  | 'footpath'
  | 'suddenEntry'
  | 'crash'
  | 'suddenStop'
  | 'overtaker';

let NEXT_ID = 1;

/**
 * Pure simulation state for one vehicle + the mesh that shows it.
 * AI never touches the mesh; TrafficManager syncs it after simulation.
 */
export class TrafficVehicle implements Trackable {
  id = NEXT_ID++;
  readonly mesh: THREE.Mesh;
  halfW: number;
  halfL: number;

  x = 0;
  s = 0;
  vs = 0;
  vx = 0;
  speed = 0; // magnitude along travel direction
  dir: 1 | -1 = 1;
  desired = 8;
  cruise = 8; // preferred speed; behaviours restore `desired` to this
  accel = 3;
  decel = 8;
  latSpeed = 2.5;
  targetX = 0;
  state: VState = 'DRIVING';
  mode: VMode = 'normal';
  t = 0; // time in current state
  life = 0;
  aggression = 0.3;
  laneChangeCooldown = 0;
  blockedTime = 0;
  ignoreLeader = false;
  noLaneChange = false;
  side = 1; // for roadside behaviours
  yawExtra = 0;
  roll = 0;
  bob = 0;
  scratch = 0;
  laneX = 0; // committed lane for oncoming hazards that home in on the player
  bellT = 0;
  hornT = 0; // >0: seconds until this vehicle may honk again

  // Trackable (player interaction bookkeeping)
  passed = false;
  collided = false;
  minGap = Infinity;
  prevDs: number | null = null;
  hazardKey: HazardKey | null = null;
  readonly isPedestrian = false;
  warnText: string | null = null;

  constructor(public readonly kind: VehicleKind) {
    const d = DIMS[kind];
    this.halfW = d.halfW;
    this.halfL = d.halfL;
    this.mesh = new THREE.Mesh(assets.vehicleVariants(kind)[0], VERTEX_MATERIAL);
    this.mesh.matrixAutoUpdate = true;
  }

  /** Reset all per-life state when taken from the pool. */
  activate(): void {
    const vars = assets.vehicleVariants(this.kind);
    this.mesh.geometry = vars[Math.floor(Math.random() * vars.length)];
    this.mesh.visible = true;
    this.vs = this.vx = this.speed = 0;
    this.dir = 1;
    this.state = 'DRIVING';
    this.mode = 'normal';
    this.t = this.life = 0;
    this.laneChangeCooldown = 2;
    this.blockedTime = 0;
    this.ignoreLeader = false;
    this.noLaneChange = false;
    this.yawExtra = this.roll = 0;
    this.bob = Math.random() * 10;
    this.scratch = 0;
    this.bellT = 0;
    this.hornT = Math.random() * 0.6;
    this.passed = this.collided = false;
    this.minGap = Infinity;
    this.prevDs = null;
    this.hazardKey = null;
    this.warnText = null;
  }

  setState(s: VState): void {
    if (this.state !== s) {
      this.state = s;
      this.t = 0;
    }
  }
}
