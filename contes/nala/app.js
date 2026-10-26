// Nala et la fusée en carton: the comic reader of Lina and Noé, taken further. The child uses the device itself:
// shouts the countdown into the microphone, steers the rocket between the satellites (tilt, finger, mouse or
// arrow keys), blows the moon dust off the window, jumps in low gravity, leaves footprints, lights a dark crater,
// finds Africa with the binoculars and turns the Moon through its phases. Everything also works on a laptop:
// every phone gesture has a mouse or keyboard twin, and the microphone always has a button to fall back on.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610260500';

const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à vivre', back: '← Les contes', parents: 'Pour les parents : cette histoire peut utiliser le micro, pour crier et souffler. Rien n’est enregistré. Sans micro, un bouton fait la même chose.', keys: 'Espace ou → : suivant',
    tape: 'Touche les morceaux à coller', lamp1: 'Touche la lampe', shout: 'Crie « décollage ! »', shoutBtn: 'Appuie longtemps ici', steer: 'Penche, glisse ou utilise les flèches', binocs: 'Glisse les jumelles sur la Terre', bubbles: 'Touche les bulles d’eau', blow: 'Souffle sur le hublot', blowBtn: 'ou frotte avec ton doigt', jump: 'Touche Nala pour sauter', prints: 'Touche le sol', lamp: 'Promène la lampe dans le cratère', silent: 'Touche Bip', choice: 'Choisis ton retour', chutes: 'Touche les parachutes', phases: 'Glisse pour faire tourner la Lune', earth: 'Terre', moon: 'Lune', ph: ['Nouvelle lune', 'Croissant', 'Premier quartier', 'Lune gibbeuse', 'Pleine lune', 'Lune gibbeuse', 'Dernier quartier', 'Croissant'] },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to live', back: '← Stories', parents: 'For parents: this story can use the microphone, to shout and to blow. Nothing is recorded. Without a microphone, a button does the same.', keys: 'Space or →: next',
    tape: 'Touch the pieces to tape', lamp1: 'Touch the lamp', shout: 'Shout “lift-off!”', shoutBtn: 'Press and hold here', steer: 'Tilt, slide or use the arrow keys', binocs: 'Slide the binoculars over the Earth', bubbles: 'Touch the water bubbles', blow: 'Blow on the window', blowBtn: 'or rub it with your finger', jump: 'Touch Nala to jump', prints: 'Touch the ground', lamp: 'Move the lamp around the crater', silent: 'Touch Bip', choice: 'Choose how you return', chutes: 'Touch the parachutes', phases: 'Slide to turn the Moon', earth: 'Earth', moon: 'Moon', ph: ['New moon', 'Crescent', 'First quarter', 'Gibbous moon', 'Full moon', 'Gibbous moon', 'Last quarter', 'Crescent'] },
};
let T = TT[lang];
function applyLang() {
  T = TT[lang]; document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  $('title').textContent = TITLE[lang]; document.querySelector('.kick').textContent = T.kick; document.querySelector('.back').textContent = T.back;
  for (const el of document.querySelectorAll('a[href^="../"]')) el.href = `../?lang=${lang}`;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
  fetch(`voice/${lang}/timings.json?v=202610260500`).then((r) => r.json()).then((j) => (timings = j));
}
for (const b of document.querySelectorAll('[data-lang]')) b.onclick = () => { lang = b.dataset.lang; store.set('contes-lang', lang); applyLang(); };

