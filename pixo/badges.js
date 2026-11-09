// La Grande Chasse: the badge book. Badges belong to the family on this device (no names, nothing sent anywhere):
// one per adventure finished, and feats that make you want to play again. Kept in localStorage, like the record.
import { EPISODES } from './episodes.js';
const KEY = 'grande-chasse-carnet';
export const BADGES = [
  { id: 'ep_e1', name: { fr: 'Vaisseau réparé', en: 'Ship repaired' }, how: { fr: 'Finir l’aventure 1', en: 'Finish adventure 1' } },
  { id: 'ep_e2', name: { fr: 'Soleil rallumé', en: 'Sun relit' }, how: { fr: 'Finir l’aventure 2', en: 'Finish adventure 2' } },
  { id: 'ep_e3', name: { fr: 'Clé de cristal', en: 'Crystal key' }, how: { fr: 'Finir l’aventure 3', en: 'Finish adventure 3' } },
  { id: 'ep_e4', name: { fr: 'Roi de la fête', en: 'Party star' }, how: { fr: 'Finir l’aventure 4', en: 'Finish adventure 4' } },
  { id: 'stars', name: { fr: 'Attrape-étoiles', en: 'Star catcher' }, how: { fr: 'Attraper 12 étoiles d’un coup', en: 'Catch 12 stars in one go' } },
  { id: 'simon', name: { fr: 'Mémoire d’antenne', en: 'Antenna memory' }, how: { fr: 'Réussir les 4 signaux de l’antenne', en: 'Repeat all 4 antenna signals' } },
  { id: 'lynx', name: { fr: 'Œil de lynx', en: 'Eagle eyes' }, how: { fr: 'Trouver Pixo caché en moins de 4 secondes', en: 'Find hiding Pixo in under 4 seconds' } },
  { id: 'rainbow', name: { fr: 'Arc-en-ciel', en: 'Rainbow' }, how: { fr: 'Tout le monde trouve sa couleur', en: 'Everyone finds their colour' } },
  { id: 'dragon', name: { fr: 'Souffle de dragon', en: 'Dragon breath' }, how: { fr: 'Refroidir en moins de 8 secondes', en: 'Cool it down in under 8 seconds' } },
  { id: 'brain', name: { fr: 'Petit génie', en: 'Little genius' }, how: { fr: 'Aucune erreur aux questions d’une aventure', en: 'No wrong answer in a whole adventure' } },
  { id: 'record', name: { fr: 'Record battu', en: 'Record broken' }, how: { fr: 'Battre le record de la famille', en: 'Beat the family record' } },
  { id: 'tickle', name: { fr: 'Chatouilleur', en: 'Tickler' }, how: { fr: 'Chatouiller Pixo (touchez-le vite)', en: 'Tickle Pixo (tap him fast)' } },
  { id: 'dizzy', name: { fr: 'Tournis', en: 'Dizzy' }, how: { fr: 'Faire tourner la tête de Pixo', en: 'Make Pixo dizzy' } },
  { id: 'team', name: { fr: 'Grande équipe', en: 'Big team' }, how: { fr: 'Jouer à 4 explorateurs ou plus', en: 'Play with 4 explorers or more' } },
  { id: 'collector', name: { fr: 'Grand collectionneur', en: 'Grand collector' }, how: { fr: 'Finir les 4 aventures', en: 'Finish all 4 adventures' } },
];
let book = { b: {}, eps: {}, all: false };
try { book = Object.assign(book, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(book)); } catch {} };
export const has = (id) => !!book.b[id];
export const count = () => BADGES.filter((b) => book.b[b.id]).length;
// returns true the first time a badge is earned
export function earn(id) { if (book.b[id] || !BADGES.some((b) => b.id === id)) return false; book.b[id] = Date.now(); save(); return true; }
export function finishEpisode(id) { book.eps[id] = true; save(); }
export const done = (id) => !!book.eps[id];
export const allDone = () => EPISODES.every((e) => book.eps[e.id]);
export const unlocked = (i) => i === 0 || book.all || !!book.eps[EPISODES[i - 1].id];
export function unlockAll() { book.all = true; save(); }
export const badgeImg = (id) => `img/badges/${id}.webp`;
