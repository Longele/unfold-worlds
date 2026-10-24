// Abysses: a descent from the surface to the bottom of the Challenger Deep (10,935 m).
// One canvas draws the water, the pictures, the creatures, the marine snow, the dark and the lamp;
// a <video> plays the big moments seen through the lamp; WebAudio carries the voice and the sea.
import { Audio, sleep } from './audio.js?v=202610240800';

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ words
const T = {
  fr: { kick: 'Unfold Worlds', title: 'Abysses', sub: 'Une descente jusqu’au point le plus profond de la Terre.', start: 'Plonger', starts: 'environ dix minutes, au casque de préférence', hp: 'meilleur avec un casque', temp: 'Eau', press: 'Pression', light: 'Lumière', lamp: 'Lampe',
    z: ['La surface', 'Zone du soleil', 'Zone du crépuscule', 'Zone de minuit', 'Plaine abyssale', 'Zone des fosses'],
    touchSea: 'Touche la mer', scroll: coarse ? 'Glisse vers le haut pour descendre' : 'Fais défiler pour descendre', lampOff: 'Éteins ta lampe', hold: 'Garde le doigt appuyé', letGo: 'Lâche', found: 'créatures', tapSkip: 'Touche pour continuer',
    endk: 'Retour à la surface', endt: 'Tu es allé au fond du monde', again: 'Redescendre', home: 'Accueil', src: 'Faits vérifiés auprès de la NOAA, du MBARI, du WHOI et des publications scientifiques. Images et clips créés avec l’IA à partir de ces faits.', turn: '', of: 'sur', count: 'créatures découvertes' },
  en: { kick: 'Unfold Worlds', title: 'Abysses', sub: 'A descent to the deepest point on Earth.', start: 'Dive', starts: 'about ten minutes, best with headphones', hp: 'best with headphones', temp: 'Water', press: 'Pressure', light: 'Light', lamp: 'Lamp',
    z: ['The surface', 'Sunlight zone', 'Twilight zone', 'Midnight zone', 'Abyssal plain', 'Trench zone'],
    touchSea: 'Touch the sea', scroll: coarse ? 'Swipe up to go down' : 'Scroll to go down', lampOff: 'Switch off your lamp', hold: 'Hold your finger down', letGo: 'Let go', found: 'creatures', tapSkip: 'Tap to continue',
    endk: 'Back at the surface', endt: 'You went to the bottom of the world', again: 'Dive again', home: 'Home', src: 'Facts checked against NOAA, MBARI, WHOI and the scientific literature. Pictures and clips made with AI from those facts.', turn: '', of: 'of', count: 'creatures discovered' },
};
let lang = new URLSearchParams(location.search).get('lang') || store.get('abysses-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const t = (k) => T[lang][k];

// ------------------------------------------------------------------ the track: progress p (0..1) to depth
const TRACK = [[0, 0], [0.10, 200], [0.30, 1000], [0.56, 4000], [0.75, 6000], [0.97, 10935]];
const depthAt = (p) => { for (let i = 1; i < TRACK.length; i++) if (p <= TRACK[i][0]) { const [p0, d0] = TRACK[i - 1], [p1, d1] = TRACK[i]; return lerp(d0, d1, (p - p0) / (p1 - p0)); } return 10935; };
const K = 26; // screen heights travelled per unit of progress
const zoneOf = (d) => (d < 1 ? 0 : d < 200 ? 1 : d < 1000 ? 2 : d < 4000 ? 3 : d < 6000 ? 4 : 5);
// what the water is like (NOAA zones; a tropical profile for temperature)
const tempAt = (d) => (d < 200 ? lerp(26, 15, d / 200) : d < 1000 ? lerp(15, 5, (d - 200) / 800) : d < 4000 ? lerp(5, 2, (d - 1000) / 3000) : d < 9000 ? lerp(2, 1.6, (d - 4000) / 5000) : lerp(1.6, 2.4, (d - 9000) / 1935));
const lightAt = (d) => (d <= 0 ? 100 : d < 200 ? 100 * Math.pow(0.01, d / 200) : d < 1000 ? Math.pow(0.01, 1 + (d - 200) / 400) * 100 : 0);
// water colour by depth
const WATER = [[0, [52, 190, 210]], [60, [16, 132, 172]], [200, [6, 58, 102]], [500, [3, 26, 52]], [1000, [1, 9, 20]], [4000, [1, 5, 12]], [10935, [0, 3, 8]]];
const waterAt = (d) => { for (let i = 1; i < WATER.length; i++) if (d <= WATER[i][0]) { const [d0, c0] = WATER[i - 1], [d1, c1] = WATER[i]; const k = (d - d0) / (d1 - d0); return c0.map((v, j) => Math.round(lerp(v, c1[j], k))); } return WATER[WATER.length - 1][1]; };

// ------------------------------------------------------------------ the creatures (real species, at their depth)
// p: where it lives on the track; x: across the screen; s: size as a share of the screen height; axis 'h' slides
// sideways (on the plain the camera glides along the floor); glow: drawn over the dark
const C = [
  { id: 'hatchet', vid: 1, p: 0.125, x: 0.7, s: 0.16, swim: 1, fr: ['Poisson-hachette', 'Son ventre lumineux efface son ombre, vue d’en dessous.'], en: ['Hatchetfish', 'Its glowing belly erases its shadow, seen from below.'] },
  { id: 'lantern', vid: 1, p: 0.15, x: 0.3, s: 0.12, swim: 1, many: 7, rise: 1, fr: ['Poisson-lanterne', 'L’un des poissons les plus nombreux de la planète.'], en: ['Lanternfish', 'One of the most numerous fish on the planet.'] },
  { id: 'siphono', vid: 1, p: 0.175, x: 0.66, s: 0.55, glow: 1, drift: 1, fr: ['Siphonophore', 'Ce n’est pas un animal, mais une colonie d’animaux reliés entre eux.'], en: ['Siphonophore', 'Not one animal, but a colony of animals joined together.'] },
  { id: 'vampire', vid: 1, p: 0.275, x: 0.62, s: 0.3, drift: 1, fr: ['Calmar vampire', 'Malgré son nom, il se nourrit de neige marine, pas de sang.'], en: ['Vampire squid', 'Despite its name, it eats marine snow, not blood.'] },
  { id: 'atolla', vid: 1, p: 0.345, x: 0.5, s: 0.26, glow: 1, drift: 1, many: 3, fr: ['Méduse Atolla', 'Attaquée, elle s’allume comme une alarme pour attirer plus gros que son agresseur.'], en: ['Atolla jellyfish', 'When attacked, it flashes like an alarm to call in something bigger.'] },
  { id: 'angler', vid: 1, p: 0.372, x: 0.36, s: 0.3, swim: 1, fr: ['Baudroie des abysses', 'Sa lanterne brille grâce à des bactéries qui vivent dedans.'], en: ['Deep-sea anglerfish', 'Its lantern glows thanks to bacteria living inside it.'] },
  { id: 'gulper', vid: 1, p: 0.405, x: 0.62, s: 0.36, swim: 1, fr: ['Anguille-pélican', 'Sa bouche géante s’ouvre comme un filet.'], en: ['Gulper eel', 'Its giant mouth opens like a net.'] },
  { id: 'octopus', vid: 1, p: 0.6, x: 0.5, s: 0.28, drift: 1, axis: 'h', fr: ['Pieuvre Dumbo', 'La pieuvre la plus profonde connue, vue à près de 7 000 m.'], en: ['Dumbo octopus', 'The deepest octopus known, seen at nearly 7,000 m.'] },
  { id: 'snailfish', vid: 1, p: 0.854, x: 0.5, s: 0.22, swim: 1, fr: ['Poisson-limace', 'Filmé à 8 336 m en 2022 : le poisson le plus profond jamais vu.'], en: ['Snailfish', 'Filmed at 8,336 m in 2022: the deepest fish ever seen.'] },
  { id: 'amphipod', vid: 1, p: 0.955, x: 0.42, s: 0.1, swim: 1, many: 5, fr: ['Amphipode des fosses', 'Il vit tout au fond, à près de 11 000 m.'], en: ['Trench amphipod', 'It lives at the very bottom, near 11,000 m.'] },
];
// creatures seen in the filmed scenes: found when the scene plays
const ENVC = [
  { id: 'turtle', p: 0.02, fr: ['Tortue verte', 'Au repos, elle peut rester plusieurs heures sous l’eau sans respirer.'], en: ['Green sea turtle', 'Resting, it can stay under water for hours without a breath.'] },
  { id: 'sardine', p: 0.05, fr: ['Sardines', 'En banc serré, elles semblent ne former qu’un seul grand animal.'], en: ['Sardines', 'In a tight school they look like one big animal.'] },
  { id: 'manta', p: 0.062, fr: ['Raie manta', 'Jusqu’à cinq mètres d’envergure, et elle ne mange que du plancton.'], en: ['Manta ray', 'Up to five metres across, and it eats only plankton.'] },
  { id: 'seapig', p: 0.585, fr: ['Cochon de mer', 'Une holothurie qui marche en troupeau sur la vase.'], en: ['Sea pig', 'A sea cucumber that walks across the mud in herds.'] },
  { id: 'tripod', p: 0.64, fr: ['Poisson-trépied', 'Immobile face au courant, il attend que la nourriture passe.'], en: ['Tripod fish', 'Standing still against the current, it waits for food to drift by.'] },
];
// the living places: filmed loops, faded in and out with depth (still picture until the clip is ready)
const ENV = [
  { id: 'env-shallow', still: 'bg-shallow', a: (p) => 1 - smooth(0.036, 0.05, p) },
  { id: 'env-sardines', still: 'bg-shallow', a: (p) => smooth(0.036, 0.05, p) * (1 - smooth(0.082, 0.1, p)) },
  { id: 'env-plain', still: 'bg-plain', a: (p) => smooth(0.545, 0.57, p) * (1 - smooth(0.745, 0.77, p)) },
  { id: 'env-trench', still: 'bg-trench', a: (p) => smooth(0.9, 0.95, p) },
];
// the big moments (clips), and the ones counted as found when seen
const M = [
  { id: 'whale', p: 0.066, line: 'z1c', sfx: 'whale', fr: ['Baleine à bosse', 'Les mâles chantent des chants répétés pendant des heures.'], en: ['Humpback whale', 'Males sing songs repeated for hours.'] },
  { id: 'squid', p: 0.195, line: 'z2c', card: '2012', fr: ['Calmar géant', 'Filmé vivant chez lui pour la première fois en 2012. Ses yeux sont parmi les plus grands du monde animal.'], en: ['Giant squid', 'First filmed alive in its home in 2012. Its eyes are among the largest in the animal world.'] },
  { id: 'sperm', p: 0.43, line: 'z3f', sfx: 'clicks', fr: ['Cachalot', 'Le plus grand prédateur à dents de la planète.'], en: ['Sperm whale', 'The largest toothed predator on the planet.'] },
  { id: 'vent', p: 0.475, line: 'z3g', sfx: 'vent', fr: ['Vers des sources chaudes', 'Ils n’ont pas de bouche : des bactéries vivent en eux et les nourrissent. L’eau dépasse 350 °C.'], en: ['Hot-vent tube worms', 'They have no mouth: bacteria living inside feed them. The water tops 350 °C.'] },
  { id: 'bottom', p: 0.97, line: 'z5d', fr: ['Challenger Deep', '10 935 m. Le point le plus profond de la Terre.'], en: ['Challenger Deep', '10,935 m. The deepest point on Earth.'] },
];
// the voice, by where it is spoken
const LINES = [['z1a', 0.012], ['z1b', 0.032], ['z1d', 0.085], ['z2a', 0.108], ['z2b', 0.148], ['z2e', 0.275], ['z3a', 0.302], ['z3d', 0.37], ['z3e', 0.402], ['z4a', 0.566], ['z4b', 0.6], ['z4c', 0.638], ['z4d', 0.676], ['z5a', 0.755], ['z5b', 0.852]];

// ------------------------------------------------------------------ pictures
const IMG = {};
const SIZES = await fetch('art/sizes.json').then((r) => r.json()).catch(() => ({}));
const img = (name) => (IMG[name] ||= Object.assign(new Image(), { src: `art/${name}.webp`, decoding: 'async' }));
const bgImg = (name) => img(name + (coarse ? '-m' : ''));
// filmed loops: one muted <video> each, played only while on screen (an iPhone decodes only a few at once)
const VIDS = {};
function vidEl(name) {
  let v = VIDS[name];
  if (!v) { v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.src = `video/${name}.mp4`; v.lastUse = 0; if (name === 'env-sardines') v.defaultPlaybackRate = v.playbackRate = 0.75; VIDS[name] = v; }
  return v;
}
function useVid(name, now) { const v = vidEl(name); v.lastUse = now; if (v.paused && started && !document.hidden) v.play().catch(() => {}); return v.readyState >= 2 && v.videoWidth ? v : null; }
function idleVids(now) { for (const v of Object.values(VIDS)) if (!v.paused && now - v.lastUse > 1.2) v.pause(); }

// ------------------------------------------------------------------ the canvas
const cv = $('sea'), g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function fit() { DPR = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.75); W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0); }
fit(); addEventListener('resize', fit);
// the dark is drawn on its own small canvas (a quarter of the screen, scaled up: it is all soft gradients)
const dk = document.createElement('canvas'), dg = dk.getContext('2d');