let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
applyLang();

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and theme
const SFX = ['page', 'pop', 'found', 'tap', 'tape', 'click', 'rumble', 'launch', 'bonk', 'binocs', 'bloop', 'whoosh', 'land', 'boing', 'step', 'lamp', 'sparkle', 'radio', 'chute', 'splash', 'thud', 'yawn', 'chime'];
async function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
  SFX.forEach(async (n) => { try { const r = await fetch(`sfx/${n}.mp3`); sfxBuf[n] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch {} });
}
// the mix: the storyteller always on top. Effects sit about 12 dB under the voice and dip further while
// someone speaks; the theme and the ambience duck under every line and come back between lines.
const SFX_GAIN = 0.3; let speaking = false;
function sfx(n, vol = 1) { const b = sfxBuf[n]; if (!ctx || !b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol * SFX_GAIN * (speaking ? 0.55 : 1); s.connect(g).connect(ctx.destination); s.start(); }
const music = new Audio('sfx/theme.mp3'); music.loop = true; music.volume = 0.22;
const amb = new Audio(); amb.loop = true; amb.volume = 0.35;
const AMB = { 'amb-room': 0.35, 'amb-night': 0.4, 'amb-cabin': 0.35, 'amb-space': 0.4, 'amb-moon': 0.4, 'amb-sea': 0.4, 'amb-plain': 0.4, 'amb-morning': 0.35 }; let ambLevel = 0.35;
function ambience(n) { const src = `sfx/${n}.mp3`; ambLevel = AMB[n] ?? 0.35; if (!amb.src.endsWith(src)) { amb.src = src; amb.play().catch(() => {}); } fade(amb, ambLevel * (speaking ? 0.45 : 1)); }
const fades = new Map();
function fade(el, to, ms = 350) { clearInterval(fades.get(el)); const from = el.volume, t0 = performance.now(); fades.set(el, setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) clearInterval(fades.get(el)); }, 30)); }
function duck(on) { speaking = on; fade(music, on ? 0.08 : 0.22); fade(amb, ambLevel * (on ? 0.45 : 1)); }
const voice = new Audio(); voice.preload = 'auto';
// a short buzz on phones that can (Android); elsewhere the panel shakes and the sound does the work
const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };

// ---------------------------------------------------------------- the microphone: how loud the child is (0 to 1)
// Asked for only when a panel needs it; refused or missing, the interaction falls back to a button or the finger.
let micAn = null, micBuf = null, micAsked = false;
async function micOn() {
  if (micAn || micAsked) return !!micAn; micAsked = true;
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    const src = ctx.createMediaStreamSource(st); micAn = ctx.createAnalyser(); micAn.fftSize = 1024; micBuf = new Float32Array(micAn.fftSize); src.connect(micAn);
    return true;
  } catch { return false; }
}
function micLevel() {
  if (!micAn) return 0; micAn.getFloatTimeDomainData(micBuf); let s = 0; for (const v of micBuf) s += v * v;
  return Math.min(1, Math.sqrt(s / micBuf.length) * 6); // a normal voice is around 0.1 to 0.3, a shout above 0.5
}

// ---------------------------------------------------------------- the keyboard (laptops): an interaction may take the keys
let keyAct = null; const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.key);
  if (keyAct?.(e, true)) { e.preventDefault(); return; }
  if ([' ', 'Enter', 'ArrowRight'].includes(e.key) && idx >= 0) { e.preventDefault(); next(); }
});
addEventListener('keyup', (e) => { keys.delete(e.key); keyAct?.(e, false); });

