// Presentation engine: one click = one point. Driven by the paired phone (net.js, peer-to-peer over the internet),
// a presenter remote (PageDown/PageUp/arrows/B), a mouse (left = next, right = previous, wheel) or the
// keyboard. The cursor is never shown; nothing on screen betrays the controls.
import { loadProject } from './project.js';
// the world comes from the database (see project.js); everything below is the same engine
const PROJECT = await loadProject();
const SCENES = PROJECT.scenes;
import { setBg, pulse } from './bg.js';
import * as A from './audio.js';
import { host, randCode, cleanRoom } from './net.js';
import { CAST_NS } from './cast-config.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), prog = $('prog'), black = $('black'), toast = $('toast'), spotEl = $('spot');
const ROOT = { 1: 196, 2: 220, 3: 247 }; // the bell's key moves up with each part

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
}
addEventListener('resize', fit); fit();

// wrap every word in two spans so it can rise out of a mask
function split(el) {
  const spans = [];
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const p of c.textContent.split(/(\s+)/)) {
          if (!p) continue;
          if (/^\s+$/.test(p)) { frag.append(' '); continue; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = p; w.append(s); frag.append(w); spans.push(s);
        }
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !['SUP', 'BR'].includes(c.tagName)) walk(c);
    }
  };
  walk(el);
  const per = Math.min(55, 2200 / Math.max(1, spans.length)); // long verses still land in ~2 s
  spans.forEach((s, i) => (s.style.transitionDelay = `${(i * per) | 0}ms`));
  setTimeout(() => spans.forEach((s) => (s.style.transitionDelay = '')), 4200); // so later highlights react instantly
}

function apply(el, step, animate) {
  const fresh = [];
  el.querySelectorAll('[data-s]').forEach((e) => {
    const on = +e.dataset.s <= step;
    if (on && !e.classList.contains('in')) fresh.push(e);
    if (!on) e.classList.remove('in');
  });
  let k = 0;
  fresh.forEach((e) => {
    if (!e.style.transitionDelay || e.dataset.auto) { e.dataset.auto = 1; e.style.transitionDelay = animate ? `${Math.min(k++, 5) * 0.12}s` : '0s'; }
    e.classList.add('in');
  });
  el.querySelectorAll('[data-lit]').forEach((e) => e.classList.toggle('lit', step >= +e.dataset.lit));
  el.querySelectorAll('[data-only]').forEach((e) => e.classList.toggle('lit', step === +e.dataset.only));
  el.querySelectorAll('[data-hide]').forEach((e) => e.classList.toggle('gone', step >= +e.dataset.hide));
  el.querySelectorAll('[data-focus]').forEach((e) => e.classList.toggle('focus', step >= +e.dataset.focus && el.querySelector('[data-only].lit,[data-lit].lit') !== null));
}

const onTV = !!window.CAST_RECEIVER;
let armed = onTV;
let cur = null, idx = 0, step = 0, started = false, t0 = 0, lastIn = 0, whoosh = 0;
const total = SCENES.reduce((a, s) => a + s.steps, 0);
const before = SCENES.map((_, i) => SCENES.slice(0, i).reduce((a, s) => a + s.steps, 0));

