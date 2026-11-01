// The course: ten chapters, from the first key to playing alone from a lead sheet. The order follows the usual
// beginner methods: the keyboard, the pulse and note values, reading from landmark notes (middle C, treble G, bass F)
// and by intervals, the left hand, hands together, touch (legato, staccato, loud and soft), sharps and scales with
// the thumb passing under, chords and accompaniment, then playing alone: lead sheets, by ear, improvising. Every
// piece is practised in small chunks (the coach loops the passage that slips).
// Lesson steps:
//   say: id                        a spoken line (captions from captions.js)
//   basics: true                   the guided first lesson
//   read: ex, order?               notes shown on the staff one by one, no light: play what you read
//   play: ex | song                in time, scored, with { lights, staff, tempo, lh, hold, art, dyn, stars }
//   echo: [phrases]                the piano plays, the player plays it back by ear
//   improv: { chords, keys }       the piano accompanies, the player improvises
//   chords: [[notes]]              chords to find, one after the other
// ex: 'c4:1 d4:1 [c3,e3,g3]:4 r:1' (note:beats, rests r), or { rh, lh, meter, key }.
// Reading aids, on unless a step turns them off: the name of each note under it (names), the keys lit (lights), the
// beats counted above the score; finger numbers above the notes (fingers); a dynamic mark (mark: 'p' | 'f').
// The reading tests (read lessons, and pieces played from the score alone) turn names and lights off once taught.