// ---------------------------------------------------------------- the panel
function wordsOf(id) { return timings[id]?.words || []; }
function showLine(ln) {
  const words = wordsOf(ln.id), el = document.createElement('div');
  if (ln.cap) for (const c of $('layer').querySelectorAll('.cap')) c.remove(); // one narration box at a time
  else { const old = [...$('layer').querySelectorAll('.bubble')]; if (old.length >= 2) { old[0]._tail?.remove(); old[0].remove(); } } // two bubbles at most, the oldest leaves first
  el.className = ln.cap ? 'cap' : 'bubble ' + (WHO[timings[ln.id]?.who] || '');
  // a lone ! ? : ; stays on the line of the word before it (French puts a space before them)
  el.innerHTML = words.map((w, i) => (i && /^[!?:;»]+$/.test(w.w) ? '&nbsp;' : i ? ' ' : '') + `<span data-i="${i}">${w.w}</span>`).join('');
  if (!ln.cap) { el.style.left = ln.b[0] * 100 + '%'; el.style.top = ln.b[1] * 100 + '%'; }
  $('layer').append(el);
  if (!ln.cap) requestAnimationFrame(() => tail(el, ln.t));
  sfx('pop', 0.45);
  return el;
}
// the bubble's tail: a curved wedge from the bubble towards the one who speaks
function tail(el, t) {
  const P = $('panel').getBoundingClientRect(), r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2 - P.left, cy = r.top + r.height / 2 - P.top, tx = t[0] * P.width, ty = t[1] * P.height;
  const dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const edge = Math.min(r.width / 2 / Math.max(0.01, Math.abs(ux)), r.height / 2 / Math.max(0.01, Math.abs(uy))) - 4;
  const bx = cx + ux * edge, by = cy + uy * edge, tip = Math.min(len - edge - 12, 70), px = bx + ux * tip, py = by + uy * tip, w = 13;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'tail'); s.setAttribute('viewBox', `0 0 ${P.width} ${P.height}`);
  s.innerHTML = `<path d="M${bx - uy * w},${by + ux * w} Q${(bx + px) / 2 + uy * 4},${(by + py) / 2 - ux * 4} ${px},${py} Q${(bx + px) / 2 - uy * 2},${(by + py) / 2 + ux * 2} ${bx + uy * w},${by - ux * w} Z"/>`;
  $('layer').insertBefore(s, el); el._tail = s;
}
// the last line read on this panel, so the child can hear an instruction again
let last = null;
async function say(ln) {
  const el = showLine(ln); last = { ln, el };
  if (mode !== 'voice') { await sleep(300); return el; }
  return speak(ln, el);
}
// each reading has its own number, so a line started over another one (a replay) ends the older one cleanly
let tok = 0;
async function speak(ln, el) {
  const me = ++tok; voice.src = `voice/${lang}/${ln.id}.mp3`; duck(true);
  try { await voice.play(); } catch { duck(false); return el; }
  const words = wordsOf(ln.id), spans = el.querySelectorAll('span');
  await new Promise((res) => {
    const tick = () => {
      const t = voice.currentTime;
      spans.forEach((s, i) => s.classList.toggle('on', words[i] && t >= words[i].s - 0.03 && t < (words[i + 1]?.s ?? 99)));
      if (me !== tok) { spans.forEach((s) => s.classList.remove('on')); res(); }
      else if (voice.ended || voice.paused) { spans.forEach((s) => s.classList.remove('on')); duck(false); res(); } else requestAnimationFrame(tick);
    };
    tick();
  });
  await sleep(250);
  return el;
}
// the speaker button: read the last line again (also in "I read it myself" mode), never over another line
async function replay() {
  if (!last || !voice.paused || replaying) return; replaying = true; $('replay').classList.add('busy');
  const { ln } = last; let el = last.el;
  if (!el.isConnected) { el = showLine(ln); last.el = el; }
  await speak(ln, el); replaying = false; $('replay').classList.remove('busy');
}
let replaying = false;
$('replay').onclick = (e) => { e.stopPropagation(); replay(); };
function clearLayer() { $('layer').innerHTML = ''; $('spots').innerHTML = ''; }


