// NOCTURNE: a calm first lesson at the piano, then the instrument is yours.
import { Piano3D } from './piano3d.js';
import { Sound } from './sound.js';
import { CAPTIONS } from './captions.js';
import { SONGS, timeline, notesOf } from './songs.js';

const $ = (id) => document.getElementById(id);
const T = {
  en: { tag: 'Piano, simply.', learn: 'Learn the basics', learnS: 'ten minutes, guided by voice', free: 'Just play', freeS: 'there are no wrong notes', tuning: 'tuning the piano', ready: 'best with headphones',
    replay: 'Replay', next: 'Next', prev: 'Back', exit: 'Free play', notes: 'Notes', pedal: 'Pedal', rain: 'Rain', lesson: 'Lesson', midi: 'MIDI', midiOn: 'MIDI piano connected', midiNo: 'No MIDI keyboard found', midiOff: 'MIDI piano unplugged', midiHint: 'A MIDI piano? Plug it into the computer and connect it here',
    songs: 'Songs', kids: 'Nursery songs', classic: 'Classical', listen: 'Listen', play: 'Play', bravo: 'Well played',
    pause: 'Pause', paused: 'Paused', resume: 'Tap to continue', restart: 'Restart', back: 'Rewind', show: 'Show me', lh: 'Left hand', stop: 'Stop', speed: 'Speed',
    titles: { lune: 'Au clair de la lune', mary: 'Mary Had a Little Lamb', jacques: 'Frère Jacques', twinkle: 'Twinkle, Twinkle, Little Star', jingle: 'Jingle Bells',
      ode: 'Ode to Joy', largo: 'New World Symphony, Largo', lullaby: 'Lullaby', canon: 'Canon in D', grieg: 'In the Hall of the Mountain King', minuet: 'Minuet in G', elise: 'Für Elise', gymno: 'Gymnopédie No. 1', prelude: 'Prelude in C' },
    by: { Petzold: 'Petzold (attr. Bach)' },
    labels: { none: 'Notes off', names: 'Note names', keys: 'Computer keys' }, turn: 'Turn your phone sideways', turnS: 'for the whole keyboard', stay: 'Continue upright', done: 'The piano is yours', credit: 'Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0' },
  fr: { tag: 'Le piano, simplement.', learn: 'Apprendre les bases', learnS: 'dix minutes, guidé par la voix', free: 'Jouer librement', freeS: 'il n’y a pas de fausse note', tuning: 'accordage du piano', ready: 'meilleur avec un casque',
    replay: 'Réécouter', next: 'Suivant', prev: 'Précédent', exit: 'Jeu libre', notes: 'Notes', pedal: 'Pédale', rain: 'Pluie', lesson: 'Leçon', midi: 'MIDI', midiOn: 'Piano MIDI branché', midiNo: 'Aucun clavier MIDI trouvé', midiOff: 'Piano MIDI débranché', midiHint: 'Un piano MIDI ? Branchez-le à l’ordinateur et connectez-le ici',
    songs: 'Chansons', kids: 'Comptines', classic: 'Classique', listen: 'Écouter', play: 'Jouer', bravo: 'Bien joué',
    pause: 'Pause', paused: 'En pause', resume: 'Touchez pour reprendre', restart: 'Début', back: 'Reculer', show: 'Montre-moi', lh: 'Main gauche', stop: 'Arrêter', speed: 'Vitesse',
    titles: { lune: 'Au clair de la lune', mary: 'Mary avait un petit agneau', jacques: 'Frère Jacques', twinkle: 'Ah ! vous dirai-je, maman', jingle: 'Vive le vent',
      ode: 'Hymne à la joie', largo: 'Symphonie du Nouveau Monde, Largo', lullaby: 'Berceuse', canon: 'Canon en ré', grieg: 'Dans l’antre du roi de la montagne', minuet: 'Menuet en sol', elise: 'Lettre à Élise', gymno: 'Gymnopédie n° 1', prelude: 'Prélude en do' },
    by: { Petzold: 'Petzold (attribué à Bach)' },
    labels: { none: 'Notes masquées', names: 'Noms des notes', keys: 'Touches du clavier' }, turn: 'Tournez votre téléphone', turnS: 'pour avoir tout le clavier', stay: 'Continuer en portrait', done: 'Le piano est à vous', credit: 'Piano : Salamander Grand Piano par Alexander Holm, CC BY 3.0' },
};
const NAMES = { en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'], fr: ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'] };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('nocturne-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!T[lang]) lang = 'en';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleOf = (id) => T[lang].titles[id] || id;

// ------------------------------------------------------------------ instrument
const piano = new Piano3D($('gl'));
// a browser without Web Audio still gets the whole experience, silently
function quietSound() {
  const ctx = { get currentTime() { return performance.now() / 1000; }, state: 'running', resume: async () => {}, suspend: async () => {} };
  const base = { ctx, buf: new Map([[60, 1]]), lines: new Map(), voices: new Map(), speaking: false, rainOn: false, sustain: false };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : k === 'say' ? () => sleep(1500) : () => Promise.resolve()) });
}
const sound = (() => { try { return new Sound('.'); } catch { return quietSound(); } })();
const portrait = () => innerWidth < innerHeight;
let span = null; // the notes a song needs, so the keyboard grows to fit it
let midiLive = false; // a MIDI piano is connected: show more of the keyboard
const range = () => { const b = portrait() ? [60, 74] : midiLive ? [36, 84] : [48, 76]; return span ? [Math.min(b[0], span[0]), Math.max(b[1], span[1])] : b; };
function setSpan(id) {
  if (id) { const ms = notesOf(id); let lo = Math.min(...ms), hi = Math.max(...ms); if ([1, 3, 6, 8, 10].includes(lo % 12)) lo--; if ([1, 3, 6, 8, 10].includes(hi % 12)) hi++; span = [lo, hi]; } else span = null;
  piano.setRange(...range()); applyLabels();
}
piano.setRange(...range()); piano.setView('intro');
addEventListener('resize', () => { piano.setRange(...range()); applyLabels(); if (lesson.step) lesson.refresh(); if (songs.cur) songs.show(); });

