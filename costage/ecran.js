// CO-STAGE big screen. It is the show's authority: it counts every vote, tap and light, decides when a moment
// ends, keeps tonight's results and broadcasts one state to the whole room. It also draws the room itself: every
// phone is a point of light at its place, lit exactly as that phone is, so the crowd sees its own decision.
// Opened by the régie as ecran.html#r=ROOM&k=KEY (the key opens the secret command channel).
import { screen, cleanRoom, randCode } from './net.js';
import * as M from './moments.js';

const $ = (id) => document.getElementById(id);
const P = new URLSearchParams(location.hash.slice(1));
const room = cleanRoom(P.get('r')), key = (P.get('k') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
const joinUrl = new URL(`./?r=${room}`, location.href).href;
const W8 = {
  fr: { wait: 'En attente de la régie', join: 'Rejoignez le concert', connected: 'connectés', mic: 'Micro', micOn: 'Micro actif', together: 'Ensemble !', left: 'Gauche', right: 'Droite', zones: { g: 'Gauche', c: 'Centre', d: 'Droite', all: 'Tout le monde', L: 'Gauche', R: 'Droite' }, wins: (t) => `${t} gagne`, unlocked: 'Débloqué !', missed: 'Presque…', chosen: 'C\'est toi !', section: (z) => `Section ${z.toLowerCase()}`, edition: (n) => (n ? `Édition n° ${n}` : 'Répétition'), keep: 'Votre souvenir', taps: 'Tapez !', noise: 'Faites du bruit !', light: 'Allumez vos téléphones', phonesUp: 'Téléphones en l\'air', words: 'mots', sync: 'ensemble' },
  en: { wait: 'Waiting for the control desk', join: 'Join the show', connected: 'connected', mic: 'Mic', micOn: 'Mic on', together: 'Together!', left: 'Left', right: 'Right', zones: { g: 'Left', c: 'Centre', d: 'Right', all: 'Everybody', L: 'Left', R: 'Right' }, wins: (t) => `${t} wins`, unlocked: 'Unlocked!', missed: 'So close…', chosen: 'It\'s you!', section: (z) => `${z} section`, edition: (n) => (n ? `Edition no. ${n}` : 'Rehearsal'), keep: 'Your keepsake', taps: 'Tap!', noise: 'Make some noise!', light: 'Light up your phones', phonesUp: 'Phones up', words: 'words', sync: 'together' },
};
let L = W8.fr;

// ---------------------------------------------------------------- the state everyone receives
const S = { t: 's', v: 0, room, show: null, ev: null, lobby: true, m: -1, run: 0, mo: null, ph: 'idle', t0: 0, t1: 0, x: {}, res: [], black: false, msg: '', qr: true, n: 0, p: 1, sum: null, hb: 0 };
let program = [], cur = null;
const phones = new Map(); // id -> { seat, last, real }
let sims = [], everIds = new Set(), peak = 0;
const now = () => Date.now();
const live = () => { const t = now() - 45000; let n = 0; for (const p of phones.values()) if (p.last > t) n++; return n; };
const present = () => live() + sims.length;

// ---------------------------------------------------------------- broadcasting
// the room gets a lean public state (what the lights need) at most twice a second plus a heartbeat; detailed
// numbers (vote counts, words waiting for approval, mic level) go only to the régie, on its secret channel
let link = null, dirty = true, lastSent = 0, lastR = 0;
const emit = () => { dirty = true; };
const PUBX = ['win', 'rope', 'sync', 'p', 'line', 'shown', 'code', 'zone', 'ok', 'reward', 'ed', 'tok', 'imposed'];
function pubState() { const x = {}; for (const k of PUBX) if (S.x[k] !== undefined) x[k] = S.x[k]; return { ...S, x }; }
setInterval(() => {
  if (!link) return;
  const t = now();
  if ((dirty && t - lastSent > 500) || t - lastSent > 2500) { S.v++; S.hb = t; S.n = present(); S.p = Math.min(1, 150 / Math.max(1, live())); link.send(pubState()); dirty = false; lastSent = t; }
  if (t - lastR > 400) { lastR = t; link.toRegie({ t: 'r', hb: t, n: present(), real: live(), sims: sims.length, peak, joined: everIds.size + sims.length, m: S.m, run: S.run, ph: S.ph, lobby: S.lobby, x: S.x, res: S.res, sum: S.sum, black: S.black, msg: S.msg, mic: !!analyser, acted: cur ? cur.acted.size : 0, loaded: !!S.show }); }
}, 120);

// ---------------------------------------------------------------- what phones send
function onPhone(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'p') { link?.send({ t: 'q', k: String(m.k).slice(0, 8), h: now() }); return; }
  const id = String(m.id || '').slice(0, 16); if (!id) return;
  if (m.t === 'h') { const z = M.ZONES.includes(m.z) ? m.z : 'c'; const p = phones.get(id); if (!p || p.seat.zone !== z) phones.set(id, { seat: M.seatOf(id, z), last: now() }); else p.last = now(); everIds.add(id); return; }
  const p = phones.get(id); if (p) p.last = now();
  if (!cur || m.r !== S.run || S.ph !== 'live') return;
  act(id, m);
}
function act(id, m) {
  const ty = cur.m.type;
  if (m.t === 'v' && ty === 'vote') { const o = +m.o; if (o >= 0 && o < cur.m.options.length) { cur.votes.set(id, o); cur.acted.add(id); emit(); } }
  else if (m.t === 'k') { const n = Math.max(0, Math.min(40, +m.n || 0)); cur.taps.set(id, { n: (cur.taps.get(id)?.n || 0) + n, last: now(), s: Math.max(0, Math.min(1, +m.s || 0)) }); cur.total += n; if (n) cur.acted.add(id); }
  else if (m.t === 'l' && (ty === 'challenge')) { if (m.on) { cur.lit.add(id); cur.acted.add(id); } else cur.lit.delete(id); emit(); }
  else if (m.t === 'w' && ty === 'words') { const w = M.cleanWord(m.w); if (!w) return; const old = cur.wordOf.get(id); if (old) cur.words.set(old, (cur.words.get(old) || 1) - 1); cur.wordOf.set(id, w); cur.words.set(w, (cur.words.get(w) || 0) + 1); cur.acted.add(id); emit(); }
}