// marine snow and bioluminescent sparks
const SNOW = Array.from({ length: coarse ? 90 : 180 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, r: 0.6 + Math.random() * 1.8 }));
let sparks = [];

// ------------------------------------------------------------------ state
let p = 0, vp = 0, started = false, dived = false, ended = false, moment = null, holdT = 0, holding = false;
let lampOn = false, lampAllowed = false, lampAsked = false, awaitingLamp = false, awaitingHold = false, rising = false;
const lamp = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, r: 0, k: 0 };
let lampMoved = 0;
const spoken = new Set(), found = new Set(JSON.parse(store.get('abysses-found') || '[]'));
const pointer = { x: -1, y: -1, down: false };
const audio = new Audio();
let timings = {};

// ------------------------------------------------------------------ voice and captions
async function loadTimings(l) { if (!timings[l]) timings[l] = await fetch(`voice/${l}/timings.json`).then((r) => r.json()).catch(() => ({})); }
const cap = $('cap');
function showLine(id) {
  const tm = (timings[lang] || {})[id]; if (!tm) return () => {};
  cap.innerHTML = tm.words.map((w) => `<span>${w.w}</span>`).join(' ');
  cap.className = 'cap on';
  const spans = [...cap.children];
  return (time) => { tm.words.forEach((w, i) => spans[i].classList.toggle('lit', time >= w.s - 0.02)); if (time > 1e8) setTimeout(() => { if (!audio.speaking) cap.className = 'cap'; }, 900); };
}
async function say(id) { spoken.add(id); await audio.say(`voice/${lang}/${id}.mp3`, showLine(id)); }
const hint = (k) => { const h = $('hint'); if (!k) { h.className = 'hint'; return; } h.textContent = t(k); h.className = 'hint on'; };