// computer keyboard: the home row is a keyboard (layout-independent physical keys)
const KEYMAP = { KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64, KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69, KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73, KeyL: 74, KeyP: 75, Semicolon: 76 };
const keyLetter = {};
for (const [code, m] of Object.entries(KEYMAP)) keyLetter[m] = code === 'Semicolon' ? ';' : code.slice(3);
navigator.keyboard?.getLayoutMap?.().then((map) => { for (const [code, m] of Object.entries(KEYMAP)) { const l = map.get(code); if (l) keyLetter[m] = l.toUpperCase(); } if (labelMode === 'keys') applyLabels(); }).catch(() => {});
const nameOf = (m) => NAMES[lang][((m % 12) + 12) % 12];
let labelMode = 'none';
function applyLabels() { piano.setLabels(labelMode, nameOf, (m) => keyLetter[m] || ''); }

const held = new Map(); // midi -> count of sources holding it
const pressedAt = new Map();
// real: the key actually struck (a MIDI piano may play a note in another octave than the one shown)
function noteOn(m, vel = 0.75, real = m) {
  if (paused) return;
  sound.unlock();
  held.set(m, (held.get(m) || 0) + 1);
  sound.noteOn(real, vel); piano.press(m, vel);
  pressedAt.set(m, performance.now());
  lesson.onNote(m); songs.onNote(m);
}
function noteOff(m, real = m) {
  if (real !== m) sound.noteOff(real);
  const n = (held.get(m) || 0) - 1;
  if (n > 0) { held.set(m, n); return; }
  held.delete(m); if (real === m) sound.noteOff(m); piano.release(m);
}

// pointers: each finger holds one key and can slide across keys (glissando)
const ptr = new Map();
const canvas = $('gl');
canvas.addEventListener('pointerdown', (e) => {
  if (!started) return;
  const h = piano.pick(e.clientX, e.clientY); if (!h) return;
  canvas.setPointerCapture?.(e.pointerId);
  const k = piano.keys.get(h.m), front = k ? k.g.position.z + (k.black ? 3.9 : 6) : 3;
  const vel = Math.max(0.35, Math.min(0.95, 0.95 - (front - h.depth) * 0.08)); // nearer the front edge, the fuller the note
  ptr.set(e.pointerId, h.m); noteOn(h.m, vel);
  if (e.pointerType === 'touch') navigator.vibrate?.(8);
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr.has(e.pointerId)) return;
  const h = piano.pick(e.clientX, e.clientY), cur = ptr.get(e.pointerId);
  if (!h || h.m === cur) return;
  noteOff(cur); ptr.set(e.pointerId, h.m); noteOn(h.m, 0.6);
});
const up = (e) => { const m = ptr.get(e.pointerId); if (m == null) return; ptr.delete(e.pointerId); noteOff(m); };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const kdown = new Set();
addEventListener('keydown', (e) => {
  if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Escape') { pause(!paused); return; }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) setPedal(true); return; }
  const m = KEYMAP[e.code]; if (m == null || e.repeat || kdown.has(e.code)) return;
  e.preventDefault(); kdown.add(e.code); noteOn(m, 0.72);
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space') { setPedal(pedalLatched); return; }
  const m = KEYMAP[e.code]; if (m == null || !kdown.has(e.code)) return;
  kdown.delete(e.code); noteOff(m);
});
addEventListener('blur', () => { for (const c of kdown) noteOff(KEYMAP[c]); kdown.clear(); });

