// Lina et les petites traces: the comic reader (same reader as Mila, with an explorer's tools). One panel fills
// the page; its lines are read aloud in their bubbles with the word being said lit up; on some panels the child
// takes Lina's magnifying glass or binoculars (a live magnified view under the finger), keeps still to reassure a
// frightened hedgehog, or says hello to the little ones.
import { PANELS, TITLE, WHO, AFTER_BRANCH } from './story.js?v=202610252330';

const $ = (id) => document.getElementById(id);
const lang = 'fr';
const T = { readMe: 'Lis-moi l’histoire', readSelf: 'Je lis tout seul', again: 'Relire l’histoire', more: 'D’autres contes', end: 'Fin', loupe: 'Glisse la loupe pour chercher', binocs: 'Glisse les jumelles pour chercher', still: 'Doigt posé sur Pic, sans bouger', greet: 'Touche les petits hérissons', choice: 'Choisis un chemin' };
for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
$('title').textContent = TITLE[lang];
document.querySelector('.kick').textContent = 'Une BD à explorer';

let timings = {}, mode = 'voice', idx = -1, branch = null, busy = false, ctx = null, sfxBuf = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fetch(`voice/${lang}/timings.json?v=202610252330`).then((r) => r.json()).then((j) => (timings = j));

// ---------------------------------------------------------------- sound: decoded effects, streamed ambience, voices and theme
const SFX = ['loupe', 'found', 'binocs', 'sniff', 'squeak', 'uncurl', 'hush', 'hug', 'page', 'pop', 'tap', 'pencil'];
async function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
  SFX.forEach(async (n) => { try { const r = await fetch(`sfx/${n}.mp3`); sfxBuf[n] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch {} });
}
// the mix: the storyteller always on top. Effects sit about 12 dB under the voice and dip further while
// someone speaks; the theme and the ambience duck under every line and come back between lines.
const SFX_GAIN = 0.3; let speaking = false;
function sfx(n, vol = 1) { const b = sfxBuf[n]; if (!ctx || !b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol * SFX_GAIN * (speaking ? 0.55 : 1); s.connect(g).connect(ctx.destination); s.start(); }
const music = new Audio('sfx/theme.mp3'); music.loop = true; music.volume = 0.28;
const amb = new Audio(); amb.loop = true; amb.volume = 0.35;
const AMB = { 'amb-forest': 0.3, 'amb-stream': 0.4, 'amb-meadow': 0.5, 'amb-evening': 0.5 }; let ambLevel = 0.35;
function ambience(n) { const src = `sfx/${n}.mp3`; ambLevel = AMB[n] ?? 0.35; if (!amb.src.endsWith(src)) { amb.src = src; amb.play().catch(() => {}); } fade(amb, ambLevel * (speaking ? 0.45 : 1)); }
const fades = new Map();
function fade(el, to, ms = 350) { clearInterval(fades.get(el)); const from = el.volume, t0 = performance.now(); fades.set(el, setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) clearInterval(fades.get(el)); }, 30)); }
function duck(on) { speaking = on; fade(music, on ? 0.1 : 0.28); fade(amb, ambLevel * (on ? 0.45 : 1)); }
const voice = new Audio(); voice.preload = 'auto';

// ---------------------------------------------------------------- the panel
function wordsOf(id) { return timings[id]?.words || []; }
function showLine(ln) {
  const words = wordsOf(ln.id), el = document.createElement('div');
  if (ln.cap) for (const c of $('layer').querySelectorAll('.cap')) c.remove(); // one narration box at a time
  else { const old = [...$('layer').querySelectorAll('.bubble')]; if (old.length >= 2) { old[0]._tail?.remove(); old[0].remove(); } } // two bubbles at most, the oldest leaves first
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
    tick();
  });
  await sleep(250);
  return el;
}
// a short line said during an interaction, without a bubble (a gentle reminder)
function whisper(id) { if (mode !== 'voice' || !voice.paused) return; voice.src = `voice/${lang}/${id}.mp3`; voice.play().catch(() => {}); }
function clearLayer() { $('layer').innerHTML = ''; $('spots').innerHTML = ''; }

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
function word(text, at) { const el = document.createElement('div'); el.className = 'pow'; el.textContent = text; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.setProperty('--r', (Math.random() * 16 - 8).toFixed(1) + 'deg'); $('layer').append(el); setTimeout(() => el.remove(), 1600); }
function hint(text) { $('hint').textContent = text || ''; $('hint').classList.toggle('on', !!text); }
function spot(at, r, cls = '') { const el = document.createElement('button'); el.className = 'spot ' + cls; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; el.style.width = el.style.height = (r * 2 * 100) + '%'; $('spots').append(el); return el; }
const toPanel = (e) => { const r = $('panel').getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };

// ---------------------------------------------------------------- Lina's tools: a real magnified view under the finger
// The picture itself is drawn enlarged inside the glass (or the two binocular circles), so a clue that is a few
// pixels on the page becomes plain to see exactly where the child looks, like with a real magnifying glass.
function lensTool(kind, a) {
  return new Promise((res) => {
    hint(T[kind]); sfx(kind === 'loupe' ? 'loupe' : 'binocs');
    const art = $('art'), nw = art.naturalWidth, nh = art.naturalHeight, zoom = a.zoom || (kind === 'loupe' ? 2.4 : 3);
    let pos = a.start ? [...a.start] : [0.5, 0.62], held = 0, last = performance.now(), done = false, t0 = performance.now();
    const R = () => FW * (kind === 'loupe' ? 0.2 : 0.17);
    const centres = () => kind === 'loupe' ? [[pos[0] * FW, pos[1] * FH]] : [[pos[0] * FW - R() * 0.78, pos[1] * FH], [pos[0] * FW + R() * 0.78, pos[1] * FH]];
    const draw = () => {
      if (done) return; requestAnimationFrame(draw);
      const now = performance.now(), dt = now - last; last = now;
      L.clearRect(0, 0, FW, FH);
      if (kind === 'binocs') { L.fillStyle = 'rgba(18,12,4,0.82)'; L.fillRect(0, 0, FW, FH); }
      L.save(); L.beginPath(); for (const [x, y] of centres()) { L.moveTo(x + R(), y); L.arc(x, y, R(), 0, 7); } L.clip();
      if (kind === 'binocs') L.clearRect(0, 0, FW, FH);
      // the enlarged picture around where the tool points
      const sx = pos[0] * nw, sy = pos[1] * nh, sw = (FW / zoom) * (nw / FW), sh = (FH / zoom) * (nh / FH);
      L.drawImage(art, sx - sw * pos[0], sy - sh * pos[1], sw, sh, 0, 0, FW, FH);
      L.restore();
      // the glass: a brass ring with a handle (loupe), or the two dark rims (binoculars), and a soft reflection
      for (const [x, y] of centres()) {
        L.lineWidth = kind === 'loupe' ? 9 : 7; L.strokeStyle = kind === 'loupe' ? '#b5862f' : '#1c1c1c'; L.beginPath(); L.arc(x, y, R(), 0, 7); L.stroke();
        L.lineWidth = 2; L.strokeStyle = 'rgba(255,240,200,0.6)'; L.beginPath(); L.arc(x, y, R() - 5, 3.6, 4.6); L.stroke();
      }
      if (kind === 'loupe') { const [x, y] = centres()[0], ang = 0.75; L.lineCap = 'round'; L.lineWidth = 16; L.strokeStyle = '#5a3a1c'; L.beginPath(); L.moveTo(x + Math.cos(ang) * (R() + 6), y + Math.sin(ang) * (R() + 6)); L.lineTo(x + Math.cos(ang) * (R() + 70), y + Math.sin(ang) * (R() + 70)); L.stroke(); }
      // found: the clue stays under the glass for a moment
      const d = Math.hypot((pos[0] - a.at[0]) * FW, (pos[1] - a.at[1]) * FH);
      held = d < a.r * FW ? held + dt : 0;
      if (now - t0 > 9000 && Math.random() < 0.06) burst(a.at[0], a.at[1], 2, 50); // a little help after a while
      if (held > 380) { done = true; L.clearRect(0, 0, FW, FH); sfx('found'); burst(a.at[0], a.at[1], 46); ring(a.at); $('panel').onpointerdown = $('panel').onpointermove = null; hint(''); res(); }
    };
    requestAnimationFrame(draw);
    let down = false;
    $('panel').onpointerdown = (e) => { e.preventDefault(); down = true; pos = toPanel(e); try { $('panel').setPointerCapture(e.pointerId); } catch {} };
    $('panel').onpointermove = (e) => { if (down || e.pointerType === 'mouse') pos = toPanel(e); };
    addEventListener('pointerup', () => (down = false));
  });
}
// a circle that draws itself around what was found
function ring(at) { const el = document.createElement('div'); el.className = 'foundring'; el.style.left = at[0] * 100 + '%'; el.style.top = at[1] * 100 + '%'; $('layer').append(el); setTimeout(() => el.remove(), 2600); }

