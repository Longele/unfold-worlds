// The 3D station: the level's floor tiles, crates, charger, battery cells and lamps, and ROVA himself (a small
// white robot with a screen face). Everything is built from simple shapes, no model files. The app drives it:
// load a level, then move / turn / bump ROVA step by step while the program runs.
import * as THREE from './lib/three/three.module.js';
import { world as readWorld, DX, DY } from './vm.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const yawOf = (d) => -d * Math.PI / 2;

function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// a rounded slab lying flat (top at y = depth)
function slab(w, h, r, depth, bevel = 0.03) {
  const g = new THREE.ExtrudeGeometry(rounded(w, h, r), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0, 0); return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ------------------------------------------------------------------ ROVA
class Rova {
  constructor(sound) {
    this.sound = sound;
    const g = this.g = new THREE.Group(), body = this.body = new THREE.Group(); g.add(body);
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.38, metalness: 0.05 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff8a2a, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.6 });
    // the shell
    const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(0.54, 0.5, 0.16), { depth: 0.44, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 10 }), white);
    shell.geometry.translate(0, 0, -0.22); shell.position.y = 0.42; shell.castShadow = true; body.add(shell);
    // orange stripe and bumper
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.58), orange); band.position.y = 0.2; band.castShadow = true; body.add(band);
    // the face: a dark glass screen with eyes drawn on a canvas
    this.fc = document.createElement('canvas'); this.fc.width = 256; this.fc.height = 160; this.fctx = this.fc.getContext('2d');
    this.ftex = new THREE.CanvasTexture(this.fc); this.ftex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(0.44, 0.3, 0.09), { depth: 0.01, bevelEnabled: false, curveSegments: 8 }), new THREE.MeshBasicMaterial({ map: this.ftex }));
    const uv = screen.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.44 + 0.5, uv.getY(i) / 0.3 + 0.5);
    screen.rotation.y = Math.PI; screen.position.set(0, 0.46, -0.29); body.add(screen);
    // wheels with treads
    this.wheels = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.36, 0.15, 0); w.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.11, 12), orange); w.add(hub);
      g.add(w); this.wheels.push(w);
    }
    // antenna
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), dark); ant.position.set(0.14, 0.86, 0.05); body.add(ant);
    this.tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5fd4ff })); this.tip.position.set(0.14, 0.98, 0.05); body.add(this.tip);
    this.tipLight = new THREE.PointLight(0x5fd4ff, 0.6, 1.6); this.tipLight.position.copy(this.tip.position); body.add(this.tipLight);
    // side lights
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb35c })); l.position.set(sx * 0.33, 0.5, -0.2); body.add(l); }
    this.state = 'sleep'; this.look = [0, 0]; this.blinkAt = 2; this.t = 0; this.yaw = 0; this.spin = 0;
    this.draw();
  }
  set(x, y, d) { this.x = x; this.y = y; this.d = d; this.g.position.set(x, 0.13, y); this.yaw = yawOf(d); this.g.rotation.set(0, this.yaw, 0); this.body.position.set(0, 0, 0); this.body.rotation.set(0, 0, 0); }
  face(s, ms = 0) { this.state = s; this.draw(); clearTimeout(this.ft); if (ms) this.ft = setTimeout(() => { this.state = 'idle'; this.draw(); }, ms); }
  antenna(hex) { this.tip.material.color.setHex(hex); this.tipLight.color.setHex(hex); }
  draw() {
    const c = this.fctx, W = 256, H = 160, s = this.state, t = this.t;
    c.fillStyle = '#0b1220'; c.fillRect(0, 0, W, H);
    c.save(); c.shadowColor = '#5fd4ff'; c.shadowBlur = 18; c.fillStyle = '#7fe0ff'; c.strokeStyle = '#7fe0ff'; c.lineWidth = 12; c.lineCap = 'round';
    const lx = 82 + this.look[0] * 14, rx = 174 + this.look[0] * 14, ey = 78 + this.look[1] * 12;
    const blink = this.blink || 0;
    if (s === 'sleep') { c.beginPath(); c.moveTo(lx - 22, ey + 6); c.lineTo(lx + 22, ey + 6); c.moveTo(rx - 22, ey + 6); c.lineTo(rx + 22, ey + 6); c.globalAlpha = 0.45; c.stroke(); }
    else if (s === 'happy' || s === 'proud') { c.beginPath(); c.arc(lx, ey + 14, 24, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(rx - 22, ey + 4); c.arc(rx, ey + 14, 24, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); if (s === 'proud') { c.fillStyle = '#ff9fc9'; c.shadowColor = '#ff9fc9'; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(lx - 10, ey + 42, 16, 8, 0, 0, 7); c.ellipse(rx + 10, ey + 42, 16, 8, 0, 0, 7); c.fill(); } }
    else if (s === 'dizzy') { for (const x of [lx, rx]) { c.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 2.2; c.lineTo(x + Math.cos(a + t * 8) * r, ey + Math.sin(a + t * 8) * r); } c.lineWidth = 6; c.stroke(); } }
    else if (s === 'surprised' || s === 'scared') { c.lineWidth = 9; for (const x of [lx, rx]) { c.beginPath(); c.arc(x, ey, s === 'scared' ? 20 : 26, 0, 7); c.stroke(); } if (s === 'scared') { c.beginPath(); c.arc(128, ey + 52, 10, 0, 7); c.stroke(); } }
    else if (s === 'think') { const h = 34; for (const x of [lx, rx]) { c.beginPath(); c.roundRect(x - 18 + 8, ey - h / 2 - 10, 36, h, 14); c.fill(); } }
    else if (s === 'sad') { c.beginPath(); c.moveTo(lx - 24, ey - 4); c.lineTo(lx + 20, ey + 8); c.moveTo(rx + 24, ey - 4); c.lineTo(rx - 20, ey + 8); c.stroke(); }
    else if (s === 'love') { c.fillStyle = '#ff7fb5'; c.shadowColor = '#ff7fb5'; for (const x of [lx, rx]) { c.beginPath(); c.moveTo(x, ey + 22); c.bezierCurveTo(x - 40, ey - 6, x - 14, ey - 36, x, ey - 14); c.bezierCurveTo(x + 14, ey - 36, x + 40, ey - 6, x, ey + 22); c.fill(); } }
    else { const h = Math.max(4, 46 * (1 - blink)); for (const x of [lx, rx]) { c.beginPath(); c.roundRect(x - 18, ey - h / 2, 36, h, 16); c.fill(); } }
    c.restore();
    // scanlines for the screen look
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
    this.ftex.needsUpdate = true;
  }
  tick(dt) {
    this.t += dt;
    // blink now and then, and look around a little when idle
    if (this.state === 'idle') {
      this.blinkAt -= dt;
      if (this.blinkAt < 0) { this.blink = Math.min(1, (this.blink || 0) + dt * 14); if (this.blink >= 1) { this.blinkAt = 2 + Math.random() * 3; } }
      else if (this.blink) this.blink = Math.max(0, this.blink - dt * 10);
      this.look[0] = Math.sin(this.t * 0.7) * 0.5; this.look[1] = Math.sin(this.t * 0.45) * 0.3;
      this.draw();
    } else if (this.state === 'dizzy') this.draw();
    // a gentle hover of the body
    if (!this.busy) this.body.position.y = Math.sin(this.t * 2.2) * 0.012;
  }
  anim(ms, f) { this.busy = true; return new Promise((res) => { const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); f(k); if (k < 1) requestAnimationFrame(step); else { this.busy = false; res(); } }; requestAnimationFrame(step); }); }
  async move(x, y, ms) {
    const x0 = this.g.position.x, z0 = this.g.position.z; this.sound?.whirr(ms);
    await this.anim(ms, (k) => {
      const e = ease(k); this.g.position.x = lerp(x0, x, e); this.g.position.z = lerp(z0, y, e);
      this.body.rotation.x = -Math.sin(k * Math.PI) * 0.12; this.body.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * 0.03;
      for (const w of this.wheels) w.rotation.x = -(this.spin + e * 6.6);
    });
    this.spin += 6.6; this.x = x; this.y = y;
  }
  async turn(d, ms) {
    let to = yawOf(d); while (to - this.yaw > Math.PI) to -= Math.PI * 2; while (to - this.yaw < -Math.PI) to += Math.PI * 2;
    const y0 = this.yaw; this.sound?.turn(to > y0 ? -1 : 1);
    await this.anim(ms, (k) => { this.g.rotation.y = lerp(y0, to, ease(k)); this.body.rotation.z = Math.sin(k * Math.PI) * 0.06 * Math.sign(to - y0); });
    this.yaw = to; this.d = d;
  }
  // into a crate: a push, a bounce back, dizzy eyes
  async bump(dx, dy, ms) {
    const x0 = this.g.position.x, z0 = this.g.position.z;
    await this.anim(ms * 0.4, (k) => { const e = ease(k) * 0.28; this.g.position.x = x0 + dx * e; this.g.position.z = z0 + dy * e; });
    this.sound?.bonk(); this.face('dizzy'); this.antenna(0xff4d5e);
    await this.anim(ms * 0.6, (k) => { const e = (1 - k) * 0.28 * Math.cos(k * 10) ; this.g.position.x = x0 + dx * Math.max(0, e); this.g.position.z = z0 + dy * Math.max(0, e); this.body.rotation.x = Math.sin(k * 14) * 0.15 * (1 - k); });
    this.g.position.x = x0; this.g.position.z = z0; this.body.rotation.x = 0;
  }
  // to the edge of the void: tips forward, wobbles, steps back
  async teeter(dx, dy, ms) {
    const x0 = this.g.position.x, z0 = this.g.position.z; this.face('scared'); this.sound?.uhoh(); this.antenna(0xff4d5e);
    await this.anim(ms, (k) => { const e = Math.sin(k * Math.PI) * 0.4; this.g.position.x = x0 + dx * e; this.g.position.z = z0 + dy * e; this.body.rotation.x = -Math.sin(k * Math.PI) * 0.45 + Math.sin(k * 30) * 0.05 * Math.sin(k * Math.PI); });
    this.body.rotation.x = 0;
  }
  async hop() { this.face('happy'); this.antenna(0x5dff9d); this.sound?.yay(); await this.anim(900, (k) => { this.body.position.y = Math.sin(k * Math.PI) * 0.35; this.body.rotation.y = ease(k) * Math.PI * 2; }); this.body.rotation.y = 0; }
  async boot() {
    this.sound?.boot(); this.antenna(0x5fd4ff);
    await this.anim(1400, (k) => { this.body.position.y = Math.sin(k * Math.PI) * 0.06; this.state = k < 0.5 ? 'sleep' : 'surprised'; this.draw(); });
    this.face('idle');
  }
}

