// UNISSON phone: one gesture, an instant answer under the finger, and a screen that is one light of the room.
// It sends a summary of its taps every quarter second (never one message per tap), keeps its clock on the
// screen's, and plays every cue on the dated instant. If the network drops, the light keeps the score going.
import { phone, randCode, cleanRoom } from './net.js?v=202610241630';
import { light, seatOf, hsl, BEAT, STEP, PADS, PLAYABLE, DROP_IN, ZH, score, bellsFor, partOf, freeNote, NOTE_FR, NOTE_EN } from './show.js?v=202610241630';
import { Synth } from './music.js?v=202610241630';
import { MOMENTS, momentLight, DRAW, countLeft, countBig, battleBig, teamOf, TEAM_H } from './moments.js?v=202610241630';

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const T = {
  fr: { joinT: 'Ce soir, c’est vous l’orchestre', joinS: 'Ton téléphone devient une lumière et un instrument, avec toute la salle.', codeGo: 'Entrer', where: 'Où es-tu dans la salle ?', zg: 'À gauche', zc: 'Au centre', zd: 'À droite',
    safe: 'Lumières douces, jamais de flash rapide. Garde ton téléphone allumé.',
    lobby: 'Tu es dans l’orchestre. Attends le signal…', eveil: 'Joue : chaque touche est une note', vague: 'Joue avec la vague', drop: 'Joue ! Toute la salle avec toi', jam: 'C’est toi qui joues. Écoute la salle',
    chant: 'Secoue comme une clochette', count: 'Ça commence…', bwait: 'Attends ta note', bready: 'Prêt…', bnow: 'Sonne !', brest: 'Écoute la salle chanter', blibre: 'Libre ! Secoue quand tu veux', bsolo: 'À toi ! Ton rang joue seul', blisten: 'Écoute, un autre rang joue seul', bend: 'Bravo ! Regarde l’écran', libre: 'Libre',
    sg: 'Tu joues : le rythme', sc: 'Tu joues : les basses', sd: 'Tu joues : la mélodie', pg: ['Boum', 'Clap', 'Caisse', 'Tss'], pc: ['Grave', 'Quinte', 'Accord', 'Aigu'], pd: ['1', '2', '3', '4', '5'], coeur: 'Pose ton doigt sur l’écran, et garde-le', fin: 'Merci. Tu as joué avec toute la salle.', lost: 'Réseau faible : ta lumière continue',
    groupe: 'Ta lumière bat avec le groupe', briquet: 'Lève ta flamme et balance-toi', tirage: 'Tirage au sort…', twin: 'C’est toi ! Montre ce code :', tlose: 'Pas cette fois…',
    compte: 'Le compte à rebours', cny: 'Bonne année !', cgo: 'Maintenant !', bataille: 'Secoue ! Fais gagner ton équipe', tL: 'Équipe gauche', tR: 'Équipe droite', bwin: 'Victoire !', blose: 'Bien joué !',
    keep: 'Mon souvenir', tapS: 'Tape sur chaque temps du morceau. Toute la salle suit ton tempo.', cardPlayed: (n) => (n ? `J’ai joué ${n} note${n > 1 ? 's' : ''}` : 'J’étais dans l’orchestre'), cardWith: (n) => `avec ${n} téléphone${n > 1 ? 's' : ''}`, cardRoom: (a, b) => `la salle : ${a} sur ${b}`, cardWin: { L: 'La gauche a gagné la bataille', R: 'La droite a gagné la bataille' } },
  en: { joinT: 'Tonight, you are the orchestra', joinS: 'Your phone becomes a light and an instrument, with the whole room.', codeGo: 'Join', where: 'Where are you in the room?', zg: 'On the left', zc: 'In the middle', zd: 'On the right',
    safe: 'Soft lights, never fast flashes. Keep your phone awake.',
    lobby: 'You are in the orchestra. Wait for the signal…', eveil: 'Play: every touch is a note', vague: 'Play with the wave', drop: 'Play! The whole room with you', jam: 'You are playing. Listen to the room',
    chant: 'Swing it like a bell', count: 'Here it comes…', bwait: 'Wait for your note', bready: 'Ready…', bnow: 'Ring!', brest: 'Listen to the room sing', blibre: 'Free! Swing whenever you like', bsolo: 'Your turn! Your section plays alone', blisten: 'Listen, another section plays alone', bend: 'Well played! Look at the screen', libre: 'Free',
    sg: 'You play: the rhythm', sc: 'You play: the bass', sd: 'You play: the melody', pg: ['Boom', 'Clap', 'Snare', 'Tss'], pc: ['Low', 'Fifth', 'Chord', 'High'], pd: ['1', '2', '3', '4', '5'], coeur: 'Put your finger on the screen, and hold it', fin: 'Thank you. You played with the whole room.', lost: 'Weak network: your light keeps going',
    groupe: 'Your light beats with the band', briquet: 'Raise your flame and sway', tirage: 'The draw…', twin: 'It’s you! Show this code:', tlose: 'Not this time…',
    compte: 'The countdown', cny: 'Happy New Year!', cgo: 'Now!', bataille: 'Shake! Make your team win', tL: 'Left team', tR: 'Right team', bwin: 'Victory!', blose: 'Well played!',
    keep: 'My keepsake', tapS: 'Tap on every beat of the song. The whole room follows your tempo.', cardPlayed: (n) => (n ? `I played ${n} note${n > 1 ? 's' : ''}` : 'I was in the orchestra'), cardWith: (n) => `with ${n} phone${n > 1 ? 's' : ''}`, cardRoom: (a, b) => `the room: ${a} of ${b}`, cardWin: { L: 'The left won the battle', R: 'The right won the battle' } },
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
  try { DeviceMotionEvent?.requestPermission?.().catch(() => {}); } catch {} // iPhone asks once, inside this tap
  try { DeviceOrientationEvent?.requestPermission?.().catch(() => {}); } catch {}
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
  xs = m.x || {}; roomN = m.n || roomN;
  if (m.sc !== scene || m.t0 !== t0) { scene = m.sc; t0 = m.t0; hintFor(); }
  document.body.classList.toggle('chant', scene === 'chant'); document.body.classList.toggle('moment', MOMENTS.has(scene)); document.body.classList.toggle('fin', scene === 'fin');
  $('sect').textContent = scene === 'chant' ? t('chant') : scene === 'bataille' && seat ? t('t' + teamOf(seat)) : MOMENTS.has(scene) || scene === 'fin' ? '' : t('s' + zone);
}
function flush() {
  if (holding && scene === 'coeur') taps += 1; // a held finger counts as presence on each beat
  if (!taps || !link) return;
  link.post({ t: 'b', id, z: zone, n: Math.min(taps, 12) }); taps = 0;
}
let shown = '';
let xs = {}, roomN = 0;
// in a moment the words follow its outcome: the winner, the score, the new year
function momentKey() {
  const now = link ? link.now() : Date.now();
  if (scene === 'tirage') return now - t0 >= DRAW.end ? (xs.win === id ? 'twin' : 'tlose') : 'tirage';
  if (scene === 'bataille') return xs.win ? (seat && teamOf(seat) === xs.win ? 'bwin' : 'blose') : 'bataille';
  if (scene === 'compte') return countLeft(now, xs) <= 0 ? 'c' + xs.msg : 'compte';
  return '';
}
function hintFor() {
  const k = Date.now() - heardAt > 9000 && heardAt ? 'lost' : momentKey() || scene; if (k === shown) return; shown = k;
  const h = $('hint'); h.classList.remove('on'); void h.offsetWidth; h.textContent = k === 'twin' ? `${t('twin')} ${xs.code}` : t(k) || ''; h.classList.toggle('winner', k === 'twin'); h.classList.add('on');
}
setInterval(() => { hintFor(); $('dot').className = 'dot ' + (heardAt && Date.now() - heardAt < 9000 ? 'ok' : 'off'); }, 1000);

