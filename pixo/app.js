// La Grande Chasse de Pixo: the game. Pixo, a filmed little alien, appears in the room through the phone; the
// family finds the six printed cards hidden in the house; each card opens a portal where a piece of his ship comes
// back, guarded by a mini-game drawn at random (catch the stars flying around the room, a colour hunt in the real
// house, the antenna's memory game, cooling the engine by blowing or tapping, a quiz for every age), so no two hunts
// are alike. Everyone earns stars; the family record is kept on this device. Nothing is sent anywhere.
import * as THREE from 'three';
import { Room, FLOOR } from './room.js';
import { LivingPortal } from './portal.js';
import { World, xrSupported } from './world.js';
import { EPISODES, episode } from './episodes.js';
import { BADGES, earn, count as badgeCount, has as hasBadge, finishEpisode, done as epDone, allDone, unlocked, unlockAll, badgeImg } from './badges.js';
import { LINES } from './lines.js';
import { challenge, SPOTS, AVATARS, shuffle, pick, R } from './games.js';
import { LANG, EN, t as tr, translatePage, switchLang } from './i18n.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = new URLSearchParams(location.search), TEST = Q.has('test'), FAST = TEST && !Q.has('anim'); // test hooks: short voices, and short animations unless &anim
const T = (ms) => (FAST ? Math.min(ms, 120) : ms);
const L = LINES[LANG];
const PCOL = ['#ff6fa0', '#3b9cff', '#f59e0b', '#9a5cf0', '#22b98c', '#ef4f6b'];
const AGES = EN ? [['p', '3-5 yrs', 'Little'], ['m', '6-8 yrs', 'Middle'], ['g', '9-12 yrs', 'Big'], ['a', 'Adult', 'Grown-ups']] : [['p', '3-5 ans', 'Petits'], ['m', '6-8 ans', 'Moyens'], ['g', '9-12 ans', 'Grands'], ['a', 'Adulte', 'Parents']];
const KEY = 'grande-chasse', RECORD = 'grande-chasse-record';
const CARDCOL = ['#2fa8e0', '#f2742b', '#f2bf1b', '#8d63e0', '#2fb86a', '#e8456f'];
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const S = { ep: 'e1', newBadges: [], quizN: 0, quizMiss: false, phase: 'home', players: [], spots: {}, mode: 'cam', next: 1, got: 0, order: [1, 2, 3, 4, 5, 6], plan: [], hides: [], stars: 0, hunting: false, seen: 0, music: true, want: 0 };
let room, world, ac, master, musicGain, mind = null, wake = null;
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ ep: S.ep, quizN: S.quizN, quizMiss: S.quizMiss, players: S.players, spots: S.spots, mode: S.mode, next: S.next, got: S.got, order: S.order, plan: S.plan, hides: S.hides, stars: S.stars })); } catch {} };
const forget = () => { try { sessionStorage.removeItem(KEY); } catch {} };

// ------------------------------------------------------------------ the adventure being played
const EP = () => episode(S.ep);
const ln = (id) => (L[`${id}_${S.ep}`] ? `${id}_${S.ep}` : id);           // this adventure's version of a line, if it has one
const item = (p) => EP().item(p);                                           // the picture of thing number p (parts/<item>.png)
// a badge won: a little medal drops in at the top of the screen, and it waits on the end screen
function badge(id) {
  if (!earn(id)) return; S.newBadges.push(id); const b = BADGES.find((x) => x.id === id), t = $('#toast');
  t.querySelector('img').src = badgeImg(id); t.querySelector('b').textContent = b.name[LANG]; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  sfx('found', 0.9, 1.25); setTimeout(() => t.classList.remove('on'), 3200);
}

// ------------------------------------------------------------------ sound: voice placed in the room, real effects, a music bed
const buf = {};
function load(path) {
  if (!buf[path]) buf[path] = fetch(path).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => ac.decodeAudioData(b)).catch(() => null);
  return buf[path];
}
const vpath = (id) => `audio/${LANG}/${id}.mp3`, spath = (n) => `sfx/${n}.mp3`;
async function sfx(name, vol = 1, rate = 1) {
  if (!ac) return; const b = await load(spath(name)); if (!b) return;
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g).connect(master); s.start(); return s;
}
// a soft marimba note (Simon pads)
function note(f, len = 0.35) {
  if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 4; const g2 = ac.createGain(); g2.gain.value = 0.08;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(g); o2.connect(g2).connect(g); g.connect(master); o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
}
let scanLoop = null;
async function scanHum(on) {
  if (!ac) return; if (scanLoop) { try { scanLoop.stop(); } catch {} scanLoop = null; }
  if (on) { const b = await load(spath('scan')); if (!b || scanLoop) return; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0.55; s.connect(g).connect(master); s.start(); scanLoop = s; }
}
async function startMusic() {
  if (!ac || musicGain) return; const b = await load(spath('music')); if (!b) return;
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; musicGain = ac.createGain(); musicGain.gain.value = 0; s.connect(musicGain).connect(master); s.start();
  duck(false);
}
function duck(on) { if (!musicGain) return; const v = !S.music ? 0 : on ? 0.1 : 0.3; musicGain.gain.setTargetAtTime(v, ac.currentTime, on ? 0.12 : 0.6); }
let voice = null, sayTok = 0;
function stopVoice() { try { voice?.src.stop(); } catch {} voice = null; }
async function playVoice(id) {
  const b = ac && await load(vpath(id)); stopVoice();
  if (!b || TEST) return wait(TEST ? 150 : 1500 + (L[id] || '').length * 55);
  const src = ac.createBufferSource(); src.buffer = b;
  const pan = ac.createStereoPanner(), g = ac.createGain(); src.connect(g).connect(pan).connect(master);
  const v = voice = { src, pan, g }; src.start(); duck(true);
  return new Promise((res) => { src.onended = () => { if (voice === v) { voice = null; duck(false); } res(); }; });
}
const clip = (name) => (room.walking || room.jumping ? wait(400) : Promise.race([room.pixo.play(name), wait(TEST ? 100 : 7000)])); // not while he walks or jumps
// Pixo says a line: the words on screen, the voice from where he stands, his body moving while he talks
async function say(id, first = 'talk', prefix = '') {
  const my = ++sayTok; const el = $('#say'), txt = L[id] || ''; if (TEST) console.warn('say ' + id);
  el.querySelector('p').textContent = prefix ? prefix + txt.charAt(0).toLowerCase() + txt.slice(1) : txt; el.classList.add('on');
  let ended = false; const a = playVoice(id).then(() => { ended = true; });
  if (first && room.pixo.g.visible) (async () => { let c = first; while (!ended && my === sayTok) { await clip(c); c = 'talk'; } })();
  await a;
  setTimeout(() => { if (my === sayTok) el.classList.remove('on'); }, 1400);
  return my === sayTok; // false when another line cut this one
}
async function says(ids, first) { for (const id of ids) { if (!await say(id, first)) return; first = 'talk'; } }
const cheer = () => pick(['good1', 'good2', 'good3', 'good4', 'good5', 'good6']);

