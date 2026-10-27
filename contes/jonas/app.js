// Jonas et le grand poisson: the Bible comic on the reader of Nala 2. The child lives the story with Jonah: chooses
// what he will do, draws his flight, pays the captain, blows into the sail, keeps the ship upright in the storm (tilt,
// finger or arrow keys), throws the cargo overboard, finds him with the lamp and wakes him, shakes the pot of lots,
// rows, calms the sea, steers the great fish, counts the three nights, tickles the fish, walks across Nineveh, shouts
// with him (microphone or a button), dresses the king, grows the plant, finds the worm and lights up the city.
// Every phone gesture has a mouse or keyboard twin, and the microphone always has a button to fall back on.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610271400';

import { goFull, keepFull, iosTip } from '../fs.js?v=202610270300';
const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à vivre', back: '← Les contes', parents: 'Pour les parents : cette histoire peut utiliser le micro, pour souffler et crier, et l’inclinaison du téléphone pendant la tempête. Rien n’est enregistré ni envoyé. Sans micro, un bouton fait la même chose ; sur ordinateur, les flèches et la barre d’espace.', keys: 'Espace ou → : suivant',
    hello: 'Touche Jonas', choose: 'Choisis', route: 'Trace la route du bateau avec ton doigt', pay: 'Glisse les pièces dans la main du capitaine', blow: 'Souffle dans la voile', blowBtn: 'ou frotte avec ton doigt', steer: 'Penche, glisse ou utilise les flèches', toss: 'Jette tout par-dessus bord', lamp: 'Promène la lampe dans le noir', loupe: 'Glisse la loupe sur la plante', wake: 'Touche Jonas pour le réveiller', shake: 'Secoue le pot !', row: 'Glisse ton doigt vers le bas pour ramer', calm: 'Frotte les vagues', fish: 'Guide le poisson avec ton doigt', moons: 'Touche chaque lune', tickle: 'Chatouille le ventre du poisson', walk: 'Un pied, puis l’autre', shout: 'Crie « Ninive ! »', shoutBtn: 'Appuie longtemps ici', dress: 'Glisse le sac sur le roi', sounds: 'Touche les animaux', grow: 'Glisse vers le haut pour faire pousser', lights: 'Garde ton doigt appuyé', leap: 'Touche la mer' },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to live', back: '← Stories', parents: 'For parents: this story can use the microphone, to blow and to shout, and the tilt of the phone during the storm. Nothing is recorded or sent. Without a microphone, a button does the same; on a computer, the arrow keys and the space bar.', keys: 'Space or →: next',
    hello: 'Touch Jonah', choose: 'Choose', route: 'Draw the ship’s route with your finger', pay: 'Slide the coins into the captain’s hand', blow: 'Blow into the sail', blowBtn: 'or rub with your finger', steer: 'Tilt, slide or use the arrow keys', toss: 'Throw everything overboard', lamp: 'Move the lamp through the dark', loupe: 'Slide the glass over the plant', wake: 'Touch Jonah to wake him up', shake: 'Shake the pot!', row: 'Slide your finger down to row', calm: 'Rub the waves', fish: 'Guide the fish with your finger', moons: 'Touch each moon', tickle: 'Tickle the fish’s tummy', walk: 'One foot, then the other', shout: 'Shout “Nineveh!”', shoutBtn: 'Press and hold here', dress: 'Slide the sack onto the king', sounds: 'Touch the animals', grow: 'Slide up to make it grow', lights: 'Keep your finger pressed down', leap: 'Touch the sea' },
};
let T = TT[lang];
function applyLang() {
  T = TT[lang]; document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  $('title').textContent = TITLE[lang]; document.querySelector('.kick').textContent = T.kick; document.querySelector('.back').textContent = T.back;
  for (const el of document.querySelectorAll('a[href^="../"]')) el.href = `../?lang=${lang}`;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
  fetch(`voice/${lang}/timings.json?v=202610271400`).then((r) => r.json()).then((j) => (timings = j));
}
for (const b of document.querySelectorAll('[data-lang]')) b.onclick = () => { lang = b.dataset.lang; store.set('contes-lang', lang); applyLang(); };