// pedal: held with Space or a MIDI pedal, or latched from the toolbar
let pedalLatched = false;
function setPedal(on) { sound.setSustain(on); $('b-pedal').classList.toggle('on', on); }

// MIDI pianos (Chrome, Edge, Opera; Firefox asks first; Safari has no MIDI). Once allowed, the piano is found again
// on the next visit, and plugging or unplugging it is noticed. A real piano has more octaves than the screen: the
// key struck sounds as it is, but for the lesson and the songs the right note in any octave counts, and it lights
// up the key it stands for on screen.
let midiAcc = null, midiNames = '';
async function midi(quiet = false) {
  try {
    midiAcc = midiAcc || await navigator.requestMIDIAccess();
    store.set('nocturne-midi', '1');
    const bind = () => {
      const ins = [...midiAcc.inputs.values()].filter((i) => i.state !== 'disconnected'); for (const inp of ins) inp.onmidimessage = onMidi;
      const names = ins.map((i) => i.name).join(', '), was = midiLive; midiLive = ins.length > 0;
      if (names !== midiNames || !quiet) toast(midiLive ? `${T[lang].midiOn} : ${ins[0].name || 'MIDI'}` : was ? T[lang].midiOff : T[lang].midiNo);
      midiNames = names; quiet = true;
      $('b-midi').classList.toggle('on', midiLive); document.body.classList.toggle('midi', midiLive); const hs = $('midi-hint')?.querySelector('span'); if (hs) hs.textContent = midiLive ? `${T[lang].midiOn} : ${ins[0].name || 'MIDI'}` : T[lang].midiHint;
      if (midiLive !== was) { piano.setRange(...range()); applyLabels(); if (lesson.step) lesson.refresh(); if (songs.cur) songs.show(); }
    };
    midiAcc.onstatechange = bind; bind();
  } catch { if (!quiet) toast(T[lang].midiNo); }
}
// the notes the lesson or the song waits for right now
function wanted() {
  if (mode === 'song' && songs.cur && songs.seq?.[songs.idx]) return [songs.seq[songs.idx].m];
  const w = lesson.w; if (mode !== 'lesson' || !w) return [];
  if (w.seq) return [w.seq[w.idx]];
  if (w.chords) return w.chords[w.ch] || [];
  if (w.all) return w.all().filter((c) => !w.got.has(c));
  if (w.pc != null) return cs();
  return [];
}
// the key on screen a MIDI note stands for: the awaited note of the same name, else the same note brought into view
function shownFor(m) {
  const w = wanted().find((n) => n % 12 === m % 12); if (w != null) return w;
  const [lo, hi] = range(); let s = m; while (s < lo) s += 12; while (s > hi) s -= 12; return s;
}
const midiHeld = new Map();
function onMidi(ev) {
  const [st, a, b] = ev.data, cmd = st & 0xf0;
  if (cmd === 0x90 && b > 0) { if (!started) return; const s = shownFor(a); midiHeld.set(a, s); noteOn(s, Math.max(0.2, b / 127), a); }
  else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) { const s = midiHeld.get(a); if (s == null) return; midiHeld.delete(a); noteOff(s, a); }
  else if (cmd === 0xb0 && a === 64) setPedal(b >= 64 || pedalLatched);
}

// pause: everything stops where it is (voice, playback, rain), one tap brings it back
let paused = false;
function pause(on) {
  if (!started || on === paused) return;
  paused = on;
  $('pause').classList.toggle('on', on);
  for (const b of document.querySelectorAll('.b-pause')) b.classList.toggle('on', on);
  if (on) { sound.allOff?.(); sound.ctx.suspend?.().catch?.(() => {}); } else sound.ctx.resume?.().catch?.(() => {});
}

