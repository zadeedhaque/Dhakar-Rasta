import type { World } from '../game/World';
import { CFG } from '../game/GameConfig';
import { chance, clamp, pick, rand, weightedPick } from '../utils/math';
import { chooseHazardLane, hazardBudgetOk, reactionDistance } from './Fairness';
import { BusJamEvent } from './BusJamEvent';
import { T } from '../i18n/bn';

export type EventId =
  | 'WRONG_WAY_RICKSHAW'
  | 'WRONG_WAY_BATTERY_RICKSHAW'
  | 'BUS_JAM'
  | 'PEDESTRIAN_CROSSING'
  | 'MOTORCYCLE_FOOTPATH'
  | 'MOTORCYCLE_SUDDEN_ENTRY'
  | 'MOTORCYCLE_CRASH'
  | 'SUDDEN_RICKSHAW_STOP'
  | 'MARKET_CROWD';

interface EventDef {
  id: EventId;
  minDistance: number;
  cooldown: number;
  /** Relative chance given current difficulty. */
  weight: (w: World) => number;
  /** Does the spawn; returns false if conditions are not fair/valid right now. */
  trigger: (w: World) => boolean;
}

const W = CFG.world;

/**
 * Controlled randomness: every `eventInterval` seconds (difficulty-scaled,
 * jittered) one eligible event is picked by weight. Events respect their own
 * cooldowns, a global spacing, the hazard budget, and the fairness checks.
 * Road construction and market crowds are also produced by road segments.
 */
