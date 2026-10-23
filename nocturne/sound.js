// Audio for NOCTURNE: a sampled grand piano (Salamander, CC BY 3.0, 4 samples per octave, repitched to
// the nearest one), a soft hall, a sustain pedal, the narrator and the rain. Everything goes through one
// compressor so a fistful of keys never clips.

const PCS = { C: 0, Ds: 3, Fs: 6, A: 9 };
const SAMPLES = [];
for (let o = 1; o <= 6; o++) for (const [n, pc] of Object.entries(PCS)) SAMPLES.push({ file: `${n}${o}`, midi: 12 * (o + 1) + pc });
SAMPLES.push({ file: 'C7', midi: 96 });

export class Sound {
  constructor(base = '.') {
    this.base = base;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.out = c.createDynamicsCompressor();
    this.out.threshold.value = -14; this.out.knee.value = 12; this.out.ratio.value = 3; this.out.attack.value = 0.004; this.out.release.value = 0.25;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.out.connect(this.master).connect(c.destination);
    // piano: dry + hall
    this.piano = c.createGain(); this.piano.gain.value = 0.85;
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(3.4);
    this.wet = c.createGain(); this.wet.gain.value = 0.32;
    this.piano.connect(this.out); this.piano.connect(this.verb); this.verb.connect(this.wet).connect(this.out);
    // narrator, slightly in the same room
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = 1;
    this.voiceBus.connect(this.out);
    const vsend = c.createGain(); vsend.gain.value = 0.08; this.voiceBus.connect(vsend).connect(this.verb);
    // rain
    this.ambBus = c.createGain(); this.ambBus.gain.value = 0; this.ambBus.connect(this.out);
    this.buf = new Map(); this.voices = new Map(); this.down = new Set(); this.sustain = false;
    this.lines = new Map(); this.cur = null;
  }

  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.4 * (t / sec)); // darker as it decays
        d[i] = lp * Math.pow(1 - t / sec, 2.2) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    return b;
  }

  async fetchBuf(url) {
    const r = await fetch(url); if (!r.ok) throw new Error(url);
    const a = await r.arrayBuffer();
    return await new Promise((res, rej) => this.ctx.decodeAudioData(a, res, rej));
  }

  // four at a time (phones choke on 25 parallel decodes) and a missing sample is not fatal: its neighbours stretch
  async load(onProgress) {
    let done = 0, next = 0;
    const worker = async () => {
      while (next < SAMPLES.length) {
        const s = SAMPLES[next++];
        try { this.buf.set(s.midi, await this.fetchBuf(`${this.base}/audio/piano/${s.file}.mp3`)); } catch {}
        onProgress?.(++done / SAMPLES.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (!this.buf.size) throw new Error('no piano samples');
    this.fetchBuf(`${this.base}/audio/rain.mp3`).then((b) => { this.rainBuf = b; if (this.rainOn) this.rain(true); }).catch(() => {});
  }

  async loadLines(lang, ids) {
    this.lang = lang;
    await Promise.all(ids.map(async (id) => {
      const k = `${lang}/${id}`;
      if (!this.lines.has(k)) this.lines.set(k, this.fetchBuf(`${this.base}/audio/voice/${lang}/${id}.mp3`).catch(() => null));
    }));
  }

  // must run inside a tap: wakes the context, and on iPhone switches the audio session to "playback" so the
  // silent switch does not mute the piano (a looping silent <audio> does it on Safari versions without audioSession)
  unlock() {
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.unmuted) return;
    this.unmuted = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try {
      const a = document.createElement('audio');
      a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.01;
      a.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA';
      a.play().catch(() => {});
    } catch {}
  }

  nearest(m) {
    let best = null;
    for (const s of this.buf.keys()) if (best == null || Math.abs(s - m) < Math.abs(best - m)) best = s;
    return best;
  }

  noteOn(m, vel = 0.75, when = 0) {
    const c = this.ctx, s = this.nearest(m), b = this.buf.get(s);
    if (!b) return;
    const t = Math.max(c.currentTime, when || 0);
    const old = this.voices.get(m); if (old) this.damp(old, t, 0.04);
    const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = Math.pow(2, (m - s) / 12);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + Math.pow(vel, 1.3) * 11000; f.Q.value = 0.3;
    const g = c.createGain(); g.gain.value = (0.12 + 0.88 * Math.pow(vel, 1.5)) * 0.8;
    src.connect(f).connect(g).connect(this.piano);
    src.start(t);
    const v = { src, g, m };
    this.voices.set(m, v); this.down.add(m);
    src.onended = () => { if (this.voices.get(m) === v) this.voices.delete(m); };
    return v;
  }

  noteOff(m, when = 0) {
    this.down.delete(m);
    if (this.sustain) return;
    const v = this.voices.get(m); if (!v) return;
    this.voices.delete(m);
    this.damp(v, Math.max(this.ctx.currentTime, when || 0), 0.11);
  }

  damp(v, t, tau) {
    try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, tau); v.src.stop(t + tau * 9); } catch {}
  }

  setSustain(on) {
    this.sustain = on;
    if (on) return;
    const t = this.ctx.currentTime;
    for (const [m, v] of this.voices) if (!this.down.has(m)) { this.voices.delete(m); this.damp(v, t, 0.18); }
  }

  allOff() { const t = this.ctx.currentTime; for (const v of this.voices.values()) this.damp(v, t, 0.2); this.voices.clear(); this.down.clear(); }

  // narrator: resolves when the line ends (or is stopped)
  async say(id) {
    this.stopVoice();
    const b = await this.lines.get(`${this.lang}/${id}`);
    if (!b) return;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = b;
    src.connect(this.voiceBus);
    const t = c.currentTime + 0.05;
    this.ambBus.gain.setTargetAtTime(this.rainOn ? 0.28 : 0, t, 0.4);
    return new Promise((res) => {
      this.cur = { src, res };
      src.onended = () => { if (this.cur?.src === src) { this.cur = null; this.ambBus.gain.setTargetAtTime(this.rainOn ? 0.55 : 0, c.currentTime, 0.8); } res(); };
      src.start(t);
    });
  }
  stopVoice() { const v = this.cur; if (!v) return; this.cur = null; try { v.src.onended = null; v.src.stop(); } catch {} v.res(); }
  get speaking() { return !!this.cur; }

  rain(on) {
    this.rainOn = on;
    const c = this.ctx, t = c.currentTime;
    if (on && this.rainBuf && !this.rainSrc) {
      const s = c.createBufferSource(); s.buffer = this.rainBuf; s.loop = true;
      s.loopStart = 0.06; s.loopEnd = this.rainBuf.duration - 0.06; // mp3 padding at both ends
      s.connect(this.ambBus); s.start(t, 0.06); this.rainSrc = s;
    }
    this.ambBus.gain.cancelScheduledValues(t);
    this.ambBus.gain.setTargetAtTime(on ? (this.cur ? 0.28 : 0.55) : 0, t, on ? 1.2 : 0.5);
  }

  // a soft bell for "well done": two partials, no sample needed
  chime(m = 84) {
    const c = this.ctx, t = c.currentTime;
    for (const [mul, a] of [[1, 0.06], [2.76, 0.02], [5.4, 0.008]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 440 * Math.pow(2, (m - 69) / 12) * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / mul);
      o.connect(g).connect(this.piano); o.start(t); o.stop(t + 2.5);
    }
  }
}
