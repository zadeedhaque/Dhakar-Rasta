import * as THREE from 'three';
import { assets } from '../assets/Models';
import { VERTEX_MATERIAL } from '../utils/GeoBuilder';
import { CFG } from '../game/GameConfig';
import { LANES } from '../traffic/VehicleAI';
import type { World } from '../game/World';
import type { Collider } from '../game/types';

/**
 * After a major crash a traffic officer walks over from the footpath to the
 * driver's window (right-hand drive). The dialog itself is UI; this class owns
 * the NPC and the "clear the scene and let the player continue" logic.
 */
export class PoliceEvent {
  readonly mesh: THREE.Mesh;
  private t = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  arrived = false;
  encounters = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(assets.policeGeometry(), VERTEX_MATERIAL);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Cost of each option. Escalates slightly with repeat offences. */
  fineCost(): number {
    return CFG.police.fine;
  }
  bribeCost(): number {
    return CFG.police.bribe;
  }

  start(world: World): void {
    const p = world.player;
    this.t = 0;
    this.arrived = false;
    this.encounters++;
    this.from.set(CFG.world.footpathInner + 0.8, 0, -(p.s + 4));
    this.to.set(p.x + p.halfW + 0.7, 0, -(p.s + 0.6));
    this.mesh.position.copy(this.from);
    this.mesh.visible = true;
    world.audio.whistle();
  }

  update(dt: number): boolean {
    if (!this.mesh.visible || this.arrived) return this.arrived;
    this.t += dt;
    const k = Math.min(1, this.t / CFG.police.walkTime);
    this.mesh.position.lerpVectors(this.from, this.to, k);
    this.mesh.position.y = Math.abs(Math.sin(this.t * 9)) * 0.06;
    const dx = this.to.x - this.from.x;
    const dz = this.to.z - this.from.z;
    this.mesh.rotation.y = k < 1 ? Math.atan2(-dx, -dz) : Math.PI / 2; // finally face the car
    if (k >= 1) this.arrived = true;
    return this.arrived;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  /** Clear the crash site and put the player in a free lane, briefly invulnerable. */
  resumePlayer(world: World): void {
    const p = world.player;
    this.hide();
    world.traffic.clearZone(p.s - 25, p.s + 45);
    world.peds.clearRoad(p.s - 15, p.s + 45);
    const cols: Collider[] = [];
    world.road.collidersIn(p.s - 6, p.s + 30, cols);
    const lanes = [...LANES].sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x));
    const free = lanes.find((x) => !cols.some((c) => Math.abs(c.x - x) < c.halfW + p.halfW + 0.2));
    if (free !== undefined) p.x = free;
    else p.s -= 12;
    p.speed = 0;
    p.vx = 0;
    p.invulnerable = CFG.player.invulnerableAfterPolice;
  }
}
