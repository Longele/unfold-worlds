// Nala et la fusée en carton: a touch comic for 4 to 8 year olds. Nala builds a cardboard rocket, dreams that it
// flies to the Moon with Bip, her cardboard robot, and learns true things on the way: satellites, weightlessness,
// low gravity, footprints that last, ice in the craters, the black sky and the silence, the way home, the phases.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Nala et la fusée en carton', en: 'Nala and the cardboard rocket' };
export const AFTER_BRANCH = 'k15';
export const PANELS = [
  { id: 'k1', img: 'k1', amb: 'amb-room', lines: [{ id: 'k1a', cap: 1 }],
    act: { kind: 'taps', hint: 'tape', sfx: 'tape', r: 0.08, spots: [[0.12, 0.8], [0.76, 0.88], [0.32, 0.34]], word: { fr: 'SCRITCH !', en: 'RIIIP!' }, then: [{ id: 'k1b', b: [0.62, 0.2], t: [0.64, 0.6] }] } },
  { id: 'k2', img: 'k2', amb: 'amb-room', lines: [{ id: 'k2a', b: [0.62, 0.15], t: [0.76, 0.3] }, { id: 'k2b', cap: 1 }],
    act: { kind: 'switch', at: [0.82, 0.88], r: 0.08, after: 'k2b', then: [{ id: 'k2c', b: [0.32, 0.32], t: [0.34, 0.48] }] } },
  { id: 'k3', img: 'k3', amb: 'amb-night', lines: [{ id: 'k3a', cap: 1 }, { id: 'k3b', b: [0.56, 0.22], t: [0.6, 0.72] }] },
  { id: 'k4', img: 'k4', amb: 'amb-night', lines: [{ id: 'k4a', cap: 1 }],
    act: { kind: 'shout', film: 'k4', then: [{ id: 'k4b', cap: 1 }] } },
  { id: 'k5', img: 'k5', amb: 'amb-space', lines: [{ id: 'k5a', cap: 1 }],
    act: { kind: 'steer', secs: 16, then: [{ id: 'k5b', b: [0.5, 0.42], t: [0.5, 0.75] }] } },
  { id: 'k6', img: 'k6', amb: 'amb-cabin', lines: [{ id: 'k6a', cap: 1 }],
    act: { kind: 'binocs', at: [0.58, 0.4], r: 0.055, start: [0.4, 0.55], then: [{ id: 'k6b', b: [0.4, 0.8], t: [0.68, 0.66] }] } },
  { id: 'k7', img: 'k7', amb: 'amb-cabin', lines: [{ id: 'k7a', cap: 1 }],
    act: { kind: 'taps', hint: 'bubbles', sfx: 'bloop', hue: 200, r: 0.08, float: 1, dim: 1, spots: [[0.215, 0.12], [0.82, 0.22], [0.13, 0.4], [0.86, 0.615]], word: { fr: 'BLOUP !', en: 'BLOOP!' }, then: [{ id: 'k7b', b: [0.5, 0.86], t: [0.32, 0.66] }] } },
  { id: 'k8', img: 'k8', amb: 'amb-cabin', sfx: 'land', lines: [{ id: 'k8a', cap: 1 }],
    act: { kind: 'blow', after: 'k8b', c: [0.525, 0.462], box: [0.12, 0.25, 0.93, 0.68], then: [{ id: 'k8b', b: [0.5, 0.86], t: [0.42, 0.99] }] } },
  { id: 'k9', img: 'k9', amb: 'amb-moon', lines: [{ id: 'k9a', cap: 1 }],
    act: { kind: 'jump', at: [0.45, 0.86], h: 0.24, n: 2, then: [{ id: 'k9b', b: [0.38, 0.3], t: [0.45, 0.66] }] } },
  { id: 'k10', img: 'k10', amb: 'amb-moon', lines: [{ id: 'k10a', cap: 1 }],
    act: { kind: 'prints', n: 4, box: [0.12, 0.38, 0.88, 0.84], then: [{ id: 'k10b', b: [0.58, 0.3], t: [0.92, 0.99] }] } },
  { id: 'k11', img: 'k11', amb: 'amb-moon', lines: [{ id: 'k11a', cap: 1 }],
    act: { kind: 'lamp', at: [0.46, 0.92], r: 0.08, start: [0.5, 0.5], then: [{ id: 'k11b', b: [0.66, 0.26], t: [0.4, 0.22] }] } },
  { id: 'k12', img: 'k12', amb: 'amb-moon', lines: [{ id: 'k12a', cap: 1 }],
    act: { kind: 'silent', at: [0.73, 0.72], r: 0.1, then: [{ id: 'k12b', b: [0.5, 0.48], t: [0.72, 0.66] }] } },
  { id: 'k13', img: 'k13', amb: 'amb-space', lines: [{ id: 'k13a', cap: 1 }],
    act: { kind: 'choice', opts: [{ at: [0.3, 0.46], fr: 'Dans la mer', en: 'In the sea', go: 'k14s' }, { at: [0.62, 0.3], fr: 'Dans la plaine', en: 'On the plain', go: 'k14p' }] } },
  { id: 'k14s', img: 'k14s', amb: 'amb-sea', branch: 1, lines: [{ id: 'k14a', cap: 1 }],
    act: { kind: 'taps', hint: 'chutes', sfx: 'chute', r: 0.1, spots: [[0.2, 0.32], [0.72, 0.21], [0.63, 0.38]], word: { fr: 'POUF !', en: 'WHUMP!' }, then: [{ id: 'k14s', cap: 1, sfx: 'splash' }, { id: 'k14c', b: [0.55, 0.55], t: [0.47, 0.73] }] } },
  { id: 'k14p', img: 'k14p', amb: 'amb-plain', branch: 1, lines: [{ id: 'k14a', cap: 1 }],
    act: { kind: 'taps', hint: 'chutes', sfx: 'chute', r: 0.14, spots: [[0.55, 0.26]], word: { fr: 'POUF !', en: 'WHUMP!' }, then: [{ id: 'k14d', cap: 1, sfx: 'thud' }, { id: 'k14c', b: [0.5, 0.56], t: [0.5, 0.75] }] } },
  { id: 'k15', img: 'k15', amb: 'amb-morning', sfx: 'yawn', lines: [{ id: 'k15a', cap: 1 }, { id: 'k15b', b: [0.6, 0.18], t: [0.8, 0.4] }, { id: 'k15c', b: [0.34, 0.26], t: [0.5, 0.45] }] },
  { id: 'k16', img: 'k16', amb: 'amb-night', lines: [{ id: 'k16a', cap: 1 }, { id: 'k16d', cap: 1 }],
    act: { kind: 'phases', at: [0.75, 0.34], r: 0.11, then: [{ id: 'k16b', b: [0.28, 0.5], t: [0.36, 0.58] }, { id: 'k16c', b: [0.7, 0.6], t: [0.64, 0.66] }] } },
];
export const WHO = { n: 'narr', a: 'nala', b: 'bip', m: 'maman' };
