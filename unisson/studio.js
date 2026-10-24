// UNISSON studio: the sound of a session. Studio (the big screen, on the venue sound system) plays the song's
// stems bar by bar on the room's clock, each through a gate and a tone filter the room controls, into a mix bus
// (glue compressor, then a limiter) that also feeds the recording. Kit (screen and phones) plays real sampled
// instruments: a marimba for the melody (VSCO 2 Community Edition, CC0) and hand percussion for the rhythm.
import { BAR, SIXTEENTH, SONG, noteAt } from './session.js?v=202610241830';

const KIT = { mar: [65, 72, 79, 83, 89], perc: ['shaker', 'tamb', 'conga', 'quinto', 'claves', 'log-hi', 'log-lo'] };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// a room for the marimba: a short, smooth reverb tail, and a dotted-eighth echo, as afro-house leads have
function space(c, out) {
  const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1); }
  const verb = c.createConvolver(); verb.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.32; verb.connect(wet).connect(out);
  const dl = c.createDelay(2), fb = c.createGain(), dlf = c.createBiquadFilter(), dw = c.createGain();
  dl.delayTime.value = (SIXTEENTH * 3) / 1000; fb.gain.value = 0.32; dlf.type = 'lowpass'; dlf.frequency.value = 3200; dw.gain.value = 0.22;
  dl.connect(dlf).connect(fb).connect(dl); dlf.connect(dw).connect(out);
  return { verb, dl };
}

export class Kit {
  constructor(c, out, base) { this.c = c; this.out = out; this.base = base; this.buf = {}; this.fx = space(c, out); this.bus = c.createGain(); this.bus.connect(out); this.bus.connect(this.fx.verb); }
  async load(which = ['mar', 'perc']) {
    const files = [...(which.includes('mar') ? KIT.mar.map((m) => 'mar-' + m) : []), ...(which.includes('perc') ? KIT.perc : [])];
    await Promise.all(files.map(async (f) => { try { const r = await fetch(`${this.base}kit/${f}.mp3`); this.buf[f] = await this.c.decodeAudioData(await r.arrayBuffer()); } catch {} }));
  }
  // a marimba note: the nearest sample, re-pitched, with a little velocity colour
  mar(m, t, v = 0.8, echo = 0.5) {
    const s = KIT.mar.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a)), b = this.buf['mar-' + s]; if (!b) return;
    const src = this.c.createBufferSource(), g = this.c.createGain(), f = this.c.createBiquadFilter();
    src.buffer = b; src.playbackRate.value = Math.pow(2, (m - s) / 12); f.type = 'lowpass'; f.frequency.value = 2400 + 5600 * v;
    g.gain.value = 0.25 + 0.75 * v * v; src.connect(f).connect(g); g.connect(this.bus);
    if (echo) { const e = this.c.createGain(); e.gain.value = echo; g.connect(e).connect(this.fx.dl); }
    src.start(t); src.stop(t + 3);
  }
  perc(name, t, v = 0.8, rate = 1) {
    const b = this.buf[name]; if (!b) return;
    const src = this.c.createBufferSource(), g = this.c.createGain(); src.buffer = b; src.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    g.gain.value = 0.2 + 0.8 * v; src.connect(g).connect(this.out); src.start(t);
  }
}

