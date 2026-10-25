// UNISSON Jam sound: real recorded instruments, played the way the real ones are.
//   guitar  University of Iowa MIS acoustic guitar (free for any use), every semitone D2 to D5
//   piano   VSCO 2 CE upright piano (CC0), every minor third
//   marimba VSCO 2 CE (CC0); hand percussion VSCO 2 CE (CC0); kick and snare designed here
//   beats   studio drum grooves and the afro band, produced with Eleven Music (cleared for commercial use)
// (samples gathered by the tonejs-instruments project). One engine serves the live instrument and the export:
// everything is scheduled on the clock, so a recording replays and renders exactly as it was played.

const RANGE = { gtr: [38, 74, 1], pno: [33, 96, 3], mar: [65, 89, null] };
const MAR = [65, 72, 79, 83, 89];

export class Engine {
  constructor(clock = () => Date.now(), ctx = null) {
    this.clock = clock;
    const c = this.c = ctx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.out = c.createGain(); this.out.gain.value = 0.85;
    const glue = c.createDynamicsCompressor(); glue.threshold.value = -14; glue.ratio.value = 2; glue.attack.value = 0.01; glue.release.value = 0.2;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -1; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
    this.out.connect(glue).connect(lim).connect(c.destination);
    // a warm room: short, smooth, a touch of early reflections
    const len = Math.floor(c.sampleRate * 1.8), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5) * (i < 300 ? i / 300 : 1); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.22; this.verb.connect(wet).connect(this.out);
    this.inst = {}; for (const k of ['gtr', 'pno', 'mar', 'drm', 'beat']) { const g = c.createGain(); g.gain.value = k === 'beat' ? 0.8 : 1; g.connect(this.out); if (k !== 'beat') { const s = c.createGain(); s.gain.value = k === 'gtr' ? 0.5 : k === 'pno' ? 0.6 : 0.8; g.connect(s).connect(this.verb); } this.inst[k] = g; }
    this.buf = {}; this.loading = {}; this.strings = []; this.held = new Map(); this.noise = (() => { const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    this.sync();
  }
  sync() { this.base = this.c.currentTime - this.clock() / 1000; }
  now() { return this.c.currentTime + 0.003; }
  at(ms) { if (Math.abs(this.c.currentTime - this.clock() / 1000 - this.base) > 0.03) this.sync(); return Math.max(this.c.currentTime, ms / 1000 + this.base); }
  async fetch(url) { const r = await fetch(url); return this.c.decodeAudioData(await r.arrayBuffer()); }
  // load an instrument (once); resolves when every sample is in
  load(k, base = '../audio/') {
    if (this.loading[k]) return this.loading[k];
    let files = [];
    if (k === 'gtr' || k === 'pno') { const [a, b, s] = RANGE[k]; for (let m = a; m <= b; m += s) files.push([`${k}${m}`, `${base}${k}/${m}.mp3`]); }
    if (k === 'mar') files = MAR.map((m) => [`mar${m}`, `${base}kit/mar-${m}.mp3`]);
    if (k === 'drm') files = ['ohat', 'clap', 'conga', 'shaker'].map((n) => [n, `${base}drm/${n}.mp3`]).concat([['tamb', `${base}kit/tamb.mp3`], ['claves', `${base}kit/claves.mp3`]]);
    if (k.startsWith('beat:')) files = [[k, `${base}beat/${k.slice(5)}.mp3`]];
    return (this.loading[k] = Promise.all(files.map(async ([n, u]) => { try { this.buf[n] = await this.fetch(u); } catch {} })));
  }
  // one recorded note, re-pitched from the nearest sample; returns a voice that can be stopped
  note(k, m, t, v = 0.8, gain = 1) {
    let s, name;
    if (k === 'mar') { s = MAR.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a)); name = 'mar' + s; }
    else { const [a, b, step] = RANGE[k]; s = Math.max(a, Math.min(b, a + Math.round((m - a) / step) * step)); name = k + s; }
    const buf = this.buf[name]; if (!buf) return null;
    const c = this.c, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; src.playbackRate.value = Math.pow(2, (m - s) / 12);
    f.type = 'lowpass'; f.frequency.value = 1400 + 9000 * v * v; f.Q.value = 0.3;
    const peak = (0.18 + 0.82 * v * v) * gain; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.002);
    src.connect(f).connect(g).connect(this.inst[k]); src.start(t);
    return { stop: (at = this.now(), rel = 0.12) => { g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(g.gain.value || peak, at); g.gain.setTargetAtTime(0, at, rel / 3); src.stop(at + rel * 3); }, src };
  }
  // a guitar string: a new note on the same string stops the one ringing on it, as on a real guitar
  string(i, m, t, v) {
    this.strings[i]?.stop(t, 0.05);
    this.strings[i] = m == null ? null : this.note('gtr', m, t, v, 0.9);
  }
  muteStrings(t = this.now()) { for (let i = 0; i < 6; i++) { this.strings[i]?.stop(t, 0.06); this.strings[i] = null; } }
  // a piano chord held under a finger
  chordOn(key, notes, t, v) { this.chordOff(key, t); this.held.set(key, notes.map((m, i) => this.note('pno', m, t + i * 0.004, v * (i < 2 ? 0.75 : 0.9), 0.75)).filter(Boolean)); }
  chordOff(key, t = this.now()) { const h = this.held.get(key); if (h) { for (const n of h) n.stop(t, 0.35); this.held.delete(key); } }
  // drums: a kick and a snare designed for it, the rest recorded
  drum(name, t, v = 0.9) {
    const c = this.c, dst = this.inst.drm;
    if (name === 'kick') {
      const o = c.createOscillator(), g = c.createGain(), sh = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.2 * x); } sh.curve = curve;
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.1 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      o.connect(sh).connect(g).connect(dst); o.start(t); o.stop(t + 0.5);
      const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = this.noise; nf.type = 'highpass'; nf.frequency.value = 3000; ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012); n.connect(nf).connect(ng).connect(dst); n.start(t); n.stop(t + 0.02);
      return;
    }
    if (name === 'snare') {
      const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.08); og.gain.setValueAtTime(0.5 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.13); o.connect(og).connect(dst); o.start(t); o.stop(t + 0.15);
      const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 3800; f.Q.value = 0.7; g.gain.setValueAtTime(0.7 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); n.connect(f).connect(g).connect(dst); n.start(t); n.stop(t + 0.25);
      if (this.buf.clap) { const s = c.createBufferSource(), sg = c.createGain(); s.buffer = this.buf.clap; sg.gain.value = 0.35 * v; s.connect(sg).connect(dst); s.start(t); }
      return;
    }
    const map = { hat: 'ohat', ohat: 'ohat', clap: 'clap', conga: 'conga', shaker: 'shaker', tamb: 'tamb', claves: 'claves' }, b = this.buf[map[name]]; if (!b) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = name === 'hat' ? 1.08 : 0.98 + Math.random() * 0.04;
    g.gain.setValueAtTime((name === 'hat' ? 0.55 : 0.9) * v, t); if (name === 'hat') g.gain.setTargetAtTime(0, t + 0.035, 0.02);
    s.connect(g).connect(dst); s.start(t);
  }
  // the backing: a loop of the song's band, started on the room's clock so every phone of a room agrees
  beatStart(name, t0ms, loopSec) {
    this.beatStop(); const b = this.buf['beat:' + name]; if (!b) return;
    const s = this.c.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = 0; s.loopEnd = Math.min(b.duration, loopSec);
    const now = this.clock(), into = ((((now + 40 - t0ms) / 1000) % loopSec) + loopSec) % loopSec;
    s.connect(this.inst.beat); s.start(this.at(now + 40), into); this.beat = s;
  }
  beatStop() { try { this.beat?.stop(); } catch {} this.beat = null; }
}

