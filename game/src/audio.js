// audio.js — every sound in the game is synthesised with WebAudio, so the
// game ships no sound files at all. Footsteps are the point: a guard's step
// is a soft tick you can hear coming before you can see its cone.
//
// The audio context is created lazily on the first user gesture (browsers
// demand that) and every method is a no-op until then, so headless runs and
// screenshots never fail on sound.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.lastAlert = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, gain, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* sound is decoration; never break the game */ }
  }

  noise(dur, gain, freq) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch { /* sound is decoration; never break the game */ }
  }

  // A footstep: the player's is a soft tap, a guard's a heavier boot.
  step(x, y, isGuard) {
    if (!this.ctx) return;
    if (isGuard) this.noise(0.07, 0.10, 420);
    else this.noise(0.05, 0.05, 700);
  }

  // Two-tone sting when a guard's meter fills and the chase starts.
  alert() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastAlert < 1200) return;
    this.lastAlert = now;
    this.tone(392, 0.14, 'triangle', 0.16);
    setTimeout(() => this.tone(523, 0.2, 'triangle', 0.16), 130);
  }

  pickup() {
    this.tone(660, 0.1, 'sine', 0.12);
    setTimeout(() => this.tone(880, 0.14, 'sine', 0.12), 90);
  }

  pebble() {
    this.noise(0.05, 0.14, 2400);
    setTimeout(() => this.tone(1900, 0.06, 'sine', 0.06), 60);
  }

  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.12, 55);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sine', 0.14), i * 110));
  }

  click() {
    this.tone(520, 0.06, 'sine', 0.08);
  }
}
