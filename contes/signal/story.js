// Le signal: an investigation comic for 11 to 13 year olds. One night in a radio observatory, Awa finds a tiny
// scruff on the recording and, with the reader, tests every explanation like a scientist: the time it comes back
// (it follows the stars), the beat (1.337 s, perfectly steady), aliens on a planet (no orbital wobble, and a second
// source elsewhere), what could spin that fast (only a neutron star holds), then the true story of 1967.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = Awa's narration box.
export const TITLE = { fr: 'Le signal', en: 'The signal' };
export const WHO = { a: 'awa', r: 'rose' };
export const AFTER_BRANCH = null;
const C = (id) => ({ id, cap: 1 });
export const PANELS = [
  { id: 'p1', img: 's1', amb: 'amb-plateau', lines: [C('s1a'), { id: 's1b', b: [0.62, 0.16], t: [0.63, 0.6] }],
    act: { kind: 'dishes', spots: [[0.13, 0.4], [0.5, 0.33], [0.86, 0.38]] } },
  { id: 'p2', img: 's2', amb: 'amb-control', lines: [{ id: 's2a', b: [0.58, 0.14], t: [0.72, 0.25] }],
    act: { kind: 'static', at: [0.2, 0.61], then: [{ id: 's2b', b: [0.58, 0.14], t: [0.72, 0.25] }] } },
  { id: 'p3', img: 's3', amb: 'amb-control', lines: [C('s3a')], act: { kind: 'tape', then: [C('s3b')] } },
  { id: 'p4', img: 's4', amb: 'amb-control', lines: [C('s4a')], act: { kind: 'board', then: [C('s4b')] } },
  { id: 'p5', img: 's5', amb: 'amb-control', lines: [C('s5a')], act: { kind: 'clock', then: [C('s5b')] } },
  { id: 'p5b', img: 's5', amb: 'amb-control', lines: [], act: { kind: 'seq', steps: [{ kind: 'earth' }, { say: C('s5c') }, { kind: 'cross', list: [0, 1] }] } },
  { id: 'p6', img: 's6', amb: 'amb-control', lines: [{ id: 's6a', b: [0.42, 0.1], t: [0.36, 0.22] }, { id: 's6b', b: [0.46, 0.64], t: [0.72, 0.56] }] },
  { id: 'p7', img: 's7', amb: 'amb-control', lines: [C('s7a')], act: { kind: 'beat', then: [C('s7b')] } },
  { id: 'p7b', img: 's7', amb: 'amb-control', lines: [], act: { kind: 'rhythm', then: [{ id: 's7c', b: [0.55, 0.08], t: [0.66, 0.2] }] } },
  { id: 'p8', img: 's8', amb: 'amb-plateau', lines: [{ id: 's8a', b: [0.32, 0.45], t: [0.38, 0.66] }],
    act: { kind: 'note', at: [0.56, 0.62], text: 'LGM-1', then: [{ id: 's8b', b: [0.62, 0.18], t: [0.73, 0.52] }] } },
  { id: 'p9', img: 's9', amb: 'amb-control', lines: [C('s9a')], act: { kind: 'siren', then: [C('s9b')] } },
  { id: 'p9b', img: 's9', amb: 'amb-control', lines: [], act: { kind: 'seq', steps: [{ kind: 'orbit' }, { say: C('s9c') }, { kind: 'cross', list: [3], how: 'doubt' }] } },
  { id: 'p10', img: 's10', amb: 'amb-plateau', lines: [C('s10a')],
    act: { kind: 'seq', steps: [{ kind: 'sky', at: [0.78, 0.3] }, { say: C('s10b') }, { kind: 'cross', list: [3] }, { kind: 'cross', list: [2], how: 'win' }] } },
  { id: 'p11', img: 's11', amb: 'amb-plateau', lines: [C('s11a')], act: { kind: 'spin', then: [C('s11b')] } },
  { id: 'p11b', img: 's11', amb: 'amb-plateau', lines: [], act: { kind: 'beam', then: [C('s11c')] } },
  { id: 'p12', img: 's12', amb: 'amb-control', lines: [{ id: 's12a', b: [0.6, 0.1], t: [0.26, 0.36] }],
    act: { kind: 'spoon', from: [0.53, 0.56], to: [0.47, 0.68], then: [C('s12b')] } },
  { id: 'p13', img: 's13', amb: 'amb-plateau', lines: [C('s13a')], act: { kind: 'listen' } },
  { id: 'p14', img: 's14', amb: 'amb-dawn', lines: [{ id: 's14a', b: [0.46, 0.16], t: [0.67, 0.5] }] },
  { id: 'p15', img: 's15', amb: 'amb-1967', lines: [C('s14b')], act: { kind: 'loupe', at: [0.74, 0.8], r: 0.1, start: [0.4, 0.75], then: [C('s14c')] } },
  { id: 'p16', img: 's16', amb: 'amb-control', lines: [C('s15a')], act: { kind: 'toy', then: [C('s15b')] } },
  { id: 'p17', img: 's17', amb: 'amb-plateau', lines: [C('s16a')] },
];
