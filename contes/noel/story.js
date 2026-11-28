// La plus belle nuit, the Christmas comic (Luke 1:26-38 and 2:1-20) for 4 to 8 year olds. The child lives the night
// with the storyteller: greets Mary, makes the light grow, puts a fingerprint on the emperor's list, traces the road,
// walks with Joseph and Mary, knocks at the travellers' house, finds the shelter with the lantern, swaddles the baby
// and lays him in the manger, rocks him to sleep, counts the sheep, comforts the shepherds, sings Gloria with the
// angels, runs with the lamb to Bethlehem, checks the angel's sign, and keeps the night in their heart.
// Characters never speak to the child; only the storyteller does.
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'La plus belle nuit', en: 'The most beautiful night' };
export const AFTER_BRANCH = null;
const L = (id) => ({ id, cap: 1 });
const B = (id, b, t) => ({ id, b, t });
export const PANELS = [
  // today: a child at the Christmas tree; the little nativity under it opens the way into the story
  { id: 'n0', img: 'n0', amb: 'amb-home', loop: 'n0', early: 1, auto: 1, lines: [L('n0a'), L('n0b'), L('n0c')],
    act: { kind: 'portal', at: [0.64, 0.72], r: 0.15, film: 'n0in' } },
  { id: 'n1', early: 1, img: 'n1', amb: 'amb-village', loop: 'n1', lines: [L('n1a'), L('n1b')],
    act: { kind: 'hello', at: [0.26, 0.76], r: 0.13, word: { fr: 'SHALOM !', en: 'SHALOM!' }, then: [B('m1c', [0.34, 0.5], [0.26, 0.68]), L('n1d')] } },
  { id: 'n2', img: 'n2a', amb: 'amb-room', lines: [L('n2a')],
    act: { kind: 'paint', after: 'n2', box: [0.05, 0.05, 0.6, 0.95], hint: 'light', sfx: 'sparkle', endSfx: 'glow', hue: 45,
      then: [L('n2b'), B('a2c', [0.42, 0.3], [0.24, 0.36]), B('m2d', [0.66, 0.52], [0.64, 0.66]), B('a2e', [0.4, 0.3], [0.24, 0.36]), B('m2f', [0.62, 0.5], [0.64, 0.66])] } },
  { id: 'n3', img: 'n3', amb: 'amb-city', lines: [L('n3a'), L('n3b')],
    act: { kind: 'stamp', then: [L('n3c'), L('n3e'), B('j3d', [0.34, 0.3], [0.35, 0.54])] } },
  { id: 'n4', img: 'n4', amb: 'amb-desert', lines: [L('n4a')],
    labels: [{ at: [0.27, 0.17], fr: 'Nazareth', en: 'Nazareth' }, { at: [0.25, 0.92], fr: 'Bethléem', en: 'Bethlehem' }],
    act: { kind: 'path', pts: [[0.36,0.265],[0.49,0.29],[0.43,0.31],[0.33,0.33],[0.26,0.355],[0.27,0.38],[0.37,0.405],[0.49,0.425],[0.6,0.44],[0.69,0.46],[0.74,0.49],[0.72,0.52],[0.67,0.555],[0.61,0.6],[0.54,0.635],[0.47,0.67],[0.4,0.7],[0.34,0.74],[0.31,0.78],[0.32,0.82]], mark: 'walkers', word: { fr: 'BETHLÉEM !', en: 'BETHLEHEM!' }, hint: 'route', then: [L('n4b')] } },
  { id: 'n5', img: 'n5', amb: 'amb-sunset', loop: 'n5', lines: [L('n5a')],
    act: { kind: 'walk', steps: 10, zoom: [0.72, 0.2], word: { fr: 'BETHLÉEM !', en: 'BETHLEHEM!' }, then: [L('n5b')] } },
  { id: 'n6', early: 1, img: 'n6', amb: 'amb-city', loop: 'n6', lines: [L('n6a')],
    act: { kind: 'rapid', at: [0.84, 0.43], r: 0.11, n: 3, hint: 'knock', sfx: 'knock', words: { fr: ['TOC !'], en: ['KNOCK!'] }, end: { fr: 'TOC TOC TOC !', en: 'KNOCK KNOCK!' }, endSfx: 'door',
      then: [B('h6b', [0.52, 0.2], [0.65, 0.46]), L('n6r'), L('n6c')] } },
  { id: 'n7', img: 'n7a', amb: 'amb-stable', lines: [L('n7a')],
    act: { kind: 'seq', steps: [
      { kind: 'lamp', at: [0.66, 0.7], r: 0.12, start: [0.3, 0.45] },
      { say: L('n7b') },
      { kind: 'swap', img: 'n7b', sfx: 'yawn' },
      { say: L('n7c') },
      { say: L('n7d') },
      { kind: 'swaddle', at: [0.53, 0.62], r: 0.13, after: 'n7' },
      { say: L('n7e') },
      { kind: 'swap', img: 'n7c' },
      { kind: 'drop', items: [{ src: 'art/baby.png', at: [0.4, 0.71], w: 0.2 }], to: { at: [0.8, 0.68], r: 0.13 }, mode: 'swap', after: 'n7d', sfx: 'yawn', hint: 'lay' },
      { say: L('n7f') },
    ] } },
  { id: 'n8', img: 'n8a', amb: 'amb-stable', loop: 'n8', lines: [L('n8a')],
    act: { kind: 'rock', secs: 6, after: 'n8', then: [B('m8b', [0.66, 0.2], [0.47, 0.32]), L('n8c')] } },
  { id: 'n9', early: 1, img: 'n9', amb: 'amb-hills', loop: 'n9', lines: [L('n9a'), L('n9b')],
    act: { kind: 'count', spots: [[0.74, 0.61], [0.72, 0.75], [0.9, 0.8], [0.6, 0.88], [0.86, 0.94]], r: 0.075, sfx: 'bell',
      then: [B('b9c', [0.32, 0.44], [0.25, 0.64]), L('n9d')] } },
  { id: 'n10', early: 1, img: 'n10', amb: 'amb-hills', loop: 'n10', sfx: 'glow', lines: [L('n10a')],
    act: { kind: 'sounds', hint: { fr: 'Touche les bergers', en: 'Touch the shepherds' }, r: 0.11,
      spots: [{ at: [0.32, 0.8], sfx: 'chime', word: { fr: 'N’aie pas peur', en: 'Don’t be afraid' } }, { at: [0.72, 0.82], sfx: 'chime', word: { fr: 'N’aie pas peur', en: 'Don’t be afraid' } }],
      then: [B('a10b', [0.5, 0.52], [0.5, 0.22]), B('a10c', [0.5, 0.52], [0.5, 0.22]), L('n10d')] } },
  { id: 'n11', img: 'n11a', amb: 'amb-hills', lines: [L('n11a'), B('c11b', [0.5, 0.48], [0.62, 0.2]), L('n11c')],
    act: { kind: 'shout', hint: 'sing', btn: 'singBtn', reveal: 'n11', song: 'gloria', word: { fr: 'GLORIA !', en: 'GLORIA!' }, then: [L('n11d')] } },
  { id: 'n12', img: 'n12', amb: 'amb-hills', lines: [B('b12a', [0.42, 0.24], [0.38, 0.41]), L('n12b')],
    act: { kind: 'path', pts: [[0.6, 0.85], [0.7, 0.81], [0.8, 0.75], [0.86, 0.67], [0.88, 0.59], [0.84, 0.53], [0.79, 0.5], [0.75, 0.48]], mark: 'lamb', word: { fr: 'BETHLÉEM !', en: 'BETHLEHEM!' }, hint: 'lamb', then: [] } },
  { id: 'n13', early: 1, img: 'n13', amb: 'amb-stable', loop: 'n13', lines: [L('n12c')],
    act: { kind: 'seq', steps: [
      { kind: 'sounds', hint: { fr: 'Touche la couverture, puis la crèche', en: 'Touch the blanket, then the manger' }, r: 0.07,
        spots: [{ at: [0.6, 0.64], sfx: 'chime', word: { fr: 'Emmailloté ✓', en: 'Swaddled ✓' } }, { at: [0.6, 0.75], sfx: 'chime', word: { fr: 'Dans une crèche ✓', en: 'In a manger ✓' } }] },
      { say: L('n12d') },
      { say: L('n13a') },
      { say: L('n13b') },
      { kind: 'heart', at: [0.5, 0.22] },
    ] } },
  // back to today, by the same tree: why we celebrate Christmas, and the star that promises the next episode
  { id: 'n14', img: 'n14', amb: 'amb-home', loop: 'n14', film: 'n0out', lines: [L('n14a'), L('n14b')],
    act: { kind: 'sounds', hint: { fr: 'Touche l’étoile', en: 'Touch the star' }, r: 0.1, spots: [{ at: [0.65, 0.16], sfx: 'glow', word: { fr: 'Bientôt…', en: 'Soon…' } }], then: [L('n14c'), L('n14d')] } },
];
export const WHO = { n: 'narr', m: 'mary', j: 'joseph', a: 'angel', b: 'shep', h: 'host', c: 'choir' };
