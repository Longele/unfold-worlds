// La Grande Chasse: the living portal. When the phone recognises a card, its printed picture melts away from the
// centre and a real hole opens in the table: through it, far below, Pixo's planet (the same scene without him), with
// glowing walls and motes of light rising. The tilt of the phone shows the depth. Then the ship's piece shoots out
// of the hole towards the player, and a little Pixo hops out of his world onto the card and leaps into the room.
// Everything lives in the card's own space (MindAR anchor): 1 unit = the card's width, +z = out of the table.
import * as THREE from 'three';
import { pixoMaterial } from './room.js';

const CW = 1200, CH = 1600;                                       // the card face, in pixels
const WIN = { l: 44, t: 44, r: 44, b: 196, rad: 48 };             // its picture window (cards.html .art)
const px = (x) => x / CW;                                         // pixels -> card units
const HALF_H = CH / CW / 2;
const win = { x0: -0.5 + px(WIN.l), x1: 0.5 - px(WIN.r), y1: HALF_H - px(WIN.t), y0: -HALF_H + px(WIN.b), r: px(WIN.rad) };
win.w = win.x1 - win.x0; win.h = win.y1 - win.y0; win.cx = (win.x0 + win.x1) / 2; win.cy = (win.y0 + win.y1) / 2;
const DEPTH = 0.9;                                                // how deep the planet lies under the table (card widths)

function roundRect(path, x0, y0, x1, y1, r) {
  path.moveTo(x0 + r, y0); path.lineTo(x1 - r, y0); path.quadraticCurveTo(x1, y0, x1, y0 + r); path.lineTo(x1, y1 - r); path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1); path.quadraticCurveTo(x0, y1, x0, y1 - r); path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0); return path;
}
// the scanner's renderer outputs sRGB: built-in materials get sRGB textures, our own shaders pass the picture through as is
const tex = (url, srgb = false) => { const t = new THREE.TextureLoader().load(url); if (srgb) t.encoding = THREE.sRGBEncoding; return t; };
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const k = c.getContext('2d'), g = k.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = g; k.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