let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {}, gen = 0; // gen: which page is showing; animations of an older page stop
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
applyLang();

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and theme
const SFX = ['page', 'pop', 'found', 'tap', 'chime', 'loupe', 'lamp', 'splash', 'thunder', 'whoosh', 'step', 'sparkle', 'gust', 'grow', 'bonk', 'bloop', 'coin', 'snore', 'rattle', 'oar', 'wave', 'gulp', 'giggle', 'burp', 'moo', 'heehaw', 'goat', 'baa', 'calm', 'leap', 'bubbles', 'murmur', 'cheer'];
async function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
  SFX.forEach(async (n) => { try { const r = await fetch(`sfx/${n}.mp3`); sfxBuf[n] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch {} });
}
// the mix: the storyteller always on top. Effects sit about 12 dB under the voice and dip further while
// someone speaks; the theme and the ambience duck under every line and come back between lines.
const SFX_GAIN = 0.3; let speaking = false;
function sfx(n, vol = 1) { const b = sfxBuf[n]; if (!ctx || !b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol * SFX_GAIN * (speaking ? 0.55 : 1); s.connect(g).connect(ctx.destination); s.start(); return s; }
const music = new Audio('sfx/theme.mp3'); music.loop = true; music.volume = 0.22;
const amb = new Audio(); amb.loop = true; amb.volume = 0.35;
const AMB = { 'amb-village': 0.35, 'amb-port': 0.4, 'amb-sea': 0.4, 'amb-storm': 0.45, 'amb-ark': 0.4, 'amb-under': 0.45, 'amb-belly': 0.45, 'amb-beach': 0.4, 'amb-desert': 0.4, 'amb-city': 0.35, 'amb-palace': 0.4, 'amb-night': 0.4, 'amb-sunset': 0.4 }; let ambLevel = 0.35;
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
  if (el.parentNode !== $('layer')) return; // the bubble left before its tail was drawn
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
function clearTexts() { for (const el of $('layer').querySelectorAll('.cap, .bubble, .tail')) { el.classList.add('gone'); setTimeout(() => el.remove(), 450); } } // when a game starts, the texts already read fly away so they never hide it
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

// ---------------------------------------------------------------- effects: sparkles over the panel
const fx = $('fx'), g = fx.getContext('2d'), lens = $('lens'), L = lens.getContext('2d'); let FW = 0, FH = 0; const sparks = [];
// the layout size of the panel, not the box of a page still turning in 3D
// the panel takes the height left on the screen once the hint, the key tip and the buttons are in, never more
// than its own shape allows in the width; measured, because phones differ in bars, notches and fonts
function fitPanel() {
  const pg = $('page'), pn = $('panel'), cs = getComputedStyle(pg), gap = parseFloat(cs.rowGap) || 10;
  let used = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 14; // 14: the panel's white edge and shadow
  for (const el of pg.children) { if (el === pn) continue; const s = getComputedStyle(el); if (s.display === 'none' || s.position === 'absolute') continue; used += el.offsetHeight + gap; }
  const [w, h] = (pn.style.aspectRatio || '1000 / 1778').split('/').map(Number), maxW = pg.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 22;
  pn.style.height = Math.max(200, Math.min(pg.clientHeight - used, maxW * h / w)) + 'px';
}
function fitFx() { fitPanel(); const d = Math.min(devicePixelRatio || 1, 2); FW = $('panel').clientWidth; FH = $('panel').clientHeight; for (const [c, k] of [[fx, g], [lens, L]]) { c.width = FW * d; c.height = FH * d; k.setTransform(d, 0, 0, d, 0, 0); } }
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

// ---------------------------------------------------------------- the games
// ---------------------------------------------------------------- the lamp and the magnifying glass
// The lamp: the panel goes dark, a warm pool of light follows the finger (mouse, arrow keys); the glass: the panel
// drawn enlarged inside a brass ring. What the child looks for is found after a moment under the light or the glass.
function lensTool(kind, a) {
  return new Promise((res) => {
    hint(T[kind]); sfx(kind); const g0 = gen;
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = kind === 'loupe' ? 2.6 : 1;
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now();
    const R = () => FW * (kind === 'loupe' ? 0.2 : 0.25);
    const draw = () => {
      if (done || gen !== g0) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last, x = pos[0] * FW, y = pos[1] * FH; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'lamp') {
        L.fillStyle = 'rgba(6,4,12,0.95)'; L.fillRect(0, 0, FW, FH);
        const r = R() * (1 + Math.sin(now / 90) * 0.03), gr = L.createRadialGradient(x, y, r * 0.15, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        L.globalCompositeOperation = 'destination-out'; L.fillStyle = gr; L.beginPath(); L.arc(x, y, r, 0, 7); L.fill(); L.globalCompositeOperation = 'source-over';
        L.fillStyle = 'rgba(255,170,60,0.12)'; L.beginPath(); L.arc(x, y, r * 0.8, 0, 7); L.fill();
        L.fillStyle = '#ffd27a'; L.beginPath(); L.ellipse(x, y - 4, 5, 9, 0, 0, 7); L.fill(); L.fillStyle = '#8a4b1f'; L.beginPath(); L.ellipse(x, y + 9, 13, 6, 0, 0, 7); L.fill();
      } else {
        L.save(); L.beginPath(); L.arc(x, y, R(), 0, 7); L.clip();
        const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
        L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH); L.restore();
        L.lineWidth = 9; L.strokeStyle = '#b5862f'; L.beginPath(); L.arc(x, y, R(), 0, 7); L.stroke();
        L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(x, y, R() - 5, 3.6, 4.6); L.stroke();
        const ang = 0.75; L.lineCap = 'round'; L.lineWidth = 16; L.strokeStyle = '#5a3a1c'; L.beginPath(); L.moveTo(x + Math.cos(ang) * (R() + 6), y + Math.sin(ang) * (R() + 6)); L.lineTo(x + Math.cos(ang) * (R() + 70), y + Math.sin(ang) * (R() + 70)); L.stroke();
      }
      held = near(pos, a.at, a.r) ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(a.at[0], a.at[1], 2, 50); // a little help after a while
      if (held > 380) {
        done = true; stop(); keyAct = null; L.clearRect(0, 0, FW, FH); sfx('found'); burst(a.at[0], a.at[1], 46); ring(a.at); hint('');
        if (a.after) { swapArt(a.after); if (a.amb) ambience(a.amb); }
        setTimeout(res, 600);
      }
    };
    requestAnimationFrame(draw);
    const stop = drag({ hover: true, down: (p) => (pos = p), move: (p) => (pos = p) });
    keyAct = (e, down) => { if (!down) return; const d = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key]; if (!d) return; pos = [Math.max(0, Math.min(1, pos[0] + d[0])), Math.max(0, Math.min(1, pos[1] + d[1]))]; return true; };
  });
}

// a silver coin, drawn here (the painted one carried lettering): a disc, its rim, an olive branch
function coinURL() {
  const c = document.createElement('canvas'); c.width = c.height = 120; const k = c.getContext('2d');
  const g = k.createRadialGradient(46, 40, 6, 60, 60, 58); g.addColorStop(0, '#fbfbf6'); g.addColorStop(0.6, '#c9c9c2'); g.addColorStop(1, '#8c8c86');
  k.fillStyle = g; k.beginPath(); k.arc(60, 60, 56, 0, 7); k.fill(); k.lineWidth = 5; k.strokeStyle = '#7a7a74'; k.stroke();
  k.lineWidth = 2; k.strokeStyle = 'rgba(90,90,84,0.8)'; k.beginPath(); k.arc(60, 60, 44, 0, 7); k.stroke();
  k.strokeStyle = '#6f6f69'; k.lineWidth = 3; k.beginPath(); k.moveTo(42, 82); k.quadraticCurveTo(58, 60, 78, 36); k.stroke();
  k.fillStyle = '#7d7d77'; for (let i = 0; i < 5; i++) { const u = 0.2 + i * 0.15, x = 42 + (78 - 42) * u, y = 82 + (36 - 82) * u; for (const s of [-1, 1]) { k.beginPath(); k.ellipse(x + s * 7, y + 3, 7, 3, s * 0.7, 0, 7); k.fill(); } }
  return c.toDataURL();
}

