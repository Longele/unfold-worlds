// The storybook engine: a 1920x1080 shadow-theatre stage scaled to the screen, jointed paper puppets,
// a particle layer for light, dust, water and fireflies, WebAudio for voices and sounds, read-along
// captions, and the small interactions children use to move the story on.

export const W = 1920, H = 1080;
const $ = (s, el = document) => el.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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

// ------------------------------------------------------------------ puppets
// A puppet is nested layers cut from one picture; each layer turns around its own joint.
export class Puppet {
  constructor(stage, id, rig) {
    const name = id.split('#')[0];
    this.id = id; this.name = name; this.rig = rig;
    const el = this.el = document.createElement('div'); el.className = 'puppet ' + name;
    el.style.width = rig.w + 'px'; el.style.height = rig.h + 'px';
    this.parts = {};
    for (const p of rig.parts) {
      const d = document.createElement('div'); d.className = 'part';
      d.style.backgroundImage = `url(art/${name}-${p.name}.webp)`;
      if (p.pivot) d.style.transformOrigin = `${p.pivot[0]}px ${p.pivot[1]}px`;
      (p.parent ? this.parts[p.parent] : el).append(d);
      this.parts[p.name] = d;
    }
    stage.append(el);
    // state: where it stands (feet), how it moves
    this.x = 0; this.y = 0; this.s = 0.5; this.flip = false; this.rot = 0; this.alpha = 1; this.lift = 0;
    this.mode = 'idle'; this.talk = 0; this.mouth = 0; this.t0 = Math.random() * 10; this.tween = null; this.clip = 0;
  }
  place(o) { Object.assign(this, o); return this; }
  // move smoothly to a target over ms (x, y, s, rot, alpha, lift); hop adds a little bounce per step
  to(o, ms = 1000, opts = {}) {
    const from = {}; for (const k in o) from[k] = this[k];
    return new Promise((res) => { this.tween = { from, to: o, t: 0, ms, res, hop: opts.hop || 0 }; });
  }
  frame(now, dt) {
    const tw = this.tween;
    let hopY = 0;
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / tw.ms); const k = ease(tw.t);
      for (const key in tw.to) this[key] = lerp(tw.from[key], tw.to[key], k);
      if (tw.hop) hopY = -Math.abs(Math.sin(tw.t * Math.PI * tw.hop)) * 60;
      if (tw.t >= 1) { this.tween = null; tw.res(); }
    }
    const t = now / 1000 + this.t0, P = this.parts, R = (el, deg, extra = '') => { if (el) el.style.transform = `rotate(${deg.toFixed(2)}deg)${extra}`; };
    const talk = this.talk, m = this.mouth;
    let bob = Math.sin(t * 1.6) * 3, lean = 0, sx = 1, sy = 1 + Math.sin(t * 1.6) * 0.008;
    if (tw && !tw.hop && tw.to.x !== undefined && tw.t < 1 && Math.abs(tw.to.x - tw.from.x) > 50) { bob += -Math.abs(Math.sin(t * 6)) * 9; lean += Math.sin(t * 6) * 1.6; } // walking
    if (this.mode === 'pull') { lean = -6 + Math.sin(t * 9) * 1.5; bob += Math.sin(t * 13) * 2; }
    if (this.mode === 'laugh') { bob += -Math.abs(Math.sin(t * 9)) * 10; sy *= 1 + Math.abs(Math.sin(t * 9)) * 0.03; }
    if (this.mode === 'sleep') { bob = Math.sin(t * 0.9) * 2; }
    if (this.name === 'kalulu') {
      R(P.ears, Math.sin(t * 2.3) * 4 + (talk ? Math.sin(t * 11) * 5 : 0) + (this.mode === 'alert' ? -8 : 0));
      R(P.head, Math.sin(t * 1.3) * 2 + talk * Math.sin(t * 7) * 4 + (this.mode === 'laugh' ? Math.sin(t * 9) * 6 : 0));
      R(P.tail, Math.sin(t * 5) * 8);
      const run = tw && tw.hop ? Math.sin(tw.t * Math.PI * tw.hop * 2) * 18 : 0;
      R(P.hind, run); R(P.front, -run);
    } else if (this.name === 'elephant') {
      R(P.trunk, Math.sin(t * 1.1) * 5 + talk * Math.sin(t * 5) * 9 + (this.mode === 'trumpet' ? -38 : 0) + (this.mode === 'pull' ? 18 : 0));
      R(P.ear, Math.sin(t * 2.1) * 3 + (talk ? Math.sin(t * 8) * 4 : 0) + (this.mode === 'trumpet' ? Math.sin(t * 16) * 8 : 0));
      R(P.tail, Math.sin(t * 2.7) * 10);
    } else if (this.name === 'noe') {
      const look = this.mode === 'look' ? -7 : 0;
      R(P.head, Math.sin(t * 1.1) * 1.5 + talk * (Math.sin(t * 6.5) * 2.4 + m * 2) + look + (this.mode === 'laugh' ? Math.sin(t * 9) * 3 : 0));
      const raise = this.mode === 'wave' ? -18 + Math.sin(t * 7) * 7 : this.mode === 'raise' ? -24 : 0;
      R(P.arm, Math.sin(t * 1.3) * 1 + raise);
    } else if (this.name === 'hippo') {
      const yawn = this.mode === 'yawn' ? 1 : 0;
      R(P.head, Math.sin(t * 1.2) * 2 + talk * Math.sin(t * 6) * 3 - yawn * 10 + (this.mode === 'pull' ? 6 : 0));
      R(P.jaw, m * 14 + yawn * 26);
      R(P.tail, Math.sin(t * 6) * 12);
    }
    const f = this.flip ? -1 : 1;
    // the puppet stands on its feet: (x, y) is the point under its feet
    const ox = this.rig.w / 2, oy = this.rig.feet;
    this.el.style.transform = `translate(${(this.x - ox).toFixed(1)}px, ${(this.y - oy + bob + hopY - this.lift).toFixed(1)}px) rotate(${(this.rot + lean * f).toFixed(2)}deg) scale(${(this.s * f * sx).toFixed(4)}, ${(this.s * sy).toFixed(4)})`;
    this.el.style.transformOrigin = `${ox}px ${oy}px`;
    this.el.style.opacity = this.alpha;
    this.el.style.clipPath = this.clip ? `inset(0 0 ${this.clip}% 0)` : '';
  }
  remove() { this.el.remove(); }
}

