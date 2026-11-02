// ROVA: the course. Story (Nora on the radio), levels, running a program with ROVA in 3D, and the coach.
// Nothing is stored: stars live for this visit only.
import { CHAPTERS, BLOCKS } from './levels.js';
import { run, diagnose, repetition, whereFromGoal, count, world } from './vm.js';
import { Editor, fromSpec } from './editor.js';
import { Station } from './world3d.js';
import { sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEVELS = CHAPTERS.flatMap((c) => (c.levels || []).map((l) => ({ ...l, ch: c })));
const stars = new Map(), seenIntro = new Set();

const station = new Station($('scene'), sound);
const ed = new Editor($('prog'), $('pal'), { sound, onChange: () => changed(), onFull: () => full() });

let stepMode = false, L = null, idx = 0, runId = 0, busy = false, fails = 0, hintLv = 0, predicted = null, lastRun = null, stepper = null, speed = 1, fp = false, fullSaid = false, tries = 0;

// ------------------------------------------------------------------ Nora on the radio
let talkId = 0;
async function say(id, { wait = false } = {}) {
  const my = ++talkId; const r = $('radio'); clearTimeout(say.t);
  $('cap').textContent = sound.text(id); r.classList.add('on'); r.classList.remove('done', 'mini'); r.dataset.id = id;
  $('go').hidden = !wait;
  if (!wait) { await sound.say(id); if (my === talkId) { r.classList.add('done'); if (portrait()) say.t = setTimeout(() => my === talkId && r.classList.add('mini'), 4500); } return; }
  const p = sound.say(id).then(() => { if (my === talkId) r.classList.add('done'); });
  await new Promise((res) => { $('go').onclick = () => { sound.stopVoice(); res(); }; });
  await p; $('go').hidden = true;
}
$('again').onclick = () => { const id = $('radio').dataset.id; if (id) sound.say(id); };
const portrait = () => innerWidth <= 760 && innerHeight > innerWidth;
// a folded box opens again with a tap
$('radio').addEventListener('click', (e) => { const r = $('radio'); if (r.classList.contains('mini') && !e.target.closest('button')) { r.classList.remove('mini'); clearTimeout(say.t); say.t = setTimeout(() => r.classList.add('mini'), 6000); } });
// on a phone held upright the coach's hints sit in the program panel, the scene stays clear
function place() { const h = $('hint'); if (portrait()) { if (h.parentElement !== document.querySelector('.panel')) document.querySelector('.panel').insertBefore(h, $('tip')); } else if (h.parentElement !== $('stage')) $('stage').append(h); }
addEventListener('resize', place); place();
function hush() { talkId++; sound.stopVoice(); $('radio').classList.remove('on'); }

// ------------------------------------------------------------------ levels
function hud() {
  const c = L.ch;
  $('chap').textContent = `Chapitre ${c.n} · ${c.idea}`; $('lvname').textContent = L.name;
  $('dots').innerHTML = c.levels.map((l) => `<i class="${l.id === L.id ? 'on' : ''} ${stars.has(l.id) ? 'ok' : ''}"></i>`).join('');
  memory();
}
function memory() {
  const used = ed.size, lim = L.limit;
  if (!lim) { $('mem').innerHTML = `<span>${used} bloc${used > 1 ? 's' : ''}</span>`; $('mem').classList.remove('lim'); return; }
  $('mem').classList.add('lim');
  $('mem').innerHTML = `<span>Mémoire</span>` + Array.from({ length: lim }, (_, i) => `<i class="${i < used ? 'on' : ''}"></i>`).join('') + `<span>${used}/${lim}</span>`;
}
async function open(i, { fromStart = false } = {}) {
  hush(); runId++; busy = false; idx = i; L = LEVELS[i]; document.body.classList.remove('story', 'running', 'home');
  fails = 0; hintLv = 0; predicted = null; lastRun = null; stepper = null; fullSaid = false; tries = 0;
  for (const s of ['result', 'map', 'home']) $(s).classList.remove('on');
  hint(null); station.onTile = null; setFP(false);
  station.goal.yaw = 0.55; station.goal.pitch = 1.0; station.load(L, { lights: L.ch.n >= 3 ? 1 : 0 });
  ed.setup({ blocks: L.blocks, limit: L.limit, program: L.program, locked: L.mode === 'predict' });
  document.body.dataset.mode = L.mode || 'build';
  $('run').textContent = L.mode === 'predict' ? 'Vérifier ma prédiction' : '▶ Lancer';
  $('run').disabled = L.mode === 'predict';
  hud(); $('tip').textContent = L.tip || '';
  station.rova.face('idle');
  // a new chapter starts with its story
  const my = runId;
  if (L === LEVELS.find((l) => l.ch === L.ch) && !seenIntro.has(L.ch.n)) {
    seenIntro.add(L.ch.n); document.body.classList.add('story');
    if (L.ch.n === 1) { station.rova.face('sleep'); station.lightning(); }
    for (const [k, id] of L.ch.intro.entries()) {
      if (L.ch.n === 1 && k === 1) station.rova.boot();
      await say(id, { wait: true }); if (my !== runId) return;
    }
    document.body.classList.remove('story');
  }
  if (L.newBlock) $('pal').querySelector(`[data-op="${L.newBlock}"]`)?.classList.add('new');
  if (L.mode === 'predict') { station.onTile = (x, y) => { if (busy || lastRun) return; predicted = { x, y }; station.mark(x, y); $('run').disabled = false; $('ptip').classList.remove('on'); }; $('ptip').classList.add('on'); }
  for (const id of L.say) { await say(id); if (my !== runId) return; }
}
function changed() { memory(); hint(null); ed.unmark('hint'); ed.unmark('err'); if (lastRun) reset(); repeatGlow(); }
function repeatGlow() { const b = $('pal').querySelector('[data-op="repeat"]'); if (b) b.classList.toggle('glow', !!repetition(ed.prog)); }
async function full() {
  memory(); $('mem').classList.remove('bump'); void $('mem').offsetWidth; $('mem').classList.add('bump'); setTimeout(() => $('mem').classList.remove('bump'), 1200);
  hint(`La mémoire de ROVA est pleine : ${L.limit} blocs au maximum.`);
  if (!fullSaid) { fullSaid = true; await say(L.id === '2-1' ? 'l21hint' : 'h_limit'); }
}
function reset() { runId++; busy = false; stepper = null; lastRun = null; station.load(L, { lights: station.lightsTo }); ed.running(null); ed.unmark('err'); if (predicted && L.mode === 'predict') station.mark(predicted.x, predicted.y); $('run').classList.remove('again'); }

// ------------------------------------------------------------------ running
// the trace is played one entry at a time; "pas à pas" waits for a tap before each block
async function go(step = false) {
  if (stepper) { stepMode = step; stepper(); return; }
  if (busy) return;
  stepMode = step;
  if (L.mode === 'predict' && !predicted) { say('h_predict'); return; }
  if (!ed.prog.length) { hint('Le programme est vide : ajoute des blocs d’abord.'); ed.el.closest('.panel').classList.add('shake'); setTimeout(() => ed.el.closest('.panel').classList.remove('shake'), 500); return; }
  if (lastRun) reset();
  hush(); hint(null); ed.unmark('hint'); setFP(fp);
  const my = ++runId; busy = true; tries++;
  const r = lastRun = run(L, ed.prog); document.body.classList.add('running');
  station.rova.face('think'); station.rova.antenna(0x5fd4ff); await sleep(250); station.rova.face('idle');
  let prev = { x: world(L).start.x, y: world(L).start.y };
  for (const e of r.trace) {
    if (my !== runId) return;
    if (stepMode) { $('step').classList.add('wait'); await new Promise((res) => { stepper = res; }); stepper = null; $('step').classList.remove('wait'); if (my !== runId) return; }
    ed.running(e.id);
    if (e.ev === 'loop') { const el = ed.el.querySelector(`[data-id="${e.id}"] .step em`); if (el) { el.textContent = `${e.i + 1}/${(ed.find(e.id)?.b.n) || ''}`; el.parentElement.classList.add('count'); } sound.tick(); await sleep(stepMode ? 0 : 160 / speed); continue; }
    await station.step(e, prev, 480 / speed);
    if (e.ev === 'move') prev = { x: e.x, y: e.y };
    if (!stepMode) await sleep(70 / speed);
  }
  if (my !== runId) return;
  ed.running(null); for (const el of ed.el.querySelectorAll('.step.count')) el.classList.remove('count');
  for (const el of ed.el.querySelectorAll('.blk.op-repeat')) { const f = ed.find(el.dataset.id); const em = el.querySelector('.step em'); if (f && em) em.textContent = f.b.n; }
  document.body.classList.remove('running'); busy = false; $('run').classList.add('again');
  if (r.loopy) { hint('Le programme est trop long : ROVA s’arrête par sécurité.'); return; }
  if (L.mode === 'predict') return judgePredict(r);
  if (r.ok) return win(r);
  return coach(r);
}
async function judgePredict(r) {
  const right = predicted.x === r.end.x && predicted.y === r.end.y;
  station.mark(r.end.x, r.end.y, right ? 0x5dff9d : 0x5fd4ff, !right);
  if (right) { station.confetti(); station.rova.face('love', 2500); } else station.rova.face('surprised', 1500);
  const n = right && tries === 1 ? 3 : 1;
  await say(right ? L.right : L.wrong);
  if (!right) { hint('Le trajet est tracé en bleu au sol. Tu peux relancer pour le revoir, ou passer à la suite.'); }
  result(n, right ? 'Prédiction juste !' : 'La bonne case était celle du drapeau bleu.', right ? '' : 'Prédire, puis vérifier : c’est la démarche scientifique.');
}
async function win(r) {
  const n = ed.size, par = L.par || n, s = n <= par ? 3 : n <= par + 2 ? 2 : 1;
  station.rova.antenna(0x5dff9d); await station.win();
  stars.set(L.id, Math.max(s, stars.get(L.id) || 0)); hud();
  const last = L.id === L.ch.levels.at(-1).id;
  if (L.id === '2-5') { station.setLights(1); sound.power(); station.rova.face('proud'); }
  await say(L.ok);
  const rep = BLOCKS.repeat && L.blocks.includes('repeat') && repetition(ed.prog);
  if (s < 3 && rep) { rep.ids.forEach((id) => ed.mark(id, 'hint')); await say('h_pattern'); }
  else if (!last) await say(s === 3 ? 'ok3' : 'ok2');
  if (L.end) await say(L.end);
  result(s, s === 3 ? 'Programme parfait' : 'Mission réussie', s === 3 ? `${n} bloc${n > 1 ? 's' : ''}, le minimum.` : `${n} blocs. Le minimum est ${par} : à toi de le trouver ?`);
}
// ------------------------------------------------------------------ the coach
const nameOf = (op) => ({ fwd: '« Avancer »', left: '« Tourner à gauche »', right: '« Tourner à droite »' })[op];
async function coach(r) {
  fails++; const nums = ed.numbers();
  station.rova.face(r.bump ? 'dizzy' : 'sad', 1800);
  if (r.bump) {
    ed.mark(r.bump.id, 'err');
    const W = world(L), nx = r.bump.at.x, ny = r.bump.at.y, crate = W.cell(nx, ny) === '#';
    hint(`Au bloc ${nums.get(r.bump.id)}, ROVA ${crate ? 'a foncé dans une caisse' : 'allait tomber du bord'}. Regarde où il était juste avant ce bloc, et dans quelle direction il regardait.`);
    hintLv = 0; offerMore(r); await say(crate ? 'h_wall' : 'h_void');
    return;
  }
  hintLv = 0; offerMore(r); await more(r);
}
function offerMore(r) { $('more').hidden = false; $('more').onclick = () => more(r); }
async function more(r) {
  hintLv++; const d = diagnose(L, ed.prog), nums = ed.numbers(), w = whereFromGoal(r);
  if (!d) { // no single fix: say what is wrong with where it ended
    const miss = (r.W.cells.length - r.got.size) + (r.W.lamps.length - r.lit.size);
    if (r.atGoal && miss) { hint(`ROVA est sur le chargeur, mais il manque ${miss} ${r.W.lamps.length ? 'lampe' : 'pile'}${miss > 1 ? 's' : ''}.`); await say('h_forgot'); }
    else if (w) { hint(`ROVA s’est arrêté à ${w.dist} case${w.dist > 1 ? 's' : ''} du but${w.ahead > 0 && !w.side ? ', tout droit devant lui' : ''}.${miss ? ` Et il manque ${miss} objet${miss > 1 ? 's' : ''} à ramasser.` : ''}`); await say(w.ahead > 0 && !w.side ? 'h_short' : 'h_far'); }
    else { hint('Ce n’est pas encore ça. Regarde le trajet bleu au sol, bloc par bloc.'); await say('h_far'); }
    $('more').hidden = true; return;
  }
  const k = nums.get(d.id) || nums.size, b = ed.find(d.id)?.b;
  const general = { wrong_turn: ['Un virage part du mauvais côté.', 'h_turn'], missing_step: ['Il manque un pas.', 'h_short'], extra_step: ['Il y a un pas de trop.', 'h_far'],
    missing_turn: ['Il manque un virage.', 'h_far'], extra_turn: ['Il y a un virage de trop.', 'h_far'], count: ['La boucle ne tourne pas le bon nombre de fois.', 'h_count'] }[d.kind];
  if (hintLv === 1) { hint(general[0] + ' Clique sur « Encore un indice » si tu veux de l’aide.'); await say(general[1]); return; }
  if (hintLv === 2) { ed.mark(d.id, 'hint'); hint(`${general[0]} Regarde autour du bloc ${k}.`); await say('h_look'); return; }
  // the third hint shows the way: the fixed program's path as orange dots, and what to change
  const precise = {
    wrong_turn: `Change le bloc ${k} en ${nameOf(d.to)}.`, missing_step: `Ajoute un « Avancer » ${d.i === 0 ? 'au début' : `après le bloc ${k}`}${d.path.length ? ', dans la boucle' : ''}.`,
    extra_step: `Retire le bloc ${k}.`, missing_turn: `Ajoute un ${nameOf(d.to)} ${d.i === 0 ? 'au début' : `après le bloc ${k}`}.`, extra_turn: `Retire le bloc ${k}.`, count: `Règle la boucle (bloc ${k}) sur ${d.to} fois.`,
  }[d.kind];
  ed.mark(d.id, 'hint'); hint(precise + ' Le chemin orange au sol montre où ROVA irait alors.');
  const fixed = JSON.parse(JSON.stringify(ed.prog)); applyFix(fixed, d); const t = run(L, fixed).trace.filter((e) => e.ev === 'move');
  station.ghost(t.map((e) => ({ x: e.x, y: e.y }))); $('more').hidden = true; void b;
}
function applyFix(p, d) {
  const list = d.path.reduce((l, i) => l[i].body, p);
  if (d.kind === 'wrong_turn') list[d.i].op = d.to;
  else if (d.kind === 'count') list[d.i].n = d.to;
  else if (d.kind === 'extra_step' || d.kind === 'extra_turn') list.splice(d.i, 1);
  else list.splice(d.i, 0, { id: 'fix', op: d.kind === 'missing_step' ? 'fwd' : d.to });
}
function hint(t) { const h = $('hint'); if (!t) { h.classList.remove('on'); $('more').hidden = true; return; } h.querySelector('p').textContent = t; h.classList.add('on'); }

// ------------------------------------------------------------------ result card, map, home
function result(n, title, sub) {
  const c = $('result'); c.querySelector('h3').textContent = title; c.querySelector('p').textContent = sub || '';
  const st = c.querySelector('.stars'); st.innerHTML = [0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}" style="--d:${i * 0.25}s">★</i>`).join('');
  [0, 1, 2].forEach((i) => i < n && setTimeout(() => sound.star(i), 300 + i * 250));
  const next = LEVELS[idx + 1];
  $('next').textContent = next ? (next.ch !== L.ch ? `Chapitre ${next.ch.n} ▸` : 'Mission suivante ▸') : 'Bientôt la suite';
  $('next').disabled = !next; c.classList.add('on');
  $('replay').textContent = L.mode === 'predict' ? 'Revoir' : n < 3 ? 'Améliorer mon programme' : 'Rejouer';
}
$('next').onclick = () => { const nx = LEVELS[idx + 1]; if (nx) open(idx + 1); };
$('replay').onclick = () => { $('result').classList.remove('on'); hint(null); if (L.mode === 'predict') { reset(); } };
function map() {
  $('maplist').innerHTML = CHAPTERS.map((c) => `<li class="${c.soon ? 'soon' : ''}"><div><small>Chapitre ${c.n} · ${c.idea}</small><b>${c.title}</b></div>
    ${c.soon ? '<em>Bientôt</em>' : `<div class="lv">${c.levels.map((l) => `<button data-lv="${l.id}" title="${l.name}">${l.id.split('-')[1]}${stars.has(l.id) ? `<s>${'★'.repeat(stars.get(l.id))}</s>` : ''}</button>`).join('')}</div>`}</li>`).join('');
  $('map').classList.add('on');
}
$('maplist').addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b) open(LEVELS.findIndex((l) => l.id === b.dataset.lv)); });
$('b-map').onclick = () => map(); $('map-x').onclick = () => $('map').classList.remove('on');
$('start').onclick = () => { sound.unlock(); open(0); };
$('choose').onclick = () => { sound.unlock(); map(); };
$('b-mute').onclick = () => { const m = !$('b-mute').classList.toggle('on'); sound.mute(!m); };

