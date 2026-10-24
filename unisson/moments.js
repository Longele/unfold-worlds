// UNISSON moments for concerts and parties: the live band's tempo, lighters, the live draw, the countdown and the
// left-right battle. Like show.js, pure functions of the shared clock, the seat and the moment's state (x, sent by
// the screen), so the big screen and every phone light up the same way on the same frame.
import { ZH, PAL } from './show.js?v=202610241630';

export const MOMENTS = new Set(['groupe', 'briquet', 'tirage', 'compte', 'bataille']);
const smooth = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIM = { h: 38, s: 60, l: 50, a: 0.05 };

// ---------------------------------------------------------------- the band: lights on the live tempo
// x.bpm from taps on the screen or a musician's phone, x.a the instant of a downbeat. Every four bars the look
// changes: the whole room on the beat, a sweep across the room, section to section, then scattered stars.
export const bandBeat = (now, x) => (now - (x.a || 0)) / (60000 / (x.bpm || 120));
export function bandLight(now, x, seat) {
  const b = bandBeat(now, x); if (!x.bpm || b < 0) return DIM;
  const bar = Math.floor(b / 4), look = Math.floor(bar / 4) % 4, f = b - Math.floor(b), hue = ZH[seat.zone];
  switch (look) {
    case 0: return { h: hue, s: 85, l: 58, a: 0.12 + 0.88 * Math.pow(1 - f, 2.4) * (Math.floor(b) % 4 === 0 ? 1 : 0.65) };
    case 1: { const ph = (b % 4) / 4, d = Math.abs(seat.x - (bar % 2 ? 1 - ph : ph)); return { h: PAL[bar % PAL.length], s: 90, l: 60, a: 0.08 + 0.92 * Math.exp(-Math.pow(d / 0.11, 2)) }; }
    case 2: { const on = ['g', 'c', 'd'][Math.floor(b) % 3] === seat.zone; return { h: hue, s: 90, l: 60, a: on ? 0.2 + 0.8 * Math.pow(1 - f, 1.6) : 0.07 }; }
    default: { const lit = hash(seat.r * 9973 + Math.floor(b)) < 0.3; return { h: PAL[(bar + Math.floor(seat.r * 5)) % PAL.length], s: 85, l: 66, a: lit ? 0.1 + 0.85 * Math.pow(1 - f, 2) : 0.06 }; }
  }
}

// ---------------------------------------------------------------- the live draw
// The light runs from phone to phone, slowing down, then one phone alone stays gold. No more than about eight
// steps a second, and each phone is lit on only a few of them: never a fast flash.
export const DRAW = (() => { const s = []; let t = 0, d = 130; while (t < 6200) { s.push(t); t += d; d *= 1.075; } return { steps: s, end: t }; })();
export function drawStep(e) { let k = -1; for (let i = 0; i < DRAW.steps.length; i++) if (DRAW.steps[i] <= e) k = i; return k; }
export const drawLit = (seat, k, buckets) => Math.floor(seat.r * 997 + hash(k) * buckets) % buckets === Math.floor(hash(k + 0.5) * buckets);
export function drawLight(now, t0, x, seat, mine) {
  const e = now - t0; if (e < 0) return DIM;
  if (e >= DRAW.end) { if (mine) { const p = 0.5 + 0.5 * Math.sin(e / 260); return { h: 42, s: 95, l: 60, a: 0.7 + 0.3 * p }; } return { h: 38, s: 40, l: 40, a: 0.03 }; }
  const k = drawStep(e), since = e - DRAW.steps[k];
  return drawLit(seat, k, x.b || 6) ? { h: 42, s: 90, l: 62, a: 0.85 * Math.exp(-since / 180) + 0.1 } : { h: 38, s: 60, l: 45, a: 0.05 };
}

// ---------------------------------------------------------------- the countdown (to midnight, or ten seconds)
// x.zero is the instant of zero on the room's clock. The last ten seconds swell on each second; at zero the
// room turns into slow-turning colour (a celebration, not a strobe), fading after half a minute.
export function countLeft(now, x) { return x.zero - now; }
export function countLight(now, x, seat) {
  const left = x.zero - now;
  if (left > 10000) return { h: 42, s: 70, l: 55, a: 0.1 + 0.05 * Math.sin(now / 900 + seat.r * 6) };
  if (left > 0) { const f = 1 - (left % 1000) / 1000, k = 1 - left / 10000; return { h: 42, s: 85, l: 62, a: 0.12 + (0.35 + 0.5 * k) * Math.pow(1 - f, 2.2) }; }
  const e = -left, fade = 1 - 0.7 * smooth(20000, 40000, e);
  return { h: (seat.x * 300 + e / 22) % 360, s: 90, l: 60, a: (0.7 + 0.25 * Math.sin(e / 400 + seat.r * 6)) * fade };
}
export const countBig = (now, x) => { const left = x.zero - now; return left > 0 && left <= 10000 ? String(Math.ceil(left / 1000)) : ''; };

// ---------------------------------------------------------------- the battle, left against right
// 3, 2, 1, then thirty seconds of shaking. x.bv is the rope (-1 all left, +1 all right), x.win the winner.
export const BATTLE = { lead: 3000, len: 30000 };
export const teamOf = (seat) => (seat.x < 0.5 ? 'L' : 'R');
export const TEAM_H = { L: 200, R: 335 };
export function battleLight(now, t0, x, seat) {
  const e = now - t0, tm = teamOf(seat), hue = TEAM_H[tm];
  if (e < 0) return DIM;
  if (e < BATTLE.lead) { const f = (e % 1000) / 1000; return { h: hue, s: 85, l: 58, a: 0.15 + 0.6 * Math.pow(1 - f, 2) }; }
  if (e < BATTLE.lead + BATTLE.len && !x.win) {
    const b = (e - BATTLE.lead) / (60000 / 140), f = b - Math.floor(b), lead = (tm === 'L' ? -1 : 1) * (x.bv || 0);
    return { h: hue, s: 90, l: 58, a: 0.25 + 0.15 * Math.max(0, lead) + 0.45 * Math.pow(1 - f, 2.5) };
  }
  if (x.win === tm) return { h: 42, s: 95, l: 60, a: 0.65 + 0.3 * Math.sin(e / 300) };
  return { h: hue, s: 50, l: 45, a: 0.1 };
}
export const battleBig = (now, t0) => { const e = now - t0; return e >= 0 && e < BATTLE.lead ? String(3 - Math.floor(e / 1000)) : ''; };

// ---------------------------------------------------------------- one entry point for both sides
export function momentLight(scene, now, t0, x, seat, mine = false) {
  switch (scene) {
    case 'groupe': return bandLight(now, x, seat);
    case 'tirage': return drawLight(now, t0, x, seat, mine);
    case 'compte': return countLight(now, x, seat);
    case 'bataille': return battleLight(now, t0, x, seat);
    case 'briquet': return { h: 32, s: 95, l: 55, a: 0.5 };
    default: return DIM;
  }
}
