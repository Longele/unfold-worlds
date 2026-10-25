// UNISSON Jam: the music a player plays inside. Real chord shapes (the very fingering a guitarist uses, so the
// app also teaches the instrument), the songs with their studio backing and chord chart, the scale of each key
// (melody keys only ever offer notes that belong), and the strumming pattern shown as a guide.

// guitar: one MIDI note per string, low E to high e (null = string not played), and the frets to show
export const CHORDS = {
  G: { fr: 'Sol', gtr: [43, 47, 50, 55, 59, 67], frets: '320003', pc: [7, 11, 2] },
  D: { fr: 'Ré', gtr: [null, null, 50, 57, 62, 66], frets: 'xx0232', pc: [2, 6, 9] },
  Em: { fr: 'Mi m', gtr: [40, 47, 52, 55, 59, 64], frets: '022000', pc: [4, 7, 11] },
  Em7: { fr: 'Mi m7', gtr: [40, 47, 50, 55, 59, 64], frets: '020000', pc: [4, 7, 11, 2] },
  C: { fr: 'Do', gtr: [null, 48, 52, 55, 60, 64], frets: 'x32010', pc: [0, 4, 7] },
  Am: { fr: 'La m', gtr: [null, 45, 52, 57, 60, 64], frets: 'x02210', pc: [9, 0, 4] },
  Bm: { fr: 'Si m', gtr: [null, 47, 54, 59, 62, 66], frets: 'x24432', pc: [11, 2, 6] },
  A: { fr: 'La', gtr: [null, 45, 52, 57, 61, 64], frets: 'x02220', pc: [9, 1, 4] },
  F: { fr: 'Fa', gtr: [41, 48, 53, 57, 60, 65], frets: '133211', pc: [5, 9, 0] },
  Dm: { fr: 'Ré m', gtr: [null, null, 50, 57, 62, 65], frets: 'xx0231', pc: [2, 5, 9] },
  E: { fr: 'Mi', gtr: [40, 47, 52, 56, 59, 64], frets: '022100', pc: [4, 8, 11] },
  'F#m': { fr: 'Fa♯ m', gtr: [42, 49, 54, 57, 61, 66], frets: '244222', pc: [6, 9, 1] },
};
export const chordName = (c, lang) => (lang === 'fr' ? CHORDS[c].fr : c);
// piano: the root low, then the chord in close position around middle C
export function pianoVoicing(c) {
  const pc = CHORDS[c].pc, root = 36 + ((pc[0] + 12 - 0) % 12);
  const up = pc.map((p) => { let m = 60 + ((p - 60) % 12 + 12) % 12; if (m > 67) m -= 12; return m; }).sort((a, b) => a - b);
  return [...new Set([root, root + 12, ...up])];
}

// scales, from a tonic MIDI note: the melody keys of each key
const MAJOR = [0, 2, 4, 5, 7, 9, 11], DORIAN = [0, 2, 3, 5, 7, 9, 10];
export const scaleFrom = (tonic, mode = MAJOR, octaves = 2) => { const o = []; for (let k = 0; k < octaves; k++) for (const s of mode) o.push(tonic + 12 * k + s); o.push(tonic + 12 * octaves); return o; };

// strumming patterns on eighths: D down, U up, '' rest
const POP = ['D', '', 'D', 'U', '', 'U', 'D', 'U'], SLOW = ['D', '', '', '', 'D', '', 'U', ''], AFRO = ['D', '', 'U', 'D', '', 'U', 'D', 'U'];

export const SONGS = {
  afro: { fr: 'Afro', en: 'Afro', bpm: 118, bars: 8, beat: 'afro', chords: ['A', 'A', 'Em7', 'Em7', 'A', 'A', 'Em7', 'Em7'], keyChords: ['A', 'Em7', 'D', 'G', 'Bm', 'F#m'], scale: scaleFrom(64, DORIAN), pattern: AFRO, desc: { fr: 'Le groupe studio, deux accords', en: 'The studio band, two chords' } },
  pop: { fr: 'Pop', en: 'Pop', bpm: 60000 / 653.89, bars: 8, beat: 'pop', chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'], keyChords: ['G', 'D', 'Em', 'C', 'Am', 'Bm'], scale: scaleFrom(67, MAJOR), pattern: POP, desc: { fr: 'Les quatre accords de mille chansons', en: 'The four chords of a thousand songs' } },
  ballade: { fr: 'Ballade', en: 'Ballad', bpm: 60000 / 845.11, bars: 8, beat: 'ballade', chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'], keyChords: ['C', 'G', 'Am', 'F', 'Dm', 'Em'], scale: scaleFrom(60, MAJOR), pattern: SLOW, desc: { fr: 'Doux, lent, à la main', en: 'Soft and slow' } },
  libre: { fr: 'Libre', en: 'Free', bpm: 90, bars: 8, beat: null, chords: null, keyChords: ['G', 'D', 'Em', 'C', 'Am', 'Bm'], scale: scaleFrom(67, MAJOR), pattern: null, desc: { fr: 'Sans beat, tes accords', en: 'No beat, your chords' } },
};
export const beatMs = (s) => 60000 / s.bpm;
export const barMs = (s) => 4 * beatMs(s);
export const loopMs = (s) => s.bars * barMs(s);
// where the song is at an instant: the bar, the chord now and next, how far through the bar, the eighth
export function position(s, ms, t0) {
  const e = ms - t0, L = loopMs(s), x = ((e % L) + L) % L, bar = Math.floor(x / barMs(s)), f = (x % barMs(s)) / barMs(s);
  return { e, bar, f, eighth: Math.floor(f * 8), chord: s.chords ? s.chords[bar] : null, next: s.chords ? s.chords[(bar + 1) % s.bars] : null, loopPos: x };
}
export const NOTE = { fr: ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'], en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] };
export const INSTRUMENTS = ['gtr', 'pno', 'drm', 'mar'];
export const INST = {
  gtr: { fr: 'Guitare', en: 'Guitar', hue: 32 },
  pno: { fr: 'Piano', en: 'Piano', hue: 200 },
  drm: { fr: 'Batterie', en: 'Drums', hue: 340 },
  mar: { fr: 'Marimba', en: 'Marimba', hue: 268 },
};
