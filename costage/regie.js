// CO-STAGE régie: the desk that runs the night. It owns the show (signed in), opens the big screen with the secret
// key, starts each moment, decides when a result is revealed (or imposes one: the artist keeps the last word),
// can black everything out, talk to the room, and saves the night to the database as it goes.
import * as D from './data.js';
import { regie, randCode } from './net.js';
import * as M from './moments.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = store.get('uw-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en'); if (lang !== 'en') lang = 'fr';
const T = {
  fr: { back: 'Concerts', n: 'Connectés', peak: 'Pic', room: 'Code', screen: 'Écran', on: 'connecté', off: 'non connecté', reh: 'Répétition', start: 'Démarrer la soirée', startReh: 'Démarrer la répétition', open: 'Ouvrir l\'écran', lobby: 'Accueil', pocket: 'Mode poche', black: 'Noir', unblack: 'Rallumer', qr: 'QR', send: 'Envoyer', sim: 'Foule simulée', simSet: 'Appliquer', end: 'Terminer la soirée', mem: 'Page souvenir', go: 'GO', next: 'Moment suivant', close: 'Clore', reveal: 'Révéler', impose: 'Imposer', prevL: 'Ligne précédente', nextL: 'Ligne suivante', tap: 'Tap tempo', none: 'Aucun moment en cours', acted: 'ont participé', phase: { live: 'en direct', closed: 'vote clos', reveal: 'révélé', done: 'terminé', idle: '' }, saved: 'soirée enregistrée', started: 'soirée lancée', ended: 'soirée terminée', confirmEnd: 'Terminer la soirée ?', needStart: 'Démarrez d\'abord la soirée', sync: 'ensemble', mic: 'micro', winner: 'Élu', words: 'mots', approved: 'validés', notSigned: 'Connexion requise', notFound: 'Concert introuvable', simWarn: 'simulés' },
  en: { back: 'Shows', n: 'Connected', peak: 'Peak', room: 'Code', screen: 'Screen', on: 'connected', off: 'not connected', reh: 'Rehearsal', start: 'Start the night', startReh: 'Start the rehearsal', open: 'Open the screen', lobby: 'Welcome', pocket: 'Pocket mode', black: 'Black', unblack: 'Lights on', qr: 'QR', send: 'Send', sim: 'Simulated crowd', simSet: 'Apply', end: 'End the night', mem: 'Memory page', go: 'GO', next: 'Next moment', close: 'Close', reveal: 'Reveal', impose: 'Impose', prevL: 'Previous line', nextL: 'Next line', tap: 'Tap tempo', none: 'No moment running', acted: 'took part', phase: { live: 'live', closed: 'vote closed', reveal: 'revealed', done: 'done', idle: '' }, saved: 'night saved', started: 'night started', ended: 'night ended', confirmEnd: 'End the night?', needStart: 'Start the night first', sync: 'together', mic: 'mic', winner: 'Chosen', words: 'words', approved: 'approved', notSigned: 'Sign-in required', notFound: 'Show not found', simWarn: 'simulated' },
};
const t = (k) => T[lang][k];
const toast = (s) => { $('toast').textContent = s; $('toast').classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => $('toast').classList.remove('on'), 2200); };

// ---------------------------------------------------------------- who, which show, which night
const showId = new URLSearchParams(location.search).get('s') || '';
const user = await D.me();
if (!user) { location.replace(`../login.html?next=${encodeURIComponent(location.pathname + location.search)}`); await new Promise(() => {}); }
const show = showId ? await D.getShow(showId).catch(() => null) : null;
if (!show) { document.body.innerHTML = `<div class="wait"><b>${t('notFound')}</b></div>`; throw new Error('show'); }
show.program = M.cleanProgram(show.program, show.lang);
document.documentElement.style.setProperty('--h', show.hue);
// the night survives a reload of the régie: same room, same key, same event
const sk = `cs-rg-${show.id}`;
let night = (() => { try { return JSON.parse(sessionStorage.getItem(sk) || 'null'); } catch { return null; } })() || { room: randCode(4), key: randCode(20), ev: null };
const saveNight = () => { try { sessionStorage.setItem(sk, JSON.stringify(night)); } catch {} };
saveNight();

let link = null, pub = null, st = null, lastHb = 0;
const screenUrl = () => new URL(`./ecran.html#r=${night.room}&k=${night.key}`, location.href).href;
const send = (c) => link?.send(c);
const load = () => send({ c: 'load', show: { title: show.title, artist: show.artist, venue: show.venue, hue: show.hue, lang: show.lang }, program: show.program, ev: night.ev ? { edition: night.ev.edition, token: night.ev.public_token, rehearsal: night.ev.rehearsal } : null });

