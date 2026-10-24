// UNISSON phone: one gesture, an instant answer under the finger, and a screen that is one light of the room.
// It sends a summary of its taps every quarter second (never one message per tap), keeps its clock on the
// screen's, and plays every cue on the dated instant. If the network drops, the light keeps the score going.
import { phone, randCode, cleanRoom } from './net.js?v=202610241300';
import { light, seatOf, hsl, BEAT, STEP, PADS, PLAYABLE, DROP_IN, ZH, score, bellsFor, NOTE_FR, NOTE_EN } from './show.js?v=202610241300';
import { Synth } from './music.js?v=202610241300';

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const T = {
  fr: { joinT: 'Ce soir, c’est vous l’orchestre', joinS: 'Ton téléphone devient une lumière et un instrument, avec toute la salle.', codeGo: 'Entrer', where: 'Où es-tu dans la salle ?', zg: 'À gauche', zc: 'Au centre', zd: 'À droite',
    safe: 'Lumières douces, jamais de flash rapide. Garde ton téléphone allumé.',
    lobby: 'Tu es dans l’orchestre. Attends le signal…', eveil: 'Joue : chaque touche est une note', vague: 'Joue avec la vague', drop: 'Joue ! Toute la salle avec toi', jam: 'C’est toi qui joues. Écoute la salle',
    chant: 'Touche quand l’anneau se ferme', count: 'Ça commence…', bwait: 'Attends ta note', bready: 'Prêt…', bnow: 'Maintenant !', brest: 'Écoute la salle chanter',
    sg: 'Tu joues : le rythme', sc: 'Tu joues : les basses', sd: 'Tu joues : la mélodie', pg: ['Boum', 'Clap', 'Caisse', 'Tss'], pc: ['Grave', 'Quinte', 'Accord', 'Aigu'], pd: ['1', '2', '3', '4', '5'], coeur: 'Pose ton doigt sur l’écran, et garde-le', fin: 'Merci. Tu as joué avec toute la salle.', lost: 'Réseau faible : ta lumière continue' },
  en: { joinT: 'Tonight, you are the orchestra', joinS: 'Your phone becomes a light and an instrument, with the whole room.', codeGo: 'Join', where: 'Where are you in the room?', zg: 'On the left', zc: 'In the middle', zd: 'On the right',
    safe: 'Soft lights, never fast flashes. Keep your phone awake.',
    lobby: 'You are in the orchestra. Wait for the signal…', eveil: 'Play: every touch is a note', vague: 'Play with the wave', drop: 'Play! The whole room with you', jam: 'You are playing. Listen to the room',
    chant: 'Tap when the ring closes', count: 'Here it comes…', bwait: 'Wait for your note', bready: 'Ready…', bnow: 'Now!', brest: 'Listen to the room sing',
    sg: 'You play: the rhythm', sc: 'You play: the bass', sd: 'You play: the melody', pg: ['Boom', 'Clap', 'Snare', 'Tss'], pc: ['Low', 'Fifth', 'Chord', 'High'], pd: ['1', '2', '3', '4', '5'], coeur: 'Put your finger on the screen, and hold it', fin: 'Thank you. You played with the whole room.', lost: 'Weak network: your light keeps going' },
};
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const t = (k) => T[lang][k];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
document.documentElement.lang = lang;

const params = new URLSearchParams(location.search);
let room = cleanRoom(params.get('r'));
const id = store.get('us-id') || randCode(10); store.set('us-id', id);
let zone = params.get('z'), seat = null, link = null;
let scene = 'lobby', t0 = Date.now(), heardAt = 0, taps = 0, holding = false, snd = 'both', synth = null;
if (room) $('codeRow').style.display = 'none'; else $('zones').style.display = 'none';
$('codeGo').onclick = () => { const r = cleanRoom($('codeIn').value); if (r.length === 4) { room = r; $('codeRow').style.display = 'none'; $('zones').style.display = ''; } };
for (const b of document.querySelectorAll('[data-z]')) b.onclick = () => start(b.dataset.z);
if (room && zone) $('zones').querySelector(`[data-z="${zone}"]`)?.classList.add('on');