// ------------------------------------------------------------------ screens, score
function screen(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); }
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
const avatarSrc = (av) => `img/ic/av_${av}.webp`;
function addStars(p, n) {
  if (n <= 0) return; p.stars = (p.stars || 0) + n; S.stars += n; const el = $('#score'); el.querySelector('b').textContent = S.stars;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function banner(p, timer = '', count = null) {
  const m = $('#mini'); m.style.setProperty('--c', p.color); m.querySelector('.av').src = avatarSrc(p.av); m.querySelector('.who').textContent = p.name;
  m.querySelector('.timer').textContent = timer; m.querySelector('.timer').style.display = timer === '' ? 'none' : ''; m.querySelector('.count').style.display = count == null ? 'none' : '';
  if (count != null) m.querySelector('.count b').textContent = count; m.classList.add('on'); document.body.classList.add('mini');
}
const unbanner = () => { $('#mini').classList.remove('on'); document.body.classList.remove('mini'); };
const order = (k) => S.players.map((_, i) => S.players[(i + k - 1) % S.players.length]);

// ------------------------------------------------------------------ setup wizard (kept in memory and in this tab only)
let step = 0;
function playerRow(i, name = '', age = 'm', av) {
  av = av || AVATARS[i % AVATARS.length][0];
  const d = document.createElement('div'); d.className = 'player'; d.dataset.av = av; d.dataset.age = age;
  d.innerHTML = `<div class="top"><input maxlength="14" placeholder="${tr('Prénom', 'First name')}" autocomplete="off" enterkeyhint="done"><button class="x" aria-label="${tr('Retirer', 'Remove')}">✕</button></div>
    <div class="avs">${AVATARS.map(([a, l]) => `<button data-a="${a}" aria-label="${l}" class="${a === av ? 'on' : ''}"><img src="${avatarSrc(a)}" alt=""></button>`).join('')}</div>
    <div class="ages">${AGES.map(([a, l, s]) => `<button data-g="${a}" class="${a === age ? 'on' : ''}">${l}<small>${s}</small></button>`).join('')}</div>`;
  d.querySelector('input').value = name;
  d.querySelectorAll('.avs button').forEach((b) => b.onclick = () => { d.dataset.av = b.dataset.a; d.querySelectorAll('.avs button').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap', 0.6); });
  d.querySelectorAll('.ages button').forEach((b) => b.onclick = () => { d.dataset.age = b.dataset.g; d.querySelectorAll('.ages button').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap', 0.6); });
  d.querySelector('.x').onclick = () => { if ($('#players').children.length > 1) d.remove(); };
  $('#players').append(d);
}
const spotLabel = (id) => (SPOTS.find((s) => s[0] === id) || SPOTS[0])[1];
function spotRow(k, def) {
  const d = document.createElement('div'); d.className = 'spot'; d.dataset.k = k; d.dataset.spot = def;
  const draw = () => { d.innerHTML = `<img src="cards/c${k}.jpg" alt="${tr('Carte', 'Card')} ${k}"><button class="pickbtn"><img src="img/ic/${d.dataset.spot}.webp" alt="">${spotLabel(d.dataset.spot)}<em>${tr('Changer', 'Change')}</em></button>`; d.querySelector('.pickbtn').onclick = open; };
  const open = () => {
    $('#spotpick h2 span').textContent = k; const g = $('#spotpick .grid');
    g.innerHTML = SPOTS.map(([id, l]) => `<button data-s="${id}" class="${id === d.dataset.spot ? 'on' : ''}"><img src="img/ic/${id}.webp" alt="">${l}</button>`).join('');
    g.querySelectorAll('button').forEach((b) => b.onclick = () => { d.dataset.spot = b.dataset.s; sfx('tap', 0.6); draw(); screen('setup'); });
    screen('spotpick');
  };
  draw(); $('#spots').append(d);
}
function showStep(n) {
  step = n; document.querySelectorAll('.step').forEach((s) => s.classList.toggle('on', +s.dataset.step === n));
  document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i <= n)); $('.wstep').textContent = `${n + 1}/4`;
  $('#wnext').textContent = n === 3 ? tr('Lancer la chasse', 'Start the hunt') : tr('Suivant', 'Next'); $('#setup').scrollTop = 0;
}
function setup() {
  playerRow(0);
  $('#addp').onclick = () => { const n = $('#players').children.length; if (n >= 6) return; const used = [...document.querySelectorAll('.player')].map((p) => p.dataset.av); playerRow(n, '', 'm', AVATARS.map((a) => a[0]).find((a) => !used.includes(a))); };
  shuffle(SPOTS.map((s) => s[0])).slice(0, 5).forEach((s, i) => spotRow(i + 2, s));
  S.mode = matchMedia('(pointer: coarse)').matches ? 'cam' : 'nocam';
  const modes = document.querySelectorAll('.modes button');
  const setMode = (m) => { S.mode = m; modes.forEach((x) => x.classList.toggle('on', x.dataset.mode === m)); };
  modes.forEach((b) => b.onclick = () => { setMode(b.dataset.mode); sfx('tap', 0.6); }); setMode(S.mode);
  $('#toSetup').onclick = () => { unlockAudio(); showEpisodes(); };
  $('#bookbtn').onclick = () => { unlockAudio(); showBook(); }; $('#bookclose').onclick = () => screen(bookBack); $('#epsback').onclick = () => screen('home');
  $('#unlockall').onclick = () => { if (confirm(tr('Débloquer toutes les aventures ?', 'Unlock every adventure?'))) { unlockAll(); showBook(); } };
  $('#tobook').onclick = () => showBook('end'); $('#nextep').onclick = () => { forget(); S.ep = $('#nextep').dataset.ep; S.phase = 'home'; sfx('tap', 0.7); screen('setup'); showStep(2); }; // same explorers: hide the cards again and go
  refreshHome();
  $('#howbtn').onclick = () => screen('how'); $('#howok').onclick = () => { unlockAudio(); showEpisodes(); };
  const want = new URLSearchParams(location.search).get('ep'); if (want && EPISODES.some((e, i) => e.id === want && unlocked(i))) { S.ep = want; }
  $('#wback').onclick = () => (step === 0 ? screen('home') : showStep(step - 1));
  $('#wnext').onclick = () => { sfx('tap', 0.7); if (step < 3) showStep(step + 1); else go(false); };
  $('#again').onclick = () => { forget(); location.reload(); };
  $('#dl').onclick = downloadDiploma;
  $('#pausebtn').onclick = () => { screen('pause'); ac?.suspend(); };
  $('#presume').onclick = () => { screen(null); ac?.resume(); };
  $('#pmusic').onclick = () => { S.music = !S.music; $('#pmusic').textContent = tr(`Musique : ${S.music ? 'oui' : 'non'}`, `Music: ${S.music ? 'on' : 'off'}`); duck(false); };
  $('#prestart').onclick = () => { forget(); location.reload(); };
  let rec = null; try { rec = JSON.parse(localStorage.getItem(RECORD) || 'null'); } catch {}
  if (rec?.stars) { const f = document.createElement('li'); f.innerHTML = tr(`Record : <b>${rec.stars} étoiles</b>`, `Record: <b>${rec.stars} stars</b>`); $('.facts').append(f); }
  // a hunt in progress in this tab (the page was reloaded): offer to go on
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
  if (saved?.players?.length && saved.next > 1) {
    const b = $('#resume'); b.hidden = false; b.textContent = saved.next > 6 ? tr('Reprendre : le grand final', 'Resume: the grand finale') : tr(`Reprendre la chasse (carte ${saved.next} sur 6)`, `Resume the hunt (card ${saved.next} of 6)`);
    b.onclick = () => { Object.assign(S, saved); unlockAudio(); go(true); };
  }
}
// the adventures: a cover, a title, a little story; locked until the one before is finished
function refreshHome() { $('#bookbtn b').textContent = `${badgeCount()}/${BADGES.length}`; }
function showEpisodes() {
  const list = $('#eps .list'); list.innerHTML = EPISODES.map((e, i) => { const open = unlocked(i), fin = epDone(e.id);
    return `<button class="ep ${open ? '' : 'locked'} ${fin ? 'done' : ''}" data-ep="${e.id}" style="--c:${e.col}" ${open ? '' : 'aria-disabled="true"'}>
      <img src="${e.cover}" alt=""><span class="num">${e.n}</span><div><b>${e.title[LANG]}</b><span>${open ? e.pitch[LANG] : tr(`Finissez l’aventure ${e.n - 1} pour l’ouvrir`, `Finish adventure ${e.n - 1} to open it`)}</span></div>
      ${fin ? `<img class="medal" src="${badgeImg('ep_' + e.id)}" alt="">` : open ? '' : '<i class="lock">🔒</i>'}</button>`; }).join('');
  list.querySelectorAll('.ep').forEach((b, i) => b.onclick = () => { if (!unlocked(i)) { sfx('bad', 0.5); return; } sfx('tap', 0.7); S.ep = b.dataset.ep; screen('setup'); showStep(0); });
  screen('eps');
}
// the badge book: earned medals shine, the others wait in grey with how to win them
let bookBack = 'home';
function showBook(from = 'home') {
  bookBack = from; $('#toast').classList.remove('on'); $('#book .count').textContent = `${badgeCount()} / ${BADGES.length}`;
  $('#book .grid').innerHTML = BADGES.map((b) => `<div class="bd ${hasBadge(b.id) ? 'got' : ''} ${S.newBadges.includes(b.id) ? 'new' : ''}"><img src="${badgeImg(b.id)}" alt=""><b>${b.name[LANG]}</b><span>${b.how[LANG]}</span></div>`).join('');
  $('#unlockall').hidden = EPISODES.every((e, i) => unlocked(i));
  screen('book');
}
function readSetup() {
  S.players = [...document.querySelectorAll('.player')].map((d, i) => ({ name: d.querySelector('input').value.trim() || `${tr('Explorateur', 'Explorer')} ${i + 1}`, age: d.dataset.age, av: d.dataset.av, color: PCOL[i % PCOL.length], stars: 0 }));
  document.querySelectorAll('.spot').forEach((d) => { S.spots[+d.dataset.k] = d.dataset.spot; });
  S.next = 1; S.got = 0; S.stars = 0;
  // every hunt is different: which piece hides on which card, which mini-game guards it, when Pixo hides
  S.order = shuffle([1, 2, 3, 4, 5, 6]);
  const games = ['stars', 'simon', 'blow', S.mode === 'cam' ? 'color' : 'stars', 'quiz', 'quiz'];
  let plan; do { plan = shuffle(games); } while (plan[0] === 'blow' || plan.some((g, i) => i && g === plan[i - 1]));
  S.plan = plan; S.hides = shuffle([2, 3, 4, 5, 6]).slice(0, 3);
}
function drawSlots() { $('#slots').innerHTML = S.order.map((p, i) => `<i class="${i < S.got ? 'got' : ''}" style="background-image:url(parts/${item(p)}.png)"></i>`).join(''); $('#score b').textContent = S.stars; }

// ------------------------------------------------------------------ start (a tap, so sound, video and motion sensors may start)
function unlockAudio() {
  if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.95; master.connect(ac.destination); ac.resume();
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} // iPhone: play even with the silent switch on
  for (const n of ['engine', 'poof', 'appear', 'tap', 'portal', 'part', 'good', 'bad', 'found', 'slot', 'detect', 'giggle']) load(spath(n));
}
async function keepAwake() { try { wake = await navigator.wakeLock?.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.phase !== 'home' && S.phase !== 'end') keepAwake(); });

async function go(resume) {
  if (!resume) { readSetup(); S.quizN = 0; S.quizMiss = false; }
  S.newBadges = []; $('#blow .gauge span').textContent = EP().heat[LANG];
  unlockAudio(); room.pixo.unlock(); keepAwake(); save(); drawSlots();
  screen(null); document.body.classList.add('playing'); S.phase = 'start';
  if (S.mode === 'cam') {
    const g = room.startGyro(); let ok = await startMind();
    while (!ok) { const choice = await camFail(); if (choice === 'skip') break; ok = await startMind(); }
    await g; if (!ok) S.mode = 'nocam';
  }
  // Android: the real room (Pixo walks on the real floor, climbs real chairs, hides behind real things)
  S.xr = S.mode === 'cam' && !Q.has('noxr') && await xrSupported();
  if (S.xr) S.plan = S.plan.map((g) => (g === 'color' ? 'stars' : g)); // the colour hunt reads the camera picture, which the real room keeps to itself
  if (S.mode === 'nocam') { room.drawRoom(); room.pitch = -0.42; if (!resume) S.plan = S.plan.map((g) => (g === 'color' ? 'stars' : g)); }
  if (!room.useGyro) $('#arrow em').innerHTML = tr('Par là !<br>Glissez ou ← →', 'This way!<br>Drag or ← →');
  (async () => { for (const id of Object.keys(L)) await load(vpath(id)); })(); // the voice, in the background
  if (S.players.length >= 4) badge('team');
  if (!resume && EP().film) await introFilm();
  startMusic();
  if (resume) { await enterRoom(); await appear(await landing(S.next - 1)); await say('resume', 'hello'); } else await intro();
  for (let k = S.next; k <= 6; k++) await cardRound(k);
  await finale();
}
function camFail() { return new Promise((res) => { screen('camfail'); $('#camretry').onclick = () => { screen(null); res('retry'); }; $('#camskip').onclick = () => { screen(null); res('skip'); }; }); }
const ahead = () => (S.mode === 'nocam' ? room.floorAhead(1.6, 2.0) : room.floorAhead(0.8, 1.5));

// the opening film: Pixo's ship crashing into the house tonight
async function introFilm() {
  if (FAST) return; S.phase = 'film';
  const v = $('#intro video'); v.src = 'img/intro.mp4'; screen('intro');
  // the sounds follow the film's own clock (not a timer started before the video was ready), decoded beforehand
  await Promise.race([Promise.all(['engine', 'poof', 'appear'].map((n) => load(spath(n)))), wait(2500)]);
  const cues = [[0, 'engine', 0.5, 1.1], [4.3, 'poof', 0.9, 1], [4.7, 'appear', 0.9, 1]]; let ci = 0;
  await new Promise((res) => {
    let done = false; const end = () => { if (!done) { done = true; res(); } };
    v.onended = end; $('#skipintro').onclick = end; setTimeout(end, 14000);
    const tick = () => { if (done) return; while (ci < cues.length && !v.paused && v.currentTime >= cues[ci][0]) { const [, n, vol, rate] = cues[ci++]; sfx(n, vol, rate); if (TEST) console.warn('intro cue', n, v.currentTime.toFixed(2)); } requestAnimationFrame(tick); };
    v.addEventListener('playing', tick, { once: true }); v.play().catch(end);
  });
  v.pause(); flash(); screen(null);
}

// ------------------------------------------------------------------ Pixo appears out of a portal on the floor
async function appear(pos) {
  if (S.fromPortal) { // he has just leapt out of the card: he falls into the room and lands at the players' feet
    S.fromPortal = false; room.pixo.uni.fade.value = 0; const f = room.fade(0, 1, FAST ? 30 : 260, true);
    await room.drop(pos, 0.9, FAST ? 60 : 520); await f; sfx('hop', 0.7, 0.8); return;
  }
  flash(); sfx('portal'); const p = room.portal(pos, FAST ? 200 : 1700);
  await wait(T(500)); room.placePixo(pos); sfx('appear', 0.8); room.sparks(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), 40, [0x9ff3e0, 0xffe08a, 0xff9ad0], 1.3, 0.06);
  await room.fade(0, 1, FAST ? 50 : 600, true); await p;
}
async function intro() {
  S.phase = 'intro'; await wait(T(400));
  await appear(ahead());
  await say(ln('i1'), 'hello'); await say(ln('i2'), 'sad'); await say(ln('i3'), 'talk'); await say(ln('i4'), 'talk');
}

