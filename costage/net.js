// CO-STAGE link, built on the UNISSON transport (Supabase Realtime broadcast):
//   cs-<ROOM>-up        phones -> screen. Phones post over HTTPS without joining: a phone never receives the others.
//   cs-<ROOM>-d         screen -> everyone (phones and régie): the show state, one message for the whole room.
//   cs-<ROOM>-c-<KEY>   régie -> screen. KEY is random and only the régie and the screen know it (it travels in the
//                       screen's URL fragment), so nobody in the audience can find this channel to send orders.
// Time: phones measure their offset to the screen's clock (best of several round trips); cues are dated in the
// future, so every phone in the room changes on the same frame.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randCode = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHA[b % ALPHA.length]).join('');
export const cleanRoom = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const topic = (room, k) => `cs-${room}-${k}`;

let loading = null, client = null;
function rt() {
  if (client) return Promise.resolve(client);
  return (loading ||= new Promise((res, rej) => {
    const go = () => { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'cs-rt' }, realtime: { params: { eventsPerSecond: 40 } } }); res(client); };
    if (window.supabase) return go();
    const s = document.createElement('script');
    s.src = new URL('../lib/supabase.js', import.meta.url).href;
    s.onload = go; s.onerror = () => rej(new Error('supabase'));
    document.head.append(s);
  }));
}
const subscribed = (ch) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('realtime')), 20000); ch.subscribe((st) => { if (st === 'SUBSCRIBED') { clearTimeout(t); res(); } }); });

// ---------------------------------------------------------------- the big screen (the show's authority)
export async function screen({ room, key, onPhone, onCommand }) {
  const sb = await rt();
  const up = sb.channel(topic(room, 'up')), down = sb.channel(topic(room, 'd')), cmd = sb.channel(topic(room, `c-${key}`));
  up.on('broadcast', { event: 'u' }, ({ payload }) => onPhone(payload));
  cmd.on('broadcast', { event: 'c' }, ({ payload }) => onCommand(payload));
  await Promise.all([subscribed(up), subscribed(down), subscribed(cmd)]);
  return { send: (payload) => down.send({ type: 'broadcast', event: 'd', payload }), toRegie: (payload) => cmd.send({ type: 'broadcast', event: 'r', payload }) };
}

// ---------------------------------------------------------------- the régie (tablet or laptop at the desk)
// it hears the public state like a phone, plus detailed numbers the screen sends only to it (on the secret channel)
export async function regie({ room, key, onState, onStats }) {
  const sb = await rt();
  const down = sb.channel(topic(room, 'd')), cmd = sb.channel(topic(room, `c-${key}`));
  down.on('broadcast', { event: 'd' }, ({ payload }) => { if (payload.t === 's') onState(payload); });
  cmd.on('broadcast', { event: 'r' }, ({ payload }) => onStats?.(payload));
  await Promise.all([subscribed(down), subscribed(cmd)]);
  return { send: (c) => cmd.send({ type: 'broadcast', event: 'c', payload: c }) };
}

// ---------------------------------------------------------------- a phone in the audience
export async function phone({ room, onMessage }) {
  const sb = await rt();
  const down = sb.channel(topic(room, 'd')), up = sb.channel(topic(room, 'up'));
  let offset = 0, best = Infinity, syncing = null;
  const pongs = new Map();
  down.on('broadcast', { event: 'd' }, ({ payload }) => {
    if (payload.t === 'q') { const r = pongs.get(payload.k); if (r) { pongs.delete(payload.k); r(payload); } return; }
    onMessage(payload);
  });
  await subscribed(down);
  const post = (payload) => up.send({ type: 'broadcast', event: 'u', payload }).catch(() => {});
  async function ping() {
    const k = randCode(6), c = Date.now();
    const got = new Promise((r) => { pongs.set(k, r); setTimeout(() => { pongs.delete(k); r(null); }, 4000); });
    post({ t: 'p', k, c });
    const q = await got; if (!q) return;
    const now = Date.now(), rtt = now - c;
    if (rtt < best * 1.3) { const o = q.h + rtt / 2 - now; offset = best === Infinity ? o : (rtt < best ? o : offset * 0.7 + o * 0.3); best = Math.min(best, rtt); }
  }
  async function sync(n = 6) { if (syncing) return syncing; syncing = (async () => { for (let i = 0; i < n; i++) { await ping(); await new Promise((r) => setTimeout(r, 250)); } })(); await syncing; syncing = null; }
  setInterval(() => { best *= 1.15; ping(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { best = Infinity; sync(4); } });
  return { post, sync, now: () => Date.now() + offset, get rtt() { return best; } };
}