// ---------------------------------------------------------------- labels
function labels() {
  $('h-title').textContent = show.artist ? `${show.artist} · ${show.title}` : show.title; document.title = `CO-STAGE · ${show.title}`;
  $('b-back').textContent = t('back'); $('l-n').textContent = t('n'); $('l-peak').textContent = t('peak'); $('l-room').textContent = t('room'); $('l-screen').textContent = t('screen'); $('v-room').textContent = night.room;
  $('l-reh').textContent = t('reh'); $('b-screen').textContent = t('open'); $('b-screen2').textContent = t('open');
  $('b-lobby').textContent = t('lobby'); $('b-pocket').textContent = t('pocket'); $('b-qr').textContent = t('qr'); $('b-msg').textContent = t('send');
  $('l-sim').textContent = t('sim'); $('b-sim').textContent = t('simSet'); $('b-end').textContent = t('end'); $('b-mem').textContent = t('mem');
  startUI();
}
function startUI() {
  const started = !!night.ev; $('c-start').style.display = started ? 'none' : ''; $('b-start').textContent = $('reh').checked ? t('startReh') : t('start');
  $('c-end').style.display = started ? '' : 'none';
  if (night.ev?.status === 'ended') { $('b-end').style.display = 'none'; }
  if (night.ev && !night.ev.rehearsal) { $('b-mem').href = new URL(`./souvenir.html?e=${night.ev.public_token}`, location.href).href; $('b-mem').style.display = night.ev.status === 'ended' ? '' : 'none'; }
}
$('reh').onchange = startUI;

// ---------------------------------------------------------------- the programme, one GO per moment
function drawProg() {
  const cur = st?.m ?? -1, done = new Set((st?.res || []).map((r) => r.i));
  $('prog').innerHTML = show.program.map((m, i) => `<div class="it${i === cur && st?.ph !== 'idle' && st?.ph ? ' cur' : ''}${done.has(i) && i !== cur ? ' done' : ''}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(m.title)}<span class="ty">${esc(M.TYPE_INFO[m.type][lang])}</span></span><button class="btn${i === cur + 1 ? ' gold' : ''}" data-go="${i}">${t('go')}</button></div>`).join('');
  $('prog').querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(+b.dataset.go)));
}
function go(i) { if (!night.ev) { toast(t('needStart')); return; } send({ c: 'go', i }); }

