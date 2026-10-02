import { clamp, rand, pick } from '../utils/math';

/**
 * All sound is synthesised with WebAudio so the game ships with zero audio
 * files and no copyright issues. Each public method is a named sound event,
 * so real recordings can later replace an implementation without touching
 * gameplay code (e.g. play an AudioBuffer inside `coin()`).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private noise!: AudioBuffer;
  private engine: { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;
  private horn: { g: GainNode; osc: OscillatorNode[] } | null = null;
  private rumble: GainNode | null = null;
  private crowd: GainNode | null = null;
  private nextAmbient = 1;
  private volumes = { sound: 0.8, sfx: 0.9 };

  /** Must be called from a user gesture (browser autoplay policy). */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.connect(this.master);
    this.applyVolumes();
    // shared noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      d[i] = white;
      last = (last + 0.02 * white) / 1.02;
    }
    this.startBeds();
  }

  setVolumes(sound: number, sfx: number): void {
    this.volumes = { sound, sfx };
    this.applyVolumes();
  }
  private applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.sound;
    this.sfx.gain.value = this.volumes.sfx;
    this.amb.gain.value = 0.9;
  }

  private loopNoise(type: BiquadFilterType, freq: number, q: number, gain: number): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.amb);
    src.start();
    return g;
  }

  private startBeds(): void {
    const ctx = this.ctx!;
    this.rumble = this.loopNoise('lowpass', 260, 0.7, 0.12);
    this.crowd = this.loopNoise('bandpass', 900, 0.9, 0.0);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.value = 0;
    o1.connect(f);
    o2.connect(f);
    f.connect(g).connect(this.amb);
    o1.start();
    o2.start();
    this.engine = { o1, o2, f, g };
  }

  // ------------------------------------------------------------ continuous layers
  /** Called every frame. speed m/s; crowd 0..1; chaos 0..1 (more horns in jams). */
  update(dt: number, p: { speed: number; throttle: number; engineOn: boolean; crowd: number; chaos: number; horn: boolean }): void {
    const ctx = this.ctx;
    if (!ctx || !this.engine) return;
    const t = ctx.currentTime;
    const e = this.engine;
    const sp = Math.abs(p.speed);
    const f = 42 + sp * 4.2 + p.throttle * 12;
    e.o1.frequency.setTargetAtTime(f, t, 0.08);
    e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    e.f.frequency.setTargetAtTime(380 + sp * 45 + p.throttle * 300, t, 0.1);
    e.g.gain.setTargetAtTime(p.engineOn ? 0.035 + p.throttle * 0.035 + sp * 0.0012 : 0, t, 0.15);
    this.rumble?.gain.setTargetAtTime(0.08 + p.chaos * 0.06 + sp * 0.002, t, 0.5);
    this.crowd?.gain.setTargetAtTime(p.crowd * 0.07, t, 0.6);
    this.setHorn(p.horn);
    // ambient one-shots: distant horns, bells, bikes
    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0) {
      this.nextAmbient = rand(0.5, 2.2) / (0.6 + p.chaos * 1.6);
      const r = Math.random();
      const pan = rand(-0.9, 0.9);
      const dist = rand(20, 90);
      if (r < 0.5) this.distantHorn(pan, dist);
      else if (r < 0.8) this.bellRaw(pan, dist);
      else this.bikeBy(pan, dist);
    }
  }

  private setHorn(on: boolean): void {
    const ctx = this.ctx!;
    if (on && !this.horn) {
      const g = ctx.createGain();
      g.gain.value = 0;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.6;
      const osc = [392, 494].map((fr) => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = fr;
        o.connect(f);
        o.start();
        return o;
      });
      f.connect(g).connect(this.sfx);
      g.gain.setTargetAtTime(0.22, ctx.currentTime, 0.01);
      this.horn = { g, osc };
    } else if (!on && this.horn) {
      this.horn.g.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      for (const o of this.horn.osc) o.stop(ctx.currentTime + 0.15);
      this.horn = null;
    }
  }

  // ------------------------------------------------------------ primitives
  private out(pan: number, gain: number, dest?: AudioNode): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p).connect(dest ?? this.sfx);
    } else g.connect(dest ?? this.sfx);
    return g;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, o: { pan?: number; delay?: number; to?: number; attack?: number; dest?: AudioNode } = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = this.out(o.pan ?? 0, 0, o.dest);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + (o.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private burst(dur: number, type: BiquadFilterType, freq: number, gain: number, o: { q?: number; to?: number; pan?: number; delay?: number; dest?: AudioNode } = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = this.out(o.pan ?? 0, 0, o.dest);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  private att(dist: number): number {
    return clamp(1 - dist / 110, 0.08, 1);
  }

  // ------------------------------------------------------------ named sound events
  private distantHorn(pan: number, dist: number): void {
    const f = pick([330, 370, 415, 466, 523, 587]);
    const g = 0.05 * this.att(dist);
    const n = Math.random() < 0.4 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.tone(f, 0.22, 'square', g, { pan, delay: i * 0.28, dest: this.amb });
      this.tone(f * 1.26, 0.22, 'square', g * 0.6, { pan, delay: i * 0.28, dest: this.amb });
    }
  }
  private bellRaw(pan: number, dist: number, dest?: AudioNode): void {
    const g = 0.05 * this.att(dist);
    for (let i = 0; i < 3; i++) {
      this.tone(2650, 0.18, 'sine', g, { pan, delay: i * 0.1, dest: dest ?? this.amb });
      this.tone(3980, 0.12, 'sine', g * 0.5, { pan, delay: i * 0.1, dest: dest ?? this.amb });
    }
  }
  private bikeBy(pan: number, dist: number): void {
    this.tone(95, 1.2, 'sawtooth', 0.025 * this.att(dist), { pan, to: 70, attack: 0.4, dest: this.amb });
  }

  /** Rickshaw bell at a position relative to the player (x offset, distance ahead). */
  bell(dx: number, dist: number): void {
    if (this.ctx) this.bellRaw(clamp(dx / 8, -1, 1), dist * 0.6, this.sfx);
  }
  /** Short "pip-pip" of a battery rickshaw / motorbike. */
  horn2(dx: number, dist: number): void {
    if (!this.ctx) return;
    const g = 0.12 * this.att(dist * 0.6);
    for (let i = 0; i < 2; i++) this.tone(740, 0.12, 'square', g, { pan: clamp(dx / 8, -1, 1), delay: i * 0.17 });
  }
  skid(dx: number, dist: number): void {
    this.burst(0.7, 'bandpass', 1800, 0.2 * this.att(dist), { q: 4, to: 900, pan: clamp(dx / 8, -1, 1) });
    this.burst(0.3, 'lowpass', 300, 0.25 * this.att(dist), { delay: 0.6, pan: clamp(dx / 8, -1, 1) });
  }
  busHiss(dx: number, dist: number): void {
    this.burst(0.8, 'highpass', 3000, 0.12 * this.att(dist), { pan: clamp(dx / 8, -1, 1) });
  }
  coin(big = false): void {
    this.tone(988, 0.12, 'square', 0.07);
    this.tone(1319, big ? 0.45 : 0.3, 'square', 0.07, { delay: 0.08 });
    if (big) this.tone(1760, 0.4, 'triangle', 0.06, { delay: 0.18 });
  }
  nearMiss(): void {
    this.burst(0.35, 'bandpass', 600, 0.25, { q: 1.5, to: 3500 });
    this.tone(1568, 0.15, 'triangle', 0.05, { delay: 0.12 });
  }
  bump(): void {
    this.tone(90, 0.25, 'sine', 0.35, { to: 50 });
    this.burst(0.15, 'lowpass', 900, 0.2);
  }
  scrape(): void {
    this.burst(0.2, 'bandpass', 2400, 0.06, { q: 3 });
  }
  crash(): void {
    this.tone(70, 0.9, 'sine', 0.6, { to: 30 });
    this.burst(1.2, 'lowpass', 2500, 0.6, { to: 200 });
    this.burst(0.5, 'highpass', 4000, 0.25, { delay: 0.05 });
    for (let i = 0; i < 4; i++) this.tone(rand(1800, 3200), 0.12, 'triangle', 0.05, { delay: 0.15 + i * 0.09 });
  }
  whistle(): void {
    for (let i = 0; i < 2; i++) {
      this.tone(2900, i ? 0.6 : 0.25, 'sine', 0.12, { delay: i * 0.35 });
      this.tone(3050, i ? 0.6 : 0.25, 'sine', 0.06, { delay: i * 0.35 });
    }
  }
  click(): void {
    this.tone(660, 0.06, 'triangle', 0.08);
  }
  warn(): void {
    this.tone(880, 0.12, 'square', 0.05);
    this.tone(660, 0.12, 'square', 0.05, { delay: 0.14 });
  }
  gameOver(): void {
    [523, 466, 392, 311].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, { delay: i * 0.32 }));
  }
}
