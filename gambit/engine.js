// Gambit's engine: the opponent, the coach's judge and the hint giver. Iterative deepening alpha-beta (PVS) with a
// transposition table, quiescence on captures, check extension, null-move pruning, late-move reductions, killer and
// history ordering; a tapered piece-square evaluation with pawn structure, king safety and mobility touches.
// Strength levels play weaker on purpose: shallower search, then a choice among the good moves with some noise.
import { Position, P, N, B, R, Q, K, mFrom, mTo, mFlags, mPromo, F_CAP, F_PROMO, F_EP, sqName } from './chess.js';

const VAL_MG = [0, 82, 337, 365, 477, 1025, 0], VAL_EG = [0, 94, 281, 297, 512, 936, 0], PHASE = [0, 0, 1, 1, 2, 4, 0];
// piece-square tables, from white's side, a8..h8 first row (classic simplified tables, tuned a little)
const T = {
  [P]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [N]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [B]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [R]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [Q]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  KMG: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  KEG: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};
// table index for a 0x88 square: white reads the table upside down (row 0 = rank 8)
const idxW = (s) => (7 - (s >> 4)) * 8 + (s & 7), idxB = (s) => (s >> 4) * 8 + (s & 7);
const PASSED = [0, 5, 10, 20, 35, 60, 100, 0]; // by ranks advanced
export const MATE = 30000;

export function evaluate(p) {
  const b = p.b; let mg = 0, eg = 0, phase = 0, wb = 0, bb = 0;
  const pawnsW = new Int8Array(8), pawnsB = new Int8Array(8), minW = new Int8Array(8).fill(8), maxB = new Int8Array(8).fill(-1);
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const v = b[s]; if (!v) continue;
    const t = v > 0 ? v : -v, w = v > 0, i = w ? idxW(s) : idxB(s), sg = w ? 1 : -1;
    phase += PHASE[t];
    if (t === K) { mg += sg * T.KMG[i]; eg += sg * T.KEG[i]; continue; }
    mg += sg * (VAL_MG[t] + T[t][i]); eg += sg * (VAL_EG[t] + (t === P ? T[t][i] * 1.4 : T[t][i] * 0.6));
    if (t === B) { if (w) wb++; else bb++; }
    if (t === P) { const f = s & 7, r = s >> 4; if (w) { pawnsW[f]++; if (r < minW[f]) minW[f] = r; } else { pawnsB[f]++; if (r > maxB[f]) maxB[f] = r; } }
  }
  // bishop pair, doubled / isolated / passed pawns
  if (wb >= 2) { mg += 30; eg += 50; } if (bb >= 2) { mg -= 30; eg -= 50; }
  for (let f = 0; f < 8; f++) {
    if (pawnsW[f] > 1) { mg -= 10 * (pawnsW[f] - 1); eg -= 20 * (pawnsW[f] - 1); }
    if (pawnsB[f] > 1) { mg += 10 * (pawnsB[f] - 1); eg += 20 * (pawnsB[f] - 1); }
    const nbW = (f > 0 && pawnsW[f - 1]) || (f < 7 && pawnsW[f + 1]), nbB = (f > 0 && pawnsB[f - 1]) || (f < 7 && pawnsB[f + 1]);
    if (pawnsW[f] && !nbW) { mg -= 12; eg -= 15; } if (pawnsB[f] && !nbB) { mg += 12; eg += 15; }
  }
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const v = b[s]; if (v !== P && v !== -P) continue;
    const f = s & 7, r = s >> 4; let passed = true;
    if (v === P) { for (let g = Math.max(0, f - 1); g <= Math.min(7, f + 1); g++) if (maxB[g] > r) passed = false; if (passed) { mg += PASSED[r] / 2; eg += PASSED[r] * 1.5; } }
    else { for (let g = Math.max(0, f - 1); g <= Math.min(7, f + 1); g++) if (minW[g] < r) passed = false; if (passed) { mg -= PASSED[7 - r] / 2; eg -= PASSED[7 - r] * 1.5; } }
  }
  // the lone king: push it to the edge and bring ours closer (so mates with queen/rook are found smoothly)
  const ph = Math.min(phase, 24), score = (mg * ph + eg * (24 - ph)) / 24;
  let mop = 0;
  if (ph <= 6) {
    const kw = p.kings[0], kb = p.kings[1], dist = Math.abs((kw >> 4) - (kb >> 4)) + Math.abs((kw & 7) - (kb & 7));
    const edge = (k) => Math.max(3 - (k >> 4), (k >> 4) - 4) + Math.max(3 - (k & 7), (k & 7) - 4);
    if (score > 200) mop = 10 * edge(kb) + 4 * (14 - dist); else if (score < -200) mop = -(10 * edge(kw) + 4 * (14 - dist));
  }
  const total = score + mop + (p.white ? 10 : -10); // a small tempo bonus for the side to move
  return Math.round(p.white ? total : -total);
}