// ---------------------------------------------------------------- a song: this phone is one or two bells
let sc0 = null, mine = new Set(), solo = new Set(), done = new Set(), bz = -1, zs = null, shownSet = '';
function songSetup(m) {
  if (!m.song) { sc0 = null; return; }
  if (!sc0 || sc0.id !== m.song || m.t0 !== t0) { sc0 = score(m.song); done = new Set(); bz = -1; shownSet = ''; }
  zs = m.zs || null;
  const n = (m.zc || {})[zone] || 1;
  if (n !== bz) { bz = n; mine = bellsFor(sc0, zone, n, seat.r); solo = bellsFor(sc0, zone, n, seat.r, true); shownSet = ''; }
}
const owns = (n) => { const p = partOf(n, zs); return p === 'all' ? mine.has(n.m) : p === zone && solo.has(n.m); };
const myNotes = () => (sc0 ? sc0.notes.filter(owns) : []);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let hitAt = 0, hitV = 0, lastFree = 0;
// a swing or a tap: v is how hard (0 to 1)
function ringMine(v = 0.7) {
  if (!sc0) return false;
  const now = link ? link.now() : Date.now(), el = now - t0;
  if (el > 0 && el < sc0.end && partOf({ part: sc0.partAt(el) }, zs) === 'libre') { // free: any swing rings a note of the chord
    if (performance.now() - lastFree < 110) return false; lastFree = performance.now();
    const m = freeNote(sc0, el), s = Math.ceil((el + 30) / (sc0.beat / 2));
    if (synth && snd !== 'pa') synth.bell(hz(m), synth.at(now + 5), sc0.beat * 1.5, 0.5 + 0.45 * v);
    link?.post({ t: 'f', id, m, s, v: +v.toFixed(2) }); mineCount++;
    hitAt = performance.now(); hitV = v; return true;
  }
  let best = null; for (const n of myNotes()) { if (done.has(n.i)) continue; const d = el - n.at; if (d > -320 && d < 280 && (!best || Math.abs(d) < Math.abs(el - best.at))) best = n; }
  if (!best) return false;
  done.add(best.i);
  // your bell sounds in your hand at once; only a very early swing waits for its beat
  if (synth && snd !== 'pa') synth.bell(hz(best.m), synth.at(best.at - el > 150 ? t0 + best.at : now + 5), best.len, Math.min(1, 0.5 + 0.5 * v));
  link?.post({ t: 'm', id, k: best.i, v: +v.toFixed(2) }); mineCount++;
  hitAt = performance.now(); hitV = v;
  return true;
}
// the swing: a sharp peak of acceleration, like the stroke of a handbell; its height is the strength
let peak = 0, swungAt = 0;
addEventListener('devicemotion', (ev) => {
  if (!seat || (scene !== 'chant' && scene !== 'bataille')) return;
  const a = ev.acceleration, gq = ev.accelerationIncludingGravity;
  const mag = a && a.x != null ? Math.hypot(a.x, a.y, a.z) : gq && gq.x != null ? Math.abs(Math.hypot(gq.x, gq.y, gq.z) - 9.81) : 0;
  const TH = 12;
  if (mag > TH) { peak = Math.max(peak, mag); return; }
  if (peak > TH && performance.now() - swungAt > 230) { swungAt = performance.now(); if (scene === 'bataille') { taps++; ripples.push({ x: W / 2, y: H / 2, t: performance.now() }); } else ringMine(Math.min(1, (peak - TH) / 22)); }
  peak = 0;
});
function bellFrame(g, W, H, now) {
  const el = now - t0, hue = ZH[zone], cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.24;
  const sinceHit = (performance.now() - hitAt) / 900, glow = Math.max(0, 1 - sinceHit) * (0.55 + 0.45 * hitV);
  const part = el > 0 && el < sc0.end ? partOf({ part: sc0.partAt(el) }, zs) : 'all', soon = partOf({ part: sc0.partAt(el + 2500) }, zs);
  const set = part === 'libre' ? 'libre' : part === zone || (soon === zone && part !== zone) ? 'solo' : 'all';
  if (set !== shownSet) { shownSet = set; const names = lang === 'fr' ? NOTE_FR : NOTE_EN; const nm = $('bell').querySelector('.names'); nm.dataset.n = set === 'libre' ? 1 : (set === 'solo' ? solo : mine).size; nm.innerHTML = set === 'libre' ? `<span>${t('libre')}</span>` : [...(set === 'solo' ? solo : mine)].map((p) => `<span data-p="${p}">${names[p % 12]}</span>`).join(''); }
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
    const lit = dt < 1600 ? String(next.m) : ''; for (const sp of $('bell').querySelectorAll('.names span[data-p]')) sp.classList.toggle('dim', !!lit && sp.dataset.p !== lit);
  } else cue = el < 0 ? 'wait' : 'rest';
  if (el > sc0.end) cue = 'end';
  else if (part === 'libre') cue = 'libre';
  else if (cue === 'wait' || cue === 'rest') { if (soon === zone && part !== zone) cue = 'solo'; else if (part.length === 1 && part !== zone) cue = 'listen'; }
  if (part === 'libre') { const b = (el / sc0.beat) % 1; g.fillStyle = `hsla(${hue},90%,60%,${0.12 * Math.pow(1 - b, 3)})`; g.fillRect(0, 0, W, H); }
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
  if (seat && scene === 'chant') { if (!e.target.closest('button, input')) ringMine(0.7); return; }
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
    if (scene === 'briquet') { flameFrame(now); requestAnimationFrame(frame); return; }
    const c = MOMENTS.has(scene) ? momentLight(scene, now, t0, xs, seat, xs.win === id) : light(scene, now, t0, seat);
    hintFor();
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
    const num = $('num'); const big = scene === 'compte' ? countBig(now, xs) : scene === 'bataille' ? battleBig(now, t0) : c.big ?? ''; if (num.textContent !== big) { num.textContent = big; num.classList.remove('pop'); void num.offsetWidth; if (big) num.classList.add('pop'); }
  } else {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// ---------------------------------------------------------------- the lighter: a flame that stays upright as the phone tilts
let tilt = 0, lean = 0, leanV = 0, sentTilt = 99, sentAt = 0, mineCount = 0;
addEventListener('deviceorientation', (e) => { if (e.gamma != null) tilt = Math.max(-60, Math.min(60, e.gamma)); });
function flameFrame(now) {
  const tp = performance.now();
  leanV += (-tilt * 0.8 - lean) * 0.06; leanV *= 0.86; lean += leanV; // a flame lags behind the hand, then settles upright
  if (link && tp - sentAt > 2000 && Math.abs(tilt - sentTilt) > 4) { sentAt = tp; sentTilt = tilt; link.post({ t: 'l', id, a: Math.round(tilt) }); }
  const bg = g.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, Math.hypot(W, H) * 0.7);
  const fl = 0.85 + 0.1 * Math.sin(now / 83) + 0.05 * Math.sin(now / 31);
  bg.addColorStop(0, `rgba(120,55,12,${0.9 * fl})`); bg.addColorStop(0.5, 'rgba(40,16,4,1)'); bg.addColorStop(1, '#050200'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H * 0.72); g.rotate(lean * Math.PI / 180);
  const h = H * 0.36 * (0.94 + 0.06 * Math.sin(now / 70) + 0.03 * Math.sin(now / 23)), w = W * 0.2;
  const sway = Math.sin(now / 160) * w * 0.08;
  for (const [k, c] of [[1, 'rgba(255,90,20,0.55)'], [0.78, 'rgba(255,150,50,0.75)'], [0.55, 'rgba(255,210,110,0.9)'], [0.32, 'rgba(255,250,230,1)']]) {
    const gr = g.createRadialGradient(0, -h * k * 0.3, 0, 0, -h * k * 0.3, h * k); gr.addColorStop(0, c); gr.addColorStop(1, c.replace(/[\d.]+\)$/, '0.15)'));
    g.fillStyle = gr; g.beginPath(); g.moveTo(sway * k, -h * k); g.bezierCurveTo(w * k, -h * k * 0.45, w * k * 0.8, 0, 0, 0); g.bezierCurveTo(-w * k * 0.8, 0, -w * k, -h * k * 0.45, sway * k, -h * k); g.fill();
  }
  g.fillStyle = 'rgba(70,120,255,0.55)'; g.beginPath(); g.ellipse(0, -h * 0.04, w * 0.14, h * 0.05, 0, 0, 7); g.fill(); // the blue root of a real flame
  g.restore();
  hintFor();
}

