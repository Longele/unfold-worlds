// ROVA's brain: runs a program of blocks on a grid, step by step, and keeps the whole trace (for the animation,
// the trail on the floor and the coach). Pure logic, no DOM: the same file is tested from node.
//
// A program is a list of blocks: { id, op: 'fwd' | 'left' | 'right' | 'repeat', n?, body? }.
// Directions: 0 north (up the map), 1 east, 2 south, 3 west.

export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

// the map of a level: '#' crate (wall), '.' floor, ' ' nothing, 'R' start, 'G' charger (goal), 'B' battery cell, 'L' lamp
export function world(lv) {
  const rows = lv.map, h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cell = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] || ' ' : ' ');
  let start = null, goal = null; const cells = [], lamps = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = cell(x, y);
    if (c === 'R') start = { x, y };
    if (c === 'G') goal = { x, y };
    if (c === 'B') cells.push({ x, y });
    if (c === 'L') lamps.push({ x, y });
  }
  const free = (x, y) => !'# '.includes(cell(x, y));
  return { w, h, cell, free, start, dir: lv.dir ?? 1, goal: lv.goalAtStart ? { ...start } : goal, cells, lamps };
}

export const count = (prog) => prog.reduce((n, b) => n + 1 + (b.op === 'repeat' ? count(b.body || []) : 0), 0);

// run a program: the trace is one entry per block executed, with where ROVA is after it
export function run(lv, prog, max = 400) {
  const W = world(lv);
  let x = W.start.x, y = W.start.y, d = W.dir, bump = null, steps = 0;
  const got = new Set(), lit = new Set(), trace = [], key = (p) => p.x + ',' + p.y;
  const visit = () => { const k = x + ',' + y; if (W.cells.some((c) => key(c) === k)) got.add(k); if (W.lamps.some((c) => key(c) === k)) lit.add(k); };
  visit();
  const exec = (list) => {
    for (const b of list) {
      if (bump || steps >= max) return;
      if (b.op === 'repeat') { for (let i = 0; i < (b.n || 1) && !bump && steps < max; i++) { trace.push({ id: b.id, ev: 'loop', i, x, y, d }); exec(b.body || []); } continue; }
      steps++;
      if (b.op === 'left') { d = (d + 3) % 4; trace.push({ id: b.id, ev: 'turn', x, y, d, turn: -1 }); continue; }
      if (b.op === 'right') { d = (d + 1) % 4; trace.push({ id: b.id, ev: 'turn', x, y, d, turn: 1 }); continue; }
      const nx = x + DX[d], ny = y + DY[d];
      if (!W.free(nx, ny)) { bump = { id: b.id, x, y, d, at: { x: nx, y: ny } }; trace.push({ id: b.id, ev: 'bump', x, y, d }); return; }
      x = nx; y = ny; const before = got.size + lit.size; visit();
      trace.push({ id: b.id, ev: 'move', x, y, d, pick: got.size + lit.size > before ? key({ x, y }) : null });
    }
  };
  exec(prog);
  const atGoal = !W.goal || (x === W.goal.x && y === W.goal.y);
  const allCells = got.size === W.cells.length, allLamps = lit.size === W.lamps.length;
  const ok = !bump && steps < max && atGoal && allCells && allLamps;
  return { ok, trace, end: { x, y, d }, bump, atGoal, allCells, allLamps, got, lit, steps, loopy: steps >= max, W };
}

// ---------------------------------------------------------------- the coach's reasoning
// What is wrong with a program that fails? Look for the smallest change that would make it work: one step
// missing or extra, one turn on the wrong side, a turn missing, a loop count off by one. The answer is a kind
// of mistake and the block concerned, so hints can go from vague to precise.

let uid = 0;
const nid = () => 'x' + ++uid;
const clone = (p) => p.map((b) => ({ ...b, body: b.body ? clone(b.body) : undefined }));
// every place in the program (top level and inside loops) as [list path, index]
function places(prog, path = []) {
  const out = [];
  const list = path.reduce((l, i) => l[i].body, prog);
  for (let i = 0; i <= list.length; i++) out.push([path, i]);
  list.forEach((b, i) => { if (b.op === 'repeat') out.push(...places(prog, [...path, i])); });
  return out;
}
const listAt = (p, path) => path.reduce((l, i) => l[i].body, p);

export function diagnose(lv, prog) {
  const limit = lv.limit || Infinity, edits = [];
  for (const [path, i] of places(prog)) {
    const list = listAt(prog, path), b = list[i];
    const tryEdit = (kind, f, to = null) => { const p = clone(prog); const l = listAt(p, path); const target = f(l); if (count(p) <= limit && run(lv, p).ok) edits.push({ kind, id: target, path, i, to }); };
    if (b) {
      if (b.op === 'left' || b.op === 'right') tryEdit('wrong_turn', (l) => { l[i].op = b.op === 'left' ? 'right' : 'left'; return b.id; }, b.op === 'left' ? 'right' : 'left');
      if (b.op !== 'repeat') tryEdit(b.op === 'fwd' ? 'extra_step' : 'extra_turn', (l) => { l.splice(i, 1); return b.id; });
      if (b.op === 'repeat') { tryEdit('count', (l) => { l[i].n = (b.n || 1) + 1; return b.id; }, (b.n || 1) + 1); if ((b.n || 1) > 1) tryEdit('count', (l) => { l[i].n = b.n - 1; return b.id; }, b.n - 1); }
    }
    const near = (list[i] || list[i - 1] || {}).id || null;
    tryEdit('missing_step', (l) => { l.splice(i, 0, { id: nid(), op: 'fwd' }); return near; });
    for (const op of ['left', 'right']) tryEdit('missing_turn', (l) => { l.splice(i, 0, { id: nid(), op }); return near; }, op);
  }
  // the most telling kind first: a wrong turn is a clearer lesson than "add a step somewhere"
  const rank = ['wrong_turn', 'count', 'missing_step', 'extra_step', 'missing_turn', 'extra_turn'];
  edits.sort((a, b) => rank.indexOf(a.kind) - rank.indexOf(b.kind));
  return edits[0] || null;
}

// blocks repeated one after the other: a loop would say it once (3 times the same block, or a group of 2 or
// more blocks twice in a row)
export function repetition(prog) {
  const sig = (b) => b.op === 'repeat' ? 'r' + b.n + '(' + (b.body || []).map(sig).join() + ')' : b.op;
  const s = prog.map(sig);
  for (let L = 1; L <= Math.floor(s.length / 2); L++) for (let i = 0; i + 2 * L <= s.length; i++) {
    let k = 1; while (i + (k + 1) * L <= s.length && s.slice(i, i + L).join() === s.slice(i + k * L, i + (k + 1) * L).join()) k++;
    if ((L === 1 && k >= 3) || (L >= 2 && k >= 2)) return { from: i, len: L, times: k, ids: prog.slice(i, i + k * L).map((b) => b.id) };
  }
  return null;
}

// how a program that ended in the wrong place relates to the goal, from ROVA's point of view
export function whereFromGoal(r) {
  const g = r.W.goal; if (!g || r.atGoal) return null;
  const dx = g.x - r.end.x, dy = g.y - r.end.y, d = r.end.d;
  const ahead = dx * DX[d] + dy * DY[d], side = dx * DX[(d + 1) % 4] + dy * DY[(d + 1) % 4];
  return { ahead, side, dist: Math.abs(dx) + Math.abs(dy) };
}
