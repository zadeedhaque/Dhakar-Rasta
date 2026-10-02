import * as THREE from 'three';
import { RoadSegment, SegmentType } from './RoadSegment';
import { GeoBuilder } from '../utils/GeoBuilder';
import { DecorCtx, finalize } from './Decor';
import { buildNormal, buildJam } from './segments/NormalSegment';
import { buildMarket } from './segments/MarketSegment';
import { buildFootbridge } from './segments/FootbridgeSegment';
import { buildBusStop } from './segments/BusStopSegment';
import { buildConstruction } from './segments/ConstructionSegment';
import { CFG } from '../game/GameConfig';
import { weightedPick } from '../utils/math';
import type { Collider } from '../game/types';
import type { World } from '../game/World';

const NARROW: SegmentType[] = ['MARKET', 'CONSTRUCTION'];

/**
 * Streams road segments: keeps several ahead of the focus point, disposes
 * the ones left behind, and picks the next type with difficulty-weighted,
 * rule-checked randomness so the road is effectively endless.
 */
export class RoadManager {
  segments: RoadSegment[] = [];
  private nextIndex = 0;
  readonly root = new THREE.Group();

  constructor(private world: World) {
    world.scene.add(this.root);
  }

  reset(): void {
    for (const s of this.segments) this.disposeSegment(s);
    this.segments = [];
    this.nextIndex = 0;
  }

  update(focusS: number): void {
    const L = CFG.world.segmentLength;
    const minS = focusS - CFG.world.segmentsBehind * L;
    while (this.segments.length && this.segments[0].s1 < minS) this.disposeSegment(this.segments.shift()!);
    const maxS = focusS + CFG.world.segmentsAhead * L;
    // at most one new segment per frame keeps generation hitch-free
    let built = 0;
    while ((this.segments.length === 0 || this.segments[this.segments.length - 1].s1 < maxS) && built < (this.segments.length < 3 ? 8 : 1)) {
      this.spawnNext();
      built++;
    }
  }

  private spawnNext(): void {
    const idx = this.nextIndex++;
    const type = this.chooseType(idx);
    const seg = new RoadSegment(type, idx, idx * CFG.world.segmentLength, CFG.world.segmentLength);
    const ctx: DecorCtx = { b: new GeoBuilder(), wires: [], seg };
    switch (type) {
      case 'NORMAL_ROAD': buildNormal(ctx, false); break;
      case 'COMMERCIAL': buildNormal(ctx, true); break;
      case 'MARKET': buildMarket(ctx); break;
      case 'FOOTBRIDGE': buildFootbridge(ctx); break;
      case 'BUS_STOP': buildBusStop(ctx); break;
      case 'CONSTRUCTION': buildConstruction(ctx); break;
      case 'JAM': buildJam(ctx); break;
    }
    finalize(ctx);
    this.root.add(seg.group);
    this.segments.push(seg);
  }

  private chooseType(idx: number): SegmentType {
    if (idx < 2) return 'NORMAL_ROAD';
    const prev = this.segments[this.segments.length - 1]?.type ?? 'NORMAL_ROAD';
    const d = this.world.difficulty.current;
    const dist = idx * CFG.world.segmentLength;
    const types: SegmentType[] = ['NORMAL_ROAD', 'COMMERCIAL', 'MARKET', 'FOOTBRIDGE', 'BUS_STOP', 'CONSTRUCTION', 'JAM'];
    const weight = (t: SegmentType): number => {
      if (t !== 'NORMAL_ROAD' && t === prev) return 0; // no identical specials back-to-back
      if (NARROW.includes(t) && NARROW.includes(prev)) return 0; // two narrow chunks in a row is too much
      if (t === 'JAM' && (NARROW.includes(prev) || dist < 700)) return 0; // never jam right after a narrowing
      if (t === 'CONSTRUCTION' && dist < 300) return 0;
      switch (t) {
        case 'NORMAL_ROAD': return 2.6;
        case 'COMMERCIAL': return 1.4;
        case 'MARKET': return 2.8 * d.marketFrequency;
        case 'FOOTBRIDGE': return 1.2;
        case 'BUS_STOP': return 1.1;
        case 'CONSTRUCTION': return 0.8;
        case 'JAM': return 0.35 + 0.15 * d.trafficDensity / 10;
      }
    };
    return weightedPick(types, weight) ?? 'NORMAL_ROAD';
  }

  private disposeSegment(s: RoadSegment): void {
    this.root.remove(s.group);
    s.dispose();
  }

  segmentAt(s: number): RoadSegment | null {
    for (const seg of this.segments) if (s >= seg.s0 && s < seg.s1) return seg;
    return null;
  }

  /** Collect static colliders overlapping [sMin, sMax] into out. */
  collidersIn(sMin: number, sMax: number, out: Collider[]): Collider[] {
    out.length = 0;
    for (const seg of this.segments) {
      if (seg.s1 < sMin || seg.s0 > sMax) continue;
      for (const c of seg.colliders) if (c.s + c.halfL >= sMin && c.s - c.halfL <= sMax) out.push(c);
    }
    return out;
  }
}