function render(i, s, dir = 1) {
  const sc = SCENES[i];
  if (cur && cur.i === i) {
    step = s; apply(cur.el, s, true); sc.onStep?.(s, cur.el, cur.st);
    if (sc.live) layoutCloud();
    if (dir > 0) {
      pulse();
      A.bell(s, ROOT[sc.part]); A.play('ui_tick', 0.35, 0.9 + s * 0.05);
      if (sc.stepSnd) A.play(sc.stepSnd, 0.25, 1 + s * 0.04); else A.play('spark', 0.12, 0.8 + s * 0.08);
    } else { pulse(0.3); A.play('ui_tick', 0.22, 0.7); }
    return sync();
  }
  if (cur) {
    const old = cur; SCENES[old.i].onExit?.(old.st);
    old.el.classList.remove('on'); old.el.classList.add('out'); setTimeout(() => old.el.remove(), 900);
  }
  const el = document.createElement('section'); el.className = 'scene'; el.innerHTML = sc.html;
  el.querySelectorAll('.words').forEach(split);
  stage.append(el);
  cur = { i, el, st: {} }; idx = i; step = s;
  document.body.dataset.part = sc.part;
  if (!spot.on) setBg(sc.bg);
  pulse(sc.chapter ? 1.4 : 0.8);
  A.play(whoosh++ % 2 ? 'whoosh_b' : 'whoosh_a', sc.chapter ? 0.55 : 0.4, dir > 0 ? 1 : 0.85);
  if (sc.snd && !sc.snd.startsWith('whoosh')) A.play(sc.snd, sc.chapter ? 0.5 : 0.35);
  if (dir > 0) A.bell(0, ROOT[sc.part], 0.08);
  if (sc.live) mountCloud(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add('on');
    setTimeout(() => { apply(el, s, dir > 0); sc.onStep?.(s, el, cur.st); if (sc.live) layoutCloud(); }, 260);
  }));
  sync();
}

function next() {
  if (step < SCENES[idx].steps - 1) render(idx, step + 1, 1);
  else if (idx < SCENES.length - 1) render(idx + 1, 0, 1);
}
function prev() {
  if (step > 0) render(idx, step - 1, -1);
  else if (idx > 0) render(idx - 1, SCENES[idx - 1].steps - 1, -1);
}
function go(i) { render(Math.max(0, Math.min(SCENES.length - 1, i)), 0, 1); }
function toggleBlack(force) {
  const on = typeof force === 'boolean' ? force : !black.classList.contains('on');
  black.classList.toggle('on', on); A.play('membrane', 0.15, on ? 0.7 : 1); sync();
}

