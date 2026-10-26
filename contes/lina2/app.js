// Lina et le papillon secret: the second comic of Lina, on the reader of Nala. The child raises a peacock butterfly
// from the egg to its first flight: finds the eggs with the magnifying glass, feeds the caterpillars, makes the days
// go by, keeps quiet by the chrysalis, blows the wings dry, paints them in a mirror, follows the butterfly with the
// binoculars, lets it drink, carries pollen from flower to flower and lets it go. Every gesture also works with a
// mouse or the keyboard, and the arrow at the bottom left goes back one page.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610270300';

import { goFull, keepFull, iosTip } from '../fs.js?v=202610270300';
const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à vivre', back: '← Les contes', parents: 'Pour les parents : cette histoire peut utiliser le micro, pour souffler et faire silence. Rien n’est enregistré. Sans micro, le doigt fait la même chose.', keys: 'Espace ou → : suivant · ← : page précédente',
    loupe: 'Glisse la loupe sous les feuilles', feed: 'Glisse les feuilles jusqu’aux chenilles', days: 'Glisse ton doigt pour faire passer les jours', day: 'Jour', quiet: 'Chut… reste silencieux, ou garde ton doigt sur la chrysalide', blow: 'Souffle tout doucement', blowBtn: 'ou frotte avec ton doigt', mirror: 'Colorie une aile', binocs: 'Glisse les jumelles dans le jardin', choice: 'Choisis une fleur', sip: 'Touche le papillon', pollinate: 'Touche les fleurs', release: 'Glisse le papillon vers le ciel', order: 'Touche les dessins dans l’ordre' },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to live', back: '← Stories', parents: 'For parents: this story can use the microphone, to blow and to keep quiet. Nothing is recorded. Without a microphone, a finger does the same.', keys: 'Space or →: next · ←: previous page',
    loupe: 'Slide the glass under the leaves', feed: 'Slide the leaves to the caterpillars', days: 'Slide your finger to make the days go by', day: 'Day', quiet: 'Shh… stay quiet, or keep your finger on the chrysalis', blow: 'Blow very gently', blowBtn: 'or rub with your finger', mirror: 'Colour one wing', binocs: 'Slide the binoculars around the garden', choice: 'Choose a flower', sip: 'Touch the butterfly', pollinate: 'Touch the flowers', release: 'Slide the butterfly up to the sky', order: 'Touch the drawings in order' },
};
let T = TT[lang];
function applyLang() {
  T = TT[lang]; document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  $('title').textContent = TITLE[lang]; document.querySelector('.kick').textContent = T.kick; document.querySelector('.back').textContent = T.back;
  for (const el of document.querySelectorAll('a[href^="../"]')) el.href = `../?lang=${lang}`;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
  fetch(`voice/${lang}/timings.json?v=202610270300`).then((r) => r.json()).then((j) => (timings = j));
}
for (const b of document.querySelectorAll('[data-lang]')) b.onclick = () => { lang = b.dataset.lang; store.set('contes-lang', lang); applyLang(); };

