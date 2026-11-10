// Gambit: the course. Chapters of short lessons; each lesson is a list of steps the runner (app.js) plays one by one.
//   { say, fen?, arrows?, marks?, stars?, flip? }   a spoken explanation over a position, then "Continuer"
//   { demo: [SAN...], fen?, say?, at?: {ply: line} } moves played on the board while the voice explains
//   { task: 'squares', find: [...], say }            touch the squares named on screen
//   { task: 'collect', piece, at, stars, own?, enemy?, say }   move one piece around to catch every star (no kings)
//   { task: 'move', fen, want: [SAN...], say, fail? } one precise move (castle, en passant, promotion…)
//   { task: 'puzzle', fen, goal: 'mate'|'win'|'safe', n, say, hint, fail? }   judged by the engine, the best defence replies
//   { task: 'play', fen, goal: 'mate'|'promote'|'opening', max, level, say }  a real game against Gambit
//   { task: 'quiz', q, options: [[line, ok]...] }
// Every say/line id is a voice line in captions.js (FR and EN).
const E = '8/8/8/8/8/8/8/8 w - - 0 1', START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const COURSE = [
  { id: 'board', lessons: [
    { id: 'board1', steps: [
      { say: 'w_hello', fen: START },
      { say: 'b_64', fen: E },
      { say: 'b_corner', fen: E, marks: ['h1'] },
      { say: 'b_coords', fen: E, marks: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] },
      { say: 'b_name', fen: E, marks: ['e4'] },
      { task: 'squares', find: ['d5', 'a1', 'h8', 'f3', 'c6'], say: 'b_find' },
      { say: 'b_start', fen: START },
    ] },
  ] },
  { id: 'pieces', lessons: [
    { id: 'rook', steps: [
      { say: 'p_rook', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', arrows: [['a1', 'a8'], ['a1', 'h1']] },
      { task: 'collect', piece: 'r', at: 'a1', stars: ['a6', 'f6', 'f2'], say: 'p_collect' },
    ] },
    { id: 'bishop', steps: [
      { say: 'p_bishop', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', arrows: [['c1', 'h6'], ['c1', 'a3']] },
      { task: 'collect', piece: 'b', at: 'c1', stars: ['e3', 'g5', 'd8'], say: 'p_collect' },
    ] },
    { id: 'queen', steps: [
      { say: 'p_queen', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'g1'], ['d4', 'd1'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7']] },
      { task: 'collect', piece: 'q', at: 'd1', stars: ['d5', 'h5', 'e8'], say: 'p_collect' },
    ] },
    { id: 'king', steps: [
      { say: 'p_king', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', marks: ['c3', 'd3', 'e3', 'c4', 'e4', 'c5', 'd5', 'e5'] },
      { task: 'collect', piece: 'k', at: 'e1', stars: ['e3', 'f4', 'g4'], say: 'p_collect' },
    ] },
    { id: 'knight', steps: [
      { say: 'p_knight', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', marks: ['c2', 'e2', 'b3', 'f3', 'b5', 'f5', 'c6', 'e6'] },
      { say: 'p_knight2', fen: '8/8/8/8/8/8/PPPPPPPP/1N6 w - - 0 1', arrows: [['b1', 'c3']] },
      { task: 'collect', piece: 'n', at: 'b1', own: ['a2', 'b2', 'c2', 'd2', 'e2'], stars: ['c3', 'd5', 'f6'], say: 'p_collect' },
    ] },
    { id: 'pawn', steps: [
      { say: 'p_pawn', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', arrows: [['e2', 'e4']] },
      { say: 'p_pawn2', fen: '8/8/3p4/4P3/8/8/8/8 w - - 0 1', arrows: [['e5', 'd6']] },
      { task: 'collect', piece: 'p', at: 'e2', enemy: ['d6'], stars: ['e4', 'e5', 'd6'], say: 'p_pawn_go' },
      { say: 'p_recap', fen: START },
    ] },
  ] },
  { id: 'values', lessons: [
    { id: 'values1', steps: [
      { say: 'v_capture', fen: '6k1/8/8/3r4/8/2N5/8/6K1 w - - 0 1', arrows: [['c3', 'd5']] },
      { say: 'v_values', fen: '8/8/8/8/8/8/8/8 w - - 0 1', showValues: true },
      { task: 'quiz', q: 'q_trade', options: [['q_yes', true], ['q_no', false]], after: 'q_trade_why' },
      { task: 'puzzle', fen: '6k1/5pp1/4p2p/1b1p4/8/2N5/4RPPP/6K1 w - - 0 1', goal: 'win', n: 1, say: 'v_free', hint: 'Nxb5', fail: 'v_free_bad' },
      { say: 'v_safe' },
    ] },
  ] },
  { id: 'mate', lessons: [
    { id: 'check', steps: [
      { say: 'm_check', fen: '6k1/8/8/8/8/8/5PP1/4r1K1 w - - 0 1', arrows: [['e1', 'g1']], color: 'red' },
      { say: 'm_three' },
      { task: 'move', fen: '6k1/8/8/8/8/8/5PP1/4r1K1 w - - 0 1', want: ['Kh2'], say: 'm_escape' },
    ] },
    { id: 'mate1', steps: [
      { say: 'm_mate', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1' },
      { task: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', goal: 'mate', n: 1, say: 'm_find', hint: 'Rd8#' },
      { task: 'puzzle', fen: '7k/8/6K1/8/8/8/Q7/8 w - - 0 1', goal: 'mate', n: 1, say: 'm_find2', hint: 'Qa8#' },
      { task: 'puzzle', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', goal: 'mate', n: 1, say: 'm_find3', hint: 'Qxf7#' },
      { task: 'puzzle', fen: 'r5rk/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1', goal: 'mate', n: 1, say: 'm_smother', hint: 'Nf7#' },
    ] },
    { id: 'stalemate', steps: [
      { say: 'm_stalemate', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1' },
      { task: 'puzzle', fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', goal: 'mate', n: 1, say: 'm_nopat', hint: 'Qf8#' },
    ] },
  ] },
  { id: 'special', lessons: [
    { id: 'castle', steps: [
      { say: 's_castle', fen: 'r3k2r/ppp2ppp/2nqbn2/3pp3/3PP3/2NQBN2/PPP2PPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']] },
      { say: 's_castle_rules' },
      { task: 'move', fen: 'r3k2r/ppp2ppp/2nqbn2/3pp3/3PP3/2NQBN2/PPP2PPP/R3K2R w KQkq - 0 1', want: ['O-O'], say: 's_castle_go' },
    ] },
    { id: 'enpassant', steps: [
      { say: 's_ep', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1' },
      { demo: ['d5'], fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1' },
      { task: 'move', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', want: ['exd6'], say: 's_ep_go' },
    ] },
    { id: 'promotion', steps: [
      { say: 's_promo', fen: '8/4P2k/8/8/8/8/8/4K3 w - - 0 1', arrows: [['e7', 'e8']] },
      { task: 'move', fen: '8/4P2k/8/8/8/8/8/4K3 w - - 0 1', want: ['e8=Q'], say: 's_promo_go' },
    ] },
  ] },
  { id: 'basicmates', lessons: [
    { id: 'kq', steps: [
      { say: 'e_kq', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1' },
      { say: 'e_kq2', fen: '8/8/8/4k3/8/8/2Q5/4K3 b - - 0 1', marks: ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3'].filter((s) => s[0] > 'c' && +s[1] > 2) },
      { task: 'play', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', goal: 'mate', max: 20, level: 10, say: 'e_kq_go' },
    ] },
    { id: 'rr', steps: [
      { say: 'e_rr', fen: '8/8/8/3k4/8/8/8/R3K2R w - - 0 1' },
      { task: 'play', fen: '8/8/8/3k4/8/8/8/R3K2R w - - 0 1', goal: 'mate', max: 15, level: 10, say: 'e_rr_go' },
    ] },
    { id: 'kr', steps: [
      { say: 'e_r', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
      { task: 'play', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', max: 35, level: 10, say: 'e_r_go' },
    ] },
  ] },
  { id: 'opening', lessons: [
    { id: 'principles', steps: [
      { say: 'o_center', fen: START, marks: ['d4', 'e4', 'd5', 'e5'] },
      { say: 'o_develop', fen: START, arrows: [['g1', 'f3'], ['b1', 'c3'], ['f1', 'c4'], ['c1', 'f4']] },
      { say: 'o_castle', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', arrows: [['e1', 'g1']] },
      { say: 'o_queen', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', arrows: [['d1', 'h5']], color: 'red' },
    ] },
    { id: 'italian', steps: [
      { demo: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'], fen: START, say: 'o_italian' },
    ] },
    { id: 'scholar', steps: [
      { say: 'o_berger', fen: START },
      { demo: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], fen: START },
      { task: 'puzzle', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', goal: 'safe', n: 1, say: 'o_berger_go', hint: 'g6', flip: true, fail: 'o_berger_bad' },
      { say: 'o_berger_why' },
    ] },
    { id: 'firstgame', steps: [
      { task: 'play', fen: START, goal: 'opening', max: 10, level: 3, say: 'o_play' },
    ] },
  ] },
  { id: 'tactics', lessons: [
    { id: 'fork', steps: [
      { say: 't_fork', fen: 'r3k3/2N5/8/8/8/8/5PPP/6K1 b - - 0 1', arrows: [['c7', 'e8'], ['c7', 'a8']] },
      { task: 'puzzle', fen: 'r3k3/8/8/3N4/8/8/5PPP/6K1 w - - 0 1', goal: 'win', n: 2, say: 't_fork_go', hint: 'Nc7+' },
      { task: 'puzzle', fen: '6k1/5pp1/2n1b2p/8/2PP4/8/5PPP/2R3K1 w - - 0 1', goal: 'win', n: 1, say: 't_fork_go2', hint: 'd5' },
    ] },
    { id: 'pin', steps: [
      { say: 't_pin', fen: '4k3/3q4/8/1B6/P7/8/8/4K3 b - - 0 1', arrows: [['b5', 'e8']] },
      { task: 'puzzle', fen: '4k3/3q4/8/8/P7/8/8/4KB1R w - - 0 1', goal: 'win', n: 2, say: 't_pin_go', hint: 'Bb5' },
    ] },
    { id: 'skewer', steps: [
      { say: 't_skewer', fen: '3q4/8/8/3k4/8/8/8/3RK3 b - - 0 1', arrows: [['d1', 'd8']] },
      { task: 'puzzle', fen: '3q4/8/8/3k4/8/8/8/R3K3 w - - 0 1', goal: 'win', n: 2, say: 't_skewer_go', hint: 'Rd1+' },
    ] },
    { id: 'discovered', steps: [
      { say: 't_disc', fen: '4k3/8/8/8/q3B3/8/8/4R1K1 w - - 0 1', arrows: [['e1', 'e8'], ['e4', 'c2']] },
      { task: 'puzzle', fen: '4k3/8/8/8/q3B3/8/8/4R1K1 w - - 0 1', goal: 'win', n: 2, say: 't_disc_go', hint: 'Bc2+' },
    ] },
    { id: 'backrank', steps: [
      { say: 't_back', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1', marks: ['f7', 'g7', 'h7'] },
      { task: 'puzzle', fen: '6k1/5ppp/8/8/8/8/1q3PPP/4R1K1 w - - 0 1', goal: 'mate', n: 1, say: 't_back_go', hint: 'Re8#' },
    ] },
  ] },
  { id: 'think', lessons: [
    { id: 'ccc', steps: [
      { say: 'h_ccc', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', arrows: [['h5', 'f7']] },
      { say: 'h_blunder' },
      { task: 'puzzle', fen: '6k1/5ppp/8/8/4p3/3B4/5PPP/6K1 w - - 0 1', goal: 'safe', n: 1, say: 'h_safe_go', hint: 'Bxe4' },
      { say: 'h_plan' },
    ] },
  ] },
  { id: 'endgame', lessons: [
    { id: 'square', steps: [
      { say: 'f_king', fen: '8/5k2/8/8/8/8/2K5/8 w - - 0 1', arrows: [['c2', 'd4']] },
      { say: 'f_square', fen: '8/8/8/8/p7/4K3/8/7k w - - 0 1', marks: ['a1', 'b1', 'c1', 'd1', 'a2', 'b2', 'c2', 'd2', 'a3', 'b3', 'c3', 'd3', 'a4', 'b4', 'c4', 'd4'] },
      { task: 'puzzle', fen: '8/8/8/8/p7/4K3/8/7k w - - 0 1', goal: 'safe', n: 1, say: 'f_square_go', hint: 'Kd3' },
    ] },
    { id: 'opposition', steps: [
      { say: 'f_opposition', fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1', marks: ['e5'] },
      { task: 'play', fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1', goal: 'promote', max: 15, level: 10, say: 'f_promo_go' },
      { say: 'f_rook' },
    ] },
  ] },
  { id: 'pro', lessons: [
    { id: 'opera', steps: [
      { say: 'g_opera', fen: START },
      { demo: ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'],
        fen: START, at: { 13: 'g_queen', 17: 'g_dev', 25: 'g_sac', 33: 'g_mate' } },
      { say: 'g_path' },
      { say: 'g_go' },
    ] },
  ] },
];
export const LESSONS = COURSE.flatMap((c) => c.lessons.map((l) => ({ ...l, chapter: c.id })));
