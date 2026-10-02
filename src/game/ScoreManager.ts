import { CFG } from './GameConfig';
import { storage } from './Storage';

/** Per-run statistics and score. Primary score = distance travelled. */
export class ScoreManager {
  distance = 0; // metres
  bonusScore = 0;
  avoids = 0;
  nearMisses = 0;
  collisions = 0;
  policeEncounters = 0;
  cleanDistance = 0;
  private nextMilestone = CFG.score.cleanMilestoneDistance;

  reset(): void {
    this.distance = 0;
    this.bonusScore = 0;
    this.avoids = 0;
    this.nearMisses = 0;
    this.collisions = 0;
    this.policeEncounters = 0;
    this.cleanDistance = 0;
    this.nextMilestone = CFG.score.cleanMilestoneDistance;
  }

  get score(): number {
    return Math.max(0, Math.floor(this.distance * CFG.score.perMeter + this.bonusScore));
  }

  /** Advance distance; returns true when a clean-driving milestone was just reached. */
  addDistance(dm: number): boolean {
    if (dm <= 0) return false;
    this.distance += dm;
    this.cleanDistance += dm;
    if (this.cleanDistance >= this.nextMilestone) {
      this.nextMilestone += CFG.score.cleanMilestoneDistance;
      return true;
    }
    return false;
  }

  onCollision(): void {
    this.collisions++;
    this.cleanDistance = 0;
    this.nextMilestone = CFG.score.cleanMilestoneDistance;
  }

  /** Persist run results. Returns true if a new high score was set. */
  commitRun(totalEarned: number): boolean {
    const d = storage.data;
    const record = this.score > d.highScore;
    if (record) d.highScore = this.score;
    d.maxDistance = Math.max(d.maxDistance, this.distance);
    d.totalMoney += totalEarned;
    d.totalAvoids += this.avoids;
    d.runs += 1;
    storage.save();
    return record;
  }
}
