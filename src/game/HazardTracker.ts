import type { World } from './World';
import type { HazardKey, Trackable } from './types';
import { CFG } from './GameConfig';

export interface Warning {
  x: number;
  s: number;
  text: string;
  dist: number;
}

export interface TrackerCallbacks {
  onAvoid(key: HazardKey, o: Trackable): void;
  onNearMiss(o: Trackable): void;
}

/**
 * Watches everything the player passes. When an entity crosses the player's
 * position (sign change of ds) it decides: avoided hazard (reward), near miss
 * (small reward), or nothing. Also builds the HUD warning list.
 */
export class HazardTracker {
  warnings: Warning[] = [];
  private nearCooldown = 0;

  reset(): void {
    this.warnings.length = 0;
    this.nearCooldown = 0;
  }

  update(world: World, dt: number, cb: TrackerCallbacks): void {
    this.nearCooldown = Math.max(0, this.nearCooldown - dt);
    this.warnings.length = 0;
    const p = world.player;
    for (const v of world.traffic.vehicles) {
      this.track(world, v, cb);
      if (v.warnText && v.hazardKey && !v.passed && !v.collided) {
        const d = v.s - p.s;
        if (d > 0 && d < 140) this.warnings.push({ x: v.x, s: v.s, text: v.warnText, dist: d });
      }
    }
    for (const ped of world.peds.active) if (ped.solid) this.track(world, ped, cb);
    this.warnings.sort((a, b) => a.dist - b.dist);
    if (this.warnings.length > 3) this.warnings.length = 3;
  }

  private track(world: World, o: Trackable, cb: TrackerCallbacks): void {
    const p = world.player;
    const ds = o.s - p.s;
    const gap = Math.abs(o.x - p.x) - p.halfW - o.halfW;
    if (Math.abs(ds) < p.halfL + o.halfL + 1.5) o.minGap = Math.min(o.minGap, gap);
    const prev = o.prevDs;
    o.prevDs = ds;
    if (prev === null || o.passed || Math.sign(prev) === Math.sign(ds) || Math.abs(ds) > 15) return;
    // crossed the player's position this frame
    o.passed = true;
    if (o.collided) return;
    const key = o.hazardKey;
    if (key) {
      const pedOk = !o.isPedestrian || o.minGap <= CFG.dangerousPedestrian.maxPassGap;
      const onRoad = Math.abs(o.x) < CFG.world.roadHalfWidth + 0.5;
      if (pedOk && onRoad) {
        cb.onAvoid(key, o);
        return;
      }
    }
    const rel = Math.abs(p.vs - o.vs);
    if (!o.isPedestrian && o.minGap >= 0 && o.minGap < CFG.nearMiss.gap && rel > CFG.nearMiss.minRelativeSpeed && this.nearCooldown <= 0) {
      this.nearCooldown = CFG.nearMiss.cooldown;
      cb.onNearMiss(o);
    }
  }
}
