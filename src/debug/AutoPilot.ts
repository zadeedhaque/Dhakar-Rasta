import type { World } from '../game/World';
import type { InputManager } from '../input/InputManager';
import { LANES } from '../traffic/VehicleAI';

/**
 * Dev-only test driver: picks the lane with the most clearance and brakes when
 * boxed in. Used to soak-test the simulation; not part of gameplay.
 */
export function autopilot(world: World, input: InputManager): void {
  const p = world.player;
  const clearance = (x: number): number => {
    let best = 120;
    const hw = p.halfW + 0.3;
    for (const v of world.traffic.vehicles) {
      const d = v.s - p.s - p.halfL - v.halfL;
      const t = Math.max(0, d) / Math.max(4, p.speed - v.vs);
      const vx = v.x + v.vx * Math.min(t, 2);
      if (d < -1 || (Math.abs(v.x - x) > hw + v.halfW && Math.abs(vx - x) > hw + v.halfW)) continue;
      const closing = p.speed - v.vs;
      best = Math.min(best, closing > 0 ? d - closing * 0.5 : d + 20);
    }
    for (const c of world.traffic.nearbyColliders) {
      const d = c.s - p.s - p.halfL - c.halfL;
      if (d > -1 && Math.abs(c.x - x) < hw + c.halfW) best = Math.min(best, d);
    }
    for (const q of world.peds.active) {
      const d = q.s - p.s;
      if (d < -1 || !q.solid) continue;
      const t = d / Math.max(4, p.speed);
      const qx = q.x + q.vx * Math.min(t, 3);
      const lo = Math.min(q.x, qx) - hw - 0.6;
      const hi = Math.max(q.x, qx) + hw + 0.6;
      if ((q.onRoad || Math.abs(qx) < 7) && x > lo && x < hi) best = Math.min(best, d - 3);
    }
    return best;
  };
  let target = p.x;
  let bestC = clearance(p.x) * 1.15;
  for (const x of LANES) {
    const c = clearance(x);
    if (c > bestC) {
      bestC = c;
      target = x;
    }
  }
  const steer = Math.max(-1, Math.min(1, (target - p.x) * 0.8));
  const want = bestC > 60 ? 20 : bestC > 25 ? 12 : bestC > 10 ? 6 : 0;
  input.setVirtual({
    steer,
    throttle: p.speed < want ? 1 : 0,
    brake: p.speed > want + 2 ? 1 : 0,
  });
}