// ------------------------------------------------------------------ the station
export class Station {
  constructor(canvas, sound) {
    this.sound = sound; this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color(0x0a1020); s.fog = new THREE.Fog(0x0a1020, 12, 34);
    this.cam = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
    this.hemi = new THREE.HemisphereLight(0x9fb8ff, 0x1a1420, 0.55); s.add(this.hemi);
    const k = this.key = new THREE.DirectionalLight(0xfff1dc, 1.6); k.position.set(4, 9, 5); k.castShadow = true; k.shadow.mapSize.set(1024, 1024); k.shadow.bias = -0.0008;
    Object.assign(k.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 }); s.add(k); s.add(k.target);
    // the storm through the high windows: a cold light that flashes now and then
    this.flash = new THREE.DirectionalLight(0xbfd6ff, 0); this.flash.position.set(-6, 8, -4); s.add(this.flash);
    // emergency beacon: a red light turning in a corner
    this.beacon = new THREE.SpotLight(0xff3040, 0, 18, 0.5, 0.6, 1.2); s.add(this.beacon); s.add(this.beacon.target);
    this.beaconLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff3040 })); s.add(this.beaconLamp);
    // the hangar floor far below the platform, with a faint grid
    const grid = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#111a2c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,160,255,.10)'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } });
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.repeat.set(30, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; floor.receiveShadow = true; s.add(floor);
    this.backdrop();
    // floating dust in the light
    const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false })); s.add(this.dust);
    this.level = new THREE.Group(); s.add(this.level);
    this.trail = new THREE.Group(); s.add(this.trail);
    this.fx = new THREE.Group(); s.add(this.fx);
    this.rova = new Rova(sound); s.add(this.rova.g);
    this.view = { yaw: 0.55, pitch: 1.0, dist: 9, cx: 0, cz: 0, fp: 0 }; this.goal = { ...this.view };
    this.clock = new THREE.Clock(); this.ray = new THREE.Raycaster(); this.picks = []; this.parts = [];
    this.lights = 0; this.lightsTo = 0;
    this.input();
    const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    addEventListener('resize', () => this.resize()); this.resize();
  }
  backdrop() {
    // shelves of crates and pillars far around, in the fog, so the platform sits in a big hangar
    const m = new THREE.MeshStandardMaterial({ color: 0x232c42, roughness: 0.9 }), g = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, R = 13 + (i % 3) * 2.5, h = 1 + ((i * 7) % 5) * 0.6;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.6 + (i % 4) * 0.5, h, 1.4), m); b.position.set(Math.cos(a) * R, -0.6 + h / 2, Math.sin(a) * R); b.rotation.y = a; g.add(b);
    }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 12), m); p.position.set(Math.cos(a) * 18, 5, Math.sin(a) * 18); g.add(p); }
    // tall windows with the night outside
    const win = new THREE.MeshBasicMaterial({ color: 0x1d2c55 });
    for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.5), win); w.position.set(-9 + i * 4.5, 5.5, -20); g.add(w); }
    this.windows = win; this.scene.add(g);
  }
  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.fit();
  }
  // ------------------------------------------------------------ building a level
  load(lv, theme = {}) {
    for (const o of [...this.level.children]) this.level.remove(o);
    this.clearTrail(); this.picks = []; this.items = new Map(); this.lampObjs = new Map();
    const W = this.W = readWorld(lv);
    const tileTop = new THREE.MeshStandardMaterial({ color: 0xc9d3e6, roughness: 0.55, metalness: 0.1 });
    const tileAlt = new THREE.MeshStandardMaterial({ color: 0xb7c2d8, roughness: 0.55, metalness: 0.1 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x3a4766, roughness: 0.7 });
    const tg = slab(0.92, 0.92, 0.12, 0.12, 0.025), base = slab(0.98, 0.98, 0.14, 0.5, 0.0);
    const wood = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#c9822f'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#b8722a' : '#d48e3a'; c.fillRect(0, i * (h / 6), w, h / 6 - 3); }
      c.strokeStyle = '#7a4518'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14); c.beginPath(); c.moveTo(14, 14); c.lineTo(w - 14, h - 14); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * w, Math.random() * h, 18, 1);
    });
    const crateMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.8 });
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = W.cell(x, y); if (c === ' ') continue;
      const b = new THREE.Mesh(base, edge); b.position.set(x, -0.52, y); b.receiveShadow = true; this.level.add(b);
      const t = new THREE.Mesh(tg, (x + y) % 2 ? tileAlt : tileTop); t.position.set(x, -0.02, y); t.receiveShadow = true; t.userData = { x, y }; this.level.add(t); this.picks.push(t);
      if (c === '#') {
        const cr = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.66, 0.8), crateMat); cr.position.set(x, 0.43, y); cr.rotation.y = ((x * 7 + y * 3) % 5 - 2) * 0.04; cr.castShadow = true; cr.receiveShadow = true; this.level.add(cr);
        this.items.set('c' + x + ',' + y, cr);
      }
      if (c === 'B') this.items.set(x + ',' + y, this.battery(x, y));
      if (c === 'L') this.lampObjs.set(x + ',' + y, this.lamp(x, y));
    }
    if (W.goal) this.charger(W.goal.x, W.goal.y);
    this.rova.set(W.start.x, W.start.y, W.dir);
    this.bounds = { x0: -0.5, x1: W.w - 0.5, z0: -0.5, z1: W.h - 0.5 };
    this.fit(true);
    this.setLights(theme.lights ?? 0, true);
  }
  charger(x, y) {
    const g = new THREE.Group(); g.position.set(x, 0.12, y);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x18324a, roughness: 0.4, metalness: 0.4 })); pad.receiveShadow = true; g.add(pad);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x48e5ff, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 48), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    const bolt = new THREE.Shape(); bolt.moveTo(0.02, 0.16); bolt.lineTo(-0.09, -0.01); bolt.lineTo(0.0, -0.01); bolt.lineTo(-0.03, -0.16); bolt.lineTo(0.09, 0.03); bolt.lineTo(0.0, 0.03); bolt.lineTo(0.02, 0.16);
    const bm = new THREE.Mesh(new THREE.ShapeGeometry(bolt), ringMat); bm.rotation.x = -Math.PI / 2; bm.position.y = 0.035; g.add(bm);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x48e5ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 0.8; g.add(beam);
    const l = new THREE.PointLight(0x48e5ff, 1.2, 2.6); l.position.y = 0.4; g.add(l);
    this.level.add(g); this.chargerObj = { g, ring, beam, l };
  }
  battery(x, y) {
    const g = new THREE.Group(); g.position.set(x, 0.42, y);
    const glow = new THREE.MeshStandardMaterial({ color: 0x46ff8a, emissive: 0x2bd968, emissiveIntensity: 1.4, roughness: 0.3 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 20), glow); cyl.castShadow = true; g.add(cyl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.7, roughness: 0.3 })); cap.position.y = 0.17; g.add(cap);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.07, 20), new THREE.MeshStandardMaterial({ color: 0x1c2230 })); band.position.y = -0.09; g.add(band);
    const l = new THREE.PointLight(0x46ff8a, 0.8, 1.6); g.add(l);
    this.level.add(g); return g;
  }
  lamp(x, y) {
    const g = new THREE.Group(); g.position.set(x, 0.1, y);
    const metal = new THREE.MeshStandardMaterial({ color: 0x4a5670, roughness: 0.5, metalness: 0.5 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 20), metal); g.add(foot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), metal); pole.position.set(0.32, 0.45, 0.32); g.add(pole);
    const bulbM = new THREE.MeshStandardMaterial({ color: 0x8890a0, emissive: 0xffc04a, emissiveIntensity: 0, roughness: 0.2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), bulbM); bulb.position.set(0.32, 0.95, 0.32); bulb.castShadow = true; g.add(bulb);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    const l = new THREE.PointLight(0xffc04a, 0, 3.2); l.position.copy(bulb.position); g.add(l);
    this.level.add(g); return { g, bulbM, l, ring, on: false };
  }
  // ------------------------------------------------------------ during a run
  pick(key) {
    const b = this.items.get(key);
    if (b) { this.items.delete(key); this.sound?.pickup(); this.burst(b.position, 0x46ff8a, 26); const p0 = b.position.clone(); const t0 = performance.now();
      const go = () => { const k = Math.min(1, (performance.now() - t0) / 500); b.position.y = p0.y + k * 0.8; b.scale.setScalar(1 - k); b.rotation.y += 0.3; if (k < 1) requestAnimationFrame(go); else this.level.remove(b); }; go(); }
    const L = this.lampObjs.get(key);
    if (L && !L.on) { L.on = true; this.sound?.lamp(); L.bulbM.emissiveIntensity = 2.2; L.bulbM.color.setHex(0xfff0c0); L.l.intensity = 2.2; L.ring.material.opacity = 0.9; this.burst(L.g.position.clone().add(new THREE.Vector3(0.32, 0.95, 0.32)), 0xffc04a, 30); }
  }
  trailAt(x, y, from) {
    const m = new THREE.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: 0.85 });
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), m); dot.rotation.x = -Math.PI / 2; dot.position.set(x, 0.135, y); this.trail.add(dot);
    if (from) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1), m); bar.rotation.x = -Math.PI / 2; bar.rotation.z = from.x !== x ? Math.PI / 2 : 0; bar.position.set((x + from.x) / 2, 0.134, (y + from.y) / 2); this.trail.add(bar); }
  }
  clearTrail() { for (const o of [...this.trail.children]) this.trail.remove(o); this.marker = null; }
  // the path another program would take (a hint): orange ghost dots
  ghost(points) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.7 });
    points.forEach((p, i) => { const d = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.12, 20), m); d.rotation.x = -Math.PI / 2; d.position.set(p.x, 0.14, p.y); d.scale.setScalar(0.01); this.trail.add(d); setTimeout(() => { const t0 = performance.now(); const g = () => { const k = Math.min(1, (performance.now() - t0) / 250); d.scale.setScalar(k); if (k < 1) requestAnimationFrame(g); }; g(); }, i * 90); });
  }
  // a prediction: a flag on the tile the learner chose
  mark(x, y, color = 0xffa94d, keep = false) {
    if (this.marker && !keep) this.trail.remove(this.marker);
    const g = new THREE.Group(); g.position.set(x, 0.12, y);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 32), m); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); pole.position.set(0.22, 0.35, 0.22); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); flag.position.set(0.35, 0.62, 0.22); g.add(flag);
    this.trail.add(g); this.marker = g; this.sound?.tick();
  }
  async step(e, prev, ms) {
    const R = this.rova;
    if (e.ev === 'turn') return R.turn(e.d, ms * 0.8);
    if (e.ev === 'move') { await R.move(e.x, e.y, ms); this.trailAt(e.x, e.y, prev); if (e.pick) this.pick(e.pick); return; }
    if (e.ev === 'bump') {
      const nx = e.x + DX[e.d], ny = e.y + DY[e.d], wall = this.items.get('c' + nx + ',' + ny);
      if (wall) { await R.bump(DX[e.d], DY[e.d], ms * 1.1); this.shake(0.12); this.burst(new THREE.Vector3(e.x + DX[e.d] * 0.45, 0.45, e.y + DY[e.d] * 0.45), 0xffd36b, 22); this.wobble(wall); }
      else await R.teeter(DX[e.d], DY[e.d], ms * 1.4);
    }
  }
  wobble(o) { const r0 = o.rotation.y, t0 = performance.now(); const g = () => { const k = Math.min(1, (performance.now() - t0) / 600); o.rotation.z = Math.sin(k * 20) * 0.08 * (1 - k); o.rotation.y = r0; if (k < 1) requestAnimationFrame(g); }; g(); }
  shake(a) { this.shakeA = a; }
  // ------------------------------------------------------------ effects
  burst(at, color, n = 24) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); vel.push(new THREE.Vector3((Math.random() - 0.5) * 2.4, Math.random() * 2.4 + 0.6, (Math.random() - 0.5) * 2.4)); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.fx.add(p); this.parts.push({ p, vel, life: 1 });
  }
  confetti() {
    const n = 160, cols = [0xff5d73, 0xffc145, 0x5fd4ff, 0x7dff9d, 0xb78cff], geo = new THREE.PlaneGeometry(0.08, 0.05);
    const at = this.rova.g.position;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
      m.position.set(at.x, 1.2, at.z); this.fx.add(m);
      this.parts.push({ m, vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 2.5, (Math.random() - 0.5) * 4), spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), life: 2.4 });
    }
    this.sound?.fanfare();
  }
  async win() {
    const c = this.chargerObj; if (c) { c.l.intensity = 4; c.beam.material.opacity = 0.35; }
    this.confetti(); await this.rova.hop(); if (c) { c.l.intensity = 1.2; c.beam.material.opacity = 0.1; }
  }
  lightning() { this.flashT = 1; this.sound?.thunder(); }
  // 0: the storm (dark, red beacon), 1: power back (warm and bright)
  setLights(v, now = false) { this.lightsTo = v; if (now) this.lights = v; }
  // ------------------------------------------------------------ camera
  // the whole platform (crates included) in view, under Nora's box: try distances until every corner fits
  fit(snap = false) {
    if (!this.bounds) return;
    const b = this.bounds, g = this.goal, cam = new THREE.PerspectiveCamera(this.cam.fov, this.cam.aspect || 1, 0.05, 80);
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, pts = [];
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [0, 0.95]) pts.push(new THREE.Vector3(x, y, z));
    const top = this.ui?.top ?? 0.5, bot = this.ui?.bottom ?? -0.85;
    const fits = (dist) => {
      cam.position.set(cx + Math.sin(g.yaw) * Math.cos(g.pitch) * dist, Math.sin(g.pitch) * dist, cz + Math.cos(g.yaw) * Math.cos(g.pitch) * dist); cam.lookAt(cx, 0, cz); cam.updateMatrixWorld();
      let y0 = 9, y1 = -9, ok = true; for (const p of pts) { const q = p.clone().project(cam); if (Math.abs(q.x) > 0.9) ok = false; y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      return { ok: ok && y1 - y0 <= top - bot, mid: (y0 + y1) / 2 };
    };
    let lo = 3, hi = 30; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (fits(m).ok) hi = m; else lo = m; }
    g.dist = hi * 1.04; g.cx = cx; g.cz = cz;
    // shift the picture so the platform sits between Nora's box and the bottom buttons
    this.shiftY = ((top + bot) / 2 - fits(g.dist).mid);
    if (snap) Object.assign(this.view, { cx: g.cx, cz: g.cz, dist: g.dist });
  }
  firstPerson(on) { this.goal.fp = on ? 1 : 0; }
  input() {
    const el = this.canvas; let drag = null; const pts = new Map();
    el.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, yaw: this.goal.yaw, pitch: this.goal.pitch, moved: 0, d0: null, dist: this.goal.dist }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) { this.hover(e); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!drag) return;
      if (pts.size === 2) { const [a, b] = [...pts.values()], dd = Math.hypot(a.x - b.x, a.y - b.y); if (!drag.d0) drag.d0 = dd; this.goal.dist = Math.min(24, Math.max(3.5, drag.dist * drag.d0 / dd)); drag.moved = 99; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 6 && !this.goal.fp) { this.goal.yaw = drag.yaw - dx * 0.006; this.goal.pitch = Math.min(1.35, Math.max(0.45, drag.pitch + dy * 0.004)); }
    });
    const up = (e) => { if (drag && drag.moved < 6 && pts.size === 1) this.tap(e); pts.delete(e.pointerId); if (!pts.size) drag = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); drag = null; });
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.goal.dist = Math.min(24, Math.max(3.5, this.goal.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  }
  tileAt(e) {
    const r = this.canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.cam); const hit = this.ray.intersectObjects(this.picks)[0]; return hit ? hit.object.userData : null;
  }
  tap(e) { if (!this.onTile) return; const t = this.tileAt(e); if (t) this.onTile(t.x, t.y); }
  hover(e) {
    const t = this.onTile ? this.tileAt(e) : null, m = t ? this.picks.find((p) => p.userData === t) : null;
    if (this.hl && this.hl !== m) { this.hl.material = this.hl.userData.mat; this.hl = null; }
    if (m && !this.hl) { m.userData.mat = m.material; m.material = m.material.clone(); m.material.emissive = new THREE.Color(0x6a4a10); this.hl = m; }
    this.canvas.style.cursor = m ? 'pointer' : '';
  }
  // ------------------------------------------------------------ every frame
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta()), t = this.clock.elapsedTime, v = this.view, g = this.goal;
    this.rova.tick(dt);
    // the storm and the power
    this.lights += (this.lightsTo - this.lights) * Math.min(1, dt * 1.2);
    const L = this.lights;
    this.hemi.intensity = lerp(0.45, 1.0, L); this.key.intensity = lerp(1.2, 2.2, L); this.key.color.setHex(L > 0.5 ? 0xfff3e0 : 0xffe2c4);
    this.scene.background.setHex(L > 0.5 ? 0x16223d : 0x0a1020); this.scene.fog.color.copy(this.scene.background);
    this.beacon.intensity = (1 - L) * 26; this.beaconLamp.visible = L < 0.5;
    const ba = t * 2.2; this.beacon.position.set(-4.5, 3.2, -4.5); this.beaconLamp.position.copy(this.beacon.position); this.beacon.target.position.set(-4.5 + Math.cos(ba) * 6, 0, -4.5 + Math.sin(ba) * 6);
    this.windows.color.setHex(L > 0.5 ? 0x324a80 : 0x1d2c55);
    if (this.flashT > 0) { this.flashT -= dt * 1.6; const f = Math.max(0, this.flashT); this.flash.intensity = (f > 0.7 || (f > 0.35 && f < 0.5) ? 5 : 0) * (1 - L * 0.7); this.windows.color.setHex(f > 0.35 ? 0xdfe9ff : 0x1d2c55); }
    else if (Math.random() < dt * 0.05 * (1 - L)) this.lightning();
    // charger pulse, batteries float
    if (this.chargerObj) { const c = this.chargerObj; c.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06); c.beam.rotation.y += dt; }
    for (const [k, b] of this.items) if (!k.startsWith('c')) { b.rotation.y += dt * 1.5; b.position.y = 0.42 + Math.sin(t * 2 + b.position.x) * 0.05; }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.life -= dt;
      if (q.p) { const a = q.p.geometry.attributes.position; for (let j = 0; j < q.vel.length; j++) { q.vel[j].y -= 4 * dt; a.setXYZ(j, a.getX(j) + q.vel[j].x * dt, a.getY(j) + q.vel[j].y * dt, a.getZ(j) + q.vel[j].z * dt); } a.needsUpdate = true; q.p.material.opacity = Math.max(0, q.life); if (q.life <= 0) { this.fx.remove(q.p); this.parts.splice(i, 1); } }
      else { q.vel.y -= 5 * dt; q.vel.multiplyScalar(0.985); q.m.position.addScaledVector(q.vel, dt); q.m.rotation.x += q.spin.x * dt; q.m.rotation.y += q.spin.y * dt; if (q.m.position.y < 0.15) { q.m.position.y = 0.15; q.vel.set(0, 0, 0); } if (q.life <= 0) { this.fx.remove(q.m); this.parts.splice(i, 1); } }
    }
    const dp = this.dust.geometry.attributes.position; for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.05; if (y > 6) y = 0; dp.setY(i, y); } dp.needsUpdate = true;
    // camera: orbit around the map, or ride on ROVA's head
    for (const k of ['yaw', 'pitch', 'dist', 'cx', 'cz', 'fp']) v[k] += (g[k] - v[k]) * Math.min(1, dt * 5);
    const R = this.rova.g, fwd = new THREE.Vector3(-Math.sin(R.rotation.y), 0, -Math.cos(R.rotation.y));
    const orbit = new THREE.Vector3(v.cx + Math.sin(v.yaw) * Math.cos(v.pitch) * v.dist, Math.sin(v.pitch) * v.dist, v.cz + Math.cos(v.yaw) * Math.cos(v.pitch) * v.dist);
    const head = new THREE.Vector3(R.position.x - fwd.x * 1.7, 1.55, R.position.z - fwd.z * 1.7);
    this.cam.position.lerpVectors(orbit, head, v.fp);
    const lookO = new THREE.Vector3(v.cx, 0, v.cz), lookH = new THREE.Vector3(R.position.x + fwd.x * 2.4, 0.1, R.position.z + fwd.z * 2.4);
    const look = lookO.lerp(lookH, v.fp);
    if (this.shakeA > 0.001) { this.cam.position.x += (Math.random() - 0.5) * this.shakeA; this.cam.position.y += (Math.random() - 0.5) * this.shakeA; this.shakeA *= 0.85; }
    this.cam.lookAt(look);
    const H = this.canvas.clientHeight, Wd = this.canvas.clientWidth, sh = (this.shiftY || 0) * (1 - v.fp);
    this.cam.setViewOffset(Wd, H, 0, -sh * H / 2, Wd, H);
    this.renderer.render(this.scene, this.cam);
  }
}
