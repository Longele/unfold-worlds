// La Grande Chasse: the game. Pixo, a filmed little alien, appears in the room through the phone; the children find
// the six printed cards hidden in the house, each card is a portal where a piece of his ship comes back, each child
// passes a challenge for their age, and at the end the ship rebuilds and takes off. Nothing is stored anywhere.
import * as THREE from 'three';
import { Room, FLOOR } from './room.js';
import { LINES } from './lines.js';
import { challenge, SPOTS } from './games.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = new URLSearchParams(location.search), TEST = Q.has('test'), FAST = TEST && !Q.has('anim'); // test hooks: short voices, and short animations unless &anim
const T = (ms) => (FAST ? Math.min(ms, 120) : ms);
const L = LINES.fr;
const PARTS = ['la bulle de pilote', 'le moteur', 'les ailes', 'l’antenne', 'le réservoir d’étoiles', 'les pieds d’atterrissage'];
const PCOL = ['#ff5f8a', '#2fa8e0', '#f2a516', '#8d63e0', '#2fb86a', '#e8456f'];
const AGES = [['p', '3 à 5 ans'], ['m', '6 à 8 ans'], ['g', '9 à 12 ans']];

const S = { phase: 'home', players: [], spots: {}, mode: 'cam', card: 0, got: 0, hunting: false, seen: 0 };
let room, ac, master;

// ------------------------------------------------------------------ sound: Pixo's voice placed in the room, little synth effects
const buf = {};
async function load(id) {
  if (!buf[id]) buf[id] = fetch(`audio/fr/${id}.mp3`).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).catch(() => null);
  return buf[id];
}
let voice = null, sayTok = 0;
function stopVoice() { try { voice?.src.stop(); } catch {} voice = null; }
async function playVoice(id) {
  const b = ac && await load(id); stopVoice();
  if (!b || TEST) return wait(TEST ? 150 : 1500 + (L[id] || '').length * 55);
  const src = ac.createBufferSource(); src.buffer = b;
  const pan = ac.createStereoPanner(), g = ac.createGain(); src.connect(g).connect(pan).connect(master);
  const v = voice = { src, pan, g }; src.start();
  return new Promise((res) => { src.onended = () => { if (voice === v) voice = null; res(); }; });
}
const clip = (name) => Promise.race([room.pixo.play(name), wait(TEST ? 100 : 7000)]);
// Pixo says a line: the text on screen, the voice from where he stands, his body moving while he talks
async function say(id, first = 'talk', prefix = '') {
  const my = ++sayTok; const el = $('#say'); const txt = L[id] || ''; el.textContent = prefix ? prefix + txt.charAt(0).toLowerCase() + txt.slice(1) : txt; el.classList.add('on');
  let ended = false; const a = playVoice(id).then(() => { ended = true; });
  if (first && room.pixo.g.visible) (async () => { let c = first; while (!ended && my === sayTok) { await clip(c); c = 'talk'; } })();
  await a;
  setTimeout(() => { if (my === sayTok) el.classList.remove('on'); }, 1400);
  return my === sayTok; // false when another line cut this one
}
async function says(ids, first) { for (const id of ids) { if (!await say(id, first)) return; first = 'talk'; } }

function tone(f, t0, dur, type = 'sine', vol = 0.18, f2) {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, ac.currentTime + t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + t0 + dur);
  g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ac.currentTime + t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t0 + dur);
  o.connect(g).connect(master); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
}
function noise(dur, vol = 0.2, from = 300, to = 3000) {
  if (!ac) return; const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(from, ac.currentTime); f.frequency.exponentialRampToValueAtTime(to, ac.currentTime + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur); n.connect(f).connect(g).connect(master); n.start();
}
const sfx = {
  portal() { noise(1.1, 0.25, 200, 4000); tone(220, 0, 0.9, 'triangle', 0.12, 880); tone(330, 0.15, 0.8, 'sine', 0.1, 1320); },
  good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.16)); },
  bad() { tone(300, 0, 0.18, 'sine', 0.14, 220); tone(240, 0.16, 0.25, 'sine', 0.12, 180); },
  whoosh() { noise(0.6, 0.18, 2500, 300); },
  pop() { tone(500, 0, 0.12, 'sine', 0.2, 1200); },
  part() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.5, 'sine', 0.12)); noise(0.5, 0.08, 3000, 6000); },
  fanfare() { [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.4, 'square', 0.07)); },
  engine() { noise(4.5, 0.35, 120, 900); tone(60, 0, 4, 'sawtooth', 0.08, 140); },
};

