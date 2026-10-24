// The light score, shared by the big screen and every phone: for a scene, a time on the screen's clock and a
// seat in the room, the colour that seat shows. Everyone computes it locally from the same clock, so the room
// is in sync without one message per frame. Safety: never more than ~2 flashes a second, no hard white strobe.

export const BPM = 100, BEAT = 60000 / BPM, BAR = BEAT * 4;
export const ZONES = ['g', 'c', 'd'];
export const ZX = { g: 0.18, c: 0.5, d: 0.82 }; // where each zone sits across the room
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// a seat: its zone and a stable random place inside it (from its id)
export function seatOf(id, zone) {
  let h = 2166136261; for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r1 = ((h >>> 0) % 10007) / 10007, r2 = ((h >>> 8) % 9973) / 9973;
  return { zone, x: clamp(ZX[zone] + (r1 - 0.5) * 0.3, 0.02, 0.98), y: r2, r: r1 };
}
export const DROP_IN = 4 * BEAT; // the countdown before the drop: 3, 2, 1 (one beat each) and a breath
// a chosen palette (sky, gold, rose, violet, teal): the room never turns a muddy hue
export const PAL = [200, 38, 335, 268, 172];
const pal = (i) => PAL[((i % PAL.length) + PAL.length) % PAL.length];

// returns { h, s, l, a } (a = how lit the screen is, 0..1) and an optional big text for the phone
export function light(scene, t, t0, seat) {
  const e = t - t0, b = e / BEAT;
  switch (scene) {
    case 'lobby': {
      const breath = 0.5 + 0.5 * Math.sin(t / 900 + seat.r * 6.28);
      return { h: 38, s: 80, l: 55, a: 0.06 + 0.06 * breath };
    }
    case 'eveil': { // the room lights up star by star, then breathes
      const on = smooth(seat.r * 9000, seat.r * 9000 + 2200, e);
      const breath = 0.75 + 0.25 * Math.sin(e / 1300 + seat.r * 6.28);
      return { h: 205 + seat.y * 30, s: 55, l: 78, a: on * 0.55 * breath };
    }
    case 'vague': { // a wave of colour across the room and back, on the bar
      const bar = Math.floor(b / 4), ph = (b % 4) / 4, dir = bar % 2 ? 1 - ph : ph;
      const w = -0.15 + dir * 1.3, d = seat.x - w;
      const crest = Math.exp(-(d * d) / 0.012);
      const beat = 0.5 + 0.5 * Math.cos((b % 1) * Math.PI * 2);
      return { h: pal(bar), s: 85, l: 58, a: 0.1 + 0.85 * crest + 0.05 * beat };
    }
    case 'drop': {
      if (e < DROP_IN) { // countdown: dark, the number glows on each beat, then a breath of black
        const k = Math.floor(e / BEAT), f = (e % BEAT) / BEAT;
        if (k >= 3) return { h: 0, s: 0, l: 0, a: 0, big: '' };
        return { h: 30, s: 90, l: 60, a: 0.25 * (1 - f), big: String(3 - k) };
      }
      const db = (e - DROP_IN) / BEAT, bar = Math.floor(db / 4);
      const hit = Math.pow(1 - (db % 1), 2.2); // a soft pulse on every beat (1.7 a second at 100 BPM)
      const hue = pal(ZONES.indexOf(seat.zone) + bar);
      return { h: hue, s: 90, l: 55, a: 0.4 + 0.6 * hit };
    }
    case 'coeur': { // one heart for the whole room, slowing down
      const rate = 70 - Math.min(40, e / 1500), per = 60000 / rate, f = (e % per) / per;
      const lub = Math.exp(-Math.pow((f - 0.05) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((f - 0.22) / 0.05, 2));
      return { h: 350, s: 80, l: 52, a: 0.08 + 0.75 * lub * Math.max(0.15, 1 - e / 60000) };
    }
    case 'fin': return { h: 38, s: 70, l: 60, a: 0.12 * (1 - smooth(0, 4000, e)) + 0.04 };
    default: return { h: 0, s: 0, l: 0, a: 0 };
  }
}
export const hsl = (c, k = 1) => `hsl(${c.h.toFixed(0)} ${c.s}% ${(c.l * (0.12 + 0.88 * c.a * k)).toFixed(1)}%)`;
