// Gambit: the board in 3D. A walnut and maple board with its coordinates engraved in the frame, turned Staunton
// pieces in lacquered ivory and ebony, soft studio light with real shadows. Everything the teacher needs to show:
// legal moves, last move, check, arrows, marked squares, stars to collect. Tap a piece then a square, or drag it
// (finger or mouse). The board only proposes moves; the app decides with the rules (chess.js).
import * as THREE from './lib/three/three.module.js';
import { RoomEnvironment } from './lib/three/addons/environments/RoomEnvironment.js';

const FILES = 'abcdefgh';
export const sqXZ = (sq) => [FILES.indexOf(sq[0]) - 3.5, 3.5 - (+sq[1] - 1)];

// ------------------------------------------------------------------ the pieces: a real Staunton set measured from studio photos
// (gambit-src/build_pieces.py). Turned pieces are lathed on their measured profile; the knight is its turned base plus the
// carved head, inflated from the photo's silhouette. All in board units (a square is 1).
let SHAPES = null;
const b64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
export async function loadPieces() {
  if (SHAPES) return SHAPES;
  SHAPES = await (await fetch(new URL('./pieces.json', import.meta.url))).json(); return SHAPES;
}
function shade(g, f) { // per-vertex tone: 1 everywhere, darker in carved grooves
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const k = f ? f(i) : 1; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
function lathe(points, seg = 72) {
  const pts = [[0, 0], ...points], top = points[points.length - 1]; if (top[0] > 0.001) pts.push([0, top[1]]);
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
}
const felt = (r) => { const g = new THREE.CylinderGeometry(r, r, 0.014, 48); g.translate(0, 0.007, 0); return shade(g); };
function crenels(rOut, rIn, y0, h, n = 6) { // the rook's battlement: n merlons cut from a ring
  const parts = [], gap = 0.32;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + (gap / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI * 2 - (gap / n) * Math.PI, s = new THREE.Shape();
    s.absarc(0, 0, rOut, a0, a1, false); s.absarc(0, 0, rIn, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); parts.push(shade(g));
  }
  return parts;
}
function crossPattee(c) { // the king's cross, flared arms, sized from the photo
  const w = c.w / 2, h = c.h, t = c.bar * 0.32, s = new THREE.Shape(), fl = w * 0.55, cy = h * 0.55;
  s.moveTo(-t, 0); s.lineTo(t, 0); s.lineTo(t * 0.7, cy - t); s.lineTo(w, cy - fl); s.lineTo(w, cy + fl); s.lineTo(t * 0.7, cy + t);
  s.lineTo(fl, h); s.lineTo(-fl, h); s.lineTo(-t * 0.7, cy + t); s.lineTo(-w, cy + fl); s.lineTo(-w, cy - fl); s.lineTo(-t * 0.7, cy - t); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: c.bar * 0.3, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.016, bevelSegments: 6, curveSegments: 4 });
  g.translate(0, c.y - 0.005, -c.bar * 0.15); g.computeVertexNormals(); return shade(g);
}
function bishopSlit(g, H) { // the mitre's slit: a slanted groove cut into the right side of the head
  const p = g.attributes.position, n = p.count, nx = 0.87, ny = 0.5, y0 = H * 0.955, w = 0.016, depth = 0.07, tone = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < H * 0.62 || x < 0.004) continue;
    const dist = Math.abs(nx * x + ny * (y - y0)); if (dist > w) continue;
    const k = Math.cos((dist / w) * Math.PI / 2) ** 2, r = Math.hypot(x, z), r2 = Math.max(0.01, r - depth * k);
    p.setX(i, (x * r2) / r); p.setZ(i, (z * r2) / r); tone[i] = 1 - 0.75 * k;
  }
  g.computeVertexNormals(); return shade(g, (i) => tone[i]);
}
function knightHead(d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(b64(d.pos, Float32Array), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(b64(d.uv, Float32Array), 2));
  g.setIndex(new THREE.BufferAttribute(b64(d.idx, Uint32Array), 1)); g.computeVertexNormals(); return shade(g);
}
const GEO = {};
function geos(type) {
  if (GEO[type]) return GEO[type];
  const S = SHAPES, prof = S[type], H = prof[prof.length - 1][1];
  const parts = [felt(Math.max(...prof.slice(0, 8).map((p) => p[0])) * 0.97)];
  if (type === 'r') {
    const notch = S.r_notch, cut = H - notch, top = prof.filter((p) => p[1] <= cut), rOut = top[top.length - 1][0], rIn = rOut * 0.66;
    parts.push(shade(lathe([...top, [rOut, cut], [rIn, cut], [rIn, cut - 0.05], [0, cut - 0.05]])), ...crenels(rOut, rIn, cut, notch));
  } else if (type === 'b') parts.push(bishopSlit(lathe(prof, 160), H));
  else parts.push(shade(lathe(prof)));
  if (type === 'k') parts.push(crossPattee(S.k_cross));
  if (type === 'q') { // the coronet's pearls, on the crown's rim
    const top = prof.filter((p) => p[1] > H * 0.72 && p[1] < H * 0.9), rim = top.reduce((a, b) => (b[0] > a[0] ? b : a), top[0]);
    for (let i = 0; i < 10; i++) { const sp = new THREE.SphereGeometry(0.03, 14, 10); sp.translate(rim[0] - 0.026, rim[1] + 0.014, 0); sp.rotateY((i / 10) * Math.PI * 2); parts.push(shade(sp)); }
  }
  if (type === 'n') parts.push(knightHead(S.n_head));
  return (GEO[type] = parts);
}