// ------------------------------------------------------------------ lesson
const STEPS = [
  { v: 'welcome' },
  { v: 'pattern', during: [[4200, 'twos'], [7400, 'threes'], [10500, 'off']] },
  { v: 'touch', wait: { any: 3 }, praise: true },
  { v: 'findc', during: [[1600, 'twos']], wait: { pc: 0 }, hintAfter: 9000, hint: () => cs() },
  { v: 'allc', wait: { all: () => cs() }, praise: true },
  { v: 'names', labels: true, wait: { seq: [60, 62, 64, 65, 67, 69, 71, 72] }, praise: true },
  { v: 'hand', badges: { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 }, wait: { seq: [60, 62, 64, 65, 67] }, praise: true },
  { v: 'lune', badges: { 60: 1, 62: 2, 64: 3 }, wait: { seq: notesOf('lune') } },
  { v: 'lune_done', after: () => playSong('lune') },
  { v: 'jacques', badges: { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 }, wait: { seq: notesOf('jacques') }, praise: true },
  { v: 'ode', wait: { seq: notesOf('ode').slice(0, 15) } },
  { v: 'beethoven', after: () => playSong('ode') },
  { v: 'twinkle', wait: { seq: notesOf('twinkle').slice(0, 14) } },
  { v: 'twinkle_done', after: () => playSong('twinkle', { count: 14 }) },
  { v: 'black', wait: { seq: [61] }, praise: true },
  { v: 'chord', wait: { chords: [[60, 64, 67]] } },
  { v: 'chordyes' },
  { v: 'chords', wait: { chords: [[65, 69, 72], [67, 71, 74], [60, 64, 67]] }, praise: true },
  { v: 'outro', end: true },
];
const IDS = [...new Set([...STEPS.map((s) => s.v), 'free', 'praise1', 'praise2', 'praise3'])];
const cs = () => { const [lo, hi] = range(); const out = []; for (let m = lo; m <= hi; m++) if (m % 12 === 0) out.push(m); return out; };
const groups = (n) => { const [lo, hi] = range(); const out = []; for (let m = lo; m <= hi; m++) { const pc = m % 12; if (n === 2 ? pc === 1 || pc === 3 : pc === 6 || pc === 8 || pc === 10) out.push(m); } return out; };

