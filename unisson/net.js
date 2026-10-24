// UNISSON link: the big screen and every phone in the room, through our Supabase Realtime.
//   us-<ROOM>-up   phones -> screen. Phones post over HTTPS without joining, so a phone never receives the
//                  other phones' taps (traffic grows with the room, never with its square).
//   us-<ROOM>-d    screen -> every phone: the show state, one message for the whole room.
// Time: each phone measures its offset to the screen's clock (best of several round trips), and the screen
// sends cues dated in the future ("at 21:14:07.500, the drop"). Phones play them on that instant, so the
// whole room changes on the same frame even when the network is slow or uneven.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randCode = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHA[b % ALPHA.length]).join('');
export const cleanRoom = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const topic = (room, k) => `us-${room}-${k}`;

let loading = null, client = null;
function rt() {
  if (client) return Promise.resolve(client);
  return (loading ||= new Promise((res, rej) => {
    const go = () => { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'us-rt' }, realtime: { params: { eventsPerSecond: 40 } } }); res(client); };
    if (window.supabase) return go();
    const s = document.createElement('script');
    s.src = new URL('../lib/supabase.js', import.meta.url).href;
    s.onload = go; s.onerror = () => rej(new Error('supabase'));
    document.head.append(s);
  }));
}
const subscribed = (ch) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('realtime')), 20000); ch.subscribe((st) => { if (st === 'SUBSCRIBED') { clearTimeout(t); res(); } }); });

// ---------------------------------------------------------------- the big screen
export async function screen({ room, onMessage }) {
  const sb = await rt();
  const up = sb.channel(topic(room, 'up')), down = sb.channel(topic(room, 'd'));
  up.on('broadcast', { event: 'u' }, ({ payload }) => onMessage(payload));
  await Promise.all([subscribed(up), subscribed(down)]);
  return { send: (payload) => down.send({ type: 'broadcast', event: 'd', payload }) };
}

// ---------------------------------------------------------------- a phone
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
  // clock: keep the round trip with the smallest delay (its midpoint is the most trustworthy)
  async function ping() {
    const k = randCode(6), c = Date.now();
    const got = new Promise((r) => { pongs.set(k, r); setTimeout(() => { pongs.delete(k); r(null); }, 4000); });
    post({ t: 'p', k, c });
    const q = await got; if (!q) return;
    const now = Date.now(), rtt = now - c;
    if (rtt < best * 1.3) { const o = q.h + rtt / 2 - now; offset = best === Infinity ? o : (rtt < best ? o : offset * 0.7 + o * 0.3); best = Math.min(best, rtt); }
  }
  async function sync(n = 6) { if (syncing) return syncing; syncing = (async () => { for (let i = 0; i < n; i++) { await ping(); await new Promise((r) => setTimeout(r, 250)); } })(); await syncing; syncing = null; }
  setInterval(() => { best *= 1.15; ping(); }, 15000); // the network changes: let a fresh round trip win again
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { best = Infinity; sync(4); } });
  return { post, sync, now: () => Date.now() + offset, get rtt() { return best; } };
}
