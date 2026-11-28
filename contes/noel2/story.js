// Les mages et l'étoile, Christmas episode 2 (Matthew 2:1-14, 19-23; Luke 2:40) for 4 to 8 year olds.
// A quest with clues and a secret: the child finds the new star, loads the treasures, keeps the caravan under the
// star, asks the people of Jerusalem, reads the old scroll from right to left, keeps Herod's secret, follows the
// star and stops it over the house, gives the gifts, traces another road home, lights the family's way to Egypt,
// keeps the moment in their heart, and fills a travel journal with four stamps (the four lessons).
// Characters never speak to the child; only the storyteller does. Jesus is still a baby (the user's choice).
// b = where a bubble sits, t = the speaker it points at (fractions of the panel); cap = narration box.
export const TITLE = { fr: 'Les mages et l’étoile', en: 'The wise men and the star' };
export const AFTER_BRANCH = null;
const L = (id, stamp) => ({ id, cap: 1, stamp });
const B = (id, b, t) => ({ id, b, t });
export const STAMPS = [
  { icon: '⭐', line: 't1', fr: 'Les étoiles', en: 'The stars' },
  { icon: '🎁', line: 't2', fr: 'Trois trésors', en: 'Three treasures' },
  { icon: '📜', line: 't3', fr: 'L’hébreu', en: 'Hebrew' },
  { icon: '🔺', line: 't4', fr: 'Les pyramides', en: 'The pyramids' },
];
export const PANELS = [
  // today, by the tree of episode 1: the star on top opens the way
  { id: 'q0', img: 'q0', amb: 'amb-home', loop: 'q0', early: 1, auto: 1, lines: [L('n0a')],
    act: { kind: 'portal', at: [0.65, 0.16], r: 0.12, zoom: 1, hint: 'star0' } },
  { id: 'q1', img: 'q1', amb: 'amb-night', loop: 'q1', early: 1, lines: [L('n1a'), L('n1b')],
    act: { kind: 'skyfind', known: [[0.17, 0.12], [0.3, 0.07], [0.43, 0.13], [0.56, 0.08], [0.7, 0.14], [0.83, 0.09], [0.62, 0.25]], fresh: [0.33, 0.27],
      then: [B('g1c', [0.5, 0.38], [0.18, 0.56]), B('k1d', [0.66, 0.44], [0.8, 0.52]), L('n1e', 0)] } },
  { id: 'q2', img: 'q2', amb: 'amb-village', lines: [L('n2a')],
    act: { kind: 'drop', mode: 'load', count: 1, hint: 'load', sfx: 'chime', after: 'q2b',
      items: [{ src: 'art/gold.png', at: [0.2, 0.83], w: 0.24 }, { src: 'art/incense.png', at: [0.5, 0.85], w: 0.22 }, { src: 'art/myrrh.png', at: [0.8, 0.81], w: 0.15 }],
      zones: [[0.02, 0.36, 0.98, 0.66]], then: [L('n2b', 1)] } },
  { id: 'q3', img: 'q3', amb: 'amb-desert', lines: [L('n3a')],
    act: { kind: 'steer', secs: 9, star: 0.15, y: 0.78, then: [L('n3b')] } },
  { id: 'q4', img: 'q4', amb: 'amb-city', lines: [L('n4a'), B('g4b', [0.62, 0.12], [0.2, 0.35]), L('n4c')],
    act: { kind: 'sounds', hint: { fr: 'Touche les gens de la ville', en: 'Touch the people of the city' }, r: 0.1,
      spots: [{ at: [0.2, 0.68], sfx: 'pop', line: B('p4x', [0.3, 0.47], [0.2, 0.58]) }, { at: [0.48, 0.7], sfx: 'pop', line: B('q4y', [0.52, 0.5], [0.46, 0.6]) }, { at: [0.82, 0.72], sfx: 'pop', line: B('s4z', [0.7, 0.47], [0.82, 0.6]) }],
      then: [L('n4d')] } },
  { id: 'q5', img: 'q5', amb: 'amb-room', lines: [L('n5a'), L('n5b')],
    act: { kind: 'loupe', start: [0.8, 0.74], at: [0.28, 0.72], r: 0.08, rtl: 1, word: { fr: 'בֵּית לֶחֶם = Bethléem', en: 'בֵּית לֶחֶם = Bethlehem' },
      then: [L('n5c'), L('n5d', 2)] } },
  { id: 'q6', img: 'q6', amb: 'amb-room', lines: [B('r6a', [0.6, 0.1], [0.36, 0.3]), L('n6b'), L('n6c')],
    act: { kind: 'heart', at: [0.2, 0.2], icon: '🔒', done: '🔐', hint: 'lock', then: [L('n6d')] } },
  { id: 'q7', img: 'q7', amb: 'amb-hills', loop: 'q7', early: 1, lines: [L('n7a'), L('n7b')],
    act: { kind: 'path', mark: 'star', hint: 'follow', word: { fr: 'BETHLÉEM !', en: 'BETHLEHEM!' },
      pts: [[0.5, 0.97], [0.42, 0.88], [0.34, 0.8], [0.32, 0.73], [0.4, 0.68], [0.55, 0.64], [0.66, 0.6], [0.72, 0.54], [0.68, 0.49], [0.6, 0.46], [0.62, 0.42], [0.6, 0.38]] } },
  { id: 'q8', img: 'q8', amb: 'amb-night', lines: [L('n8a')],
    act: { kind: 'stopstar', y: 0.3, target: [0.7, 0.67], then: [L('n8b')] } },
  { id: 'q9', img: 'q9', amb: 'amb-stable', loop: 'q9', early: 1, lines: [L('n9a')],
    act: { kind: 'seq', steps: [
      { say: L('n9b') },
      { kind: 'rub', fx: 'shine', box: [0.17, 0.76, 0.43, 0.91], hint: 'rubGold' },
      { say: L('n9c') },
      { kind: 'rub', fx: 'smoke', box: [0.47, 0.79, 0.65, 0.89], hint: 'rubIncense' },
      { say: L('n9d') },
      { say: L('n9e') },
      { kind: 'sounds', hint: { fr: 'Touche la myrrhe', en: 'Touch the myrrh' }, r: 0.09, spots: [{ at: [0.78, 0.83], sfx: 'chime', word: { fr: 'Pour Jésus ✓', en: 'For Jesus ✓' } }] },
    ] } },
  { id: 'q10', img: 'q10', amb: 'amb-night', lines: [L('n10a')],
    act: { kind: 'seq', steps: [
      { kind: 'swap', img: 'q10m', sfx: 'scroll' },
      { say: L('n10b') },
      { kind: 'path', mark: 'caravan', hint: 'home', word: { fr: 'PAR UN AUTRE CHEMIN !', en: 'ANOTHER WAY!' },
        pts: [[0.17, 0.87], [0.3, 0.9], [0.45, 0.9], [0.6, 0.88], [0.75, 0.82], [0.88, 0.7], [0.9, 0.55], [0.88, 0.4], [0.86, 0.25], [0.82, 0.12]] },
      { say: L('n10c') },
    ] } },
  { id: 'q11', img: 'q11', amb: 'amb-room', lines: [L('n11a'), B('a11b', [0.3, 0.3], [0.22, 0.45]), L('n11c')],
    act: { kind: 'seq', steps: [
      { kind: 'swap', img: 'q11r' },
      { kind: 'lamp', at: [0.55, 0.47], r: 0.1, start: [0.45, 0.85], after: 'q11e', amb: 'amb-sunset' },
      { say: L('n11d', 3) },
    ] } },
  { id: 'q12', img: 'q12', amb: 'amb-village', lines: [L('n12a'), L('n12b')],
    act: { kind: 'heart', at: [0.5, 0.16] } },
  // the travel journal: the four stamps, touched one by one, each one says its lesson again
  { id: 'q13', img: 'q10m', amb: 'amb-home', lines: [L('n13a')],
    act: { kind: 'carnet', then: [L('n13b')] } },
];
export const WHO = { n: 'narr', g: 'mage', k: 'mage', r: 'king', a: 'angel', p: 'host', q: 'host', s: 'host' };
