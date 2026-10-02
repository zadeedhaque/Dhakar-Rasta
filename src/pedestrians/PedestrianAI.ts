import type { Pedestrian } from './Pedestrian';
import type { World } from '../game/World';
import { CFG } from '../game/GameConfig';
import { chance, clamp, moveToward, rand } from '../utils/math';
import { BRIDGE } from '../world/Decor';

const W = CFG.world;
const KERB = W.footpathInner + 0.35;

/**
 * Pedestrian state machine:
 *   WALKING -> WAITING -> LOOKING -> CROSSING -> SIDEWALK -> WALKING
 *   ROAD (walking in the carriageway), IDLE (vendors, bus queue), FLEEING (horn), STUMBLED (bumped)
 * Crossers only *start* crossing when the player is far enough away to react
 * (fairness); after that they do not look out for cars — this is Dhaka.
 */
export function updatePedestrian(p: Pedestrian, world: World, dt: number): void {
  p.t += dt;
  const rw = world.difficulty.current.reactionWindow;
  const v = world.playerSpeed;
  const ahead = p.s - world.focusS;
  const hornHere = world.hornNear(p.s, 32) && p.behavior !== 'DISTRACTED';
  p.vx = 0;
  p.vs = 0;

  if (p.behavior === 'BRIDGE_WALKER') {
    p.vx = p.dirS * p.speed;
    if (Math.abs(p.x + p.vx * dt) > BRIDGE.halfSpan - 0.6) p.dirS *= -1;
    p.x += p.vx * dt;
    return;
  }

  switch (p.state) {
    case 'WALKING': {
      if (p.behavior === 'MARKET') {
        const dx = p.targetX - p.x;
        const ds = p.targetS - p.s;
        const d = Math.hypot(dx, ds);
        if (d < 0.3) {
          p.dur = rand(1, 4);
          p.setState('IDLE');
        } else {
          p.vx = (dx / d) * p.speed;
          p.vs = (ds / d) * p.speed;
        }
        if (hornHere && p.onRoad) {
          p.targetX = p.side * rand(KERB + 0.2, KERB + 1.5);
          p.hurry = 1.8;
        }
      } else {
        p.vs = p.dirS * p.speed;
      }
      break;
    }
    case 'IDLE': {
      if (p.behavior === 'MARKET' && p.t > p.dur) {
        // shoppers drift around stalls, sometimes stepping into the road edge
        p.targetX = p.side * (chance(0.18) ? rand(5.3, 6.6) : rand(KERB, W.footpathOuter - 1.5));
        p.targetS = p.s + rand(-6, 6);
        p.hurry = 1;
        p.setState('WALKING');
      }
      break;
    }
    case 'WAITING': {
      const minD = v * rw * 0.9 + 8;
      const maxD = v * (rw + 1.6) + 32;
      const start = (ahead > minD && ahead < maxD) || (ahead < -4 && chance(0.4 * dt)) || (p.t > 30 && ahead > maxD);
      if (start) {
        if (p.behavior === 'DISTRACTED') p.pauseLeft = chance(0.5) ? rand(0.8, 1.6) : -2; // -2 = never pauses
        if (p.behavior === 'RUNNER' || p.behavior === 'DISTRACTED') p.setState('CROSSING');
        else {
          p.dur = rand(0.5, 1.1);
          p.setState('LOOKING');
        }
      }
      break;
    }
    case 'LOOKING': {
      p.yaw = p.side * Math.PI / 2 + Math.sin(p.t * 6) * 0.6;
      if (p.t > p.dur) p.setState('CROSSING');
      break;
    }
    case 'CROSSING': {
      if (hornHere) p.hurry = 1.8;
      // distracted people sometimes stop mid-road to check their phone
      if (p.pauseLeft > 0 && Math.abs(p.x) < 3) {
        p.pauseLeft -= dt;
        break;
      }
      // fairness: someone frozen mid-road does not suddenly step off again right in front of the car
      if (p.behavior === 'DISTRACTED' && p.pauseLeft <= 0 && p.pauseLeft > -1 && ahead > 0 && ahead < v * 1.4 + 10) {
        p.pauseLeft = -0.5; // keep waiting this frame
        break;
      }
      if (p.pauseLeft < 0) p.pauseLeft = -2;
      p.vx = -p.side * p.speed * p.hurry;
      if (-p.side * p.x > KERB) {
        p.side = -p.side;
        p.dirS = chance(0.5) ? 1 : -1;
        p.hurry = 1;
        p.behavior = 'NORMAL';
        p.targetX = p.side * rand(KERB + 0.3, W.footpathOuter - 0.6);
        p.setState('SIDEWALK');
      }
      break;
    }
    case 'ROAD': {
      p.vs = p.dirS * p.speed;
      p.vx = clamp((p.targetX - p.x) * 2, -1, 1);
      if (p.t > p.dur || hornHere) {
        p.targetX = p.side * rand(KERB + 0.3, W.footpathOuter - 0.6);
        p.hurry = hornHere ? 2 : 1;
        p.setState(hornHere ? 'FLEEING' : 'SIDEWALK');
      }
      break;
    }
    case 'SIDEWALK':
    case 'FLEEING': {
      p.vx = clamp((p.targetX - p.x) * 3, -1, 1) * p.speed * p.hurry;
      p.vs = p.dirS * p.speed * 0.5;
      if (Math.abs(p.targetX - p.x) < 0.15) {
        p.hurry = 1;
        p.setState('WALKING');
      }
      break;
    }
    case 'STUMBLED': {
      p.tilt = moveToward(p.tilt, p.t < 1.4 ? 0.9 : 0, dt * 3);
      if (p.t > 2.2) {
        p.targetX = (p.x < 0 ? -1 : 1) * (KERB + 0.6);
        p.side = p.x < 0 ? -1 : 1;
        p.setState('SIDEWALK');
      }
      break;
    }
  }

  p.x += p.vx * dt;
  p.s += p.vs * dt;

  // hazard tagging for the reward system
  const dangerous = p.onRoad && (p.state === 'CROSSING' || p.state === 'ROAD' || p.state === 'LOOKING' || p.behavior === 'MARKET');
  p.hazardKey = dangerous ? 'pedestrian' : null;
}