// ---------------------------------------------------------------- the régie's orders
function onCommand(c) {
  if (!c || typeof c !== 'object') return;
  switch (c.c) {
    case 'load': {
      S.show = { title: String(c.show?.title || '').slice(0, 120), artist: String(c.show?.artist || '').slice(0, 120), venue: String(c.show?.venue || '').slice(0, 120), hue: +c.show?.hue || 38, lang: c.show?.lang === 'en' ? 'en' : 'fr' };
      program = M.cleanProgram(c.program, S.show.lang); S.ev = c.ev ? { ed: +c.ev.edition || 0, tok: String(c.ev.token || '').slice(0, 40), reh: !!c.ev.rehearsal } : null;
      S.prog = program.map((m) => ({ type: m.type, title: m.title }));
      L = W8[S.show.lang]; document.documentElement.style.setProperty('--h', S.show.hue); document.documentElement.lang = S.show.lang; $('wait').style.display = 'none'; drawLobby(); render(); emit(); break;
    }
    case 'go': if (program[c.i]) start(+c.i); break;
    case 'close': if (cur && S.ph === 'live') finish(); break;
    case 'reveal': if (cur?.m.type === 'vote' && (S.ph === 'closed' || S.ph === 'live')) { if (S.ph === 'live') finish(true); reveal(c.o); } break;
    case 'pocket': stop(); S.lobby = false; render(); emit(); break;
    case 'lobby': stop(); S.lobby = true; render(); emit(); break;
    case 'black': S.black = !!c.on; document.body.classList.toggle('black', S.black); emit(); break;
    case 'msg': S.msg = String(c.text || '').slice(0, 140); banner(); emit(); break;
    case 'qr': S.qr = !!c.on; document.body.classList.toggle('hideqr', !S.qr); emit(); break;
    case 'sim': setSims(Math.max(0, Math.min(600, +c.n || 0))); emit(); break;
    case 'next': case 'prev': if (cur?.m.type === 'chorus') { const n = cur.m.lines.length; S.x.line = Math.max(0, Math.min(n - 1, (S.x.line || 0) + (c.c === 'next' ? 1 : -1))); cur.lineAt = now(); render(); emit(); } break;
    case 'approve': if (cur?.m.type === 'words') { const w = String(c.w || ''); c.on ? cur.ok.add(w) : cur.ok.delete(w); emit(); } break;
    case 'bpm': if (cur?.m.type === 'pulse') { const b = Math.max(60, Math.min(180, Math.round(+c.bpm || 0))); if (b) { cur.m.bpm = b; S.mo.bpm = b; S.t0 = now() + 300; emit(); } } break;
    case 'end': stop(); S.sum = summary(); emit(); break;
    case 'hello': emit(); break;
  }
}

