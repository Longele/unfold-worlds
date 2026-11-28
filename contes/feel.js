// Shared by every story: how it feels on a phone, and what the app remembers.
// - vibrations a finger can feel: a tap with each touch, a happy pattern when something is found or picked;
// - every spot and choice is easier to hit: an invisible margin around it (small fingers miss small targets);
// - a child who seems stuck sees the spots pulse gently after a while;
// - a choice is plainly picked: it grows and gets a tick, the other fades, and the choice is written big;
// - inside the app (not on the website): an app reader — segmented progress at the top with back and sound on
//   either side, a floating dock at the bottom with a big "Next" in the app's colours (day or night);
// - for the app's library: where the child is in this story, the stories finished, and the next episode at the end.
// Everything stays on the device (localStorage); nothing is sent.
const ID = location.pathname.split('/').filter(Boolean).pop();
const KEY = 'contes-prog';
const NEXT = { lina: 'lina2', nala: 'nala2', noel: 'noel2' };
const T = { fr: { next: 'Épisode suivant', sticker: 'Nouvel autocollant !', go: 'Suivant' }, en: { next: 'Next episode', sticker: 'New sticker!', go: 'Next' } };

const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };
const QUIET = /^(page|theme|amb|flutter|whoosh|wind|rain|sea|night)/;
const HAPPY = /found|uncurl|chime|ding|yay|good|win|sparkle|magic|done|bell|tada|cheer|hug|ok/;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} };

// in the app? (the app's home leaves a mark for the session; an installed web app runs standalone)
let inApp = false;
try { inApp = sessionStorage.getItem('contes-inapp') === '1' || new URLSearchParams(location.search).has('app'); } catch {}
inApp = inApp || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
let th = 'auto'; try { th = localStorage.getItem('contes-theme') || 'auto'; } catch {}
const hr = new Date().getHours(), night = th === 'night' || (th === 'auto' && (hr >= 19 || hr < 7));
const H = document.documentElement;
H.style.setProperty('--feel', night ? '#ffd166' : '#ed6d4a'); H.style.setProperty('--feelink', night ? '#1a1d52' : '#fff');
if (inApp) { H.classList.add('inapp'); H.dataset.tone = night ? 'night' : 'day'; }

