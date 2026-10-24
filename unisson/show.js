// The light score, shared by the big screen and every phone: for a scene, a time on the screen's clock and a
// seat in the room, the colour that seat shows. Everyone computes it locally from the same clock, so the room
// is in sync without one message per frame. Safety: never more than ~2 flashes a second, no hard white strobe.

export const BPM = 100, BEAT = 60000 / BPM, BAR = BEAT * 4;
export const ZONES = ['g', 'c', 'd'];
export const ZX = { g: 0.18, c: 0.5, d: 0.82 }; // where each zone sits across the room
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// a seat: its zone and a stable random place inside it (from its id)
export function seatOf(id, zone) {
  let h = 2166136261; for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r1 = ((h >>> 0) % 10007) / 10007, r2 = ((h >>> 8) % 9973) / 9973;
  return { zone, x: clamp(ZX[zone] + (r1 - 0.5) * 0.3, 0.02, 0.98), y: r2, r: r1 };
}
// the harmony everyone plays in: D minor, i VI III VII (Dm9, Bbmaj7, Fmaj7, Csus2), and its pentatonic
export const CHORDS = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [41, 45, 48, 52, 57], [48, 50, 55, 60, 62]];
export const ROOTS = [38, 34, 41, 36];
export const SCALE = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];
export const STEP = BEAT / 4;
// which chord is sounding: the awakening rocks between two chords, everything else walks the four, one per bar
export const chordAt = (scene, e) => (scene === 'eveil' ? Math.floor(Math.max(0, e) / (2 * BAR)) % 2 : Math.floor(Math.max(0, e) / BAR) % 4);
// each part of the room is a section of the orchestra, each phone a set of pads
export const PADS = { g: ['kick', 'clap', 'snare', 'hat'], c: ['root', 'fifth', 'stab', 'high'], d: [0, 1, 2, 3, 4] };
export const PLAYABLE = new Set(['eveil', 'vague', 'drop', 'jam']);
export const DROP_IN = 4 * BEAT; // the countdown before the drop: 3, 2, 1 (one beat each) and a breath
// a chosen palette (sky, gold, rose, violet, teal): the room never turns a muddy hue
export const PAL = [200, 38, 335, 268, 172];
// one colour per section, the same on the big screen and in every hand: rhythm sky, bass gold, melody rose
export const ZH = { g: 200, c: 38, d: 335 };
const pal = (i) => PAL[((i % PAL.length) + PAL.length) % PAL.length];

