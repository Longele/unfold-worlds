// La Grande Chasse: the room seen through the camera, the Pokémon GO way. The back camera fills the screen; a
// transparent 3D layer on top turns with the phone (gyroscope), so Pixo and the ship's parts stay at their place
// in the room around the players. Pixo is a filmed character: short clips whose top half is the picture and bottom
// half its transparency (works on every phone), shown on a card that always faces the player, with a soft shadow
// on the floor and the room's light on him. Without a camera or a gyroscope: a drawn room, turned by dragging.
import * as THREE from 'three';

const FLOOR = 1.05; // metres from the eye to the floor
const CLIPS = ['idle', 'hello', 'happy', 'talk', 'sad', 'amazed'];

// ------------------------------------------------------------------ Pixo, the filmed actor
function makePixo(base) {
  const vids = {}, texs = {};
  for (const n of CLIPS) {
    const v = document.createElement('video'); v.src = `${base}pixo/${n}.mp4`; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.loop = n === 'idle';
    v.setAttribute('playsinline', ''); vids[n] = v;
    const t = new THREE.VideoTexture(v); t.encoding = THREE.sRGBEncoding; texs[n] = t;
  }
  const uni = { map: { value: texs.idle }, tint: { value: new THREE.Color(1, 1, 1) }, fade: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform float fade; varying vec2 vUv;
      void main(){ vec3 c = texture2D(map, vec2(vUv.x, 0.5 + vUv.y * 0.5)).rgb; float a = texture2D(map, vec2(vUv.x, vUv.y * 0.5)).r;
        a = smoothstep(0.08, 0.92, a) * fade; if (a < 0.01) discard; gl_FragColor = vec4(c * tint, a); }` });
  mat.toneMapped = false;
  const H = 0.62, W = H * 480 / 854; // the clip frame; Pixo himself is about 0.45 m tall in it
  const card = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); card.position.y = H / 2 - H * 145 / 854 + 0.004; // his feet are 145 px above the bottom of the 854 px frame
  // a soft shadow under his feet
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const k = sc.getContext('2d'), gr = k.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = gr; k.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002;
  const g = new THREE.Group(); g.add(shadow, card);
  let cur = 'idle', done = null, token = 0;
  vids.idle.play().catch(() => {});
  const api = {
    g, card, uni, vids,
    // play a clip once (or 'idle' forever); resolves when it ends. Every clip starts and ends on the same pose.
    play(name) {
      const v = vids[name]; if (!v) return Promise.resolve(); const my = ++token;
      if (cur !== name) { vids[cur].pause(); }
      cur = name; uni.map.value = texs[name]; v.currentTime = 0; v.play().catch(() => {});
      if (name === 'idle') return Promise.resolve();
      return new Promise((res) => { done = res; v.onended = () => { if (my !== token) return; done = null; res(); api.play('idle'); }; });
    },
    unlock() { for (const v of Object.values(vids)) { v.play().then(() => { if (v !== vids[cur]) v.pause(); }).catch(() => {}); } },
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
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(62, 1, 0.05, 50); this.cam.position.set(0, 0, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    this.pixo = makePixo(base); this.scene.add(this.pixo.g); this.pixo.g.visible = false;
    this.fx = []; this.sprites = new Map(); this.tex = {};
    this.yaw = 0; this.pitch = -0.25; this.useGyro = false; this.gq = null; this.yawOffset = null;
    this.light = new THREE.Color(1, 1, 1); this.sample = document.createElement('canvas'); this.sample.width = this.sample.height = 16; this.sk = this.sample.getContext('2d', { willReadFrequently: true });
    this.drawnRoom = null;
    this.input(); addEventListener('resize', () => this.resize()); this.resize();
    const loop = (t) => { this.frame(t / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w < h ? 62 : 46; this.cam.updateProjectionMatrix(); }
  // ------------------------------------------------------------ camera and gyroscope
  async startCamera() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      this.video.srcObject = st; await this.video.play(); this.el.classList.add('live'); this.stream = st; return true;
    } catch { this.el.classList.remove('live'); this.drawRoom(); return false; }
  }
  stopCamera() { for (const t of this.stream?.getTracks() || []) t.stop(); this.stream = null; this.video.srcObject = null; }
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
    addEventListener('pointermove', (e) => { if (!p || this.useGyro) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.moved = Math.max(p.moved, Math.hypot(dx, dy)); this.yaw = p.yaw + dx * 0.006; this.pitch = Math.max(-1.3, Math.min(0.6, p.pitch + dy * 0.004)); });
    addEventListener('pointerup', (e) => { if (p && p.moved < 8) this.tap(e); p = null; });
    addEventListener('keydown', (e) => { if (this.useGyro) return; const k = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key]; if (k) { this.yaw += k[0]; this.pitch = Math.max(-1.3, Math.min(0.6, this.pitch + k[1])); } });
  }
  // touching Pixo
  tap(e) {
    if (!this.onPixo || !this.pixo.g.visible) return;
    const r = this.canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam); if (ray.intersectObject(this.pixo.card).length) this.onPixo();
  }
  // a room drawn in the browser when there is no camera: wall, floor, a window
  drawRoom() {
    if (this.drawnRoom) return; const g = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ color: 0x9b7a5a })); floor.rotation.x = -Math.PI / 2; floor.position.y = -FLOOR; g.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ color: 0xc84f5a })); rug.rotation.x = -Math.PI / 2; rug.position.y = -FLOOR + 0.003; g.add(rug);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xf1e3c8, side: THREE.BackSide })); wall.position.y = -FLOOR + 3; g.add(wall);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6, w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: 0x9fd2ff })); w.position.set(Math.sin(a) * 3.95, 0.6, -Math.cos(a) * 3.95); w.lookAt(0, 0.6, 0); g.add(w); }
    this.scene.add(g); this.drawnRoom = g;
  }
  // ------------------------------------------------------------ where things are
  forward() { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cam.quaternion); return f; }
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
  // Pixo moves to another place with a hop
  hopTo(to, ms = 900) {
    const from = this.pixo.g.position.clone(), t0 = performance.now();
    return new Promise((res) => { const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); this.pixo.g.position.lerpVectors(from, to, k); this.pixo.g.position.y = -FLOOR + Math.sin(k * Math.PI) * 0.5; if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
  }
  // ------------------------------------------------------------ pictures in the room (ship parts, the ship)
  texture(name) { if (!this.tex[name]) { const t = new THREE.TextureLoader().load(`${this.base}parts/${name}.png`); t.encoding = THREE.sRGBEncoding; this.tex[name] = t; } return this.tex[name]; }
  addSprite(id, name, pos, h) {
    const t = this.texture(name); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.material.toneMapped = false;
    const set = () => { const im = t.image; if (im?.width) s.scale.set(h * im.width / im.height, h, 1); }; set(); if (!t.image?.width) t.onUpdate = set; setTimeout(set, 500);
    s.position.copy(pos); s.userData = { h, base: pos.clone(), t0: performance.now() / 1000 }; this.scene.add(s); this.sprites.set(id, s); return s;
  }
  removeSprite(id) { const s = this.sprites.get(id); if (s) { this.scene.remove(s); this.sprites.delete(id); } }
  sparks(pos, n = 30, color = 0xffd46a, speed = 1.2) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.012 + Math.random() * 0.014), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(pos); this.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed), life: 1 + Math.random() * 0.6 });
    }
  }
  flame(pos) { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 6), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xffa53c : 0xffe08a, transparent: true })); m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)); this.scene.add(m); this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.3, -1.2, (Math.random() - 0.5) * 0.3), life: 0.6, grow: 1 }); } }
  // ------------------------------------------------------------ every frame
  frame(t) {
    if (this.useGyro && this.gq) this.cam.quaternion.slerp(this.gq, 0.5);
    else this.cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    // Pixo faces the player and takes the room's light (from the camera picture)
    const P = this.pixo.g; P.rotation.y = Math.atan2(-P.position.x, -P.position.z);
    if (this.stream && Math.floor(t * 3) !== this._ls) { this._ls = Math.floor(t * 3); try { this.sk.drawImage(this.video, 0, 0, 16, 16); const d = this.sk.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; const L = (r + g + b) / (3 * n * 255);
      const k = Math.max(0.55, Math.min(1.1, 0.45 + L * 1.2)); this.light.setRGB(k * (0.85 + 0.15 * r / n / 255 / Math.max(0.01, L)), k * (0.85 + 0.15 * g / n / 255 / Math.max(0.01, L)), k * (0.85 + 0.15 * b / n / 255 / Math.max(0.01, L))); } catch {} }
    this.pixo.uni.tint.value.lerp(this.light, 0.1);
    for (const s of this.sprites.values()) { const u = s.userData; if (u.float !== false) s.position.y = u.base.y + Math.sin(t * 2 + u.base.x) * 0.03; }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; const dt = 1 / 60; f.life -= dt; f.v.y -= (f.grow ? 0 : 2.2) * dt; f.m.position.addScaledVector(f.v, dt); if (f.grow) f.m.scale.multiplyScalar(1.03); f.m.material.opacity = Math.max(0, f.life); if (f.life <= 0) { this.scene.remove(f.m); this.fx.splice(i, 1); } }
    this.onFrame?.(t);
    this.renderer.render(this.scene, this.cam);
  }
}
export { FLOOR };
