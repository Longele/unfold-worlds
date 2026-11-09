// La Grande Chasse speaks French or English: ?lang=, else the language chosen on unfoldworlds.com, else the phone's.
// t(fr, en) picks the right words in code; in the page, an element's data-en (and data-en-alt, data-en-aria,
// data-en-ph) replaces its French text when the game is in English.
const ok = (l) => (l === 'fr' || l === 'en' ? l : null);
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const LANG = ok(new URLSearchParams(location.search).get('lang')) || ok(get('uw-lang')) || ((navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en');
export const EN = LANG === 'en';
export const t = (fr, en) => (EN ? en : fr);
export function translatePage() {
  document.documentElement.lang = LANG;
  if (!EN) return;
  for (const e of document.querySelectorAll('[data-en]')) e.innerHTML = e.dataset.en;
  for (const e of document.querySelectorAll('[data-en-alt]')) e.alt = e.dataset.enAlt;
  for (const e of document.querySelectorAll('[data-en-aria]')) e.setAttribute('aria-label', e.dataset.enAria);
  for (const e of document.querySelectorAll('[data-en-href]')) e.href = e.dataset.enHref;
  document.title = "Pixo's Great Hunt";
}
export function switchLang(l) {
  try { localStorage.setItem('uw-lang', l); } catch {}
  const u = new URL(location.href); u.searchParams.set('lang', l); location.replace(u.href);
}