// ---------------------------------------------------------------- moments: start, live, finish
const pub = (m) => { const o = { ...m }; delete o.secret; delete o.reward; return o; };
function stop() { if (cur && S.ph === 'live') finish(); cur = null; S.mo = null; S.ph = 'idle'; S.x = {}; }
function start(i) {
  if (cur && S.ph === 'live') finish();
  const m = structuredClone(program[i]);
  cur = { i, m, acted: new Set(), votes: new Map(), taps: new Map(), total: 0, lit: new Set(), words: new Map(), wordOf: new Map(), ok: new Set(), peakSync: 0, loud: {}, lineAt: now(), done: false };
  S.lobby = false; S.m = i; S.run++; S.mo = pub(m); S.ph = 'live'; S.t0 = now() + 1500; S.t1 = 0; S.sum = null;
  S.x = { counts: m.type === 'vote' ? m.options.map(() => 0) : undefined, p: 0, rope: 0, line: 0, lv: 0 };
  if (m.type === 'reveal') S.x.shown = m.secret.replace(/[^ ]/g, '·');
  if (m.type === 'finale') { S.sum = summary(); S.x.ed = S.ev?.ed || 0; S.x.tok = S.ev?.tok || ''; }
  for (const s of sims) s.done = false;
  render(); emit();
}
const timed = (ty) => ['vote', 'pulse', 'battle', 'challenge', 'lights'].includes(ty);
const endsAt = () => (cur && timed(cur.m.type) && cur.m.dur ? S.t0 + cur.m.dur * 1000 : Infinity);
function record(r) { const i = S.res.findIndex((x) => x.i === cur.i); const passive = ['lights', 'chorus', 'draw', 'finale'].includes(cur.m.type); // nothing to tap: no participation figure
  const out = { i: cur.i, run: S.run, type: cur.m.type, title: cur.m.title, part: passive ? null : Math.round((100 * cur.acted.size) / Math.max(1, present())), n: present(), ...r }; if (i >= 0) S.res[i] = out; else S.res.push(out); }
function finish(silent = false) {
  if (!cur || cur.done) return; const m = cur.m, x = S.x; S.t1 = now();
  switch (m.type) {
    case 'vote': S.ph = 'closed'; if (m.auto && !silent) { emit(); setTimeout(() => reveal(), 800); } break;
    case 'pulse': S.ph = 'done'; record({ bpm: m.bpm, sync: Math.round(cur.peakSync), ok: cur.peakSync >= m.goal }); cur.done = true; break;
    case 'battle': S.ph = 'reveal'; x.win = (x.rope || 0) >= 0 ? 'R' : 'L'; record({ win: x.win, rope: Math.round((x.rope || 0) * 100) }); cur.done = true; break;
    case 'challenge': { S.ph = 'reveal'; x.ok = (x.p || 0) >= m.target; x.reward = x.ok ? m.reward : ''; record({ ok: x.ok, pct: Math.round(x.p || 0), goal: m.goal, reward: x.ok ? m.reward : '' }); cur.done = true; break; }
    case 'reveal': S.ph = 'reveal'; x.shown = m.secret; record({ secret: m.secret }); cur.done = true; break;
    case 'chorus': { S.ph = 'done'; const loud = Object.entries(cur.loud).filter(([z, v]) => z !== 'all' && v > 5).sort((a, b) => b[1] - a[1])[0]; /* without a mic, no winner */ record({ loud: loud?.[0] || '', peak: Math.round(loud?.[1] || cur.loud.all || 0) }); cur.done = true; break; }
    case 'words': S.ph = 'done'; record({ words: topWords().filter((w) => w.ok).slice(0, 12).map((w) => w.w) }); cur.done = true; break;
    case 'draw': S.ph = 'done'; cur.done = true; break;
    case 'lights': S.ph = 'done'; record({ fx: m.fx, hue: m.fx === 'night' ? M.nightHues(S.res)[0] : m.hue }); cur.done = true; break;
    case 'finale': S.ph = 'done'; record({}); S.sum = summary(); cur.done = true; break;
  }
  render(); emit();
}
function reveal(o) {
  if (!cur || cur.m.type !== 'vote') return;
  const c = S.x.counts || [], tot = c.reduce((a, b) => a + b, 0);
  let w = Number.isInteger(o) && o >= 0 && o < c.length ? o : c.indexOf(Math.max(...c)); if (w < 0) w = 0;
  S.x.win = w; S.x.imposed = Number.isInteger(o); S.ph = 'reveal'; S.t1 = now();
  record({ win: w, label: cur.m.options[w].label, hue: cur.m.options[w].hue, pct: tot ? Math.round((100 * c[w]) / tot) : 0, votes: tot, counts: c.slice(), imposed: S.x.imposed });
  cur.done = true; render(); emit();
}
const topWords = () => [...cur.words.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w, n]) => ({ w, n, ok: !cur.m.approve || cur.ok.has(w) }));
function summary() {
  return { date: new Date().toISOString(), edition: S.ev?.ed || 0, peak, joined: everIds.size + sims.length, res: S.res.map((r) => ({ ...r })), hues: M.nightHues(S.res) };
}

