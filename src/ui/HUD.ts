import { T, bn, kmText, taka } from '../i18n/bn';
import { btn, h } from './dom';

export interface HudData {
  distance: number;
  money: number;
  score: number;
  speed: number; // m/s
  tier: string;
}
export interface ScreenMarker {
  x: number;
  y: number;
  text: string;
  dist: number;
}

/** Gameplay HUD: glass panels, toasts, floating text, hazard markers. */
export class HUD {
  readonly root: HTMLDivElement;
  private dist: HTMLDivElement;
  private money: HTMLDivElement;
  private moneyBox: HTMLDivElement;
  private score: HTMLDivElement;
  private speed: HTMLDivElement;
  private bar: HTMLDivElement;
  private tier: HTMLDivElement;
  private toasts: HTMLDivElement;
  private vignette: HTMLDivElement;
  private crash: HTMLDivElement;
  private markers: HTMLDivElement[] = [];
  private last: Record<string, string> = {};
  private vigTimer = 0;

  constructor(parent: HTMLElement, onPause: () => void) {
    this.root = h('div', 'hidden', undefined, parent);
    this.root.id = 'hud';
    this.vignette = h('div', 'vignette', undefined, this.root);
    const box = (id: string, label: string, parent: HTMLElement = this.root) => {
      const b = h('div', 'hud-box', undefined, parent);
      b.id = id;
      h('div', 'hud-label', label, b);
      return { b, v: h('div', 'hud-value', '', b) };
    };
    // Distance, score and money share one row: separate cards on desktop,
    // a single panel with three columns on phones (see #hud-stats in style.css).
    const stats = h('div', '', undefined, this.root);
    stats.id = 'hud-stats';
    this.dist = box('hud-dist', T.hud.distance, stats).v;
    this.score = box('hud-score', T.hud.score, stats).v;
    const m = box('hud-money', T.hud.money, stats);
    this.money = m.v;
    this.moneyBox = m.b;
    const sp = box('hud-speed', T.hud.speed + ' (' + T.hud.kmh + ')');
    this.speed = sp.v;
    this.bar = h('div', '', undefined, h('div', 'speed-bar', undefined, sp.b));
    this.tier = h('div', '', '', this.root);
    this.tier.id = 'hud-tier';
    btn(T.hud.pause + ' ⏸', onPause, 'btn small pause-btn', this.root);
    this.toasts = h('div', 'toasts', undefined, this.root);
    this.crash = h('div', 'crash-banner hidden', T.crash, this.root);
    for (let i = 0; i < 3; i++) this.markers.push(h('div', 'warn-marker hidden', '', this.root));
  }

  show(): void {
    this.root.classList.remove('hidden');
  }
  hide(): void {
    this.root.classList.add('hidden');
    this.crashBanner(false);
    for (const m of this.markers) m.classList.add('hidden');
  }

  private set(el: HTMLElement, key: string, v: string): void {
    if (this.last[key] !== v) {
      this.last[key] = v;
      el.textContent = v;
    }
  }

  update(d: HudData, dt: number): void {
    this.set(this.dist, 'd', kmText(d.distance));
    this.set(this.money, 'm', taka(d.money));
    this.set(this.score, 's', bn(d.score));
    const kmh = Math.round(Math.abs(d.speed) * 3.6);
    this.set(this.speed, 'v', bn(kmh));
    this.bar.style.width = Math.min(100, (kmh / 100) * 100) + '%';
    this.set(this.tier, 't', d.tier);
    if (this.vigTimer > 0) {
      this.vigTimer -= dt;
      if (this.vigTimer <= 0) this.vignette.classList.remove('on');
    }
  }

  markersUpdate(list: ScreenMarker[]): void {
    for (let i = 0; i < this.markers.length; i++) {
      const el = this.markers[i];
      const m = list[i];
      if (!m) {
        el.classList.add('hidden');
        continue;
      }
      el.classList.remove('hidden');
      el.style.left = m.x + 'px';
      el.style.top = m.y + 'px';
      const txt = '⚠ ' + m.text + ' ' + bn(Math.round(m.dist)) + ' ' + T.hud.meters;
      if (el.textContent !== txt) el.textContent = txt;
    }
  }

  toast(text: string, amount?: number, bad = false): void {
    const t = h('div', 'toast' + (bad ? ' bad' : ''), text, this.toasts);
    if (amount !== undefined) h('span', 'amt', (amount >= 0 ? '+' : '−') + taka(Math.abs(amount)), t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.remove(), 2700);
    if (amount !== undefined && amount > 0) {
      this.moneyBox.classList.remove('bump');
      void this.moneyBox.offsetWidth;
      this.moneyBox.classList.add('bump');
    }
  }

  float(text: string, x: number, y: number, amount?: number): void {
    const f = h('div', 'float', text, this.root);
    if (amount !== undefined) h('small', '', '+' + taka(amount), f);
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    setTimeout(() => f.remove(), 1150);
  }

  flash(kind: 'near' | 'hurt'): void {
    this.vignette.className = 'vignette on ' + kind;
    this.vigTimer = kind === 'near' ? 0.35 : 0.6;
  }

  crashBanner(show: boolean): void {
    this.crash.classList.toggle('hidden', !show);
  }
}
