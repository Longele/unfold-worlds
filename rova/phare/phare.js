// Mission: the lighthouse. Tap the Morse key to write SOS into the lamp's memory, run it, see the sailor read it,
// fix it, make the lighthouse repeat it with a loop, guess how many flashes before running. Nothing is stored.
import { Night } from './scene.js';
import { LINES } from './lines.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const night = new Night($('scene'));

// ------------------------------------------------------------------ sound: wind, rain, sea, the key's beep, thunder, horn
let ctx = null, fx = null, voiceOn = true;
const voice = new Audio();
function unlock() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)(); fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(ctx.destination);
  const noise = (sec) => { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; } return b; };
  const loop = (f, q, v, type = 'bandpass') => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(4); s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(fx); s.start(); return { g, fl }; };
  loop(5200, 0.4, 0.05); // rain
  const sea = loop(260, 0.6, 0.18, 'lowpass'); // sea
  const wind = loop(700, 3, 0.05); // wind gusts
  const lfo = () => { const t = ctx.currentTime; sea.g.gain.setTargetAtTime(0.12 + Math.random() * 0.14, t, 1.5); wind.fl.frequency.setTargetAtTime(500 + Math.random() * 700, t, 1.2); wind.g.gain.setTargetAtTime(0.02 + Math.random() * 0.07, t, 1); };
  setInterval(lfo, 1800);
}
night.onThunder = () => { if (!ctx) return; const t = ctx.currentTime + 0.6 + Math.random() * 0.8, s = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = l * 6; }
  const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; s.buffer = b; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 2.8); s.connect(f); f.connect(g); g.connect(fx); s.start(t); };
let beepO = null;
function beep(on, f = 640) {
  if (!ctx) return;
  if (on && !beepO) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.value = 0; g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.005); o.connect(g); g.connect(fx); o.start(); beepO = { o, g }; click(); }
  if (!on && beepO) { const { o, g } = beepO; g.gain.setTargetAtTime(0, ctx.currentTime, 0.01); o.stop(ctx.currentTime + 0.08); beepO = null; }
}
function click() { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 2400; g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03); o.connect(g); g.connect(fx); o.start(); o.stop(ctx.currentTime + 0.05); }
function horn() { if (!ctx) return; const t = ctx.currentTime; for (const f of [110, 138.6]) { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.3); g.gain.setValueAtTime(0.22, t + 2.2); g.gain.exponentialRampToValueAtTime(0.001, t + 3.4); o.connect(lp); lp.connect(g); g.connect(fx); o.start(t); o.stop(t + 3.5); } }
function chime(i = 0) { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = [784, 988, 1175, 1568][i % 4]; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6); o.connect(g); g.connect(fx); o.start(t); o.stop(t + 0.7); }

// Nora (or the sailor) speaks, with a subtitle at the bottom
let talk = 0;
function say(id) {
  const my = ++talk; $('sub').textContent = LINES[id] || ''; $('sub').classList.add('on'); $('sub').classList.toggle('marin', id.startsWith('s'));
  return new Promise((res) => {
    const end = () => { voice.onended = voice.onerror = null; if (my === talk) setTimeout(() => my === talk && $('sub').classList.remove('on'), 2200); res(); };
    voice.src = `audio/${id}.mp3`; voice.muted = !voiceOn; voice.onended = end; voice.onerror = end; voice.play().catch(end);
    if (fx) { fx.gain.setTargetAtTime(0.28, ctx.currentTime, 0.2); voice.addEventListener('ended', () => fx.gain.setTargetAtTime(0.5, ctx.currentTime, 0.5), { once: true }); }
  });
}

// ------------------------------------------------------------------ Morse
const MORSE = { '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z' };
const groups = (ps) => { const g = [[]]; for (const p of ps) { if (p.k === 'g') { if (g.at(-1).length) g.push([]); } else g.at(-1).push(p); } return g.filter((x) => x.length); };
const code = (grp) => grp.map((p) => (p.k === 's' ? '.' : '-')).join('');
// one letter per group; SOS sent in one go (as real operators do) is read too
function decode(ps) { return groups(ps).map((g) => { const c = code(g); return c === '...---...' ? 'SOS' : MORSE[c] || '?'; }); }
const flashes = (ps) => ps.filter((p) => p.k !== 'g').length;

// ------------------------------------------------------------------ the program: pulses, a loop around them
let pulses = [], loopN = 1, loopShown = false, stage = 'title', running = false, fails = 0, predicted = false, saidP4 = false, down = 0, lastUp = 0, sel = -1;
const U = 0.2; // one Morse unit, in seconds

