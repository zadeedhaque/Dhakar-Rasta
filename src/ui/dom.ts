/** Tiny DOM helpers so UI modules stay declarative and free of game logic. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

let clickSound: () => void = () => {};
export function setClickSound(fn: () => void): void {
  clickSound = fn;
}

export function btn(text: string, onClick: () => void, cls = 'btn', parent?: HTMLElement): HTMLButtonElement {
  const b = h('button', cls, text, parent);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    clickSound();
    onClick();
  });
  return b;
}

/** A screen = full-viewport overlay that can be shown/hidden. */
export class Screen {
  readonly root: HTMLDivElement;
  constructor(parent: HTMLElement, id: string, dim = true) {
    this.root = h('div', 'screen hidden' + (dim ? ' dim' : ''));
    this.root.id = id;
    parent.appendChild(this.root);
  }
  show(): void {
    this.root.classList.remove('hidden');
    (this.root.querySelector('button:not([disabled])') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }
  hide(): void {
    this.root.classList.add('hidden');
  }
  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }
}
