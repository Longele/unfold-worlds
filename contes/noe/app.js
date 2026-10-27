// Noé et l'arche: the comic reader of Lina, with Noah's tools. One panel fills the page; its lines are read aloud
// in their bubbles with the word being said lit up; on most panels the child does the work with Noah: pulls the
// measuring rope, taps with the mallet, brushes on the pitch, gathers the pairs, makes it rain, presses the ark
// into the water and feels it come back up, lights the dark hold with the lamp, sends the dove, draws the rainbow
// and looks into a raindrop with a magnifying glass.
import { PANELS, TITLE, WHO } from './story.js?v=202610270300';

import { goFull, keepFull, iosTip } from '../fs.js?v=202610270300';
const $ = (id) => document.getElementById(id);
// the language: from the stories page (?lang=), else the last one chosen, else the phone's
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('contes-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!['fr', 'en'].includes(lang)) lang = 'fr';
const TT = {
  fr: { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', kick: 'Une BD à toucher', back: '← Les contes', hello: 'Touche Noé', rope: 'Tire la corde jusqu’au piquet', rainbow: 'Dessine l’arc d’un bout à l’autre', taps: 'Tape sur les planches', paint: 'Frotte la coque avec ton doigt', pairs: 'Touche deux animaux pareils', rain: 'Glisse ton doigt vers le bas', press: 'Appuie sur l’arche, puis lâche', lamp: 'Promène la lampe dans le noir', fly: 'Glisse la colombe vers le ciel', sounds: 'Touche les animaux', loupe: 'Glisse la loupe sur les gouttes', two: 'DEUX !' },
  en: { readMe: 'Read it to me', readSelf: 'I’ll read it myself', again: 'Read it again', more: 'More stories', end: 'The End', kick: 'A comic to touch', back: '← Stories', hello: 'Touch Noah', rope: 'Pull the rope to the post', rainbow: 'Draw the arc from end to end', taps: 'Tap the planks', paint: 'Rub the hull with your finger', pairs: 'Touch two animals that match', rain: 'Slide your finger downwards', press: 'Press the ark, then let go', lamp: 'Move the lamp through the dark', fly: 'Slide the dove up to the sky', sounds: 'Touch the animals', loupe: 'Slide the glass over the drops', two: 'TWO!' },
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

let timings = {}, mode = 'voice', idx = -1, busy = false, ctx = null, sfxBuf = {};
let gen = 0; // which page is showing: the games and animations of a page that is left stop by themselves
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
applyLang();

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and theme
const SFX = ['page', 'pop', 'found', 'tap', 'loupe', 'rope', 'hammer', 'brush', 'roar', 'hooves', 'trumpet', 'chime', 'rainstart', 'thunder', 'push', 'splash', 'lamp', 'squeak', 'flutter', 'coo', 'tweet', 'rainbow'];
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
const AMB = { 'amb-meadow': 0.35, 'amb-wood': 0.45, 'amb-calm': 0.4, 'amb-storm': 0.45, 'amb-sea': 0.4, 'amb-ark': 0.4, 'amb-hills': 0.4, 'amb-land': 0.4 }; let ambLevel = 0.35;
function ambience(n) { const src = `sfx/${n}.mp3`; ambLevel = AMB[n] ?? 0.35; if (!amb.src.endsWith(src)) { amb.src = src; amb.play().catch(() => {}); } fade(amb, ambLevel * (speaking ? 0.45 : 1)); }
const fades = new Map();
function fade(el, to, ms = 350) { clearInterval(fades.get(el)); const from = el.volume, t0 = performance.now(); fades.set(el, setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) clearInterval(fades.get(el)); }, 30)); }
function duck(on) { speaking = on; fade(music, on ? 0.08 : 0.22); fade(amb, ambLevel * (on ? 0.45 : 1)); }
const voice = new Audio(); voice.preload = 'auto';

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

