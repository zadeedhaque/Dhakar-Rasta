import * as THREE from 'three';
import { PlayerCar } from '../player/PlayerCar';
import { DifficultyManager } from './DifficultyManager';
import { RoadManager } from '../world/RoadManager';
import { TrafficManager } from '../traffic/TrafficManager';
import { PedestrianManager } from '../pedestrians/PedestrianManager';
import type { AudioManager } from '../audio/AudioManager';
import { CFG } from './GameConfig';

/**
 * Shared simulation context. Owns the world-side managers and answers
 * cross-cutting questions ("where is the player?", "is the horn sounding?").
 * In menu (demo) mode a ghost camera-target drives the streaming instead of
 * the player car, which gives the animated title screen for free.
 */
export class World {
  readonly player = new PlayerCar();
  readonly difficulty = new DifficultyManager();
  readonly road: RoadManager;
  readonly traffic: TrafficManager;
  readonly peds: PedestrianManager;
  demo = true;
  ghostS = 0;
  time = 0;
  private hornUntil = -1;

  constructor(readonly scene: THREE.Scene, readonly audio: AudioManager) {
    scene.add(this.player.mesh);
    this.road = new RoadManager(this);
    this.traffic = new TrafficManager(this);
    this.peds = new PedestrianManager(this);
  }

  get focusS(): number {
    return this.demo ? this.ghostS : this.player.s;
  }
  get focusX(): number {
    return this.demo ? 0 : this.player.x;
  }
  get playerSpeed(): number {
    return this.demo ? CFG.menuDemo.speed : Math.max(0, this.player.speed);
  }

  soundHorn(): void {
    this.hornUntil = this.time + 0.3;
  }
  /** True if the player's horn is sounding and `s` is within `range` metres ahead. */
  hornNear(s: number, range: number): boolean {
    if (this.demo || this.time > this.hornUntil) return false;
    const d = s - this.player.s;
    return d > 0 && d < range;
  }

  activeHazards(): number {
    return this.traffic.countHazards() + this.peds.countHazards();
  }

  /** Wipe and rebuild the world from s = 0. */
  reset(demo: boolean): void {
    this.demo = demo;
    this.ghostS = 0;
    this.traffic.clear();
    this.peds.clear();
    this.road.reset();
    this.player.reset(8, 1.75);
    this.player.mesh.visible = !demo;
    this.difficulty.boost = 0;
    this.difficulty.update(demo ? CFG.menuDemo.difficultyDistance : 0);
    this.road.update(this.focusS);
    this.traffic.refreshColliders();
    this.traffic.populate();
  }

  /** Advance all world-side simulation. dt already time-scaled. */
  update(dt: number): void {
    this.time += dt;
    if (this.demo) this.ghostS += CFG.menuDemo.speed * dt;
    this.road.update(this.focusS);
    this.traffic.update(dt);
    this.peds.update(dt);
  }
}
