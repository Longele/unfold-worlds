// UNISSON Jam: play a real instrument from the first second, alone, with friends, or with a whole room.
// The player never has to know a chord: on a song, the chord changes by itself with the band and the screen
// shows its real shape and the strum to play; in free mode the six chords of the key are all that is offered,
// so nothing can sound wrong. A loop recorder turns a few bars of playing into a track to keep or share.
import { Engine, playEvent, render } from './engine.js?v=202610242330';
import { CHORDS, chordName, pianoVoicing, SONGS, barMs, loopMs, position, NOTE, INSTRUMENTS, INST } from './songs.js?v=202610242330';
import { screen, phone, randCode, cleanRoom } from '../net.js?v=202610242330';

const $ = (id) => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const T = {
  fr: { homeT: 'Joue d’un vrai instrument. Tout de suite.', homeS: 'Guitare, piano, batterie, marimba. Tu ne peux pas jouer faux : l’app tient les bons accords, toi tu joues.', solo: 'Jouer', soloS: 'Seul, avec un vrai groupe derrière toi', create: 'Créer une salle', createS: 'Entre amis, ou toute une salle sur grand écran', join: 'Rejoindre',
    credits: 'Sons enregistrés : guitare University of Iowa MIS, piano et marimba VSCO 2 CE (CC0), réunis par tonejs-instruments. Grooves produits avec Eleven Music.',
    nowT: 'Joue', nextT: 'Ensuite', rec: 'Enregistrer', stop: 'Arrêter', listen: 'Écouter', clear: 'Effacer', export: 'Garder', players: 'musiciens',
    hint: { gtr: 'Glisse ton doigt sur les cordes', pno: '', mar: '', drm: '' }, chordPad: 'Tiens l’accord', freeT: 'Choisis un accord, puis joue',
    armed: 'Ça enregistre à la prochaine mesure…', recording: (a, b) => `Enregistrement · mesure ${a} sur ${b}`, looping: 'Ta boucle tourne. Change d’instrument et ajoute une couche', freeRec: 'Enregistrement… appuie sur Arrêter', rendering: 'Préparation de ton morceau…', saved: 'Ton morceau est prêt', noBeat: 'Lance le groupe (▶) pour enregistrer en boucle',
    room: (c, n) => `SALLE ${c} · ${n}`, member: 'Le chef de salle choisit le morceau', pads: { kick: 'Grosse caisse', snare: 'Caisse claire', hat: 'Charley', clap: 'Clap', conga: 'Conga', shaker: 'Shaker' }, lost: 'Salle introuvable' },
  en: { homeT: 'Play a real instrument. Right now.', homeS: 'Guitar, piano, drums, marimba. You cannot play wrong: the app holds the right chords, you play.', solo: 'Play', soloS: 'Alone, with a real band behind you', create: 'Create a room', createS: 'With friends, or a whole room on a big screen', join: 'Join',
    credits: 'Recorded sounds: guitar University of Iowa MIS, piano and marimba VSCO 2 CE (CC0), gathered by tonejs-instruments. Grooves produced with Eleven Music.',
    nowT: 'Play', nextT: 'Next', rec: 'Record', stop: 'Stop', listen: 'Listen', clear: 'Clear', export: 'Keep', players: 'players',
    hint: { gtr: 'Slide your finger across the strings', pno: '', mar: '', drm: '' }, chordPad: 'Hold the chord', freeT: 'Pick a chord, then play',
    armed: 'Recording from the next bar…', recording: (a, b) => `Recording · bar ${a} of ${b}`, looping: 'Your loop is playing. Switch instrument and add a layer', freeRec: 'Recording… press Stop', rendering: 'Preparing your track…', saved: 'Your track is ready', noBeat: 'Start the band (▶) to record a loop',
    room: (c, n) => `ROOM ${c} · ${n}`, member: 'The room leader picks the song', pads: { kick: 'Kick', snare: 'Snare', hat: 'Hi-hat', clap: 'Clap', conga: 'Conga', shaker: 'Shaker' }, lost: 'Room not found' },
}[lang];
for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
document.documentElement.lang = lang;

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const id = store.get('jam-id') || randCode(10); store.set('jam-id', id);
let E = null, link = null, role = 'solo', room = null;
let ins = store.get('jam-ins') || 'gtr', songId = 'afro', guided = true, playing = false, t0 = 0, chordSel = null;
const clock = () => (link && role === 'member' ? link.now() : Date.now());
const song = () => SONGS[songId];
const followed = () => guided && playing && !!song().chords;
const curChord = () => (followed() ? position(song(), clock(), t0).chord : chordSel || song().keyChords[0]);

