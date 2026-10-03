import { T } from '../i18n/bn';
import { Screen, btn, h } from './dom';

export interface MenuActions {
  start(): void;
  howTo(): void;
  best(): void;
  settings(): void;
  exit(): void;
}

/** Title screen. The animated Dhaka street behind it is the live demo world. */
export class MainMenu extends Screen {
  private foot: HTMLDivElement;
  constructor(parent: HTMLElement, a: MenuActions) {
    super(parent, 'menu', false);
    const wrap = h('div', 'title-wrap', undefined, this.root);
    h('h1', 'title', T.title, wrap);
    h('p', 'subtitle', T.subtitle, wrap);
    const col = h('div', 'btn-col', undefined, wrap);
    col.style.maxWidth = '320px';
    btn(T.menu.start, a.start, 'btn primary', col);
    btn(T.menu.howTo, a.howTo, 'btn', col);
    btn(T.menu.best, a.best, 'btn', col);
    btn(T.menu.settings, a.settings, 'btn', col);
    btn(T.menu.exit, a.exit, 'btn', col);
    this.foot = h('div', 'menu-foot', '', wrap); // only used for the exit message
    h('div', 'menu-credit', 'Made By Zadeed Haque', wrap);
  }
  showMessage(text: string): void {
    this.foot.textContent = text;
  }
}
