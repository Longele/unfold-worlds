// Abysses sound: WebAudio buses (voice, fx, ambience, music), voice lines that queue and duck the beds,
// looping ambiences that crossfade, the iOS unlock. Shared shape with the Contes engine.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// ------------------------------------------------------------------ audio
export class Audio {
  constructor() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
    const c = this.ctx; this.buf = new Map(); this.loops = new Map(); this.cur = null; this.gen = 0;
    if (!c) return;
    this.out = c.createDynamicsCompressor(); this.out.connect(c.destination);
    const bus = (v) => { const g = c.createGain(); g.gain.value = v; g.connect(this.out); return g; };
    this.voice = bus(1); this.fx = bus(0.8); this.amb = bus(0.7); this.music = bus(0.45);
  }
  unlock() {
    const c = this.ctx; if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    if (this.unlocked) return; this.unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try { const a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.01; a.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA'; a.play().catch(() => {}); } catch {}
  }
  // phones have little memory for decoded sound: drop what the story no longer needs
  trim(keep) { for (const u of [...this.buf.keys()]) if (!keep(u)) this.buf.delete(u); }
  load(url) {
    if (!this.ctx) return Promise.resolve(null);
    if (!this.buf.has(url)) this.buf.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(url))).then((a) => new Promise((res, rej) => this.ctx.decodeAudioData(a, res, rej))).catch(() => null));
    return this.buf.get(url);
  }
  async sfx(url, vol = 1, rate = 1) {
    const b = await this.load(url); if (!b || !this.ctx) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(this.fx); s.start();
  }
  async loop(key, url, bus = 'amb', vol = 1, fade = 1.5) {
    if (!this.ctx) return;
    if (this.loops.get(key)?.url === url) return;
    this.stopLoop(key, fade);
    const b = await this.load(url); if (!b) return;
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.loop = true;
    s.loopStart = 0.05; s.loopEnd = b.duration - 0.05;
    g.gain.value = 0; g.gain.setTargetAtTime(vol, c.currentTime, fade / 3);
    s.connect(g).connect(this[bus]); s.start(0, 0.05);
    this.loops.set(key, { url, s, g });
  }
  stopLoop(key, fade = 1) {
    const l = this.loops.get(key); if (!l || !this.ctx) return;
    const t = this.ctx.currentTime; l.g.gain.setTargetAtTime(0, t, fade / 3); try { l.s.stop(t + fade * 2); } catch {}
    this.loops.delete(key);
  }
  // a voice line: resolves when it ends; ducks the beds while it plays
  async say(url, onTime) {
    while (this.cur) await this.cur.ended; // a line never cuts the one still being spoken
    const gen = this.gen;
    const b = await this.load(url); if (!b || !this.ctx) { await sleep(1200); return; }
    if (gen !== this.gen) return; // the page changed while it loaded
    const c = this.ctx, s = c.createBufferSource(); s.buffer = b; s.connect(this.voice);
    for (const bus of [this.amb, this.music]) bus.gain.setTargetAtTime(bus === this.amb ? 0.35 : 0.2, c.currentTime, 0.25);
    const t0 = c.currentTime + 0.05;
    return new Promise((res) => {
      let raf = 0;
      const tick = () => { if (this.cur?.s !== s) return; onTime?.(c.currentTime - t0); raf = requestAnimationFrame(tick); };
      const done = () => { cancelAnimationFrame(raf); if (this.cur?.s === s) { this.cur = null; this.amb.gain.setTargetAtTime(0.7, c.currentTime, 0.6); this.music.gain.setTargetAtTime(this.musicOn ? 0.45 : 0, c.currentTime, 0.6); } onTime?.(1e9); res(); };
      let endRes; const ended = new Promise((r) => (endRes = r));
      this.cur = { s, done: () => { done(); endRes(); }, ended };
      s.onended = this.cur.done; s.start(t0); tick();
    });
  }
  // page change: cut what is speaking and drop what was waiting
  stopVoice() { this.gen = (this.gen || 0) + 1; const v = this.cur; if (!v) return; this.cur = null; try { v.s.onended = null; v.s.stop(); } catch {} v.done(); }
  get speaking() { return !!this.cur; }
  setMusic(on) { this.musicOn = on; if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.45 : 0, this.ctx.currentTime, 0.4); }
  pause(on) { if (!this.ctx) return; on ? this.ctx.suspend().catch(() => {}) : this.ctx.resume().catch(() => {}); }
}

export { sleep };