// ------------------------------------------------------------------ the card scanner: one camera for the whole hunt, cards open portals
// MindAR 1.2.5 has no pause: stop and restart its tracking loop by hand, the camera itself keeps running
let onCard = null;
const mindPause = () => { try { mind?.controller.stopProcessVideo(); } catch {} };
const mindResume = () => { try { mind?.controller.processVideo(mind.video); } catch (e) { console.warn('scanner restart failed', e); } };
async function startMind() {
  try {
    if (mind) { try { mind.stop(); } catch {} mind = null; $('#scanbox').innerHTML = ''; }
    const { MindARThree } = await import('mindar-image-three');
    const m = new MindARThree({ container: $('#scanbox'), imageTargetSrc: 'targets.mind', maxTrack: 1, uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: 0.0001, filterBeta: 0.001 });
    const portals = [], anchors = [];
    for (let i = 0; i < 6; i++) {
      const a = m.addAnchor(i), p = new LivingPortal(i + 1, CARDCOL[i], room.pixo); a.group.add(p.group); portals.push(p); anchors.push(a);
      a.onTargetFound = () => { if (TEST) console.warn('target seen', i + 1, 'want', S.want); onCard?.(i + 1, p); };
    }
    document.body.classList.add('cam');
    await m.start();
    if (!m.video || !m.video.srcObject) throw new Error('no camera picture');
    m.renderer.setAnimationLoop((t) => {
      for (const p of portals) if (p.group.visible) p.update(t / 1000, m.camera);
      const a = S.cardK && anchors[S.cardK - 1]; if (a && a.group.visible) cardSample(a.group); // measured while the portal opens
      room.setFov(m.camera.fov); m.renderer.render(m.scene, m.camera);
    });
    mind = m; mind.portals = portals; mindPause(); room.setFeed(m.video); return true;
  } catch (e) { console.warn('camera or card scanner unavailable', e); document.body.classList.remove('cam'); return false; }
}
// the card seen by the scanner, turned into the room's space: where it lies and which way is up from it.
// MindAR gives its pose from the phone's lens (in units of its own size): with the card's printed width and the
// gyroscope, that is where it is in the room, so Pixo can land beside it, on the surface it lies on.
const CARD_W = 0.09; // metres
function cardSample(g) {
  if (!room.useGyro) return;
  const M = g.matrix, sc = new THREE.Vector3().setFromMatrixColumn(M, 0).length(); if (!sc) return;
  const q = room.cam.quaternion, p = new THREE.Vector3().setFromMatrixPosition(M).multiplyScalar(CARD_W / sc).applyQuaternion(q);
  const n = new THREE.Vector3().setFromMatrixColumn(M, 2).normalize().applyQuaternion(q);
  const c = S.cardAt ||= { p: new THREE.Vector3(), n: new THREE.Vector3(), k: 0 }; c.k++; const w = 1 / Math.min(c.k, 12);
  c.p.lerp(p, w); c.n.lerp(n, w);
}
// where hidden cards usually lie above the floor (the parents chose the hiding places)
const ELEV = { canape: 0.42, lit: 0.5, table: 0.74, coussin: 0.4 };
// where Pixo lands after a card: beside the card on its own surface (cards on a sofa, a bed or a table: he lands
// up there, and the floor is that much lower); in the real room, where the phone points; otherwise ahead
async function landing(k) {
  S.perch = null;
  if (room.xr) return xrLanding();
  const c = S.cardAt; S.cardAt = null; S.cardK = 0; room.floorY = -FLOOR;
  if (TEST) console.warn('card pose', c ? `${c.k} samples, at ${c.p.toArray().map((x) => x.toFixed(2)).join(' ')}, up ${c.n.y.toFixed(2)}` : 'none', 'gyro', room.useGyro);
  if (!c || c.k < 3 || c.n.y < 0.75 || (k === 1 && S.got < 6)) return ahead(); // card 1 starts in a parent's hand
  const d = Math.hypot(c.p.x, c.p.z); if (d < 0.1 || d > 2.4 || c.p.y > -0.2 || c.p.y < -1.8) return ahead();
  const e = ELEV[S.spots[k]] || 0; room.floorY = Math.max(-1.7, Math.min(-0.35, c.p.y - e));
  if (e) S.perch = { y: c.p.y, t: performance.now() };
  const back = new THREE.Vector3(-c.p.x, 0, -c.p.z).normalize().multiplyScalar(0.14);
  if (TEST) console.warn('card at', c.p.toArray().map((x) => x.toFixed(2)).join(' '), 'floor', room.floorY.toFixed(2));
  return new THREE.Vector3(c.p.x + back.x, c.p.y, c.p.z + back.z);
}
// ------------------------------------------------------------------ the real room (WebXR): opened by a tap after each card
const mindStop = () => { if (!mind) return; try { mind.renderer.setAnimationLoop(null); mind.stop(); } catch {} mind = null; $('#scanbox').innerHTML = ''; document.body.classList.remove('cam'); room.setFeed(null); };
async function enterRoom() {
  if (TEST) console.warn('enter room', S.xr, room.xr);
  if (!S.xr || room.xr) return;
  screen('xrgo');
  const ok = await new Promise((res) => {
    $('#xrbtn').onclick = async () => { sfx('tap'); mindStop(); try { await world.start(document.body); res(true); } catch (e) { console.warn('real room unavailable', e); res(false); } };
    $('#xrskip').onclick = () => res(false);
  });
  screen(null);
  if (!ok) { S.xr = false; if (!mind) await startMind(); return; }
  document.body.classList.add('xr'); document.documentElement.classList.add('xr');
}
async function leaveRoom() {
  if (room.xr) { S.leaving = true; await world.end(); } // xrEnded() clears S.leaving (the end event may come late)
  if (S.mode === 'cam' && !mind) await startMind();
}
function xrEnded() { // the real room closed (by us, or the phone's back button)
  const planned = S.leaving; S.leaving = false; if (TEST) console.warn('room closed', planned ? 'by the game' : 'by the phone');
  document.body.classList.remove('xr'); document.documentElement.classList.remove('xr'); room.floorY = -FLOOR; room.cam.position.set(0, 0, 0); room.resize(); room.cam.updateProjectionMatrix();
  if (!planned && S.phase !== 'end' && S.mode === 'cam') { S.xr = false; startMind(); }
}
// he lands where the phone points: the real floor (or the surface there), once the phone has found it
async function xrLanding() {
  const h = $('#xrhint'); h.classList.add('on'); const t0 = performance.now();
  while (performance.now() - t0 < (FAST ? 300 : 9000)) {
    const c = world.center, m = room.me();
    if (c?.flat) { const d = Math.hypot(c.p.x - m.x, c.p.z - m.z);
      if (d > 0.35 && d < 4) { h.classList.remove('on'); if (d <= 2) return c.p.clone(); // farther: on the same floor, 2 m away in that direction
        const k = 2 / d; return new THREE.Vector3(m.x + (c.p.x - m.x) * k, world.floorY ?? c.p.y, m.z + (c.p.z - m.z) * k); } }
    await wait(100);
  }
  h.classList.remove('on'); return ahead();
}
async function scan(k) {
  await leaveRoom();
  S.phase = `scan${k}`; S.want = k; S.cardAt = null; S.cardK = k; const sc = $('#scan'), finale = k === 1 && S.got === 6;
  sc.querySelector('.kick').textContent = finale ? tr('Le grand final', 'The grand finale') : tr(`Carte ${k} sur 6`, `Card ${k} of 6`);
  sc.querySelector('.t').textContent = finale ? tr('Posez la carte 1 et regardez-la', 'Put card 1 down and look at it') : tr(`Montrez la carte ${k} !`, `Show card ${k}!`);
  sc.querySelector('.nocam .face').src = `cards/c${k}.jpg`; sc.querySelector('.nocam .plate').src = `img/plates/p${k}.jpg`; sc.querySelector('.cardfx').className = 'cardfx'; $('#foundbtn').textContent = tr(`J’ai trouvé la carte ${k}`, `I found card ${k}`);
  room.pixo.g.visible = false; for (const id of [...room.sprites.keys()]) if (id !== 'ship') room.removeSprite(id);
  let found; const done = new Promise((r) => { found = r; });
  window.__chasse.found = (n) => found(n);
  const partImg = finale ? null : item(S.order[k - 1]);
  $('#foundbtn').onclick = async () => { if (S.want !== k) return; S.want = 0; await domPortal(k, partImg); S.fromPortal = true; found(k); }; $('#skipscan').onclick = () => found(k);
  sc.classList.remove('late'); const late = setTimeout(() => sc.classList.add('late'), TEST ? 0 : 20000);
  sc.classList.toggle('nocam', S.mode !== 'cam'); screen('scan');
  let lastWrong = 0;
  if (S.mode === 'cam' && mind) {
    onCard = async (n, portal) => {
      if (n === k && S.want === k) {
        S.want = 0; sfx('detect'); scanHum(false); sc.classList.add('opening');
        await Promise.race([portal.open({ part: partImg, sfx: (n) => sfx(n), fast: FAST, onOut: () => say('out', null) }), wait(FAST ? 1500 : 9000)]);
        S.fromPortal = true; found(k);
      } else if (n !== k && performance.now() - lastWrong > 7000) { lastWrong = performance.now(); sfx('bad'); say('wrong', null); }
    };
    // the scanner looks for this card only: the six cards share the same frame, and comparing them all could mistake one
    // for another ("not the right card" on the right one), then stay locked on the wrong one
    try { mind.controller.interestedTargetIndex = k - 1; } catch {}
    mindResume(); scanHum(true);
  }
  say(finale ? ln('e1') : 'scan', null);
  await done; clearTimeout(late); onCard = null; S.want = 0; S.cardK = 0; // the scanner stops: its last pose would go stale
  if (mind) { mindPause(); try { mind.controller.interestedTargetIndex = -1; } catch {} for (const p of mind.portals) p.reset(); }
  sc.classList.remove('opening'); scanHum(false);
  flash(); screen(null);
}

