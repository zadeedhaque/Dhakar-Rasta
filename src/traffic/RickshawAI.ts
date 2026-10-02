import type { BehaviourFn } from './VehicleAI';
import type { TrafficVehicle } from './TrafficVehicle';
import type { World } from '../game/World';
import { laneDiscipline } from './VehicleAI';
import { clamp, lerp } from '../utils/math';

/** Shared by pedal rickshaws: suddenly stopping, pulling to the kerb, going the wrong way. */
/**
 * Oncoming rickshaws deliberately steer toward the player's lane... but only
 * until the reaction window: inside it they commit to a straight line so a
 * late swerve by the player always works (fairness).
 */
export function homeOnPlayer(v: TrafficVehicle, world: World, range: number): void {
  if (world.demo || v.state === 'CHANGING_LANE') return;
  const ahead = v.s - world.focusS;
  const timeToMeet = ahead / Math.max(1, world.playerSpeed + v.speed);
  if (ahead <= 0 || timeToMeet < world.difficulty.current.reactionWindow * 0.6) return;
  const want = lerp(v.laneX, world.player.x, 0.85);
  v.targetX = clamp(clamp(want, v.laneX - range, v.laneX + range), -6.1, 6.1);
}

export function wrongWayDrive(v: TrafficVehicle, world: World, dt: number, homing = 3.5): void {
  v.desired = v.cruise;
  homeOnPlayer(v, world, homing);
  laneDiscipline(v, world, dt, 0.5);
  if (v.state !== 'CHANGING_LANE') v.setState('WRONG_WAY');
  // ring the bell as it nears the player
  v.bellT -= dt;
  const d = v.s - world.focusS;
  if (d > 0 && d < 60 && v.bellT <= 0) {
    v.bellT = 1.6 + Math.random();
    world.audio.bell(v.x - world.focusX, d);
  }
}

function suddenStop(v: TrafficVehicle, world: World, dt: number): void {
  switch (v.state) {
    case 'SLOWING':
      v.desired = 0;
      v.decel = 7;
      if (v.speed < 0.05) v.setState('STOPPED');
      break;
    case 'STOPPED':
      v.desired = 0;
      if (v.t > 3.5) {
        v.setState('RECOVERING');
        v.decel = 4.5;
      }
      break;
    default:
      v.desired = v.cruise;
      if (v.t > 2) v.mode = 'normal';
  }
}

export const RickshawAI: BehaviourFn = (v, world, dt) => {
  switch (v.mode) {
    case 'jam':
      v.noLaneChange = true;
      return;
    case 'parked':
      v.desired = 0;
      v.speed = 0;
      v.setState('STOPPED');
      return;
    case 'wrongway':
      wrongWayDrive(v, world, dt);
      return;
    case 'suddenStop':
      suddenStop(v, world, dt);
      return;
  }
  laneDiscipline(v, world, dt, 2.5);
  // horn: rickshaws ahead shuffle toward the kerb
  if (world.hornNear(v.s, 28) && v.state !== 'CHANGING_LANE') {
    const edge = v.x < 0 ? -6.0 : 6.0;
    if (world.traffic.isClear(edge, v.halfW + 0.2, v.s - 4, v.s + 6, v)) v.targetX = edge;
  }
  // occasionally pull over to pick up a passenger
  if (v.state === 'DRIVING' && Math.random() < 0.012 * dt) {
    v.targetX = clamp(v.x < 0 ? -6.1 : 6.1, -6.1, 6.1);
    v.setState('STOPPED');
  }
  if (v.state === 'STOPPED') {
    v.desired = Math.abs(v.x - v.targetX) > 0.3 ? 1.2 : 0;
    if (v.t > 4) v.setState('RECOVERING');
  } else v.desired = v.cruise;
  if (v.state === 'RECOVERING' && v.t > 2) v.setState('DRIVING');
};