function strip(active = -1) {
  const el = $('tape'); const gs = groups(pulses); let html = '', gi = 0;
  // pulses with the letter they make under each group
  let i = 0; const letters = gs.map((g) => { const c = code(g); return c === '...---...' ? 'SOS' : MORSE[c] || '?'; });
  html += '<span class="grp">';
  pulses.forEach((p, k) => {
    if (p.k === 'g') { html += `<em class="lt">${letters[gi++] || ''}</em></span><span class="gap" data-i="${k}"></span><span class="grp">`; return; }
    html += `<button class="pu ${p.k}${k === active ? ' on' : ''}${p.bad ? ' bad' : ''}${k === sel ? ' sel' : ''}" data-i="${k}" aria-label="${p.k === 's' ? 'court' : 'long'}"></button>`; i++;
  });
  html += `<em class="lt">${pulses.length && pulses.at(-1).k !== 'g' ? letters[gi] || '' : ''}</em></span>`;
  el.innerHTML = pulses.length ? html : '<span class="empty">Appuie sur la clé pour écrire ton message</span>';
  $('count').textContent = `${flashes(pulses)} flash${flashes(pulses) > 1 ? 's' : ''}`;
  el.scrollLeft = el.scrollWidth;
  $('run').disabled = !flashes(pulses) || running;
}
$('tape').addEventListener('click', (e) => {
  const b = e.target.closest('.pu'); if (!b || running) return; const k = +b.dataset.i;
  pulses[k].k = pulses[k].k === 's' ? 'l' : 's'; pulses[k].bad = false; click(); sel = k; strip();
});
$('undo').onclick = () => { if (running) return; pulses.pop(); while (pulses.at(-1)?.k === 'g') pulses.pop(); strip(); };
$('clear').onclick = () => { if (running) return; pulses = []; strip(); };
$('minus').onclick = () => setLoop(loopN - 1); $('plus').onclick = () => setLoop(loopN + 1);
function setLoop(n) { loopN = Math.max(1, Math.min(9, n)); $('loopn').textContent = loopN; click(); }

// the key: press and hold. Short or long is decided on release.
function keyDown() { if (stage !== 'record' || running || down) return; unlock(); down = performance.now(); night.setLamp(true); beep(true); $('key').classList.add('down'); }
function keyUp() {
  if (!down) return; const now = performance.now(), dur = (now - down) / 1000;
  if (pulses.length && pulses.at(-1).k !== 'g' && (down - lastUp) / 1000 > 0.8) pulses.push({ k: 'g' });
  pulses.push({ k: dur < 0.32 ? 's' : 'l' }); down = 0; lastUp = now; night.setLamp(false); beep(false); $('key').classList.remove('down'); sel = -1; strip();
  if (!saidP4 && flashes(pulses) >= 9) { saidP4 = true; $('run').classList.add('glow'); say('p4'); }
}
$('key').addEventListener('pointerdown', (e) => { e.preventDefault(); $('key').setPointerCapture(e.pointerId); keyDown(); });
$('key').addEventListener('pointerup', keyUp); $('key').addEventListener('pointercancel', keyUp);
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); keyDown(); } if (e.key === 'Enter' && !$('run').disabled && stage === 'record') $('run').click(); });
addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); keyUp(); } });

// ------------------------------------------------------------------ the sailor's bubble, above the ship
function bubble(text, cls = '') { const b = $('bubble'); b.textContent = text; b.className = 'on ' + cls; }
function bubbleOff() { $('bubble').className = ''; }
(function place() { const p = night.shipScreen(), b = $('bubble'); if (p.front) { b.style.left = (p.x * 100) + '%'; b.style.top = (p.y * 100) + '%'; } requestAnimationFrame(place); })();

