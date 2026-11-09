// La Grande Chasse: the quiz challenges, matched to age. Most are generated (sums, counts, sequences, codes), the
// rest come from large banks, and what was asked is remembered on this device so the next hunts ask new things.
//   p = 3 to 5 (no reading, all said aloud), m = 6 to 8, g = 9 to 12, a = adults.
// A challenge: { voice: [line ids], text, options: [{ html, ok }], big }. Pictures are illustrated icons (img/ic).
import { EN, t as tr } from './i18n.js';
const R = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[R(a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SEEN_KEY = 'grande-chasse-vus';
let seen = new Set(); try { seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch {}
const remember = (k) => { seen.add(k); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-600))); } catch {} };
// a bank item not asked yet on this device (when all were asked, start the bank again)
function fresh(bank, list) {
  if (EN) bank = 'en.' + bank;
  let left = list.filter((x, i) => !seen.has(bank + i));
  if (!left.length) { for (let i = 0; i < list.length; i++) seen.delete(bank + i); left = list; }
  const x = pick(left); remember(bank + list.indexOf(x)); return x;
}

export const ic = (name, cls = '', style = '') => `<img class="ic ${cls}" src="img/ic/${name}.webp" alt="" draggable="false" style="${style}">`;
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
const ANIMALS = ['cat', 'dog', 'rabbit', 'fish'], FOOD = ['apple', 'banana', 'cake'], SKY = ['sun', 'moon', 'star', 'rocket'], HOME = ['canape', 'lit', 'frigo', 'table', 'porte', 'bain', 'coussin', 'plante', 'livres', 'jouets', 'chaussures'];
const ALLPICS = [...ANIMALS, ...FOOD, ...SKY, 'tree', 'bike', ...HOME];
const WORDS_FR = [['CHAT', 'cat'], ['LUNE', 'moon'], ['FUSÉE', 'rocket'], ['SOLEIL', 'sun'], ['POMME', 'apple'], ['ÉTOILE', 'star'], ['POISSON', 'fish'], ['ARBRE', 'tree'], ['GÂTEAU', 'cake'], ['VÉLO', 'bike'], ['CHIEN', 'dog'], ['LAPIN', 'rabbit'],
  ['BANANE', 'banana'], ['LIT', 'lit'], ['PORTE', 'porte'], ['PLANTE', 'plante'], ['LIVRES', 'livres'], ['FRIGO', 'frigo'], ['TABLE', 'table'], ['BAIN', 'bain'], ['COUSSIN', 'coussin'], ['CANAPÉ', 'canape'], ['JOUETS', 'jouets'], ['BASKETS', 'chaussures']];
const PATTERNS = [['ball:rouge', 'ball:bleu'], ['moon', 'star', 'star'], ['cat', 'dog', 'rabbit'], ['apple', 'apple', 'banana'], ['ball:vert', 'ball:jaune', 'ball:violet'], ['sun', 'moon'], ['fish', 'fish', 'cat'], ['rocket', 'star'], ['tree', 'apple', 'apple'], ['ball:jaune', 'ball:jaune', 'ball:rouge'], ['dog', 'bike'], ['cake', 'star', 'moon']];
const CODE_FR = ['LUNE', 'FUSEE', 'ROBOT', 'PLANETE', 'COMETE', 'ETOILE', 'GALAXIE', 'SATURNE', 'JUPITER', 'NEPTUNE', 'SOLEIL', 'ORBITE', 'ASTRONAUTE', 'METEORE', 'TELESCOPE', 'MARTIEN', 'CRATERE', 'NEBULEUSE', 'URANUS', 'MERCURE'];
const SPACEWORDS_FR = ['FUSEE', 'PLANETE', 'COMETE', 'ETOILE', 'GALAXIE', 'SATURNE', 'ORBITE', 'METEORE', 'CRATERE', 'SOLEIL', 'ESPACE', 'CASQUE', 'MOTEUR', 'ANTENNE', 'VAISSEAU', 'PILOTE'];

