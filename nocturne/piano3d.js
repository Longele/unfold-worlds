// The instrument: a lacquered keyboard in the dark, built from rounded boxes. Keys pivot at the back like
// real ones, glow in the colour of their note, and every note lets a few sparks of light drift upward.
// No post-processing: the bloom pass renders black on some Intel GPUs, so the glow is additive light
// (a halo above each key and the sparks), which looks the same everywhere.
import * as THREE from './lib/three/three.module.js';
import { RoundedBoxGeometry } from './lib/three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from './lib/three/addons/environments/RoomEnvironment.js';

export const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
const W = 1, GAP = 0.055, LW = 6, HW = 0.82, WB = 0.56, LB = 3.9, HB = 0.6;
const GOLD = new THREE.Color(1, 0.6, 0.22);
const BLACK_SHIFT = { 1: -0.1, 3: 0.1, 6: -0.12, 8: 0, 10: 0.12 };
// colour of a note: a warm-to-cool ribbon walked in fifths, so neighbours in harmony sit close in colour
const STOPS = [[0.09, 0.95, 0.62], [0.03, 0.85, 0.62], [0.95, 0.7, 0.66], [0.8, 0.55, 0.68], [0.55, 0.6, 0.62], [0.12, 0.9, 0.6]];
export function noteColor(m) {
  const k = ((((m % 12) + 12) % 12) * 7) % 12 / 12 * (STOPS.length - 1);
  const i = Math.floor(k), f = k - i, a = STOPS[i], b = STOPS[Math.min(i + 1, STOPS.length - 1)];
  const h = a[0] + (((b[0] - a[0] + 1.5) % 1) - 0.5) * f;
  return new THREE.Color().setHSL((h + 1) % 1, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

function softDot(size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function textTex(txt, { w = 256, h = 128, color = '#2a2218', font = '400 64px "Cormorant Garamond", Georgia, serif', bg = null, circle = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (circle) { g.fillStyle = bg; g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) / 2 - 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class Piano3D {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const phone = matchMedia('(pointer: coarse)').matches;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 2)); // phones: lighter on the GPU
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(0x050608);
    s.fog = new THREE.FogExp2(0x050608, 0.022);
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.32;
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

    // light: one warm key light from above the player, a cool rim from behind, a whisper of fill
    s.add(new THREE.HemisphereLight(0x8a90a8, 0x000000, 0.25));
    const key = this.key = new THREE.SpotLight(0xffd9a8, 520, 60, 0.55, 0.75, 1.6);
    key.position.set(-3, 16, 10); key.target.position.set(0, 0, 0.5);
    key.castShadow = true; key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 6; key.shadow.camera.far = 40;
    s.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 0.55); rim.position.set(6, 6, -14); s.add(rim);
    this.flash = new THREE.PointLight(0xffb066, 0, 9, 1.8); this.flash.position.set(0, 2, 2); s.add(this.flash);

    this.mat = {
      ivory: new THREE.MeshPhysicalMaterial({ color: 0xece5d8, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.22 }),
      ebony: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.1 }),
      felt: new THREE.MeshStandardMaterial({ color: 0x5a1218, roughness: 0.95 }),
    };
    this.keys = new Map(); this.pickables = [];
    this.root = new THREE.Group(); s.add(this.root);
    this.dot = softDot();
    this.initSparks(); this.initDust(); this.initGuides();


    this.view = { cur: null, to: null }; this.par = new THREE.Vector2(); this.parT = new THREE.Vector2();
    this.ray = new THREE.Raycaster(); this.last = performance.now(); this.t0 = this.last;
    this.labelMode = 'none'; this.nameOf = (m) => ''; this.keyOf = () => '';
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => { this.parT.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); }, { passive: true });
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  // ------------------------------------------------------------------ build
  setRange(lo, hi) {
    if (this.lo === lo && this.hi === hi) return;
    this.lo = lo; this.hi = hi;
    for (const k of this.keys.values()) { this.root.remove(k.g, k.halo); k.mesh.material.dispose(); k.halo.material.dispose(); if (k.badge) this.root.remove(k.badge); }
    this.keys.clear(); this.pickables = [];
    for (const o of this.body || []) this.root.remove(o);
    const whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
    const n = whites.length, x0 = -(n - 1) / 2 * W;
    this.width = n * W;
    const gW = new RoundedBoxGeometry(W - GAP, HW, LW, 3, 0.07);
    const gB = new RoundedBoxGeometry(WB, HB, LB, 3, 0.09);
    const xOf = new Map(); whites.forEach((m, i) => xOf.set(m, x0 + i * W));
    for (let m = lo; m <= hi; m++) {
      const black = isBlack(m);
      const x = black ? (xOf.get(m - 1) ?? x0 - W) + W / 2 + BLACK_SHIFT[m % 12] * W : xOf.get(m);
      const g = new THREE.Group(); g.position.set(x, 0, -LW / 2);
      const mat = (black ? this.mat.ebony : this.mat.ivory).clone();
      mat.emissive = new THREE.Color(0); mat.emissiveIntensity = 1;
      const mesh = new THREE.Mesh(black ? gB : gW, mat);
      mesh.position.set(0, black ? HW / 2 + HB / 2 - 0.12 : 0, black ? LB / 2 : LW / 2);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.midi = m;
      g.add(mesh); this.root.add(g); this.pickables.push(mesh);
      const top = new THREE.Vector3(x, black ? HW / 2 + HB - 0.1 : HW / 2, black ? -LW / 2 + LB - 0.6 : LW / 2 - 1.1);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0 }));
      halo.scale.set(black ? 2.2 : 2.8, black ? 2.2 : 2.8, 1); halo.position.copy(top).add(new THREE.Vector3(0, 0.35, black ? 0.3 : -0.4)); halo.renderOrder = 2;
      this.root.add(halo);
      this.keys.set(m, { m, g, mesh, mat, black, x, a: 0, v: 0, base: mat.color.clone(), at: 0, glow: 0, glowT: 0, tgt: 0, col: noteColor(m), label: null, badge: null, halo, top });
    }
    // the case: keybed, cheeks, key slip, fallboard with the name
    const span = this.width + 1.4, L = this.mat.lacquer, body = [];
    const add = (geo, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = o.receiveShadow = true; this.root.add(o); body.push(o); return o; };
    add(new RoundedBoxGeometry(span, 0.6, LW + 1.6, 2, 0.08), L, 0, -HW / 2 - 0.85, 0.1); // deep enough for a key to dip ~1 cm
    for (const sx of [-1, 1]) add(new RoundedBoxGeometry(0.62, 1.9, LW + 1.6, 3, 0.16), L, sx * (this.width / 2 + 0.36), 0.2, 0.1);
    add(new RoundedBoxGeometry(span, 0.62, 0.34, 2, 0.1), L, 0, -0.2, LW / 2 + 0.32);
    add(new THREE.BoxGeometry(this.width, 0.08, 0.16), this.mat.felt, 0, HW / 2 - 0.02, -LW / 2 - 0.02);
    const fb = add(new RoundedBoxGeometry(span, 2.8, 0.5, 3, 0.12), L, 0, 1.2, -LW / 2 - 0.55, -0.14);
    const name = textTex('N O C T U R N E', { w: 1024, h: 128, color: '#d8b27a', font: '300 58px "Cormorant Garamond", Georgia, serif' });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.52), new THREE.MeshStandardMaterial({ map: name, transparent: true, metalness: 0.85, roughness: 0.3, emissive: 0xb07a30, emissiveIntensity: 0.9, emissiveMap: name }));
    plate.position.set(0, 0.55, 0.26); fb.add(plate);
    const floor = add(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.6, metalness: 0.2 }), 0, -1.6, 0, -Math.PI / 2);
    floor.castShadow = false;
    this.body = body;
    this.applyLabels();
    this.resize();
  }

  // ------------------------------------------------------------------ labels & badges
  setLabels(mode, nameOf, keyOf) { this.labelMode = mode; if (nameOf) this.nameOf = nameOf; if (keyOf) this.keyOf = keyOf; this.applyLabels(); }
  applyLabels() {
    for (const k of this.keys.values()) {
      if (k.label) { k.mesh.remove(k.label); k.label.material.map.dispose(); k.label.material.dispose(); k.label = null; }
      const txt = this.labelMode === 'names' ? this.nameOf(k.m) : this.labelMode === 'keys' ? this.keyOf(k.m) : '';
      if (!txt) continue;
      const small = txt.length > 3;
      const tex = textTex(txt, { color: k.black ? '#e9dcc6' : '#3b2f22', font: `${k.black ? 400 : 400} ${small ? 50 : 66}px "Cormorant Garamond", Georgia, serif` });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(k.black ? 0.62 : 0.92, k.black ? 0.31 : 0.46), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: k.black ? 0.85 : 0.9 }));
      p.rotation.x = -Math.PI / 2;
      p.position.set(0, (k.black ? HB : HW) / 2 + 0.006, k.black ? LB / 2 - 0.55 : LW / 2 - 0.6);
      k.mesh.add(p); k.label = p;
    }
  }
  setBadge(m, txt) {
    const k = this.keys.get(m); if (!k) return;
    if (k.badge) { this.root.remove(k.badge); k.badge.material.map.dispose(); k.badge.material.dispose(); k.badge = null; }
    if (txt == null) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(String(txt), { w: 128, h: 128, color: '#1a0d04', bg: '#ffc27a', circle: true, font: '500 64px "JetBrains Mono", monospace' }), depthWrite: false, toneMapped: false }));
    sp.scale.set(0.62, 0.62, 1); sp.position.copy(k.top).add(new THREE.Vector3(0, 1.25, 0.4));
    this.root.add(sp); k.badge = sp;
  }
  clearBadges() { for (const m of this.keys.keys()) this.setBadge(m, null); }

  // ------------------------------------------------------------------ play
  press(m, vel = 0.75) {
    const k = this.keys.get(m); if (!k) return;
    k.at = 1; k.glowT = 0.6 + vel * 0.9; k.glow = Math.max(k.glow, k.glowT);
    this.spark(k, vel);
    this.flash.color.copy(k.col); this.flash.position.set(k.x, 2.4, k.top.z + 1); this.flash.intensity = 6 + vel * 10;
  }
  release(m) { const k = this.keys.get(m); if (!k) return; k.at = 0; k.glowT = 0; }
  // keys the lesson wants: a slow golden breath
  setTargets(ms = [], strong = false, ghost = []) { for (const k of this.keys.values()) k.tgt = ms.includes(k.m) ? (strong ? 1 : 0.6) : ghost.includes(k.m) ? 0.22 : 0; }
  hint(ms) { for (const m of ms) { const k = this.keys.get(m); if (k) { k.glow = Math.max(k.glow, 0.9); this.spark(k, 0.35, 4); } } }

  pick(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.cam);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    if (!hit) return null;
    return { m: hit.object.userData.midi, depth: hit.point.z };
  }

  // ------------------------------------------------------------------ guiding light
  // the key to play gets a column of warm light and a floating orb; a correct note sends a ring across it
  initGuides() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(64, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
      const v = 1 - y / 255, hx = (x - 31.5) / 32, a = Math.pow(1 - v, 1.4) * Math.exp(-hx * hx / 0.09) * (0.35 + 0.65 * Math.exp(-hx * hx / 0.012)), o = (y * 64 + x) * 4;
      img.data[o] = 255; img.data[o + 1] = 200 + 40 * (1 - v); img.data[o + 2] = 120 + 80 * (1 - v); img.data[o + 3] = Math.round(255 * Math.min(1, a * 1.4));
    }
    g.putImageData(img, 0, 0);
    const beamTex = new THREE.CanvasTexture(c); beamTex.colorSpace = THREE.SRGBColorSpace;
    const pc = document.createElement('canvas'); pc.width = 64; pc.height = 256;
    const pg = pc.getContext('2d'), pimg = pg.createImageData(64, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
      const dx = Math.max(0, Math.abs(x - 31.5) / 32 - 0.55) / 0.45, dy = Math.max(0, Math.abs(y - 127.5) / 128 - 0.8) / 0.2, d = Math.min(1, Math.hypot(dx, dy)), o = (y * 64 + x) * 4;
      pimg.data[o] = pimg.data[o + 1] = pimg.data[o + 2] = 255; pimg.data[o + 3] = Math.round(255 * Math.pow(1 - d, 1.6));
    }
    pg.putImageData(pimg, 0, 0);
    const poolTex = new THREE.CanvasTexture(pc);
    this.beams = Array.from({ length: 4 }, () => {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0, side: THREE.DoubleSide }));
      const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: 0xffc27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0 }));
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex, color: 0xffb35a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
      pool.rotation.x = -Math.PI / 2; pool.renderOrder = 3;
      beam.renderOrder = orb.renderOrder = 3; this.scene.add(beam, orb);
      return { beam, orb, pool, key: null, o: 0 };
    });
    const rc = document.createElement('canvas'); rc.width = rc.height = 128;
    const rg = rc.getContext('2d'); rg.strokeStyle = '#fff'; rg.lineWidth = 6; rg.shadowColor = '#fff'; rg.shadowBlur = 10; rg.beginPath(); rg.arc(64, 64, 52, 0, Math.PI * 2); rg.stroke();
    const ringTex = new THREE.CanvasTexture(rc);
    this.rings = Array.from({ length: 10 }, () => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
      r.rotation.x = -Math.PI / 2; r.renderOrder = 3; this.scene.add(r); return { r, t: 1 };
    });
    this.ringI = 0;
  }
  ripple(m, color = 0xffd08a) {
    const k = this.keys.get(m); if (!k) return;
    const ring = this.rings[this.ringI = (this.ringI + 1) % this.rings.length];
    ring.t = 0; ring.r.material.color.set(color); ring.r.position.set(k.x, k.top.y + 0.25, k.top.z);
  }
  guide(ms) {
    this.beams.forEach((b, i) => {
      b.key = ms && ms[i] != null ? this.keys.get(ms[i]) || null : null;
      if (!b.key) return;
      const k = b.key, L = k.black ? LB : LW, H = k.black ? HB : HW;
      k.mesh.add(b.pool);
      b.pool.position.set(0, H / 2 + 0.012, k.black ? 0.2 : 0.35);
      b.pool.scale.set(k.black ? 0.62 : 1.0, L * 0.92, 1);
    });
  }

  // ------------------------------------------------------------------ light particles
  initSparks() {
    const N = this.SN = 2400;
    const geo = new THREE.BufferGeometry();
    this.sp = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), col: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), size: new Float32Array(N), a: new Float32Array(N), i: 0 };
    geo.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.sp.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sp.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.sp.a, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = this.pointMat(1.0);
    this.sparks = new THREE.Points(geo, mat); this.sparks.frustumCulled = false; this.scene.add(this.sparks);
  }
  pointMat(boost) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: this.dot }, scale: { value: 1 }, boost: { value: boost } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/(-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float boost; varying vec3 vC; varying float vA;
        void main(){ float d=texture2D(map,gl_PointCoord).r; if(vA*d<0.003) discard; gl_FragColor=vec4(vC*boost*d*vA, 1.); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
    });
  }
  spark(k, vel, count) {
    const s = this.sp, n = count ?? Math.round(10 + vel * 26);
    for (let j = 0; j < n; j++) {
      const i = s.i = (s.i + 1) % this.SN, o = i * 3;
      s.pos[o] = k.x + (Math.random() - 0.5) * (k.black ? 0.4 : 0.7);
      s.pos[o + 1] = k.top.y + 0.1 + Math.random() * 0.2;
      s.pos[o + 2] = k.top.z + (Math.random() - 0.5) * 1.6;
      s.vel[o] = (Math.random() - 0.5) * 0.5; s.vel[o + 1] = 1.2 + Math.random() * 2.6 * (0.5 + vel); s.vel[o + 2] = -0.6 - Math.random() * 1.4;
      const c = k.col.clone().lerp(new THREE.Color(1, 0.95, 0.85), Math.random() * 0.35);
      s.col[o] = c.r; s.col[o + 1] = c.g; s.col[o + 2] = c.b;
      s.max[i] = s.life[i] = 1.8 + Math.random() * 2.6;
      s.size[i] = (0.5 + Math.random() * 1.6) * (j % 7 === 0 ? 2.4 : 1);
    }
  }
  initDust() {
    const N = 420, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), a = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 14 - 1; pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 6;
      const w = 0.8 + Math.random() * 0.2; col.set([w, w * 0.85, w * 0.68], i * 3); size[i] = 0.4 + Math.random() * 1.4; a[i] = 0.08 + Math.random() * 0.22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1)); geo.setAttribute('alpha', new THREE.BufferAttribute(a, 1));
    this.dust = new THREE.Points(geo, this.pointMat(0.9)); this.dust.frustumCulled = false; this.scene.add(this.dust);
  }

  // ------------------------------------------------------------------ camera
  // 'intro': a slow low orbit, the keys seen from the side · 'play': the player's seat, fitted to the width
  setView(v) { this.mode = v; }
  fit() {
    const a = this.cam.aspect, vf = THREE.MathUtils.degToRad(this.cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * a);
    const w = (this.width || 17) + 1.6;
    const portrait = a < 1;
    // far enough for the width, and for the depth too on short landscape screens (caption above, toolbar below)
    const d = Math.max((w / 2) / Math.tan(hf / 2) * (portrait ? 1.0 : 1.12), portrait ? 0 : 4.1 / Math.tan(vf / 2) / 0.64);
    const el = THREE.MathUtils.degToRad(portrait ? 76 : 50);
    return { pos: new THREE.Vector3(0, Math.sin(el) * d + 0.4, Math.cos(el) * d + 0.8), look: new THREE.Vector3(0, portrait ? -0.2 : 1.1, portrait ? 0.4 : 0.6) };
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.sparks.material.uniforms.scale.value = h * pr * 0.05; this.dust.material.uniforms.scale.value = h * pr * 0.05;
  }

  frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000), t = (now - this.t0) / 1000; this.last = now;
    // camera
    const f = this.fit();
    let pos = f.pos, look = f.look;
    if (this.mode === 'intro') {
      const r = f.pos.length() * 0.78, ang = Math.sin(t * 0.05) * 0.5 - 0.35;
      pos = new THREE.Vector3(Math.sin(ang) * r, 3.4 + Math.sin(t * 0.13) * 0.4, Math.cos(ang) * r);
      look = new THREE.Vector3(0, 0.3, -0.5);
    }
    this.par.lerp(this.parT, 0.04);
    pos = pos.clone().add(new THREE.Vector3(this.par.x * 0.8, -this.par.y * 0.4, 0));
    if (!this.view.cur) this.view.cur = { pos: pos.clone(), look: look.clone() };
    const k = this.mode === 'intro' ? 0.02 : 0.045;
    this.view.cur.pos.lerp(pos, k); this.view.cur.look.lerp(look, k);
    this.cam.position.copy(this.view.cur.pos); this.cam.lookAt(this.view.cur.look);

    // keys
    for (const key of this.keys.values()) {
      // a key is a lever on felt: it drops fast, then springs back with a tiny bounce
      const kk = key.at ? 2600 : 900, damp = key.at ? 90 : 34;
      for (let n = Math.ceil(dt / 0.004), h = dt / n; n > 0; n--) { key.v += ((key.at - key.a) * kk - key.v * damp) * h; key.a = Math.min(1.05, Math.max(-0.12, key.a + key.v * h)); } // small steps: stable at any frame rate
      key.g.rotation.x = key.a * (key.black ? 0.078 : 0.07);
      // a key the lesson is waiting for turns to warm gold, breathing; a pressed key darkens a little as it drops
      const tint = key.tgt && !key.black ? key.tgt * (0.62 + 0.18 * Math.sin(t * 3.2 + key.x * 0.3)) : 0;
      key.mat.color.copy(key.base).multiplyScalar(1 - 0.13 * Math.max(0, key.a)).lerp(GOLD, tint);
      key.glow += (key.glowT - key.glow) * Math.min(1, dt * (key.glowT > key.glow ? 30 : 2.2));
      const breath = key.tgt ? key.tgt * (0.35 + 0.25 * Math.sin(t * 3.2 + key.x * 0.3)) : 0;
      const e = key.mat.emissive;
      const hm = key.halo.material;
      if (breath > key.glow * 0.6) { e.setRGB(1, 0.55, 0.15).multiplyScalar(breath * (key.black ? 1.6 : 0.3)); hm.color.setRGB(1, 0.62, 0.25); hm.opacity = breath * 0.9; }
      else { e.copy(key.col).multiplyScalar(key.glow * (key.black ? 1.5 : 0.6)); hm.color.copy(key.col); hm.opacity = Math.min(1, key.glow * 0.75); }
    }
    this.flash.intensity *= Math.pow(0.02, dt);

    // sparks
    const s = this.sp;
    for (let i = 0; i < this.SN; i++) {
      if (s.life[i] <= 0) { if (s.a[i]) s.a[i] = 0; continue; }
      s.life[i] -= dt; const o = i * 3, u = 1 - s.life[i] / s.max[i];
      s.vel[o + 1] *= 1 - dt * 0.35; s.vel[o] += Math.sin(t * 1.7 + i) * dt * 0.3;
      s.pos[o] += s.vel[o] * dt; s.pos[o + 1] += s.vel[o + 1] * dt; s.pos[o + 2] += s.vel[o + 2] * dt;
      s.a[i] = Math.min(1, u * 8) * Math.pow(1 - u, 1.6) * 0.9;
    }
    const ga = this.sparks.geometry.attributes;
    ga.position.needsUpdate = ga.alpha.needsUpdate = ga.color.needsUpdate = ga.size.needsUpdate = true;
    for (const b of this.beams) {
      b.o += ((b.key ? 1 : 0) - b.o) * Math.min(1, dt * 5);
      const k = b.key || b.last; if (b.key) b.last = b.key;
      if (!k) continue;
      const pulse = 0.75 + 0.25 * Math.sin(t * 3.4);
      b.beam.position.set(k.x, k.top.y + 3.05, k.top.z - (k.black ? 0 : 0.3));
      b.beam.scale.set(k.black ? 1.6 : 2.2, 1, 1);
      b.beam.rotation.y = Math.atan2(this.cam.position.x - k.x, this.cam.position.z - k.top.z);
      b.beam.material.opacity = b.o * pulse;
      b.orb.position.set(k.x, k.top.y + 1.5 + Math.sin(t * 2.6) * 0.18, k.top.z);
      b.orb.scale.setScalar(1.3 + 0.3 * pulse); b.orb.material.opacity = b.o * pulse;
      b.pool.material.opacity = b.o * (0.55 + 0.35 * pulse);
    }
    for (const ring of this.rings) {
      if (ring.t >= 1) { ring.r.material.opacity = 0; continue; }
      ring.t = Math.min(1, ring.t + dt / 0.7);
      ring.r.scale.setScalar(0.6 + ring.t * 2.6); ring.r.material.opacity = Math.pow(1 - ring.t, 1.5);
    }
    this.dust.rotation.y = t * 0.006; this.dust.position.y = Math.sin(t * 0.1) * 0.3;
    for (const key of this.keys.values()) if (key.badge) key.badge.position.y = key.top.y + 1.25 + Math.sin(t * 2.4 + key.x) * 0.07;

    this.renderer.render(this.scene, this.cam);
  }
}
