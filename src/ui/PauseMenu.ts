import { T } from '../i18n/bn';
import { Screen, btn, h } from './dom';

export class PauseMenu extends Screen {
  constructor(parent: HTMLElement, a: { resume(): void; settings(): void; toMenu(): void }) {
    super(parent, 'pause');
    const p = h('div', 'panel', undefined, this.root);
    h('h2', '', T.pause.title, p);
    const col = h('div', 'btn-col', undefined, p);
    btn(T.pause.resume, a.resume, 'btn primary', col);
    btn(T.pause.settings, a.settings, 'btn', col);
    btn(T.pause.toMenu, a.toMenu, 'btn', col);
  }
}
