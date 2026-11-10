// Gambit: the app. A voice-guided chess course on a wooden board (lessons of steps: explain, show, let the learner
// try, judge the move), and games against the engine with a coach that says when a move was a mistake.
// Nothing about the player is stored, only the language they chose for the whole site.
import { Board3D, sqXZ } from './board3d.js';
import { Chess } from './chess.js';
import { COURSE, LESSONS } from './course.js';
import { CAPTIONS } from './captions.js';
import { SOLVED } from './puzzles.js';
import { BANK } from './bank.js';

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = new URLSearchParams(location.search).get('lang') || store.get('uw-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
if (lang !== 'fr' && lang !== 'en') lang = 'en';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/[+#!?]/g, '');
const E8 = '8/8/8/8/8/8/8/8 w - - 0 1';

// ------------------------------------------------------------------ words on screen (the voice lines live in captions.js)
const T = {
  fr: {
    kick: 'Unfold Worlds · échecs', tag: 'Les échecs, de zéro au jeu des maîtres. Une voix vous guide sur un vrai échiquier en bois, puis vous affrontez Gambit.',
    learn: 'Apprendre', learnS: (c, l) => `${c} chapitres · ${l} leçons`, play: 'Jouer', playS: 'Contre Gambit, avec un coach', map: 'Le programme', hp: 'Avec le son, c\'est mieux',
    cont: 'Continuer', again: 'Revoir', replay: 'Réécouter', hint: 'Indice', skip: 'Passer', home: 'Accueil', lessons: 'Leçons', retry: 'Réessayer',
    courseH: 'Le programme', lessonDone: 'Leçon terminée', next: 'Leçon suivante', allDone: 'Le cours est terminé', toPlay: 'Jouer contre Gambit', toMap: 'Toutes les leçons',
    touch: 'Touchez', stars: 'Étoiles', move: 'Coup', yourMove: 'À vous de jouer', goalMate: 'Matez', goalPromo: 'Faites une dame', goalOpen: 'Développez',
    setupH: 'Une partie', level: 'Niveau', color: 'Vos pièces', colors: ['Blancs', 'Hasard', 'Noirs'], coach: 'Le coach commente mes coups', start: 'Commencer',
    levels: ['', 'Premiers pas : il laisse des pièces.', 'Débutant.', 'Débutant qui progresse.', 'Joueur du dimanche.', 'Joueur de club débutant.', 'Joueur de club.', 'Bon joueur de club.', 'Fort joueur de club.', 'Expert.', 'Gambit à pleine force.'],
    undo: 'Annuler', flip: 'Tourner', newG: 'Nouvelle', thinking: 'réfléchit', vs: (n) => `Gambit · niveau ${n}`, you: 'Vous',
    voiceOn: 'Voix activée', voiceOff: 'Voix coupée', over: { win: 'Vous gagnez', lose: 'Gambit gagne', draw: 'Partie nulle' }, check: 'Échec',
    chapters: { board: 'L\'échiquier', pieces: 'Les pièces', values: 'La valeur des pièces', mate: 'Échec et mat', special: 'Les coups spéciaux', basicmates: 'Les mats de base', opening: 'L\'ouverture', tactics: 'La tactique', think: 'Penser comme un joueur', endgame: 'La finale', pro: 'Le jeu des maîtres' },
    lessonT: { board1: 'Les 64 cases', rook: 'La tour', bishop: 'Le fou', queen: 'La dame', king: 'Le roi', knight: 'Le cavalier', pawn: 'Le pion', values1: 'Prendre et échanger', check: 'L\'échec', mate1: 'Le mat', stalemate: 'Le pat', castle: 'Le roque', enpassant: 'La prise en passant', promotion: 'La promotion', kq: 'Mater avec la dame', rr: 'Le mat des deux tours', kr: 'Mater avec la tour', principles: 'Trois principes', italian: 'La partie italienne', scholar: 'Le coup du berger', firstgame: 'Votre première partie', fork: 'La fourchette', pin: 'Le clouage', skewer: 'L\'enfilade', discovered: 'L\'attaque à la découverte', backrank: 'Le mat du couloir', ccc: 'Échecs, prises, menaces', square: 'La règle du carré', opposition: 'L\'opposition', opera: 'La partie de l\'Opéra, 1858' },
    pieceN: { q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' },
    review: { centre: 'Centre', pieces: 'Pièces sorties', castle: 'Roque', errors: 'Erreurs' },
    pz: 'Problèmes du jour', pzS: 'Trois par jour, du facile au difficile', train: 'Entraînement', sol: 'Solution', nextPz: 'Suivant', diff: ['', 'Facile', 'Moyen', 'Difficile'],
    themes: { mate: 'Mat', fork: 'Fourchette', promo: 'Promotion', material: 'Gain de matériel', tactic: 'Coup tactique' }, goalWin: (w) => `${w ? 'Les blancs' : 'Les noirs'} gagnent`, inN: (n) => `en ${n}`, toPlay: (w) => `Trait aux ${w ? 'blancs' : 'noirs'}`, win: 'Gagnez', mateIn: (n) => `Mat en ${n}`, moves: (n) => `en ${n} coups`,
    pzDone: 'Problèmes du jour terminés', pzScore: (a, b) => `${a} sur 3 trouvés${b ? `, dont ${b} du premier coup` : ''}`, more: 'Encore un problème', back: 'Demain : trois nouveaux',
  },
  en: {
    kick: 'Unfold Worlds · chess', tag: 'Chess, from zero to the masters\' game. A voice guides you on a real wooden board, then you take on Gambit.',
    learn: 'Learn', learnS: (c, l) => `${c} chapters · ${l} lessons`, play: 'Play', playS: 'Against Gambit, with a coach', map: 'The course', hp: 'Best with sound on',
    cont: 'Continue', again: 'Watch again', replay: 'Replay', hint: 'Hint', skip: 'Skip', home: 'Home', lessons: 'Lessons', retry: 'Try again',
    courseH: 'The course', lessonDone: 'Lesson complete', next: 'Next lesson', allDone: 'The course is complete', toPlay: 'Play against Gambit', toMap: 'All lessons',
    touch: 'Touch', stars: 'Stars', move: 'Move', yourMove: 'Your move', goalMate: 'Checkmate', goalPromo: 'Make a queen', goalOpen: 'Develop',
    setupH: 'A game', level: 'Level', color: 'Your pieces', colors: ['White', 'Random', 'Black'], coach: 'The coach comments on my moves', start: 'Start',
    levels: ['', 'First steps: it leaves pieces hanging.', 'Beginner.', 'Improving beginner.', 'Casual player.', 'New club player.', 'Club player.', 'Good club player.', 'Strong club player.', 'Expert.', 'Gambit at full strength.'],
    undo: 'Undo', flip: 'Flip', newG: 'New', thinking: 'thinking', vs: (n) => `Gambit · level ${n}`, you: 'You',
    voiceOn: 'Voice on', voiceOff: 'Voice off', over: { win: 'You win', lose: 'Gambit wins', draw: 'Draw' }, check: 'Check',
    chapters: { board: 'The board', pieces: 'The pieces', values: 'What pieces are worth', mate: 'Check and mate', special: 'Special moves', basicmates: 'Basic mates', opening: 'The opening', tactics: 'Tactics', think: 'Think like a player', endgame: 'The endgame', pro: 'The masters\' game' },
    lessonT: { board1: 'The 64 squares', rook: 'The rook', bishop: 'The bishop', queen: 'The queen', king: 'The king', knight: 'The knight', pawn: 'The pawn', values1: 'Taking and trading', check: 'Check', mate1: 'Checkmate', stalemate: 'Stalemate', castle: 'Castling', enpassant: 'En passant', promotion: 'Promotion', kq: 'Mate with the queen', rr: 'The two-rook mate', kr: 'Mate with the rook', principles: 'Three principles', italian: 'The Italian Game', scholar: 'Scholar\'s mate', firstgame: 'Your first game', fork: 'The fork', pin: 'The pin', skewer: 'The skewer', discovered: 'Discovered attack', backrank: 'Back-rank mate', ccc: 'Checks, captures, threats', square: 'The rule of the square', opposition: 'Opposition', opera: 'The Opera Game, 1858' },
    pieceN: { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' },
    review: { centre: 'Centre', pieces: 'Pieces out', castle: 'Castled', errors: 'Mistakes' },
    pz: 'Puzzles of the day', pzS: 'Three a day, easy to hard', train: 'Training', sol: 'Solution', nextPz: 'Next', diff: ['', 'Easy', 'Medium', 'Hard'],
    themes: { mate: 'Mate', fork: 'Fork', promo: 'Promotion', material: 'Winning material', tactic: 'Tactical shot' }, goalWin: (w) => `${w ? 'White' : 'Black'} wins`, inN: (n) => `in ${n}`, toPlay: (w) => `${w ? 'White' : 'Black'} to play`, win: 'Win', mateIn: (n) => `Mate in ${n}`, moves: (n) => `in ${n} moves`,
    pzDone: 'Puzzles of the day done', pzScore: (a, b) => `${a} of 3 solved${b ? `, ${b} at first try` : ''}`, more: 'One more puzzle', back: 'Tomorrow: three new ones',
  },
};
const t = () => T[lang];
const line = (id) => CAPTIONS[lang][id] || '';

// ------------------------------------------------------------------ sound: the voice, and the wood
const audio = {
  ctx: null, bufs: new Map(), cur: null, on: true,
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination); } catch { return; } }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  },
  buf(id) {
    const k = `${lang}/${id}`;
    if (!this.bufs.has(k)) this.bufs.set(k, fetch(`audio/${k}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => (a && this.ctx ? new Promise((res) => this.ctx.decodeAudioData(a, res, () => res(null))) : null)).catch(() => null));
    return this.bufs.get(k);
  },
  preload(ids) { if (this.ctx) for (const id of ids) this.buf(id); },
  async say(id) {
    this.stop(); if (!this.on || !this.ctx) return;
    const b = await this.buf(id); if (!b) return;
    const src = this.ctx.createBufferSource(); src.buffer = b; const g = this.ctx.createGain(); g.gain.value = 1; src.connect(g).connect(this.out);
    return new Promise((res) => { this.cur = { src, res }; src.onended = () => { if (this.cur?.src === src) this.cur = null; res(); }; src.start(); });
  },
  stop() { const v = this.cur; if (!v) return; this.cur = null; try { v.src.onended = null; v.src.stop(); } catch {} v.res(); },
  noise(len) { const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3; return b; },
  // a piece set down on wood: a short knock, a little brighter and louder for a capture
  knock(capture = false) {
    const c = this.ctx; if (!c) return; const now = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._n || (this._n = this.noise(0.09));
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = capture ? 1500 : 1050; bp.Q.value = 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(capture ? 0.9 : 0.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    n.connect(bp).connect(g).connect(this.out); n.start(now);
    const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(capture ? 210 : 170, now); o.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    og.gain.setValueAtTime(0.35, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.1); o.connect(og).connect(this.out); o.start(now); o.stop(now + 0.12);
    if (capture) setTimeout(() => this.knock(false), 70);
  },
  chime() {
    const c = this.ctx; if (!c) return; const now = c.currentTime;
    [[784, 0], [1175, 0.09], [1568, 0.18]].forEach(([f, d]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, now + d); g.gain.linearRampToValueAtTime(0.12, now + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + d + 1.1); o.connect(g).connect(this.out); o.start(now + d); o.stop(now + d + 1.2); });
  },
  low() {
    const c = this.ctx; if (!c) return; const now = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(196, now); o.frequency.exponentialRampToValueAtTime(140, now + 0.25);
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.connect(g).connect(this.out); o.start(now); o.stop(now + 0.32);
  },
};

// ------------------------------------------------------------------ the engine, in a worker
const worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
let wid = 0; const waits = new Map();
worker.onmessage = ({ data }) => { const f = waits.get(data.id); waits.delete(data.id); f?.(data.r); };
const ask = (q) => new Promise((res) => { const id = ++wid; waits.set(id, res); worker.postMessage({ ...q, id }); });

// ------------------------------------------------------------------ the board
const board = new Board3D($('gl'));
let chess = new Chess();
const RED = 0xff6b5b, GREEN = 0x3fcf9a, GOLD = 0xff9f1c;
function show(fen, { arrows = [], marks = [], color, flip = false, fade = true } = {}) {
  if (fen) chess = new Chess(fen);
  if (board.flipped !== flip) board.setFlipped(flip);
  board.setPosition(chess.board(), fade); board.stars([]);
  board.setBase({ check: chess.inCheck() ? chess.kingSquare(chess.turn()) : null });
  board.arrows(arrows.map(([from, to]) => ({ from, to, color: color === 'red' ? RED : GREEN })));
  if (marks.length) board.mark(marks, 0x6fd3ff, 0.4);
}
function lastMarks(v) { return { last: v ? { from: v.from, to: v.to } : null, check: chess.inCheck() ? chess.kingSquare(chess.turn()) : null }; }
async function play(v) { // v: a move the rules accepted (already played in `chess`)
  board.select(null); await board.animateMove(v); audio.knock(!!v.captured); board.setBase(lastMarks(v));
}
function sanToMove(fen, san) { const c = new Chess(fen), v = c.move(san); return v ? { from: v.from, to: v.to } : null; }
const promoAsk = (color) => new Promise((res) => {
  const el = $('promo'), glyph = color === 'w' ? { q: '♕', r: '♖', b: '♗', n: '♘' } : { q: '♛', r: '♜', b: '♝', n: '♞' };
  el.querySelectorAll('button').forEach((b) => { b.textContent = glyph[b.dataset.p]; b.title = t().pieceN[b.dataset.p]; b.onclick = () => { el.classList.remove('on'); res(b.dataset.p); }; });
  el.classList.add('on');
});
// the learner's move on the real rules: resolves with the played move (or null if the run was cancelled)
function userMove(r, side) {
  return new Promise((res) => {
    board.interactive = side; board.legalFor = (sq) => chess.moves(sq);
    board.onMove = async (from, to) => {
      if (!alive(r)) return; const opts = chess.moves(from).filter((m) => m.to === to); if (!opts.length) return;
      board.interactive = null; let promotion;
      if (opts.some((m) => m.promotion)) promotion = await promoAsk(opts[0].color);
      const v = chess.move({ from, to, promotion }); if (!v) { board.interactive = side; return; }
      await play(v); res(v);
    };
    cancelers.push(() => res(null));
  });
}

// ------------------------------------------------------------------ captions, buttons, toasts
let capLast = null;
function caption(text) { const c = $('cap'); if (!text) { c.classList.remove('on'); return; } c.innerHTML = text; c.classList.add('on'); }
async function say(r, id) { if (!alive(r) || !id) return; capLast = id; caption(line(id)); await audio.say(id); }
let toastT = 0;
function toast(s, ms = 2400) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
let contRes = null;
function choose(r, buttons) {
  return new Promise((res) => {
    if (!alive(r)) return res(null);
    const el = $('cont'); el.innerHTML = ''; contRes = res;
    for (const b of buttons) { const x = document.createElement('button'); x.textContent = b.t; x.dataset.k = b.k; if (b.main) x.className = 'main'; x.onclick = () => { audio.init(); done(b.k); }; el.append(x); }
    const done = (k) => { el.classList.remove('on'); contRes = null; res(k); };
    contRes = done; el.classList.add('on');
  });
}
const cont = (r) => choose(r, [{ k: 'go', t: t().cont, main: true }]);
function target(k, v, n) { const el = $('target'); if (!k) { el.classList.remove('on'); return; } el.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>${n ? `<div class="n">${n}</div>` : ''}`; el.classList.add('on'); }

// ------------------------------------------------------------------ runs: every new lesson / game cancels what was going on
let run = 0, cancelers = [];
const alive = (r) => r === run;
function cancel() {
  run++; audio.stop(); for (const f of cancelers.splice(0)) f(); if (contRes) contRes(null);
  board.interactive = null; board.onMove = null; board.onSquare = null; board.select(null); board.arrows([]); board.stars([]);
  target(null); $('values').classList.remove('on'); $('lessonend').classList.remove('on'); $('promo').classList.remove('on'); hintFn = null; $('b-hint').classList.add('off'); solFn = null;
  return run;
}
function mode(m) { document.body.dataset.mode = m; board.setCine(m === 'intro'); layout(); }
function layout() {
  const m = document.body.dataset.mode, w = innerWidth, h = innerHeight, narrow = w <= 760 || h > w, wide = !narrow && w / h > 1.25 && w >= 900;
  document.body.classList.toggle('wide', wide);
  board.tilt = narrow ? 1.13 : 0.98;
  if (m === 'lesson' || m === 'puzzles') board.setMargins(wide ? { top: 56, bottom: 84, left: Math.min(420, w * 0.33), right: 24 } : narrow ? { top: 120, bottom: 230 } : { top: 110, bottom: 220 });
  else if (m === 'play') { const p = $('panel').getBoundingClientRect(); board.setMargins(narrow ? { top: 64, bottom: Math.min(h * 0.46, p.height) + 8 } : { top: 40, bottom: 30, right: 330 }); }
  else board.setMargins({ top: 0, bottom: 0 });
  if ($('values').classList.contains('on')) placeValues();
}
addEventListener('resize', layout);

// ------------------------------------------------------------------ the lesson runner
let cur = { i: 0, s: 0 }, hintFn = null;
function setHint(f) { hintFn = f; $('b-hint').classList.toggle('off', !f); }
function lessonHead(i, s) {
  const L = LESSONS[i]; $('l-ch').textContent = t().chapters[L.chapter]; $('l-ln').textContent = t().lessonT[L.id];
  $('steps').innerHTML = L.steps.map((_, k) => `<i class="${k < s ? 'done' : k === s ? 'now' : ''}"></i>`).join('');
}
async function runLesson(i, from = 0) {
  const r = cancel(); mode('lesson'); closeMap(); cur = { i, s: from };
  const L = LESSONS[i];
  audio.preload([...new Set(L.steps.flatMap((s) => [s.say, s.fail, s.after, s.q, ...Object.values(s.at || {})]).filter(Boolean)), 'ok1', 'ok2', 'ok3', 'bad1', 'bad2', 'hint', 'lesson_done']);
  for (let s = from; s < L.steps.length; s++) {
    cur.s = s; lessonHead(i, s); setHint(null); target(null); board.arrows([]);
    await step(r, L, s);
    if (!alive(r)) return;
  }
  lessonHead(i, L.steps.length); lessonEnd(r, i);
}
async function step(r, L, s) {
  const st = L.steps[s];
  if (!st.task && !st.demo) {
    if (st.fen) show(st.fen, st);
    else if (st.arrows || st.marks) show(null, st);
    if (st.showValues) values();
    say(r, st.say); await cont(r); $('values').classList.remove('on'); return;
  }
  if (st.demo) return demo(r, st);
  return ({ squares, collect, move: moveTask, puzzle: (r, st, L, s) => puzzle(r, st, SOLVED[`${L.id}#${s}`]), play: playTask, quiz })[st.task](r, st, L, s);
}

// ------------------------------------------------------------------ step kinds
function values() {
  show('8/8/8/8/1PNBRQK1/8/8/8 w - - 0 1');
  const el = $('values'); el.innerHTML = ['1', '3', '3', '5', '9', '∞'].map((v, k) => `<span data-sq="${'bcdefg'[k]}4">${v}</span>`).join(''); el.classList.add('on'); placeValues();
}
function placeValues() { for (const s of $('values').children) { const p = board.screenOf(s.dataset.sq, 1.75); s.style.left = p.x + 'px'; s.style.top = p.y + 'px'; } }

async function demo(r, st) {
  for (;;) {
    show(st.fen); target(null);
    if (st.say) await say(r, st.say); if (!alive(r)) return;
    let n = 0;
    for (const san of st.demo) {
      await sleep(n ? 950 : 600); if (!alive(r)) return;
      const v = chess.move(san); if (!v) break; n++;
      target(t().move + ` ${Math.ceil(n / 2)}`, (n % 2 ? '' : '… ') + v.san);
      await play(v); if (!alive(r)) return;
      if (st.at?.[n]) { await sleep(300); await say(r, st.at[n]); if (!alive(r)) return; }
    }
    const k = await choose(r, [{ k: 'again', t: t().again }, { k: 'go', t: t().cont, main: true }]);
    if (k !== 'again') { target(null); return; }
  }
}

async function squares(r, st) {
  show(E8); say(r, st.say);
  for (const [k, sq] of st.find.entries()) {
    target(t().touch, sq, `${k + 1} / ${st.find.length}`);
    for (;;) {
      const hit = await new Promise((res) => { board.onSquare = (q) => res(q); cancelers.push(() => res(null)); });
      if (!alive(r) || !hit) return;
      if (hit === sq) { audio.knock(); board.square(sq, GREEN, 0.5, true); board.sparks(sq, 0xbff5dd, 18); break; }
      // a wrong square: it flashes red, the right one glows for a moment
      audio.low(); const m = board.square(hit, RED, 0.55, true), g = board.square(sq, GOLD, 0.55, true);
      setTimeout(() => { board.fx.remove(m); board.fx.remove(g); }, 1100);
    }
  }
  board.onSquare = null; target(null); audio.chime(); await say(r, 'squares_done'); for (const c of [...board.fx.children]) board.fx.remove(c); await cont(r);
}

// one piece walks the board alone (no kings around): its own simple move rules
function pieceMoves(type, from, occ) {
  const F = 'abcdefgh', f = F.indexOf(from[0]), rk = +from[1] - 1, out = [];
  const add = (ff, rr, mode = 'both') => {
    if (ff < 0 || ff > 7 || rr < 0 || rr > 7) return false; const s = F[ff] + (rr + 1), c = occ.get(s);
    if (c === 'w') return false; if (c === 'b' && mode === 'quiet') return false; if (!c && mode === 'take') return false;
    out.push({ to: s, captured: c === 'b' ? 'p' : undefined }); return !c;
  };
  const ray = (dirs) => { for (const [dx, dy] of dirs) for (let k = 1; k < 8 && add(f + dx * k, rk + dy * k); k++); };
  const R = [[1, 0], [-1, 0], [0, 1], [0, -1]], B = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (type === 'r') ray(R); if (type === 'b') ray(B); if (type === 'q') ray([...R, ...B]);
  if (type === 'k') for (const [dx, dy] of [...R, ...B]) add(f + dx, rk + dy);
  if (type === 'n') for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(f + dx, rk + dy);
  if (type === 'p') { if (add(f, rk + 1, 'quiet') && rk === 1) add(f, rk + 2, 'quiet'); add(f - 1, rk + 1, 'take'); add(f + 1, rk + 1, 'take'); }
  return out;
}
async function collect(r, st) {
  const list = [{ sq: st.at, type: st.piece, color: 'w' }, ...(st.own || []).map((sq) => ({ sq, type: 'p', color: 'w' })), ...(st.enemy || []).map((sq) => ({ sq, type: 'p', color: 'b' }))];
  if (board.flipped) board.setFlipped(false);
  board.setPosition(list); board.setBase({}); let at = st.at, left = [...st.stars], moves = 0;
  const occ = new Map(list.map((p) => [p.sq, p.color]));
  board.stars(left); say(r, st.say); target(t().stars, `0 / ${left.length}`);
  while (left.length) {
    const v = await new Promise((res) => {
      board.interactive = 'w'; board.legalFor = (sq) => (sq === at ? pieceMoves(st.piece, at, occ) : []);
      board.onMove = (from, to) => res({ from, to, captured: occ.get(to) === 'b' ? 'p' : undefined }); cancelers.push(() => res(null));
    });
    if (!alive(r) || !v) return;
    board.interactive = null; await board.animateMove(v); audio.knock(!!v.captured); moves++;
    occ.delete(v.from); occ.set(v.to, 'w'); at = v.to; board.setBase({ last: v });
    if (left.includes(v.to)) { board.takeStar(v.to); left = left.filter((x) => x !== v.to); audio.chime(); target(t().stars, `${st.stars.length - left.length} / ${st.stars.length}`); }
    if (st.piece === 'p' && +at[1] === 8) break;
  }
  target(null); await say(r, 'stars_done'); await cont(r);
}

async function moveTask(r, st) {
  show(st.fen, st); say(r, st.say); let fails = 0;
  setHint(() => { const m = sanToMove(st.fen, st.want[0]); if (m) board.arrows([{ ...m, color: GOLD }]); say(r, 'hint'); });
  for (;;) {
    const v = await userMove(r, chess.turn()); if (!alive(r) || !v) return;
    if (st.want.map(clean).includes(clean(v.san))) { audio.chime(); board.sparks(v.to, 0xfff0b0, 30); await say(r, ['ok1', 'ok2', 'ok3'][Math.floor(Math.random() * 3)]); await cont(r); return; }
    fails++; audio.low(); await say(r, st.fail || 'bad1'); if (!alive(r)) return;
    await sleep(500); chess.undo(); show(null, { ...st, fade: false });
    if (fails >= 2) hintFn?.();
  }
}

// a puzzle judged by its solution tree {san: 1 | {reply, next}}: right moves get the best defence, a miss gets punished
// by the engine then taken back. Resolves {fails, revealed} (revealed: the solution was shown), or null if cancelled.
let solFn = null;
async function puzzle(r, st, tree) {
  const start = st.fen; let node = tree, fails = 0, revealed = false;
  show(start, { flip: !!st.flip }); say(r, st.say);
  if (st.goalText) target(...st.goalText);
  else if (st.goal === 'mate') target(t().goalMate, t().inN(st.n));
  const pick = () => { const keys = Object.keys(node); return keys.includes(clean(st.hint)) ? st.hint : keys[0]; };
  setHint(() => { const m = sanToMove(chess.fen(), pick()); if (m) board.arrows([{ ...m, color: GOLD }]); say(r, 'hint'); });
  const auto = () => setTimeout(() => { if (!alive(r)) return; const m = sanToMove(chess.fen(), pick()); if (m && board.onMove) board.onMove(m.from, m.to); }, 650);
  solFn = () => { if (revealed) return; revealed = true; board.arrows([]); auto(); };
  const side = chess.turn();
  for (;;) {
    const before = chess.fen(); const vp = userMove(r, side); if (revealed) auto(); const v = await vp; if (!alive(r) || !v) return null;
    const next = node[clean(v.san)];
    if (next) {
      board.arrows([]);
      if (next === 1 || chess.isGameOver()) {
        audio.chime(); board.sparks(v.to, 0xfff0b0, 36); target(null); solFn = null; setHint(null);
        await say(r, revealed ? 'pz_solution' : chess.isCheckmate() ? 'mate_done' : ['ok1', 'ok2', 'ok3'][Math.floor(Math.random() * 3)]);
        if (st.after) st.after(); await cont(r); return { fails, revealed };
      }
      audio.knock(); await sleep(450); if (!alive(r)) return null;
      const rv = chess.move(next.reply); await play(rv); node = next.next; continue;
    }
    fails++; audio.low();
    const rep = await ask({ op: 'think', fen: chess.fen(), depth: 5, time: 700, keys: chess.pos.keys });
    if (!alive(r)) return null;
    if (rep.move) { const rv = chess.move({ from: rep.from, to: rep.to, promotion: rep.promotion }); if (rv) { await sleep(250); await play(rv); } }
    await say(r, st.fail || (st.goal === 'mate' ? 'bad1' : 'bad2')); if (!alive(r)) return null;
    await sleep(600); chess = new Chess(before); show(null, { flip: !!st.flip, fade: false }); board.setBase({});
    if (fails >= 2) hintFn?.();
  }
}

// ------------------------------------------------------------------ puzzles of the day: the same three for everyone on a given
// day (picked from the bank by the date: one easy, one medium, one hard), then endless training. Nothing is kept between visits.
const BUCKETS = [null, 1, 2, 3].map((k) => (k ? BANK.map((p, i) => ({ ...p, i })).filter((p) => p.lvl === k) : null));
function today() { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
function dailySet() { const day = today(); return [1, 2, 3].map((k, j) => BUCKETS[k][(day * [7919, 104729, 1299709][j]) % BUCKETS[k].length]); }
const PZ = { set: [], k: 0, res: [], training: false, seen: new Set(), cur: null };
function pzHead() {
  const L = t(), p = PZ.cur;
  $('l-ch').textContent = PZ.training ? L.train : innerWidth < 600 ? L.pz : `${L.pz} · ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' })}`;
  $('l-ln').textContent = p ? `${PZ.training ? '' : `${PZ.k + 1} · `}${L.diff[p.lvl]}` : '';
  $('steps').innerHTML = PZ.training ? '' : [0, 1, 2].map((k) => `<i class="${k < PZ.k ? 'done' : k === PZ.k ? 'now' : ''}"></i>`).join('');
  $('b-skip').querySelector('span').textContent = L.nextPz;
}
function runPuzzle(r, p) {
  PZ.cur = p; PZ.seen.add(p.i); pzHead(); const white = p.fen.split(' ')[1] === 'w';
  const goalText = [t().toPlay(white), p.goal === 'mate' ? t().mateIn(p.n) : t().win, p.goal !== 'mate' && p.n > 1 ? t().moves(p.n) : ''];
  // once solved, the theme is named: the learner sees the pattern they just used
  const after = () => caption(`<b>${t().themes[p.theme]}</b>`);
  return puzzle(r, { fen: p.fen, goal: p.goal, n: p.n, flip: !white, say: p.goal === 'mate' ? 'pz_mate' : white ? 'pz_white' : 'pz_black', goalText, after }, p.tree);
}
async function startPuzzles() {
  const r = cancel(); mode('puzzles'); closeMap(); PZ.training = false; PZ.set = dailySet(); PZ.res = []; PZ.k = 0;
  audio.preload(['pz_hello', 'pz_white', 'pz_black', 'pz_mate', 'pz_solution', 'pz_done', 'ok1', 'ok2', 'ok3', 'bad1', 'bad2', 'hint', 'mate_done']);
  PZ.cur = PZ.set[0]; show(PZ.cur.fen, { flip: PZ.cur.fen.split(' ')[1] === 'b' }); pzHead();
  await say(r, 'pz_hello'); if (!alive(r)) return;
  for (; PZ.k < 3; PZ.k++) { const res = await runPuzzle(r, PZ.set[PZ.k]); if (!alive(r) && !PZ.skip) return; PZ.res[PZ.k] = res || { skipped: true }; if (PZ.skip) { PZ.skip = false; } }
  pzEnd(r);
}
function pzEnd(r) {
  const L = t(), ok = (x) => x && !x.skipped && !x.revealed, solved = PZ.res.filter(ok).length, first = PZ.res.filter((x) => ok(x) && !x.fails).length;
  $('le-k').textContent = L.pzDone;
  $('le-t').innerHTML = `<span class="sc">${PZ.res.map((x) => `<i class="${ok(x) ? (x.fails ? 'h' : 'y') : ''}">${ok(x) ? '✓' : '·'}</i>`).join('')}</span>${L.pzScore(solved, first)}`;
  $('le-next').textContent = L.more; $('le-next').onclick = () => { audio.init(); train(); };
  $('le-map').textContent = L.back; $('le-map').onclick = () => idle();
  $('lessonend').classList.add('on'); audio.chime(); say(r, 'pz_done'); caption(null); target(null);
}
async function train() { // endless: a fresh puzzle each time, harder after a clean solve, easier after a struggle
  const r = cancel(); mode('puzzles'); PZ.training = true; let level = 2;
  while (alive(r)) {
    const pool = BUCKETS[level].filter((p) => !PZ.seen.has(p.i)), list = pool.length ? pool : BUCKETS[level];
    const res = await runPuzzle(r, list[Math.floor(Math.random() * list.length)]); if (!alive(r)) return;
    if (res && !res.revealed && !res.fails) level = Math.min(3, level + 1); else if (!res || res.revealed || res.fails > 1) level = Math.max(1, level - 1);
  }
}

async function quiz(r, st) {
  say(r, st.q);
  for (;;) {
    const k = await choose(r, st.options.map(([id, ok]) => ({ k: ok ? 'y' : 'n', t: line(id), main: false })));
    if (!alive(r) || !k) return;
    if (k === 'y') { audio.chime(); await say(r, st.after || 'ok1'); await cont(r); return; }
    audio.low(); await say(r, 'bad1'); if (!alive(r)) return; say(r, st.q);
  }
}

// a real game inside a lesson: mate the lone king, push the pawn home, or open well
async function playTask(r, st) {
  const lvl = Math.min(st.level, 8);
  for (;;) {
    show(st.fen); say(r, st.say); const side = chess.turn(); let n = 0, outcome = null, errors = 0;
    const goalT = st.goal === 'mate' ? t().goalMate : st.goal === 'promote' ? t().goalPromo : t().goalOpen;
    target(goalT, `${0} / ${st.max}`);
    setHint(async () => { const h = await ask({ op: 'think', fen: chess.fen(), depth: 9, time: 900, keys: chess.pos.keys }); if (alive(r) && h.move) { board.arrows([{ from: h.from, to: h.to, color: GOLD }]); say(r, 'hint'); } });
    while (!outcome) {
      let rk = st.goal === 'opening' ? ask({ op: 'rank', fen: chess.fen(), depth: 3, time: 1200, keys: chess.pos.keys }) : null;
      const v = await userMove(r, side); if (!alive(r) || !v) return; n++; board.arrows([]);
      target(goalT, `${n} / ${st.max}`);
      if (rk) { const kind = await coachSays(r, await rk, v); if (kind === 'blunder' || kind === 'mistake') errors++; }
      if (chess.isCheckmate()) { outcome = 'win'; break; }
      if (st.goal === 'promote' && v.promotion) { outcome = 'promo'; break; }
      if (chess.isDraw()) { outcome = 'draw'; break; }
      if (st.goal === 'opening' && n >= st.max) { outcome = 'open'; break; }
      if (n >= st.max) { outcome = 'long'; break; }
      const e = await ask({ op: 'level', fen: chess.fen(), level: lvl, keys: chess.pos.keys }); if (!alive(r)) return;
      if (!e.move) { outcome = chess.isCheckmate() ? 'lost' : 'draw'; break; }
      const ev = chess.move({ from: e.from, to: e.to, promotion: e.promotion }); await sleep(200); await play(ev);
      if (st.goal === 'promote' && !chess.board().some((p) => p.type === 'p' && p.color === side)) { outcome = 'draw'; break; }
      if (chess.isGameOver()) { outcome = chess.isCheckmate() ? 'lost' : 'draw'; break; }
    }
    target(null); setHint(null);
    if (outcome === 'win' || outcome === 'promo') { audio.chime(); board.sparks(chess.kingSquare(side === 'w' ? 'b' : 'w'), 0xfff0b0, 40); await say(r, outcome === 'promo' ? 'promo_done' : 'mate_done'); await cont(r); return; }
    if (outcome === 'open') { // the opening review: centre, pieces out, castled, mistakes
      const h = chess.history(), b = chess.board(), R = t().review, ok = (x) => `<b>${x ? '✓' : '✗'}</b>`;
      const centre = h.some((m, k) => k % 2 === 0 && /^[de]4$/.test(clean(m)));
      const out = 4 - ['b1', 'g1', 'c1', 'f1'].filter((sq) => b.some((p) => p.sq === sq && p.color === 'w' && (p.type === 'n' || p.type === 'b'))).length;
      const castled = h.some((m, k) => k % 2 === 0 && clean(m).startsWith('O-O'));
      audio.chime(); await say(r, 'o_review'); if (!alive(r)) return;
      caption(`${ok(centre)} ${R.centre}<br>${ok(out >= 3)} ${R.pieces} ${out}/4<br>${ok(castled)} ${R.castle}<br>${R.errors} : <b>${errors}</b>`);
      await cont(r); return;
    }
    audio.low(); await say(r, outcome === 'long' ? 'too_long' : 'draw_oops'); if (!alive(r)) return;
    const k = await choose(r, [{ k: 'go', t: t().retry, main: true }]); if (!k) return;
  }
}
// the coach: compares the move played with the engine's ranking of every move in that position
const coachMark = new Map();
async function coachSays(r, ranked, v) {
  if (!ranked?.length || !alive(r)) return null;
  const best = ranked[0], mine = ranked.find((x) => x.from === v.from && x.to === v.to && (x.promotion || undefined) === (v.promotion || undefined)) || ranked[ranked.length - 1];
  const drop = best.score - mine.score; let kind = null;
  if (drop >= 250 && best.score > -700) kind = 'blunder'; else if (drop >= 110 && best.score > -700) kind = 'mistake';
  else if (mine === best && ranked[1] && best.score - ranked[1].score >= 150 && best.score > 0) kind = 'best';
  if (!kind) return null;
  if (kind === 'best') { audio.chime(); say(r, 'c_best'); }
  else { audio.low(); board.arrows([{ from: best.from, to: best.to, color: GREEN }]); say(r, kind === 'blunder' ? 'c_blunder' : 'c_mistake'); }
  return kind;
}

function lessonEnd(r, i) {
  const nx = LESSONS[i + 1], el = $('lessonend');
  $('le-k').textContent = nx ? t().lessonDone : t().allDone; $('le-t').textContent = t().lessonT[LESSONS[i].id];
  $('le-next').textContent = nx ? `${t().next} : ${t().lessonT[nx.id]}` : t().toPlay; $('le-map').textContent = t().toMap;
  $('le-next').onclick = () => { audio.init(); nx ? runLesson(i + 1) : startPlay(); }; $('le-map').onclick = () => openMap();
  el.classList.add('on'); audio.chime(); say(r, 'lesson_done'); caption(null);
}

// ------------------------------------------------------------------ the course map
function openMap() {
  const L = t(); $('course-h').textContent = L.courseH; let n = 0;
  $('course-l').innerHTML = COURSE.map((ch, c) => `<li class="cat">${c + 1} · ${L.chapters[ch.id]}</li>` + ch.lessons.map((l) => { const i = n++; return `<li><button data-i="${i}" class="${document.body.dataset.mode === 'lesson' && cur.i === i ? 'now' : ''}"><i>${String(i + 1).padStart(2, '0')}</i>${L.lessonT[l.id]}</button></li>`; }).join('')).join('');
  $('course-l').querySelectorAll('button').forEach((b) => (b.onclick = () => { audio.init(); runLesson(+b.dataset.i); }));
  $('course').classList.add('on');
}
function closeMap() { $('course').classList.remove('on'); }

// ------------------------------------------------------------------ playing Gambit
const G = { level: 3, color: 'w', coach: true, human: 'w', token: 0, over: false, marks: [] };
function startPlay() {
  cancel(); closeMap(); mode('play'); $('panel').className = 'setup'; caption(null); layout();
  show('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { flip: false });
  const r = run; audio.preload(['play_hello', 'c_blunder', 'c_mistake', 'c_best', 'win', 'lose', 'draw']); say(r, 'play_hello');
}
function levelUI() { $('p-level-o').textContent = G.level; $('p-level-d').textContent = t().levels[G.level]; }
async function newGame() {
  const r = cancel(); G.token++; const tok = G.token; G.over = false; G.marks = [];
  G.human = G.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : G.color;
  $('panel').className = 'game'; layout(); caption(null);
  show('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { flip: G.human === 'b' });
  $('g-them').textContent = t().vs(G.level); $('g-think').textContent = ''; evalBar(0); moveList();
  gameLoop(r, tok);
}
async function gameLoop(r, tok) {
  const live = () => alive(r) && tok === G.token;
  while (live() && !chess.isGameOver()) {
    if (chess.turn() === G.human) {
      const rk = G.coach ? ask({ op: 'rank', fen: chess.fen(), depth: 3, time: 1100, keys: chess.pos.keys }) : null;
      const v = await userMove(r, G.human); if (!live() || !v) return;
      board.arrows([]);
      if (rk) { const kind = await coachSays(r, await rk, v); if (!live()) return; G.marks[chess.history().length - 1] = kind; }
      moveList();
    } else {
      $('g-think').textContent = t().thinking; board.interactive = null;
      const [e] = await Promise.all([ask({ op: 'level', fen: chess.fen(), level: G.level, keys: chess.pos.keys }), sleep(450)]);
      $('g-think').textContent = ''; if (!live()) return;
      if (!e.move) break;
      const v = chess.move({ from: e.from, to: e.to, promotion: e.promotion }); await play(v);
      if (typeof e.score === 'number') evalBar(chess.turn() === 'w' ? -e.score : e.score, true);
      moveList();
    }
  }
  if (!live()) return;
  G.over = true; const res = chess.isCheckmate() ? (chess.turn() === G.human ? 'lose' : 'win') : 'draw';
  if (res === 'win') { audio.chime(); board.sparks(chess.kingSquare(G.human === 'w' ? 'b' : 'w'), 0xfff0b0, 50); }
  toast(t().over[res], 4000); say(r, res);
}
function evalBar(score) { const w = 50 + 50 * Math.tanh(score / 700); $('evalbar').firstElementChild.style.width = `${w}%`; }
function moveList() {
  const h = chess.history(), ol = $('moves'); let html = '';
  for (let i = 0; i < h.length; i += 2) html += `<li><span class="${G.marks[i] ? 'c-' + G.marks[i] : ''}">${h[i]}</span>${h[i + 1] ? `<span class="${G.marks[i + 1] ? 'c-' + G.marks[i + 1] : ''}">${h[i + 1]}</span>` : ''}</li>`;
  ol.innerHTML = html; ol.scrollTop = ol.scrollHeight;
}
function undoMove() {
  if (!chess.history().length) return;
  const r = cancel(); G.token++; const tok = G.token; G.over = false;
  chess.undo(); if (chess.turn() !== G.human && chess.history().length) chess.undo();
  G.marks.length = chess.history().length; show(null, { flip: board.flipped, fade: false }); moveList(); $('g-think').textContent = ''; caption(null);
  gameLoop(r, tok);
}
async function gameHint() {
  if (G.over || chess.turn() !== G.human) return;
  const r = run, h = await ask({ op: 'think', fen: chess.fen(), depth: 8, time: 900, keys: chess.pos.keys });
  if (alive(r) && h.move) { board.arrows([{ from: h.from, to: h.to, color: GOLD }]); say(r, 'hint'); }
}

// ------------------------------------------------------------------ the home screen: the Opera Game plays itself behind the title
async function idle() {
  const r = cancel(); mode('intro'); caption(null); closeMap();
  const opera = COURSE.find((c) => c.id === 'pro').lessons[0].steps[1].demo;
  while (alive(r)) {
    show('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { flip: false }); await sleep(1500);
    for (const san of opera) { if (!alive(r)) return; const v = chess.move(san); await board.animateMove(v); board.setBase(lastMarks(v)); await sleep(1500); }
    await sleep(4000);
  }
}

// ------------------------------------------------------------------ wiring
function applyLang() {
  const L = t(); document.documentElement.lang = lang;
  $('kick').textContent = L.kick; $('tag').textContent = L.tag; $('t-learn').textContent = L.learn; $('s-learn').textContent = L.learnS(COURSE.length, LESSONS.length);
  $('t-pz').textContent = L.pz; $('s-pz').textContent = L.pzS; $('t-play').textContent = L.play; $('s-play').textContent = L.playS; $('go-map').textContent = L.map; $('hp').textContent = L.hp;
  for (const [id, k] of [['b-map', 'lessons'], ['b-replay', 'replay'], ['b-hint', 'hint'], ['b-skip', 'skip'], ['b-sol', 'sol'], ['b-exit', 'home'], ['g-undo', 'undo'], ['g-hint', 'hint'], ['g-flip', 'flip'], ['g-new', 'newG'], ['g-exit', 'home']]) $(id).querySelector('span').textContent = L[k];
  $('p-h').textContent = L.setupH; $('p-level-l').textContent = L.level; $('p-color-l').textContent = L.color; $('p-coach-l').textContent = L.coach; $('p-start').textContent = L.start;
  $('p-color').querySelectorAll('button').forEach((b, k) => (b.textContent = L.colors[k]));
  document.querySelectorAll('.langs button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  levelUI(); if (document.body.dataset.mode === 'lesson') lessonHead(cur.i, cur.s); if (document.body.dataset.mode === 'puzzles') pzHead(); if (capLast && $('cap').classList.contains('on')) caption(line(capLast));
  $('g-them').textContent = t().vs(G.level);
}
document.querySelectorAll('.langs button').forEach((b) => (b.onclick = () => { lang = b.dataset.lang; store.set('uw-lang', lang); applyLang(); if ($('course').classList.contains('on')) openMap(); }));
$('b-voice').onclick = () => { audio.on = !audio.on; $('b-voice').classList.toggle('on', audio.on); if (!audio.on) audio.stop(); toast(audio.on ? t().voiceOn : t().voiceOff); };
const start = (f) => async () => { audio.init(); if (!document.body.classList.contains('loaded')) { document.body.classList.add('waiting'); await board.ready; document.body.classList.remove('waiting'); } f(); };
$('go-learn').onclick = start(() => runLesson(0));
$('go-play').onclick = start(() => startPlay());
$('go-pz').onclick = start(() => startPuzzles());
$('b-sol').onclick = () => solFn?.();
$('go-map').onclick = start(() => openMap());
$('course-x').onclick = closeMap;
$('b-map').onclick = () => openMap();
$('b-replay').onclick = () => { audio.init(); if (capLast) { caption(line(capLast)); audio.say(capLast); } };
$('b-hint').onclick = () => hintFn?.();
$('b-skip').onclick = () => { if (document.body.dataset.mode === 'puzzles') { if (contRes) return contRes('go'); for (const f of cancelers.splice(0)) f(); return; } const L = LESSONS[cur.i]; if (cur.s + 1 < L.steps.length) runLesson(cur.i, cur.s + 1); else { cancel(); lessonEnd(run, cur.i); } };
$('b-exit').onclick = () => idle();
$('g-exit').onclick = () => idle();
$('p-level').oninput = (e) => { G.level = +e.target.value; levelUI(); };
$('p-color').querySelectorAll('button').forEach((b) => (b.onclick = () => { G.color = b.dataset.c; $('p-color').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
$('p-color').querySelector('[data-c="w"]').classList.add('on');
$('p-coach').onchange = (e) => (G.coach = e.target.checked);
$('p-start').onclick = () => { audio.init(); newGame(); };
$('g-new').onclick = () => { cancel(); G.token++; $('panel').className = 'setup'; layout(); };
$('g-undo').onclick = () => undoMove();
$('g-hint').onclick = () => gameHint();
$('g-flip').onclick = () => { board.setFlipped(!board.flipped); };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.code === 'Enter' || e.code === 'Space') && $('cont').classList.contains('on')) { e.preventDefault(); $('cont').querySelector('.main, button:last-child')?.click(); }
  if (e.code === 'KeyR' && document.body.dataset.mode === 'lesson') $('b-replay').click();
  if (e.code === 'KeyS' && document.body.dataset.mode === 'puzzles') solFn?.();
  if (e.code === 'KeyH') (document.body.dataset.mode === 'play' ? $('g-hint') : $('b-hint')).click();
  if (e.code === 'Escape') closeMap();
});

applyLang();
board.ready.then(() => { document.body.classList.add('loaded'); $('load').parentElement.style.setProperty('--p', '100%'); idle(); });
// test hooks (the QA bot drives the app through these)
window.gambit = { board, get chess() { return chess; }, runLesson, startPlay, newGame, G, SOLVED, LESSONS, get cur() { return cur; }, audio, BANK, PZ, startPuzzles, train, dailySet, Chess, pieceMoves, ask, clean };
