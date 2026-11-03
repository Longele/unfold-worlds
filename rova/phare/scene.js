// The night of the cyclone: a stormy sea, rain lit by the beam, lightning, the lighthouse on its rock and a ship
// far away. Shaders written by hand (sea, sky, rain, beam), everything else from simple shapes.
import * as THREE from '../lib/three/three.module.js';

// the same swell in JS (to float the ship) and in the sea shader
const WAVES = [[0.07, 0.03, 0.55, 0.9], [-0.04, 0.09, 0.8, 0.6], [0.13, 0.11, 1.3, 0.32], [-0.17, 0.05, 1.7, 0.2]];
export function swell(x, z, t) { let h = 0; for (const [kx, kz, w, a] of WAVES) h += Math.sin(kx * x + kz * z + w * t) * a; return h; }
const GLSL_WAVES = WAVES.map(([kx, kz, w, a]) => `h += sin(${kx.toFixed(3)} * p.x + ${kz.toFixed(3)} * p.y + ${w.toFixed(3)} * t) * ${a.toFixed(3)}; d += vec2(${kx.toFixed(3)}, ${kz.toFixed(3)}) * cos(${kx.toFixed(3)} * p.x + ${kz.toFixed(3)} * p.y + ${w.toFixed(3)} * t) * ${a.toFixed(3)};`).join('\n');

const LAMP = new THREE.Vector3(0, 15.2, 0);

