// La Grande Chasse de Pixo: the game. Pixo, a filmed little alien, appears in the room through the phone; the
// children find the six printed cards hidden in the house, each card opens a portal where a piece of his ship comes
// back, each child passes a challenge for their age, and at the end the ship rebuilds and takes off. Nothing is sent
// anywhere; the progress of a hunt is kept in this browser tab only, so a reload can resume it.
import * as THREE from 'three';
import { Room, FLOOR } from './room.js';
import { LINES } from './lines.js';
import { challenge, SPOTS, AVATARS, ic } from './games.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = new URLSearchParams(location.search), TEST = Q.has('test'), FAST = TEST && !Q.has('anim'); // test hooks: short voices, and short animations unless &anim
const T = (ms) => (FAST ? Math.min(ms, 120) : ms);
const L = LINES.fr;
const PCOL = ['#ff6fa0', '#3b9cff', '#f59e0b', '#9a5cf0', '#22b98c', '#ef4f6b'];
const AGES = [['p', '3 à 5 ans', 'Petits'], ['m', '6 à 8 ans', 'Moyens'], ['g', '9 à 12 ans', 'Grands']];
const KEY = 'grande-chasse';

const S = { phase: 'home', players: [], spots: {}, mode: 'cam', next: 1, got: 0, hunting: false, seen: 0, music: true, want: 0 };
let room, ac, master, musicGain, mind = null, wake = null;
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ players: S.players, spots: S.spots, mode: S.mode, next: S.next, got: S.got })); } catch {} };
const forget = () => { try { sessionStorage.removeItem(KEY); } catch {} };

// ------------------------------------------------------------------ sound: voice placed in the room, real effects, a music bed
const buf = {};
function load(path) {
  if (!buf[path]) buf[path] = fetch(path).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => ac.decodeAudioData(b)).catch(() => null);
  return buf[path];
}
const vpath = (id) => `audio/fr/${id}.mp3`, spath = (n) => `sfx/${n}.mp3`;
async function sfx(name, vol = 1, rate = 1) {
  if (!ac) return; const b = await load(spath(name)); if (!b) return;
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g).connect(master); s.start(); return s;
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
function duck(on) { if (!musicGain) return; const v = !S.music ? 0 : on ? 0.1 : 0.32; musicGain.gain.setTargetAtTime(v, ac.currentTime, on ? 0.12 : 0.6); }
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
const clip = (name) => Promise.race([room.pixo.play(name), wait(TEST ? 100 : 7000)]);
// Pixo says a line: the words on screen, the voice from where he stands, his body moving while he talks
async function say(id, first = 'talk', prefix = '') {
  const my = ++sayTok; const el = $('#say'), txt = L[id] || '';
  el.querySelector('p').textContent = prefix ? prefix + txt.charAt(0).toLowerCase() + txt.slice(1) : txt; el.classList.add('on');
  let ended = false; const a = playVoice(id).then(() => { ended = true; });
  if (first && room.pixo.g.visible) (async () => { let c = first; while (!ended && my === sayTok) { await clip(c); c = 'talk'; } })();
  await a;
  setTimeout(() => { if (my === sayTok) el.classList.remove('on'); }, 1400);
  return my === sayTok; // false when another line cut this one
}
async function says(ids, first) { for (const id of ids) { if (!await say(id, first)) return; first = 'talk'; } }

// ------------------------------------------------------------------ screens
function screen(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); }
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
const avatarSrc = (av) => `img/ic/av_${av}.webp`;