// ------------------------------------------------------------------ the sea's sound: one bed per zone
const BEDS = ['amb-surface', 'amb-shallow', 'amb-twilight', 'amb-midnight', 'amb-abyss', 'amb-trench'];
let bed = -1;
function setBed(z) { if (z === bed) return; bed = z; audio.loop('amb', `sfx/${BEDS[z]}.mp3`, 'amb', 1, 3); }

// ------------------------------------------------------------------ texts on the page
function texts() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
  updFound();
}
const total = C.length + M.length + ENVC.length;
function updFound() { $('found').textContent = `${found.size} / ${total} ${t('found')}`; }
function discover(id) { if (found.has(id)) return false; found.add(id); store.set('abysses-found', JSON.stringify([...found])); updFound(); audio.sfx('sfx/glow.mp3', 0.5, 1.2); return true; }
let cardT = 0;
function card(entry, x, y) {
  const c = $('card'); const [name, fact] = entry[lang];
  c.querySelector('b').textContent = name; c.querySelector('p').textContent = fact;
  c.style.left = `${clamp(x, 16, W - 316)}px`; c.style.top = `${clamp(y, 60, H - 160)}px`;
  c.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => c.classList.remove('on'), 5200);
}

// ------------------------------------------------------------------ the big moments
const vid = $('moment');
async function playMoment(m) {
  moment = m; vp = 0;
  vid.src = `video/${m.id}.mp4`; vid.currentTime = 0;
  try { await vid.play(); } catch {}
  vid.classList.add('on');
  if (m.sfx) audio.sfx(`sfx/${m.sfx}.mp3`, 0.9);
  discover(m.id);
  setTimeout(() => { if (moment === m) card(m, W * 0.06, H * 0.16); }, 1500);
  const line = m.line ? say(m.line) : Promise.resolve();
  let skipped = false; const skip = new Promise((r) => (vid.onpointerdown = () => { skipped = true; r(); }));
  await Promise.race([Promise.all([new Promise((r) => { vid.onended = r; setTimeout(r, 9500); }), line]), skip]);
  vid.onpointerdown = null; vid.classList.remove('on');
  await sleep(skipped ? 300 : 900);
  vid.pause(); moment = null;
}

