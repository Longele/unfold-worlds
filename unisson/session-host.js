// UNISSON session, the big screen: the conductor. It plays the song on the venue sound system bar by bar, reads
// what each part of the room is doing, opens or closes that part's stem on the beat, calls each part in with a
// countdown, and shows the room as a live mix: four columns of phones, each glowing with its stem's real level.
import { screen, randCode, cleanRoom } from './net.js?v=202610241830';
import { SONG, BAR, BEAT, SIXTEENTH, ROLES, ROLE, STAGES, stageIndex, lyricAt, noteAt, REPORTERS, roleOf, NOTE } from './session.js?v=202610241830';
import { Studio } from './studio.js?v=202610241830';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const $ = (id) => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const T = {
  fr: { phones: 'téléphones', open: 'Ouvrir la salle', openS: 'Branchez cet écran sur la sono. Le son vient d’ici.', loading: 'Chargement du morceau', join: 'Sortez vos téléphones', lobbyT: 'Ce soir, la salle fait le morceau', code: 'Code',
    next: 'Suivant', start: 'Commencer', sim: '+ 60 simulés', full: 'Plein écran', again: 'Recommencer',
    st: { accueil: '', rythme: 'Le rythme, c’est vous', basse: 'La basse entre', harmonie: 'Les harmonies s’ouvrent', melodie: 'La mélodie : chaque toucher est une note', montee: 'Secouez tous ! Chargez le drop', drop: '', ecoute: 'Écoutez la salle', ensemble: 'Chantez avec nous', sansvoix: 'À vous ! Sans la voix', final: 'Tous ensemble', fin: 'Vous avez fait ce morceau' },
    finS: (n) => `${n} téléphones, un seul morceau. Retrouvez-le sur vos téléphones.`, drop: 'DROP' },
  en: { phones: 'phones', open: 'Open the room', openS: 'Plug this screen into the sound system. The sound comes from here.', loading: 'Loading the track', join: 'Take out your phones', lobbyT: 'Tonight, the room makes the track', code: 'Code',
    next: 'Next', start: 'Start', sim: '+ 60 simulated', full: 'Full screen', again: 'Start over',
    st: { accueil: '', rythme: 'The rhythm is you', basse: 'Here comes the bass', harmonie: 'The harmonies open', melodie: 'The melody: every touch is a note', montee: 'Everyone shake! Charge the drop', drop: '', ecoute: 'Listen to the room', ensemble: 'Sing with us', sansvoix: 'Your turn! No vocals', final: 'All together', fin: 'You made this track' },
    finS: (n) => `${n} phones, one track. Find it on your phones.`, drop: 'DROP' },
}[lang];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
document.documentElement.lang = lang;

