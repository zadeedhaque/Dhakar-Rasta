import * as THREE from 'three';
import { TrafficVehicle, VMode, VState } from './TrafficVehicle';
import { BehaviourFn, LANES, MIN_GAP } from './VehicleAI';
import { CarAI } from './CarAI';
import { RickshawAI } from './RickshawAI';
import { BatteryRickshawAI } from './BatteryRickshawAI';
import { MotorcycleAI } from './MotorcycleAI';
import { BusAI } from './BusAI';
import { VehicleKind } from '../assets/Models';
import { Pool } from '../utils/Pool';
import { CFG } from '../game/GameConfig';
import { chance, clamp, rand, weightedPick } from '../utils/math';
import type { World } from '../game/World';
import type { Collider, HazardKey } from '../game/types';
import type { SegmentType } from '../world/RoadSegment';

const BEHAVIOUR: Record<VehicleKind, BehaviourFn> = {
  car: CarAI, cng: CarAI, truck: CarAI, rickshaw: RickshawAI, battery: BatteryRickshawAI, motorcycle: MotorcycleAI, bus: BusAI,
};
const SPEED: Record<VehicleKind, [number, number]> = {
  car: [8, 13], cng: [6.5, 10], truck: [6, 9], rickshaw: [2.6, 3.8], battery: [5, 7.5], motorcycle: [9, 14], bus: [6.5, 10],
};
const LAT: Record<VehicleKind, number> = { car: 2.6, cng: 2.8, truck: 1.6, rickshaw: 1.3, battery: 1.8, motorcycle: 3.6, bus: 1.5 };
const ACC: Record<VehicleKind, number> = { car: 3.2, cng: 3, truck: 2, rickshaw: 1.2, battery: 2.2, motorcycle: 4.5, bus: 1.8 };
const DEC: Record<VehicleKind, number> = { car: 8, cng: 8, truck: 6, rickshaw: 4.5, battery: 6, motorcycle: 9, bus: 6 };
/** Lane preference weights, lanes 0..3 from left kerb (slow traffic keeps left). */
const LANE_PREF: Record<VehicleKind, number[]> = {
  rickshaw: [5, 1, 0.6, 3], battery: [3, 2, 1, 2], bus: [3, 3, 1.2, 0.5], truck: [1, 2, 2, 1],
  car: [1, 2, 2, 1.5], cng: [1.5, 2, 1.5, 1.5], motorcycle: [1, 1, 1, 1],
};
const SEGMENT_MIX: Partial<Record<SegmentType, Partial<Record<VehicleKind, number>>>> = {
  MARKET: { rickshaw: 2.2, battery: 1.5, car: 0.5, bus: 0.3, truck: 0.2 },
  COMMERCIAL: { car: 1.4, cng: 1.6, rickshaw: 0.7 },
  BUS_STOP: { bus: 1.8 },
  CONSTRUCTION: { truck: 2.5, bus: 0.6 },
};
const KINDS: VehicleKind[] = ['car', 'cng', 'rickshaw', 'battery', 'motorcycle', 'bus', 'truck'];

export interface LeaderInfo {
  gap: number;
  speedAlong: number;
  isPlayer: boolean;
}

export interface SpawnOpts {
  s: number;
  x: number;
  dir?: 1 | -1;
  speed?: number;
  desired?: number;
  mode?: VMode;
  state?: VState;
  hazardKey?: HazardKey | null;
  warn?: string | null;
}

export class TrafficManager {
  vehicles: TrafficVehicle[] = [];
  readonly root = new THREE.Group();
  private pools = new Map<VehicleKind, Pool<TrafficVehicle>>();
  private spawnTimer = 0;
  private lead: LeaderInfo = { gap: 0, speedAlong: 0, isPlayer: false };
  private colliders: Collider[] = [];

  constructor(private world: World) {
    world.scene.add(this.root);
    for (const k of KINDS) {
      this.pools.set(k, new Pool(() => {
        const v = new TrafficVehicle(k);
        this.root.add(v.mesh);
        return v;
      }));
    }
  }

