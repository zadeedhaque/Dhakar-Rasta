import { T } from '../i18n/bn';
import { Screen, btn, h } from './dom';
import { storage, Settings } from '../game/Storage';

/** Simple settings: volumes, graphics quality, camera shake, steering sensitivity. */
export class SettingsMenu extends Screen {
  private onBack: () => void = () => {};

  constructor(parent: HTMLElement, private onChange: () => void) {
    super(parent, 'settings');
    const p = h('div', 'panel', undefined, this.root);
    p.style.minWidth = 'min(92vw, 480px)';
    h('h2', '', T.settings.title, p);
    const s = storage.data.settings;
    this.slider(p, T.settings.sound, s.sound, (v) => (s.sound = v));
    this.slider(p, T.settings.sfx, s.sfx, (v) => (s.sfx = v));
    this.seg(p, T.settings.graphics, [T.settings.low, T.settings.medium, T.settings.high], s.graphics, (i) => (s.graphics = i as Settings['graphics']));
    this.seg(p, T.settings.shake, [T.settings.on, T.settings.off], s.shake ? 0 : 1, (i) => (s.shake = i === 0));
    this.seg(p, T.settings.controls + ' (' + T.settings.sens + ')', [T.settings.low, T.settings.medium, T.settings.high], s.steering, (i) => (s.steering = i as Settings['steering']));
    const row = h('div', 'row', undefined, p);
    row.style.marginTop = '18px';
    btn(T.settings.done, () => this.onBack(), 'btn primary', row);
  }

  open(onBack: () => void): void {
    this.onBack = onBack;
    this.show();
  }

  private changed(): void {
    storage.save();
    this.onChange();
  }

  private slider(p: HTMLElement, label: string, value: number, set: (v: number) => void): void {
    const r = h('div', 'set-row', undefined, p);
    h('span', '', label, r);
    const inp = h('input', '', undefined, r);
    inp.type = 'range';
    inp.min = '0';
    inp.max = '100';
    inp.value = String(Math.round(value * 100));
    inp.addEventListener('input', () => {
      set(Number(inp.value) / 100);
      this.changed();
    });
  }

  private seg(p: HTMLElement, label: string, opts: string[], value: number, set: (i: number) => void): void {
    const r = h('div', 'set-row', undefined, p);
    h('span', '', label, r);
    const g = h('div', 'seg', undefined, r);
    const bs = opts.map((o, i) => {
      const b = h('button', i === value ? 'on' : '', o, g);
      b.addEventListener('click', () => {
        bs.forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        set(i);
        this.changed();
      });
      return b;
    });
  }
}
