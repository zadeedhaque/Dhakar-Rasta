import { CFG } from '../game/GameConfig';
import type { Hit } from '../game/CollisionSystem';

/**
 * Major-collision sequence: brief slow motion + shake + "দুর্ঘটনা!" banner,
 * then hands over to the police event. No gore: vehicles stop, people stumble.
 */
export class CrashEvent {
  active = false;
  hit: Hit | null = null;
  private t = 0;

  start(hit: Hit): void {
    this.active = true;
    this.hit = hit;
    this.t = 0;
  }

  /** Simulation time-scale while the crash plays out. */
  get timeScale(): number {
    const k = Math.min(1, this.t / CFG.collision.crashSlowMoTime);
    return CFG.collision.crashSlowMoScale * (1 - k);
  }

  /** Returns true once the sequence has finished. Uses real (unscaled) time. */
  update(realDt: number): boolean {
    if (!this.active) return false;
    this.t += realDt;
    if (this.t >= CFG.collision.crashSlowMoTime) {
      this.active = false;
      return true;
    }
    return false;
  }
}
