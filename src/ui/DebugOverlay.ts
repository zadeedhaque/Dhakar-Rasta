import { T, bn } from '../i18n/bn';
import { h } from './dom';

export interface DebugInfo {
  fps: number;
  objects: number;
  vehicles: number;
  peds: number;
  segment: string;
  difficulty: string;
  speed: number;
  hazards: number;
  event: string;
  drawCalls: number;
}

/** Development-only overlay (F1). Never created in production builds. */
export class DebugOverlay {
  private el: HTMLDivElement;
  visible = false;
  constructor(parent: HTMLElement) {
    this.el = h('div', 'hidden', '', parent);
    this.el.id = 'debug';
  }
  toggle(): void {
    this.visible = !this.visible;
    this.el.classList.toggle('hidden', !this.visible);
  }
  update(d: DebugInfo): void {
    if (!this.visible) return;
    const D = T.debug;
    this.el.textContent =
      `${D.title}\n${D.fps}: ${bn(d.fps.toFixed(0))}  (draw ${d.drawCalls})\n${D.objects}: ${bn(d.objects)}\n` +
      `${D.vehicles}: ${bn(d.vehicles)}  ${D.peds}: ${bn(d.peds)}\n${D.segment}: ${d.segment}\n${D.difficulty}: ${d.difficulty}\n` +
      `${D.speed}: ${bn(Math.round(d.speed * 3.6))}\n${D.hazards}: ${bn(d.hazards)}\n${D.event}: ${d.event}\n${D.keys}`;
  }
}
