// UNISSON session: the room produces a real track, live. Shared by the big screen and every phone: the song
// (a studio track in stems, on an exact bar grid), the four roles of the room, the show's stages, and the
// hidden melody that makes any rhythm a phone taps come out as the right notes.
//
// Afro-house session, 118 BPM, E dorian: a 4-bar loop of A6 (2 bars) and Em7 (2 bars). Produced with Eleven
// Music (music_v2_5, cleared for commercial use), split into stems by the ElevenLabs stem separation, trimmed so
// bar 0 starts at sample 0. Bar map and lyric times measured from the stems (unisson-src/afro).

export const SONG = {
  id: 'afro', title: 'Ce soir on est le son', bpm: 118, bars: 96,
  stems: ['drums', 'bass', 'piano', 'other', 'vocals'],
  // lyric lines, in song bars (from the vocal stem's word timings)
  lyrics: [
    [55.9, 'Lève les mains, lève les mains'], [58.8, 'On est ensemble ce soir'], [59.9, 'Lève les mains'], [61.9, 'Lève les mains, ce soir on est le son'],
    [64.3, 'Écoute la salle'], [66.4, 'Écoute nos voix'], [68.4, 'Tous ensemble'], [70.3, 'Une seule voix'],
    [72.3, 'Ensemble, ensemble'], [74.3, 'Fais vibrer la salle'], [76.3, 'Ensemble, ensemble'], [78.3, 'Ce soir, on est le son'],
  ],
};
export const BEAT = 60000 / SONG.bpm, BAR = BEAT * 4, SIXTEENTH = BEAT / 4;

// ---------------------------------------------------------------- the four roles of the room
// Each phone gets one, evenly, from its id. One gesture each, learnt in three seconds, impossible to play wrong.
export const ROLES = ['r', 'b', 'h', 'm'];
export const ROLE = {
  r: { stem: ['drums'], hue: 28, fr: 'Le rythme', en: 'The rhythm', doFr: 'Tape le temps', doEn: 'Tap the beat' },
  b: { stem: ['bass'], hue: 268, fr: 'La basse', en: 'The bass', doFr: 'Pose ton pouce et tiens', doEn: 'Hold your thumb down' },
  h: { stem: ['piano', 'other'], hue: 190, fr: 'Les harmonies', en: 'The harmonies', doFr: 'Tiens, et lève ton téléphone', doEn: 'Hold, and raise your phone' },
  m: { stem: [], hue: 335, fr: 'La mélodie', en: 'The melody', doFr: 'Touche : chaque toucher est une note', doEn: 'Tap: every touch is a note' },
};
const hash01 = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export const roleOf = (id) => ROLES[Math.floor(hash01(id + ':role') * 4) % 4];
// in a full room only a sample of each role reports to the screen (the screen scales them back up): the
// traffic stays the same for 40 phones or 4,000, and every phone still plays its own sound at once
export const REPORTERS = 40;
export const reports = (id, p) => hash01(id + ':rep') < (p ?? 1);

// ---------------------------------------------------------------- the show
// loop: a region played round until the stage moves on (at a 4-bar phrase); play: a region played once.
// on: the roles the room controls in this stage; floor: the least a stem plays at, whatever the room does.
export const STAGES = [
  { id: 'accueil', loop: [0, 8], on: [], fixed: { piano: 0.55, other: 0.7 } },
  { id: 'rythme', loop: [16, 24], bars: 8, on: ['r'], call: 'r' },
  { id: 'basse', loop: [16, 24], bars: 8, on: ['r', 'b'], call: 'b' },
  { id: 'harmonie', loop: [16, 24], bars: 8, on: ['r', 'b', 'h'], call: 'h' },
  { id: 'melodie', loop: [32, 40], bars: 16, on: ['r', 'b', 'h', 'm'], call: 'm' },
  { id: 'montee', loop: [44, 48], max: 12, on: ['r', 'b', 'h', 'm'], floor: 0.85, call: 'all' },
  { id: 'drop', play: [48, 64], on: ['r', 'b', 'h', 'm'], floor: 0.45, vocals: 1, call: 'all' },
  { id: 'ecoute', play: [64, 72], on: ['r', 'b', 'h', 'm'], floor: 0.6, vocals: 1 },
  { id: 'ensemble', play: [72, 80], on: ['r', 'b', 'h', 'm'], floor: 0.6, vocals: 1 },
  { id: 'sansvoix', play: [72, 80], on: ['r', 'b', 'h', 'm'], floor: 0.55, vocals: 0, call: 'sing' },
  { id: 'final', play: [80, 96], on: ['r', 'b', 'h', 'm'], floor: 0.5, vocals: 1, call: 'all' },
];
export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
export const lyricAt = (songBar) => { let l = null, n = null; for (let i = 0; i < SONG.lyrics.length; i++) if (SONG.lyrics[i][0] <= songBar + 0.15) { l = SONG.lyrics[i]; n = SONG.lyrics[i + 1] || null; } return { line: l && songBar - l[0] < 4.5 ? l[1] : '', next: n && n[0] - songBar < 6 ? n[1] : '' }; };

// ---------------------------------------------------------------- the hidden melody
// Every sixteenth of the 4-bar loop has a note, drawn from the chord sounding then and moving in a slow curve:
// tap at any moment and the note is right; tap a rhythm and it becomes a melody. Regions all start on a
// multiple of 4 bars, so the chord follows the room's timeline, wherever the show loops.
const LADDER = {
  A: [64, 66, 69, 71, 73, 76, 78, 81, 83], // A6 add9: E F# A B C# E F# A B
  Em: [64, 67, 69, 71, 74, 76, 78, 79, 83], // Em7 add9 add11
};
export const slotAt = (ms, t0) => Math.floor((ms - t0) / SIXTEENTH);
export function noteAt(slot) {
  const s = ((slot % 64) + 64) % 64, chord = Math.floor(s / 16) % 4 < 2 ? 'A' : 'Em';
  const c = 4.2 + 2.8 * Math.sin((2 * Math.PI * s) / 32) + 1.3 * Math.sin((2 * Math.PI * s) / 8 + 1);
  const L = LADDER[chord]; return L[Math.max(0, Math.min(L.length - 1, Math.round(c)))];
}
export const NOTE = ['Do', 'Do♯', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