function word(text, at) { const el = document.createElement('div'); el.className = 'pow'; el.textContent = text; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.setProperty('--r', (Math.random() * 16 - 8).toFixed(1) + 'deg'); $('layer').append(el); setTimeout(() => el.remove(), 1600); }
// the instruction under the panel; the speaker button nods once so the child knows it can listen again
function hint(text) { $('hint').textContent = text || ''; $('hint').classList.toggle('on', !!text); if (text) { const r = $('replay'); r.classList.remove('nod'); void r.offsetWidth; r.classList.add('nod'); } }
function spot(at, r, cls = '') { const el = document.createElement('button'); el.className = 'spot ' + cls; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.width = el.style.height = (r * 2 * 100) + '%'; $('spots').append(el); return el; }
const toPanel = (e) => { const r = $('panel').getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
const near = (p, q, r) => Math.hypot((p[0] - q[0]) * FW, (p[1] - q[1]) * FH) < r * FW;
// one finger on the panel: down, move and up handlers, removed when the interaction ends
function drag(on) {
  const P = $('panel'); let down = false;
  P.onpointerdown = (e) => { e.preventDefault(); down = true; try { P.setPointerCapture(e.pointerId); } catch {} on.down?.(toPanel(e), e); };
  P.onpointermove = (e) => { if (down || (on.hover && e.pointerType === 'mouse')) on.move?.(toPanel(e), down); };
  P.onpointerup = P.onpointercancel = (e) => { if (!down) return; down = false; on.up?.(toPanel(e)); };
  return () => { P.onpointerdown = P.onpointermove = P.onpointerup = P.onpointercancel = null; };
}
// a circle that draws itself around what was found
function ring(at) { const el = document.createElement('div'); el.className = 'foundring'; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; $('layer').append(el); setTimeout(() => el.remove(), 2600); }

// ---------------------------------------------------------------- the binoculars and the helmet lamp
// The picture drawn enlarged inside the two round views, or lit only where the lamp points, so what the child
// looks for appears exactly under the finger.
function lensTool(kind, a) {
  return new Promise((res) => {
    hint(T[kind]); sfx(kind === 'lamp' ? 'lamp' : 'binocs');
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = kind === 'binocs' ? 3 : 1;
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now();
    const R = () => FW * (kind === 'binocs' ? 0.17 : 0.24);
    // the binoculars show two round views side by side
    const centres = () => kind === 'binocs' ? [[pos[0] * FW - R() * 0.78, pos[1] * FH], [pos[0] * FW + R() * 0.78, pos[1] * FH]] : [[pos[0] * FW, pos[1] * FH]];
    const draw = () => {
      if (done) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last, x = pos[0] * FW, y = pos[1] * FH; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'lamp') {
        // the dark crater, with the pool of light of Nala's helmet lamp
        L.fillStyle = 'rgba(6,4,12,0.94)'; L.fillRect(0, 0, FW, FH);
        const r = R() * (1 + Math.sin(now / 90) * 0.03), gr = L.createRadialGradient(x, y, r * 0.15, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        L.globalCompositeOperation = 'destination-out'; L.fillStyle = gr; L.beginPath(); L.arc(x, y, r, 0, 7); L.fill(); L.globalCompositeOperation = 'source-over';
        L.fillStyle = 'rgba(255,170,60,0.12)'; L.beginPath(); L.arc(x, y, r * 0.8, 0, 7); L.fill();
        L.fillStyle = '#ffd27a'; L.beginPath(); L.ellipse(x, y - 4, 5, 9, 0, 0, 7); L.fill(); L.fillStyle = '#8a4b1f'; L.beginPath(); L.ellipse(x, y + 9, 13, 6, 0, 0, 7); L.fill();
      } else {
        L.fillStyle = 'rgba(4,6,14,0.85)'; L.fillRect(0, 0, FW, FH);
        L.save(); L.beginPath(); for (const [cx, cy] of centres()) { L.moveTo(cx + R(), cy); L.arc(cx, cy, R(), 0, 7); } L.clip(); L.clearRect(0, 0, FW, FH);
        const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
        L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH);
        L.restore();
        for (const [cx, cy] of centres()) { L.lineWidth = 7; L.strokeStyle = '#1c1c1c'; L.beginPath(); L.arc(cx, cy, R(), 0, 7); L.stroke(); L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(cx, cy, R() - 5, 3.6, 4.6); L.stroke(); }
      }
      // found: what was hidden stays in the light (or under the glass) for a moment
      held = near(pos, a.at, a.r) ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(a.at[0], a.at[1], 2, 50); // a little help after a while
      if (held > 380) { done = true; stop(); L.clearRect(0, 0, FW, FH); sfx('found'); burst(a.at[0], a.at[1], 46); ring(a.at); hint(''); res(); }
    };
    requestAnimationFrame(draw);
    const stop = drag({ hover: true, down: (p) => (pos = p), move: (p) => (pos = p) });
  });
}


// ---------------------------------------------------------------- effects: sparkles over the panel
const fx = $('fx'), g = fx.getContext('2d'), lens = $('lens'), L = lens.getContext('2d'); let FW = 0, FH = 0; const sparks = [];
// the layout size of the panel, not the box of a page still turning in 3D
function fitFx() { const d = Math.min(devicePixelRatio || 1, 2); FW = $('panel').clientWidth; FH = $('panel').clientHeight; for (const [c, k] of [[fx, g], [lens, L]]) { c.width = FW * d; c.height = FH * d; k.setTransform(d, 0, 0, d, 0, 0); } }
function burst(x, y, n = 26, hue = 45) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3.5; sparks.push({ x: x * FW, y: y * FH, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, hue: hue + Math.random() * 30 }); } }
function drawFx() {
  requestAnimationFrame(drawFx); g.clearRect(0, 0, FW, FH); g.globalCompositeOperation = 'lighter';
  for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.life -= 0.02; g.fillStyle = `hsla(${s.hue},100%,72%,${Math.max(0, s.life)})`; g.beginPath(); g.arc(s.x, s.y, 2.4 * s.life + 0.6, 0, 7); g.fill(); }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  g.globalCompositeOperation = 'source-over';
}
requestAnimationFrame(drawFx);
const shake = () => { const a = $('art'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); };
const img = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
// the meter under the panel (loudness, steering time)
const meter = (k) => { $('meter').classList.toggle('on', k != null); if (k != null) $('meter').style.setProperty('--m', Math.max(0, Math.min(1, k))); };
// a button under the panel for what the microphone would do (a child who cannot or will not use it)
function altButton(label) { const b = document.createElement('button'); b.className = 'alt'; b.textContent = label; $('panel').append(b); return b; }

