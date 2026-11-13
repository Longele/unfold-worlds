// CO-STAGE in the audience's hand. No account, no app: scan, pick where you stand, keep the page open.
// Between moments the screen is black (pocket mode) so heads stay up; during a moment the phone is one gesture
// (choose, tap, shake, light up, sing) and a light computed from the shared clock, in sync with the whole room.
// What this phone did tonight stays on this phone only (for its keepsake card).
import { phone, cleanRoom } from './net.js';
import * as M from './moments.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let room = cleanRoom(params.get('r'));
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const id = store.get('cs-id') || (() => { const v = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12); store.set('cs-id', v); return v; })();
const T = {
  fr: { conn: 'Connexion…', where: 'Où êtes-vous ?', stage: 'SCÈNE', zones: { g: 'Gauche', c: 'Centre', d: 'Droite' }, keep: 'Gardez cette page ouverte', soon: 'Le prochain moment arrive', pocket: 'Téléphone en poche', up: 'Levez votre téléphone', tap: 'TAPEZ', tapShake: 'TAPEZ OU SECOUEZ', reveal: 'TAPEZ POUR RÉVÉLER', light: 'ALLUMER', lit: 'ALLUMÉ', youAre: (z) => `Vous êtes à ${z.toLowerCase()}`, your: 'À vous !', listen: 'Écoutez…', sent: (w) => `Envoyé : ${w}`, send: 'Envoyer', chosen: 'C\'est toi !', show: 'Montre ce code à l\'équipe', notYou: 'Ce sera pour la prochaine fois', roomChose: (l) => `La salle a choisi : ${l}`, you: (l) => `Ton choix : ${l}`, together: 'Ensemble !', wins: { L: 'La gauche gagne', R: 'La droite gagne' }, won: 'Ta section a gagné !', unlocked: 'Débloqué !', missed: 'Presque…', keepsake: 'Mon souvenir', page: 'La soirée', edition: (n) => (n ? `Édition n° ${n}` : 'Répétition'), oneOf: (n) => `1 sur ${n}`, noise: 'FAITES DU BRUIT', bad: 'Ce mot ne passera pas', ended: 'Merci !',
    card: { voted: (l) => `J'ai choisi « ${l} »`, sameRoom: 'et la salle aussi', otherRoom: (l) => `la salle a choisi « ${l} »`, battle: 'Ma section a gagné la bataille', lostBattle: 'J\'ai tout donné dans la bataille', pulse: (b) => `J'ai tenu le tempo à ${b} BPM`, chosen: 'J\'ai été l\'élu·e de la soirée', word: (w) => `Mon mot : ${w}`, lit: 'J\'ai allumé la salle', revealed: (s) => `On a révélé ${s}`, with: (n) => `avec ${n} spectateurs` } },
  en: { conn: 'Connecting…', where: 'Where are you?', stage: 'STAGE', zones: { g: 'Left', c: 'Centre', d: 'Right' }, keep: 'Keep this page open', soon: 'The next moment is coming', pocket: 'Phone in your pocket', up: 'Raise your phone', tap: 'TAP', tapShake: 'TAP OR SHAKE', reveal: 'TAP TO REVEAL', light: 'LIGHT UP', lit: 'LIT', youAre: (z) => `You are on the ${z.toLowerCase()}`, your: 'Your turn!', listen: 'Listen…', sent: (w) => `Sent: ${w}`, send: 'Send', chosen: 'It\'s you!', show: 'Show this code to the crew', notYou: 'Next time, maybe', roomChose: (l) => `The room chose: ${l}`, you: (l) => `Your choice: ${l}`, together: 'Together!', wins: { L: 'Left wins', R: 'Right wins' }, won: 'Your section won!', unlocked: 'Unlocked!', missed: 'So close…', keepsake: 'My keepsake', page: 'Tonight', edition: (n) => (n ? `Edition no. ${n}` : 'Rehearsal'), oneOf: (n) => `1 of ${n}`, noise: 'MAKE SOME NOISE', bad: 'That word won\'t go up', ended: 'Thank you!',
    card: { voted: (l) => `I chose "${l}"`, sameRoom: 'and so did the room', otherRoom: (l) => `the room chose "${l}"`, battle: 'My section won the battle', lostBattle: 'I gave everything in the battle', pulse: (b) => `I held the beat at ${b} BPM`, chosen: 'I was tonight\'s chosen one', word: (w) => `My word: ${w}`, lit: 'I lit up the room', revealed: (s) => `We revealed ${s}`, with: (n) => `with ${n} people` } },
};
let lang = store.get('uw-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en'); if (!T[lang]) lang = 'fr';
const t = (k) => T[lang][k];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let link = null, S = null, zone = store.get(`cs-z-${room}`) || '', seat = zone ? M.seatOf(id, zone) : null;
const memKey = () => `cs-mem-${room}`;
let mem = (() => { try { return JSON.parse(store.get(memKey()) || '{}'); } catch { return {}; } })();
const remember = (k, v) => { mem[k] = v; store.set(memKey(), JSON.stringify(mem)); };
const me = { id, vote: null, lit: false, sent: false };
let runSeen = -1, taps = 0, qual = 0, qn = 0;