// without a camera: the same living portal on the picture of the card (it melts, the planet shows through, the piece
// and Pixo come out); the planet follows the mouse or the finger a little, for depth
async function domPortal(k, part) {
  const fx = $('#scan .cardfx'), face = fx.querySelector('.face'), pl = fx.querySelector('.plate'), pi = fx.querySelector('.part'), mini = fx.querySelector('.mini');
  const move = (e) => { const r = fx.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; pl.style.transform = `scale(1.18) translate(${-x * 6}%, ${-y * 6}%)`; };
  addEventListener('pointermove', move);
  const anim = (ms, f) => new Promise((r) => { const t0 = performance.now(); const s = () => { const u = Math.min(1, (performance.now() - t0) / T(ms)); f(u); u < 1 ? requestAnimationFrame(s) : r(); }; s(); });
  sfx('portal'); fx.classList.add('open'); $('#scan').classList.add('opening');
  await anim(1000, (u) => face.style.setProperty('--m', `${(u * u * (3 - 2 * u)) * 120}%`));
  if (part) { pi.src = `parts/${part}.png`; fx.classList.add('fly'); sfx('part'); await wait(T(1000)); }
  fx.classList.add('pixo'); sfx('hop'); say('out', null); await wait(T(1300)); sfx('appear'); fx.classList.add('leap'); await wait(T(450));
  removeEventListener('pointermove', move); face.style.setProperty('--m', '0%');
}

// ------------------------------------------------------------------ one card: a piece comes back, maybe hide and seek, then a mini-game
// the piece floats just above Pixo's head, a little to his side, so it is always in the picture with him
const partPos = (p) => { const a = Math.atan2(p.x, -p.z); return p.clone().add(new THREE.Vector3(Math.cos(a) * 0.1, 0.66, Math.sin(a) * 0.1)); };
function stickPart(id) { const s = room.sprites.get(id); if (s) { s.userData.base.copy(partPos(room.pixo.g.position)); s.position.copy(s.userData.base); } }
async function cardRound(k) {
  await scan(k);
  S.phase = `card${k}`; const part = S.order[k - 1], id = `p${part}`; S.partId = id;
  await enterRoom(); const at = await landing(k); await appear(at);
  room.addSprite(id, item(part), partPos(at), S.ep === 'e1' ? 0.3 : 0.22); room.sparks(partPos(at), 34, [0xffd46a, 0xffffff], 1.0, 0.05); sfx('part');
  await say(ln(`f${part}`), 'hello');
  if (S.hides.includes(k)) await hideAndSeek(k, id);
  const game = S.plan[k - 1] || 'quiz';
  if (game === 'stars') await starsGame(k); else if (game === 'simon') await simonGame(k); else if (game === 'blow') await blowGame(); else if (game === 'color') await colorGame(k);
  else for (const p of order(k)) await quiz(p, k, id);
  await say(ln('repaired'), 'amazed');
  await partToPocket(k, id); S.partId = null;
  S.next = k + 1; save();
  if (k < 6) await clue(k + 1);
}

