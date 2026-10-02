import type { World } from '../game/World';
import type { TrafficVehicle } from '../traffic/TrafficVehicle';
import { CFG } from '../game/GameConfig';
import { chance, clamp, pick, rand } from '../utils/math';
import { reactionDistance } from './Fairness';
import { LANES } from '../traffic/VehicleAI';
import { T } from '../i18n/bn';

type Phase = 'ENTER' | 'BLOCK' | 'LEAVE' | 'DONE';

/**
 * BUS JAM: a bus swings in from the kerb, stops across ~1.5 lanes for about
 * five seconds (longer if the player is still far away, so they actually meet
 * it), passengers spill out, traffic piles up behind, then it pulls away.
 * The far half of the road is checked to be open before it starts.
 */
export class BusJamEvent {
  phase: Phase = 'ENTER';
  private t = 0;
  private readonly targetX: number;
  private pedsSpawned = false;

  private constructor(private world: World, readonly bus: TrafficVehicle, private side: number) {
    this.targetX = side * CFG.busJam.sideX;
  }

  static tryStart(world: World): BusJamEvent | null {
    const side = chance(0.7) ? -1 : 1; // left kerb is where buses stop in Bangladesh
    const s = world.focusS + clamp(reactionDistance(world, 0) + rand(45, 70), 100, 205);
    const seg = world.road.segmentAt(s);
    if (!seg || seg.narrow || seg.type === 'JAM') return null;
    // escape route: at least one lane on the far side must be open around the bus
    const far = LANES.filter((x) => x * side < 0);
    if (!far.some((x) => world.traffic.isClearOfSlow(x, 1.2, s - 25, s + 20))) return null;
    // make room where the bus will stand
    for (let i = world.traffic.vehicles.length - 1; i >= 0; i--) {
      const v = world.traffic.vehicles[i];
      if (Math.abs(v.s - s) < 10 && v.x * side > 1.2) world.traffic.release(v);
    }
    const bus = world.traffic.spawn('bus', {
      s, x: side * 8.4, speed: CFG.busJam.entrySpeed, desired: CFG.busJam.entrySpeed,
      mode: 'busjam', state: 'ENTERING', hazardKey: 'bus', warn: T.warn.bus,
    });
    if (!bus) return null;
    bus.targetX = side * CFG.busJam.sideX;
    bus.latSpeed = 1.7;
    bus.ignoreLeader = true;
    // a queue forms behind it
    for (let i = 0; i < 2; i++) {
      world.traffic.spawn(pick(['cng', 'rickshaw', 'car'] as const), { s: s - 13 - i * 7, x: side * 5.25, speed: 3 });
    }
    world.audio.busHiss(bus.x - world.focusX, s - world.focusS);
    return new BusJamEvent(world, bus, side);
  }

  get done(): boolean {
    return this.phase === 'DONE';
  }

  update(dt: number): void {
    const w = this.world;
    const bus = this.bus;
    if (!w.traffic.vehicles.includes(bus) || bus.mode !== 'busjam') {
      this.phase = 'DONE';
      return;
    }
    this.t += dt;
    switch (this.phase) {
      case 'ENTER': {
        const off = Math.abs(bus.x - this.targetX);
        bus.desired = off > 0.3 ? CFG.busJam.entrySpeed * 0.6 : 0;
        if ((off < 0.3 && bus.speed < 0.3) || this.t > 6) {
          this.phase = 'BLOCK';
          this.t = 0;
          bus.setState('STOPPED');
          // nose out into the road at an angle, like every Dhaka bus at a stop
          bus.yawExtra = this.side * 0.13;
          bus.halfW = 1.35 + 5 * 0.13;
          w.audio.busHiss(bus.x - w.focusX, bus.s - w.focusS);
        }
        break;
      }
      case 'BLOCK': {
        bus.desired = 0;
        if (!this.pedsSpawned && this.t > 0.6) {
          this.pedsSpawned = true;
          // passengers step out in front of the bus (they wait until it is fair to cross)
          for (let i = 0; i < 2; i++) {
            w.peds.spawn({ behavior: 'CROSSER', s: bus.s + bus.halfL + 1.5 + i, x: this.side * (CFG.world.footpathInner + 0.35) });
          }
        }
        const stop = CFG.busJam.stopDuration;
        const playerClose = w.demo || w.player.s > bus.s - 12;
        if (this.t >= stop && (playerClose || this.t > stop + CFG.busJam.maxExtraWait)) {
          this.phase = 'LEAVE';
          bus.mode = 'normal';
          bus.ignoreLeader = false;
          bus.yawExtra = 0;
          bus.halfW = 1.35;
          bus.cruise = rand(6, 8);
          bus.targetX = this.side * 5.25;
          bus.setState('RECOVERING');
          this.phase = 'DONE';
        }
        break;
      }
    }
  }
}