// ------------------------------------------------------------------ the descent: hands, wheel and a slow drift
let SPEED = 0.00185; // progress per second when left alone (about nine minutes to the bottom)
function nudge(dp) { if (!dived || ended || moment || awaitingLamp || rising) return; vp += dp; hint(null); }
addEventListener('wheel', (e) => { nudge(e.deltaY * 0.000035); }, { passive: true });
let last = null;
addEventListener('pointerdown', (e) => {
  pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY; last = e.clientY;
  if (!e.target.closest('button, a')) { lamp.tx = e.clientX / W; lamp.ty = e.clientY / H; lampMoved = performance.now(); }
  if (awaitingHold) { holding = true; }
  tapCreature(e.clientX, e.clientY);
});
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  if ((!coarse || pointer.down) && !e.target.closest('button, a')) { lamp.tx = e.clientX / W; lamp.ty = e.clientY / H; lampMoved = performance.now(); }
  if (pointer.down && last != null) { nudge((last - e.clientY) / H * 0.045); last = e.clientY; }
});
addEventListener('pointerup', () => { pointer.down = false; last = null; holding = false; });
addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === ' ') nudge(0.01); if (e.key === 'ArrowUp') nudge(-0.01); });
// iOS: no page bounce, no zoom under the finger
document.addEventListener('touchmove', (e) => { if (!e.target.closest('button, a, #end')) e.preventDefault(); }, { passive: false });
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

