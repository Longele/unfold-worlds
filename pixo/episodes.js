// La Grande Chasse: the adventures. The same six printed cards (six planets) serve every adventure; what changes is
// Pixo's story, the six things hidden behind the cards, the finale and the diploma. Voice lines of adventure N use
// the ids <line>_eN (lines.js); adventure 1 uses the base ids. An adventure opens when the one before is finished.
export const EPISODES = [
  { id: 'e1', n: 1, cover: 'img/plates/p1.jpg', col: '#2fa8e0', film: true, flame: true, item: (p) => `p${p}`, trophy: 'ship',
    title: { fr: 'Le vaisseau en panne', en: 'The broken spaceship' },
    pitch: { fr: 'Pixo s’est écrasé chez vous. Retrouvez les six morceaux de son vaisseau.', en: 'Pixo has crashed in your home. Find the six pieces of his spaceship.' },
    heat: { fr: 'Chaleur du moteur', en: 'Engine heat' },
    dip: { fr: ['pour avoir retrouvé les six morceaux du vaisseau de Pixo', 'et l’avoir aidé à rentrer chez lui, dans les étoiles.'], en: ['for finding the six pieces of Pixo’s spaceship', 'and helping him fly home to the stars.'] } },
  { id: 'e2', n: 2, cover: 'img/plates/p3.jpg', col: '#f2bf1b', item: (p) => `e2/p${p}`, trophy: 'e2/trophy',
    title: { fr: 'Les bébés étoiles', en: 'The baby stars' },
    pitch: { fr: 'Le soleil de la planète d’or s’éteint : ses six bébés étoiles se cachent chez vous.', en: 'The golden planet’s sun is going out: its six baby stars are hiding in your home.' },
    heat: { fr: 'Fièvre de l’étoile', en: 'Star fever' },
    dip: { fr: ['pour avoir ramené les six bébés étoiles', 'et rallumé le soleil de la planète d’or.'], en: ['for bringing back the six baby stars', 'and lighting up the golden planet’s sun again.'] } },
  { id: 'e3', n: 3, cover: 'img/plates/p4.jpg', col: '#8d63e0', item: (p) => `e3/p${p}`, trophy: 'e3/trophy',
    title: { fr: 'La clé de cristal', en: 'The crystal key' },
    pitch: { fr: 'La maman de Pixo est enfermée dans la grotte de cristal. La clé s’est brisée en six éclats.', en: 'Pixo’s mum is shut in the crystal cave. The key has broken into six shards.' },
    heat: { fr: 'Poussière du cristal', en: 'Crystal dust' },
    dip: { fr: ['pour avoir retrouvé les six éclats de cristal', 'et aidé Pixo à retrouver sa maman.'], en: ['for finding the six crystal shards', 'and helping Pixo find his mum.'] } },
  { id: 'e4', n: 4, cover: 'img/plates/p6.jpg', col: '#e8456f', item: (p) => `e4/p${p}`, trophy: 'e4/trophy',
    title: { fr: 'La fête de l’océan rose', en: 'The pink ocean party' },
    pitch: { fr: 'Ce soir, c’est la fête ! Mais les six instruments de l’orchestre ont roulé chez vous.', en: 'Tonight is the party! But the orchestra’s six instruments have rolled into your home.' },
    heat: { fr: 'Silence', en: 'Silence' },
    dip: { fr: ['pour avoir retrouvé les six instruments', 'et sauvé la grande fête de l’océan rose.'], en: ['for finding the six instruments', 'and saving the big party on the pink ocean.'] } },
];
export const episode = (id) => EPISODES.find((e) => e.id === id) || EPISODES[0];
