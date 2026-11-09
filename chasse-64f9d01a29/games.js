// La Grande Chasse: the challenges, one per player at each card, matched to age.
//   p = 3 to 5 (no reading: colours, counting, shapes, all said aloud), m = 6 to 8 (adding, patterns, reading a
//   word), g = 9 to 12 (a coded message, riddles, astronaut questions, number sequences).
// A challenge: { voice: [line ids], text, options: [{ html, ok }], big }. Pictures are illustrated icons (img/ic).
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const used = new Set();
const fresh = (key, list) => { const left = list.filter((x) => !used.has(key + JSON.stringify(x))); const x = pick(left.length ? left : list); used.add(key + JSON.stringify(x)); return x; };

export const ic = (name, cls = '') => `<img class="ic ${cls}" src="img/ic/${name}.webp" alt="" draggable="false">`;
const BALLS = { rouge: '#e8364a', bleu: '#2a7de1', jaune: '#ffc928', vert: '#2dbb5d', violet: '#9a4ee0' };
const ball = (c) => `<i class="ball" style="--b:${BALLS[c]}"></i>`;
const pic = (x) => (x.startsWith('ball:') ? ball(x.slice(5)) : ic(x));
const SHAPES = {
  rond: '<circle cx="50" cy="50" r="40"/>',
  carre: '<rect x="12" y="12" width="76" height="76" rx="10"/>',
  triangle: '<path d="M50 9 Q54 9 56 13 L91 82 Q93 88 86 88 L14 88 Q7 88 9 82 L44 13 Q46 9 50 9 Z"/>',
  etoile: '<path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38 Z" stroke-linejoin="round" stroke-width="6" stroke="url(#sg)"/>',
};
const shape = (n) => `<svg class="shape" viewBox="0 0 100 100"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb259"/><stop offset="1" stop-color="#ff6f3c"/></linearGradient></defs><g fill="url(#sg)">${SHAPES[n]}</g></svg>`;
const WORDS = [['CHAT', 'cat'], ['LUNE', 'moon'], ['FUSÉE', 'rocket'], ['SOLEIL', 'sun'], ['POMME', 'apple'], ['ÉTOILE', 'star'], ['POISSON', 'fish'], ['ARBRE', 'tree'], ['GÂTEAU', 'cake'], ['VÉLO', 'bike'], ['CHIEN', 'dog'], ['LAPIN', 'rabbit']];
const PATTERNS = [['ball:rouge', 'ball:bleu'], ['moon', 'star', 'star'], ['cat', 'dog', 'rabbit'], ['apple', 'apple', 'banana'], ['ball:vert', 'ball:jaune', 'ball:violet'], ['sun', 'moon']];
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
    if (kind === 'col') { const names = shuffle(Object.keys(BALLS)).slice(0, 4), t = pick(names);
      return { voice: ['col', `col_${t}`], text: '', big: true, options: names.map((n) => ({ html: ball(n), ok: n === t })) }; }
    if (kind === 'count') { const n = 1 + Math.floor(Math.random() * 5), opts = shuffle([...new Set([n, Math.max(1, n - 1), Math.min(6, n + 1), n === 1 ? 3 : 1])]).slice(0, 3); if (!opts.includes(n)) opts[0] = n;
      return { voice: ['count'], text: `<div class="stars">${ic('star', 'twk').repeat(n)}</div>`, big: true, options: shuffle(opts).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === n })) }; }
    const names = shuffle(Object.keys(SHAPES)), t = pick(names);
    return { voice: ['shape', `shape_${t}`], text: '', big: true, options: names.map((n) => ({ html: shape(n), ok: n === t })) };
  }
  if (age === 'm') {
    const kind = pick(['add', 'next', 'word']);
    if (kind === 'add') { const a = 2 + Math.floor(Math.random() * 8), b = 1 + Math.floor(Math.random() * 9), r = a + b;
      return { voice: ['add'], text: `<p class="huge">${a} + ${b} = <span class="qm">?</span></p>`, options: shuffle([r, r + 1, r - 2]).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === r })) }; }
    if (kind === 'next') { const p = fresh('p', PATTERNS), seq = [...p, ...p, ...p].slice(0, p.length * 2 + 1), ans = p[seq.length % p.length];
      const others = [...new Set([...p.filter((x) => x !== ans), ...shuffle([...new Set(PATTERNS.flat())].filter((x) => !p.includes(x)))])].slice(0, 2); // the motif's other piece is the tempting wrong answer
      return { voice: ['next'], text: `<div class="row">${seq.map(pic).join('')}<span class="slot">?</span></div>`, options: shuffle([ans, ...others]).map((x) => ({ html: pic(x), ok: x === ans })) }; }
    const w = fresh('w', WORDS), others = shuffle(WORDS.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['word'], text: `<p class="huge word">${w[0]}</p>`, options: shuffle([w, ...others]).map((x) => ({ html: ic(x[1]), ok: x === w })) };
  }
  const kind = pick(['cipher', 'riddle', 'science', 'seq']);
  if (kind === 'cipher') { const w = fresh('c', CODE), others = shuffle(CODE.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['cipher'], text: `<p class="code">${shift(w).split('').map((c) => `<span>${c}</span>`).join('')}</p><p class="small">A → B, B → C… Recule chaque lettre d’un cran.</p>`, options: shuffle([w, ...others]).map((x) => ({ html: x, ok: x === w })) }; }
  if (kind === 'riddle') { const r = fresh('r', RIDDLES); return { voice: ['riddle'], text: `<p class="q">${r.q}</p>`, options: shuffle(r.o).map((x) => ({ html: x, ok: x === r.a })) }; }
  if (kind === 'science') { const r = fresh('s', SCIENCE); return { voice: ['science'], text: `<p class="q">${r.q}</p>`, options: shuffle(r.o).map((x) => ({ html: x, ok: x === r.a })) }; }
  const s = fresh('q', SEQS); return { voice: ['seq'], text: `<p class="huge">${s.s}</p>`, options: shuffle(s.o).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === s.a })) };
}

// where the parent can hide a card: an illustrated picture for the little ones, a riddle for everyone
export const SPOTS = [
  ['canape', 'Le canapé'], ['frigo', 'Le frigo'], ['lit', 'Le lit'], ['table', 'La table'], ['livres', 'Les livres'], ['bain', 'La salle de bain'],
  ['porte', 'La porte d’entrée'], ['coussin', 'Sous un coussin'], ['plante', 'Une plante'], ['jouets', 'Les jouets'], ['chaussures', 'Les chaussures'],
];
export const AVATARS = [['fox', 'Renard'], ['panda', 'Panda'], ['lion', 'Lion'], ['bunny', 'Lapin'], ['owl', 'Hibou'], ['turtle', 'Tortue']];
