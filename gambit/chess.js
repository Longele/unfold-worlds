// Gambit: the rules of chess, written for this course (no outside library). A 0x88 board, legal moves with castling,
// en passant and promotion, check / mate / stalemate / draws, FEN and SAN. The engine (engine.js) searches on the same
// Position class, so the rules the learner sees and the rules the opponent plays are one and the same.
//   board: Int8Array(128), white pieces > 0, black < 0. 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king.
export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const LETTER = ' pnbrqk', FROM_LETTER = { p: P, n: N, b: B, r: R, q: Q, k: K };
const DN = [33, 31, 18, 14, -33, -31, -18, -14], DB = [15, 17, -15, -17], DR = [1, -1, 16, -16], DK = [1, -1, 16, -16, 15, 17, -15, -17];
export const sqName = (s) => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
export const sqIndex = (n) => (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97);
// castling rights bits
const WK = 1, WQ = 2, BK = 4, BQ = 8;
// what moving a piece from / to a square leaves of the castling rights
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0] = 15 ^ WQ; CASTLE_MASK[7] = 15 ^ WK; CASTLE_MASK[4] = 15 ^ (WK | WQ);
CASTLE_MASK[112] = 15 ^ BQ; CASTLE_MASK[119] = 15 ^ BK; CASTLE_MASK[116] = 15 ^ (BK | BQ);

// Zobrist keys (two 32-bit halves), fixed seed so positions hash the same everywhere
let seed = 0x2f6b9a11;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const ZP = Array.from({ length: 13 }, () => Array.from({ length: 128 }, () => [rnd(), rnd()]));
const ZSIDE = [rnd(), rnd()], ZCAST = Array.from({ length: 16 }, () => [rnd(), rnd()]), ZEP = Array.from({ length: 8 }, () => [rnd(), rnd()]);

// a move packed in one number: from | to << 7 | promo << 14 | flags << 17
export const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8, F_PROMO = 16;
export const mFrom = (m) => m & 127, mTo = (m) => (m >> 7) & 127, mPromo = (m) => (m >> 14) & 7, mFlags = (m) => (m >> 17) & 31;
const mk = (f, t, promo = 0, flags = 0) => f | (t << 7) | (promo << 14) | (flags << 17);