// returns { h, s, l, a } (a = how lit the screen is, 0..1) and an optional big text for the phone
export function light(scene, t, t0, seat) {
  const e = t - t0, b = e / BEAT;
  switch (scene) {
    case 'lobby': {
      const breath = 0.5 + 0.5 * Math.sin(t / 900 + seat.r * 6.28);
      return { h: 38, s: 80, l: 55, a: 0.06 + 0.06 * breath };
    }
    case 'eveil': { // the room lights up star by star, then breathes
      const on = smooth(seat.r * 9000, seat.r * 9000 + 2200, e);
      const breath = 0.75 + 0.25 * Math.sin(e / 1300 + seat.r * 6.28);
      return { h: 205 + seat.y * 30, s: 55, l: 78, a: on * 0.55 * breath };
    }
    case 'vague': { // a wave of colour across the room and back, on the bar
      const bar = Math.floor(b / 4), ph = (b % 4) / 4, dir = bar % 2 ? 1 - ph : ph;
      const w = -0.15 + dir * 1.3, d = seat.x - w;
      const crest = Math.exp(-(d * d) / 0.012);
      const beat = 0.5 + 0.5 * Math.cos((b % 1) * Math.PI * 2);
      return { h: pal(bar), s: 85, l: 58, a: 0.1 + 0.85 * crest + 0.05 * beat };
    }
    case 'drop': {
      if (e < DROP_IN) { // countdown: dark, the number glows on each beat, then a breath of black
        const k = Math.floor(e / BEAT), f = (e % BEAT) / BEAT;
        if (k >= 3) return { h: 0, s: 0, l: 0, a: 0, big: '' };
        return { h: 30, s: 90, l: 60, a: 0.25 * (1 - f), big: String(3 - k) };
      }
      const db = (e - DROP_IN) / BEAT, bar = Math.floor(db / 4);
      const hit = Math.pow(1 - (db % 1), 2.2); // a soft pulse on every beat (1.7 a second at 100 BPM)
      const hue = pal(ZONES.indexOf(seat.zone) + bar);
      return { h: hue, s: 90, l: 55, a: 0.4 + 0.6 * hit };
    }
    case 'jam': { // the room plays: each section in its colour, breathing on the beat
      const pulse = Math.pow(1 - (Math.max(0, b) % 1), 3);
      return { h: ZH[seat.zone], s: 80, l: 55, a: 0.16 + 0.14 * pulse };
    }
    case 'coeur': { // one heart for the whole room, slowing down
      const rate = 70 - Math.min(40, e / 1500), per = 60000 / rate, f = (e % per) / per;
      const lub = Math.exp(-Math.pow((f - 0.05) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((f - 0.22) / 0.05, 2));
      return { h: 350, s: 80, l: 52, a: 0.08 + 0.75 * lub * Math.max(0.15, 1 - e / 60000) };
    }
    case 'fin': return { h: 38, s: 70, l: 60, a: 0.12 * (1 - smooth(0, 4000, e)) + 0.04 };
    default: return { h: 0, s: 0, l: 0, a: 0 };
  }
}
export const hsl = (c, k = 1) => `hsl(${c.h.toFixed(0)} ${c.s}% ${(c.l * (0.12 + 0.88 * c.a * k)).toFixed(1)}%)`;

// ---------------------------------------------------------------- songs the room plays as a handbell choir
// Public-domain melodies only: Jingle Bells (J. Pierpont, 1857), Silent Night (F. Gruber, 1818; English words
// J. F. Young, 1859), Ode to Joy (Beethoven, 1824; words F. Schiller, 1785). Each note: [midi, beats, syllable].
// A syllable of '' continues the previous word (a held or slurred note).
const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79;
export const SONGS = {
  jingle: { fr: 'Jingle Bells', en: 'Jingle Bells', bpm: 116, meter: 4, parts: [[0, 'all'], [16, 'g'], [24, 'd'], [32, 'c'], [40, 'libre'], [48, 'all']],
    chords: [[48, 52, 55], [48, 52, 55], [48, 52, 55], [48, 52, 55], [41, 45, 48, 53], [48, 52, 55], [50, 54, 57, 60], [43, 47, 50, 53], [48, 52, 55], [48, 52, 55], [48, 52, 55], [48, 52, 55], [41, 45, 48, 53], [48, 52, 55], [43, 47, 50, 53], [48, 52, 55]],
    notes: [[E5, 1, 'Jin-'], [E5, 1, 'gle'], [E5, 2, 'bells,'], [E5, 1, 'jin-'], [E5, 1, 'gle'], [E5, 2, 'bells,'], [E5, 1, 'jin-'], [G5, 1, 'gle'], [C5, 1.5, 'all'], [D5, 0.5, 'the'], [E5, 4, 'way!'],
      [F5, 1, 'Oh,'], [F5, 1, 'what'], [F5, 1.5, 'fun'], [F5, 0.5, 'it'], [F5, 1, 'is'], [E5, 1, 'to'], [E5, 1, 'ride'], [E5, 0.5, 'in'], [E5, 0.5, 'a'], [E5, 1, 'one'], [D5, 1, 'horse'], [D5, 1, 'o-'], [E5, 1, 'pen'], [D5, 2, 'sleigh,'], [G5, 2, 'hey!'],
      [E5, 1, 'Jin-'], [E5, 1, 'gle'], [E5, 2, 'bells,'], [E5, 1, 'jin-'], [E5, 1, 'gle'], [E5, 2, 'bells,'], [E5, 1, 'jin-'], [G5, 1, 'gle'], [C5, 1.5, 'all'], [D5, 0.5, 'the'], [E5, 4, 'way!'],
      [F5, 1, 'Oh,'], [F5, 1, 'what'], [F5, 1.5, 'fun'], [F5, 0.5, 'it'], [F5, 1, 'is'], [E5, 1, 'to'], [E5, 1, 'ride'], [E5, 0.5, 'in'], [E5, 0.5, 'a'], [G5, 1, 'one'], [G5, 1, 'horse'], [F5, 1, 'o-'], [D5, 1, 'pen'], [C5, 4, 'sleigh!']] },
  silent: { fr: 'Douce nuit', en: 'Silent Night', bpm: 84, meter: 3, parts: [[0, 'all'], [24, 'g'], [36, 'd'], [48, 'c'], [60, 'all']],
    chords: [[48, 52, 55], [48, 52, 55], [48, 52, 55], [48, 52, 55], [43, 47, 50, 53], [43, 47, 50, 53], [48, 52, 55], [48, 52, 55], [41, 45, 48], [41, 45, 48], [48, 52, 55], [48, 52, 55], [41, 45, 48], [41, 45, 48], [48, 52, 55], [48, 52, 55], [43, 47, 50, 53], [43, 47, 50, 53], [48, 52, 55], [48, 52, 55], [48, 52, 55], [43, 47, 50, 53], [48, 52, 55], [48, 52, 55]],
    notes: [[67, 1.5, 'Si-'], [69, 0.5, 'lent'], [67, 1, 'night,'], [64, 3, ''], [67, 1.5, 'ho-'], [69, 0.5, 'ly'], [67, 1, 'night,'], [64, 3, ''],
      [74, 2, 'All'], [74, 1, 'is'], [71, 3, 'calm,'], [72, 2, 'all'], [72, 1, 'is'], [67, 3, 'bright,'],
      [69, 2, 'Round'], [69, 1, 'yon'], [72, 1.5, 'vir-'], [71, 0.5, 'gin'], [69, 1, 'moth-'], [67, 1.5, 'er'], [69, 0.5, 'and'], [67, 1, 'child,'], [64, 3, ''],
      [69, 2, 'Ho-'], [69, 1, 'ly'], [72, 1.5, 'in-'], [71, 0.5, 'fant'], [69, 1, 'so-'], [67, 1.5, 'ten-'], [69, 0.5, 'der'], [67, 1, 'and'], [64, 3, 'mild,'],
      [74, 2, 'Sleep'], [74, 1, 'in'], [77, 1.5, 'heav-'], [74, 0.5, 'en-'], [71, 1, 'ly'], [72, 3, 'peace,'], [76, 3, ''],
      [72, 1.5, 'Sleep'], [67, 0.5, 'in'], [64, 1, 'heav-'], [67, 1.5, 'en-'], [65, 0.5, 'ly'], [62, 1, ''], [60, 3, 'peace.']] },
  joie: { fr: 'L’Ode à la joie', en: 'Ode to Joy', bpm: 104, meter: 4, parts: [[0, 'all'], [8, 'd'], [16, 'libre'], [24, 'all']],
    chords: [[48, 52, 55], [43, 47, 50], [48, 52, 55], [43, 47, 50], [48, 52, 55], [43, 47, 50], [48, 52, 55], [43, 47, 50, 55]],
    notes: [[E5, 1, 'Freu-'], [E5, 1, 'de,'], [F5, 1, 'schö-'], [G5, 1, 'ner'], [G5, 1, 'Göt-'], [F5, 1, 'ter'], [E5, 1, 'fun-'], [D5, 1, 'ken,'], [C5, 1, 'Toch-'], [C5, 1, 'ter'], [D5, 1, 'aus'], [E5, 1, 'E-'], [E5, 1.5, 'ly-'], [D5, 0.5, 'si-'], [D5, 2, 'um,'],
      [E5, 1, 'Wir'], [E5, 1, 'be-'], [F5, 1, 'tre-'], [G5, 1, 'ten'], [G5, 1, 'feu-'], [F5, 1, 'er'], [E5, 1, 'trun-'], [D5, 1, 'ken,'], [C5, 1, 'Himm-'], [C5, 1, 'li-'], [D5, 1, 'sche,'], [E5, 1, 'dein'], [D5, 1.5, 'Hei-'], [C5, 0.5, 'lig-'], [C5, 2, 'tum!']] },
};
export const COUNT_IN = 4; // four beats of count-in before the first note
// the notes of a song with their time (ms after the cue) and the section that rings them (low, middle, high)
export function score(id) {
  const s = SONGS[id], beat = 60000 / s.bpm, pitches = [...new Set(s.notes.map((n) => n[0]))].sort((a, b) => a - b);
  const zoneOf = (m) => { const k = pitches.indexOf(m) / Math.max(1, pitches.length - 1); return k < 0.34 ? 'g' : k < 0.67 ? 'c' : 'd'; };
  const P = s.parts || [[0, 'all']], partAt = (b) => { let p = 'all'; for (const [from, m] of P) if (b >= from - 0.01) p = m; return p; };
  let at = COUNT_IN; const notes = s.notes.map(([m, d, w], i) => { const n = { i, m, d, w, at: at * beat, len: d * beat, z: zoneOf(m), part: partAt(at - COUNT_IN) }; at += d; return n; });
  const parts = P.map(([from, m]) => ({ at: (from + COUNT_IN) * beat, m }));
  return { ...s, id, beat, pitches, notes, parts, end: at * beat, zoneOf, partAt: (e) => partAt(e / beat - COUNT_IN) };
}
// which notes this phone rings: in a small section every phone has all its section's notes; in a full room the
// notes are shared out (at least two phones per bell) by a stable hash of the seat
// (solo: the section carries the whole melody alone, so its phones share every pitch of the song)
export function bellsFor(sc, zone, zoneCount, r, solo = false) {
  const mine = solo ? sc.pitches : sc.pitches.filter((m) => sc.zoneOf(m) === zone);
  if (!mine.length) return new Set();
  const groups = Math.max(1, Math.min(mine.length, Math.floor(zoneCount / 2)));
  const g = Math.floor(r * 9973) % groups;
  return new Set(mine.filter((_, i) => i % groups === g));
}
// the passage a note belongs to; a solo for a section with nobody in it goes back to the whole room
export const partOf = (n, zs) => (n.part.length === 1 && zs && !zs[n.part] ? 'all' : n.part);
// in a free passage any phone rings any note of the chord, in the bells' octave, so it is always in tune
export function freeNote(sc, e) {
  const bar = Math.floor(e / sc.beat - COUNT_IN) / sc.meter | 0, ch = sc.chords[Math.max(0, Math.min(sc.chords.length - 1, bar))];
  const pc = ch[(Math.random() * ch.length) | 0] % 12; return 72 + pc + (Math.random() < 0.35 ? 12 : 0);
}
export const NOTE_FR = ['Do', 'Do♯', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
export const NOTE_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