function view(name) { for (const el of document.querySelectorAll('.ph')) el.classList.toggle('on', el.id === name); }

// ---------------------------------------------------------------- joining
if (!room) { view('code'); $('code-go').onclick = () => { const r = cleanRoom($('code-in').value); if (r.length === 4) location.search = `?r=${r}`; }; }
else {
  view('conn'); $('conn-t').textContent = t('conn');
  phone({ room, onMessage }).then(async (l) => { link = l; await l.sync(6); hello(); setInterval(hello, 20000); }).catch(() => { $('conn-t').textContent = '×'; });
}
function hello() { if (link && zone) link.post({ t: 'h', id, z: zone }); }
for (const b of document.querySelectorAll('.zones button')) b.onclick = () => {
  zone = b.dataset.z; seat = M.seatOf(id, zone); store.set(`cs-z-${room}`, zone); hello(); motionOn(); paint(true);
};

// ---------------------------------------------------------------- the show state from the screen
function onMessage(m) {
  if (m.t !== 's') return;
  const prev = S; S = m;
  if (!store.get('uw-lang') && S.show?.lang) lang = S.show.lang;
  document.documentElement.style.setProperty('--h', S.show?.hue ?? 38);
  if (S.run !== runSeen) { runSeen = S.run; me.vote = mem[`v${S.run}`] ?? null; me.lit = false; me.sent = !!mem[`w${S.run}`]; taps = 0; }
  $('msg').textContent = S.msg || ''; $('msg').classList.toggle('on', !!S.msg);
  const changed = !prev || prev.run !== S.run || prev.ph !== S.ph || !!prev.mo !== !!S.mo || prev.x?.line !== S.x?.line || prev.x?.win !== S.x?.win || prev.lobby !== S.lobby || prev.show?.artist !== S.show?.artist;
  if (changed) paint(); else live();
  if (S.mo && S.ph === 'live') awake(); else sleep();
  noteMemory();
}

