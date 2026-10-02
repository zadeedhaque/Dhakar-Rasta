import * as THREE from 'three';
import { assets, buildPlayerTailLights } from '../assets/Models';
import { VERTEX_MATERIAL } from '../utils/GeoBuilder';
import { CFG } from '../game/GameConfig';
import { clamp } from '../utils/math';
import type { Body } from '../game/types';

/** Player vehicle state + its view. Physics lives in PlayerController. */
export class PlayerCar implements Body {
  readonly mesh = new THREE.Group();
  private body: THREE.Mesh;
  private tailMat = new THREE.MeshBasicMaterial({ color: 0x7a0d0d });
  x = 0;
  s = 0;
  speed = 0; // forward m/s (negative = reversing)
  vx = 0;
  halfW = CFG.player.halfW;
  halfL = CFG.player.halfL;
  throttle = 0;
  braking = false;
  invulnerable = 0;
  wobble = 0;
  accelVis = 0;
  scraping = false;

  constructor() {
    this.body = new THREE.Mesh(assets.playerGeometry(), VERTEX_MATERIAL);
    const tail = new THREE.Mesh(buildPlayerTailLights(), this.tailMat);
    this.mesh.add(this.body, tail);
  }

  get vs(): number {
    return this.speed;
  }

  reset(s: number, x = 1.75): void {
    this.s = s;
    this.x = x;
    this.speed = 0;
    this.vx = 0;
    this.invulnerable = 0;
    this.wobble = 0;
    this.braking = false;
    this.sync(0, 0);
  }

  sync(dt: number, time: number): void {
    const yaw = clamp(-this.vx / Math.max(Math.abs(this.speed), 6) * 0.45, -0.28, 0.28);
    this.wobble = Math.max(0, this.wobble - dt * 2.5);
    const wob = Math.sin(time * 40) * this.wobble * 0.08;
    this.mesh.position.set(this.x, 0, -this.s);
    this.mesh.rotation.set(clamp(this.accelVis * 0.004, -0.09, 0.05), yaw + wob, -this.vx * 0.012 + wob * 0.5);
    this.tailMat.color.setHex(this.braking ? 0xff2a2a : 0x7a0d0d);
    // ghost blink while invulnerable after the police let you go
    this.mesh.visible = this.invulnerable <= 0 || Math.floor(time * 10) % 2 === 0;
  }
}