// Pixo vanishes and pops up somewhere around the players; they turn with the phone to find him
async function hideAndSeek(k, id) {
  S.phase = `hide${k}`;
  const v = say(pick(['hide', 'hide2']), 'happy');
  await wait(T(1500));
  const side = Math.random() < 0.5 ? -1 : 1, a = room.lookYaw() + side * (2.0 + Math.random() * 0.7), r = S.mode === 'nocam' ? 1.8 + Math.random() * 0.3 : 1.1 + Math.random() * 0.4;
  let to = room.around(a, r);
  if (room.xr) { // a real perch behind the players (the sofa, a chair, the bed): he hides up there
    const look = room.lookYaw(), m = room.me();
    const far = world.perches.filter((p) => { const d = Math.atan2(Math.sin(room.bearingOf(p) - look), Math.cos(room.bearingOf(p) - look)); return Math.abs(d) > 1.3 && Math.hypot(p.x - m.x, p.z - m.z) < 4; });
    if (far.length) { const p = pick(far); to = new THREE.Vector3(p.x, p.y, p.z); }
  }
  sfx('poof'); S.perch = null; const s = room.sprites.get(id); if (s) s.visible = false;
  await room.teleport(to, FAST ? 30 : 450); stickPart(id); if (s) s.visible = true;
  setTimeout(() => sfx('giggle', 0.7), 300);
  await v;
  S.hunting = true; S.seen = 0; S.huntT = performance.now(); $('#arrow em').firstChild.textContent = tr('Pixo est par là !', 'Pixo is this way!'); $('#arrow').classList.add('on');
  await new Promise((res) => { S.foundPixo = res; window.__chasse.foundPixo = res; });
  S.hunting = false; $('#arrow').classList.remove('on'); sfx('found'); room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 36, [0xff9ad0, 0xffe08a, 0x9ff3e0], 1.3, 0.06);
  addStars(S.players[(k - 1) % S.players.length], 1); if (performance.now() - S.huntT < 4000) badge('lynx');
  await say(pick(['gotme', 'gotme2', 'gotme3']), 'happy');
  if (onPerch()) await comeDown(); // found up on the sofa: he jumps down to the players
}

// --- quiz: one question per player, in the sheet at the bottom
function quiz(p, k, id) {
  return new Promise(async (done) => {
    S.phase = `play${k}`; const c = challenge(p.age), el = $('#challenge');
    el.style.setProperty('--c', p.color); el.querySelector('.who b').textContent = p.name; el.querySelector('.who .av').src = avatarSrc(p.av);
    el.querySelector('.q').innerHTML = c.text; el.classList.toggle('big', !!c.big);
    let tries = 0, over = false;
    el.querySelector('.opts').innerHTML = ''; c.options.forEach((o) => {
      const b = document.createElement('button'); b.innerHTML = o.html; if (o.ok) b.dataset.ok = '1';
      b.onclick = async () => {
        if (over) return;
        if (o.ok) {
          over = true; S.quizN++; save(); b.classList.add('ok'); sfx('good'); addStars(p, tries === 0 ? 3 : tries === 1 ? 2 : 1);
          room.sparks((room.sprites.get(id)?.position || room.pixo.g.position).clone(), 40, [0xffd46a, 0x9ff3e0, 0xff9ad0], 1.3, 0.06);
          await say(cheer(), 'happy'); el.classList.remove('on'); await wait(T(500)); done();
        } else {
          tries++; S.quizMiss = true; b.classList.add('no'); sfx('bad'); setTimeout(() => b.classList.remove('no'), 500);
          if (tries >= 2) el.querySelector('[data-ok]').classList.add('hint');
          say(`bad${1 + (tries % 2)}`, 'sad');
        }
      };
      el.querySelector('.opts').append(b);
    });
    el.classList.add('on');
    await says(['turn', ...c.voice], 'talk');
  });
}

// --- catch the stars: they fly all around the room; turn and tap them before the time runs out
let starSet = null;
async function starsGame(k) {
  S.phase = `stars${k}`; await say(ln('stars_intro'), 'sad');
  const tex = room.img('img/ic/star.webp');
  for (const p of order(k)) {
    const little = p.age === 'p', secs = FAST ? 2 : little ? 20 : p.age === 'a' ? 12 : 15; let count = 0;
    banner(p, '', null); await say('turn', 'talk'); banner(p, `${secs}`, 0);
    say('stars_go', 'happy');
    starSet = new Set();
    const spawn = () => {
      const a = room.lookYaw() + (Math.random() - 0.5) * (little ? 2.2 : 4.4), r = S.mode === 'nocam' ? 1.6 + Math.random() * 0.8 : 1.0 + Math.random() * 0.9, h = little ? 0.24 : 0.17;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(h, h, 1);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: room.glow, color: 0xffe08a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(h * 2.6, h * 2.6, 1); s.add(halo); halo.position.z = -0.01;
      const m = room.me(); s.position.set(m.x + Math.sin(a) * r, m.y - 0.55 + Math.random() * 1.0, m.z - Math.cos(a) * r); s.userData = { a, r, m, y: s.position.y, w: (Math.random() - 0.5) * 0.25, t0: performance.now() / 1000 };
      room.scene.add(s); starSet.add(s);
    };
    for (let i = 0; i < (little ? 4 : 6); i++) spawn();
    room.onTap = (ray) => {
      const hit = ray.intersectObjects([...starSet], false)[0]; if (!hit) return false;
      const s = hit.object; starSet.delete(s); room.scene.remove(s); count++; banner(p, $('#mini .timer').textContent, count);
      sfx('found', 0.55, 1 + Math.min(count, 15) * 0.03); room.sparks(s.position.clone(), 18, [0xffe08a, 0xffffff], 0.9, 0.05); spawn(); return true;
    };
    if (TEST) window.__chasse.catchStar = () => { if (!starSet || !room.onTap) return; const s = [...starSet][0]; if (s) room.onTap({ intersectObjects: () => [{ object: s }] }); };
    const t0 = performance.now();
    await new Promise((res) => { const tick = () => { const left = Math.max(0, secs - (performance.now() - t0) / 1000), el = $('#mini .timer'); el.textContent = Math.ceil(left); el.classList.toggle('low', left < 4);
      if (left <= 0) return res(); setTimeout(tick, 200); }; tick(); });
    room.onTap = null; for (const s of starSet) room.scene.remove(s); starSet = null; $('#mini .timer').classList.remove('low');
    sfx('slot'); addStars(p, Math.ceil(count / 2)); if (count >= 12) badge('stars'); await wait(T(600)); // a caught star is worth half a score star, so this game does not outweigh the others
  }
  unbanner(); await say('stars_end', 'amazed');
}
function starsFrame(t) { // the stars drift slowly around the players
  if (!starSet) return;
  for (const s of starSet) { const u = s.userData, a = u.a + (t - u.t0) * u.w; s.position.set(u.m.x + Math.sin(a) * u.r, u.y + Math.sin(t * 1.7 + u.a * 3) * 0.08, u.m.z - Math.cos(a) * u.r); s.material.rotation = Math.sin(t * 2 + u.a) * 0.3; }
}

// --- Simon: Pixo's antenna flashes a sequence of colours; repeat it; it grows each time
const PADF = [523.25, 659.25, 783.99, 1046.5];
async function simonGame(k) {
  S.phase = `simon${k}`; const el = $('#simon'), pads = [...el.querySelectorAll('.pads button')], st = el.querySelector('.st');
  await say(ln('simon_intro'), 'talk');
  const light = async (i, ms = 420) => { pads[i].classList.add('lit'); note(PADF[i], 0.5); await wait(FAST ? 40 : ms); pads[i].classList.remove('lit'); await wait(FAST ? 20 : 140); };
  for (const p of order(k)) {
    const start = { p: 2, m: 3, g: 4, a: 5 }[p.age] || 3; let len = start, seqv = Array.from({ length: start }, () => R(4)), passed = 0;
    banner(p); el.classList.add('on', 'lock'); st.textContent = tr(`${p.name}, à toi !`, `${p.name}, your turn!`); await say('turn', 'talk');
    for (let round = 0; round < 4; round++) {
      el.classList.add('lock'); st.textContent = tr('Regarde bien…', 'Watch closely…'); await say('simon_watch', null); await wait(T(300));
      for (const i of seqv) await light(i, Math.max(260, 460 - round * 50));
      st.textContent = tr('À toi !', 'Your turn!'); say('simon_go', null); el.classList.remove('lock');
      const ok = await new Promise((res) => {
        let n = 0; window.__chasse.simon = seqv;
        pads.forEach((b, i) => b.onclick = () => { light(i, 160); if (i !== seqv[n]) { res(false); return; } n++; if (n === seqv.length) res(true); });
      });
      pads.forEach((b) => b.onclick = null); el.classList.add('lock');
      if (!ok) { sfx('bad'); st.textContent = tr('Oups !', 'Oops!'); await say(`bad${1 + R(2)}`, 'sad'); break; }
      passed++; sfx('good'); st.textContent = tr('Bravo !', 'Well done!'); room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 24, [0x9ff3e0, 0xff9ad0, 0xffe08a], 1, 0.05);
      if (round < 3) { seqv.push(R(4)); len++; await say('simon_more', 'happy'); }
    }
    addStars(p, passed + (passed === 4 ? 1 : 0)); if (passed === 4) badge('simon'); el.classList.remove('on'); unbanner(); await wait(T(400));
  }
  await say('simon_end', 'amazed');
}