// ---------------- spotlight (phone trackpad) ----------------
const spot = { on: false, x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
function setSpot(on) {
  spot.on = on; spotEl.classList.toggle('on', on);
  if (on) { spot.tx = spot.ty = 0.5; A.play('ui_open', 0.2); } else if (cur) setBg(SCENES[cur.i].bg);
  sync();
}
(function spotLoop() {
  spot.x += (spot.tx - spot.x) * 0.22; spot.y += (spot.ty - spot.y) * 0.22;
  spotEl.style.setProperty('--sx', `${(spot.x * 100).toFixed(2)}%`); spotEl.style.setProperty('--sy', `${(spot.y * 100).toFixed(2)}%`);
  if (spot.on) setBg({ fx: spot.x, fy: spot.y, hue: SCENES[idx].bg.hue, mode: 'orbit', pull: 0.6, speed: 0.6 }); // the silk light follows the finger
  requestAnimationFrame(spotLoop);
})();

// ---------------- live audience words ----------------
const words = new Map(); // key -> { text, n, t }
let cloudEl = null;
const keyOf = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
function mountCloud(el) {
  cloudEl = el.querySelector('#cloud');
  for (const [k, w] of words) w.el = makeWord(k, w, false);
  const url = audienceURL();
  drawQR(el.querySelector('#qr-mot'), url, '#07090d');
  el.querySelector('#mot-url').textContent = prettyURL(url);
  countWords();
}
function makeWord(k, w, fresh) {
  const s = document.createElement('div'); s.className = 'cw' + (fresh ? ' new' : '');
  s.innerHTML = `<span class="t"></span><span class="c"></span>`; s.querySelector('.t').textContent = w.text;
  cloudEl.append(s);
  return s;
}
function layoutCloud() {
  if (!cloudEl || !cur || !SCENES[cur.i].live) return;
  const open = step === 0; // QR still on screen -> keep words left of it
  const cx = open ? 690 : 960, cy = open ? 650 : 620, rx = open ? 1.25 : 1.75;
  const list = [...words.values()].sort((a, b) => b.n - a.n || a.t - b.t);
  const max = list[0]?.n || 1;
  const crowd = list.length > 25 ? Math.max(0.55, 25 / list.length + 0.2) : 1; // many different words -> smaller type
  const placed = [];
  const box = { l: open ? 120 : 110, r: open ? 1380 : 1810, t: open ? 380 : 330, b: 1020 };
  list.forEach((w, i) => {
    // size follows the share of votes, not the raw count, so a room of 300 stays legible
    const rel = max > 1 ? Math.pow((w.n - 1) / (max - 1), 0.7) : 0;
    const size = Math.round((34 + rel * (max > 1 ? 126 : 0)) * (i === 0 ? 1 : crowd) + (i === 0 && max > 1 ? 10 : 0));
    // estimated footprint of the word, then walk a golden spiral until it touches nothing already placed
    const hw = (w.text.length * size * 0.26) + 14 + (w.n > 1 ? size * 0.2 : 0), hh = size * 0.5 + 8;
    let x = cx, y = cy, ok = false;
    for (let k = 0; k < 1400; k++) {
      const r = 7 * Math.sqrt(k) * 3.2, a = k * 2.39996 + i;
      x = cx + Math.cos(a) * r * rx; y = cy + Math.sin(a) * r * 0.7;
      if (x - hw < box.l || x + hw > box.r || y - hh < box.t || y + hh > box.b) continue;
      if (!placed.some((p) => Math.abs(p.x - x) < p.hw + hw && Math.abs(p.y - y) < p.hh + hh)) { ok = true; break; }
    }
    w.el.classList.toggle('hidden', !ok); // no room left: rare words wait off-screen (they still count)
    if (!ok) return;
    placed.push({ x, y, hw, hh });
    w.el.style.setProperty('--x', `${x.toFixed(0)}px`); w.el.style.setProperty('--y', `${y.toFixed(0)}px`);
    w.el.style.fontSize = `${size}px`;
    w.el.classList.toggle('top', w.n === max && max > 1);
    w.el.querySelector('.c').textContent = w.n > 1 ? `×${w.n}` : '';
  });
}
function countWords() {
  const n = [...words.values()].reduce((a, w) => a + w.n, 0);
  const el = cur?.el.querySelector('#mot-n');
  if (el) el.textContent = !net.vote ? 'vote fermé' : `${n} mot${n > 1 ? 's' : ''} reçu${n > 1 ? 's' : ''}`;
  const big = cur?.el.querySelector('#mot-big'); if (big) big.textContent = n ? n : '';
}
function addWord(text) {
  const k = keyOf(text); if (!k) return;
  let w = words.get(k);
  if (w) w.n++; else { w = { text, n: 1, t: Date.now() }; words.set(k, w); }
  if (cloudEl && cur && SCENES[cur.i].live) {
    if (!w.el || !w.el.isConnected) { w.el = makeWord(k, w, true); w.el.style.setProperty('--x', '960px'); w.el.style.setProperty('--y', '1180px'); }
    requestAnimationFrame(() => requestAnimationFrame(() => { w.el.classList.remove('new'); layoutCloud(); }));
    A.play('spark', 0.3, 0.9 + Math.random() * 0.4); A.bell(Math.min(8, w.n + 2), ROOT[1], 0.06); pulse(0.4);
  }
  countWords();
}

// ---------------- QR ----------------
function drawQR(el, text, dark = '#07090d') {
  if (!el || !window.qrcode) return;
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  el.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="${dark}"/></svg>`;
}

// ---------------- phone link (PeerJS, no server) ----------------
// The screen is the host. Its room code survives a reload so a paired phone simply reconnects.
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const qs = new URLSearchParams(location.search);
const castToken = qs.get('cast');
// room + paired phones are remembered per world, so two projects never share a remote
const ROOM_KEY = `uw-room-${PROJECT.id}`, TOK_KEY = `uw-tokens-${PROJECT.id}`; // opened on a TV / Chromecast by the phone itself: that phone is pre-authorised
function pinCode() { return String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000)); }
const net = { ok: false, room: cleanRoom(qs.get('room')) || cleanRoom(store.get(ROOM_KEY)) || randCode(4), pin: pinCode(), vote: false, force: null };
if (!castToken) store.set(ROOM_KEY, net.room);
const tokens = new Set(JSON.parse(store.get(TOK_KEY) || '[]'));
if (castToken) tokens.add(castToken);
const remotes = new Set(), audience = new Set();
let wordsTotal = 0;
const site = () => new URL('.', location.href).href;
const playURL = (extra = {}) => { const u = new URL(location.href); u.hash = ''; for (const k of ['cast', 'room', 'receiver', 'phone']) u.searchParams.delete(k); for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v); return u.href; };
// the live question shown on the audience phones comes from the world itself
const PROMPT = (() => { const sc = SCENES.find((s) => s.live); if (!sc) return ''; const t = document.createElement('template'); t.innerHTML = sc.html; return (t.content.querySelector('.mot-q')?.textContent || '').replace(/\s+/g, ' ').trim(); })();
const remoteURL = () => `${site()}remote.html#${net.room}-${net.pin}`;
const audienceURL = () => `${site()}mot.html#${net.room}`;
const prettyURL = (u) => u.replace(/^https?:\/\//, '').replace(/#.*$/, '');
function showPair() {
  drawQR($('qr-pair'), remoteURL()); drawQR($('qr-mini'), remoteURL());
  $('pair-url').textContent = prettyURL(`${site()}remote.html`);
  $('pair-code').textContent = `${net.room}-${net.pin}`;
  $('mini-txt').innerHTML = `Télécommande<br>${prettyURL(site())}remote.html<br>code ${net.room}-${net.pin}`;
}
function setPaired() {
  const n = remotes.size, st = $('pair-status');
  st.classList.toggle('ok', n > 0);
  st.querySelector('span').textContent = !net.ok ? 'connexion au service…' : n > 0 ? `téléphone connecté${n > 1 ? ` (${n})` : ''}, prêt` : 'en attente du téléphone…';
}
// what each click will reveal: the text of the elements that appear (or light up) at that step
const POINTS = SCENES.map((sc) => {
  const t = document.createElement('template'); t.innerHTML = sc.html;
  return Array.from({ length: sc.steps }, (_, n) => {
    const els = [...t.content.querySelectorAll(`[data-s="${n}"], [data-only="${n}"], [data-lit="${n}"]`)];
    // an element's own heading names it best ("Mon caractère", not "01Mon caractère2 astuces")
    const name = (e) => (e.querySelector('h3, h4, .tt, .w') || e).textContent;
    const txt = els.map((e) => name(e).replace(/\s+/g, ' ').trim()).filter((x) => x.length > 1);
    const best = (n > 0 ? txt.sort((a, b) => a.length - b.length).find((x) => x.length > 3) : txt.sort((a, b) => b.length - a.length)[0]) || '';
    const out = (sc.labels?.[n] && typeof sc.labels[n] === 'string' ? sc.labels[n] : '') || best;
    return out.length > 90 ? out.slice(0, 88) + '…' : out;
  });
});
const META = SCENES.map(({ id, part, title, notes, min, steps }, i) => ({ id, part, title, notes, min, steps, points: POINTS[i] }));

function voteOpen() { return net.force !== null ? net.force : started && SCENES[idx].id === 'mot'; }
function pushVote() {
  const open = voteOpen();
  if (open === net.vote) return;
  net.vote = open; voteBadge();
  for (const c of audience) c.open && c.send({ t: 'vote', open, q: PROMPT });
}
function onConn(c) {
  const m = c.metadata || {};
  c.on('open', () => {
    if (m.role === 'remote') {
      let tok = m.token;
      if (!tokens.has(tok)) {
        if (!(m.pin && m.pin === net.pin)) { c.send({ t: 'denied' }); setTimeout(() => c.close(), 400); return; }
        tok = randCode(16); tokens.add(tok); store.set(TOK_KEY, JSON.stringify([...tokens].slice(-12)));
        net.pin = pinCode(); showPair(); // single use: the code on screen dies once a phone pairs
        A.play('ui_open', 0.4); if (started) say('téléphone connecté'); $('pairmini').classList.remove('on');
      }
      remotes.add(c);
      c.send({ t: 'paired', token: tok, room: net.room });
      c.send({ t: 'meta', scenes: META, audience: audienceURL(), brand: PROJECT.brand, parts: PROJECT.parts, play: playURL() });
      setPaired(); sendState(c);
    } else if (m.role === 'audience') {
      audience.add(c); c._n = 0; c.send({ t: 'vote', open: voteOpen(), q: PROMPT });
    } else c.close();
  });
  c.on('data', (d) => {
    if (remotes.has(c)) return onCmd(d);
    if (!audience.has(c) || !d || d.t !== 'word') return;
    if (!voteOpen()) return c.send({ t: 'word', ok: false, why: 'closed' });
    if (c._n >= 3 || Date.now() - (c._t || 0) < 1500) return c.send({ t: 'word', ok: false, why: 'limit', left: Math.max(0, 3 - c._n) });
    const w = String(d.w || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 22);
    if (!w) return;
    c._n++; c._t = Date.now(); wordsTotal++;
    addWord(w); castSend({ t: 'word', w }); c.send({ t: 'word', ok: true, left: 3 - c._n });
    sync(); // live counter on the presenter's phone
  });
  c.on('close', () => { remotes.delete(c); audience.delete(c); setPaired(); });
}
async function connectNet() {
  showPair(); setPaired();
  try {
    await host({ room: net.room, onConn, onStatus: (st) => { net.ok = st === 'ready'; setPaired(); } });
    net.ok = true; document.body.classList.add('has-server'); setPaired();
  } catch (e) {
    if (e.type === 'unavailable-id' && !castToken) { net.room = randCode(4); store.set(ROOM_KEY, net.room); return connectNet(); }
    $('pair-status').querySelector('span').textContent = 'pas d’internet, utilisez la télécommande ou le clavier';
  }
}
function onCmd(m) {
  if (m.cmd === 'start') return begin();
  if (!started && ['next', 'prev'].includes(m.cmd)) return begin();
  if (m.cmd === 'next') input(next, true);
  else if (m.cmd === 'prev') input(prev, true);
  else if (m.cmd === 'go') { begin(); go(m.idx); }
  else if (m.cmd === 'black') toggleBlack();
  else if (m.cmd === 'spot') setSpot(!!m.on);
  else if (m.cmd === 'move') { spot.tx = Math.max(0.02, Math.min(0.98, spot.tx + m.dx)); spot.ty = Math.max(0.02, Math.min(0.98, spot.ty + m.dy * (16 / 9))); castState(); }
  else if (m.cmd === 'mute') { A.setMuted(!A.isMuted()); sync(); }
  else if (m.cmd === 'vote') { net.force = m.open === null || m.open === undefined ? null : !!m.open; pushVote(); sync(); }
  else if (m.cmd === 'quit') bye();
  else if (m.cmd === 'exitfs') { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); say('plein écran quitté'); }
  else if (m.cmd === 'ping') { pulse(0.6); A.play('ui_tick', 0.3); }
}

function voteBadge() {
  const el = cur?.el.querySelector('#mot-n'); if (!el) return;
  el.classList.toggle('closed', !net.vote);
  countWords();
}
// end of the show: the room goes dark, fullscreen ends, the phones are told
function bye() {
  black.classList.add('on'); A.play('membrane', 0.2, 0.7);
  for (const c of remotes) c.open && c.send({ t: 'bye' });
  setTimeout(() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); try { window.close(); } catch {} }, 900);
}

