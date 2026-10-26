// The portal speaks French or English. The language comes from ?lang=, else the last choice (shared with the
// stories, which keep it as contes-lang), else the phone's. Only the name UNFOLD WORLDS never changes.
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const pick = (l) => (['fr', 'en'].includes(l) ? l : null);
export let lang = pick(new URLSearchParams(location.search).get('lang')) || pick(store.get('uw-lang')) || pick(store.get('contes-lang')) || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
document.documentElement.lang = lang;

const subs = [];
// run now and again every time the language changes
export function onLang(f) { subs.push(f); f(lang); }
export function setLang(l) {
  if (!pick(l) || l === lang) return;
  lang = l; store.set('uw-lang', l); store.set('contes-lang', l); document.documentElement.lang = l;
  for (const f of subs) f(l);
}
// fill every [data-i18n] element (and [data-i18n-ph] placeholder) of the page from a { fr: {…}, en: {…} } table
export function apply(T) {
  onLang((l) => {
    for (const el of document.querySelectorAll('[data-i18n]')) { const v = T[l][el.dataset.i18n]; if (v != null) el.innerHTML = v; }
    for (const el of document.querySelectorAll('[data-i18n-ph]')) { const v = T[l][el.dataset.i18nPh]; if (v != null) el.placeholder = v; }
    if (T[l].title) document.title = T[l].title;
  });
}
// a link to a world in the visitor's language (the stories read ?lang=)
export const withLang = (url) => { try { const u = new URL(url, location.href); if (u.origin === location.origin) u.searchParams.set('lang', lang); return u.href; } catch { return url; } };
