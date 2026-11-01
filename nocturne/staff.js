// The score above the piano, engraved with VexFlow (MIT, vendored in lib/vexflow, loaded on first use). An exercise
// is a list of events { t, d (beats), ms: [midi], h: 'r' | 'l', sp?: ['bb/4'] }. The right hand reads in the treble
// clef, the left in the bass clef (both: a grand staff); a lead sheet shows only the tune with chord names above.
// A few bars at a time; the cursor lights the notes to play now and turns the page when the music gets there.

const SHARP = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const keyOf = (m) => `${SHARP[((m % 12) + 12) % 12]}/${Math.floor(m / 12) - 1}`;
const DUR = [[4, 'w'], [3, 'hd'], [2, 'h'], [1.5, 'qd'], [1, 'q'], [0.75, '8d'], [0.5, '8'], [0.25, '16']];
const durOf = (d) => (DUR.find(([b]) => d >= b - 1e-6) || DUR[DUR.length - 1]);
// the name of a chord (C, F, G, Am...) from its notes, whatever the inversion
export function chordName(ms) {
  const pcs = [...new Set(ms.map((m) => ((m % 12) + 12) % 12))];
  for (const r of pcs) { const has = (i) => pcs.includes((r + i) % 12); if (pcs.length === 3 && has(4) && has(7)) return SHARP[r].toUpperCase(); if (pcs.length === 3 && has(3) && has(7)) return SHARP[r].toUpperCase() + 'm'; }
  // a root and its fifth only (G, D, G): the chord of the root
  for (const r of pcs) if (pcs.length === 2 && pcs.includes((r + 7) % 12)) return SHARP[r].toUpperCase();
  return '';
}