// --- cool the engine: blow on the phone together (microphone), or tap as fast as you can
async function blowGame() {
  S.phase = 'blow'; const el = $('#blow'), g = el.querySelector('.gauge');
  let mic = null, an = null, data = null;
  if (!IOS && !TEST && navigator.mediaDevices?.getUserMedia && S.mode === 'cam') {
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(mic).connect(an); data = new Float32Array(an.fftSize); } catch { mic = null; }
  }
  el.classList.toggle('mic', !!mic); el.querySelector('.bt').textContent = mic ? tr('Soufflez tous très fort sur le téléphone !', 'Everyone blow hard on the phone!') : tr('Tapotez tous très vite !', 'Everyone tap really fast!');
  await say(ln(mic ? 'blow_intro' : 'tap_intro'), 'sad');
  let heat = 1; g.style.setProperty('--h', heat); el.classList.add('on');
  const tapper = $('#tapper'); const cool = () => { heat = Math.max(0, heat - 0.035); sfx('tap', 0.4, 0.8 + Math.random() * 0.4); };
  tapper.onclick = cool; const key = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); cool(); } }; addEventListener('keydown', key);
  if (TEST) window.__chasse.cool = () => { for (let i = 0; i < 40; i++) cool(); };
  const t0 = performance.now(), limit = FAST ? 3 : 25;
  await new Promise((res) => { const tick = () => {
    if (mic) { an.getFloatTimeDomainData(data); let s = 0; for (const v of data) s += v * v; const rms = Math.sqrt(s / data.length); if (rms > 0.05) heat = Math.max(0, heat - (rms - 0.05) * 0.08); }
    heat = Math.min(1, heat + 0.0012); g.style.setProperty('--h', heat);
    if (Math.random() < 0.25) room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 1, heat > 0.5 ? 0xff7a3c : 0x9ff3e0, 0.6, 0.05);
    if (heat <= 0 || (performance.now() - t0) / 1000 > limit) return res(); requestAnimationFrame(tick); }; tick(); });
  removeEventListener('keydown', key); tapper.onclick = null; for (const t of mic?.getTracks() || []) t.stop();
  const secs = (performance.now() - t0) / 1000, stars = heat > 0 ? 1 : secs < 8 ? 5 : secs < 12 ? 4 : secs < 17 ? 3 : 2; if (heat <= 0 && secs < 8) badge('dragon');
  el.classList.remove('on'); sfx('good'); for (const p of S.players) addStars(p, stars);
  await say(ln('blow_end'), 'happy');
}

// --- colour hunt: find something of this colour in the house and show it in the ring (camera)
const HUES = { rouge: [[345, 360], [0, 12]], orange: [[13, 38]], jaune: [[40, 68]], vert: [[75, 165]], bleu: [[190, 250]], violet: [[255, 295]], rose: [[296, 344]] };
const CNAME_EN = { rouge: 'red', orange: 'orange', jaune: 'yellow', vert: 'green', bleu: 'blue', violet: 'purple', rose: 'pink' };
const HCOL = { rouge: '#e8364a', orange: '#ff8a2a', jaune: '#ffd028', vert: '#2dbb5d', bleu: '#2a7de1', violet: '#9a4ee0', rose: '#ff7fb6' };
async function colorGame(k) {
  S.phase = `color${k}`; const el = $('#hunt'), ring = el.querySelector('.ring i'), cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const cx = cv.getContext('2d', { willReadFrequently: true });
  await say('colhunt', 'happy'); const used = []; let all = true;
  for (const p of order(k)) {
    const list = p.age === 'p' ? ['rouge', 'bleu', 'jaune', 'vert'] : p.age === 'm' ? ['rouge', 'bleu', 'jaune', 'vert', 'orange', 'violet'] : ['rouge', 'bleu', 'jaune', 'vert', 'orange', 'violet', 'rose'];
    const c = pick(list.filter((x) => !used.includes(x)).length ? list.filter((x) => !used.includes(x)) : list); used.push(c);
    el.style.setProperty('--hc', HCOL[c]); el.querySelector('.cname').textContent = EN ? CNAME_EN[c] : c; ring.style.setProperty('--p', 0);
    const secs = FAST ? 2 : p.age === 'a' ? 30 : 45; banner(p, `${secs}`); el.classList.add('on');
    await say('turn', 'talk'); say(`col_${c}`, 'talk');
    let prog = 0; const t0 = performance.now();
    if (TEST) window.__chasse.colorOk = () => { prog = 1; };
    const ok = await new Promise((res) => { const tick = () => {
      const left = secs - (performance.now() - t0) / 1000; $('#mini .timer').textContent = Math.max(0, Math.ceil(left));
      const v = mind?.video;
      if (v && v.readyState >= 2) {
        const vw = v.videoWidth, vh = v.videoHeight, s = Math.min(vw, vh) * 0.3; cx.drawImage(v, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, 32, 32);
        const d = cx.getImageData(0, 0, 32, 32).data; let hit = 0;
        for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn; if (mx < 0.22 || dl / mx < (c === 'rose' ? 0.22 : 0.38)) continue;
          let h = mx === r ? 60 * (((g - b) / dl) % 6) : mx === g ? 60 * ((b - r) / dl + 2) : 60 * ((r - g) / dl + 4); if (h < 0) h += 360; if (HUES[c].some(([a, z]) => h >= a && h <= z)) hit++; }
        const frac = hit / 1024; prog = frac > 0.3 ? Math.min(1, prog + 0.12) : Math.max(0, prog - 0.04);
      }
      ring.style.setProperty('--p', prog);
      if (prog >= 1) return res(true); if (left <= 0) return res(false); setTimeout(tick, 120); }; tick(); });
    if (ok) { sfx('found'); const t = (performance.now() - t0) / 1000; addStars(p, t < 15 ? 3 : t < 30 ? 2 : 1); await say('col_found', 'happy'); }
    else { all = false; sfx('bad'); await say('col_late', 'sad'); }
    el.classList.remove('on'); unbanner(); await wait(T(300));
  }
  if (all) badge('rainbow');
}

// the repaired piece flies up into the ship's slots
async function partToPocket(k, id) {
  const s = room.sprites.get(id); sfx('part', 0.8);
  if (s) { const from = s.position.clone(), t0 = performance.now(); s.userData.float = false;
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 50 : 900)); s.position.lerpVectors(from, room.cam.position.clone().add(room.forward().multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.3, 0)), u * u); s.material.opacity = 1 - u * u; if (Math.random() < 0.6) room.sparks(s.position.clone(), 1, 0xffe08a, 0.2, 0.04); u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(id); }
  S.got = k; $('#slots').children[k - 1].classList.add('got'); sfx('slot');
}

// where the next card is: a riddle for everyone, a picture for the little ones
async function clue(k) {
  S.phase = `clue${k}`; const spot = SPOTS.find((s) => s[0] === S.spots[k]) || SPOTS[0];
  $('#clue .kick').textContent = tr(`La carte ${k} est cachée…`, `Card ${k} is hidden…`); $('#clue .cardmini img').src = `cards/c${k}.jpg`;
  $('#clue .riddle').textContent = (L[`h_${spot[0]}`] || '').replace(/^./, (c) => c.toUpperCase());
  const pic = $('#clue .pic'); pic.querySelector('img').src = `img/ic/${spot[0]}.webp`; pic.querySelector('span').textContent = spot[1]; pic.classList.remove('on'); $('#peek').hidden = false;
  $('#peek').onclick = () => { pic.classList.add('on'); $('#peek').hidden = true; sfx('found', 0.7); };
  $('#cluego').textContent = tr(`On a trouvé la carte ${k} !`, `We found card ${k}!`);
  screen('clue');
  const go = new Promise((r) => { $('#cluego').onclick = () => { sfx('tap'); r(); }; });
  await say('next_card', 'talk'); await say(`h_${spot[0]}`, 'talk', tr('La carte suivante est cachée ', 'The next card is hidden '));
  say('go_find', 'happy');
  await go; screen(null);
}

