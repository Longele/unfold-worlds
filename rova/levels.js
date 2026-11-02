// The course: 8 chapters of the French "algorithmique et programmation" path (5e / 4e), chapters 1 and 2 playable.
// Each level: a map (see vm.js), ROVA's start direction, the blocks offered, ROVA's memory (limit), the best
// number of blocks (par), the voice lines, and a mode: 'build' (write the program), 'predict' (a program is
// given: tap where ROVA will stop before running it), 'debug' (a program with a bug is given: fix it).

export const CHAPTERS = [
  { n: 1, title: 'Le réveil', idea: 'Séquences', intro: ['c1_1', 'c1_2', 'c1_3'], levels: [
    { id: '1-1', name: 'Sortir de la caisse', map: ['R..G'], dir: 1, blocks: ['fwd'], par: 3, say: ['l11a'], ok: 'l11ok', tip: 'Touche « Avancer » trois fois, puis « Lancer ».' },
    { id: '1-2', name: 'Le premier virage', map: ['R..#', '##.#', '##G#'], dir: 1, blocks: ['fwd', 'left', 'right'], par: 5, say: ['l12a'], ok: 'l12ok', tip: 'Gauche et droite : du point de vue de ROVA.' },
    { id: '1-3', name: 'Joue au scientifique', mode: 'predict', map: ['.....', '.....', '.....', '.....', '.R...'], dir: 0, blocks: [],
      program: ['fwd', 'fwd', 'left', 'fwd', 'right', 'fwd'], say: ['l13a'], right: 'l13right', wrong: 'l13wrong', tip: 'Lis le programme bloc par bloc et suis ROVA du doigt.' },
    { id: '1-4', name: 'Le programme bogué', mode: 'debug', map: ['##..G', '##.##', 'R..##'], dir: 1, blocks: ['fwd', 'left', 'right'], par: 8,
      program: ['fwd', 'fwd', 'right', 'fwd', 'fwd', 'right', 'fwd', 'fwd'], say: ['l14a'], ok: 'l14ok', tip: 'Lance-le d’abord, et regarde où ça se passe mal.' },
    { id: '1-5', name: 'Les deux piles', map: ['R.B..', '##.#.', '##B.G'], dir: 1, blocks: ['fwd', 'left', 'right'], par: 8, say: ['l15a'], ok: 'l15ok', tip: 'Passe sur les deux piles avant le chargeur.' },
  ] },
  { n: 2, title: 'Le long couloir', idea: 'Boucles', intro: ['c2_1'], levels: [
    { id: '2-1', name: 'Huit cases, trois blocs', map: ['R.......G'], dir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], limit: 3, par: 2, say: ['l21a'], ok: 'l21ok', newBlock: 'repeat', tip: 'Mets « Avancer » dans « Répéter », puis règle le nombre.' },
    { id: '2-2', name: 'Les lampes de secours', map: ['R..L', '.##.', '.##.', 'L..L'], dir: 1, goalAtStart: true, blocks: ['fwd', 'left', 'right', 'repeat'], limit: 5, par: 5, say: ['l22a'], ok: 'l22ok', tip: 'Le trajet d’un côté de la salle se répète quatre fois.' },
    { id: '2-3', name: 'L’escalier de caisses', map: ['R.   ', ' ..  ', '  .. ', '   ..', '    G'], dir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], limit: 5, par: 5, say: ['l23a'], ok: 'l23ok', tip: 'Une marche : avancer, tourner, avancer, tourner.' },
    { id: '2-4', name: 'Le piège de la boucle', mode: 'predict', map: ['......', '......', '......', '......', '...R..', '......'], dir: 1, blocks: [],
      program: [{ op: 'repeat', n: 3, body: ['fwd', 'fwd', 'left'] }], say: ['l24a'], right: 'l24right', wrong: 'l24wrong', tip: 'Compte les tours de boucle.' },
    { id: '2-5', name: 'Le générateur', map: [' .L#.L#.L ', 'R........G'], dir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], limit: 10, par: 10, say: ['l25a'], ok: 'l25ok', end: 'c2_end', tip: 'Trouve le motif d’une lampe, de la porte suivante à la suivante.' },
  ] },
  { n: 3, title: 'Le couloir sans lumière', idea: 'Capteurs et conditions', soon: true },
  { n: 4, title: 'Les portes automatiques', idea: 'Attendre et événements', soon: true },
  { n: 5, title: 'La serre', idea: 'Variables', soon: true },
  { n: 6, title: 'Le câble au sol', idea: 'Suivre une ligne', soon: true },
  { n: 7, title: 'ROVA a un bug', idea: 'Déboguer', soon: true },
  { n: 8, title: 'La carte inconnue', idea: 'Programme autonome', soon: true },
];

// the blocks: label, colour, what one block costs in ROVA's memory
export const BLOCKS = {
  fwd: { label: 'Avancer', key: '↑', color: '#2f8cff' },
  left: { label: 'Tourner à gauche', short: 'Gauche', key: '←', color: '#9b5cff' },
  right: { label: 'Tourner à droite', short: 'Droite', key: '→', color: '#9b5cff' },
  repeat: { label: 'Répéter', key: 'R', color: '#ff9f1c' },
};
