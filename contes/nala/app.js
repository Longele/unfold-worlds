// Nala et la fusée en carton: the comic reader of Lina and Noé, taken further. The child uses the device itself:
// shouts the countdown into the microphone, steers the rocket between the satellites (tilt, finger, mouse or
// arrow keys), blows the moon dust off the window, jumps in low gravity, leaves footprints, lights a dark crater,
// finds Africa with the binoculars and turns the Moon through its phases. Everything also works on a laptop:
// every phone gesture has a mouse or keyboard twin, and the microphone always has a button to fall back on.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610270200';

const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à vivre', back: '← Les contes', parents: 'Pour les parents : cette histoire peut utiliser le micro, pour crier et souffler. Rien n’est enregistré. Sans micro, un bouton fait la même chose.', keys: 'Espace ou → : suivant',
    tape: 'Touche les morceaux à coller', lamp1: 'Touche la lampe', shout: 'Crie « décollage ! »', shoutBtn: 'Appuie longtemps ici', steer: 'Penche, glisse ou utilise les flèches', binocs: 'Glisse les jumelles sur la Terre', bubbles: 'Touche les bulles d’eau', blow: 'Souffle sur le hublot', blowBtn: 'ou frotte avec ton doigt', jump: 'Touche l’écran pour faire sauter Nala', prints: 'Touche le sol', lamp: 'Promène la torche dans le cratère', silent: 'Touche Bip', choice: 'Choisis ton retour', chutes: 'Touche l’écran : ouvre les parachutes !', phases: 'Glisse pour faire tourner la Lune', earth: 'Terre', moon: 'Lune', ph: ['Nouvelle lune', 'Croissant', 'Premier quartier', 'Lune gibbeuse', 'Pleine lune', 'Lune gibbeuse', 'Dernier quartier', 'Croissant'] },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to live', back: '← Stories', parents: 'For parents: this story can use the microphone, to shout and to blow. Nothing is recorded. Without a microphone, a button does the same.', keys: 'Space or →: next',
    tape: 'Touch the pieces to tape', lamp1: 'Touch the lamp', shout: 'Shout “lift-off!”', shoutBtn: 'Press and hold here', steer: 'Tilt, slide or use the arrow keys', binocs: 'Slide the binoculars over the Earth', bubbles: 'Touch the water bubbles', blow: 'Blow on the window', blowBtn: 'or rub it with your finger', jump: 'Touch the screen to make Nala jump', prints: 'Touch the ground', lamp: 'Move the torch around the crater', silent: 'Touch Bip', choice: 'Choose how you return', chutes: 'Touch the screen: open the parachutes!', phases: 'Slide to turn the Moon', earth: 'Earth', moon: 'Moon', ph: ['New moon', 'Crescent', 'First quarter', 'Gibbous moon', 'Full moon', 'Gibbous moon', 'Last quarter', 'Crescent'] },
};
let T = TT[lang];
function applyLang() {
  T = TT[lang]; document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  $('title').textContent = TITLE[lang]; document.querySelector('.kick').textContent = T.kick; document.querySelector('.back').textContent = T.back;
  for (const el of document.querySelectorAll('a[href^="../"]')) el.href = `../?lang=${lang}`;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
  fetch(`voice/${lang}/timings.json?v=202610270200`).then((r) => r.json()).then((j) => (timings = j));
}
for (const b of document.querySelectorAll('[data-lang]')) b.onclick = () => { lang = b.dataset.lang; store.set('contes-lang', lang); applyLang(); };

