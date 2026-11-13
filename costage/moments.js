// CO-STAGE: the moments a show is made of, their settings, the ready-made programmes, and the light score every
// phone computes for itself from the shared clock (no message per frame, the room stays in sync).
// Safety (UNISSON rule): never more than ~2 flashes a second, never a hard white strobe.

// ---------------------------------------------------------------- the room: three sections, a stable seat per phone
export const ZONES = ['g', 'c', 'd'];
export const ZX = { g: 0.17, c: 0.5, d: 0.83 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seatOf(id, zone) {
  const h = hash(id), r1 = (h % 10007) / 10007, r2 = ((h >>> 8) % 9973) / 9973;
  return { zone, x: clamp(ZX[zone] + (r1 - 0.5) * 0.3, 0.02, 0.98), y: r2, r: r1, team: clamp(ZX[zone] + (r1 - 0.5) * 0.3, 0.02, 0.98) < 0.5 ? 'L' : 'R' };
}
// a chosen palette: the room never turns a muddy hue
export const PAL = [200, 38, 335, 268, 172, 12];
export const TEAM_H = { L: 200, R: 335 };
export const ZONE_H = { g: 200, c: 38, d: 335 };

// ---------------------------------------------------------------- the moment types
// fields drive the organiser's editor; every text has a default in both languages
export const TYPES = ['vote', 'lights', 'pulse', 'battle', 'chorus', 'challenge', 'reveal', 'draw', 'words', 'finale'];
export const TYPE_INFO = {
  vote: { fr: 'Le Carrefour', en: 'The Crossroads', sfr: 'La salle choisit, en couleurs', sen: 'The room chooses, in colour', icon: 'M4 20l8-8 8 8M12 12V3' },
  lights: { fr: 'Mer de lumière', en: 'Sea of light', sfr: 'La foule devient l\'écran', sen: 'The crowd becomes the screen', icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2' },
  pulse: { fr: 'Le Pouls', en: 'The Pulse', sfr: 'Toute la salle sur le tempo', sen: 'The whole room on the beat', icon: 'M3 12h4l2-6 4 12 2-6h6' },
  battle: { fr: 'La Bataille', en: 'The Battle', sfr: 'Gauche contre droite', sen: 'Left against right', icon: 'M5 19L19 5M5 5l4 4M15 15l4 4' },
  chorus: { fr: 'Le Chœur', en: 'The Choir', sfr: 'Appel et réponse par section', sen: 'Call and response by section', icon: 'M9 18V5l11-2v13M6 21a3 3 0 100-6 3 3 0 000 6z' },
  challenge: { fr: 'Le Défi', en: 'The Challenge', sfr: 'Un objectif, une récompense', sen: 'One goal, one reward', icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
  reveal: { fr: 'La Révélation', en: 'The Reveal', sfr: 'Un secret dévoilé par la salle', sen: 'A secret the room unlocks', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z' },
  draw: { fr: 'L\'Élu', en: 'The Chosen One', sfr: 'Un téléphone dans toute la salle', sen: 'One phone in the whole room', icon: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 16a4 4 0 100-8 4 4 0 000 8z' },
  words: { fr: 'Les Mots', en: 'Words', sfr: 'Un mot chacun, sur l\'écran', sen: 'One word each, on screen', icon: 'M4 6h16M4 12h10M4 18h7' },
  finale: { fr: 'Finale · One Night Only', en: 'Finale · One Night Only', sfr: 'L\'empreinte unique de la soirée', sen: 'Tonight\'s one-of-a-kind print', icon: 'M12 21s-8-5-8-11a5 5 0 019-3 5 5 0 019 3c0 6-8 11-8 11z' },
};
const D = {
  fr: {
    vote: { title: 'Le Carrefour', q: 'Quelle version ?', options: [{ label: 'Acoustique', hue: 200 }, { label: 'Électrique', hue: 335 }], dur: 15, auto: false },
    lights: { title: 'Mer de lumière', fx: 'wave', hue: 38, dur: 40 },
    pulse: { title: 'Le Pouls', bpm: 118, dur: 25, goal: 70 },
    battle: { title: 'La Bataille', stake: 'Les gagnants choisissent le dernier refrain', dur: 20 },
    chorus: { title: 'Le Chœur', lines: [{ who: 'g', text: 'Oh oh oh' }, { who: 'd', text: 'Oh oh oh' }, { who: 'all', text: 'Tous ensemble !' }] },
    challenge: { title: 'Le Défi', goal: 'light', target: 70, dur: 20, reward: 'Un titre inédit' },
    reveal: { title: 'La Révélation', secret: 'SURPRISE', taps: 12 },
    draw: { title: 'L\'Élu', reason: 'Cette chanson est pour toi' },
    words: { title: 'Les Mots', q: 'Un mot pour ce soir', approve: true },
    finale: { title: 'One Night Only', thanks: 'Merci. Cette soirée n\'existera qu\'une fois.' },
  },
  en: {
    vote: { title: 'The Crossroads', q: 'Which version?', options: [{ label: 'Acoustic', hue: 200 }, { label: 'Electric', hue: 335 }], dur: 15, auto: false },
    lights: { title: 'Sea of light', fx: 'wave', hue: 38, dur: 40 },
    pulse: { title: 'The Pulse', bpm: 118, dur: 25, goal: 70 },
    battle: { title: 'The Battle', stake: 'The winners choose the last chorus', dur: 20 },
    chorus: { title: 'The Choir', lines: [{ who: 'g', text: 'Oh oh oh' }, { who: 'd', text: 'Oh oh oh' }, { who: 'all', text: 'Everybody!' }] },
    challenge: { title: 'The Challenge', goal: 'light', target: 70, dur: 20, reward: 'An unreleased song' },
    reveal: { title: 'The Reveal', secret: 'SURPRISE', taps: 12 },
    draw: { title: 'The Chosen One', reason: 'This song is for you' },
    words: { title: 'Words', q: 'One word for tonight', approve: true },
    finale: { title: 'One Night Only', thanks: 'Thank you. Tonight will only happen once.' },
  },
};
export const FX = ['wave', 'breathe', 'sections', 'night'];
export const GOALS = ['light', 'taps', 'noise'];
export function newMoment(type, lang = 'fr') { return { type, id: Math.random().toString(36).slice(2, 9), ...structuredClone(D[lang === 'en' ? 'en' : 'fr'][type]) }; }
// keep a moment within bounds whatever the editor or the database hands us
export function cleanMoment(m, lang = 'fr') {
  const base = newMoment(TYPES.includes(m?.type) ? m.type : 'lights', lang), o = { ...base, ...m, type: base.type, id: String(m?.id || base.id).slice(0, 12) };
  const str = (v, n, d = '') => String(v ?? d).slice(0, n), num = (v, a, b, d) => (Number.isFinite(+v) ? clamp(Math.round(+v), a, b) : d);
  o.title = str(o.title, 60, base.title);
  if (o.type === 'vote') { o.q = str(o.q, 90); o.options = (Array.isArray(o.options) ? o.options : base.options).slice(0, 4).map((x, i) => ({ label: str(x?.label, 28, `${i + 1}`), hue: num(x?.hue, 0, 359, PAL[i]) })); if (o.options.length < 2) o.options = base.options; o.dur = num(o.dur, 5, 60, 15); o.auto = !!o.auto; }
  if (o.type === 'lights') { o.fx = FX.includes(o.fx) ? o.fx : 'wave'; o.hue = num(o.hue, 0, 359, 38); o.dur = num(o.dur, 0, 600, 40); }
  if (o.type === 'pulse') { o.bpm = num(o.bpm, 60, 180, 118); o.dur = num(o.dur, 8, 90, 25); o.goal = num(o.goal, 30, 100, 70); }
  if (o.type === 'battle') { o.stake = str(o.stake, 90); o.dur = num(o.dur, 8, 60, 20); }
  if (o.type === 'chorus') { o.lines = (Array.isArray(o.lines) ? o.lines : base.lines).slice(0, 24).map((l) => ({ who: ['all', 'g', 'c', 'd', 'L', 'R'].includes(l?.who) ? l.who : 'all', text: str(l?.text, 60) })); if (!o.lines.length) o.lines = base.lines; }
  if (o.type === 'challenge') { o.goal = GOALS.includes(o.goal) ? o.goal : 'light'; o.target = num(o.target, 10, 100, 70); o.dur = num(o.dur, 8, 90, 20); o.reward = str(o.reward, 90); }
  if (o.type === 'reveal') { o.secret = str(o.secret, 24, 'SURPRISE').toUpperCase(); o.taps = num(o.taps, 3, 60, 12); }
  if (o.type === 'draw') o.reason = str(o.reason, 90);
  if (o.type === 'words') { o.q = str(o.q, 90); o.approve = o.approve !== false; }
  if (o.type === 'finale') o.thanks = str(o.thanks, 120);
  return o;
}
export const cleanProgram = (p, lang) => (Array.isArray(p) ? p : []).slice(0, 30).map((m) => cleanMoment(m, lang));

// ---------------------------------------------------------------- ready-made programmes (organisers start from one)
export const TEMPLATES = {
  pop: { fr: 'Concert pop · salle', en: 'Pop concert · arena', moments: ['pulse', 'vote', 'battle', 'challenge', 'reveal', 'draw', 'finale'] },
  festival: { fr: 'Festival · grande scène', en: 'Festival · main stage', moments: ['lights', 'battle', 'pulse', 'vote', 'lights', 'finale'] },
  acoustic: { fr: 'Acoustique · intime', en: 'Acoustic · intimate', moments: ['words', 'vote', 'chorus', 'draw', 'finale'] },
  urban: { fr: 'Hip-hop · afro', en: 'Hip-hop · afro', moments: ['pulse', 'battle', 'vote', 'challenge', 'chorus', 'finale'] },
  gala: { fr: 'Gala · soirée', en: 'Gala · evening', moments: ['words', 'vote', 'reveal', 'lights', 'finale'] },
};
export function fromTemplate(id, lang = 'fr') {
  const t = TEMPLATES[id] || TEMPLATES.pop, out = t.moments.map((type) => newMoment(type, lang));
  // a second sea of light in a programme uses the night's colours: the room looks back on what it chose
  let seen = 0; for (const m of out) if (m.type === 'lights' && seen++) m.fx = 'night';
  if (id === 'festival') { out[0].fx = 'sections'; }
  if (id === 'urban') { out[0].bpm = 96; }
  return out;
}

// ---------------------------------------------------------------- what a moment leaves in tonight's print
// every result becomes a strand of the signature: a hue, a weight, a rhythm
export function strandOf(r) {
  if (!r) return null;
  switch (r.type) {
    case 'vote': return { h: r.hue ?? 38, w: 0.5 + 0.5 * (r.pct || 50) / 100, k: 2 };
    case 'pulse': return { h: 172, w: 0.4 + 0.6 * (r.sync || 0) / 100, k: Math.max(1, Math.round((r.bpm || 120) / 40)) };
    case 'battle': return { h: TEAM_H[r.win] ?? 200, w: 0.8, k: 3 };
    case 'chorus': return { h: ZONE_H[r.loud] ?? 38, w: 0.4 + 0.6 * Math.min(1, (r.peak || 50) / 100), k: 1 };
    case 'challenge': return { h: r.ok ? 42 : 268, w: r.ok ? 1 : 0.4, k: 4 };
    case 'reveal': return { h: 52, w: 0.9, k: 5 };
    case 'draw': return { h: 335, w: 0.6, k: 6 };
    case 'words': return { h: 268, w: 0.6, k: 2 };
    case 'lights': return { h: r.hue ?? 38, w: 0.5, k: 1 };
    default: return null;
  }
}
export const strands = (res) => (res || []).map(strandOf).filter(Boolean);
export const nightHues = (res) => { const s = strands(res).map((x) => x.h); return s.length ? s : [38, 200, 335]; };
// the print itself: luminous strands woven by the night's results, the same drawing on the screen, the phone
// card and the public page (t animates it; still images use t = 0)
export function drawSignature(g, w, h, res, t = 0, { seed = 1, alpha = 1 } = {}) {
  const S = strands(res).length ? strands(res) : [{ h: 38, w: 0.6, k: 1 }];
  g.save(); g.globalCompositeOperation = 'lighter';
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
  S.forEach((s, i) => {
    const ph = (hash(`${seed}:${i}`) % 1000) / 1000 * Math.PI * 2, lines = 7;
    for (let j = 0; j < lines; j++) {
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 90) {
        const wob = Math.sin(a * (s.k + 1) + ph + t * 0.0004 * (1 + i * 0.15) + j * 0.22) * 0.22 * s.w + Math.sin(a * 3 + j * 0.5 + ph) * 0.04;
        const r = R * (0.45 + 0.08 * i / Math.max(1, S.length) + wob + j * 0.012);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `hsla(${s.h},90%,${58 + j * 2}%,${(0.05 + 0.1 * s.w) * alpha})`; g.lineWidth = Math.max(1, R * 0.006 * (1 + s.w)); g.stroke();
    }
  });
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5); core.addColorStop(0, `rgba(255,240,210,${0.16 * alpha})`); core.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = core; g.fillRect(0, 0, w, h); g.restore();
}

// ---------------------------------------------------------------- the light score
// S = the show state from the screen, me = what this phone did (its vote, its light on), seat = where it stands.
// Returns { h, s, l, a } where a = how lit the phone is (0 black .. 1 full).
const DIM = (h) => ({ h, s: 70, l: 50, a: 0.06 });
export const DRAW = (() => { const s = []; let t = 0, d = 120; while (t < 6500) { s.push(t); t += d; d *= 1.07; } return { steps: s, end: t }; })();
export function drawStep(e) { let k = -1; for (let i = 0; i < DRAW.steps.length; i++) if (DRAW.steps[i] <= e) k = i; return k; }
const drawLit = (seat, k) => (hash(`${k}`) % 7) === Math.floor(seat.r * 7);
export function lightOf(S, now, seat, me = {}) {
  const hue = S?.show?.hue ?? 38;
  if (!S || S.black) return { h: hue, s: 0, l: 0, a: 0 };
  const m = S.mo, e = now - (S.t0 || 0);
  // before the show the room breathes softly; between moments the phone goes fully dark (pocket mode)
  if (!m) { if (!S.lobby) return { h: hue, s: 0, l: 0, a: 0 }; const br = 0.5 + 0.5 * Math.sin(now / 1100 + seat.r * 6.28); return { h: hue, s: 80, l: 55, a: 0.05 + 0.07 * br }; }
  if (S.ph === 'done' && m.type !== 'finale' && m.type !== 'lights') return DIM(hue);
  switch (m.type) {
    case 'vote': {
      const opts = m.options || [];
      if (S.ph === 'reveal' && S.x?.win != null) {
        const w = opts[S.x.win]?.hue ?? hue, front = (now - (S.t1 || now)) / 2200;
        const mineH = me.vote != null ? opts[me.vote]?.hue ?? hue : hue;
        if (seat.x <= front) return { h: w, s: 92, l: 58, a: 0.55 + 0.25 * Math.exp(-Math.pow((seat.x - front) * 8, 2)) + 0.08 * Math.sin(now / 500 + seat.r * 6) };
        return { h: mineH, s: 80, l: 55, a: me.vote != null ? 0.35 : 0.08 };
      }
      if (me.vote != null) return { h: opts[me.vote]?.hue ?? hue, s: 92, l: 58, a: 0.5 + 0.15 * Math.sin(now / 700 + seat.r * 6.28) };
      return { h: hue, s: 60, l: 50, a: 0.1 + 0.05 * Math.sin(now / 600) };
    }
    case 'lights': {
      const fx = m.fx, H = m.hue ?? hue;
      if (fx === 'wave') { const front = ((e / 2600) % 1.5) - 0.25, d = seat.x - front; return { h: H, s: 90, l: 58, a: 0.08 + 0.85 * Math.exp(-d * d * 60) }; }
      if (fx === 'breathe') { const b = 0.5 + 0.5 * Math.sin((e / 4200) * Math.PI * 2 + seat.y * 0.6); return { h: H, s: 85, l: 56, a: 0.15 + 0.6 * b }; }
      if (fx === 'sections') { const z = ZONES[Math.floor(e / 2400) % 3], on = seat.zone === z; return { h: ZONE_H[seat.zone], s: 90, l: 58, a: on ? 0.85 : 0.08 }; }
      const hs = nightHues(S.res), k = (e / 3500 + seat.x * 1.5 + seat.r * 0.3), i = Math.floor(k) % hs.length, f = k - Math.floor(k);
      return { h: f < 0.75 ? hs[i] : hs[(i + 1) % hs.length], s: 88, l: 57, a: 0.45 + 0.3 * Math.sin(e / 900 + seat.r * 6.28) };
    }
    case 'pulse': {
      const beat = 60000 / (m.bpm || 118), every = (m.bpm || 118) > 120 ? 2 : 1, b = e / (beat * every), f = b - Math.floor(b);
      const together = (S.x?.sync || 0) >= (m.goal || 70);
      if (e < 0) return DIM(172);
      return { h: together ? 42 : 172, s: 90, l: 58, a: 0.12 + (together ? 0.75 : 0.45) * Math.pow(1 - f, 3) };
    }
    case 'battle': {
      const H = TEAM_H[seat.team], lead = (seat.team === 'L' ? -1 : 1) * (S.x?.rope || 0);
      if (S.ph === 'reveal' || S.ph === 'done') return S.x?.win === seat.team ? { h: 42, s: 95, l: 60, a: 0.65 + 0.25 * Math.sin(now / 320) } : { h: H, s: 50, l: 45, a: 0.08 };
      if (e < 3000) { const f = ((e + 30000) % 1000) / 1000; return { h: H, s: 85, l: 58, a: 0.15 + 0.6 * Math.pow(1 - f, 2) }; }
      const b = e / (60000 / 140), f = b - Math.floor(b);
      return { h: H, s: 90, l: 58, a: 0.25 + 0.15 * Math.max(0, lead) + 0.4 * Math.pow(1 - f, 2.5) };
    }
    case 'chorus': {
      const line = m.lines?.[S.x?.line ?? 0], who = line?.who || 'all', mine = who === 'all' || who === seat.zone || who === seat.team;
      const H = who === 'L' || who === 'R' ? TEAM_H[who] : who === 'all' ? hue : ZONE_H[who];
      return mine ? { h: H, s: 90, l: 58, a: 0.55 + 0.25 * Math.sin(now / 420) } : { h: H, s: 50, l: 45, a: 0.05 };
    }
    case 'challenge': {
      if (S.ph === 'reveal') return S.x?.ok ? { h: 42, s: 95, l: 60, a: 0.6 + 0.3 * Math.sin(now / 260 + seat.x * 4) } : DIM(268);
      if (m.goal === 'light') return me.lit ? { h: 42, s: 95, l: 62, a: 0.95 } : { h: hue, s: 60, l: 50, a: 0.08 };
      return { h: 42, s: 85, l: 58, a: 0.12 + 0.5 * Math.min(1, (S.x?.p || 0) / 100) * (0.6 + 0.4 * Math.sin(now / 300 + seat.r * 6)) };
    }
    case 'reveal': {
      if (S.ph === 'reveal') return { h: 52, s: 95, l: 62, a: 0.6 + 0.3 * Math.sin(now / 300 + seat.x * 5) };
      return { h: 52, s: 85, l: 58, a: 0.08 + 0.4 * Math.min(1, (S.x?.p || 0) / 100) };
    }
    case 'draw': {
      if (S.x?.win) { if (me.id === S.x.win) return { h: 42, s: 95, l: 62, a: 0.75 + 0.2 * Math.sin(now / 250) }; return { h: hue, s: 50, l: 45, a: 0.04 }; }
      const k = drawStep(e); if (k < 0) return DIM(hue);
      return drawLit(seat, k) ? { h: 335, s: 90, l: 60, a: 0.85 } : { h: 335, s: 60, l: 45, a: 0.06 };
    }
    case 'words': return { h: 268, s: 70, l: 55, a: me.sent ? 0.35 : 0.12 };
    case 'finale': {
      const hs = nightHues(S.res), k = (now / 2600 + seat.x * 2), i = Math.floor(k) % hs.length;
      return { h: hs[i], s: 90, l: 58, a: 0.55 + 0.3 * Math.sin(now / 800 + seat.r * 6.28) };
    }
  }
  return DIM(hue);
}
export const hsl = (c, k = 1) => `hsl(${Math.round(c.h)} ${c.s}% ${(c.l * (0.1 + 0.9 * c.a * k)).toFixed(1)}%)`;

// ---------------------------------------------------------------- words: one short word, no insults on the big screen
const BAD = ['merde', 'pute', 'putain', 'connard', 'connasse', 'salope', 'encule', 'enculé', 'nique', 'batard', 'bâtard', 'pd', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'nigger', 'nigga', 'fag', 'whore', 'slut', 'nazi', 'hitler', 'bite', 'couille', 'chatte', 'negre', 'nègre'];
export function cleanWord(s) {
  const w = String(s || '').normalize('NFC').trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}' -]/gu, '').slice(0, 18).toLowerCase();
  if (w.length < 2) return '';
  // whole words only ("unique" is fine), a bad word may only be the start of a longer one ("connards")
  const flat = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const toks = flat(w).split(/[\s'-]+/).map((x) => x.replace(/[^a-z0-9]/g, '')).filter(Boolean), bad = BAD.map(flat);
  if (toks.some((tk) => bad.some((b) => tk === b || (b.length >= 4 && tk.startsWith(b))))) return '';
  if (/(https?|www|\.com|@)/.test(w)) return '';
  return w;
}
