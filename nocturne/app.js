// NOCTURNE: a calm first lesson at the piano, then the instrument is yours.
import { Piano3D } from './piano3d.js';
import { Sound } from './sound.js';
import { CAPTIONS } from './captions.js';
import { SONGS, timeline, notesOf } from './songs.js';
import { Staff, chordName } from './staff.js';
import { COURSE, LESSONS, parse } from './course.js';

const $ = (id) => document.getElementById(id);
const T = {
  en: { tag: 'Piano, simply.', learn: 'Learn the basics', learnS: 'ten minutes, guided by voice', free: 'Just play', freeS: 'there are no wrong notes', tuning: 'tuning the piano', ready: 'best with headphones',
    replay: 'Replay', next: 'Next', prev: 'Back', exit: 'Free play', notes: 'Notes', pedal: 'Pedal', rain: 'Rain', lesson: 'Lesson', midi: 'MIDI', midiOn: 'MIDI piano connected', midiNo: 'No MIDI keyboard found', midiOff: 'MIDI piano unplugged', midiHint: 'A MIDI piano? Plug it into the computer and connect it here', octave: 'Octave', keysTip: (a, b) => `Play with your computer keys: their letters are on the piano. ${a} and ${b} change octave`,
    songs: 'Songs', kids: 'Nursery songs', classic: 'Classical', listen: 'Listen', play: 'Play', bravo: 'Well played',
    pause: 'Pause', paused: 'Paused', resume: 'Tap to continue', restart: 'Restart', back: 'Rewind', show: 'Show me', lh: 'Left hand', stop: 'Stop', speed: 'Speed',
    session: 'My session for today', sessionS: 'ten minutes with your coach', sessionB: 'Session', course: 'Course', cont: 'Continue ▸', again2: 'Listen again', yourTurn: 'Your turn ▸', tryAgain: 'Try again', workPart: 'Work on the tricky passage', listenFirst: 'Hear the model', wholeAgain: 'The whole piece again ▸', explore: 'Play white keys and watch where they are written', mapTip: 'Follow the lessons in order: each one takes 5 to 10 minutes.', startHere: 'Start here', go: 'Go', practice: 'Practise', coachSession: 'A session with the coach', nextLesson: 'Next lesson', toMap: 'The course', learnC: 'Learn the piano', learnCS: 'a full course, from the first C to playing alone',
    titles: { lune: 'Au clair de la lune', mary: 'Mary Had a Little Lamb', jacques: 'Frère Jacques', twinkle: 'Twinkle, Twinkle, Little Star', jingle: 'Jingle Bells',
      ode: 'Ode to Joy', largo: 'New World Symphony, Largo', lullaby: 'Lullaby', canon: 'Canon in D', grieg: 'In the Hall of the Mountain King', minuet: 'Minuet in G', elise: 'Für Elise', gymno: 'Gymnopédie No. 1', prelude: 'Prelude in C' },
    by: { Petzold: 'Petzold (attr. Bach)' },
    labels: { none: 'Notes off', names: 'Note names', keys: 'Computer keys' }, turn: 'Turn your phone sideways', turnS: 'for the whole keyboard', stay: 'Continue upright', done: 'The piano is yours', credit: 'Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0' },
  fr: { tag: 'Le piano, simplement.', learn: 'Apprendre les bases', learnS: 'dix minutes, guidé par la voix', free: 'Jouer librement', freeS: 'il n’y a pas de fausse note', tuning: 'accordage du piano', ready: 'meilleur avec un casque',
    replay: 'Réécouter', next: 'Suivant', prev: 'Précédent', exit: 'Jeu libre', notes: 'Notes', pedal: 'Pédale', rain: 'Pluie', lesson: 'Leçon', midi: 'MIDI', midiOn: 'Piano MIDI branché', midiNo: 'Aucun clavier MIDI trouvé', midiOff: 'Piano MIDI débranché', midiHint: 'Un piano MIDI ? Branchez-le à l’ordinateur et connectez-le ici', octave: 'Octave', keysTip: (a, b) => `Jouez avec les touches de l’ordinateur : leurs lettres sont sur le piano. ${a} et ${b} changent d’octave`,
    songs: 'Chansons', kids: 'Comptines', classic: 'Classique', listen: 'Écouter', play: 'Jouer', bravo: 'Bien joué',
    pause: 'Pause', paused: 'En pause', resume: 'Touchez pour reprendre', restart: 'Début', back: 'Reculer', show: 'Montre-moi', lh: 'Main gauche', stop: 'Arrêter', speed: 'Vitesse',
    session: 'Ma séance du jour', sessionS: 'dix minutes avec votre coach', sessionB: 'Séance', course: 'Cours', cont: 'Continuer ▸', again2: 'Réécouter', yourTurn: 'À vous ▸', tryAgain: 'Réessayer', workPart: 'Travailler le passage difficile', listenFirst: 'Écouter le modèle', wholeAgain: 'Rejouer le morceau entier ▸', explore: 'Jouez des touches blanches et regardez où elles s’écrivent', mapTip: 'Suivez les leçons dans l’ordre : chacune dure 5 à 10 minutes.', startHere: 'Commencer ici', go: 'Ouvrir', practice: 'S’entraîner', coachSession: 'Une séance avec le coach', nextLesson: 'Leçon suivante', toMap: 'Le cours', learnC: 'Apprendre le piano', learnCS: 'un cours complet, du premier Do à jouer seul',
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
let octKeys = ['Z', 'X']; // the letters of the octave keys on this keyboard (W and X on a French one)
navigator.keyboard?.getLayoutMap?.().then((map) => { for (const [code, m] of Object.entries(KEYMAP)) { const l = map.get(code); if (l) keyLetter[m] = l.toUpperCase(); } octKeys = ['KeyZ', 'KeyX'].map((c, i) => (map.get(c) || octKeys[i]).toUpperCase()); if (labelMode === 'keys') applyLabels(); }).catch(() => {});
const nameOf = (m) => NAMES[lang][((m % 12) + 12) % 12];
let labelMode = 'none';
// Z and X move the computer keys one octave down or up
let oct = 0;
function applyLabels() { piano.setLabels(labelMode, nameOf, (m) => keyLetter[m - 12 * oct] || ''); }

const held = new Map(); // midi -> count of sources holding it
const pressedAt = new Map();
// real: the key actually struck (a MIDI piano may play a note in another octave than the one shown)
function noteOn(m, vel = 0.75, real = m, src = 'touch') {
  if (paused) return;
  sound.unlock();
  held.set(m, (held.get(m) || 0) + 1);
  sound.noteOn(real, vel); piano.press(m, vel);
  pressedAt.set(m, performance.now());
  lesson.onNote(m); songs.onNote(m); coach.onNote(m, vel, src);
}
function noteOff(m, real = m) {
  coach.onOff(m);
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

const kdown = new Map(); // key code -> the note it holds
addEventListener('keydown', (e) => {
  if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Escape') { pause(!paused); return; }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) setPedal(true); return; }
  if ((e.code === 'KeyZ' || e.code === 'KeyX') && !e.repeat) { oct = Math.max(-2, Math.min(1, oct + (e.code === 'KeyX' ? 1 : -1))); applyLabels(); toast(`${T[lang].octave} ${oct > 0 ? '+' : ''}${oct}`); return; }
  const k = KEYMAP[e.code]; if (k == null || e.repeat || kdown.has(e.code)) return;
  e.preventDefault(); keysHelp();
  // in a lesson, a song or the coach the right note counts in any octave and sounds where it is awaited, so the
  // seventeen keys of the computer reach every piece; in free play the key sounds where it is
  const m = k + 12 * oct, s = shownFor(m);
  const real = mode === 'free' ? m : s; kdown.set(e.code, [s, real]); noteOn(s, 0.72, real, 'key');
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space') { setPedal(pedalLatched); return; }
  const h = kdown.get(e.code); if (!h) return;
  kdown.delete(e.code); noteOff(h[0], h[1]);
});
addEventListener('blur', () => { for (const [s, real] of kdown.values()) noteOff(s, real); kdown.clear(); });
// the first time someone plays with the computer keys, their letters appear on the piano keys
function keysHelp() {
  if (keysHelp.done || labelMode !== 'none' || !matchMedia('(pointer: fine)').matches) return;
  keysHelp.done = true; labelMode = 'keys'; applyLabels(); $('b-notes').classList.add('on'); toast(T[lang].keysTip(...octKeys), 6000);
}

// pedal: held with Space or a MIDI pedal, or latched from the toolbar
let pedalLatched = false;
function setPedal(on) { sound.setSustain(on); $('b-pedal').classList.toggle('on', on); $('pedalbtn')?.classList.toggle('on', on); coach.wait?.pedal?.(on); }

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
  if (mode === 'coach') return coach.want();
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
  // the exact key if it is awaited, else the nearest awaited note of the same name not already held
  const ws = wanted(); if (ws.includes(m)) return m;
  const same = ws.filter((n) => n % 12 === m % 12 && !held.has(n)).sort((p, q) => Math.abs(p - m) - Math.abs(q - m));
  if (same.length) return same[0];
  const [lo, hi] = range(); let s = m; while (s < lo) s += 12; while (s > hi) s -= 12; return s;
}
const midiHeld = new Map();
function onMidi(ev) {
  const [st, a, b] = ev.data, cmd = st & 0xf0;
  if (cmd === 0x90 && b > 0) { if (!started) return; const s = shownFor(a); midiHeld.set(a, s); noteOn(s, Math.max(0.2, b / 127), a, 'midi'); }
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
const IDS = [...new Set([...STEPS.map((s) => s.v), 'free', 'praise1', 'praise2', 'praise3', ...Object.keys(CAPTIONS.en).filter((k) => k.startsWith('c_'))])];
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

// ------------------------------------------------------------------ coach
// "Today's session": the coach decides what to play, so there is nothing to set. A warm-up in time, a piece to
// revisit, then one step on the path: each piece is learnt in three steps (find the notes with the light waiting,
// then in time at 70 %, then at full speed with the left hand playing along). Played in time, every note is timed
// against the beat: right note, early or late, how hard (a MIDI piano tells the force). Stars from 0 to 3, one spoken
// tip, and when a passage keeps slipping, that passage alone three times more slowly before the whole piece again.
// Nothing is kept: anyone can sit down, and each session finds their level by listening, from the simplest piece up.
const PATH = ['lune', 'mary', 'jacques', 'ode', 'twinkle', 'largo', 'jingle', 'lullaby', 'canon', 'grieg', 'minuet', 'elise', 'gymno'];
const coach = {
  run: 0, live: null, // live: the timed pass being played { exp: [{m, at}], got: [{m, at, v, midi}] }
  active() { return mode === 'coach'; },
  async say(id, extra) { if (!this.active()) return; this.last = id; caption(CAPTIONS[lang][id] + (extra ? `  ${extra}` : '')); await sound.say(id); },
  alive(run) { return run === this.run && this.active(); },
  // ---------------------------------------------------------------- the session
  async session() {
    const run = ++this.run; mode = 'coach'; document.body.dataset.mode = 'coach'; songs.stop(); lesson.stop();
    const until = performance.now() + 10 * 60e3; // about ten minutes, then a last piece is finished and that's it
    await this.say('c_first'); if (!this.alive(run)) return;
    // warm-up: the five notes up and down, in time
    await this.say('c_warm'); if (!this.alive(run)) return;
    const warm = [60, 62, 64, 65, 67, 65, 64, 62, 60].map((m, i) => ({ m, t: i, d: 1 }));
    const w = await this.timed(warm, 0.62, run); if (!w) return;
    await this.feedback(w, run, false); if (!this.alive(run)) return;
    // then the pieces, from the simplest: the coach goes on as long as they are played well, and skips straight to
    // full speed after a perfect one, so a good player soon reaches pieces of their level
    let fast = w.stars === 3;
    for (const id of PATH) {
      if (performance.now() > until) break;
      await this.say('c_new', titleOf(id)); if (!this.alive(run)) return;
      const best = await this.learn(id, run, fast); if (best == null || !this.alive(run)) return;
      if (best < 2) break; // this one needs more practice: the session stops here
      fast = best === 3;
    }
    await this.say('c_done');
    if (this.alive(run)) toFree(true);
  },
  // a piece in up to three steps; returns the best stars at full speed (null if the session was left)
  async learn(id, run, fast) {
    if (!fast) {
      let s2 = await this.piece(id, 2, run); if (s2 == null) return null;
      if (s2 < 1) { if (!await this.notes(id, run)) return null; s2 = await this.piece(id, 2, run); if (s2 == null) return null; }
      if (s2 < 1) return s2;
    }
    return this.piece(id, 3, run);
  },
  // step 1: the notes, the light waits for each one
  notes(id, run) {
    return new Promise(async (res) => {
      await this.say('c_notes'); if (!this.alive(run)) return res(false);
      setSpan(id); const seq = notesOf(id); let i = 0, miss = 0;
      const show = () => { piano.setTargets([seq[i]], true, seq[i + 1] != null && seq[i + 1] !== seq[i] ? [seq[i + 1]] : []); piano.guide([seq[i]]); dots(seq.length, i); };
      this.wait = { want: () => [seq[i]], on: (m) => {
        if (m !== seq[i]) { if (++miss >= 2) { miss = 0; piano.hint([seq[i]]); } return; }
        miss = 0; piano.ripple(m, 0x9dffc8); i++;
        if (i < seq.length) return show();
        this.wait = null; piano.setTargets([]); piano.guide(null); $('dots').classList.add('done'); sound.chime(86);
        setTimeout(() => res(this.alive(run)), 900);
      } };
      this.stopWait = () => res(false);
      show();
    });
  },
  // steps 2 and 3: in time; a loop on the weak passage if needed, then the whole piece once more
  async piece(id, step, run) {
    const tl = timeline(id), q = SONGS[id].q / (step === 2 ? 0.7 : 1), seq = tl.rh;
    setSpan(id);
    await this.say(step === 2 ? 'c_time' : 'c_tempo'); if (!this.alive(run)) return null;
    let best = 0;
    for (let tries = 0; tries < 2; tries++) {
      const r = await this.timed(seq, q, run, step === 3 ? tl.lh : null); if (!r) return null;
      best = Math.max(best, r.stars);
      const { weak } = (await this.feedback(r, run, true)) || {}; if (!this.alive(run)) return null;
      if (r.stars >= (step === 2 ? 2 : 3) || tries === 1) break;
      // the weak passage, three times more slowly, then the whole piece again
      if (weak) {
        await this.say('c_loop'); if (!this.alive(run)) return null;
        const part = seq.slice(weak[0], weak[1]), t0 = part[0].t, piece = part.map((e) => ({ ...e, t: e.t - t0 }));
        for (let k = 0; k < 3; k++) { if (!await this.timed(piece, q / 0.75, run, null, k > 0)) return null; }
        await this.say('c_loopok'); if (!this.alive(run)) return null;
      }
    }
    setSpan(null); return this.alive(run) ? best : null;
  },
  // one pass in time: four ticks, then the notes light up on the beat (or only the score shows them, lights off);
  // every key struck is timed against them. seq: events { t, d, ms: [midi], h } or { t, d, m } (one note).
  // o: { lh: accompaniment the piano plays, quick: two ticks only, lights, staff, any: any key counts (rhythm) }
  timed(seq, q, run, o = {}) {
    if (Array.isArray(o) || o === null) o = { lh: o }; // the coach's older call: timed(seq, q, run, lh, quick)
    if (arguments[4]) o.quick = true;
    const lights = o.lights !== false, ev = seq.map((e) => (e.ms ? e : { ...e, ms: [e.m] }));
    return new Promise((res) => {
      const c = sound.ctx, ticks = o.quick ? 2 : 4, t0 = c.currentTime + 0.4 + ticks * q;
      const endBeat = Math.max(...ev.map((e) => e.t + e.d));
      const exp = ev.flatMap((e, i) => e.ms.map((m) => ({ m, at: t0 + e.t * q, t: e.t, d: e.d, i }))).sort((a, b) => a.at - b.at);
      const stopAt = t0 + endBeat * q + 0.5, beats = Math.ceil(endBeat) + ticks;
      for (let b = 0; b < beats; b++) { const at = t0 + (b - ticks) * q; this.tick(at, b < ticks ? (b === 0 ? 1 : 0.8) : 0.35, b < ticks); }
      if (o.lh) for (const e of o.lh) { const at = t0 + e.t * q, dur = e.d * q * 0.94; if (e.t >= endBeat) continue; sound.noteOn(e.m, 0.3, at); sound.noteOff(e.m, at + dur); setTimeout(() => { if (this.live === live) piano.press(e.m, 0.3); }, (at - c.currentTime) * 1000); setTimeout(() => piano.release(e.m), (at + dur - c.currentTime) * 1000); }
      const live = this.live = { exp, got: [], q, any: !!o.any, demo: !!o.demo };
      // the model: the piano plays the exercise itself, the keys go down under the light
      if (o.demo) for (const e of exp) { const dur = e.d * q * 0.92; sound.noteOn(e.m, 0.55, e.at); sound.noteOff(e.m, e.at + dur); setTimeout(() => { if (this.live === live) piano.press(e.m, 0.5); }, (e.at - c.currentTime) * 1000); setTimeout(() => piano.release(e.m), (e.at + dur - c.currentTime) * 1000); }
      const times = [...new Set(exp.map((e) => e.t))];
      dots(times.length, 0); let lastT = null, miss = 0;
      const frame = () => {
        if (!this.alive(run) || this.live !== live) { bc?.classList.remove('on'); piano.setTargets([]); piano.guide(null); return res(null); }
        const now = c.currentTime;
        // the notes to play now (from half a beat before), and the next ones, faintly
        let k = times.findIndex((t) => t0 + t * q > now - 0.12 * q - 0.05); if (k < 0) k = times.length;
        const nowNotes = k < times.length && t0 + times[k] * q - now < q * 0.6 ? exp.filter((e) => e.t === times[k]).map((e) => e.m) : [];
        const nextNotes = k + 1 < times.length ? exp.filter((e) => e.t === times[k + 1]).map((e) => e.m) : [];
        if (lights) { piano.setTargets(nowNotes, true, nextNotes.filter((m) => !nowNotes.includes(m))); piano.guide(nowNotes); }
        else if (live.hint && nowNotes.length) { piano.setTargets(nowNotes, true); live.hint = false; setTimeout(() => this.live === live && piano.setTargets([]), 500); }
        if (o.staff && k < times.length && times[k] !== lastT && nowNotes.length) { lastT = times[k]; staff.cursor(times[k]); }
        // the beats counted above the score: the count-in, then one, two, three, four in every bar
        if (o.staff) { const bt = Math.floor((now - t0) / q + 1e-3), on = bt < 0 ? bt + ticks : ((bt % meterN) + meterN) % meterN; [...bc.children].forEach((el, j) => el.classList.toggle('on', j === on)); bc.classList.toggle('count', bt < 0); }
        dots(times.length, Math.min(times.length, k));
        if (now > stopAt) { this.live = null; bc?.classList.remove('on'); piano.setTargets([]); piano.guide(null); $('dots').classList.add('done'); return res(live.demo ? { demo: true } : this.score(live)); }
        requestAnimationFrame(frame);
      };
      if (o.staff) staff.cursor(times[0]);
      const bc = $('beatc'), meterN = o.meter || 4; if (o.staff) { bc.innerHTML = Array.from({ length: meterN }, (_, k) => `<i>${k + 1}</i>`).join(''); const r = $('staff').getBoundingClientRect(); bc.style.top = `${Math.round(r.top - 34)}px`; bc.classList.add('on'); } // just above the score
      requestAnimationFrame(frame);
    });
  },
  // a soft wooden tick for the beat, higher for the count-in
  tick(at, vol, count) {
    const c = sound.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = count ? 1568 : 1046;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.18 * vol, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, at + 0.07);
    o.connect(g).connect(sound.out); o.start(at); o.stop(at + 0.09);
  },
  // the score: each awaited note matched with the nearest key of the same note struck around its time (any key, for
  // rhythm alone); then how long the notes were held, how they joined, and how hard they were struck
  score(live) {
    const { exp, got, q } = live, win = Math.max(0.2, q * 0.5), used = new Set(), errs = [], hit = [];
    exp.forEach((e, i) => {
      let best = -1, bd = 1e9;
      got.forEach((g, k) => { if (used.has(k) || (!live.any && g.m !== e.m)) return; const dd = Math.abs(g.at - e.at); if (dd < bd && dd <= win) { bd = dd; best = k; } });
      if (best < 0) { errs.push(null); hit.push(null); return; }
      used.add(best); errs.push(got[best].at - e.at); hit.push(got[best]);
    });
    const hits = errs.filter((x) => x != null), acc = hits.length / exp.length;
    const mae = hits.length ? hits.reduce((a, x) => a + Math.abs(x), 0) / hits.length : 1;
    const bias = hits.length ? hits.reduce((a, x) => a + x, 0) / hits.length : 0;
    const extra = got.length - used.size;
    const vels = hit.filter((g) => g && g.src !== 'key').map((g) => g.v), velMean = vels.length ? vels.reduce((a, v) => a + v, 0) / vels.length : null;
    let uneven = false;
    if (vels.length >= 5) { const sd = Math.sqrt(vels.reduce((a, v) => a + (v - velMean) ** 2, 0) / vels.length); uneven = sd / velMean > 0.22; }
    // long notes held at least most of their length
    const longs = exp.map((e, i) => ({ e, g: hit[i] })).filter(({ e, g }) => g && e.d >= 2);
    const shortHeld = longs.filter(({ e, g }) => (g.off ?? Infinity) - g.at < e.d * q * 0.7).length;
    // legato: each key let go no earlier than the next one goes down; staccato: each key let go within half a beat
    let joined = 0, pairs = 0, short = 0, held = 0;
    for (let i = 0; i < exp.length; i++) { const g = hit[i]; if (!g || g.off == null) continue; held++; if (g.off - g.at <= q * 0.5) short++; const n = hit[i + 1]; if (n) { pairs++; if (g.off >= n.at - 0.06) joined++; } }
    const stars = acc >= 0.95 && mae <= 0.09 && extra <= 1 ? 3 : acc >= 0.85 && mae <= 0.16 ? 2 : acc >= 0.6 ? 1 : 0;
    // the weak passage: the four to six notes with the most trouble
    let weak = null, worst = 0; const n = exp.length, size = Math.min(6, Math.max(4, Math.round(n / 5)));
    for (let a = 0; a + size <= n; a++) { let bad = 0; for (let k = a; k < a + size; k++) bad += errs[k] == null ? 1 : Math.abs(errs[k]) > 0.16 ? 0.5 : 0; if (bad > worst) { worst = bad; weak = [a, a + size]; } }
    const wk = worst >= 1.5 && n >= 8 ? weak : null;
    const r = { stars, acc, mae, bias, uneven, weak: wk, weakT: wk ? [exp[wk[0]].t, exp[wk[1] - 1].t + exp[wk[1] - 1].d] : null, holdOk: longs.length ? shortHeld / longs.length < 0.34 : true,
      legato: pairs ? joined / pairs : null, staccato: held ? short / held : null, vel: velMean };
    window.__coachLast = r; // read by the automated test
    return r;
  },
  // stars, then one tip, the most useful one; returns the weak passage to work on
  async feedback(r, run, withStars, o = {}) {
    if (withStars) { toast('★'.repeat(r.stars) + '☆'.repeat(3 - r.stars)); sound.chime(80 + r.stars * 4); await this.say('c_star' + r.stars); if (!this.alive(run)) return null; }
    const tip = r.acc < 0.85 ? 'c_wrong'
      : o.hold && !r.holdOk ? 'k_tip_hold'
      : o.art === 'legato' && r.legato != null && r.legato < 0.7 ? 'k_tip_legato'
      : o.art === 'staccato' && r.staccato != null && r.staccato < 0.7 ? 'k_tip_stacc'
      : o.dyn === 'p' && r.vel != null && r.vel > 0.55 ? 'k_tip_soft'
      : o.dyn === 'f' && r.vel != null && r.vel < 0.6 ? 'k_tip_loud'
      : r.bias < -0.06 ? 'c_rush' : r.bias > 0.07 ? 'c_drag' : r.uneven ? 'c_uneven' : r.stars >= 2 ? 'c_steady' : null;
    if (tip && !(tip === 'c_wrong' && !r.weak)) await this.say(tip);
    return { weak: r.weak, tip };
  },
  // every key struck (and let go) while the coach listens
  onNote(m, vel, src) {
    if (!this.active()) return;
    if (this.live) {
      if (this.live.demo) return; // listening to the model
      const now = sound.ctx.currentTime; this.live.got.push({ m, at: now, v: vel, src });
      const e = this.live.exp.find((x) => (this.live.any || x.m === m) && Math.abs(x.at - now) < Math.max(0.2, this.live.q * 0.5));
      if (e) piano.ripple(m, 0x9dffc8); else if (++this.live.wrong >= 2 || isNaN(this.live.wrong)) { this.live.wrong = 0; this.live.hint = true; }
    } else this.wait?.on(m);
  },
  onOff(m) { const g = this.live?.got.findLast?.((x) => x.m === m && x.off == null); if (g) g.off = sound.ctx.currentTime; this.wait?.off?.(m); },
  want() {
    if (this.live) { const now = sound.ctx.currentTime, e = this.live.exp.find((x) => x.at > now - this.live.q * 0.5); return e ? this.live.exp.filter((x) => x.at === e.at).map((x) => x.m) : []; }
    return this.wait?.want() || [];
  },
  stop() { this.run++; this.live = null; this.wait = null; this.stopWait?.(); this.stopWait = null; sound.stopVoice(); piano.setTargets([]); piano.guide(null); piano.clearBadges(); dots(0, 0); staff.hide(); course.figure?.(null); if (span) setSpan(null); $('cont').classList.remove('on'); hintText(''); },
};

// ------------------------------------------------------------------ the course
// Ten chapters (course.js). Nothing is kept: the course map is always open, the first lesson is marked "start here",
// and each lesson ends on "next lesson". A lesson is a list of steps run one after the other by the coach: spoken
// lines, reading on the staff with no light, playing in time (scored, the slipping passage looped slowly, at most
// three tries so nobody is ever stuck), chords, playing back by ear, improvising over an accompaniment.
const staff = new Staff($('staff'));
const METER = { lullaby: 3, minuet: 3, gymno: 3, elise: 3 };
function songEvents(id, o = {}) {
  const tl = timeline(id), ev = tl.rh.map((e) => ({ t: e.t, d: e.d, ms: [e.m], h: 'r' }));
  let acc = null;
  if (o.lh === 'root' || o.lh === 'chord') {
    const groups = new Map(); for (const e of tl.lh) { const g = groups.get(e.t) || { t: e.t, d: e.d, ms: [] }; g.ms.push(e.m); groups.set(e.t, g); }
    for (const g of groups.values()) if (g.ms.length) ev.push({ t: g.t, d: g.d, ms: o.lh === 'root' ? [Math.min(...g.ms)] : g.ms.sort((a, b) => a - b), h: 'l' });
  } else acc = tl.lh.map((e) => ({ t: e.t, d: e.d, m: e.m }));
  return { ev, acc, q: SONGS[id].q, meter: METER[id] || 4 };
}
// an exercise as events: a song id, a line of notes, or { rh, lh, meter, key }
function exercise(x) {
  if (typeof x === 'string' && SONGS[x]) return { ...songEvents(x), key: 'C' };
  const o = typeof x === 'string' ? { rh: x } : x;
  const ev = [...parse(o.rh || '', 'r'), ...parse(o.lh || '', 'l')];
  // keep the written spelling (B flat stays a flat on the staff)
  for (const [str, h] of [[o.rh, 'r'], [o.lh, 'l']]) { if (!str) continue; let t = 0; for (const tok of str.trim().split(/\s+/).filter(Boolean)) { const [n, d0] = tok.split(':'); if (n !== 'r') { const e = ev.find((x) => x.h === h && Math.abs(x.t - t) < 1e-6); if (e) e.sp = (n.startsWith('[') ? n.slice(1, -1).split(',') : [n]).map((k) => `${k.slice(0, -1)}/${k.slice(-1)}`); } t += d0 ? +d0 : 1; } }
  return { ev, acc: null, q: 0.6, meter: o.meter || 4, key: o.key || 'C' };
}
function spanOf(ev) { const ms = ev.flatMap((e) => e.ms); let lo = Math.min(...ms), hi = Math.max(...ms); if ([1, 3, 6, 8, 10].includes(lo % 12)) lo--; if ([1, 3, 6, 8, 10].includes(hi % 12)) hi++; span = [lo, hi]; piano.setRange(...range()); applyLabels(); }

const course = {
  open() {
    const t = T[lang];
    $('course-h').textContent = t.course;
    $('course-l').innerHTML = `<li class="tip">${t.mapTip}</li>` + COURSE.map((ch, c) => `<li class="cat">${c + 1} · ${ch[lang]}</li>` + ch.lessons.map((l) => {
      const i = LESSONS.findIndex((x) => x.id === l.id);
      return `<li><span class="nm">${l[lang]}</span><button data-i="${i}" class="${i === 0 ? 'pl' : ''}">${i === 0 ? t.startHere : t.go}</button></li>`;
    }).join('')).join('') + `<li class="cat">${t.practice}</li><li><span class="nm">${t.coachSession}</span><button data-coach="1">${t.go}</button></li>`;
    $('course').classList.add('on'); $('lessonend').classList.remove('on');
  },
  close() { $('course').classList.remove('on'); },
  async start(i) {
    this.close(); $('lessonend').classList.remove('on');
    const L = LESSONS[i]; this.idx = i; toast(L[lang], 3500);
    // the lesson's voice lines are fetched as it opens, so none is late or silent
    sound.loadLines(lang, [...new Set([...L.steps.filter((x) => x.say).map((x) => x.say), 'k_demo', 'k_yourturn', 'k_next', 'k_read_hint'])]);
    if (L.steps[0].basics) { this.pending = i; toLesson(); return; } // the guided first lesson; its end comes back here
    const run = ++coach.run; mode = 'coach'; document.body.dataset.mode = 'coach'; songs.stop(); lesson.stop();
    for (const [k, st] of L.steps.entries()) { if (!coach.alive(run)) return; $('prog').style.setProperty('--p', `${(k / L.steps.length) * 100}%`); await this.step(st, run); }
    $('prog').style.setProperty('--p', '100%');
    if (!coach.alive(run)) return;
    staff.hide(); this.figure(null); setSpan(null); this.end(i);
  },
  async end(i) {
    sound.chime(88); caption(CAPTIONS[lang].k_next); await sound.say('k_next');
    mode = 'free'; document.body.dataset.mode = 'free'; caption('');
    const nx = LESSONS[i + 1], t = T[lang];
    $('le-t').textContent = LESSONS[i][lang];
    $('le-next').textContent = nx ? `${t.nextLesson} : ${nx[lang]}` : t.coachSession; $('le-next').dataset.i = nx ? i + 1 : 'coach';
    $('lessonend').classList.add('on');
  },
  step(st, run) {
    if (st.say) return this.explain(st, run);
    if (st.show) return this.showOnly(st);
    if (st.figure) return this.figure(st.figure);
    if (st.explore) return this.explore(st, run);
    if (st.pedal) return this.pedal(st, run);
    if (st.read) return this.read(st, run);
    if (st.play) return this.play(st, run);
    if (st.chords) return this.chords(st, run);
    if (st.echo) return this.echo(st, run);
    if (st.improv) return this.improv(st, run);
  },
  // an explanation: what it talks about is pointed at on the score, and the next step waits for "Continue" (the
  // learner goes at their own pace and can hear it again)
  async explain(st, run) {
    if (st.point) staff.point(st.point);
    await coach.say(st.say); if (!coach.alive(run)) return;
    if (!st.go) await this.choose(run, [{ k: 'go', t: T[lang].cont, main: true }], st.say);
  },
  // buttons under the piano, the main one also with space, Enter or the right arrow; "listen again" repeats a line
  choose(run, list, again = null) {
    return new Promise((res) => {
      const box = $('cont'); box.innerHTML = '';
      const done = (k) => { removeEventListener('keydown', key, true); clearInterval(iv); box.classList.remove('on'); box.innerHTML = ''; res(k); };
      if (again) { const b = document.createElement('button'); b.textContent = T[lang].again2; b.onclick = () => { caption(CAPTIONS[lang][again]); sound.say(again); }; box.append(b); }
      for (const o of list) { const b = document.createElement('button'); b.textContent = o.t; if (o.main) b.className = 'pl'; b.onclick = () => done(o.k); box.append(b); }
      const main = list.find((o) => o.main) || list[0];
      const key = (e) => { if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); done(main.k); } };
      addEventListener('keydown', key, true);
      const iv = setInterval(() => { if (!coach.alive(run)) done(null); }, 300);
      box.classList.add('on');
    });
  },
  // the reading aids for the score of a step
  aids(st, x, dflt = true) {
    const nm = (m) => NAMES[lang][((m % 12) + 12) % 12];
    return { meter: x.meter, key: x.key, lead: st.lead, names: (st.names ?? dflt) ? nm : null, fingers: st.fingers || null, mark: st.mark || null, art: st.art || null, hands: lang === 'fr' ? ['MD', 'MG'] : ['RH', 'LH'] };
  },
  // a drawing over the piano: the two hands with their finger numbers (the thumb is 1 on both)
  figure(name) {
    const el = $('figure'), L = lang === 'fr' ? ['main gauche', 'main droite'] : ['left hand', 'right hand'];
    if (!name) { el.classList.remove('on'); return; }
    const hand = (x, mirror, label) => {
      const fx = mirror ? [-1, 1] : [1, 1], f = [[-62, -10, 1, 34, -35], [-34, -70, 2, 26, -8], [-8, -84, 3, 26, 0], [18, -74, 4, 25, 6], [42, -52, 5, 22, 14]];
      return `<g transform="translate(${x},150) scale(${fx[0]},1)"><rect x="-58" y="-40" width="112" height="96" rx="34" fill="#f1d9bd" stroke="#8a5a3a" stroke-width="2"/>` +
        f.map(([dx, dy, n, w, rot]) => `<g transform="translate(${dx},${dy}) rotate(${rot})"><rect x="${-w / 2}" y="-44" width="${w}" height="${n === 1 ? 58 : 72}" rx="${w / 2}" fill="#f1d9bd" stroke="#8a5a3a" stroke-width="2"/><g transform="translate(0,-26) rotate(${-rot}) translate(0,26) scale(${fx[0]},1)"><circle cx="0" cy="-26" r="11" fill="#d9781f"/><text x="0" y="-21" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="Arial">${n}</text></g></g>`).join('') +
        `<g transform="scale(${fx[0]},1)"><text x="0" y="80" text-anchor="middle" font-size="15" fill="#5a3a20" font-family="Arial">${label}</text></g></g>`;
    };
    el.innerHTML = `<svg viewBox="0 0 520 250">${hand(140, true, L[0])}${hand(380, false, L[1])}</svg>`;
    el.classList.add('on');
  },
  // a score to look at while the teacher explains it
  async showOnly(st) { const x = exercise(st.show); spanOf(x.ev); await staff.show(x.ev, this.aids(st, x)); if (st.point) staff.point(st.point); },
  // the score that writes itself: every key played appears on the staff where it belongs, with its name
  explore(st, run) {
    return new Promise(async (res) => {
      const clef = st.explore.clef || 'treble', n = st.explore.n || 6, seen = new Set(), shown = [];
      const fold = (m) => { if (clef === 'bass') { while (m > 60) m -= 12; while (m < 40) m += 12; } else { while (m < 60) m += 12; while (m > 81) m -= 12; } return m; };
      const h = clef === 'bass' ? 'l' : 'r', nm = (m) => NAMES[lang][((m % 12) + 12) % 12];
      await staff.show([{ t: 0, d: 4, ms: [clef === 'bass' ? 48 : 60], h }], { names: nm, noTime: true }); staff.el.querySelector('svg')?.classList.add('ghost');
      hintText(T[lang].explore);
      coach.wait = {
        want: () => [],
        on: async (m) => {
          const s = fold(m); shown.push(s); if (shown.length > 8) shown.shift(); seen.add(s);
          await staff.show(shown.map((x, i) => ({ t: i, d: 1, ms: [x], h })), { meter: 8, names: nm, noTime: true }); staff.cursor(shown.length - 1);
          dots(n, Math.min(n, seen.size));
          if (seen.size >= n && coach.wait) { coach.wait = null; hintText(''); sound.chime(88); setTimeout(res, 900); }
        },
      };
      coach.stopWait = () => res();
      dots(n, 0);
    });
  },
  // play in time: first the piano plays it (listen and watch), then the learner, when ready; after each try the
  // stars and one tip, then the learner chooses: again, work on the passage that slipped, or go on
  async play(st, run) {
    this.figure(null); const x = exercise(st.play), q = (st.q || x.q) / (st.tempo || 1);
    let ev = x.ev; if (typeof st.play === 'string' && SONGS[st.play] && st.lh) ev = songEvents(st.play, st).ev;
    if (st.hands) ev = ev.filter((e) => e.h === st.hands[0]);
    const acc = typeof st.play === 'string' && SONGS[st.play] && !st.lh ? x.acc : null;
    spanOf(ev);
    if (st.fingers) for (const [m, n] of Object.entries(st.fingers)) piano.setBadge(+m, n);
    const show = (e) => staff.show(e, this.aids(st, x, st.lights !== false));
    await show(ev); if (!coach.alive(run)) return;
    const o = { lh: acc, lights: st.lights !== false, staff: true, any: st.any, meter: x.meter };
    // listen first (not for the pieces played from the score alone: reading them is the exercise)
    if (st.lights !== false) {
      caption(CAPTIONS[lang].k_demo); await sound.say('k_demo'); if (!coach.alive(run)) return;
      if (!await coach.timed(ev, q, run, { ...o, demo: true })) { if (!coach.alive(run)) return; }
    }
    let k = await this.choose(run, [{ k: 'go', t: T[lang].yourTurn, main: true }, { k: 'listen', t: T[lang].listenFirst }]);
    while (coach.alive(run) && k) {
      if (k === 'listen') { if (!await coach.timed(ev, q, run, { ...o, demo: true })) { if (!coach.alive(run)) return; } k = await this.choose(run, [{ k: 'go', t: T[lang].yourTurn, main: true }, { k: 'listen', t: T[lang].listenFirst }]); continue; }
      if (k === 'part' && this.weak) {
        const [a, b] = this.weak, shift = Math.floor(a / x.meter) * x.meter;
        const part = ev.filter((e) => e.t >= a - 1e-6 && e.t < b - 1e-6).map((e) => ({ ...e, t: e.t - shift }));
        await show(part); await coach.say('c_loop'); if (!coach.alive(run)) return;
        await coach.timed(part, q / 0.75, run, { ...o, lh: null, demo: true });
        for (let j = 0; j < 3; j++) { if (!await coach.timed(part, q / 0.75, run, { ...o, lh: null, quick: j > 0 })) return; }
        await show(ev); k = await this.choose(run, [{ k: 'go', t: T[lang].wholeAgain, main: true }]); continue;
      }
      if (k === 'next') break;
      caption(CAPTIONS[lang].k_yourturn); await sound.say('k_yourturn'); if (!coach.alive(run)) return;
      const r = await coach.timed(ev, q, run, o); if (!r) return;
      const fb = await coach.feedback(r, run, true, st); if (!fb || !coach.alive(run)) return;
      const ok = r.stars >= 2 && (!st.hold || r.holdOk) && (st.art !== 'legato' || r.legato == null || r.legato >= 0.7) && (st.art !== 'staccato' || r.staccato == null || r.staccato >= 0.7)
        && (!st.dyn || r.vel == null || (st.dyn === 'p' ? r.vel <= 0.55 : r.vel >= 0.6));
      this.weak = r.weakT;
      const opts = [{ k: 'go', t: T[lang].tryAgain, main: !ok }];
      if (r.weakT) opts.push({ k: 'part', t: T[lang].workPart });
      opts.push({ k: 'listen', t: T[lang].listenFirst });
      opts.push({ k: 'next', t: T[lang].cont, main: ok });
      k = await this.choose(run, opts);
    }
    piano.clearBadges(); staff.hide();
  },
  // read: one note (or chord) at a time on the staff, no light; a wrong note twice and the key is shown
  read(st, run) {
    return new Promise(async (res) => {
      const x = exercise(st.read), ev = [...x.ev].sort((a, b) => a.t - b.t);
      spanOf(ev); await staff.show(ev, this.aids(st, x)); if (!coach.alive(run)) return res();
      let i = 0, got = new Set(), miss = 0, hinted = false;
      const next = () => { got = new Set(); miss = 0; if (i >= ev.length) { coach.wait = null; sound.chime(86); $('dots').classList.add('done'); setTimeout(() => { staff.hide(); res(); }, 700); return; } staff.cursor(ev[i].t); dots(ev.length, i); };
      coach.wait = {
        want: () => ev[i] ? ev[i].ms.filter((m) => !got.has(m)) : [],
        on: (m) => {
          const e = ev[i]; if (!e) return;
          if (e.ms.includes(m)) { got.add(m); piano.ripple(m, 0x9dffc8); if (e.ms.every((n) => got.has(n))) { i++; next(); } return; }
          if (++miss >= 2) { miss = 0; piano.hint(e.ms.filter((n) => !got.has(n))); if (!hinted) { hinted = true; caption(CAPTIONS[lang].k_read_hint); sound.say('k_read_hint'); } }
        },
      };
      coach.stopWait = () => res();
      next();
    });
  },
  // chords: three keys together (within two seconds on a computer keyboard or with a mouse)
  chords(st, run) {
    return new Promise(async (res) => {
      const list = st.chords.map((c) => parse(`${c}:4`)[0].ms); let i = 0, w = null;
      const show = async () => {
        if (coach.wait !== w) return; w.busy = false; // a late call from a step that is over
        if (i >= list.length) { coach.wait = null; piano.setTargets([]); staff.hide(); return res(); }
        spanOf([{ ms: list[i] }]); piano.setTargets(list[i], true); piano.guide(list[i]); toast(chordName(list[i]), 2000);
        await staff.show([{ t: 0, d: 4, ms: list[i], h: 'r' }], {}); dots(list.length, i);
      };
      w = coach.wait = {
        want: () => (w.busy ? [] : list[i] || []),
        on: (m) => {
          const c = list[i]; if (!c || w.busy) return; if (c.includes(m)) piano.ripple(m, 0xffe2b0);
          const now = performance.now();
          if (c.every((n) => held.has(n) || now - (pressedAt.get(n) || -1e9) < 2000)) { c.forEach((n) => { pressedAt.delete(n); piano.ripple(n, 0x9dffc8); }); sound.chime(86); i++; w.busy = true; setTimeout(show, 600); }
        },
      };
      coach.stopWait = () => res();
      show();
    });
  },
  // the pedal: each chord played, the pedal pressed, the keys let go (the sound goes on); a button for touch screens
  pedal(st, run) {
    return new Promise(async (res) => {
      const list = st.pedal.map((c) => parse(`${c}:4`)[0].ms); let i = 0, stage = 0, w = null;
      const btn = document.createElement('button'); btn.id = 'pedalbtn'; btn.textContent = T[lang].pedal; document.body.append(btn);
      btn.onpointerdown = (e) => { e.preventDefault(); setPedal(true); }; btn.onpointerup = btn.onpointerleave = btn.onpointercancel = () => setPedal(pedalLatched);
      const done = () => { btn.remove(); coach.wait = null; piano.setTargets([]); staff.hide(); res(); };
      const show = async () => {
        if (coach.wait !== w) return; if (i >= list.length) return done();
        stage = 0; spanOf([{ ms: list[i] }]); piano.setTargets(list[i], true); piano.guide(list[i]); toast(chordName(list[i]), 1800);
        await staff.show([{ t: 0, d: 4, ms: list[i], h: 'l' }], { names: (m) => NAMES[lang][m % 12] }); dots(list.length, i);
      };
      const check = () => {
        const c = list[i]; if (!c) return;
        if (stage === 0 && c.every((n) => held.has(n) || performance.now() - (pressedAt.get(n) || -1e9) < 2000)) { stage = 1; c.forEach((n) => piano.ripple(n, 0xffe2b0)); }
        if (stage === 1 && sound.sustain) stage = 2;
        if (stage === 2 && c.every((n) => !held.has(n))) { stage = 3; c.forEach((n) => piano.ripple(n, 0x9dffc8)); sound.chime(86); i++; setTimeout(show, 900); }
      };
      w = coach.wait = { want: () => list[i] || [], on: () => check(), off: () => setTimeout(check, 0), pedal: () => check() }; // off: once the key is out of held
      coach.stopWait = () => { btn.remove(); res(); };
      show();
    });
  },
  // by ear: the piano plays a short phrase (the keys light while it plays), then waits for it back, with no light
  async echo(st, run) {
    staff.hide();
    for (const ph of st.echo) {
      const ev = parse(ph), q = 0.55; spanOf(ev);
      const demo = async () => { const c = sound.ctx, t0 = c.currentTime + 0.3; ev.forEach((e) => { const at = t0 + e.t * q; sound.noteOn(e.ms[0], 0.6, at); sound.noteOff(e.ms[0], at + q * 0.9); setTimeout(() => piano.press(e.ms[0], 0.5), (at - c.currentTime) * 1000); setTimeout(() => piano.release(e.ms[0]), (at + q * 0.9 - c.currentTime) * 1000); }); await sleep((0.3 + ev.length * q) * 1000 + 300); };
      await demo(); if (!coach.alive(run)) return;
      await new Promise((res) => {
        let i = 0, miss = 0, tries = 0;
        coach.wait = {
          want: () => (ev[i] ? ev[i].ms : []),
          on: async (m) => {
            if (!ev[i] || coach.wait?.busy) return;
            if (m === ev[i].ms[0]) { piano.ripple(m, 0x9dffc8); miss = 0; if (++i >= ev.length) { coach.wait = null; sound.chime(84 + Math.min(8, ev.length)); dots(0, 0); setTimeout(res, 700); } else dots(ev.length, i); return; }
            if (++miss >= 2) { miss = 0; if (++tries <= 1) { i = 0; coach.wait.busy = true; await demo(); coach.wait && (coach.wait.busy = false); } else piano.hint([ev[i].ms[0]]); }
          },
        };
        coach.stopWait = () => res();
        dots(ev.length, 0);
      });
      if (!coach.alive(run)) return;
    }
  },
  // improvising: the piano plays the chords bar after bar, the allowed keys glow faintly; every note is right
  async improv(st, run) {
    staff.hide();
    const chords = st.improv.chords.map((c) => parse(`${c}:4`)[0].ms), q = 0.55, bars = st.improv.bars, c = sound.ctx, t0 = c.currentTime + 0.5;
    span = [48, 84]; piano.setRange(...range());
    const [lo, hi] = range(), allowed = []; for (let m = lo; m <= hi; m++) { const bl = [1, 3, 6, 8, 10].includes(m % 12); if (st.improv.keys === 'black' ? bl : !bl) allowed.push(m); }
    piano.setTargets([], true, allowed);
    for (let b = 0; b < bars; b++) { const ch = chords[b % chords.length], at = t0 + b * 4 * q; for (const m of ch) { sound.noteOn(m - 12, 0.32, at); sound.noteOff(m - 12, at + 4 * q * 0.95); } for (let k = 0; k < 4; k++) this.tickSoft?.(at + k * q); }
    let n = 0; coach.wait = { want: () => [], on: (m) => { n++; piano.ripple(m, allowed.includes(m) ? 0x9dffc8 : 0xffe2b0); } };
    const total = bars * 4 * q + 0.6; const s0 = performance.now();
    while (performance.now() - s0 < total * 1000) { if (!coach.alive(run)) return; dots(bars, Math.min(bars, Math.floor((performance.now() - s0) / (4 * q * 1000)))); await sleep(200); }
    coach.wait = null; piano.setTargets([]); dots(0, 0); sound.chime(n >= 8 ? 92 : 84);
  },
};
$('course-l').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.coach) { course.close(); coach.session(); } else course.start(+b.dataset.i); });

