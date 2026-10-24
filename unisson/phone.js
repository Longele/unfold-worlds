// UNISSON phone: one gesture, an instant answer under the finger, and a screen that is one light of the room.
// It sends a summary of its taps every quarter second (never one message per tap), keeps its clock on the
// screen's, and plays every cue on the dated instant. If the network drops, the light keeps the score going.
import { phone, randCode, cleanRoom } from './net.js?v=202610241030';
import { light, seatOf, hsl, BEAT } from './show.js?v=202610241030';

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const T = {
  fr: { joinT: 'Ce soir, c’est vous l’orchestre', joinS: 'Ton téléphone devient une lumière et un instrument, avec toute la salle.', codeGo: 'Entrer', where: 'Où es-tu dans la salle ?', zg: 'À gauche', zc: 'Au centre', zd: 'À droite',
    safe: 'Lumières douces, jamais de flash rapide. Garde ton téléphone allumé.',
    lobby: 'Tu es dans l’orchestre. Attends le signal…', eveil: 'Touche ton écran : allume ton étoile', vague: 'Lève ton téléphone, tape en rythme', drop: 'Tape ! Tape ! Tape !', coeur: 'Pose ton doigt sur l’écran, et garde-le', fin: 'Merci. Tu as joué avec toute la salle.', lost: 'Réseau faible : ta lumière continue' },
  en: { joinT: 'Tonight, you are the orchestra', joinS: 'Your phone becomes a light and an instrument, with the whole room.', codeGo: 'Join', where: 'Where are you in the room?', zg: 'On the left', zc: 'In the middle', zd: 'On the right',
    safe: 'Soft lights, never fast flashes. Keep your phone awake.',
    lobby: 'You are in the orchestra. Wait for the signal…', eveil: 'Touch your screen: light up your star', vague: 'Raise your phone, tap in rhythm', drop: 'Tap! Tap! Tap!', coeur: 'Put your finger on the screen, and hold it', fin: 'Thank you. You played with the whole room.', lost: 'Weak network: your light keeps going' },
};
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const t = (k) => T[lang][k];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
document.documentElement.lang = lang;

const params = new URLSearchParams(location.search);
let room = cleanRoom(params.get('r'));
const id = store.get('us-id') || randCode(10); store.set('us-id', id);
let zone = params.get('z'), seat = null, link = null;
let scene = 'lobby', t0 = Date.now(), heardAt = 0, taps = 0, holding = false;
if (room) $('codeRow').style.display = 'none'; else $('zones').style.display = 'none';
$('codeGo').onclick = () => { const r = cleanRoom($('codeIn').value); if (r.length === 4) { room = r; $('codeRow').style.display = 'none'; $('zones').style.display = ''; } };
for (const b of document.querySelectorAll('[data-z]')) b.onclick = () => start(b.dataset.z);
if (room && zone) $('zones').querySelector(`[data-z="${zone}"]`)?.classList.add('on');

async function start(z) {
  zone = z; seat = seatOf(id, zone);
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
  if (m.sc !== scene || m.t0 !== t0) { scene = m.sc; t0 = m.t0; hintFor(); }
}
function flush() {
  if (holding && scene === 'coeur') taps += 1; // a held finger counts as presence on each beat
  if (!taps || !link) return;
  link.post({ t: 'b', id, z: zone, n: Math.min(taps, 12) }); taps = 0;
}
let shown = '';
function hintFor() { const k = Date.now() - heardAt > 9000 && heardAt ? 'lost' : scene; if (k === shown) return; shown = k; const h = $('hint'); h.classList.remove('on'); void h.offsetWidth; h.textContent = t(k) || ''; h.classList.add('on'); }
setInterval(() => { hintFor(); $('dot').className = 'dot ' + (heardAt && Date.now() - heardAt < 9000 ? 'ok' : 'off'); }, 1000);

// ---------------------------------------------------------------- the finger
const ripples = [];
addEventListener('pointerdown', (e) => {
  if (!seat || e.target.closest('button, input')) return;
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
  if (seat) {
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