const lesson = {
  i: -1, step: null, run: 0, w: null, voiceDone: false, timers: [],
  async go(i) {
    const run = ++this.run;
    this.clear();
    if (i >= STEPS.length) return toFree(true);
    this.i = i = Math.max(0, i); const st = this.step = STEPS[i];
    $('prog').style.setProperty('--p', `${(i / (STEPS.length - 1)) * 100}%`);
    if (st.labels && labelMode === 'none') { labelMode = 'names'; applyLabels(); }
    if (st.badges) for (const [m, n] of Object.entries(st.badges)) piano.setBadge(+m, n);
    this.w = st.wait ? { ...st.wait, n: 0, idx: 0, got: new Set(), ch: 0, miss: 0 } : null;
    this.voiceDone = false; this.early = false;
    for (const [at, what] of st.during || []) this.timers.push(setTimeout(() => this.show(what), at));
    if (st.hintAfter) this.timers.push(setTimeout(() => { if (this.w) piano.hint(st.hint()); }, st.hintAfter));
    this.refresh();
    caption(CAPTIONS[lang][st.v]);
    await sound.say(st.v);
    if (run !== this.run) return;
    this.voiceDone = true; this.refresh();
    if (st.after) { await st.after(); if (run !== this.run) return; }
    if (this.early) return this.success(run);
    if (!st.wait) { await sleep(st.end ? 600 : 700); if (run === this.run) st.end ? toFree(true) : this.go(i + 1); }
  },
  show(what) {
    if (what === 'twos') piano.setTargets(groups(2), true);
    else if (what === 'threes') piano.setTargets(groups(3), true);
    else piano.setTargets([]);
  },
  // which keys glow: the next one of a sequence (and, faintly, the one after), the chord, the C's not found yet
  refresh() {
    const w = this.w; if (!w) { piano.guide(null); dots(0, 0); return; }
    let tg = [], ghost = [];
    if (w.seq) { tg = this.voiceDone || w.idx > 0 ? [w.seq[w.idx]] : []; if (tg.length && w.seq[w.idx + 1] != null && w.seq[w.idx + 1] !== tg[0]) ghost = [w.seq[w.idx + 1]]; }
    else if (w.chords) tg = this.voiceDone ? w.chords[w.ch] : [];
    else if (w.all) tg = this.voiceDone ? w.all().filter((m) => !w.got.has(m)) : [];
    piano.setTargets(tg, true, ghost); piano.guide(tg);
    if (w.seq) dots(w.seq.length, w.idx); else if (w.chords) dots(w.chords.length, w.ch); else if (w.all) dots(w.all().length, w.got.size); else if (w.any) dots(w.any, w.n); else dots(0, 0);
  },
  onNote(m) {
    const w = this.w; if (!w || !started || mode !== 'lesson') return;
    let ok = false, good = false;
    if (w.any) { ok = ++w.n >= w.any; good = true; }
    else if (w.pc != null) { ok = good = m % 12 === w.pc; }
    else if (w.all) { if (m % 12 === 0 && !w.got.has(m)) { w.got.add(m); good = true; } ok = w.all().every((c) => w.got.has(c)); }
    else if (w.seq) { if (m === w.seq[w.idx]) { w.idx++; good = true; } ok = w.idx >= w.seq.length; }
    else if (w.chords) {
      // all three within two seconds: real chords on a keyboard, one after another with a mouse
      const now = performance.now(), c = w.chords[w.ch];
      if (c.includes(m)) piano.ripple(m, 0xffe2b0);
      if (c.every((n) => held.has(n) || now - (pressedAt.get(n) || -1e9) < 2000)) { w.ch++; c.forEach((n) => { pressedAt.delete(n); piano.ripple(n, 0x9dffc8); }); sound.chime(91); }
      ok = w.ch >= w.chords.length;
    }
    // right note: a ring of light on it; a wrong one twice in a row: the guide pulses where to go
    if (good) { piano.ripple(m, 0x9dffc8); w.miss = 0; }
    else if (!w.chords && (w.seq || w.pc != null || w.all)) { if (++w.miss >= 2) { w.miss = 0; const tg = w.seq ? [w.seq[w.idx]] : w.pc != null ? cs() : w.all().filter((c) => !w.got.has(c)); piano.hint(tg); } }
    if (!ok) { this.refresh(); return; }
    if (!this.voiceDone) { this.early = true; this.w = null; piano.setTargets([]); piano.guide(null); return; } // done before the voice finished: move on when it does
    this.success(this.run);
  },
  async success(run) {
    const st = this.step; this.w = null; piano.setTargets([]); piano.guide(null); $('dots').classList.add('done');
    await sleep(450);
    if (run !== this.run) return;
    sound.chime(84 + (this.i % 3) * 4);
    if (st.praise) { await sleep(500); await sound.say('praise' + (1 + (this.i % 3))); }
    await sleep(600);
    if (run === this.run) this.go(this.i + 1);
  },
  clear() { this.timers.forEach(clearTimeout); this.timers = []; piano.setTargets([]); piano.guide(null); piano.clearBadges(); this.w = null; sound.stopVoice(); stopSong(); dots(0, 0); },
  stop() { this.run++; this.clear(); this.step = null; },
};

// ------------------------------------------------------------------ playback
// the piano plays a song (or a slice of it: from one melody note, a few notes) with its left hand
async function playSong(id, { alive, from = 0, count = Infinity, tempo = 1, lh = true } = {}) {
  const tl = timeline(id), q = SONGS[id].q / tempo;
  const rh = tl.rh.slice(from, from + count); if (!rh.length) return;
  const t0 = from === 0 ? 0 : rh[0].t;
  const tEnd = from + count >= tl.rh.length ? tl.end : tl.rh[from + count].t;
  const ev = rh.map((e) => [e.t, e.m, e.d, 0.64]);
  if (lh) for (const e of tl.lh) if (e.t >= t0 && e.t < tEnd) ev.push([e.t, e.m, e.d, 0.34]);
  const run = lesson.run; alive ||= () => lesson.run === run;
  const start = sound.ctx.currentTime + 0.2, live = [];
  for (const [t, m, d, v] of ev) {
    const at = (t - t0) * q, dur = d * q * 0.94;
    live.push(sound.noteOn(m, v, start + at)); sound.noteOff(m, start + at + dur);
    setTimeout(() => { if (alive() && !paused) piano.press(m, v); }, (at + 0.2) * 1000);
    setTimeout(() => piano.release(m), (at + 0.2 + dur) * 1000);
  }
  playSong.cur = live;
  // wait for it, but a pause holds the wait too
  let left = ((tEnd - t0) * q + 1.1) * 1000;
  while (left > 0 && alive()) { await sleep(100); if (!paused) left -= 100; }
}
// a playback someone interrupts: silence everything scheduled
function stopSong() { for (const v of playSong.cur || []) if (v && v.g) sound.damp(v, sound.ctx.currentTime, 0.08); playSong.cur = null; }

