// La Grande Chasse: the room seen through the camera, the Pokémon GO way. The camera picture fills the screen; a
// transparent 3D layer on top turns with the phone (gyroscope), so Pixo and the ship's parts stay at their place in
// the room around the players. Pixo is a filmed character: short clips whose top half is the picture and bottom half
// its transparency, shown on a card that always faces the player, with a soft shadow on the floor and the room's
// light on him. Magic is drawn with additive glow sprites. Without a camera: a photographed living room, turned by
// dragging or with the arrow keys.
import * as THREE from 'three';

const FLOOR = 1.05; // metres from the eye to the floor
const CLIPS = ['idle', 'hello', 'happy', 'talk', 'sad', 'amazed'];

// soft round glow and a four-point twinkle, drawn once
function glowTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const k = c.getContext('2d');
  const g = k.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (kind === 'twinkle') {
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.8)'); g.addColorStop(0.35, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = g; k.fillRect(0, 0, 128, 128); k.globalCompositeOperation = 'lighter';
    for (const [w, h] of [[128, 6], [6, 128]]) { const l = k.createLinearGradient(64 - w / 2, 64 - h / 2, 64 + w / 2, 64 + h / 2); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,0.9)'); l.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = l; k.fillRect(64 - w / 2, 64 - h / 2, w, h); }
  } else {
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = g; k.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

// the filmed actor's look: top half of the clip is the picture, bottom half its transparency
export function pixoMaterial(tex) {
  const uni = { map: { value: tex }, tint: { value: new THREE.Color(1, 1, 1) }, fade: { value: 1 }, glow: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform float fade; uniform float glow; varying vec2 vUv;
      void main(){ vec3 c = texture2D(map, vec2(vUv.x, 0.5 + vUv.y * 0.5)).rgb; float a = texture2D(map, vec2(vUv.x, vUv.y * 0.5)).r;
        a = smoothstep(0.08, 0.92, a) * fade; if (a < 0.01) discard; c = c * tint + glow * vec3(0.55, 1.0, 0.9); gl_FragColor = vec4(c, a); }` });
  mat.toneMapped = false; return { mat, uni };
}

// ------------------------------------------------------------------ Pixo, the filmed actor
// g stands on the floor and turns to face the player; inside it, the shadow stays on the floor while the body can
// breathe, lean, jump and squash (alive even between his clips)
function makePixo(base) {
  const vids = {}, texs = {};
  for (const n of CLIPS) {
    const v = document.createElement('video'); v.src = `${base}pixo/${n}.mp4`; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.loop = n === 'idle';
    v.setAttribute('playsinline', ''); vids[n] = v;
    const t = new THREE.VideoTexture(v); t.encoding = THREE.sRGBEncoding; texs[n] = t;
  }
  const { mat, uni } = pixoMaterial(texs.idle);
  const H = 0.62, W = H * 480 / 854; // the clip frame; Pixo himself is about 0.42 m tall in it
  const card = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); card.position.y = H / 2 - H * 145 / 854 + 0.004; // his feet are 145 px above the bottom of the 854 px frame
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const k = sc.getContext('2d'), gr = k.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = gr; k.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002;
  const body = new THREE.Group(); body.add(card); body.rotation.order = 'YXZ';
  const g = new THREE.Group(); g.add(shadow, body);
  let cur = 'idle', token = 0;
  vids.idle.play().catch(() => {});
  const api = {
    g, body, card, uni, vids, texs, shadow, hop: 0, squash: 0, lean: 0,
    // play a clip once (or 'idle' forever); resolves when it ends. Every clip starts and ends on the same pose.
    play(name) {
      const v = vids[name]; if (!v) return Promise.resolve(); const my = ++token;
      if (cur !== name) vids[cur].pause();
      cur = name; uni.map.value = texs[name]; v.currentTime = 0; v.play().catch(() => {});
      if (name === 'idle') return Promise.resolve();
      return new Promise((res) => { v.onended = () => { if (my !== token) return; res(); api.play('idle'); }; });
    },
    unlock() { for (const v of Object.values(vids)) v.play().then(() => { if (v !== vids[cur]) v.pause(); }).catch(() => {}); },
    get clip() { return cur; },
  };
  return api;
}

// ------------------------------------------------------------------ the room
export class Room {
  constructor(el, base = './') {
    this.el = el; this.base = base;
    this.video = el.querySelector('video.cam'); this.canvas = el.querySelector('canvas.gl');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputEncoding = THREE.sRGBEncoding;
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(62, 1, 0.05, 50);
    this.pixo = makePixo(base); this.scene.add(this.pixo.g); this.pixo.g.visible = false;
    this.fx = []; this.sprites = new Map(); this.tex = {}; this.glow = glowTex('glow'); this.twinkle = glowTex('twinkle');
    this.yaw = 0; this.pitch = -0.25; this.pitchMin = -1.3; this.pitchMax = 0.6; this.useGyro = false; this.gq = null; this.yawOffset = null;
    this.light = new THREE.Color(1, 1, 1); this.sample = document.createElement('canvas'); this.sample.width = this.sample.height = 16; this.sk = this.sample.getContext('2d', { willReadFrequently: true });
    this.feed = null; this.drawnRoom = null; this.last = 0; this.spin = 0; this._fwd = new THREE.Vector3(0, 0, -1);
    this.input(); addEventListener('resize', () => this.resize()); this.resize();
    const loop = (t) => { this.frame(t / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w < h ? 62 : 46; this.cam.updateProjectionMatrix(); }
  // ------------------------------------------------------------ camera and gyroscope
  async startCamera() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      this.video.srcObject = st; await this.video.play(); this.el.classList.add('live'); this.stream = st; this.feed = this.video; return true;
    } catch { this.el.classList.remove('live'); return false; }
  }
  stopCamera() { for (const t of this.stream?.getTracks() || []) t.stop(); this.stream = null; this.video.srcObject = null; if (this.feed === this.video) this.feed = null; this.el.classList.remove('live'); }
  setFeed(v) { this.feed = v; } // another video showing the camera (the card scanner's), used for the room's light
  async startGyro() {
    try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false; } } catch { return false; }
    const zee = new THREE.Vector3(0, 0, 1), euler = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    return new Promise((res) => {
      let got = false;
      addEventListener('deviceorientation', (e) => {
        if (e.alpha == null) return; got = true; this.useGyro = true;
        const d = THREE.MathUtils.degToRad, orient = d(screen.orientation?.angle ?? window.orientation ?? 0);
        euler.set(d(e.beta), d(e.alpha), -d(e.gamma), 'YXZ'); const q = new THREE.Quaternion().setFromEuler(euler); q.multiply(q1); q.multiply(q0.setFromAxisAngle(zee, -orient));
        if (this.yawOffset == null) { const eu = new THREE.Euler().setFromQuaternion(q, 'YXZ'); this.yawOffset = -eu.y; }
        this.gq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawOffset).multiply(q);
      });
      setTimeout(() => res(got), 1200);
    });
  }
  // without a gyroscope: drag (finger or mouse) and the arrow keys turn the view
  input() {
    let p = null;
    this.canvas.addEventListener('pointerdown', (e) => { p = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: 0 }; });
    addEventListener('pointermove', (e) => { if (!p || this.useGyro) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.moved = Math.max(p.moved, Math.hypot(dx, dy)); this.yaw = p.yaw + dx * 0.006; this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, p.pitch + dy * 0.004)); });
    addEventListener('pointerup', (e) => { if (p && p.moved < 8) this.tap(e); p = null; });
    addEventListener('keydown', (e) => { if (this.useGyro || e.target?.tagName === 'INPUT') return; const k = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key]; if (k) { e.preventDefault(); this.yaw += k[0]; this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch + k[1])); } });
  }
  tap(e) {
    const r = this.canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam);
    if (this.onTap && this.onTap(ray)) return; // a mini-game took the tap
    if (this.onPixo && this.pixo.g.visible && ray.intersectObject(this.pixo.card).length) this.onPixo();
  }
  img(path) { if (!this.tex[path]) { const t = new THREE.TextureLoader().load(this.base + path); t.encoding = THREE.sRGBEncoding; this.tex[path] = t; } return this.tex[path]; }
  // a photographed living room when there is no camera: a half-panorama and its mirror wrapped all around
  drawRoom() {
    if (this.drawnRoom) return; const g = new THREE.Group(), R = 4, H = Math.PI * R / (3168 / 1344);
    const t = new THREE.TextureLoader().load(`${this.base}img/pano.jpg`); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(-2, 1); t.offset.set(1, 0); t.anisotropy = 4;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })); wall.rotation.y = Math.PI / 2; wall.material.toneMapped = false; g.add(wall);
    // the floor under the panorama: the carpet's own colour (measured at the bottom of the photo), a little darker in the middle
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const fk = fc.getContext('2d'), fg = fk.createRadialGradient(128, 128, 0, 128, 128, 128);
    fg.addColorStop(0, '#8a6c55'); fg.addColorStop(0.55, '#a07f64'); fg.addColorStop(1, '#ab886b'); fk.fillStyle = fg; fk.fillRect(0, 0, 256, 256);
    const ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
    const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshBasicMaterial({ map: ft })); cap.material.toneMapped = false; cap.rotation.x = -Math.PI / 2; cap.position.y = -H / 2; g.add(cap);
    const top = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshBasicMaterial({ color: 0xe9dccb })); top.rotation.x = Math.PI / 2; top.position.y = H / 2; g.add(top);
    this.scene.add(g); this.drawnRoom = g; this.pitchMin = -0.62; this.pitchMax = 0.3; this.light.setRGB(1.0, 0.95, 0.86);
  }
  // ------------------------------------------------------------ where things are
  forward() { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.cam.quaternion); }
  // the floor point the phone is looking at (where the card lies), at a sensible distance
  floorAhead(min = 0.7, max = 1.8) {
    const f = this.forward(); const flat = new THREE.Vector3(f.x, 0, f.z).normalize(); let d = 1.3;
    if (f.y < -0.05) d = FLOOR / -f.y * Math.hypot(f.x, f.z); d = Math.max(min, Math.min(max, d));
    return new THREE.Vector3(flat.x * d, -FLOOR, flat.z * d);
  }
  placePixo(pos) { this.pixo.g.position.copy(pos); this.pixo.g.visible = true; }
  // the angle between where the phone looks and where Pixo is (radians, signed), and whether he is on screen
  pixoBearing() {
    const p = this.pixo.g.position, f = this.forward();
    const a = Math.atan2(p.x, -p.z), b = Math.atan2(f.x, -f.z); let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const v = p.clone().add(new THREE.Vector3(0, 0.25, 0)).project(this.cam); const on = v.z < 1 && Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.9;
    return { d, on, sx: v.x, sy: v.y };
  }
  lookYaw() { const f = this.forward(); return Math.atan2(f.x, -f.z); }
  // ------------------------------------------------------------ pictures in the room (ship parts, the ship)
  texture(name) { if (!this.tex[name]) { const t = new THREE.TextureLoader().load(`${this.base}parts/${name}.png`); t.encoding = THREE.sRGBEncoding; this.tex[name] = t; } return this.tex[name]; }
  addSprite(id, name, pos, h, halo = true) {
    const t = this.texture(name); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.material.toneMapped = false;
    const set = () => { const im = t.image; if (im?.width) s.scale.set(h * im.width / im.height, h, 1); }; set(); if (!t.image?.width) t.onUpdate = set; setTimeout(set, 500);
    s.position.copy(pos); s.userData = { h, base: pos.clone(), t0: performance.now() / 1000 }; s.renderOrder = 2; this.scene.add(s); this.sprites.set(id, s);
    if (halo) { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffd98a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); g.scale.set(h * 2.2, h * 2.2, 1); g.renderOrder = 1; s.userData.halo = g; this.scene.add(g); }
    return s;
  }
  removeSprite(id) { const s = this.sprites.get(id); if (s) { this.scene.remove(s); if (s.userData.halo) this.scene.remove(s.userData.halo); this.sprites.delete(id); } }
  // glowing sparks: soft additive sprites that fly, fall and twinkle out
  sparks(pos, n = 30, color = 0xffd46a, speed = 1.2, size = 0.05) {
    const cols = Array.isArray(color) ? color : [color];
    for (let i = 0; i < n; i++) {
      const tw = Math.random() < 0.35, m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tw ? this.twinkle : this.glow, color: cols[i % cols.length], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const s = size * (0.5 + Math.random()) * (tw ? 1.8 : 1); m.scale.set(s, s, 1); m.position.copy(pos); m.renderOrder = 3; this.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.9 + 0.1, (Math.random() - 0.5) * speed), life: 0.8 + Math.random() * 0.9, max: 1.7, s, g: 1.2 });
    }
  }
  flame(pos) {
    for (let i = 0; i < 3; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: Math.random() < 0.5 ? 0xff9a3c : 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const s = 0.12 + Math.random() * 0.12; m.scale.set(s, s, 1); m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)); this.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.3, -1.3, (Math.random() - 0.5) * 0.3), life: 0.6, max: 0.6, s, grow: 1.035, g: 0 }); }
  }
  // a magic circle opening on the floor with a column of light, then closing
  portal(pos, ms = 1600) {
    const g = new THREE.Group(); g.position.copy(pos); g.position.y += 0.004; this.scene.add(g);
    const uni = { t: { value: 0 }, k: { value: 0 } };
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 64), new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float t; uniform float k; varying vec2 vUv;
        void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          float ring = smoothstep(0.08, 0.0, abs(r - 0.86)) + 0.6 * smoothstep(0.05, 0.0, abs(r - 0.66));
          float sw = 0.5 + 0.5 * sin(a * 6.0 + r * 14.0 - t * 7.0); float core = (1.0 - smoothstep(0.0, 0.9, r)) * (0.35 + 0.45 * sw);
          float runes = step(0.5, fract(a * 3.8197 + t * 0.4)) * smoothstep(0.03, 0.0, abs(r - 0.76));
          vec3 col = mix(vec3(0.3, 0.95, 0.85), vec3(1.0, 0.85, 0.4), r) * (ring + core + runes * 0.8);
          gl_FragColor = vec4(col * k, (ring + core + runes) * k * (1.0 - smoothstep(0.95, 1.0, r))); }` }));
    disc.rotation.x = -Math.PI / 2; g.add(disc);
    const bc = document.createElement('canvas'); bc.width = 4; bc.height = 128; const bk = bc.getContext('2d'), bg = bk.createLinearGradient(0, 128, 0, 0); bg.addColorStop(0, 'rgba(160,255,230,0.9)'); bg.addColorStop(0.4, 'rgba(160,255,230,0.25)'); bg.addColorStop(1, 'rgba(160,255,230,0)'); bk.fillStyle = bg; bk.fillRect(0, 0, 4, 128);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.6, 48, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 0.8; g.add(beam);
    const t0 = performance.now();
    return new Promise((res) => { const step = () => { const u = (performance.now() - t0) / ms; uni.t.value = u * ms / 1000;
      const k = u < 0.25 ? u / 0.25 : u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1; uni.k.value = k; disc.scale.setScalar(0.3 + 0.7 * Math.min(1, u * 3)); beam.material.opacity = k * 0.9; beam.scale.set(1, Math.min(1, u * 4), 1);
      if (Math.random() < 0.5 * k) this.sparks(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.05, (Math.random() - 0.5) * 0.5)), 1, [0x9ff3e0, 0xffe08a], 0.3, 0.04);
      if (u < 1) requestAnimationFrame(step); else { this.scene.remove(g); res(); } }; step(); });
  }
  // Pixo vanishes in a puff of sparkles and appears somewhere else
  async teleport(to, ms = 450) {
    const P = this.pixo, from = P.g.position.clone().add(new THREE.Vector3(0, 0.22, 0));
    this.sparks(from, 36, [0x9ff3e0, 0xff9ad0, 0xffe08a], 1.4, 0.06);
    await this.fade(1, 0, ms, true);
    P.g.position.copy(to); this.sparks(to.clone().add(new THREE.Vector3(0, 0.22, 0)), 30, [0x9ff3e0, 0xffe08a], 1.1, 0.06);
    await this.fade(0, 1, ms, true);
  }
  // a hop: from where he is to `to`, an arc `h` metres high; squash and a puff of dust when he lands
  hop(to, h = 0.35, ms = 650) {
    const X = this.pixo, from = X.g.position.clone(), t0 = performance.now();
    return new Promise((res) => { const s = () => { const u = Math.min(1, (performance.now() - t0) / ms); X.g.position.lerpVectors(from, to, u); X.hop = Math.sin(u * Math.PI) * h;
      if (u < 1) return requestAnimationFrame(s); X.hop = 0; this.land(); res(); }; s(); });
  }
  // he falls from `h` metres onto `at` (the end of his jump out of the card)
  drop(at, h = 0.9, ms = 520) {
    const X = this.pixo, t0 = performance.now(); this.placePixo(at); X.hop = h;
    return new Promise((res) => { const s = () => { const u = Math.min(1, (performance.now() - t0) / ms); X.hop = h * (1 - u * u);
      if (u < 1) return requestAnimationFrame(s); X.hop = 0; this.land(); res(); }; s(); });
  }
  land() { this.pixo.squash = 0.22; const p = this.pixo.g.position.clone().add(new THREE.Vector3(0, 0.02, 0)); this.sparks(p, 16, [0xe9e1d2, 0xfff4dd], 0.55, 0.05); }
  fade(a, b, ms, glow = false) {
    const t0 = performance.now(), U = this.pixo.uni;
    return new Promise((res) => { const s = () => { const u = Math.min(1, (performance.now() - t0) / ms); U.fade.value = a + (b - a) * u; U.glow.value = glow ? Math.sin(u * Math.PI) * 0.8 : 0; u < 1 ? requestAnimationFrame(s) : res(); }; s(); });
  }
  // ------------------------------------------------------------ every frame
  frame(t) {
    const dt = Math.min(0.05, t - (this.last || t)); this.last = t;
    if (this.useGyro && this.gq) this.cam.quaternion.slerp(this.gq, 0.5);
    else this.cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const P = this.pixo.g; P.rotation.y = Math.atan2(-P.position.x, -P.position.z);
    // how fast the phone turns (radians a second, smoothed), signed left/right
    const f = this.forward(), yawNow = Math.atan2(f.x, -f.z), yawWas = Math.atan2(this._fwd.x, -this._fwd.z); let dy = yawNow - yawWas; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI;
    this._fwd.copy(f); if (dt > 0) this.spin += ((dy / dt) - this.spin) * Math.min(1, dt * 6);
    // Pixo alive: he breathes, leans against the turn (as if the room moved), jumps and squashes; the shadow stays down
    const X = this.pixo, B = X.body, br = Math.sin(t * 2.3) * 0.012;
    X.lean += (Math.max(-0.22, Math.min(0.22, -this.spin * 0.05)) - X.lean) * Math.min(1, dt * 5);
    B.position.y = X.hop; B.rotation.z = X.lean; X.squash *= Math.pow(0.02, dt);
    B.scale.set(1 - br * 0.5 + X.squash * 0.5, 1 + br - X.squash, 1);
    const air = Math.min(1, X.hop / 0.5); X.shadow.scale.setScalar(1 - air * 0.45); X.shadow.material.opacity = (1 - air * 0.6) * X.uni.fade.value;
    // the room's light, from the camera picture, three times a second
    const fv = this.feed;
    if (fv && fv.readyState >= 2 && Math.floor(t * 3) !== this._ls) { this._ls = Math.floor(t * 3); try { this.sk.drawImage(fv, 0, 0, 16, 16); const d = this.sk.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; const L = (r + g + b) / (3 * n * 255);
      const k = Math.max(0.55, Math.min(1.1, 0.45 + L * 1.2)), f = (c) => k * (0.85 + 0.15 * c / n / 255 / Math.max(0.01, L)); this.light.setRGB(f(r), f(g), f(b)); } catch {} }
    this.pixo.uni.tint.value.lerp(this.light, 0.1);
    for (const s of this.sprites.values()) { const u = s.userData; if (u.float !== false) s.position.y = u.base.y + Math.sin(t * 2 + u.base.x) * 0.03; if (u.halo) { u.halo.position.copy(s.position); u.halo.material.opacity = (0.4 + 0.15 * Math.sin(t * 3)) * s.material.opacity; } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; f.v.y -= f.g * dt; f.m.position.addScaledVector(f.v, dt); f.v.multiplyScalar(1 - 1.2 * dt);
      const k = Math.max(0, f.life / f.max); f.m.material.opacity = Math.min(1, k * 2.2); const sc = f.grow ? f.m.scale.x * f.grow : f.s * (0.4 + 0.6 * k); f.m.scale.set(sc, sc, 1);
      if (f.life <= 0) { this.scene.remove(f.m); f.m.material.dispose(); this.fx.splice(i, 1); } }
    this.onFrame?.(t);
    this.renderer.render(this.scene, this.cam);
  }
}
export { FLOOR };
