/**
 * Input abstraction. Gameplay code only reads throttle/brake/steer/horn, so
 * touch or gamepad support can be added by calling setVirtual() — no changes
 * to vehicle code required.
 */
export interface VirtualInput {
  throttle?: number;
  brake?: number;
  steer?: number;
  horn?: boolean;
}

type KeyHandler = (code: string) => void;

export class InputManager {
  private down = new Set<string>();
  private virtual: VirtualInput = {};
  private keyDownHandlers: KeyHandler[] = [];

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (import.meta.env.DEV && /^F[1-8]$/.test(e.code)) e.preventDefault(); // debug keys
      if (!e.repeat) {
        this.down.add(e.code);
        for (const h of this.keyDownHandlers) h(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  onKeyDown(fn: KeyHandler): void {
    this.keyDownHandlers.push(fn);
  }

  setVirtual(v: VirtualInput): void {
    this.virtual = { ...this.virtual, ...v };
  }

  clear(): void {
    this.down.clear();
    this.virtual = {};
  }

  private key(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  get throttle(): number {
    return Math.max(this.key('KeyW', 'ArrowUp') ? 1 : 0, this.virtual.throttle ?? 0);
  }
  get brake(): number {
    return Math.max(this.key('KeyS', 'ArrowDown') ? 1 : 0, this.virtual.brake ?? 0);
  }
  /** -1 (left) .. +1 (right) */
  get steer(): number {
    const k = (this.key('KeyD', 'ArrowRight') ? 1 : 0) - (this.key('KeyA', 'ArrowLeft') ? 1 : 0);
    return Math.max(-1, Math.min(1, k + (this.virtual.steer ?? 0)));
  }
  get horn(): boolean {
    return this.key('Space') || !!this.virtual.horn;
  }
}
