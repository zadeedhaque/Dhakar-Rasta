export type GameStateName = 'MENU' | 'PLAYING' | 'POLICE_EVENT' | 'CRASH' | 'GAME_OVER' | 'PAUSED';

/**
 * The single authority on game flow. No other system decides whether the game
 * is paused or running — they ask this object.
 *
 *   MENU -> PLAYING -> CRASH -> POLICE_EVENT -> PLAYING ... -> GAME_OVER -> MENU
 *                 \-> PAUSED -> PLAYING
 */
const ALLOWED: Record<GameStateName, GameStateName[]> = {
  MENU: ['PLAYING'],
  PLAYING: ['PAUSED', 'CRASH', 'GAME_OVER', 'MENU'],
  PAUSED: ['PLAYING', 'MENU'],
  CRASH: ['POLICE_EVENT', 'GAME_OVER', 'MENU'],
  POLICE_EVENT: ['PLAYING', 'GAME_OVER', 'MENU'],
  GAME_OVER: ['MENU', 'PLAYING'],
};

type Listener = (next: GameStateName, prev: GameStateName) => void;

export class GameStateMachine {
  state: GameStateName = 'MENU';
  private listeners: Listener[] = [];

  onChange(fn: Listener): void {
    this.listeners.push(fn);
  }

  is(...names: GameStateName[]): boolean {
    return names.includes(this.state);
  }

  /** Returns false (and does nothing) if the transition is not allowed. */
  set(next: GameStateName): boolean {
    if (next === this.state) return true;
    if (!ALLOWED[this.state].includes(next)) return false;
    const prev = this.state;
    this.state = next;
    for (const l of this.listeners) l(next, prev);
    return true;
  }

  pause(): void {
    if (this.state === 'PLAYING') this.set('PAUSED');
  }
  resume(): void {
    if (this.state === 'PAUSED') this.set('PLAYING');
  }
  togglePause(): void {
    if (this.state === 'PLAYING') this.pause();
    else if (this.state === 'PAUSED') this.resume();
  }

  /** World (traffic, pedestrians, physics) advances in these states. */
  get worldRuns(): boolean {
    return this.state === 'PLAYING' || this.state === 'CRASH' || this.state === 'MENU';
  }
  /** Player input drives the car. */
  get playerControls(): boolean {
    return this.state === 'PLAYING';
  }
  /** Gameplay HUD should be visible. */
  get inRun(): boolean {
    return this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'CRASH' || this.state === 'POLICE_EVENT';
  }
}