let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {}, gen = 0; // gen: which page is showing; animations of an older page stop
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
applyLang();

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and theme
const SFX = ['page', 'pop', 'found', 'tap', 'loupe', 'binocs', 'munch', 'dawn', 'hush', 'crack', 'whoosh', 'paint', 'chime', 'slurp', 'flutter', 'sparkle', 'pencil', 'squeak'];
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
const AMB = { 'amb-garden': 0.35, 'amb-meadow': 0.4, 'amb-evening': 0.45 }; let ambLevel = 0.35;
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
function whisper(id) { if (mode !== 'voice' || !voice.paused) return; voice.src = `voice/${lang}/${id}.mp3`; voice.play().catch(() => {}); }
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
    hint(T[kind]); sfx(kind); if (a.dim) $('layer').classList.add('dim');
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = kind === 'binocs' ? 3 : 2.4;
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now(); const g0 = gen;
    const R = () => FW * (kind === 'binocs' ? 0.17 : 0.2);
    const centres = () => kind === 'binocs' ? [[pos[0] * FW - R() * 0.78, pos[1] * FH], [pos[0] * FW + R() * 0.78, pos[1] * FH]] : [[pos[0] * FW, pos[1] * FH]];
    const draw = () => {
      if (done || gen !== g0) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'binocs') { L.fillStyle = 'rgba(14,12,6,0.82)'; L.fillRect(0, 0, FW, FH); }
      L.save(); L.beginPath(); for (const [cx, cy] of centres()) { L.moveTo(cx + R(), cy); L.arc(cx, cy, R(), 0, 7); } L.clip(); if (kind === 'binocs') L.clearRect(0, 0, FW, FH);
      const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
      L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH);
      L.restore();
      for (const [cx, cy] of centres()) { L.lineWidth = kind === 'loupe' ? 9 : 7; L.strokeStyle = kind === 'loupe' ? '#b5862f' : '#1c1c1c'; L.beginPath(); L.arc(cx, cy, R(), 0, 7); L.stroke(); L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(cx, cy, R() - 5, 3.6, 4.6); L.stroke(); }
      if (kind === 'loupe') { const [x, y] = centres()[0], ang = 0.75; L.lineCap = 'round'; L.lineWidth = 16; L.strokeStyle = '#5a3a1c'; L.beginPath(); L.moveTo(x + Math.cos(ang) * (R() + 6), y + Math.sin(ang) * (R() + 6)); L.lineTo(x + Math.cos(ang) * (R() + 70), y + Math.sin(ang) * (R() + 70)); L.stroke(); }
      // found: what was hidden stays under the glass for a moment
      held = near(pos, a.at, a.r) ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(a.at[0], a.at[1], 2, 50); // a little help after a while
      if (held > 380) { done = true; stop(); keyAct = null; L.clearRect(0, 0, FW, FH); $('layer').classList.remove('dim'); sfx('found'); burst(a.at[0], a.at[1], 46); ring(a.at); hint(''); res(); }
    };
    requestAnimationFrame(draw);
    const stop = drag({ hover: true, down: (p) => (pos = p), move: (p) => (pos = p) });
    // laptop: the arrow keys move the tool
    keyAct = (e, down) => { if (!down || !e.key.startsWith('Arrow')) return; const d = 0.04; pos = [pos[0] + (e.key === 'ArrowRight') * d - (e.key === 'ArrowLeft') * d, pos[1] + (e.key === 'ArrowDown') * d - (e.key === 'ArrowUp') * d]; return true; };
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
  loupe: (a) => lensTool('loupe', a),
  binocs: (a) => lensTool('binocs', a),
  // feed the caterpillars: drag each nettle leaf to them (on a laptop the space bar slides the next one over)
  feed: (a) => new Promise(async (res) => {
    hint(T.feed); const g0 = gen; let n = 0; if (a.dim) $('layer').classList.add('dim'); // the caption steps back from the caterpillars
    const leaves = a.from.map((at, i) => {
      const el = document.createElement('img'); el.src = 'art/leaf.png'; el.className = 'drag-leaf'; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.setProperty('--r', (i * 37 % 60 - 30) + 'deg'); $('spots').append(el); el._home = at; return el;
    });
    const ring = spot(a.at, a.r, 'soft');
    const eat = (el) => { el.remove(); sfx('munch'); burst(a.at[0], a.at[1], 20, 100); word(a.word[lang], [a.at[0], a.at[1] - 0.1]); if (++n === leaves.length) { ring.remove(); keyAct = null; swapArt(a.after); hint(''); setTimeout(() => { $('layer').classList.remove('dim'); if (gen === g0) res(); }, 1200); } };
    for (const el of leaves) {
      el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation(); el.classList.add('held'); try { el.setPointerCapture(e.pointerId); } catch {}
        el.onpointermove = (ev) => { const p = toPanel(ev); el.style.left = p[0] * 100 + '%'; el.style.top = p[1] * 100 + '%'; };
        el.onpointerup = el.onpointercancel = (ev) => { el.onpointermove = null; el.classList.remove('held'); const p = toPanel(ev); if (near(p, a.at, a.r * 1.4)) eat(el); else { el.style.left = el._home[0] * 100 + '%'; el.style.top = el._home[1] * 100 + '%'; } };
      };
    }
    keyAct = (e, down) => { if (down && e.key === ' ') { const el = leaves.find((l) => l.isConnected); if (el) { el.style.left = a.at[0] * 100 + '%'; el.style.top = a.at[1] * 100 + '%'; setTimeout(() => eat(el), 450); } return true; } };
  }),
  // make the days go by: the finger (or the arrow keys) turns the sun and the moon over the garden
  days: (a) => new Promise((res) => {
    hint(T.days); const g0 = gen; let t = 0, lastX = null, done = false;
    const label = document.createElement('div'); label.className = 'daylabel'; $('layer').append(label);
    const draw = () => {
      const d = t % 1, night = Math.max(0, Math.cos((d - 0.75) * Math.PI * 2)) ** 1.5, dusk = Math.max(0, 1 - Math.abs(d - 0.5) * 8) + Math.max(0, 1 - Math.abs(d - 1) * 8) + Math.max(0, 1 - d * 8);
      L.clearRect(0, 0, FW, FH);
      L.fillStyle = `rgba(14,18,52,${night * 0.62})`; L.fillRect(0, 0, FW, FH);
      L.fillStyle = `rgba(255,140,60,${Math.min(1, dusk) * 0.18})`; L.fillRect(0, 0, FW, FH);
      // the sun by day and the moon by night travel along an arc over the picture
      const sun = d < 0.5, k = sun ? d / 0.5 : (d - 0.5) / 0.5, x = FW * (0.1 + 0.8 * k), y = FH * (0.32 - Math.sin(k * Math.PI) * 0.12);
      const gr = L.createRadialGradient(x, y, 0, x, y, FW * 0.12); gr.addColorStop(0, sun ? 'rgba(255,240,170,0.95)' : 'rgba(235,240,255,0.95)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
      L.fillStyle = gr; L.beginPath(); L.arc(x, y, FW * 0.12, 0, 7); L.fill(); L.fillStyle = sun ? '#ffe27a' : '#f2f4ff'; L.beginPath(); L.arc(x, y, FW * 0.04, 0, 7); L.fill();
      if (!sun) { L.fillStyle = `rgba(14,18,52,${0.9})`; L.beginPath(); L.arc(x + FW * 0.018, y - FW * 0.01, FW * 0.036, 0, 7); L.fill(); }
      label.textContent = T.day + ' ' + (Math.floor(t) + 1);
    };
    const turn = (dd) => {
      if (done || gen !== g0) return; const before = Math.floor(t * 2); t = Math.max(0, t + dd); if (Math.floor(t * 2) !== before) sfx(t % 1 < 0.5 ? 'dawn' : 'tap', 0.5);
      draw();
      if (t >= a.days) { done = true; stop(); keyAct = null; t = a.days; draw(); swapArt(a.after); sfx('found'); burst(0.5, 0.5, 30, 60); setTimeout(() => { L.clearRect(0, 0, FW, FH); label.remove(); }, 900); hint(''); setTimeout(() => gen === g0 && res(), 1200); }
    };
    draw();
    const stop = drag({ down: (p) => (lastX = p[0]), move: (p, down) => { if (!down || lastX == null) return; turn(Math.abs(p[0] - lastX) * 1.1); lastX = p[0]; }, up: () => (lastX = null) });
    keyAct = (e, down) => { if (down && ['ArrowRight', 'ArrowLeft', ' '].includes(e.key)) { turn(0.12); return true; } };
  }),
  // keep quiet: with the microphone, silence is enough; without it, a finger kept still on the chrysalis
  quiet: (a) => new Promise(async (res) => {
    hint(T.quiet); const g0 = gen; const mic = await micOn(); const s = spot(a.at, a.r, 'soft');
    let k = 0, down = null, warned = 0, last = performance.now(), done = false;
    const onDown = (e) => { e.preventDefault(); down = toPanel(e); };
    const onMove = (e) => { if (!down) return; const p = toPanel(e); if (Math.hypot((p[0] - down[0]) * FW, (p[1] - down[1]) * FH) > 14) { down = null; hush(); } };
    const hush = () => { k = Math.max(0, k - 0.35); if (performance.now() - warned > 3500) { warned = performance.now(); sfx('hush'); whisper(a.warn); } };
    $('panel').onpointerdown = onDown; s.onpointerdown = onDown; $('panel').onpointermove = onMove;
    const up = () => (down = null); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    keyAct = (e, isDown) => { if (e.key === ' ') { down = isDown ? [a.at[0], a.at[1]] : null; return true; } };
    const tick = () => {
      if (done || gen !== g0) return; const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const lv = mic ? micLevel() : 0;
      if (lv > 0.3) hush(); else if ((mic && lv < 0.07) || down) k += dt / (a.ms / 1000);
      s.classList.toggle('calm', k > 0.02); s.style.setProperty('--k', Math.min(1, k));
      if (k > 0.5 && Math.random() < dt * 2) sfx('crack', 0.4);
      if (k >= 1) { done = true; s.remove(); keyAct = null; $('panel').onpointerdown = $('panel').onpointermove = null; removeEventListener('pointerup', up); sfx('crack'); swapArt(a.after); burst(a.at[0], a.at[1], 30, 50); hint(''); setTimeout(() => gen === g0 && res(), 900); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }),
  // a gentle breeze dries the wings: blow into the microphone, or rub with the finger or the mouse
  blow: (a) => new Promise(async (res) => {
    hint(T.blow); const g0 = gen; const after = await img(`art/${a.after}.jpg`); const mic = await micOn();
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d');
    let done = false, lastS = 0;
    const paint = () => { L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over'; };
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const clear = (p, r) => { m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * r, 0, 7); m.fill(); paint(); const now = performance.now(); if (now - lastS > 400) { lastS = now; sfx('whoosh', 0.4); } check(); };
    const check = () => { if (!done && cover() > 0.6) { done = true; stop(); keyAct = null; alt.remove(); sfx('found'); swapArt(a.after); burst(a.c[0], a.c[1], 40, 20); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(() => gen === g0 && res(), 900); } };
    const stop = drag({ down: (p) => clear(p, 0.1), move: (p, d) => d && clear(p, 0.1) });
    const alt = altButton(T.blowBtn); alt.onpointerdown = (e) => { e.stopPropagation(); for (let i = 0; i < 6; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.09); };
    keyAct = (e, down) => { if (down && e.key === ' ') { alt.onpointerdown(new PointerEvent('pointerdown')); return true; } };
    const tick = () => { if (done || gen !== g0) return; const lv = mic ? micLevel() : 0; if (lv > 0.12) for (let i = 0; i < 2; i++) { const ang = Math.random() * 6.28, rr = Math.random() * 0.3 * Math.min(1, cover() + 0.35); clear([a.c[0] + Math.cos(ang) * rr, a.c[1] + Math.sin(ang) * rr * FW / FH], 0.06 + lv * 0.05); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }),
  // colour one wing and the other one colours itself: every stroke is painted twice, in a mirror
  mirror: (a) => new Promise(async (res) => {
    hint(T.mirror); const g0 = gen; const after = await img(`art/${a.after}.jpg`);
    const M = document.createElement('canvas'); M.width = 80; M.height = Math.round(80 * FH / FW); const m = M.getContext('2d');
    let done = false, lastS = 0;
    const paint = () => { L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over'; };
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const brush = (p) => {
      if (done || gen !== g0) return;
      for (const q of [p, [2 * a.axis - p[0], p[1]]]) { m.fillStyle = '#000'; m.beginPath(); m.arc(q[0] * M.width, q[1] * M.height, M.width * 0.06, 0, 7); m.fill(); }
      paint(); if (Math.random() < 0.3) burst(2 * a.axis - p[0], p[1], 3, 20);
      const now = performance.now(); if (now - lastS > 350) { lastS = now; sfx('paint', 0.5); }
      if (cover() > 0.55) { done = true; stop(); keyAct = null; swapArt(a.after); sfx('chime'); burst(a.axis, 0.5, 50, 10); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(() => gen === g0 && res(), 1000); }
    };
    // a dashed line shows the mirror down the butterfly's body
    L.setLineDash([8, 8]); L.strokeStyle = 'rgba(255,255,255,0.8)'; L.lineWidth = 2; L.beginPath(); L.moveTo(a.axis * FW, a.box[1] * FH); L.lineTo(a.axis * FW, a.box[3] * FH); L.stroke(); L.setLineDash([]);
    const stop = drag({ down: brush, move: (p, d) => d && brush(p) });
    keyAct = (e, down) => { if (down && e.key === ' ') { for (let i = 0; i < 10; i++) brush([a.box[0] + Math.random() * (a.axis - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])]); return true; } };
  }),
  // touch the butterfly and its tongue unrolls into the flower
  sip: (a) => new Promise((res) => {
    hint(T.sip); const g0 = gen; const s = spot(a.at, a.r, 'soft');
    const go = () => { s.remove(); keyAct = null; sfx('slurp'); swapArt(a.after); burst(a.at[0], a.at[1] + 0.05, 20, 300); hint(''); setTimeout(() => gen === g0 && res(), 1100); };
    s.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  // from flower to flower: the butterfly flies to each flower the child touches and leaves a trail of pollen
  pollinate: (a) => new Promise(async (res) => {
    hint(T.pollinate); const g0 = gen; const bf = await img('art/bfly.png'); let pos = [...a.start], target = null, from = null, t0 = 0, n = 0, busyF = false;
    const trail = [];
    const spots = a.flowers.map((at) => { const s = spot(at, 0.1, 'soft'); s.onpointerdown = (e) => { e.stopPropagation(); go(s, at); }; return s; });
    const go = (s, at) => { if (busyF || s.done) return; busyF = true; s.done = true; s.classList.add('done'); from = [...pos]; target = at; t0 = performance.now(); sfx('flutter', 0.6); };
    const frame = (now) => {
      if (gen !== g0) return; L.clearRect(0, 0, FW, FH);
      if (target) {
        const k = Math.min(1, (now - t0) / 1400), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, lift = Math.sin(k * Math.PI) * 0.12;
        pos = [from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e - lift + Math.sin(now / 90) * 0.004];
        if (Math.random() < 0.6) trail.push({ x: pos[0] * FW, y: pos[1] * FH + 10, life: 1 });
        if (k >= 1) { const at = target; target = null; busyF = false; sfx('sparkle'); burst(at[0], at[1], 30, 50); word(a.word[lang], [at[0], at[1] - 0.09]); if (++n === a.flowers.length) { keyAct = null; hint(''); setTimeout(() => gen === g0 && res(), 1200); } }
      }
      for (const p of trail) { p.life -= 0.012; p.y += 0.3; if (p.life > 0) { L.fillStyle = `rgba(255,214,60,${p.life})`; L.beginPath(); L.arc(p.x, p.y, 2.2 * p.life + 0.6, 0, 7); L.fill(); } }
      for (let i = trail.length - 1; i >= 0; i--) if (trail[i].life <= 0) trail.splice(i, 1);
      // the butterfly, its wings beating (squeezed sideways in time)
      const w = FW * 0.22, h = w * bf.height / bf.width, flap = target ? 0.35 + Math.abs(Math.sin(now / 70)) * 0.65 : 0.75 + Math.sin(now / 400) * 0.25;
      L.save(); L.translate(pos[0] * FW, pos[1] * FH); L.scale(flap, 1); L.drawImage(bf, -w / 2, -h / 2, w, h); L.restore();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    keyAct = (e, down) => { if (down && e.key === ' ') { const s = spots.find((x) => !x.done); if (s) go(s, a.flowers[spots.indexOf(s)]); return true; } };
  }),
  // let it go: slide up from the butterfly (or touch it) and it flies away into the evening sky
  release: (a) => new Promise(async (res) => {
    hint(T.release); const g0 = gen; const bf = await img('art/bfly.png'); const s = spot(a.at, a.r, 'soft'); let from = null, gone = false;
    const go = () => {
      if (gone) return; gone = true; s.remove(); keyAct = null; hint(''); sfx('flutter'); swapArt(a.after); const t0 = performance.now();
      const frame = (now) => {
        if (gen !== g0) return; const k = (now - t0) / 2600; L.clearRect(0, 0, FW, FH); if (k > 1) { setTimeout(() => gen === g0 && res(), 300); return; }
        const x = a.at[0] + Math.sin(k * 9) * 0.06 + k * 0.15, y = a.at[1] - k * (a.at[1] + 0.15), w = FW * 0.16 * (1 - k * 0.6), h = w * bf.height / bf.width;
        L.save(); L.translate(x * FW, y * FH); L.scale(0.3 + Math.abs(Math.sin(now / 70)) * 0.7, 1); L.globalAlpha = Math.min(1, 1.4 - k); L.drawImage(bf, -w / 2, -h / 2, w, h); L.restore();
        if (Math.random() < 0.5) burst(x, y, 2, 40);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    s.onpointerdown = (e) => { e.stopPropagation(); from = toPanel(e); try { s.setPointerCapture(e.pointerId); } catch {} };
    s.onpointermove = (e) => { if (from && from[1] - toPanel(e)[1] > 0.06) go(); };
    s.onpointerup = () => { if (from) go(); from = null; };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  // put the life cycle in order: touch the four drawings from the egg to the butterfly
  order: (a) => new Promise((res) => {
    hint(T.order); const g0 = gen; let n = 0, warned = 0;
    const done = [];
    for (const [i, at] of a.spots.entries()) {
      const s = spot(at, 0.12, 'soft');
      s.onpointerdown = (e) => {
        e.stopPropagation(); if (s.classList.contains('done')) return;
        if (i !== n) { sfx('tap', 0.5); s.classList.add('nope'); setTimeout(() => s.classList.remove('nope'), 500); if (performance.now() - warned > 4000) { warned = performance.now(); whisper(a.warn); } return; }
        s.classList.add('done'); const b = document.createElement('div'); b.className = 'badge'; b.textContent = n + 1; b.style.left = at[0] * 100 + '%'; b.style.top = (at[1] - 0.09) * 100 + '%'; $('layer').append(b);
        sfx('pencil'); burst(at[0], at[1], 18, 40); done.push(at);
        // a hand-drawn arrow from the previous drawing to this one
        if (done.length > 1) { const [p, q] = done.slice(-2); const x1 = p[0] * FW, y1 = p[1] * FH, x2 = q[0] * FW, y2 = q[1] * FH, ang = Math.atan2(y2 - y1, x2 - x1), sh = FW * 0.1; L.strokeStyle = '#c0392b'; L.lineWidth = 4; L.lineCap = 'round'; L.beginPath(); L.moveTo(x1 + Math.cos(ang) * sh, y1 + Math.sin(ang) * sh); const ex = x2 - Math.cos(ang) * sh, ey = y2 - Math.sin(ang) * sh; L.lineTo(ex, ey); L.lineTo(ex - Math.cos(ang - 0.5) * 16, ey - Math.sin(ang - 0.5) * 16); L.moveTo(ex, ey); L.lineTo(ex - Math.cos(ang + 0.5) * 16, ey - Math.sin(ang + 0.5) * 16); L.stroke(); }
        if (++n === a.spots.length) { keyAct = null; sfx('found'); hint(''); setTimeout(() => gen === g0 && res(), 900); }
      };
    }
    keyAct = (e, down) => { if (down && e.key === ' ') { $('spots').querySelectorAll('.spot')[n]?.dispatchEvent(new PointerEvent('pointerdown')); return true; } };
  }),
  choice: (a) => new Promise((res) => {
    hint(T.choice);
    for (const o of a.opts) { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o[lang]; b.style.left = o.at[0] * 100 + '%'; b.style.top = o.at[1] * 100 + '%'; $('spots').append(b); b.onpointerdown = (e) => { e.stopPropagation(); sfx('found'); branch = o.go; hint(''); res(); }; }
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
  if (!hist.length) return; voice.pause(); tok++; duck(false); keyAct = null; meter(null); $('layer').classList.remove('dim');
  for (const b of document.querySelectorAll('.alt')) b.remove();
  busy = false; const i = hist.pop(); if (PANELS[i].act?.kind === 'choice') branch = null; show(i, true);
}
$('prev').onclick = (e) => { e.stopPropagation(); prev(); };
async function start(m) {
  mode = m; await initAudio(); music.play().catch(() => {});
  document.body.classList.add('reading'); $('cover').classList.add('gone');
  // phones that ask before sharing their tilt (iPhone): ask now, inside the tap that starts the story
  try { await DeviceOrientationEvent?.requestPermission?.(); } catch {}
  goFull(); // the real full screen on Android; on the iPhone the page already fills the screen
  branch = null; show(0);
}
keepFull(); iosTip(lang);
$('readMe').onclick = () => start('voice');
$('readSelf').onclick = () => start('self');
$('again').onclick = () => { $('endcard').classList.remove('on'); branch = null; show(0); };
addEventListener('resize', () => { if (idx >= 0) fitFx(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); amb.pause(); voice.pause(); } else if (idx >= 0) { music.play().catch(() => {}); amb.play().catch(() => {}); } });
// test hook: open any panel, even while the current one waits for the child
window.__lina2 = { get idx() { return idx; }, get busy() { return busy; }, next, show, goto: (i) => { busy = false; keyAct = null; show(i); }, get branch() { return branch; } };
