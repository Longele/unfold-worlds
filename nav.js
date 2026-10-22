// One menu for every portal page, shaped by who is looking:
//   visitor      Explorer · Se connecter
//   member       Explorer · Mes mondes · [name, role ▾]
//   super-admin  Explorer · Mes mondes · Console · [name, role ▾]
// The account chip shows the person's name and role; the e-mail only appears inside its menu.
import { sb, esc } from './config.js';

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
  const link = (href, label, key) => `<a class="navlink${active === key ? ' on' : ''}" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  let h = link('./#mondes', 'Explorer', 'explore');
  if (!user) {
    h += active === 'login' ? '' : '<a class="btn small gold" href="login.html">Se connecter</a>';
  } else {
    h += link('app.html', 'Mes mondes', 'mine');
    if (isSuper) h += link('admin.html', 'Console', 'console');
    const name = displayName(user);
    h += `<div class="acct"><button class="acct-btn" aria-haspopup="true" aria-expanded="false"><span class="av">${esc(initials(name))}</span><span class="who"><b>${esc(name)}</b><small>${isSuper ? 'Super-admin' : 'Membre'}</small></span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="acct-menu" role="menu"><div class="acct-mail">${esc(user.email)}</div><a role="menuitem" href="app.html#compte">Mon compte</a><button role="menuitem" data-out>Déconnexion</button></div></div>`;
  }
  nav.innerHTML = h;
  const acct = nav.querySelector('.acct');
  if (acct) {
    const btn = acct.querySelector('.acct-btn');
    const set = (on) => { acct.classList.toggle('open', on); btn.setAttribute('aria-expanded', on); };
    btn.onclick = (e) => { e.stopPropagation(); set(!acct.classList.contains('open')); };
    document.addEventListener('click', (e) => { if (!acct.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    acct.querySelector('[data-out]').onclick = async () => { await sb().auth.signOut(); location.replace('./'); };
  }
  return { session, user, isSuper };
}