// ---------------------------------------------------------------- the tools
const acts = {
  binocs: (a) => lensTool('binocs', a),
  lamp: (a) => lensTool('lamp', a),
  // touch each spot once (tape, water bubbles, parachutes)
  taps: (a) => new Promise((res) => {
    hint(T[a.hint]); let n = 0;
    for (const at of a.spots) {
      const s = spot(at, a.r, 'soft' + (a.float ? ' float' : ''));
      s.onpointerdown = (e) => { e.stopPropagation(); if (s.done) return; s.done = true; s.classList.add('done'); sfx(a.sfx); word(a.word[lang], [at[0], at[1] < 0.3 ? at[1] + 0.09 : at[1] - 0.06]); burst(at[0], at[1], 18, a.hue ?? 40); if (a.float) s.style.visibility = 'hidden'; if (++n === a.spots.length) { hint(''); setTimeout(res, 700); } };
    }
    // laptop: the space bar touches the next one
    keyAct = (e, down) => { if (down && e.key === ' ') { $('spots').querySelector('.spot:not(.done)')?.dispatchEvent(new PointerEvent('pointerdown')); if (n === a.spots.length) keyAct = null; return true; } };
  }),
  // the bedside lamp: touch it and the room goes dark under the moonlight
  switch: (a) => new Promise((res) => {
    hint(T.lamp1); const s = spot(a.at, a.r, 'soft');
    const go = () => { s.remove(); keyAct = null; sfx('click'); swapArt(a.after); hint(''); setTimeout(res, 1100); };
    s.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  // the countdown: the louder the child shouts, the faster the meter fills; a long press does it too
  shout: (a) => new Promise(async (res) => {
    hint(T.shout); meter(0); sfx('rumble', 0.6);
    const mic = await micOn(); let k = 0, held = false, done = false, last = performance.now();
    const alt = altButton(T.shoutBtn); alt.onpointerdown = (e) => { e.stopPropagation(); held = true; }; alt.onpointerup = alt.onpointerleave = alt.onpointercancel = () => (held = false);
    keyAct = (e, down) => { if (e.key === ' ') { held = down; return true; } };
    const tick = () => {
      if (done) return; const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const lv = mic ? micLevel() : 0;
      k += (lv > 0.18 ? lv * 0.9 : 0) * dt + (held ? 0.45 * dt : 0) - 0.04 * dt; k = Math.max(0, k); meter(k);
      if (lv > 0.18 || held) { if (Math.random() < 0.3) burst(0.5, 0.85, 3, 20); if (Math.random() < 0.05) shake(); }
      if (k >= 1) { done = true; keyAct = null; alt.remove(); meter(null); hint(''); launch(); return; }
      requestAnimationFrame(tick);
    };
    const launch = async () => { buzz([200, 80, 500]); sfx('launch'); shake(); await film(a.film); res(); };
    requestAnimationFrame(tick);
  }),
  // dodge the satellites: tilt the phone, drag, or use the arrow keys; bumping only costs a little time
  steer: (a) => new Promise(async (res) => {
    hint(T.steer); const [rk, st] = await Promise.all([img('art/rocket.png'), img('art/satellite.png')]);
    let x = 0.5, tilt = null, t0 = performance.now(), last = t0, hits = 0, done = false; const sats = [];
    const onTilt = (e) => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 25)); };
    addEventListener('deviceorientation', onTilt);
    const stop = drag({ hover: true, down: (p) => (x = p[0]), move: (p, down) => { if (down) x = p[0]; } });
    keyAct = (e) => ['ArrowLeft', 'ArrowRight'].includes(e.key);
    const RW = () => FW * 0.13, SW = () => FW * 0.17;
    const frame = (now) => {
      if (done) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const el = (now - t0) / 1000;
      if (keys.has('ArrowLeft')) x -= dt * 0.9; if (keys.has('ArrowRight')) x += dt * 0.9;
      if (tilt != null) x += tilt * dt * 0.9; x = Math.max(0.1, Math.min(0.9, x));
      if (Math.random() < dt * (1.1 + el * 0.05)) sats.push({ x: 0.1 + Math.random() * 0.8, y: -0.1, v: 0.22 + Math.random() * 0.12, r: Math.random() * 6.28, spin: (Math.random() - 0.5) * 2, hit: false });
      L.clearRect(0, 0, FW, FH);
      for (const s of sats) {
        s.y += s.v * dt; s.r += s.spin * dt;
        L.save(); L.translate(s.x * FW, s.y * FH); L.rotate(s.r); L.globalAlpha = s.hit ? 0.4 : 1; L.drawImage(st, -SW() / 2, -SW() * st.height / st.width / 2, SW(), SW() * st.height / st.width); L.restore();
        if (!s.hit && Math.abs(s.y - 0.72) < 0.05 && Math.abs(s.x - x) * FW < (RW() + SW()) * 0.38) { s.hit = true; hits++; t0 += 1200; sfx('bonk'); buzz(60); shake(); burst(x, 0.7, 16, 200); }
      }
      for (let i = sats.length - 1; i >= 0; i--) if (sats[i].y > 1.1) sats.splice(i, 1);
      const rh = RW() * rk.height / rk.width, wob = Math.sin(now / 120) * 2;
      L.drawImage(rk, x * FW - RW() / 2 + wob, FH * 0.72 - rh / 2, RW(), rh);
      meter(el / a.secs);
      if (el >= a.secs) { done = true; stop(); keyAct = null; removeEventListener('deviceorientation', onTilt); meter(null); L.clearRect(0, 0, FW, FH); sfx('found'); burst(x, 0.7, 40); hint(''); setTimeout(res, 600); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // blow the dust off the window (microphone), or rub it with a finger or the mouse
  blow: (a) => new Promise(async (res) => {
    hint(T.blow); const after = await img(`art/${a.after}.jpg`); const mic = await micOn();
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d');
    let done = false, lastS = 0;
    const paint = () => { L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over'; };
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const clear = (p, r) => { m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * r, 0, 7); m.fill(); paint(); const now = performance.now(); if (now - lastS > 400) { lastS = now; sfx('whoosh', 0.5); } check(); };
    const check = () => { if (!done && cover() > 0.62) { done = true; stop(); keyAct = null; alt.remove(); sfx('found'); swapArt(a.after); burst(0.5, 0.5, 40, 200); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(res, 900); } };
    const stop = drag({ down: (p) => clear(p, 0.09), move: (p, down) => down && clear(p, 0.09) });
    const alt = altButton(T.blowBtn); alt.onpointerdown = (e) => { e.stopPropagation(); for (let i = 0; i < 6; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.08); };
    keyAct = (e, down) => { if (down && e.key === ' ') { alt.onpointerdown(new PointerEvent('pointerdown')); return true; } };
    // a breath clears the dust from the middle of the window outwards
    const tick = () => { if (done) return; const lv = mic ? micLevel() : 0; if (lv > 0.12) for (let i = 0; i < 2; i++) { const ang = Math.random() * 6.28, rr = Math.random() * 0.33 * Math.min(1, cover() + 0.3); clear([a.c[0] + Math.cos(ang) * rr, a.c[1] + Math.sin(ang) * rr * FW / FH], 0.06 + lv * 0.05); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }),
  // jump in low gravity: Nala rises six times higher than on Earth and floats down slowly
  jump: (a) => new Promise(async (res) => {
    hint(T.jump); const im = document.createElement('img'); im.src = 'art/nala-jump.png'; im.className = 'sprite'; im.style.left = a.at[0] * 100 + '%'; im.style.top = a.at[1] * 100 + '%'; $('layer').append(im);
    const lines = document.createElement('div'); lines.className = 'heights'; lines.style.left = a.at[0] * 100 + '%'; lines.style.top = a.at[1] * 100 + '%';
    lines.innerHTML = `<i style="bottom:${(a.h / 6) * FH}px"><b>${T.earth}</b></i><i style="bottom:${a.h * FH}px"><b>${T.moon}</b></i>`; $('layer').append(lines);
    let n = 0, busyJ = false;
    const go = () => {
      if (busyJ) return; busyJ = true; sfx('boing'); lines.classList.add('on'); const t0 = performance.now(), D = 2600;
      const f = (now) => { const k = Math.min(1, (now - t0) / D), y = 4 * k * (1 - k) * a.h; im.style.transform = `translate(-50%, calc(-100% - ${y * FH}px)) rotate(${Math.sin(k * 6.28) * 6}deg)`; if (k < 1) requestAnimationFrame(f); else { sfx('step'); burst(a.at[0], a.at[1], 14, 30); busyJ = false; if (++n >= a.n) { keyAct = null; hint(''); setTimeout(res, 600); } } };
      requestAnimationFrame(f);
    };
    im.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  // footprints that stay: every touch presses a boot print into the dust
  prints: (a) => new Promise((res) => {
    hint(T.prints); let n = 0, side = 1;
    const print = (p) => {
      if (p[0] < a.box[0] || p[0] > a.box[2] || p[1] < a.box[1] || p[1] > a.box[3]) return;
      side = -side; const x = p[0] * FW + side * FW * 0.035, y = p[1] * FH, w = FW * 0.05, h = FW * 0.11;
      L.save(); L.translate(x, y); L.rotate(-0.15 * side); L.fillStyle = 'rgba(40,40,48,0.45)'; L.beginPath(); L.ellipse(0, 0, w, h, 0, 0, 7); L.fill();
      L.strokeStyle = 'rgba(20,20,26,0.55)'; L.lineWidth = 3; for (let i = -3; i <= 3; i++) { L.beginPath(); L.moveTo(-w * 0.75, i * h * 0.24); L.lineTo(w * 0.75, i * h * 0.24); L.stroke(); }
      L.restore(); sfx('step'); burst(p[0], p[1], 8, 220);
      if (++n >= a.n) { stop(); keyAct = null; sfx('found'); hint(''); setTimeout(res, 800); }
    };
    const stop = drag({ down: print });
    keyAct = (e, down) => { if (down && e.key === ' ') { print([a.box[0] + 0.15 + n * 0.15, a.box[3] - n * 0.12]); return true; } };
  }),
  // no air, no sound: Bip shouts and nothing is heard
  silent: (a) => new Promise((res) => {
    hint(T.silent); const s = spot(a.at, a.r, 'soft');
    const go = () => { s.remove(); keyAct = null; word('…', [a.at[0], a.at[1] - 0.12]); shake(); setTimeout(() => sfx('radio'), 1200); hint(''); setTimeout(res, 1600); };
    s.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  choice: (a) => new Promise((res) => {
    hint(T.choice);
    for (const o of a.opts) { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o[lang]; b.style.left = o.at[0] * 100 + '%'; b.style.top = o.at[1] * 100 + '%'; $('spots').append(b); b.onpointerdown = (e) => { e.stopPropagation(); sfx('found'); branch = o.go; hint(''); res(); }; }
  }),
  // the phases: the Sun always lights half of the Moon; turning it shows more or less of that half
  phases: (a) => new Promise(async (res) => {
    hint(T.phases); const mo = await img('art/moon.png'); let ph = 0.08, seen = 0, lastX = null, done = false;
    const label = document.createElement('div'); label.className = 'phase'; label.style.left = a.at[0] * 100 + '%'; label.style.top = (a.at[1] + a.r * FW / FH + 0.04) * 100 + '%'; $('layer').append(label);
    const draw = () => {
      const R = a.r * FW, cx = a.at[0] * FW, cy = a.at[1] * FH; L.clearRect(0, 0, FW, FH);
      L.save(); L.beginPath(); L.arc(cx, cy, R, 0, 7); L.clip(); L.drawImage(mo, cx - R, cy - R, R * 2, R * 2);
      // the shadow: one half of the disc (left while waxing, right while waning) and back along the terminator
      const c = Math.cos(ph * 2 * Math.PI), waxing = ph < 0.5; L.fillStyle = 'rgba(8,12,30,0.9)'; L.beginPath();
      L.arc(cx, cy, R + 1, -Math.PI / 2, Math.PI / 2, waxing); L.ellipse(cx, cy, Math.abs(c) * (R + 1) + 0.01, R + 1, 0, Math.PI / 2, -Math.PI / 2, waxing ? c > 0 : c < 0); L.fill();
      L.restore(); L.strokeStyle = 'rgba(255,255,255,0.18)'; L.lineWidth = 1.5; L.beginPath(); L.arc(cx, cy, R, 0, 7); L.stroke();
      label.textContent = T.ph[Math.round(ph * 8) % 8];
    };
    const turn = (d) => { if (done) return; ph = (ph + d + 1) % 1; seen += Math.abs(d); draw(); if (Math.random() < 0.3) burst(a.at[0], a.at[1], 2, 50); if (seen >= 1) { done = true; stop(); keyAct = null; sfx('chime'); burst(a.at[0], a.at[1], 40); hint(''); setTimeout(res, 900); } };
    draw();
    const stop = drag({ down: (p) => (lastX = p[0]), move: (p, down) => { if (!down || lastX == null) return; turn((p[0] - lastX) * 0.9); lastX = p[0]; }, up: () => (lastX = null) });
    keyAct = (e, down) => { if (down && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ')) { turn(e.key === 'ArrowLeft' ? -0.06 : 0.06); return true; } };
  }),
};
function swapArt(name) { if (!name) return; const im = new Image(); im.src = `art/${name}.jpg`; im.className = 'art over'; $('panel').insertBefore(im, $('fx')); requestAnimationFrame(() => im.classList.add('in')); }
// a short film played once over the panel (the lift-off); the panel waits for its end
function film(name) {
  return new Promise((res) => {
    const v = document.createElement('video'); v.className = 'art vid'; v.muted = true; v.playsInline = true; v.src = `art/${name}.mp4`;
    v.oncanplay = () => { v.classList.add('in'); v.play().catch(res); }; v.onended = res; v.onerror = res; $('panel').insertBefore(v, $('fx'));
    setTimeout(res, 9000);
  });
}

// ---------------------------------------------------------------- reading
async function show(i) {
  if (busy) return; busy = true; hint(''); $('next').classList.remove('on'); keyAct = null; meter(null);
  for (const b of document.querySelectorAll('.alt')) b.remove();
  const p = PANELS[i]; idx = i;
  sfx('page', 0.7);
  const page = $('page'); page.classList.remove('turn-in'); page.classList.add('turn-out'); await sleep(320);
  clearLayer(); last = null; sparks.length = 0; $('panel').onpointerdown = $('panel').onpointermove = $('panel').onpointerup = $('panel').onpointercancel = null; L.clearRect(0, 0, FW, FH);
  for (const el of document.querySelectorAll('#panel .art')) el.remove();
  const im = new Image(); im.className = 'art'; im.id = 'art'; im.src = `art/${p.img}.jpg`; await im.decode().catch(() => {});
  $('panel').style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; $('panel').insertBefore(im, $('fx'));
  $('ambient').style.backgroundImage = `url(art/${p.img}.jpg)`; // the same picture, blurred, around the panel on wide screens
  page.classList.remove('turn-out'); page.classList.add('turn-in'); fitFx();
  $('dots').innerHTML = PANELS.filter((x) => !x.branch || x.id === branch).map((x) => `<i class="${x.id === p.id ? 'on' : ''}"></i>`).join('');
  ambience(p.amb);
  await sleep(450);
  if (p.sfx) { sfx(p.sfx); await sleep(1200); } // the panel's own sound first, then the story
  for (const ln of p.lines) await say(ln);
  if (p.act) { await acts[p.act.kind](p.act); for (const ln of p.act.then || []) { if (ln.sfx) { sfx(ln.sfx); await sleep(900); } await say(ln); } }
  busy = false; $('next').classList.add('on');
  if (i === PANELS.length - 1) setTimeout(end, 1800);
}
function next() {
  if (busy || idx < 0) return;
  const p = PANELS[idx];
  if (idx === PANELS.length - 1) return end();
  let n = idx + 1;
  if (p.act?.kind === 'choice') n = PANELS.findIndex((x) => x.id === branch);
  else if (p.branch) n = PANELS.findIndex((x) => x.id === AFTER_BRANCH);
  show(n);
}
function end() { $('endcard').classList.add('on'); music.volume = 0.35; }
// no long-press menu or text selection anywhere in the book (Android Chrome opens one on a held image)
addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.target.closest('#panel')) e.preventDefault(); }, { passive: false });
$('page').addEventListener('pointerdown', (e) => { if (e.target.closest('button') || busy) return; next(); });
$('next').onclick = next;
async function start(m) {
  mode = m; await initAudio(); music.play().catch(() => {});
  document.body.classList.add('reading'); $('cover').classList.add('gone');
  // phones that ask before sharing their tilt (iPhone): ask now, inside the tap that starts the story
  try { await DeviceOrientationEvent?.requestPermission?.(); } catch {}
  try { if (matchMedia('(pointer: coarse)').matches) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  branch = null; show(0);
}
$('readMe').onclick = () => start('voice');
$('readSelf').onclick = () => start('self');
$('again').onclick = () => { $('endcard').classList.remove('on'); branch = null; show(0); };
addEventListener('resize', () => { if (idx >= 0) fitFx(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); amb.pause(); voice.pause(); } else if (idx >= 0) { music.play().catch(() => {}); amb.play().catch(() => {}); } });
window.__nala = { get idx() { return idx; }, get busy() { return busy; }, next, show, get branch() { return branch; } };