async function start(z) {
  zone = z; seat = seatOf(id, zone);
  try { synth = new Synth(() => (link ? link.now() : Date.now()), true); synth.c.resume(); } catch {} // unlocked by this very tap
  buildPads();
  document.body.classList.add('in');
  awake();
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  link = await phone({ room, onMessage });
  link.post({ t: 'h', id, z: zone });
  await link.sync(6);
  setInterval(() => link.post({ t: 'h', id, z: zone }), 5000);
  setInterval(flush, 250);
}
function onMessage(m) {
  if (m.t !== 's') return;
  heardAt = Date.now();
  if (m.snd) snd = m.snd;
  if (seat) songSetup(m);
  if (m.sc !== scene || m.t0 !== t0) { scene = m.sc; t0 = m.t0; hintFor(); }
  document.body.classList.toggle('chant', scene === 'chant');
  $('sect').textContent = t(scene === 'chant' ? 'chant' : 's' + zone);
}
function flush() {
  if (holding && scene === 'coeur') taps += 1; // a held finger counts as presence on each beat
  if (!taps || !link) return;
  link.post({ t: 'b', id, z: zone, n: Math.min(taps, 12) }); taps = 0;
}
let shown = '';
function hintFor() { const k = Date.now() - heardAt > 9000 && heardAt ? 'lost' : scene; if (k === shown) return; shown = k; const h = $('hint'); h.classList.remove('on'); void h.offsetWidth; h.textContent = t(k) || ''; h.classList.add('on'); }
setInterval(() => { hintFor(); $('dot').className = 'dot ' + (heardAt && Date.now() - heardAt < 9000 ? 'ok' : 'off'); }, 1000);

// ---------------------------------------------------------------- a song: this phone is one or two bells
let sc0 = null, mine = new Set(), done = new Set(), bz = -1;
function songSetup(m) {
  if (!m.song) { sc0 = null; return; }
  if (!sc0 || sc0.id !== m.song || m.t0 !== t0) { sc0 = score(m.song); done = new Set(); bz = -1; }
  const n = (m.zc || {})[zone] || 1;
  if (n !== bz) { bz = n; mine = bellsFor(sc0, zone, n, seat.r); const names = lang === 'fr' ? NOTE_FR : NOTE_EN; $('bell').querySelector('.names').innerHTML = [...mine].map((p) => `<span>${names[p % 12]}</span>`).join(''); }
}
const myNotes = () => (sc0 ? sc0.notes.filter((n) => mine.has(n.m)) : []);
function ringMine(e) {
  if (!sc0) return false;
  const now = link ? link.now() : Date.now(), el = now - t0;
  let best = null; for (const n of myNotes()) { if (done.has(n.i)) continue; const d = el - n.at; if (d > -420 && d < 260 && (!best || Math.abs(d) < Math.abs(el - best.at))) best = n; }
  if (!best) return false;
  done.add(best.i);
  if (synth && snd !== 'pa') synth.bell(440 * Math.pow(2, (best.m - 69) / 12), synth.at(Math.max(now + 5, t0 + best.at)), best.len, 0.55);
  link?.post({ t: 'm', id, k: best.i });
  hitAt = performance.now();
  return true;
}
let hitAt = 0;
function bellFrame(g, W, H, now) {
  const el = now - t0, hue = ZH[zone], cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.24;
  const sinceHit = (performance.now() - hitAt) / 900, glow = Math.max(0, 1 - sinceHit);
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.7);
  bg.addColorStop(0, `hsl(${hue} 80% ${8 + 40 * glow}%)`); bg.addColorStop(1, `hsl(${hue} 60% ${3 + 10 * glow}%)`);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // the next note of mine: a ring closing in on the bell, landing exactly on time
  const next = myNotes().find((n) => !done.has(n.i) && n.at - el > -260);
  let cue = '';
  if (next) {
    const dt = next.at - el;
    if (dt < 1600) { const k = Math.max(0, dt / 1600); g.strokeStyle = `hsla(${hue},95%,80%,${0.9 - k * 0.5})`; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R * (1 + k * 1.6), 0, 7); g.stroke(); }
    cue = dt < 220 ? 'now' : dt < 1600 ? 'ready' : 'wait';
  } else cue = el < 0 ? 'wait' : 'rest';
  g.fillStyle = `hsla(${hue},90%,${55 + 30 * glow}%,${0.25 + 0.6 * glow})`; g.beginPath(); g.arc(cx, cy, R * (1 + glow * 0.12), 0, 7); g.fill();
  g.strokeStyle = `hsla(${hue},90%,80%,0.7)`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  const c = $('bell').querySelector('.cue'), txt = el < 0 ? t('count') : t('b' + cue); if (c.textContent !== txt) { c.textContent = txt; c.className = 'cue ' + cue; }
}

