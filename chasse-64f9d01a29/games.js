// La Grande Chasse: the challenges, one per player at each card, matched to age.
//   p = 3 to 5 (no reading: colours, counting, shapes, all said aloud), m = 6 to 8 (adding, patterns, reading a
//   word), g = 9 to 12 (a coded message, riddles, astronaut questions, number sequences).
// A challenge: { voice: [line ids], text, options: [{ html, ok }], big }.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const used = new Set();
const fresh = (key, list) => { const left = list.filter((x) => !used.has(key + JSON.stringify(x))); const x = pick(left.length ? left : list); used.add(key + JSON.stringify(x)); return x; };

const COLORS = { rouge: '#e53935', bleu: '#1e88e5', jaune: '#fdd835', vert: '#43a047', violet: '#8e24aa' };
const SHAPES = {
  rond: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
  carre: '<svg viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="6"/></svg>',
  triangle: '<svg viewBox="0 0 100 100"><path d="M50 10 L92 88 L8 88 Z"/></svg>',
  etoile: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38 Z"/></svg>',
};
const WORDS = [['CHAT', '🐱'], ['LUNE', '🌙'], ['FUSÉE', '🚀'], ['SOLEIL', '☀️'], ['POMME', '🍎'], ['ÉTOILE', '⭐'], ['POISSON', '🐟'], ['ARBRE', '🌳'], ['GÂTEAU', '🎂'], ['VÉLO', '🚲']];
const PATTERNS = [['🔴', '🔵'], ['🌙', '⭐', '⭐'], ['🐱', '🐶', '🐰'], ['🍎', '🍎', '🍌'], ['🟢', '🟡', '🟣']];
const CODE = ['LUNE', 'FUSEE', 'ROBOT', 'PLANETE', 'COMETE', 'ETOILE', 'GALAXIE', 'SATURNE'];
const RIDDLES = [
  { q: 'Pixo a 3 sœurs. Chaque sœur a 1 seul frère. Combien d’enfants y a-t-il dans sa famille ?', a: '4', o: ['4', '6', '7'] },
  { q: 'Un escargot grimpe un mur de 5 mètres. Le jour il monte de 3 mètres, la nuit il glisse de 2 mètres. En combien de jours arrive-t-il en haut ?', a: '3 jours', o: ['3 jours', '5 jours', '2 jours'] },
  { q: 'Qu’est-ce qui est le plus lourd : un kilo de plumes ou un kilo de pierres ?', a: 'Pareil', o: ['Pareil', 'Les pierres', 'Les plumes'] },
  { q: 'Si hier était lundi, quel jour sera après-demain ?', a: 'Jeudi', o: ['Jeudi', 'Mercredi', 'Vendredi'] },
  { q: 'Plus on m’enlève de morceaux, plus je deviens grand. Qui suis-je ?', a: 'Un trou', o: ['Un trou', 'Un ballon', 'Une ombre'] },
];
const SCIENCE = [
  { q: 'Quelle est la plus grosse planète du système solaire ?', a: 'Jupiter', o: ['Jupiter', 'La Terre', 'Mars'] },
  { q: 'Combien de planètes tournent autour du Soleil ?', a: '8', o: ['8', '9', '12'] },
  { q: 'Quelle planète a les plus grands anneaux ?', a: 'Saturne', o: ['Saturne', 'Vénus', 'Mercure'] },
  { q: 'Sur la Lune, tu pèserais…', a: '6 fois moins lourd', o: ['6 fois moins lourd', 'Pareil', '2 fois plus lourd'] },
  { q: 'Combien de temps met la lumière du Soleil pour arriver sur la Terre ?', a: 'Environ 8 minutes', o: ['Environ 8 minutes', '1 seconde', '1 jour'] },
  { q: 'Quelle est l’étoile la plus proche de la Terre ?', a: 'Le Soleil', o: ['Le Soleil', 'La Lune', 'L’étoile Polaire'] },
];
const SEQS = [{ s: '2, 4, 8, 16, …', a: '32', o: ['32', '24', '20'] }, { s: '1, 4, 9, 16, …', a: '25', o: ['25', '20', '32'] }, { s: '1, 1, 2, 3, 5, 8, …', a: '13', o: ['13', '11', '16'] }, { s: '3, 7, 11, 15, …', a: '19', o: ['19', '18', '21'] }, { s: '100, 50, 25, …', a: '12,5', o: ['12,5', '0', '20'] }];