// ------------------------------------------------------------------ songs (free play)
// pick a song, listen, then play it at your pace: the light shows the next note, the left hand follows you.
// Rewind, restart, "show me" the next notes, slower or faster, with or without the left hand, pause.
const TEMPI = [1, 0.75, 0.5];
const songs = {
  cur: null, idx: 0, miss: 0, token: 0, tempo: 1, lh: true, busy: false,
  list() {
    const t = T[lang], ids = Object.keys(SONGS);
    $('songs-l').innerHTML = ['kids', 'classic'].map((cat) => `<li class="cat">${t[cat]}</li>` + ids.filter((id) => SONGS[id].cat === cat).map((id) => {
      const s = SONGS[id], by = s.by ? (t.by[s.by] || s.by) : '';
      return `<li><span class="nm">${titleOf(id)}${by ? `<small>${by}</small>` : ''}</span><span class="lv">${'<i></i>'.repeat(s.lv)}</span>
        <button data-act="listen" data-id="${id}">${t.listen}</button><button data-act="play" data-id="${id}" class="pl">${t.play}</button></li>`;
    }).join('')).join('');
  },
  open() { this.list(); $('songs').classList.add('on'); },
  close() { $('songs').classList.remove('on'); },
  async listen(id) {
    this.stop(); const tok = ++this.token;
    setSpan(id); caption(titleOf(id));
    await playSong(id, { alive: () => this.token === tok, tempo: this.tempo, lh: this.lh });
    if (this.token === tok) { caption(''); setSpan(null); }
  },
  async play(id) {
    this.stop(); const tok = ++this.token;
    this.cur = id; this.tl = timeline(id); this.seq = this.tl.rh; this.idx = 0; this.miss = 0;
    mode = 'song'; document.body.dataset.mode = 'song';
    setSpan(id); caption(titleOf(id)); this.bar();
    if (labelMode === 'none') { labelMode = 'names'; applyLabels(); $('b-notes').classList.add('on'); }
    // a piece that opens with the left hand alone (Satie, Bach): the piano plays the intro, then it is your turn
    if (this.seq[0].t > 0 && this.lh) { this.busy = true; this.follow(0, -1, this.seq[0].t); await sleep(this.seq[0].t * SONGS[id].q / this.tempo * 1000 + 200); this.busy = false; if (this.token !== tok) return; }
    this.show();
  },
  show() {
    if (!this.cur) return;
    const e = this.seq[this.idx], nx = this.seq[this.idx + 1];
    piano.setTargets([e.m], true, nx && nx.m !== e.m ? [nx.m] : []); piano.guide([e.m]);
    dots(this.seq.length, this.idx);
  },
  // the left hand between this melody note and the next one, in time from now
  follow(base, from, to) {
    const q = SONGS[this.cur].q / this.tempo, now = sound.ctx.currentTime + 0.02, tok = this.token;
    for (const e of this.tl.lh) {
      if (!(e.t >= from && e.t < to) || (from < 0 && e.t >= to)) continue;
      const at = Math.max(0, e.t - base) * q, dur = e.d * q * 0.94;
      sound.noteOn(e.m, 0.32, now + at); sound.noteOff(e.m, now + at + dur);
      setTimeout(() => { if (this.token === tok) piano.press(e.m, 0.3); }, at * 1000); setTimeout(() => piano.release(e.m), (at + dur) * 1000);
    }
  },
  onNote(m) {
    if (!this.cur || mode !== 'song' || this.busy) return;
    const e = this.seq[this.idx];
    if (m !== e.m) { if (++this.miss >= 2) { this.miss = 0; piano.hint([e.m]); } return; }
    this.miss = 0; piano.ripple(m, 0x9dffc8);
    const next = this.seq[this.idx + 1];
    if (this.lh) this.follow(e.t, this.idx === 0 ? Math.min(0, e.t) : e.t, next ? next.t : this.tl.end + 1);
    this.idx++;
    if (next) return this.show();
    // the end: the light goes out, a bell, a kind word, back to free play
    const tok = ++this.token;
    piano.setTargets([]); piano.guide(null); $('dots').classList.add('done');
    setTimeout(async () => {
      if (this.token !== tok) return;
      sound.chime(88); caption(T[lang].bravo);
      await sleep(500); await sound.say('praise' + (1 + Math.floor(Math.random() * 3)));
      await sleep(1600); if (this.token === tok) this.stop();
    }, 450);
  },
  back() { if (!this.cur || this.busy) return; this.idx = Math.max(0, this.idx - 4); this.show(); },
  restart() { if (this.cur) this.play(this.cur); },
  async showMe() {
    if (!this.cur || this.busy) return;
    this.busy = true; const tok = this.token;
    piano.setTargets([]); piano.guide(null);
    await playSong(this.cur, { alive: () => this.token === tok, from: this.idx, count: 4, tempo: this.tempo * 0.85, lh: this.lh });
    if (this.token === tok) { this.busy = false; this.show(); }
  },
  speed() { this.tempo = TEMPI[(TEMPI.indexOf(this.tempo) + 1) % TEMPI.length]; this.bar(); toast(`${T[lang].speed} ${Math.round(this.tempo * 100)} %`); },
  hand() { this.lh = !this.lh; this.bar(); },
  bar() { $('b-s-speed').lastChild.textContent = `${Math.round(this.tempo * 100)} %`; $('b-s-lh').classList.toggle('on', this.lh); },
  stop() {
    this.token++; this.busy = false; stopSong();
    const was = this.cur || mode === 'song' || span;
    this.cur = null;
    if (mode === 'song') { mode = 'free'; document.body.dataset.mode = 'free'; }
    if (!was) return;
    piano.setTargets([]); piano.guide(null); dots(0, 0); caption(''); setSpan(null);
  },
};
$('songs-l').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  songs.close();
  if (b.dataset.act === 'listen') songs.listen(b.dataset.id); else songs.play(b.dataset.id);
});