// ------------------------------------------------------------------ the finale: the ship rebuilds and takes off
async function finale() {
  await scan(1);
  S.phase = 'finale'; await enterRoom(); const at = await landing(1); S.perch = null;
  const a = room.bearingOf(at);
  const pixoAt = at.clone().add(new THREE.Vector3(Math.cos(a) * 0.32 - Math.sin(a) * 0.25, 0, Math.sin(a) * 0.32 + Math.cos(a) * 0.25)); // beside the ship, a step closer
  await appear(pixoAt);
  const H = 0.8, shipPos = at.clone().add(new THREE.Vector3(0, H / 2, 0));
  room.portal(at, FAST ? 200 : 4200); sfx('assemble');
  const ship = room.addSprite('ship', EP().trophy, shipPos, H, false); ship.userData.float = false; ship.material.opacity = 0;
  const voice = say(ln('e2'), 'amazed');
  for (let i = 0; i < 6; i++) {
    const part = S.order[i], ang = a + (i - 2.5) * 0.5, from = shipPos.clone().add(new THREE.Vector3(Math.sin(ang) * 0.6, 0.5, -Math.cos(ang) * 0.6 + 0.2));
    const s = room.addSprite(`f${i}`, item(part), from, S.ep === 'e1' ? 0.24 : 0.18); s.userData.float = false; $('#slots').children[i].classList.remove('got');
    const t0 = performance.now();
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 650)); s.position.lerpVectors(from, shipPos, u * u); s.material.opacity = 1 - u * 0.8; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(`f${i}`); room.sparks(shipPos, 26, [0xffd46a, 0x9ff3e0], 1.2, 0.05); sfx('slot', 0.8, 0.9 + i * 0.06); ship.material.opacity = (i + 1) / 6;
    await wait(T(220));
  }
  await voice;
  const P = room.pixo.g.position, from = P.clone(), t0 = performance.now();
  sfx('hop');
  await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 1000)); P.lerpVectors(from, at, u); P.y = from.y + (at.y - from.y) * u + Math.sin(u * Math.PI) * 0.4; room.pixo.uni.fade.value = 1 - u; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
  room.pixo.g.visible = false; room.pixo.uni.fade.value = 1; sfx('appear'); room.sparks(shipPos, 30, 0x9ff3e0, 1, 0.05);
  await say(ln('e3'), null);
  sfx(EP().flame ? 'engine' : 'appear'); const b0 = shipPos.clone(), t1 = performance.now();
  await new Promise((r) => { const st = () => { const u = (performance.now() - t1) / 1000; const y = u < 1 ? Math.sin(u * 40) * 0.012 : 0.6 * (u - 1) ** 2;
    ship.position.set(b0.x, b0.y + y, b0.z); if (EP().flame && Math.random() < 0.9) room.flame(ship.position.clone().add(new THREE.Vector3(0, -H * 0.45, 0))); else if (Math.random() < 0.5) room.sparks(ship.position.clone(), 2, [0xffe08a, 0xffffff, 0xff9ad0], 0.7, 0.05); if (u > 1 && Math.random() < 0.5) room.sparks(ship.position.clone().add(new THREE.Vector3(0, -H * 0.5, 0)), 2, [0xffe08a, 0x9ff3e0], 0.5, 0.05);
    u < (FAST ? 0.1 : 5) ? requestAnimationFrame(st) : r(); }; st(); });
  room.removeSprite('ship'); sfx('fanfare');
  // the family record, on this device
  let rec = null; try { rec = JSON.parse(localStorage.getItem(RECORD) || 'null'); } catch {}
  S.record = !rec || S.stars > rec.stars; if (S.record) { try { localStorage.setItem(RECORD, JSON.stringify({ stars: S.stars, date: Date.now() })); } catch {} }
  // the badge book: this adventure, and the feats of the whole hunt
  finishEpisode(S.ep); badge(`ep_${S.ep}`); if (S.record && rec) badge('record'); if (S.quizN >= 2 && !S.quizMiss) badge('brain'); if (allDone()) badge('collector');
  const ni = EPISODES.findIndex((e) => e.id === S.ep) + 1, nx = EPISODES[ni];
  $('#nextep').hidden = !nx; if (nx) { $('#nextep').dataset.ep = nx.id; $('#nextep').textContent = tr(`Aventure suivante : ${nx.title.fr}`, `Next adventure: ${nx.title.en}`); }
  $('#endbadges').innerHTML = S.newBadges.length ? `<p>${tr('Nouveaux badges', 'New badges')}</p><div>${S.newBadges.map((id) => `<img src="${badgeImg(id)}" alt="" title="${BADGES.find((b) => b.id === id).name[LANG]}">`).join('')}</div>` : '';
  forget(); S.phase = 'end'; scanHum(false);
  try { wake?.release(); } catch {}
  await drawDiploma(rec);
  document.body.classList.remove('playing'); screen('end');
  (async () => { if (S.record && rec) await say('record', null); if (S.newBadges.length) await say('badge', null); if (nx) say('next_ep', null); })();
  if (room.xr) { S.leaving = true; await world.end(); }
  if (mind) { try { mind.stop(); } catch {} } room.stopCamera(); document.body.classList.remove('cam');
}

