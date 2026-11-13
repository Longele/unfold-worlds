// La Grande Chasse: the real room (Android, WebXR). The phone follows its own moves through the room (ARCore), so
// Pixo stays where he is when the children walk around him. A fan of rays from the phone keeps probing the real
// surfaces: the lowest wide one is the floor; flat patches 20 to 90 cm above it (a chair, the sofa, a low table,
// the bed) become perches Pixo can climb onto. With depth sensing, whatever real thing stands between the phone and
// Pixo hides him (he can be behind the sofa). Nothing leaves the phone.
import * as THREE from 'three';

export async function xrSupported() {
  try { return !!navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar')); } catch { return false; }
}

const CELL = 0.1;                      // the surface map: 10 cm squares on the ground plan
const key = (x, z) => `${Math.round(x / CELL)},${Math.round(z / CELL)}`;

export class World {
  constructor(room) {
    this.room = room; this.session = null; this.ref = null; this.sources = []; this.cells = new Map();
    this.floorY = null; this.perches = []; this.center = null; this._t = 0;
    this.depthOk = false; this.depthFlip = null; this._dErr = [0, 0, 0]; this.feetSeen = 1;
    // the occlusion mask: a small grid laid over Pixo's picture, 1 = seen, 0 = something real in front of him
    this.GW = 12; this.GH = 22; this.mask = new Uint8Array(this.GW * this.GH * 4).fill(255);
    this.maskTex = new THREE.DataTexture(this.mask, this.GW, this.GH, THREE.RGBAFormat); this.maskTex.magFilter = this.maskTex.minFilter = THREE.LinearFilter; this.maskTex.needsUpdate = true;
  }
  get active() { return !!this.session; }

  // must be called from a tap (the browser asks for it)
  async start(overlay) {
    const init = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'depth-sensing'],
      domOverlay: { root: overlay },
      depthSensing: { usagePreference: ['cpu-optimized'], dataFormatPreference: ['luminance-alpha', 'float32'] },
    };
    const s = await navigator.xr.requestSession('immersive-ar', init);
    const r = this.room.renderer; r.xr.enabled = true; r.xr.setReferenceSpaceType('local');
    await r.xr.setSession(s);
    this.session = s; this.ref = r.xr.getReferenceSpace(); this.cells.clear(); this.perches = []; this.floorY = null; this.center = null;
    this.depthOk = s.depthUsage === 'cpu-optimized'; this.depthFlip = null; this._dErr = [0, 0, 0];
    const viewer = await s.requestReferenceSpace('viewer');
    // the fan of probing rays: the middle of the screen first (where the child points), then around it
    const dirs = [[0, 0]]; for (const y of [-0.55, -0.3, 0, 0.25]) for (const x of [-0.45, -0.2, 0.2, 0.45]) dirs.push([x, y]); dirs.push([0, -0.3], [0, -0.55]);
    this.sources = [];
    for (const [x, y] of dirs) {
      try { this.sources.push(await s.requestHitTestSource({ space: viewer, offsetRay: new XRRay({ x: 0, y: 0, z: 0, w: 1 }, { x, y, z: -1, w: 0 }) })); } catch { }
    }
    s.addEventListener('end', () => this._ended());
    return true;
  }
  async end() { if (!this.session) return; const s = this.session; try { await s.end(); } catch { this._ended(); } }
  _ended() {
    if (!this.session) return;
    for (const h of this.sources) { try { h.cancel(); } catch { } } this.sources = [];
    this.session = null; this.room.renderer.xr.enabled = false; this.onEnd?.();
  }

  // every XR frame: read the probes, keep the surface map, and the occlusion mask
  update(frame, now) {
    if (!this.session || !frame) return;
    const up = new THREE.Vector3(), q = new THREE.Quaternion();
    this.center = null;
    this.sources.forEach((src, i) => {
      let res; try { res = frame.getHitTestResults(src); } catch { return; }
      const pose = res?.[0]?.getPose(this.ref); if (!pose) return;
      const p = pose.transform.position, o = pose.transform.orientation; q.set(o.x, o.y, o.z, o.w); up.set(0, 1, 0).applyQuaternion(q);
      const flat = up.y > 0.9, pt = new THREE.Vector3(p.x, p.y, p.z);
      if (i === 0) this.center = { p: pt, flat };
      if (flat) this._add(pt, now);
    });
    if (now - this._t > 400) { this._t = now; this._analyse(); }
    if (this.depthOk) this._depth(frame);
  }
  _add(p, now) {
    const k = key(p.x, p.z), c = this.cells.get(k);
    if (!c) { this.cells.set(k, { x: Math.round(p.x / CELL) * CELL, z: Math.round(p.z / CELL) * CELL, y: p.y, n: 1, t: now }); return; }
    if (Math.abs(c.y - p.y) > 0.12) { c.y = p.y; c.n = 1; } else { c.y += (p.y - c.y) * 0.3; c.n = Math.min(50, c.n + 1); }
    c.t = now;
  }
  // the floor = the lowest height shared by many squares; perches = groups of flat squares higher up
  _analyse() {
    const cs = [...this.cells.values()].filter((c) => c.n >= 2); if (cs.length < 4) return;
    const ys = cs.map((c) => c.y).sort((a, b) => a - b);
    for (let i = 0; i < ys.length; i++) { const n = ys.filter((y) => Math.abs(y - ys[i]) < 0.05).length; if (n >= 5) { const f = ys[i]; this.floorY = this.floorY == null ? f : this.floorY + (f - this.floorY) * 0.4; break; } }
    if (this.floorY == null) return;
    const hi = cs.filter((c) => c.y > this.floorY + 0.2 && c.y < this.floorY + 0.9), seen = new Set(), out = [];
    const at = new Map(hi.map((c) => [key(c.x, c.z), c]));
    for (const c of hi) {
      const k0 = key(c.x, c.z); if (seen.has(k0)) continue;
      const grp = [], st = [c]; seen.add(k0);
      while (st.length) { const a = st.pop(); grp.push(a); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = key(a.x + dx * CELL, a.z + dz * CELL), b = at.get(k); if (b && !seen.has(k) && Math.abs(b.y - a.y) < 0.06) { seen.add(k); st.push(b); } } }
      if (grp.length < 5) continue;
      const x = grp.reduce((s, g) => s + g.x, 0) / grp.length, z = grp.reduce((s, g) => s + g.z, 0) / grp.length, y = grp.reduce((s, g) => s + g.y, 0) / grp.length;
      out.push({ x, y, z, cells: grp, size: grp.length });
    }
    this.perches = out;
  }
  // the nearest perch to `from` (on the ground plan), with the spot on its edge where he lands and the floor spot
  // just outside it where he jumps from
  perchNear(from, maxD = 2.6) {
    let best = null, bd = maxD;
    for (const pr of this.perches) {
      for (const c of pr.cells) { const d = Math.hypot(c.x - from.x, c.z - from.z); if (d < bd) { bd = d; best = { pr, c }; } }
    }
    if (!best) return null;
    const { pr, c } = best, toIn = new THREE.Vector2(pr.x - c.x, pr.z - c.z), len = toIn.length() || 1; toIn.divideScalar(len);
    const top = new THREE.Vector3(c.x + toIn.x * Math.min(0.12, len), pr.y, c.z + toIn.y * Math.min(0.12, len));
    const base = new THREE.Vector3(c.x - toIn.x * 0.22, this.floorY, c.z - toIn.y * 0.22);
    return { top, base, perch: pr, d: bd };
  }
  onPerch(p) { return this.floorY != null && p.y > this.floorY + 0.15; }

  // ---------------------------------------------------------------- depth: what real things hide Pixo
  _depth(frame) {
    const R = this.room, P = R.pixo; if (!P.g.visible) return;
    let view, di; try { view = frame.getViewerPose(this.ref)?.views?.[0]; di = view && frame.getDepthInformation(view); } catch { this.depthOk = false; return; }
    if (!di) return;
    const cam = R.cam, card = P.card; card.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(cam.matrixWorld).invert(), v = new THREE.Vector3(), w = new THREE.Vector3();
    const sample = (x, y) => { if (x < 0 || x > 1 || y < 0 || y > 1) return null; try { return di.getDepthInMeters(x, y); } catch { return null; } };
    // which way up are the depth picture's coordinates? decide once, from the floor under his feet (it must be as far
    // from the phone as his feet are)
    if (this.depthFlip == null) {
      w.copy(P.g.position); v.copy(w).applyMatrix4(inv); const far = -v.z; w.project(cam);
      if (far > 0.3 && Math.abs(w.x) < 0.9 && Math.abs(w.y) < 0.9) {
        const a = sample((w.x + 1) / 2, (1 - w.y) / 2), b = sample((w.x + 1) / 2, (1 + w.y) / 2);
        // only frames where one reading matches (his feet may be hidden behind something)
        if (a && b && Math.min(Math.abs(a - far), Math.abs(b - far)) < 0.25) { this._dErr[0] += Math.abs(a - far); this._dErr[1] += Math.abs(b - far); if (++this._dErr[2] >= 20) this.depthFlip = this._dErr[1] < this._dErr[0]; }
      }
      return;
    }
    const W = card.geometry.parameters.width, H = card.geometry.parameters.height, m = this.mask;
    for (let j = 0; j < this.GH; j++) for (let i = 0; i < this.GW; i++) {
      v.set((i + 0.5) / this.GW * W - W / 2, (j + 0.5) / this.GH * H - H / 2, 0).applyMatrix4(card.matrixWorld);
      const dz = -w.copy(v).applyMatrix4(inv).z; v.project(cam);
      const real = sample((v.x + 1) / 2, this.depthFlip ? (1 + v.y) / 2 : (1 - v.y) / 2);
      const hidden = real != null && real > 0.15 && real < dz - 0.1;
      const o = (j * this.GW + i) * 4, target = hidden ? 0 : 255; m[o] += (target - m[o]) * 0.5; m[o + 1] = m[o + 2] = m[o]; m[o + 3] = 255;
    }
    // his feet (the bottom of the grid, where his shadow lies): seen or hidden
    let f = 0; for (let i = 0; i < this.GW; i++) f += m[i * 4] + m[(this.GW + i) * 4]; this.feetSeen = f / (2 * this.GW * 255);
    this.maskTex.needsUpdate = true;
  }
  clearMask() { this.mask.fill(255); this.maskTex.needsUpdate = true; }
}