export class Studio {
  constructor() {
    const c = this.c = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
    // mix bus: glue, then a safety limiter; the recording taps the very output the room hears
    this.bus = c.createGain(); this.bus.gain.value = 0.78;
    const glue = c.createDynamicsCompressor(); glue.threshold.value = -12; glue.ratio.value = 2.2; glue.attack.value = 0.012; glue.release.value = 0.22; glue.knee.value = 8;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -1.5; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; lim.knee.value = 0;
    this.bus.connect(glue).connect(lim).connect(c.destination);
    this.rec = c.createMediaStreamDestination(); lim.connect(this.rec);
    this.kit = new Kit(c, this.bus, '');
    this.ch = {}; this.buf = {}; this.live = []; this.sync();
  }
  sync() { this.base = this.c.currentTime - Date.now() / 1000; }
  at(ms) { return Math.max(this.c.currentTime, ms / 1000 + this.base); }
  async load(base, onProgress) {
    this.kit.base = base; let done = 0; const total = SONG.stems.length + 1;
    await Promise.all([...SONG.stems.map(async (s) => {
      const r = await fetch(`${base}${SONG.id}/${s}.mp3`); this.buf[s] = await this.c.decodeAudioData(await r.arrayBuffer()); onProgress?.(++done / total);
    }), this.kit.load().then(() => onProgress?.(++done / total))]);
    for (const s of SONG.stems) { // each stem: gate (the room) -> tone (the room's brightness) -> meter -> bus
      const gate = this.c.createGain(), tone = this.c.createBiquadFilter(), meter = this.c.createAnalyser();
      gate.gain.value = 0; tone.type = 'lowpass'; tone.frequency.value = 20000; tone.Q.value = 0.5; meter.fftSize = 512;
      gate.connect(tone).connect(this.bus); tone.connect(meter);
      this.ch[s] = { gate, tone, meter, data: new Float32Array(512), level: 0 };
    }
  }
  // the room's hand on a stem: level 0..1 and brightness 0..1, gliding from the given instant
  set(stem, level, bright = 1, ms = Date.now(), glide = 0.06) {
    const ch = this.ch[stem]; if (!ch) return; const t = this.at(ms);
    ch.gate.gain.setTargetAtTime(level, t, glide);
    ch.tone.frequency.setTargetAtTime(300 * Math.pow(20000 / 300, Math.max(0, Math.min(1, bright))), t, glide * 1.5);
  }
  // one bar of the song at an instant: carries on the running sources when the song bar follows on, otherwise
  // starts new ones there with a tiny crossfade, so a loop or a jump never clicks
  bar(songBar, ms) {
    const t = this.at(ms), cont = this.live.length && this.lastBar === songBar - 1 && Math.abs(this.lastEnd - t) < 0.02;
    this.lastBar = songBar; this.lastEnd = t + BAR / 1000;
    if (cont) return;
    const X = 0.008;
    for (const l of this.live) { l.g.gain.setValueAtTime(1, t - X); l.g.gain.linearRampToValueAtTime(0, t + X); l.src.stop(t + X + 0.02); }
    this.live = [];
    if (songBar == null) return;
    for (const s of SONG.stems) {
      const b = this.buf[s]; if (!b) continue;
      const src = this.c.createBufferSource(), g = this.c.createGain(); src.buffer = b; src.connect(g).connect(this.ch[s].gate);
      const off = (songBar * BAR) / 1000, st = Math.max(this.c.currentTime, t - X);
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(1, t + X);
      src.start(st, Math.max(0, off - (t - st))); this.live.push({ src, g });
    }
  }
  stop(ms) { this.bar(null, ms); }
  // how loud each stem is right now, for the picture of the room
  levels() {
    const o = {};
    for (const [s, ch] of Object.entries(this.ch)) { ch.meter.getFloatTimeDomainData(ch.data); let a = 0; for (const v of ch.data) a += v * v; const rms = Math.sqrt(a / ch.data.length); ch.level = ch.level * 0.8 + Math.min(1, rms * 5) * 0.2; o[s] = ch.level; }
    return o;
  }
  // the room's melody on the sound system: the hidden note of the sixteenth it lands on
  melody(slot, ms, v) { this.kit.mar(noteAt(slot), this.at(ms), v, 0.45); }
  // thirty seconds of what the room made, from the venue output
  record(ms = 30000) {
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => window.MediaRecorder?.isTypeSupported?.(m));
    if (!type) return Promise.resolve(null);
    return new Promise((res) => {
      const r = new MediaRecorder(this.rec.stream, { mimeType: type, audioBitsPerSecond: 128000 }), parts = [];
      r.ondataavailable = (e) => e.data.size && parts.push(e.data); r.onstop = () => res(new Blob(parts, { type: type.split(';')[0] }));
      r.start(); setTimeout(() => r.stop(), ms);
    });
  }
}