$('lamp').onclick = (e) => { e.stopPropagation(); lampOn = !lampOn; audio.sfx('sfx/lamp.mp3', 0.8); $('lamp').classList.toggle('off', !lampOn); $('lamp').classList.remove('call');
  if (!lampOn && awaitingLamp) { awaitingLamp = false; hint(null); bloom(); } };

// lamp off in the midnight zone: the ocean lights itself
function bloom() {
  audio.sfx('sfx/glow.mp3', 0.9, 0.8);
  for (let i = 0; i < 160; i++) sparks.push({ x: Math.random(), y: Math.random(), t: -Math.random() * 6, life: 1.5 + Math.random() * 3, hue: Math.random() < 0.8 ? 195 : 165, r: 1 + Math.random() * 3 });
  setTimeout(() => say('z3c'), 900);
  setTimeout(() => { if (!lampOn) { lampOn = true; $('lamp').classList.remove('off'); audio.sfx('sfx/lamp.mp3', 0.6); } }, 16000);
}

// ------------------------------------------------------------------ where creatures are on screen
const placed = [];
function screenPos(c, k = 0) {
  const n = c.many || 1, ph = k / n;
  let x = c.x + (n > 1 ? (ph - 0.5) * 0.5 : 0), y;
  if (c.axis === 'h') { // gliding over the plain: the floor stays, the animals pass by sideways
    x = c.x + (c.p - p) * K * 0.9 * (H / W); y = c.floor ? 0.66 : 0.5;
  } else y = 0.5 + (c.p - p) * K + (n > 1 ? Math.sin(k * 2.3) * 0.12 : 0);
  return [x * W, y * H];
}
function tapCreature(x, y) {
  if (!dived || moment) return;
  for (const o of placed) {
    if (x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1) {
      const lit = o.c.glow || lampLight(x, y) > 0.25 || dark < 0.5;
      if (!lit) continue;
      discover(o.c.id); card(o.c, x + 18, y - 40); audio.sfx('sfx/tap.mp3', 0.7, 1.2);
      return;
    }
  }
}
let dark = 0;
const lampLight = (x, y) => { if (!lampOn) return 0; const d = Math.hypot(x - lamp.x * W, y - lamp.y * H); return clamp(1 - d / (lamp.r || 1), 0, 1); };

// ------------------------------------------------------------------ the loop
let prev = performance.now(), hud = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (!document.hidden) { step(dt, now / 1000); draw(now / 1000); idleVids(now / 1000); }
  requestAnimationFrame(frame);
}
function step(dt, time) {
  if (dived && !ended && !moment && !awaitingLamp && !awaitingHold && !rising) {
    const drift = SPEED * (audio.speaking ? 0.45 : 1);
    p = clamp(p + drift * dt + vp * Math.min(1, dt * 6), 0, 0.97);
    vp *= Math.pow(0.02, dt);
  }
  if (rising) { p = Math.max(0, p - dt * 0.17); if (p <= 0) finishRise(); }
  const d = depthAt(p);
  // triggers
  if (dived && !ended && !rising) {
    for (const [id, at] of LINES) if (p >= at && !spoken.has(id)) say(id);
    for (const m of M) if (p >= m.p - 0.0005 && !spoken.has('m-' + m.id) && m.id !== 'bottom') { spoken.add('m-' + m.id); playMoment(m); break; }
    for (const e of ENVC) if (p >= e.p && !spoken.has('e-' + e.id)) { spoken.add('e-' + e.id); if (discover(e.id)) card(e, W * 0.06, H * 0.18); }
    if (p >= 0.258 && !lampAllowed) { lampAllowed = true; lampOn = true; $('lamp').classList.add('show'); audio.sfx('sfx/lamp.mp3', 0.8); say('z2d'); }
    if (p >= 0.33 && !lampAsked) { lampAsked = true; awaitingLamp = true; say('z3b'); hint('lampOff'); $('lamp').classList.add('call'); setTimeout(() => { if (awaitingLamp) { awaitingLamp = false; hint(null); lampOn = false; $('lamp').classList.add('off'); bloom(); } }, 15000); }
    if (p >= 0.95 && !spoken.has('z5c')) { say('z5c'); }
    if (p >= 0.97 && !awaitingHold && !spoken.has('m-bottom')) { awaitingHold = true; hint('hold'); }
  }
  if (awaitingHold) {
    holdT = holding ? holdT + dt : Math.max(0, holdT - dt * 2);
    if (holdT > 1.3 && !spoken.has('m-bottom')) { spoken.add('m-bottom'); awaitingHold = false; hint(null); bottom(); }
  }
  // zone bed, lamp
  setBed(zoneOf(d));
  if (performance.now() - lampMoved > 5000) { lamp.tx = lerp(lamp.tx, 0.5, dt * 0.6); lamp.ty = lerp(lamp.ty, 0.48, dt * 0.6); } // left alone, the lamp drifts back to the middle
  lamp.x = lerp(lamp.x, lamp.tx, Math.min(1, dt * 6)); lamp.y = lerp(lamp.y, lamp.ty, Math.min(1, dt * 6));
  lamp.k = lerp(lamp.k, lampOn ? 1 : 0, Math.min(1, dt * 3));
  lamp.r = Math.min(W, H) * (coarse ? 0.36 : 0.3);
  dark = smooth(120, 900, d);
  // the HUD, a few times a second
  if ((hud -= dt) < 0) { hud = 0.12; updHud(d); }
}
function updHud(d) {
  $('h-depth').textContent = Math.round(d).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
  $('h-zone').textContent = t('z')[zoneOf(d)];
  $('h-temp').textContent = `${tempAt(d).toFixed(1).replace('.', lang === 'fr' ? ',' : '.')} °C`;
  $('h-press').textContent = `${Math.round(1 + d / 10.06).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} atm`;
  const l = lightAt(d); $('h-light').textContent = l >= 1 ? `${Math.round(l)} %` : l > 0.0005 ? (lang === 'fr' ? '< 1 %' : '< 1 %') : '0 %';
  $('h-mark').style.top = `${(d / 10935) * 100}%`;
}