// ------------------------------------------------------------------ screens
function screen(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); }
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

// ------------------------------------------------------------------ setup: who plays, where the cards are hidden (kept in memory only)
function playerRow(name = '', age = 'm') {
  const d = document.createElement('div'); d.className = 'player';
  d.innerHTML = `<input maxlength="16" placeholder="Prénom" autocomplete="off" value="${name}"><span class="ages">${AGES.map(([a, l]) => `<button data-a="${a}" class="${a === age ? 'on' : ''}">${l}</button>`).join('')}</span><button class="x" aria-label="Retirer">✕</button>`;
  d.querySelectorAll('.ages button').forEach((b) => b.onclick = () => { d.querySelectorAll('.ages button').forEach((x) => x.classList.toggle('on', x === b)); });
  d.querySelector('.x').onclick = () => { if ($('#players').children.length > 1) d.remove(); };
  $('#players').append(d);
}
function setup() {
  playerRow('', 'p'); playerRow('', 'p');
  $('#addp').onclick = () => { if ($('#players').children.length < 6) playerRow(); };
  const def = ['canape', 'frigo', 'lit', 'livres', 'jouets'];
  $('#spots').innerHTML = [2, 3, 4, 5, 6].map((k, i) => `<div class="row"><b>Carte ${k}</b><select data-k="${k}">${SPOTS.map(([id, e, l]) => `<option value="${id}" ${id === def[i] ? 'selected' : ''}>${e} ${l}</option>`).join('')}</select></div>`).join('');
  const coarse = matchMedia('(pointer: coarse)').matches; S.mode = coarse ? 'cam' : 'nocam';
  document.querySelectorAll('.modes button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.onclick = () => { S.mode = b.dataset.mode; document.querySelectorAll('.modes button').forEach((x) => x.classList.toggle('on', x === b)); }; });
  $('#toSetup').onclick = () => screen('setup');
  $('#go').onclick = go;
  $('#again').onclick = () => location.reload();
  $('#slots').innerHTML = [1, 2, 3, 4, 5, 6].map((k) => `<i style="background-image:url(parts/p${k}.png)"></i>`).join('');
}

// ------------------------------------------------------------------ start (a tap, so sound, video and motion sensors may start)
async function go() {
  S.players = [...document.querySelectorAll('.player')].map((d, i) => ({ name: d.querySelector('input').value.trim() || `Explorateur ${i + 1}`, age: d.querySelector('.ages .on')?.dataset.a || 'm', color: PCOL[i % PCOL.length] }));
  document.querySelectorAll('#spots select').forEach((s) => { S.spots[+s.dataset.k] = s.value; });
  ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination); ac.resume();
  room.pixo.unlock();
  screen(null); document.body.classList.add('playing'); S.phase = 'start';
  if (S.mode === 'cam') { const g = room.startGyro(); const c = await room.startCamera(); await g; if (!c) S.mode = 'nocam'; }
  if (S.mode === 'nocam') { room.drawRoom(); room.pitch = -0.5; }
  if (!room.useGyro) $('#arrow em').innerHTML = 'Pixo est par là !<br>Glissez ou ← →';
  // the voice files load in the background, the first ones first
  (async () => { for (const id of Object.keys(L)) await load(id); })();
  await intro();
  for (let k = 1; k <= 6; k++) await cardRound(k);
  await finale();
}

// ------------------------------------------------------------------ Pixo appears
async function appear(pos) {
  flash(); sfx.portal(); room.placePixo(pos); room.pixo.uni.fade.value = 0; room.sparks(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), 40, 0x9ff3ff, 1.4);
  const t0 = performance.now(); await new Promise((r) => { const s = () => { const k = Math.min(1, (performance.now() - t0) / 500); room.pixo.uni.fade.value = k; k < 1 ? requestAnimationFrame(s) : r(); }; s(); });
}
async function intro() {
  S.phase = 'intro'; await wait(T(600));
  await appear(room.floorAhead(0.8, 1.5));
  await say('i1', 'hello'); await say('i2', 'sad'); await say('i3', 'talk'); await say('i4', 'talk');
}