const acts = {
  loupe: (a) => lensTool('loupe', a),
  lamp: (a) => lensTool('lamp', a),
  // several steps in one panel: interactions and lines in between
  seq: async (a) => { const g0 = gen; for (const s of a.steps) { if (gen !== g0) return; if (s.say) await say(s.say); else { clearTexts(); await acts[s.kind](s); } } },
  hello: (a) => new Promise((res) => {
    hint(T.hello); const s = spot(a.at, a.r, 'soft');
    const go = () => { s.remove(); keyAct = null; sfx('chime'); word(a.word[lang], [a.at[0], a.at[1] - 0.18]); burst(a.at[0], a.at[1] - 0.12, 30); hint(''); setTimeout(res, 800); };
    s.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
  }),
  // what will Jonah do? two buttons; either answer leads on, with its own line
  ask: (a) => new Promise((res) => {
    hint(T.choose); const bs = [];
    const pick = async (o) => { for (const b of bs) b.remove(); keyAct = null; sfx('found'); burst(o.at[0], o.at[1], 30); hint(''); await say(o.line); res(); };
    for (const o of a.opts) { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o[lang]; b.style.left = o.at[0] * 100 + '%'; b.style.top = o.at[1] * 100 + '%'; $('spots').append(b); bs.push(b); b.onpointerdown = (e) => { e.stopPropagation(); pick(o); }; }
    keyAct = (e, down) => { if (!down) return; if (e.key === '1') { pick(a.opts[0]); return true; } if (e.key === '2' || e.key === ' ') { pick(a.opts[1]); return true; } };
  }),
  // Jonah's flight on the map: follow the dotted route with the finger, a little boat sails along it (space: it sails alone)
  trace: (a) => new Promise((res) => {
    hint(T.route); const pts = a.pts; let k = 0, active = false, done = false; const g0 = gen;
    const start = spot(pts[0], 0.06, 'soft');
    const boat = (x, y, ang) => { L.save(); L.translate(x, y); L.scale(-1, 1); const s = FW * 0.05; L.fillStyle = '#6b3d1c'; L.beginPath(); L.moveTo(-s, 0); L.lineTo(s, 0); L.lineTo(s * 0.7, s * 0.45); L.lineTo(-s * 0.7, s * 0.45); L.closePath(); L.fill(); L.fillStyle = '#fff6dc'; L.beginPath(); L.moveTo(0, -s * 1.3); L.lineTo(s * 0.8, -s * 0.1); L.lineTo(0, -s * 0.1); L.closePath(); L.fill(); L.strokeStyle = '#3b2610'; L.lineWidth = 2; L.beginPath(); L.moveTo(0, 0); L.lineTo(0, -s * 1.3); L.stroke(); L.restore(); };
    const draw = () => {
      L.clearRect(0, 0, FW, FH); L.lineCap = 'round';
      L.setLineDash([6, 10]); L.lineWidth = 3; L.strokeStyle = 'rgba(120,40,20,0.45)'; L.beginPath(); pts.forEach(([x, y], i) => (i ? L.lineTo(x * FW, y * FH) : L.moveTo(x * FW, y * FH))); L.stroke();
      if (k > 0) { L.setLineDash([10, 9]); L.lineWidth = 6; L.strokeStyle = '#c0392b'; L.beginPath(); for (let i = 0; i <= k; i++) { const [x, y] = pts[i]; i ? L.lineTo(x * FW, y * FH) : L.moveTo(x * FW, y * FH); } L.stroke(); }
      L.setLineDash([]); boat(pts[k][0] * FW, pts[k][1] * FH);
    };
    draw();
    const finish = () => { if (done) return; done = true; stop(); keyAct = null; sfx('found'); const e = pts[pts.length - 1]; burst(e[0], e[1], 40); word(lang === 'fr' ? 'TARSIS !' : 'TARSHISH!', [0.24, e[1] - 0.08]); hint(''); setTimeout(() => { if (gen === g0) { L.clearRect(0, 0, FW, FH); res(); } }, 1400); };
    const stop = drag({
      down: (p) => { active = near(p, pts[Math.max(0, k)], 0.12); if (active && start.isConnected) { start.remove(); sfx('whoosh', 0.6); } },
      move: (p, down) => { if (!down || !active) return; while (k < pts.length - 1 && near(p, pts[k + 1], 0.1)) { k++; if (k % 3 === 0) { burst(pts[k][0], pts[k][1], 4, 200); sfx('bloop', 0.4); } } draw(); if (k >= pts.length - 1) finish(); },
    });
    keyAct = (e, down) => { if (down && e.key === ' ' && !active) { active = true; start.remove(); const step = () => { if (gen !== g0 || done) return; k++; draw(); if (k >= pts.length - 1) finish(); else setTimeout(step, 90); }; step(); return true; } };
  }),
  // drag things to a place: coins into the captain's hand (they stack), cargo over the rail (it falls into the
  // sea), the sackcloth onto the king (the picture changes). The space bar moves the next thing on its own.
  drop: (a) => new Promise((res) => {
    hint(T[a.hint]); let n = 0; const g0 = gen; const coin = coinURL();
    const inZone = (p) => a.to ? near(p, a.to.at, a.to.r) : a.zones.some(([x0, y0, x1, y1]) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1);
    const target = a.to ? spot(a.to.at, a.to.r, 'soft') : null;
    const land = (el, p) => {
      el.onpointerdown = el.onpointermove = el.onpointerup = el.onpointercancel = null; el.classList.remove('glow', 'held'); el._done = true; n++;
      if (a.mode === 'stack') { el.style.left = (a.to.at[0] + (n - 2) * 0.012) * 100 + '%'; el.style.top = (a.to.at[1] - n * 0.012) * 100 + '%'; el.style.width = a.items[0].w * 70 + '%'; sfx(a.sfx); burst(a.to.at[0], a.to.at[1], 16, 50); if (a.count) word(String(n), [a.to.at[0] + 0.1, a.to.at[1] - 0.12]); }
      else if (a.mode === 'sea') {
        // over the rail it tips and falls into the waves, a splash and rings of foam
        const side = p[0] < 0.5 ? -1 : 1, x = side < 0 ? 0.08 : 0.93; el.style.transition = 'left .7s ease-in, top .7s ease-in, transform .7s, opacity .7s'; el.style.left = x * 100 + '%'; el.style.top = Math.min(0.95, p[1] + 0.12) * 100 + '%'; el.style.transform = `translate(-50%,-50%) rotate(${side * 120}deg) scale(.6)`; el.style.opacity = '0';
        setTimeout(() => { if (gen !== g0) return; sfx(a.sfx); buzz(40); burst(x, Math.min(0.95, p[1] + 0.12), 30, 190); word(a.word[lang], [x < 0.5 ? 0.2 : 0.78, p[1]]); el.remove(); }, 650);
      } else { sfx(a.sfx); el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(1.6)'; swapArt(a.after); burst(a.to.at[0], a.to.at[1], 40, 35); setTimeout(() => el.remove(), 600); }
      if (n === a.items.length) { target?.remove(); keyAct = null; hint(''); setTimeout(() => { if (gen === g0) res(); }, a.mode === 'swap' ? 1400 : 1100); }
    };
    const els = a.items.map((it) => {
      const el = document.createElement('img'); el.src = it.src === 'coin' ? coin : it.src; el.className = 'item glow'; el.style.width = it.w * 100 + '%'; el.style.left = it.at[0] * 100 + '%'; el.style.top = it.at[1] * 100 + '%'; el.draggable = false; $('spots').append(el); el._home = it.at;
      el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation(); el.classList.add('held'); try { el.setPointerCapture(e.pointerId); } catch {} sfx('tap', 0.5);
        el.onpointermove = (ev) => { const p = toPanel(ev); el.style.left = p[0] * 100 + '%'; el.style.top = p[1] * 100 + '%'; };
        el.onpointerup = el.onpointercancel = (ev) => { el.onpointermove = null; el.classList.remove('held'); const p = toPanel(ev); if (inZone(p)) land(el, p); else { el.style.left = el._home[0] * 100 + '%'; el.style.top = el._home[1] * 100 + '%'; } };
      };
      return el;
    });
    keyAct = (e, down) => { if (down && e.key === ' ') { const el = els.find((x) => !x._done); if (el) { const p = a.to ? a.to.at : [0.1, el._home[1]]; land(el, p); } return true; } };
  }),
  // blow into the sail (microphone), or rub it with the finger: the full sail appears where the wind has been
  blow: (a) => new Promise(async (res) => {
    hint(T.blow); const after = await img(`art/${a.after}.jpg`); const mic = await micOn(); const g0 = gen;
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d');
    let done = false, lastS = 0;
    const paint = () => { L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over'; };
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const clear = (p, r) => { m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * r, 0, 7); m.fill(); paint(); if (Math.random() < 0.5) burst(p[0], p[1], 2, 190); const now = performance.now(); if (now - lastS > 500) { lastS = now; sfx('gust', 0.5); } check(); };
    const check = () => { if (!done && cover() > 0.6) { done = true; stop(); keyAct = null; alt.remove(); sfx('found'); swapArt(a.after); word(lang === 'fr' ? 'EN AVANT !' : 'AWAY WE GO!', [0.5, 0.6]); burst(0.55, 0.4, 40, 190); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(res, 1200); } };
    const stop = drag({ down: (p) => clear(p, 0.1), move: (p, down) => down && clear(p, 0.1) });
    const alt = altButton(T.blowBtn); alt.onpointerdown = (e) => { e.stopPropagation(); for (let i = 0; i < 8; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.08); };
    keyAct = (e, down) => { if (down && e.key === ' ') { alt.onpointerdown(new PointerEvent('pointerdown')); return true; } };
    // a breath fills the sail from its middle outwards
    const tick = () => { if (done || gen !== g0) return; const lv = mic ? micLevel() : 0; if (lv > 0.12) for (let i = 0; i < 3; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.05 + lv * 0.05); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }),
  // the storm: the waves rock the ship, the child keeps it upright by tilting the phone the other way (or sliding the
  // finger, or the arrow keys). Rain, spray and lightning all the while; the meter fills while the ship is level.
  storm: (a) => new Promise((res) => {
    hint(T.steer); const g0 = gen, art = $('art'); art.classList.add('rock'); art.style.transformOrigin = `${a.pivot[0] * 100}% ${a.pivot[1] * 100}%`;
    const vign = document.createElement('div'); vign.className = 'vign'; $('panel').insertBefore(vign, $('fx'));
    let th = 0, om = 0, c = 0, tilt = null, finger = null, ok = 0, last = performance.now(), t0 = last, flashT = 0, nextBolt = 2500, warned = 0, done = false; const drops = [];
    const onTilt = (e) => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 25)); };
    addEventListener('deviceorientation', onTilt);
    const stop = drag({ hover: false, down: (p) => (finger = (p[0] - 0.5) * 2.4), move: (p, down) => { if (down) finger = (p[0] - 0.5) * 2.4; }, up: () => (finger = null) });
    keyAct = (e) => ['ArrowLeft', 'ArrowRight'].includes(e.key);
    const frame = (now) => {
      if (gen !== g0) { removeEventListener('deviceorientation', onTilt); return; }
      const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
      let k = 0; if (keys.has('ArrowLeft')) k -= 1; if (keys.has('ArrowRight')) k += 1;
      c = Math.max(-1.2, Math.min(1.2, (finger ?? 0) + (tilt ?? 0) + k));
      const A = 26 + Math.min(t, 10) * 2.4, wave = A * (Math.sin(t * 0.95) + 0.6 * Math.sin(t * 2.3 + 1.3) + 0.3 * Math.sin(t * 4.1));
      om += (wave + c * 60 - th * 3.2 - om * 1.6) * dt; th = Math.max(-34, Math.min(34, th + om * dt));
      if (!done) art.style.transform = `scale(1.32) rotate(${th.toFixed(2)}deg) translateY(${(Math.sin(t * 1.7) * 1.5).toFixed(2)}%)`;
      const level = Math.abs(th) < 11; if (level && !done) ok += dt; vign.classList.toggle('on', Math.abs(th) > 20 && !done);
      if (Math.abs(th) > 22 && now - warned > 900) { warned = now; sfx('wave', 0.6); buzz(60); burst(th > 0 ? 0.75 : 0.2, 0.62, 18, 195); }
      meter(ok / a.secs);
      // rain streaks and lightning
      for (let i = 0; i < 7; i++) drops.push({ x: Math.random() * FW * 1.3, y: -20, v: 16 + Math.random() * 8 });
      g.strokeStyle = 'rgba(215,228,240,0.55)'; g.lineWidth = 1.5; g.beginPath();
      for (const d of drops) { d.x -= d.v * 0.3; d.y += d.v; g.moveTo(d.x, d.y); g.lineTo(d.x + 5, d.y - 17); } g.stroke();
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].y > FH + 20) drops.splice(i, 1);
      if (now - t0 > nextBolt) { nextBolt = now - t0 + 3000 + Math.random() * 3000; flashT = now; sfx('thunder', 0.7); buzz([30, 40, 80]); }
      if (now - flashT < 260) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - (now - flashT) / 260)})`; g.fillRect(0, 0, FW, FH); }
      if (!done && ok >= a.secs) {
        done = true; stop(); keyAct = null; removeEventListener('deviceorientation', onTilt); meter(null); vign.remove(); hint(''); sfx('found'); word(lang === 'fr' ? 'BRAVO !' : 'WELL DONE!', [0.5, 0.4]);
        art.style.transition = 'transform 1.2s ease-out'; art.style.transform = 'scale(1.32) rotate(0deg)';
        setTimeout(() => { if (gen === g0) res(); }, 1300);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // touch quickly, again and again (wake Jonah up, tickle the fish): a little word at each touch, then the picture changes
  rapid: (a) => new Promise((res) => {
    hint(T[a.hint]); const g0 = gen; let n = 0, done = false; const s = spot(a.at, a.r, 'soft');
    const zz = a.snore ? setInterval(() => { if (gen !== g0 || done) return clearInterval(zz); word('Zzz', [a.snore[0] + Math.random() * 0.05, a.snore[1]]); if (Math.random() < 0.5) sfx('snore', 0.6); }, 1900) : 0;
    if (a.meter) meter(0);
    const hit = () => {
      if (done) return; n++; sfx(a.sfx, 0.8); shake(); buzz(25); burst(a.at[0] + (Math.random() - 0.5) * 0.1, a.at[1] + (Math.random() - 0.5) * 0.08, 10, 40);
      const w = a.words[lang]; if (n % 2 === 1) word(w[Math.floor(n / 2) % w.length], [a.at[0], a.at[1] - 0.14]);
      if (a.meter) meter(n / a.n);
      if (n >= a.n) { done = true; clearInterval(zz); s.remove(); keyAct = null; meter(null); hint(''); if (a.endSfx) sfx(a.endSfx); else sfx('found'); word(a.end[lang], [0.5, 0.45]); burst(a.at[0], a.at[1], 40); buzz([60, 40, 120]); swapArt(a.after); setTimeout(() => { if (gen === g0) res(); }, 1500); }
    };
    s.onpointerdown = (e) => { e.stopPropagation(); hit(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { hit(); return true; } };
  }),
  // casting lots: shake the pot (shake the phone, wiggle the finger left and right on it, or the space bar); the
  // pebbles rattle and the marked one jumps out and rolls to Jonah
  lots: (a) => new Promise(async (res) => {
    hint(T.shake); const g0 = gen; const [pot, peb] = await Promise.all([img('art/pot.png'), img('art/pebble.png')]);
    let energy = 0, wob = 0, lastX = null, dir = 0, lastR = 0, done = false, last = performance.now(), pebT = 0;
    const onMotion = (e) => { const ac = e.accelerationIncludingGravity || e.acceleration; if (!ac) return; const m = Math.hypot(ac.x || 0, ac.y || 0, ac.z || 0); if (m > 16) kick(0.05); };
    addEventListener('devicemotion', onMotion);
    const kick = (k) => { if (done) return; energy = Math.min(1, energy + k); wob = Math.min(1.4, wob + 0.5); const now = performance.now(); if (now - lastR > 260) { lastR = now; sfx('rattle', 0.8); buzz(20); } };
    const stop = drag({ down: (p) => (lastX = p[0]), move: (p, down) => { if (!down || lastX == null) return; const d = p[0] - lastX; if (Math.abs(d) > 0.02) { const nd = Math.sign(d); if (nd !== dir) { dir = nd; kick(0.09); } lastX = p[0]; } }, up: () => (lastX = null) });
    keyAct = (e, down) => { if (down && e.key === ' ') { kick(0.12); return true; } };
    const frame = (now) => {
      if (gen !== g0) { removeEventListener('devicemotion', onMotion); return; } const dt = Math.min(0.05, (now - last) / 1000); last = now;
      wob = Math.max(0, wob - dt * 1.5); meter(energy);
      L.clearRect(0, 0, FW, FH);
      const w = FW * a.w, h = w * pot.height / pot.width, x = a.at[0] * FW, y = a.at[1] * FH;
      if (!done && energy >= 1) { done = true; pebT = now; stop(); keyAct = null; removeEventListener('devicemotion', onMotion); meter(null); hint(''); sfx('bloop'); }
      if (pebT) {
        // the pebble's jump: up out of the pot, then bouncing and rolling to Jonah
        const k = Math.min(1, (now - pebT) / 1400), px = x + (a.to[0] * FW - x) * k, py = y - h * 0.45 + (a.to[1] * FH - (y - h * 0.45)) * k - Math.sin(k * Math.PI) * FH * 0.18 - Math.abs(Math.sin(k * Math.PI * 3)) * FH * 0.02 * (1 - k), pw = FW * 0.07;
        L.save(); L.translate(px, py); L.rotate(k * 12); L.drawImage(peb, -pw / 2, -pw * peb.height / peb.width / 2, pw, pw * peb.height / peb.width); L.restore();
        if (k >= 1 && pebT > 0) { pebT = -1; sfx('found'); ring(a.to); burst(a.to[0], a.to[1], 40); word(a.word[lang], [a.to[0] - 0.12, a.to[1] - 0.16]); setTimeout(() => { if (gen === g0) res(); }, 1400); }
      } else if (pebT < 0) { const pw = FW * 0.07; L.drawImage(peb, a.to[0] * FW - pw / 2, a.to[1] * FH - pw * 0.3, pw, pw * peb.height / peb.width); }
      L.save(); L.translate(x, y + h / 2); L.rotate(Math.sin(now / 45) * 0.22 * wob); L.drawImage(pot, -w / 2, -h, w, h); L.restore();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // rowing: each stroke (a finger slid down, or the space bar) pulls the ship towards the land; at the end a huge wave
  // pushes it all the way back
  row: (a) => new Promise((res) => {
    hint(T.row); const g0 = gen, art = $('art'); art.style.transition = 'transform .6s cubic-bezier(.2,.8,.3,1)'; let n = 0, from = null, done = false; meter(0);
    const stroke = () => {
      if (done) return; n++; sfx('oar'); buzz(30); burst(0.25, 0.75, 14, 195); meter(n / a.n);
      art.style.transform = `scale(1.12) translateX(${(n * 1.3).toFixed(1)}%)`; word(String(n), [0.3, 0.5]);
      if (n >= a.n) {
        done = true; stop(); keyAct = null; meter(null); hint('');
        setTimeout(() => { if (gen !== g0) return; sfx('wave'); buzz([80, 40, 200]); art.style.transition = 'transform 1.1s cubic-bezier(.5,0,.3,1)'; art.style.transform = 'scale(1.12) translateX(-3%) rotate(-3deg)'; shake(); burst(0.8, 0.55, 60, 195); word(lang === 'fr' ? 'TROP FORT !' : 'TOO STRONG!', [0.5, 0.4]); }, 700);
        setTimeout(() => { if (gen !== g0) return; art.style.transform = 'scale(1.12)'; res(); }, 2600);
      }
    };
    const stop = drag({ down: (p) => (from = p), move: (p, down) => { if (down && from && p[1] - from[1] > 0.1) { from = null; stroke(); } }, up: () => (from = null) });
    keyAct = (e, down) => { if (down && (e.key === ' ' || e.key === 'ArrowDown')) { stroke(); return true; } };
  }),
  // rub the waves flat: the calm sea appears under the finger (space: wide strokes on their own)
  paint: (a) => new Promise(async (res) => {
    hint(T.calm); const after = await img(`art/${a.after}.jpg`); const g0 = gen;
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d'); let last = 0, done = false;
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const brush = (p) => {
      m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * 0.11, 0, 7); m.fill();
      L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.3) burst(p[0], p[1], 3, 175); const now = performance.now(); if (now - last > 500) { last = now; sfx('gust', 0.3); }
      if (!done && cover() > 0.6) { done = true; stop(); keyAct = null; sfx('calm'); ambience(a.amb); swapArt(a.after); burst(0.5, 0.6, 50, 175); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(() => { if (gen === g0) res(); }, 1400); }
    };
    const stop = drag({ down: brush, move: (p, down) => down && brush(p) });
    keyAct = (e, down) => { if (down && e.key === ' ') { const y = a.box[1] + Math.random() * (a.box[3] - a.box[1]); for (let x = 0; x <= 1; x += 0.08) brush([x, y]); return true; } };
  }),
  // the great fish follows the finger (or the arrow keys) through the water; its mouth on Jonah: gulp!
  fish: (a) => new Promise(async (res) => {
    hint(T.fish); const g0 = gen; const el = document.createElement('img'); el.src = 'art/fish.png'; el.className = 'fish'; el.style.width = '88%'; $('spots').append(el);
    let pos = [...a.start], goal = [...a.start], face = 1, last = performance.now(), done = false, gone = 0, lastB = 0;
    const stop = drag({ hover: true, down: (p) => (goal = p), move: (p) => (goal = p) });
    keyAct = (e, down) => { if (!down) return; if (e.key === ' ') { goal = [a.at[0] - 0.38, a.at[1]]; return true; } const d = { ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key]; if (!d) return; goal = [Math.max(0, Math.min(1, goal[0] + d[0])), Math.max(0.1, Math.min(0.95, goal[1] + d[1]))]; return true; };
    const frame = (now) => {
      if (gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (gone) { pos[0] += dt * 0.5; el.style.opacity = String(Math.max(0, 1 - (now - gone) / 1500)); }
      else { const dx = goal[0] - pos[0], dy = goal[1] - pos[1]; pos[0] += dx * Math.min(1, dt * 2.2); pos[1] += dy * Math.min(1, dt * 2.2); if (Math.abs(dx) > 0.02) face = dx > 0 ? 1 : -1; }
      const bob = Math.sin(now / 400) * 0.008, mouth = [pos[0] + face * 0.38, pos[1] + 0.01];
      el.style.left = pos[0] * 100 + '%'; el.style.top = (pos[1] + bob) * 100 + '%'; el.style.transform = `translate(-50%,-50%) scaleX(${face}) rotate(${Math.sin(now / 300) * 3}deg)`;
      if (now - lastB > 300) { lastB = now; burst(pos[0] - face * 0.4, pos[1] - 0.03, 3, 190); }
      if (!done && near(mouth, a.at, 0.11)) {
        done = true; stop(); keyAct = null; hint(''); sfx('gulp'); buzz([60, 30, 120]); swapArt(a.after); burst(a.at[0], a.at[1], 50, 190); word(lang === 'fr' ? 'GLOUPS !' : 'GULP!', [a.at[0], a.at[1] - 0.15]);
        setTimeout(() => { sfx('bubbles'); gone = performance.now(); face = 1; }, 900); setTimeout(() => { if (gen === g0) { el.remove(); res(); } }, 2600);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // three days and three nights: touch each moon, it counts
  moons: (a) => new Promise((res) => {
    hint(T.moons); let n = 0; const g0 = gen;
    const ss = a.spots.map((at) => { const s = spot(at, 0.08, 'soft moon'); s.textContent = '☾'; s.onpointerdown = (e) => { e.stopPropagation(); hit(s, at); }; return s; });
    const hit = (s, at) => { if (s.done) return; s.done = true; s.classList.add('done'); n++; sfx('chime'); burst(at[0], at[1], 24, 50); word(String(n), [at[0], at[1] + 0.1]); if (n === ss.length) { keyAct = null; hint(''); setTimeout(() => { if (gen === g0) { for (const x of ss) x.remove(); res(); } }, 1100); } };
    keyAct = (e, down) => { if (down && e.key === ' ') { const i = ss.findIndex((s) => !s.done); if (i >= 0) hit(ss[i], a.spots[i]); return true; } };
  }),
  // walking across Nineveh: left foot, right foot (the buttons, or the left and right arrows); the city comes closer
  // with each step and a day goes by every third of the way
  walk: (a) => new Promise((res) => {
    hint(T.walk); const g0 = gen, art = $('art'); art.style.transformOrigin = `${a.zoom[0] * 100}% ${a.zoom[1] * 100}%`; art.style.transition = 'transform .4s ease-out';
    let n = 0, want = 0, done = false; meter(0);
    const label = document.createElement('div'); label.className = 'phase count'; label.style.left = '50%'; label.style.top = '28%'; $('layer').append(label);
    const foot = (side, x) => { const b = document.createElement('button'); b.className = 'foot2'; b.style.left = x * 100 + '%'; b.innerHTML = `<svg viewBox="0 0 24 24" style="transform:scaleX(${side ? -1 : 1})"><path d="M8 2c2 0 3 2 3 5s-1 6-1 8-1 3-3 3-3-2-3-5 1-11 4-11zm-1 17c2 0 3 1 3 2s-1 2-3 2-3-1-3-2 1-2 3-2z"/></svg>`; $('spots').append(b); b.onpointerdown = (e) => { e.stopPropagation(); step(side); }; return b; };
    const fs = [foot(0, 0.32), foot(1, 0.68)];
    const show = () => fs.forEach((b, i) => b.classList.toggle('next', i === want));
    const step = (side) => {
      if (done) return; if (side !== want) { sfx('tap', 0.4); return; }
      n++; want = 1 - want; show(); sfx('step', 0.8); buzz(15); burst(side ? 0.6 : 0.4, 0.86, 8, 35); meter(n / a.steps);
      art.style.transform = `scale(${(1 + 0.55 * n / a.steps).toFixed(3)})`;
      const per = a.steps / 3; if (n % per === 0) { const d = n / per; label.textContent = (lang === 'fr' ? 'Jour ' : 'Day ') + d; sfx('chime', 0.7); burst(0.5, 0.28, 30, 45); }
      if (n >= a.steps) { done = true; keyAct = null; for (const b of fs) b.remove(); meter(null); hint(''); sfx('found'); word(lang === 'fr' ? 'NINIVE !' : 'NINEVEH!', [0.5, 0.5]); setTimeout(() => { if (gen === g0) { label.remove(); res(); } }, 1500); }
    };
    show();
    keyAct = (e, down) => { if (!down) return; if (e.key === 'ArrowLeft') { step(0); return true; } if (e.key === 'ArrowRight') { step(1); return true; } if (e.key === ' ') { step(want); return true; } };
  }),
  // shout with Jonah: the louder, the faster the meter fills (a long press or the space bar does it too); the crowd turns
  shout: (a) => new Promise(async (res) => {
    hint(T.shout); meter(0);
    const mic = await micOn(); let k = 0, held = false, done = false, last = performance.now(); const g0 = gen;
    const alt = altButton(T.shoutBtn); alt.onpointerdown = (e) => { e.stopPropagation(); held = true; }; alt.onpointerup = alt.onpointerleave = alt.onpointercancel = () => (held = false);
    keyAct = (e, down) => { if (e.key === ' ') { held = down; return true; } };
    const tick = () => {
      if (done || gen !== g0) return; const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const lv = mic ? micLevel() : 0;
      k += (lv > 0.18 ? lv * 0.9 : 0) * dt + (held ? 0.45 * dt : 0) - 0.04 * dt; k = Math.max(0, k); meter(k);
      if (lv > 0.18 || held) { if (Math.random() < 0.3) burst(0.5, 0.38, 3, 40); if (Math.random() < 0.05) shake(); }
      if (k >= 1) { done = true; keyAct = null; alt.remove(); meter(null); hint(''); sfx('murmur'); buzz([80, 40, 160]); word(a.word[lang], [0.5, 0.3]); burst(0.5, 0.4, 50); swapArt(a.after); setTimeout(() => { if (gen === g0) res(); }, 1800); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }),
  sounds: (a) => new Promise((res) => {
    hint(a.hint?.[lang] || T.sounds); let n = 0; const g0 = gen; const ss = [];
    const hit = (s, p) => { sfx(p.sfx); word(p.word[lang], [p.at[0], p.at[1] - 0.1]); burst(p.at[0], p.at[1], 14, 100); if (!s.done) { s.done = true; s.classList.add('done'); if (++n === a.spots.length) { keyAct = null; hint(''); setTimeout(() => { if (gen === g0) res(); }, 1000); } } };
    for (const p of a.spots) { const s = spot(p.at, a.r || 0.09, 'soft'); ss.push(s); s.onpointerdown = (e) => { e.stopPropagation(); hit(s, p); }; }
    keyAct = (e, down) => { if (down && e.key === ' ') { const i = ss.findIndex((s) => !s.done); if (i >= 0) hit(ss[i], a.spots[i]); return true; } };
  }),
  // the plant grows: slide up (or hold the up arrow, or the space bar) and the leafy plant rises from the ground over the hut
  grow: (a) => new Promise(async (res) => {
    hint(T.grow); const after = await img(`art/${a.after}.jpg`); const g0 = gen; let k = 0, lastY = null, done = false, snd = 0;
    const draw = () => {
      L.clearRect(0, 0, FW, FH); const top = FH * (a.stem[1] - (a.stem[1] - a.top) * k) ;
      L.save(); L.beginPath(); L.rect(0, top, FW, FH - top); L.clip(); L.drawImage(after, 0, 0, FW, FH); L.restore();
      // the growing edge glows a little
      const gr = L.createLinearGradient(0, top - 14, 0, top + 14); gr.addColorStop(0, 'rgba(180,255,150,0)'); gr.addColorStop(0.5, 'rgba(180,255,150,0.35)'); gr.addColorStop(1, 'rgba(180,255,150,0)'); L.fillStyle = gr; L.fillRect(0, top - 14, FW, 28);
    };
    const grow = (d) => {
      if (done || d <= 0) return; k = Math.min(1, k + d); draw(); meter(k); const now = performance.now();
      if (now - snd > 600) { snd = now; sfx('grow', 0.6); burst(a.stem[0] + (Math.random() - 0.3) * 0.3, a.stem[1] - (a.stem[1] - a.top) * k, 8, 110); }
      if (k >= 1) { done = true; stop(); keyAct = null; meter(null); hint(''); sfx('found'); swapArt(a.after); burst(0.4, 0.35, 50, 110); word(lang === 'fr' ? 'DE L’OMBRE !' : 'SHADE!', [0.62, 0.45]); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); setTimeout(() => { if (gen === g0) res(); }, 1500); }
    };
    meter(0); draw();
    const stop = drag({ down: (p) => (lastY = p[1]), move: (p, down) => { if (!down || lastY == null) return; grow((lastY - p[1]) * 1.5); lastY = p[1]; }, up: () => (lastY = null) });
    keyAct = (e, down) => { if (down && ['ArrowUp', ' '].includes(e.key)) { grow(0.08); return true; } };
  }),
  // the lights of Nineveh: keep a finger down (or the space bar) and the city lights up, house after house, while the
  // count climbs to 120 000 people (each light is a hundred of them)
  lights: (a) => new Promise((res) => {
    hint(T.lights); const g0 = gen; let held = false, k = 0, last = performance.now(), done = false, snd = 0;
    const N = Math.round(a.total / 100), pts = [];
    while (pts.length < N) { const x = a.box[0] + Math.random() * (a.box[2] - a.box[0]), y = a.box[1] + Math.pow(Math.random(), 0.8) * (a.box[3] - a.box[1]); if (x > a.not[0] && y > a.not[1]) continue; pts.push({ x, y, r: 0.8 + Math.random() * 1.6, p: Math.random() * 6.28, h: 30 + Math.random() * 25 }); }
    const label = document.createElement('div'); label.className = 'phase count'; label.style.left = '50%'; label.style.top = '30%'; $('layer').append(label);
    const fmt = (v) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB');
    const stop = drag({ down: () => (held = true), up: () => (held = false) });
    keyAct = (e, down) => { if (e.key === ' ') { held = down; return true; } };
    meter(0);
    const frame = (now) => {
      if (gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (held && !done) { k = Math.min(1, k + dt / 6); if (now - snd > 700) { snd = now; sfx('sparkle', 0.5); } }
      const n = Math.floor(k * N); label.textContent = fmt(Math.round(k * a.total / 100) * 100); meter(k);
      L.clearRect(0, 0, FW, FH); L.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) { const q = pts[i], tw = 0.7 + Math.sin(now / 500 + q.p) * 0.3; L.fillStyle = `hsla(${q.h},100%,70%,${0.75 * tw})`; L.beginPath(); L.arc(q.x * FW, q.y * FH, q.r, 0, 7); L.fill(); if (i % 9 === 0) { L.fillStyle = `hsla(${q.h},100%,60%,${0.12 * tw})`; L.beginPath(); L.arc(q.x * FW, q.y * FH, q.r * 6, 0, 7); L.fill(); } }
      L.globalCompositeOperation = 'source-over';
      if (!done && k >= 1) { done = true; stop(); keyAct = null; meter(null); hint(''); sfx('cheer', 0.7); burst(0.5, 0.55, 60, 45); word(fmt(a.total) + ' !', [0.5, 0.45]); setTimeout(() => { if (gen === g0) res(); }, 1800); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // goodbye: the great fish leaps out of the sea where the child touches
  leap: (a) => new Promise(async (res) => {
    hint(T.leap); const g0 = gen; const fish = await img('art/fish.png'); const s = spot(a.at, a.r, 'soft'); let t0 = 0;
    const go = () => { if (t0) return; t0 = performance.now(); s.remove(); keyAct = null; hint(''); sfx('leap'); requestAnimationFrame(frame); };
    const frame = (now) => {
      if (gen !== g0) return; const k = Math.min(1, (now - t0) / 1800); L.clearRect(0, 0, FW, FH);
      const x = (a.at[0] - 0.15 + k * 0.3) * FW, y = a.at[1] * FH - Math.sin(k * Math.PI) * FH * 0.22, w = FW * 0.62, h = w * fish.height / fish.width;
      L.save(); L.translate(x, y); L.rotate(-0.9 + k * 1.8); L.drawImage(fish, -w / 2, -h / 2, w, h); L.restore();
      if (k > 0.05 && k < 0.15) burst(a.at[0] - 0.12, a.at[1], 6, 195);
      if (k >= 1) { L.clearRect(0, 0, FW, FH); sfx('splash'); burst(a.at[0] + 0.15, a.at[1], 50, 195); word(a.word[lang], [0.45, 0.4]); setTimeout(() => { if (gen === g0) res(); }, 1400); return; }
      requestAnimationFrame(frame);
    };
    s.onpointerdown = (e) => { e.stopPropagation(); go(); };
    keyAct = (e, down) => { if (down && e.key === ' ') { go(); return true; } };
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
  for (const l of p.labels || []) { const el = document.createElement('div'); el.className = 'maplabel'; el.textContent = l[lang]; el.style.left = l.at[0] * 100 + '%'; el.style.top = l.at[1] * 100 + '%'; $('layer').append(el); }
  await sleep(450); if (gone()) return;
  if (p.sfx) { sfx(p.sfx); await sleep(1200); if (gone()) return; } // the panel's own sound first, then the story
  const early = p.act?.pre ? acts[p.act.kind](p.act) : null; // some scenes start moving while the narrator speaks
  for (const ln of p.lines) { await say(ln); if (gone()) return; }
  if (p.act) { clearTexts(); await (early || acts[p.act.kind](p.act)); if (gone()) return; for (const ln of p.act.then || []) { if (ln.sfx) { sfx(ln.sfx); await sleep(900); } await say(ln); if (gone()) return; } }
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
  try { await DeviceMotionEvent?.requestPermission?.(); } catch {}
  goFull(); // the real full screen on Android; on the iPhone the page already fills the screen
  branch = null; show(0);
}
keepFull(); iosTip(lang);
$('readMe').onclick = () => start('voice');
$('readSelf').onclick = () => start('self');
$('again').onclick = () => { $('endcard').classList.remove('on'); branch = null; show(0); };
addEventListener('resize', () => { if (idx >= 0) fitFx(); });
visualViewport?.addEventListener('resize', () => { if (idx >= 0) fitFx(); }); // the phone's address bar coming and going
document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); amb.pause(); voice.pause(); } else if (idx >= 0) { music.play().catch(() => {}); amb.play().catch(() => {}); } });
// test hook: open any panel, even while the current one waits for the child
window.__jonas = { get idx() { return idx; }, get busy() { return busy; }, next, show, goto: (i) => { busy = false; keyAct = null; show(i); }, get branch() { return branch; } };
