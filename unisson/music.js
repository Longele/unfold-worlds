// UNISSON sound. Synth: the instruments, shared by the screen (through the venue sound system) and by every
// phone (so a player hears their own note at once). Music: the screen's backing score. All synthesis, locked to
// the shared clock: a note is scheduled on the AudioContext timeline at its Date.now() instant (plus the phone's
// offset to the screen). The crowd plays real notes, but on the next sixteenth and inside the current chord,
// so a room of thousands always sounds in time and in tune.
import { BEAT, STEP, CHORDS, ROOTS, SCALE, chordAt, score, COUNT_IN } from './show.js?v=202610241300';

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Synth {
  constructor(clock = () => Date.now(), light = false) {
    const c = this.c = new (window.AudioContext || window.webkitAudioContext)();
    this.clock = clock;
    this.out = c.createDynamicsCompressor(); this.out.threshold.value = -14; this.out.ratio.value = 3;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.out.connect(this.master).connect(c.destination);
    // a room reverb from decaying noise (shorter on a phone)
    const len = c.sampleRate * (light ? 1.6 : 3.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.wet = c.createGain(); this.wet.gain.value = 0.42; this.verb.connect(this.wet).connect(this.out);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.sync();
  }
  sync() { this.base = this.c.currentTime - this.clock() / 1000; }
  at(ms) { if (Math.abs(this.c.currentTime - this.clock() / 1000 - this.base) > 0.03) this.sync(); return Math.max(this.c.currentTime, ms / 1000 + this.base); }
  // one pad of one section, at a clock instant, inside the chord sounding then
  pad(zone, i, ms, scene, t0, vol = 1) {
    const t = this.at(ms), ch = chordAt(scene, ms - t0), v = vol;
    if (zone === 'g') { [() => this.kick(t, 0.9 * v), () => this.clap(t, 0.32 * v), () => this.snare(t, 0.22 * v), () => this.hat(t, 0.12 * v)][i]?.(); return; }
    if (zone === 'c') {
      const r = ROOTS[ch];
      if (i === 0) { this.sub(N(r), t, 0.55, 0.42 * v); this.pluck(N(r + 12), t, 0.05 * v); }
      if (i === 1) this.pluck(N(r + 19), t, 0.09 * v);
      if (i === 2) this.stab(CHORDS[ch], t, 0.07 * v);
      if (i === 3) this.pluck(N(r + 24), t, 0.08 * v);
      return;
    }
    // melody: five notes of the pentatonic, nudged to the nearest chord tone so it always sounds sweet
    const want = SCALE[i + (scene === 'drop' ? 2 : 0)], tones = CHORDS[ch].flatMap((m) => [m + 12, m + 24]);
    const m = tones.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a), want);
    this.chime(N(Math.abs(m - want) <= 2 ? m : want), t, 0.09 * v); this.pluck(N(want), t, 0.03 * v);
  }
  // ---------------------------------------------------------------- instruments
  env(g, t, a, peak, hold, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
  send(node, dry = 1, wet = 0.5) { const d = this.c.createGain(), w = this.c.createGain(); d.gain.value = dry; w.gain.value = wet; node.connect(d).connect(this.out); node.connect(w).connect(this.verb); }
  wash(notes, t, dur, vol, cut) {
    const c = this.c, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(cut * 0.5, t); f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5); f.Q.value = 0.7;
    this.env(g, t, Math.min(1.6, dur * 0.3), vol, dur * 0.5, Math.max(0.8, dur * 0.4));
    for (const m of notes) for (const det of [-9, 0, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur * 1.6 + 1); }
    f.connect(g); this.send(g, 0.6, 0.8);
  }
  chime(fr, t, vol) {
    const c = this.c, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o2.type = 'sine'; o.frequency.value = fr; o2.frequency.value = fr * 2.76; const g2 = c.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g); this.env(g, t, 0.004, vol, 0.02, 1.4); this.send(g, 0.5, 0.9);
    o.start(t); o2.start(t); o.stop(t + 2); o2.stop(t + 2);
  }
  pluck(fr, t, vol) {
    const c = this.c, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'square'; o.frequency.value = fr;
    f.type = 'lowpass'; f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    o.connect(f).connect(g); this.env(g, t, 0.003, vol, 0.01, 0.3); this.send(g, 0.7, 0.4); o.start(t); o.stop(t + 0.5);
  }
  sub(fr, t, dur, vol) { const c = this.c, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = fr; o.connect(g); this.env(g, t, 0.02, vol, dur * 0.7, dur * 0.3); g.connect(this.out); o.start(t); o.stop(t + dur + 0.1); }
  kick(t, vol) {
    const c = this.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    o.connect(g); this.env(g, t, 0.002, vol, 0.03, 0.32); g.connect(this.out); o.start(t); o.stop(t + 0.5);
  }
  burst(t, type, freq, q, vol, dur, wet = 0.2) {
    const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f).connect(g); this.env(g, t, 0.001, vol, 0.005, dur); this.send(g, 1, wet); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.1);
  }
  hat(t, vol) { this.burst(t, 'highpass', 7500, 0.8, vol, 0.045, 0.05); }
  clap(t, vol) { for (let i = 0; i < 3; i++) this.burst(t + i * 0.011, 'bandpass', 1500, 1.2, vol * (i === 2 ? 1 : 0.6), i === 2 ? 0.16 : 0.02, 0.35); }
  snare(t, vol) { this.burst(t, 'bandpass', 2200, 0.6, vol, 0.12, 0.3); }
  tickSound(t, k) { const c = this.c, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880 * k; o.connect(g); this.env(g, t, 0.002, 0.12, 0.02, 0.2); this.send(g, 0.6, 0.6); o.start(t); o.stop(t + 0.4); }
  riser(t, dur) {
    const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    s.connect(f).connect(g); this.send(g, 0.8, 0.6); s.start(t); s.stop(t + dur + 0.2);
  }
  boom(t) { this.kick(t, 1.2); this.burst(t, 'lowpass', 900, 0.5, 0.5, 1.6, 0.9); const c = this.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.5); o.connect(g); this.env(g, t, 0.005, 0.6, 0.2, 1.4); g.connect(this.out); o.start(t); o.stop(t + 2); }
  heart(t, vol) { this.kick(t, 0.55 * vol); this.kick(t + 0.17, 0.35 * vol); }
  // a handbell: a struck tone with its bell partials, ringing on
  bell(fr, t, len, vol) {
    const c = this.c, g = c.createGain(), ring = Math.min(3.2, len / 1000 + 1.2);
    for (const [k, a] of [[1, 1], [2.01, 0.42], [3.0, 0.16], [4.17, 0.08], [0.5, 0.12]]) { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = fr * k; og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + ring + 0.2); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    this.send(g, 0.8, 0.7); this.burst(t, 'bandpass', fr * 4, 2, vol * 0.25, 0.03, 0.2);
  }
  stab(notes, t, vol) {
    const c = this.c, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    for (const m of notes.slice(0, 4)) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m + 12); o.connect(f); o.start(t); o.stop(t + 0.6); }
    f.connect(g); this.env(g, t, 0.004, vol, 0.05, 0.35); this.send(g, 0.7, 0.5);
  }
}