const css = document.createElement('style');
css.textContent = `
@font-face { font-family: 'Fredoka'; font-weight: 500 700; src: url(../fonts/fredoka.woff2) format('woff2'); font-display: swap; }
#spots .spot::before, #spots .choice::before { content: ''; position: absolute; inset: -24%; border-radius: inherit; }
#spots .choice { min-height: 56px; min-width: 120px; transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s, filter .35s; }
#spots .choice.picked { transform: translate(-50%, -50%) scale(1.22) !important; animation: none !important; box-shadow: 0 0 0 6px #fff, 0 0 40px 14px rgba(255, 214, 90, .95) !important; z-index: 3; }
#spots .choice.picked::after { content: '✓'; position: absolute; top: -18px; right: -16px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: #3cb86a; color: #fff; font-size: 24px; font-weight: 700; border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,.35); }
#spots .choice.unpicked { opacity: .2; filter: grayscale(1); transform: translate(-50%, -50%) scale(.85) !important; animation: none !important; }
.feelpick { position: fixed; left: 50%; top: 42%; z-index: 60; transform: translate(-50%, -50%) scale(.4); opacity: 0; transition: all .45s cubic-bezier(.34,1.56,.64,1); pointer-events: none; padding: 16px 26px; border-radius: 26px; background: var(--feel); color: var(--feelink); font: 700 30px 'Fredoka', 'Comic Neue', system-ui, sans-serif; box-shadow: 0 0 0 5px #fff, 0 18px 40px rgba(0,0,0,.45); white-space: nowrap; }
.feelpick small { display: block; font-size: 15px; opacity: .85; text-align: center; }
.feelpick.on { transform: translate(-50%, -50%) scale(1); opacity: 1; }
#spots .spot.nudge { animation: feelnudge 1.1s ease-in-out 2 !important; }
@keyframes feelnudge { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 230, 140, 0); } 50% { box-shadow: 0 0 0 10px rgba(255, 230, 140, .55), 0 0 30px 12px rgba(255, 230, 140, .45); } }
#endcard .feelnext { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; background: var(--feel) !important; color: var(--feelink) !important; font-family: 'Fredoka', 'Comic Neue', system-ui, sans-serif; box-shadow: 0 5px 0 rgba(0,0,0,.25) !important; }
.feelsticker { position: fixed; left: 50%; top: 22%; z-index: 99; transform: translate(-50%, -50%) scale(.2) rotate(-20deg); opacity: 0; transition: all .6s cubic-bezier(.34,1.56,.64,1); text-align: center; pointer-events: none; font: 700 20px 'Fredoka', 'Comic Neue', system-ui, sans-serif; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.6); }
.feelsticker i { display: block; width: 120px; height: 120px; margin: 0 auto 8px; border-radius: 50%; background: center/cover; border: 6px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.feelsticker.on { transform: translate(-50%, -50%) scale(1) rotate(-4deg); opacity: 1; }

/* ---------------- the app's reader (only inside the app) */
html.inapp { --rbg: #fff5e6; --glass: rgba(255, 255, 255, .9); --gink: #2d2150; --gdim: rgba(45, 33, 80, .14); }
html.inapp[data-tone=night] { --rbg: #0f1238; --glass: rgba(26, 29, 82, .9); --gink: #f5f3ff; --gdim: rgba(245, 243, 255, .18); }
html.inapp body { background: radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--feel) 28%, transparent) 0, transparent 40%), var(--rbg) !important; }
html.inapp[data-tone=day] body { background: radial-gradient(rgba(45, 33, 80, .07) 1.2px, transparent 1.7px) 0 0 / 18px 18px, radial-gradient(circle at 10% 0%, #ffd9b8 0, rgba(255, 217, 184, 0) 36%), var(--rbg) !important; }
html.inapp body::before { display: none; }
html.inapp .page { padding: calc(env(safe-area-inset-top) + 66px) 8px calc(env(safe-area-inset-bottom) + 150px) !important; gap: 10px; }
html.inapp .panel { border: 3px solid #fff !important; border-radius: 22px !important; box-shadow: 0 18px 44px rgba(0, 0, 0, .3) !important; }
html.inapp .foot { position: absolute; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 12px); z-index: 20; height: 78px; max-width: 560px; margin: 0 auto; padding: 10px 12px; gap: 10px; border-radius: 28px; background: var(--glass); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); box-shadow: 0 16px 36px rgba(0, 0, 0, .28); border: 1px solid var(--gdim); }
.feeltop { position: fixed; top: calc(env(safe-area-inset-top) + 10px); left: 12px; right: 12px; z-index: 21; display: flex; align-items: center; gap: 12px; }
html.inapp .feeltop .home, html.inapp .feeltop #replay { flex: none; width: 46px; height: 46px; margin: 0; border: 0 !important; border-radius: 16px; background: var(--glass) !important; color: var(--gink); box-shadow: 0 6px 18px rgba(0, 0, 0, .2) !important; display: grid; place-items: center; }
html.inapp .feeltop #replay svg { fill: var(--gink); stroke: var(--gink); width: 24px; height: 24px; }
html.inapp .feeltop #replay.busy { background: var(--feel) !important; } html.inapp .feeltop #replay.busy svg { fill: var(--feelink); stroke: var(--feelink); }
html.inapp .feeltop .home svg { fill: var(--gink); }
html.inapp .feeltop #dots { flex: 1; display: flex; gap: 4px; margin: 0; overflow: visible; }
html.inapp .feeltop #dots i { flex: 1 1 0; min-width: 0; height: 6px; border-radius: 9px; background: var(--gdim); transform: none !important; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
html.inapp .feeltop #dots i.past { background: color-mix(in srgb, var(--feel) 70%, transparent); }
html.inapp .feeltop #dots i.on { background: var(--feel); }
html.inapp .foot #prev { width: 58px; height: 58px; margin: 0; border: 0 !important; border-radius: 20px; background: var(--gdim) !important; color: var(--gink) !important; box-shadow: none !important; font-size: 26px; }
html.inapp .foot #next { flex: 1; width: auto !important; height: 58px !important; margin-left: auto; border: 0 !important; border-radius: 20px; background: var(--gdim) !important; color: var(--gink) !important; box-shadow: none !important; font-size: 0 !important; opacity: .55; animation: none !important; transition: background .3s, opacity .3s, transform .2s; }
html.inapp .foot #next::after { content: '${T.fr.go}  →'; font: 700 21px 'Fredoka', 'Comic Neue', system-ui, sans-serif; }
html[lang=en].inapp .foot #next::after { content: '${T.en.go}  →'; }
html.inapp .foot #next.on { opacity: 1; background: var(--feel) !important; color: var(--feelink) !important; box-shadow: 0 5px 0 rgba(0, 0, 0, .2), 0 0 24px color-mix(in srgb, var(--feel) 60%, transparent) !important; animation: feelready 1.8s ease-in-out infinite !important; }
@keyframes feelready { 50% { transform: scale(1.03); } }
html.inapp .foot #next:active, html.inapp .foot #prev:active, html.inapp .feeltop .home:active, html.inapp .feeltop #replay:active { transform: scale(.94); }
html.inapp .hint { position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 100px); z-index: 19; transform: translateX(-50%); width: max-content; max-width: 92vw; height: auto !important; min-height: 0 !important; padding: 9px 16px; border-radius: 999px; background: var(--glass); color: var(--gink) !important; text-shadow: none !important; font: 700 17px 'Fredoka', 'Comic Neue', system-ui, sans-serif !important; box-shadow: 0 8px 20px rgba(0, 0, 0, .22); white-space: normal; text-align: center; }
html.inapp .hint:not(.on) { visibility: hidden; }
html.inapp .hint.on { animation: feelhint 2s ease-in-out infinite !important; }
@keyframes feelhint { 0%, 100% { transform: translateX(-50%); } 50% { transform: translate(-50%, -3px); } }
html.inapp .endcard::before { background: color-mix(in srgb, var(--rbg) 88%, transparent) !important; }
html.inapp .endcard { color: var(--gink); }
html.inapp .endcard .btn { border-radius: 20px !important; border: 0 !important; box-shadow: 0 5px 0 rgba(0,0,0,.18) !important; font-family: 'Fredoka', 'Comic Neue', system-ui, sans-serif; }
html.inapp .endcard .btn.main { background: var(--feel) !important; color: var(--feelink) !important; }
html.inapp .endcard .btn:not(.main) { background: var(--glass) !important; color: var(--gink) !important; }
`;
document.head.append(css);