export class Position {
  constructor(fen = START) { this.b = new Int8Array(128); this.stack = []; this.load(fen); }
  load(fen) {
    const [pl, side, cast, ep, hm, fm] = fen.trim().split(/\s+/); this.b.fill(0); this.kings = [0, 0];
    let r = 7, f = 0;
    for (const c of pl) {
      if (c === '/') { r--; f = 0; continue; }
      if (c >= '1' && c <= '8') { f += +c; continue; }
      const t = FROM_LETTER[c.toLowerCase()], v = c === c.toUpperCase() ? t : -t, s = r * 16 + f; this.b[s] = v;
      if (t === K) this.kings[v > 0 ? 0 : 1] = s; f++;
    }
    this.white = side !== 'b'; this.castle = 0;
    if (cast && cast !== '-') for (const c of cast) this.castle |= { K: WK, Q: WQ, k: BK, q: BQ }[c] || 0;
    this.ep = ep && ep !== '-' ? sqIndex(ep) : -1; this.half = +(hm || 0); this.full = +(fm || 1);
    this.stack = []; this.rehash(); this.keys = [this.key()];
    return this;
  }
  rehash() {
    let h1 = 0, h2 = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const v = this.b[s]; if (v) { const z = ZP[v + 6][s]; h1 ^= z[0]; h2 ^= z[1]; } }
    if (!this.white) { h1 ^= ZSIDE[0]; h2 ^= ZSIDE[1]; }
    h1 ^= ZCAST[this.castle][0]; h2 ^= ZCAST[this.castle][1];
    if (this.ep >= 0) { h1 ^= ZEP[this.ep & 7][0]; h2 ^= ZEP[this.ep & 7][1]; }
    this.h1 = h1; this.h2 = h2;
  }
  key() { return this.h1 + ':' + this.h2; }
  fen() {
    let out = '';
    for (let r = 7; r >= 0; r--) {
      let e = 0;
      for (let f = 0; f < 8; f++) { const v = this.b[r * 16 + f]; if (!v) { e++; continue; } if (e) { out += e; e = 0; } const l = LETTER[Math.abs(v)]; out += v > 0 ? l.toUpperCase() : l; }
      if (e) out += e; if (r) out += '/';
    }
    let c = ''; if (this.castle & WK) c += 'K'; if (this.castle & WQ) c += 'Q'; if (this.castle & BK) c += 'k'; if (this.castle & BQ) c += 'q';
    return `${out} ${this.white ? 'w' : 'b'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
  }
  // is square s attacked by the side `byWhite`?
  attacked(s, byWhite) {
    const b = this.b, sg = byWhite ? 1 : -1;
    // pawns
    if (byWhite) { if (!((s - 15) & 0x88) && b[s - 15] === P) return true; if (!((s - 17) & 0x88) && b[s - 17] === P) return true; }
    else { if (!((s + 15) & 0x88) && b[s + 15] === -P) return true; if (!((s + 17) & 0x88) && b[s + 17] === -P) return true; }
    for (const d of DN) { const t = s + d; if (!(t & 0x88) && b[t] === sg * N) return true; }
    for (const d of DK) { const t = s + d; if (!(t & 0x88) && b[t] === sg * K) return true; }
    for (const d of DB) { let t = s + d; while (!(t & 0x88)) { const v = b[t]; if (v) { if (v === sg * B || v === sg * Q) return true; break; } t += d; } }
    for (const d of DR) { let t = s + d; while (!(t & 0x88)) { const v = b[t]; if (v) { if (v === sg * R || v === sg * Q) return true; break; } t += d; } }
    return false;
  }
  inCheck(white = this.white) { return this.attacked(this.kings[white ? 0 : 1], !white); }
  // pseudo-legal moves (own king may be left in check); capturesOnly for the engine's quiescence search
  pseudo(capturesOnly = false) {
    const b = this.b, w = this.white, sg = w ? 1 : -1, out = [];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const v = b[s]; if (!v || (v > 0) !== w) continue;
      const t = v * sg;
      if (t === P) {
        const fwd = w ? 16 : -16, startR = w ? 1 : 6, lastR = w ? 7 : 0, one = s + fwd;
        const push = (to, flags) => { if ((to >> 4) === lastR) for (const pr of [Q, R, B, N]) out.push(mk(s, to, pr, flags | F_PROMO)); else out.push(mk(s, to, 0, flags)); };
        if (!(one & 0x88) && !b[one]) {
          if (!capturesOnly || (one >> 4) === lastR) push(one, 0);
          const two = one + fwd; if (!capturesOnly && (s >> 4) === startR && !b[two]) out.push(mk(s, two, 0, F_DOUBLE));
        }
        for (const d of w ? [15, 17] : [-15, -17]) {
          const to = s + d; if (to & 0x88) continue;
          if (b[to] && (b[to] > 0) !== w) push(to, F_CAP); else if (to === this.ep) out.push(mk(s, to, 0, F_CAP | F_EP));
        }
        continue;
      }
      const dirs = t === N ? DN : t === B ? DB : t === R ? DR : DK, slide = t === B || t === R || t === Q;
      for (const d of dirs) {
        let to = s + d;
        while (!(to & 0x88)) {
          const x = b[to];
          if (x) { if ((x > 0) !== w) out.push(mk(s, to, 0, F_CAP)); break; }
          if (!capturesOnly) out.push(mk(s, to, 0, 0));
          if (!slide) break; to += d;
        }
      }
      if (t === K && !capturesOnly) { // castling: king and rook unmoved, squares between empty, king not passing through check
        if (w && s === 4) {
          if ((this.castle & WK) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, false) && !this.attacked(5, false) && !this.attacked(6, false)) out.push(mk(4, 6, 0, F_CASTLE));
          if ((this.castle & WQ) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, false) && !this.attacked(3, false) && !this.attacked(2, false)) out.push(mk(4, 2, 0, F_CASTLE));
        } else if (!w && s === 116) {
          if ((this.castle & BK) && !b[117] && !b[118] && b[119] === -R && !this.attacked(116, true) && !this.attacked(117, true) && !this.attacked(118, true)) out.push(mk(116, 118, 0, F_CASTLE));
          if ((this.castle & BQ) && !b[115] && !b[114] && !b[113] && b[112] === -R && !this.attacked(116, true) && !this.attacked(115, true) && !this.attacked(114, true)) out.push(mk(116, 114, 0, F_CASTLE));
        }
      }
    }
    return out;
  }
  xorPiece(v, s) { const z = ZP[v + 6][s]; this.h1 ^= z[0]; this.h2 ^= z[1]; }
  // play a move; returns false (and undoes it) if it leaves the mover's king in check
  make(m) {
    const b = this.b, f = mFrom(m), t = mTo(m), fl = mFlags(m), v = b[f], w = this.white;
    const u = { m, cap: b[t], castle: this.castle, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2, k0: this.kings[0], k1: this.kings[1] };
    this.stack.push(u);
    this.xorPiece(v, f); if (u.cap) this.xorPiece(u.cap, t);
    b[t] = v; b[f] = 0;
    if (fl & F_EP) { const cs = t + (w ? -16 : 16); u.epCap = b[cs]; this.xorPiece(b[cs], cs); b[cs] = 0; }
    if (fl & F_PROMO) b[t] = (w ? 1 : -1) * mPromo(m);
    this.xorPiece(b[t], t);
    if (fl & F_CASTLE) { const [rf, rt] = t === 6 ? [7, 5] : t === 2 ? [0, 3] : t === 118 ? [119, 117] : [112, 115]; this.xorPiece(b[rf], rf); b[rt] = b[rf]; b[rf] = 0; this.xorPiece(b[rt], rt); }
    if (Math.abs(v) === K) this.kings[w ? 0 : 1] = t;
    this.h1 ^= ZCAST[this.castle][0]; this.h2 ^= ZCAST[this.castle][1];
    this.castle &= CASTLE_MASK[f] & CASTLE_MASK[t];
    this.h1 ^= ZCAST[this.castle][0]; this.h2 ^= ZCAST[this.castle][1];
    if (this.ep >= 0) { this.h1 ^= ZEP[this.ep & 7][0]; this.h2 ^= ZEP[this.ep & 7][1]; }
    this.ep = fl & F_DOUBLE ? (f + t) >> 1 : -1;
    if (this.ep >= 0) { this.h1 ^= ZEP[this.ep & 7][0]; this.h2 ^= ZEP[this.ep & 7][1]; }
    this.half = Math.abs(v) === P || u.cap || (fl & F_EP) ? 0 : this.half + 1;
    if (!w) this.full++;
    this.white = !w; this.h1 ^= ZSIDE[0]; this.h2 ^= ZSIDE[1];
    if (this.attacked(this.kings[w ? 0 : 1], !w)) { this.unmake(); return false; }
    return true;
  }
  unmake() {
    const u = this.stack.pop(), b = this.b, m = u.m, f = mFrom(m), t = mTo(m), fl = mFlags(m);
    this.white = !this.white; const w = this.white;
    b[f] = fl & F_PROMO ? (w ? P : -P) : b[t]; b[t] = u.cap;
    if (fl & F_EP) b[t + (w ? -16 : 16)] = u.epCap;
    if (fl & F_CASTLE) { const [rf, rt] = t === 6 ? [7, 5] : t === 2 ? [0, 3] : t === 118 ? [119, 117] : [112, 115]; b[rf] = b[rt]; b[rt] = 0; }
    this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.h1 = u.h1; this.h2 = u.h2; this.kings[0] = u.k0; this.kings[1] = u.k1;
    if (!w) this.full--;
  }
  legal() { const out = []; for (const m of this.pseudo()) if (this.make(m)) { this.unmake(); out.push(m); } return out; }
  // null move for the engine (pass): flips the side, clears en passant
  makeNull() { this.stack.push({ nul: true, ep: this.ep, h1: this.h1, h2: this.h2 }); if (this.ep >= 0) { this.h1 ^= ZEP[this.ep & 7][0]; this.h2 ^= ZEP[this.ep & 7][1]; } this.ep = -1; this.white = !this.white; this.h1 ^= ZSIDE[0]; this.h2 ^= ZSIDE[1]; }
  unmakeNull() { const u = this.stack.pop(); this.white = !this.white; this.ep = u.ep; this.h1 = u.h1; this.h2 = u.h2; }
  insufficient() {
    let minors = 0, bishops = []; const b = this.b;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const t = Math.abs(b[s]); if (!t || t === K) continue; if (t === P || t === R || t === Q) return false; minors++; if (t === B) bishops.push(((s >> 4) + (s & 7)) & 1); }
    if (minors <= 1) return true;
    return minors === bishops.length && bishops.every((c) => c === bishops[0]); // only bishops, all on one colour
  }
  san(m, legal = this.legal()) {
    const b = this.b, f = mFrom(m), t = mTo(m), fl = mFlags(m), type = Math.abs(b[f]);
    let s;
    if (fl & F_CASTLE) s = (t & 7) === 6 ? 'O-O' : 'O-O-O';
    else if (type === P) s = (fl & F_CAP ? 'abcdefgh'[f & 7] + 'x' : '') + sqName(t) + (fl & F_PROMO ? '=' + 'NBRQ'[mPromo(m) - 2] : '');
    else {
      const twins = legal.filter((o) => o !== m && mTo(o) === t && Math.abs(b[mFrom(o)]) === type);
      let dis = '';
      if (twins.length) {
        const sameFile = twins.some((o) => (mFrom(o) & 7) === (f & 7)), sameRank = twins.some((o) => (mFrom(o) >> 4) === (f >> 4));
        dis = !sameFile ? 'abcdefgh'[f & 7] : !sameRank ? String((f >> 4) + 1) : sqName(f);
      }
      s = 'NBRQK'[type - 2] + dis + (fl & F_CAP ? 'x' : '') + sqName(t);
    }
    this.make(m); const chk = this.inCheck(), mate = chk && this.legal().length === 0; this.unmake();
    return s + (mate ? '#' : chk ? '+' : '');
  }
}

// ------------------------------------------------------------------ the friendly front: what the lessons and the board use
export class Chess {
  constructor(fen = START) { this.pos = new Position(fen); this.hist = []; }
  load(fen) { this.pos.load(fen); this.hist = []; return this; }
  fen() { return this.pos.fen(); }
  turn() { return this.pos.white ? 'w' : 'b'; }
  get(sq) { const v = this.pos.b[sqIndex(sq)]; return v ? { type: LETTER[Math.abs(v)], color: v > 0 ? 'w' : 'b' } : null; }
  put(sq, piece) { const s = sqIndex(sq); this.pos.b[s] = piece ? (piece.color === 'w' ? 1 : -1) * FROM_LETTER[piece.type] : 0; if (piece?.type === 'k') this.pos.kings[piece.color === 'w' ? 0 : 1] = s; this.pos.rehash(); }
  board() { const out = []; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const sq = 'abcdefgh'[f] + (r + 1), p = this.get(sq); if (p) out.push({ sq, ...p }); } return out; }
  verbose(m, legal) {
    const b = this.pos.b, f = mFrom(m), t = mTo(m), fl = mFlags(m), v = b[f];
    return { m, from: sqName(f), to: sqName(t), piece: LETTER[Math.abs(v)], color: v > 0 ? 'w' : 'b', captured: fl & F_EP ? 'p' : b[t] ? LETTER[Math.abs(b[t])] : undefined,
      promotion: fl & F_PROMO ? LETTER[mPromo(m)] : undefined, castle: fl & F_CASTLE ? ((t & 7) === 6 ? 'k' : 'q') : undefined, ep: !!(fl & F_EP), san: this.pos.san(m, legal) };
  }
  moves(square) { const legal = this.pos.legal(); return legal.filter((m) => !square || sqName(mFrom(m)) === square).map((m) => this.verbose(m, legal)); }
  // play {from, to, promotion} or a SAN string ('Nf3', 'e8=Q', 'O-O'); returns the move or null
  move(x) {
    const legal = this.pos.legal(); let m;
    if (typeof x === 'string') { const clean = (s) => s.replace(/[+#!?]/g, '').replace(/0/g, 'O'); m = legal.find((o) => clean(this.pos.san(o, legal)) === clean(x)); }
    else if (typeof x === 'number') m = legal.includes(x) ? x : undefined;
    else { const f = sqIndex(x.from), t = sqIndex(x.to), pr = x.promotion ? FROM_LETTER[x.promotion] : Q; m = legal.find((o) => mFrom(o) === f && mTo(o) === t && (!(mFlags(o) & F_PROMO) || mPromo(o) === pr)); }
    if (m === undefined) return null;
    const v = this.verbose(m, legal); this.pos.make(m); this.pos.keys.push(this.pos.key()); this.hist.push(v); return v;
  }
  undo() { if (!this.hist.length) return null; this.pos.unmake(); this.pos.keys.pop(); return this.hist.pop(); }
  inCheck() { return this.pos.inCheck(); }
  isCheckmate() { return this.pos.inCheck() && this.pos.legal().length === 0; }
  isStalemate() { return !this.pos.inCheck() && this.pos.legal().length === 0; }
  isRepetition() { const k = this.pos.key(); return this.pos.keys.filter((x) => x === k).length >= 3; }
  isDraw() { return this.isStalemate() || this.pos.insufficient() || this.pos.half >= 100 || this.isRepetition(); }
  isGameOver() { return this.pos.legal().length === 0 || this.isDraw(); }
  kingSquare(color) { return sqName(this.pos.kings[color === 'w' ? 0 : 1]); }
  attacked(sq, byColor) { return this.pos.attacked(sqIndex(sq), byColor === 'w'); }
  history() { return this.hist.map((h) => h.san); }
}