// ---------------------------------------------------------------- effects: sparkles, rain and the push of the water
const fx = $('fx'), g = fx.getContext('2d'), lens = $('lens'), L = lens.getContext('2d'); let FW = 0, FH = 0; const sparks = [], drops = [];
let rainLevel = 0, lift = 0; // how hard it rains (0 to 1); how strongly the water pushes the ark back up (0 to 1)
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
  requestAnimationFrame(drawFx); g.clearRect(0, 0, FW, FH);
  // rain: slanted streaks, more of them the harder it rains
  if (rainLevel > 0) for (let i = 0; i < rainLevel * 9; i++) drops.push({ x: Math.random() * FW * 1.2, y: -20, v: 14 + Math.random() * 8 });
  g.strokeStyle = 'rgba(210,225,240,0.55)'; g.lineWidth = 1.6; g.beginPath();
  for (const d of drops) { d.x -= d.v * 0.25; d.y += d.v; g.moveTo(d.x, d.y); g.lineTo(d.x + 4, d.y - 16); }
  g.stroke(); for (let i = drops.length - 1; i >= 0; i--) if (drops[i].y > FH + 20) drops.splice(i, 1);
  // the water pushing up under the hull: rising arrows while the ark is pressed down
  if (lift > 0.02) {
    g.save(); g.globalAlpha = Math.min(1, lift); g.fillStyle = '#ffd24a'; g.strokeStyle = '#121212'; g.lineWidth = 3;
    const t = performance.now() / 400;
    for (const x of [0.28, 0.42, 0.58, 0.72]) {
      const y = FH * (0.7 - ((t + x * 3) % 1) * 0.06), s = FW * 0.035;
      g.beginPath(); g.moveTo(x * FW, y - s * 1.6); g.lineTo(x * FW + s, y - s * 0.4); g.lineTo(x * FW + s * 0.4, y - s * 0.4); g.lineTo(x * FW + s * 0.4, y + s); g.lineTo(x * FW - s * 0.4, y + s); g.lineTo(x * FW - s * 0.4, y - s * 0.4); g.lineTo(x * FW - s, y - s * 0.4); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }
  g.globalCompositeOperation = 'lighter';
  for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.life -= 0.02; g.fillStyle = `hsla(${s.hue},100%,72%,${Math.max(0, s.life)})`; g.beginPath(); g.arc(s.x, s.y, 2.4 * s.life + 0.6, 0, 7); g.fill(); }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  g.globalCompositeOperation = 'source-over';
}
requestAnimationFrame(drawFx);
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

