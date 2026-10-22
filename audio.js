// Sound design, no voices and no music bed: CORPUS ElevenLabs SFX + a procedural bell whose pitch climbs
// with each revealed point. Silence between clicks is deliberate, the room hears the speaker, not a soundtrack.
let ctx, master, verb, muted = false;
const raw = {}, buf = {};
const NAMES = ['whoosh_a', 'whoosh_b', 'ui_tick', 'ui_open', 'dust', 'awaken', 'membrane', 'spark', 'heartbeat'];
export const prefetch = Promise.all(NAMES.map((n) => fetch(`audio/${n}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && (raw[n] = b)).catch(() => null)));

// tiny synthetic hall so the bell blooms instead of clicking
function impulse(sec = 2.8) {
  const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  return b;
}
export async function unlock() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
  verb = ctx.createConvolver(); verb.buffer = impulse(); const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg); vg.connect(master);
  await prefetch;
  await Promise.all(Object.entries(raw).map(async ([n, b]) => { try { buf[n] = await ctx.decodeAudioData(b.slice(0)); } catch { /* skip */ } }));
}
export function play(name, vol = 0.6, rate = 1) {
  if (!ctx || !buf[name]) return;
  const s = ctx.createBufferSource(); s.buffer = buf[name]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); g.connect(verb); s.start();
}
// pentatonic bell: each new point sits one note higher than the last
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
export function bell(step, root = 220, vol = 0.12) {
  if (!ctx) return;
  const t = ctx.currentTime, f = root * Math.pow(2, SCALE[Math.min(step, SCALE.length - 1)] / 12);
  const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + 0.008); out.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  out.connect(master); out.connect(verb);
  for (const [m, a] of [[1, 1], [2.01, 0.35], [3.99, 0.12]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.value = a;
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.7);
  }
}
export function setMuted(m) { muted = m; if (master) master.gain.linearRampToValueAtTime(m ? 0 : 0.9, ctx.currentTime + 0.4); }
export const isMuted = () => muted;
export const ready = () => !!ctx && ctx.state === 'running';