// ---------------------------------------------------------------- entering
const qsRoom = cleanRoom(new URLSearchParams(location.search).get('r'));
if (qsRoom) $('code').value = qsRoom;
async function boot() {
  E = new Engine(clock); await E.c.resume();
  document.body.classList.add('in');
  buildTabs(); buildSongs(); setInstrument(ins);
  await Promise.all([E.load('drm'), E.load('beat:' + (song().beat || 'pop'))]);
}
$('solo').onclick = () => { role = 'solo'; boot(); };
$('create').onclick = async () => {
  role = 'leader'; room = randCode(4); await boot();
  try { link = await screen({ room, onMessage: leaderMsg }); } catch {}
  const url = new URL(`./?r=${room}`, location.href).href; $('joinurl').textContent = url.replace(/^https?:\/\//, '');
  if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); $('qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); }
  bigView(); addEventListener('resize', bigView); roomTag(); setInterval(sendState, 2000);
};
$('join').onclick = async () => {
  const c = cleanRoom($('code').value); if (c.length !== 4) return;
  role = 'member'; room = c; await boot(); document.body.classList.add('member');
  try { link = await phone({ room, onMessage: memberMsg }); } catch { $('roomtag').textContent = T.lost; return; }
  const hello = () => link.post({ t: 'h', id, ins }); hello(); setInterval(hello, 4000);
  await link.sync(6); roomTag();
};
$('back').onclick = () => location.reload();
const bigView = () => document.body.classList.toggle('big', role === 'leader' && innerWidth >= 1000);

// ---------------------------------------------------------------- a room: one leader holds the song and its clock
const members = new Map();
function leaderMsg(m) {
  if (!m) return;
  if (m.t === 'p') { link?.send({ t: 'q', k: m.k, h: Date.now() }); return; }
  if (m.t === 'h' && m.id) { members.set(m.id, { ins: m.ins, last: Date.now() }); roomTag(); }
}
function sendState() { if (role === 'leader') link?.send({ t: 's', song: songId, playing, t0, guided }); }
function memberMsg(m) {
  if (m.t !== 's') return;
  const changed = m.song !== songId || m.playing !== playing || m.t0 !== t0;
  songId = m.song; guided = m.guided; t0 = m.t0;
  if (changed) { playing = m.playing; buildSongs(); E.load('beat:' + (song().beat || 'pop')).then(() => { if (playing && memberBeat && song().beat) E.beatStart(song().beat, t0, loopMs(song()) / 1000); else E.beatStop(); }); refresh(); }
}
let memberBeat = false;
function roomTag() {
  const now = Date.now(); for (const [k, v] of members) if (now - v.last > 12000) members.delete(k);
  const n = role === 'leader' ? members.size + 1 : 0;
  $('roomtag').textContent = role === 'leader' ? T.room(room, n) : role === 'member' ? T.room(room, '') .replace(/ · $/, '') : '';
  $('members').textContent = n;
}
setInterval(() => role === 'leader' && roomTag(), 3000);

// ---------------------------------------------------------------- instrument, song, chords
function buildTabs() {
  $('tabs').innerHTML = INSTRUMENTS.map((k) => `<button data-i="${k}">${INST[k][lang]}</button>`).join('');
  for (const b of $('tabs').children) b.onclick = () => setInstrument(b.dataset.i);
}
async function setInstrument(k) {
  ins = k; store.set('jam-ins', k); E.muteStrings();
  document.body.classList.remove('i-gtr', 'i-pno', 'i-drm', 'i-mar'); document.body.classList.add('i-' + k);
  document.documentElement.style.setProperty('--h', INST[k].hue);
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.i === k);
  $('hint').textContent = T.hint[k];
  if (k !== 'drm') E.load(k); buildSurface(); refresh();
  if (role === 'member') link?.post({ t: 'h', id, ins });
}
function buildSongs() {
  $('songs').innerHTML = Object.entries(SONGS).map(([k, s]) => `<button data-s="${k}" class="${k === songId ? 'on' : ''}" ${role === 'member' ? 'disabled' : ''}>${s[lang]}</button>`).join('');
  for (const b of $('songs').children) b.onclick = () => setSong(b.dataset.s);
}
async function setSong(k) {
  const was = playing; stopBeat(); songId = k; chordSel = song().keyChords[0]; take.events = []; recState = 'idle'; buildSongs(); buildSurface(); refresh();
  if (song().beat) { await E.load('beat:' + song().beat); if (was) startBeat(); }
  sendState();
}
function startBeat() {
  if (!song().beat) { playing = false; refresh(); return; }
  playing = true; t0 = clock() + 60; E.beatStart(song().beat, t0, loopMs(song()) / 1000); refresh(); sendState();
}
function stopBeat() { playing = false; E?.beatStop(); refresh(); sendState(); }
$('beat').onclick = () => {
  if (role === 'member') { memberBeat = !memberBeat; if (memberBeat && playing && song().beat) E.beatStart(song().beat, t0, loopMs(song()) / 1000); else E.beatStop(); refresh(); return; }
  playing ? stopBeat() : startBeat();
};
function buildChords() {
  $('chords').innerHTML = song().keyChords.map((c) => `<button data-c="${c}" class="${c === curChord() ? 'on' : ''}">${chordName(c, lang)}<small>${CHORDS[c].frets}</small></button>`).join('');
  for (const b of $('chords').children) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); chordSel = b.dataset.c; E.muteStrings(E.now()); for (const x of $('chords').children) x.classList.toggle('on', x === b); if (ins === 'pno') pianoChord('free', true, b); drawDiag(); markKeys(); });
    b.addEventListener('pointerup', () => ins === 'pno' && pianoChord('free', false, b)); b.addEventListener('pointerleave', () => ins === 'pno' && pianoChord('free', false, b));
  }
}
function refresh() {
  document.body.classList.toggle('free', !followed());
  $('beat').textContent = role === 'member' ? '♪' : playing ? '■' : '▶';
  $('beat').classList.toggle('off', role === 'member' ? !memberBeat : !playing);
  $('beat').style.visibility = song().beat ? '' : 'hidden';
  buildChords(); drawDiag(); markKeys(); recUI();
  const p = song().pattern; $('pattern').innerHTML = p && ins === 'gtr' ? p.map((x) => `<span class="${x ? 'k' : ''}">${x === 'D' ? '↓' : x === 'U' ? '↑' : '·'}</span>`).join('') : '';
  $('pattern').style.display = p && ins === 'gtr' && followed() ? '' : 'none';
}