// ------------------------------------------------------------------ screens
let started = false, mode = 'intro';
function caption(txt) {
  const c = $('cap'); c.classList.remove('on');
  setTimeout(() => { c.textContent = txt || ''; if (txt) c.classList.add('on'); placeStaff(); }, 260);
}
// the score sits just under the caption, however many lines it has (a phone held sideways hides the caption instead)
function placeStaff() {
  const st = $('staff'), c = $('cap'); if (!st || innerHeight <= 520) { if (st) st.style.top = ''; return; }
  const bottom = c.textContent ? c.getBoundingClientRect().bottom : 0;
  st.style.top = bottom ? `${Math.round(Math.max(bottom + 44, innerHeight * 0.09 + 112))}px` : ''; // room for the beats above it
  const f = $('figure'); if (f) f.style.top = bottom ? `${Math.round(bottom + 20)}px` : ''; // the hands drawing never covers the words
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
function hintText(t) { const h = $('chint'); h.textContent = t || ''; h.classList.toggle('on', !!t); }
function toast(txt, ms = 2600) { const t = $('toast'); t.textContent = txt; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }

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
  if (which === 'lesson') toLesson(); else if (which === 'course') { mode = 'free'; document.body.dataset.mode = 'free'; course.open(); } else toFree(false);
}
function toLesson() {
  songs.stop(); coach.stop();
  mode = 'lesson'; document.body.dataset.mode = 'lesson';
  lesson.go(0);
}
async function toFree(fromLesson) {
  if (fromLesson && mode === 'lesson' && course.pending != null) { const i = course.pending; course.pending = null; lesson.stop(); return course.end(i); }
  course.pending = null; $('lessonend').classList.remove('on');
  if (mode === 'coach') coach.stop();
  lesson.stop(); songs.stop(); mode = 'free'; document.body.dataset.mode = 'free';
  $('prog').style.setProperty('--p', '100%');
  if (fromLesson) { caption(T[lang].done); setTimeout(() => caption(''), 3800); return; }
  caption(CAPTIONS[lang].free); await sound.say('free'); if (mode === 'free') caption('');
}

