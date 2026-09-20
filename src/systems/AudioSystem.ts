export type BgmTrack = 'none' | 'menu' | 'play' | 'underground' | 'editor' | 'clear' | 'fail';

type Note = { f: number; t: number; d: number; v?: number };

/** Chiptune-style notes: C major / A minor-ish arcade loops. */
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  Ab3: 207.65, Eb4: 311.13, Bb3: 233.08,
};

/** Melody + bass patterns per track. Times in beats; loops at `bars * 4`. */
const TRACKS: Record<Exclude<BgmTrack, 'none'>, { bpm: number; melody: Note[]; bass: Note[]; hat: boolean; mood: 'bright' | 'dark' | 'soft' }> = {
  menu: {
    bpm: 112,
    mood: 'soft',
    hat: false,
    melody: [
      { f: N.E5, t: 0, d: 0.5 }, { f: N.G5, t: 0.5, d: 0.5 }, { f: N.A5, t: 1, d: 1 },
      { f: N.G5, t: 2, d: 0.5 }, { f: N.E5, t: 2.5, d: 0.5 }, { f: N.D5, t: 3, d: 1 },
      { f: N.C5, t: 4, d: 0.5 }, { f: N.E5, t: 4.5, d: 0.5 }, { f: N.G5, t: 5, d: 1 },
      { f: N.E5, t: 6, d: 0.5 }, { f: N.D5, t: 6.5, d: 0.5 }, { f: N.C5, t: 7, d: 1 },
    ],
    bass: [
      { f: N.C3, t: 0, d: 1 }, { f: N.G3, t: 1, d: 1 }, { f: N.A3, t: 2, d: 1 }, { f: N.G3, t: 3, d: 1 },
      { f: N.F3, t: 4, d: 1 }, { f: N.C3, t: 5, d: 1 }, { f: N.G3, t: 6, d: 1 }, { f: N.C3, t: 7, d: 1 },
    ],
  },
  play: {
    bpm: 132,
    mood: 'bright',
    hat: true,
    melody: [
      { f: N.C5, t: 0, d: 0.4 }, { f: N.E5, t: 0.5, d: 0.4 }, { f: N.G5, t: 1, d: 0.4 }, { f: N.E5, t: 1.5, d: 0.4 },
      { f: N.C5, t: 2, d: 0.4 }, { f: N.G4, t: 2.5, d: 0.4 }, { f: N.A4, t: 3, d: 0.8 },
      { f: N.D5, t: 4, d: 0.4 }, { f: N.F5, t: 4.5, d: 0.4 }, { f: N.A5, t: 5, d: 0.4 }, { f: N.F5, t: 5.5, d: 0.4 },
      { f: N.D5, t: 6, d: 0.4 }, { f: N.A4, t: 6.5, d: 0.4 }, { f: N.G4, t: 7, d: 0.8 },
      { f: N.E5, t: 8, d: 0.4 }, { f: N.G5, t: 8.5, d: 0.4 }, { f: N.C5, t: 9, d: 0.4 }, { f: N.E5, t: 9.5, d: 0.4 },
      { f: N.G4, t: 10, d: 0.4 }, { f: N.C5, t: 10.5, d: 0.4 }, { f: N.E4, t: 11, d: 0.8 },
      { f: N.F4, t: 12, d: 0.4 }, { f: N.A4, t: 12.5, d: 0.4 }, { f: N.C5, t: 13, d: 0.4 }, { f: N.A4, t: 13.5, d: 0.4 },
      { f: N.G4, t: 14, d: 0.4 }, { f: N.D5, t: 14.5, d: 0.4 }, { f: N.C5, t: 15, d: 1.2 },
    ],
    bass: [
      { f: N.C3, t: 0, d: 0.9 }, { f: N.C3, t: 1, d: 0.4 }, { f: N.G3, t: 1.5, d: 0.4 },
      { f: N.C3, t: 2, d: 0.9 }, { f: N.E3, t: 3, d: 0.9 },
      { f: N.D3, t: 4, d: 0.9 }, { f: N.D3, t: 5, d: 0.4 }, { f: N.A3, t: 5.5, d: 0.4 },
      { f: N.D3, t: 6, d: 0.9 }, { f: N.G3, t: 7, d: 0.9 },
      { f: N.E3, t: 8, d: 0.9 }, { f: N.C3, t: 9, d: 0.9 },
      { f: N.F3, t: 10, d: 0.9 }, { f: N.C3, t: 11, d: 0.9 },
      { f: N.F3, t: 12, d: 0.9 }, { f: N.A3, t: 13, d: 0.9 },
      { f: N.G3, t: 14, d: 0.9 }, { f: N.C3, t: 15, d: 0.9 },
    ],
  },
  underground: {
    bpm: 118,
    mood: 'dark',
    hat: true,
    melody: [
      { f: N.A3, t: 0, d: 0.5 }, { f: N.C4, t: 0.5, d: 0.5 }, { f: N.Eb4, t: 1, d: 0.5 }, { f: N.A3, t: 1.5, d: 0.5 },
      { f: N.Ab3, t: 2, d: 0.8 }, { f: N.C4, t: 3, d: 0.8 },
      { f: N.G3, t: 4, d: 0.5 }, { f: N.Bb3, t: 4.5, d: 0.5 }, { f: N.D4, t: 5, d: 0.5 }, { f: N.G3, t: 5.5, d: 0.5 },
      { f: N.A3, t: 6, d: 0.8 }, { f: N.C4, t: 7, d: 0.8 },
      { f: N.Eb4, t: 8, d: 0.4 }, { f: N.D4, t: 8.5, d: 0.4 }, { f: N.C4, t: 9, d: 0.4 }, { f: N.A3, t: 9.5, d: 0.4 },
      { f: N.Ab3, t: 10, d: 0.9 }, { f: N.A3, t: 11, d: 0.9 },
      { f: N.D4, t: 12, d: 0.4 }, { f: N.C4, t: 12.5, d: 0.4 }, { f: N.Bb3, t: 13, d: 0.4 }, { f: N.G3, t: 13.5, d: 0.4 },
      { f: N.A3, t: 14, d: 1.5 },
    ],
    bass: [
      { f: N.A3 / 2, t: 0, d: 0.45 }, { f: N.A3 / 2, t: 0.5, d: 0.45 }, { f: N.A3 / 2, t: 1, d: 0.45 }, { f: N.A3 / 2, t: 1.5, d: 0.45 },
      { f: N.Ab3 / 2, t: 2, d: 0.9 }, { f: N.Ab3 / 2, t: 3, d: 0.9 },
      { f: N.G3 / 2, t: 4, d: 0.45 }, { f: N.G3 / 2, t: 4.5, d: 0.45 }, { f: N.G3 / 2, t: 5, d: 0.45 }, { f: N.G3 / 2, t: 5.5, d: 0.45 },
      { f: N.A3 / 2, t: 6, d: 0.9 }, { f: N.C3, t: 7, d: 0.9 },
      { f: N.Eb4 / 2, t: 8, d: 0.45 }, { f: N.Eb4 / 2, t: 8.5, d: 0.45 }, { f: N.C3, t: 9, d: 0.9 },
      { f: N.Ab3 / 2, t: 10, d: 0.9 }, { f: N.A3 / 2, t: 11, d: 0.9 },
      { f: N.D3, t: 12, d: 0.9 }, { f: N.G3 / 2, t: 13, d: 0.9 },
      { f: N.A3 / 2, t: 14, d: 1.5 },
    ],
  },
  editor: {
    bpm: 100,
    mood: 'soft',
    hat: false,
    melody: [
      { f: N.G4, t: 0, d: 0.6 }, { f: N.B4, t: 1, d: 0.6 }, { f: N.D5, t: 2, d: 0.9 },
      { f: N.E5, t: 3, d: 0.6 }, { f: N.D5, t: 4, d: 0.6 }, { f: N.B4, t: 5, d: 0.6 },
      { f: N.A4, t: 6, d: 0.9 }, { f: N.G4, t: 7, d: 0.9 },
      { f: N.E4, t: 8, d: 0.6 }, { f: N.G4, t: 9, d: 0.6 }, { f: N.A4, t: 10, d: 0.9 },
      { f: N.B4, t: 11, d: 0.6 }, { f: N.C5, t: 12, d: 0.6 }, { f: N.B4, t: 13, d: 0.6 },
      { f: N.A4, t: 14, d: 1.2 },
    ],
    bass: [
      { f: N.G3, t: 0, d: 1.4 }, { f: N.D3, t: 2, d: 1.4 },
      { f: N.E3, t: 4, d: 1.4 }, { f: N.B3, t: 6, d: 1.4 },
      { f: N.C3, t: 8, d: 1.4 }, { f: N.A3, t: 10, d: 1.4 },
      { f: N.D3, t: 12, d: 1.4 }, { f: N.G3, t: 14, d: 1.4 },
    ],
  },
  clear: {
    bpm: 140,
    mood: 'bright',
    hat: true,
    melody: [
      { f: N.C5, t: 0, d: 0.35 }, { f: N.E5, t: 0.5, d: 0.35 }, { f: N.G5, t: 1, d: 0.35 }, { f: N.C5 * 2, t: 1.5, d: 0.9 },
      { f: N.G5, t: 3, d: 0.35 }, { f: N.E5, t: 3.5, d: 0.35 }, { f: N.C5, t: 4, d: 1.2 },
    ],
    bass: [
      { f: N.C3, t: 0, d: 0.9 }, { f: N.G3, t: 1, d: 0.9 }, { f: N.C3, t: 2, d: 0.9 }, { f: N.G3, t: 3, d: 0.9 }, { f: N.C3, t: 4, d: 1.2 },
    ],
  },
  fail: {
    bpm: 90,
    mood: 'dark',
    hat: false,
    melody: [
      { f: N.A3, t: 0, d: 0.4 }, { f: N.F3, t: 0.5, d: 0.4 }, { f: N.D3, t: 1, d: 0.4 }, { f: N.A3 / 2, t: 1.5, d: 1.4 },
    ],
    bass: [{ f: N.A3 / 2, t: 0, d: 2.8 }],
  },
};