// ---- state out: phones + local speaker window ----
const bc = 'BroadcastChannel' in window ? new BroadcastChannel('grandir-pres') : null;
let syncT = 0;
function stateMsg() {
  return { t: 'state', scene: started ? SCENES[idx].id : null, idx, step, t0, started, armed, black: black.classList.contains('on'), full: isFull(), spot: spot.on, muted: A.isMuted(), audio: A.ready(), vote: { open: voteOpen(), forced: net.force !== null, total: wordsTotal } };
}
function sendState(c) { if (c.open) c.send(stateMsg()); }
function sync() {
  prog.style.transform = `scaleX(${started ? (before[idx] + step + 1) / total : 0})`;
  if (started) history.replaceState(null, '', location.pathname + location.search + `#${idx + 1}.${step + 1}`);
  pushVote();
  bc?.postMessage({ type: 'state', ...stateMsg(), scenes: META, parts: PROJECT.parts, budgets: PROJECT.budgets });
  clearTimeout(syncT); syncT = setTimeout(() => { for (const c of remotes) sendState(c); castState(); }, 30);
}
bc && (bc.onmessage = (e) => { const m = e.data; if (m.type === 'hello') sync(); if (m.type === 'cmd') onCmd(m); });

function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 1600); }

// ---------------- opening ----------------
// first click/key on the screen turns on sound + fullscreen (browsers require a gesture); it does not start the show
function arm() {
  if (armed) return;
  armed = true;
  A.unlock().catch(() => {});
  document.documentElement.requestFullscreen?.().catch(() => {});
  $('begin').classList.add('armed'); A.play('ui_open', 0.3); A.bell(4, 220, 0.1); // audible proof that sound is on
  setTimeout(sync, 400);
}
function begin() {
  if (started) return;
  started = true; t0 = Date.now(); document.body.classList.add('started');
  A.unlock().catch(() => {});
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
  const i = m ? Math.min(SCENES.length - 1, +m[1] - 1) : 0;
  const s = m && m[2] ? Math.min(SCENES[i].steps - 1, +m[2] - 1) : 0;
  const b = $('begin');
  b.classList.add('dark'); // the pairing card dissolves first, the room sits in the dark a beat…
  setBg({ hue: [255, 122, 26], fx: 0.5, fy: 0.5, mode: 'drift', pull: 0, speed: 0.3, amt: 0.15 });
  setTimeout(() => b.classList.add('gone'), 700);
  setTimeout(() => { A.play('awaken', 0.5); pulse(1.6); render(i, s, 1); }, i === 0 && s === 0 ? 2300 : 900); // …then the light opens on the title
  sync();
}

