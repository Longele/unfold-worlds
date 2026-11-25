// Shared by every story: how it feels on a phone, and what the app remembers.
// - a light vibration with each touch and a happy one when something is found (phones that can vibrate);
// - every spot and choice is easier to hit: an invisible margin around it (small fingers miss small targets);
// - a child who seems stuck sees the spots pulse gently after a while;
// - a choice stays clearly picked (it grows, gets a tick, the other one fades) before the story goes on;
// - for the app's library: where the child is in this story, the stories finished, and the next episode at the end.
// Everything stays on the device (localStorage); nothing is sent.
const ID = location.pathname.split('/').filter(Boolean).pop();
const KEY = 'contes-prog';
const NEXT = { lina: 'lina2', nala: 'nala2' };
const T = { fr: { next: 'Épisode suivant', sticker: 'Nouvel autocollant !' }, en: { next: 'Next episode', sticker: 'New sticker!' } };

const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };
const QUIET = /^(page|theme|amb|flutter|whoosh|wind|rain|sea|night)/;
const HAPPY = /found|uncurl|chime|ding|yay|good|win|sparkle|magic|done|bell|tada|cheer|hug|ok/;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} };

const css = document.createElement('style');
css.textContent = `
#spots .spot::before, #spots .choice::before { content: ''; position: absolute; inset: -24%; border-radius: inherit; }
#spots .choice { min-height: 56px; min-width: 120px; transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s, filter .35s; }
#spots .choice.picked { transform: translate(-50%, -50%) scale(1.18) !important; animation: none !important; box-shadow: 0 0 0 6px #fff, 0 0 34px 10px rgba(255, 214, 90, .95) !important; z-index: 3; }
#spots .choice.picked::after { content: '✓'; position: absolute; top: -16px; right: -14px; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: #3cb86a; color: #fff; font-size: 22px; font-weight: 700; border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,.35); }
#spots .choice.unpicked { opacity: .25; filter: grayscale(1); transform: translate(-50%, -50%) scale(.9) !important; animation: none !important; }
#spots .spot.nudge { animation: feelnudge 1.1s ease-in-out 2 !important; }
@keyframes feelnudge { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 230, 140, 0); } 50% { box-shadow: 0 0 0 10px rgba(255, 230, 140, .55), 0 0 30px 12px rgba(255, 230, 140, .45); } }
#endcard .feelnext { display: inline-flex; align-items: center; gap: 10px; margin-top: 12px; }
.feelsticker { position: fixed; left: 50%; top: 22%; z-index: 99; transform: translate(-50%, -50%) scale(.2) rotate(-20deg); opacity: 0; transition: all .6s cubic-bezier(.34,1.56,.64,1); text-align: center; pointer-events: none; font: 700 20px 'Comic Neue', system-ui, sans-serif; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.6); }
.feelsticker i { display: block; width: 120px; height: 120px; margin: 0 auto 8px; border-radius: 50%; background: center/cover; border: 6px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.feelsticker.on { transform: translate(-50%, -50%) scale(1) rotate(-4deg); opacity: 1; }`;
document.head.append(css);

let lastTouch = performance.now(), lastNudge = 0;
addEventListener('pointerdown', (e) => { lastTouch = performance.now(); if (e.target.closest?.('button, a, .spot, .choice')) buzz(8); }, { capture: true });
setInterval(() => { // stuck for a while: the spots still to touch pulse
  const now = performance.now(); if (now - lastTouch < 10000 || now - lastNudge < 7000) return;
  const todo = document.querySelectorAll('#spots .spot:not(.done)'); if (!todo.length) return;
  lastNudge = now; for (const s of todo) { s.classList.remove('nudge'); void s.offsetWidth; s.classList.add('nudge'); }
}, 1000);

export const feel = {
  sfx(n) { if (!QUIET.test(n)) buzz(HAPPY.test(n) ? [18, 60, 30] : 10); },
  page(i, n) { const all = read(), p = all[ID] || {}; p.at = i; p.of = n; p.t = Date.now(); all[ID] = p; write(all); },
  end(lang) {
    const all = read(), p = all[ID] || {}, first = !p.done; p.done = (p.done || 0) + 1; p.at = 0; p.t = Date.now(); all[ID] = p; write(all); buzz([20, 80, 20, 80, 40]);
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
// the child picks a path: make it plain which one, then go on
export function picked(btn) {
  btn.classList.add('picked'); for (const b of btn.parentNode.querySelectorAll('.choice')) if (b !== btn) b.classList.add('unpicked');
  buzz([18, 50, 30]);
  return new Promise((r) => setTimeout(r, 900));
}
