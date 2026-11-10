// Gambit: the engine off the main thread, so the board stays fluid while it thinks.
import { Engine, playLevel } from './engine.js';
const e = new Engine();
onmessage = ({ data: q }) => {
  let r;
  if (q.op === 'level') r = playLevel(e, q.fen, q.level, q.keys);
  else if (q.op === 'rank') r = e.rank(q.fen, { depth: q.depth ?? 3, time: q.time ?? 1500, keys: q.keys });
  else r = e.think(q.fen, { time: q.time ?? 1000, depth: q.depth ?? 64, keys: q.keys });
  postMessage({ id: q.id, r });
};
