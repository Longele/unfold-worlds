// Nala et la planète rouge: the second Nala comic, on the reader of the first one. The child uses the device itself:
// slides the wheels onto the rover, finds Mars with the binoculars, shouts the countdown, draws the route around the
// Sun, lands with braking rockets, looks at the rusty dust through a magnifying glass, drives between the rocks in 3D
// (tilt, finger, mouse or arrow keys), blows the dust off the solar panels, grows Olympus Mons next to Everest, finds
// the two moons and brings the blue sunset down. Every phone gesture has a mouse or keyboard twin, and the
// microphone always has a button to fall back on.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610270300';

import { goFull, keepFull, iosTip } from '../fs.js?v=202610270300';
const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à vivre', back: '← Les contes', parents: 'Pour les parents : cette histoire peut utiliser le micro, pour crier et souffler. Rien n’est enregistré. Sans micro, un bouton fait la même chose.', keys: 'Espace ou → : suivant',
    wheels: 'Glisse les roues sur le rover', vroom: 'VROUM !', binocs: 'Glisse les jumelles dans le ciel', scope: 'Glisse le télescope vers le point rouge', loupe: 'Glisse la loupe sur la poussière', shout: 'Crie « décollage ! »', shoutBtn: 'Appuie longtemps ici', trace: 'Trace la route avec ton doigt, de la Terre à Mars', tooHot: 'Trop chaud !', months: (n) => n === 1 ? '1 mois' : `${n} mois`,
    retro: 'Appuie pour freiner, lâche pour descendre', retroBtn: 'Appuie ici pour freiner', steer: 'Penche, glisse ou utilise les flèches', blow: 'Souffle sur les panneaux', blowBtn: 'ou frotte avec ton doigt', grow: 'Glisse vers le haut pour faire grandir le volcan', km: (v) => `${v.toFixed(1).replace('.', ',')} km`,
    sunset: 'Fais descendre le soleil', choice: 'Choisis ton souvenir', pebble: 'Touche le caillou', photo: 'Touche le bouton pour prendre la photo', pebble2: 'Touche le caillou de Mars' },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to live', back: '← Stories', parents: 'For parents: this story can use the microphone, to shout and to blow. Nothing is recorded. Without a microphone, a button does the same.', keys: 'Space or →: next',
    wheels: 'Slide the wheels onto the rover', vroom: 'VROOM!', binocs: 'Slide the binoculars across the sky', scope: 'Slide the telescope to the red dot', loupe: 'Slide the glass over the dust', shout: 'Shout “lift-off!”', shoutBtn: 'Press and hold here', trace: 'Draw the route with your finger, from the Earth to Mars', tooHot: 'Too hot!', months: (n) => n === 1 ? '1 month' : `${n} months`,
    retro: 'Press to brake, let go to go down', retroBtn: 'Press here to brake', steer: 'Tilt, slide or use the arrow keys', blow: 'Blow on the panels', blowBtn: 'or rub with your finger', grow: 'Slide up to make the volcano grow', km: (v) => `${v.toFixed(1)} km`,
    sunset: 'Bring the sun down', choice: 'Choose your souvenir', pebble: 'Touch the pebble', photo: 'Touch the button to take the photo', pebble2: 'Touch the pebble from Mars' },
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
const SFX = ['page', 'pop', 'found', 'tap', 'tape', 'rumble', 'launch', 'bonk', 'binocs', 'loupe', 'whoosh', 'step', 'sparkle', 'thud', 'yawn', 'chime', 'thrust', 'rover', 'gust', 'shutter', 'grow', 'pick'];
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
const AMB = { 'amb-room': 0.35, 'amb-night': 0.4, 'amb-space': 0.4, 'amb-mars': 0.45, 'amb-marsnight': 0.45, 'amb-morning': 0.35 }; let ambLevel = 0.35;
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