// one physical press can fire twice on some remotes: debounce
function input(fn, remote = false) {
  const now = performance.now();
  if (now - lastIn < (remote ? 120 : 220)) return;
  lastIn = now;
  if (!started) { remote || armed ? begin() : arm(); return; }
  if (!armed && !remote) { arm(); return; } // started from the phone: the first local click only turns on sound + fullscreen
  if (black.classList.contains('on')) { toggleBlack(false); return; }
  fn();
}

let digits = '';
// fullscreen needs a gesture on THIS machine: every key / click that isn't already fullscreen asks for it
const isFull = () => onTV || !!(document.fullscreenElement || matchMedia('(display-mode: fullscreen)').matches || (innerWidth >= screen.width - 1 && innerHeight >= screen.height - 1));
function ensureFull() { if (!isFull()) document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); }
document.addEventListener('fullscreenchange', () => sync());
addEventListener('resize', () => { clearTimeout(isFull.t); isFull.t = setTimeout(sync, 250); }); // F11 / kiosk changes the window, not the Fullscreen API
addEventListener('keydown', (e) => {
  const k = e.key;
  if (menuOpen()) { if (k === 'Escape' || k === 'q' || k === 'Q') toggleMenu(false); return; }
  if (!['f', 'F', 'Escape', 'q', 'Q'].includes(k)) ensureFull();
  A.unlock().catch(() => {});
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N'].includes(k)) { e.preventDefault(); input(next); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); input(prev); }
  else if (['b', 'B', '.', 'w', 'W'].includes(k)) { e.preventDefault(); started ? toggleBlack() : input(next); }
  else if (k === 'Escape') { e.preventDefault(); toggleMenu(); }
  else if (k === 'q' || k === 'Q') { toggleMenu(); }
  else if (k === 'F5') { e.preventDefault(); input(next); }
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  else if (k === 'm' || k === 'M') { A.setMuted(!A.isMuted()); say(A.isMuted() ? 'son coupé' : 'son actif'); sync(); }
  else if (k === 's' || k === 'S') { window.open('speaker.html', 'grandir-speaker', 'width=1200,height=760'); }
  else if (k === 'r' || k === 'R') { showPair(); $('pairmini').classList.toggle('on'); }
  else if (k === 'Home') { e.preventDefault(); started && go(0); }
  else if (k === 'End') { e.preventDefault(); started && go(SCENES.length - 1); }
  else if (/^\d$/.test(k)) { digits += k; say(`aller à ${digits}`); clearTimeout(input.d); input.d = setTimeout(() => (digits = ''), 2500); }
  else if ((k === 'g' || k === 'G') && digits) { go(+digits - 1); digits = ''; }
});
// on a touch screen (the deck running on a phone / tablet): tap the left third to go back
const touchUI = matchMedia('(pointer: coarse)').matches;
addEventListener('mousedown', (e) => {
  if (e.target.closest('#esc')) return;
  if (menuOpen()) return toggleMenu(false);
  A.unlock().catch(() => {}); ensureFull();
  if (e.button === 2) return input(prev);
  if (e.button === 0) input(touchUI && e.clientX < innerWidth * 0.33 ? prev : next);
});
addEventListener('pointerdown', () => A.unlock().catch(() => {}), { capture: true });
let tx0 = 0;
addEventListener('touchstart', (e) => { tx0 = e.touches[0].clientX; }, { passive: true });
addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 60) { e.preventDefault(); input(dx < 0 ? next : prev); } }, { passive: false });
if (qs.get('phone') || (touchUI && Math.min(screen.width, screen.height) < 600)) {
  document.body.classList.add('phone-mode');
  const orient = () => document.body.classList.toggle('portrait', innerHeight > innerWidth);
  addEventListener('resize', orient); orient();
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) screen.orientation?.lock?.('landscape').catch(() => {}); });
}
addEventListener('contextmenu', (e) => e.preventDefault());
let wheelLock = 0;
addEventListener('wheel', (e) => { const now = performance.now(); if (now - wheelLock < 700 || Math.abs(e.deltaY) < 8) return; wheelLock = now; input(e.deltaY > 0 ? next : prev); }, { passive: true });

