// Mila et la luciole perdue: an interactive comic for 4 to 8 year olds. One panel at a time; each line is read
// aloud with its words lighting up; a few panels ask one small thing of the child (find, hold, touch, choose).
// Bubbles: b = where the bubble sits, t = the speaker it points at (fractions of the panel). cap = narration box.
export const TITLE = { fr: 'Mila et la luciole perdue', en: 'Mila and the lost firefly' };
export const PANELS = [
  { id: 'c1', img: 'c1', amb: 'amb-room', lines: [{ id: 'c1a', cap: 1 }, { id: 'c1b', b: [0.5, 0.2], t: [0.42, 0.5] }] },
  { id: 'c2', img: 'c2', amb: 'amb-garden', lines: [{ id: 'c2a', cap: 1 }],
    act: { kind: 'find', at: [0.8, 0.89], r: 0.11, then: [{ id: 'c2b', b: [0.52, 0.22], t: [0.28, 0.42] }] } },
  { id: 'c3', img: 'c3', amb: 'amb-garden', lines: [{ id: 'c3a', b: [0.58, 0.14], t: [0.6, 0.4] }, { id: 'c3b', b: [0.36, 0.34], t: [0.16, 0.48] }] },
  { id: 'c4', img: 'c4', amb: 'amb-garden', lines: [{ id: 'c4a', b: [0.6, 0.13], t: [0.56, 0.48] }, { id: 'c4b', b: [0.33, 0.28], t: [0.42, 0.4] }] },
  { id: 'c5', img: 'c5', amb: 'amb-garden', lines: [{ id: 'c5a', cap: 1 }],
    act: { kind: 'hold', at: [0.8, 0.63], ms: 2600, then: [{ id: 'c5b', b: [0.64, 0.25], t: [0.79, 0.56] }] } },
  { id: 'c6', img: 'c6', video: 'c6', amb: 'amb-forest', lines: [{ id: 'c6a', cap: 1 }],
    act: { kind: 'sounds', spots: [{ at: [0.17, 0.78], sfx: 'cricket', word: 'CRI-CRI !' }, { at: [0.89, 0.6], sfx: 'owlet', word: 'HOU HOU !' }, { at: [0.87, 0.9], sfx: 'frog', word: 'CROA !' }] } },
  { id: 'c7', img: 'c7', amb: 'amb-river', lines: [{ id: 'c7a', cap: 1 }],
    act: { kind: 'choice', opts: [{ at: [0.25, 0.55], fr: 'Le pont', en: 'The bridge', go: 'c8a' }, { at: [0.75, 0.55], fr: 'Les pierres', en: 'The stones', go: 'c8b' }] } },
  { id: 'c8a', img: 'c8a', amb: 'amb-river', sfx: 'creak', branch: 1, lines: [{ id: 'c8a', cap: 1 }, { id: 'c8a2', b: [0.62, 0.3], t: [0.42, 0.45] }], word: { at: [0.7, 0.62], t: 'OUPS !' } },
  { id: 'c8b', img: 'c8b', amb: 'amb-river', sfx: 'plouf', branch: 1, lines: [{ id: 'c8b', cap: 1 }, { id: 'c8b2', b: [0.66, 0.24], t: [0.5, 0.4] }], word: { at: [0.72, 0.82], t: 'PLOUF !' } },
  { id: 'c9', img: 'c9', awake: 'c9w', amb: 'amb-forest', lines: [{ id: 'c9a', cap: 1 }],
    act: { kind: 'wake', at: [0.48, 0.38], r: 0.2, taps: 3, then: [{ id: 'c9b', b: [0.7, 0.19], t: [0.56, 0.32] }] } },
  { id: 'c10', img: 'c10', amb: 'amb-forest', lines: [{ id: 'c10a', cap: 1 }, { id: 'c10b', b: [0.62, 0.7], t: [0.53, 0.86] }] },
  { id: 'c11', img: 'c10', lit: 'c11', video: 'c11', amb: 'amb-forest', lines: [{ id: 'c11a', cap: 1 }],
    act: { kind: 'shine', taps: 10, at: [0.53, 0.86], then: [{ id: 'c11b', cap: 1 }, { id: 'c11c', b: [0.64, 0.7], t: [0.54, 0.86] }] } },
  { id: 'c12', img: 'c12', video: 'c12', amb: 'amb-room', lines: [{ id: 'c12a', cap: 1 }, { id: 'c12b', b: [0.6, 0.3], t: [0.79, 0.47] }] },
];
export const WHO = { n: 'narr', m: 'mila', p: 'pipo', h: 'owl' };
