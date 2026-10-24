// UNISSON session, a phone: one instrument of the room. It gets its part (rhythm, bass, harmonies or melody),
// waits for its cue with the countdown, then plays with one gesture. Its own sound comes out of the phone at
// once (real sampled marimba and hand percussion); the big screen brings the part in on the sound system.
import { phone, randCode, cleanRoom } from './net.js?v=202610241830';
import { BEAT, BAR, SIXTEENTH, ROLE, STAGES, stageIndex, lyricAt, noteAt, roleOf, reports, NOTE } from './session.js?v=202610241830';
import { Kit } from './studio.js?v=202610241830';

const $ = (id) => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const T = {
  fr: { joinT: 'Ce soir, la salle fait le morceau', joinS: 'Ton téléphone devient un instrument. Monte le son.', enter: 'Entrer dans l’orchestre', codeGo: 'OK', you: 'Tu joues', wait: 'Attends ton tour · regarde l’écran', go: 'À toi !', charge: 'Secoue ! Charge le drop', sing: 'Chante !', bravo: 'Bravo', made: 'Tu as fait ce morceau avec toute la salle', listen: 'Écouter notre morceau', share: 'Partager', making: 'Le morceau arrive…', lost: 'Réseau faible : continue de jouer' },
  en: { joinT: 'Tonight, the room makes the track', joinS: 'Your phone becomes an instrument. Turn the sound up.', enter: 'Join the orchestra', codeGo: 'OK', you: 'You play', wait: 'Wait for your turn · watch the screen', go: 'Your turn!', charge: 'Shake! Charge the drop', sing: 'Sing!', bravo: 'Well played', made: 'You made this track with the whole room', listen: 'Listen to our track', share: 'Share', making: 'The track is coming…', lost: 'Weak network: keep playing' },
}[lang];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
document.documentElement.lang = lang;

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const id = store.get('us-id') || randCode(10); store.set('us-id', id);
const role = roleOf(id), R = ROLE[role];
let room = cleanRoom(new URLSearchParams(location.search).get('r'));
if (room) $('codeRow').style.display = 'none';
$('codeGo').onclick = () => { const r = cleanRoom($('codeIn').value); if (r.length === 4) { room = r; $('codeRow').style.display = 'none'; } };
document.documentElement.style.setProperty('--h', R.hue);

let link = null, kit = null, c = null, S = { st: 'accueil', t0: 0, since: 0, call: null, p: {}, charge: 0, clip: null }, heardAt = 0;
const now = () => (link ? link.now() : Date.now());
const reporter = () => reports(id, S.p?.[role]);

$('enter').onclick = async () => {
  if (!room) return;
  try { DeviceMotionEvent?.requestPermission?.().catch(() => {}); } catch {}
  try { DeviceOrientationEvent?.requestPermission?.().catch(() => {}); } catch {}
  try { c = new (window.AudioContext || window.webkitAudioContext)(); c.resume(); const out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination); kit = new Kit(c, out, 'audio/'); kit.load(role === 'm' ? ['mar'] : ['perc']); } catch {}
  document.body.classList.add('in');
  $('who').textContent = T.you; $('name').textContent = R[lang]; $('do').textContent = lang === 'fr' ? R.doFr : R.doEn;
  awake();
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  link = await phone({ room, onMessage: (m) => { if (m.t === 's' && m.sc === 'session') { S = m; heardAt = Date.now(); } } });
  const hello = () => link.post({ t: 'h', id, ro: role }); hello(); setInterval(hello, 5000);
  await link.sync(6);
};

// ---------------------------------------------------------------- what this phone does now
function mode() {
  if (S.st === 'fin') return 'fin';
  const st = STAGES[stageIndex(S.st)] || STAGES[0], t = now();
  if (S.call && S.call.at > t && S.call.at - t <= 4 * BEAT) { const nx = STAGES[stageIndex(S.call.id)]; if (nx && nx.on.includes(role) && !st.on.includes(role)) return 'count'; if (nx?.id === 'drop') return 'count'; }
  if (st.id === 'montee') return 'charge';
  if (st.id === 'sansvoix') return 'sing';
  return st.on.includes(role) ? 'play' : 'wait';
}
const sinceStart = () => now() - (S.since || 0);

