import type { BehaviourFn } from './VehicleAI';
import { laneDiscipline, tryLaneChange } from './VehicleAI';
import { chooseHazardLane, reactionDistance } from '../events/Fairness';
import { clamp } from '../utils/math';
import { T } from '../i18n/bn';
import { CFG } from '../game/GameConfig';

/**
 * Motorcycles: NORMAL weaving, OVERTAKER (from behind the player), FOOTPATH_RIDER,
 * SUDDEN_ENTRY (pops out from the footpath) and CRASH_EVENT (skids into the kerb
 * and lies there as an obstacle). Helmetless riders are a visual variant.
 */
export const MotorcycleAI: BehaviourFn = (v, world, dt) => {
  const W = CFG.world;
  switch (v.mode) {
    case 'jam':
      v.noLaneChange = true;
      return;
    case 'footpath': {
      v.desired = v.cruise;
      v.targetX = v.side * (W.footpathInner + 1.2);
      // some footpath riders bounce back onto the road ahead of the player
      if (v.scratch > 0 && v.s - world.focusS < reactionDistance(world, 0) + 10 && v.s > world.focusS + 20) {
        v.scratch = 0;
        v.mode = 'suddenEntry';
        v.setState('WAITING');
      }
      return;
    }
    case 'suddenEntry': {
      if (v.state === 'WAITING') {
        v.desired = 0;
        const ahead = v.s - world.focusS;
        if (ahead < -3) {
          v.mode = 'footpath';
          return;
        }
        if (ahead < reactionDistance(world, 0) + 4) {
          const lane = chooseHazardLane(world, v.s, 0, v.halfW, 0);
          const outer = v.side * 5.25;
          if (lane === null || Math.abs(lane - outer) > 3.6) return;
          v.targetX = outer;
          v.latSpeed = 2.4;
          v.hazardKey = 'suddenEntry';
          v.warnText = T.warn.motorcycle;
          v.setState('ENTERING');
          world.audio.horn2(v.x - world.focusX, ahead);
        }
      } else if (v.state === 'ENTERING') {
        v.desired = 6;
        if (Math.abs(v.x - v.targetX) < 0.2) {
          v.mode = 'normal';
          v.setState('DRIVING');
          v.latSpeed = 3.6;
        }
      }
      return;
    }
    case 'crash': {
      if (v.state === 'CRASHED') {
        v.desired = 0;
        v.decel = 7;
        v.roll = clamp(v.roll + v.side * dt * 3, -1.35, 1.35);
        v.halfW = 0.75;
        return;
      }
      v.desired = v.cruise;
      const ahead = v.s - world.focusS;
      if (ahead > 0 && ahead < Math.max(world.playerSpeed, 8) * world.difficulty.current.reactionWindow + 30) {
        v.side = v.x < 0 ? -1 : 1;
        v.targetX = v.side * 6.3;
        v.latSpeed = 3;
        v.ignoreLeader = true;
        v.hazardKey = 'motoCrash';
        v.warnText = T.warn.fallen;
        v.setState('CRASHED');
        world.audio.skid(v.x - world.focusX, ahead);
      }
      return;
    }
    case 'overtaker': {
      v.desired = Math.min(30, Math.max(v.cruise, world.playerSpeed + 5));
      if (v.s > world.focusS + 35) v.mode = 'normal';
      return;
    }
  }
  v.desired = v.cruise;
  laneDiscipline(v, world, dt, 0.5);
  // weave: aggressive riders split lanes often
  if (v.state === 'DRIVING' && Math.random() < v.aggression * 0.3 * dt) tryLaneChange(v, world);
};
