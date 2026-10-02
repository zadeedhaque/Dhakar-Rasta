import type { BehaviourFn } from './VehicleAI';
import { laneDiscipline, tryLaneChange } from './VehicleAI';

/** Cars, CNGs and trucks: lane following, overtaking, the odd unpredictable lane change. */
export const CarAI: BehaviourFn = (v, world, dt) => {
  if (v.mode === 'jam') {
    v.noLaneChange = true;
    return;
  }
  if (v.mode === 'parked') {
    v.desired = 0;
    return;
  }
  v.desired = v.cruise;
  laneDiscipline(v, world, dt, 1.6 - v.aggression);
  // Dhaka special: aggressive drivers swap lanes unprompted (still never into the player).
  if (v.state === 'DRIVING' && Math.random() < v.aggression * 0.12 * dt) {
    if (tryLaneChange(v, world)) v.setState('OVERTAKING');
  }
  if (v.state === 'OVERTAKING' && Math.abs(v.x - v.targetX) < 0.15) v.setState('DRIVING');
};