// ------------------------------------------------------------------ screens
let started = false, mode = 'intro';
function caption(txt) {
  const c = $('cap'); c.classList.remove('on');
  setTimeout(() => { c.textContent = txt || ''; if (txt) c.classList.add('on'); }, 260);
}
// progress of the current exercise: one dot per note, or a thin bar for long pieces
function dots(n, k) {
  const d = $('dots');
  if (!n) { d.classList.remove('on'); return; }
  d.classList.remove('done');
  const long = n > 32;
  d.classList.toggle('long', long);
  if (long) { if (!d.querySelector('b')) d.innerHTML = '<b><u></u></b><em></em>'; d.querySelector('u').style.width = `${(k / n) * 100}%`; d.querySelector('em').textContent = `${k} / ${n}`; }
  else { if (d.children.length !== n || d.querySelector('b')) d.innerHTML = '<i></i>'.repeat(n); [...d.children].forEach((el, i) => el.classList.toggle('on', i < k)); }
  d.classList.add('on');
}
function toast(txt) { const t = $('toast'); t.textContent = txt; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

// on a phone: fullscreen + landscape where the browser allows it (Android), otherwise ask kindly (iPhone)
function rotateGate() {
  const o = $('rotate'); o.classList.add('on');
  return new Promise((res) => {
    const done = () => { removeEventListener('resize', chk); o.classList.remove('on'); res(); };
    const chk = () => { if (!portrait()) setTimeout(done, 300); };
    addEventListener('resize', chk); $('rot-stay').onclick = done;
  });
}
const loading = sound.load((p) => $('load').style.setProperty('--p', `${p * 100}%`)).then(() => { document.body.classList.add('loaded'); texts(); }).catch(() => { document.body.classList.add('loaded'); });
async function begin(which) {
  if (started || begin.busy) return;
  begin.busy = true;
  sound.unlock(); // inside the tap, before anything waits
  const small = Math.min(screen.width, screen.height) < 700 && matchMedia('(pointer: coarse)').matches;
  if (small) {
    try { const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); r?.then?.(() => screen.orientation?.lock?.('landscape')?.catch?.(() => {}), () => {}); } catch {}
  }
  document.body.classList.add('waiting');
  await loading; // the samples were already loading; usually done by now
  document.body.classList.remove('waiting');
  started = true;
  document.body.classList.add('in');
  piano.setView('play');
  sound.rain(store.get('nocturne-rain2') === '1'); $('b-rain').classList.toggle('on', sound.rainOn);
  await sound.loadLines(lang, IDS);
  if (small && portrait()) await rotateGate();
  if (which === 'lesson') toLesson(); else toFree(false);
}
function toLesson() {
  songs.stop();
  mode = 'lesson'; document.body.dataset.mode = 'lesson';
  lesson.go(0);
}
async function toFree(fromLesson) {
  lesson.stop(); songs.stop(); mode = 'free'; document.body.dataset.mode = 'free';
  $('prog').style.setProperty('--p', '100%');
  if (fromLesson) { caption(T[lang].done); setTimeout(() => caption(''), 3800); return; }
  caption(CAPTIONS[lang].free); await sound.say('free'); if (mode === 'free') caption('');
}

