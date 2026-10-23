// NOCTURNE: a calm first lesson at the piano, then the instrument is yours.
import { Piano3D, isBlack } from './piano3d.js';
import { Sound } from './sound.js';
import { CAPTIONS } from './captions.js';

const $ = (id) => document.getElementById(id);
const T = {
  en: { tag: 'Piano, simply.', learn: 'Learn the basics', learnS: 'ten minutes, guided by voice', free: 'Just play', freeS: 'there are no wrong notes', tuning: 'tuning the piano', ready: 'best with headphones',
    replay: 'Replay', next: 'Next', exit: 'Free play', notes: 'Notes', pedal: 'Pedal', rain: 'Rain', lesson: 'Lesson', midi: 'MIDI', midiOn: 'MIDI keyboard connected', midiNo: 'No MIDI keyboard found',
    songs: 'Songs', listen: 'Listen', play: 'Play', bravo: 'Well played', titles: { lune: 'Au clair de la lune', mary: 'Mary Had a Little Lamb', jacques: 'Frère Jacques', twinkle: 'Twinkle, Twinkle, Little Star', ode: 'Ode to Joy', jingle: 'Jingle Bells', lullaby: 'Brahms’ Lullaby' },
    labels: { none: 'Notes off', names: 'Note names', keys: 'Computer keys' }, turn: 'Turn your phone sideways', turnS: 'for the whole keyboard', stay: 'Continue upright', done: 'The piano is yours', credit: 'Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0' },
  fr: { tag: 'Le piano, simplement.', learn: 'Apprendre les bases', learnS: 'dix minutes, guidé par la voix', free: 'Jouer librement', freeS: 'il n’y a pas de fausse note', tuning: 'accordage du piano', ready: 'meilleur avec un casque',
    replay: 'Réécouter', next: 'Suivant', exit: 'Jeu libre', notes: 'Notes', pedal: 'Pédale', rain: 'Pluie', lesson: 'Leçon', midi: 'MIDI', midiOn: 'Clavier MIDI connecté', midiNo: 'Aucun clavier MIDI trouvé',
    songs: 'Chansons', listen: 'Écouter', play: 'Jouer', bravo: 'Bien joué', titles: { lune: 'Au clair de la lune', mary: 'Mary avait un petit agneau', jacques: 'Frère Jacques', twinkle: 'Ah ! vous dirai-je, maman', ode: 'Hymne à la joie', jingle: 'Vive le vent', lullaby: 'Berceuse de Brahms' },
    labels: { none: 'Notes masquées', names: 'Noms des notes', keys: 'Touches du clavier' }, turn: 'Tournez votre téléphone', turnS: 'pour avoir tout le clavier', stay: 'Continuer en portrait', done: 'Le piano est à vous', credit: 'Piano : Salamander Grand Piano par Alexander Holm, CC BY 3.0' },
};
const NAMES = { en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'], fr: ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'] };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('nocturne-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!T[lang]) lang = 'en';

// ------------------------------------------------------------------ instrument
const piano = new Piano3D($('gl'));
const sound = new Sound('.');
const portrait = () => innerWidth < innerHeight;
const range = () => (portrait() ? [60, 74] : [48, 76]); // a phone held upright: one octave and a bit, keys big enough for fingers
piano.setRange(...range()); piano.setView('intro');
addEventListener('resize', () => { piano.setRange(...range()); if (lesson.step) lesson.refresh(); });

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
function noteOn(m, vel = 0.75) {
  sound.unlock();
  held.set(m, (held.get(m) || 0) + 1);
  sound.noteOn(m, vel); piano.press(m, vel);
  pressedAt.set(m, performance.now());
  lesson.onNote(m); songs.onNote(m);
}
function noteOff(m) {
  const n = (held.get(m) || 0) - 1;
  if (n > 0) { held.set(m, n); return; }
  held.delete(m); sound.noteOff(m); piano.release(m);
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

// MIDI keyboards
async function midi() {
  try {
    const acc = await navigator.requestMIDIAccess();
    const bind = () => { let n = 0; for (const inp of acc.inputs.values()) { n++; inp.onmidimessage = onMidi; } toast(n ? T[lang].midiOn : T[lang].midiNo); $('b-midi').classList.toggle('on', n > 0); };
    acc.onstatechange = bind; bind();
  } catch { toast(T[lang].midiNo); }
}
function onMidi(ev) {
  const [st, a, b] = ev.data, cmd = st & 0xf0;
  if (cmd === 0x90 && b > 0) noteOn(a, b / 127);
  else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) noteOff(a);
  else if (cmd === 0xb0 && a === 64) setPedal(b >= 64 || pedalLatched);
}

// ------------------------------------------------------------------ lesson
// the songs: [midi, beats] for the right hand, [chord, beats] per bar for a quiet left hand (all public domain)
const C3 = [48, 52, 55], G2 = [43, 50, 55], F2 = [41, 48, 53];
const TW_A = [[60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2]];
const TW_B = [[67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2]];
const TL_A = [[C3, 4], [F2, 2], [C3, 2], [F2, 2], [C3, 2], [G2, 2], [C3, 2]], TL_B = [[C3, 2], [F2, 2], [C3, 2], [G2, 2]];
const SONGS = {
  lune: { q: 0.52, mel: [[60, 1], [60, 1], [60, 1], [62, 1], [64, 2], [62, 2], [60, 1], [64, 1], [62, 1], [62, 1], [60, 4]],
    lh: [[C3, 4], [C3, 2], [G2, 2], [C3, 2], [G2, 2], [C3, 4]] },
  jacques: { q: 0.46, mel: [[60, 1], [62, 1], [64, 1], [60, 1], [60, 1], [62, 1], [64, 1], [60, 1], [64, 1], [65, 1], [67, 2], [64, 1], [65, 1], [67, 2]],
    lh: [[C3, 4], [C3, 4], [C3, 4], [C3, 4]] },
  ode: { q: 0.5, mel: [[64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2],
    [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, 0.5], [60, 2]],
    lh: [[C3, 4], [G2, 4], [C3, 4], [G2, 4], [C3, 4], [G2, 4], [C3, 4], [G2, 2], [C3, 2]] },
  twinkle: { q: 0.5, mel: [...TW_A, ...TW_B, ...TW_B, ...TW_A], lh: [...TL_A, ...TL_B, ...TL_B, ...TL_A] },
  mary: { q: 0.46, mel: [[64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 2], [62, 1], [62, 1], [62, 2], [64, 1], [67, 1], [67, 2],
    [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 1], [64, 1], [62, 1], [62, 1], [64, 1], [62, 1], [60, 4]],
    lh: [[C3, 4], [C3, 4], [G2, 4], [C3, 4], [C3, 4], [C3, 4], [G2, 4], [C3, 4]] },
  jingle: { q: 0.4, mel: [[64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, 0.5], [64, 4],
    [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5], [64, 1], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2]],
    lh: [[C3, 4], [C3, 4], [C3, 4], [C3, 4], [F2, 4], [C3, 4], [C3, 2], [G2, 2], [G2, 4]] },
  lullaby: { q: 0.42, mel: [[64, 0.5], [64, 0.5], [67, 2], [64, 0.5], [64, 0.5], [67, 2], [64, 0.5], [67, 0.5], [72, 1], [71, 1.5], [69, 0.5], [69, 1], [67, 1],
    [62, 0.5], [64, 0.5], [65, 1], [62, 1], [62, 0.5], [64, 0.5], [65, 2], [62, 0.5], [65, 0.5], [71, 0.5], [69, 0.5], [67, 1], [71, 1], [72, 3]],
    lh: [[[], 1], [C3, 3], [C3, 3], [F2, 3], [C3, 3], [G2, 3], [G2, 3], [G2, 3], [C3, 3]] },
};
const notesOf = (song) => SONGS[song].mel.map(([m]) => m);
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
  { v: 'twinkle_done', after: () => playSong('twinkle') },
  { v: 'black', wait: { seq: [61] }, praise: true },
  { v: 'chord', wait: { chords: [[60, 64, 67]] } },
  { v: 'chordyes' },
  { v: 'chords', wait: { chords: [[65, 69, 72], [67, 71, 74], [60, 64, 67]] }, praise: true },
  { v: 'outro', end: true },
];
const IDS = [...new Set([...STEPS.map((s) => s.v), 'free', 'praise1', 'praise2', 'praise3'])];
const cs = () => { const [lo, hi] = range(); const out = []; for (let m = lo; m <= hi; m++) if (m % 12 === 0) out.push(m); return out; };
const groups = (n) => { const [lo, hi] = range(); const out = []; for (let m = lo; m <= hi; m++) { const pc = m % 12; if (n === 2 ? pc === 1 || pc === 3 : pc === 6 || pc === 8 || pc === 10) out.push(m); } return out; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lesson = {
  i: -1, step: null, run: 0, w: null, voiceDone: false, timers: [],
  async go(i) {
    const run = ++this.run;
    this.clear();
    if (i >= STEPS.length) return toFree(true);
    this.i = i; const st = this.step = STEPS[i];
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
  // which keys glow: the next one of a sequence, the notes of the chord, the C's not found yet
  refresh() {
    const w = this.w; if (!w) { piano.guide(null); dots(0, 0); return; }
    let tg = [];
    if (w.seq) tg = this.voiceDone || w.idx > 0 ? [w.seq[w.idx]] : [];
    else if (w.chords) tg = this.voiceDone ? w.chords[w.ch] : [];
    else if (w.all) tg = this.voiceDone ? w.all().filter((m) => !w.got.has(m)) : [];
    piano.setTargets(tg, true); piano.guide(tg);
    // how far along: one dot per note, chord or C to find
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
  clear() { this.timers.forEach(clearTimeout); this.timers = []; piano.setTargets([]); piano.guide(null); piano.clearBadges(); this.w = null; sound.stopVoice(); dots(0, 0); },
  stop() { this.run++; this.clear(); this.step = null; },
};

// ------------------------------------------------------------------ songs (free play)
// pick a song, listen to it if you like, then play it: the light shows each next note, nothing is ever wrong
const SONG_LIST = [['lune', 1], ['mary', 1], ['jacques', 1], ['twinkle', 2], ['ode', 2], ['jingle', 2], ['lullaby', 3]];
const songs = {
  cur: null, idx: 0, miss: 0, token: 0,
  list() {
    const t = T[lang];
    $('songs-l').innerHTML = SONG_LIST.map(([id, lv]) => `<li><span class="nm">${t.titles[id]}</span><span class="lv">${'<i></i>'.repeat(lv)}</span>
      <button data-act="listen" data-id="${id}">${t.listen}</button><button data-act="play" data-id="${id}" class="pl">${t.play}</button></li>`).join('');
  },
  open() { this.list(); $('songs').classList.add('on'); },
  close() { $('songs').classList.remove('on'); },
  async listen(id) {
    this.stop(); const tok = ++this.token;
    caption(T[lang].titles[id]);
    await playSong(id, () => this.token === tok);
    if (this.token === tok) caption('');
  },
  play(id) {
    this.stop(); this.token++;
    this.cur = id; this.seq = notesOf(id); this.idx = 0; this.miss = 0;
    $('b-songs').classList.add('on'); caption(T[lang].titles[id]);
    if (labelMode === 'none') { labelMode = 'names'; applyLabels(); $('b-notes').classList.add('on'); }
    this.show();
  },
  show() {
    const m = this.seq[this.idx];
    piano.setTargets([m], true); piano.guide([m]); dots(this.seq.length, this.idx);
  },
  onNote(m) {
    if (!this.cur || mode !== 'free') return;
    if (m !== this.seq[this.idx]) { if (++this.miss >= 2) { this.miss = 0; piano.hint([this.seq[this.idx]]); } return; }
    this.miss = 0; this.idx++; piano.ripple(m, 0x9dffc8);
    if (this.idx < this.seq.length) return this.show();
    const id = this.cur; this.cur = null;
    piano.setTargets([]); piano.guide(null); $('dots').classList.add('done'); $('b-songs').classList.remove('on');
    const tok = ++this.token;
    setTimeout(async () => {
      if (this.token !== tok) return;
      sound.chime(88); caption(T[lang].bravo);
      await sleep(500); await sound.say('praise' + (1 + Math.floor(Math.random() * 3)));
      await sleep(900); if (this.token === tok) { dots(0, 0); caption(''); }
    }, 350);
  },
  stop() {
    this.token++; stopSong();
    if (!this.cur && !$('dots').classList.contains('on')) return;
    this.cur = null; piano.setTargets([]); piano.guide(null); dots(0, 0); caption(''); $('b-songs').classList.remove('on');
  },
};
$('songs-l').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  songs.close();
  if (b.dataset.act === 'listen') songs.listen(b.dataset.id); else songs.play(b.dataset.id);
});

// the reward: the piano plays the song back, with a quiet left hand
async function playSong(name, alive) {
  const { q, mel, lh } = SONGS[name], ev = [];
  let t = 0;
  for (const [m, d] of mel) { ev.push([t, m, d * q * 0.92, 0.62]); t += d * q; }
  let tl = 0;
  for (const [c, d] of lh) { for (const m of c) ev.push([tl, m, d * q * 0.95, 0.34]); tl += d * q; }
  const run = lesson.run, t0 = sound.ctx.currentTime + 0.25;
  alive ||= () => lesson.run === run;
  const live = [];
  for (const [at, m, d, v] of ev) {
    live.push(sound.noteOn(m, v, t0 + at)); sound.noteOff(m, t0 + at + d);
    setTimeout(() => { if (alive()) piano.press(m, v); }, (at + 0.25) * 1000);
    setTimeout(() => piano.release(m), (at + 0.25 + d) * 1000);
  }
  playSong.cur = live;
  await sleep((Math.max(t, tl) + 1.4) * 1000);
}
// a playback the listener interrupts: silence what is scheduled
function stopSong() { for (const v of playSong.cur || []) if (v) sound.damp(v, sound.ctx.currentTime, 0.08); playSong.cur = null; }

// ------------------------------------------------------------------ screens
let started = false, mode = 'intro';
function caption(txt) {
  const c = $('cap'); c.classList.remove('on');
  setTimeout(() => { c.textContent = txt || ''; if (txt) c.classList.add('on'); }, 260);
}
function dots(n, k) {
  const d = $('dots');
  if (!n) { d.classList.remove('on'); return; }
  d.classList.remove('done');
  if (d.children.length !== n) d.innerHTML = '<i></i>'.repeat(n);
  [...d.children].forEach((el, i) => el.classList.toggle('on', i < k));
  d.classList.add('on');
}
function toast(txt) { const t = $('toast'); t.textContent = txt; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

// on a phone: fullscreen + landscape where the browser allows it (Android), otherwise ask kindly
function rotateGate() {
  const o = $('rotate'); o.classList.add('on');
  return new Promise((res) => {
    const done = () => { removeEventListener('resize', chk); o.classList.remove('on'); res(); };
    const chk = () => { if (!portrait()) setTimeout(done, 300); };
    addEventListener('resize', chk); $('rot-stay').onclick = done;
  });
}
async function begin(which) {
  sound.unlock();
  if (!sound.buf.size) return;
  const small = Math.min(screen.width, screen.height) < 700 && matchMedia('(pointer: coarse)').matches;
  if (small) {
    try { const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); if (r) await r; await screen.orientation?.lock?.('landscape'); } catch {}
  }
  started = true;
  document.body.classList.add('in');
  piano.setView('play');
  sound.rain(store.get('nocturne-rain') !== '0'); $('b-rain').classList.toggle('on', sound.rainOn);
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
  lesson.stop(); mode = 'free'; document.body.dataset.mode = 'free';
  $('prog').style.setProperty('--p', '100%');
  if (fromLesson) { caption(T[lang].done); setTimeout(() => caption(''), 3800); return; }
  caption(CAPTIONS[lang].free); await sound.say('free'); if (mode === 'free') caption('');
}

function texts() {
  const t = T[lang];
  document.documentElement.lang = lang;
  $('tag').textContent = t.tag; $('t-learn').textContent = t.learn; $('s-learn').textContent = t.learnS;
  $('t-free').textContent = t.free; $('s-free').textContent = t.freeS;
  $('hp').textContent = sound.buf.size ? t.ready : t.tuning;
  $('b-replay').lastChild.textContent = t.replay; $('b-next').lastChild.textContent = t.next; $('b-exit').lastChild.textContent = t.exit;
  $('b-notes').lastChild.textContent = t.notes; $('b-pedal').lastChild.textContent = t.pedal; $('b-rain').lastChild.textContent = t.rain;
  $('b-lesson').lastChild.textContent = t.lesson; $('b-songs').lastChild.textContent = t.songs; $('songs-h').textContent = t.songs; songs.list(); $('b-midi').lastChild.textContent = t.midi;
  $('credit').textContent = t.credit; $('rot-t').textContent = t.turn; $('rot-s').textContent = t.turnS; $('rot-stay').textContent = t.stay;
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
}
async function setLang(l) {
  if (l === lang || !T[l]) return;
  lang = l; store.set('nocturne-lang', l); texts(); applyLabels();
  if (started) { await sound.loadLines(lang, IDS); if (mode === 'lesson') lesson.go(lesson.i); }
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

$('go-learn').addEventListener('click', () => begin('lesson'));
$('go-free').addEventListener('click', () => begin('free'));
$('b-replay').addEventListener('click', () => lesson.go(lesson.i));
$('b-next').addEventListener('click', () => lesson.go(lesson.i + 1));
$('b-exit').addEventListener('click', () => toFree(false));
$('b-lesson').addEventListener('click', () => toLesson());
$('b-songs').addEventListener('click', () => (songs.cur ? songs.stop() : songs.open()));
$('songs-x').addEventListener('click', () => songs.close());
$('b-notes').addEventListener('click', () => {
  const modes = matchMedia('(pointer: fine)').matches ? ['none', 'names', 'keys'] : ['none', 'names'];
  labelMode = modes[(modes.indexOf(labelMode) + 1) % modes.length]; applyLabels();
  $('b-notes').classList.toggle('on', labelMode !== 'none'); toast(T[lang].labels[labelMode]);
});
$('b-pedal').addEventListener('click', () => { pedalLatched = !pedalLatched; setPedal(pedalLatched); });
$('b-rain').addEventListener('click', () => { sound.rain(!sound.rainOn); store.set('nocturne-rain', sound.rainOn ? '1' : '0'); $('b-rain').classList.toggle('on', sound.rainOn); });
if (navigator.requestMIDIAccess) $('b-midi').addEventListener('click', midi); else $('b-midi').remove();

texts();
document.fonts?.ready.then(() => applyLabels());
sound.load((p) => $('load').style.setProperty('--p', `${p * 100}%`)).then(() => {
  document.body.classList.add('loaded'); texts();
}).catch(() => { $('hp').textContent = '…'; });

// a few notes drift through the intro, played by no one
(function ghost() {
  if (started) return;
  const pool = [60, 64, 67, 71, 72, 74, 76, 69, 65];
  const m = pool[Math.floor(Math.random() * pool.length)];
  if (piano.keys.has(m)) { piano.press(m, 0.4); setTimeout(() => piano.release(m), 500); }
  setTimeout(ghost, 1400 + Math.random() * 1800);
})();
window.__nocturne = { piano, sound, lesson, noteOn, noteOff };
