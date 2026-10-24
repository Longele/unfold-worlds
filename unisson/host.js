// UNISSON big screen: the room as points of light, the QR code and the live count, the music on the venue
// sound system, and the control bar that fires each moment. A simulated crowd lets it be shown without a room.
import { screen, randCode, cleanRoom } from './net.js?v=202610241630';
import { light, seatOf, ZONES, BEAT, BAR, DROP_IN, PAL, STEP, PADS, ZH, score, bellsFor, partOf, freeNote } from './show.js?v=202610241630';
import { Music } from './music.js?v=202610241630';
import { MOMENTS, momentLight, DRAW, countLeft, countBig, BATTLE, teamOf, TEAM_H, battleBig, bandBeat } from './moments.js?v=202610241630';

const $ = (id) => document.getElementById(id);
const T = {
  fr: { phones: 'téléphones', kick: 'Sortez vos téléphones', lobbyT: 'Ce soir, c’est vous l’orchestre', code: 'Code', openS: 'L’écran de la salle. Branchez-le sur la sono, puis ouvrez la salle.', openB: 'Ouvrir la salle',
    cLobby: 'Accueil', cEveil: 'L’éveil', cVague: 'La vague', cDrop: 'Le drop', cJam: 'L’orchestre', cCoeur: 'Le cœur', cFin: 'Fin', sim: '+ 60 simulés', full: 'Plein écran',
    sSilent: 'Silent Night', sJoie: 'Ode à la joie', net: { on: 'Filet : oui', off: 'Filet : non' }, zgC: 'Les graves', zcC: 'Le milieu', zdC: 'Les aigus', pall: 'Tous ensemble', pg: 'Les graves, seuls !', pc: 'Le milieu, seul !', pd: 'Les aigus, seuls !', plibre: 'Libre ! Secouez tous', score: (a, b) => `La salle a joué ${a} notes sur ${b}`,
    zg: 'Le rythme', zc: 'Les basses', zd: 'La mélodie', player: 'joueur', players: 'joueurs', tJam: 'C’est vous qui jouez', snd: { both: 'Son : sono + téléphones', pa: 'Son : sono', tel: 'Son : téléphones' },
    tEveil: 'L’éveil', tVague: 'La vague', tDrop: '', tCoeur: 'Un seul cœur', tFin: 'Merci',
    cGroupe: 'Le groupe', cBriquet: 'Briquets', cTirage: 'Tirage', cMinuit: 'Minuit', c10: '10 s', cBataille: 'Bataille',
    tGroupe: '', tBriquet: 'Levez vos lumières', tTirage: 'Le tirage au sort', tBataille: 'Gauche contre droite', tCompte: '',
    winIs: { g: 'Le gagnant est à gauche', c: 'Le gagnant est au centre', d: 'Le gagnant est à droite' }, winCode: (c) => `Code gagnant : ${c}`,
    ny: 'Bonne année !', go: 'Maintenant !', left: (s) => `Minuit dans ${s}`, L: 'Gauche', R: 'Droite', winL: 'La gauche gagne !', winR: 'La droite gagne !',
    tonight: (s, n) => `Ce soir : ${s} chanson${s > 1 ? 's' : ''}, ${n} notes jouées par la salle`, nobody: 'Personne dans la salle pour l’instant' },
  en: { phones: 'phones', kick: 'Take out your phones', lobbyT: 'Tonight, you are the orchestra', code: 'Code', openS: 'The room screen. Plug it into the sound system, then open the room.', openB: 'Open the room',
    cLobby: 'Welcome', cEveil: 'Awakening', cVague: 'The wave', cDrop: 'The drop', cJam: 'The orchestra', cCoeur: 'The heart', cFin: 'End', sim: '+ 60 simulated', full: 'Full screen',
    sSilent: 'Silent Night', sJoie: 'Ode to Joy', net: { on: 'Safety net: on', off: 'Safety net: off' }, zgC: 'The low bells', zcC: 'The middle bells', zdC: 'The high bells', pall: 'Everyone together', pg: 'The low bells, alone!', pc: 'The middle, alone!', pd: 'The high bells, alone!', plibre: 'Free! Everyone swing', score: (a, b) => `The room played ${a} of ${b} notes`,
    zg: 'The rhythm', zc: 'The bass', zd: 'The melody', player: 'player', players: 'players', tJam: 'You are the band', snd: { both: 'Sound: PA + phones', pa: 'Sound: PA', tel: 'Sound: phones' },
    tEveil: 'Awakening', tVague: 'The wave', tDrop: '', tCoeur: 'One heart', tFin: 'Thank you',
    cGroupe: 'The band', cBriquet: 'Lighters', cTirage: 'Draw', cMinuit: 'Midnight', c10: '10 s', cBataille: 'Battle',
    tGroupe: '', tBriquet: 'Raise your lights', tTirage: 'The draw', tBataille: 'Left against right', tCompte: '',
    winIs: { g: 'The winner is on the left', c: 'The winner is in the middle', d: 'The winner is on the right' }, winCode: (c) => `Winning code: ${c}`,
    ny: 'Happy New Year!', go: 'Now!', left: (s) => `Midnight in ${s}`, L: 'Left', R: 'Right', winL: 'Left wins!', winR: 'Right wins!',
    tonight: (s, n) => `Tonight: ${s} song${s > 1 ? 's' : ''}, ${n} notes played by the room`, nobody: 'Nobody in the room yet' },
};
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const t = (k) => T[lang][k];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
document.documentElement.lang = lang;