// ------------------------------------------------------------------ scanning a card: the card is a portal
let mind = null;
async function scan(k) {
  S.phase = `scan${k}`; S.card = k; const sc = $('#scan');
  sc.querySelector('.t').textContent = k === 1 && S.got === 6 ? 'Posez la carte 1 et regardez-la' : `Montrez la carte ${k} !`;
  sc.querySelector('.nocam img').src = `cards/c${k}.jpg`; $('#foundbtn').textContent = `J’ai trouvé la carte ${k}`;
  room.pixo.g.visible = false; for (const id of [...room.sprites.keys()]) if (id !== 'ship') room.removeSprite(id);
  let found;
  const done = new Promise((r) => { found = r; });
  window.__chasse.found = (n) => found(n);
  $('#foundbtn').onclick = () => found(k);
  let skip = sc.querySelector('#skipscan');
  if (!skip) { skip = document.createElement('button'); skip.id = 'skipscan'; skip.className = 'ghost'; sc.append(skip); }
  skip.textContent = 'La carte ne se détecte pas ? Continuer'; skip.onclick = () => found(k); sc.classList.remove('late');
  const late = setTimeout(() => sc.classList.add('late'), TEST ? 0 : 20000);
  sc.classList.toggle('nocam', S.mode !== 'cam'); screen('scan');
  if (S.mode === 'cam') startMind(k, found).catch((e) => { console.warn('MindAR failed, card button instead', e); sc.classList.add('nocam'); });
  say('scan', null);
  await done; clearTimeout(late);
  flash(); sfx.portal(); await stopMind(); screen(null);
  if (S.mode === 'cam') await room.startCamera();
}
async function startMind(k, found) {
  room.stopCamera(); const box = $('#scanbox'); box.classList.add('on');
  const { MindARThree } = await import('mindar-image-three');
  const m = mind = new MindARThree({ container: box, imageTargetSrc: 'targets.mind', maxTrack: 1, uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: 0.0001, filterBeta: 0.001 });
  let lastWrong = 0;
  for (let i = 0; i < 6; i++) {
    const a = m.addAnchor(i);
    a.onTargetFound = () => { if (TEST) console.warn('target seen', i + 1, 'want', k);
      if (i === k - 1) found(k);
      else if (performance.now() - lastWrong > 7000) { lastWrong = performance.now(); sfx.bad(); say('wrong', null); }
    };
  }
  await m.start(); if (mind !== m) return;
  m.renderer.setAnimationLoop(() => m.renderer.render(m.scene, m.camera));
}
async function stopMind() {
  const m = mind; mind = null; const box = $('#scanbox'); box.classList.remove('on');
  if (!m) return; try { m.renderer.setAnimationLoop(null); await m.stop(); m.renderer.dispose(); } catch {} box.innerHTML = '';
}

// ------------------------------------------------------------------ one card: a piece comes back, hide and seek, a challenge for each child
// the piece floats just above Pixo's head, a little to his side, so it is always in the picture with him
const partPos = (p) => { const a = Math.atan2(p.x, -p.z); return p.clone().add(new THREE.Vector3(Math.cos(a) * 0.1, 0.64, Math.sin(a) * 0.1)); };
function stickPart(k) { const s = room.sprites.get(`p${k}`); if (s) { s.userData.base.copy(partPos(room.pixo.g.position)); s.position.copy(s.userData.base); } }
async function cardRound(k) {
  await scan(k);
  S.phase = `card${k}`;
  const at = room.floorAhead(0.7, 1.4); await appear(at);
  room.addSprite(`p${k}`, `p${k}`, partPos(at), 0.3); room.sparks(partPos(at), 30, 0xffd46a); sfx.part();
  await say(`f${k}`, 'hello');
  if (k >= 2) await hideAndSeek(k);
  const order = S.players.map((_, i) => S.players[(i + k - 1) % S.players.length]);
  for (const p of order) await play(p, k);
  await say('repaired', 'amazed');
  await partToPocket(k);
  if (k < 6) await clue(k + 1);
  else await say('e1', 'happy');
}