// ---------------------------------------------------------------- the keepsake: a card of tonight to save or share
$('keep').onclick = async () => {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const k = c.getContext('2d'), hue = ZH[zone] ?? 38;
  const bg = k.createRadialGradient(540, 420, 0, 540, 420, 1100); bg.addColorStop(0, `hsl(${hue} 70% 22%)`); bg.addColorStop(1, '#050403'); k.fillStyle = bg; k.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 260; i++) { const x = Math.random() * 1080, y = 560 + Math.random() * 640, r = 1 + Math.random() * 3.5; k.fillStyle = `hsla(${[200, 38, 335][i % 3]},90%,70%,${0.2 + Math.random() * 0.6})`; k.beginPath(); k.arc(x, y, r, 0, 7); k.fill(); }
  k.textAlign = 'center'; k.fillStyle = '#f4efe6';
  k.font = '500 30px ui-monospace, monospace'; k.fillText('U N I S S O N', 540, 130);
  k.font = '300 104px Cormorant Garamond, Georgia, serif'; k.fillText(t('cardPlayed')(mineCount), 540, 330);
  k.font = 'italic 300 56px Cormorant Garamond, Georgia, serif'; k.fillStyle = `hsl(${hue} 80% 75%)`; if (roomN > 1) k.fillText(t('cardWith')(roomN), 540, 420);
  k.fillStyle = '#f4efe6'; k.font = '300 44px Cormorant Garamond, Georgia, serif';
  let y = 560; for (const s of (xs.log || []).filter((s) => s.id).slice(-5)) { k.fillText(`${s.title}`, 540, y); k.font = '400 26px ui-monospace, monospace'; k.fillStyle = 'rgba(244,239,230,.6)'; k.fillText(t('cardRoom')(s.got, s.of), 540, y + 42); k.font = '300 44px Cormorant Garamond, Georgia, serif'; k.fillStyle = '#f4efe6'; y += 120; }
  const b = (xs.log || []).filter((s) => s.battle).pop(); if (b) { k.font = 'italic 300 40px Cormorant Garamond, Georgia, serif'; k.fillStyle = `hsl(${TEAM_H[b.battle]} 85% 72%)`; k.fillText(t('cardWin')[b.battle], 540, y + 10); }
  k.fillStyle = 'rgba(244,239,230,.55)'; k.font = '400 26px ui-monospace, monospace';
  k.fillText(new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 540, 1250);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png')), file = new File([blob], 'unisson.png', { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'UNISSON' }); return; } } catch (err) { if (err?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'unisson.png'; a.click();
};

// ---------------------------------------------------------------- a musician's phone: tap the band's tempo (?role=tap)
if (params.get('role') === 'tap' && room) {
  $('join').style.display = 'none'; document.body.classList.add('tapping');
  phone({ room, onMessage: (m) => { if (m.t === 's' && m.x?.bpm) $('tapper').querySelector('.tbpm').textContent = `${Math.round(m.x.bpm)} BPM`; } }).then(async (l) => {
    link = l; await l.sync(6);
    $('tapBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); l.post({ t: 'tap', id, at: l.now() }); const b = $('tapBtn'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); });
  });
}

window.__unisson = { get scene() { return scene; }, get mine() { return mineCount; }, get offset() { return link ? link.now() - Date.now() : 0; }, get rtt() { return link?.rtt; }, start };
