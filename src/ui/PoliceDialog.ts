import { T, taka } from '../i18n/bn';
import { Screen, btn, h } from './dom';

export type PoliceChoice = 'fine' | 'bribe' | 'quit';

/**
 * The (satirical, fictional-economy) police interaction. Pure view: the game
 * decides what each choice costs and whether it succeeded.
 */
export class PoliceDialog extends Screen {
  private body: HTMLDivElement;
  constructor(parent: HTMLElement) {
    super(parent, 'police', false);
    const p = h('div', 'panel police-card', undefined, this.root);
    h('div', 'police-avatar', '\u{1F46E}', p);
    this.body = h('div', '', undefined, p);
    this.body.style.flex = '1';
  }

  ask(money: number, fine: number, bribe: number, onChoice: (c: PoliceChoice) => void): void {
    const b = this.body;
    b.innerHTML = '';
    h('div', 'police-title', T.police.arrived, b);
    h('div', 'police-text', T.police.dialog, b);
    const m = h('div', 'police-money', T.police.yourMoney + ': ', b);
    h('b', '', taka(money), m);
    const opts = h('div', 'police-opts', undefined, b);
    const opt = (label: string, cost: number | null, c: PoliceChoice) => {
      const x = btn('', () => onChoice(c), 'btn', opts);
      h('span', '', label, x);
      if (cost !== null) h('span', 'cost', taka(cost), x);
    };
    opt(T.police.pay, fine, 'fine');
    opt(T.police.arrange, bribe, 'bribe');
    opt(T.police.quit, null, 'quit');
    h('div', 'police-note', T.police.note, b);
    this.show();
  }

  result(text: string, good: boolean, buttonLabel: string, onOk: () => void): void {
    const b = this.body;
    b.innerHTML = '';
    h('div', 'police-title', T.police.arrived, b);
    h('div', 'police-msg ' + (good ? 'good' : 'bad'), text, b);
    btn(buttonLabel, onOk, good ? 'btn green' : 'btn', b);
    this.show();
  }
}