function texts() {
  const t = T[lang], set = (id, txt) => { const el = $(id); if (el) el.lastChild.textContent = txt; };
  document.documentElement.lang = lang;
  $('tag').textContent = t.tag; $('t-learn').textContent = t.learnC; $('s-learn').textContent = t.learnCS; $('le-map').textContent = t.toMap;
  $('t-free').textContent = t.free; $('s-free').textContent = t.freeS;
  $('hp').textContent = document.body.classList.contains('loaded') ? t.ready : t.tuning;
  set('b-replay', t.replay); set('b-next', t.next); set('b-prev', t.prev); set('b-exit', t.exit); set('b-pause', t.pause);
  set('b-notes', t.notes); set('b-pedal', t.pedal); set('b-rain', t.rain); set('b-lesson', t.course); set('b-songs', t.songs); set('b-midi', t.midi); if ($('midi-hint')) $('midi-hint').querySelector('span').textContent = t.midiHint;
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
on('go-learn', () => begin('course'));
on('go-free', () => begin('free'));
on('b-replay', () => { if (mode === 'coach') { if (coach.last && !sound.speaking) { caption(CAPTIONS[lang][coach.last]); sound.say(coach.last); } } else lesson.go(lesson.i); });
on('b-next', () => lesson.go(lesson.i + 1));
on('b-prev', () => lesson.go(lesson.i - 1));
on('b-exit', () => toFree(false));
on('b-pause', () => pause(!paused));
on('b-lesson', () => course.open()); // the course map (its last line: a session with the coach)
on('course-x', () => course.close());
on('le-map', () => course.open());
on('le-next', () => { const i = $('le-next').dataset.i; $('lessonend').classList.remove('on'); if (i === 'coach') coach.session(); else course.start(+i); });
// whatever an older version kept on this device is forgotten
try { localStorage.removeItem('nocturne-coach'); localStorage.removeItem('nocturne-basics'); } catch {}
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
window.__placeStaff = placeStaff;
window.__nocturne = { piano, sound, lesson, songs, coach, store, course, staff, noteOn, noteOff, toLesson: () => toLesson(), get mode() { return mode; }, coachTry: (id) => { const run = ++coach.run; mode = 'coach'; document.body.dataset.mode = 'coach'; return coach.piece(id, 3, run); } };