// Pixo hops away around the players; they turn with the phone to find him
async function hideAndSeek(k) {
  S.phase = `hide${k}`;
  const voice = say('hide', 'happy');
  await wait(T(1500));
  const P = room.pixo.g.position, from = Math.atan2(P.x, -P.z), r0 = Math.hypot(P.x, P.z);
  const side = Math.random() < 0.5 ? -1 : 1, to = from + side * (2.1 + Math.random() * 0.6), r1 = 1.1 + Math.random() * 0.4;
  sfx.whoosh(); const t0 = performance.now(), ms = FAST ? 50 : 1600;
  await new Promise((res) => { const s = () => { const u = Math.min(1, (performance.now() - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    const a = from + (to - from) * e, r = r0 + (r1 - r0) * e; P.set(Math.sin(a) * r, -FLOOR + Math.abs(Math.sin(u * Math.PI * 3)) * 0.35 * (1 - u * 0.5), -Math.cos(a) * r); stickPart(k);
    u < 1 ? requestAnimationFrame(s) : res(); }; s(); });
  P.y = -FLOOR; stickPart(k); sfx.pop();
  await voice;
  S.hunting = true; S.seen = 0; $('#arrow').classList.add('on');
  await new Promise((r) => { S.foundPixo = r; window.__chasse.foundPixo = r; });
  S.hunting = false; $('#arrow').classList.remove('on'); sfx.good(); room.sparks(P.clone().add(new THREE.Vector3(0, 0.3, 0)), 30, 0xff9ad0);
  await say('gotme', 'happy');
}

// one child's challenge, in the panel at the bottom; Pixo cheers or encourages
function play(p, k) {
  return new Promise(async (done) => {
    S.phase = `play${k}`; const c = challenge(p.age), el = $('#challenge');
    el.style.setProperty('--c', p.color); el.querySelector('.who').textContent = `${p.name}, à toi !`;
    el.querySelector('.q').innerHTML = c.text; el.classList.toggle('big', !!c.big);
    let tries = 0, over = false;
    el.querySelector('.opts').innerHTML = ''; c.options.forEach((o) => {
      const b = document.createElement('button'); b.innerHTML = o.html; if (o.ok) b.dataset.ok = '1';
      b.onclick = async () => {
        if (over) return;
        if (o.ok) {
          over = true; b.classList.add('ok'); sfx.good(); room.sparks(room.sprites.get(`p${k}`)?.position || room.pixo.g.position, 35, 0xffd46a);
          await say(`good${1 + Math.floor(Math.random() * 3)}`, 'happy'); el.classList.remove('on'); await wait(T(500)); done();
        } else {
          tries++; b.classList.add('no'); sfx.bad(); setTimeout(() => b.classList.remove('no'), 500);
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

// the repaired piece flies to the ship's slots at the top of the screen
async function partToPocket(k) {
  const s = room.sprites.get(`p${k}`); sfx.part();
  if (s) { const b = s.userData.base, from = b.clone(), t0 = performance.now(); s.userData.float = false;
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 50 : 900)); s.position.lerpVectors(from, room.cam.position.clone().add(room.forward().multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.25, 0)), u * u); s.material.opacity = 1 - u * u; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(`p${k}`); }
  S.got = k; $('#slots').children[k - 1].classList.add('got');
}

// where the next card is: a riddle for everyone, a picture for the little ones
async function clue(k) {
  S.phase = `clue${k}`; const spot = SPOTS.find((s) => s[0] === S.spots[k]) || SPOTS[0];
  $('#clue .riddle').textContent = (L[`h_${spot[0]}`] || '').replace(/^./, (c) => c.toUpperCase());
  const pic = $('#clue .pic'); pic.textContent = spot[1]; pic.classList.remove('on');
  $('#peek').onclick = () => { pic.classList.add('on'); sfx.pop(); };
  $('#cluego').textContent = `On a trouvé la carte ${k} !`;
  screen('clue');
  const go = new Promise((r) => { $('#cluego').onclick = r; });
  await say('next_card', 'talk'); await say(`h_${spot[0]}`, 'talk', 'La carte suivante est cachée ');
  say('go_find', 'happy');
  await go; screen(null);
}

// ------------------------------------------------------------------ the finale: the ship rebuilds and takes off
async function finale() {
  await scan(1);
  S.phase = 'finale';
  const at = room.floorAhead(0.9, 1.4), a = Math.atan2(at.x, -at.z);
  const pixoAt = at.clone().add(new THREE.Vector3(Math.cos(a) * 0.3 - Math.sin(a) * 0.25, 0, Math.sin(a) * 0.3 + Math.cos(a) * 0.25)); // beside the ship, a step closer
  await appear(pixoAt);
  const H = 0.8, shipPos = at.clone().add(new THREE.Vector3(0, H / 2, 0));
  const ship = room.addSprite('ship', 'ship', shipPos, H); ship.userData.float = false; ship.material.opacity = 0;
  const voice = say('e2', 'amazed');
  for (let k = 1; k <= 6; k++) {
    const ang = a + (k - 3.5) * 0.5, from = shipPos.clone().add(new THREE.Vector3(Math.sin(ang) * 0.6, 0.5, -Math.cos(ang) * 0.6 + 0.2));
    const s = room.addSprite(`f${k}`, `p${k}`, from, 0.24); s.userData.float = false; $('#slots').children[k - 1].classList.remove('got');
    const t0 = performance.now();
    await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 700)); s.position.lerpVectors(from, shipPos, u * u); s.material.opacity = 1 - u * 0.8; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
    room.removeSprite(`f${k}`); room.sparks(shipPos, 25, 0xffd46a); sfx.part(); ship.material.opacity = k / 6;
    await wait(T(250));
  }
  await voice;
  // Pixo climbs in
  const P = room.pixo.g.position, from = P.clone(), t0 = performance.now();
  await new Promise((r) => { const st = () => { const u = Math.min(1, (performance.now() - t0) / (FAST ? 40 : 1000)); P.lerpVectors(from, at, u); P.y = -FLOOR + Math.sin(u * Math.PI) * 0.4; room.pixo.uni.fade.value = 1 - u; u < 1 ? requestAnimationFrame(st) : r(); }; st(); });
  room.pixo.g.visible = false; room.pixo.uni.fade.value = 1; sfx.pop();
  await say('e3', null);
  // lift-off
  sfx.engine(); const b0 = shipPos.clone(), t1 = performance.now();
  await new Promise((r) => { const st = () => { const u = (performance.now() - t1) / 1000; const y = u < 1 ? Math.sin(u * 40) * 0.01 : 0.6 * (u - 1) ** 2;
    ship.position.set(b0.x, b0.y + y, b0.z); if (Math.random() < 0.8) room.flame(ship.position.clone().add(new THREE.Vector3(0, -H * 0.45, 0)));
    u < (FAST ? 0.1 : 5) ? requestAnimationFrame(st) : r(); }; st(); });
  room.removeSprite('ship'); sfx.fanfare();
  $('#end .names').textContent = S.players.map((p) => p.name).join(' et ').replace(/ et (?=.* et )/g, ', ');
  document.body.classList.remove('playing'); screen('end'); S.phase = 'end';
  room.stopCamera();
}

// ------------------------------------------------------------------ every frame: the voice follows Pixo, the arrow points to him
function onFrame() {
  if (!room.pixo.g.visible) { if (voice) voice.pan.pan.value = 0; return; }
  const b = room.pixoBearing();
  if (voice) { voice.pan.pan.value = Math.max(-0.9, Math.min(0.9, Math.sin(b.d))); voice.g.gain.value = 0.7 + 0.3 * Math.cos(b.d); }
  if (!S.hunting) return;
  const ar = $('#arrow'), sp = ar.firstElementChild;
  if (b.on) { ar.style.opacity = 0; if (++S.seen > 45) { S.hunting = false; S.foundPixo?.(); } return; }
  S.seen = 0; ar.style.opacity = 1;
  if (Math.abs(b.d) < 0.5) { const down = b.sy < 0; ar.style.left = '50%'; ar.style.top = down ? '78%' : '22%'; sp.style.transform = `rotate(${down ? 90 : -90}deg)`; }
  else { const right = b.d > 0; ar.style.top = '50%'; ar.style.left = right ? 'calc(100% - 84px)' : '84px'; sp.style.transform = `rotate(${right ? 0 : 180}deg)`; }
}

// ------------------------------------------------------------------ boot
room = new Room($('#room'));
room.onFrame = onFrame;
room.onPixo = () => { if (S.hunting) { S.hunting = false; S.foundPixo?.(); } else if (room.pixo.clip === 'idle' && !voice) { sfx.pop(); clip('happy'); } };
window.__chasse = { S, room };
setup();
