import * as THREE from 'three';
import { CFG } from './GameConfig';
import { damp } from '../utils/math';
import type { World } from './World';

export type CameraMode = 'follow' | 'menu' | 'police' | 'gameover';

/** Third-person chase camera with smoothing, speed FOV and trauma-based shake. */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'menu';
  shakeEnabled = true;
  private trauma = 0;
  private pos = new THREE.Vector3(0, 6, 10);
  private look = new THREE.Vector3(0, 1, -20);
  private tmp = new THREE.Vector3();
  private t = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CFG.camera.fov, aspect, 0.3, 420);
  }

  addShake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  snap(): void {
    this.t = 0;
    this.trauma = 0;
  }

  update(world: World, realDt: number): void {
    this.t += realDt;
    const C = CFG.camera;
    const p = world.player;
    let lambda = C.followLambda;
    const pos = this.tmp;
    switch (this.mode) {
      case 'follow': {
        const back = C.back + Math.max(0, p.accelVis) * 0.05;
        pos.set(p.x * 0.8, C.height, -p.s + back);
        this.look.set(p.x * 0.9, 0.2, -p.s - C.lookAhead);
        break;
      }
      case 'menu': {
        const s = world.ghostS;
        pos.set(Math.sin(this.t * 0.13) * 4.5 - 1, 6.2 + Math.sin(this.t * 0.09) * 1.2, -s + 14);
        this.look.set(Math.sin(this.t * 0.07) * 2, 2.0, -s - 28);
        lambda = 3;
        break;
      }
      case 'police': {
        // in front of the car, toward the road centre, looking back at car + officer
        const side = p.x > 0 ? -1 : 1;
        pos.set(p.x + side * 2.2, 2.9, -p.s - 8);
        this.look.set(p.x + 0.6, 1.0, -p.s);
        lambda = 2.5;
        break;
      }
      case 'gameover': {
        const a = this.t * 0.25;
        pos.set(p.x + Math.sin(a) * 9, 4.5, -p.s + Math.cos(a) * 9);
        this.look.set(p.x, 0.8, -p.s);
        lambda = 2;
        break;
      }
    }
    this.pos.x = damp(this.pos.x, pos.x, lambda, realDt);
    this.pos.y = damp(this.pos.y, pos.y, lambda, realDt);
    this.pos.z = this.mode === 'follow' ? pos.z : damp(this.pos.z, pos.z, lambda, realDt);
    this.camera.position.copy(this.pos);
    this.trauma = Math.max(0, this.trauma - C.shakeDecay * realDt * 0.4);
    if (this.shakeEnabled && this.trauma > 0) {
      const k = this.trauma * this.trauma;
      this.camera.position.x += (Math.random() - 0.5) * k * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * k * 0.6;
    }
    this.camera.lookAt(this.look);
    const speedNorm = this.mode === 'follow' ? Math.max(0, p.speed) / CFG.player.maxSpeed : 0;
    const fov = C.fov + speedNorm * C.fovSpeedBoost;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = damp(this.camera.fov, fov, 3, realDt);
      this.camera.updateProjectionMatrix();
    }
  }
}