const RIDDLES_FR = [
  { q: 'Pixo a 3 sœurs. Chaque sœur a 1 seul frère. Combien d’enfants y a-t-il dans sa famille ?', a: '4', o: ['4', '6', '7'] },
  { q: 'Un escargot grimpe un mur de 5 mètres. Le jour il monte de 3 mètres, la nuit il glisse de 2 mètres. En combien de jours arrive-t-il en haut ?', a: '3 jours', o: ['3 jours', '5 jours', '2 jours'] },
  { q: 'Qu’est-ce qui est le plus lourd : un kilo de plumes ou un kilo de pierres ?', a: 'Pareil', o: ['Pareil', 'Les pierres', 'Les plumes'] },
  { q: 'Si hier était lundi, quel jour sera après-demain ?', a: 'Jeudi', o: ['Jeudi', 'Mercredi', 'Vendredi'] },
  { q: 'Plus on m’enlève de morceaux, plus je deviens grand. Qui suis-je ?', a: 'Un trou', o: ['Un trou', 'Un ballon', 'Une ombre'] },
  { q: 'Je te suis partout quand il y a du soleil, mais je disparais la nuit. Qui suis-je ?', a: 'Ton ombre', o: ['Ton ombre', 'Ton chat', 'La Lune'] },
  { q: 'Qu’est-ce qui monte et qui descend sans jamais bouger ?', a: 'Un escalier', o: ['Un escalier', 'Un ascenseur', 'Une balle'] },
  { q: 'J’ai des aiguilles mais je ne pique pas. Qui suis-je ?', a: 'Une horloge', o: ['Une horloge', 'Un hérisson', 'Un sapin'] },
  { q: 'Dans une course, tu doubles le deuxième. Tu es à quelle place ?', a: 'Deuxième', o: ['Deuxième', 'Premier', 'Troisième'] },
  { q: 'Combien de mois ont 28 jours ?', a: 'Tous', o: ['Tous', 'Un seul', 'Deux'] },
  { q: 'Qu’est-ce qui a des dents mais ne mange jamais ?', a: 'Un peigne', o: ['Un peigne', 'Un requin', 'Une fourchette'] },
  { q: 'Plus il sèche, plus il est mouillé. Qui est-il ?', a: 'Une serviette', o: ['Une serviette', 'Le soleil', 'Un parapluie'] },
  { q: 'Qu’est-ce qui est à toi, mais que les autres utilisent plus que toi ?', a: 'Ton prénom', o: ['Ton prénom', 'Ta brosse à dents', 'Ton vélo'] },
  { q: 'Un avion s’écrase pile sur la frontière entre deux pays. Où enterre-t-on les survivants ?', a: 'Nulle part', o: ['Nulle part', 'Dans le premier pays', 'Dans le second pays'] },
  { q: 'Une maman a 5 enfants. La moitié sont des garçons. Est-ce possible ?', a: 'Non, c’est impossible', o: ['Non, c’est impossible', 'Oui, bien sûr', 'Seulement avec des jumeaux'] },
];
const SCIENCE_FR = [
  { q: 'Quelle est la plus grosse planète du système solaire ?', a: 'Jupiter', o: ['Jupiter', 'La Terre', 'Mars'] },
  { q: 'Combien de planètes tournent autour du Soleil ?', a: '8', o: ['8', '9', '12'] },
  { q: 'Quelle planète a les anneaux les plus visibles ?', a: 'Saturne', o: ['Saturne', 'Vénus', 'Mercure'] },
  { q: 'Sur la Lune, tu pèserais…', a: '6 fois moins lourd', o: ['6 fois moins lourd', 'Pareil', '2 fois plus lourd'] },
  { q: 'Combien de temps met la lumière du Soleil pour arriver sur la Terre ?', a: 'Environ 8 minutes', o: ['Environ 8 minutes', '1 seconde', '1 jour'] },
  { q: 'Quelle est l’étoile la plus proche de la Terre ?', a: 'Le Soleil', o: ['Le Soleil', 'La Lune', 'L’étoile Polaire'] },
  { q: 'Quelle planète surnomme-t-on la planète rouge ?', a: 'Mars', o: ['Mars', 'Jupiter', 'Neptune'] },
  { q: 'Quelle planète est la plus proche du Soleil ?', a: 'Mercure', o: ['Mercure', 'Vénus', 'La Terre'] },
  { q: 'Quelle est la planète la plus chaude ?', a: 'Vénus', o: ['Vénus', 'Mercure', 'Mars'] },
  { q: 'Combien de temps met la Terre pour faire le tour du Soleil ?', a: 'Un an', o: ['Un an', 'Un jour', 'Un mois'] },
  { q: 'Combien de temps met la Terre pour tourner sur elle-même ?', a: 'Un jour', o: ['Un jour', 'Une semaine', 'Un an'] },
  { q: 'Qui a marché le premier sur la Lune, en 1969 ?', a: 'Neil Armstrong', o: ['Neil Armstrong', 'Thomas Pesquet', 'Christophe Colomb'] },
  { q: 'Comment s’appelle notre galaxie ?', a: 'La Voie lactée', o: ['La Voie lactée', 'Andromède', 'La Grande Ourse'] },
  { q: 'Quelle planète a une grande tache rouge, une tempête géante ?', a: 'Jupiter', o: ['Jupiter', 'Mars', 'Uranus'] },
  { q: 'À quelle température l’eau bout-elle au niveau de la mer ?', a: '100 °C', o: ['100 °C', '50 °C', '200 °C'] },
  { q: 'Quel est le plus grand animal du monde ?', a: 'La baleine bleue', o: ['La baleine bleue', 'L’éléphant', 'Le requin blanc'] },
  { q: 'Combien de pattes a une araignée ?', a: '8', o: ['8', '6', '10'] },
  { q: 'Quel est le plus grand océan ?', a: 'Le Pacifique', o: ['Le Pacifique', 'L’Atlantique', 'L’océan Indien'] },
  { q: 'Quelle est la plus haute montagne du monde ?', a: 'L’Everest', o: ['L’Everest', 'Le mont Blanc', 'Le Kilimandjaro'] },
  { q: 'Quel gaz les plantes absorbent-elles pour grandir ?', a: 'Le dioxyde de carbone', o: ['Le dioxyde de carbone', 'L’hélium', 'Le néon'] },
  { q: 'Combien de jours y a-t-il dans une année bissextile ?', a: '366', o: ['366', '365', '364'] },
  { q: 'Combien de côtés a un hexagone ?', a: '6', o: ['6', '5', '8'] },
  { q: 'Quel est le satellite naturel de la Terre ?', a: 'La Lune', o: ['La Lune', 'Mars', 'Le Soleil'] },
  { q: 'Combien d’os a le corps d’un adulte ?', a: '206', o: ['206', '52', '1000'] },
  { q: 'Que fabrique une abeille ?', a: 'Du miel', o: ['Du miel', 'Du lait', 'De la soie'] },
];
const TRUEFALSE_FR = [
  ['Le Soleil est une étoile.', true], ['La Lune produit sa propre lumière.', false], ['Il n’y a pas d’air pour respirer dans l’espace.', true], ['Mars est plus grosse que la Terre.', false],
  ['Les astronautes flottent dans la station spatiale.', true], ['Jupiter est faite surtout de roche.', false], ['Une baleine est un mammifère.', true], ['Les araignées sont des insectes.', false],
  ['La Terre est ronde.', true], ['Les plantes ont besoin de lumière pour vivre.', true], ['Le son voyage dans le vide de l’espace.', false], ['Saturne flotterait dans une baignoire géante remplie d’eau.', true],
  ['Un jour sur Vénus dure plus longtemps qu’une année sur Vénus.', true], ['Les étoiles filantes sont des étoiles qui tombent.', false], ['La glace prend plus de place que l’eau liquide.', true], ['Le cœur a quatre cavités.', true],
];
const ADULT_FR = [
  { q: 'Combien de temps met la lumière de la Lune pour nous parvenir ?', a: 'Environ 1 seconde', o: ['Environ 1 seconde', 'Environ 8 minutes', 'Environ 1 heure'] },
  { q: 'Quelle planète tourne sur elle-même dans le sens inverse des autres ?', a: 'Vénus', o: ['Vénus', 'Mars', 'Neptune'] },
  { q: 'Quel est l’objet fabriqué par l’humain le plus lointain ?', a: 'La sonde Voyager 1', o: ['La sonde Voyager 1', 'Le télescope Hubble', 'La station spatiale'] },
  { q: 'Quel est l’élément le plus abondant de l’Univers ?', a: 'L’hydrogène', o: ['L’hydrogène', 'L’oxygène', 'Le carbone'] },
  { q: 'Combien de jours dure une année sur Mars, environ ?', a: '687 jours', o: ['687 jours', '365 jours', '88 jours'] },
  { q: 'Quel est le plus grand volcan connu du système solaire ?', a: 'Olympus Mons', o: ['Olympus Mons', 'L’Etna', 'Le Mauna Kea'] },
  { q: 'Quelle est la grande galaxie voisine de la nôtre ?', a: 'Andromède', o: ['Andromède', 'Orion', 'Le Centaure'] },
  { q: 'Qui fut la première femme dans l’espace, en 1963 ?', a: 'Valentina Terechkova', o: ['Valentina Terechkova', 'Sally Ride', 'Claudie Haigneré'] },
  { q: 'Quelle planète est moins dense que l’eau ?', a: 'Saturne', o: ['Saturne', 'Jupiter', 'Mercure'] },
  { q: 'Combien de cœurs a une pieuvre ?', a: '3', o: ['3', '1', '2'] },
  { q: 'Quel est le plus petit os du corps humain ?', a: 'L’étrier, dans l’oreille', o: ['L’étrier, dans l’oreille', 'Une phalange du petit orteil', 'Le coccyx'] },
  { q: 'Quel métal est liquide à température ambiante ?', a: 'Le mercure', o: ['Le mercure', 'L’aluminium', 'Le plomb'] },
  { q: 'Quelle est, environ, la vitesse de la lumière ?', a: '300 000 km par seconde', o: ['300 000 km par seconde', '3 000 km par seconde', '300 km par seconde'] },
  { q: 'En combien de temps la station spatiale fait-elle le tour de la Terre ?', a: 'Environ 90 minutes', o: ['Environ 90 minutes', 'Environ 24 heures', 'Environ une semaine'] },
  { q: 'Quel pays a lancé Spoutnik, le premier satellite, en 1957 ?', a: 'L’URSS', o: ['L’URSS', 'Les États-Unis', 'La France'] },
  { q: 'Combien de chromosomes possède un être humain ?', a: '46', o: ['46', '23', '64'] },
  { q: 'Quel animal microscopique peut survivre dans le vide spatial ?', a: 'Le tardigrade', o: ['Le tardigrade', 'La fourmi', 'Le cafard'] },
  { q: 'Quelle est la plus grande lune du système solaire ?', a: 'Ganymède', o: ['Ganymède', 'La Lune', 'Titan'] },
  { q: 'En quelle année Pluton a-t-elle perdu son statut de planète ?', a: '2006', o: ['2006', '1992', '2015'] },
  { q: 'Quelle est l’étoile la plus brillante du ciel nocturne ?', a: 'Sirius', o: ['Sirius', 'L’étoile Polaire', 'Bételgeuse'] },
  { q: 'Un fermier a 17 moutons. Tous sauf 9 s’enfuient. Combien en reste-t-il ?', a: '9', o: ['9', '8', '0'] },
  { q: 'Une batte et une balle coûtent 1,10 € en tout. La batte coûte 1 € de plus que la balle. Combien coûte la balle ?', a: '5 centimes', o: ['5 centimes', '10 centimes', '1 centime'] },
  { q: '5 machines font 5 objets en 5 minutes. Combien de temps faut-il à 100 machines pour faire 100 objets ?', a: '5 minutes', o: ['5 minutes', '100 minutes', '20 minutes'] },
  { q: 'Des nénuphars doublent chaque jour et couvrent le lac en 48 jours. En combien de jours en couvrent-ils la moitié ?', a: '47 jours', o: ['47 jours', '24 jours', '36 jours'] },
  { q: 'Le père de Marie a 5 filles : Nana, Nene, Nini, Nono. Comment s’appelle la cinquième ?', a: 'Marie', o: ['Marie', 'Nunu', 'Nyny'] },
  { q: 'Qu’est-ce qui a des touches mais n’ouvre aucune porte ?', a: 'Un piano', o: ['Un piano', 'Un trousseau', 'Une serrure'] },
  { q: 'Quelle planète a les vents les plus rapides du système solaire ?', a: 'Neptune', o: ['Neptune', 'La Terre', 'Mercure'] },
  { q: 'Combien de planètes naines l’Union astronomique internationale reconnaît-elle ?', a: '5', o: ['5', '1', '12'] },
];

