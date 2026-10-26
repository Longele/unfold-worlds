// One menu for every portal page, shaped by who is looking:
//   visitor      Explorer · Se connecter · FR/EN
//   member       Explorer · Mes mondes · [name, role ▾]
//   super-admin  Explorer · Mes mondes · Console · [name, role ▾]
// The account chip shows the person's name and role; the e-mail only appears inside its menu.
import { sb, esc } from './config.js';
import { lang, onLang, setLang } from './i18n.js';

const LBL = {
  fr: { explore: 'Explorer', login: 'Se connecter', mine: 'Mes mondes', console: 'Console', superAdmin: 'Super-admin', member: 'Membre', account: 'Mon compte', out: 'Déconnexion' },
  en: { explore: 'Explore', login: 'Sign in', mine: 'My worlds', console: 'Console', superAdmin: 'Super-admin', member: 'Member', account: 'My account', out: 'Sign out' },
};

export const displayName = (u) => (u?.user_metadata?.name || '').trim() || (u?.email || '').split('@')[0];
const initials = (n) => n.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export async function mountNav(active) {
  const nav = document.getElementById('nav');
  const { data: { session } } = await sb().auth.getSession();
  const user = session?.user || null;
  let isSuper = false;
  if (user) {
    const { data } = await sb().from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    isSuper = !!data;
  }
  // the menu is drawn again in the other language when the visitor switches
  onLang(() => draw(nav, active, user, isSuper));
  return { session, user, isSuper };
}

function draw(nav, active, user, isSuper) {
  const L = LBL[lang];
  const link = (href, label, key) => `<a class="navlink${active === key ? ' on' : ''}" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  let h = link('./#mondes', L.explore, 'explore');
  if (!user) {
    h += active === 'login' ? '' : `<a class="btn small gold" href="login.html">${L.login}</a>`;
  } else {
    h += link('app.html', L.mine, 'mine');
    if (isSuper) h += link('admin.html', L.console, 'console');
    const name = displayName(user);
    h += `<div class="acct"><button class="acct-btn" aria-haspopup="true" aria-expanded="false"><span class="av">${esc(initials(name))}</span><span class="who"><b>${esc(name)}</b><small>${isSuper ? L.superAdmin : L.member}</small></span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="acct-menu" role="menu"><div class="acct-mail">${esc(user.email)}</div><a role="menuitem" href="app.html#compte">${L.account}</a><button role="menuitem" data-out>${L.out}</button></div></div>`;
  }
  h += `<div class="lng" role="group" aria-label="Language"><button data-l="fr"${lang === 'fr' ? ' class="on"' : ''}>FR</button><button data-l="en"${lang === 'en' ? ' class="on"' : ''}>EN</button></div>`;
  nav.innerHTML = h;
  for (const b of nav.querySelectorAll('[data-l]')) b.onclick = () => setLang(b.dataset.l);
  const acct = nav.querySelector('.acct');
  if (acct) {
    const btn = acct.querySelector('.acct-btn');
    const set = (on) => { acct.classList.toggle('open', on); btn.setAttribute('aria-expanded', on); };
    btn.onclick = (e) => { e.stopPropagation(); set(!acct.classList.contains('open')); };
    document.addEventListener('click', (e) => { if (!acct.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    acct.querySelector('[data-out]').onclick = async () => { await sb().auth.signOut(); location.replace('./'); };
  }
}
