// A Standard MIDI File turned into a song of the songbook, read in the browser: nothing is sent or kept.
// The tune is the highest note of each moment (the "skyline"); every other note goes to the accompaniment,
// which the piano plays while you play the tune.

export function songFromMidi(buf, name = '') {
  const d = new DataView(buf); let p = 0;
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); p += n; return s; };
  const u32 = () => { const v = d.getUint32(p); p += 4; return v; }, u16 = () => { const v = d.getUint16(p); p += 2; return v; };
  if (buf.byteLength < 14 || str(4) !== 'MThd') throw new Error('not a MIDI file');
  const hl = u32(); u16(); const ntr = u16(), div = u16(); p = 8 + hl;
  const ppq = div & 0x8000 ? 480 : div || 480;
  const notes = []; let tempo = 0, meter = 0, title = '';
  for (let k = 0; k < ntr && p + 8 <= buf.byteLength; k++) {
    const id = str(4), len = u32(), end = Math.min(buf.byteLength, p + len);
    if (id !== 'MTrk') { p = end; continue; }
    let t = 0, run = 0; const on = new Map();
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80 && p < end); return v; };
    while (p < end) {
      t += vlq(); let st = d.getUint8(p);
      if (st < 0x80) st = run; else p++;
      if (st === 0xff) {
        const ty = d.getUint8(p++), l = vlq(), at = p;
        if (ty === 0x51 && !tempo && l >= 3) tempo = (d.getUint8(at) << 16) | (d.getUint8(at + 1) << 8) | d.getUint8(at + 2);
        if (ty === 0x58 && !meter && l >= 2) meter = d.getUint8(at);
        if ((ty === 0x03 || ty === 0x01) && !title && l) { const b = new Uint8Array(buf, at, Math.min(l, 60)); title = new TextDecoder().decode(b).replace(/[\x00-\x1f]/g, '').trim(); }
        p = at + l; continue;
      }
      if (st === 0xf0 || st === 0xf7) { p += vlq(); continue; }
      run = st; const ty = st & 0xf0, ch = st & 0x0f;
      const a = d.getUint8(p++), b = ty === 0xc0 || ty === 0xd0 ? 0 : d.getUint8(p++);
      if (ch === 9) continue; // drums
      const key = a;
      if (ty === 0x90 && b > 0) { if (!on.has(key)) on.set(key, []); on.get(key).push([t, b]); }
      else if (ty === 0x80 || (ty === 0x90 && b === 0)) { const s = on.get(key)?.shift(); if (s) notes.push({ t: s[0] / ppq, d: Math.max(0.05, (t - s[0]) / ppq), m: key, v: s[1], part: k * 16 + ch }); }
    }
    p = end;
  }
  if (!notes.length) throw new Error('no notes');
  // times on a grid of a twelfth of a beat (sixteenths and triplets both fit), the piece starting at once
  const g = (x) => Math.round(x * 12) / 12, t0 = g(Math.min(...notes.map((n) => n.t)));
  for (const n of notes) { n.t = g(n.t) - t0; n.d = Math.max(1 / 12, g(n.d)); while (n.m < 21) n.m += 12; while (n.m > 108) n.m -= 12; }
  notes.sort((a, b) => a.t - b.t || b.m - a.m);
  // the part that carries the tune: in a file with several tracks or channels, the highest one (a piano file
  // usually has the right hand and the left hand apart); in a single part, all of it
  const parts = new Map(); for (const n of notes) { if (!parts.has(n.part)) parts.set(n.part, []); parts.get(n.part).push(n); }
  const mean = (a) => a.reduce((x, n) => x + n.m, 0) / a.length;
  const big = [...parts.values()].filter((a) => a.length >= 8);
  const src = big.length > 1 ? big.sort((a, b) => mean(b) - mean(a))[0] : notes;
  // the tune: the highest note of each moment, unless the tune's previous note is still sounding above it
  // (an accompaniment chord under a held note) or it is a bass note
  const at = new Map(); for (const n of src) if (!at.has(n.t)) at.set(n.t, n);
  const pick = (low) => { const out = []; for (const n of at.values()) { const pr = out[out.length - 1]; if (n.m < low) continue; if (pr && pr.t + pr.d > n.t + 1e-6 && n.m < pr.m) continue; out.push(n); } return out; };
  let tune = pick(src === notes ? 55 : 0); if (tune.length < 4) tune = pick(0);
  tune = tune.slice(0, 1500);
  const inTune = new Set(tune);
  const mel = tune.map((n, i) => [n.m, i + 1 < tune.length ? tune[i + 1].t - n.t : n.d]);
  const lhEv = notes.filter((n) => !inTune.has(n) && n.t <= tune[tune.length - 1].t + 8).map((n) => [n.t, n.m, n.d]);
  // how hard it looks: notes per beat in the tune
  const span = Math.max(1, tune[tune.length - 1].t - tune[0].t), rate = tune.length / span;
  const clean = (name || title || 'MIDI').replace(/\.(mid|midi|kar)$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 60);
  return { cat: 'mine', lv: rate < 1.2 ? 1 : rate < 2.5 ? 2 : 3, q: Math.min(1.5, Math.max(0.15, (tempo || 500000) / 1e6)), start: tune[0].t, mel, lhEv, meter: meter || 4, title: clean };
}