export class Music extends Synth {
  constructor() {
    super();
    this.scene = 'lobby'; this.t0 = Date.now(); this.step = 0; this.energy = 0; this.taps = 0;
    this.notes = new Map(); // crowd notes already played on a step: the same pad from 300 phones is one strong note, not 300
    setInterval(() => this.tick(), 25);
  }
  resume() { return this.c.resume(); }
  sync() { this.base = this.c.currentTime - Date.now() / 1000; } // AudioContext time for a Date.now() instant
  at(ms) { return ms / 1000 + this.base; }
  cue(scene, t0) { this.scene = scene; this.t0 = t0; this.step = Math.max(0, Math.ceil((Date.now() - t0) / (BEAT / 4))); this.held = null; }
  crowd(n, phones) { this.taps += n; this.energy = Math.min(1, this.energy * 0.9 + (n / Math.max(4, phones * 0.6)) * 0.6); }

  // ---------------------------------------------------------------- the score, one sixteenth at a time
  tick() {
    if (this.c.state !== 'running') return;
    if (this.scene === 'chant' && this.song) { this.chant(); return; }
    if (Math.abs(this.c.currentTime - Date.now() / 1000 - this.base) > 0.03) this.sync();
    const ahead = Date.now() + 160;
    while (this.t0 + this.step * BEAT / 4 < ahead) { this.play(this.step, this.at(this.t0 + this.step * BEAT / 4)); this.step++; }
    this.energy *= 0.995;
  }
  play(s, t) {
    const beat = s / 4, bar = Math.floor(beat / 4), inBar = s % 16, ch = bar % 4, E = this.energy;
    const pend = this.taps; this.taps = 0;
    switch (this.scene) {
      case 'lobby':
        if (s % 64 === 0) this.wash(CHORDS[0].slice(0, 3), t, BEAT * 16 / 1000, 0.05, 700);
        break;
      case 'eveil':
        if (s % 32 === 0) this.wash(CHORDS[(s / 32) % 2 ? 1 : 0], t, BEAT * 8.5 / 1000, 0.07 + 0.05 * Math.min(1, beat / 32), 900 + 1600 * E);
        if (s % 2 === 0 && pend) for (let i = 0; i < Math.min(3, Math.ceil(pend / 3)); i++) this.chime(N(SCALE[(Math.random() * SCALE.length) | 0]), t + i * 0.03, 0.05);
        if (s % 16 === 8 && Math.random() < 0.5) this.chime(N(SCALE[(Math.random() * 6) | 0]), t, 0.03);
        break;
      case 'vague':
        if (inBar === 0) { this.wash(CHORDS[ch], t, BEAT * 4 / 1000, 0.06, 1200 + 2600 * E); this.sub(N(ROOTS[ch]), t, BEAT * 3.6 / 1000, 0.32); }
        if (inBar % 8 === 0) this.kick(t, 0.75);
        if (inBar % 2 === 0) this.hat(t, inBar % 4 === 2 ? 0.08 : 0.04);
        if (inBar === 4 || inBar === 12) this.clap(t, 0.12 + 0.3 * E);
        if (E > 0.25 && s % 2 === 1) this.pluck(N(CHORDS[ch][(s >> 1) % 5] + 12), t, 0.05 * E);
        if (pend && s % 2 === 0) this.chime(N(SCALE[(Math.random() * SCALE.length) | 0]), t, 0.025 + 0.02 * E);
        break;
      case 'drop': {
        const e = s * BEAT / 4; // ms since the cue
        if (e < 4 * BEAT) { // the countdown: a tick on each number, a riser, then a beat of silence
          if (s === 0) this.riser(t, BEAT * 3 / 1000);
          if (s % 4 === 0 && s < 12) this.tickSound(t, s === 8 ? 1.6 : 1);
          if (s >= 8 && s < 12) this.snare(t, 0.06 + (s - 8) * 0.03);
          break;
        }
        const d = s - 16, dIn = d % 16, dch = Math.floor(d / 16) % 4;
        if (d === 0) { this.boom(t); }
        if (dIn % 4 === 0) this.kick(t, 1);
        if (dIn === 0) { this.wash(CHORDS[dch], t, BEAT * 4 / 1000, 0.08, 2600 + 3000 * E); this.sub(N(ROOTS[dch]), t, BEAT * 3.8 / 1000, 0.45); }
        if (dIn % 4 === 2) this.sub(N(ROOTS[dch] + 12), t, BEAT * 0.4 / 1000, 0.22);
        this.hat(t, dIn % 2 ? 0.035 : 0.07);
        if (dIn === 4 || dIn === 12) this.clap(t, 0.32 + 0.3 * E);
        if (s % 2 === 1) this.pluck(N(CHORDS[dch][(d * 3) % 5] + 12), t, 0.04 + 0.05 * E);
        if (pend && E > 0.4 && s % 2 === 0) this.snare(t, 0.05 + 0.08 * E);
        break;
      }
      case 'jam': // the room plays: a light, steady bed that leaves the space to the crowd
        if (inBar === 0) this.wash(CHORDS[ch].slice(0, 3), t, BEAT * 4 / 1000, 0.035, 900);
        if (inBar % 8 === 0) this.kick(t, 0.35);
        if (inBar % 4 === 2) this.hat(t, 0.03);
        break;
      case 'coeur': {
        const e = s * BEAT / 4, rate = 70 - Math.min(40, e / 1500), per = 60000 / rate;
        if (!this.held || e - this.held >= per) { this.held = e; this.heart(t, Math.max(0.15, 1 - e / 60000)); }
        if (s % 64 === 0) this.wash([38, 45, 50, 53], t, BEAT * 16 / 1000, 0.05, 600);
        break;
      }
      case 'fin':
        if (s === 0) this.wash([50, 54, 57, 62, 66], t, 9, 0.08, 1400); // D major: the resolution
        break;
    }
  }