const room = cleanRoom(new URLSearchParams(location.search).get('r')) || randCode(4);
const joinUrl = new URL(`./?r=${room}`, location.href).href;
$('code').textContent = room; $('url').textContent = joinUrl.replace(/^https?:\/\//, '');
if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(joinUrl); q.make(); $('qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }

// ---------------------------------------------------------------- the room
const phones = new Map(); // id -> { seat, last, flare, sim }
let scene = 'lobby', t0 = Date.now(), link = null, music = null, snd = 'both', song = null, net = true, zc = { g: 0, c: 0, d: 0 }, zs = null;
let xs = {}; // the state of the moment (tempo, winner, countdown, battle), sent to every phone
const band = { bpm: 0, a: 0 }, log = [], winners = new Set(), fight = { L: 0, R: 0 };
const played = { g: [], c: [], d: [] }; // who played lately, per section
function touch(id, z) {
  let p = phones.get(id);
  if (!p) { p = { seat: seatOf(id, ZONES.includes(z) ? z : 'c'), last: 0, flare: 0, born: performance.now() }; phones.set(id, p); }
  p.last = Date.now(); return p;
}
function onMessage(m) {
  if (!m || !m.id && m.t !== 'p') return;
  if (m.t === 'p') { link?.send({ t: 'q', k: m.k, h: Date.now() }); return; }
  if (m.t === 'tap') { tapAt(+m.at || Date.now()); return; } // a musician's phone taps the tempo
  const p = touch(m.id, m.z);
  if (m.t === 'f') { if (snd !== 'tel') music?.free(m.m | 0, m.s | 0, +m.v || 0.7); p.flare = Math.min(1, p.flare + 0.5 + 0.5 * (+m.v || 0.7)); played[p.seat.zone].push({ t: Date.now(), id: m.id }); freeHits++; return; }
  if (m.t === 'm') { if (snd !== 'tel') music?.ring(m.k | 0, +m.v || 0.7); p.flare = Math.min(1, p.flare + 0.7); played[p.seat.zone].push({ t: Date.now(), id: m.id }); rung.add(m.k | 0); return; }
  if (m.t === 'n') { if (snd !== 'tel') music?.note(p.seat.zone, m.p | 0, m.s | 0); else music?.crowd(1, live()); p.flare = Math.min(1, p.flare + 0.5); played[p.seat.zone].push({ t: Date.now(), id: m.id }); return; }
  if (m.t === 'l') { p.tiltT = Math.max(-60, Math.min(60, +m.a || 0)); return; }
  if (m.t === 'b' && m.n > 0) { p.flare = Math.min(1, p.flare + 0.35 + m.n * 0.1); music?.crowd(m.n, live()); if (scene === 'bataille') fight[teamOf(p.seat)] += Math.min(m.n, 12); }
}
const rung = new Set(); // notes of the song the room has rung
const zoneCounts = () => { const o = { g: 0, c: 0, d: 0 }, now = Date.now(); for (const p of phones.values()) if (p.sim || now - p.last < 13000) o[p.seat.zone]++; return o; };
const live = () => { let n = 0; const now = Date.now(); for (const p of phones.values()) if (p.sim || now - p.last < 13000) n++; return n; };

// a simulated crowd: taps like a real room would, more in the strong moments
function simulate(k = 60) {
  for (let i = 0; i < k; i++) { const id = 'sim-' + randCode(8), p = touch(id, ZONES[(Math.random() * 3) | 0]); p.sim = true; p.rate = 0.3 + Math.random(); }
}
setInterval(() => {
  const mood = { lobby: 0, eveil: 0.18, vague: 0.5, drop: 1.4, jam: 0.9, coeur: 0.3, fin: 0 }[scene] || 0;
  let total = 0;
  for (const p of phones.values()) if (p.sim && Math.random() < mood * p.rate * 0.25) { const n = 1 + ((Math.random() * 2) | 0); p.flare = Math.min(1, p.flare + 0.4); total += n; }
  if (total) music?.crowd(total, live());
  // simulated players play real notes too, on the next sixteenth
  if (['eveil', 'vague', 'drop', 'jam'].includes(scene)) for (const p of phones.values()) if (p.sim && Math.random() < mood * p.rate * 0.12) {
    const z = p.seat.zone, s = Math.ceil((Date.now() + 60 - t0) / STEP) + ((Math.random() * 2) | 0);
    music?.note(z, (Math.random() * PADS[z].length) | 0, s, 0.7); played[z].push({ t: Date.now(), id: p.seat.r });
  }
}, 250);

// ---------------------------------------------------------------- cues
function cue(sc, x = null) {
  xs = x || (sc === 'groupe' ? { ...band } : sc === 'fin' ? { log, n: live() } : {}); mtxt.key = '';
  if (sc === 'bataille') { fight.L = 0; fight.R = 0; }
  song = null; sc0 = null; for (const z of ZONES) document.querySelector(`.sects [data-z="${z}"] b`).textContent = t('z' + z);
  for (const b of document.querySelectorAll('[data-song]')) b.classList.remove('on');
  scene = sc; t0 = Date.now() + 700; // a little lead time so every phone has the cue before it starts
  music?.cue(sc, t0, xs);
  const msg = state();
  link?.send(msg); setTimeout(() => link?.send(msg), 300);
  document.body.dataset.scene = sc;
  for (const b of document.querySelectorAll('[data-cue]')) b.classList.toggle('on', b.dataset.cue === sc);
  const ttl = { eveil: 'tEveil', vague: 'tVague', jam: 'tJam', coeur: 'tCoeur', fin: 'tFin', briquet: 'tBriquet', tirage: 'tTirage', bataille: 'tBataille' }[sc];
  const el = $('title'); el.textContent = ttl ? t(ttl) : ''; el.classList.remove('show'); void el.offsetWidth; if (ttl) el.classList.add('show');
}
function state() { return { t: 's', sc: scene, t0, n: live(), snd, song, net, zc, zs, x: xs }; }
setInterval(() => { zc = zoneCounts(); link?.send(state()); }, 1500); // late joiners catch up
// the three sections at the foot of the screen, with how many are playing now
setInterval(() => {
  const now = Date.now();
  for (const z of ZONES) { played[z] = played[z].filter((x) => now - x.t < 3000); const who = new Set(played[z].map((x) => x.id)).size, el = document.querySelector(`.sects [data-z="${z}"]`); el.querySelector('i').textContent = `${who} ${t(who === 1 ? 'player' : 'players')}`; el.classList.toggle('hot', played[z].length > 4); }
}, 400);
const sndBtn = $('snd'), MODES = ['both', 'pa', 'tel'];
sndBtn.textContent = t('snd')[snd];
sndBtn.onclick = () => { snd = MODES[(MODES.indexOf(snd) + 1) % 3]; sndBtn.textContent = t('snd')[snd]; link?.send(state()); };
$('net').textContent = t('net').on;
$('net').onclick = () => { net = !net; $('net').textContent = t('net')[net ? 'on' : 'off']; if (music?.song) music.net = net; };
// a song: the room becomes a handbell choir
let sc0 = null;
function cueSong(id) {
  song = id; scene = 'chant'; t0 = Date.now() + 1500; zc = zoneCounts(); zs = { ...zc }; sc0 = score(id); rung.clear(); simRung.clear(); lyr.key = ''; lyr.part = ''; lyr.end = false; freeHits = 0;
  music?.cueSong(id, t0, net, zs);
  const msg = state(); link?.send(msg); setTimeout(() => link?.send(msg), 300);
  document.body.dataset.scene = 'chant';
  for (const b of document.querySelectorAll('[data-cue], [data-song]')) b.classList.toggle('on', b.dataset.song === id);
  const el = $('title'); el.textContent = sc0[lang]; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  for (const z of ZONES) document.querySelector(`.sects [data-z="${z}"] b`).textContent = t(z === 'g' ? 'zgC' : z === 'c' ? 'zcC' : 'zdC');
}
for (const b of document.querySelectorAll('[data-song]')) b.onclick = () => cueSong(b.dataset.song);
// simulated bell-ringers: most of them ring on time
const simRung = new Set();
setInterval(() => {
  if (scene !== 'chant' || !sc0) return;
  const e = Date.now() - t0;
  for (const n of sc0.notes) {
    if (simRung.has(n.i) || n.at - e > 200 || n.at - e < -100) continue;
    simRung.add(n.i);
    const part = partOf(n, zs);
    for (const p of phones.values()) if (p.sim && Math.random() < 0.55 && (part === 'all' || part === p.seat.zone) && bellsFor(sc0, p.seat.zone, zc[p.seat.zone], p.seat.r, part !== 'all').has(n.m)) { music?.ring(n.i, 0.4 + Math.random() * 0.6); rung.add(n.i); p.flare = Math.min(1, p.flare + 0.7); played[p.seat.zone].push({ t: Date.now(), id: p.seat.r }); }
  }
  // and in a free passage, simulated phones swing whenever they like
  if (partOf({ part: sc0.partAt(e) }, zs) === 'libre') for (const p of phones.values()) if (p.sim && Math.random() < 0.02) { music?.free(freeNote(sc0, e), Math.ceil((e + 40) / (sc0.beat / 2)), Math.random()); p.flare = 1; played[p.seat.zone].push({ t: Date.now(), id: p.seat.r }); freeHits++; }
}, 50);
let freeHits = 0;

// ---------------------------------------------------------------- the moments
// the band's tempo: tap on the beat (T key, the Tap button, or a musician's phone); a line through the taps gives
// the tempo and the instant of the downbeat, so the room's light lands on the band's beat, not on ours
let taps = [];
function tapAt(at) {
  if (taps.length && at - taps[taps.length - 1] > 2200) taps = [];
  taps.push(at); if (taps.length > 12) taps.shift();
  if (taps.length < 3) return;
  const n = taps.length, xs_ = taps.map((_, i) => i), mx = (n - 1) / 2, my = taps.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (i - mx) * (taps[i] - my); den += (i - mx) * (i - mx); }
  const per = num / den; if (per < 250 || per > 1500) return; void xs_;
  band.bpm = Math.round(60000 / per * 10) / 10; band.a = my - mx * per;
  $('tap').textContent = `Tap · ${Math.round(band.bpm)}`;
  if (scene === 'groupe') { xs = { ...band }; music && (music.mx = xs); link?.send(state()); }
}
$('tap').onclick = () => tapAt(Date.now());
// the live draw: never the same phone twice in a night, a real phone before a simulated one
function draw() {
  const now = Date.now(), pool = [...phones].filter(([id, p]) => (p.sim || now - p.last < 13000) && !winners.has(id));
  const real = pool.filter(([, p]) => !p.sim), from = real.length ? real : pool;
  if (!from.length) { const el = $('title'); el.textContent = t('nobody'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); return; }
  const [id, p] = from[(Math.random() * from.length) | 0]; winners.add(id);
  const code = (p.sim ? randCode(4) : id.slice(0, 4)).toUpperCase();
  cue('tirage', { win: id, code, z: p.seat.zone, b: Math.max(3, Math.min(12, Math.round(pool.length / 3))) });
}
$('draw').onclick = draw;
// the countdown: to the next midnight, or ten seconds from now (on a whole second)
$('midnight').onclick = () => { const d = new Date(); d.setHours(24, 0, 0, 0); cue('compte', { zero: d.getTime(), msg: 'ny' }); };
$('ten').onclick = () => cue('compte', { zero: Math.ceil((Date.now() + 10600) / 1000) * 1000, msg: 'go' });
// the battle: shakes per player, so the smaller side can still win
setInterval(() => {
  if (scene !== 'bataille' || xs.win) return;
  const e = Date.now() - t0, now = Date.now(); if (e < BATTLE.lead) return;
  for (const p of phones.values()) if (p.sim && Math.random() < 0.5) fight[teamOf(p.seat)] += 1 + ((Math.random() * (teamOf(p.seat) === 'L' ? 3 : 2.6)) | 0);
  const size = { L: 0, R: 0 }; for (const p of phones.values()) if (p.sim || now - p.last < 13000) size[teamOf(p.seat)]++;
  const a = fight.L / Math.max(1, size.L), b = fight.R / Math.max(1, size.R);
  xs.bv = a + b ? Math.round((b - a) / (a + b) * 100) / 100 : 0;
  if (e >= BATTLE.lead + BATTLE.len) { xs.win = a >= b ? 'L' : 'R'; log.push({ battle: xs.win }); music && (music.mx = xs); const el = $('title'); el.textContent = t(xs.win === 'L' ? 'winL' : 'winR'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  link?.send(state());
}, 400);
// what the screen says during a moment, under the title
const mtxt = { key: '' };
function momentText(now) {
  let a = '', b = '';
  if (scene === 'tirage' && now - t0 >= DRAW.end) { a = t('winIs')[xs.z] || ''; b = t('winCode')(xs.code); }
  if (scene === 'compte') { const l = countLeft(now, xs); if (l > 10000) { const s = Math.ceil(l / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60; a = xs.msg === 'ny' ? t('left')(`${hh ? hh + ':' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`) : ''; } else if (l <= 0) a = t(xs.msg); }
  if (scene === 'fin') { const songs = log.filter((s) => s.id), notes = songs.reduce((n, s) => n + s.got, 0); if (songs.length) a = t('tonight')(songs.length, notes); }
  const key = a + '|' + b; if (key === mtxt.key) return; mtxt.key = key;
  $('lyrics').querySelector('.now').innerHTML = a ? `<span class="lit">${a}</span>` : ''; $('lyrics').querySelector('.next').innerHTML = b;
}
setInterval(() => { $('n').textContent = live().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'); }, 400);
for (const b of document.querySelectorAll('[data-cue]')) b.onclick = () => cue(b.dataset.cue);
$('sim').onclick = () => simulate(60);
$('full').onclick = () => { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d); };
addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('bare');
  if (e.key === 't' || e.key === 'T') tapAt(Date.now());
  const k = { 1: 'lobby', 2: 'eveil', 3: 'vague', 4: 'drop', 5: 'jam', 6: 'coeur', 7: 'fin' }[e.key]; if (k) cue(k);
});
$('go').onclick = async () => {
  music = new Music(); await music.resume(); music.cue(scene, t0);
  document.body.classList.add('live');
  try { link = await screen({ room, onMessage }); } catch { $('n').textContent = '!'; }
  try { await navigator.wakeLock?.request('screen'); } catch {}
};
document.body.dataset.scene = 'lobby';

// ---------------------------------------------------------------- the picture of the room
const cv = $('room'), g = cv.getContext('2d');
let W = 0, H = 0;
function fit() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
const sparks = [];
// the big picture of each moment, so the screen is a show even before the room is full
// in a song, a phone glows while one of its bells is ringing
function bellLight(p, e) {
  if (!sc0) return { h: 0, s: 0, l: 0, a: 0 };
  if (!p.bells || p.bz !== zc[p.seat.zone] || p.bs !== sc0.id) { p.bz = zc[p.seat.zone]; p.bs = sc0.id; p.bells = bellsFor(sc0, p.seat.zone, zc[p.seat.zone], p.seat.r); p.solo = bellsFor(sc0, p.seat.zone, zc[p.seat.zone], p.seat.r, true); }
  let a = 0.06;
  for (const n of sc0.notes) { if (n.at > e) break; const part = partOf(n, zs), own = part === 'all' ? p.bells.has(n.m) : part === p.seat.zone && p.solo.has(n.m); const k = (e - n.at) / Math.min(1400, n.len + 500); if (k < 1 && own) a = Math.max(a, (rung.has(n.i) ? 1 : 0.2) * Math.pow(1 - k, 1.6)); }
  return { h: ZH[p.seat.zone], s: 85, l: 62, a };
}
// the song on the big screen: notes flowing to the line of now, the words to sing
const lyr = { key: '' };
function songArt(e) {
  if (!sc0) return;
  const lineX = W * 0.5, span = 4200, top = H * 0.13, hgt = H * 0.16, P = sc0.pitches;
  g.strokeStyle = 'rgba(255,240,220,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(lineX, top - 10); g.lineTo(lineX, top + hgt + 10); g.stroke();
  for (const n of sc0.notes) {
    const dt = n.at - e; if (dt > span) break; if (dt < -1500) continue;
    const x = lineX + (dt / span) * W * 0.46, y = top + hgt - (P.indexOf(n.m) / Math.max(1, P.length - 1)) * hgt, past = dt < 0, hit = rung.has(n.i);
    const part = partOf(n, zs), hue = part.length === 1 ? ZH[part] : ZH[n.z], free = part === 'libre';
    const k = past ? Math.max(0, 1 + dt / 1500) : 1, r = (5 + Math.min(16, n.len / 90)) * (past && hit ? 1 + (1 - k) * 2.5 : 1);
    if (hit || (free && past)) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, `hsla(${hue},90%,85%,${(free ? 0.4 : 0.95) * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill(); }
    else { g.strokeStyle = past ? `hsla(0,0%,60%,${0.35 * k})` : `hsla(${hue},80%,70%,${free ? 0.25 : 0.75})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
  }
  // the words, one line at a time; a held note keeps its word lit
  if (!sc0.lines) { sc0.lines = []; let cur = []; for (const n of sc0.notes) { cur.push(n); if (/[,.!]$/.test(n.w) && cur.length > 2) { sc0.lines.push(cur); cur = []; } } if (cur.length) sc0.lines.push(cur); }
  let li = sc0.lines.findIndex((l) => l[l.length - 1].at + l[l.length - 1].len > e); if (li < 0) li = sc0.lines.length - 1;
  const show = (l, lit) => l.filter((n) => n.w).map((n) => `<span class="${lit && n.at <= e ? 'lit' : ''}">${n.w.replace(/-$/, '')}</span>${n.w.endsWith('-') ? '' : ' '}`).join('');
  const key = li + ':' + sc0.notes.filter((n) => n.at <= e).length;
  // a new passage: the screen says who plays
  const part = partOf({ part: sc0.partAt(e + 600) }, zs);
  if (e > sc0.notes[0].at - 600 && e < sc0.end && part !== lyr.part) { lyr.part = part; const el = $('title'); el.textContent = t('p' + part); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  // the end: what the room played, section by section
  if (e > sc0.end + 600) {
    if (!lyr.end) {
      lyr.end = true; const own = sc0.notes.filter((n) => partOf(n, zs) !== 'libre'), got = own.filter((n) => rung.has(n.i)).length;
      const per = ZONES.map((z) => { const o = own.filter((n) => (partOf(n, zs) === 'all' ? n.z : partOf(n, zs)) === z); return o.length ? `<span style="color:hsl(${ZH[z]} 80% 70%);margin:0 .7em">${t('z' + z + 'C')} ${Math.round(100 * o.filter((n) => rung.has(n.i)).length / o.length)} %</span>` : ''; }).filter(Boolean).join('   ');
      log.push({ id: sc0.id, title: sc0[lang], got, of: own.length });
      $('lyrics').querySelector('.now').innerHTML = `<span class="lit">${t('score')(got, own.length)}</span>`; $('lyrics').querySelector('.next').innerHTML = per;
    }
    return;
  }
  if (lyr.key !== key) { lyr.key = key; $('lyrics').querySelector('.now').innerHTML = show(sc0.lines[li], true); $('lyrics').querySelector('.next').innerHTML = sc0.lines[li + 1] ? show(sc0.lines[li + 1], false) : ''; }
}
// a lighter's flame, leaning with the phone that holds it
function flame(x, y, s, lean, flick) {
  g.save(); g.translate(x, y); g.rotate(lean * Math.PI / 180);
  const h = s * (7 + 1.2 * flick), w = s * 2.2;
  const halo = g.createRadialGradient(0, -h * 0.4, 0, 0, -h * 0.4, h * 1.4); halo.addColorStop(0, 'rgba(255,170,70,0.22)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(0, -h * 0.4, h * 1.4, 0, 7); g.fill();
  for (const [k, c] of [[1, 'rgba(255,110,30,0.55)'], [0.68, 'rgba(255,190,80,0.8)'], [0.38, 'rgba(255,250,225,0.95)']]) {
    g.fillStyle = c; g.beginPath(); g.moveTo(0, -h * k); g.quadraticCurveTo(w * k, -h * k * 0.25, 0, 0); g.quadraticCurveTo(-w * k, -h * k * 0.25, 0, -h * k); g.fill();
  }
  g.restore();
}
function stageArt(now, e, E) {
  if (scene === 'chant') return songArt(e);
  momentText(now);
  if (scene === 'groupe' && xs.bpm) { // the band's beat, as a ring from the stage
    const b = bandBeat(now, xs), f = b - Math.floor(b), r = Math.min(W, H) * (0.1 + f * 0.5);
    g.strokeStyle = `hsla(38,90%,70%,${0.5 * (1 - f)})`; g.lineWidth = 3 + 6 * (1 - f); g.beginPath(); g.arc(W / 2, H * 0.3, r, 0, 7); g.stroke();
  }
  if (scene === 'tirage' && e >= DRAW.end) { // the winner, in a beam of light
    const p = phones.get(xs.win); if (p) {
      const x = p.seat.x * W, y = H * (0.36 + p.seat.y * 0.56), k = Math.min(1, (e - DRAW.end) / 800);
      const beam = g.createLinearGradient(x, 0, x, y); beam.addColorStop(0, 'rgba(255,220,140,0)'); beam.addColorStop(1, `rgba(255,220,140,${0.35 * k})`);
      g.fillStyle = beam; g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x + 30, 0); g.lineTo(x + 90, y); g.lineTo(x - 90, y); g.fill();
      for (let i = 0; i < 3; i++) { const ph = ((e / 1200) + i / 3) % 1; g.strokeStyle = `hsla(42,95%,70%,${(1 - ph) * 0.7 * k})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 20 + ph * 160, 0, 7); g.stroke(); }
    }
  }
  if (scene === 'compte' && countLeft(now, xs) <= 0 && countLeft(now, xs) > -25000 && Math.random() < 0.12) { // fireworks
    const x = W * (0.1 + Math.random() * 0.8), y = H * (0.1 + Math.random() * 0.4), h = Math.random() * 360;
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, v = 1.5 + Math.random() * 3.5; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, h }); }
  }
  if (scene === 'bataille' && e > 0) { // the rope between left and right
    const y = H * 0.31, w = W * 0.7, x0 = (W - w) / 2, mid = W / 2 + (xs.bv || 0) * w / 2;
    g.fillStyle = `hsla(${TEAM_H.L},85%,55%,0.55)`; g.fillRect(x0, y - 10, mid - x0, 20);
    g.fillStyle = `hsla(${TEAM_H.R},85%,55%,0.55)`; g.fillRect(mid, y - 10, x0 + w - mid, 20);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(mid, y, 16 + 4 * Math.sin(now / 120), 0, 7); g.fill();
    g.font = `300 ${Math.round(H * 0.045)}px Cormorant Garamond, serif`; g.textBaseline = 'middle';
    g.textAlign = 'right'; g.fillStyle = `hsl(${TEAM_H.L} 85% 70%)`; g.fillText(t('L'), x0 - 24, y);
    g.textAlign = 'left'; g.fillStyle = `hsl(${TEAM_H.R} 85% 70%)`; g.fillText(t('R'), x0 + w + 24, y);
  }
  const cx = W / 2, cy = H * 0.5, R = Math.min(W, H);
  if (scene === 'eveil') { // a constellation: the lit phones joined by faint lines
    const pts = []; for (const p of phones.values()) { const c = light(scene, now, t0, p.seat); if (c.a > 0.2) pts.push([p.seat.x * W, H * (0.36 + p.seat.y * 0.56)]); }
    g.strokeStyle = 'rgba(180,215,255,0.10)'; g.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < Math.min(pts.length, i + 4); j++) { const [a, b] = [pts[i], pts[j]]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < R * 0.22) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
  }
  if (scene === 'vague' && e > 0) { // the crest of the wave, sweeping the room
    const b = e / BEAT, bar = Math.floor(b / 4), ph = (b % 4) / 4, w = -0.15 + (bar % 2 ? 1 - ph : ph) * 1.3, x = w * W, hue = PAL[bar % PAL.length];
    const gr = g.createLinearGradient(x - W * 0.16, 0, x + W * 0.16, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, `hsla(${hue},90%,60%,${0.22 + 0.25 * E})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  if (scene === 'drop' && e > DROP_IN) { // rings on every beat, coloured by the bar, wider with the crowd's energy
    const db = (e - DROP_IN) / BEAT, bar = Math.floor(db / 4);
    for (let k = 0; k < 5; k++) {
      const age = (db % 1) + k, r = R * (0.08 + age * (0.16 + 0.1 * E)), a = Math.max(0, 0.5 - age * 0.11) * (0.6 + 0.4 * E);
      g.strokeStyle = `hsla(${PAL[(bar + k) % PAL.length]},90%,62%,${a})`; g.lineWidth = R * 0.012 * (1 + E); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    }
    const hit = Math.pow(1 - (db % 1), 3), core = g.createRadialGradient(cx, cy, 0, cx, cy, R * (0.18 + 0.1 * hit));
    core.addColorStop(0, `hsla(${PAL[bar % PAL.length]},90%,75%,${0.35 + 0.4 * hit})`); core.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = core; g.fillRect(0, 0, W, H);
  }
  if (scene === 'coeur' && e > 0) { // one heart for the room
    const c = light('coeur', now, t0, { zone: 'c', x: 0.5, y: 0.5, r: 0 }), r = R * (0.14 + 0.05 * c.a);
    const hg = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2); hg.addColorStop(0, `hsla(350,85%,60%,${0.15 + 0.6 * c.a})`); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(0, 0, W, H);
  }
}
function frame() {
  const now = Date.now(), e = now - t0;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  // the stage glow: warms with the crowd's energy
  const E = music ? music.energy : 0, sg = g.createRadialGradient(W / 2, H * 0.08, 0, W / 2, H * 0.08, H * 0.9);
  sg.addColorStop(0, `rgba(255,190,120,${0.06 + 0.18 * E})`); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const fresh = Date.now() - 13000, n = Math.max(1, live()), grow = Math.max(1, Math.min(4, 26 / Math.sqrt(n)));
  stageArt(now, e, E);
  for (const [id, p] of phones) {
    if (!p.sim && p.last < fresh) continue;
    const s = p.seat, depth = s.y, x = s.x * W, y = H * (0.36 + depth * 0.56), size = (2.2 + depth * 4.2) * Math.min(W, H) / 900 * grow;
    if (scene === 'briquet') { // a sea of lighters: each leans with its phone, the simulated ones sway together
      const target = p.sim ? 16 * Math.sin(now / 1500 + s.x * 2.2) : p.tiltT || 0; p.tilt = (p.tilt || 0) + (target - (p.tilt || 0)) * 0.04;
      flame(x, y, size * 0.9, p.tilt, Math.sin(now / 90 + s.r * 40) * 0.5 + Math.sin(now / 37 + s.r * 9) * 0.5); continue;
    }
    const c = scene === 'chant' ? bellLight(p, e) : MOMENTS.has(scene) ? momentLight(scene, now, t0, xs, s, id === xs.win) : light(scene, now, t0, s), age = Math.min(1, (performance.now() - p.born) / 900);
    const a = Math.min(1, (c.a + p.flare * 0.8) * age);
    if (p.flare > 0.6 && Math.random() < 0.08) sparks.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, life: 1, h: c.h });
    p.flare *= 0.92;
    const r = size * (3 + a * 5), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `hsla(${c.h},${c.s}%,${Math.min(92, c.l + 25)}%,${0.95 * a + 0.05})`); gr.addColorStop(0.25, `hsla(${c.h},${c.s}%,${c.l}%,${0.55 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.03; s.life -= 0.02; g.fillStyle = `hsla(${s.h},90%,75%,${Math.max(0, s.life)})`; g.beginPath(); g.arc(s.x, s.y, 1.6, 0, 7); g.fill(); }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  // the countdown, huge, in time with every phone
  let big = '';
  if (scene === 'drop' && e >= 0 && e < DROP_IN) { const k = Math.floor(e / BEAT); if (k < 3) big = String(3 - k); }
  if (scene === 'compte') big = countBig(now, xs);
  if (scene === 'bataille') big = battleBig(now, t0);
  const bg = $('big'); if (bg.textContent !== big) { bg.textContent = big; bg.classList.remove('pop'); void bg.offsetWidth; if (big) bg.classList.add('pop'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__unisson = { phones, cue, simulate, tapAt, draw, get xs() { return xs; }, log, get scene() { return scene; }, get music() { return music; }, room };