// ---- the same banks in English (written for English speakers, not word for word)
const WORDS_EN = [['CAT', 'cat'], ['MOON', 'moon'], ['ROCKET', 'rocket'], ['SUN', 'sun'], ['APPLE', 'apple'], ['STAR', 'star'], ['FISH', 'fish'], ['TREE', 'tree'], ['CAKE', 'cake'], ['BIKE', 'bike'], ['DOG', 'dog'], ['RABBIT', 'rabbit'],
  ['BANANA', 'banana'], ['BED', 'lit'], ['DOOR', 'porte'], ['PLANT', 'plante'], ['BOOKS', 'livres'], ['FRIDGE', 'frigo'], ['TABLE', 'table'], ['BATH', 'bain'], ['PILLOW', 'coussin'], ['SOFA', 'canape'], ['TOYS', 'jouets'], ['SHOES', 'chaussures']];
const CODE_EN = ['MOON', 'ROCKET', 'ROBOT', 'PLANET', 'COMET', 'STAR', 'GALAXY', 'SATURN', 'JUPITER', 'NEPTUNE', 'ORBIT', 'ASTRONAUT', 'METEOR', 'TELESCOPE', 'MARTIAN', 'CRATER', 'NEBULA', 'URANUS', 'MERCURY', 'SPACESHIP'];
const SPACEWORDS_EN = ['ROCKET', 'PLANET', 'COMET', 'GALAXY', 'SATURN', 'ORBIT', 'METEOR', 'CRATER', 'ENGINE', 'HELMET', 'ANTENNA', 'PILOT', 'SPACE', 'ALIEN', 'LAUNCH', 'MOON'];
const RIDDLES_EN = [
  { q: 'Pixo has 3 sisters. Each sister has just 1 brother. How many children are in his family?', a: '4', o: ['4', '6', '7'] },
  { q: 'A snail climbs a 5 metre wall. By day it goes up 3 metres, at night it slides down 2. How many days until it reaches the top?', a: '3 days', o: ['3 days', '5 days', '2 days'] },
  { q: 'Which is heavier: a kilo of feathers or a kilo of stones?', a: 'The same', o: ['The same', 'The stones', 'The feathers'] },
  { q: 'If yesterday was Monday, what day will it be the day after tomorrow?', a: 'Thursday', o: ['Thursday', 'Wednesday', 'Friday'] },
  { q: 'The more you take away from me, the bigger I get. What am I?', a: 'A hole', o: ['A hole', 'A balloon', 'A shadow'] },
  { q: 'I follow you everywhere when the sun shines, but I vanish at night. What am I?', a: 'Your shadow', o: ['Your shadow', 'Your cat', 'The Moon'] },
  { q: 'What goes up and down but never moves?', a: 'The stairs', o: ['The stairs', 'A lift', 'A ball'] },
  { q: 'What has hands but cannot clap?', a: 'A clock', o: ['A clock', 'A monkey', 'A glove'] },
  { q: 'In a race, you overtake the person in second place. What place are you in now?', a: 'Second', o: ['Second', 'First', 'Third'] },
  { q: 'How many months have 28 days?', a: 'All of them', o: ['All of them', 'Just one', 'Two'] },
  { q: 'What has teeth but never eats?', a: 'A comb', o: ['A comb', 'A shark', 'A fork'] },
  { q: 'What gets wetter the more it dries?', a: 'A towel', o: ['A towel', 'The sun', 'An umbrella'] },
  { q: 'What belongs to you, but other people use it more than you do?', a: 'Your name', o: ['Your name', 'Your toothbrush', 'Your bike'] },
  { q: 'A plane crashes exactly on the border between two countries. Where do they bury the survivors?', a: 'Nowhere', o: ['Nowhere', 'In the first country', 'In the second country'] },
  { q: 'A mum has 5 children. Half of them are boys. Is that possible?', a: 'No, it’s impossible', o: ['No, it’s impossible', 'Yes, of course', 'Only with twins'] },
];
const SCIENCE_EN = [
  { q: 'What is the biggest planet in the Solar System?', a: 'Jupiter', o: ['Jupiter', 'Earth', 'Mars'] },
  { q: 'How many planets go around the Sun?', a: '8', o: ['8', '9', '12'] },
  { q: 'Which planet has the easiest rings to see?', a: 'Saturn', o: ['Saturn', 'Venus', 'Mercury'] },
  { q: 'On the Moon, you would weigh…', a: '6 times less', o: ['6 times less', 'The same', '2 times more'] },
  { q: 'How long does sunlight take to reach the Earth?', a: 'About 8 minutes', o: ['About 8 minutes', '1 second', '1 day'] },
  { q: 'What is the closest star to the Earth?', a: 'The Sun', o: ['The Sun', 'The Moon', 'The North Star'] },
  { q: 'Which planet is called the Red Planet?', a: 'Mars', o: ['Mars', 'Jupiter', 'Neptune'] },
  { q: 'Which planet is closest to the Sun?', a: 'Mercury', o: ['Mercury', 'Venus', 'Earth'] },
  { q: 'Which is the hottest planet?', a: 'Venus', o: ['Venus', 'Mercury', 'Mars'] },
  { q: 'How long does the Earth take to go once around the Sun?', a: 'A year', o: ['A year', 'A day', 'A month'] },
  { q: 'How long does the Earth take to spin around once?', a: 'A day', o: ['A day', 'A week', 'A year'] },
  { q: 'Who was the first person to walk on the Moon, in 1969?', a: 'Neil Armstrong', o: ['Neil Armstrong', 'Yuri Gagarin', 'Christopher Columbus'] },
  { q: 'What is our galaxy called?', a: 'The Milky Way', o: ['The Milky Way', 'Andromeda', 'The Great Bear'] },
  { q: 'Which planet has a Great Red Spot, a giant storm?', a: 'Jupiter', o: ['Jupiter', 'Mars', 'Uranus'] },
  { q: 'At what temperature does water boil at sea level?', a: '100 °C', o: ['100 °C', '50 °C', '200 °C'] },
  { q: 'What is the biggest animal in the world?', a: 'The blue whale', o: ['The blue whale', 'The elephant', 'The great white shark'] },
  { q: 'How many legs does a spider have?', a: '8', o: ['8', '6', '10'] },
  { q: 'What is the biggest ocean?', a: 'The Pacific', o: ['The Pacific', 'The Atlantic', 'The Indian Ocean'] },
  { q: 'What is the highest mountain in the world?', a: 'Mount Everest', o: ['Mount Everest', 'Mont Blanc', 'Kilimanjaro'] },
  { q: 'Which gas do plants take in to grow?', a: 'Carbon dioxide', o: ['Carbon dioxide', 'Helium', 'Neon'] },
  { q: 'How many days are there in a leap year?', a: '366', o: ['366', '365', '364'] },
  { q: 'How many sides does a hexagon have?', a: '6', o: ['6', '5', '8'] },
  { q: 'What is the Earth’s natural satellite?', a: 'The Moon', o: ['The Moon', 'Mars', 'The Sun'] },
  { q: 'How many bones are in an adult’s body?', a: '206', o: ['206', '52', '1000'] },
  { q: 'What does a bee make?', a: 'Honey', o: ['Honey', 'Milk', 'Silk'] },
];
const TRUEFALSE_EN = [
  ['The Sun is a star.', true], ['The Moon makes its own light.', false], ['There is no air to breathe in space.', true], ['Mars is bigger than the Earth.', false],
  ['Astronauts float inside the space station.', true], ['Jupiter is made mostly of rock.', false], ['A whale is a mammal.', true], ['Spiders are insects.', false],
  ['The Earth is round.', true], ['Plants need light to live.', true], ['Sound travels through empty space.', false], ['Saturn would float in a giant bath full of water.', true],
  ['A day on Venus lasts longer than a year on Venus.', true], ['Shooting stars are stars that fall.', false], ['Ice takes up more room than liquid water.', true], ['The heart has four chambers.', true],
];
const ADULT_EN = [
  { q: 'How long does moonlight take to reach us?', a: 'About 1 second', o: ['About 1 second', 'About 8 minutes', 'About 1 hour'] },
  { q: 'Which planet spins the opposite way to the others?', a: 'Venus', o: ['Venus', 'Mars', 'Neptune'] },
  { q: 'What is the most distant object ever made by humans?', a: 'The Voyager 1 probe', o: ['The Voyager 1 probe', 'The Hubble telescope', 'The space station'] },
  { q: 'What is the most abundant element in the Universe?', a: 'Hydrogen', o: ['Hydrogen', 'Oxygen', 'Carbon'] },
  { q: 'Roughly how many days is a year on Mars?', a: '687 days', o: ['687 days', '365 days', '88 days'] },
  { q: 'What is the largest known volcano in the Solar System?', a: 'Olympus Mons', o: ['Olympus Mons', 'Etna', 'Mauna Kea'] },
  { q: 'What is the big galaxy next door to ours?', a: 'Andromeda', o: ['Andromeda', 'Orion', 'Centaurus'] },
  { q: 'Who was the first woman in space, in 1963?', a: 'Valentina Tereshkova', o: ['Valentina Tereshkova', 'Sally Ride', 'Mae Jemison'] },
  { q: 'Which planet is less dense than water?', a: 'Saturn', o: ['Saturn', 'Jupiter', 'Mercury'] },
  { q: 'How many hearts does an octopus have?', a: '3', o: ['3', '1', '2'] },
  { q: 'What is the smallest bone in the human body?', a: 'The stirrup, in the ear', o: ['The stirrup, in the ear', 'A bone in the little toe', 'The tailbone'] },
  { q: 'Which metal is liquid at room temperature?', a: 'Mercury', o: ['Mercury', 'Aluminium', 'Lead'] },
  { q: 'Roughly how fast does light travel?', a: '300,000 km a second', o: ['300,000 km a second', '3,000 km a second', '300 km a second'] },
  { q: 'How long does the space station take to go around the Earth?', a: 'About 90 minutes', o: ['About 90 minutes', 'About 24 hours', 'About a week'] },
  { q: 'Which country launched Sputnik, the first satellite, in 1957?', a: 'The USSR', o: ['The USSR', 'The United States', 'The United Kingdom'] },
  { q: 'How many chromosomes does a human being have?', a: '46', o: ['46', '23', '64'] },
  { q: 'Which tiny animal can survive in the vacuum of space?', a: 'The tardigrade', o: ['The tardigrade', 'The ant', 'The cockroach'] },
  { q: 'What is the largest moon in the Solar System?', a: 'Ganymede', o: ['Ganymede', 'Our Moon', 'Titan'] },
  { q: 'In what year did Pluto lose its planet status?', a: '2006', o: ['2006', '1992', '2015'] },
  { q: 'What is the brightest star in the night sky?', a: 'Sirius', o: ['Sirius', 'The North Star', 'Betelgeuse'] },
  { q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', a: '9', o: ['9', '8', '0'] },
  { q: 'A bat and a ball cost $1.10 in total. The bat costs $1 more than the ball. How much is the ball?', a: '5 cents', o: ['5 cents', '10 cents', '1 cent'] },
  { q: '5 machines make 5 widgets in 5 minutes. How long do 100 machines take to make 100 widgets?', a: '5 minutes', o: ['5 minutes', '100 minutes', '20 minutes'] },
  { q: 'Water lilies double every day and cover the lake in 48 days. How many days until they cover half of it?', a: '47 days', o: ['47 days', '24 days', '36 days'] },
  { q: 'Mary’s father has 5 daughters: Nana, Nene, Nini, Nono. What is the fifth one called?', a: 'Mary', o: ['Mary', 'Nunu', 'Nyny'] },
  { q: 'What has keys but opens no doors?', a: 'A piano', o: ['A piano', 'A keyring', 'A lock'] },
  { q: 'Which planet has the fastest winds in the Solar System?', a: 'Neptune', o: ['Neptune', 'Earth', 'Mercury'] },
  { q: 'How many dwarf planets does the International Astronomical Union recognise?', a: '5', o: ['5', '1', '12'] },
];
const WORDS = EN ? WORDS_EN : WORDS_FR, CODE = EN ? CODE_EN : CODE_FR, SPACEWORDS = EN ? SPACEWORDS_EN : SPACEWORDS_FR, RIDDLES = EN ? RIDDLES_EN : RIDDLES_FR,
  SCIENCE = EN ? SCIENCE_EN : SCIENCE_FR, TRUEFALSE = EN ? TRUEFALSE_EN : TRUEFALSE_FR, ADULT = EN ? ADULT_EN : ADULT_FR;

const shift = (w, n = 1) => w.split('').map((c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + n) % 26))).join('');
const scramble = (w) => { let s; do { s = shuffle(w.split('')).join(''); } while (s === w); return s; };
const nums = (r, spread, n = 3) => { const o = new Set([r]); while (o.size < n) { const x = r + (R(2 * spread + 1) - spread); if (x !== r && x >= 0) o.add(x); } return shuffle([...o]); };
const numOpts = (r, spread) => nums(r, spread).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === r }));
const textOpts = (o, a) => shuffle(o).map((x) => ({ html: x, ok: x === a }));