  // ---------------------------------------------------------------- a song, rung by the room
  cueSong(id, t0, net = true) {
    this.scene = 'chant'; this.t0 = t0; this.song = score(id); this.net = net; this.rung = new Map(); this.ghost = new Set(); this.cbeat = 0;
  }
  chant() {
    const sg = this.song, ahead = Date.now() + 160;
    // count-in, then a soft bed of the song's chords, bar by bar
    while (this.t0 + this.cbeat * sg.beat < ahead) {
      const b = this.cbeat, t = this.at(this.t0 + b * sg.beat);
      if (b < COUNT_IN) this.tickSound(t, b === 0 ? 1.5 : 1);
      else if ((b - COUNT_IN) % sg.meter === 0) { const ch = sg.chords[Math.floor((b - COUNT_IN) / sg.meter)]; if (ch) { this.wash(ch, t, sg.beat * sg.meter / 1000, 0.035, 1100); this.sub(440 * Math.pow(2, (ch[0] - 12 - 69) / 12), t, sg.beat * sg.meter * 0.9 / 1000, 0.18); } }
      this.cbeat++;
    }
    // the safety net: every note rings softly on time, so the song never breaks; the room rings it loud
    if (this.net) for (const n of sg.notes) { const ms = this.t0 + n.at; if (ms < ahead && ms > Date.now() - 50 && !this.ghost.has(n.i)) { this.ghost.add(n.i); this.bell(440 * Math.pow(2, (n.m - 69) / 12), this.at(ms), n.len, 0.05); } }
  }
  // a phone rang note k: early or on time, it sounds exactly on its beat; late, only if no net already sang it
  ring(k) {
    if (this.scene !== 'chant' || !this.song) return false;
    const n = this.song.notes[k]; if (!n) return false;
    const ms = this.t0 + n.at, now = Date.now(), c = (this.rung.get(k) || 0) + 1; this.rung.set(k, c);
    if (c > 3) return true;
    const fr = 440 * Math.pow(2, (n.m - 69) / 12), vol = c === 1 ? 0.2 : 0.08;
    if (now < ms - 15) this.bell(fr, this.at(ms), n.len, vol);
    else if (now < ms + 250 && !this.net) this.bell(fr, this.at(now + 10), n.len, vol);
    else if (now < ms + 250) this.bell(fr, this.at(now + 10), n.len, vol * 0.35);
    return true;
  }
  // a note from a phone: on its sixteenth, or the next one if it arrived late
  note(zone, i, s, vol = 1) {
    if (!['eveil', 'vague', 'drop', 'jam'].includes(this.scene)) return false;
    const now = Date.now(); let ms = this.t0 + s * STEP;
    if (ms < now + 40) { s = Math.ceil((now + 40 - this.t0) / STEP); ms = this.t0 + s * STEP; }
    const k = `${zone}${i}:${s}`, n = (this.notes.get(k) || 0) + 1; this.notes.set(k, n);
    if (this.notes.size > 4000) this.notes.clear();
    if (n > 3) return true; // a crowd on one pad: stronger, never louder than three voices
    this.pad(zone, i, ms, this.scene, this.t0, vol * (n === 1 ? 1 : 0.45));
    return true;
  }
}
