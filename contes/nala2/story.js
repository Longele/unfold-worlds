// Nala et la planète rouge: the second Nala comic, for 4 to 8 year olds. Nala builds a cardboard rover, dreams that
// she takes it to Mars with Bip, and learns true things on the way: Mars seen from Earth, the seven-month trip, the
// rocket landing in thin air, the rust that makes it red, the wind that cleans the rovers, Olympus Mons, the two
// moons and the blue sunset. b = where a bubble sits, t = the speaker it points at (fractions of the panel).
export const TITLE = { fr: 'Nala et la planète rouge', en: 'Nala and the red planet' };
export const AFTER_BRANCH = 'm13';
export const PANELS = [
  { id: 'm1', img: 'm1', amb: 'amb-room', lines: [{ id: 'r1a', cap: 1 }],
    act: { kind: 'wheels', from: [[0.1, 0.9], [0.29, 0.94], [0.48, 0.9]], slots: [[0.11, 0.7], [0.525, 0.762], [0.655, 0.7]], at: [0.38, 0.68], r: 0.3,
      then: [{ id: 'r1b', b: [0.6, 0.2], t: [0.66, 0.4] }] } },
  { id: 'm2', img: 'm2', amb: 'amb-night', lines: [{ id: 'r2a', b: [0.42, 0.2], t: [0.3, 0.56] }, { id: 'r2b', cap: 1 }],
    act: { kind: 'scope', ats: [[0.586, 0.472]], r: 0.05, start: [0.3, 0.3], then: [{ id: 'r2c', b: [0.55, 0.22], t: [0.5, 0.63] }] } },
  { id: 'm3', img: 'm3', amb: 'amb-night', lines: [{ id: 'r3a', cap: 1 }, { id: 'r3b', b: [0.33, 0.18], t: [0.5, 0.49] }],
    act: { kind: 'shout', film: 'm3' } },
  { id: 'm4', img: 'm4', amb: 'amb-space', lines: [{ id: 'r4a', cap: 1 }],
    act: { kind: 'trace', earth: [0.255, 0.857], mars: [0.77, 0.13], sun: [0.49, 0.48], sunR: 0.13, then: [{ id: 'r4b', cap: 1 }] } },
  { id: 'm5', img: 'm5', amb: 'amb-mars', lines: [{ id: 'r5a', cap: 1 }],
    act: { kind: 'retro', x: 0.53, ground: 0.7, word: { fr: 'POUF !', en: 'TOUCHDOWN!' }, then: [{ id: 'r5b', cap: 1 }] } },
  { id: 'm6', img: 'm6', amb: 'amb-mars', sfx: 'step', lines: [{ id: 'r6a', cap: 1 }],
    act: { kind: 'loupe', ats: [[0.2, 0.8]], r: 0.07, start: [0.55, 0.62], then: [{ id: 'r6b', cap: 1 }] } },
  { id: 'm7', img: 'm7', amb: 'amb-mars', lines: [{ id: 'r7a', cap: 1 }],
    act: { kind: 'drive', secs: 15, then: [{ id: 'r7b', b: [0.5, 0.5], t: [0.5, 0.78] }] } },
  { id: 'm8', img: 'm8', amb: 'amb-mars', sfx: 'gust', lines: [{ id: 'r8a', cap: 1 }],
    act: { kind: 'blow', after: 'm8b', c: [0.53, 0.48], box: [0.08, 0.41, 0.98, 0.56], then: [{ id: 'r8b', b: [0.6, 0.3], t: [0.82, 0.72] }] } },
  { id: 'm9', img: 'm9', amb: 'amb-mars', lines: [{ id: 'r9a', cap: 1 }],
    act: { kind: 'compare', box: [0.06, 0.07, 0.94, 0.43], then: [{ id: 'r9b', cap: 1 }] } },
  { id: 'm10', img: 'm10', amb: 'amb-marsnight', lines: [{ id: 'r10a', cap: 1 }],
    act: { kind: 'binocs', ats: [[0.216, 0.14], [0.84, 0.486]], r: 0.05, start: [0.5, 0.35], then: [{ id: 'r10b', b: [0.42, 0.5], t: [0.38, 0.7] }] } },
  { id: 'm11', img: 'm11', amb: 'amb-mars', lines: [{ id: 'r11a', cap: 1 }],
    act: { kind: 'sunset', after: 'm11b', x: 0.887, top: 0.16, horizon: 0.628, ground: 0.648, then: [{ id: 'r11b', cap: 1 }] } },
  { id: 'm12', img: 'm12', amb: 'amb-mars', lines: [{ id: 'r12a', cap: 1 }],
    act: { kind: 'choice', opts: [{ at: [0.28, 0.2], fr: 'Un caillou rouge', en: 'A red pebble', go: 'm12p' }, { at: [0.68, 0.3], fr: 'Une photo', en: 'A photo', go: 'm12q' }] } },
  { id: 'm12p', img: 'm12p', amb: 'amb-mars', branch: 1, lines: [{ id: 'r12p', cap: 1 }],
    act: { kind: 'taps', hint: 'pebble', sfx: 'pick', r: 0.1, spots: [[0.44, 0.49]], word: { fr: 'HOP !', en: 'GOT IT!' }, hue: 10, then: [{ id: 'r12c', b: [0.42, 0.68], t: [0.82, 0.76] }] } },
  { id: 'm12q', img: 'm12q', amb: 'amb-mars', branch: 1, lines: [{ id: 'r12q', cap: 1 }],
    // suit: where the child's own astronaut stands (feet x, y and height, fractions of the panel) and the visor
    // ellipse inside the suit picture (centre and radii, fractions of the suit picture, printed by build_art.py)
    act: { kind: 'photo', suit: { x: 0.81, y: 0.705, h: 0.37, visor: [0.535, 0.226, 0.342, 0.174] }, then: [{ id: 'r12c', b: [0.36, 0.2], t: [0.48, 0.38] }] } },
  { id: 'm13', img: 'm13', amb: 'amb-morning', sfx: 'yawn', lines: [{ id: 'r13a', cap: 1 }, { id: 'r13b', b: [0.62, 0.17], t: [0.86, 0.38] }, { id: 'r13c', b: [0.36, 0.28], t: [0.44, 0.48] }],
    act: { kind: 'taps', hint: 'pebble2', sfx: 'sparkle', r: 0.07, spots: [[0.215, 0.64]], word: { fr: 'Mars !', en: 'Mars!' }, hue: 10 } },
];
export const WHO = { n: 'narr', a: 'nala', b: 'bip', m: 'maman' };
