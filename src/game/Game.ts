import * as THREE from 'three';
import { CFG } from './GameConfig';
import { GameStateMachine } from './GameState';
import { World } from './World';
import { CameraRig } from './CameraRig';
import { CollisionSystem, Hit } from './CollisionSystem';
import { HazardTracker } from './HazardTracker';
import { ScoreManager } from './ScoreManager';
import { storage } from './Storage';
import { MoneyManager } from '../economy/MoneyManager';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { updatePlayer } from '../player/PlayerController';
import { EventManager } from '../events/EventManager';
import { CrashEvent } from '../events/CrashEvent';
import { PoliceEvent } from '../events/PoliceEvent';
import { BlobShadows } from '../effects/BlobShadows';
import { Particles } from '../effects/Particles';
import { UIManager } from '../ui/UIManager';
import { autopilot } from '../debug/AutoPilot';
import { T } from '../i18n/bn';
import type { HazardKey, Trackable } from './types';
import type { PoliceChoice } from '../ui/PoliceDialog';
import type { Pedestrian } from '../pedestrians/Pedestrian';
import type { TrafficVehicle } from '../traffic/TrafficVehicle';

const REWARD: Record<HazardKey, { amount: number; label: string }> = {
  wrongWayBattery: { amount: CFG.rewards.wrongWayBatteryRickshaw, label: T.popup.wrongBattery },
  wrongWayRickshaw: { amount: CFG.rewards.wrongWayRickshaw, label: T.popup.wrongRickshaw },
  pedestrian: { amount: CFG.rewards.dangerousPedestrian, label: T.popup.pedestrian },
  bus: { amount: CFG.rewards.busEvent, label: T.popup.bus },
  motoCrash: { amount: CFG.rewards.motorcycleCrash, label: T.popup.motoCrash },
  suddenStop: { amount: CFG.rewards.suddenStop, label: T.popup.suddenStop },
  suddenEntry: { amount: CFG.rewards.suddenEntry, label: T.popup.suddenEntry },
};

/**
 * Top-level orchestrator: owns renderer, the authoritative state machine and
 * all systems, and routes events between simulation and UI. Systems never
 * talk to the DOM; UI never mutates simulation state directly.
 */