export class Night {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    const s = this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(48, 1, 0.1, 900);
    this.u = { t: { value: 0 }, lamp: { value: 0 }, flash: { value: 0 }, beamDir: { value: new THREE.Vector3(1, 0, 0) }, lampPos: { value: LAMP.clone() }, shipLamp: { value: 0 }, shipPos: { value: new THREE.Vector3() } };
    this.sky(); this.sea(); this.rain(); this.island(); this.lighthouse(); this.ship();
    this.hemi = new THREE.HemisphereLight(0x5a7099, 0x05070c, 0.35); s.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0x8ea6d6, 0.9); this.fill.position.set(-30, 25, 40); s.add(this.fill);
    this.bolt = new THREE.DirectionalLight(0xcfe0ff, 0); this.bolt.position.set(-40, 80, -60); s.add(this.bolt);
    this.lampLight = new THREE.PointLight(0xfff2c8, 0, 60, 1.4); this.lampLight.position.copy(LAMP); s.add(this.lampLight);
    this.camPath = null; this.look = new THREE.Vector3(); this.lampOn = 0; this.lampTo = 0; this.beamYaw = 0; this.aim = null; this.flashT = 0; this.nextBolt = 6;
    this.clock = new THREE.Clock();
    const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const w = this.canvas.clientWidth, h = this.canvas.clientHeight; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w < h ? 62 : 48; this.cam.updateProjectionMatrix(); }
  // ------------------------------------------------------------ sky with moving storm clouds
  sky() {
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: this.u,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float t; uniform float flash; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<5;i++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
        void main(){ vec3 d = normalize(vP); float y = d.y;
          vec2 q = d.xz / max(0.08, y + 0.15) * 1.4 + vec2(t*0.05, t*0.02);
          float c = fbm(q) * 0.85 + fbm(q*2.7 - t*0.04) * 0.35;
          vec3 base = mix(vec3(0.02,0.03,0.05), vec3(0.05,0.07,0.11), smoothstep(-0.05, 0.5, y));
          vec3 col = base + vec3(0.06,0.08,0.11) * c;
          col += vec3(0.55,0.62,0.8) * flash * (0.35 + c) * smoothstep(-0.1, 0.4, y);
          col = mix(col, vec3(0.025,0.035,0.05), smoothstep(0.08, -0.04, y));
          gl_FragColor = vec4(col, 1.0); }` });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), m));
  }
  // ------------------------------------------------------------ the sea: swell, foam near the rock, the beam on the water
  sea() {
    const g = new THREE.PlaneGeometry(900, 900, 260, 260); g.rotateX(-Math.PI / 2);
    const m = new THREE.ShaderMaterial({ uniforms: this.u,
      vertexShader: `uniform float t; varying vec3 vW; varying vec3 vN;
        void main(){ vec3 p0 = (modelMatrix * vec4(position,1.0)).xyz; vec2 p = p0.xz; float h = 0.0; vec2 d = vec2(0.0);
          ${GLSL_WAVES}
          float k = smoothstep(420.0, 120.0, length(p)); h *= k; d *= k;
          vW = vec3(p0.x, h, p0.z); vN = normalize(vec3(-d.x, 1.0, -d.y));
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
      fragmentShader: `uniform float t; uniform float lamp; uniform float flash; uniform vec3 beamDir; uniform vec3 lampPos; uniform float shipLamp; uniform vec3 shipPos; varying vec3 vW; varying vec3 vN;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN + vec3(n(vW.xz*0.9 + t*0.6)-0.5, 0.0, n(vW.zx*0.8 - t*0.5)-0.5) * 0.18);
          float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
          vec3 col = vec3(0.008, 0.02, 0.03) + vec3(0.05, 0.07, 0.1) * fr;
          // the beam: brighter where it falls on the water
          vec3 L = vW - lampPos; float dist = length(L); vec3 Ld = L / dist;
          float inBeam = smoothstep(0.965, 0.995, dot(Ld, normalize(beamDir)));
          col += vec3(1.0, 0.92, 0.7) * lamp * inBeam * (0.55 + 0.6 * n(vW.xz * 0.5 + t)) * exp(-dist * 0.012);
          // glints of the lamp on the waves
          vec3 H = normalize(-Ld + V); col += vec3(1.0, 0.9, 0.7) * lamp * pow(max(dot(N, H), 0.0), 90.0) * 2.5 * exp(-dist * 0.01);
          // the ship's own light
          vec3 S = vW - shipPos; float ds = length(S); col += vec3(1.0, 0.95, 0.85) * shipLamp * exp(-ds * 0.25) * 0.8;
          // foam: crests, and around the rock
          float r = length(vW.xz); float foam = smoothstep(11.0, 6.5, r + n(vW.xz * 0.6 + t * 0.3) * 4.0) + smoothstep(0.55, 1.1, vW.y) * n(vW.xz * 1.7 + t);
          col += vec3(0.18, 0.22, 0.26) * foam * (0.3 + lamp * 0.5 + flash);
          col += vec3(0.35, 0.42, 0.55) * flash * fr * 1.5;
          float fog = smoothstep(60.0, 380.0, length(vW - cameraPosition)); col = mix(col, vec3(0.03, 0.04, 0.06) + vec3(0.3,0.35,0.45)*flash*0.4, fog);
          gl_FragColor = vec4(col, 1.0); }` });
    this.scene.add(new THREE.Mesh(g, m));
  }
  // ------------------------------------------------------------ rain: streaks around the camera, lit when they cross the beam
  rain() {
    const n = 5000, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 70, y = Math.random() * 40, z = (Math.random() - 0.5) * 70; pos.set([x, y, z, x, y, z], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ends = new Float32Array(n * 2); for (let i = 0; i < n; i++) { ends[i * 2] = 0; ends[i * 2 + 1] = 1; } g.setAttribute('e', new THREE.BufferAttribute(ends, 1));
    const sd = new Float32Array(n * 2); for (let i = 0; i < n; i++) { const s = Math.random(); sd[i * 2] = s; sd[i * 2 + 1] = s; } g.setAttribute('s', new THREE.BufferAttribute(sd, 1));
    this.rainU = { ...this.u, camPos: { value: new THREE.Vector3() } };
    const m = new THREE.ShaderMaterial({ uniforms: this.rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float t; uniform vec3 camPos; uniform vec3 lampPos; uniform vec3 beamDir; uniform float lamp; uniform float flash; attribute float e; attribute float s; varying float vA;
        void main(){ vec3 p = position; float sp = 22.0 + s * 10.0; p.y = mod(p.y - t * sp, 40.0) - 8.0;
          p.x = camPos.x + mod(p.x - camPos.x + 35.0, 70.0) - 35.0; p.z = camPos.z + mod(p.z - camPos.z + 35.0, 70.0) - 35.0;
          p += vec3(-0.35, -1.0, 0.18) * e * 0.9; // a streak, slanted by the wind
          vec3 L = p - lampPos; float inB = smoothstep(0.95, 0.99, dot(normalize(L), normalize(beamDir))) * lamp;
          vA = 0.05 + inB * 0.9 + flash * 0.35;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.75, 0.82, 0.95), vA); }` });
    this.scene.add(new THREE.LineSegments(g, m));
  }
  // ------------------------------------------------------------ the rock and the lighthouse
  island() {
    const rock = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.95, flatShading: true });
    const g = new THREE.IcosahedronGeometry(9, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + Math.sin(v.x * 1.3) * 0.12 + Math.cos(v.z * 1.7 + v.y) * 0.1; v.multiplyScalar(k); v.y *= 0.42; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, rock); m.position.y = -0.8; this.scene.add(m);
    for (let i = 0; i < 9; i++) { const a = i * 0.7, b = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + (i % 3) * 0.7, 0), rock); b.position.set(Math.cos(a) * (9 + i % 2 * 2), -0.2, Math.sin(a) * (9 + i % 2 * 2)); b.rotation.set(i, i * 2, 0); this.scene.add(b); }
  }
  lighthouse() {
    const g = this.house = new THREE.Group(); this.scene.add(g);
    // the tower: white with red bands, narrowing to the top
    const pts = []; for (let i = 0; i <= 12; i++) { const y = i / 12; pts.push(new THREE.Vector2(2.3 - y * 0.9, 2 + y * 11)); }
    const tg = new THREE.LatheGeometry(pts, 40), col = [], tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i), band = Math.floor((y - 2) / 2.2) % 2 === 1; const c = new THREE.Color(band ? 0xb02a2a : 0xe8e2d6); col.push(c.r, c.g, c.b); }
    tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })));
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.6, metalness: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 2, 32), new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.9 })); base.position.y = 1.4; g.add(base);
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.25, 32), dark); gal.position.y = 13.1; g.add(gal);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.04, 6, 48), dark); rail.rotation.x = Math.PI / 2; rail.position.y = 13.9; g.add(rail);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), dark); b.position.set(Math.cos(a) * 2.05, 13.5, Math.sin(a) * 2.05); g.add(b); }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fb7c9, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide }));
    glass.position.y = 14.4; g.add(glass);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.4, 24), new THREE.MeshStandardMaterial({ color: 0x9a2424, roughness: 0.6 })); roof.position.y = 16.2; g.add(roof);
    // the lamp: a glowing core, a halo sprite and the beam
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), new THREE.MeshBasicMaterial({ color: 0x3a3020 })); this.core.position.copy(LAMP); this.core.position.y -= 0.9; g.add(this.core);
    const halo = document.createElement('canvas'); halo.width = halo.height = 128; const hc = halo.getContext('2d'), gr = hc.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(0.2, 'rgba(255,230,170,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); hc.fillStyle = gr; hc.fillRect(0, 0, 128, 128);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(halo), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.halo.position.copy(this.core.position); this.halo.scale.setScalar(6); g.add(this.halo);
    const cone = new THREE.ConeGeometry(11, 160, 48, 1, true); cone.translate(0, -80, 0); cone.rotateX(-Math.PI / 2);
    this.beamMat = new THREE.ShaderMaterial({ uniforms: { lamp: this.u.lamp }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying float vAl; varying vec3 vNv; varying vec3 vV; void main(){ vAl = position.z / 160.0; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vNv = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float lamp; varying float vAl; varying vec3 vNv; varying vec3 vV; void main(){ float edge = pow(abs(dot(vNv, vV)), 2.0); float a = lamp * edge * pow(1.0 - clamp(vAl,0.0,1.0), 1.4) * 0.6; gl_FragColor = vec4(vec3(1.0,0.93,0.75) * a, a); }` });
    this.beam = new THREE.Mesh(cone, this.beamMat); this.beam.position.copy(this.core.position); g.add(this.beam);
    // a soft back beam, as a real lens throws light both ways
    this.beam2 = new THREE.Mesh(cone, this.beamMat); this.beam2.position.copy(this.core.position); g.add(this.beam2);
  }
  // ------------------------------------------------------------ the ship
  ship() {
    const g = this.boat = new THREE.Group(); this.scene.add(g);
    const hullM = new THREE.MeshStandardMaterial({ color: 0x1d242d, roughness: 0.7 }), white = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.6 });
    const hs = new THREE.Shape(); hs.moveTo(-1.6, 0); hs.lineTo(1.6, 0); hs.lineTo(2.2, 1.4); hs.lineTo(-2.2, 1.4); hs.lineTo(-1.6, 0);
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 9, bevelEnabled: false }), hullM); hull.geometry.translate(0, -0.6, -4.5); g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 4), hullM); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.5); bow.position.set(0, 0.2, 5.6); g.add(bow);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 3), white); cab.position.set(0, 1.8, -1.6); g.add(cab);
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.5, 2.2), new THREE.MeshBasicMaterial({ color: 0xffd08a })); win.position.set(0, 2.2, -1.4); g.add(win);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 6), white); mast.position.set(0, 4.5, -1.2); g.add(mast);
    const navL = (c, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); g.add(m); return m; };
    navL(0xff3030, -1.35, 2.4, 0); navL(0x30ff70, 1.35, 2.4, 0); navL(0xffffff, 0, 7, -1.2);
    // its signal lamp, which answers
    this.sigMat = new THREE.SpriteMaterial({ map: this.halo.material.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.sig = new THREE.Sprite(this.sigMat); this.sig.position.set(0, 3.4, 0.2); this.sig.scale.setScalar(5); g.add(this.sig);
    this.shipLight = new THREE.PointLight(0xffe9c0, 0, 30); this.shipLight.position.set(0, 3.4, 0); g.add(this.shipLight);
    // a searchlight for the rescue
    const sc = new THREE.ConeGeometry(4, 50, 32, 1, true); sc.translate(0, -25, 0); sc.rotateX(-Math.PI / 2);
    this.searchU = { lamp: { value: 0 } };
    this.search = new THREE.Mesh(sc, new THREE.ShaderMaterial({ uniforms: this.searchU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: this.beamMat.vertexShader.replace('160.0', '50.0'), fragmentShader: this.beamMat.fragmentShader }));
    this.search.position.set(0, 3.2, 3); g.add(this.search);
    g.scale.setScalar(1.8); this.shipAt = new THREE.Vector3(30, 0, -80); this.shipHeading = -0.6; this.shipTo = null;
  }
  // ------------------------------------------------------------ controls used by the game
  setLamp(on) { this.lampTo = on ? 1 : 0; }
  aimAtShip(on) { this.aim = on ? 'ship' : null; }
  shipSignal(v) { this.shipSig = v; }
  rescue() { this.shipTo = new THREE.Vector3(14, 0, -26); this.searchU.lamp.value = 1; }
  lightning() { this.flashT = 1; this.onThunder?.(); }
  // the ship's position on screen, for the sailor's bubble
  shipScreen() { const p = this.boat.position.clone(); p.y += 8; p.project(this.cam); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, front: p.z < 1 }; }
  // camera shots: 'sea' (low over the waves, far), 'tower' (the gallery, looking out at the ship)
  shot(name, ms = 0) { this.shotTo = name; this.shotMs = ms; this.shotT0 = performance.now(); this.shotFrom = { p: this.cam.position.clone(), l: this.look.clone() }; }
  shotPose(name, t) {
    const ship = this.boat.position;
    if (name === 'sea') return { p: new THREE.Vector3(-30 + Math.sin(t * 0.1) * 2, 3 + swell(-30, 40, t) * 0.4, 46), l: new THREE.Vector3(0, 9, 0) };
    if (name === 'ship') return { p: new THREE.Vector3(-3.5, 15.6, 5.5), l: ship.clone().add(new THREE.Vector3(0, 2, 0)) };
    // behind the lighthouse and to its side: the tower on one side of the picture, the beam going out to the ship
    const port = this.cam.aspect < 1, d = new THREE.Vector3(ship.x, 0, ship.z).normalize(), side = new THREE.Vector3(-d.z, 0, d.x);
    const p = d.clone().multiplyScalar(port ? -30 : -24).add(side.clone().multiplyScalar(port ? 7 : 11)); p.y = port ? 21 : 18.5;
    const l = d.clone().multiplyScalar(port ? 34 : 40).add(side.clone().multiplyScalar(port ? 2 : -3)); l.y = port ? 3 : 5;
    return { p, l };
  }
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta()), t = this.clock.elapsedTime; this.u.t.value = t;
    // lightning: a double flash, then thunder
    this.nextBolt -= dt; if (this.nextBolt < 0) { this.lightning(); this.nextBolt = 9 + Math.random() * 14; }
    if (this.flashT > 0) this.flashT -= dt * 1.4; const f = Math.max(0, this.flashT), fl = (f > 0.75 || (f > 0.4 && f < 0.55)) ? 1 : f > 0 ? 0.15 : 0;
    this.u.flash.value = fl; this.bolt.intensity = fl * 3; this.hemi.intensity = 0.35 + fl * 0.8;
    // the lamp: quick on, a little slower off (a real bulb)
    this.lampOn += (this.lampTo - this.lampOn) * Math.min(1, dt * (this.lampTo > this.lampOn ? 40 : 18));
    const L = this.lampOn; this.u.lamp.value = L; this.lampLight.intensity = L * 60; this.halo.material.opacity = L; this.core.material.color.setRGB(0.23 + L * 0.77, 0.19 + L * 0.75, 0.13 + L * 0.6);
    // the beam turns slowly when idle; it swings to the ship when signalling
    const ship = this.boat.position;
    let target = this.aim ? Math.atan2(ship.x - LAMP.x, ship.z - LAMP.z) : this.beamYaw + dt * 0.35;
    let d = target - this.beamYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; this.beamYaw += this.aim ? d * Math.min(1, dt * 3) : dt * 0.35;
    const pitch = -0.09; const dir = new THREE.Vector3(Math.sin(this.beamYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.beamYaw) * Math.cos(pitch));
    this.u.beamDir.value.copy(dir); this.beam.lookAt(this.beam.position.clone().add(dir)); this.beam2.lookAt(this.beam.position.clone().sub(dir));
    // the ship rides the swell; it sails in when rescued
    if (this.shipTo) { this.shipAt.lerp(this.shipTo, Math.min(1, dt * 0.08)); this.shipHeading += (Math.atan2(-this.shipAt.x, -this.shipAt.z) - this.shipHeading) * Math.min(1, dt * 0.5); }
    else this.shipAt.x += Math.sin(t * 0.05) * dt * 0.3;
    const b = this.boat; b.position.set(this.shipAt.x, swell(this.shipAt.x, this.shipAt.z, t) * 0.9 + 0.4, this.shipAt.z);
    b.rotation.set(Math.sin(t * 0.8) * 0.06, this.shipHeading, Math.sin(t * 0.6 + 1) * 0.08);
    this.u.shipPos.value.copy(b.position); const sg = this.shipSig || 0; this.sigMat.opacity = sg; this.shipLight.intensity = sg * 40; this.u.shipLamp.value = sg;
    if (this.searchU.lamp.value) this.search.lookAt(LAMP);
    // camera: glides between shots, sways a little with the wind
    const pose = this.shotPose(this.shotTo || 'tower', t);
    if (this.shotFrom && this.shotMs) { const k = Math.min(1, (performance.now() - this.shotT0) / this.shotMs), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.cam.position.lerpVectors(this.shotFrom.p, pose.p, e); this.look.lerpVectors(this.shotFrom.l, pose.l, e); if (k >= 1) this.shotMs = 0; }
    else { this.cam.position.lerp(pose.p, Math.min(1, dt * 2)); this.look.lerp(pose.l, Math.min(1, dt * 2)); }
    this.cam.position.x += Math.sin(t * 1.7) * 0.02; this.cam.position.y += Math.sin(t * 1.3) * 0.02;
    this.cam.lookAt(this.look); this.rainU.camPos.value.copy(this.cam.position);
    this.renderer.render(this.scene, this.cam);
  }
}