// a chord box: the real fingering, for the guitar
function drawDiag(c = curChord()) {
  const ch = CHORDS[c]; if (!ch) return;
  let s = ''; const X = (i) => 8 + i * 8.8, Y = (f) => 14 + f * 13;
  for (let i = 0; i < 6; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(4)}"/>`;
  for (let f = 0; f <= 4; f++) s += `<line x1="${X(0)}" y1="${Y(f)}" x2="${X(5)}" y2="${Y(f)}" ${f === 0 ? 'style="stroke-width:2.5"' : ''}/>`;
  const fr = [...ch.frets].map((x) => (x === 'x' ? -1 : +x)), lo = Math.min(...fr.filter((x) => x > 0)), shift = lo > 3 ? lo - 1 : 0;
  fr.forEach((f, i) => { if (f < 0) s += `<text x="${X(i)}" y="9">×</text>`; else if (f === 0) s += `<text x="${X(i)}" y="9">○</text>`; else s += `<circle class="f" cx="${X(i)}" cy="${Y(f - shift) - 6.5}" r="3.4"/>`; });
  if (shift) s += `<text x="${X(5) + 7}" y="${Y(1) - 3}">${shift + 1}</text>`;
  $('diag').innerHTML = s; $('diag').style.display = ins === 'gtr' ? '' : 'none';
}