// ------------------------------------------------------------------ the diploma: drawn here, saved as a picture on the device
const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
async function drawDiploma(rec) {
  const c = $('#diploma'), x = c.getContext('2d'), W = c.width, H = c.height; await document.fonts?.ready;
  const [pixo, ship, star] = await Promise.all([loadImg('img/pixo-wave.png'), loadImg(`parts/${EP().trophy}.png`), loadImg('img/ic/star.webp')]);
  const avs = await Promise.all(S.players.map((p) => loadImg(avatarSrc(p.av))));
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#fdf0d8'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#d9a425'; x.lineWidth = 10; x.strokeRect(36, 36, W - 72, H - 72); x.lineWidth = 3; x.strokeRect(58, 58, W - 116, H - 116);
  const st = (cx, cy, r, col) => { x.save(); x.translate(cx, cy); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fillStyle = col; x.fill(); x.restore(); };
  for (const [sx, sy] of [[58, 58], [W - 58, 58], [58, H - 58], [W - 58, H - 58]]) st(sx, sy, 26, '#f5b301');
  for (let i = 0; i < 26; i++) st(120 + Math.random() * (W - 240), 90 + Math.random() * 120, 4 + Math.random() * 6, 'rgba(245,179,1,.35)');
  x.textAlign = 'center'; x.fillStyle = '#2a2370';
  x.font = '600 34px Fredoka, sans-serif'; x.fillText(`${tr('LA GRANDE CHASSE DE PIXO', 'PIXO’S GREAT HUNT')} · ${EP().title[LANG].toUpperCase()}`, W / 2, 150);
  x.font = '700 88px Fredoka, sans-serif'; const many = S.players.length > 1;
  const g = x.createLinearGradient(0, 180, 0, 280); g.addColorStop(0, '#f59e0b'); g.addColorStop(1, '#d9480f'); x.fillStyle = g;
  x.fillText(many ? tr('Diplôme de Grands Explorateurs', 'Great Explorers Diploma') : tr('Diplôme de Grand Explorateur', 'Great Explorer Diploma'), W / 2, 258);
  x.fillStyle = '#5b5590'; x.font = '700 30px Nunito, sans-serif'; x.fillText(tr('décerné à', 'awarded to'), W / 2, 316);
  const n = S.players.length, slot = Math.min(230, (W - 360) / n), y0 = 350;
  S.players.forEach((p, i) => {
    const cx = W / 2 + (i - (n - 1) / 2) * slot;
    x.fillStyle = p.color; x.beginPath(); x.arc(cx, y0 + 80, 82, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, y0 + 80, 72, 0, Math.PI * 2); x.fill();
    if (avs[i]) x.drawImage(avs[i], cx - 66, y0 + 14, 132, 132);
    x.fillStyle = '#2a2370'; x.font = `700 ${n > 4 ? 34 : 42}px Fredoka, sans-serif`; x.fillText(p.name, cx, y0 + 214);
    if (star) x.drawImage(star, cx - 46, y0 + 230, 30, 30); x.font = '700 28px Fredoka, sans-serif'; x.fillStyle = '#d9480f'; x.textAlign = 'left'; x.fillText(`${p.stars || 0}`, cx - 10, y0 + 256); x.textAlign = 'center';
  });
  x.fillStyle = '#4a4580'; x.font = '700 30px Nunito, sans-serif';
  const dl = EP().dip[LANG]; x.fillText(dl[0], W / 2, 700); x.fillText(dl[1], W / 2, 744);
  const date = new Date().toLocaleDateString(tr('fr-FR', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric' });
  x.font = '800 30px Nunito, sans-serif'; x.fillStyle = '#d9480f';
  x.fillText(tr(`${S.stars} étoiles en tout${S.record ? (rec ? ' · Nouveau record !' : '') : ` · Record : ${rec?.stars}`}`, `${S.stars} stars in all${S.record ? (rec ? ' · New record!' : '') : ` · Record: ${rec?.stars}`}`), W / 2, 800);
  x.font = '700 24px Nunito, sans-serif'; x.fillStyle = '#7a74a8'; x.fillText(tr(`Le ${date}`, date), W / 2, 842);
  x.save(); x.translate(W / 2, 950); st(0, 0, 66, '#f5b301'); x.fillStyle = '#fff7d6'; x.beginPath(); x.arc(0, 0, 28, 0, Math.PI * 2); x.fill(); x.restore();
  x.fillStyle = '#2a2370'; x.font = '600 40px Fredoka, sans-serif'; x.fillText('Pixo', W - 330, 970); x.font = '700 22px Nunito, sans-serif'; x.fillStyle = '#7a74a8'; x.fillText(tr('Commandant de bord', 'Ship’s captain'), W - 330, 1002);
  x.strokeStyle = '#b9b3e8'; x.lineWidth = 2; x.beginPath(); x.moveTo(W - 450, 925); x.lineTo(W - 210, 925); x.stroke();
  if (pixo) x.drawImage(pixo, W - 240, H - 360, 170, 170 * pixo.height / pixo.width);
  if (ship) x.drawImage(ship, 90, H - 360, 210, 210 * ship.height / ship.width);
}
function downloadDiploma() {
  $('#diploma').toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = tr(`diplome-pixo-aventure-${EP().n}.png`, `pixo-diploma-adventure-${EP().n}.png`); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
}

// ------------------------------------------------------------------ every frame: the voice follows Pixo, the arrow points to him (or to the stars)
function pointAt(target) { // returns true when the target is on screen
  const v = target.clone().project(room.cam), f = room.forward(), d0 = room.bearingOf(target) - Math.atan2(f.x, -f.z), d = Math.atan2(Math.sin(d0), Math.cos(d0));
  const on = v.z < 1 && Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.9; const ar = $('#arrow'), sv = ar.querySelector('svg');
  if (on) { ar.style.opacity = 0; return true; }
  ar.style.opacity = 1;
  if (Math.abs(d) < 0.5) { const down = v.y < 0; ar.style.left = '50%'; ar.style.top = down ? '74%' : '28%'; sv.style.transform = `rotate(${down ? 90 : -90}deg)`; }
  else { const right = d > 0; ar.style.top = '50%'; ar.style.left = right ? 'calc(100% - 84px)' : '84px'; sv.style.transform = `rotate(${right ? 0 : 180}deg)`; }
  return false;
}
// ------------------------------------------------------------------ Pixo alive
const life = { lastClimb: -1e9, climbs: 0, off: 0, spin: 0, lastFollow: -1e9, lastDizzy: -1e9, taps: [], lastTickle: -1e9, moving: false, lastT: 0, follows: 0 };
const calm = () => { const p = S.phase; return room.pixo.g.visible && !voice && !S.hunting && !starSet && !life.moving && !/^(hide|stars|scan|clue|finale|end|film|start)/.test(p); };
// is he up on something? (the real room knows the floor; otherwise, he is on the card's perch)
const onPerch = () => (room.xr ? world.onPerch(room.pixo.g.position) : !!S.perch && room.pixo.g.position.y > room.floorY + 0.15);
async function climb(pc) { // walk to the foot of it, look up, and jump on top
  life.moving = true; life.lastClimb = performance.now(); life.climbs++;
  say(pick(['climb', 'climb2']), null);
  await room.walk(pc.base, FAST ? 20 : 0.26); await room.jumpTo(pc.top, 0.16); sfx('hop', 0.7, 1.1);
  life.moving = false;
}
async function comeDown(to) { // from the perch to the floor, towards the players
  const was = life.moving; life.moving = true; const P = room.pixo.g.position, m = room.me();
  if (!to) { const v = new THREE.Vector3(m.x - P.x, 0, m.z - P.z); const d = v.length() || 1; v.multiplyScalar(Math.min(0.35, d * 0.4) / d); to = new THREE.Vector3(P.x + v.x, room.floorY, P.z + v.z); }
  to = to.clone(); to.y = room.floorY;
  // a short leap down (40 cm at most), then he walks the rest of the way
  const v = new THREE.Vector3(to.x - P.x, 0, to.z - P.z), d = v.length(), hop = d > 0.4 ? new THREE.Vector3(P.x + v.x * 0.4 / d, to.y, P.z + v.z * 0.4 / d) : to;
  say('down', null); S.perch = null; await room.jumpTo(hop, 0.1); sfx('hop', 0.7, 0.9);
  if (hop !== to) await room.walk(to, FAST ? 20 : 0.26);
  life.moving = was;
}
async function follow() { // he hops back into view, beside where the phone is looking
  life.moving = true; life.lastFollow = performance.now(); life.follows++;
  // beside the middle of the screen, inside the picture whatever the phone's shape (half the half-width of the view)
  const half = room.halfH(), side = Math.random() < 0.5 ? -1 : 1, base = ahead(), m = room.me(), a = room.bearingOf(base) + side * half * 0.45, r = Math.hypot(base.x - m.x, base.z - m.z);
  const to = room.around(a, r), far = Math.abs(room.pixoBearing().d) > 1.4, P = room.pixo.g.position, dist = Math.hypot(to.x - P.x, to.z - P.z);
  const s = S.partId && room.sprites.get(S.partId);
  if (far) { if (s) s.visible = false; sfx('poof', 0.6); S.perch = null; await room.teleport(to, FAST ? 30 : 300); if (s) { stickPart(S.partId); s.visible = true; } }
  else if (onPerch()) await comeDown(to);
  else if (dist < 1.1) await room.walk(to, FAST ? 20 : 0.26); // a few steps; farther, he hops (walking would take too long)
  else { sfx('hop', 0.7); await room.hop(to, 0.4, FAST ? 60 : 700); }
  life.moving = false; say(life.follows % 2 ? 'here' : 'here2', 'hello');
}
function alive(t) {
  const dt = Math.min(0.1, t - (life.lastT || t)); life.lastT = t; const now = performance.now();
  if (!calm()) { life.off = 0; life.spin = 0; return; }
  // forgotten: off screen for 6 seconds, he comes back by himself
  life.off = room.pixoBearing().on ? 0 : life.off + dt;
  if (life.off > 6 && now - life.lastFollow > 12000) { life.off = 0; follow(); return; }
  // the room spins: turning the phone (or dragging the room) very fast makes him dizzy
  // a perch in sight (the real room): he walks to it and climbs up, now and then
  if (room.xr && now - life.lastClimb > (TEST ? 3000 : 25000) && life.climbs < 3 && !onPerch()) {
    const pc = world.perchNear(room.pixo.g.position, 2.2); if (pc) { const v = pc.top.clone().project(room.cam); if (v.z < 1 && Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.85) { climb(pc); return; } }
  }
  // he landed up on the sofa with the card: after a while he hops down to the floor
  if (S.perch && !room.xr && now - S.perch.t > (TEST ? 1500 : 9000)) { comeDown(); return; }
  life.spin = Math.abs(room.spin) > 4.5 ? life.spin + dt : Math.max(0, life.spin - dt);
  if (life.spin > 0.35 && now - life.lastDizzy > 25000) { life.spin = 0; life.lastDizzy = now; say('dizzy', 'amazed'); badge('dizzy'); }
}
function tickle() { // several taps on him in a row: it tickles
  const now = performance.now(); life.taps = life.taps.filter((x) => now - x < 2500); life.taps.push(now);
  if (life.taps.length >= 3 && !voice && now - life.lastTickle > 8000) { life.taps = []; life.lastTickle = now; say('tickle', 'happy'); badge('tickle'); return true; }
  return false;
}

function onFrame(t) {
  starsFrame(t); alive(t);
  if (S.partId && (room.walking || room.jumping)) { const s = room.sprites.get(S.partId); if (s && s.userData.float !== false && s.visible) stickPart(S.partId); }
  if (starSet) { // during the star hunt, point to the nearest star when none is on screen
    const f = room.forward(); let best = null, bd = 9; for (const s of starSet) { const v = s.position.clone().project(room.cam); if (v.z < 1 && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9) { best = null; bd = -1; break; } const d = Math.abs(Math.atan2(Math.sin(s.userData.a - Math.atan2(f.x, -f.z)), Math.cos(s.userData.a - Math.atan2(f.x, -f.z)))); if (d < bd) { bd = d; best = s; } }
    const ar = $('#arrow'); if (best) { ar.classList.add('on'); $('#arrow em').firstChild.textContent = tr('Des étoiles par là !', 'Stars this way!'); pointAt(best.position); } else ar.classList.remove('on');
  }
  if (!room.pixo.g.visible) { if (voice) voice.pan.pan.value = 0; return; }
  const b = room.pixoBearing();
  if (voice) { voice.pan.pan.value = Math.max(-0.9, Math.min(0.9, Math.sin(b.d))); voice.g.gain.value = 0.7 + 0.3 * Math.cos(b.d); }
  if (!S.hunting) return;
  if (pointAt(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.25, 0)))) { if (++S.seen > 45) { S.hunting = false; S.foundPixo?.(); } } else S.seen = 0;
}

// ------------------------------------------------------------------ boot
translatePage();
for (const b of document.querySelectorAll('.langsw button')) { b.classList.toggle('on', b.dataset.l === LANG); b.onclick = () => { if (b.dataset.l !== LANG) switchLang(b.dataset.l); }; }
room = new Room($('#room'));
room.onFrame = onFrame; world = room.world = new World(room); world.onEnd = xrEnded;
room.onPixo = () => { if (S.hunting) { S.hunting = false; S.foundPixo?.(); } else if (tickle()) { sfx('giggle', 0.9); room.pixo.squash = 0.12; } else if (room.pixo.clip === 'idle' && !voice) { room.pixo.squash = 0.1; sfx('giggle', 0.8); room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 14, 0xff9ad0, 0.8, 0.05); clip('happy'); } };
window.__chasse = { S, room, life, calm: () => calm(), get mind() { return mind; }, get world() { return world; }, landing, climb, comeDown, onPerch: () => onPerch() };
setup();