// ---------------- presenter menu: invisible until asked for ----------------
const escEl = $('esc');
const menuOpen = () => escEl.classList.contains('on');
function toggleMenu(force) {
  const on = typeof force === 'boolean' ? force : !menuOpen();
  escEl.classList.toggle('on', on);
  if (on) {
    $('esc-full').textContent = isFull() ? 'Sortir du plein écran' : 'Plein écran';
    $('esc-cast').style.display = 'PresentationRequest' in window && !isReceiver ? '' : 'none';
    $('esc-cast').textContent = castConn ? 'Arrêter la diffusion sur la TV' : 'Diffuser sur une TV / Chromecast…';
  }
}
escEl.addEventListener('click', (e) => {
  const a = e.target.closest('button')?.dataset.a; if (!a) return;
  if (a === 'full') isFull() ? document.exitFullscreen().catch(() => {}) : ensureFull();
  if (a === 'cast') castToTV();
  if (a === 'black') started ? toggleBlack() : null;
  if (a === 'end') bye();
  toggleMenu(false);
});
// hot corner: rest the mouse in the top-right corner for a second
let cornerT = 0;
addEventListener('mousemove', (e) => {
  const inCorner = e.clientX > innerWidth - 40 && e.clientY < 40;
  if (inCorner && !cornerT) cornerT = setTimeout(() => toggleMenu(true), 900);
  if (!inCorner) { clearTimeout(cornerT); cornerT = 0; }
});

