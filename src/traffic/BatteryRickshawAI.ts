import type { BehaviourFn } from './VehicleAI';
import { laneDiscipline } from './VehicleAI';
import { wrongWayDrive } from './RickshawAI';
import { chooseHazardLane, hazardBudgetOk, reactionDistance } from '../events/Fairness';
import { lerp } from '../utils/math';
import { T } from '../i18n/bn';

const TURN_TIME = 0.8;

/**
 * Battery (electric) rickshaw. More dangerous than pedal rickshaws: faster,
 * and in 'batteryWrongWay' mode it waits at the roadside, then
 *   NORMAL(WAITING) -> SUDDEN_WRONG_WAY(TURNING) -> APPROACH_PLAYER(WRONG_WAY) -> PASS_PLAYER(RECOVERING)
 * During the approach it drifts toward the player's lane, but stops drifting
 * once inside the reaction window, so it is always dodgeable.
 */
export const BatteryRickshawAI: BehaviourFn = (v, world, dt) => {
  if (v.mode === 'jam') {
    v.noLaneChange = true;
    return;
  }
  if (v.mode === 'wrongway') {
    wrongWayDrive(v, world, dt);
    return;
  }
  if (v.mode !== 'batteryWrongWay') {
    v.desired = v.cruise;
    laneDiscipline(v, world, dt, 1.4);
    return;
  }
  switch (v.state) {
    case 'WAITING': {
      v.desired = 0;
      const ahead = v.s - world.focusS;
      if (ahead < -5) {
        v.mode = 'normal'; // player already passed: just a parked rickshaw
        return;
      }
      if (ahead < reactionDistance(world, v.cruise) + 6) {
        const lane = chooseHazardLane(world, v.s, v.cruise, v.halfW, 0.55);
        if (lane === null || !hazardBudgetOk(world)) return; // no fair moment yet; keep waiting
        v.targetX = lane;
        v.laneX = lane; // remember the committed lane
        v.hazardKey = 'wrongWayBattery';
        v.warnText = T.warn.wrongWay;
        v.ignoreLeader = true;
        v.setState('TURNING');
        world.audio.horn2(v.x - world.focusX, ahead);
      }
      break;
    }
    case 'TURNING': {
      v.desired = 1.5;
      v.yawExtra = lerp(0, Math.PI, Math.min(1, v.t / TURN_TIME));
      if (v.t >= TURN_TIME) {
        v.dir = -1;
        v.yawExtra = 0;
        v.speed = 2;
        v.ignoreLeader = false;
        v.setState('WRONG_WAY');
      }
      break;
    }
    case 'WRONG_WAY':
    case 'CHANGING_LANE': {
      // homes in on the player (one lane either way), then commits inside the reaction window
      wrongWayDrive(v, world, dt, 1.75);
      if (v.s < world.focusS - 6) v.setState('RECOVERING');
      break;
    }
    default:
      v.desired = v.cruise;
  }
};