const acts = {
  loupe: (a) => lensTool('loupe', a),
  binocs: (a) => lensTool('binocs', a),
  choice: (a) => new Promise((res) => {
    hint(T.choice);
    for (const o of a.opts) { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o[lang]; b.style.left = o.at[0] * 100 + '%'; b.style.top = o.at[1] * 100 + '%'; $('spots').append(b); b.onpointerdown = (e) => { e.stopPropagation(); sfx('found'); branch = o.go; hint(''); res(); }; }
  }),
  // keep still: a frightened hedgehog only uncurls for a finger that does not move
  still: (a) => new Promise((res) => {
    hint(T.still); const s = spot(a.at, a.r, 'soft'); let down = null, t = 0, warned = 0, sniffed = false;
    const onDown = (e) => { e.preventDefault(); down = toPanel(e); t = performance.now(); sniffed = false; };
    const onMove = (e) => { if (!down) return; const p = toPanel(e); if (Math.hypot((p[0] - down[0]) * FW, (p[1] - down[1]) * FH) > 14) { down = null; s.classList.remove('calm'); if (performance.now() - warned > 3500) { warned = performance.now(); sfx('hush'); whisper(a.warn); } } };
    const tick = () => {
      if (down) { const k = (performance.now() - t) / a.ms; s.classList.add('calm'); s.style.setProperty('--k', Math.min(1, k)); if (k > 0.45 && !sniffed) { sniffed = true; sfx('sniff'); } if (k >= 1) { s.remove(); $('panel').onpointerdown = $('panel').onpointermove = null; sfx('uncurl'); swapArt(cur().calm); burst(a.at[0], a.at[1], 30, 30); hint(''); res(); return; } }
      else s.style.setProperty('--k', 0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    $('panel').onpointerdown = onDown; s.onpointerdown = onDown; $('panel').onpointermove = onMove;
    addEventListener('pointerup', () => { down = null; });
  }),
  greet: (a) => new Promise((res) => {
    hint(T.greet); let n = 0;
    for (const p of a.spots) { const s = spot(p.at, 0.085, 'soft'); s.onpointerdown = (e) => { e.stopPropagation(); sfx('squeak'); word(p.word, [p.at[0], p.at[1] - 0.07]); burst(p.at[0], p.at[1], 14, 340); if (!s.done) { s.done = true; s.classList.add('done'); if (++n === a.spots.length) { hint(''); setTimeout(res, 600); } } }; }
  }),
};
const cur = () => PANELS[idx];
function swapArt(name) { if (!name) return; const im = new Image(); im.src = `art/${name}.jpg`; im.className = 'art over'; $('panel').insertBefore(im, $('fx')); requestAnimationFrame(() => im.classList.add('in')); }
function film(name, loop) {
  return new Promise((res) => {
    const v = document.createElement('video'); v.className = 'art vid'; v.muted = true; v.playsInline = true; v.loop = loop; v.src = `art/${name}.mp4`;
    v.oncanplay = () => { v.classList.add('in'); v.play().catch(() => {}); }; v.onended = res; v.onerror = res; $('panel').insertBefore(v, $('fx')); if (loop) res();
  });
}

// ---------------------------------------------------------------- reading
async function show(i) {
  if (busy) return; busy = true; hint(''); $('next').classList.remove('on');
  const p = PANELS[i]; idx = i;
  sfx('page', 0.7);
  const page = $('page'); page.classList.remove('turn-in'); page.classList.add('turn-out'); await sleep(320);
  clearLayer(); sparks.length = 0; $('panel').onpointerdown = $('panel').onpointermove = null; L.clearRect(0, 0, FW, FH);
  for (const el of document.querySelectorAll('#panel .art')) el.remove();
  const im = new Image(); im.className = 'art'; im.id = 'art'; im.src = `art/${p.img}.jpg`; await im.decode().catch(() => {});
  $('panel').style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; $('panel').insertBefore(im, $('fx'));
  page.classList.remove('turn-out'); page.classList.add('turn-in'); fitFx();
  $('dots').innerHTML = PANELS.filter((x) => !x.branch || x.id === branch).map((x) => `<i class="${x.id === p.id ? 'on' : ''}"></i>`).join('');
  ambience(p.amb);
  if (p.video) film(p.video, true);
  await sleep(450);
  if (p.sfx) { sfx(p.sfx); await sleep(1200); } // the panel's own sound first, then the story
  for (const ln of p.lines) await say(ln);
  if (p.act) { await acts[p.act.kind](p.act); for (const ln of p.act.then || []) await say(ln); }
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
function end() { $('endcard').classList.add('on'); music.volume = 0.4; }
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
window.__lina = { get idx() { return idx; }, get busy() { return busy; }, next, show, get branch() { return branch; } };