// ---------------------------------------------------------------- the playing surfaces
const cv = $('strings'), g = cv.getContext('2d');
let W = 0, H = 0, vib = Array.from({ length: 6 }, () => ({ a: 0, ph: 0 }));
function fit() { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', fit);
const stringY = (i) => H * (0.1 + 0.8 * (i + 0.5) / 6);
function pluck(i, v, t = E.now()) {
  const m = CHORDS[curChord()]?.gtr[i];
  vib[i].a = m == null ? 0.15 : 0.5 + 0.5 * v;
  if (m == null) return;
  E.string(i, m, t, v); capture({ k: 's', i, m, v });
  document.body.classList.add('played');
}
const ptr = new Map();
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); cv.setPointerCapture(e.pointerId);
  const y = e.offsetY; ptr.set(e.pointerId, { y, t: performance.now() });
  for (let i = 0; i < 6; i++) if (Math.abs(stringY(i) - y) < H * 0.05) pluck(i, 0.6);
});
cv.addEventListener('pointermove', (e) => {
  const p = ptr.get(e.pointerId); if (!p) return;
  const y = e.offsetY, now = performance.now(), dy = y - p.y, dt = Math.max(1, now - p.t), v = Math.min(1, 0.3 + (Math.abs(dy) / dt) * 0.45);
  const crossed = []; for (let i = 0; i < 6; i++) { const s = stringY(i); if ((p.y < s && y >= s) || (p.y > s && y <= s)) crossed.push(i); }
  if (dy < 0) crossed.reverse();
  crossed.forEach((i, k) => pluck(i, v, E.now() + k * 0.006)); // a fast strum still spreads over the strings, like a pick
  p.y = y; p.t = now;
});
const endPtr = (e) => ptr.delete(e.pointerId); cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
function drawStrings() {
  if (ins !== 'gtr' || !W) return;
  g.clearRect(0, 0, W, H);
  const hue = INST.gtr.hue, ch = CHORDS[curChord()];
  // a guitar top at a glance: warm spruce, its grain, the sound hole and its rosette under the strings
  const wood = g.createLinearGradient(0, 0, W, H); wood.addColorStop(0, '#3a2414'); wood.addColorStop(0.5, '#4a2e18'); wood.addColorStop(1, '#2a190d'); g.fillStyle = wood; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,220,170,0.035)'; g.lineWidth = 1; for (let x = 7; x < W; x += 9) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 3, H * 0.3, x - 3, H * 0.7, x + 1, H); g.stroke(); }
  const cx = W * 0.62, cy = H * 0.5, R = Math.min(W * 0.3, H * 0.34);
  const hole = g.createRadialGradient(cx, cy, 0, cx, cy, R); hole.addColorStop(0, '#050302'); hole.addColorStop(0.85, '#0c0704'); hole.addColorStop(1, '#1a0f07'); g.fillStyle = hole; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  for (const [k, a] of [[1.08, 0.35], [1.15, 0.2], [1.2, 0.35]]) { g.strokeStyle = `rgba(230,190,130,${a})`; g.lineWidth = k === 1.15 ? 5 : 1.5; g.beginPath(); g.arc(cx, cy, R * k, 0, 7); g.stroke(); }
  const shine = g.createLinearGradient(0, 0, 0, H); shine.addColorStop(0, 'rgba(255,230,190,0.06)'); shine.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = shine; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const y = stringY(i), s = vib[i], th = 1 + (5 - i) * 0.45, muted = ch && ch.gtr[i] == null;
    s.ph += 0.9 + i * 0.12; s.a *= 0.955;
    g.strokeStyle = muted ? 'rgba(244,239,230,0.14)' : `hsla(${i < 3 ? 38 : 45},${i < 3 ? 55 : 10}%,${70 + 20 * s.a}%,${0.6 + 0.4 * s.a})`; g.lineWidth = th; // bronze wound strings low, plain steel high
    g.beginPath();
    for (let x = 0; x <= W; x += 6) { const env = Math.sin((Math.PI * x) / W), yy = y + Math.sin(s.ph + x * 0.045) * s.a * 7 * env; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
    if (s.a > 0.05) { g.strokeStyle = `hsla(${hue},95%,75%,${s.a * 0.25})`; g.lineWidth = th + 8 * s.a; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = muted ? 'rgba(244,239,230,0.2)' : 'rgba(244,239,230,0.55)'; g.font = '10px JetBrains Mono, monospace'; g.fillText(muted ? '×' : NOTE[lang][ch.gtr[i] % 12], 10, y - 6);
  }
}
// piano: a chord pad that follows the song, and the keys of the scale
const voices = new Map();
function pianoChord(key, on, el) {
  if (on) { const notes = pianoVoicing(curChord()); E.chordOn(key, notes, E.now(), 0.75); el?.classList.add('down'); voices.set(key, { at: clock(), notes, chord: curChord() }); document.body.classList.add('played'); }
  else { const v = voices.get(key); if (!v) return; E.chordOff(key); el?.classList.remove('down'); capture({ k: 'c', id: key + Math.random(), m: v.notes, v: 0.75, d: clock() - v.at }, v.at); voices.delete(key); }
}
function buildSurface() {
  // the chord pad (piano, on a song)
  $('pad').innerHTML = `<button id="padb">${chordName(curChord(), lang)}<small>${T.chordPad}</small></button>`;
  const pb = $('padb'); pb.onpointerdown = (e) => { e.preventDefault(); pianoChord('pad', true, pb); }; pb.onpointerup = pb.onpointerleave = () => pianoChord('pad', false, pb);
  // keys: the scale of the song, two octaves, the low one at the bottom
  const sc = song().scale, low = sc.slice(0, 7), high = sc.slice(7);
  const row = (notes) => `<div class="row" style="grid-template-columns:repeat(${notes.length},1fr)">${notes.map((m) => `<button data-m="${m}">${NOTE[lang][m % 12]}</button>`).join('')}</div>`;
  $('keys').innerHTML = row(high) + row(low);
  for (const b of $('keys').querySelectorAll('button')) {
    b.onpointerdown = (e) => { e.preventDefault(); const m = +b.dataset.m, k = ins === 'mar' ? 'mar' : 'pno', v = 0.7 + Math.random() * 0.1; const n = E.note(k, m, E.now(), v, k === 'pno' ? 0.8 : 1); b.classList.add('down'); voices.set(b, { n, at: clock(), m, k, v }); document.body.classList.add('played'); };
    b.onpointerup = b.onpointerleave = () => { const v = voices.get(b); if (!v) return; b.classList.remove('down'); if (v.k === 'pno') v.n?.stop(E.now(), 0.3); capture({ k: 'n', ins: v.k, m: v.m, v: v.v, d: v.k === 'pno' ? clock() - v.at : 0 }, v.at); voices.delete(b); };
  }
  // drums
  $('drums').innerHTML = Object.keys(T.pads).map((k) => `<button data-d="${k}">${T.pads[k]}<small>${k}</small></button>`).join('');
  for (const b of $('drums').children) b.onpointerdown = (e) => { e.preventDefault(); const v = 0.85; E.drum(b.dataset.d, E.now(), v); capture({ k: 'd', m: b.dataset.d, v }); b.classList.remove('down'); void b.offsetWidth; b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); };
  markKeys(); requestAnimationFrame(fit);
}
// the notes of the chord sounding now light up on the keys: the safest notes for a melody
function markKeys() { const pc = CHORDS[curChord()]?.pc || []; for (const b of $('keys').querySelectorAll('button')) b.classList.toggle('ct', pc.includes(+b.dataset.m % 12)); const pb = $('padb'); if (pb) pb.firstChild.textContent = chordName(curChord(), lang); }