// ------------------------------------------------------------------ controls
$('run').onclick = () => { sound.unlock(); go(false); };
$('step').onclick = () => { sound.unlock(); go(true); };
$('reset').onclick = () => { reset(); hint(null); };
$('clear').onclick = () => { if (!busy) ed.clear(); };
$('speed').onclick = () => { speed = speed === 1 ? 2 : 1; $('speed').textContent = speed === 1 ? '×1' : '×2'; };
function setFP(on) { station.firstPerson(on); $('b-eye').classList.toggle('on', on); }
$('b-eye').onclick = () => { fp = !fp; setFP(fp); };
$('b-cam').onclick = () => { fp = false; setFP(false); station.goal.yaw = 0.55; station.goal.pitch = 1.0; station.fit(); };
addEventListener('keydown', (e) => {
  if (!L || $('home').classList.contains('on') || e.target.closest('input')) return;
  if ($('result').classList.contains('on')) { if (e.key === 'Enter') $('next').click(); return; }
  if (!$('go').hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); $('go').click(); return; }
  const k = { ArrowUp: 'fwd', ArrowLeft: 'left', ArrowRight: 'right', r: 'repeat', R: 'repeat' }[e.key];
  if (k && L.blocks.includes(k) && !busy) { e.preventDefault(); ed.insert(k); return; }
  if ((e.key === 'Backspace' || e.key === 'Delete') && !busy) { e.preventDefault(); ed.removeLast(); return; }
  if (e.key === 'Enter') { e.preventDefault(); $('run').click(); return; }
  if (e.key === 's' || e.key === 'S') { $('step').click(); return; }
  if ((e.key === '+' || e.key === '-') && ed.sel) { ed.setN(ed.sel, e.key === '+' ? 1 : -1); }
});

// the home screen shows the first room, ROVA asleep
// the scene's free area: between Nora's box (top) and the buttons (bottom), in screen units from -1 to 1
function ui() { const h = $('scene').clientHeight || 1, port = portrait();
  station.ui = { top: 1 - 2 * ((port ? 96 : 215) / h), bottom: -1 + 2 * ((port ? 56 : 70) / h) }; station.fit(); }
addEventListener('resize', ui); ui();
station.load(LEVELS[0], { lights: 0 }); station.rova.face('sleep'); station.goal.yaw = 0.3;
window.__rova = { station, ed, open, go, LEVELS, get busy() { return busy; }, get lastRun() { return lastRun; }, more: () => lastRun && more(lastRun), sound };