// ------------------------------------------------------------------ running the lighthouse
async function lightFor(sec) { night.setLamp(true); beep(true); await sleep(sec * 1000); night.setLamp(false); beep(false); }
async function runProgram() {
  if (running || !flashes(pulses)) return;
  // a question before running a loop, once: how many flashes?
  if (loopN > 1 && !predicted) { predicted = true; if (!await predict()) return; }
  running = true; $('run').disabled = true; $('run').classList.remove('glow'); document.body.classList.add('running');
  for (const p of pulses) p.bad = false; sel = -1;
  const read = [];
  for (let r = 0; r < loopN; r++) {
    $('rep').textContent = loopN > 1 ? `${r + 1} / ${loopN}` : ''; $('loop').classList.toggle('tick', loopN > 1);
    let letter = []; const line = [];
    for (let k = 0; k < pulses.length; k++) {
      const p = pulses[k]; strip(k);
      if (p.k === 'g') { line.push(MORSE[code(letter)] || (code(letter) === '...---...' ? 'SOS' : '?')); letter = []; bubble(read.concat([line.join(' ')]).join('\n')); await sleep(U * 2000); continue; }
      await lightFor(p.k === 's' ? U : U * 3); letter.push(p); await sleep(U * 1000);
    }
    if (letter.length) { const c = code(letter); line.push(c === '...---...' ? 'SOS' : MORSE[c] || '?'); }
    read.push(line.join(' ')); bubble(read.join('\n'));
    await sleep(U * 6000);
  }
  strip(); $('rep').textContent = ''; $('loop').classList.remove('tick'); document.body.classList.remove('running');
  const ok = decode(pulses).join('') === 'SOS';
  if (!ok) {
    fails++; bubble(read[0] + '  ?', 'bad');
    const noGaps = !pulses.some((p) => p.k === 'g');
    if (fails >= 2) mark();
    await say(noGaps && flashes(pulses) !== 9 ? 'p_gap' : 'p_bad'); running = false; strip(); return;
  }
  if (loopN === 1) { bubble('S O S… ?\nun reflet ?', 'doubt'); await say('p_once'); if (!loopShown) { loopShown = true; $('loop').classList.add('shown'); $('loopctl').classList.add('on', 'glow'); await say('p_loop'); } running = false; strip(); return; }
  if (loopN === 2) { bubble(read.join('\n') + '\n… encore ?', 'doubt'); await say('p_two'); running = false; strip(); return; }
  await win(read);
}
$('run').onclick = () => { unlock(); runProgram(); };

// after two misses: the flashes that are not where SOS needs them turn red
function mark() { const want = 'ssslllsss'; let j = 0; for (const p of pulses) { if (p.k === 'g') continue; p.bad = p.k !== want[j]; j++; } strip(); }

function predict() {
  return new Promise((res) => {
    const n = flashes(pulses), right = n * loopN, opts = [...new Set([right, n + loopN, n * (loopN + 1), right - n].filter((x) => x > 0))].slice(0, 3).sort(() => Math.random() - 0.5);
    if (!opts.includes(right)) opts[0] = right;
    const box = $('pred'); box.querySelector('.opts').innerHTML = opts.map((o) => `<button data-v="${o}">${o}</button>`).join('');
    box.querySelector('.why').textContent = ''; box.classList.add('on'); say('p_pred');
    box.querySelector('.opts').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return; const good = +b.dataset.v === right;
      for (const x of box.querySelectorAll('.opts button')) { x.disabled = true; if (+x.dataset.v === right) x.classList.add('ok'); else if (x === b) x.classList.add('no'); }
      box.querySelector('.why').textContent = `${n} flashs × ${loopN} répétitions = ${right} flashs`;
      if (good) chime(2); await say(good ? 'p_predok' : 'p_predno'); await sleep(600); box.classList.remove('on'); res(true);
    };
  });
}

async function win(read) {
  stage = 'done'; bubble(read.join('\n') + '\nSOS !', 'ok'); chime(0); await sleep(300); chime(1); await sleep(900);
  // the ship answers: O K in Morse
  bubbleOff(); const answer = '--- -.-'; let shown = '';
  for (const c of answer) { if (c === ' ') { shown += ' '; await sleep(600); continue; } night.shipSignal(1); beep(true, 520); await sleep(c === '.' ? 220 : 660); night.shipSignal(0); beep(false); await sleep(220); }
  bubble('O K', 'ok'); await say('p_answer');
  night.rescue(); horn(); await sleep(2600); bubble('Ohé, du phare !', 'ok'); await say('s1'); bubbleOff(); await sleep(800);
  await say('p_end'); await sleep(600);
  document.body.classList.remove('play'); $('sub').classList.remove('on'); $('legend').classList.remove('on'); $('end').classList.add('on');
}

// ------------------------------------------------------------------ the story
async function start() {
  unlock(); $('title').classList.remove('on'); document.body.classList.add('story');
  night.setLamp(true); night.shot('sea', 0); await sleep(400);
  night.shot('tower', 7000); await say('p1');
  night.shot('ship', 2600); night.lightning(); await sleep(1200); await say('p2');
  night.aimAtShip(true); night.setLamp(false); night.shot('tower', 2200);
  document.body.classList.remove('story'); document.body.classList.add('play'); stage = 'record'; strip();
  $('legend').classList.add('on'); $('key').classList.add('glow');
  await say('p3'); $('key').classList.remove('glow');
}
$('go').onclick = start;
$('again').onclick = () => location.reload();
$('mute').onclick = () => { voiceOn = !voiceOn; voice.muted = !voiceOn; if (fx) fx.gain.value = voiceOn ? 0.5 : 0; $('mute').classList.toggle('off', !voiceOn); };
night.shot('sea', 0); night.setLamp(true);
window.__phare = { night, get pulses() { return pulses; }, set pulses(v) { pulses = v; strip(); }, setLoop, runProgram, get stage() { return stage; }, keyDown, keyUp, get running() { return running; } };