// ---------------------------------------------------------------- the live card: what is happening and what can be done now
let liveKey = '';
function drawLive() {
  const box = $('live');
  if (!st || st.m < 0 || st.ph === 'idle' || !show.program[st.m]) { if (liveKey !== 'none') { box.innerHTML = `<div class="mono">${t('none')}</div><div class="ctrls">${night.ev ? `<button class="btn gold" id="b-next">${t('next')}</button>` : ''}</div>`; liveKey = 'none'; const b = $('b-next'); if (b) b.onclick = () => go(Math.min(show.program.length - 1, (st?.m ?? -1) + 1)); } return; }
  const m = show.program[st.m], x = st.x || {}, ph = st.ph, key = `${st.run}:${ph}:${x.win ?? ''}:${x.line ?? ''}`;
  if (key !== liveKey) {
    liveKey = key; let c = '';
    if (ph === 'live' && m.type !== 'draw') c += `<button class="btn red" data-c="close">${t('close')}</button>`;
    if (m.type === 'vote' && (ph === 'live' || ph === 'closed')) c += `<button class="btn gold" data-c="reveal">${t('reveal')}</button>`;
    if (m.type === 'chorus' && ph === 'live') c += `<button class="btn" data-c="prev">${t('prevL')}</button><button class="btn gold" data-c="next">${t('nextL')}</button>`;
    if (m.type === 'pulse' && ph === 'live') c += `<button class="btn" id="b-tap">${t('tap')}</button>`;
    if (ph !== 'live') c += `<button class="btn gold" id="b-next">${t('next')}</button>`;
    box.innerHTML = `<div class="mono">${String(st.m + 1).padStart(2, '0')} · ${esc(M.TYPE_INFO[m.type][lang])} · <span id="lv-ph"></span></div><h3>${esc(m.title)}</h3><div class="mono" id="lv-act"></div><div id="lv-data"></div><div class="ctrls">${c}</div>`;
    box.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => send({ c: b.dataset.c })));
    const nb = $('b-next'); if (nb) nb.onclick = () => go(Math.min(show.program.length - 1, st.m + 1));
    const tb = $('b-tap'); if (tb) { const taps = []; tb.onclick = () => { const n = Date.now(); while (taps.length && n - taps[0] > 4000) taps.shift(); taps.push(n); if (taps.length >= 4) { const bpm = 60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)); send({ c: 'bpm', bpm }); tb.textContent = `${Math.round(bpm)} BPM`; } }; }
  }
  $('lv-ph').textContent = t('phase')[ph] || '';
  $('lv-act').textContent = `${pub?.acted ?? 0} / ${pub?.n ?? 0} ${t('acted')}`;
  let d = '';
  if (m.type === 'vote') { const c = x.counts || [], tot = c.reduce((a, b) => a + b, 0) || 1; d = `<div class="rows">${m.options.map((o, i) => `<div class="row"><i class="sw" style="background:hsl(${o.hue} 90% 60%)"></i><span style="width:120px">${esc(o.label)}</span><span class="bar"><i style="width:${(100 * (c[i] || 0)) / tot}%;background:hsl(${o.hue} 90% 60%)"></i></span><span class="v">${c[i] || 0} · ${Math.round((100 * (c[i] || 0)) / tot)} %</span>${ph !== 'reveal' ? `<button class="btn" data-imp="${i}">${t('impose')}</button>` : x.win === i ? '<span class="mono">✓</span>' : ''}</div>`).join('')}</div>`; }
  if (m.type === 'pulse') d = `<div class="kv"><span class="mono">${t('sync')}</span><b>${x.sync || 0} %</b></div>`;
  if (m.type === 'battle') d = `<div class="rows"><div class="row"><span style="width:120px;color:hsl(${M.TEAM_H.L} 90% 70%)">L</span><span class="bar"><i style="width:${50 - 50 * (x.rope || 0)}%;background:hsl(${M.TEAM_H.L} 85% 55%)"></i></span><span class="v">${x.tl || 0}</span></div><div class="row"><span style="width:120px;color:hsl(${M.TEAM_H.R} 90% 70%)">R</span><span class="bar"><i style="width:${50 + 50 * (x.rope || 0)}%;background:hsl(${M.TEAM_H.R} 85% 55%)"></i></span><span class="v">${x.tr || 0}</span></div></div>${x.win ? `<div class="kv"><b>${x.win}</b></div>` : ''}`;
  if (m.type === 'chorus') d = `<div class="kv"><span>${esc(m.lines[x.line || 0]?.text || '')}</span><span class="mono">${(x.line || 0) + 1} / ${m.lines.length} · ${t('mic')} ${pub?.mic ? x.lv || 0 : '×'}</span></div>`;
  if (m.type === 'challenge' || m.type === 'reveal') d = `<div class="kv"><span class="mono">${m.type === 'reveal' ? esc(x.shown || '') : esc(m.reward)}</span><b>${Math.round(x.p || 0)} %</b></div>${ph === 'reveal' && m.type === 'challenge' ? `<div class="kv"><b>${x.ok ? '✓' : '×'}</b></div>` : ''}`;
  if (m.type === 'draw' && x.win) d = `<div class="kv"><span class="mono">${t('winner')}</span><b style="letter-spacing:.3em">${esc(x.code)}</b></div>`;
  if (m.type === 'words') { const ws = x.words || []; d = `<div class="mono">${ws.length} ${t('words')} · ${ws.filter((w) => w.ok).length} ${t('approved')}</div><div class="words">${ws.map((w) => `<button class="${w.ok ? 'ok' : ''}" data-w="${esc(w.w)}" data-ok="${w.ok ? 1 : 0}">${esc(w.w)} · ${w.n}</button>`).join('')}</div>`; }
  if (m.type === 'finale' && night.ev && !night.ev.rehearsal) d = `<div class="mono">${esc(new URL(`./souvenir.html?e=${night.ev.public_token}`, location.href).href)}</div>`;
  // only touch the DOM when something changed: a button under a finger must not be replaced mid-click
  const box2 = $('lv-data'); if (box2.dataset.h === d) return; box2.dataset.h = d; box2.innerHTML = d;
  $('lv-data').querySelectorAll('[data-imp]').forEach((b) => (b.onclick = () => send({ c: 'reveal', o: +b.dataset.imp })));
  $('lv-data').querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => { if (!m.approve) return; send({ c: 'approve', w: b.dataset.w, on: b.dataset.ok !== '1' }); }));
}