const shift = (w) => w.split('').map((c) => (c === 'Z' ? 'A' : String.fromCharCode(c.charCodeAt(0) + 1))).join('');

export function challenge(age) {
  if (age === 'p') {
    const kind = pick(['col', 'count', 'shape']);
    if (kind === 'col') { const names = shuffle(Object.keys(COLORS)).slice(0, 4), t = pick(names);
      return { voice: ['col', `col_${t}`], text: '', big: true, options: names.map((n) => ({ html: `<i class="dot" style="background:${COLORS[n]}"></i>`, ok: n === t })) }; }
    if (kind === 'count') { const n = 1 + Math.floor(Math.random() * 5), opts = shuffle([...new Set([n, Math.max(1, n - 1), Math.min(6, n + 1), n === 1 ? 3 : 1])]).slice(0, 3); if (!opts.includes(n)) opts[0] = n;
      return { voice: ['count'], text: `<div class="stars">${'⭐'.repeat(n)}</div>`, big: true, options: shuffle(opts).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === n })) }; }
    const names = shuffle(Object.keys(SHAPES)), t = pick(names);
    return { voice: ['shape', `shape_${t}`], text: '', big: true, options: names.map((n) => ({ html: `<i class="shape">${SHAPES[n]}</i>`, ok: n === t })) };
  }
  if (age === 'm') {
    const kind = pick(['add', 'next', 'word']);
    if (kind === 'add') { const a = 2 + Math.floor(Math.random() * 8), b = 1 + Math.floor(Math.random() * 9), r = a + b;
      return { voice: ['add'], text: `<p class="big">${a} + ${b} = ?</p>`, options: shuffle([r, r + 1, r - 2]).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === r })) }; }
    if (kind === 'next') { const p = fresh('p', PATTERNS), seq = [...p, ...p, ...p].slice(0, p.length * 2 + 1), ans = p[seq.length % p.length], others = [...new Set([...p.filter((x) => x !== ans), ...shuffle([...new Set(PATTERNS.flat())].filter((x) => !p.includes(x)))])].slice(0, 2); // the motif's other piece is the tempting wrong answer
      return { voice: ['next'], text: `<p class="row">${seq.join(' ')} <span class="q">?</span></p>`, options: shuffle([ans, ...others]).map((x) => ({ html: `<b class="emo">${x}</b>`, ok: x === ans })) }; }
    const w = fresh('w', WORDS), others = shuffle(WORDS.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['word'], text: `<p class="big word">${w[0]}</p>`, options: shuffle([w, ...others]).map((x) => ({ html: `<b class="emo">${x[1]}</b>`, ok: x === w })) };
  }
  const kind = pick(['cipher', 'riddle', 'science', 'seq']);
  if (kind === 'cipher') { const w = fresh('c', CODE), others = shuffle(CODE.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['cipher'], text: `<p class="code">${shift(w)}</p><p class="small">A→B, B→C, C→D… Recule chaque lettre d’un cran.</p>`, options: shuffle([w, ...others]).map((x) => ({ html: x, ok: x === w })) }; }
  if (kind === 'riddle') { const r = fresh('r', RIDDLES); return { voice: ['riddle'], text: `<p>${r.q}</p>`, options: shuffle(r.o).map((x) => ({ html: x, ok: x === r.a })) }; }
  if (kind === 'science') { const r = fresh('s', SCIENCE); return { voice: ['science'], text: `<p>${r.q}</p>`, options: shuffle(r.o).map((x) => ({ html: x, ok: x === r.a })) }; }
  const s = fresh('q', SEQS); return { voice: ['seq'], text: `<p class="big">${s.s}</p>`, options: shuffle(s.o).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === s.a })) };
}

// where the parent can hide a card: a picture for the little ones, a riddle for everyone
export const SPOTS = [
  ['canape', '🛋️', 'Le canapé'], ['frigo', '🧊', 'Le frigo'], ['lit', '🛏️', 'Le lit'], ['table', '🍽️', 'La table'], ['livres', '📚', 'Les livres'], ['bain', '🛁', 'La salle de bain'],
  ['porte', '🚪', 'La porte d’entrée'], ['coussin', '🛌', 'Sous un coussin'], ['plante', '🪴', 'Une plante'], ['jouets', '🧸', 'Les jouets'], ['chaussures', '👟', 'Les chaussures'],
];