// ---------------------------------------------------------------- what the phone shows
function paint() {
  $('top').textContent = (S?.show?.artist || 'CO-STAGE').toUpperCase();
  if (!S) return;
  if (!zone) {
    view('join'); $('j-k').textContent = t('where'); $('j-a').textContent = S.show?.artist || S.show?.title || 'CO-STAGE'; $('j-t').textContent = S.show?.artist ? S.show?.title || '' : '';
    $('j-stage').textContent = t('stage'); for (const b of document.querySelectorAll('.zones button')) b.textContent = t('zones')[b.dataset.z];
    return;
  }
  const m = S.mo;
  if (!m || S.black) { view('pocket'); $('pk-a').textContent = S.show?.artist || ''; $('pk-t').textContent = S.lobby ? t('keep') : t('soon'); $('pk-s').textContent = `${t('zones')[zone]} · ${S.n || 1}`; return; }
  view('mo'); const box = $('mo'), x = S.x || {}, ph = S.ph;
  let h = `<div class="mono">${esc(m.title)}</div>`;
  switch (m.type) {
    case 'vote':
      if (ph === 'reveal' && x.win != null) { const w = m.options[x.win]; h += `<h2>${esc(t('roomChose')(w.label))}</h2>${me.vote != null ? `<p>${esc(t('you')(m.options[me.vote]?.label))}</p>` : ''}`; }
      else h += `<h2>${esc(m.q)}</h2><div class="choices${me.vote != null ? ' chosen' : ''}">${m.options.map((o, i) => `<button data-o="${i}" class="${me.vote === i ? 'on' : ''}" style="background:hsl(${o.hue} 85% 55%);color:hsl(${o.hue} 90% 12%)">${esc(o.label)}</button>`).join('')}</div>`;
      break;
    case 'lights': h += `<p id="fade">${t('up')}</p>`; break;
    case 'pulse': h += `<h2 id="pl">${t('tap')}</h2><button class="pad" id="pad">${t('tap')}</button>`; break;
    case 'battle':
      if (ph === 'reveal' || ph === 'done') h += `<h2>${x.win === seat.team ? t('won') : t('wins')[x.win] || ''}</h2>`;
      else h += `<p>${esc(t('youAre')(seat.team === 'L' ? t('zones').g : t('zones').d))}</p><button class="pad" id="pad">${t('tapShake')}</button><p>${esc(m.stake)}</p>`;
      break;
    case 'chorus': { const ln = m.lines[x.line || 0] || {}, mine = ln.who === 'all' || ln.who === zone || ln.who === seat.team; h += mine ? `<div class="small">${t('your')}</div><div class="big">${esc(ln.text)}</div>` : `<div class="small">${t('listen')}</div><h2 style="opacity:.5">${esc(ln.text)}</h2>`; break; }
    case 'challenge':
      if (ph === 'reveal') h += `<h2>${x.ok ? t('unlocked') : t('missed')}</h2>${x.ok && x.reward ? `<div class="big" style="font-size:40px">${esc(x.reward)}</div>` : ''}`;
      else if (m.goal === 'light') h += `<button class="hold${me.lit ? ' on' : ''}" id="hold">${me.lit ? t('lit') : t('light')}</button>`;
      else h += `<button class="pad" id="pad">${m.goal === 'noise' ? t('noise') : t('tap')}</button>`;
      break;
    case 'reveal': h += `<div class="big" id="shown" style="font-size:44px;letter-spacing:.12em">${esc(x.shown || '')}</div>${ph === 'reveal' ? '' : `<button class="pad" id="pad">${t('reveal')}</button>`}`; break;
    case 'draw':
      if (x.win) h += x.win === id ? `<div class="big">${t('chosen')}</div><div class="ccode">${esc(x.code)}</div><p>${t('show')}</p><p>${esc(m.reason)}</p>` : `<h2>${t('notYou')}</h2><p>${esc(t('zones')[x.zone] || '')}</p>`;
      else h += `<p>${t('up')}</p>`;
      break;
    case 'words':
      h += `<h2>${esc(m.q)}</h2>${me.sent ? `<p>${esc(t('sent')(mem[`w${S.run}`]))}</p>` : `<div class="word"><input id="w-in" maxlength="18" autocomplete="off" enterkeyhint="send"><button class="btn gold" id="w-go">${t('send')}</button></div><p id="w-bad"></p>`}`;
      break;
    case 'finale':
      h += `<div class="small">${esc(t('edition')(x.ed || 0))}</div><h2>${esc(m.thanks)}</h2><button class="btn gold" id="keep">${t('keepsake')}</button>${x.tok ? `<a class="btn" href="souvenir.html?e=${encodeURIComponent(x.tok)}">${t('page')}</a>` : ''}`;
      break;
  }
  box.innerHTML = h; wire(m);
  if (m.type === 'lights') setTimeout(() => $('fade')?.style && ($('fade').style.opacity = 0), 3500);
}
function live() { // small updates without redrawing (pulse together, letters revealed)
  if (!S?.mo) return; const x = S.x || {};
  if (S.mo.type === 'pulse' && $('pl')) $('pl').textContent = (x.sync || 0) >= S.mo.goal ? t('together') : t('tap');
  if (S.mo.type === 'reveal' && $('shown')) $('shown').textContent = x.shown || '';
}
function wire(m) {
  const box = $('mo');
  box.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { me.vote = +b.dataset.o; remember(`v${S.run}`, me.vote); remember(`vl${S.run}`, m.options[me.vote].label); link?.post({ t: 'v', id, o: me.vote, r: S.run }); paint(); }));
  const pad = $('pad'); if (pad) pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tapped(); pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 90); });
  const hold = $('hold'); if (hold) hold.onclick = () => { me.lit = !me.lit; if (me.lit) remember('lit', 1); link?.post({ t: 'l', id, on: me.lit, r: S.run }); paint(); };
  const wgo = $('w-go'); if (wgo) { const send = () => { const w = M.cleanWord($('w-in').value); if (!w) { $('w-bad').textContent = t('bad'); return; } me.sent = true; remember(`w${S.run}`, w); remember('word', w); link?.post({ t: 'w', id, w, r: S.run }); paint(); }; wgo.onclick = send; $('w-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); }); }
  const keep = $('keep'); if (keep) keep.onclick = keepsake;
}

// ---------------------------------------------------------------- taps and shakes, batched once a second
function tapped() {
  taps++;
  if (S?.mo?.type === 'pulse') { const beat = 60000 / (S.mo.bpm || 118), ph = (((link.now() - S.t0) / beat) % 1 + 1) % 1, err = Math.min(ph, 1 - ph); qual += Math.max(0, 1 - err / 0.22); qn++; }
}
const reporter = () => (M.hash(id) % 1000) / 1000 < (S?.p ?? 1);
setInterval(() => {
  if (!link || !S?.mo || S.ph !== 'live' || !taps) { taps = 0; qual = 0; qn = 0; return; }
  if (reporter()) link.post({ t: 'k', id, n: taps, s: qn ? +(qual / qn).toFixed(2) : 0, r: S.run });
  if (S.mo.type === 'battle') remember('battled', 1);
  if (S.mo.type === 'pulse' && qn) remember('pulse', S.mo.bpm);
  taps = 0; qual = 0; qn = 0;
}, 1000);
let lastShake = 0;
function motionOn() { try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {}); } catch {} }
addEventListener('devicemotion', (ev) => {
  const a = ev.accelerationIncludingGravity; if (!a || !S?.mo || S.ph !== 'live') return;
  const ty = S.mo.type; if (ty !== 'battle' && !(ty === 'challenge' && S.mo.goal !== 'light') && ty !== 'reveal') return;
  const g = Math.hypot(a.x || 0, a.y || 0, a.z || 0), n = Date.now();
  if (g > 19 && n - lastShake > 180) { lastShake = n; tapped(); }
});