function drawImg(name, x, y, w, alpha = 1, flip = false, rot = 0) {
  const im = img(name); if (!im.complete || !im.naturalWidth) return null;
  const h = w * im.naturalHeight / im.naturalWidth;
  g.save(); g.globalAlpha = alpha; g.translate(x, y); if (rot) g.rotate(rot); if (flip) g.scale(-1, 1);
  g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}
function drawBg(name, alpha, zoom = 1) {
  if (alpha <= 0.002) return; const im = bgImg(name); if (!im.complete || !im.naturalWidth) return;
  const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom, w = im.naturalWidth * s, h = im.naturalHeight * s;
  g.globalAlpha = alpha; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); g.globalAlpha = 1;
}
function drawEnv(e, alpha, time) {
  if (alpha <= 0.002) return;
  const v = useVid(e.id, time);
  if (!v) return drawBg(e.still, alpha);
  const s = Math.max(W / v.videoWidth, H / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
  g.globalAlpha = alpha; g.drawImage(v, (W - w) / 2, (H - h) / 2, w, h); g.globalAlpha = 1;
}
// a filmed creature: its loop, cropped to the animal, the black water dropped by a screen blend
function drawVid(c, x, y, w, alpha, mode, time) {
  const v = useVid('c-' + c.id, time), bb = (SIZES[c.id] || {}).bb;
  if (!v || !bb) { g.save(); g.globalCompositeOperation = mode; const r = drawImg(c.id, x, y, w, alpha); g.restore(); return r; }
  const m = 0.04, sx = Math.max(0, bb[0] - m) * v.videoWidth, sy = Math.max(0, bb[1] - m) * v.videoHeight;
  const sw = Math.min(1, bb[2] + m) * v.videoWidth - sx, sh = Math.min(1, bb[3] + m) * v.videoHeight - sy, h = w * sh / sw;
  g.save(); g.globalCompositeOperation = mode; g.globalAlpha = alpha; g.drawImage(v, sx, sy, sw, sh, x - w / 2, y - h / 2, w, h); g.restore();
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}
function draw(time) {
  const d = depthAt(p), [r, gg, b] = waterAt(d);
  // water: lighter above, darker below
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, `rgb(${Math.min(255, r * 1.35) | 0},${Math.min(255, gg * 1.3) | 0},${Math.min(255, b * 1.25) | 0})`);
  grd.addColorStop(1, `rgb(${(r * 0.6) | 0},${(gg * 0.6) | 0},${(b * 0.65) | 0})`);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if (!dived) { drawEnv({ id: 'env-surface', still: 'bg-surface' }, 1, time); return; }
  // pictures of places
  let envLit = 0;
  for (const e of ENV) { const a = e.a(p); drawEnv(e, a, time); if (e.id === 'env-plain' || e.id === 'env-trench') envLit = Math.max(envLit, a); }
  // sunbeams in the first metres
  const rays = 0; // the filmed water has its own sunbeams
  if (rays > 0.01) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = W * (0.15 + i * 0.15) + Math.sin(time * 0.3 + i) * 30, w = W * 0.05;
      const rg = g.createLinearGradient(0, 0, 0, H); rg.addColorStop(0, `rgba(255,240,200,${0.16 * rays})`); rg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = rg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 3 - 60, H); g.lineTo(x - w * 2 + 60, H); g.fill();
    }
    g.restore();
  }
  // creatures
  placed.length = 0; const glows = [];
  for (const c of C) {
    for (let k = 0; k < (c.many || 1); k++) {
      let [x, y] = screenPos(c, k);
      if (y < -H * 0.6 || y > H * 1.6 || x < -W || x > 2 * W) continue;
      if (c.rise) y -= ((time * 22 + k * 90) % (H * 0.8)) - H * 0.4; // the nightly climb, in miniature
      if (c.drift) { x += Math.sin(time * 0.4 + k) * 18; y += Math.sin(time * 0.6 + k * 2) * 14; }
      if (c.swim) { x += Math.sin(time * 0.5 + k * 1.3) * 26; y += Math.cos(time * 0.7 + k) * 8; }
      if (c.walk) x += ((time * 6) % 60) - 30;
      const w = (c.s * Math.min(H, W * 1.15) * (SIZES[c.id] ? SIZES[c.id].w / Math.max(SIZES[c.id].h, 1) : 1.6)) * (c.many > 1 ? 0.75 + (k % 3) * 0.15 : 1);
      if (c.glow) { glows.push([c, x, y, w, k]); continue; }
      const bb = c.vid ? drawVid(c, x, y, w, 1, 'screen', time) : drawImg(c.id, x, y, w, 1);
      if (bb) placed.push({ c, x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] });
      if (c.lure) glows.push(['lure', bb ? bb[0] + (bb[2] - bb[0]) * c.lure[0] : x, bb ? bb[1] + (bb[3] - bb[1]) * c.lure[1] : y]);
      if (c.tail) glows.push(['tail', bb ? bb[0] + (bb[2] - bb[0]) * c.tail[0] : x, bb ? bb[1] + (bb[3] - bb[1]) * c.tail[1] : y]);
    }
  }
  // marine snow (only seen where light falls, so drawn before the dark)
  const snowA = smooth(0.03, 0.2, p);
  if (snowA > 0) {
    g.fillStyle = 'rgba(220,235,255,0.75)';
    for (const s of SNOW) {
      const y = ((s.y - p * K * s.z * 0.9 + time * 0.012 * s.z) % 1 + 1) % 1;
      g.globalAlpha = snowA * s.z * 0.8; g.beginPath(); g.arc(s.x * W + Math.sin(time * 0.3 + s.y * 9) * 6, y * H, s.r * s.z, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  // the dark, with the lamp's pool of light cut out of it
  if (dark > 0.01) {
    const q = 4, dw = Math.ceil(W / q), dh = Math.ceil(H / q);
    if (dk.width !== dw || dk.height !== dh) { dk.width = dw; dk.height = dh; }
    dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, dw, dh);
    dg.fillStyle = `rgba(0,2,6,${0.985 * dark * (1 - 0.7 * envLit)})`; dg.fillRect(0, 0, dw, dh); // the filmed places carry their own lamp pool
    if (lamp.k > 0.01) {
      dg.globalCompositeOperation = 'destination-out';
      const lx = lamp.x * dw, ly = lamp.y * dh, lr = lamp.r / q * (0.9 + Math.sin(time * 2.1) * 0.02);
      const lg = dg.createRadialGradient(lx, ly, 0, lx, ly, lr);
      lg.addColorStop(0, `rgba(0,0,0,${lamp.k})`); lg.addColorStop(0.55, `rgba(0,0,0,${0.85 * lamp.k})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = lg; dg.beginPath(); dg.arc(lx, ly, lr, 0, 7); dg.fill();
    }
    g.drawImage(dk, 0, 0, W, H);
    // a warm tint inside the beam
    if (lamp.k > 0.01) {
      const lx = lamp.x * W, ly = lamp.y * H, lg = g.createRadialGradient(lx, ly, 0, lx, ly, lamp.r);
      lg.addColorStop(0, `rgba(255,205,140,${0.12 * lamp.k * dark})`); lg.addColorStop(1, 'rgba(255,205,140,0)');
      g.fillStyle = lg; g.fillRect(lx - lamp.r, ly - lamp.r, lamp.r * 2, lamp.r * 2);
    }
  }
  // what makes its own light shows through the dark
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const gl of glows) {
    if (gl[0] === 'lure' || gl[0] === 'tail') {
      const [kind, x, y] = gl, rr = kind === 'lure' ? 26 : 14, a = 0.7 + Math.sin(time * 3) * 0.25;
      const lg = g.createRadialGradient(x, y, 0, x, y, rr); lg.addColorStop(0, kind === 'lure' ? `rgba(190,240,255,${a})` : `rgba(255,120,170,${a})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); continue;
    }
    const [c, x, y, w, k] = gl, pulse = c.id === 'atolla' ? 0.55 + 0.45 * Math.abs(Math.sin(time * 2.6 + k)) : 0.85 + 0.15 * Math.sin(time * 1.3 + k);
    const bb = c.vid ? drawVid(c, x, y, w, Math.min(1, pulse + 0.3), 'lighter', time) : drawImg(c.id, x, y, w, pulse);
    if (bb) placed.push({ c, x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] });
  }
  if (sparks.length) {
    for (const s of sparks) {
      s.t += 1 / 60; if (s.t < 0) continue;
      const k = s.t / s.life, a = Math.sin(Math.PI * clamp(k, 0, 1)) * (lampOn ? 0.4 : 1);
      const x = s.x * W, y = s.y * H, rr = s.r * 6;
      const lg = g.createRadialGradient(x, y, 0, x, y, rr); lg.addColorStop(0, `hsla(${s.hue},100%,75%,${a})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    sparks = sparks.filter((s) => s.t < s.life);
  }
  g.restore();
}
// ------------------------------------------------------------------ start, dive, bottom, rise
async function start() {
  audio.unlock(); started = true; for (const v of Object.values(VIDS)) v.play().catch(() => {});
  document.body.classList.add('in');
  await loadTimings(lang);
  audio.loop('music', 'sfx/theme.mp3', 'music', 0.5, 4); audio.setMusic(true);
  setBed(0);
  await sleep(1200);
  await say('s0');
  hint('touchSea');
  await new Promise((r) => addEventListener('pointerdown', r, { once: true }));
  hint(null); audio.sfx('sfx/dive.mp3', 1);
  dived = true; document.body.classList.add('dived');
  setTimeout(() => { if (!spoken.has('z1a')) hint('scroll'); setTimeout(() => hint(null), 6000); }, 1500);
}
async function bottom() {
  audio.sfx('sfx/touch.mp3', 1);
  await playMoment(M.find((m) => m.id === 'bottom'));
  await say('z5e'); hint('letGo');
  await new Promise((r) => { const c = () => { if (!pointer.down) r(); else setTimeout(c, 120); }; setTimeout(c, 400); });
  hint(null); audio.sfx('sfx/rise.mp3', 1); rising = true;
}
async function finishRise() {
  if (ended) return; ended = true; rising = false;
  audio.sfx('sfx/surface.mp3', 1); dived = false; document.body.classList.remove('dived'); setBed(0);
  await sleep(800); await say('end'); await sleep(600);
  const grid = $('grid');
  grid.innerHTML = [...ENVC, ...C, ...M].map((c) => `<figure class="${found.has(c.id) ? '' : 'no'}"><img src="art/${M.includes(c) ? 'm-' + c.id : c.id}.webp" alt=""><figcaption>${c[lang][0]}</figcaption></figure>`).join('');
  $('count').textContent = `${found.size} ${t('of')} ${total} ${t('count')}`;
  $('end').classList.add('on');
}
$('again').onclick = () => location.reload();
$('go').onclick = () => { if (!started) start(); };
for (const b of document.querySelectorAll('[data-lang]')) b.onclick = async (e) => { e.stopPropagation(); lang = b.dataset.lang; store.set('abysses-lang', lang); texts(); await loadTimings(lang); };
// pause when the page is hidden
document.addEventListener('visibilitychange', () => { audio.pause(document.hidden); if (document.hidden) vid.pause(); else if (moment) vid.play().catch(() => {}); });
// keep the screen on
let wl = null; addEventListener('pointerdown', async () => { try { if ('wakeLock' in navigator && (!wl || wl.released)) wl = await navigator.wakeLock.request('screen'); } catch {} }, { capture: true });

texts(); loadTimings(lang);
bgImg('bg-surface'); bgImg('bg-shallow'); vidEl('env-surface'); vidEl('env-shallow');
requestAnimationFrame(frame);
window.__abysses = { get p() { return p; }, set p(v) { p = v; }, set speed(v) { SPEED = v; }, get state() { return { p, moment: !!moment, awaitingLamp, awaitingHold, rising, ended }; }, audio, say, M, C, start };