// ---------------------------------------------------------------- the tools
// The magnifying glass and the lamp: the picture drawn enlarged inside the glass, or lit only where the lamp is,
// so what the child looks for appears exactly under the finger.
function lensTool(kind, a) {
  return new Promise((res) => {
    const lensGen = gen;
    hint(T[kind]); sfx(kind === 'loupe' ? 'loupe' : 'lamp');
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = kind === 'loupe' ? 2.6 : 1;
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now();
    const R = () => FW * (kind === 'loupe' ? 0.2 : 0.24);
    const draw = () => {
      if (done || lensGen !== gen) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last, x = pos[0] * FW, y = pos[1] * FH; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'lamp') {
        // the dark hold, with a warm pool of lamplight that flickers a little
        L.fillStyle = 'rgba(6,4,12,0.94)'; L.fillRect(0, 0, FW, FH);
        const r = R() * (1 + Math.sin(now / 90) * 0.03), gr = L.createRadialGradient(x, y, r * 0.15, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        L.globalCompositeOperation = 'destination-out'; L.fillStyle = gr; L.beginPath(); L.arc(x, y, r, 0, 7); L.fill(); L.globalCompositeOperation = 'source-over';
        L.fillStyle = 'rgba(255,170,60,0.12)'; L.beginPath(); L.arc(x, y, r * 0.8, 0, 7); L.fill();
        L.fillStyle = '#ffd27a'; L.beginPath(); L.ellipse(x, y - 4, 5, 9, 0, 0, 7); L.fill(); L.fillStyle = '#8a4b1f'; L.beginPath(); L.ellipse(x, y + 9, 13, 6, 0, 0, 7); L.fill();
      } else {
        L.save(); L.beginPath(); L.arc(x, y, R(), 0, 7); L.clip();
        const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
        L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH);
        L.restore();
        L.lineWidth = 9; L.strokeStyle = '#b5862f'; L.beginPath(); L.arc(x, y, R(), 0, 7); L.stroke();
        L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(x, y, R() - 5, 3.6, 4.6); L.stroke();
        const ang = 0.75; L.lineCap = 'round'; L.lineWidth = 16; L.strokeStyle = '#5a3a1c'; L.beginPath(); L.moveTo(x + Math.cos(ang) * (R() + 6), y + Math.sin(ang) * (R() + 6)); L.lineTo(x + Math.cos(ang) * (R() + 70), y + Math.sin(ang) * (R() + 70)); L.stroke();
      }
      // found: what was hidden stays in the light (or under the glass) for a moment
      held = near(pos, a.at, a.r) ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(a.at[0], a.at[1], 2, 50); // a little help after a while
      if (held > 380) { done = true; stop(); L.clearRect(0, 0, FW, FH); sfx('found'); if (kind === 'lamp') sfx('squeak'); burst(a.at[0], a.at[1], 46); ring(a.at); hint(''); res(); }
    };
    requestAnimationFrame(draw);
    const stop = drag({ hover: true, down: (p) => (pos = p), move: (p) => (pos = p) });
  });
}

// a path to follow with the finger (the measuring rope, the rainbow): it is drawn as far as the finger has come
function trace(a) {
  return new Promise((res) => {
    hint(T[a.style]); const pts = a.pts; let k = 0, active = false;
    if (a.style === 'rainbow') $('layer').classList.add('dim'); // the narration box steps back so the whole sky shows
    const start = spot(pts[0], 0.06, 'soft start');
    const draw = () => {
      L.clearRect(0, 0, FW, FH);
      // the faint guide
      L.setLineDash([6, 10]); L.lineWidth = 3; L.strokeStyle = 'rgba(255,255,255,0.55)'; L.beginPath(); pts.forEach(([x, y], i) => (i ? L.lineTo(x * FW, y * FH) : L.moveTo(x * FW, y * FH))); L.stroke(); L.setLineDash([]);
      if (k < 1) return;
      const line = (w, c, off = 0) => { L.lineWidth = w; L.strokeStyle = c; L.beginPath(); for (let i = 0; i <= k; i++) { const [x, y] = pts[i], ny = (a.style === 'rainbow' ? off : 0); i ? L.lineTo(x * FW, y * FH + ny) : L.moveTo(x * FW, y * FH + ny); } L.stroke(); };
      L.lineCap = 'round'; L.lineJoin = 'round';
      if (a.style === 'rope') { line(9, '#3b2610'); line(5, '#b98a4a'); }
      else { const C = ['#e8413c', '#f39a2b', '#f6d531', '#5cbf4a', '#3a8fd8', '#4b4fb3', '#8a49b8']; C.forEach((c, i) => line(7, c, (i - 3) * 6.5)); }
    };
    draw();
    const stop = drag({
      down: (p) => { active = near(p, pts[0], 0.1) || k > 0; if (active && k === 0) { start.remove(); sfx(a.style === 'rope' ? 'rope' : 'rainbow', 0.7); } },
      move: (p, down) => {
        if (!down || !active) return;
        // the finger moves the drawn part forward point by point, if it stays close to the path
        while (k < pts.length - 1 && near(p, pts[k + 1], 0.09)) { k++; if (k % 4 === 0) burst(pts[k][0], pts[k][1], 4, a.style === 'rope' ? 30 : 200); }
        if (k < pts.length - 1 && near(p, pts[Math.min(k + 2, pts.length - 1)], 0.09)) k++;
        draw();
        if (k >= pts.length - 1) {
          stop(); sfx('found'); const end = pts[pts.length - 1]; burst(end[0], end[1], 40);
          if (a.word) word(a.word, [0.5, pts[2][1] - 0.08]);
          if (a.after) { swapArt(a.after); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); }
          hint(''); setTimeout(() => { $('layer').classList.remove('dim'); res(); }, 700);
        }
      },
    });
  });
}