export class Game {
  readonly state = new GameStateMachine();
  readonly input = new InputManager();
  readonly audio = new AudioManager();
  readonly money = new MoneyManager();
  readonly score = new ScoreManager();
  readonly world: World;
  readonly events: EventManager;
  readonly rig: CameraRig;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private collisions = new CollisionSystem();
  private tracker = new HazardTracker();
  private crash = new CrashEvent();
  private police: PoliceEvent;
  private shadows: BlobShadows;
  private particles: Particles;
  private ui: UIManager;
  private sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
  private maxS = 0;
  private policeAsked = false;
  private last = performance.now();
  private fps = 60;
  private tmpV = new THREE.Vector3();
  readonly dev = import.meta.env.DEV;
  bot = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    const g = storage.data.settings.graphics;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: g > 0, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.rig = new CameraRig(innerWidth / innerHeight);
    this.setupScene();
    this.world = new World(this.scene, this.audio);
    this.events = new EventManager(this.world);
    this.police = new PoliceEvent(this.scene);
    this.shadows = new BlobShadows(this.scene);
    this.particles = new Particles(this.scene);
    this.ui = new UIManager(uiRoot, this.input, {
      start: () => this.startRun(),
      resume: () => this.state.resume(),
      pause: () => this.state.pause(),
      toMenu: () => this.toMenu(),
      settingsChanged: () => this.applySettings(),
      uiClick: () => this.audio.click(),
      firstGesture: () => this.audio.init(),
    }, this.dev);
    this.state.onChange((n) => this.ui.onState(n));
    this.input.onKeyDown((c) => this.onKey(c));
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.state.pause();
    });
    this.applySettings();
    this.resize();
    this.toMenu(true);
    if (this.dev) (window as unknown as { __game: Game }).__game = this;
    requestAnimationFrame(() => this.loop());
  }

  private setupScene(): void {
    const sky = new THREE.Color(CFG.world.skyColor);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, CFG.world.fogNear, CFG.world.fogFar);
    this.scene.add(new THREE.HemisphereLight(0xfff6e5, 0x6b6355, 1.7));
    this.sun.position.set(-30, 60, 25);
    this.scene.add(this.sun, this.sun.target);
  }

  applySettings(): void {
    const s = storage.data.settings;
    this.renderer.setPixelRatio([0.7, 1, Math.min(devicePixelRatio, 2)][s.graphics]);
    const fog = this.scene.fog as THREE.Fog;
    fog.far = [150, 185, CFG.world.fogFar][s.graphics];
    this.rig.shakeEnabled = s.shake;
    this.audio.setVolumes(s.sound, s.sfx);
    this.resize();
  }

  private resize(): void {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.rig.camera.aspect = innerWidth / innerHeight;
    this.rig.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ flow
  toMenu(initial = false): void {
    if (!initial && !this.state.set('MENU')) return;
    this.police.hide();
    this.particles.clear();
    this.world.reset(true);
    this.events.reset();
    this.rig.mode = 'menu';
    this.ui.onState('MENU');
  }

  startRun(): void {
    this.audio.init();
    this.input.clear();
    this.police.hide();
    this.particles.clear();
    this.world.reset(false);
    this.money.reset();
    this.money.balance = CFG.economy.startingMoney;
    this.score.reset();
    this.events.reset();
    this.collisions.reset();
    this.tracker.reset();
    this.police.encounters = 0;
    this.maxS = this.world.player.s;
    this.rig.mode = 'follow';
    this.rig.snap();
    this.state.set('PLAYING');
  }

  private beginCrash(hit: Hit): void {
    if (!this.state.set('CRASH')) return;
    const p = this.world.player;
    this.crash.start(hit);
    this.score.onCollision();
    if (this.dev) {
      const o = hit.body as unknown as { kind?: string; behavior?: string; mode?: string; state?: string };
      const log = { kind: hit.kind, what: o.kind ?? o.behavior, mode: o.mode, st: o.state, dx: +(hit.body.x - p.x).toFixed(2), ds: +(hit.body.s - p.s).toFixed(2), pv: +p.speed.toFixed(1), ov: +hit.body.vs.toFixed(1), dist: Math.round(this.score.distance) };
      (window as unknown as { __crashes: unknown[] }).__crashes ??= [];
      (window as unknown as { __crashes: unknown[] }).__crashes.push(log);
    }
    (hit.body as Partial<Trackable>).collided = true;
    if (hit.kind === 'pedestrian') (hit.body as Pedestrian).setState('STUMBLED');
    if (hit.kind === 'vehicle') (hit.body as TrafficVehicle).speed = 0;
    this.audio.crash();
    this.rig.addShake(1);
    this.ui.hud.crashBanner(true);
    this.ui.hud.flash('hurt');
    this.particles.burst((p.x + hit.body.x) / 2, 0.8, -(p.s + p.halfL), 26, [0xb3242b, 0xdddddd, 0x222222, 0xa8cfdc]);
  }

  private startPolice(): void {
    if (!this.state.set('POLICE_EVENT')) return;
    this.ui.hud.crashBanner(false);
    this.world.player.speed = 0;
    this.score.policeEncounters++;
    this.police.start(this.world);
    this.policeAsked = false;
    this.rig.mode = 'police';
  }

  private askPolice(): void {
    this.policeAsked = true;
    this.ui.police.ask(this.money.balance, this.police.fineCost(), this.police.bribeCost(), (c) => this.onPoliceChoice(c));
  }

  private onPoliceChoice(c: PoliceChoice): void {
    if (c === 'quit') {
      this.endRun();
      return;
    }
    const cost = c === 'fine' ? this.police.fineCost() : this.police.bribeCost();
    if (this.money.spend(cost, c === 'bribe')) {
      this.audio.coin();
      const msg = c === 'fine' ? T.police.paidFine(cost) + '\n' + T.police.fineThanks : T.police.paidArrange(cost) + '\n' + T.police.arrangeThanks;
      this.ui.police.result(msg, true, T.police.again, () => this.resumeRun());
    } else {
      this.audio.warn();
      this.ui.police.result(T.police.notEnough, false, T.police.endRun, () => this.endRun());
    }
  }

  private resumeRun(): void {
    this.ui.police.hide();
    this.police.resumePlayer(this.world);
    this.rig.mode = 'follow';
    this.state.set('PLAYING');
  }

  private endRun(): void {
    this.ui.police.hide();
    this.police.hide();
    const record = this.score.commitRun(this.money.earned);
    this.state.set('GAME_OVER');
    this.rig.mode = 'gameover';
    this.audio.gameOver();
    this.ui.gameOver.open({
      distance: this.score.distance,
      score: this.score.score,
      earned: this.money.earned,
      spent: this.money.spent,
      avoids: this.score.avoids,
      nearMisses: this.score.nearMisses,
      police: this.score.policeEncounters,
      record,
    });
  }

  // ------------------------------------------------------------ rewards
  private reward(amount: number, label: string, bonus: number): void {
    this.money.earn(amount);
    this.score.bonusScore += bonus;
    this.ui.hud.toast(label, amount);
    this.audio.coin(amount >= 30);
  }

  private onAvoid = (key: HazardKey, _o: Trackable): void => {
    const r = REWARD[key];
    this.score.avoids++;
    this.reward(r.amount, r.label, CFG.score.perAvoid);
  };

  private onNearMiss = (_o: Trackable): void => {
    this.score.nearMisses++;
    this.money.earn(CFG.rewards.nearMiss);
    this.score.bonusScore += CFG.score.perNearMiss;
    const sp = this.project(this.world.player.x, 2.4, this.world.player.s);
    this.ui.hud.float(T.popup.nearMiss, sp.x, sp.y, CFG.rewards.nearMiss);
    this.ui.hud.flash('near');
    this.audio.nearMiss();
    this.rig.addShake(0.12);
  };

  private onMinor = (_h: Hit): void => {
    this.score.onCollision();
    const taken = this.money.penalise(CFG.collision.minorMoneyPenalty);
    this.score.bonusScore -= CFG.collision.minorScorePenalty;
    this.ui.hud.toast(T.popup.minorBump, -taken, true);
    this.ui.hud.flash('hurt');
    this.audio.bump();
    this.rig.addShake(0.35);
  };

  // ------------------------------------------------------------ main loop
  private loop(): void {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const realDt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.fps = this.fps * 0.95 + (1 / Math.max(realDt, 1e-3)) * 0.05;
    this.update(realDt);
    this.renderer.render(this.scene, this.rig.camera);
  }

  private update(dt: number): void {
    const w = this.world;
    const p = w.player;
    switch (this.state.state) {
      case 'MENU':
        w.update(dt);
        this.events.update(dt, CFG.menuDemo.difficultyDistance);
        break;
      case 'PLAYING': {
        if (this.dev && this.bot) autopilot(w, this.input);
        if (this.input.horn) w.soundHorn();
        updatePlayer(p, this.input, dt, storage.data.settings.steering);
        if (p.scraping && Math.random() < dt * 6) this.audio.scrape();
        if (p.s > this.maxS) {
          if (this.score.addDistance(p.s - this.maxS)) this.reward(CFG.rewards.cleanMilestone, T.popup.clean, 0);
          this.maxS = p.s;
        }
        w.difficulty.update(this.score.distance);
        w.update(dt);
        this.events.update(dt, this.score.distance);
        const hit = this.collisions.update(w, dt, this.onMinor);
        this.tracker.update(w, dt, { onAvoid: this.onAvoid, onNearMiss: this.onNearMiss });
        if (hit) this.beginCrash(hit);
        break;
      }
      case 'CRASH': {
        const sdt = dt * this.crash.timeScale;
        p.speed *= Math.max(0, 1 - 6 * dt);
        p.s += p.speed * sdt;
        w.update(sdt);
        if (this.crash.update(dt)) this.startPolice();
        break;
      }
      case 'POLICE_EVENT':
        if (this.police.update(dt) && !this.policeAsked) this.askPolice();
        break;
    }
    const running = this.state.is('PLAYING', 'CRASH');
    p.sync(running ? dt : 0, w.time);
    this.updateShadows();
    this.particles.update(dt);
    this.sun.position.set(p.x - 30, 60, -w.focusS + 25);
    this.sun.target.position.set(p.x, 0, -w.focusS);
    this.rig.update(w, dt);
    this.audio.update(dt, {
      speed: running ? p.speed : 0,
      throttle: running ? p.throttle : 0,
      engineOn: this.state.inRun,
      crowd: this.crowdLevel(),
      chaos: Math.min(1, w.traffic.vehicles.length / 35),
      horn: this.state.is('PLAYING') && this.input.horn,
    });
    if (this.state.inRun) {
      this.ui.hud.update({ distance: this.score.distance, money: this.money.balance, score: this.score.score, speed: p.speed, tier: w.difficulty.current.name }, dt);
      this.ui.hud.markersUpdate(
        this.state.is('PLAYING')
          ? this.tracker.warnings.map((m) => {
              const sp = this.project(m.x, 2.6, m.s);
              return { x: sp.x, y: sp.y, text: m.text, dist: m.dist };
            }).filter((m) => m.y > 0)
          : [],
      );
    }
    if (this.dev) this.ui.debug?.update({
      fps: this.fps,
      objects: w.traffic.vehicles.length + w.peds.active.length + w.road.segments.length,
      vehicles: w.traffic.vehicles.length,
      peds: w.peds.active.length,
      segment: T.segmentNames[w.road.segmentAt(w.focusS)?.type ?? ''] ?? '-',
      difficulty: w.difficulty.current.name,
      speed: p.speed,
      hazards: w.activeHazards(),
      event: this.events.lastEvent,
      drawCalls: this.renderer.info.render.calls,
    });
  }

  private updateShadows(): void {
    const sh = this.shadows;
    const w = this.world;
    sh.begin();
    if (!w.demo) sh.add(w.player.x, w.player.s, w.player.halfW, w.player.halfL);
    for (const v of w.traffic.vehicles) sh.add(v.x, v.s, v.halfW, v.halfL);
    for (const p of w.peds.active) sh.add(p.x, p.s, 0.35, 0.35, p.y + 0.24 * (p.y > 0 ? 1 : 0) + 0.03);
    sh.end();
  }

  private crowdLevel(): number {
    const f = this.world.focusS;
    let n = 0;
    for (const p of this.world.peds.active) if (Math.abs(p.s - f) < 40) n++;
    return Math.min(1, n / 25);
  }

  private project(x: number, y: number, s: number): { x: number; y: number } {
    const v = this.tmpV.set(x, y, -s).project(this.rig.camera);
    if (v.z > 1) return { x: -999, y: -999 };
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }

  private onKey(code: string): void {
    if (code === 'Escape') {
      if (this.ui.settingsOpen) this.ui.closeSettings();
      else this.state.togglePause();
      return;
    }
    if (!this.dev) return;
    const w = this.world;
    switch (code) {
      case 'F1': this.ui.debug?.toggle(); break;
      case 'F2': this.events.trigger(Math.random() < 0.5 ? 'WRONG_WAY_RICKSHAW' : 'WRONG_WAY_BATTERY_RICKSHAW'); break;
      case 'F3': this.events.trigger('BUS_JAM'); break;
      case 'F4': this.events.trigger('PEDESTRIAN_CROSSING'); break;
      case 'F5':
        if (this.state.is('PLAYING')) this.beginCrash({ major: true, kind: 'vehicle', body: w.traffic.vehicles[0] ?? w.player });
        break;
      case 'F6': this.money.earn(100); this.ui.hud.toast(T.debug.title, 100); break;
      case 'F7': w.difficulty.boost += 1000; break;
      case 'F8': this.bot = !this.bot; if (!this.bot) this.input.clear(); break;
    }
  }
}