// ---------------------------------------------------------------- the loop recorder
const take = { loop: 0, events: [] };
let recState = 'idle', recStart = 0, recEnd = 0, listenOn = true, freeLoop = false, sched = new Map();
function capture(ev, at = clock()) {
  if (recState !== 'recording') return;
  if (at < recStart) return;
  const L = take.loop || loopMs(song());
  ev.t = freeLoop ? at - recStart : ((at - t0) % L + L) % L; ev.ins = ev.ins || (ev.k === 's' ? 'gtr' : ev.k === 'd' ? 'drm' : ins);
  take.events.push(ev);
}
$('rec').onclick = () => {
  if (recState === 'recording' && freeLoop) { take.loop = Math.max(1000, clock() - recStart); t0 = recStart; recState = 'looping'; recUI(); return; }
  if (recState === 'armed' || recState === 'recording') return;
  if (playing) { // on the band: from the next bar, for one turn of the loop (overdubs stack up)
    const B = barMs(song()), now = clock(); recStart = t0 + Math.ceil((now - t0 + 80) / B) * B; take.loop = loopMs(song()); recEnd = recStart + take.loop; freeLoop = false; recState = 'armed';
  } else { // no band: record until stopped, then it loops as it was played
    if (take.events.length) take.events = []; freeLoop = true; recStart = clock(); recState = 'recording';
  }
  recUI();
};
$('listen').onclick = () => { listenOn = !listenOn; recUI(); };
$('clear').onclick = () => { take.events = []; recState = 'idle'; sched.clear(); recUI(); };
$('export').onclick = async () => {
  if (!take.events.length) return;
  $('recst').textContent = T.rendering;
  const blob = await render(E, take, freeLoop ? { beat: null } : song(), 2), file = new File([blob], 'unisson.wav', { type: 'audio/wav' });
  $('recst').textContent = T.saved;
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'UNISSON' }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'unisson.wav'; a.click();
};
function recUI() {
  const r = $('rec'); r.classList.toggle('on', recState === 'recording' || recState === 'armed');
  r.querySelector('span').textContent = recState === 'recording' && freeLoop ? T.stop : T.rec;
  const has = take.events.length > 0;
  $('listen').disabled = $('clear').disabled = $('export').disabled = !has;
  $('listen').style.opacity = has && !listenOn ? 0.5 : '';
  let s = '';
  if (recState === 'armed') s = T.armed;
  else if (recState === 'recording') s = freeLoop ? T.freeRec : T.recording(Math.min(song().bars, Math.floor((clock() - recStart) / barMs(song())) + 1), song().bars);
  else if (recState === 'looping' && has) s = T.looping;
  $('recst').textContent = s;
}
// the scheduler: the recording's state, and the take replayed on the loop
setInterval(() => {
  if (!E) return;
  const now = clock();
  if (recState === 'armed' && now >= recStart) { recState = 'recording'; recUI(); }
  if (recState === 'recording' && !freeLoop) { if (now >= recEnd) { recState = 'looping'; } recUI(); }
  if (!take.events.length || !listenOn) return;
  const looped = freeLoop ? recState === 'looping' : playing;
  if (!looped) return;
  // an event just played live has its next turn one loop later, so a new layer is never doubled
  const L = take.loop;
  for (const ev of take.events) {
    const occ = t0 + Math.ceil((now - t0 - ev.t) / L) * L + ev.t;
    if (occ < now + 140 && sched.get(ev) !== occ) { sched.set(ev, occ); playEvent(E, ev, E.at(occ)); }
  }
}, 25);