// ---------------------------------------------------------------- recording and export
// A take is a list of events on the loop's time (ms from the loop start): replayed live by the scheduler, and
// rendered offline (the same engine on an OfflineAudioContext) to a WAV the player keeps or shares.
export function playEvent(E, ev, t) {
  if (ev.k === 's') E.string(ev.i, ev.m, t, ev.v);
  else if (ev.k === 'n') { const n = E.note(ev.ins, ev.m, t, ev.v, ev.ins === 'pno' ? 0.8 : 1); if (n && ev.d) n.stop(t + ev.d / 1000, ev.ins === 'pno' ? 0.3 : 0.2); }
  else if (ev.k === 'c') { E.chordOn('rec' + ev.id, ev.m, t, ev.v); E.chordOff('rec' + ev.id, t + (ev.d || 800) / 1000); }
  else if (ev.k === 'd') E.drum(ev.m, t, ev.v);
}
export async function render(live, take, song, loops = 2) {
  const L = take.loop / 1000, sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr * (L * loops + 2.5)), sr);
  const E = new Engine(() => 0, off); E.buf = live.buf; E.base = 0;
  if (song.beat && live.buf['beat:' + song.beat]) { const s = off.createBufferSource(); s.buffer = live.buf['beat:' + song.beat]; s.loop = true; s.loopEnd = L; s.connect(E.inst.beat); s.start(0); s.stop(L * loops); }
  for (let k = 0; k < loops; k++) for (const ev of take.events) playEvent(E, ev, k * L + ev.t / 1000);
  return wav(await off.startRendering());
}
function wav(b) {
  const n = b.length, ch = b.numberOfChannels, buf = new ArrayBuffer(44 + n * ch * 2), v = new DataView(buf); let o = 0;
  const s = (x) => { for (const c of x) v.setUint8(o++, c.charCodeAt(0)); }, u32 = (x) => { v.setUint32(o, x, true); o += 4; }, u16 = (x) => { v.setUint16(o, x, true); o += 2; };
  s('RIFF'); u32(36 + n * ch * 2); s('WAVE'); s('fmt '); u32(16); u16(1); u16(ch); u32(b.sampleRate); u32(b.sampleRate * ch * 2); u16(ch * 2); u16(16); s('data'); u32(n * ch * 2);
  const d = [...Array(ch)].map((_, i) => b.getChannelData(i));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, d[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
  return new Blob([buf], { type: 'audio/wav' });
}