function little() { // 3 to 5: everything is a picture and said aloud
  const kind = pick(['col', 'count', 'shape', 'odd', 'size', 'match']);
  if (kind === 'col') { const names = shuffle(Object.keys(BALLS)).slice(0, 4), t = pick(names); return { voice: ['col', `col_${t}`], text: '', big: true, options: names.map((n) => ({ html: ball(n), ok: n === t })) }; }
  if (kind === 'count') { const n = 1 + R(5), what = pick(['star', 'apple', 'fish', 'cat', 'moon', 'rabbit']), o = nums(n, 2).map((x) => Math.max(1, x)); const opts = [...new Set(o)]; for (let x = 1; opts.length < 3; x++) if (!opts.includes(x)) opts.push(x);
    return { voice: ['count2'], text: `<div class="stars">${ic(what, 'twk').repeat(n)}</div>`, big: true, options: shuffle(opts.slice(0, 3)).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === n })) }; }
  if (kind === 'shape') { const names = shuffle(Object.keys(SHAPES)), t = pick(names); return { voice: ['shape', `shape_${t}`], text: '', big: true, options: names.map((n) => ({ html: shape(n), ok: n === t })) }; }
  if (kind === 'odd') { const same = pick(ALLPICS), other = pick(ALLPICS.filter((x) => x !== same)), pos = R(4);
    return { voice: ['odd'], text: '', big: true, options: [0, 1, 2, 3].map((i) => ({ html: ic(i === pos ? other : same), ok: i === pos })) }; }
  if (kind === 'size') { const what = pick(ALLPICS), big = Math.random() < 0.5, sizes = shuffle([40, 56, 76]), target = big ? 76 : 40;
    return { voice: [big ? 'big' : 'small'], text: '', big: true, options: sizes.map((s) => ({ html: ic(what, '', `width:${s}px;height:${s}px`), ok: s === target })) }; }
  const t = pick(ALLPICS), others = shuffle(ALLPICS.filter((x) => x !== t)).slice(0, 2);
  return { voice: ['match'], text: `<div class="stars">${ic(t, 'twk', 'width:84px;height:84px')}</div>`, big: true, options: shuffle([t, ...others]).map((x) => ({ html: ic(x), ok: x === t })) };
}
function middle() { // 6 to 8: small sums, patterns, reading
  const kind = pick(['add', 'sub', 'next', 'word', 'first', 'odd']);
  if (kind === 'add') { const a = 2 + R(9), b = 1 + R(9); return { voice: ['add'], text: `<p class="huge">${a} + ${b} = <span class="qm">?</span></p>`, options: numOpts(a + b, 2) }; }
  if (kind === 'sub') { const a = 6 + R(13), b = 1 + R(a - 1); return { voice: ['sub'], text: `<p class="huge">${a} − ${b} = <span class="qm">?</span></p>`, options: numOpts(a - b, 2) }; }
  if (kind === 'next') { const p = fresh('pat', PATTERNS), seq = [...p, ...p, ...p].slice(0, p.length * 2 + 1), ans = p[seq.length % p.length];
    const others = [...new Set([...p.filter((x) => x !== ans), ...shuffle([...new Set(PATTERNS.flat())].filter((x) => !p.includes(x)))])].slice(0, 2); // the motif's other piece is the tempting wrong answer
    return { voice: ['next'], text: `<div class="row">${seq.map(pic).join('')}<span class="slot">?</span></div>`, options: shuffle([ans, ...others]).map((x) => ({ html: pic(x), ok: x === ans })) }; }
  if (kind === 'word') { const w = fresh('w', WORDS), others = shuffle(WORDS.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['word'], text: `<p class="huge word">${w[0]}</p>`, options: shuffle([w, ...others]).map((x) => ({ html: ic(x[1]), ok: x === w })) }; }
  if (kind === 'first') { const w = fresh('f', WORDS), l = w[0][0].normalize('NFD')[0], others = shuffle('ABCDEFGHILMNOPRSTV'.split('').filter((c) => c !== l)).slice(0, 2);
    return { voice: ['first'], text: `<div class="stars">${ic(w[1], 'twk', 'width:96px;height:96px')}</div>`, options: shuffle([l, ...others]).map((x) => ({ html: `<b class="num">${x}</b>`, ok: x === l })) }; }
  const groups = [ANIMALS, FOOD, SKY, HOME], g = pick(groups), other = pick(groups.filter((x) => x !== g)), three = shuffle(g).slice(0, 3), odd = pick(other), pos = R(4), items = [...three]; items.splice(pos, 0, odd);
  return { voice: ['odd'], text: '', big: true, options: items.map((x, i) => ({ html: ic(x), ok: i === pos })) };
}
function older() { // 9 to 12: codes, riddles, science, numbers
  const kind = pick(['cipher', 'riddle', 'science', 'seq', 'mult', 'anagram', 'tf']);
  if (kind === 'cipher') { const w = fresh('c', CODE), others = shuffle(CODE.filter((x) => x !== w && Math.abs(x.length - w.length) < 3)).slice(0, 2);
    return { voice: ['cipher'], text: `<p class="code">${shift(w).split('').map((c) => `<span>${c}</span>`).join('')}</p><p class="small">${tr('A → B, B → C… Recule chaque lettre d’un cran.', 'A → B, B → C… Move each letter back by one.')}</p>`, options: textOpts([w, ...others], w) }; }
  if (kind === 'riddle') { const r = fresh('r', RIDDLES); return { voice: ['riddle'], text: `<p class="q">${r.q}</p>`, options: textOpts(r.o, r.a) }; }
  if (kind === 'science') { const r = fresh('s', SCIENCE); return { voice: ['science'], text: `<p class="q">${r.q}</p>`, options: textOpts(r.o, r.a) }; }
  if (kind === 'mult') { const a = 2 + R(9), b = 2 + R(9); return { voice: ['mult'], text: `<p class="huge">${a} × ${b} = <span class="qm">?</span></p>`, options: numOpts(a * b, 6) }; }
  if (kind === 'anagram') { const w = fresh('an', SPACEWORDS), others = shuffle(SPACEWORDS.filter((x) => x !== w)).slice(0, 2);
    return { voice: ['anagram'], text: `<p class="code">${scramble(w).split('').map((c) => `<span>${c}</span>`).join('')}</p>`, options: textOpts([w, ...others], w) }; }
  if (kind === 'tf') { const [s, v] = fresh('tf', TRUEFALSE); return { voice: ['truefalse'], text: `<p class="q">${s}</p>`, options: [{ html: tr('Vrai', 'True'), ok: v }, { html: tr('Faux', 'False'), ok: !v }] }; }
  return seq(false);
}
// number sequences, generated: add, double, squares, two-step
function seq(hard) {
  const kind = pick(hard ? ['geo', 'fib', 'two', 'sq'] : ['add', 'geo', 'sq', 'down']); let s, r;
  if (kind === 'add') { const a = 1 + R(9), d = 2 + R(6); s = [0, 1, 2, 3].map((i) => a + i * d); r = a + 4 * d; }
  else if (kind === 'down') { const d = 2 + R(5), a = d * 6 + R(10); s = [0, 1, 2, 3].map((i) => a - i * d); r = a - 4 * d; }
  else if (kind === 'geo') { const a = 1 + R(3), k = hard ? 3 : 2; s = [0, 1, 2, 3].map((i) => a * k ** i); r = a * k ** 4; }
  else if (kind === 'sq') { const o = R(hard ? 6 : 3); s = [1, 2, 3, 4].map((i) => (i + o) ** 2); r = (5 + o) ** 2; }
  else if (kind === 'fib') { const a = 1 + R(3), b = a + 1 + R(3); s = [a, b]; while (s.length < 5) s.push(s.at(-1) + s.at(-2)); r = s.at(-1) + s.at(-2); }
  else { const a = 2 + R(5), p = 3 + R(4), q = 1 + R(3); s = [a]; for (let i = 0; i < 4; i++) s.push(i % 2 ? s.at(-1) - q : s.at(-1) + p); r = s.at(-1) + p; }
  return { voice: ['seq'], text: `<p class="huge">${s.join(', ')}, …</p>`, options: numOpts(r, Math.max(3, Math.round(r * 0.15))) };
}
function adult() { // grown-ups: real trivia and logic traps
  const kind = pick(['trivia', 'trivia', 'mult', 'seq', 'cipher']);
  if (kind === 'trivia') { const r = fresh('ad', ADULT); return { voice: ['adult'], text: `<p class="q">${r.q}</p>`, options: textOpts(r.o, r.a) }; }
  if (kind === 'mult') { const a = 12 + R(38), b = 3 + R(7); return { voice: ['mult'], text: `<p class="huge">${a} × ${b} = <span class="qm">?</span></p>`, options: numOpts(a * b, 12) }; }
  if (kind === 'cipher') { const w = fresh('ca', CODE.filter((x) => x.length >= 7)), n = 3, others = shuffle(CODE.filter((x) => x !== w && x.length >= 6)).slice(0, 2);
    return { voice: ['cipher'], text: `<p class="code">${shift(w, n).split('').map((c) => `<span>${c}</span>`).join('')}</p><p class="small">${tr('Code de César : chaque lettre a avancé de 3 crans.', 'Caesar code: every letter moved forward 3 places.')}</p>`, options: textOpts([w, ...others], w) }; }
  return seq(true);
}
export function challenge(age) { return age === 'p' ? little() : age === 'm' ? middle() : age === 'g' ? older() : adult(); }

// where the parent can hide a card: an illustrated picture for the little ones, a riddle for everyone
export const SPOTS = [
  ['canape', 'Le canapé', 'The sofa'], ['frigo', 'Le frigo', 'The fridge'], ['lit', 'Le lit', 'The bed'], ['table', 'La table', 'The table'], ['livres', 'Les livres', 'The books'], ['bain', 'La salle de bain', 'The bathroom'],
  ['porte', 'La porte d’entrée', 'The front door'], ['coussin', 'Sous un coussin', 'Under a cushion'], ['plante', 'Une plante', 'A plant'], ['jouets', 'Les jouets', 'The toys'], ['chaussures', 'Les chaussures', 'The shoes'],
].map(([id, fr, en]) => [id, EN ? en : fr]);
export const AVATARS = [['fox', 'Renard', 'Fox'], ['panda', 'Panda', 'Panda'], ['lion', 'Lion', 'Lion'], ['bunny', 'Lapin', 'Bunny'], ['owl', 'Hibou', 'Owl'], ['turtle', 'Tortue', 'Turtle']].map(([id, fr, en]) => [id, EN ? en : fr]);
export { shuffle, pick, R };
