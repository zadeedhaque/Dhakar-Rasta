/**
 * Generic object pool: acquire() -> use -> release().
 * Objects are created lazily and never destroyed during a session.
 */
export class Pool<T> {
  private free: T[] = [];
  created = 0;

  constructor(
    private factory: () => T,
    private onAcquire?: (t: T) => void,
    private onRelease?: (t: T) => void,
  ) {}

  acquire(): T {
    const item = this.free.pop() ?? (this.created++, this.factory());
    this.onAcquire?.(item);
    return item;
  }

  release(item: T): void {
    this.onRelease?.(item);
    this.free.push(item);
  }

  get idle(): number {
    return this.free.length;
  }
}