  // ------------------------------------------------------------ lifecycle
  spawn(kind: VehicleKind, o: SpawnOpts): TrafficVehicle | null {
    if (this.vehicles.length >= CFG.traffic.maxVehicles + 14) return null;
    const v = this.pools.get(kind)!.acquire();
    v.activate();
    const sf = this.world.difficulty.current.speedFactor;
    const [a, b] = SPEED[kind];
    v.s = o.s;
    v.x = v.targetX = v.laneX = o.x;
    v.dir = o.dir ?? 1;
    v.cruise = v.desired = o.desired ?? rand(a, b) * sf;
    v.speed = o.speed ?? v.cruise * 0.9;
    v.mode = o.mode ?? 'normal';
    v.state = o.state ?? (v.dir < 0 ? 'WRONG_WAY' : 'DRIVING');
    v.hazardKey = o.hazardKey ?? null;
    v.warnText = o.warn ?? null;
    v.latSpeed = LAT[kind];
    v.accel = ACC[kind];
    v.decel = DEC[kind];
    v.halfW = kind === 'motorcycle' ? 0.42 : v.halfW;
    v.aggression = kind === 'motorcycle' ? this.world.difficulty.current.motorcycleAggression * rand(0.6, 1.3) : rand(0.1, 0.6);
    v.side = v.x < 0 ? -1 : 1;
    this.vehicles.push(v);
    this.syncMesh(v, 0);
    return v;
  }

  release(v: TrafficVehicle): void {
    const i = this.vehicles.indexOf(v);
    if (i >= 0) {
      this.vehicles[i] = this.vehicles[this.vehicles.length - 1];
      this.vehicles.pop();
    }
    v.mesh.visible = false;
    this.pools.get(v.kind)!.release(v);
  }

  clear(): void {
    while (this.vehicles.length) this.release(this.vehicles[this.vehicles.length - 1]);
  }

