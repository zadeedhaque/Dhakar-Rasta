import type { InputManager } from '../input/InputManager';
import { h } from './dom';

/**
 * Minimal on-screen controls, shown only on touch devices. They feed the
 * InputManager's virtual axes, so vehicle code is unchanged.
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  constructor(parent: HTMLElement, input: InputManager) {
    this.root = h('div', 'hidden', undefined, parent);
    this.root.id = 'touch';
    const mk = (label: string, style: Partial<CSSStyleDeclaration>, down: () => void, up: () => void) => {
      const b = h('div', 'tbtn', label, this.root);
      Object.assign(b.style, style);
      const on = (e: Event) => {
        e.preventDefault();
        b.classList.add('on');
        down();
      };
      const off = (e: Event) => {
        e.preventDefault();
        b.classList.remove('on');
        up();
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    };
    mk('◀', { left: '20px' }, () => input.setVirtual({ steer: -1 }), () => input.setVirtual({ steer: 0 }));
    mk('▶', { left: '118px' }, () => input.setVirtual({ steer: 1 }), () => input.setVirtual({ steer: 0 }));
    mk('▲', { right: '20px', bottom: '120px' }, () => input.setVirtual({ throttle: 1 }), () => input.setVirtual({ throttle: 0 }));
    mk('▼', { right: '20px' }, () => input.setVirtual({ brake: 1 }), () => input.setVirtual({ brake: 0 }));
    mk('\u{1F4E2}', { right: '118px' }, () => input.setVirtual({ horn: true }), () => input.setVirtual({ horn: false }));
  }
  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }
}