const NAMES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function midiOf(tok) { const m = /^([a-g])(#|b)?(-?\d)$/.exec(tok); if (!m) return null; return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
// a line of notes into events { t, d, ms: [midi...], h }
export function parse(str, h = 'r', t0 = 0) {
  const ev = []; let t = t0;
  for (const tok of str.trim().split(/\s+/).filter(Boolean)) {
    const [n, d0] = tok.split(':'), d = d0 ? +d0 : 1;
    if (n !== 'r') { const ms = n.startsWith('[') ? n.slice(1, -1).split(',').map(midiOf) : [midiOf(n)]; ev.push({ t, d, ms, h }); }
    t += d;
  }
  return ev;
}
const ex = (rh, lh = '', o = {}) => ({ rh, lh, ...o });
const C = '[c3,e3,g3]', F = '[c3,f3,a3]', G = '[b2,d3,g3]', Am = '[c3,e3,a3]';

export const COURSE = [
  { fr: 'Découvrir le clavier', en: 'Meet the keyboard', lessons: [
    { id: 'first', fr: 'Première leçon : les touches, les noms, les premières mélodies', en: 'First lesson: keys, names, first melodies', steps: [{ basics: true }] },
    { id: 'fingers', fr: 'Bien s’installer et les numéros des doigts', en: 'Sitting well, and finger numbers', steps: [
      { say: 'k_fing2' }, { say: 'k_fing1' }, { say: 'k_fing3' },
      { play: ex('c4 e4 d4 f4 e4 g4 f4 d4 c4:2 r:2'), q: 0.8, fingers: { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 } }, { say: 'k_fing_end' }] },
  ] },
  { fr: 'Lire une partition', en: 'Reading a score', lessons: [
    { id: 'staff', fr: 'La portée : cinq lignes, et chaque touche à sa place', en: 'The staff: five lines, and every key in its place', steps: [
      { show: ex('c4 d4 e4 f4 g4 a4 b4 c5') }, { say: 'k_st1', point: ['lines'] }, { say: 'k_st2', point: ['spaces'] },
      { say: 'k_st3', point: [] }, { explore: { clef: 'treble', n: 6 } }, { say: 'k_st4' }] },
    { id: 'clef', fr: 'La clé de sol, le Do du milieu et le Sol', en: 'The treble clef, middle C and G', steps: [
      { show: ex('c4:2 g4:2') }, { say: 'k_cl1', point: ['clef'] }, { say: 'k_cl2', point: [{ note: 0, text: 'Do' }] }, { read: 'c4', names: true },
      { show: ex('c4:2 g4:2') }, { say: 'k_cl3', point: ['lines', { note: 1, text: 'Sol' }] }, { read: 'g4', names: true },
      { say: 'k_cl4' }, { read: 'g4 c4 g4 g4 c4 g4 c4 c4', names: false }, { say: 'k_treble_end' }] },
    { id: 'steps', fr: 'Do Ré Mi Fa Sol sur la portée', en: 'C D E F G on the staff', steps: [
      { show: ex('c4 d4 e4 f4 g4:3') }, { say: 'k_steps1' }, { read: 'c4 d4 e4 f4 g4 f4 e4 d4 c4', names: true },
      { say: 'k_steps2' }, { read: 'e4 c4 g4 d4 f4 e4 g4 c4 d4 f4', names: false },
      { say: 'k_steps3' }, { read: 'mary', names: false }, { say: 'k_steps_end' }] },
    { id: 'durations', fr: 'Combien de temps tenir une note : noire, blanche, ronde', en: 'How long to hold a note: quarter, half, whole', steps: [
      { say: 'k_dur0' },
      { show: ex('c4 c4 c4 c4') }, { say: 'k_dur1', point: [{ note: 0, text: '1' }] }, { play: ex('c4 c4 c4 c4 c4 c4 c4 c4'), any: true, q: 0.8 },
      { show: ex('c4:2 c4:2') }, { say: 'k_dur2', point: [{ note: 0, text: '2' }] }, { play: ex('c4:2 c4:2 c4:2 c4:2'), any: true, hold: true, q: 0.8 },
      { show: ex('c4:4') }, { say: 'k_dur3', point: [{ note: 0, text: '4' }] }, { play: ex('c4:4 c4:4'), any: true, hold: true, q: 0.8 },
      { say: 'k_pulse_end' }] },
    { id: 'bars', fr: 'Les mesures et le comptage', en: 'Bars and counting', steps: [
      { show: ex('c4 c4 c4:2 c4:2 c4:2 c4 c4 c4 c4 c4:4') }, { say: 'k_bar1', point: ['time'] }, { say: 'k_bar2', point: ['bar', 'measure'] },
      { say: 'k_bar3', point: [] }, { play: ex('c4 c4 c4:2 c4:2 c4:2 c4 c4 c4 c4 c4:4'), any: true, hold: true, q: 0.75 },
      { play: ex('c4 d4 e4:2 e4 d4 c4:2 c4 e4 d4 f4 e4:4'), q: 0.75 }, { say: 'k_bar_end' }] },
    { id: 'intervals', fr: 'Lire par intervalles', en: 'Reading by intervals', steps: [
      { show: ex('c4 d4 c4 e4') }, { say: 'k_int1', point: [{ note: 1, text: '+1' }, { note: 3, text: '+2' }] }, { read: 'c4 e4 g4 e4 c4 d4 f4 d4 e4 g4', names: false },
      { say: 'k_int2' }, { play: 'lune', lights: false, names: false, tempo: 0.8 }, { say: 'k_int_end' }] },
  ] },
  { fr: 'Le rythme', en: 'Rhythm', lessons: [
    { id: 'rests', fr: 'Les silences et la valse à trois temps', en: 'Rests, and the waltz in three', steps: [
      { say: 'k_rest1' }, { play: ex('c4 r c4 r c4 c4 r:2 c4:2 r c4 c4:4'), any: true, q: 0.7 },
      { say: 'k_rest2' }, { play: ex('c4 c4 c4 c4:2 c4 c4 c4 c4 c4:3', '', { meter: 3 }), any: true, hold: true, q: 0.6 },
      { say: 'k_rest_end' }] },
    { id: 'eighths', fr: 'Les croches', en: 'Eighth notes', steps: [
      { say: 'k_eighth1' }, { play: ex('c4 c4:0.5 c4:0.5 c4 c4:0.5 c4:0.5 c4:0.5 c4:0.5 c4:0.5 c4:0.5 c4 c4 c4:2 c4:2'), any: true, q: 0.8 },
      { say: 'k_dot1' }, { play: ex('c4:1.5 c4:0.5 c4:1.5 c4:0.5 c4:2 c4:2'), any: true, q: 0.75 },
      { say: 'k_eighth2' }, { play: 'jacques', tempo: 0.8 },
      { say: 'k_eighth_end' }] },
  ] },
  { fr: 'La main gauche', en: 'The left hand', lessons: [
    { id: 'bass', fr: 'La clé de fa', en: 'The bass clef', steps: [
      { say: 'k_bass1' }, { say: 'k_bass2' }, { read: ex('', 'c3 d3 e3 f3 g3 f3 e3 d3 c3'), names: true },
      { say: 'k_noname' }, { read: ex('', 'e3 c3 g3 d3 f3 c3 e3 g3'), names: false }, { say: 'k_bass_end' }] },
    { id: 'lefthand', fr: 'Une mélodie à la main gauche', en: 'A melody in the left hand', steps: [
      { say: 'k_lh1' }, { play: ex('', 'c3 c3 c3 d3 e3:2 d3:2 c3 e3 d3 d3 c3:4'), q: 0.6 }, { say: 'k_lh_end' }] },
  ] },
  { fr: 'Les deux mains', en: 'Both hands', lessons: [
    { id: 'alternate', fr: 'Chacune son tour', en: 'Taking turns', steps: [
      { say: 'k_alt1' }, { play: ex('c4 d4 e4:2 r:4 e4 f4 g4:2 r:4', 'r:4 c3 d3 e3:2 r:4 e3 f3 g3:2'), q: 0.6 }, { say: 'k_alt_end' }] },
    { id: 'together', fr: 'Ensemble', en: 'Together', steps: [
      { say: 'k_tog1' }, { play: ex('c4 c4 c4 d4 e4:2 d4:2 c4 e4 d4 d4 c4:4', 'c3:4 c3:2 g2:2 c3:2 g2:2 c3:4'), q: 0.75, hold: true },
      { say: 'k_tog_end' }] },
    { id: 'odehands', fr: 'L’Hymne à la joie à deux mains', en: 'Ode to Joy with both hands', steps: [
      { say: 'k_ode1' }, { play: 'ode', lh: 'root', tempo: 0.7 }, { say: 'k_ode2' }, { play: 'ode', lh: 'root', tempo: 1 }, { say: 'k_ode_end' }] },
  ] },
  { fr: 'Le toucher', en: 'Touch', lessons: [
    { id: 'legato', fr: 'Lié et détaché', en: 'Legato and staccato', steps: [
      { say: 'k_leg1' }, { play: ex('c4 d4 e4 f4 g4 f4 e4 d4 c4:2'), art: 'legato', q: 0.6 },
      { say: 'k_leg2' }, { play: ex('c4 d4 e4 f4 g4 f4 e4 d4 c4:2'), art: 'staccato', q: 0.6 },
      { say: 'k_leg_end' }] },
    { id: 'dynamics', fr: 'Doux et fort', en: 'Soft and loud', steps: [
      { say: 'k_dyn1' }, { play: ex('c4 d4 e4 f4 g4:2 r:2'), dyn: 'p', mark: 'p', q: 0.6 },
      { say: 'k_dyn2' }, { play: ex('c4 d4 e4 f4 g4:2 r:2'), dyn: 'f', mark: 'f', q: 0.6 },
      { say: 'k_dyn_end' }] },
    { id: 'pedal', fr: 'La pédale', en: 'The pedal', steps: [
      { say: 'k_ped1' }, { say: 'k_ped2' }, { pedal: ['[c3,e3,g3]', '[c3,f3,a3]', '[b2,d3,g3]', '[c3,e3,g3]'] }, { say: 'k_ped_end' }] },
  ] },
  { fr: 'Dièses et gammes', en: 'Sharps and scales', lessons: [
    { id: 'sharps', fr: 'Dièses et bémols', en: 'Sharps and flats', steps: [
      { say: 'k_sharp1' }, { read: 'c4 c#4 d4 f4 f#4 g4 bb4 a4', names: true }, { say: 'k_sharp_end' }] },
    { id: 'cscale', fr: 'La gamme de Do et le passage du pouce', en: 'The C scale and the thumb under', steps: [
      { say: 'k_sc1' }, { play: ex('c4 d4 e4 f4 g4 a4 b4 c5 b4 a4 g4 f4 e4 d4 c4:2'), q: 0.65, fingers: { 60: 1, 62: 2, 64: 3, 65: 1, 67: 2, 69: 3, 71: 4, 72: 5 } },
      { say: 'k_sc2' }, { play: ex('', 'c3 d3 e3 f3 g3 a3 b3 c4:2'), q: 0.65, fingers: { 48: 5, 50: 4, 52: 3, 53: 2, 55: 1, 57: 3, 59: 2, 60: 1 } },
      { say: 'k_sc_end' }] },
    { id: 'gscale', fr: 'La gamme de Sol et l’armure', en: 'The G scale and the key signature', steps: [
      { say: 'k_g1' }, { play: ex('g4 a4 b4 c5 d5 e5 f#5 g5:2', '', { key: 'G' }), q: 0.65, fingers: { 67: 1, 69: 2, 71: 3, 72: 1, 74: 2, 76: 3, 78: 4, 79: 5 } },
      { say: 'k_g2' }, { read: ex('g4 a4 b4 g4 d5 c5 b4 a4 g4 f#4 g4', '', { key: 'G' }), names: false }, { say: 'k_g_end' }] },
  ] },
  { fr: 'Les accords', en: 'Chords', lessons: [
    { id: 'triads', fr: 'Construire un accord', en: 'Building a chord', steps: [
      { say: 'k_ch1' }, { chords: ['[c4,e4,g4]', '[f4,a4,c5]', '[g4,b4,d5]'] },
      { say: 'k_ch2' }, { chords: ['[a4,c5,e5]', '[c4,e4,g4]', '[a4,c5,e5]'] }, { say: 'k_ch_end' }] },
    { id: 'accomp', fr: 'Accompagner à la main gauche', en: 'Accompanying with the left hand', steps: [
      { say: 'k_acc1' }, { play: ex('', `${C}:4 ${F}:4 ${G}:4 ${C}:4`), q: 0.6, hold: true },
      { say: 'k_acc2' }, { play: 'twinkle', lh: 'chord', tempo: 0.65 }, { say: 'k_acc_end' }] },
    { id: 'broken', fr: 'Les accords brisés', en: 'Broken chords', steps: [
      { say: 'k_br1' }, { play: ex('', 'c3:0.5 g3:0.5 e3:0.5 g3:0.5 c3:0.5 g3:0.5 e3:0.5 g3:0.5 c3:0.5 a3:0.5 f3:0.5 a3:0.5 c3:0.5 a3:0.5 f3:0.5 a3:0.5 b2:0.5 g3:0.5 d3:0.5 g3:0.5 b2:0.5 g3:0.5 d3:0.5 g3:0.5 c3:4'), q: 0.75 },
      { say: 'k_br_end' }] },
  ] },
  { fr: 'Jouer seul', en: 'Playing on your own', lessons: [
    { id: 'lead', fr: 'Lire une grille d’accords', en: 'Reading a lead sheet', steps: [
      { say: 'k_lead1' }, { play: 'lune', lh: 'chord', lead: true, lights: false, names: false, tempo: 0.7 }, { say: 'k_lead2' }, { play: 'jingle', lh: 'chord', lead: true, lights: false, names: false, tempo: 0.7 }, { say: 'k_lead_end' }] },
    { id: 'ear', fr: 'Jouer d’oreille', en: 'Playing by ear', steps: [
      { say: 'k_ear1' }, { echo: ['c4 d4 e4', 'c4 e4 d4', 'c4 d4 e4 f4 g4', 'c4 e4 g4 e4 c4', 'e4 d4 c4 d4 e4 e4 e4'] }, { say: 'k_ear_end' }] },
    { id: 'improv', fr: 'Improviser', en: 'Improvising', steps: [
      { say: 'k_imp1' }, { improv: { chords: ['[f#3,a#3,c#4]', '[d#3,f#3,a#3]', '[f#3,a#3,c#4]', '[g#3,c#4,d#4]'], keys: 'black', bars: 8 } },
      { say: 'k_imp2' }, { improv: { chords: [C, Am, F, G], keys: 'white', bars: 8 } }, { say: 'k_imp_end' }] },
  ] },
  { fr: 'Vos premiers morceaux', en: 'Your first pieces', lessons: [
    { id: 'minuet', fr: 'Menuet en sol (Petzold)', en: 'Minuet in G (Petzold)', steps: [
      { say: 'k_min1' }, { play: 'minuet', tempo: 0.7 }, { play: 'minuet', tempo: 1 }, { say: 'k_min_end' }] },
    { id: 'elise', fr: 'Lettre à Élise (Beethoven)', en: 'Für Elise (Beethoven)', steps: [
      { say: 'k_eli1' }, { play: 'elise', tempo: 0.7 }, { play: 'elise', tempo: 1 }, { say: 'k_eli_end' }] },
    { id: 'method', fr: 'Apprendre un morceau tout seul', en: 'Learning a piece on your own', steps: [
      { say: 'k_meth1' }, { read: 'largo', names: false }, { say: 'k_meth2' }, { play: 'largo', hands: 'l', lh: 'root', tempo: 0.7 },
      { say: 'k_meth3' }, { play: 'largo', lh: 'root', tempo: 0.6, names: false }, { say: 'k_meth_end' }] },
    { id: 'final', fr: 'Jouer seul, à deux mains', en: 'Playing alone, with both hands', steps: [
      { say: 'k_fin1' }, { play: 'ode', lh: 'chord', lights: false, names: false, tempo: 0.8 }, { say: 'k_fin2' }] },
  ] },
];
export const LESSONS = COURSE.flatMap((ch, c) => ch.lessons.map((l) => ({ ...l, ch: c })));