// ---------------------------------------------------------------- the frame: the guide moves with the band
let lastChord = '';
function frame() {
  requestAnimationFrame(frame);
  if (!E) return;
  const s = song();
  if (followed()) {
    const p = position(s, clock(), t0);
    $('cnow').textContent = chordName(p.chord, lang); $('cnext').textContent = chordName(p.next, lang);
    $('prog').style.setProperty('--p', p.f.toFixed(3));
    const cells = $('pattern').children; for (let i = 0; i < cells.length; i++) cells[i].classList.toggle('now', i === p.eighth);
    if (p.chord !== lastChord) {
      if (lastChord) { E.muteStrings(E.now() + 0.01); for (const [k] of voices) if (typeof k === 'string') { const el = k === 'pad' ? $('padb') : null; pianoChord(k, false, el); pianoChord(k, true, el); } }
      lastChord = p.chord; drawDiag(); markKeys();
    }
  } else if (lastChord !== 'free:' + curChord()) { lastChord = 'free:' + curChord(); $('cnow').textContent = chordName(curChord(), lang); drawDiag(); markKeys(); }
  drawStrings();
}
requestAnimationFrame(frame);
window.__jam = { get E() { return E; }, take, get state() { return { ins, songId, playing, recState, chord: curChord(), followed: followed(), members: members.size }; }, setSong, setInstrument, startBeat };