// ---------------------------------------------------------------- the telescope, the binoculars and the magnifying glass
// The picture drawn enlarged inside the round views, so what the child looks for appears exactly under the finger.
// a.ats lists what to find, one after the other (the two moons). In the telescope, the red dot once found grows into
// the planet itself: an orange ball with its dark patches and its white polar cap.
function lensTool(kind, a) {
  return new Promise((res) => {
    hint(T[kind]); sfx(kind === 'scope' ? 'binocs' : kind);
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = { binocs: 3, scope: 3.6, loupe: 2.4 }[kind];
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now(), n = 0, reveal = 0; const g0 = gen;
    const R = () => FW * { binocs: 0.17, scope: 0.27, loupe: 0.2 }[kind];
    // the binoculars show two round views side by side
    const centres = () => kind === 'binocs' ? [[pos[0] * FW - R() * 0.78, pos[1] * FH], [pos[0] * FW + R() * 0.78, pos[1] * FH]] : [[pos[0] * FW, pos[1] * FH]];
    const draw = () => {
      if (done || gen !== g0) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last; last = now; const at = a.ats[n];
      L.clearRect(0, 0, FW, FH);
      L.fillStyle = kind === 'loupe' ? 'rgba(20,8,4,0.45)' : 'rgba(4,6,14,0.88)'; L.fillRect(0, 0, FW, FH);
      L.save(); L.beginPath(); for (const [cx, cy] of centres()) { L.moveTo(cx + R(), cy); L.arc(cx, cy, R(), 0, 7); } L.clip(); L.clearRect(0, 0, FW, FH);
      const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
      L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH);
      // under the glass, the dust shows its grains of rust, glinting
      if (kind === 'loupe' && near(pos, at, 0.25)) for (let i = 0; i < 6; i++) { const [cx, cy] = centres()[0], an = (i * 2.4 + now / 900) % 6.28, rr = R() * (0.2 + (i % 3) * 0.22); L.fillStyle = `rgba(255,${120 + i * 15},60,${0.5 + Math.sin(now / 200 + i) * 0.3})`; L.beginPath(); L.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 2.5, 0, 7); L.fill(); }
      // the planet appears in the eyepiece, growing and turning slowly
      if (reveal) { const [cx, cy] = centres()[0], k = Math.min(1, (now - reveal) / 1400), pr = R() * 0.62 * (1 - Math.pow(1 - k, 3)), g = L.createRadialGradient(cx - pr * 0.3, cy - pr * 0.3, pr * 0.1, cx, cy, pr);
        g.addColorStop(0, '#f2a066'); g.addColorStop(0.7, '#c4552c'); g.addColorStop(1, '#6e2412'); L.fillStyle = 'rgba(4,6,14,0.9)'; L.fillRect(cx - R(), cy - R(), R() * 2, R() * 2);
        L.fillStyle = `rgba(255,120,70,${0.25 * k})`; L.beginPath(); L.arc(cx, cy, pr * 1.25, 0, 7); L.fill();
        L.fillStyle = g; L.beginPath(); L.arc(cx, cy, pr, 0, 7); L.fill(); L.save(); L.beginPath(); L.arc(cx, cy, pr, 0, 7); L.clip();
        L.fillStyle = 'rgba(90,30,15,0.45)'; for (const [u, v, w] of [[-0.3, 0.1, 0.35], [0.25, -0.15, 0.22], [0.1, 0.4, 0.28]]) { L.beginPath(); L.ellipse(cx + (u + Math.sin(now / 3000) * 0.1) * pr, cy + v * pr, w * pr, w * pr * 0.5, 0.3, 0, 7); L.fill(); }
        L.fillStyle = 'rgba(255,255,255,0.9)'; L.beginPath(); L.ellipse(cx, cy - pr * 0.9, pr * 0.32, pr * 0.14, 0, 0, 7); L.fill(); L.restore(); }
      L.restore();
      for (const [cx, cy] of centres()) { L.lineWidth = { loupe: 9, scope: 14, binocs: 7 }[kind]; L.strokeStyle = kind === 'binocs' ? '#1c1c1c' : '#b5862f'; L.beginPath(); L.arc(cx, cy, R(), 0, 7); L.stroke(); L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(cx, cy, R() - 5, 3.6, 4.6); L.stroke(); }
      if (kind === 'loupe') { const [x, y] = centres()[0], ang = 0.75; L.lineCap = 'round'; L.lineWidth = 16; L.strokeStyle = '#5a3a1c'; L.beginPath(); L.moveTo(x + Math.cos(ang) * (R() + 6), y + Math.sin(ang) * (R() + 6)); L.lineTo(x + Math.cos(ang) * (R() + 70), y + Math.sin(ang) * (R() + 70)); L.stroke(); }
      // found: a ring and a sparkle, then the next one (or the end)
      if (reveal) { if (now - reveal > 2600) { done = true; stop(); keyAct = null; L.clearRect(0, 0, FW, FH); hint(''); res(); } return; }
      held = near(pos, at, a.r) ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(at[0], at[1], 2, 50); // a little help after a while
      if (held > 380) {
        sfx('found'); burst(at[0], at[1], 46); ring(at); held = 0; t0 = now;
        if (++n >= a.ats.length) { if (kind === 'scope') { reveal = now; pos = [...at]; sfx('sparkle'); return; } done = true; stop(); keyAct = null; L.clearRect(0, 0, FW, FH); hint(''); res(); }
      }
    };
    requestAnimationFrame(draw);
    const stop = drag({ hover: true, down: (p) => (pos = p), move: (p) => (pos = p) });
    // laptop: the arrow keys move the glass too
    keyAct = (e, down) => { if (!down) return; const d = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key]; if (!d) return; pos = [Math.max(0, Math.min(1, pos[0] + d[0])), Math.max(0, Math.min(1, pos[1] + d[1]))]; return true; };
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
  scope: (a) => lensTool('scope', a),
  loupe: (a) => lensTool('loupe', a),
  // touch each spot once (the pebble)
  taps: (a) => new Promise((res) => {
    hint(T[a.hint]); let n = 0;
    if (a.dim) $('layer').classList.add('dim');
    for (const at of a.spots) {
      const s = spot(at, a.r, 'soft');
      s.onpointerdown = (e) => { e.stopPropagation(); if (s.done) return; s.done = true; s.classList.add('done'); sfx(a.sfx); word(a.word[lang], [at[0], at[1] < 0.3 ? at[1] + 0.09 : at[1] - 0.07]); burst(at[0], at[1], 30, a.hue ?? 40); if (++n === a.spots.length) { keyAct = null; hint(''); setTimeout(() => { $('layer').classList.remove('dim'); res(); }, 900); } };
    }
    keyAct = (e, down) => { if (down && e.key === ' ') { $('spots').querySelector('.spot:not(.done)')?.dispatchEvent(new PointerEvent('pointerdown')); return true; } };
  }),
  // the rover's wheels: slide each one from the rug onto the rover; it clicks onto the next empty axle
  wheels: (a) => new Promise((res) => {
    hint(T.wheels); const g0 = gen; let n = 0; const free = [...a.slots];
    const target = spot(a.at, a.r, 'soft');
    const fix = (el) => {
      const s = free.shift(); el.onpointerdown = el.onpointermove = el.onpointerup = el.onpointercancel = null; el.classList.add('fixed');
      el.style.left = s[0] * 100 + '%'; el.style.top = s[1] * 100 + '%'; sfx('tape'); burst(s[0], s[1], 16, 35);
      if (++n === a.from.length) { target.remove(); keyAct = null; word(T.vroom, [0.3, 0.55]); hint(''); setTimeout(() => { if (gen === g0) res(); }, 1100); }
    };
    const ws = a.from.map((at) => {
      const el = document.createElement('img'); el.src = 'art/wheel.png'; el.className = 'drag-wheel'; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; $('spots').append(el); el._home = at;
      el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation(); el.classList.add('held'); try { el.setPointerCapture(e.pointerId); } catch {}
        el.onpointermove = (ev) => { const p = toPanel(ev); el.style.left = p[0] * 100 + '%'; el.style.top = p[1] * 100 + '%'; };
        el.onpointerup = el.onpointercancel = (ev) => { el.onpointermove = null; el.classList.remove('held'); const p = toPanel(ev); if (near(p, a.at, a.r)) fix(el); else { el.style.left = el._home[0] * 100 + '%'; el.style.top = el._home[1] * 100 + '%'; } };
      };
      return el;
    });
    // laptop: the space bar puts the next wheel on
    keyAct = (e, down) => { if (down && e.key === ' ') { const el = ws.find((w) => !w.classList.contains('fixed')); if (el) fix(el); return true; } };
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
      if (lv > 0.18 || held) { if (Math.random() < 0.3) burst(0.6, 0.62, 3, 20); if (Math.random() < 0.05) shake(); }
      if (k >= 1) { done = true; keyAct = null; alt.remove(); meter(null); hint(''); launch(); return; }
      requestAnimationFrame(tick);
    };
    const launch = async () => { buzz([200, 80, 500]); sfx('launch'); shake(); await film(a.film); res(); };
    requestAnimationFrame(tick);
  }),
  // the route: draw with the finger from the Earth to Mars, around the Sun (too hot to go through); the rocket then
  // follows the line while the months go by. The space bar draws a good route.
  trace: (a) => new Promise(async (res) => {
    hint(T.trace); const rk = await img('art/rocket.png'); const g0 = gen; let pts = [], drawing = false, flying = false, t0 = 0;
    const P = (p) => [p[0] * FW, p[1] * FH];
    const label = document.createElement('div'); label.className = 'phase'; label.style.left = '50%'; label.style.top = '93%'; $('layer').append(label);
    const draw = (now) => {
      if (gen !== g0) return; L.clearRect(0, 0, FW, FH);
      // the two planets breathe, to show where to start and where to go
      for (const [q, c] of [[a.earth, '120,190,255'], [a.mars, '255,140,90']]) { const [x, y] = P(q), r = FW * (0.13 + Math.sin(now / 300) * 0.01); L.strokeStyle = `rgba(${c},0.8)`; L.lineWidth = 3; L.setLineDash([8, 8]); L.beginPath(); L.arc(x, y, r, 0, 7); L.stroke(); L.setLineDash([]); }
      if (pts.length > 1) { L.lineCap = 'round'; L.lineJoin = 'round'; L.strokeStyle = 'rgba(255,230,160,0.95)'; L.lineWidth = 5; L.setLineDash([2, 12]); L.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? L.lineTo(x, y) : L.moveTo(x, y); }); L.stroke(); L.setLineDash([]); }
      if (flying) {
        const k = Math.min(1, (now - t0) / 4200), f = k * (pts.length - 1), i = Math.floor(f), u = f - i, A = pts[i], B = pts[Math.min(pts.length - 1, i + 1)];
        const x = (A[0] + (B[0] - A[0]) * u) * FW, y = (A[1] + (B[1] - A[1]) * u) * FH, ang = Math.atan2((B[1] - A[1]) * FH, (B[0] - A[0]) * FW) + Math.PI / 2, w = FW * 0.1;
        const fl = L.createRadialGradient(x, y, 0, x, y, w); fl.addColorStop(0, 'rgba(255,220,140,0.6)'); fl.addColorStop(1, 'rgba(255,140,60,0)'); L.fillStyle = fl; L.beginPath(); L.arc(x, y, w, 0, 7); L.fill();
        L.save(); L.translate(x, y); L.rotate(ang); L.drawImage(rk, -w / 2, -w * rk.height / rk.width / 2, w, w * rk.height / rk.width); L.restore();
        const m = Math.max(1, Math.ceil(k * 7)); label.textContent = T.months(m); label.classList.add('on');
        if (k >= 1) { flying = false; sfx('found'); burst(a.mars[0], a.mars[1], 50, 15); hint(''); setTimeout(() => { L.clearRect(0, 0, FW, FH); label.remove(); if (gen === g0) res(); }, 1200); return; }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    const fly = () => { stop(); keyAct = null; flying = true; t0 = performance.now(); sfx('whoosh'); hint(''); };
    const check = () => {
      const s = pts[0], e = pts[pts.length - 1];
      if (pts.length < 4 || !near(s, a.earth, 0.16)) { pts = []; return; }
      if (pts.some((p) => near(p, a.sun, a.sunR))) { word(T.tooHot, [a.sun[0], a.sun[1] - 0.12]); sfx('bonk'); shake(); pts = []; return; }
      if (!near(e, a.mars, 0.16)) { pts = []; return; }
      fly();
    };
    const stop = drag({ down: (p) => { if (flying) return; pts = [p]; drawing = true; }, move: (p, down) => { if (drawing && down) { const q = pts[pts.length - 1]; if (Math.hypot(p[0] - q[0], (p[1] - q[1]) * FH / FW) > 0.012) pts.push(p); } }, up: () => { if (drawing) { drawing = false; check(); } } });
    // laptop: the space bar draws a curved route around the Sun, the way real rockets go
    keyAct = (e, down) => { if (down && e.key === ' ' && !flying) { pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([a.earth[0] + (a.mars[0] - a.earth[0]) * u + Math.sin(u * Math.PI) * 0.32, a.earth[1] + (a.mars[1] - a.earth[1]) * u + Math.sin(u * Math.PI) * 0.02]); } fly(); return true; } };
  }),
  // the landing on Mars, the way real landers do it: the lander comes down under its parachute, but the air is too
  // thin for the parachute alone (it still lands too fast). The first press lets the parachute go and lights the
  // braking rockets. Press (finger, mouse button or space bar) to fire them, let go to fall; touch down slowly or
  // bounce and try again. The gauge next to the lander turns green when the speed is safe. After a miss the next try
  // is a little easier.
  retro: (a) => new Promise(async (res) => {
    const [cap, chute] = await Promise.all([img('art/capsule.png'), img('art/chute.png')]); const g0 = gen;
    let y, v, held = false, last, phase = 'fly', tries = 0, landT = 0, src = null, srcT = 0, ch0; const parts = [];
    const reset = () => { y = -0.02; v = 0.16; phase = 'fly'; last = performance.now(); ch0 = { on: 1, x: 0, y: 0, vx: 0, vy: 0, r: 0, a: 1 }; hint(T.retro); };
    const SAFE = () => 0.11 + tries * 0.03, cw = () => FW * 0.26;
    const on = (h) => { held = h; if (h && phase === 'fly') { buzz(30); if (ch0.on === 1 && y > 0.46) { ch0.on = 0; ch0.vx = 90; ch0.vy = -260; sfx('whoosh', 0.7); } } };
    const stop = drag({ down: () => on(true), up: () => on(false) });
    const alt = altButton(T.retroBtn); alt.onpointerdown = (e) => { e.stopPropagation(); on(true); }; alt.onpointerup = alt.onpointerleave = alt.onpointercancel = () => on(false);
    keyAct = (e, down) => { if (e.key === ' ' || e.key === 'ArrowUp') { on(down); return true; } };
    reset();
    const frame = async (now) => {
      if (gen !== g0) { src?.stop?.(); return; } const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const thrust = held && phase === 'fly' && ch0.on === 0; // the rockets light once the parachute is gone
      window.__dbg = { y, v, phase }; // read by the automated landing test
      // under the parachute the fall is slower, but never slow enough: v settles at 0.16, above the safe speed. The
      // parachute can only be let go once the lander is well in view, so the child always sees it open.
      if (phase === 'fly') { if (ch0.on === 1 && held && y > 0.46) on(true); if (ch0.on === 1) v += (0.16 - v) * dt * 2; else v += (thrust ? -0.32 : 0.14) * dt; v = Math.max(-0.05, Math.min(0.4, v)); y += v * dt; }
      if (thrust && now - srcT > 2600) { srcT = now; src = sfx('thrust', 0.8); } if (!thrust && src) { try { src.stop(); } catch {} src = null; srcT = 0; }
      L.clearRect(0, 0, FW, FH);
      const ch = cw() * cap.height / cap.width, cx = a.x * FW, cy = y * FH, gy = a.ground * FH;
      // the flames under the lander, and the red dust they blow off the ground when it gets close
      if (thrust) {
        for (const s of [-0.28, 0.28]) { const fx = cx + s * cw(), fy = cy + ch * 0.45, fl = L.createRadialGradient(fx, fy, 0, fx, fy + ch * 0.5, ch * 0.6); fl.addColorStop(0, 'rgba(255,250,210,0.95)'); fl.addColorStop(0.4, 'rgba(255,170,70,0.7)'); fl.addColorStop(1, 'rgba(255,90,30,0)'); L.fillStyle = fl; L.beginPath(); L.moveTo(fx - cw() * 0.08, fy); L.lineTo(fx, fy + ch * (0.6 + Math.random() * 0.3)); L.lineTo(fx + cw() * 0.08, fy); L.closePath(); L.fill(); }
        if (gy - cy < FH * 0.25) for (let i = 0; i < 3; i++) parts.push({ x: cx + (Math.random() - 0.5) * cw() * 0.4, y: gy, vx: (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 220), vy: -20 - Math.random() * 60, life: 1, s: 6 + Math.random() * 6 });
      }
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.life -= dt * 0.9; L.fillStyle = `rgba(196,98,58,${Math.max(0, p.life) * 0.6})`; L.beginPath(); L.arc(p.x, p.y, p.s * (1.6 - p.life), 0, 7); L.fill(); }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      // the parachute: open above the lander with its lines, then cut free, it flies up and away
      { const pw = cw() * 1.1, ph = pw * chute.height / chute.width, sway = Math.sin(now / 500) * 0.05;
        if (ch0.on === 0) { ch0.x += ch0.vx * dt; ch0.y += ch0.vy * dt; ch0.vy += 60 * dt; ch0.r += dt * 0.6; ch0.a = Math.max(0, ch0.a - dt * 0.7); }
        if (ch0.a > 0) {
          // the picture's lines meet at its bottom point, which hangs from the ring on top of the lander
          const px = cx + ch0.x, py = cy - ch * 0.47 + ch0.y; L.globalAlpha = ch0.a;
          L.save(); L.translate(px, py); L.rotate(sway + ch0.r); L.drawImage(chute, -pw / 2, -ph, pw, ph); L.restore(); L.globalAlpha = 1;
        } }
      L.save(); L.translate(cx, cy); L.drawImage(cap, -cw() / 2, -ch / 2, cw(), ch); L.restore();
      // the speed gauge: a bar beside the lander, green when slow enough to land
      if (phase === 'fly') {
        const ok = v < SAFE(), gx = cx + cw() * 0.75, gh = ch * 1.1, k = Math.max(0, Math.min(1, v / 0.4));
        L.fillStyle = 'rgba(0,0,0,0.35)'; L.fillRect(gx, cy - gh / 2, 12, gh); L.fillStyle = ok ? '#5fd36a' : v < SAFE() * 1.6 ? '#ffb340' : '#ff5a4a'; L.fillRect(gx, cy + gh / 2 - gh * k, 12, gh * k);
        L.strokeStyle = 'rgba(255,255,255,0.9)'; L.lineWidth = 2; L.beginPath(); L.moveTo(gx - 4, cy + gh / 2 - gh * SAFE() / 0.4); L.lineTo(gx + 16, cy + gh / 2 - gh * SAFE() / 0.4); L.stroke();
        meter(1 - k);
      }
      if (phase === 'fly' && cy + ch * 0.5 >= gy) {
        y = (gy - ch * 0.5) / FH; held = false; src?.stop?.(); src = null;
        if (v < SAFE()) {
          phase = 'landed'; landT = now; sfx('thud'); buzz([80, 40, 160]); word(a.word[lang], [a.x, a.ground - 0.2]); burst(a.x, a.ground, 40, 20); meter(null); hint('');
          for (let i = 0; i < 40; i++) parts.push({ x: cx + (Math.random() - 0.5) * cw(), y: gy, vx: (Math.random() - 0.5) * 300, vy: -40 - Math.random() * 120, life: 1, s: 7 });
        } else {
          phase = 'bounce'; tries++; sfx('bonk'); shake(); buzz(120); meter(null); hint('');
          for (let i = 0; i < 30; i++) parts.push({ x: cx + (Math.random() - 0.5) * cw(), y: gy, vx: (Math.random() - 0.5) * 340, vy: -60 - Math.random() * 160, life: 1, s: 7 });
          await say({ id: 'r5w', cap: 1 }); if (gen !== g0) return; reset();
        }
      }
      if (phase === 'landed' && now - landT > 1800) { stop(); keyAct = null; alt.remove(); L.clearRect(0, 0, FW, FH); swapLanded(); res(); return; }
      requestAnimationFrame(frame);
    };
    // the lander stays on the ground for the rest of the page (drawn into a still image over the panel)
    const swapLanded = () => { const c = document.createElement('canvas'); c.className = 'art over in'; c.width = FW * 2; c.height = FH * 2; const k = c.getContext('2d'); k.scale(2, 2); const ch = cw() * cap.height / cap.width; k.drawImage(cap, a.x * FW - cw() / 2, a.ground * FH - ch, cw(), ch); $('panel').insertBefore(c, $('fx')); };
    requestAnimationFrame(frame);
  }),
  // the drive, in 3D, seen from behind the rover: rocks come from the horizon and grow as they get close; tilt the
  // phone, slide the finger or press the arrow keys to drive between them. Bumping a rock makes the rover hop.
  drive: (a) => new Promise(async (res) => {
    hint(T.steer); const [rv, bo, ro] = await Promise.all([img('art/rover-back.png'), img('art/boulder.png'), img('art/rock.png')]);
    let rx = 0, target = 0, tilt = null, t0 = performance.now(), last = t0, done = false, hop = 0, flash = 0, motor = 0; const g0 = gen;
    const HZ = 0.36; // the horizon of the painted plain
    const rocks = [], dots = Array.from({ length: 70 }, () => ({ x: Math.random() * 4 - 2, z: 1 + Math.random() * 7 })), puffs = [];
    const onTilt = (e) => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 22)); };
    addEventListener('deviceorientation', onTilt);
    const stop = drag({ hover: true, down: (p) => (target = (p[0] - 0.5) * 2.2), move: (p, down) => { if (down || matchMedia('(hover: hover)').matches) target = (p[0] - 0.5) * 2.2; } });
    keyAct = (e) => ['ArrowLeft', 'ArrowRight'].includes(e.key);
    // a point on the ground at lateral x and depth z (z = 1 is where the rover is)
    const proj = (x, z) => [FW / 2 + (x - rx * 0.25) * FW * 0.42 / z, HZ * FH + (FH * 0.86 - HZ * FH) / z];
    const frame = (now) => {
      if (done || gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const el = (now - t0) / 1000;
      if (keys.has('ArrowLeft')) target -= dt * 2.2; if (keys.has('ArrowRight')) target += dt * 2.2;
      if (tilt != null) target += tilt * dt * 2.4;
      target = Math.max(-1, Math.min(1, target)); rx += (target - rx) * Math.min(1, dt * 6);
      const speed = 2.2 + Math.min(el, 15) * 0.08;
      if (now - motor > 3600) { motor = now; sfx('rover', 0.5); }
      L.clearRect(0, 0, FW, FH);
      // pebbles rushing past give the speed
      for (const d of dots) { d.z -= dt * speed; if (d.z < 0.6) { d.z = 8; d.x = Math.random() * 4 - 2; } const [x, y] = proj(d.x, d.z); L.fillStyle = `rgba(90,30,15,${Math.min(0.6, 0.9 / d.z)})`; L.beginPath(); L.ellipse(x, y, 5 / d.z + 1, 2 / d.z + 0.5, 0, 0, 7); L.fill(); }
      if (Math.random() < dt * (0.9 + el * 0.05)) rocks.push({ x: (Math.random() * 2 - 1) * 1.2, z: 8, big: Math.random() < 0.45, hit: false });
      rocks.sort((p, q) => q.z - p.z);
      for (const o of rocks) {
        const z0 = o.z; o.z -= dt * speed; if (o.z < 0.45) continue;
        const [sx, sy] = proj(o.x, o.z), im = o.big ? bo : ro, w = FW * (o.big ? 0.34 : 0.2) / o.z, h = w * im.height / im.width;
        L.globalAlpha = Math.min(1, (8 - o.z) / 1.5) * (o.hit ? 0.5 : 1); L.drawImage(im, sx - w / 2, sy - h * 0.85, w, h); L.globalAlpha = 1;
        if (z0 > 1 && o.z <= 1) {
          const dx = Math.abs(o.x - rx);
          if (dx < (o.big ? 0.36 : 0.26)) { o.hit = true; t0 += 700; hop = 1; flash = 1; sfx('bonk'); buzz(80); shake(); for (let i = 0; i < 16; i++) puffs.push({ x: (Math.random() - 0.5) * 120, y: 0, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, life: 1 }); }
          else if (dx < 0.6) sfx('whoosh', 0.5);
        }
      }
      for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].z < 0.45) rocks.splice(i, 1);
      // the rover from behind, rocking on the bumps, red dust curling up behind its wheels
      hop = Math.max(0, hop - dt * 1.8);
      const w = FW * 0.46, h = w * rv.height / rv.width, cx = FW / 2 + rx * FW * 0.3, cy = FH * 0.84 - h / 2 + Math.sin(now / 70) * 1.5 - Math.sin(hop * Math.PI) * FH * 0.07;
      if (Math.random() < 0.6) for (const s of [-0.38, 0.38]) puffs.push({ x: s * w, y: h * 0.45, vx: s * 60 + (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 1 });
      for (const p of puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.3; if (p.life <= 0) continue; L.fillStyle = `rgba(200,110,70,${p.life * 0.45})`; L.beginPath(); L.arc(cx + p.x, cy + p.y, 10 * (1.5 - p.life), 0, 7); L.fill(); }
      for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].life <= 0) puffs.splice(i, 1);
      L.save(); L.translate(cx, cy); L.rotate((target - rx) * 0.12 + Math.sin(now / 90) * 0.01); L.drawImage(rv, -w / 2, -h / 2, w, h); L.restore();
      if (flash > 0) { L.fillStyle = `rgba(255,255,255,${flash * 0.3})`; L.fillRect(0, 0, FW, FH); flash = Math.max(0, flash - dt * 3); }
      meter(el / a.secs);
      if (el >= a.secs) { done = true; stop(); keyAct = null; removeEventListener('deviceorientation', onTilt); meter(null); L.clearRect(0, 0, FW, FH); sfx('found'); burst(0.5, 0.75, 40); hint(''); setTimeout(res, 600); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }),
  // blow the dust off the solar panels (microphone, like the wind on Mars), or rub it off with a finger or the mouse
  blow: (a) => new Promise(async (res) => {
    hint(T.blow); const after = await img(`art/${a.after}.jpg`); const mic = await micOn();
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d');
    let done = false, lastS = 0;
    const paint = () => { L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over'; };
    const cover = () => { const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0; for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) { const u = x / M.width, v = y / M.height; if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3]) continue; all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++; } return on / all; };
    const clear = (p, r) => { m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * r, 0, 7); m.fill(); paint(); if (Math.random() < 0.5) burst(p[0], p[1], 2, 15); const now = performance.now(); if (now - lastS > 500) { lastS = now; sfx('gust', 0.5); } check(); };
    const check = () => { if (!done && cover() > 0.6) { done = true; stop(); keyAct = null; alt.remove(); sfx('found'); swapArt(a.after); burst(0.3, 0.48, 30, 45); burst(0.78, 0.48, 30, 45); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(res, 900); } };
    const stop = drag({ down: (p) => clear(p, 0.09), move: (p, down) => down && clear(p, 0.09) });
    const alt = altButton(T.blowBtn); alt.onpointerdown = (e) => { e.stopPropagation(); for (let i = 0; i < 8; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.08); };
    keyAct = (e, down) => { if (down && e.key === ' ') { alt.onpointerdown(new PointerEvent('pointerdown')); return true; } };
    // a breath sweeps the dust from the middle of the panels outwards, along their width
    const g0 = gen; const tick = () => { if (done || gen !== g0) return; const lv = mic ? micLevel() : 0; if (lv > 0.12) for (let i = 0; i < 3; i++) clear([a.box[0] + Math.random() * (a.box[2] - a.box[0]), a.box[1] + Math.random() * (a.box[3] - a.box[1])], 0.05 + lv * 0.05); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }),
  // Olympus Mons next to Everest, drawn to the same scale: slide up (or hold the up arrow) to make the volcano grow
  // until it stops at its real height, about two and a half times Everest.
  compare: (a) => new Promise((res) => {
    hint(T.grow); const g0 = gen; let k = 0, lastY = null, done = false, snd = 0;
    const [x0, y0, x1, y1] = a.box, EV = 8.849, OM = 21.9; // kilometres
    const draw = () => {
      L.clearRect(0, 0, FW, FH); const bx = x0 * FW, by = y0 * FH, bw = (x1 - x0) * FW, bh = (y1 - y0) * FH, base = by + bh - 30, unit = (bh - 60) / OM;
      L.fillStyle = 'rgba(255,248,232,0.9)'; L.strokeStyle = '#2a1d14'; L.lineWidth = 3; L.beginPath(); L.roundRect(bx, by, bw, bh, 16); L.fill(); L.stroke();
      L.strokeStyle = 'rgba(42,29,20,0.5)'; L.lineWidth = 2; L.beginPath(); L.moveTo(bx + 12, base); L.lineTo(bx + bw - 12, base); L.stroke();
      // Everest: a sharp grey peak with snow
      const ex = bx + bw * 0.16, eh = EV * unit, ew = bw * 0.11;
      L.fillStyle = '#7d8794'; L.beginPath(); L.moveTo(ex - ew, base); L.lineTo(ex, base - eh); L.lineTo(ex + ew, base); L.closePath(); L.fill();
      L.fillStyle = '#fff'; L.beginPath(); L.moveTo(ex - ew * 0.3, base - eh * 0.7); L.lineTo(ex, base - eh); L.lineTo(ex + ew * 0.3, base - eh * 0.7); L.closePath(); L.fill();
      // Olympus Mons: a wide gentle red shield, as tall as k says
      const ox = bx + bw * 0.63, oh = Math.max(2, k * OM * unit), ow = bw * 0.34;
      L.fillStyle = '#b5502e'; L.beginPath(); L.moveTo(ox - ow, base); L.bezierCurveTo(ox - ow * 0.6, base - oh * 0.75, ox - ow * 0.35, base - oh, ox, base - oh); L.bezierCurveTo(ox + ow * 0.35, base - oh, ox + ow * 0.6, base - oh * 0.75, ox + ow, base); L.closePath(); L.fill();
      if (k > 0.3) { L.fillStyle = '#7f3420'; L.beginPath(); L.ellipse(ox, base - oh + 3, ow * 0.12, 4, 0, 0, 7); L.fill(); }
      L.fillStyle = '#2a1d14'; L.font = `700 ${Math.round(FW * 0.036)}px system-ui, sans-serif`; L.textAlign = 'center';
      L.fillText('Everest', ex, base + 22); L.fillText(T.km(EV), ex, base - eh - 10);
      L.fillText('Olympus Mons', ox, base + 22); if (k > 0.05) L.fillText(T.km(k * OM), ox, base - oh - 10);
    };
    const grow = (d) => {
      if (done) return; k = Math.max(0, Math.min(1, k + d)); draw(); const now = performance.now(); if (d > 0 && now - snd > 700) { snd = now; sfx('grow', 0.5); }
      if (k >= 1) { done = true; stop(); keyAct = null; sfx('found'); word('× 2,5'.replace(',', lang === 'en' ? '.' : ','), [0.64, y0 + 0.02]); burst(0.63, y0 + 0.08, 40, 15); hint(''); setTimeout(() => { L.clearRect(0, 0, FW, FH); if (gen === g0) res(); }, 2600); }
    };
    draw();
    const stop = drag({ down: (p) => (lastY = p[1]), move: (p, down) => { if (!down || lastY == null) return; grow((lastY - p[1]) * 1.6); lastY = p[1]; }, up: () => (lastY = null) });
    keyAct = (e, down) => { if (down && ['ArrowUp', ' '].includes(e.key)) { grow(0.07); return true; } };
  }),
  // the sunset: the child brings the Sun down with a finger (mouse, down arrow or space bar too). As it sinks, the
  // afternoon melts into the painted dusk (a second painting of the same scene), the Sun turns cold white and the
  // blue glow of a real Martian sunset spreads around it, fine dust drifts in the light and the first stars come
  // out. At the horizon the glow pulses and the dusk painting stays.
  sunset: (a) => new Promise(async (res) => {
    hint(T.sunset); const dusk = await img(`art/${a.after}.jpg`); const g0 = gen;
    let y = a.top, goal = a.top, lastY = null, done = false, endT = 0, last = performance.now(), lastS = 0;
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random() * 0.42, r: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28, k: 0.55 + Math.random() * 0.4 }));
    const motes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: 0.2 + Math.random() * 0.6, v: 0.004 + Math.random() * 0.012, r: 0.8 + Math.random() * 1.8 }));
    const ease = (t) => t * t * (3 - 2 * t);
    const frame = (now) => {
      if (gen !== g0) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      y += (goal - y) * Math.min(1, dt * 8);
      const k = Math.max(0, Math.min(1, (y - a.top) / (a.horizon - a.top))), e = ease(k), sx = a.x * FW, sy = y * FH, r = FW * (0.04 - k * 0.012);
      L.clearRect(0, 0, FW, FH);
      // the dusk painting comes through as the Sun goes down
      L.globalAlpha = Math.pow(e, 1.3); L.drawImage(dusk, 0, 0, FW, FH); L.globalAlpha = 1;
      // the first stars, high in the sky, twinkling
      if (k > 0.55) for (const s of stars) { const al = Math.min(1, (k - s.k) / 0.25) * (0.6 + Math.sin(now / 400 + s.p) * 0.4); if (al <= 0) continue; L.fillStyle = `rgba(235,240,255,${al})`; L.beginPath(); L.arc(s.x * FW, s.y * FH, s.r, 0, 7); L.fill(); }
      L.save(); L.beginPath(); L.rect(0, 0, FW, (a.ground ?? a.horizon) * FH); L.clip(); // nothing shines in front of the ground
      // the glow: warm and wide while the Sun is high, then a cold blue halo that tightens and brightens near the horizon
      const warm = L.createRadialGradient(sx, sy, r, sx, sy, FW * 0.45); warm.addColorStop(0, `rgba(255,235,190,${0.5 * (1 - e)})`); warm.addColorStop(1, 'rgba(255,200,140,0)');
      L.fillStyle = warm; L.fillRect(0, 0, FW, FH);
      const pulse = endT ? 1 + Math.sin((now - endT) / 260) * 0.08 : 1, bw = FW * (0.1 + e * 0.34) * pulse;
      const blue = L.createRadialGradient(sx, sy, r * 0.8, sx, sy, bw); blue.addColorStop(0, `rgba(210,235,255,${0.2 + e * 0.75})`); blue.addColorStop(0.35, `rgba(120,175,245,${e * 0.55})`); blue.addColorStop(1, 'rgba(70,120,210,0)');
      L.fillStyle = blue; L.beginPath(); L.arc(sx, sy, bw, 0, 7); L.fill();
      // soft rays turning slowly around the Sun
      L.save(); L.translate(sx, sy); L.rotate(now / 9000); L.globalAlpha = 0.12 + e * 0.12;
      for (let i = 0; i < 10; i++) { L.rotate(Math.PI / 5); const g = L.createLinearGradient(0, 0, bw * 1.2, 0); g.addColorStop(0, e > 0.5 ? 'rgba(200,225,255,0.9)' : 'rgba(255,240,210,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); L.fillStyle = g; L.beginPath(); L.moveTo(0, 0); L.lineTo(bw * 1.2, -bw * 0.05); L.lineTo(bw * 1.2, bw * 0.05); L.closePath(); L.fill(); }
      L.restore();
      // the Sun itself, smaller on Mars than from the Earth, warm white turning cold white
      const sun = L.createRadialGradient(sx, sy, 0, sx, sy, r * 1.5); sun.addColorStop(0, '#ffffff'); sun.addColorStop(0.55, e > 0.5 ? '#eaf3ff' : '#fff4d6'); sun.addColorStop(1, 'rgba(255,255,255,0)');
      L.fillStyle = sun; L.beginPath(); L.arc(sx, sy, r * 1.5, 0, 7); L.fill(); L.restore();
      // fine dust drifting through the light, glinting blue near the Sun at dusk
      for (const m of motes) { m.x += m.v * dt; if (m.x > 1.02) m.x = -0.02; const d = Math.hypot((m.x - a.x) * FW, (m.y - y) * FH) / FW, gl = Math.max(0, 1 - d * 3); L.fillStyle = `rgba(${Math.round(255 - e * gl * 90)},${Math.round(220 + e * gl * 20)},${Math.round(190 + e * gl * 65)},${0.15 + gl * 0.5})`; L.beginPath(); L.arc(m.x * FW, m.y * FH + Math.sin(now / 900 + m.r * 9) * 3, m.r, 0, 7); L.fill(); }
      if (!done && k >= 0.985) {
        done = true; endT = now; stop(); keyAct = null; hint(''); sfx('chime'); buzz([40, 60, 120]); burst(a.x, a.horizon - 0.02, 50, 200); word(lang === 'fr' ? 'Bleu !' : 'Blue!', [0.42, 0.3]);
        setTimeout(() => { if (gen !== g0) return; swapArt(a.after); setTimeout(() => { L.clearRect(0, 0, FW, FH); }, 900); res(); }, 2200);
      }
      if (!done || now - endT < 2400) requestAnimationFrame(frame);
    };
    const move = (d) => { if (done) return; goal = Math.max(a.top, Math.min(a.horizon, goal + d)); const now = performance.now(); if (d > 0 && now - lastS > 900) { lastS = now; sfx('gust', 0.35); } };
    requestAnimationFrame(frame);
    const stop = drag({ down: (p) => (lastY = p[1]), move: (p, down) => { if (!down || lastY == null) return; move(p[1] - lastY); lastY = p[1]; }, up: () => (lastY = null) });
    keyAct = (e, down) => { if (down && ['ArrowDown', ' '].includes(e.key)) { move(0.05); return true; } };
  }),
  // the photo: a viewfinder over the picture; touch the camera button (or anywhere, or the space bar): a flash, the
  // shutter, and the photo pops out as a printed picture that stays in the corner
  photo: (a) => new Promise((res) => {
    hint(T.photo); const g0 = gen; let done = false;
    const vf = document.createElement('div'); vf.className = 'viewfinder'; $('layer').append(vf);
    const b = document.createElement('button'); b.className = 'shutter'; b.setAttribute('aria-label', 'photo'); $('spots').append(b);
    const shoot = () => {
      if (done) return; done = true; stop(); keyAct = null; sfx('shutter'); buzz(40); vf.remove(); b.remove();
      const fl = document.createElement('div'); fl.className = 'flash'; $('layer').append(fl); setTimeout(() => fl.remove(), 700);
      const pic = document.createElement('div'); pic.className = 'polaroid'; pic.innerHTML = `<img src="${$('art').src}" alt="">`; $('layer').append(pic);
      requestAnimationFrame(() => pic.classList.add('in')); hint(''); setTimeout(() => { if (gen === g0) res(); }, 1500);
    };
    b.onpointerdown = (e) => { e.stopPropagation(); shoot(); };
    const stop = drag({ down: shoot });
    keyAct = (e, down) => { if (down && e.key === ' ') { shoot(); return true; } };
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
window.__nala2 = { get idx() { return idx; }, get busy() { return busy; }, next, show, goto: (i) => { busy = false; keyAct = null; show(i); }, get branch() { return branch; } };
