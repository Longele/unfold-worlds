// Full screen for the comics, on every phone. Android (Chrome, Samsung Internet, Firefox) gets the real full screen
// with each tap that starts or resumes the story. The iPhone's Safari has no full screen for web pages: there the
// page fills the whole visible screen, and a one-time tip shows how to add the story to the home screen, from where
// it opens with no browser bar at all (the page is a web app for that, see the meta tags and the manifest).
const touch = matchMedia('(pointer: coarse)').matches;
const ios = /iPhone|iPod/.test(navigator.userAgent);
const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// ask for the full screen (only inside a tap; on a laptop the reader stays in its window)
export function goFull() {
  if (!touch || standalone || isFull()) return;
  const el = document.documentElement;
  try { (el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.())?.catch?.(() => {}); } catch {}
  try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {}
}

// back into full screen if the child left it (a swipe from the edge, the back gesture): the next tap restores it
export function keepFull() {
  if (!touch) return;
  addEventListener('pointerdown', () => { if (document.body.classList.contains('reading')) goFull(); }, { capture: true });
}

// the iPhone tip, on the cover, once
export function iosTip(lang) {
  if (!ios || standalone) return;
  try { if (localStorage.getItem('contes-ios-tip')) return; } catch {}
  const t = lang === 'en'
    ? 'Tip for iPhone: tap <b>Share</b>, then <b>Add to Home Screen</b>. The story then opens in full screen.'
    : 'Astuce iPhone : touche <b>Partager</b>, puis <b>Sur l’écran d’accueil</b>. L’histoire s’ouvrira alors en plein écran.';
  const el = document.createElement('div'); el.className = 'iostip'; el.innerHTML = `<span>${t}</span><button aria-label="OK">OK</button>`;
  el.querySelector('button').onclick = () => { el.remove(); try { localStorage.setItem('contes-ios-tip', '1'); } catch {} };
  document.querySelector('.cover .ctx')?.append(el);
}
