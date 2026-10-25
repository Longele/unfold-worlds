// Mila et la luciole perdue: the comic reader. One panel fills the page; its lines are read aloud in their
// bubbles (the word being said lights up, so a child can follow the text); an interactive panel waits for the
// child's gesture. Voices stream as plain audio elements and only the short effects are decoded, so a long read
// stays light on an iPhone.
import { PANELS, TITLE, WHO } from './story.js?v=202610252030';

const $ = (id) => document.getElementById(id);
const lang = 'fr';
const T = { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', tapNext: 'Touche pour continuer', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', find: 'Trouve la petite lumière', hold: 'Pose ton doigt sur Pipo et garde-le', sounds: 'Touche les bruits de la nuit', choice: 'Choisis un chemin', wake: 'Touche le hibou trois fois', shine: 'Touche, touche, touche !' };
for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
$('title').textContent = TITLE[lang];

$('panel').append($('meter')); // the charge bar sits inside the picture, above the hint
let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fetch(`voice/${lang}/timings.json?v=202610252030`).then((r) => r.json()).then((j) => (timings = j));

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and lullaby
const SFX = ['found', 'glow', 'tap', 'wake', 'lightup', 'page', 'pop', 'cricket', 'owlet', 'frog', 'plouf', 'creak', 'hop'];
async function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
  SFX.forEach(async (n) => { try { const r = await fetch(`sfx/${n}.mp3`); sfxBuf[n] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch {} });
}
// the mix: the storyteller always on top. Effects sit about 12 dB under the voice and dip further while
// someone speaks; the lullaby and the ambience duck under every line and come back between lines.
const SFX_GAIN = 0.3; let speaking = false;
function sfx(n, vol = 1) { const b = sfxBuf[n]; if (!ctx || !b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol * SFX_GAIN * (speaking ? 0.55 : 1); s.connect(g).connect(ctx.destination); s.start(); }
const music = new Audio('sfx/lullaby.mp3'); music.loop = true; music.volume = 0.3;
const amb = new Audio(); amb.loop = true; amb.volume = 0.45;
const AMB = { 'amb-room': 0.9, 'amb-garden': 0.5, 'amb-forest': 0.45, 'amb-river': 0.45 }; let ambLevel = 0.45;
function ambience(n) { const src = `sfx/${n}.mp3`; ambLevel = AMB[n] ?? 0.45; if (!amb.src.endsWith(src)) { amb.src = src; amb.play().catch(() => {}); } fade(amb, ambLevel * (speaking ? 0.45 : 1)); }
const fades = new Map();
function fade(el, to, ms = 350) { clearInterval(fades.get(el)); const from = el.volume, t0 = performance.now(); fades.set(el, setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) clearInterval(fades.get(el)); }, 30)); }
function duck(on) { speaking = on; fade(music, on ? 0.11 : 0.3); fade(amb, ambLevel * (on ? 0.45 : 1)); }
const voice = new Audio(); voice.preload = 'auto';