// ---------------------------------------------------------------- the light, every frame, from the shared clock
function frame() {
  let col = '#000';
  if (S && seat && link && zone) { const c = M.lightOf(S, link.now(), seat, me); col = c.a < 0.01 ? '#000' : M.hsl(c); }
  $('glow').style.backgroundColor = col;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- keep the screen awake only during moments (battery)
let wl = null;
async function awake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && (!wl || wl.released)) wl = await navigator.wakeLock.request('screen'); } catch {} }
function sleep() { try { wl?.release(); } catch {} wl = null; }

// ---------------------------------------------------------------- tonight, on this phone only
function noteMemory() {
  if (!S) return;
  if (S.show) remember('show', { artist: S.show.artist, title: S.show.title, venue: S.show.venue, hue: S.show.hue });
  remember('n', Math.max(mem.n || 0, S.n || 0)); remember('res', S.res || []);
  if (S.mo?.type === 'draw' && S.x?.win === id) remember('chosen', 1);
  if (S.x?.ed != null) remember('ed', S.x.ed); if (S.x?.tok) remember('tok', S.x.tok);
}
async function keepsake() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d'), sh = mem.show || {}, hue = sh.hue ?? 38, res = mem.res || [];
  const bg = g.createRadialGradient(540, 470, 0, 540, 470, 1100); bg.addColorStop(0, `hsl(${hue} 60% 14%)`); bg.addColorStop(1, '#040305'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  g.save(); g.translate(90, 80); M.drawSignature(g, 900, 760, res, 0, { seed: mem.ed || 1 }); g.restore();
  g.textAlign = 'center'; g.fillStyle = 'rgba(244,239,230,.6)'; g.font = '400 24px ui-monospace, monospace'; g.fillText(`${t('edition')(mem.ed || 0).toUpperCase()}  ·  ${t('oneOf')(1).toUpperCase()}`, 540, 90);
  g.fillStyle = '#f4efe6'; g.font = '300 92px Cormorant Garamond, Georgia, serif'; g.fillText(sh.artist || sh.title || 'CO-STAGE', 540, 900);
  g.font = 'italic 300 40px Cormorant Garamond, Georgia, serif'; g.fillStyle = `hsl(${hue} 85% 74%)`; g.fillText([sh.artist ? sh.title : '', sh.venue].filter(Boolean).join(' · '), 540, 956);
  const C = T[lang].card, lines = [];
  for (const r of res) {
    if (r.type === 'vote') { const l = mem[`vl${r.run}`]; if (l) lines.push(`${C.voted(l)}, ${l === r.label ? C.sameRoom : C.otherRoom(r.label)}`); }
    if (r.type === 'battle' && mem.battled) lines.push(r.win === seat?.team ? C.battle : C.lostBattle);
    if (r.type === 'pulse' && mem.pulse) lines.push(C.pulse(r.bpm));
    if (r.type === 'reveal') lines.push(C.revealed(r.secret));
  }
  if (mem.chosen) lines.push(C.chosen); if (mem.word) lines.push(C.word(mem.word)); if (mem.lit) lines.push(C.lit);
  g.font = '300 40px Cormorant Garamond, Georgia, serif'; g.fillStyle = '#f4efe6';
  [...new Set(lines)].slice(0, 5).forEach((s, i) => g.fillText(s, 540, 1040 + i * 54));
  g.fillStyle = 'rgba(244,239,230,.55)'; g.font = '400 24px ui-monospace, monospace';
  g.fillText(`${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}  ·  ${C.with(mem.n || 1)}`, 540, 1306);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png')), file = new File([blob], 'co-stage.png', { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: sh.artist || 'CO-STAGE' }); return; } } catch (err) { if (err?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'co-stage.png'; a.click();
}
window.costagePhone = { get S() { return S; }, id, me, keepsake, get mem() { return mem; } };