// ---------------------------------------------------------------- gestures
let hold = false, tilt = 0, open = 0, sentOpen = -1, taps = 0, shakes = 0, hitAt = 0;
const ripples = [], floaters = [];
function play(x, y) {
  const m = mode(), t = c ? c.currentTime + 0.004 : 0;
  ripples.push({ x, y, t: performance.now() }); hitAt = performance.now();
  if (m === 'charge') { shakes++; return; }
  if (m !== 'play' && m !== 'sing') return;
  if (role === 'r') {
    const pos = ((Math.round((now() - S.t0) / SIXTEENTH) % 4) + 4) % 4; // the hand drum follows where the tap falls in the beat
    kit?.perc(pos === 0 ? 'conga' : pos === 2 ? 'quinto' : 'shaker', t, 0.85); taps++;
    try { navigator.vibrate?.(8); } catch {}
  } else if (role === 'm') {
    const s = Math.round((now() - S.t0) / SIXTEENTH), n = noteAt(s);
    kit?.mar(n, t, 0.85, 0.35); floaters.push({ txt: NOTE[n % 12], x, y, t: performance.now(), m: n });
    if (reporter()) link?.post({ t: 'k', id, ro: role, s });
  }
}
addEventListener('pointerdown', (e) => {
  if (!document.body.classList.contains('in') || e.target.closest('button, input')) return;
  if (role === 'b' || role === 'h') { hold = true; if (role === 'b' && reporter()) link?.post({ t: 'b', id, ro: role, on: 1 }); try { navigator.vibrate?.(20); } catch {} }
  play(e.clientX, e.clientY);
});
const release = () => { if (!hold) return; hold = false; if (role === 'b' && reporter()) link?.post({ t: 'b', id, ro: role, on: 0 }); };
addEventListener('pointerup', release); addEventListener('pointercancel', release);
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
addEventListener('deviceorientation', (e) => { if (e.beta != null) tilt = Math.max(0, Math.min(1, (e.beta - 15) / 60)); });
// a shake: a sharp peak of acceleration (a shaker for the rhythm, the charge before the drop)
let peak = 0, swung = 0;
addEventListener('devicemotion', (e) => {
  const a = e.acceleration, mag = a && a.x != null ? Math.hypot(a.x, a.y, a.z) : 0;
  if (mag > 13) { peak = Math.max(peak, mag); return; }
  if (peak > 13 && performance.now() - swung > 140) { swung = performance.now(); const m = mode(); if (m === 'charge') shakes++; else if (role === 'r' && m === 'play') play(innerWidth / 2, innerHeight / 2); }
  peak = 0;
});
// the reports, a few times a second at most, and only from this phone's share of the room
setInterval(() => {
  if (!link) return;
  const rep = reporter();
  if (taps) { if (rep) link.post({ t: 'r', id, ro: role, n: taps }); taps = 0; }
  if (shakes) { if (rep) link.post({ t: 'c', id, ro: role, n: shakes }); shakes = 0; }
  if (role === 'h') { const v = Math.round((hold ? 0.55 + 0.45 * tilt : 0) * 4) / 4; open = v; if (v !== sentOpen && rep) { link.post({ t: 'o', id, ro: role, v }); sentOpen = v; } }
  if (role === 'b' && hold && rep && Math.random() < 0.1) link.post({ t: 'b', id, ro: role, on: 1 }); // a held bass, now and then, in case a message was lost
}, 300);