// ------------------------------------------------------------------ particles
export class Particles {
  constructor(canvas) {
    this.c = canvas; this.ps = []; this.fireflies = []; this.dust = true;
    const lite = matchMedia('(pointer: coarse)').matches;
    if (lite) { canvas.width = W / 2; canvas.height = H / 2; }
    this.g = canvas.getContext('2d'); if (lite) this.g.scale(0.5, 0.5);
    for (let i = 0; i < (lite ? 35 : 70); i++) this.ps.push(this.mote());
  }
  mote() { return { k: 'mote', x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 8, r: 1 + Math.random() * 2.5, a: 0.15 + Math.random() * 0.35, life: 1e9 }; }
  burst(x, y, kind, n = 24) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 380;
      if (kind === 'splash') this.ps.push({ k: 'drop', x: x + (Math.random() - 0.5) * 160, y, vx: Math.cos(ang) * sp * 0.6, vy: -200 - Math.random() * 520, r: 3 + Math.random() * 6, a: 0.9, life: 1.4, g: 900 });
      else if (kind === 'bubbles') this.ps.push({ k: 'bubble', x: x + (Math.random() - 0.5) * 120, y: y + Math.random() * 30, vx: (Math.random() - 0.5) * 20, vy: -60 - Math.random() * 90, r: 4 + Math.random() * 10, a: 0.8, life: 1.6 + Math.random() });
      else if (kind === 'leaves') this.ps.push({ k: 'leaf', x, y, vx: Math.cos(ang) * sp * 0.7, vy: -Math.abs(Math.sin(ang)) * sp - 100, r: 8 + Math.random() * 8, a: 1, life: 1.8, g: 500, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
      else if (kind === 'gold') this.ps.push({ k: 'spark', x: Math.random() * W, y: H + 20 - Math.random() * 200, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 120, r: 1.5 + Math.random() * 3, a: 0.9, life: 4 + Math.random() * 4 });
      else if (kind === 'dust') this.ps.push({ k: 'puff', x: x + (Math.random() - 0.5) * 200, y, vx: (Math.random() - 0.5) * 120, vy: -20 - Math.random() * 60, r: 20 + Math.random() * 30, a: 0.35, life: 1.4 });
      else this.ps.push({ k: 'spark', x, y, vx: Math.cos(ang) * sp * 0.5, vy: Math.sin(ang) * sp * 0.5 - 60, r: 2 + Math.random() * 3, a: 1, life: 0.9 + Math.random() * 0.6 });
    }
  }
  setRain(level) { this.rain = level; }
  setFireflies(n) { this.fireflies = Array.from({ length: n }, (_, i) => ({ x: 300 + Math.random() * 1400, y: 250 + Math.random() * 600, p: Math.random() * 10, b: 0, id: i })); }
  frame(dt) {
    const g = this.g; g.clearRect(0, 0, W, H);
    const s = dt / 1000;
    if (this.rain) for (let i = 0; i < this.rain * dt * 0.18; i++) this.ps.push({ k: 'rain', x: Math.random() * (W + 300) - 150, y: -30 - Math.random() * 80, vx: -180, vy: 1500 + Math.random() * 500, r: 1.2 + Math.random(), a: 0.35 + Math.random() * 0.3, life: 0.9 });
    this.ps = this.ps.filter((p) => (p.life -= s) > 0);
    for (const p of this.ps) {
      p.vy += (p.g || 0) * s; p.x += p.vx * s; p.y += p.vy * s;
      if (p.k === 'mote') { if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (!this.dust) continue; }
      const fade = p.k === 'mote' ? p.a : Math.min(1, p.life * 1.6) * p.a;
      g.globalAlpha = fade;
      if (p.k === 'rain') { g.strokeStyle = 'rgba(225,238,255,1)'; g.lineWidth = p.r; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.vx * 0.022, p.y + p.vy * 0.022); g.stroke(); continue; }
      if (p.k === 'drop') { g.fillStyle = '#e9fbff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
      else if (p.k === 'bubble') { g.strokeStyle = '#eafcff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x + Math.sin(p.life * 8) * 4, p.y, p.r, 0, 7); g.stroke(); }
      else if (p.k === 'leaf') { p.rot += p.vr * s; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = '#3a1d0e'; g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, 7); g.fill(); g.restore(); }
      else if (p.k === 'puff') { const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (2 - p.life)); gr.addColorStop(0, 'rgba(160,110,70,.6)'); gr.addColorStop(1, 'rgba(160,110,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * (2 - p.life), 0, 7); g.fill(); }
      else { const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, 7); g.fill(); }
    }
    const now = performance.now() / 1000;
    for (const f of this.fireflies) {
      f.x += Math.sin(now * 0.7 + f.p) * 0.6 + Math.cos(now * 0.3 + f.p * 2) * 0.4; f.y += Math.cos(now * 0.5 + f.p) * 0.5;
      f.b = Math.max(0, f.b - s * 0.8);
      const glow = 0.35 + 0.35 * Math.sin(now * 2 + f.p * 3) + f.b, r = 10 + f.b * 26;
      g.globalAlpha = Math.min(1, glow);
      const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 3); gr.addColorStop(0, 'rgba(255,250,190,1)'); gr.addColorStop(0.25, 'rgba(230,255,140,.7)'); gr.addColorStop(1, 'rgba(200,255,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ the stage
export class Stage {
  constructor(root, rig) {
    this.root = root; this.rig = rig;
    this.bg = $('#bg', root); this.bg2 = $('#bg2', root); this.actorsEl = $('#actors', root); this.frontEl = $('#front', root);
    this.fx = new Particles($('#fx', root)); this.hot = $('#hot', root); this.sky = $('#sky', root);
    this.actors = {}; this.props = []; this.par = { x: 0, y: 0, tx: 0, ty: 0 };
    this.cam = $('#cam', root); this.focus = null; this.cz = 1; this.cx = W / 2; this.cy = H / 2;
    this.still = matchMedia('(pointer: coarse)').matches;
    this.scale = 1; this.fit(); addEventListener('resize', () => this.fit());
    if (!this.still) addEventListener('pointermove', (e) => { this.par.tx = e.clientX / innerWidth - 0.5; this.par.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(50, now - last); last = now;
      if (!this.paused) {
        this.par.x = lerp(this.par.x, this.par.tx, 0.04); this.par.y = lerp(this.par.y, this.par.ty, 0.04);
        const z = this.still ? 1.04 : 1.04 + Math.sin(now / 9000) * 0.01;
        this.bg.style.transform = `translate(${(-this.par.x * 18).toFixed(1)}px, ${(-this.par.y * 10).toFixed(1)}px) scale(${z.toFixed(4)})`;
        this.actorsEl.style.transform = `translate(${(-this.par.x * 34).toFixed(1)}px, ${(-this.par.y * 16).toFixed(1)}px)`;
        this.frontEl.style.transform = `translate(${(-this.par.x * 70).toFixed(1)}px, ${(-this.par.y * 26).toFixed(1)}px)`;
        // camera: lean in a little toward the speaker, ease back when it is the child's turn
        const busy = this.still || this.hot.childElementCount > 0, f = !busy && this.focus && this.actors[this.focus];
        const tz = f ? 1.05 : 1.0, tx = f ? f.x : W / 2, ty = f ? f.y - f.rig.feet * f.s * 0.55 : H / 2;
        const k = Math.min(1, dt / 1400);
        this.cz += (tz - this.cz) * k; this.cx += (tx - this.cx) * k; this.cy += (ty - this.cy) * k;
        const ox = (W / 2 - this.cx) * (this.cz - 1), oy = (H / 2 - this.cy) * (this.cz - 1);
        this.cam.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) scale(${this.cz.toFixed(4)})`;
        for (const a of Object.values(this.actors)) a.frame(now, dt);
        this.onFrame?.(now, dt);
        this.fx.frame(dt);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  fit() {
    // the whole scene stays on screen: at most a sliver is cropped (10 %), whatever the phone's shape;
    // what is left at the edges is filled by the same picture, blurred, so it never looks like bars
    // phones: the browser bars come and go and change the height a little; the scene must not jump with them,
    // so it is only refitted when the phone turns (width changes) or the height really changes
    if (this.still && this.fw === innerWidth && Math.abs(innerHeight - this.fh) < innerHeight * 0.22) return;
    this.fw = innerWidth; this.fh = innerHeight;
    this.root.style.top = `${(innerHeight / 2).toFixed(1)}px`; // pinned in pixels, not to the (resizing) window
    const cover = Math.max(innerWidth / W, innerHeight / H), contain = Math.min(innerWidth / W, innerHeight / H);
    const sc = Math.min(cover, contain * 1.1);
    this.scale = sc;
    document.body.classList.toggle('boxed-x', W * sc < innerWidth - 2);
    document.body.classList.toggle('boxed-y', H * sc < innerHeight - 2);
    const extra = Math.max(0, H * sc - innerHeight);
    const dy = -extra * 0.42; // keep the ground in view: the sky gives way first
    this.root.style.transform = `translate(-50%, -50%) translateY(${dy.toFixed(1)}px) scale(${sc})`;
  }
  // stage coordinates from a pointer event
  pt(e) { const r = this.root.getBoundingClientRect(); return { x: (e.clientX - r.left) / this.scale, y: (e.clientY - r.top) / this.scale }; }
  turnPage() { const el = this.root.querySelector('#iris'); if (!el) return; el.classList.remove('run'); void el.offsetWidth; el.classList.add('run'); }
  setBg(name, ms = 900) {
    return new Promise((res) => {
      const img = new Image(); img.src = `art/${name}.webp`;
      const go = () => { const amb = document.getElementById('ambient'); if (amb) amb.style.backgroundImage = `url(${img.src})`; this.bg2.style.backgroundImage = `url(${img.src})`; this.bg2.style.opacity = 1; setTimeout(() => { this.bg.style.backgroundImage = `url(${img.src})`; this.bg2.style.transition = 'none'; this.bg2.style.opacity = 0; requestAnimationFrame(() => (this.bg2.style.transition = '')); res(); }, ms); };
      img.decode ? img.decode().then(go, go) : (img.onload = go);
    });
  }
  actor(id) { return (this.actors[id] ||= new Puppet(this.actorsEl, id, this.rig.rigs[id.split('#')[0]])); }
  dismiss(name) { this.actors[name]?.remove(); delete this.actors[name]; }
  clearActors() { for (const n of Object.keys(this.actors)) this.dismiss(n); }
  prop(name, o = {}) {
    const m = Object.values(this.rig.props).flat().find((p) => p.name === name);
    const el = document.createElement('div'); el.className = 'prop ' + name + (o.cls ? ' ' + o.cls : '');
    el.style.cssText = `width:${m.w}px;height:${m.h}px;background-image:url(art/${name}.webp);left:${o.x ?? 0}px;top:${o.y ?? 0}px;transform:${o.tf || ''} scale(${o.s ?? 1});`;
    (o.parent || (o.layer === 'actors' ? this.actorsEl : this.frontEl)).append(el);
    this.props.push(el); return el;
  }
  // a box in stage coordinates that moves several props together (the ark and its door, afloat)
  group(cls = '', layer = 'actors') {
    const g = document.createElement('div'); g.className = 'group ' + cls;
    ({ actors: this.actorsEl, front: this.frontEl, bg: this.bg })[layer].append(g); this.props.push(g); return g;
  }
  clearProps() { for (const p of this.props) p.remove(); this.props = []; }
}

// ------------------------------------------------------------------ interactions
// each returns a promise the story awaits; `hint` draws the pulsing ring and the little hand
export function hint(stage, x, y, r = 120) {
  const h = document.createElement('div'); h.className = 'hint';
  h.style.cssText = `left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px`;
  h.innerHTML = '<i></i><b></b>'; stage.hot.append(h); return h;
}
// repeat the invitation if nothing happens for a while (twice at most)
function nudge(fn) { let n = 0; const id = setInterval(() => { if (++n > 2) return clearInterval(id); fn?.(); }, 13000); return () => clearInterval(id); }
export function tapZone(stage, z, onTap, remind) {
  return new Promise((res) => {
    const stop = nudge(remind);
    const el = document.createElement('button'); el.className = 'zone';
    el.style.cssText = `left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px`;
    const h = hint(stage, z.x + z.w / 2, z.y + z.h / 2, Math.min(150, Math.max(z.w, z.h) / 2));
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); stop(); h.remove(); el.remove(); onTap?.(stage.pt(e)); res(); }, { once: true });
    stage.hot.append(el);
  });
}
// drag from (x0) to (x1) along a line at y; onMove(k 0..1)
export function dragAlong(stage, x0, x1, y, onMove, remind) {
  return new Promise((res) => {
    const stop = nudge(remind);
    const el = document.createElement('div'); el.className = 'zone drag'; el.style.cssText = `left:${x0 - 80}px;top:${y - 140}px;width:${x1 - x0 + 160}px;height:280px`;
    const h = hint(stage, x0 + 40, y, 90); h.classList.add('slide'); h.style.setProperty('--dx', `${x1 - x0 - 80}px`);
    let k = 0, down = false;
    const move = (e) => { if (!down) return; const p = stage.pt(e); const nk = Math.max(k, Math.min(1, (p.x - x0) / (x1 - x0))); if (nk > k) { k = nk; onMove(k); } if (k >= 0.97) { done(); } };
    const done = () => { stop(); el.remove(); h.remove(); removeEventListener('pointermove', move); res(); };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; h.style.opacity = 0; move(e); });
    addEventListener('pointerup', () => (down = false));
    addEventListener('pointermove', move);
    stage.hot.append(el);
  });
}
// tap many times quickly: a meter fills; resolves when full (or after a while, kindly)
export function rapid(stage, n, onTap) {
  return new Promise((res) => {
    const el = document.createElement('button'); el.className = 'zone full';
    const meter = document.createElement('div'); meter.className = 'meter'; meter.innerHTML = '<i></i>'; stage.hot.append(meter);
    const h = hint(stage, W / 2, H * 0.55, 110); h.classList.add('tapfast');
    let c = 0; const timer = setTimeout(() => finish(), 14000);
    const finish = () => { clearTimeout(timer); el.remove(); meter.remove(); h.remove(); res(); };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); c++; h.style.opacity = 0; meter.firstChild.style.width = `${Math.min(100, (c / n) * 100)}%`; onTap?.(stage.pt(e), c / n); if (c >= n) finish(); });
    stage.hot.append(el);
  });
}
// swipe across a segment (a, b): resolves when the finger path crosses it
export function swipeAcross(stage, a, b, remind) {
  return new Promise((res) => {
    const stop = nudge(remind);
    const el = document.createElement('div'); el.className = 'zone full';
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const h = hint(stage, mx, my - 120, 80); h.classList.add('swipe');
    let prev = null;
    const side = (p) => Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    const within = (p) => { const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2); return t > -0.05 && t < 1.05; };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); prev = stage.pt(e); });
    el.addEventListener('pointermove', (e) => {
      if (!prev) return; const p = stage.pt(e);
      if (side(p) !== side(prev) && side(prev) !== 0 && within(p)) { stop(); el.remove(); h.remove(); res(p); return; }
      prev = p;
    });
    el.addEventListener('pointerup', () => (prev = null));
    stage.hot.append(el);
  });
}
export function choose(stage, opts) {
  return new Promise((res) => {
    const box = document.createElement('div'); box.className = 'choice';
    box.innerHTML = opts.map((o, i) => `<button data-i="${i}"><span class="ph" style="background-image:url(art/${o.img})"></span><span class="t">${o.label}</span></button>`).join('');
    box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; box.classList.add('out'); setTimeout(() => box.remove(), 500); res(+b.dataset.i); });
    stage.hot.append(box);
  });
}
export { sleep };