function texts() {
  const t = T[lang], set = (id, txt) => { const el = $(id); if (el) el.lastChild.textContent = txt; };
  document.documentElement.lang = lang;
  $('tag').textContent = t.tag; $('t-learn').textContent = t.learn; $('s-learn').textContent = t.learnS;
  $('t-free').textContent = t.free; $('s-free').textContent = t.freeS;
  $('hp').textContent = document.body.classList.contains('loaded') ? t.ready : t.tuning;
  set('b-replay', t.replay); set('b-next', t.next); set('b-prev', t.prev); set('b-exit', t.exit); set('b-pause', t.pause);
  set('b-notes', t.notes); set('b-pedal', t.pedal); set('b-rain', t.rain); set('b-lesson', t.lesson); set('b-songs', t.songs); set('b-midi', t.midi); if ($('midi-hint')) $('midi-hint').querySelector('span').textContent = t.midiHint;
  set('b-s-restart', t.restart); set('b-s-back', t.back); set('b-s-pause', t.pause); set('b-s-show', t.show); set('b-s-lh', t.lh); set('b-s-stop', t.stop);
  $('songs-h').textContent = t.songs; songs.list(); songs.bar();
  $('pause-t').textContent = t.paused; $('pause-s').textContent = t.resume;
  $('credit').textContent = t.credit; $('rot-t').textContent = t.turn; $('rot-s').textContent = t.turnS; $('rot-stay').textContent = t.stay;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
}
async function setLang(l) {
  if (l === lang || !T[l]) return;
  lang = l; store.set('nocturne-lang', l); texts(); applyLabels();
  if (started) { await sound.loadLines(lang, IDS); if (mode === 'lesson') lesson.go(lesson.i); }
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

const on = (id, fn) => $(id)?.addEventListener('click', fn);
on('go-learn', () => begin('lesson'));
on('go-free', () => begin('free'));
on('b-replay', () => lesson.go(lesson.i));
on('b-next', () => lesson.go(lesson.i + 1));
on('b-prev', () => lesson.go(lesson.i - 1));
on('b-exit', () => toFree(false));
on('b-pause', () => pause(!paused));
on('b-lesson', () => toLesson());
on('b-songs', () => songs.open());
on('songs-x', () => songs.close());
on('b-s-restart', () => songs.restart());
on('b-s-back', () => songs.back());
on('b-s-pause', () => pause(!paused));
on('b-s-show', () => songs.showMe());
on('b-s-speed', () => songs.speed());
on('b-s-lh', () => songs.hand());
on('b-s-stop', () => songs.stop());
on('pause', () => pause(false));
on('b-notes', () => {
  const modes = matchMedia('(pointer: fine)').matches ? ['none', 'names', 'keys'] : ['none', 'names'];
  labelMode = modes[(modes.indexOf(labelMode) + 1) % modes.length]; applyLabels();
  $('b-notes').classList.toggle('on', labelMode !== 'none'); toast(T[lang].labels[labelMode]);
});
on('b-pedal', () => { pedalLatched = !pedalLatched; setPedal(pedalLatched); });
on('b-rain', () => { sound.rain(!sound.rainOn); store.set('nocturne-rain2', sound.rainOn ? '1' : '0'); $('b-rain').classList.toggle('on', sound.rainOn); });
if (navigator.requestMIDIAccess) {
  on('b-midi', () => midi());
  on('midi-hint', () => midi());
  // allowed on an earlier visit: connect again without asking
  if (store.get('nocturne-midi') === '1') navigator.permissions?.query({ name: 'midi' }).then((p) => { if (p.state === 'granted') midi(true); }).catch(() => {});
} else { $('b-midi').remove(); $('midi-hint').remove(); }
// leaving the tab: pause, so nothing plays on in the background
document.addEventListener('visibilitychange', () => { if (document.hidden && started) pause(true); });

texts();
document.fonts?.ready.then(() => applyLabels());

// a few notes drift through the intro, played by no one
(function ghost() {
  if (started) return;
  const pool = [60, 64, 67, 71, 72, 74, 76, 69, 65];
  const m = pool[Math.floor(Math.random() * pool.length)];
  if (piano.keys.has(m)) { piano.press(m, 0.4); setTimeout(() => piano.release(m), 500); }
  setTimeout(ghost, 1400 + Math.random() * 1800);
})();
window.__nocturne = { piano, sound, lesson, songs, noteOn, noteOff, toLesson: () => toLesson(), get mode() { return mode; } };