// the progress segments at the top: the pages already read are filled too
const dots = () => document.getElementById('dots');
const markPast = () => { const d = dots(); if (!d) return; let past = true; for (const i of d.children) { if (i.classList.contains('on')) past = false; i.classList.toggle('past', past); } };
if (inApp) { const top = () => { const h = document.querySelector('.foot .home'), r = document.getElementById('replay'), d = dots(); if (!h || document.querySelector('.feeltop')) return; const bar = document.createElement('div'); bar.className = 'feeltop'; bar.append(h, ...(d ? [d] : []), ...(r ? [r] : [])); document.body.append(bar); }; document.readyState === 'loading' ? addEventListener('DOMContentLoaded', top) : top(); }
{ const watch = () => { const d = dots(); if (d) new MutationObserver(markPast).observe(d, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); }; document.readyState === 'loading' ? addEventListener('DOMContentLoaded', watch) : watch(); }

let lastTouch = performance.now(), lastNudge = 0;
addEventListener('pointerdown', (e) => { lastTouch = performance.now(); buzz(e.target.closest?.('button, a, .spot, .choice') ? 30 : 15); }, { capture: true });
setInterval(() => { // stuck for a while: the spots still to touch pulse
  const now = performance.now(); if (now - lastTouch < 10000 || now - lastNudge < 7000) return;
  const todo = document.querySelectorAll('#spots .spot:not(.done)'); if (!todo.length) return;
  lastNudge = now; for (const s of todo) { s.classList.remove('nudge'); void s.offsetWidth; s.classList.add('nudge'); }
}, 1000);

