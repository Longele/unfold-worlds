// Lina et le papillon secret: Lina's second comic, for 4 to 8 year olds. Lina raises a peacock butterfly from the
// eggs under a nettle leaf to its first flight, and learns true things on the way: the four stages, the moults,
// the chrysalis, wings that unfold and dry, mirror symmetry and eyespots, tasting with the feet, the tongue, pollen.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Lina et le papillon secret', en: 'Lina and the secret butterfly' };
export const AFTER_BRANCH = 'b10';
export const PANELS = [
  { id: 'b1', img: 'b1', amb: 'amb-garden', lines: [{ id: 'b1a', cap: 1 }],
    act: { kind: 'loupe', at: [0.8, 0.87], r: 0.06, start: [0.5, 0.6], then: [{ id: 'b1b', b: [0.6, 0.24], t: [0.36, 0.44] }, { id: 'b1c', cap: 1 }] } },
  { id: 'b2', img: 'b2', amb: 'amb-garden', lines: [{ id: 'b2a', cap: 1 }],
    act: { kind: 'feed', dim: 1, at: [0.44, 0.26], r: 0.13, from: [[0.2, 0.84], [0.5, 0.88], [0.8, 0.84]], after: 'b2b', word: { fr: 'MIAM !', en: 'MUNCH!' }, then: [{ id: 'b2b', cap: 1 }, { id: 'b2c', b: [0.5, 0.84], t: [0.42, 0.99] }] } },
  { id: 'b3', img: 'b3', amb: 'amb-garden', lines: [{ id: 'b3a', cap: 1 }],
    act: { kind: 'days', days: 3, after: 'b3b', then: [{ id: 'b3b', cap: 1 }] } },
  { id: 'b4', img: 'b4', amb: 'amb-garden', lines: [{ id: 'b4a', cap: 1 }],
    act: { kind: 'quiet', at: [0.18, 0.38], r: 0.09, ms: 3500, warn: 'b4w', after: 'b4b', then: [{ id: 'b4b', b: [0.68, 0.58], t: [0.77, 0.72] }, { id: 'b4c', b: [0.4, 0.27], t: [0.5, 0.46] }] } },
  { id: 'b5', img: 'b5', amb: 'amb-garden', lines: [{ id: 'b5a', cap: 1 }],
    act: { kind: 'blow', after: 'b5b', c: [0.6, 0.58], box: [0.35, 0.3, 0.88, 0.8], then: [{ id: 'b5b', b: [0.5, 0.88], t: [0.4, 0.99] }] } },
  { id: 'b6', img: 'b6', amb: 'amb-garden', lines: [{ id: 'b6a', cap: 1 }],
    act: { kind: 'mirror', after: 'b6b', axis: 0.5, box: [0.05, 0.34, 0.95, 0.68], then: [{ id: 'b6b', cap: 1 }, { id: 'b6c', b: [0.5, 0.84], t: [0.4, 0.99] }] } },
  { id: 'b7', img: 'b7', amb: 'amb-meadow', lines: [{ id: 'b7a', cap: 1 }],
    act: { kind: 'binocs', at: [0.77, 0.38], r: 0.06, start: [0.4, 0.55], then: [{ id: 'b7b', b: [0.32, 0.5], t: [0.38, 0.66] }] } },
  { id: 'b8', img: 'b8', amb: 'amb-meadow', lines: [{ id: 'b8a', cap: 1 }],
    act: { kind: 'choice', opts: [{ at: [0.27, 0.58], fr: 'La fleur violette', en: 'The purple flower', go: 'b9p' }, { at: [0.74, 0.62], fr: 'La fleur jaune', en: 'The yellow flower', go: 'b9y' }] } },
  { id: 'b9p', img: 'b9p', amb: 'amb-meadow', branch: 1, lines: [{ id: 'b9a', cap: 1 }],
    act: { kind: 'sip', at: [0.44, 0.55], r: 0.16, after: 'b9p2', then: [{ id: 'b9b', cap: 1 }] } },
  { id: 'b9y', img: 'b9y', amb: 'amb-meadow', branch: 1, lines: [{ id: 'b9a', cap: 1 }],
    act: { kind: 'sip', at: [0.6, 0.5], r: 0.16, after: 'b9y2', then: [{ id: 'b9b', cap: 1 }] } },
  { id: 'b10', img: 'b10', amb: 'amb-meadow', lines: [{ id: 'b10a', cap: 1 }],
    act: { kind: 'pollinate', start: [0.15, 0.86], flowers: [[0.25, 0.35], [0.73, 0.4], [0.33, 0.62]], word: { fr: 'POLLEN !', en: 'POLLEN!' }, then: [{ id: 'b10b', b: [0.5, 0.86], t: [0.42, 0.99] }] } },
  { id: 'b11', img: 'b11', amb: 'amb-evening', lines: [{ id: 'b11a', cap: 1 }],
    act: { kind: 'release', at: [0.65, 0.46], r: 0.1, after: 'b11b', then: [{ id: 'b11b', b: [0.62, 0.68], t: [0.73, 0.83] }] } },
  { id: 'b12', img: 'b12', amb: 'amb-evening', lines: [{ id: 'b12a', cap: 1 }],
    act: { kind: 'order', warn: 'b12w', spots: [[0.3, 0.63], [0.73, 0.6], [0.73, 0.36], [0.33, 0.37]], then: [{ id: 'b12b', cap: 1 }, { id: 'b12c', b: [0.5, 0.82], t: [0.42, 0.99] }] } },
];
export const WHO = { n: 'narr', l: 'lina', p: 'pic' };
