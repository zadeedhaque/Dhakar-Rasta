import { T, bn, kmText, taka } from '../i18n/bn';
import { Screen, btn, h } from './dom';
import { storage } from '../game/Storage';

export class HowToPlay extends Screen {
  constructor(parent: HTMLElement, back: () => void) {
    super(parent, 'howto');
    const p = h('div', 'panel', undefined, this.root);
    h('h2', '', T.howTo.title, p);
    h('p', 'goal', T.howTo.goal, p);
    const keys = h('div', 'keys', undefined, p);
    for (const [k, d] of T.howTo.keys) {
      h('span', 'key', k, keys);
      h('span', '', d, keys);
    }
    const ul = h('ul', 'tips', undefined, p);
    for (const t of T.howTo.tips) h('li', '', t, ul);
    btn(T.menu.back, back, 'btn', p);
  }
}

export class BestScores extends Screen {
  private stats: HTMLDivElement;
  constructor(parent: HTMLElement, back: () => void) {
    super(parent, 'best');
    const p = h('div', 'panel', undefined, this.root);
    h('h2', '', T.best.title, p);
    this.stats = h('div', 'stats', undefined, p);
    const row = h('div', 'row', undefined, p);
    btn(T.menu.back, back, 'btn', row);
    btn(T.best.reset, () => {
      if (confirm(T.best.confirmReset)) {
        storage.reset();
        this.refresh();
      }
    }, 'btn small', row);
  }
  refresh(): void {
    const d = storage.data;
    this.stats.innerHTML = '';
    const rows: [string, string][] = [
      [T.best.highScore, bn(d.highScore)],
      [T.best.maxDistance, kmText(d.maxDistance)],
      [T.best.totalMoney, taka(d.totalMoney)],
      [T.best.totalAvoids, bn(d.totalAvoids)],
      [T.best.runs, bn(d.runs)],
    ];
    for (const [k, v] of rows) {
      h('span', 'k', k, this.stats);
      h('span', 'v', v, this.stats);
    }
  }
  show(): void {
    this.refresh();
    super.show();
  }
}