// a story left in the middle opens where the child stopped: the cover says so, with a way to start again
let restart = false;
const saved = () => { const p = read()[ID]; return p && p.at > 0 && p.of > 1 && p.at < p.of ? p : null; };
const RT = { fr: { at: (a, n) => `On reprend à la page ${a} sur ${n}`, again: 'Recommencer au début', fresh: 'On recommence au début' }, en: { at: (a, n) => `We'll pick up at page ${a} of ${n}`, again: 'Start from the beginning', fresh: 'Starting from the beginning' } };
{ const banner = () => {
    const p = saved(), me = document.getElementById('readMe'); if (!p || !me || document.querySelector('.feelresume')) return;
    const box = document.createElement('div'); box.className = 'feelresume';
    const draw = () => { const L = RT[H.lang === 'en' ? 'en' : 'fr']; box.innerHTML = restart ? `<b>↺ ${L.fresh}</b>` : `<b>📖 ${L.at(p.at + 1, p.of)}</b><button type="button">↺ ${L.again}</button>`; const b = box.querySelector('button'); if (b) b.onclick = (e) => { e.stopPropagation(); restart = true; buzz(30); draw(); }; };
    draw(); me.before(box); new MutationObserver(draw).observe(H, { attributes: true, attributeFilter: ['lang'] });
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', banner) : banner(); }
css.textContent += `
.feelresume { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 2px auto 10px; padding: 10px 16px; max-width: 340px; border-radius: 18px; background: rgba(255, 255, 255, .92); color: #2d2150; font: 700 16px 'Fredoka', 'Comic Neue', system-ui, sans-serif; box-shadow: 0 6px 18px rgba(0, 0, 0, .25); text-align: center; }
.feelresume button { border: 0; background: none; color: #c4502f; font: 700 15px 'Nunito', 'Comic Neue', system-ui, sans-serif; text-decoration: underline; cursor: pointer; padding: 4px 8px; }
`;

export const feel = {
  // the page to open on: where the child stopped, unless they asked to start again
  resume(panels) { const p = saved(); return !restart && p && p.at < panels.length ? p.at : 0; },
  sfx(n) { if (!QUIET.test(n)) buzz(HAPPY.test(n) ? [45, 60, 70] : 30); },
  page(i, n) { const all = read(), p = all[ID] || {}; p.at = i; p.of = n; p.t = Date.now(); all[ID] = p; write(all); },
  end(lang) {
    const all = read(), p = all[ID] || {}, first = !p.done; p.done = (p.done || 0) + 1; p.at = 0; p.t = Date.now(); all[ID] = p; write(all); buzz([60, 80, 60, 80, 120]);
    const L = T[lang] || T.fr, card = document.getElementById('endcard');
    if (first) { // the first time: a sticker for the album (the story's own picture)
      const img = document.querySelector('#panel img.art, .cover img, img')?.getAttribute('src');
      const s = document.createElement('div'); s.className = 'feelsticker'; s.innerHTML = `<i style="background-image:url(${img || ''})"></i>${L.sticker}`;
      document.body.append(s); requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on'))); setTimeout(() => { s.classList.remove('on'); setTimeout(() => s.remove(), 700); }, 2600);
    }
    const nx = NEXT[ID];
    if (nx && card && !card.querySelector('.feelnext')) {
      const a = document.createElement('a'); a.className = 'btn main feelnext'; a.href = `../${nx}/?lang=${lang}`; a.textContent = `${L.next} →`;
      (card.querySelector('.btn.main') || card.lastElementChild)?.before(a);
    }
  },
};
// the child picks a path: make it plain which one (the button, and the choice written big), then go on
export function picked(btn) {
  btn.classList.add('picked'); for (const b of btn.parentNode.querySelectorAll('.choice')) if (b !== btn) b.classList.add('unpicked');
  buzz([60, 50, 90]);
  const lab = document.createElement('div'); lab.className = 'feelpick'; lab.innerHTML = `✓ ${btn.textContent}`;
  document.body.append(lab); requestAnimationFrame(() => requestAnimationFrame(() => lab.classList.add('on')));
  return new Promise((r) => setTimeout(() => { lab.classList.remove('on'); setTimeout(() => lab.remove(), 400); r(); }, 1400));
}