// ---------------------------------------------------------------- the light
const cv = $('glow'), g = cv.getContext('2d');
let W = 0, H = 0;
function fit() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
let shown = '';
function frame() {
  requestAnimationFrame(frame);
  if (!document.body.classList.contains('in')) return;
  const t = now(), m = mode(), e = t - S.t0, b = e / BEAT, f = b - Math.floor(b), hue = R.hue;
  const on = m === 'play' || m === 'sing', pulse = on ? Math.pow(1 - f, 3) : 0, hit = Math.max(0, 1 - (performance.now() - hitAt) / 500);
  let k = (on ? 0.22 : 0.07) + 0.25 * pulse + 0.4 * hit + (hold && on ? 0.35 + 0.15 * pulse : 0);
  if (m === 'count') k = 0.15 + 0.5 * Math.pow(1 - f, 2);
  if (m === 'charge') k = 0.15 + 0.6 * (S.charge || 0) + 0.3 * hit;
  if (m === 'fin') k = 0.3 + 0.1 * Math.sin(t / 900);
  const bg = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.hypot(W, H) * 0.7);
  bg.addColorStop(0, `hsl(${hue} 85% ${4 + 46 * Math.min(1, k)}%)`); bg.addColorStop(1, `hsl(${hue} 70% ${2 + 12 * Math.min(1, k)}%)`);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (role === 'h' && on) { const lvl = H * (1 - open); const cg = g.createLinearGradient(0, H, 0, lvl); cg.addColorStop(0, `hsla(${hue},90%,70%,0.55)`); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = cg; g.fillRect(0, lvl, W, H - lvl); }
  const tp = performance.now();
  for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], a = (tp - r.t) / 700; if (a > 1) { ripples.splice(i, 1); continue; } g.strokeStyle = `hsla(${hue},90%,85%,${(1 - a) * 0.9})`; g.lineWidth = 2 + 8 * (1 - a); g.beginPath(); g.arc(r.x, r.y, 20 + a * Math.max(W, H) * 0.45, 0, 7); g.stroke(); }
  for (let i = floaters.length - 1; i >= 0; i--) { const n = floaters[i], a = (tp - n.t) / 1400; if (a > 1) { floaters.splice(i, 1); continue; } g.fillStyle = `hsla(${hue},90%,88%,${1 - a})`; g.font = `300 ${Math.round(38 + (n.m - 64) * 1.2)}px Cormorant Garamond, serif`; g.textAlign = 'center'; g.fillText(n.txt, n.x, n.y - a * 160); }
  // words on the phone
  const num = m === 'count' ? String(Math.ceil((S.call.at - t) / BEAT)) : '';
  let state = m === 'wait' ? T.wait : m === 'play' ? T.go : m === 'charge' ? T.charge : m === 'sing' ? T.sing : m === 'fin' ? '' : '';
  if (heardAt && Date.now() - heardAt > 9000) state = T.lost;
  const key = m + num + state + S.clip;
  if (key !== shown) {
    shown = key; document.body.className = `phone player in ${m === 'play' || m === 'sing' ? 'playing' : ''} ${m === 'charge' ? 'charge' : ''} ${m === 'fin' ? 'fin' : ''}`;
    $('num').textContent = num; $('state').textContent = state;
    if (m === 'fin') { $('name').textContent = T.bravo; $('do').textContent = T.made; $('clip').classList.add('ready'); $('play').textContent = S.clip ? T.listen : T.making; }
  }
  $('bar').style.setProperty('--c', S.charge || 0);
  const lyText = m === 'sing' ? lyricAt(72 + sinceStart() / BAR).line : ''; // this stage plays song bars 72 to 80
  if ($('lyr').textContent !== lyText) $('lyr').textContent = lyText;
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- the track the room made
$('play').onclick = () => { if (!S.clip) return; const a = $('audio'); if (a.src !== S.clip) a.src = S.clip; a.paused ? a.play() : a.pause(); };
$('share').onclick = async () => { if (!S.clip) return; try { await navigator.share({ title: 'UNISSON', text: T.joinT, url: S.clip }); } catch {} };

let wl = null;
async function awake() { try { if ('wakeLock' in navigator && (!wl || wl.released)) wl = await navigator.wakeLock.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && link) awake(); });
window.__player = { get mode() { return mode(); }, role, id, get S() { return S; } };