const acts = {
  loupe: (a) => lensTool('loupe', a),
  lamp: (a) => lensTool('lamp', a),
  trace,
  hello: (a) => new Promise((res) => {
    hint(T.hello); const s = spot(a.at, a.r, 'soft');
    s.onpointerdown = (e) => { e.stopPropagation(); s.remove(); sfx('chime'); word(a.word[lang], [a.at[0], a.at[1] - 0.16]); burst(a.at[0], a.at[1] - 0.1, 24); hint(''); setTimeout(res, 700); };
  }),
  // the mallet: each plank gets its knock
  taps: (a) => new Promise((res) => {
    hint(T.taps); let n = 0;
    for (const at of a.spots) { const s = spot(at, 0.08, 'soft'); s.onpointerdown = (e) => { e.stopPropagation(); sfx('hammer'); word(a.word[lang], [at[0], at[1] - 0.06]); burst(at[0], at[1], 16, 28); $('art').classList.remove('shake'); void $('art').offsetWidth; $('art').classList.add('shake'); if (!s.done) { s.done = true; s.classList.add('done'); if (++n === a.spots.length) { hint(''); setTimeout(res, 700); } } }; }
  }),
  // the pitch brush: the coated hull appears under the finger, the rest stays bare until most of it is covered
  paint: (a) => new Promise((res) => {
    hint(T.paint); const after = new Image(); after.src = `art/${a.after}.jpg`;
    const M = document.createElement('canvas'); M.width = 60; M.height = Math.round(60 * FH / FW); const m = M.getContext('2d');
    let last = 0, done = false;
    const cover = () => {
      const d = m.getImageData(0, 0, M.width, M.height).data; let on = 0, all = 0;
      for (let y = 0; y < M.height; y++) for (let x = 0; x < M.width; x++) {
        const u = x / M.width, v = y / M.height;
        if (u < a.box[0] || u > a.box[2] || v < a.box[1] || v > a.box[3] || (u > a.not[0] && u < a.not[2] && v > a.not[1] && v < a.not[3])) continue;
        all++; if (d[(y * M.width + x) * 4 + 3] > 100) on++;
      }
      return on / all;
    };
    const brush = (p) => {
      m.fillStyle = '#000'; m.beginPath(); m.arc(p[0] * M.width, p[1] * M.height, M.width * 0.09, 0, 7); m.fill();
      L.clearRect(0, 0, FW, FH); L.drawImage(after, 0, 0, FW, FH); L.globalCompositeOperation = 'destination-in'; L.imageSmoothingEnabled = true; L.drawImage(M, 0, 0, FW, FH); L.globalCompositeOperation = 'source-over';
      const now = performance.now(); if (now - last > 380) { last = now; sfx('brush', 0.6); }
      if (!done && cover() > 0.6) { done = true; stop(); sfx('found'); swapArt(a.after); burst(0.4, 0.5, 40, 30); setTimeout(() => L.clearRect(0, 0, FW, FH), 900); hint(''); setTimeout(res, 800); }
    };
    const stop = drag({ down: brush, move: (p, down) => down && brush(p) });
  }),
  // two by two: touch one animal, then the one that goes with it
  pairs: (a) => new Promise((res) => {
    hint(T.pairs); let pick = null, left = a.spots.length / 2;
    for (const p of a.spots) {
      const s = spot(p.at, 0.075, 'soft'); s._p = p;
      s.onpointerdown = (e) => {
        e.stopPropagation(); if (s.done) return;
        if (!pick) { pick = s; s.classList.add('pick'); sfx('tap'); return; }
        if (pick === s) { s.classList.remove('pick'); pick = null; return; }
        if (pick._p.k === p.k) {
          for (const x of [pick, s]) { x.done = true; x.classList.remove('pick'); x.classList.add('done'); burst(x._p.at[0], x._p.at[1], 20); }
          sfx(a.sound[p.k]); word(T.two, [(pick._p.at[0] + p.at[0]) / 2, Math.min(pick._p.at[1], p.at[1]) - 0.08]); pick = null;
          if (--left === 0) { hint(''); setTimeout(res, 900); }
        } else { sfx('tap', 0.5); pick.classList.remove('pick'); pick = s; s.classList.add('pick'); }
      };
    }
  }),
  // the finger brings the rain down; at the last stroke the flood comes
  rain: (a) => new Promise((res) => {
    hint(T.rain); let n = 0, from = null;
    const stop = drag({
      down: (p) => (from = p),
      move: (p, down) => {
        if (!down || !from || p[1] - from[1] < 0.14) return;
        from = null; n++; rainLevel = Math.min(1, n / a.n + 0.1); sfx(n === 1 ? 'rainstart' : 'tap', 0.6);
        if (n === 2) { sfx('thunder'); $('panel').classList.add('flash'); setTimeout(() => $('panel').classList.remove('flash'), 300); }
        if (n === 1) ambience('amb-storm');
        if (n >= a.n) { stop(); sfx('thunder'); swapArt(a.after); hint(''); setTimeout(res, 1200); }
      },
      up: () => (from = null),
    });
  }),
  // press the ark down: it sinks a little and the water pushes it back up when the finger lets go
  press: (a) => new Promise((res) => {
    hint(T.press); const s = spot(a.at, a.r, 'soft'); let n = 0, t = 0, over = null, raf = 0;
    const grow = () => { if (!s.isConnected) return; lift = Math.min(1, (performance.now() - t) / 500); raf = requestAnimationFrame(grow); };
    s.onpointerdown = (e) => {
      e.stopPropagation(); e.preventDefault(); t = performance.now(); sfx('push');
      over = new Image(); over.src = `art/${a.down}.jpg`; over.className = 'art over'; $('panel').insertBefore(over, $('fx')); requestAnimationFrame(() => over.classList.add('in'));
      grow();
    };
    const release = () => {
      if (!over) return; cancelAnimationFrame(raf); const long = performance.now() - t > 350, o = over; over = null;
      o.classList.remove('in'); setTimeout(() => o.remove(), 900); sfx('splash'); burst(a.at[0], a.at[1] + 0.06, 22, 190);
      const fall = () => { lift = Math.max(0, lift - 0.03); if (lift > 0) requestAnimationFrame(fall); }; setTimeout(fall, 500);
      if (long && ++n >= a.n) { s.remove(); hint(''); setTimeout(res, 1100); }
    };
    s.onpointerup = s.onpointercancel = s.onpointerleave = release;
  }),
  // flick the dove up into the sky
  fly: (a) => new Promise((res) => {
    hint(T.fly); const s = spot(a.at, a.r, 'soft'); let from = null;
    s.onpointerdown = (e) => { e.stopPropagation(); e.preventDefault(); from = toPanel(e); try { s.setPointerCapture(e.pointerId); } catch {} };
    s.onpointermove = (e) => {
      if (!from) return; const p = toPanel(e);
      if (from[1] - p[1] > 0.1) {
        from = null; s.remove(); sfx('flutter'); hint('');
        for (let i = 0; i < 12; i++) setTimeout(() => burst(a.at[0] + i * 0.04, a.at[1] - i * 0.03, 5, 200), i * 60);
        setTimeout(() => { sfx('coo'); swapArt(a.after); }, 1400); setTimeout(res, 2400);
      }
    };
    s.onpointerup = s.onpointercancel = () => (from = null);
  }),
  sounds: (a) => new Promise((res) => {
    hint(a.hint?.[lang] || T.sounds); let n = 0;
    for (const p of a.spots) { const s = spot(p.at, a.r || 0.09, 'soft'); s.onpointerdown = (e) => { e.stopPropagation(); sfx(p.sfx); word(p.word[lang], [p.at[0], p.at[1] - 0.09]); burst(p.at[0], p.at[1], 14, 100); if (!s.done) { s.done = true; s.classList.add('done'); if (++n === a.spots.length) { hint(''); setTimeout(res, 900); } } }; }
  }),
};
function swapArt(name) { if (!name) return; const im = new Image(); im.src = `art/${name}.jpg`; im.className = 'art over'; $('panel').insertBefore(im, $('fx')); requestAnimationFrame(() => im.classList.add('in')); }

