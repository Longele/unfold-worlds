// Kalulu: the book around the stage. Language, the read-along caption, page navigation, pause, the end card.
import { Stage, Audio, sleep } from './engine.js?v=202610231933';
import { makeStory, SPEAKER } from './story.js?v=202610231933';

const $ = (id) => document.getElementById(id);
const T = {
  fr: { title: 'Kalulu', sub: 'et le grand tir à la corde', tale: 'Un conte bantou', start: 'Commencer l’histoire', starts: 'environ six minutes, à écouter et à toucher', hp: 'meilleur avec le son', elephant: 'L’Éléphant', hippo: 'L’Hippopotame', end: 'Fin', again: 'Relire l’histoire', home: 'Accueil', soon: 'D’autres contes arrivent bientôt', pause: 'En pause', resume: 'Touchez pour reprendre', turn: 'Tournez votre téléphone', turnS: 'l’histoire se lit en largeur', stay: 'Continuer ainsi', cap: 'Texte', music: 'Musique' },
  en: { title: 'Kalulu', sub: 'and the great tug of war', tale: 'A Bantu folk tale', start: 'Start the story', starts: 'about six minutes, to listen and to touch', hp: 'best with sound on', elephant: 'The Elephant', hippo: 'The Hippo', end: 'The End', again: 'Read it again', home: 'Home', soon: 'More stories are coming soon', pause: 'Paused', resume: 'Tap to continue', turn: 'Turn your phone', turnS: 'the story is told sideways', stay: 'Continue like this', cap: 'Text', music: 'Music' },
};
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('kalulu-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (!T[lang]) lang = 'fr';
const t = (k) => T[lang][k];

const rig = await (await fetch('art/rig.json')).json();
const timings = {};
const loadTimings = async (l) => (timings[l] ||= await (await fetch(`voice/${l}/timings.json`)).json());
const stage = new Stage($('stage'), rig);
const audio = new Audio();

// ------------------------------------------------------------------ read-along caption
const cap = $('cap');
let capOn = store.get('kalulu-cap') !== '0', paused = false;
function showLine(id) {
  const tm = timings[lang][id]; if (!tm) return () => {};
  cap.innerHTML = tm.words.map((w, i) => `<span data-i="${i}">${w.w}</span>`).join(' ');
  cap.className = 'cap on who-' + tm.who + (capOn ? '' : ' hidden');
  const spans = [...cap.children];
  const actor = stage.actors[SPEAKER[tm.who]];
  if (actor) actor.talk = 1;
  return (time) => {
    let open = 0;
    tm.words.forEach((w, i) => { const on = time >= w.s - 0.02; spans[i].classList.toggle('lit', on); if (time >= w.s && time <= w.e) open = 1; });
    if (actor) actor.mouth = open ? 0.6 + 0.4 * Math.abs(Math.sin(time * 18)) : 0;
    if (time > 1e8) { if (actor) { actor.talk = 0; actor.mouth = 0; } }
  };
}
async function say(id) {
  const upd = showLine(id);
  await audio.say(`voice/${lang}/${id}.mp3`, upd);
  await sleep(250);
}

// ------------------------------------------------------------------ pages
const api = { stage, audio, say, t, ui: { end: () => endCard() } };
const pages = makeStory(api);
let page = -1, run = 0;
const dots = $('dots');
function check(r) { return () => { if (r !== run) throw new Error('abort'); }; }
async function go(i) {
  const r = ++run;
  if (page >= 0) pages[page].leave?.();
  audio.stopVoice(); stage.hot.innerHTML = ''; stage.onFrame = null; stage.fx.setFireflies(0);
  page = Math.max(0, Math.min(pages.length - 1, i));
  const P = pages[page];
  dots.innerHTML = pages.map((_, k) => `<i class="${k < page ? 'done' : k === page ? 'on' : ''}"></i>`).join('');
  $('end').classList.remove('on');
  document.body.classList.toggle('night', !!P.night);
  cap.className = 'cap';
  stage.root.classList.add('turning'); audio.sfx('sfx/page.mp3', 0.6);
  await stage.setBg(P.bg, 700);
  if (r !== run) return;
  stage.clearActors(); stage.clearProps(); stage.sky.className = 'sky';
  P.setup?.();
  stage.root.classList.remove('turning');
  audio.loop('amb', `sfx/${P.amb}.mp3`, 'amb', 1);
  if (!P.night) audio.stopLoop('music', 2);
  try {
    await P.run(check(r));
    if (r === run && page < pages.length - 1) { await sleep(900); if (r === run) go(page + 1); }
  } catch (e) { if (e.message !== 'abort') console.error(e); }
}
function endCard() {
  $('end').classList.add('on'); cap.className = 'cap';
  audio.loop('music', 'sfx/theme.mp3', 'music', 1, 2);
}

// fireflies answer the finger on the last page
$('stage').addEventListener('pointerdown', (e) => {
  if (!api.fireflyTaps) return;
  const p = stage.pt(e);
  for (const f of stage.fx.fireflies) if (Math.hypot(f.x - p.x, f.y - p.y) < 140) { f.b = 1; audio.sfx('sfx/chime.mp3', 0.5, 0.8 + Math.random() * 0.6); }
});

// ------------------------------------------------------------------ chrome
function texts() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
}
async function setLang(l) {
  if (!T[l] || l === lang) return;
  lang = l; store.set('kalulu-lang', l); texts(); await loadTimings(lang);
  if (page >= 0) go(page);
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
function pause(on) { paused = on; stage.paused = on; audio.pause(on); $('pause').classList.toggle('on', on); }
$('b-pause').onclick = () => pause(true);
$('pause').onclick = () => pause(false);
$('b-prev').onclick = () => go(page - 1);
$('b-next').onclick = () => go(page + 1);
$('b-cap').onclick = () => { capOn = !capOn; store.set('kalulu-cap', capOn ? '1' : '0'); cap.classList.toggle('hidden', !capOn); $('b-cap').classList.toggle('on', capOn); };
$('b-music').onclick = () => { const on = !audio.musicOn; audio.setMusic(on); $('b-music').classList.toggle('on', on); if (on) audio.loop('music', 'sfx/theme.mp3', 'music', 1, 2); };
$('again').onclick = () => go(0);
document.addEventListener('visibilitychange', () => { if (document.hidden && page >= 0) pause(true); });
addEventListener('keydown', (e) => { if (e.code === 'ArrowRight') go(page + 1); if (e.code === 'ArrowLeft') go(page - 1); if (e.code === 'Space' || e.code === 'Escape') pause(!paused); });

// start: inside the tap (sound unlock, fullscreen + landscape on phones), then ask to turn the phone if needed
const portrait = () => innerWidth < innerHeight;
function rotateGate() {
  const o = $('rotate'); o.classList.add('on');
  return new Promise((res) => { const done = () => { removeEventListener('resize', chk); o.classList.remove('on'); res(); }; const chk = () => { if (!portrait()) setTimeout(done, 300); }; addEventListener('resize', chk); $('rot-stay').onclick = done; });
}
$('go').onclick = async () => {
  audio.unlock(); audio.setMusic(store.get('kalulu-music') !== '0'); $('b-music').classList.toggle('on', audio.musicOn); $('b-cap').classList.toggle('on', capOn);
  const small = Math.min(screen.width, screen.height) < 700 && matchMedia('(pointer: coarse)').matches;
  if (small) { try { const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); r?.then?.(() => screen.orientation?.lock?.('landscape')?.catch?.(() => {}), () => {}); } catch {} }
  document.body.classList.add('in');
  audio.stopLoop('music', 1.5);
  await loadTimings(lang);
  if (small && portrait()) await rotateGate();
  go(0);
};

// the cover: the night-to-dawn theme plays softly once the reader touches anything
texts();
stage.setBg('bg-1-dawn', 10);
stage.actor('kalulu').place({ x: 1500, y: 935, s: 0.42, mode: 'idle' });
loadTimings(lang);
// warm the cache for the first pages
for (const n of ['amb-dawn', 'page', 'sunrise', 'flutter', 'theme']) audio.load(`sfx/${n}.mp3`);
window.__kalulu = { stage, audio, go, pages, api };
