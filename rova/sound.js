// Sound: every effect is synthesised (no files), Nora's voice streams from small mp3s, one at a time.
// The voice sits on top; effects stay well under it.
import { CAPTIONS } from './captions.js';

let ctx = null, fxBus = null, muted = false;
const audio = new Audio(); audio.preload = 'auto';
export const sound = {
  lang: 'fr', speaking: false,
  unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      fxBus = ctx.createGain(); fxBus.gain.value = 0.32; fxBus.connect(ctx.destination);
      try { navigator.audioSession && (navigator.audioSession.type = 'playback'); } catch {}
    }
    if (ctx.state === 'suspended') ctx.resume();
  },
  mute(m) { muted = m; audio.muted = m; if (fxBus) fxBus.gain.value = m ? 0 : 0.32; },
  // Nora speaks; resolves when the line is over (or stopped)
  say(id) {
    this.stopVoice();
    return new Promise((res) => {
      this.speaking = true; this.cur = id;
      const done = () => { audio.onended = audio.onerror = null; if (this.cur === id) this.speaking = false; res(); };
      audio.src = `audio/${this.lang}/${id}.mp3`; audio.onended = done; audio.onerror = done; this.done = done;
      if (fxBus) fxBus.gain.setTargetAtTime(muted ? 0 : 0.18, ctx.currentTime, 0.1);
      audio.play().catch(done);
    }).finally(() => { if (fxBus) fxBus.gain.setTargetAtTime(muted ? 0 : 0.32, ctx.currentTime, 0.3); });
  },
  stopVoice() { audio.pause(); const d = this.done; this.done = null; this.speaking = false; d?.(); },
  text: (id) => CAPTIONS[sound.lang]?.[id] || '',
  // ------------------------------------------------------------ effects
  tone(f, d, { type = 'sine', v = 0.5, at = 0, slide = 0, attack = 0.005 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + d + 0.05);
  },
  noise(d, { v = 0.4, at = 0, f = 1200, q = 0.8, type = 'bandpass', slide = 1 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + at, n = Math.ceil(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d); fl.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(fxBus); s.start(t);
  },
  // ROVA's little voice: a few chirps
  chirp(kind = 'hi') {
    const seq = { hi: [880, 1320], ok: [660, 990, 1320], no: [520, 360], q: [700, 1050, 800] }[kind] || [880];
    seq.forEach((f, i) => this.tone(f, 0.09, { type: 'square', v: 0.07, at: i * 0.08, slide: 1.15 }));
  },
  whirr(ms) { this.tone(180, ms / 1000, { type: 'sawtooth', v: 0.05, slide: 1.3, attack: 0.05 }); this.noise(ms / 1000, { v: 0.05, f: 700 }); },
  turn(dir) { this.tone(dir > 0 ? 400 : 330, 0.22, { type: 'triangle', v: 0.12, slide: dir > 0 ? 1.5 : 0.7 }); },
  bonk() { this.tone(140, 0.3, { type: 'sine', v: 0.6, slide: 0.5 }); this.noise(0.12, { v: 0.5, f: 500 }); this.chirp('no'); },
  uhoh() { this.tone(600, 0.18, { type: 'square', v: 0.06 }); this.tone(420, 0.3, { type: 'square', v: 0.06, at: 0.2 }); },
  pickup() { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', v: 0.18, at: i * 0.06 })); },
  lamp() { this.tone(1046, 0.5, { type: 'sine', v: 0.2 }); this.tone(1568, 0.6, { type: 'sine', v: 0.12, at: 0.05 }); this.noise(0.08, { v: 0.15, f: 4000 }); },
  tick() { this.tone(1500, 0.05, { type: 'square', v: 0.06 }); },
  block() { this.tone(520, 0.07, { type: 'triangle', v: 0.16, slide: 1.4 }); },
  remove() { this.tone(400, 0.12, { type: 'triangle', v: 0.14, slide: 0.5 }); },
  full() { this.tone(220, 0.15, { type: 'square', v: 0.1 }); this.tone(196, 0.25, { type: 'square', v: 0.1, at: 0.16 }); },
  boot() { [262, 392, 523, 784].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', v: 0.14, at: i * 0.18 })); this.chirp('hi'); },
  yay() { this.chirp('ok'); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', v: 0.2, at: i * 0.11 })); this.tone(1318, 0.8, { type: 'sine', v: 0.14, at: 0.45 }); },
  star(i) { this.tone(784 * Math.pow(1.26, i), 0.4, { type: 'triangle', v: 0.2 }); },
  thunder() { this.noise(2.6, { v: 0.55, f: 220, type: 'lowpass', q: 0.4, slide: 0.4 }); this.noise(0.3, { v: 0.35, f: 1800, at: 0.02 }); },
  power() { this.tone(60, 2.2, { type: 'sawtooth', v: 0.18, slide: 4, attack: 0.4 }); this.noise(1.6, { v: 0.15, f: 300, slide: 6 }); },
};
