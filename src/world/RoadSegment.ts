import * as THREE from 'three';
import type { Collider } from '../game/types';
import type { VehicleKind } from '../assets/Models';

export type SegmentType = 'NORMAL_ROAD' | 'MARKET' | 'FOOTBRIDGE' | 'BUS_STOP' | 'COMMERCIAL' | 'CONSTRUCTION' | 'JAM';

export type PedBehavior =
  | 'NORMAL'
  | 'ROAD_WALKER'
  | 'CROSSER'
  | 'RUNNER'
  | 'GROUP'
  | 'DISTRACTED'
  | 'MARKET'
  | 'FOOTBRIDGE_IGNORER'
  | 'STANDING'
  | 'BRIDGE_WALKER';

export interface PedSpawn {
  behavior: PedBehavior;
  s: number;
  x: number;
  y?: number;
  dir?: number;
  vendor?: boolean;
  faceRoad?: boolean;
}

export interface VehicleSpawn {
  kind: VehicleKind;
  s: number;
  x: number;
  speed: number;
  mode: 'jam' | 'busstop' | 'parked';
}

/**
 * One streamed chunk of road. Owns its merged decoration meshes and static
 * colliders; pedestrians / vehicles it wants are queued as lazy spawn specs.
 */
export class RoadSegment {
  group = new THREE.Group();
  colliders: Collider[] = [];
  pedSpawns: PedSpawn[] = [];
  vehicleSpawns: VehicleSpawn[] = [];
  footbridgeS: number | null = null;
  busStopS: number | null = null;
  /** Road is narrowed (market encroachment / construction). Events use this for fairness. */
  narrow = false;

  constructor(
    public type: SegmentType,
    public index: number,
    public s0: number,
    public length: number,
  ) {}

  get s1(): number {
    return this.s0 + this.length;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh || (o as THREE.LineSegments).isLineSegments) {
        const m = o as THREE.Mesh;
        // shared geometries (sign planes) are flagged and must survive
        if (!m.geometry.userData.shared) m.geometry.dispose();
      }
    });
    this.group.clear();
    this.colliders.length = 0;
    this.pedSpawns.length = 0;
    this.vehicleSpawns.length = 0;
  }
}
