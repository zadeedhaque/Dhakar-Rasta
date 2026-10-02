import type { World } from './World';
import type { Body, Collider, Trackable } from './types';
import { CFG } from './GameConfig';
import type { Pedestrian } from '../pedestrians/Pedestrian';
import type { TrafficVehicle } from '../traffic/TrafficVehicle';

export type HitKind = 'vehicle' | 'pedestrian' | 'obstacle' | 'cone';
export interface Hit {
  major: boolean;
  kind: HitKind;
  body: Body;
}

/**
 * AABB collision between the player and everything else, in road space.
 * Classifies hits:
 *   - pedestrian at speed      -> major
 *   - hard obstacle at speed   -> major
 *   - vehicle, high closing speed on the impact axis -> major
 *   - being rear-ended         -> always minor (never the player's fault)
 *   - everything else          -> minor bump (push apart, slow down)
 */
export class CollisionSystem {
  private minorCooldown = 0;
  private bumpedCones = new WeakSet<Collider>();

  reset(): void {
    this.minorCooldown = 0;
  }

  update(world: World, dt: number, onMinor: (h: Hit) => void): Hit | null {
    this.minorCooldown = Math.max(0, this.minorCooldown - dt);
    const p = world.player;
    if (p.invulnerable > 0) return null;
    for (const v of world.traffic.vehicles) {
      const h = this.test(p, v, 'vehicle');
      if (h) {
        if (h.major) return h;
        this.resolveMinor(world, v, onMinor, h);
      }
    }
    for (const ped of world.peds.active) {
      if (!ped.solid) continue;
      const h = this.test(p, ped, 'pedestrian');
      if (h) {
        if (h.major) return h;
        this.resolveMinor(world, ped, onMinor, h);
      }
    }
    for (const c of world.traffic.nearbyColliders) {
      const h = this.test(p, c, c.hard ? 'obstacle' : 'cone');
      if (h) {
        if (h.major) return h;
        if (h.kind === 'cone') {
          if (!this.bumpedCones.has(c)) {
            this.bumpedCones.add(c);
            p.speed *= 0.8;
            p.wobble = 0.6;
            onMinor(h);
          }
        } else this.resolveMinor(world, c, onMinor, h);
      }
    }
    return null;
  }

  private lastPenX = 0;
  private lastPenS = 0;

  private test(p: Body & { speed: number }, o: Body, kind: HitKind): Hit | null {
    const inset = CFG.collision.inset;
    const ds = o.s - p.s;
    const reachS = p.halfL + o.halfL - inset;
    if (Math.abs(ds) >= reachS) return null;
    const dx = o.x - p.x;
    const reachX = p.halfW + o.halfW - inset;
    if (Math.abs(dx) >= reachX) return null;
    const penX = reachX - Math.abs(dx);
    const penS = reachS - Math.abs(ds);
    this.lastPenX = penX;
    this.lastPenS = penS;
    const lateral = penX < penS;
    // signed approach speed along the impact axis (<= 0 means the bodies are separating)
    const closing = lateral ? (p.vx - o.vx) * Math.sign(dx || 1) : (p.vs - o.vs) * Math.sign(ds || 1);
    const C = CFG.collision;
    let major: boolean;
    if (kind === 'pedestrian') major = !lateral && ds > 0 && closing > 2.2; // walking into the car's side is a scare, not a crash
    else if (kind === 'cone') major = false;
    else if (kind === 'obstacle') major = !lateral && closing > C.hardObstacleMajorSpeed;
    else if (lateral) major = closing > C.majorLateralSpeed;
    else major = ds > 0 && closing > C.majorClosingSpeed; // being rear-ended is never the player's fault
    return { major, kind, body: o };
  }

  private resolveMinor(world: World, o: Body, onMinor: (h: Hit) => void, h: Hit): void {
    const p = world.player;
    const dx = o.x - p.x;
    const ds = o.s - p.s;
    if (this.lastPenX < this.lastPenS) {
      p.x -= Math.sign(dx || 1) * (this.lastPenX + 0.02);
      p.vx = -Math.sign(dx || 1) * 2.5;
    } else if (ds > 0) {
      p.s -= this.lastPenS + 0.02;
      p.speed = Math.min(p.speed * CFG.collision.minorSpeedRetain, Math.max(0, o.vs));
    } else {
      p.s += this.lastPenS + 0.02;
      p.speed = Math.max(p.speed, o.vs);
    }
    p.wobble = 1;
    const t = o as Partial<Trackable>;
    if ('collided' in t) t.collided = true;
    if (h.kind === 'pedestrian') {
      const ped = o as Pedestrian;
      if (ped.state !== 'STUMBLED') ped.setState('STUMBLED');
      ped.x += Math.sign(dx || 1) * 0.4;
    } else if (h.kind === 'vehicle') {
      const v = o as TrafficVehicle;
      v.speed *= 0.6;
    }
    if (this.minorCooldown <= 0) {
      this.minorCooldown = CFG.collision.minorCooldown;
      onMinor(h);
    }
  }
}