// ---------------------------------------------------------------- the live loop: aggregates, sims, end of timed moments
let micLv = 0;
setInterval(() => {
  const t = now(); peak = Math.max(peak, present());
  simTick(t);
  if (!cur) return;
  const m = cur.m, x = S.x, n = Math.max(1, present());
  if (S.ph === 'live' && t >= endsAt()) finish();
  if (S.ph !== 'live') return;
  if (m.type === 'vote') { const c = m.options.map(() => 0); for (const o of cur.votes.values()) c[o]++; x.counts = c; }
  if (m.type === 'pulse') {
    let q = 0, k = 0; for (const v of cur.taps.values()) if (t - v.last < 2500) { q += v.s; k++; }
    const share = Math.min(1, k / Math.max(1, n * S.p * 0.6)); x.sync = Math.round(100 * (k ? q / k : 0) * share); cur.peakSync = Math.max(cur.peakSync, x.sync); x.p = x.sync;
  }
  if (m.type === 'battle' && t > S.t0 + 3000) {
    const tot = { L: 0, R: 0 }, cnt = { L: 0, R: 0 };
    for (const [id, v] of cur.taps) { const s = seatFor(id); if (!s) continue; tot[s.team] += v.n; cnt[s.team]++; }
    const a = cnt.L ? tot.L / cnt.L : 0, b = cnt.R ? tot.R / cnt.R : 0; x.rope = a + b ? (b - a) / (a + b) : 0; x.tl = Math.round(tot.L / S.p); x.tr = Math.round(tot.R / S.p);
  }
  if (m.type === 'challenge') {
    if (m.goal === 'light') x.p = Math.min(100, (100 * cur.lit.size) / n);
    else if (m.goal === 'taps') x.p = Math.min(100, (100 * cur.total) / (S.p * n * m.target));
    else x.p = Math.min(100, Math.max(micLv, (100 * cur.total) / (S.p * n * 25)));
    if (x.p >= m.target && m.goal !== 'taps') x.hit = true;
  }
  if (m.type === 'reveal') {
    x.p = Math.min(100, (100 * cur.total) / (S.p * n * m.taps));
    const letters = [...m.secret], idx = letters.map((ch, i) => i).filter((i) => letters[i] !== ' ');
    const k = Math.floor((x.p / 100) * idx.length), order = idx.slice().sort((a, b) => M.hash(`${m.id}${a}`) - M.hash(`${m.id}${b}`)), on = new Set(order.slice(0, k));
    x.shown = letters.map((ch, i) => (ch === ' ' || on.has(i) ? ch : '·')).join('');
    if (x.p >= 100) finish();
  }
  if (m.type === 'chorus') { x.lv = Math.round(micLv); const who = m.lines[x.line || 0]?.who || 'all'; cur.loud[who] = Math.max(cur.loud[who] || 0, micLv); }
  if (m.type === 'draw' && !x.win && t > S.t0 + M.DRAW.end) {
    const real = [...phones.entries()].filter(([, p]) => p.last > t - 45000), pool = real.length ? real : sims.map((s) => [s.id, s]);
    if (pool.length) { const [id, p] = pool[Math.floor(Math.random() * pool.length)]; x.win = id; x.code = randCode(4); x.zone = p.seat.zone; record({ zone: x.zone, code: x.code }); render(); }
    cur.done = true; S.ph = 'reveal';
  }
  if (m.type === 'words') x.words = topWords();
  emit();
}, 200);
const seatFor = (id) => phones.get(id)?.seat || sims.find((s) => s.id === id)?.seat;

