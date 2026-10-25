// Lina et les petites traces: an interactive comic for 4 to 8 year olds. Lina follows tiny footprints, finds
// three clues with her magnifying glass, spots a lost baby hedgehog with her binoculars, calms him, and brings
// him home. b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Lina et les petites traces', en: 'Lina and the tiny tracks' };
export const AFTER_BRANCH = 'l6';
export const PANELS = [
  { id: 'l1', img: 'l1', video: 'l1', amb: 'amb-forest', lines: [{ id: 'l1a', cap: 1 }, { id: 'l1b', b: [0.6, 0.2], t: [0.47, 0.36] }] },
  { id: 'l2', img: 'l2', amb: 'amb-forest', lines: [{ id: 'l2a', cap: 1 }],
    act: { kind: 'loupe', at: [0.75, 0.87], r: 0.09, start: [0.5, 0.7], then: [{ id: 'l2b', b: [0.58, 0.28], t: [0.36, 0.46] }] } },
  { id: 'l3', img: 'l3', amb: 'amb-forest', lines: [{ id: 'l3a', cap: 1 }],
    act: { kind: 'loupe', at: [0.33, 0.77], r: 0.09, start: [0.6, 0.6], then: [{ id: 'l3b', b: [0.42, 0.26], t: [0.76, 0.4] }] } },
  { id: 'l4', img: 'l4', amb: 'amb-forest', lines: [{ id: 'l4a', cap: 1 }],
    act: { kind: 'choice', opts: [{ at: [0.27, 0.6], fr: 'Le ruisseau', en: 'The stream', go: 'l5a' }, { at: [0.74, 0.6], fr: 'Les mûres', en: 'The blackberries', go: 'l5b' }] } },
  { id: 'l5a', img: 'l5a', amb: 'amb-stream', branch: 1, lines: [{ id: 'l5a', cap: 1 }],
    act: { kind: 'loupe', at: [0.66, 0.8], r: 0.1, start: [0.4, 0.65], then: [{ id: 'l5c', b: [0.6, 0.3], t: [0.46, 0.47] }] } },
  { id: 'l5b', img: 'l5b', amb: 'amb-forest', branch: 1, lines: [{ id: 'l5b', cap: 1 }],
    act: { kind: 'loupe', at: [0.75, 0.6], r: 0.1, start: [0.45, 0.75], then: [{ id: 'l5c', b: [0.55, 0.22], t: [0.4, 0.4] }] } },
  { id: 'l6', img: 'l6', video: 'l6', amb: 'amb-meadow', sfx: 'binocs', lines: [{ id: 'l6a', cap: 1 }],
    act: { kind: 'binocs', at: [0.81, 0.67], r: 0.08, start: [0.45, 0.5], then: [{ id: 'l6b', b: [0.48, 0.5], t: [0.27, 0.64] }] } },
  { id: 'l7', img: 'l7', calm: 'l7b', amb: 'amb-forest', lines: [{ id: 'l7a', cap: 1 }],
    act: { kind: 'still', at: [0.84, 0.84], r: 0.13, ms: 2600, warn: 'l7w', then: [{ id: 'l7b', b: [0.64, 0.56], t: [0.82, 0.76] }] } },
  { id: 'l8', img: 'l8', amb: 'amb-forest', lines: [{ id: 'l8a', b: [0.34, 0.15], t: [0.45, 0.38] }, { id: 'l8b', b: [0.7, 0.3], t: [0.66, 0.5] }, { id: 'l8c', b: [0.34, 0.15], t: [0.45, 0.38] }] },
  { id: 'l9', img: 'l9', amb: 'amb-forest', lines: [{ id: 'l9a', cap: 1 }] },
  { id: 'l10', img: 'l10', amb: 'amb-forest', sfx: 'hug', lines: [{ id: 'l10a', b: [0.32, 0.2], t: [0.3, 0.6] }, { id: 'l10b', cap: 1 }],
    act: { kind: 'greet', spots: [{ at: [0.2, 0.83], word: 'COUCOU !' }, { at: [0.58, 0.89], word: 'BONJOUR !' }, { at: [0.7, 0.79], word: 'HI HI !' }], then: [{ id: 'l10c', b: [0.42, 0.33], t: [0.46, 0.66] }] } },
  { id: 'l11', img: 'l11', video: 'l11', amb: 'amb-evening', sfx: 'pencil', lines: [{ id: 'l11a', cap: 1 }, { id: 'l11b', b: [0.58, 0.32], t: [0.36, 0.56] }] },
];
export const WHO = { n: 'narr', l: 'lina', p: 'pic', m: 'mama' };