export class LivingPortal {
  // k: the card (1..6); color: its frame colour; pixo: the room's Pixo (his clip videos are reused here)
  constructor(k, color, pixo) {
    this.k = k; this.pixo = pixo; this.col = new THREE.Color(color); this.t = 0;
    const g = this.group = new THREE.Group(); g.visible = false;
    // 1) the occluder: an invisible sheet around the window that hides whatever is under the table
    const sheet = roundRect(new THREE.Shape(), -4, -4, 4, 4, 0.01); sheet.holes.push(roundRect(new THREE.Path(), win.x0, win.y0, win.x1, win.y1, win.r));
    const occ = new THREE.Mesh(new THREE.ShapeGeometry(sheet, 12), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }));
    occ.renderOrder = -10; occ.position.z = 0.0005; g.add(occ);
    // 2) the shaft: four walls going down from the window to the planet, glowing in the card's colour near the top
    const wallMat = new THREE.ShaderMaterial({ uniforms: { c: { value: this.col }, t: { value: 0 }, k: { value: 0 } }, side: THREE.DoubleSide, vertexShader: VS,
      fragmentShader: `uniform vec3 c; uniform float t; uniform float k; varying vec2 vUv;
        void main(){ float d = vUv.y; float rings = 0.5 + 0.5 * sin(d * 40.0 - t * 6.0); vec3 col = mix(vec3(0.02, 0.02, 0.08), c * 1.2, pow(d, 3.0)) + c * rings * 0.25 * d;
          gl_FragColor = vec4(col * (0.35 + 0.65 * k), 1.0); }` });
    this.wallMat = wallMat; const sh = new THREE.Group();
    const wall = (w, h, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.copy(pos); m.rotation.set(...rot); sh.add(m); };
    // each wall's uv.y runs from the bottom (0) up to the table (1)
    wall(win.w, DEPTH, new THREE.Vector3(win.cx, win.y1, -DEPTH / 2), [Math.PI / 2, 0, 0]);
    wall(win.w, DEPTH, new THREE.Vector3(win.cx, win.y0, -DEPTH / 2), [Math.PI / 2, 0, 0]);
    wall(win.h, DEPTH, new THREE.Vector3(win.x0, win.cy, -DEPTH / 2), [Math.PI / 2, Math.PI / 2, 0]);
    wall(win.h, DEPTH, new THREE.Vector3(win.x1, win.cy, -DEPTH / 2), [Math.PI / 2, Math.PI / 2, 0]);
    g.add(sh);
    // 3) the planet at the bottom (his scene without him), a little larger than the window
    const plateW = win.w * 1.06, plateH = plateW * 2400 / 1792;
    this.plateU = { map: { value: tex(`img/plates/p${k}.jpg`) }, k: { value: 0 } };
    this.plate = new THREE.Mesh(new THREE.PlaneGeometry(plateW, plateH), new THREE.ShaderMaterial({ uniforms: this.plateU, vertexShader: VS,
      fragmentShader: 'uniform sampler2D map; uniform float k; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb; float v = 1.0 - 0.35 * length(vUv - 0.5); gl_FragColor = vec4(c * v * (0.4 + 0.6 * k), 1.0); }' }));
    this.plate.position.set(win.cx, win.cy + 0.02, -DEPTH); g.add(this.plate);
    // 4) the printed picture itself, on top, which melts away from the centre with a burning, glowing edge
    const face = tex(`cards/c${k}.jpg`);
    this.meltU = { map: { value: face }, u: { value: 0 }, c: { value: this.col }, uv0: { value: new THREE.Vector2(WIN.l / CW, WIN.b / CH) }, uvs: { value: new THREE.Vector2(1 - (WIN.l + WIN.r) / CW, 1 - (WIN.t + WIN.b) / CH) } };
    const melt = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(new THREE.Shape(), win.x0, win.y0, win.x1, win.y1, win.r), 12), new THREE.ShaderMaterial({ uniforms: this.meltU, transparent: true, depthWrite: false, vertexShader: VS,
      fragmentShader: `uniform sampler2D map; uniform float u; uniform vec3 c; uniform vec2 uv0; uniform vec2 uvs; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 q = vUv; vec2 cuv = uv0 + q * uvs; vec3 img = texture2D(map, cuv).rgb;
          float r = length((q - 0.5) * vec2(1.0, 1.25)) * 1.6 + (n(q * 9.0) - 0.5) * 0.45;
          float edge = u * 1.9 - 0.15; float a = smoothstep(edge - 0.02, edge + 0.04, r);
          float burn = smoothstep(0.16, 0.0, abs(r - edge - 0.06)) * step(0.001, u) * (1.0 - step(0.999, u));
          gl_FragColor = vec4(img * a + (c * 1.3 + vec3(0.55, 0.45, 0.15)) * burn, max(a, burn * 0.9)); }` }));
    melt.position.z = 0.001; melt.renderOrder = 5; this.melt = melt; g.add(melt);
    // the ShapeGeometry uvs are in card units: remap them to 0..1 over the window
    const uv = melt.geometry.attributes.uv, pos = melt.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - win.x0) / win.w, (pos.getY(i) - win.y0) / win.h);
    // 5) a glowing rim around the opening
    const rimU = { c: { value: this.col }, k: { value: 0 }, t: { value: 0 } };
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(win.w + 0.24, win.h + 0.24), new THREE.ShaderMaterial({ uniforms: rimU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, vertexShader: VS,
      fragmentShader: `uniform vec3 c; uniform float k; uniform float t; varying vec2 vUv;
        float sd(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){ vec2 sz = vec2(${(win.w + 0.24).toFixed(4)}, ${(win.h + 0.24).toFixed(4)}); vec2 p = (vUv - 0.5) * sz;
          float d = sd(p, vec2(${(win.w / 2).toFixed(4)}, ${(win.h / 2).toFixed(4)}), ${win.r.toFixed(4)});
          float a = atan(p.y, p.x); float pulse = 0.75 + 0.25 * sin(a * 6.0 - t * 5.0);
          float glow = exp(-abs(d) * 38.0) * pulse + exp(-max(d, 0.0) * 12.0) * 0.25 * step(0.0, d);
          gl_FragColor = vec4((c + vec3(0.5, 0.45, 0.25)) * glow * k, glow * k); }` }));
    rim.position.set(win.cx, win.cy, 0.002); rim.renderOrder = 6; this.rimU = rimU; g.add(rim);
    // 6) motes of light rising out of the planet
    this.glow = glowTex(); this.motes = [];
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: i % 3 ? this.col : new THREE.Color(1, 0.9, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.userData = { x: win.x0 + Math.random() * win.w, y: win.y0 + Math.random() * win.h, z: -DEPTH * Math.random(), v: 0.15 + Math.random() * 0.35, s: 0.02 + Math.random() * 0.035 };
      m.scale.setScalar(0.0001); m.renderOrder = 4; g.add(m); this.motes.push(m);
    }
    this.k01 = 0; // how open the portal is
  }
  // the mini Pixo (made the first time he is needed, on the scanner's own WebGL context)
  makeMini() {
    if (this.mini) return; const texs = {};
    this.miniTex = (n) => texs[n] || (texs[n] = Object.assign(new THREE.VideoTexture(this.pixo.vids[n]), { encoding: THREE.sRGBEncoding }));
    const { mat, uni } = pixoMaterial(this.miniTex('idle')); this.miniU = uni;
    const H = 0.6, W = H * 480 / 854; // the clip frame; Pixo is about 2/3 of it, so about 4 cm tall on a 9 cm card
    const card = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); card.position.y = H / 2 - H * 145 / 854; card.renderOrder = 8;
    const holder = new THREE.Group(); holder.add(card); holder.visible = false; this.mini = holder; this.group.add(holder);
  }
  sprite(url, h) { const t = tex(url, true); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.renderOrder = 7; const set = () => { if (t.image?.width) s.scale.set(h * t.image.width / t.image.height, h, 1); }; t.onUpdate = set; setTimeout(set, 300); s.scale.set(h, h, 1); return s; }
  // every frame of the scanner: animate, and keep the mini Pixo turned towards the phone
  update(t, camera) {
    this.t = t; this.wallMat.uniforms.t.value = t; this.wallMat.uniforms.k.value = this.k01; this.plateU.k.value = this.k01; this.rimU.t.value = t; this.rimU.k.value = this.k01;
    for (const m of this.motes) { const u = m.userData; u.z += u.v * 0.016; if (u.z > 0.25) { u.z = -DEPTH; u.x = win.x0 + Math.random() * win.w; u.y = win.y0 + Math.random() * win.h; }
      m.position.set(u.x + Math.sin(t * 2 + u.y * 9) * 0.02, u.y, u.z); const s = u.s * this.k01 * (u.z > 0 ? 1 - u.z / 0.25 : 1); m.scale.set(s, s, 1); }
    if (this.mini?.visible && camera) { // face the phone: undo the card's own rotation, then take the camera's
      const q = new THREE.Quaternion(); this.group.getWorldQuaternion(q); this.mini.quaternion.copy(q.invert().multiply(camera.quaternion));
      this.miniU.map.value = this.miniTex(this.pixo.clip);
    }
  }
  // the whole show; `part` = the ship piece image (or null), sfx(name) plays a sound. Resolves when Pixo has leapt.
  async open({ part = null, sfx = () => {}, fast = false, onOut = () => {} } = {}) {
    const T = (ms) => (fast ? Math.min(ms, 80) : ms), wait = (ms) => new Promise((r) => setTimeout(r, T(ms)));
    const anim = (ms, f) => new Promise((r) => { const t0 = performance.now(); const s = () => { const u = Math.min(1, (performance.now() - t0) / T(ms)); f(u); u < 1 ? requestAnimationFrame(s) : r(); }; s(); });
    this.group.visible = true; this.meltU.u.value = 0; this.k01 = 0;
    sfx('portal');
    await anim(1000, (u) => { this.meltU.u.value = u * u * (3 - 2 * u); this.k01 = u; });      // the picture melts, the hole opens
    this.melt.visible = false;
    if (part) {                                                                                  // the piece shoots out towards the phone
      const s = this.sprite(`parts/${part}.png`, 0.42); this.group.add(s); sfx('part');
      await anim(1100, (u) => { const e = 1 - (1 - u) * (1 - u); s.position.set(win.cx + Math.sin(u * 9) * 0.05 * (1 - u), win.cy, -DEPTH * 0.7 + e * 2.2); s.material.rotation = u * 6; s.material.opacity = u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2; });
      this.group.remove(s);
    }
    this.makeMini(); const P = this.mini; P.visible = true; this.pixo.play('happy');               // a little Pixo hops out of his world
    sfx('hop');
    await anim(900, (u) => { const z = -DEPTH * 0.85 + (DEPTH * 0.85) * u + Math.sin(u * Math.PI) * 0.4; P.position.set(win.cx, win.cy - 0.12, z); this.miniU.fade.value = Math.min(1, u * 3); });
    sfx('giggle'); onOut(); await wait(1100);
    sfx('appear');                                                                               // and leaps towards the player, into the room
    await anim(520, (u) => { P.position.z = u * 1.6 + Math.sin(u * Math.PI) * 0.3; P.scale.setScalar(1 + u * 1.5); this.miniU.glow.value = u; this.miniU.fade.value = 1 - u * u; });
    P.visible = false; P.scale.setScalar(1); this.miniU.glow.value = 0;
  }
  reset() { this.group.visible = false; this.melt.visible = true; this.meltU.u.value = 0; this.k01 = 0; if (this.mini) this.mini.visible = false; }
}