  /** Remove every vehicle in [sMin, sMax] (used when resuming after the police). */
  clearZone(sMin: number, sMax: number): void {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.s > sMin && v.s < sMax) this.release(v);
    }
  }

  // ------------------------------------------------------------ simulation
  update(dt: number): void {
    const w = this.world;
    const focus = w.focusS;
    w.road.collidersIn(focus - 60, focus + CFG.traffic.despawnAhead + 20, this.colliders);
    // lazily realise segment-owned vehicles (jams, parked buses)
    for (const seg of w.road.segments) {
      if (!seg.vehicleSpawns.length || seg.s0 > focus + CFG.pedestrians.activateAhead) continue;
      for (const sp of seg.vehicleSpawns) {
        const v = this.spawn(sp.kind, { s: sp.s, x: sp.x, speed: sp.speed, desired: sp.speed, mode: sp.mode, state: sp.speed === 0 ? 'STOPPED' : 'DRIVING' });
        if (v && sp.mode === 'jam') v.noLaneChange = true;
      }
      seg.vehicleSpawns.length = 0;
    }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.t += dt;
      v.life += dt;
      BEHAVIOUR[v.kind](v, w, dt);
      this.drive(v, dt);
      if (v.s < focus - CFG.traffic.despawnBehind || v.s > focus + CFG.traffic.despawnAhead) {
        this.release(v);
        continue;
      }
      this.syncMesh(v, dt);
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = CFG.traffic.spawnCooldown;
      this.spawnAmbient(rand(CFG.traffic.spawnAhead[0], CFG.traffic.spawnAhead[1]));
    }
  }

  /** Fill the visible road at the start of a run / menu. */
  populate(): void {
    const target = this.targetDensity();
    for (let i = 0; i < target * 3 && this.countAhead() < target; i++) this.spawnAmbient(rand(25, 200));
  }

  private targetDensity(): number {
    return this.world.demo ? 13 : Math.round(this.world.difficulty.current.trafficDensity);
  }

  private countAhead(): number {
    const f = this.world.focusS;
    let n = 0;
    for (const v of this.vehicles) if (v.dir > 0 && v.mode !== 'jam' && v.mode !== 'parked' && v.s > f - 10 && v.s < f + 220) n++;
    return n;
  }

  private spawnAmbient(ahead: number): void {
    const w = this.world;
    if (this.countAhead() >= this.targetDensity()) return;
    // motorcycles overtaking from behind create near-miss moments
    if (!w.demo && w.player.speed > 8 && chance(0.18 * w.difficulty.current.motorcycleAggression)) {
      const p = w.player;
      const x = clamp(p.x + (chance(0.5) ? -2.6 : 2.6), -6, 6);
      const s = p.s - 32;
      if (this.isClear(x, 1.0, s - 8, p.s + 4, null, false)) {
        this.spawn('motorcycle', { s, x, speed: p.speed + 4, mode: 'overtaker' });
        return;
      }
    }
    const s = w.focusS + ahead;
    const segType = w.road.segmentAt(s)?.type;
    const mix = (segType && SEGMENT_MIX[segType]) || {};
    const kind = weightedPick(KINDS, (k) => (CFG.traffic.kindWeights[k] ?? 1) * (mix[k] ?? 1))!;
    const pref = LANE_PREF[kind];
    const lane = weightedPick([0, 1, 2, 3], (l) => pref[l])!;
    let x = LANES[lane];
    if (kind === 'rickshaw' || kind === 'battery') x += (lane < 2 ? -1 : 1) * rand(0, 0.7);
    if (kind === 'motorcycle') x += rand(-1, 1);
    const hw = 1.3;
    if (!this.isClear(x, hw, s - 14, s + 14, null, false)) return;
    // never build a wall: at most 3 of 4 lanes occupied around the spawn point
    let busy = 0;
    for (const lx of LANES) if (!this.isClear(lx, 1.0, s - 12, s + 12, null, false)) busy++;
    if (busy >= 3) return;
    this.spawn(kind, { s, x });
  }

  private drive(v: TrafficVehicle, dt: number): void {
    let target = v.desired;
    v.hornT -= dt;
    if (!v.ignoreLeader) {
      const lead = this.findLeader(v);
      if (lead) {
        const safe = MIN_GAP + v.speed * 0.5;
        if (lead.gap < safe * 3) target = Math.min(target, Math.max(0, lead.speedAlong) + (lead.gap - safe) * 0.8);
        if (lead.gap < 0.6) target = 0;
        // blocked by something slower or standing in the way -> honk (Dhaka rules)
        if (v.desired > 1 && lead.gap < safe * 2 + 4 && lead.speedAlong < v.desired - 1.5) this.honk(v, lead.isPlayer);
      }
    }
    target = Math.max(0, target);
    v.speed = v.speed < target ? Math.min(target, v.speed + v.accel * dt) : Math.max(target, v.speed - v.decel * dt);
    v.vs = v.dir * v.speed;
    const moving = v.speed > 0.5 || v.state === 'ENTERING' || v.state === 'TURNING' || v.state === 'CRASHED' || v.mode === 'busjam';
    v.vx = clamp((v.targetX - v.x) * 2.2, -v.latSpeed, v.latSpeed) * (moving ? 1 : 0.25);
    v.x += v.vx * dt;
    v.s += v.vs * dt;
  }

  /** Vehicle horn / rickshaw bell, rate-limited per vehicle; only audible near the player. */
  private honk(v: TrafficVehicle, atPlayer: boolean): void {
    if (v.hornT > 0) return;
    v.hornT = (atPlayer ? 0.9 : 1.6) + Math.random() * 2.4;
    const w = this.world;
    const d = Math.abs(v.s - w.focusS);
    if (d > 110) return;
    if (v.kind === 'rickshaw') w.audio.bell(v.x - w.focusX, d);
    else w.audio.vehicleHorn(v.kind, v.x - w.focusX, d, v.id);
  }

  private syncMesh(v: TrafficVehicle, dt: number): void {
    v.bob += dt * (v.speed * 0.9 + 0.5);
    const bouncy = v.kind === 'rickshaw' || v.kind === 'battery' || v.kind === 'cng';
    v.mesh.position.set(v.x, bouncy ? Math.abs(Math.sin(v.bob * 2)) * 0.035 : 0, -v.s);
    const base = v.dir > 0 ? 0 : Math.PI;
    const yaw = base - v.dir * clamp(v.vx / Math.max(v.speed, 3), -0.6, 0.6) + v.yawExtra;
    v.mesh.rotation.set(0, yaw, v.roll);
  }

  // ------------------------------------------------------------ queries
  /** Nearest thing ahead of v (in its travel direction) inside its lateral band. */
  findLeader(v: TrafficVehicle): LeaderInfo | null {
    const dir = v.dir;
    const look = 10 + v.speed * 3;
    let best = Infinity;
    let speedAlong = 0;
    let isPlayer = false;
    const consider = (x: number, s: number, hw: number, hl: number, vs: number, pad: number): boolean => {
      if (Math.abs(x - v.x) > v.halfW + hw + pad) return false;
      const da = (s - v.s) * dir;
      if (da <= 0) return false;
      const gap = da - v.halfL - hl;
      if (gap > look || gap >= best) return false;
      best = gap;
      speedAlong = vs * dir;
      return true;
    };
    for (const o of this.vehicles) {
      if (o !== v) consider(o.x, o.s, o.halfW, o.halfL, o.vs, 0.25);
    }
    for (const p of this.world.peds.active) {
      if (p.solid) consider(p.x, p.s, p.halfW, p.halfL, p.vs, 0.35);
    }
    for (const c of this.colliders) consider(c.x, c.s, c.halfW, c.halfL, 0, 0.2);
    const w = this.world;
    if (!w.demo && dir > 0) {
      const p = w.player;
      if (consider(p.x, p.s, p.halfW, p.halfL, p.speed, 0.3)) isPlayer = true;
    }
    if (best === Infinity) return null;
    this.lead.gap = best;
    this.lead.speedAlong = speedAlong;
    this.lead.isPlayer = isPlayer;
    return this.lead;
  }

  /** True if nothing occupies the box [x±halfW] x [sMin,sMax]. */
  isClear(x: number, halfW: number, sMin: number, sMax: number, self: TrafficVehicle | null, includePlayer = true): boolean {
    if (Math.abs(x) > CFG.world.roadHalfWidth - 0.4) return false;
    const hit = (ox: number, os: number, hw: number, hl: number) =>
      Math.abs(ox - x) < halfW + hw && os + hl > sMin && os - hl < sMax;
    for (const o of this.vehicles) if (o !== self && hit(o.x, o.s, o.halfW, o.halfL)) return false;
    for (const c of this.colliders) if (hit(c.x, c.s, c.halfW, c.halfL)) return false;
    for (const p of this.world.peds.active) if (p.solid && p.onRoad && hit(p.x, p.s, p.halfW, p.halfL)) return false;
    if (includePlayer && !this.world.demo) {
      const p = this.world.player;
      if (hit(p.x, p.s, p.halfW, p.halfL)) return false;
    }
    return true;
  }

  /**
   * Escape-route check: like isClear but ignores vehicles moving faster than
   * `maxSpeed` (the player can simply follow moving traffic). Static colliders,
   * stopped / slow vehicles and people on the road still block.
   */
  isClearOfSlow(x: number, halfW: number, sMin: number, sMax: number, maxSpeed = 4): boolean {
    if (Math.abs(x) > CFG.world.roadHalfWidth - 0.4) return false;
    const hit = (ox: number, os: number, hw: number, hl: number) =>
      Math.abs(ox - x) < halfW + hw && os + hl > sMin && os - hl < sMax;
    for (const o of this.vehicles) if ((o.speed < maxSpeed || o.dir < 0) && hit(o.x, o.s, o.halfW, o.halfL)) return false;
    for (const c of this.colliders) if (c.hard && hit(c.x, c.s, c.halfW, c.halfL)) return false;
    for (const p of this.world.peds.active) if (p.solid && p.onRoad && hit(p.x, p.s, p.halfW, p.halfL)) return false;
    return true;
  }

  /** Static colliders currently near the focus (refreshed each update). */
  get nearbyColliders(): Collider[] {
    return this.colliders;
  }

  refreshColliders(): void {
    const f = this.world.focusS;
    this.world.road.collidersIn(f - 60, f + CFG.traffic.despawnAhead + 20, this.colliders);
  }

  countHazards(): number {
    const f = this.world.focusS;
    let n = 0;
    for (const v of this.vehicles) if (v.hazardKey && !v.passed && !v.collided && v.s > f - 5) n++;
    return n;
  }
}