// ---------------- desktop Chrome → TV / Chromecast ----------------
// The laptop opens a mirror of the deck on the TV (Presentation API) and keeps driving it: the TV shows
// what the laptop shows, the laptop becomes the presenter's preview. Phones stay paired to the laptop.
const isReceiver = qs.get('receiver') === '1';
let castConn = null;
function castSend(m) { if (castConn && castConn.state === 'connected') castConn.send(JSON.stringify(m)); }
function castState() { castSend({ t: 'state', idx, step, started, black: black.classList.contains('on'), spot: spot.on, sx: spot.tx, sy: spot.ty, muted: A.isMuted() }); }
async function castToTV() {
  if (castConn) { castConn.terminate(); return; }
  try {
    const req = new PresentationRequest([playURL({ receiver: '1' })]);
    castConn = await req.start();
    const done = () => { castConn = null; A.setMuted(false); say('diffusion arrêtée'); };
    castConn.onconnect = () => { castState(); for (const [, w] of words) for (let i = 0; i < w.n; i++) castSend({ t: 'word', w: w.text }); A.setMuted(true); say('diffusion sur la TV, le son sort sur la TV'); };
    castConn.onterminate = done; castConn.onclose = done;
  } catch (e) { if (e.name !== 'NotAllowedError') say('aucun écran trouvé'); }
}
if (isReceiver) {
  document.body.classList.add('receiver');
  const mirror = (m) => {
    if (m.t === 'word') return addWord(m.w);
    if (m.t !== 'state') return;
    if (m.started && !started) { started = true; t0 = Date.now(); document.body.classList.add('started'); }
    if (m.started && (!cur || m.idx !== idx || m.step !== step)) render(m.idx, m.step, m.idx > idx || (m.idx === idx && m.step > step) ? 1 : -1);
    black.classList.toggle('on', !!m.black);
    if (m.spot !== spot.on) setSpot(m.spot);
    spot.tx = m.sx; spot.ty = m.sy;
  };
  const hook = (c) => { c.onmessage = (e) => { try { mirror(JSON.parse(e.data)); } catch {} }; };
  navigator.presentation?.receiver?.connectionList.then((l) => { l.connections.forEach(hook); l.onconnectionavailable = (ev) => hook(ev.connection); });
}