// ------------------------------------------------------------------ search
const TT_SIZE = 1 << 20, TT_MASK = TT_SIZE - 1;
const ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int32Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
const EXACT = 1, LOWER = 2, UPPER = 3;
const valOf = (v) => [0, 100, 320, 330, 500, 900, 2000][v > 0 ? v : -v];

export class Engine {
  constructor() { this.killers = Array.from({ length: 128 }, () => [0, 0]); this.history = new Int32Array(128 * 128); }
  order(p, moves, ttm, ply) {
    const b = p.b, k = this.killers[ply], sc = new Map();
    for (const m of moves) {
      let s = 0; const f = mFlags(m);
      if (m === ttm) s = 1e7;
      else if (f & (F_CAP | F_PROMO)) s = 1e6 + (f & F_EP ? 100 : valOf(b[mTo(m)])) * 10 - valOf(b[mFrom(m)]) / 10 + (f & F_PROMO ? valOf(mPromo(m)) : 0);
      else if (m === k[0]) s = 9e5; else if (m === k[1]) s = 8e5;
      else s = this.history[mFrom(m) * 128 + mTo(m)];
      sc.set(m, s);
    }
    return moves.sort((a, c) => sc.get(c) - sc.get(a));
  }
  quiesce(p, alpha, beta, ply) {
    this.nodes++;
    const stand = evaluate(p);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const moves = this.order(p, p.pseudo(true), 0, Math.min(ply, 127));
    for (const m of moves) {
      if (stand + valOf(p.b[mTo(m)]) + 200 < alpha && !(mFlags(m) & F_PROMO)) continue; // delta pruning
      if (!p.make(m)) continue;
      const s = -this.quiesce(p, -beta, -alpha, ply + 1); p.unmake();
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }
  search(p, depth, alpha, beta, ply, allowNull = true) {
    if ((this.nodes & 2047) === 0 && performance.now() > this.deadline) this.stopped = true;
    if (this.stopped) return 0;
    const inCheck = p.inCheck();
    if (inCheck) depth++; // check extension
    if (depth <= 0) return this.quiesce(p, alpha, beta, ply);
    this.nodes++;
    if (ply && (p.half >= 100 || this.repeated(p))) return 0;
    const i = p.h1 & TT_MASK, hit = ttKey[i] === p.h2; let ttm = 0;
    if (hit) {
      ttm = ttMove[i];
      if (ply && ttDepth[i] >= depth) {
        let s = ttScore[i]; if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
        if (ttFlag[i] === EXACT || (ttFlag[i] === LOWER && s >= beta) || (ttFlag[i] === UPPER && s <= alpha)) return s;
      }
    }
    // null move: if passing still keeps us above beta, this line is too good for the opponent to allow
    if (allowNull && !inCheck && depth >= 3 && ply && this.hasPieces(p) && evaluate(p) >= beta) {
      p.makeNull(); const s = -this.search(p, depth - 3, -beta, -beta + 1, ply + 1, false); p.unmakeNull();
      if (this.stopped) return 0;
      if (s >= beta) return beta;
    }
    const moves = this.order(p, p.pseudo(), ttm, Math.min(ply, 127));
    let best = -MATE - 1, bestM = 0, legal = 0; const a0 = alpha;
    for (const m of moves) {
      if (!p.make(m)) continue;
      legal++; let s;
      const quiet = !(mFlags(m) & (F_CAP | F_PROMO));
      if (legal === 1) s = -this.search(p, depth - 1, -beta, -alpha, ply + 1);
      else {
        const red = quiet && !inCheck && depth >= 3 && legal > 3 && !p.inCheck() ? 1 + (legal > 8 ? 1 : 0) : 0;
        s = -this.search(p, depth - 1 - red, -alpha - 1, -alpha, ply + 1);
        if (s > alpha && (red || s < beta)) s = -this.search(p, depth - 1, -beta, -alpha, ply + 1);
      }
      p.unmake();
      if (this.stopped) return 0;
      if (s > best) { best = s; bestM = m; }
      if (s > alpha) { alpha = s; if (ply === 0) this.rootBest = m; }
      if (alpha >= beta) {
        if (quiet) { const k = this.killers[Math.min(ply, 127)]; if (k[0] !== m) { k[1] = k[0]; k[0] = m; } this.history[mFrom(m) * 128 + mTo(m)] += depth * depth; }
        break;
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    let st = best; if (st > MATE - 500) st += ply; else if (st < -MATE + 500) st -= ply;
    ttKey[i] = p.h2; ttMove[i] = bestM; ttScore[i] = st; ttDepth[i] = depth; ttFlag[i] = best <= a0 ? UPPER : best >= beta ? LOWER : EXACT;
    return best;
  }
  hasPieces(p) { const b = p.b, w = p.white; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const v = b[s]; if (v && (v > 0) === w && (v > 0 ? v : -v) > P && (v > 0 ? v : -v) < K) return true; } return false; }
  // has this position been seen before (in the game or in this line)? keys' last entry is the position itself
  repeated(p) { const k = p.key(), ks = p.keys; for (let j = ks.length - 2; j >= Math.max(0, ks.length - 1 - p.half); j--) if (ks[j] === k) return true; return false; }
  // best move within a time / depth budget. Returns {move, score (centipawns, side to move), depth, pv, nodes}
  think(fen, { time = 1000, depth = 64, keys } = {}) {
    const p = new Position(fen); if (keys) p.keys = keys.slice();
    // repetition detection inside the search also looks at moves played in the tree
    const make = p.make.bind(p), unmake = p.unmake.bind(p);
    p.make = (m) => { if (!make(m)) return false; p.keys.push(p.key()); return true; }; p.unmake = () => { p.keys.pop(); unmake(); };
    p.keys.pop(); // the current position is checked separately (only previous ones count as repeats)
    this.nodes = 0; this.stopped = false; this.deadline = performance.now() + time; this.rootBest = 0;
    const legal = p.legal(); if (!legal.length) return { move: null, score: p.inCheck() ? -MATE : 0, depth: 0 };
    let best = legal[0], score = 0, done = 0;
    for (let d = 1; d <= depth; d++) {
      this.rootBest = 0; const s = this.search(p, d, -MATE - 1, MATE + 1, 0);
      if (this.stopped && d > 1) break;
      if (this.rootBest) best = this.rootBest; score = s; done = d;
      if (Math.abs(s) > MATE - 100) break;
      if (performance.now() > this.deadline) break;
    }
    return { move: best, from: sqName(mFrom(best)), to: sqName(mTo(best)), promotion: mFlags(best) & F_PROMO ? ' pnbrqk'[mPromo(best)] : undefined, score, depth: done, nodes: this.nodes };
  }
  // every legal move with its score (side to move's point of view): the coach compares the learner's move to the best
  rank(fen, { depth = 3, time = 1500, keys } = {}) {
    const p = new Position(fen), legal = p.legal(), out = [], t0 = performance.now();
    for (const m of legal) {
      p.make(m); const next = p.fen(); p.unmake();
      const r = this.think(next, { depth, time: Math.max(60, (time - (performance.now() - t0)) / Math.max(1, legal.length - out.length)), keys });
      out.push({ move: m, from: sqName(mFrom(m)), to: sqName(mTo(m)), promotion: mFlags(m) & F_PROMO ? ' pnbrqk'[mPromo(m)] : undefined, score: -r.score });
    }
    return out.sort((a, b) => b.score - a.score);
  }
}

// a level from 1 (first steps) to 10 (strong club player): how deep, how long, how much noise in the choice
export const LEVELS = [null,
  { depth: 1, time: 200, noise: 220, blunder: 0.25 }, { depth: 1, time: 250, noise: 140, blunder: 0.15 }, { depth: 2, time: 300, noise: 90, blunder: 0.1 },
  { depth: 2, time: 400, noise: 50, blunder: 0.06 }, { depth: 3, time: 500, noise: 30, blunder: 0.03 }, { depth: 4, time: 600, noise: 15, blunder: 0.01 },
  { depth: 5, time: 900, noise: 6, blunder: 0 }, { depth: 7, time: 1300, noise: 0, blunder: 0 }, { depth: 9, time: 2000, noise: 0, blunder: 0 }, { depth: 64, time: 3000, noise: 0, blunder: 0 }];
export function playLevel(engine, fen, level, keys) {
  const L = LEVELS[Math.max(1, Math.min(10, level))];
  if (!L.noise && !L.blunder) return engine.think(fen, { depth: L.depth, time: L.time, keys });
  const ranked = engine.rank(fen, { depth: Math.max(1, L.depth - 1), time: L.time, keys });
  if (!ranked.length) return { move: null };
  // never throw away a mate in one, and at low levels sometimes play a plain (not suicidal) bad move
  if (ranked[0].score > MATE - 10) return ranked[0];
  if (Math.random() < L.blunder) { const ok = ranked.filter((r) => r.score > ranked[0].score - 400); return ok[Math.floor(Math.random() * ok.length)]; }
  const noisy = ranked.map((r) => ({ r, s: r.score + (Math.random() * 2 - 1) * L.noise })).sort((a, b) => b.s - a.s);
  return noisy[0].r;
}
