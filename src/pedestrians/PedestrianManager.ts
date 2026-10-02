import * as THREE from 'three';
import { Pedestrian } from './Pedestrian';
import { updatePedestrian } from './PedestrianAI';
import { Pool } from '../utils/Pool';
import { CFG } from '../game/GameConfig';
import { chance, rand, randInt, weightedPick } from '../utils/math';
import type { World } from '../game/World';
import type { PedBehavior, PedSpawn } from '../world/RoadSegment';

const W = CFG.world;
const KERB = W.footpathInner + 0.35;

type Dyn = 'CROSSER' | 'ROAD_WALKER' | 'RUNNER' | 'GROUP' | 'DISTRACTED';
const DYNAMIC: Dyn[] = ['CROSSER', 'ROAD_WALKER', 'RUNNER', 'GROUP', 'DISTRACTED'];

export class PedestrianManager {
  active: Pedestrian[] = [];
  readonly root = new THREE.Group();
  private pool: Pool<Pedestrian>;
  private dynTimer = 3;

  constructor(private world: World) {
    world.scene.add(this.root);
    this.pool = new Pool(() => {
      const p = new Pedestrian();
      this.root.add(p.mesh);
      return p;
    });
  }

  spawn(spec: PedSpawn): Pedestrian | null {
    if (this.active.length >= CFG.pedestrians.maxActive) return null;
    const p = this.pool.acquire();
    p.activate(!!spec.vendor);
    p.behavior = spec.behavior;
    p.x = spec.x;
    p.s = spec.s;
    p.y = spec.y ?? 0;
    p.side = spec.x < 0 ? -1 : 1;
    p.dirS = spec.dir ?? (chance(0.5) ? 1 : -1);
    p.speed = CFG.pedestrians.walkSpeed * rand(0.8, 1.2);
    p.yaw = p.side * Math.PI / 2;
    switch (spec.behavior) {
      case 'NORMAL':
        p.setState('WALKING');
        break;
      case 'MARKET':
        p.speed *= 0.7;
        p.targetX = p.x;
        p.targetS = p.s;
        p.dur = rand(0, 3);
        p.setState('IDLE');
        break;
      case 'STANDING':
        p.dur = 1e9;
        p.setState('IDLE');
        break;
      case 'BRIDGE_WALKER':
        p.solid = false;
        p.setState('WALKING');
        break;
      case 'ROAD_WALKER':
        p.speed *= 0.85;
        p.x = p.side * rand(5.6, 6.4);
        p.targetX = p.x;
        p.dur = rand(12, 22);
        p.setState('ROAD');
        break;
      case 'RUNNER':
        p.speed = CFG.pedestrians.runnerSpeed * rand(0.9, 1.1);
        p.setState('WAITING');
        break;
      case 'GROUP':
        p.speed = CFG.pedestrians.crossSpeed * 0.8;
        p.setState('WAITING');
        break;
      case 'DISTRACTED':
        p.speed = CFG.pedestrians.crossSpeed * 0.7;
        p.setState('WAITING');
        break;
      default: // CROSSER, FOOTBRIDGE_IGNORER
        p.speed = CFG.pedestrians.crossSpeed * rand(0.85, 1.2);
        p.setState('WAITING');
    }
    this.active.push(p);
    this.sync(p, 0);
    return p;
  }

  release(p: Pedestrian): void {
    const i = this.active.indexOf(p);
    if (i >= 0) {
      this.active[i] = this.active[this.active.length - 1];
      this.active.pop();
    }
    p.mesh.visible = false;
    this.pool.release(p);
  }

  clear(): void {
    while (this.active.length) this.release(this.active[this.active.length - 1]);
  }

  /** Remove people standing in the carriageway within [sMin, sMax]. */
  clearRoad(sMin: number, sMax: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p.s > sMin && p.s < sMax && p.onRoad) this.release(p);
    }
  }

  update(dt: number): void {
    const w = this.world;
    const focus = w.focusS;
    for (const seg of w.road.segments) {
      if (!seg.pedSpawns.length || seg.s0 > focus + CFG.pedestrians.activateAhead) continue;
      for (const sp of seg.pedSpawns) if (sp.s > focus - 15) this.spawn(sp);
      seg.pedSpawns.length = 0;
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      updatePedestrian(p, w, dt);
      if (p.s < focus - CFG.pedestrians.despawnBehind || p.s > focus + 320) {
        this.release(p);
        continue;
      }
      this.sync(p, dt);
    }
    this.dynTimer -= dt;
    if (this.dynTimer <= 0) {
      const dens = w.difficulty.current.pedestrianDensity;
      this.dynTimer = rand(2.5, 5) / Math.max(0.3, dens);
      this.spawnDynamic();
    }
  }

  /** Spontaneous road users: crossers, runners, groups, road walkers. */
  spawnDynamic(force?: Dyn, sAhead?: number): void {
    const w = this.world;
    const tier = w.difficulty.tierIndex;
    const kind = force ?? weightedPick(DYNAMIC, (k) => ({ CROSSER: 3, ROAD_WALKER: 1.6, RUNNER: 0.4 + tier * 0.4, GROUP: 0.6 + tier * 0.2, DISTRACTED: 1.2 })[k])!;
    const s = w.focusS + (sAhead ?? rand(130, 200));
    const side = chance(0.5) ? -1 : 1;
    if (kind === 'GROUP') {
      const n = randInt(3, 5);
      for (let i = 0; i < n; i++) this.spawn({ behavior: 'GROUP', s: s + i * rand(0.6, 1.0), x: side * (KERB + rand(-0.1, 0.5)) });
    } else {
      this.spawn({ behavior: kind as PedBehavior, s, x: side * KERB });
    }
  }

  private sync(p: Pedestrian, dt: number): void {
    const moving = Math.abs(p.vx) + Math.abs(p.vs) > 0.05;
    if (moving) {
      p.phase += dt * (4 + Math.hypot(p.vx, p.vs) * 3);
      p.yaw = Math.atan2(-p.vx, p.vs);
    } else if (p.state === 'IDLE' || p.state === 'WAITING') {
      if (p.behavior === 'STANDING' || p.state === 'WAITING') p.yaw = p.side * Math.PI / 2; // face the road
    }
    const bob = moving ? Math.abs(Math.sin(p.phase)) * 0.07 : 0;
    p.mesh.position.set(p.x, p.y + bob, -p.s);
    p.mesh.rotation.set(0, p.yaw, moving ? Math.sin(p.phase) * 0.06 : 0);
    if (p.tilt) p.mesh.rotation.x = -p.tilt;
  }

  countHazards(): number {
    const f = this.world.focusS;
    let n = 0;
    for (const p of this.active) if (p.hazardKey && !p.passed && p.s > f) n++;
    return n;
  }
}