// ---------------------------------------------------------------- the panel
function wordsOf(id) { return timings[id]?.words || []; }
function showLine(ln) {
  const words = wordsOf(ln.id), el = document.createElement('div');
  if (ln.cap) for (const c of $('layer').querySelectorAll('.cap')) c.remove(); // one narration box at a time
  el.className = ln.cap ? 'cap' : 'bubble ' + (WHO[timings[ln.id]?.who] || '');
  el.innerHTML = words.map((w, i) => `<span data-i="${i}">${w.w}</span>`).join(' ');
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
async function say(ln) {
  const el = showLine(ln);
  if (mode !== 'voice') { await sleep(300); return el; }
  voice.src = `voice/${lang}/${ln.id}.mp3`; duck(true);
  try { await voice.play(); } catch { duck(false); return el; }
  const words = wordsOf(ln.id), spans = el.querySelectorAll('span');
  await new Promise((res) => {
    const tick = () => {
      const t = voice.currentTime;
      spans.forEach((s, i) => s.classList.toggle('on', words[i] && t >= words[i].s - 0.03 && t < (words[i + 1]?.s ?? 99)));
      if (voice.ended || voice.paused) { spans.forEach((s) => s.classList.remove('on')); duck(false); res(); } else requestAnimationFrame(tick);
    };
    voice.onended = () => {}; tick();
  });
  await sleep(250);
  return el;
}
function clearLayer() { $('layer').innerHTML = ''; $('spots').innerHTML = ''; }

// ---------------------------------------------------------------- effects: sparkles and glows over the panel
const fx = $('fx'), g = fx.getContext('2d'); let FW = 0, FH = 0; const sparks = [], glows = [];
function fitFx() { const r = $('panel').getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); FW = r.width; FH = r.height; fx.width = FW * d; fx.height = FH * d; g.setTransform(d, 0, 0, d, 0, 0); }
function burst(x, y, n = 26, hue = 70) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3.5; sparks.push({ x: x * FW, y: y * FH, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, hue: hue + Math.random() * 40 }); } }
function drawFx() {
  requestAnimationFrame(drawFx); g.clearRect(0, 0, FW, FH); g.globalCompositeOperation = 'lighter';
  for (const w of glows) { if (w.k <= 0.001) continue; const r = FW * (0.08 + 0.3 * w.k), gr = g.createRadialGradient(w.x * FW, w.y * FH, 0, w.x * FW, w.y * FH, r); gr.addColorStop(0, `hsla(75,100%,75%,${0.85 * w.k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(w.x * FW, w.y * FH, r, 0, 7); g.fill(); }
  for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.life -= 0.02; g.fillStyle = `hsla(${s.hue},100%,75%,${Math.max(0, s.life)})`; g.beginPath(); g.arc(s.x, s.y, 2.4 * s.life + 0.6, 0, 7); g.fill(); }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  g.globalCompositeOperation = 'source-over';
}
requestAnimationFrame(drawFx);
function word(text, at) { const el = document.createElement('div'); el.className = 'pow'; el.textContent = text; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.setProperty('--r', (Math.random() * 16 - 8).toFixed(1) + 'deg'); $('layer').append(el); setTimeout(() => el.remove(), 1600); }
function hint(text) { $('hint').textContent = text || ''; $('hint').classList.toggle('on', !!text); }
// a touch spot over the picture
function spot(at, r, cls = '') { const el = document.createElement('button'); el.className = 'spot ' + cls; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.width = el.style.height = (r * 2 * 100) + '%'; $('spots').append(el); return el; }

// ---------------------------------------------------------------- the interactions: each resolves when the child has done it
const acts = {
  find: (a) => new Promise((res) => {
    hint(T.find); const s = spot(a.at, a.r, 'hidden'); const help = setTimeout(() => s.classList.add('help'), 7000);
    $('panel').onpointerdown = (e) => { if (e.target !== s) { const r = $('panel').getBoundingClientRect(); burst((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 6, 200); sfx('tap', 0.5); } };
    s.onpointerdown = (e) => { e.stopPropagation(); clearTimeout(help); sfx('found'); burst(a.at[0], a.at[1], 40); glows.push({ x: a.at[0], y: a.at[1], k: 0.9, fade: true }); s.remove(); $('panel').onpointerdown = null; hint(''); res(); };
  }),
  hold: (a) => new Promise((res) => {
    hint(T.hold); const w = { x: a.at[0], y: a.at[1], k: 0.08 }; glows.push(w); const s = spot(a.at, 0.2, 'soft');
    let down = false, last = performance.now(), playing = false;
    const step = () => { const now = performance.now(), dt = now - last; last = now; w.k = Math.max(0.08, Math.min(1, w.k + (down ? dt / a.ms : -dt / 4000))); if (down && Math.random() < 0.3) burst(a.at[0], a.at[1], 1); if (w.k >= 1) { sfx('found'); burst(a.at[0], a.at[1], 50); s.remove(); $('panel').onpointerdown = null; hint(''); res(); return; } requestAnimationFrame(step); };
    requestAnimationFrame(step);
    const on = (e) => { e.preventDefault(); down = true; if (!playing) { sfx('glow', 0.8); playing = true; setTimeout(() => (playing = false), 2500); } };
    $('panel').onpointerdown = on; s.onpointerdown = on; addEventListener('pointerup', () => (down = false)); addEventListener('pointercancel', () => (down = false));
  }),
  sounds: (a) => new Promise((res) => {
    hint(T.sounds); let n = 0;
    for (const p of a.spots) { const s = spot(p.at, 0.1, 'soft'); s.onpointerdown = (e) => { e.stopPropagation(); sfx(p.sfx); word(p.word, [p.at[0], p.at[1] - 0.08]); burst(p.at[0], p.at[1], 12, 160); if (!s.done) { s.done = true; s.classList.add('done'); if (++n === 1) { hint(''); res(); } } }; }
  }),
  choice: (a) => new Promise((res) => {
    hint(T.choice);
    for (const o of a.opts) { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o[lang]; b.style.left = o.at[0] * 100 + '%'; b.style.top = o.at[1] * 100 + '%'; $('spots').append(b); b.onpointerdown = (e) => { e.stopPropagation(); sfx('found'); branch = o.go; hint(''); res(); }; }
  }),
  wake: (a) => new Promise((res) => {
    hint(T.wake); const s = spot(a.at, a.r, 'soft'); let n = 0;
    s.onpointerdown = (e) => { e.stopPropagation(); n++; sfx('tap'); word('TOC !', [a.at[0] + 0.18, a.at[1] - 0.1]); $('art').classList.remove('shake'); void $('art').offsetWidth; $('art').classList.add('shake');
      if (n >= a.taps) { s.remove(); hint(''); sfx('wake'); swapArt(cur().awake); res(); } };
  }),
  shine: (a) => new Promise((res) => {
    hint(T.shine); const w = { x: a.at[0], y: a.at[1], k: 0.1 }; glows.push(w); let n = 0;
    $('meter').classList.add('on'); $('meter').style.setProperty('--m', 0);
    $('panel').onpointerdown = (e) => { e.preventDefault(); n++; sfx('tap', 0.7); w.k = Math.min(1, 0.1 + n / a.taps); burst(a.at[0], a.at[1], 8); $('meter').style.setProperty('--m', n / a.taps);
      if (n >= a.taps) { $('panel').onpointerdown = null; $('meter').classList.remove('on'); hint(''); w.k = 0; res(); } };
  }),
};
const cur = () => PANELS[idx];
function swapArt(name) { if (!name) return; const im = new Image(); im.src = `art/${name}.jpg`; im.className = 'art over'; $('panel').insertBefore(im, $('fx')); requestAnimationFrame(() => im.classList.add('in')); }
// a short film inside the panel (the light-up of the tree, a living night): it plays over the still, then stays
function film(name, loop) {
  return new Promise((res) => {
    const v = document.createElement('video'); v.className = 'art vid'; v.muted = true; v.playsInline = true; v.loop = loop; v.src = `art/${name}.mp4`;
    v.oncanplay = () => { v.classList.add('in'); v.play().catch(() => {}); }; v.onended = res; v.onerror = res; $('panel').insertBefore(v, $('fx')); if (loop) res();
  });
}

// ---------------------------------------------------------------- reading
async function show(i, dir = 1) {
  if (busy) return; busy = true; hint(''); $('next').classList.remove('on');
  const p = PANELS[i]; idx = i;
  sfx('page', 0.7);
  const page = $('page'); page.classList.remove('turn-in'); page.classList.add('turn-out'); await sleep(320);
  clearLayer(); glows.length = 0; sparks.length = 0; $('panel').onpointerdown = null;
  for (const el of document.querySelectorAll('#panel .art')) el.remove();
  const im = new Image(); im.className = 'art'; im.id = 'art'; im.src = `art/${p.img}.jpg`; await im.decode().catch(() => {});
  $('panel').style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; $('panel').insertBefore(im, $('fx'));
  page.classList.remove('turn-out'); page.classList.add('turn-in'); fitFx();
  $('dots').innerHTML = PANELS.filter((x) => !x.branch || x.id === branch).map((x) => `<i class="${x.id === p.id ? 'on' : ''}"></i>`).join('');
  ambience(p.amb);
  if (p.video && p.id !== 'c11') film(p.video, true);
  await sleep(450);
  if (p.sfx) { sfx(p.sfx); if (p.word) setTimeout(() => word(p.word.t, p.word.at), 500); await sleep(1300); } // the panel's sound first, then the story
  for (const ln of p.lines) await say(ln);
  if (p.act) {
    await acts[p.act.kind](p.act);
    if (p.id === 'c11') { sfx('lightup'); burst(0.53, 0.86, 30); await film('c11', false); burst(0.5, 0.35, 80); } // the film ends on the lit tree and stays there
    for (const ln of p.act.then || []) await say(ln);
  }
  busy = false; $('next').classList.add('on');
  if (i === PANELS.length - 1) setTimeout(end, 1800);
}
function next() {
  if (busy || idx < 0) return;
  const p = PANELS[idx];
  if (idx === PANELS.length - 1) return end();
  let n = idx + 1;
  if (p.id === 'c7') n = PANELS.findIndex((x) => x.id === branch);
  else if (p.branch) n = PANELS.findIndex((x) => x.id === 'c9');
  show(n);
}
function end() { $('endcard').classList.add('on'); music.volume = 0.45; }
$('page').addEventListener('pointerdown', (e) => { if (e.target.closest('button') || busy) return; next(); });
$('next').onclick = next;
async function start(m) {
  mode = m; await initAudio(); music.play().catch(() => {});
  document.body.classList.add('reading'); $('cover').classList.add('gone');
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  branch = null; show(0);
}
$('readMe').onclick = () => start('voice');
$('readSelf').onclick = () => start('self');
$('again').onclick = () => { $('endcard').classList.remove('on'); branch = null; show(0); };
addEventListener('resize', () => { if (idx >= 0) fitFx(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); amb.pause(); voice.pause(); } else if (idx >= 0) { music.play().catch(() => {}); amb.play().catch(() => {}); } });
window.__mila = { get idx() { return idx; }, get busy() { return busy; }, next, show, get branch() { return branch; } };
