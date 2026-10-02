import * as THREE from 'three';
import { assets } from '../assets/Models';
import { VERTEX_MATERIAL } from '../utils/GeoBuilder';
import { CFG } from '../game/GameConfig';
import type { HazardKey, Trackable } from '../game/types';
import type { PedBehavior } from '../world/RoadSegment';

export type PedState = 'WALKING' | 'WAITING' | 'LOOKING' | 'CROSSING' | 'ROAD' | 'SIDEWALK' | 'IDLE' | 'FLEEING' | 'STUMBLED';

let NEXT_ID = 100000;

export class Pedestrian implements Trackable {
  id = NEXT_ID++;
  readonly mesh: THREE.Mesh;
  x = 0;
  s = 0;
  y = 0;
  vs = 0;
  vx = 0;
  halfW = 0.3;
  halfL = 0.3;
  behavior: PedBehavior = 'NORMAL';
  state: PedState = 'WALKING';
  t = 0;
  dur = 0;
  speed = 1.2;
  hurry = 1;
  targetX = 0;
  targetS = 0;
  dirS = 1;
  side = 1;
  phase = 0;
  yaw = 0;
  tilt = 0;
  solid = true; // false for people on the footbridge deck
  pauseLeft = 0;

  passed = false;
  collided = false;
  minGap = Infinity;
  prevDs: number | null = null;
  hazardKey: HazardKey | null = null;
  readonly isPedestrian = true;
  warnText: string | null = null;

  constructor() {
    this.mesh = new THREE.Mesh(assets.pedVariants()[0], VERTEX_MATERIAL);
  }

  activate(vendor: boolean): void {
    const vars = assets.pedVariants();
    this.mesh.geometry = vendor ? vars[assets.vendorIndex()] : vars[Math.floor(Math.random() * (vars.length - 4))];
    this.mesh.visible = true;
    this.vs = this.vx = this.t = this.y = this.tilt = 0;
    this.hurry = 1;
    this.solid = true;
    this.pauseLeft = 0;
    this.passed = this.collided = false;
    this.minGap = Infinity;
    this.prevDs = null;
    this.hazardKey = null;
    this.warnText = null;
    this.phase = Math.random() * 10;
  }

  get onRoad(): boolean {
    return Math.abs(this.x) < CFG.world.roadHalfWidth + 0.1 && this.y < 0.5;
  }

  setState(s: PedState): void {
    if (s !== this.state) {
      this.state = s;
      this.t = 0;
    }
  }
}