// ---------------------------------------------------------------- reading
const hist = []; // the pages already read, for the back arrow
async function show(i, back = false) {
  if (busy) return; busy = true; if (!back && idx >= 0 && idx !== i) hist.push(idx); hint(''); $('next').classList.remove('on');
  const p = PANELS[i]; idx = i; const my = ++gen; const gone = () => gen !== my; $('prev').classList.toggle('on', hist.length > 0);
  sfx('page', 0.7);
  const page = $('page'); page.classList.remove('turn-in'); page.classList.add('turn-out'); await sleep(320);
  clearLayer(); last = null; sparks.length = 0; drops.length = 0; rainLevel = 0; lift = 0; $('panel').onpointerdown = $('panel').onpointermove = $('panel').onpointerup = $('panel').onpointercancel = null; L.clearRect(0, 0, FW, FH);
  for (const el of document.querySelectorAll('#panel .art')) el.remove();
  const im = new Image(); im.className = 'art'; im.id = 'art'; im.src = `art/${p.img}.jpg`; await im.decode().catch(() => {});
  $('panel').style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; $('panel').insertBefore(im, $('fx'));
  page.classList.remove('turn-out'); page.classList.add('turn-in'); fitFx();
  $('dots').innerHTML = PANELS.map((x) => `<i class="${x.id === p.id ? 'on' : ''}"></i>`).join('');
  ambience(p.amb);
  await sleep(450); if (gone()) return;
  if (p.sfx) { sfx(p.sfx); await sleep(1200); if (gone()) return; } // the panel's own sound first, then the story
  for (const ln of p.lines) { await say(ln); if (gone()) return; }
  if (p.act) { clearTexts(); await acts[p.act.kind](p.act); if (gone()) return; for (const ln of p.act.then || []) { await say(ln); if (gone()) return; } }
  busy = false; $('next').classList.add('on');
  if (i === PANELS.length - 1) setTimeout(end, 1800);
}
function next() {
  if (busy || idx < 0) return;
  if (idx === PANELS.length - 1) return end();
  show(idx + 1);
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
// on a laptop: the arrow keys turn the pages
addEventListener('keydown', (e) => { if (idx < 0) return; if (e.key === 'ArrowLeft') prev(); else if (e.key === 'ArrowRight') next(); });
async function start(m) {
  mode = m; await initAudio(); music.play().catch(() => {});
  document.body.classList.add('reading'); $('cover').classList.add('gone');
  goFull(); // the real full screen on Android; on the iPhone the page already fills the screen
  show(0);
}
keepFull(); iosTip(lang);
$('readMe').onclick = () => start('voice');
$('readSelf').onclick = () => start('self');
$('again').onclick = () => { $('endcard').classList.remove('on'); show(0); };
addEventListener('resize', () => { if (idx >= 0) fitFx(); });
visualViewport?.addEventListener('resize', () => { if (idx >= 0) fitFx(); }); // the phone's address bar coming and going
document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); amb.pause(); voice.pause(); } else if (idx >= 0) { music.play().catch(() => {}); amb.play().catch(() => {}); } });
window.__noe = { get idx() { return idx; }, get busy() { return busy; }, next, show };