// ------------------------------------------------------------------ textures drawn once
function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const k = c.getContext('2d');
  const g = k.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,150,.9)'); g.addColorStop(0.4, 'rgba(255,200,90,.25)'); g.addColorStop(1, 'rgba(255,200,90,0)'); k.fillStyle = g; k.fillRect(0, 0, 128, 128);
  k.translate(64, 64); k.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 15 : 36; k.lineTo(Math.cos(a) * r, Math.sin(a) * r); } k.closePath();
  const f = k.createLinearGradient(0, -36, 0, 36); f.addColorStop(0, '#fff3c4'); f.addColorStop(1, '#f2a93b'); k.fillStyle = f; k.fill(); k.lineWidth = 3; k.strokeStyle = '#fff8e0'; k.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ the board
export class Board3D {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color(0x0b0a0d); sc.fog = new THREE.Fog(0x0b0a0d, 16, 34);
    const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.7;
    this.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    // light: warm key with soft shadows, cool fill, a pool of light on the table
    const key = new THREE.DirectionalLight(0xffe2bd, 2.3); key.position.set(-4, 11, 6); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); const sh = key.shadow.camera; sh.left = sh.bottom = -6; sh.right = sh.top = 6; sh.near = 2; sh.far = 30; key.shadow.bias = -0.0004; key.shadow.radius = 4;
    sc.add(key, new THREE.HemisphereLight(0x9fb3d6, 0x2a1a10, 0.42));
    // a warm pool of light from a lamp above the table, the room falls into the dark around it

    const rim = new THREE.DirectionalLight(0x9db8ff, 0.8); rim.position.set(6, 5, -8); sc.add(rim);
    // table and board
    const table = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x17110d, roughness: 0.85 })); table.rotation.x = -Math.PI / 2; table.position.y = -0.36; table.receiveShadow = true; sc.add(table);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ color: 0x5a3a1e, transparent: true, opacity: 0.25, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -0.355; sc.add(glow);
    const body = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.34, 9.4), new THREE.MeshPhysicalMaterial({ color: 0x3a2213, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    body.position.y = -0.18; body.castShadow = true; body.receiveShadow = true; sc.add(body);
    const tl = new THREE.TextureLoader(), tex = (f, rep) => { const t = tl.load(new URL('./img/' + f, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
    const top = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 9.4), new THREE.MeshPhysicalMaterial({ map: tex('board.jpg'), roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.001; top.receiveShadow = true; sc.add(top); this.top = top;
    // boxwood and ebonised walnut, hand-rubbed lacquer; the felt under every piece
    this.mats = {
      w: new THREE.MeshPhysicalMaterial({ map: tex('wood_w.jpg', [2, 1]), vertexColors: true, roughness: 0.38, clearcoat: 0.85, clearcoatRoughness: 0.12 }),
      b: new THREE.MeshPhysicalMaterial({ map: tex('wood_b.jpg', [2, 1]), vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
      felt: new THREE.MeshStandardMaterial({ color: 0x0f3a24, roughness: 1 }),
    };
    this.ready = loadPieces();
    // overlays live just above the board surface
    this.fx = new THREE.Group(); sc.add(this.fx); this.arrowsG = new THREE.Group(); sc.add(this.arrowsG); this.starsG = new THREE.Group(); sc.add(this.starsG);
    this.starTex = starTexture();
    this.pieces = new Map(); this.flipped = false; this.tweens = []; this.interactive = null; this.sel = null; this.legalFor = () => [];
    this.input(); new ResizeObserver(() => this.resize()).observe(canvas); this.resize();
    const loop = (t) => { this.frame(t / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  // the board fits the free part of the screen: margins (px) leave room for the panels around it
  setMargins(m) { this.margins = { top: 0, right: 0, bottom: 0, left: 0, ...m }; this.resize(); }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.clearViewOffset();
    const M = this.margins || { top: 0, right: 0, bottom: 0, left: 0 }, ax = Math.max(0.3, 1 - (M.left + M.right) / w) * 0.97, ay = Math.max(0.3, 1 - (M.top + M.bottom) / h) * 0.97;
    // the whole board with its frame, seen from the player's side at a comfortable tilt
    const tilt = this.tilt ?? 0.98, sgn = this.flipped ? -1 : 1, dir = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt) * sgn);
    let d = 8; const corners = [[-4.7, 0, -4.7], [4.7, 0, -4.7], [-4.7, 0, 4.7], [4.7, 0, 4.7], [-4.7, 1.2, -4.7], [4.7, 1.2, -4.7]].map((c) => new THREE.Vector3(...c));
    let cy = 0;
    for (let i = 0; i < 50; i++) {
      this.cam.position.copy(dir).multiplyScalar(d).add(new THREE.Vector3(0, 0, 0.35 * sgn)); this.cam.lookAt(0, -0.2, 0.35 * sgn); this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
      const P = corners.map((c) => c.clone().project(this.cam)), ys = P.map((v) => v.y); cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const m = Math.max(...P.map((v) => Math.max(Math.abs(v.x) / ax, Math.abs(v.y - cy) / ay)));
      d *= m; if (Math.abs(m - 1) < 0.004) break;
    }
    this.scene.fog.near = d + 4; this.scene.fog.far = d + 22; // the room fades behind the board, whatever the camera distance
    // shift the picture so the board sits in the middle of the free area
    const offX = (M.right - M.left) / 2, offY = (M.bottom - M.top) / 2 - (cy * h) / 2;
    this.cam.setViewOffset(w, h, offX, offY, w, h); this.cam.updateProjectionMatrix();
  }
  // where a square (or a point above it) is on screen, in CSS pixels
  screenOf(sq, y = 0) { const [x, z] = sqXZ(sq), v = new THREE.Vector3(x, y, z).project(this.cam), r = this.canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; }
  setFlipped(f) { this.flipped = f; this.resize(); }
  // ------------------------------------------------------------ pieces
  makePiece(type, color) {
    const g = new THREE.Group();
    geos(type).forEach((geo, i) => { const m = new THREE.Mesh(geo, i === 0 ? this.mats.felt : this.mats[color]); m.castShadow = i > 0; m.receiveShadow = true; g.add(m); });
    if (type === 'n') g.rotation.y = color === 'w' ? 0.75 : Math.PI + 0.75; // knights look across at the opponent, profile to the player
    if (type === 'b') g.rotation.y = color === 'w' ? -0.5 : Math.PI - 0.5;  // the mitre's slit turned toward its player
    g.userData = { type, color }; return g;
  }
  place(g, sq) { const [x, z] = sqXZ(sq); g.position.set(x, 0, z); g.userData.sq = sq; }
  // show a position: [{sq, type, color}]; pieces already in the right place stay put
  setPosition(list, fade = true) {
    const want = new Map(list.map((p) => [p.sq, p]));
    for (const [sq, g] of this.pieces) { const w = want.get(sq); if (!w || w.type !== g.userData.type || w.color !== g.userData.color) { this.remove(sq, fade); } }
    for (const [sq, p] of want) if (!this.pieces.has(sq)) { const g = this.makePiece(p.type, p.color); this.place(g, sq); this.scene.add(g); this.pieces.set(sq, g); if (fade) this.popIn(g); }
  }
  popIn(g) { g.scale.setScalar(0.01); this.tween(320, (u) => g.scale.setScalar(0.01 + 0.99 * (1 - (1 - u) ** 3))); }
  remove(sq, fade = true) {
    const g = this.pieces.get(sq); if (!g) return; this.pieces.delete(sq);
    if (!fade) { this.scene.remove(g); return; }
    this.tween(260, (u) => { g.scale.setScalar(1 - u); g.position.y = -u * 0.2; }).then(() => this.scene.remove(g));
  }
  // animate a move the rules accepted: {from, to, captured, castle, ep, promotion, color}
  async animateMove(mv) {
    const g = this.pieces.get(mv.from); if (!g) return;
    const capSq = mv.ep ? mv.to[0] + mv.from[1] : mv.to;
    if (mv.captured) { const c = this.pieces.get(capSq); if (c && c !== g) { this.pieces.delete(capSq); this.sparks(capSq); this.tween(300, (u) => { c.scale.setScalar(1 - u); c.position.y = -u * 0.3; }).then(() => this.scene.remove(c)); } }
    this.pieces.delete(mv.from); this.pieces.set(mv.to, g);
    const rook = mv.castle ? (mv.castle === 'k' ? ['h', 'f'] : ['a', 'd']).map((f) => f + mv.from[1]) : null;
    await Promise.all([this.slide(g, mv.from, mv.to, g.userData.type === 'n' ? 0.55 : 0.18), rook ? this.slide(this.pieces.get(rook[0]), rook[0], rook[1], 0.25).then(() => { const r = this.pieces.get(rook[0]); this.pieces.delete(rook[0]); this.pieces.set(rook[1], r); }) : null]);
    g.userData.sq = mv.to;
    if (mv.promotion) { this.scene.remove(g); const q = this.makePiece(mv.promotion, mv.color); this.place(q, mv.to); this.scene.add(q); this.pieces.set(mv.to, q); this.sparks(mv.to, 0xfff0b0); this.popIn(q); }
  }
  slide(g, from, to, hop) {
    if (!g) return Promise.resolve();
    const [x0, z0] = sqXZ(from), [x1, z1] = sqXZ(to), dist = Math.hypot(x1 - x0, z1 - z0), ms = 220 + dist * 45;
    return this.tween(ms, (u) => { const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; g.position.set(x0 + (x1 - x0) * e, Math.sin(u * Math.PI) * hop * (0.6 + dist * 0.08), z0 + (z1 - z0) * e); }).then(() => g.position.set(x1, 0, z1));
  }
  tween(ms, f) { return new Promise((res) => this.tweens.push({ t0: performance.now(), ms, f, res })); }
  // ------------------------------------------------------------ overlays
  clearMarks() { for (const c of [...this.fx.children]) { if (!c.userData.keep) this.fx.remove(c); } }
  square(sq, color, opacity = 0.42, keep = false, inset = 0.02) {
    const [x, z] = sqXZ(sq), m = new THREE.Mesh(new THREE.PlaneGeometry(1 - inset * 2, 1 - inset * 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.userData.keep = keep; m.renderOrder = 1; this.fx.add(m); return m;
  }
  dot(sq, capture) {
    const [x, z] = sqXZ(sq), geo = capture ? new THREE.RingGeometry(0.4, 0.47, 40) : new THREE.CircleGeometry(0.13, 28);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: capture ? 0xffc46b : 0xffe9b0, transparent: true, opacity: capture ? 0.85 : 0.7, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.renderOrder = 2; this.fx.add(m); return m;
  }
  // the standing highlights: last move, the king in check, the selected piece and where it can go
  highlight({ last, check, selected, targets = [] } = {}) {
    this.clearMarks();
    if (last) { this.square(last.from, 0xd9a441, 0.28); this.square(last.to, 0xd9a441, 0.38); }
    if (check) { const m = this.square(check, 0xff3b3b, 0.55); m.userData.pulse = true; }
    if (selected) this.square(selected, 0x7fe0c4, 0.45);
    for (const t of targets) this.dot(t.to, !!t.captured);
  }
  mark(squares, color = 0x6fd3ff, opacity = 0.45) { for (const s of squares) { const m = this.square(s, color, opacity); m.userData.pulse = true; } }
  arrows(list = []) {
    for (const c of [...this.arrowsG.children]) this.arrowsG.remove(c);
    for (const a of list) {
      const [x0, z0] = sqXZ(a.from), [x1, z1] = sqXZ(a.to), dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      const s = new THREE.Shape(), w = 0.09, hw = 0.26, hl = 0.36, L = len - 0.18;
      s.moveTo(0, -w); s.lineTo(L - hl, -w); s.lineTo(L - hl, -hw); s.lineTo(L, 0); s.lineTo(L - hl, hw); s.lineTo(L - hl, w); s.lineTo(0, w); s.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: a.color ?? 0x4fd1a5, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(-dz, dx); m.position.set(x0, 0.03, z0); m.renderOrder = 3; this.arrowsG.add(m);
    }
  }
  stars(squares = []) {
    for (const c of [...this.starsG.children]) this.starsG.remove(c);
    for (const sq of squares) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.starTex, transparent: true, depthWrite: false })); const [x, z] = sqXZ(sq); s.position.set(x, 0.45, z); s.scale.setScalar(0.7); s.userData.sq = sq; this.starsG.add(s); }
  }
  takeStar(sq) { const s = this.starsG.children.find((c) => c.userData.sq === sq); if (!s) return false; this.sparks(sq, 0xffd27a, 40); this.tween(350, (u) => { s.scale.setScalar(0.7 + u * 0.6); s.material.opacity = 1 - u; s.position.y = 0.45 + u * 0.8; }).then(() => this.starsG.remove(s)); return true; }
  sparks(sq, color = 0xffe2a8, n = 26) {
    const [x, z] = sqXZ(sq);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.starTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.12 + Math.random() * 0.12);
      s.position.set(x, 0.2, z); const v = new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 2.4); this.scene.add(s);
      this.tween(600 + Math.random() * 400, (u) => { s.position.set(x + v.x * u * 0.6, 0.2 + v.y * u * 0.6 - u * u * 1.2, z + v.z * u * 0.6); s.material.opacity = 1 - u; }).then(() => this.scene.remove(s));
    }
  }
  // ------------------------------------------------------------ input: tap-tap or drag, finger or mouse
  squareAt(e) {
    const r = this.canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam); const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), p)) return null;
    const f = Math.floor(p.x + 4), rk = Math.floor(4 - p.z); if (f < 0 || f > 7 || rk < 0 || rk > 7) return null;
    return { sq: FILES[f] + (rk + 1), p };
  }
  input() {
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      const hit = this.squareAt(e); if (!hit) return; this.onSquare?.(hit.sq);
      if (!this.interactive) return;
      const g = this.pieces.get(hit.sq);
      if (this.sel && this.sel !== hit.sq && this.legalFor(this.sel).some((m) => m.to === hit.sq)) { const from = this.sel; this.select(null); this.onMove?.(from, hit.sq); return; }
      if (g && g.userData.color === this.interactive) { this.select(hit.sq); drag = { sq: hit.sq, g, moved: false }; this.canvas.setPointerCapture(e.pointerId); return; }
      this.select(null);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag) return; const hit = this.squareAt(e); if (!hit) return;
      drag.moved = true; drag.g.position.set(hit.p.x, 0.35, hit.p.z);
    });
    const up = (e) => {
      if (!drag) return; const d = drag; drag = null; const hit = this.squareAt(e);
      if (!d.moved) return; // a tap: the piece stays selected, the next tap chooses the square
      if (hit && hit.sq !== d.sq && this.legalFor(d.sq).some((m) => m.to === hit.sq)) { this.select(null); const [x, z] = sqXZ(d.sq); d.g.position.set(x, 0, z); this.onMove?.(d.sq, hit.sq); }
      else { const [x, z] = sqXZ(d.sq); this.tween(150, (u) => d.g.position.y = 0.35 * (1 - u)).then(() => d.g.position.set(x, 0, z)); }
    };
    this.canvas.addEventListener('pointerup', up); this.canvas.addEventListener('pointercancel', up);
  }
  select(sq) {
    this.sel = sq; const base = this.baseMarks || {};
    if (!sq) { this.highlight(base); return; }
    const g = this.pieces.get(sq); if (g) this.tween(140, (u) => { g.position.y = 0.12 * Math.sin(u * Math.PI); });
    this.highlight({ ...base, selected: sq, targets: this.legalFor(sq) });
  }
  setBase(marks) { this.baseMarks = marks; this.highlight(marks); }
  // ------------------------------------------------------------ every frame
  frame(t) {
    const now = performance.now();
    for (let i = this.tweens.length - 1; i >= 0; i--) { const w = this.tweens[i], u = Math.min(1, (now - w.t0) / w.ms); w.f(u); if (u >= 1) { this.tweens.splice(i, 1); w.res(); } }
    for (const s of this.starsG.children) { s.position.y = 0.45 + Math.sin(t * 2.2 + s.position.x) * 0.06; s.material.rotation = Math.sin(t + s.position.z) * 0.3; }
    for (const m of this.fx.children) if (m.userData.pulse) m.material.opacity = 0.35 + 0.2 * Math.sin(t * 5);
    if (this.cine) { // the home screen: a slow, low orbit around the game, like a camera on a dolly
      const a = t * 0.045 + 0.6, R = this.cam.aspect < 0.8 ? 12.5 : 8.6; this.scene.fog.near = 12; this.scene.fog.far = 30; this.cam.clearViewOffset(); this.cam.position.set(Math.sin(a) * R, R * 0.36, Math.cos(a) * R); this.cam.lookAt(0, 0.2, 0); this.cam.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.cam);
  }
  setCine(on) { this.cine = on; if (!on) this.resize(); }
}
