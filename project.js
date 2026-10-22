// Loads one presentation for the player: ?w=<slug> (public, or private for its owner / admins),
// ?t=<share token> (unlisted link), or the older ?p=<company>/<slug>. Scene HTML comes from the database, so it is sanitised
// before it ever reaches the page.
import { sb } from './config.js';

const PURIFY = { USE_PROFILES: { html: true, svg: true, svgFilters: true }, ADD_ATTR: ['pathLength', 'stroke-linecap', 'stroke-linejoin', 'transform-origin'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] };

function failCard(title, text) {
  document.getElementById('begin').innerHTML = `<div class="setup"><div class="brandmark" style="font-size:clamp(40px,7vw,90px)">UNFOLD</div><div class="mono sub" style="margin-top:28px;font-size:14px">${title}</div><p style="font-size:24px;font-style:italic;color:var(--fg-dim);max-width:30em;margin:18px auto 0">${text}</p><p style="margin-top:34px;display:flex;gap:28px;justify-content:center"><a href="login.html?next=${encodeURIComponent(location.pathname + location.search)}" style="color:var(--acc2);font-family:var(--mono);font-size:13px;letter-spacing:.2em">SE CONNECTER</a><a href="./" style="color:var(--fg-dim);font-family:var(--mono);font-size:13px;letter-spacing:.2em">UNFOLD WORLDS</a></p></div>`;
  document.body.classList.add('fail');
}

// the countdown scene keeps working from data: { timer: minutes }
function withTimer(sc) {
  if (!sc.timer) return sc;
  return {
    ...sc,
    onStep(i, el, st) {
      if (i < 1 || st.timer) return;
      const end = Date.now() + sc.timer * 60000, clock = el.querySelector('#clock');
      const tick = () => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); if (clock) clock.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
      tick(); st.timer = setInterval(tick, 500);
    },
    onExit(st) { clearInterval(st.timer); st.timer = null; },
  };
}

export async function loadProject() {
  const q = new URLSearchParams(location.search);
  const ref = q.get('p'), token = q.get('t'), w = q.get('w');
  let row = null, error = null;
  try {
    if (w) {
      ({ data: row, error } = await sb().from('projects').select('*').eq('slug', w).maybeSingle());
    } else if (token) {
      ({ data: row, error } = await sb().rpc('project_by_token', { p_token: token }).maybeSingle());
    } else if (ref && ref.includes('/')) {
      const [org, slug] = ref.split('/');
      ({ data: row, error } = await sb().from('projects').select('*, organizations!inner(slug, name)').eq('slug', slug).eq('organizations.slug', org).maybeSingle());
    }
  } catch (e) { error = e; }
  if (error) { failCard('Connexion impossible', 'Le monde n’a pas pu être chargé. Vérifiez la connexion internet, puis rechargez la page.'); throw error; }
  if (!row) { failCard('Présentation privée ou introuvable', 'Connectez-vous avec le compte qui y a accès.'); throw new Error('not found'); }

  if (row.external_url) { location.replace(row.external_url); await new Promise(() => {}); } // an immersive site lives elsewhere
  const c = row.content || {};
  const scenes = (c.scenes || []).map((sc) => withTimer({ ...sc, html: window.DOMPurify.sanitize(sc.html || '', PURIFY) }));
  if (!scenes.length) { failCard('Monde vide', 'Ce projet n’a pas encore de scènes.'); throw new Error('empty'); }

  document.title = row.title;
  const brand = c.brand || row.title.toUpperCase();
  const bm = document.querySelector('.brandmark'); if (bm) bm.textContent = brand;
  const sub = document.querySelector('.setup .sub'); if (sub) sub.textContent = [row.title, row.author].filter(Boolean).join(' · ');
  return { id: row.id, title: row.title, author: row.author, brand, parts: c.parts || {}, budgets: c.budgets || {}, scenes };
}
