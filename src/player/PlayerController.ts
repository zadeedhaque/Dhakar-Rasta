import type { PlayerCar } from './PlayerCar';
import type { InputManager } from '../input/InputManager';
import { CFG } from '../game/GameConfig';
import { clamp, moveToward } from '../utils/math';

const SENS = [0.75, 1, 1.25];

/**
 * Arcade handling: mostly forward motion with controlled lateral movement.
 * Lateral authority scales with speed so you cannot slide sideways when stopped.
 */
export function updatePlayer(p: PlayerCar, input: InputManager, dt: number, sensitivity: 0 | 1 | 2): void {
  const C = CFG.player;
  const th = input.throttle;
  const br = input.brake;
  const prev = p.speed;
  p.braking = false;
  if (br > 0) {
    if (p.speed > 0.4) {
      p.speed -= C.brake * br * dt;
      p.braking = true;
    } else p.speed = Math.max(-C.reverseMax, p.speed - 5 * br * dt);
  } else if (th > 0) {
    if (p.speed < 0) p.speed = Math.min(0, p.speed + C.brake * dt);
    else p.speed += C.accel * th * Math.pow(Math.max(0, 1 - p.speed / C.maxSpeed), 0.7) * dt;
  } else {
    p.speed = moveToward(p.speed, 0, C.drag * dt);
  }
  p.speed = clamp(p.speed, -C.reverseMax, C.maxSpeed);
  p.throttle = th;
  p.accelVis = moveToward(p.accelVis, (p.speed - prev) / Math.max(dt, 1e-4), 60 * dt);

  const authority = clamp(Math.abs(p.speed) / 7, 0.2, 1);
  const targetVx = input.steer * C.maxLateralSpeed * authority * SENS[sensitivity];
  p.vx = moveToward(p.vx, targetVx, C.lateralAccel * dt);
  p.x += p.vx * dt;
  p.scraping = false;
  if (Math.abs(p.x) > C.xLimit) {
    p.scraping = Math.abs(p.speed) > 3;
    p.x = Math.sign(p.x) * C.xLimit;
    p.vx = 0;
    if (p.scraping) p.speed *= 1 - 0.6 * dt; // kerb scrape slows you
  }
  p.s += p.speed * dt;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
}