// ---------------------------------------------------------------- saving the night as it goes (the screen keeps the numbers, the régie writes them)
let saveT = 0, lastSaved = '';
function autosave(final = false) {
  if (!night.ev || !pub || (night.ev.status === 'ended' && !final) || (final && autosave.done)) return;
  if (final) { autosave.done = true; clearTimeout(saveT); }
  const sum = pub.sum && final ? pub.sum : { date: new Date().toISOString(), edition: night.ev.edition, peak: pub.peak, joined: pub.joined, res: pub.res || [], hues: M.nightHues(pub.res || []), sims: pub.sims || 0 };
  if (pub.sims) sum.sims = pub.sims;
  const s = JSON.stringify({ ...sum, date: 0 }); if (!final && s === lastSaved) return; lastSaved = s; // the date alone is not a change
  clearTimeout(saveT); saveT = setTimeout(async () => {
    try { const patch = { summary: sum }; if (final) { patch.status = 'ended'; patch.ended_at = new Date().toISOString(); } night.ev = { ...night.ev, ...(await D.updateEvent(night.ev.id, patch)) }; saveNight(); if (final) { toast(t('ended')); startUI(); } } catch (e) { toast(e.message); }
  }, final ? 0 : 2500);
}

// ---------------------------------------------------------------- the link
// the public state is lean: keep the detailed numbers (vote counts, words) that only the régie channel carries
function onState(s) { st = { ...s, x: { ...(s.x || {}), ...(pub?.run === s.run ? pub.x : {}) } }; drawProg(); drawLive(); }
function onStats(r) {
  pub = r; lastHb = Date.now(); if (!st) st = { m: r.m, ph: r.ph, run: r.run, x: r.x, res: r.res };
  else Object.assign(st, { m: r.m, ph: r.ph, run: r.run, x: r.x, res: r.res });
  if (!r.loaded) load();
  $('v-n').innerHTML = `${r.n}${r.sims ? `<small class="mono" style="display:block;font-size:9px;text-align:right">${r.sims} ${t('simWarn')}</small>` : ''}`; $('v-peak').textContent = r.peak;
  $('b-black').textContent = r.black ? t('unblack') : t('black'); $('b-black').dataset.on = r.black ? '1' : '';
  drawLive(); if (r.res?.length) autosave();
}
setInterval(() => { const on = Date.now() - lastHb < 4000; $('v-screen').textContent = on ? t('on') : t('off'); $('v-screen').style.color = on ? 'var(--acc2)' : '#ffb3a6'; }, 1000);
regie({ room: night.room, key: night.key, onState, onStats }).then((l) => { link = l; load(); send({ c: 'hello' }); }).catch((e) => toast(e.message));

// ---------------------------------------------------------------- buttons
const openScreen = () => window.open(screenUrl(), `costage-${night.room}`);
$('b-screen').onclick = openScreen; $('b-screen2').onclick = openScreen;
$('b-start').onclick = async () => {
  try { night.ev = await D.createEvent(show.id, night.room, $('reh').checked); saveNight(); load(); startUI(); toast(t('started')); drawProg(); drawLive(); liveKey = ''; } catch (e) { toast(e.message); }
};
$('b-lobby').onclick = () => send({ c: 'lobby' });
$('b-pocket').onclick = () => send({ c: 'pocket' });
$('b-black').onclick = () => send({ c: 'black', on: $('b-black').dataset.on !== '1' });
let qrOn = true; $('b-qr').onclick = () => { qrOn = !qrOn; send({ c: 'qr', on: qrOn }); $('b-qr').style.opacity = qrOn ? 1 : 0.5; };
$('b-msg').onclick = () => send({ c: 'msg', text: $('msg').value.trim() });
$('b-msgx').onclick = () => { $('msg').value = ''; send({ c: 'msg', text: '' }); };
$('b-sim').onclick = () => send({ c: 'sim', n: Math.max(0, Math.min(600, parseInt($('sim').value, 10) || 0)) });
$('b-end').onclick = () => { if (!confirm(t('confirmEnd'))) return; send({ c: 'end' }); setTimeout(() => autosave(true), 900); };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'n' || e.key === 'N') go(Math.min(show.program.length - 1, (st?.m ?? -1) + 1));
  if (e.key === 'b' || e.key === 'B') $('b-black').click();
  if (e.key === ' ') { e.preventDefault(); ($('live').querySelector('[data-c="reveal"]') || $('live').querySelector('[data-c="close"]'))?.click(); }
});
labels(); drawProg(); drawLive();
window.costageRegie = { night, show, get st() { return st; }, get pub() { return pub; }, send };