// ------------------------------------------------------------------ setup wizard (kept in memory and in this tab only)
let step = 0;
function playerRow(i, name = '', age = 'm', av = AVATARS[i % AVATARS.length][0]) {
  const d = document.createElement('div'); d.className = 'player'; d.dataset.av = av; d.dataset.age = age;
  d.innerHTML = `<div class="top"><input maxlength="14" placeholder="Prénom" autocomplete="off" enterkeyhint="done"><button class="x" aria-label="Retirer cet enfant">✕</button></div>
    <div class="avs">${AVATARS.map(([a, l]) => `<button data-a="${a}" aria-label="${l}" class="${a === av ? 'on' : ''}"><img src="${avatarSrc(a)}" alt=""></button>`).join('')}</div>
    <div class="ages">${AGES.map(([a, l, s]) => `<button data-g="${a}" class="${a === age ? 'on' : ''}">${l}<small>${s}</small></button>`).join('')}</div>`;
  d.querySelector('input').value = name;
  d.querySelectorAll('.avs button').forEach((b) => b.onclick = () => { d.dataset.av = b.dataset.a; d.querySelectorAll('.avs button').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap', 0.6); });
  d.querySelectorAll('.ages button').forEach((b) => b.onclick = () => { d.dataset.age = b.dataset.g; d.querySelectorAll('.ages button').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap', 0.6); });
  d.querySelector('.x').onclick = () => { if ($('#players').children.length > 1) d.remove(); };
  $('#players').append(d);
}
function spotRow(k, def) {
  const d = document.createElement('div'); d.className = 'spot'; d.dataset.k = k; d.dataset.spot = def;
  d.innerHTML = `<img src="cards/c${k}.jpg" alt="Carte ${k}"><div class="chips">${SPOTS.map(([id, l]) => `<button data-s="${id}" class="${id === def ? 'on' : ''}"><img src="img/ic/${id}.webp" alt="">${l.replace(/^(Le |La |Les |Une |Sous un )/, '')}</button>`).join('')}</div>`;
  d.querySelectorAll('.chips button').forEach((b) => b.onclick = () => { d.dataset.spot = b.dataset.s; d.querySelectorAll('.chips button').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap', 0.6); });
  $('#spots').append(d);
  requestAnimationFrame(() => d.querySelector('.chips .on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}
function showStep(n) {
  step = n; document.querySelectorAll('.step').forEach((s) => s.classList.toggle('on', +s.dataset.step === n));
  document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i <= n)); $('.wstep').textContent = `${n + 1}/4`;
  $('#wnext').textContent = n === 3 ? 'Lancer la chasse' : 'Suivant'; $('#setup').scrollTop = 0;
}
function setup() {
  playerRow(0);
  $('#addp').onclick = () => { const n = $('#players').children.length; if (n < 6) playerRow(n); };
  ['canape', 'frigo', 'lit', 'livres', 'jouets'].forEach((s, i) => spotRow(i + 2, s));
  S.mode = matchMedia('(pointer: coarse)').matches ? 'cam' : 'nocam';
  const modes = document.querySelectorAll('.modes button');
  const setMode = (m) => { S.mode = m; modes.forEach((x) => x.classList.toggle('on', x.dataset.mode === m)); };
  modes.forEach((b) => b.onclick = () => { setMode(b.dataset.mode); sfx('tap', 0.6); }); setMode(S.mode);
  $('#toSetup').onclick = () => { unlockAudio(); screen('setup'); showStep(0); };
  $('#howbtn').onclick = () => screen('how'); $('#howok').onclick = () => { unlockAudio(); screen('setup'); showStep(0); };
  $('#wback').onclick = () => (step === 0 ? screen('home') : showStep(step - 1));
  $('#wnext').onclick = () => { sfx('tap', 0.7); if (step < 3) showStep(step + 1); else go(false); };
  $('#again').onclick = () => { forget(); location.reload(); };
  $('#dl').onclick = downloadDiploma;
  $('#pausebtn').onclick = () => { screen('pause'); ac?.suspend(); };
  $('#presume').onclick = () => { screen(null); ac?.resume(); };
  $('#pmusic').onclick = () => { S.music = !S.music; $('#pmusic').textContent = `Musique : ${S.music ? 'oui' : 'non'}`; duck(false); };
  $('#prestart').onclick = () => { forget(); location.reload(); };
  $('#slots').innerHTML = [1, 2, 3, 4, 5, 6].map((k) => `<i style="background-image:url(parts/p${k}.png)"></i>`).join('');
  // a hunt in progress in this tab (the page was reloaded): offer to go on
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
  if (saved?.players?.length && saved.next > 1) {
    const b = $('#resume'); b.hidden = false; b.textContent = saved.next > 6 ? 'Reprendre : le grand final' : `Reprendre la chasse (carte ${saved.next} sur 6)`;
    b.onclick = () => { Object.assign(S, saved); unlockAudio(); go(true); };
  }
}
function readSetup() {
  S.players = [...document.querySelectorAll('.player')].map((d, i) => ({ name: d.querySelector('input').value.trim() || `Explorateur ${i + 1}`, age: d.dataset.age, av: d.dataset.av, color: PCOL[i % PCOL.length] }));
  document.querySelectorAll('.spot').forEach((d) => { S.spots[+d.dataset.k] = d.dataset.spot; });
  S.next = 1; S.got = 0;
}

// ------------------------------------------------------------------ start (a tap, so sound, video and motion sensors may start)
function unlockAudio() {
  if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.95; master.connect(ac.destination); ac.resume();
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} // iPhone: play even with the silent switch on
  for (const n of ['tap', 'portal', 'appear', 'part', 'good', 'bad', 'poof', 'found', 'slot', 'detect', 'giggle']) load(spath(n));
}
async function keepAwake() { try { wake = await navigator.wakeLock?.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.phase !== 'home' && S.phase !== 'end') keepAwake(); });

async function go(resume) {
  if (!resume) readSetup();
  unlockAudio(); room.pixo.unlock(); keepAwake(); save();
  screen(null); document.body.classList.add('playing'); S.phase = 'start';
  if (S.mode === 'cam') { const g = room.startGyro(); const ok = await startMind(); await g; if (!ok) S.mode = 'nocam'; }
  if (S.mode === 'nocam') { room.drawRoom(); room.pitch = -0.42; }
  if (!room.useGyro) $('#arrow em').innerHTML = 'Pixo est par là !<br>Glissez ou ← →';
  (async () => { for (const id of Object.keys(L)) await load(vpath(id)); })(); // the voice, in the background
  if (!resume) await introFilm();
  startMusic();
  if (resume) { await appear(ahead()); await say('resume', 'hello'); } else await intro();
  for (let k = S.next; k <= 6; k++) await cardRound(k);
  await finale();
}
const ahead = () => (S.mode === 'nocam' ? room.floorAhead(1.6, 2.0) : room.floorAhead(0.8, 1.5));

// the opening film: Pixo's ship crashing into the house tonight
async function introFilm() {
  if (FAST) return; S.phase = 'film';
  const v = $('#intro video'); v.src = 'img/intro.mp4'; screen('intro');
  sfx('engine', 0.5, 1.1); setTimeout(() => sfx('poof', 0.9), 4300); setTimeout(() => sfx('appear', 0.9), 4700);
  await new Promise((res) => { let done = false; const end = () => { if (!done) { done = true; res(); } }; v.onended = end; $('#skipintro').onclick = end; setTimeout(end, 9000); v.play().catch(end); });
  v.pause(); flash(); screen(null);
}

// ------------------------------------------------------------------ Pixo appears out of a portal on the floor
async function appear(pos) {
  flash(); sfx('portal'); const p = room.portal(pos, FAST ? 200 : 1700);
  await wait(T(500)); room.placePixo(pos); sfx('appear', 0.8); room.sparks(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), 40, [0x9ff3e0, 0xffe08a, 0xff9ad0], 1.3, 0.06);
  await room.fade(0, 1, FAST ? 50 : 600, true); await p;
}
async function intro() {
  S.phase = 'intro'; await wait(T(400));
  await appear(ahead());
  await say('i1', 'hello'); await say('i2', 'sad'); await say('i3', 'talk'); await say('i4', 'talk');
}

// ------------------------------------------------------------------ the card scanner: one camera for the whole hunt, cards open portals
let onCard = null;
function cardPortal() {
  const g = new THREE.Group(); g.visible = false; const uni = { t: { value: 0 }, k: { value: 0 } }; g.userData.uni = uni;
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float t; uniform float k; varying vec2 vUv;
      void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float ring = smoothstep(0.06, 0.0, abs(r - 0.82)) + 0.5 * smoothstep(0.04, 0.0, abs(r - 0.62));
        float sw = 0.5 + 0.5 * sin(a * 5.0 + r * 12.0 - t * 8.0); float core = (1.0 - smoothstep(0.0, 0.85, r)) * (0.3 + 0.5 * sw);
        vec3 col = mix(vec3(0.35, 1.0, 0.85), vec3(1.0, 0.85, 0.4), r) * (ring + core);
        gl_FragColor = vec4(col * k, (ring + core) * k * (1.0 - smoothstep(0.92, 1.0, r))); }` }));
  disc.position.set(0, 0, 0.02); g.add(disc); return g;
}
async function startMind() {
  try {
    const { MindARThree } = await import('mindar-image-three');
    const m = new MindARThree({ container: $('#scanbox'), imageTargetSrc: 'targets.mind', maxTrack: 1, uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: 0.0001, filterBeta: 0.001 });
    const portals = [];
    for (let i = 0; i < 6; i++) {
      const a = m.addAnchor(i), p = cardPortal(); p.position.y = 0; a.group.add(p); portals.push(p);
      a.onTargetFound = () => { if (TEST) console.warn('target seen', i + 1, 'want', S.want); onCard?.(i + 1, p); };
    }
    document.body.classList.add('cam');
    await m.start();
    m.renderer.setAnimationLoop((t) => { for (const p of portals) { const u = p.userData.uni; u.t.value = t / 1000; } m.renderer.render(m.scene, m.camera); });
    m.pause(true); mind = m; mind.portals = portals; room.setFeed(m.video); return true;
  } catch (e) { console.warn('camera or card scanner unavailable, playing without camera', e); document.body.classList.remove('cam'); return false; }
}
async function scan(k) {
  S.phase = `scan${k}`; S.want = k; const sc = $('#scan'), finale = k === 1 && S.got === 6;
  sc.querySelector('.kick').textContent = finale ? 'Le grand final' : `Carte ${k} sur 6`;
  sc.querySelector('.t').textContent = finale ? 'Posez la carte 1 et regardez-la' : `Montrez la carte ${k} !`;
  sc.querySelector('.nocam img').src = `cards/c${k}.jpg`; $('#foundbtn').textContent = `J’ai trouvé la carte ${k}`;
  room.pixo.g.visible = false; for (const id of [...room.sprites.keys()]) if (id !== 'ship') room.removeSprite(id);
  let found; const done = new Promise((r) => { found = r; });
  window.__chasse.found = (n) => found(n);
  $('#foundbtn').onclick = () => found(k); $('#skipscan').onclick = () => found(k);
  sc.classList.remove('late'); const late = setTimeout(() => sc.classList.add('late'), TEST ? 0 : 20000);
  sc.classList.toggle('nocam', S.mode !== 'cam'); screen('scan');
  let lastWrong = 0;
  if (S.mode === 'cam' && mind) {
    onCard = async (n, portal) => {
      if (n === k && S.want === k) {
        S.want = 0; sfx('detect'); sfx('portal'); portal.visible = true; const u = portal.userData.uni, t0 = performance.now();
        await new Promise((r) => { const s = () => { const x = (performance.now() - t0) / 900; u.k.value = Math.min(1, x * 1.6); portal.scale.setScalar(0.4 + 0.8 * Math.min(1, x)); x < 1 ? requestAnimationFrame(s) : r(); }; s(); });
        found(k);
      } else if (n !== k && performance.now() - lastWrong > 7000) { lastWrong = performance.now(); sfx('bad'); say('wrong', null); }
    };
    mind.unpause(); scanHum(true);
  }
  say(finale ? 'e1' : 'scan', null);
  await done; clearTimeout(late); onCard = null; S.want = 0;
  if (mind) { mind.pause(true); for (const p of mind.portals) { p.visible = false; p.userData.uni.k.value = 0; } }
  scanHum(false); if (S.mode !== 'cam') sfx('portal');
  flash(); screen(null);
}

// ------------------------------------------------------------------ one card: a piece comes back, hide and seek, a challenge for each child
// the piece floats just above Pixo's head, a little to his side, so it is always in the picture with him
const partPos = (p) => { const a = Math.atan2(p.x, -p.z); return p.clone().add(new THREE.Vector3(Math.cos(a) * 0.1, 0.66, Math.sin(a) * 0.1)); };
function stickPart(k) { const s = room.sprites.get(`p${k}`); if (s) { s.userData.base.copy(partPos(room.pixo.g.position)); s.position.copy(s.userData.base); } }
async function cardRound(k) {
  await scan(k);
  S.phase = `card${k}`;
  const at = ahead(); await appear(at);
  room.addSprite(`p${k}`, `p${k}`, partPos(at), 0.3); room.sparks(partPos(at), 34, [0xffd46a, 0xffffff], 1.0, 0.05); sfx('part');
  await say(`f${k}`, 'hello');
  if (k >= 2) await hideAndSeek(k);
  const order = S.players.map((_, i) => S.players[(i + k - 1) % S.players.length]);
  for (const p of order) await play(p, k);
  await say('repaired', 'amazed');
  await partToPocket(k);
  S.next = k + 1; save();
  if (k < 6) await clue(k + 1);
}

// Pixo vanishes and pops up somewhere around the players; they turn with the phone to find him
async function hideAndSeek(k) {
  S.phase = `hide${k}`;
  const v = say('hide', 'happy');
  await wait(T(1500));
  const side = Math.random() < 0.5 ? -1 : 1, a = room.lookYaw() + side * (2.0 + Math.random() * 0.7), r = S.mode === 'nocam' ? 1.8 + Math.random() * 0.3 : 1.1 + Math.random() * 0.4;
  const to = new THREE.Vector3(Math.sin(a) * r, -FLOOR, -Math.cos(a) * r);
  sfx('poof'); room.sprites.get(`p${k}`) && (room.sprites.get(`p${k}`).visible = false);
  await room.teleport(to, FAST ? 30 : 450); stickPart(k); const s = room.sprites.get(`p${k}`); if (s) s.visible = true;
  setTimeout(() => sfx('giggle', 0.7), 300);
  await v;
  S.hunting = true; S.seen = 0; $('#arrow').classList.add('on');
  await new Promise((res) => { S.foundPixo = res; window.__chasse.foundPixo = res; });
  S.hunting = false; $('#arrow').classList.remove('on'); sfx('found'); room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 36, [0xff9ad0, 0xffe08a, 0x9ff3e0], 1.3, 0.06);
  await say('gotme', 'happy');
}

// one child's challenge, in the sheet at the bottom; Pixo cheers or encourages
function play(p, k) {
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
          over = true; b.classList.add('ok'); sfx('good'); room.sparks((room.sprites.get(`p${k}`)?.position || room.pixo.g.position).clone(), 40, [0xffd46a, 0x9ff3e0, 0xff9ad0], 1.3, 0.06);
          await say(`good${1 + Math.floor(Math.random() * 3)}`, 'happy'); el.classList.remove('on'); await wait(T(500)); done();
        } else {
          tries++; b.classList.add('no'); sfx('bad'); setTimeout(() => b.classList.remove('no'), 500);
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

// the repaired piece flies up into the ship's slots
async function partToPocket(k) {
  const s = room.sprites.get(`p${k}`); sfx('part', 0.8);
  if (s) { const from = s.position.clone(), t0 = performance.now(); s.userData.float = false;
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 50 : 900)); s.position.lerpVectors(from, room.cam.position.clone().add(room.forward().multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.3, 0)), u * u); s.material.opacity = 1 - u * u; if (Math.random() < 0.6) room.sparks(s.position.clone(), 1, 0xffe08a, 0.2, 0.04); u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(`p${k}`); }
  S.got = k; $('#slots').children[k - 1].classList.add('got'); sfx('slot');
}

// where the next card is: a riddle for everyone, a picture for the little ones
async function clue(k) {
  S.phase = `clue${k}`; const spot = SPOTS.find((s) => s[0] === S.spots[k]) || SPOTS[0];
  $('#clue .kick').textContent = `La carte ${k} est cachée…`; $('#clue .cardmini img').src = `cards/c${k}.jpg`;
  $('#clue .riddle').textContent = (L[`h_${spot[0]}`] || '').replace(/^./, (c) => c.toUpperCase());
  const pic = $('#clue .pic'); pic.querySelector('img').src = `img/ic/${spot[0]}.webp`; pic.querySelector('span').textContent = spot[1]; pic.classList.remove('on'); $('#peek').hidden = false;
  $('#peek').onclick = () => { pic.classList.add('on'); $('#peek').hidden = true; sfx('found', 0.7); };
  $('#cluego').textContent = `On a trouvé la carte ${k} !`;
  screen('clue');
  const go = new Promise((r) => { $('#cluego').onclick = () => { sfx('tap'); r(); }; });
  await say('next_card', 'talk'); await say(`h_${spot[0]}`, 'talk', 'La carte suivante est cachée ');
  say('go_find', 'happy');
  await go; screen(null);
}

// ------------------------------------------------------------------ the finale: the ship rebuilds and takes off
async function finale() {
  await scan(1);
  S.phase = 'finale';
  const at = ahead(), a = Math.atan2(at.x, -at.z);
  const pixoAt = at.clone().add(new THREE.Vector3(Math.cos(a) * 0.32 - Math.sin(a) * 0.25, 0, Math.sin(a) * 0.32 + Math.cos(a) * 0.25)); // beside the ship, a step closer
  await appear(pixoAt);
  const H = 0.8, shipPos = at.clone().add(new THREE.Vector3(0, H / 2, 0));
  room.portal(at, FAST ? 200 : 4200); sfx('assemble');
  const ship = room.addSprite('ship', 'ship', shipPos, H, false); ship.userData.float = false; ship.material.opacity = 0;
  const voice = say('e2', 'amazed');
  for (let k = 1; k <= 6; k++) {
    const ang = a + (k - 3.5) * 0.5, from = shipPos.clone().add(new THREE.Vector3(Math.sin(ang) * 0.6, 0.5, -Math.cos(ang) * 0.6 + 0.2));
    const s = room.addSprite(`f${k}`, `p${k}`, from, 0.24); s.userData.float = false; $('#slots').children[k - 1].classList.remove('got');
    const t0 = performance.now();
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 650)); s.position.lerpVectors(from, shipPos, u * u); s.material.opacity = 1 - u * 0.8; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(`f${k}`); room.sparks(shipPos, 26, [0xffd46a, 0x9ff3e0], 1.2, 0.05); sfx('slot', 0.8, 0.9 + k * 0.06); ship.material.opacity = k / 6;
    await wait(T(220));
  }
  await voice;
  // Pixo climbs in
  const P = room.pixo.g.position, from = P.clone(), t0 = performance.now();
  sfx('hop');
  await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 1000)); P.lerpVectors(from, at, u); P.y = -FLOOR + Math.sin(u * Math.PI) * 0.4; room.pixo.uni.fade.value = 1 - u; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
  room.pixo.g.visible = false; room.pixo.uni.fade.value = 1; sfx('appear'); room.sparks(shipPos, 30, 0x9ff3e0, 1, 0.05);
  await say('e3', null);
  // lift-off
  sfx('engine'); const b0 = shipPos.clone(), t1 = performance.now();
  await new Promise((r) => { const st = () => { const u = (performance.now() - t1) / 1000; const y = u < 1 ? Math.sin(u * 40) * 0.012 : 0.6 * (u - 1) ** 2;
    ship.position.set(b0.x, b0.y + y, b0.z); if (Math.random() < 0.9) room.flame(ship.position.clone().add(new THREE.Vector3(0, -H * 0.45, 0))); if (u > 1 && Math.random() < 0.5) room.sparks(ship.position.clone().add(new THREE.Vector3(0, -H * 0.5, 0)), 2, [0xffe08a, 0x9ff3e0], 0.5, 0.05);
    u < (FAST ? 0.1 : 5) ? requestAnimationFrame(st) : r(); }; st(); });
  room.removeSprite('ship'); sfx('fanfare');
  forget(); S.phase = 'end'; scanHum(false);
  try { wake?.release(); } catch {}
  await drawDiploma();
  document.body.classList.remove('playing'); screen('end');
  if (mind) { try { mind.stop(); } catch {} } room.stopCamera(); document.body.classList.remove('cam');
}

// ------------------------------------------------------------------ the diploma: drawn here, saved as a picture on the device
const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
async function drawDiploma() {
  const c = $('#diploma'), x = c.getContext('2d'), W = c.width, H = c.height; await document.fonts?.ready;
  const [pixo, ship] = await Promise.all([loadImg('img/pixo-wave.png'), loadImg('parts/ship.png')]);
  const avs = await Promise.all(S.players.map((p) => loadImg(avatarSrc(p.av))));
  // paper, double gold frame, corner stars
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#fdf0d8'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#d9a425'; x.lineWidth = 10; x.strokeRect(36, 36, W - 72, H - 72); x.lineWidth = 3; x.strokeRect(58, 58, W - 116, H - 116);
  const star = (cx, cy, r, col) => { x.save(); x.translate(cx, cy); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fillStyle = col; x.fill(); x.restore(); };
  for (const [sx, sy] of [[58, 58], [W - 58, 58], [58, H - 58], [W - 58, H - 58]]) star(sx, sy, 26, '#f5b301');
  for (let i = 0; i < 26; i++) star(120 + Math.random() * (W - 240), 90 + Math.random() * 120, 4 + Math.random() * 6, 'rgba(245,179,1,.35)');
  x.textAlign = 'center'; x.fillStyle = '#2a2370';
  x.font = '600 34px Fredoka, sans-serif'; x.fillText('LA GRANDE CHASSE DE PIXO', W / 2, 150);
  x.font = '700 92px Fredoka, sans-serif'; const many = S.players.length > 1;
  const g = x.createLinearGradient(0, 180, 0, 280); g.addColorStop(0, '#f59e0b'); g.addColorStop(1, '#d9480f'); x.fillStyle = g;
  x.fillText(many ? 'Diplôme de Grands Explorateurs' : 'Diplôme de Grand Explorateur', W / 2, 262);
  x.fillStyle = '#5b5590'; x.font = '700 30px Nunito, sans-serif'; x.fillText('décerné à', W / 2, 320);
  // the children with their badges
  const n = S.players.length, slot = Math.min(230, (W - 360) / n), y0 = 360;
  S.players.forEach((p, i) => {
    const cx = W / 2 + (i - (n - 1) / 2) * slot;
    x.fillStyle = p.color; x.beginPath(); x.arc(cx, y0 + 80, 82, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, y0 + 80, 72, 0, Math.PI * 2); x.fill();
    if (avs[i]) x.drawImage(avs[i], cx - 66, y0 + 14, 132, 132);
    x.fillStyle = '#2a2370'; x.font = `700 ${n > 4 ? 34 : 42}px Fredoka, sans-serif`; x.fillText(p.name, cx, y0 + 214);
  });
  x.fillStyle = '#4a4580'; x.font = '700 32px Nunito, sans-serif';
  const line = many ? 'pour avoir retrouvé les six morceaux du vaisseau de Pixo' : 'pour avoir retrouvé les six morceaux du vaisseau de Pixo';
  x.fillText(line, W / 2, 690); x.fillText('et l’avoir aidé à rentrer chez lui, dans les étoiles.', W / 2, 736);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  x.font = '700 26px Nunito, sans-serif'; x.fillStyle = '#7a74a8'; x.fillText(`Le ${date}`, W / 2, 800);
  // seal and signature
  x.save(); x.translate(W / 2, 925); star(0, 0, 70, '#f5b301'); x.fillStyle = '#fff7d6'; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill(); x.restore();
  x.fillStyle = '#2a2370'; x.font = '600 40px Fredoka, sans-serif'; x.fillText('Pixo', W - 330, 960); x.font = '700 22px Nunito, sans-serif'; x.fillStyle = '#7a74a8'; x.fillText('Commandant de bord', W - 330, 992);
  x.strokeStyle = '#b9b3e8'; x.lineWidth = 2; x.beginPath(); x.moveTo(W - 450, 915); x.lineTo(W - 210, 915); x.stroke();
  if (pixo) x.drawImage(pixo, W - 240, H - 360, 170, 170 * pixo.height / pixo.width);
  if (ship) x.drawImage(ship, 90, H - 360, 210, 210 * ship.height / ship.width);
}
function downloadDiploma() {
  $('#diploma').toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'diplome-grande-chasse-de-pixo.png'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
}

// ------------------------------------------------------------------ every frame: the voice follows Pixo, the arrow points to him
function onFrame() {
  if (!room.pixo.g.visible) { if (voice) voice.pan.pan.value = 0; return; }
  const b = room.pixoBearing();
  if (voice) { voice.pan.pan.value = Math.max(-0.9, Math.min(0.9, Math.sin(b.d))); voice.g.gain.value = 0.7 + 0.3 * Math.cos(b.d); }
  if (!S.hunting) return;
  const ar = $('#arrow'), sv = ar.querySelector('svg');
  if (b.on) { ar.style.opacity = 0; if (++S.seen > 45) { S.hunting = false; S.foundPixo?.(); } return; }
  S.seen = 0; ar.style.opacity = 1;
  if (Math.abs(b.d) < 0.5) { const down = b.sy < 0; ar.style.left = '50%'; ar.style.top = down ? '76%' : '26%'; sv.style.transform = `rotate(${down ? 90 : -90}deg)`; }
  else { const right = b.d > 0; ar.style.top = '50%'; ar.style.left = right ? 'calc(100% - 84px)' : '84px'; sv.style.transform = `rotate(${right ? 0 : 180}deg)`; }
}

// ------------------------------------------------------------------ boot
room = new Room($('#room'));
room.onFrame = onFrame;
room.onPixo = () => { if (S.hunting) { S.hunting = false; S.foundPixo?.(); } else if (room.pixo.clip === 'idle' && !voice) { sfx('giggle', 0.8); room.sparks(room.pixo.g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 14, 0xff9ad0, 0.8, 0.05); clip('happy'); } };
window.__chasse = { S, room, get mind() { return mind; } };
setup();
