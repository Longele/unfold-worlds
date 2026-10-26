// Noé et l'arche, the touch comic (Genesis 6 to 9) for 4 to 8 year olds, with a little science on the way: the
// child measures the ark in cubits, builds it, seals it with pitch, gathers the pairs, makes it rain, pushes the
// ark into the water to feel why it floats, sends the dove, draws the rainbow and looks into a raindrop.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Noé et l’arche', en: 'Noah and the ark' };
export const AFTER_BRANCH = null;
// the rainbow's arc, left foot to right foot, as points to follow
// (fitted to the painted rainbow, whose feet run out of the frame)
const ARC = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - 0.7 - (Math.PI - 1.4) * i / 24; return [0.5 + Math.cos(a) * 0.6, 0.4 - Math.sin(a) * 0.317]; });
export const PANELS = [
  { id: 'n1', img: 'n1', amb: 'amb-meadow', lines: [{ id: 'n1a', cap: 1 }],
    act: { kind: 'hello', at: [0.42, 0.58], r: 0.13, word: { fr: 'BONJOUR !', en: 'HELLO!' }, then: [{ id: 'n1b', b: [0.6, 0.2], t: [0.5, 0.46] }] } },
  { id: 'n2', img: 'n2', amb: 'amb-wood', lines: [{ id: 'n2a', cap: 1 }, { id: 'n2b', b: [0.5, 0.2], t: [0.5, 0.47] }, { id: 'n2c', cap: 1 }],
    act: { kind: 'trace', style: 'rope', pts: [[0.08, 0.86], [0.3, 0.855], [0.5, 0.85], [0.7, 0.845], [0.9, 0.84]], word: '135 m', then: [{ id: 'n2d', cap: 1 }] } },
  { id: 'n3', img: 'n3', amb: 'amb-wood', lines: [{ id: 'n3a', cap: 1 }, { id: 'n3b', cap: 1 }],
    act: { kind: 'taps', spots: [[0.2, 0.62], [0.47, 0.7], [0.72, 0.62]], word: { fr: 'TOC !', en: 'KNOCK!' }, then: [{ id: 'n3c', b: [0.6, 0.2], t: [0.84, 0.76] }] } },
  { id: 'n4', img: 'n4', amb: 'amb-wood', lines: [{ id: 'n4a', cap: 1 }, { id: 'n4b', cap: 1 }],
    act: { kind: 'paint', after: 'n4b', box: [0, 0.27, 1, 0.95], not: [0.45, 0.5, 0.85, 1], then: [{ id: 'n4c', b: [0.42, 0.16], t: [0.62, 0.58] }] } },
  { id: 'n5', img: 'n5', amb: 'amb-meadow', lines: [{ id: 'n5a', cap: 1 }],
    act: { kind: 'pairs', spots: [{ at: [0.13, 0.78], k: 'lion' }, { at: [0.34, 0.8], k: 'lion' }, { at: [0.63, 0.8], k: 'zebra' }, { at: [0.79, 0.78], k: 'zebra' }, { at: [0.45, 0.6], k: 'elephant' }, { at: [0.6, 0.62], k: 'elephant' }, { at: [0.75, 0.5], k: 'giraffe' }, { at: [0.88, 0.52], k: 'giraffe' }],
      sound: { lion: 'roar', zebra: 'hooves', elephant: 'trumpet', giraffe: 'chime' }, then: [{ id: 'n5b', b: [0.32, 0.26], t: [0.55, 0.33] }] } },
  { id: 'n6', img: 'n6', amb: 'amb-calm', lines: [{ id: 'n6a', cap: 1 }],
    act: { kind: 'rain', n: 4, after: 'n6b', then: [{ id: 'n6b', cap: 1 }] } },
  { id: 'n7', img: 'n7', amb: 'amb-sea', lines: [{ id: 'n7a', cap: 1 }],
    act: { kind: 'press', at: [0.5, 0.5], r: 0.3, down: 'n7d', n: 2, then: [{ id: 'n7b', cap: 1 }] } },
  { id: 'n8', img: 'n8', amb: 'amb-ark', lines: [{ id: 'n8a', cap: 1 }],
    act: { kind: 'lamp', at: [0.78, 0.93], r: 0.08, start: [0.6, 0.55], then: [{ id: 'n8b', b: [0.45, 0.14], t: [0.63, 0.47] }] } },
  { id: 'n9', img: 'n9', amb: 'amb-hills', lines: [{ id: 'n9a', cap: 1 }, { id: 'n9b', cap: 1 }],
    act: { kind: 'fly', at: [0.33, 0.37], r: 0.14, after: 'n9b', then: [{ id: 'n9c', cap: 1 }, { id: 'n9d', b: [0.45, 0.12], t: [0.64, 0.36] }] } },
  { id: 'n10', img: 'n10', amb: 'amb-land', lines: [{ id: 'n10a', cap: 1 }],
    act: { kind: 'sounds', spots: [{ at: [0.22, 0.72], sfx: 'trumpet', word: { fr: 'POUAAH !', en: 'TOOT!' } }, { at: [0.82, 0.82], sfx: 'roar', word: { fr: 'ROAAR !', en: 'ROAR!' } }, { at: [0.53, 0.86], sfx: 'tweet', word: { fr: 'CUI CUI !', en: 'TWEET!' } }],
      then: [{ id: 'n10b', b: [0.36, 0.27], t: [0.26, 0.44] }] } },
  { id: 'n11', img: 'n11', amb: 'amb-hills', lines: [{ id: 'n11a', cap: 1 }],
    act: { kind: 'trace', style: 'rainbow', pts: ARC, after: 'n11b', then: [{ id: 'n11b', b: [0.5, 0.56], t: [0.52, 0.74] }] } },
  { id: 'n12', img: 'n12', amb: 'amb-hills', lines: [{ id: 'n12a', cap: 1 }],
    act: { kind: 'loupe', at: [0.68, 0.82], r: 0.08, start: [0.4, 0.6], then: [{ id: 'n12b', cap: 1 }] } },
  { id: 'n13', img: 'n13', amb: 'amb-land', sfx: 'rainbow', lines: [{ id: 'n13a', cap: 1 }, { id: 'n13b', b: [0.45, 0.16], t: [0.4, 0.66] }] },
];
export const WHO = { n: 'narr', o: 'noe' };