// ---------------------------------------------------------------- the pads: this phone's part of the orchestra
function buildPads() {
  const wrap = $('pads'); wrap.className = 'pads z-' + zone;
  const labels = t('p' + zone), hue = ZH[zone];
  wrap.innerHTML = PADS[zone].map((_, i) => `<button class="pad" data-i="${i}" style="--h:${hue + (i - 1.5) * 8}"><span>${labels[i]}</span></button>`).join('');
  $('sect').textContent = t('s' + zone);
  for (const b of wrap.children) b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); hit(+b.dataset.i, b, e); });
}
function hit(i, el, e) {
  const now = link ? link.now() : Date.now();
  const s = Math.ceil((now + 25 - t0) / STEP), ms = t0 + s * STEP; // the next sixteenth on the room's clock
  if (synth && snd !== 'pa') synth.pad(zone, i, ms, scene, t0, 0.8);
  link?.post({ t: 'n', id, z: zone, p: i, s });
  taps++;
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  try { navigator.vibrate?.(10); } catch {}
}
const playing = () => PLAYABLE.has(scene) && !(scene === 'drop' && (link ? link.now() : Date.now()) - t0 < DROP_IN);
setInterval(() => document.body.classList.toggle('play', !!seat && playing()), 120);

// ---------------------------------------------------------------- the finger
const ripples = [];
addEventListener('pointerdown', (e) => {
  if (seat && scene === 'chant') { if (!e.target.closest('button, input')) ringMine(e); return; }
  if (!seat || e.target.closest('button, input') || playing()) return;
  taps++; holding = true;
  ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  try { navigator.vibrate?.(12); } catch {} // Android only; iPhone has no vibration on the web
});
addEventListener('pointerup', () => (holding = false)); addEventListener('pointercancel', () => (holding = false));
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

// ---------------------------------------------------------------- keep the screen on
let wl = null;
async function awake() { try { if ('wakeLock' in navigator && (!wl || wl.released)) wl = await navigator.wakeLock.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && seat) awake(); });

// ---------------------------------------------------------------- the light
const cv = $('glow'), g = cv.getContext('2d');
let W = 0, H = 0;
function fit() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
function frame() {
  const now = link ? link.now() : Date.now();
  if (seat && scene === 'chant' && sc0) { bellFrame(g, W, H, now); }
  else if (seat) {
    const c = light(scene, now, t0, seat);
    const touchBoost = ripples.length ? 0.15 : 0;
    const k = Math.min(1, c.a + touchBoost);
    // a soft field of light rather than a flat flash: brighter in the middle, like a lantern
    const bgc = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.65);
    bgc.addColorStop(0, hsl(c, Math.min(1, k * 1.15))); bgc.addColorStop(1, hsl(c, k * 0.55));
    g.fillStyle = bgc; g.fillRect(0, 0, W, H);
    const tp = performance.now();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = (tp - r.t) / 700; if (age > 1) { ripples.splice(i, 1); continue; }
      g.strokeStyle = `hsla(${c.h},90%,85%,${(1 - age) * 0.9})`; g.lineWidth = 3 + 10 * (1 - age);
      g.beginPath(); g.arc(r.x, r.y, 20 + age * Math.max(W, H) * 0.5, 0, 7); g.stroke();
      const gr = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, 90); gr.addColorStop(0, `hsla(${c.h},90%,90%,${(1 - age) * 0.8})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(r.x - 90, r.y - 90, 180, 180);
    }
    const num = $('num'); const big = c.big ?? ''; if (num.textContent !== big) { num.textContent = big; num.classList.remove('pop'); void num.offsetWidth; if (big) num.classList.add('pop'); }
  } else {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__unisson = { get scene() { return scene; }, get offset() { return link ? link.now() - Date.now() : 0; }, get rtt() { return link?.rtt; }, start };
