// Unfold Worlds — public settings. The publishable key is meant to live in the browser:
// what each visitor can read or write is decided by Row Level Security in the database.
export const SUPABASE_URL = 'https://pyjqbnsuspmatwtgxgga.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_cYzfcf4DCauSUZDLLk7iGg_FkL0scIl';

// 'implicit': the e-mail link carries the session itself, so it works even when it is opened in another
// browser (mail apps open links in their own in-app browser, which broke the PKCE code exchange).
let client = null;
export function sb() {
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
  return client;
}
export const site = () => new URL('.', location.href).href;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'projet';
