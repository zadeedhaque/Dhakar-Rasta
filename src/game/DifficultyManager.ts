import { CFG, DifficultyTier } from './GameConfig';
import { lerp } from '../utils/math';

type Numeric = Exclude<keyof DifficultyTier, 'name' | 'd'>;
const KEYS: Numeric[] = [
  'trafficDensity', 'pedestrianDensity', 'wrongWayFrequency', 'busEventFrequency',
  'motorcycleAggression', 'reactionWindow', 'marketFrequency', 'maxHazards', 'eventInterval', 'speedFactor',
];

/** Interpolates tier parameters by distance so difficulty ramps smoothly. */
export class DifficultyManager {
  current: DifficultyTier = { ...CFG.difficulty.tiers[0] };
  /** Debug helper: virtual extra distance. */
  boost = 0;
  tierIndex = 0;

  update(distance: number): void {
    const tiers = CFG.difficulty.tiers;
    const d = distance + this.boost;
    let i = 0;
    while (i < tiers.length - 1 && d >= tiers[i + 1].d) i++;
    this.tierIndex = i;
    const a = tiers[i];
    const b = tiers[Math.min(i + 1, tiers.length - 1)];
    const t = a === b ? 0 : (d - a.d) / (b.d - a.d);
    const cur = this.current;
    for (const k of KEYS) cur[k] = lerp(a[k], b[k], t);
    cur.name = a.name;
    cur.d = d;
  }

  get hazardCap(): number {
    return Math.max(1, Math.round(this.current.maxHazards));
  }
}