const room = cleanRoom(new URLSearchParams(location.search).get('r')) || randCode(4);
const joinUrl = new URL(`./jouer.html?r=${room}`, location.href).href;
$('code').textContent = room; $('url').textContent = joinUrl.replace(/^https?:\/\//, '');
if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(joinUrl); q.make(); $('qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }

// ---------------------------------------------------------------- the room
const phones = new Map(); // id -> { role, last, sim, tap, hold, open, flare, x, y }
const fresh = (p) => p.sim || Date.now() - p.last < 13000;
function touch(id, role) {
  let p = phones.get(id);
  if (!p) { const r = ROLES.includes(role) ? role : roleOf(id); p = { role: r, last: 0, tap: 0, hold: false, open: 0, flare: 0, born: performance.now(), x: Math.random(), y: Math.random() }; phones.set(id, p); }
  p.last = Date.now(); return p;
}
const counts = () => { const o = { r: 0, b: 0, h: 0, m: 0 }; for (const p of phones.values()) if (fresh(p)) o[p.role]++; return o; };
const probs = (c) => Object.fromEntries(ROLES.map((r) => [r, Math.min(1, REPORTERS / Math.max(1, c[r]))]));
let cnt = { r: 0, b: 0, h: 0, m: 0 }, P = probs(cnt);
setInterval(() => { cnt = counts(); P = probs(cnt); $('n').textContent = Object.values(cnt).reduce((a, b) => a + b, 0).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'); }, 500);

let ready = false, studio = null, link = null, t0 = 0, si = 0, sb0 = 0, nextK = 0, switchAt = -1, forced = false, charge = 0, clip = null, stageAt = 0, call = null, ended = false;
const melodyHits = new Map(); // slot -> weight
function onMessage(m) {
  if (!m) return;
  if (m.t === 'p') { link?.send({ t: 'q', k: m.k, h: Date.now() }); return; }
  if (!m.id) return;
  const p = touch(m.id, m.ro), w = 1 / (P[p.role] || 1); // a report stands for the phones that do not report
  if (m.t === 'r') { p.tap = Date.now(); p.flare = Math.min(1, p.flare + 0.5); }
  else if (m.t === 'b') { p.hold = !!m.on; p.flare = p.hold ? 1 : p.flare; }
  else if (m.t === 'o') { p.open = Math.max(0, Math.min(1, +m.v || 0)); }
  else if (m.t === 'k') { p.tap = Date.now(); p.flare = 1; melodyTap(w); }
  else if (m.t === 'c') { p.flare = Math.min(1, p.flare + 0.3); charge = Math.min(1, charge + (Math.min(20, m.n | 0) * w) / (Math.max(4, live()) * 16)); }
}
const live = () => Object.values(cnt).reduce((a, b) => a + b, 0);

// the room's melody: each tap lands on the next free sixteenth, as the hidden note of that sixteenth
function melodyTap(w) {
  if (!studio || !STAGES[si].on.includes('m')) return;
  const s = Math.ceil((Date.now() + 60 - t0) / SIXTEENTH), had = melodyHits.get(s) || 0;
  melodyHits.set(s, had + w); if (melodyHits.size > 400) melodyHits.clear();
  if (had) return;
  studio.melody(s, t0 + s * SIXTEENTH, Math.min(1, 0.55 + 0.1 * w));
  notes.push({ m: noteAt(s), at: t0 + s * SIXTEENTH });
}

// ---------------------------------------------------------------- the conductor
// decided one bar ahead, so every phone gets its countdown before its part comes in
function decide(k) {
  if (k === switchAt) { si = Math.min(STAGES.length - 1, si + 1); sb0 = k; forced = false; switchAt = -1; stageAt = t0 + k * BAR; if (STAGES[si].id === 'drop') recordDrop(); if (STAGES[si].id === 'montee') charge = 0; sendState(); }
  const st = STAGES[si], off = k - sb0;
  let songBar;
  if (st.loop) songBar = st.loop[0] + (off % (st.loop[1] - st.loop[0]));
  else songBar = st.play[0] + off;
  if (st.play && songBar >= st.play[1]) songBar = null;
  if (switchAt < 0) {
    const n = off + 1, phrase = n % 4 === 0;
    let go = false;
    if (st.play && st.play[0] + n >= st.play[1]) go = true;
    else if (phrase && forced) go = true;
    else if (phrase && st.bars && n >= st.bars) go = true;
    else if (st.id === 'montee' && phrase && (charge >= 1 || n >= st.max)) go = true;
    if (go && si < STAGES.length - 1) { switchAt = k + 1; call = { id: STAGES[si + 1].id, at: t0 + (k + 1) * BAR }; sendState(); }
    else if (go && si === STAGES.length - 1) { switchAt = -2; setTimeout(finish, Math.max(0, t0 + (k + 1) * BAR - Date.now()) + 400); }
  }
  return songBar;
}
// what each stem plays on this beat, from what the room does
const lvl = { drums: 0, bass: 0, piano: 0, other: 0, vocals: 0 };
function activity() {
  const now = Date.now(), a = { r: 0, b: 0, h: 0, m: 0 }, e = Object.fromEntries(ROLES.map((r) => [r, Math.max(1, cnt[r] * P[r])]));
  for (const p of phones.values()) {
    if (!fresh(p)) continue;
    if (p.role === 'r' && now - p.tap < 1300) a.r++;
    if (p.role === 'm' && now - p.tap < 1500) a.m++;
    if (p.role === 'b' && p.hold) a.b++;
    if (p.role === 'h') a.h += p.open;
  }
  for (const r of ROLES) a[r] = Math.min(1, (a[r] / e[r]) * 1.3);
  return a;
}
let lastBeat = -1, act = { r: 0, b: 0, h: 0, m: 0 };
function beat(b) {
  const st = STAGES[si], ms = t0 + b * BEAT; act = activity();
  if (st.fixed) { for (const s of SONG.stems) { lvl[s] = st.fixed[s] || 0; studio.set(s, lvl[s], 0.65, ms, 0.4); } return; }
  for (const r of ['r', 'b', 'h']) {
    const on = st.on.includes(r), target = on ? Math.max(act[r], st.floor || 0) : 0;
    for (const s of ROLE[r].stem) {
      lvl[s] += (target - lvl[s]) * (target > lvl[s] ? 0.7 : 0.4);
      const g = lvl[s] > 0.03 ? 0.25 + 0.75 * lvl[s] : 0, bright = r === 'b' ? 1 : r === 'r' ? 0.35 + 0.65 * lvl[s] : 0.2 + 0.8 * lvl[s];
      studio.set(s, g, bright, ms, 0.05);
    }
  }
  lvl.vocals = st.vocals || 0; studio.set('vocals', lvl.vocals, 1, ms, 0.08);
}
function tick() {
  if (!ready || ended) return;
  const now = Date.now();
  while (t0 + nextK * BAR < now + 500) { const sb = decide(nextK); studio.bar(sb, t0 + nextK * BAR); barMap.set(nextK, sb); nextK++; }
  const b = Math.floor((now + 120 - t0) / BEAT); if (b > lastBeat) { for (let k = lastBeat + 1; k <= b; k++) beat(k); lastBeat = b; }
  simTick(now);
}
const barMap = new Map(); // timeline bar -> song bar, for the lyrics
function sendState() {
  link?.send({ t: 's', sc: 'session', t0, st: ended ? 'fin' : STAGES[si].id, since: stageAt, call, cnt, p: P, charge: Math.round(charge * 100) / 100, clip, n: live() });
}
setInterval(sendState, 1500);
setInterval(() => { if (STAGES[si].id === 'montee') sendState(); }, 400);
function next() { if (si === 0 && !forced) { forced = true; return; } forced = true; }

// thirty seconds of the drop, recorded from the venue output, then shared with every phone
async function recordDrop() {
  if (!studio) return;
  const blob = await studio.record(30000); if (!blob) return;
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm', name = `clips/${room}-${Date.now()}.${ext}`;
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/unisson/${name}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': blob.type, 'x-upsert': 'false' }, body: blob });
    if (r.ok) { clip = `${SUPABASE_URL}/storage/v1/object/public/unisson/${name}`; sendState(); }
  } catch {}
  window.__clipBlob = blob;
}
function finish() {
  ended = true; studio?.stop(Date.now() + 50); si = STAGES.length - 1; document.body.dataset.stage = 'fin';
  showTitle(T.st.fin, true); $('sub').textContent = T.finS(live()); call = null; stageAt = Date.now(); sendState();
}

// ---------------------------------------------------------------- a simulated crowd, to rehearse without a room
function simulate(k = 60) { for (let i = 0; i < k; i++) { const id = 'sim-' + randCode(8), p = touch(id); p.sim = true; p.skill = 0.6 + Math.random() * 0.4; } }
let simLast = 0;
function simTick(now) {
  if (now - simLast < 120) return; simLast = now;
  const st = STAGES[si];
  for (const p of phones.values()) {
    if (!p.sim) continue;
    const on = st.on.includes(p.role) && now - stageAt > 300;
    if (p.role === 'r' && on && Math.random() < 0.25 * p.skill) { p.tap = now; p.flare = 0.8; }
    if (p.role === 'b') p.hold = on && Math.random() < 0.97 ? (p.hold || Math.random() < 0.3) : false;
    if (p.role === 'h') p.open = on ? Math.min(1, p.open + 0.08) : Math.max(0, p.open - 0.1);
    if (p.role === 'm' && on && Math.random() < 0.09 * p.skill && P.m >= 1) { p.tap = now; p.flare = 1; melodyTap(1); }
    if (st.id === 'montee' && Math.random() < 0.5) { p.flare = Math.min(1, p.flare + 0.2); charge = Math.min(1, charge + 3 / (Math.max(4, live()) * 16)); }
  }
}

// ---------------------------------------------------------------- the picture
const cv = $('room'), g = cv.getContext('2d');
let W = 0, H = 0; const notes = [], sparks = [];
function fit() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
const COLX = { r: 0.17, b: 0.39, h: 0.61, m: 0.83 };
for (const r of ROLES) $('c-' + r).querySelector('b').textContent = ROLE[r][lang];
function showTitle(text, stay = false) { const el = $('title'); el.textContent = text; el.classList.remove('show', 'stay'); void el.offsetWidth; if (text) el.classList.add(stay ? 'stay' : 'show'); }
let shownStage = '', bloom = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = Date.now(), st = STAGES[si], lv = studio ? studio.levels() : {};
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#030204'; g.fillRect(0, 0, W, H);
  if (!ready) return;
  const e = now - t0, b = e / BEAT, f = b - Math.floor(b), kk = Math.floor(e / BAR), songBar = barMap.get(kk);
  const id = ended ? 'fin' : st.id;
  if (id !== shownStage) { shownStage = id; document.body.dataset.stage = id; document.body.dataset.scene = id === 'accueil' ? 'lobby' : 'play'; if (!ended) showTitle(T.st[id] || ''); if (id === 'drop') bloom = 1; }
  // the stage light: breathes with the beat once the drums play
  const pump = Math.pow(1 - f, 3) * (lv.drums || 0), sgr = g.createRadialGradient(W / 2, H * 0.05, 0, W / 2, H * 0.05, H * 1.1);
  sgr.addColorStop(0, `rgba(255,170,110,${0.05 + 0.12 * pump + 0.1 * (lv.vocals || 0)})`); sgr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sgr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  // the four columns: the real level of each part of the mix, rising from the floor
  for (const r of ROLES) {
    const x = COLX[r] * W, hue = ROLE[r].hue, L = r === 'm' ? Math.min(1, act.m * 0.9) : Math.max(...ROLE[r].stem.map((s) => lv[s] || 0)), on = st.on.includes(r);
    const hgt = H * (0.12 + 0.62 * L), cg = g.createLinearGradient(0, H, 0, H - hgt);
    cg.addColorStop(0, `hsla(${hue},85%,55%,${0.1 + 0.4 * L})`); cg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg; g.fillRect(x - W * 0.09, H - hgt, W * 0.18, hgt);
    $('c-' + r).classList.toggle('on', on); $('c-' + r).querySelector('i').textContent = `${cnt[r]} ${T.phones}`;
    $('c-' + r).style.setProperty('--lv', L.toFixed(2));
  }
  // the phones themselves, in their column
  for (const p of phones.values()) {
    if (!fresh(p)) continue;
    const x = (COLX[p.role] + (p.x - 0.5) * 0.15) * W, y = H * (0.36 + p.y * 0.42), on = st.on.includes(p.role);
    const L = p.role === 'm' ? act.m : Math.max(...ROLE[p.role].stem.map((s) => lv[s] || 0));
    const a = Math.min(1, (on ? 0.2 + 0.5 * L : 0.08) + p.flare * 0.7 + (p.hold ? 0.35 : 0) + p.open * 0.3) * Math.min(1, (performance.now() - p.born) / 900);
    p.flare *= 0.9;
    const rr = (3 + 7 * a) * Math.min(W, H) / 900, gr = g.createRadialGradient(x, y, 0, x, y, rr * 3);
    gr.addColorStop(0, `hsla(${ROLE[p.role].hue},90%,${70 + 20 * p.flare}%,${0.9 * a + 0.05})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr * 3, 0, 7); g.fill();
    if (p.flare > 0.7 && Math.random() < 0.15) sparks.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: -1.5 - Math.random() * 2, life: 1, h: ROLE[p.role].hue });
  }
  // the melody, as notes rising from its column
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i], age = (now - n.at) / 2200; if (age > 1) { notes.splice(i, 1); continue; } if (age < 0) continue;
    const x = COLX.m * W + Math.sin(n.at) * W * 0.05, y = H * (0.62 - (n.m - 64) * 0.01) - age * H * 0.2;
    g.fillStyle = `hsla(335,90%,80%,${1 - age})`; g.font = `300 ${Math.round(H * 0.028)}px Cormorant Garamond, serif`; g.textAlign = 'center'; g.fillText(NOTE[n.m % 12], x, y);
  }
  for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.04; s.life -= 0.025; g.fillStyle = `hsla(${s.h},90%,75%,${Math.max(0, s.life)})`; g.beginPath(); g.arc(s.x, s.y, 1.8, 0, 7); g.fill(); }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  // the drop: one soft white bloom, then a ring on every beat
  if (['drop', 'final'].includes(id) && lv.drums > 0.1) for (let k = 0; k < 3; k++) { const age = f + k, r = Math.min(W, H) * (0.1 + age * 0.22), a = Math.max(0, 0.35 - age * 0.11) * lv.drums; g.strokeStyle = `hsla(${[28, 335, 190][k]},90%,65%,${a})`; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H * 0.5, r, 0, 7); g.stroke(); }
  if (bloom > 0) { g.fillStyle = `rgba(255,240,225,${bloom * 0.55})`; g.fillRect(0, 0, W, H); bloom = Math.max(0, bloom - 0.025); }
  // the charge before the drop
  if (id === 'montee') {
    const R = Math.min(W, H) * 0.16; g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(W / 2, H * 0.52, R, 0, 7); g.stroke();
    g.strokeStyle = `hsl(${40 - 40 * charge} 95% 65%)`; g.beginPath(); g.arc(W / 2, H * 0.52, R, -Math.PI / 2, -Math.PI / 2 + charge * 2 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.font = `300 ${Math.round(R * 0.55)}px Cormorant Garamond, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.round(charge * 100)} %`, W / 2, H * 0.52); g.textBaseline = 'alphabetic';
  }
  // the countdown into a part: the last four beats before it comes in
  let big = '';
  if (call && call.at > now && call.at - now <= 4 * BEAT && STAGES[stageIndex(call.id)]?.call) big = String(Math.ceil((call.at - now) / BEAT));
  if (id === 'drop' && now - stageAt < 1200) big = T.drop;
  const bg = $('big'); if (bg.textContent !== big) { bg.textContent = big; bg.classList.remove('pop'); void bg.offsetWidth; if (big) bg.classList.add('pop'); }
  // the words, when there are words
  const ly = songBar != null && ['drop', 'ecoute', 'ensemble', 'sansvoix', 'final'].includes(id) ? lyricAt(songBar + (e / BAR - kk)) : { line: '', next: '' };
  const ln = $('lyrics'); if (ln.dataset.k !== ly.line + '|' + ly.next) { ln.dataset.k = ly.line + '|' + ly.next; ln.querySelector('.now').textContent = ly.line; ln.querySelector('.next').textContent = ly.next; }
  ln.classList.toggle('sing', id === 'sansvoix');
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- controls
setInterval(tick, 40);
$('go').onclick = async () => {
  $('go').disabled = true; $('go').textContent = T.loading + '…';
  studio = new Studio(); await studio.c.resume();
  try { link = await screen({ room, onMessage }); } catch { $('n').textContent = '!'; }
  await studio.load('audio/', (k) => { $('go').textContent = `${T.loading} ${Math.round(k * 100)} %`; });
  studio.sync(); t0 = Date.now() + 400; si = 0; sb0 = 0; nextK = 0; stageAt = t0; barMap.clear(); ready = true;
  document.body.classList.add('live'); sendState();
  try { await navigator.wakeLock?.request('screen'); } catch {}
};
$('next').onclick = next;
$('sim').onclick = () => simulate(60);
$('full').onclick = () => { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d); };
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); next(); } if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('bare'); });
window.__session = { phones, get stage() { return STAGES[si].id; }, get studio() { return studio; }, get charge() { return charge; }, get clip() { return clip; }, next, simulate, lvl, get act() { return act; }, room };
