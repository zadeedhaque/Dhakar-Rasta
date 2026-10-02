import type { BehaviourFn } from './VehicleAI';
import { laneDiscipline } from './VehicleAI';

/**
 * Buses: slow, huge, reluctant to change lanes. 'busstop' buses sit at the kerb
 * until the player approaches; 'busjam' buses are driven by BusJamEvent.
 */
export const BusAI: BehaviourFn = (v, world, dt) => {
  switch (v.mode) {
    case 'jam':
      v.noLaneChange = true;
      return;
    case 'busjam':
      v.noLaneChange = true;
      return; // BusJamEvent owns desired / targetX
    case 'busstop': {
      v.desired = 0;
      v.setState(v.state === 'RECOVERING' ? 'RECOVERING' : 'STOPPED');
      const ahead = v.s - world.focusS;
      if (v.state === 'STOPPED' && (ahead < 35 + (v.id % 4) * 8 || v.t > 30)) {
        v.mode = 'normal';
        v.setState('RECOVERING');
        world.audio.busHiss(v.x - world.focusX, ahead);
      }
      return;
    }
  }
  v.desired = v.cruise;
  laneDiscipline(v, world, dt, 3.5);
};