/** Lightweight procedural WebAudio SFX + looping chiptune BGM. */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private muted = false;
  private bgmTrack: BgmTrack = 'none';
  private bgmGain = 0.16;
  private sfxGain = 0.28;
  private timer: number | null = null;
  private nextScheduleTime = 0;

  get currentBgm(): BgmTrack {
    return this.bgmTrack;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxGain;
      this.sfxBus.connect(this.master);

      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = 0;
      this.bgmBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Start/switch looping BGM. Same track is a no-op. */
  playBgm(track: BgmTrack): void {
    if (this.bgmTrack === track) return;
    this.bgmTrack = track;
    this.unlock();
    const ctx = this.ctx;
    const bus = this.bgmBus;
    if (!ctx || !bus) return;

    this.stopScheduler();
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.linearRampToValueAtTime(0.0001, now + 0.2);

    if (track === 'none') return;

    window.setTimeout(() => {
      if (this.bgmTrack !== track || !this.ctx || !this.bgmBus) return;
      const c = this.ctx;
      this.nextScheduleTime = c.currentTime + 0.05;
      const def = TRACKS[track];
      const loopBeats = Math.max(...def.melody.map((n) => n.t + n.d), ...def.bass.map((n) => n.t + n.d), 8);
      this.bgmBus.gain.cancelScheduledValues(c.currentTime);
      this.bgmBus.gain.setValueAtTime(0.0001, c.currentTime);
      this.bgmBus.gain.linearRampToValueAtTime(this.bgmGain, c.currentTime + 0.35);
      this.scheduleAhead(loopBeats);
      this.timer = window.setInterval(() => this.scheduleAhead(loopBeats), 120);
    }, 210);
  }

  stopBgm(): void {
    this.playBgm('none');
  }

  /** Duck music briefly on death/stomp punch. */
  duckBgm(amount = 0.55, seconds = 0.25): void {
    const ctx = this.ctx;
    const bus = this.bgmBus;
    if (!ctx || !bus || this.bgmTrack === 'none') return;
    const now = ctx.currentTime;
    const target = this.bgmGain * amount;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + 0.04);
    bus.gain.linearRampToValueAtTime(this.bgmGain, now + seconds);
  }

  jump(): void {
    this.blip(420, 720, 0.12, 'square', 0.2);
  }

  coin(): void {
    this.blip(880, 1320, 0.1, 'square', 0.15);
    window.setTimeout(() => this.blip(1320, 1600, 0.08, 'square', 0.12), 40);
  }

  stomp(): void {
    this.blip(300, 90, 0.12, 'triangle', 0.28);
  }

  bump(): void {
    this.blip(180, 120, 0.08, 'square', 0.2);
  }

  breakBrick(): void {
    this.noise(0.12, 0.25);
  }

  spring(): void {
    this.blip(220, 900, 0.2, 'sine', 0.25);
  }

  die(): void {
    this.blip(400, 80, 0.45, 'sawtooth', 0.22);
  }

  clear(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => {
      window.setTimeout(() => this.blip(n, n * 1.02, 0.14, 'square', 0.16), i * 90);
    });
  }

  ui(): void {
    this.blip(600, 780, 0.06, 'square', 0.1);
  }

  place(): void {
    this.blip(500, 420, 0.05, 'triangle', 0.12);
  }

  dispose(): void {
    this.stopScheduler();
    this.bgmTrack = 'none';
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
      this.sfxBus = null;
      this.bgmBus = null;
    }
  }

  private stopScheduler(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduleAhead(loopBeats: number): void {
    const ctx = this.ctx;
    const bus = this.bgmBus;
    const track = this.bgmTrack;
    if (!ctx || !bus || track === 'none') return;
    const def = TRACKS[track];
    const spb = 60 / def.bpm;
    const horizon = ctx.currentTime + 0.45;

    while (this.nextScheduleTime < horizon) {
      // schedule one loop cycle
      const t0 = this.nextScheduleTime;
      this.schedulePattern(def.melody, t0, spb, bus, 'square', 0.22, def.mood);
      this.schedulePattern(def.bass, t0, spb, bus, 'triangle', 0.3, def.mood);
      if (def.hat) this.scheduleHats(t0, spb, loopBeats, bus);
      this.nextScheduleTime += loopBeats * spb;
    }
  }

  private schedulePattern(
    notes: Note[],
    t0: number,
    spb: number,
    bus: GainNode,
    type: OscillatorType,
    gainScale: number,
    mood: 'bright' | 'dark' | 'soft',
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const n of notes) {
      const start = t0 + n.t * spb;
      const dur = Math.max(0.05, n.d * spb * 0.92);
      const g = gainScale * (n.v ?? 1) * (mood === 'soft' ? 0.7 : 1);
      this.scheduleNote(n.f, start, dur, type, g, bus, mood);
    }
  }

  private scheduleNote(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode,
    mood: 'bright' | 'dark' | 'soft',
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mood === 'dark' ? 900 : 2400;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    // slight arcade detune sparkle
    if (mood === 'bright') osc.detune.setValueAtTime(4, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.setValueAtTime(gain, start + Math.max(0.02, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.03);
    osc.connect(filter);
    filter.connect(g);
    g.connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private scheduleHats(t0: number, spb: number, loopBeats: number, bus: GainNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let b = 0; b < loopBeats; b += 0.5) {
      const start = t0 + b * spb;
      const len = Math.floor(ctx.sampleRate * 0.03);
      if (len <= 0) continue;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5000;
      const g = ctx.createGain();
      const accent = b % 1 === 0 ? 0.045 : 0.028;
      g.gain.value = accent;
      src.connect(hp);
      hp.connect(g);
      g.connect(bus);
      src.start(start);
    }
  }

  private blip(f0: number, f1: number, duration: number, type: OscillatorType, gain: number): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    const master = this.sfxBus ?? this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, gain: number): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    const master = this.sfxBus ?? this.master;
    if (!ctx || !master) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(master);
    src.start();
  }
}