export class EventManager {
  busJam: BusJamEvent | null = null;
  lastEvent = '';
  private cooldown = new Map<EventId, number>();
  private nextIn = 6;
  private sinceLast = 0;
  private defs: EventDef[] = [
    {
      id: 'WRONG_WAY_RICKSHAW', minDistance: 60, cooldown: 7,
      weight: (w) => w.difficulty.current.wrongWayFrequency * 0.6,
      trigger: (w) => {
        const approach = rand(3, 4.5);
        const s = w.focusS + clamp(reactionDistance(w, approach) + rand(0, 25), 60, 205);
        const lane = chooseHazardLane(w, s, approach, 0.55, 0.45);
        if (lane === null) return false;
        return !!w.traffic.spawn('rickshaw', {
          s, x: lane + rand(-0.4, 0.4), dir: -1, desired: approach, speed: approach,
          mode: 'wrongway', hazardKey: 'wrongWayRickshaw', warn: T.warn.wrongWay,
        });
      },
    },
    {
      id: 'WRONG_WAY_BATTERY_RICKSHAW', minDistance: CFG.events.batteryMinDistance, cooldown: 10,
      weight: (w) => w.difficulty.current.wrongWayFrequency * 0.55,
      trigger: (w) => {
        const side = chance(0.65) ? -1 : 1;
        const s = w.focusS + clamp(reactionDistance(w, 7.5) + rand(30, 55), 90, 215);
        const x = side * 6.3;
        if (!w.traffic.isClear(x, 0.9, s - 5, s + 5, null, false)) return false;
        const v = w.traffic.spawn('battery', { s, x, speed: 0, desired: 0, mode: 'batteryWrongWay', state: 'WAITING' });
        if (!v) return false;
        v.cruise = rand(6.5, 8.5) * w.difficulty.current.speedFactor;
        return true;
      },
    },
    {
      id: 'BUS_JAM', minDistance: CFG.events.busJamMinDistance, cooldown: 30,
      weight: (w) => (this.busJam ? 0 : w.difficulty.current.busEventFrequency * 1.6),
      trigger: (w) => {
        this.busJam = BusJamEvent.tryStart(w);
        return !!this.busJam;
      },
    },
    {
      id: 'PEDESTRIAN_CROSSING', minDistance: 0, cooldown: 4,
      weight: (w) => w.difficulty.current.pedestrianDensity * 1.2,
      trigger: (w) => {
        w.peds.spawnDynamic(pick(['CROSSER', 'CROSSER', 'RUNNER', 'GROUP', 'DISTRACTED'] as const));
        return true;
      },
    },
    {
      id: 'MOTORCYCLE_FOOTPATH', minDistance: 80, cooldown: 8,
      weight: () => 0.6,
      trigger: (w) => {
        const side = chance(0.5) ? -1 : 1;
        const dir = chance(0.3) ? -1 : 1;
        const v = w.traffic.spawn('motorcycle', {
          s: w.focusS + rand(130, 190), x: side * (W.footpathInner + 1.2), dir, desired: rand(4, 6), mode: 'footpath',
        });
        if (v) {
          v.side = side;
          v.scratch = dir > 0 && chance(0.35) ? 1 : 0; // may hop back onto the road
        }
        return !!v;
      },
    },
    {
      id: 'MOTORCYCLE_SUDDEN_ENTRY', minDistance: CFG.events.suddenEntryMinDistance, cooldown: 10,
      weight: (w) => 0.3 + w.difficulty.current.motorcycleAggression * 0.7,
      trigger: (w) => {
        const side = chance(0.5) ? -1 : 1;
        const s = w.focusS + clamp(reactionDistance(w, 0) + rand(25, 45), 80, 205);
        const v = w.traffic.spawn('motorcycle', { s, x: side * (W.footpathInner + 0.6), speed: 0, desired: 0, mode: 'suddenEntry', state: 'WAITING' });
        if (v) v.side = side;
        return !!v;
      },
    },
    {
      id: 'MOTORCYCLE_CRASH', minDistance: CFG.events.motoCrashMinDistance, cooldown: 25,
      weight: () => 0.35,
      trigger: (w) => {
        const side = chance(0.5) ? -1 : 1;
        const s = w.focusS + rand(160, 200);
        const x = side * 5.0;
        if (!w.traffic.isClear(x, 1, s - 10, s + 10, null, false)) return false;
        return !!w.traffic.spawn('motorcycle', { s, x, mode: 'crash', desired: rand(7, 9) });
      },
    },
    {
      id: 'SUDDEN_RICKSHAW_STOP', minDistance: 100, cooldown: 8,
      weight: () => 0.7,
      trigger: (w) => {
        const minD = Math.max(w.playerSpeed, 8) * w.difficulty.current.reactionWindow + 15;
        for (const v of w.traffic.vehicles) {
          const d = v.s - w.focusS;
          if ((v.kind === 'rickshaw' || v.kind === 'battery') && v.dir > 0 && v.mode === 'normal' && d > minD && d < 140 && Math.abs(v.x - w.focusX) < 2.6) {
            v.mode = 'suddenStop';
            v.setState('SLOWING');
            v.hazardKey = 'suddenStop';
            w.audio.bell(v.x - w.focusX, d);
            return true;
          }
        }
        return false;
      },
    },
    {
      id: 'MARKET_CROWD', minDistance: 0, cooldown: 10,
      weight: (w) => (w.road.segmentAt(w.focusS + 120)?.type === 'MARKET' ? 2.5 : 0),
      trigger: (w) => {
        const s = w.focusS + rand(110, 160);
        const side = chance(0.5) ? -1 : 1;
        for (let i = 0; i < 4; i++) w.peds.spawn({ behavior: 'MARKET', s: s + rand(-4, 4), x: side * rand(5.4, 6.6) });
        return true;
      },
    },
  ];

  constructor(private world: World) {}

  reset(): void {
    this.cooldown.clear();
    this.nextIn = 5;
    this.sinceLast = 0;
    this.busJam = null;
  }

  update(dt: number, distance: number): void {
    for (const [k, v] of this.cooldown) this.cooldown.set(k, v - dt);
    if (this.busJam) {
      this.busJam.update(dt);
      if (this.busJam.done) this.busJam = null;
    }
    this.sinceLast += dt;
    this.nextIn -= dt;
    if (this.nextIn > 0 || this.sinceLast < CFG.events.minGapBetweenEvents) return;
    const d = this.world.difficulty.current;
    this.nextIn = d.eventInterval * rand(0.7, 1.3);
    if (!hazardBudgetOk(this.world)) return;
    const eligible = this.defs.filter((e) => distance >= e.minDistance && (this.cooldown.get(e.id) ?? 0) <= 0);
    const def = weightedPick(eligible, (e) => e.weight(this.world));
    if (def) this.fire(def);
  }

  /** Force an event (debug keys). Still goes through the event's own fairness checks. */
  trigger(id: EventId): boolean {
    const def = this.defs.find((d) => d.id === id);
    return def ? this.fire(def) : false;
  }

  private fire(def: EventDef): boolean {
    const ok = def.trigger(this.world);
    if (ok) {
      this.cooldown.set(def.id, def.cooldown);
      this.sinceLast = 0;
      this.lastEvent = def.id;
    }
    return ok;
  }
}
