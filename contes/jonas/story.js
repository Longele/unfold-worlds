// Jonas et le grand poisson, the touch comic (the book of Jonah, chapters 1 to 4) for 4 to 8 year olds, the most
// hands-on of the comics: the child chooses what Jonah will do, draws his flight on the map, pays the captain, blows
// into the sail, keeps the ship upright in the storm, throws the cargo overboard, finds and wakes Jonah, shakes the
// pot of lots, rows, calms the sea, steers the great fish, counts the three nights, tickles the fish, walks across
// Nineveh, shouts with Jonah, dresses the king in sackcloth, grows the plant, finds the worm and lights up the city.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Jonas et le grand poisson', en: 'Jonah and the great fish' };
export const AFTER_BRANCH = null;
const L = (id) => ({ id, cap: 1 });
export const PANELS = [
  { id: 'j1', img: 'j1', amb: 'amb-village', lines: [L('j1a')],
    act: { kind: 'hello', at: [0.5, 0.6], r: 0.15, word: { fr: 'SHALOM !', en: 'SHALOM!' }, then: [{ id: 'j1b', b: [0.6, 0.22], t: [0.5, 0.44] }] } },
  // God's call, Jonah's no, then the child guesses what he will do and draws his flight to the west
  { id: 'j2', img: 'j2', amb: 'amb-port', lines: [L('j2a'), { id: 'j2b', b: [0.62, 0.66], t: [0.48, 0.56] }, L('j2c')],
    labels: [{ at: [0.79, 0.36], fr: 'Ninive', en: 'Nineveh' }, { at: [0.62, 0.6], fr: 'Joppé', en: 'Joppa' }, { at: [0.14, 0.42], fr: '← Tarsis', en: '← Tarshish' }],
    act: { kind: 'seq', steps: [
      { kind: 'ask', opts: [{ at: [0.64, 0.23], fr: 'Aller à Ninive', en: 'Go to Nineveh', line: L('j2y') }, { at: [0.36, 0.8], fr: 'S’enfuir en bateau', en: 'Run away by boat', line: L('j2z') }] },
      { kind: 'trace', style: 'route', pts: Array.from({ length: 16 }, (_, i) => { const u = i / 15; return [0.44 - u * 0.38, 0.565 - Math.sin(u * Math.PI) * 0.05 - u * 0.1]; }) },
    ], then: [L('j2d')] } },
  { id: 'j3', img: 'j3', amb: 'amb-port', lines: [L('j3a')],
    act: { kind: 'drop', items: [{ src: 'coin', at: [0.12, 0.79], w: 0.11 }, { src: 'coin', at: [0.2, 0.87], w: 0.11 }, { src: 'coin', at: [0.1, 0.94], w: 0.11 }],
      to: { at: [0.56, 0.71], r: 0.1 }, mode: 'stack', sfx: 'coin', count: true, hint: 'pay', then: [{ id: 'j3b', b: [0.62, 0.24], t: [0.74, 0.62] }] } },
  { id: 'j4', img: 'j4', amb: 'amb-sea', lines: [L('j4a')],
    act: { kind: 'blow', after: 'j4b', box: [0.38, 0.28, 0.72, 0.5], sail: 1, then: [L('j4b')] } },
  { id: 'j5', img: 'j5', amb: 'amb-storm', sfx: 'thunder', lines: [L('j5a'), L('j5b')],
    act: { kind: 'storm', pivot: [0.42, 0.56], secs: 11, then: [{ id: 'j5c', b: [0.62, 0.24], t: [0.42, 0.46] }] } },
  { id: 'j6', img: 'j6', amb: 'amb-storm', lines: [L('j6a')],
    act: { kind: 'drop', items: [{ src: 'art/amphora.png', at: [0.5, 0.62], w: 0.13 }, { src: 'art/crate.png', at: [0.66, 0.74], w: 0.2 }, { src: 'art/basket.png', at: [0.42, 0.84], w: 0.2 }, { src: 'art/pot.png', at: [0.7, 0.9], w: 0.18 }],
      zones: [[0, 0.3, 0.2, 1], [0.86, 0.25, 1, 0.55]], mode: 'sea', sfx: 'splash', word: { fr: 'PLOUF !', en: 'SPLASH!' }, hint: 'toss', then: [L('j6b')] } },
  { id: 'j7', img: 'j7', amb: 'amb-ark', lines: [L('j7a')],
    act: { kind: 'seq', steps: [{ kind: 'lamp', at: [0.7, 0.7], r: 0.13, start: [0.3, 0.45] }, { say: L('j7b') }, { kind: 'rapid', at: [0.68, 0.7], r: 0.16, n: 5, snore: [0.8, 0.6], after: 'j7b', sfx: 'tap', words: { fr: ['Hmm…', 'ZZZ', 'Mmh ?'], en: ['Hmm…', 'ZZZ', 'Mmh?'] }, end: { fr: 'HEIN ?!', en: 'HUH?!' }, hint: 'wake' }],
      then: [{ id: 'j7c', b: [0.42, 0.24], t: [0.12, 0.1] }] } },
  { id: 'j8', img: 'j8', amb: 'amb-storm', lines: [L('j8a')],
    act: { kind: 'lots', at: [0.48, 0.76], w: 0.22, to: [0.84, 0.66], word: { fr: 'JONAS !', en: 'JONAH!' },
      then: [L('j8b'), { id: 'j8c', b: [0.5, 0.26], t: [0.88, 0.44] }] } },
  { id: 'j9', img: 'j9', amb: 'amb-storm', lines: [L('j9a')],
    act: { kind: 'row', n: 6, then: [L('j9b')] } },
  { id: 'j10', img: 'j10', amb: 'amb-storm', lines: [L('j10a')],
    act: { kind: 'paint', after: 'j10b', box: [0, 0.3, 1, 1], amb: 'amb-sea', then: [L('j10b')] } },
  { id: 'j11', img: 'j11', amb: 'amb-under', lines: [L('j11a')],
    act: { kind: 'fish', start: [0.1, 0.28], at: [0.62, 0.53], after: 'j11b', then: [L('j11b'), L('j11c')] } },
  { id: 'j12', img: 'j12', amb: 'amb-belly', lines: [L('j12a')],
    act: { kind: 'seq', steps: [{ kind: 'lamp', at: [0.52, 0.66], r: 0.13, start: [0.25, 0.8] }, { say: L('j12b') }, { kind: 'moons', spots: [[0.22, 0.34], [0.5, 0.29], [0.78, 0.34]] }],
      then: [{ id: 'j12c', b: [0.5, 0.42], t: [0.52, 0.58] }] } },
  { id: 'j13', img: 'j13', amb: 'amb-beach', lines: [L('j13a')],
    act: { kind: 'rapid', at: [0.44, 0.81], r: 0.17, n: 8, after: 'j13b', sfx: 'giggle', words: { fr: ['HI HI !', 'HO HO !', 'HIC !'], en: ['HEE HEE!', 'HO HO!', 'HIC!'] }, end: { fr: 'BLEURP !', en: 'BLURP!' }, endSfx: 'burp', meter: 1, hint: 'tickle',
      then: [L('j13b'), { id: 'j13c', b: [0.6, 0.28], t: [0.27, 0.64] }] } },
  { id: 'j14', img: 'j14', amb: 'amb-desert', lines: [L('j14a')],
    act: { kind: 'walk', steps: 18, zoom: [0.62, 0.4], then: [L('j14b')] } },
  { id: 'j15', img: 'j15', amb: 'amb-city', lines: [L('j15a'), { id: 'j15b', b: [0.3, 0.26], t: [0.5, 0.42] }, L('j15c')],
    act: { kind: 'shout', after: 'j15b', word: { fr: 'NINIVE !', en: 'NINEVEH!' }, then: [L('j15d')] } },
  { id: 'j16', img: 'j16', amb: 'amb-palace', lines: [L('j16a')],
    act: { kind: 'drop', items: [{ src: 'art/sack.png', at: [0.16, 0.86], w: 0.26 }], to: { at: [0.52, 0.66], r: 0.17 }, mode: 'swap', after: 'j16b', sfx: 'whoosh', hint: 'dress',
      then: [{ id: 'j16b', b: [0.42, 0.26], t: [0.75, 0.66] }] } },
  { id: 'j17', img: 'j17', amb: 'amb-city', lines: [L('j17a')],
    act: { kind: 'sounds', r: 0.1, spots: [{ at: [0.17, 0.66], sfx: 'moo', word: { fr: 'MEUH !', en: 'MOO!' } }, { at: [0.5, 0.67], sfx: 'heehaw', word: { fr: 'HI-HAN !', en: 'HEE-HAW!' } }, { at: [0.8, 0.72], sfx: 'baa', word: { fr: 'BÊÊ !', en: 'BAA!' } }, { at: [0.82, 0.89], sfx: 'goat', word: { fr: 'MÊÊ !', en: 'MEH!' } }],
      then: [L('j17b')] } },
  { id: 'j18', img: 'j18', amb: 'amb-desert', lines: [L('j18a'), L('j18b')],
    act: { kind: 'grow', after: 'j18b', stem: [0.32, 0.9], top: 0.24, then: [{ id: 'j18c', b: [0.68, 0.24], t: [0.6, 0.64] }] } },
  { id: 'j19', img: 'j19', amb: 'amb-village', lines: [L('j19a')],
    act: { kind: 'loupe', at: [0.395, 0.5], r: 0.07, start: [0.6, 0.4], after: 'j19b', amb: 'amb-desert',
      then: [L('j19b'), { id: 'j19c', b: [0.42, 0.42], t: [0.6, 0.62] }] } },
  { id: 'j20', img: 'j20', amb: 'amb-night', lines: [L('j20a'), L('j20b')],
    act: { kind: 'lights', box: [0, 0.37, 1, 0.92], not: [0.58, 0.55, 1, 1], total: 120000, then: [L('j20c')] } },
  { id: 'j21', img: 'j21', amb: 'amb-sunset', lines: [{ id: 'j21a', b: [0.4, 0.26], t: [0.78, 0.46] }],
    act: { kind: 'leap', at: [0.32, 0.58], r: 0.13, word: { fr: 'AU REVOIR !', en: 'GOODBYE!' }, then: [L('j21b')] } },
];
export const WHO = { n: 'narr', j: 'jonas', c: 'capt', k: 'king' };
