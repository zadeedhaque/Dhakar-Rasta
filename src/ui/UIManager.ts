import { MainMenu } from './MainMenu';
import { HowToPlay, BestScores } from './InfoScreens';
import { SettingsMenu } from './SettingsMenu';
import { PauseMenu } from './PauseMenu';
import { PoliceDialog } from './PoliceDialog';
import { GameOver } from './GameOver';
import { HUD } from './HUD';
import { DebugOverlay } from './DebugOverlay';
import { TouchControls } from './TouchControls';
import { setClickSound, Screen } from './dom';
import { T } from '../i18n/bn';
import type { InputManager } from '../input/InputManager';
import type { GameStateName } from '../game/GameState';

export interface UIActions {
  start(): void;
  resume(): void;
  pause(): void;
  toMenu(): void;
  settingsChanged(): void;
  uiClick(): void;
  firstGesture(): void;
}

/** Builds every screen and shows the right ones for each game state. */
export class UIManager {
  readonly menu: MainMenu;
  readonly hud: HUD;
  readonly police: PoliceDialog;
  readonly gameOver: GameOver;
  readonly debug: DebugOverlay | null;
  private howTo: HowToPlay;
  private best: BestScores;
  private settings: SettingsMenu;
  private pause: PauseMenu;
  private touch: TouchControls;
  private state: GameStateName = 'MENU';

  constructor(root: HTMLElement, input: InputManager, a: UIActions, dev: boolean) {
    setClickSound(() => {
      a.firstGesture();
      a.uiClick();
    });
    this.hud = new HUD(root, a.pause);
    const backToMenu = () => this.showOnly(this.menu);
    this.menu = new MainMenu(root, {
      start: a.start,
      howTo: () => this.showOnly(this.howTo),
      best: () => this.showOnly(this.best),
      settings: () => {
        this.menu.hide();
        this.settings.open(backToMenu);
      },
      exit: () => this.menu.showMessage(T.menu.exitMsg),
    });
    this.howTo = new HowToPlay(root, backToMenu);
    this.best = new BestScores(root, backToMenu);
    this.pause = new PauseMenu(root, {
      resume: a.resume,
      settings: () => {
        this.pause.hide();
        this.settings.open(() => {
          this.settings.hide();
          this.pause.show();
        });
      },
      toMenu: a.toMenu,
    });
    this.settings = new SettingsMenu(root, a.settingsChanged);
    this.police = new PoliceDialog(root);
    this.gameOver = new GameOver(root, { again: a.start, menu: a.toMenu });
    this.touch = new TouchControls(root, input);
    this.debug = dev ? new DebugOverlay(root) : null;
    root.addEventListener('pointerdown', () => a.firstGesture(), { once: true });
  }

  private all(): Screen[] {
    return [this.menu, this.howTo, this.best, this.settings, this.pause, this.police, this.gameOver];
  }

  private showOnly(s: Screen | null): void {
    for (const x of this.all()) if (x !== s) x.hide();
    s?.show();
  }

  get settingsOpen(): boolean {
    return this.settings.visible;
  }
  closeSettings(): void {
    this.settings.hide();
    if (this.state === 'PAUSED') this.pause.show();
    else if (this.state === 'MENU') this.menu.show();
  }

  onState(s: GameStateName): void {
    this.state = s;
    const touchDevice = matchMedia('(pointer: coarse)').matches;
    switch (s) {
      case 'MENU':
        this.hud.hide();
        this.showOnly(this.menu);
        break;
      case 'PLAYING':
        this.showOnly(null);
        this.hud.show();
        break;
      case 'PAUSED':
        this.showOnly(this.pause);
        break;
      case 'CRASH':
        this.showOnly(null);
        break;
      case 'POLICE_EVENT':
        break; // dialog opened by Game when the officer arrives
      case 'GAME_OVER':
        this.hud.hide();
        break;
    }
    this.touch.setVisible(touchDevice && s === 'PLAYING');
  }
}