let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {}, gen = 0; // gen: which page is showing; animations of an older page stop
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
  else if (e.key === 'ArrowLeft' && idx >= 0) { e.preventDefault(); prev(); }
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
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now(); const g0 = gen;
    const R = () => FW * (kind === 'binocs' ? 0.17 : 0.24);
    // the binoculars show two round views side by side
    const centres = () => kind === 'binocs' ? [[pos[0] * FW - R() * 0.78, pos[1] * FH], [pos[0] * FW + R() * 0.78, pos[1] * FH]] : [[pos[0] * FW, pos[1] * FH]];
    const draw = () => {
      if (done || gen !== g0) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last, x = pos[0] * FW, y = pos[1] * FH; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'lamp') {
        // the dark crater, lit by Nala's torch: a beam from her hand to where the finger points, ending in a pool
        L.fillStyle = 'rgba(6,5,14,0.95)'; L.fillRect(0, 0, FW, FH);
        const r = R() * 0.8 * (1 + Math.sin(now / 90) * 0.03), ox = a.from[0] * FW, oy = a.from[1] * FH, ang = Math.atan2(y - oy, x - ox), nx = -Math.sin(ang), ny = Math.cos(ang);
        L.globalCompositeOperation = 'destination-out';
        const lg = L.createLinearGradient(ox, oy, x, y); lg.addColorStop(0, 'rgba(0,0,0,0.55)'); lg.addColorStop(1, 'rgba(0,0,0,0.9)');
        L.fillStyle = lg; L.beginPath(); L.moveTo(ox + nx * 6, oy + ny * 6); L.lineTo(x + nx * r, y + ny * r); L.lineTo(x - nx * r, y - ny * r); L.lineTo(ox - nx * 6, oy - ny * 6); L.closePath(); L.fill();
        const gr = L.createRadialGradient(x, y, r * 0.2, x, y, r * 1.15); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = gr; L.beginPath(); L.arc(x, y, r * 1.15, 0, 7); L.fill(); L.globalCompositeOperation = 'source-over';
        // a faint warm haze inside the beam, and the bright head of the torch
        L.fillStyle = 'rgba(255,236,180,0.08)'; L.beginPath(); L.moveTo(ox, oy); L.lineTo(x + nx * r, y + ny * r); L.lineTo(x - nx * r, y - ny * r); L.closePath(); L.fill();
        const hg = L.createRadialGradient(ox, oy, 0, ox, oy, 16); hg.addColorStop(0, 'rgba(255,250,220,1)'); hg.addColorStop(1, 'rgba(255,240,180,0)'); L.fillStyle = hg; L.beginPath(); L.arc(ox, oy, 16, 0, 7); L.fill();
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
    if (a.dim) $('layer').classList.add('dim'); // the narration box steps back so nothing hides behind it
    for (const at of a.spots) {
      const s = spot(at, a.r, 'soft' + (a.float ? ' float' : ''));
      s.onpointerdown = (e) => { e.stopPropagation(); if (s.done) return; s.done = true; s.classList.add('done'); sfx(a.sfx); word(a.word[lang], [at[0], at[1] < 0.3 ? at[1] + 0.09 : at[1] - 0.06]); burst(at[0], at[1], 18, a.hue ?? 40); if (a.float) s.style.visibility = 'hidden'; if (++n === a.spots.length) { hint(''); setTimeout(() => { $('layer').classList.remove('dim'); res(); }, 700); } };
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
    const mic = await micOn(); let k = 0, held = false, done = false, last = performance.now(); const g0 = gen;
    const alt = altButton(T.shoutBtn); alt.onpointerdown = (e) => { e.stopPropagation(); held = true; }; alt.onpointerup = alt.onpointerleave = alt.onpointercancel = () => (held = false);
    keyAct = (e, down) => { if (e.key === ' ') { held = down; return true; } };
    const tick = () => {
      if (done || gen !== g0) return; const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const lv = mic ? micLevel() : 0;
      k += (lv > 0.18 ? lv * 0.9 : 0) * dt + (held ? 0.45 * dt : 0) - 0.04 * dt; k = Math.max(0, k); meter(k);
      if (lv > 0.18 || held) { if (Math.random() < 0.3) burst(0.5, 0.85, 3, 20); if (Math.random() < 0.05) shake(); }
      if (k >= 1) { done = true; keyAct = null; alt.remove(); meter(null); hint(''); launch(); return; }
      requestAnimationFrame(tick);
    };
    const launch = async () => { buzz([200, 80, 500]); sfx('launch'); shake(); await film(a.film); res(); };
    requestAnimationFrame(tick);
  }),
  // the flight, in 3D, seen from behind the rocket: stars rush past, satellites come out of the distance and grow
  // as they approach; tilt the phone, slide the finger or press the arrow keys to slip between them.
  steer: (a) => new Promise(async (res) => {
    hint(T.steer); const [rk, st, bg] = await Promise.all([img('art/rocket-back.png'), img('art/satellite.png'), img('art/k5.jpg')]);
    let rx = 0, target = 0, bank = 0, tilt = null, t0 = performance.now(), last = t0, done = false, speed = 0.5, flash = 0; const g0 = gen;
    const stars = Array.from({ length: 170 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    const sats = [], puffs = [];
    const onTilt = (e) => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 22)); };
    addEventListener('deviceorientation', onTilt);
    const stop = drag({ hover: true, down: (p) => (target = (p[0] - 0.5) * 2.2), move: (p, down) => { if (down || matchMedia('(hover: hover)').matches) target = (p[0] - 0.5) * 2.2; } });
    keyAct = (e) => ['ArrowLeft', 'ArrowRight'].includes(e.key);
    const frame = (now) => {
      if (done || gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const el = (now - t0) / 1000;
      if (keys.has('ArrowLeft')) target -= dt * 2.2; if (keys.has('ArrowRight')) target += dt * 2.2;
      if (tilt != null) target += tilt * dt * 2.4;
      target = Math.max(-1, Math.min(1, target)); const prev = rx; rx += (target - rx) * Math.min(1, dt * 7);
      bank += ((rx - prev) / Math.max(dt, 0.001) * 0.35 - bank) * Math.min(1, dt * 6);
      speed = 0.55 + Math.min(el, 16) * 0.05;
      const K = FW * 0.55, vx = FW * 0.5 - rx * FW * 0.08, vy = FH * 0.36, ry = (FH * 0.8 - vy) / K;
      // deep space: the painted sky drawn large and slowly coming closer, tilted a little with the turns
      L.save(); L.translate(FW / 2, FH / 2); L.rotate(-bank * 0.12); const zz = 1.25 + el * 0.02;
      L.drawImage(bg, 0, 0, bg.width, bg.height * 0.62, -FW * zz / 2 - rx * FW * 0.06, -FH * zz / 2, FW * zz, FH * zz); L.restore();
      L.fillStyle = 'rgba(4,6,20,0.35)'; L.fillRect(0, 0, FW, FH);
      // the stars streak past
      L.lineCap = 'round';
      for (const s0 of stars) {
        const z0 = s0.z; s0.z -= dt * speed * 0.45;
        if (s0.z < 0.04) { s0.x = Math.random() * 2 - 1; s0.y = Math.random() * 2 - 1; s0.z = 1; continue; }
        const x1 = vx + (s0.x - rx * 0.3) * K / z0, y1 = vy + s0.y * K / z0, x2 = vx + (s0.x - rx * 0.3) * K / s0.z, y2 = vy + s0.y * K / s0.z;
        L.strokeStyle = `rgba(220,230,255,${Math.min(1, (1 - s0.z) * 1.3)})`; L.lineWidth = Math.max(0.6, 2.2 * (1 - s0.z)); L.beginPath(); L.moveTo(x1, y1); L.lineTo(x2, y2); L.stroke();
      }
      // satellites come from far away (z = 7) to the rocket's plane (z = 1) and fly past
      if (Math.random() < dt * (0.65 + el * 0.04)) sats.push({ x: (Math.random() * 2 - 1) * 1.1, y: ry * (0.75 + Math.random() * 0.4), z: 7, r: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1.6, hit: false });
      sats.sort((p, q) => q.z - p.z);
      for (const o of sats) {
        const z0 = o.z; o.z -= dt * speed * 2.6; o.r += o.spin * dt;
        const sx = vx + (o.x - rx * 0.3) * K / o.z, sy = vy + o.y * K / o.z, w = FW * 0.42 / o.z;
        if (o.z > 0.25) { L.save(); L.globalAlpha = Math.min(1, (7 - o.z) / 2) * (o.hit ? 0.35 : 1); L.translate(sx, sy); L.rotate(o.r); L.drawImage(st, -w / 2, -w * st.height / st.width / 2, w, w * st.height / st.width); L.restore(); }
        if (z0 > 1 && o.z <= 1) {
          const dx = Math.abs(o.x - rx);
          if (dx < 0.32 && Math.abs(o.y - ry) < 0.3) { o.hit = true; t0 += 600; flash = 1; sfx('bonk'); buzz(80); shake(); for (let i = 0; i < 18; i++) puffs.push({ x: 0, y: FH * 0.78, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 1 }); }
          else if (dx < 0.6) sfx('whoosh', 0.6); // a near miss
        }
      }
      for (let i = sats.length - 1; i >= 0; i--) if (sats[i].z < 0.25) sats.splice(i, 1);
      // the rocket, seen from behind, banking into the turns, its flame flickering towards us
      const rw = FW * 0.3, rh = rw * rk.height / rk.width, cx = FW / 2 + rx * FW * 0.3, cy = FH * 0.8 + Math.sin(now / 110) * 2;
      const fl = L.createRadialGradient(cx, cy + rh * 0.08, 0, cx, cy + rh * 0.08, rw * (0.55 + Math.random() * 0.1)); fl.addColorStop(0, 'rgba(255,220,120,0.55)'); fl.addColorStop(1, 'rgba(255,120,40,0)');
      L.fillStyle = fl; L.beginPath(); L.arc(cx, cy + rh * 0.08, rw * 0.7, 0, 7); L.fill();
      L.save(); L.translate(cx, cy); L.rotate(Math.max(-0.5, Math.min(0.5, bank))); L.drawImage(rk, -rw / 2, -rh / 2, rw, rh); L.restore();
      for (const p of puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; if (p.life <= 0) continue; L.fillStyle = `rgba(255,230,180,${p.life})`; L.beginPath(); L.arc(cx + p.x, p.y, 4 * p.life + 1, 0, 7); L.fill(); }
      for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].life <= 0) puffs.splice(i, 1);
      if (flash > 0) { L.fillStyle = `rgba(255,255,255,${flash * 0.35})`; L.fillRect(0, 0, FW, FH); flash = Math.max(0, flash - dt * 3); }
      meter(el / a.secs);
      if (el >= a.secs) { done = true; stop(); keyAct = null; removeEventListener('deviceorientation', onTilt); meter(null); L.clearRect(0, 0, FW, FH); sfx('found'); burst(0.5, 0.7, 40); hint(''); setTimeout(res, 600); return; }
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
    const g0 = gen; const tick = () => { if (done || gen !== g0) return; const lv = mic ? micLevel() : 0; if (lv > 0.12) for (let i = 0; i < 2; i++) { const ang = Math.random() * 6.28, rr = Math.random() * 0.33 * Math.min(1, cover() + 0.3); clear([a.c[0] + Math.cos(ang) * rr, a.c[1] + Math.sin(ang) * rr * FW / FH], 0.06 + lv * 0.05); } requestAnimationFrame(tick); };
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
      const f = (now) => { const k = Math.min(1, (now - t0) / D), y = 4 * k * (1 - k) * a.h; im.style.transform = `translate(-50%, calc(-100% - ${y * FH}px)) rotate(${Math.sin(k * 6.28) * 6}deg)`; if (k < 1) requestAnimationFrame(f); else { sfx('step'); burst(a.at[0], a.at[1], 14, 30); busyJ = false; if (++n >= a.n) { stop(); keyAct = null; hint(''); setTimeout(res, 600); } } };
      requestAnimationFrame(f);
    };
    // a tap anywhere on the panel makes her jump (she is small on a phone), and the space bar on a laptop
    const stop = drag({ down: go });
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
  // the return: the capsule comes down glowing like a shooting star; a touch opens the parachutes, which bloom
  // open and slow it down; it sways down to the sea (a splash, rings on the water) or the plain (a cloud of dust)
  landing: (a) => new Promise(async (res) => {
    const [cap, chute] = await Promise.all([img('art/capsule.png'), img('art/chute.png')]);
    let y = -0.12, v = 0.42, open = 0, fold = 0, last = performance.now(), phase = 'fall', done = false, landT = 0, asked = false; const g0 = gen;
    const parts = [], rings = [], fan = a.chutes === 1 ? [0] : [-0.55, 0, 0.55];
    const cw = () => FW * 0.24, chw = () => FW * (a.chutes === 1 ? 0.62 : 0.4);
    const deploy = () => { if (phase !== 'fall') return; phase = 'open'; open = 0.001; sfx('chute'); buzz(120); word(a.word[lang], [0.5, Math.max(0.3, y - 0.2)]); hint(''); stop(); keyAct = null; };
    const stop = drag({ down: deploy }); keyAct = (e, down) => { if (down && e.key === ' ') { deploy(); return true; } };
    const frame = (now) => {
      if (done || gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!asked && y > 0.12) { asked = true; hint(T.chutes); }
      // falling: fast and burning; it slows by itself near the middle so the child always has time
      if (phase === 'fall') v += ((y > 0.34 ? 0.04 : 0.42) - v) * Math.min(1, dt * 2);
      else if (phase === 'open') { open = Math.min(1, open + dt * 1.4); v += (0.075 - v) * Math.min(1, dt * 2.5); }
      if (phase !== 'landed') y += v * dt;
      const sway = phase === 'fall' ? 0 : Math.sin(now / 700) * 0.06 * open, cx = FW * 0.5 + sway * FW * 0.2, cy = y * FH;
      L.clearRect(0, 0, FW, FH);
      // the heat of the way in: a glow and sparks trailing up behind it, cooling once the parachutes are out
      const heat = phase === 'fall' ? Math.min(1, v * 3) : phase === 'open' ? Math.max(0, 1 - open * 2) : 0;
      if (heat > 0.02) {
        const hg = L.createRadialGradient(cx, cy + cw() * 0.3, 0, cx, cy + cw() * 0.3, cw() * 1.1); hg.addColorStop(0, `rgba(255,190,90,${0.7 * heat})`); hg.addColorStop(1, 'rgba(255,90,30,0)');
        L.fillStyle = hg; L.beginPath(); L.arc(cx, cy + cw() * 0.3, cw() * 1.1, 0, 7); L.fill();
        if (Math.random() < heat) parts.push({ x: cx + (Math.random() - 0.5) * cw() * 0.6, y: cy, vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 120, life: 1, c: '255,170,80', s: 3 });
      }
      const ch = cw() * cap.height / cap.width, top = cy - ch * 0.45;
      // the parachutes bloom: from a small bundle to full canopies with a little bounce, cords to the capsule
      if (open > 0 && fold < 1) {
        const k = open < 1 ? 1 - Math.pow(1 - open, 3) * Math.cos(open * 9) : 1;
        for (const f of fan) {
          const w = chw() * Math.max(0.08, k), h = w * chute.height / chute.width, px = cx + f * FW * (0.1 + 0.32 * k) + Math.sin(now / 600 + f * 3) * 4, py = top - h - FH * 0.03 * k;
          // after the touchdown the canopies lean over, sink and fade (they lie down on the water or the grass)
          const side = f || 0.35, fx = px + side * fold * FW * 0.35, fy = py + fold * FH * 0.22;
          L.save(); L.globalAlpha = 1 - fold; L.translate(fx, fy + h); L.rotate(f * 0.35 * k + Math.sin(now / 800 + f) * 0.04 + side * fold * 2.2); L.drawImage(chute, -w / 2, -h, w, h * (1 - fold * 0.5)); L.restore();
          L.strokeStyle = `rgba(60,40,30,${0.55 * (1 - fold)})`; L.lineWidth = 1.2; L.beginPath(); L.moveTo(fx, fy + h); L.lineTo(cx, top); L.stroke();
        }
      }
      L.save(); L.translate(cx, cy); L.rotate(sway * 0.5); L.drawImage(cap, -cw() / 2, -ch / 2, cw(), ch); L.restore();
      // touching down
      const ground = a.ground * FH - ch * 0.3;
      if (phase === 'open' && cy >= ground && open >= 1) {
        phase = 'landed'; landT = now; y = ground / FH; sfx(a.surface === 'sea' ? 'splash' : 'thud'); buzz([100, 60, 200]); shake();
        for (let i = 0; i < 70; i++) { const an = -Math.PI * (0.1 + Math.random() * 0.8); parts.push({ x: cx + (Math.random() - 0.5) * cw(), y: cy + ch * 0.3, vx: Math.cos(an) * (60 + Math.random() * 220), vy: Math.sin(an) * (100 + Math.random() * 260), life: 1, c: a.surface === 'sea' ? '235,245,255' : '205,170,110', s: a.surface === 'sea' ? 4 : 7, g: 1 }); }
        rings.push({ r: 0.2 }, { r: 0.05 });
      }
      if (phase === 'landed') {
        const t = (now - landT) / 1000; y = ground / FH + (a.surface === 'sea' ? Math.sin(t * 5) * 0.006 * Math.exp(-t) : 0);
        for (const rg of rings) { rg.r += dt * 0.6; L.strokeStyle = a.surface === 'sea' ? `rgba(255,255,255,${Math.max(0, 0.8 - rg.r)})` : `rgba(210,180,120,${Math.max(0, 0.6 - rg.r)})`; L.lineWidth = 3; L.beginPath(); L.ellipse(cx, a.ground * FH, rg.r * FW, rg.r * FW * 0.18, 0, 0, 7); L.stroke(); }
        fold = Math.min(1, Math.max(0, (t - 0.3) * 0.8));
        if (t > 2.6) { done = true; res(); return; }
      }
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 420 * dt; p.life -= dt * (p.g ? 0.8 : 1.6); L.fillStyle = `rgba(${p.c},${Math.max(0, p.life)})`; L.beginPath(); L.arc(p.x, p.y, p.s * Math.max(0.2, p.life), 0, 7); L.fill(); }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
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
const hist = []; // the pages already read, for the back arrow
async function show(i, back = false) {
  if (busy) return; busy = true; if (!back && idx >= 0 && idx !== i) hist.push(idx); hint(''); $('next').classList.remove('on'); keyAct = null; meter(null);
  for (const b of document.querySelectorAll('.alt')) b.remove();
  const p = PANELS[i]; idx = i; const my = ++gen; const gone = () => gen !== my; $('prev').classList.toggle('on', hist.length > 0);
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
  await sleep(450); if (gone()) return;
  if (p.sfx) { sfx(p.sfx); await sleep(1200); if (gone()) return; } // the panel's own sound first, then the story
  const early = p.act?.pre ? acts[p.act.kind](p.act) : null; // some scenes start moving while the narrator speaks
  for (const ln of p.lines) { await say(ln); if (gone()) return; }
  if (p.act) { await (early || acts[p.act.kind](p.act)); if (gone()) return; for (const ln of p.act.then || []) { if (ln.sfx) { sfx(ln.sfx); await sleep(900); } await say(ln); if (gone()) return; } }
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
// back one page, even in the middle of a line or a game: the voice stops and the page before comes back
function prev() {
  if (!hist.length) return; voice.pause(); tok++; duck(false); hint(''); $('layer').classList.remove('dim');
  if (typeof keyAct !== 'undefined') keyAct = null;
  if (typeof meter === 'function') meter(null);
  for (const b of document.querySelectorAll('.alt')) b.remove();
  busy = false; const i = hist.pop(); if (typeof branch !== 'undefined' && PANELS[i].act?.kind === 'choice') branch = null; show(i, true);
}
$('prev').onclick = (e) => { e.stopPropagation(); prev(); };
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
// test hook: open any panel, even while the current one waits for the child
window.__nala = { get idx() { return idx; }, get busy() { return busy; }, next, show, goto: (i) => { busy = false; keyAct = null; show(i); }, get branch() { return branch; } };