A.unlock().catch(() => {}); // stays suspended until the first gesture on this screen (arm)
// ---------------- Chromecast receiver (receiver.html, launched from the phone) ----------------
// The phone sends { room, token } over the cast channel: the TV hosts that room and trusts that phone.
// If the message never arrives, the TV simply shows its own pairing QR after a few seconds.
function castReceiver() {
  document.body.classList.add('tv');
  let got = false;
  const take = (d) => {
    try {
      const m = typeof d === 'string' ? JSON.parse(d) : d;
      if (!m || !m.room || got) return;
      got = true; net.room = cleanRoom(m.room);
      if (m.token) tokens.add(m.token);
      connectNet();
    } catch { /* not ours */ }
  };
  try {
    const ctx = cast.framework.CastReceiverContext.getInstance();
    const o = new cast.framework.CastReceiverOptions();
    o.disableIdleTimeout = true; // a talk can sit on one slide for a long time
    o.customNamespaces = Object.fromEntries(CAST_NS.map((n) => [n, cast.framework.system.MessageType.JSON]));
    for (const ns of CAST_NS) ctx.addCustomMessageListener(ns, (e) => take(e.data));
    ctx.start(o);
  } catch (e) { console.warn('[cast]', e); }
  setTimeout(() => { if (!got) { got = true; connectNet(); } }, 7000);
}
if (onTV) castReceiver();
else if (!isReceiver) connectNet();
setBg({ hue: [255, 122, 26], fx: 0.5, fy: 0.42, mode: 'drift', pull: 0.4, speed: 0.4 });
sync();
