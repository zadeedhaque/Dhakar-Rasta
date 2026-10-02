import { T, bn, kmText, taka } from '../i18n/bn';
import { Screen, btn, h } from './dom';

export interface RunSummary {
  distance: number;
  score: number;
  earned: number;
  spent: number;
  avoids: number;
  nearMisses: number;
  police: number;
  record: boolean;
}

export class GameOver extends Screen {
  private body: HTMLDivElement;
  constructor(parent: HTMLElement, private a: { again(): void; menu(): void }) {
    super(parent, 'gameover');
    this.body = h('div', 'panel', undefined, this.root);
    this.body.style.minWidth = 'min(92vw, 440px)';
  }

  open(r: RunSummary): void {
    const b = this.body;
    b.innerHTML = '';
    h('h1', 'go-title', T.gameOver.title, b);
    h('div', 'go-quote', T.gameOver.quote, b);
    if (r.record) h('div', 'go-record', T.gameOver.newRecord, b);
    const st = h('div', 'stats', undefined, b);
    const rows: [string, string][] = [
      [T.gameOver.distance, kmText(r.distance)],
      [T.gameOver.score, bn(r.score)],
      [T.gameOver.earned, taka(r.earned)],
      [T.gameOver.spent, taka(r.spent)],
      [T.gameOver.avoids, bn(r.avoids)],
      [T.gameOver.nearMisses, bn(r.nearMisses)],
      [T.gameOver.police, bn(r.police)],
    ];
    for (const [k, v] of rows) {
      h('span', 'k', k, st);
      h('span', 'v', v, st);
    }
    const row = h('div', 'row', undefined, b);
    btn(T.gameOver.again, this.a.again, 'btn primary', row);
    btn(T.gameOver.menu, this.a.menu, 'btn', row);
    this.show();
  }
}