// ---------------------------------------------------------------- a simulated crowd, for rehearsals (never mixed into real numbers on the public page)
function setSims(n) { sims = Array.from({ length: n }, (_, i) => { const id = `sim${i}`, z = M.ZONES[i % 3]; return { id, seat: M.seatOf(id, z), pref: M.hash(id) % 100, q: 0.55 + (M.hash(`q${id}`) % 40) / 100, done: false }; }); }
const NICE = { fr: ['magique', 'frissons', 'ensemble', 'lumière', 'merci', 'encore', 'bonheur', 'vibrer', 'famille', 'liberté'], en: ['magic', 'chills', 'together', 'light', 'thanks', 'encore', 'joy', 'alive', 'family', 'freedom'] };
function simTick(t) {
  if (!sims.length || !cur || S.ph !== 'live' || t < S.t0) return;
  const m = cur.m, e = t - S.t0;
  for (const s of sims) {
    if (m.type === 'vote' && !s.done && e > (s.pref / 100) * (m.dur || 15) * 700) { const k = m.options.length, o = s.pref < 58 ? 0 : (s.pref % k); cur.votes.set(s.id, o); cur.acted.add(s.id); s.done = true; }
    if (['pulse', 'battle', 'reveal'].includes(m.type) || (m.type === 'challenge' && m.goal !== 'light')) {
      if (s.pref < 82) { const rate = m.type === 'battle' ? (s.seat.team === 'R' ? 0.9 : 0.75) : 0.6; if (Math.random() < rate) { const v = cur.taps.get(s.id) || { n: 0 }; cur.taps.set(s.id, { n: v.n + 1, last: t, s: s.q }); cur.total += S.p; cur.acted.add(s.id); } }
    }
    if (m.type === 'challenge' && m.goal === 'light' && !s.done && e > s.pref * 120) { if (s.pref < 85) { cur.lit.add(s.id); cur.acted.add(s.id); } s.done = true; }
    if (m.type === 'words' && !s.done && e > s.pref * 90 && s.pref < 60) { const w = NICE[S.show?.lang || 'fr'][s.pref % 10]; cur.wordOf.set(s.id, w); cur.words.set(w, (cur.words.get(w) || 0) + 1); cur.acted.add(s.id); s.done = true; }
  }
}

// ---------------------------------------------------------------- the microphone of the screen machine (the room's loudness, no phone permission needed)
let analyser = null, buf = null, floor = -50;
$('mic').onclick = async () => {
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ac = new AudioContext(), src = ac.createMediaStreamSource(st); analyser = ac.createAnalyser(); analyser.fftSize = 2048; src.connect(analyser); buf = new Float32Array(analyser.fftSize);
    $('mic').textContent = L.micOn; $('mic').classList.add('gold');
  } catch { $('mic').textContent = '×'; }
};
function micTick() {
  if (!analyser) return;
  analyser.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  const db = 10 * Math.log10(s / buf.length + 1e-10); floor = Math.min(floor + 0.01, db, -20); // the room's quiet level, slowly learned
  const lv = Math.max(0, Math.min(100, ((db - floor - 4) / 28) * 100)); micLv = micLv * 0.85 + lv * 0.15;
}