let loading = null;
function loadVex() {
  if (window.Vex) return Promise.resolve();
  return loading || (loading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/vexflow/vexflow.js'; s.onload = res; s.onerror = rej; document.head.append(s); }));
}

const LBL = {
  fr: { key: 'armure', clef: 'clé de sol', bass: 'clé de fa', time: 'les chiffres de la mesure', bar: 'barre de mesure', measure: 'une mesure' },
  en: { key: 'key signature', clef: 'treble clef', bass: 'bass clef', time: 'time signature', bar: 'barline', measure: 'one bar' },
};
export class Staff {
  constructor(el) { this.el = el; this.ev = null; }
  async show(events, o = {}) {
    await loadVex();
    this.pts = null; // a new score: the teacher points again if needed
    this.ev = events; this.o = { meter: 4, key: 'C', lead: false, names: null, fingers: null, mark: null, hands: null, ...o };
    const hands = new Set(events.map((e) => e.h));
    this.clefs = this.o.lead || !hands.has('l') ? ['treble'] : !hands.has('r') ? ['bass'] : ['treble', 'bass'];
    const end = Math.max(...events.map((e) => e.t + e.d));
    this.bars = Math.max(1, Math.ceil(end / this.o.meter - 1e-6));
    this.page = -1; this.cur = null;
    this.el.classList.toggle('grand', this.clefs.length === 2); this.el.classList.add('on'); document.body.classList.add('staffon');
    window.__placeStaff?.();
    this.draw(0);
  }
  // the teacher's pointer: the five lines numbered from the bottom, the four spaces, the clef, the time signature, a
  // barline, one bar, or a note with a word next to it (list of 'lines' | 'spaces' | 'clef' | 'time' | 'bar' |
  // 'measure' | { note: i, text })
  point(list = []) {
    this.el.querySelector('.callouts')?.remove(); this.pts = list; if (!list.length || !this.first) return;
    const box = document.createElement('div'); box.className = 'callouts'; this.el.append(box);
    const z = this.z, s = this.first[0], W = this.el.clientWidth / z, L = LBL[document.documentElement.lang === 'fr' ? 'fr' : 'en'], top = s.getYForLine(0), bot = s.getYForLine(4);
    const add = (cls, css, txt = '') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); d.textContent = txt; box.append(d); return d; };
    // positions in the score's own units, scaled like the drawing; labels kept inside the paper
    const px = (v) => `${Math.round(v * z)}px`;
    const lx = (v) => Math.max(48 / z, Math.min(W - 40 / z, v));
    for (const p of list) {
      if (p === 'lines') for (let i = 0; i < 5; i++) { const y = s.getYForLine(i); add('co-line', { left: px(s.getX() + 44), top: px(y - 1), width: px(W - s.getX() - 110) }); add('co small', { left: px(W - (24 + (i % 2) * 24) / z), top: px(y) }, String(5 - i)); }
      if (p === 'spaces') for (let i = 0; i < 4; i++) { const y = (s.getYForLine(i) + s.getYForLine(i + 1)) / 2; add('co-space', { left: px(s.getX() + 44), top: px(y - 4), width: px(W - s.getX() - 110) }); add('co small blue', { left: px(W - (24 + (i % 2) * 24) / z), top: px(y) }, String(4 - i)); }
      if (p === 'clef') { add('co-ring', { left: px(s.getX() + 2), top: px(top - 22), width: px(40), height: px(bot - top + 44) }); add('co', { left: px(lx(s.getX() + 22)), top: px(bot + 30) }, this.clefs[0] === 'bass' ? L.bass : L.clef); }
      if (p === 'time') { const x = s.getNoteStartX() - 24; add('co-ring', { left: px(x - 12), top: px(top - 6), width: px(26), height: px(bot - top + 12) }); add('co', { left: px(lx(x + 2)), top: px(bot + 26) }, L.time); }
      if (p === 'bar') { add('co-ring', { left: px(this.barEnd - 6), top: px(top - 8), width: px(12), height: px(bot - top + 16) }); add('co', { left: px(lx(this.barEnd)), top: px(top - 18) }, L.bar); }
      if (p === 'measure') { add('co-band', { left: px(s.getNoteStartX() - 8), top: px(top - 10), width: px(this.barEnd - s.getNoteStartX() + 6), height: px(bot - top + 20) }); add('co', { left: px((s.getNoteStartX() + this.barEnd) / 2), top: px(top - 18) }, L.measure); }
      if (p === 'key') { const x = s.getX() + 44; add('co-ring', { left: px(x - 4), top: px(top - 8), width: px(22), height: px(bot - top + 16) }); add('co', { left: px(lx(x + 8)), top: px(bot + 26) }, L.key); }
      if (p && p.rest != null) { const n = this.rests[p.rest]; if (!n) continue; const x = n.getAbsoluteX() + 6, y = (top + bot) / 2; add('co-ring round', { left: px(x - 16), top: px(y - 16), width: px(32), height: px(32) }); add('co', { left: px(lx(x)), top: px(top - 18) }, p.text || ''); }
      if (p && p.note != null) { const n = this.notes[p.note]; if (!n) continue; const x = n.getAbsoluteX() + 6, y = Math.min(...n.getYs()); add('co-ring round', { left: px(x - 14), top: px(y - 14), width: px(28), height: px(28) }); add('co', { left: px(x), top: px(Math.max(10, y - 30)) }, p.text || ''); }
    }
  }
  hide() { this.el.classList.remove('on'); document.body.classList.remove('staffon'); this.ev = null; this.pts = null; }
  // the score is drawn larger than VexFlow's default, easier to read for a beginner
  get z() { return this.clefs?.length === 2 ? 1.12 : 1.35; }
  get perPage() { return Math.max(1, Math.min(4, this.bars || 4, Math.floor(this.el.clientWidth / this.z / 190))); }
  draw(page) {
    const VF = window.Vex.Flow, el = this.el, z = this.z, W = el.clientWidth / z, H = this.clefs.length === 2 ? 250 : 140;
    el.innerHTML = ''; this.page = page; this.notes = []; this.rests = []; this.first = null; this.barEnd = null;
    const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W * z, H * z); const ctx = r.getContext(); ctx.scale(z, z);
    const pp = this.perPage, b0 = page * pp, b1 = Math.min(this.bars, b0 + pp), m = this.o.meter;
    const first = 70 + (this.o.key !== 'C' ? 20 : 0) + (page === 0 ? 30 : 0), bw = (W - 20 - first) / pp;
    let x = 10;
    for (let b = b0; b < b1; b++) {
      const w = b === b0 ? bw + first : bw, staves = this.clefs.map((clef, k) => {
        const s = new VF.Stave(x, 4 + k * 110, w);
        if (b === b0) { s.addClef(clef); if (this.o.key !== 'C') s.addKeySignature(this.o.key); if (page === 0 && !this.o.noTime) s.addTimeSignature(`${m}/4`); if (this.clefs.length === 2 && this.o.hands) s.setText(this.o.hands[k], VF.Modifier.Position.LEFT, { shift_x: 6 }); }
        if (b === this.bars - 1) s.setEndBarType(VF.Barline.type.END);
        s.setContext(ctx).draw(); return s;
      });
      if (b === b0) { this.first = staves; this.barEnd = x + w; }
      if (staves.length === 2 && b === b0) { new VF.StaveConnector(staves[0], staves[1]).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw(); new VF.StaveConnector(staves[0], staves[1]).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw(); }
      if (staves.length === 2) new VF.StaveConnector(staves[0], staves[1]).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
      const voices = this.clefs.map((clef, k) => {
        const h = this.o.lead ? 'r' : clef === 'treble' ? 'r' : 'l';
        const notes = this.bar(VF, b * m, (b + 1) * m, h, clef);
        const v = new VF.Voice({ num_beats: m, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
        return { v, notes, s: staves[k] };
      });
      const fmt = new VF.Formatter(); for (const { v } of voices) fmt.joinVoices([v]);
      fmt.format(voices.map((x) => x.v), Math.max(40, staves[0].getNoteEndX() - staves[0].getNoteStartX() - 10));
      for (const { v, notes, s } of voices) {
        const beams = VF.Beam.generateBeams(notes.filter((n) => !n.isRest()));
        v.draw(ctx, s); beams.forEach((bm) => bm.setContext(ctx).draw());
      }
      x += w;
    }
    if (this.cur != null) this.cursor(this.cur);
    if (this.pts?.length) this.point(this.pts);
  }
  // the notes (and rests) of one hand in one bar
  bar(VF, a, z, h, clef) {
    const ev = this.ev.filter((e) => e.h === h && e.t >= a - 1e-6 && e.t < z - 1e-6).sort((p, q) => p.t - q.t);
    const chords = this.o.lead ? this.ev.filter((e) => e.h === 'l' && e.ms.length >= 2) : [];
    const out = []; let t = a;
    const rest = (d) => { while (d > 1e-6) { const [b, c] = durOf(d); const n = new VF.StaveNote({ clef, keys: [clef === 'bass' ? 'd/3' : 'b/4'], duration: c + 'r' }); if (c.includes('d')) VF.Dot.buildAndAttach([n], { all: true }); this.rests.push(n); out.push(n); d -= b; } };
    for (const e of ev) {
      if (e.t > t + 1e-6) rest(e.t - t);
      const d = Math.min(e.d, z - e.t), [b, c] = durOf(d), sp = e.sp || e.ms.map(keyOf);
      const n = new VF.StaveNote({ clef, keys: sp, duration: c, auto_stem: true });
      sp.forEach((k, i) => { const acc = k.split('/')[0].slice(1); if (acc && !(this.o.key === 'G' && k.startsWith('f#'))) n.addModifier(new VF.Accidental(acc), i); });
      if (c.includes('d')) VF.Dot.buildAndAttach([n], { all: true });
      const ch = chords.find((x) => Math.abs(x.t - e.t) < 1e-6); if (ch) n.addModifier(new VF.Annotation(chordName(ch.ms)).setFont('Arial', 15, 'bold').setVerticalJustification(VF.Annotation.VerticalJustify.TOP), 0);
      // reading aids: the note's name under it, the finger above it, a dynamic on the first note
      if (this.o.names) n.addModifier(new VF.Annotation(e.ms.map(this.o.names).join(' ')).setFont('Arial', e.ms.length > 1 ? 10 : 12, 'bold').setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
      const fg = this.o.fingers && e.ms.map((x) => this.o.fingers[x]).filter(Boolean); if (fg?.length) n.addModifier(new VF.Annotation(fg.join(' ')).setFont('Arial', 13, 'bold').setVerticalJustification(VF.Annotation.VerticalJustify.TOP), 0);
      if (this.o.art === 'staccato') n.addModifier(new VF.Articulation('a.').setPosition(VF.Modifier.Position.ABOVE), 0);
      if (this.o.mark && e.t === 0) n.addModifier(new VF.Annotation(this.o.mark).setFont('Times', 20, 'italic bold').setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
      n.__t = e.t; this.notes.push(n); out.push(n); t = e.t + b;
    }
    if (z - t > 1e-6) rest(z - t);
    return out;
  }
  // light the notes that start at beat t (and fade the ones already played); turn the page when needed
  cursor(t) {
    if (!this.ev) return; this.cur = t;
    const page = Math.floor(Math.min(this.bars - 1, Math.floor((t + 1e-6) / this.o.meter)) / this.perPage);
    if (page !== this.page) return this.draw(page);
    for (const n of this.notes) { const g = n.getSVGElement?.(); if (!g) continue; g.classList.toggle('on', Math.abs(n.__t - t) < 1e-6); g.classList.toggle('past', n.__t < t - 1e-6); }
  }
}