// ---------------------------------------------------------------- the room on screen
const cv = $('crowd'), g = cv.getContext('2d'); let W = 0, H = 0, DPR = 1;
function size() { DPR = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR; }
addEventListener('resize', size); size();
function frame() {
  const t = now(); micTick();
  const hue = S.show?.hue ?? 38;
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#040406'; g.fillRect(0, 0, W, H);
  const st = g.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 1.1); st.addColorStop(0, `hsla(${hue},80%,45%,.22)`); st.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = st; g.fillRect(0, 0, W, H);
  const ty = cur?.m.type;
  if (ty === 'finale') { M.drawSignature(g, W, H * 0.66, S.res, t, { seed: S.ev?.ed || 1, alpha: 1 }); } // the print in the upper part, the words under it, the crowd below
  if (ty === 'pulse' && S.ph === 'live') {
    const beat = 60000 / (cur.m.bpm || 118), f = ((t - S.t0) / beat) % 1, k = f < 0 ? 0 : Math.pow(1 - f, 3), tog = (S.x.sync || 0) >= cur.m.goal;
    const R = Math.min(W, H) * (0.14 + 0.05 * k), gr = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, R * 2.2);
    gr.addColorStop(0, `hsla(${tog ? 42 : 172},95%,62%,${0.35 + 0.5 * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(W / 2, H * 0.42, R * 2.2, 0, 7); g.fill();
  }
  // the crowd: real phones and (in rehearsal) simulated ones, each lit as its own phone is
  const ids = []; const tl = t - 45000;
  for (const [id, p] of phones) if (p.last > tl) ids.push([id, p.seat]);
  for (const s of sims) ids.push([s.id, s.seat]);
  const n = ids.length, r = Math.max(2.2, Math.min(14, Math.sqrt((W * H * 0.22) / Math.max(1, n)) * 0.28)) ;
  g.globalCompositeOperation = 'lighter';
  for (const [id, seat] of ids) {
    const me = cur ? { id, vote: cur.votes.get(id), lit: cur.lit.has(id), sent: cur.wordOf.has(id) } : { id };
    const c = M.lightOf(S, t, seat, me); if (c.a < 0.01) continue;
    const depth = 0.55 + seat.y * 0.45, x = W * (0.04 + seat.x * 0.92), y = H * (0.6 + seat.y * 0.36), rr = r * depth * (0.7 + 0.6 * c.a);
    g.fillStyle = `hsla(${c.h},${c.s}%,${Math.min(80, c.l + 8)}%,${Math.min(1, 0.15 + c.a)})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    if (c.a > 0.45) { g.fillStyle = `hsla(${c.h},${c.s}%,${c.l}%,${0.12 * c.a})`; g.beginPath(); g.arc(x, y, rr * 3.2, 0, 7); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- words and numbers over the room
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function qrSvg(url, cell) { if (!window.qrcode) return ''; const q = window.qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true }); }
function drawLobby() {
  $('lb-k').textContent = L.join; $('lb-a').textContent = S.show?.artist || S.show?.title || 'CO-STAGE'; $('lb-t').textContent = S.show?.artist ? S.show?.title : (S.show?.venue || '');
  $('qr').innerHTML = qrSvg(joinUrl, 8); $('sqr').innerHTML = qrSvg(joinUrl, 4);
  $('url').innerHTML = `${esc(new URL(joinUrl).host)}/costage · <b>${room}</b>`; $('nl').textContent = L.connected; $('brand').textContent = (S.show?.artist || 'CO-STAGE').toUpperCase();
}
function banner() { $('banner').textContent = S.msg; $('banner').classList.toggle('on', !!S.msg); }
const fmtDate = () => new Date().toLocaleDateString(S.show?.lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function render() {
  document.body.classList.toggle('lobby', S.lobby && !cur);
  $('lobby').classList.toggle('on', S.lobby && !cur); $('mo').classList.toggle('on', !!cur);
  const box = $('mo-in'); if (!cur) { box.innerHTML = ''; return; }
  const m = cur.m, x = S.x, ty = m.type, kick = `<div class="mo-kick">${esc(m.title)}</div>`;
  let h = '';
  if (ty === 'vote') {
    h = `${kick}<div class="mo-big">${esc(m.q)}</div><div class="opts">${m.options.map((o, i) => `<div class="opt" data-o="${i}" style="border-color:hsla(${o.hue},90%,60%,.6);box-shadow:0 0 60px hsla(${o.hue},90%,50%,.18)"><div class="l" style="color:hsl(${o.hue} 95% 72%)">${esc(o.label)}</div><div class="p">0 %</div><div class="bar"><i style="background:hsl(${o.hue} 90% 60%)"></i></div></div>`).join('')}</div><div class="timer" id="tm"></div>`;
  } else if (ty === 'lights') h = `${kick}<div class="mo-sub">${L.phonesUp}</div>`;
  else if (ty === 'pulse') h = `${kick}<div class="mo-big" id="pl-big">${L.taps}</div><div class="meter"><i id="mt"></i><b style="left:${m.goal}%"></b></div><div class="timer" id="tm"></div>`;
  else if (ty === 'battle') h = `${kick}<div class="mo-big" id="bt-big">3</div><div class="teams"><span style="color:hsl(${M.TEAM_H.L} 90% 70%)">${L.left}</span><span style="color:hsl(${M.TEAM_H.R} 90% 70%)">${L.right}</span></div><div class="rope"><i id="rl" style="width:50%;background:hsl(${M.TEAM_H.L} 85% 55%)"></i><i id="rr" style="width:50%;background:hsl(${M.TEAM_H.R} 85% 55%)"></i></div><div class="mo-sub">${esc(m.stake)}</div><div class="timer" id="tm"></div>`;
  else if (ty === 'chorus') { const ln = m.lines[x.line || 0] || {}; h = `${kick}<div class="mo-kick" style="color:var(--fg)">${esc(L.zones[ln.who] || '')}</div><div class="mo-big">${esc(ln.text || '')}</div>${analyser ? `<div class="meter"><i id="mt"></i></div>` : ''}<div class="mo-sub">${esc(m.lines[(x.line || 0) + 1]?.text || '')}</div>`; }
  else if (ty === 'challenge') h = `${kick}<div class="mo-big" id="ch-big">${m.goal === 'light' ? L.light : m.goal === 'noise' ? L.noise : L.taps}</div><div class="meter"><i id="mt"></i><b style="left:${m.goal === 'taps' ? 100 : m.target}%"></b></div><div class="mo-mid" id="ch-res"></div><div class="timer" id="tm"></div>`;
  else if (ty === 'reveal') h = `${kick}<div class="slots" id="slots">${[...(x.shown || '')].map((ch) => `<span class="${ch === ' ' ? 'gap' : ch !== '·' ? 'on' : ''}">${ch === '·' ? '' : esc(ch)}</span>`).join('')}</div><div class="meter"><i id="mt"></i></div><div class="mo-sub">${L.taps}</div>`;
  else if (ty === 'draw') h = x.win ? `${kick}<div class="mo-big">${L.chosen}</div><div class="mo-mid">${esc(L.section(L.zones[x.zone] || ''))}</div><div class="code">${esc(x.code)}</div><div class="mo-sub">${esc(m.reason)}</div>` : `${kick}<div class="mo-sub">${esc(m.reason)}</div>`;
  else if (ty === 'words') h = `${kick}<div class="mo-mid">${esc(m.q)}</div><div class="cloud" id="cloud"></div>`;
  else if (ty === 'finale') h = `<div style="position:fixed;left:0;right:0;top:5.5vh" class="mo-kick">${esc(L.edition(S.ev?.ed || 0))} · ${esc(fmtDate())}</div><div style="position:fixed;left:5vw;right:5vw;top:63vh;display:grid;gap:1.4vh;justify-items:center"><div class="mo-mid">${esc(m.thanks)}</div>${S.ev?.tok ? `<div class="mono">${L.keep}</div>` : ''}</div>`;
  box.innerHTML = h; cloudKeys.clear();
  // the small QR turns to the memory page at the finale
  $('sqr').innerHTML = qrSvg(ty === 'finale' && S.ev?.tok ? new URL(`./souvenir.html?e=${S.ev.tok}`, location.href).href : joinUrl, 4);
}
const cloudKeys = new Map();
setInterval(() => {
  $('n').textContent = present();
  if (!cur) return;
  const m = cur.m, x = S.x, t = now(), left = Math.max(0, Math.ceil((endsAt() - t) / 1000));
  const tm = $('tm'); if (tm) tm.textContent = S.ph === 'live' && Number.isFinite(endsAt()) ? `${t < S.t0 ? '' : left + ' s'}` : '';
  if (m.type === 'vote') {
    const c = x.counts || [], tot = c.reduce((a, b) => a + b, 0) || 1;
    document.querySelectorAll('.opt').forEach((el, i) => { el.querySelector('.p').textContent = `${Math.round((100 * (c[i] || 0)) / tot)} %`; el.querySelector('.bar i').style.width = `${(100 * (c[i] || 0)) / tot}%`; el.classList.toggle('win', S.ph === 'reveal' && x.win === i); el.classList.toggle('lose', S.ph === 'reveal' && x.win !== i); });
  }
  const mt = $('mt'); if (mt) mt.style.width = `${m.type === 'chorus' ? x.lv || 0 : m.type === 'pulse' ? x.sync || 0 : x.p || 0}%`;
  if (m.type === 'pulse') $('pl-big').textContent = (x.sync || 0) >= m.goal ? L.together : `${x.sync || 0} % ${L.sync}`;
  if (m.type === 'battle') { const b = $('bt-big'); const e = t - S.t0; b.textContent = S.ph === 'reveal' ? L.wins(x.win === 'L' ? L.left : L.right) : e < 0 ? '' : e < 3000 ? String(3 - Math.floor(e / 1000)) : ''; const p = 50 + 50 * (x.rope || 0); $('rl').style.width = `${100 - p}%`; $('rr').style.width = `${p}%`; }
  if (m.type === 'challenge' && S.ph === 'reveal') { $('ch-big').textContent = x.ok ? L.unlocked : L.missed; $('ch-res').textContent = x.ok ? x.reward || '' : ''; }
  if (m.type === 'reveal') { const sl = $('slots'); if (sl && sl.dataset.v !== x.shown) { sl.dataset.v = x.shown; [...(x.shown || '')].forEach((ch, i) => { const s = sl.children[i]; if (!s || ch === ' ') return; s.classList.toggle('on', ch !== '·'); s.textContent = ch === '·' ? '' : ch; }); } }
  if (m.type === 'words') {
    const cl = $('cloud'); if (!cl) return; const ws = (x.words || []).filter((w) => w.ok).slice(0, 30), max = ws[0]?.n || 1;
    ws.forEach((w, i) => {
      let el = cloudKeys.get(w.w); if (!el) { el = document.createElement('span'); el.textContent = w.w; cl.append(el); cloudKeys.set(w.w, el); }
      const a = i * 2.39996, rad = i ? 12 + Math.sqrt(i) * 9 : 0; el.style.left = `${50 + Math.cos(a) * rad * 1.15}%`; el.style.top = `${50 + Math.sin(a) * rad * 1.5}%`;
      el.style.fontSize = `${Math.max(22, 26 + 70 * (w.n / max) - i)}px`; el.style.color = `hsl(${M.PAL[i % M.PAL.length]} 85% ${70 + (w.n / max) * 15}%)`;
    });
    for (const [w, el] of cloudKeys) if (!ws.some((x) => x.w === w)) { el.remove(); cloudKeys.delete(w); }
  }
}, 200);

// ---------------------------------------------------------------- the operator's machine: hide the pointer, keep the mic button discreet
let idle = 0; const wake = () => { document.body.classList.remove('cursorless'); $('mic').style.opacity = 1; clearTimeout(idle); idle = setTimeout(() => { document.body.classList.add('cursorless'); $('mic').style.opacity = 0; }, 3000); };
addEventListener('pointermove', wake); wake();
addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {}); });
addEventListener('dblclick', () => document.documentElement.requestFullscreen?.().catch(() => {}));

// ---------------------------------------------------------------- start
$('wait-t').textContent = L.wait; $('wait-r').textContent = room; $('mic').textContent = L.mic;
if (!room || key.length < 12) { $('wait-t').textContent = '×'; }
else screen({ room, key, onPhone, onCommand }).then((l) => { link = l; emit(); }).catch(() => { $('wait-t').textContent = 'Réseau indisponible · Network unavailable'; });
// test hook
window.costage = { S, phones, get cur() { return cur; }, setSims, onCommand, onPhone, present };
