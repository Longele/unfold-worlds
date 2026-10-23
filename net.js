// Link between the screen and phones over the internet, through our own Supabase Realtime (a WebSocket on
// port 443, like any web page). No direct device-to-device connection, so it works whatever the networks:
// the laptop on the venue Wi-Fi, the phones on 4G or 3G, a guest network, a corporate proxy.
// Channels per room, so the traffic grows with the number of phones, never with its square:
//   uw-<ROOM>-r        presenter remote(s) <-> screen, both ways. Each phone agrees a private key with the
//                      screen (ECDH) and everything after the handshake is sealed (AES-GCM).
//   uw-<ROOM>-up       audience -> screen. Phones post to it over HTTPS without joining, so they never
//                      receive each other's words; only the screen listens.
//   uw-<ROOM>-a        screen -> every audience phone: the vote state, one message for the whole room.
//   uw-<ROOM>-a-<id>   screen -> one audience phone: its own replies.
// The screen decides who may do what (PIN or token it issued for the remote, 3 words per phone).
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randCode = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHA[b % ALPHA.length]).join('');
export const cleanRoom = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loading = null, client = null;
function rt() {
  if (client) return Promise.resolve(client);
  return (loading ||= new Promise((res, rej) => {
    const go = () => { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'uw-rt' }, realtime: { params: { eventsPerSecond: 40 } } }); res(client); };
    if (window.supabase) return go();
    const s = document.createElement('script');
    s.src = new URL('lib/supabase.js', import.meta.url).href;
    s.onload = go; s.onerror = () => rej(new Error('supabase'));
    document.head.append(s);
  }));
}

// ---------------------------------------------------------------- sealing
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const keypair = () => crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
const pubOf = async (kp) => b64(await crypto.subtle.exportKey('raw', kp.publicKey));
async function agree(kp, pub) {
  const k = await crypto.subtle.importKey('raw', unb64(pub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return crypto.subtle.deriveKey({ name: 'ECDH', public: k }, kp.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj)))) };
}
async function unseal(key, { iv, ct }) { return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)))); }

const topic = (room, k) => `uw-${room}-${k}`;
// one socket can hold a topic only once: a page that reconnects first lets go of its previous channel
async function clearTopic(sb, name) { for (const c of sb.getChannels()) if (c.topic === 'realtime:' + name) await sb.removeChannel(c); }

// a tiny event emitter shaped like the data connections the pages already use
function conn(meta) {
  const h = {};
  return { metadata: meta, open: true, on(ev, fn) { (h[ev] ||= []).push(fn); return this; }, emit(ev, x) { for (const fn of h[ev] || []) try { fn(x); } catch (e) { console.warn(e); } } };
}

// ---------------------------------------------------------------- screen
export async function host({ room, onConn, onStatus }) {
  const sb = await rt();
  await clearTopic(sb, topic(room, 'r')); await clearTopic(sb, topic(room, 'up'));
  const kp = await keypair(), pub = await pubOf(kp);
  const peers = new Map(); // cid -> { c, key, queue, rx, hb }
  const ch = sb.channel(topic(room, 'r'), { config: { broadcast: { self: false } } });
  const out = (event, payload) => ch.send({ type: 'broadcast', event, payload }).catch(() => {});
  const drop = (cid, tell = true) => {
    const p = peers.get(cid); if (!p) return;
    peers.delete(cid); p.c.open = false;
    if (tell) out('bye', { cid });
    p.c.emit('close');
  };
  ch.on('broadcast', { event: 'hello' }, async ({ payload: { cid, pub: theirs } = {} }) => {
    if (!cid || !theirs) return;
    drop(cid, false); // the same phone again (reload, lost link): start over
    try {
      const key = await agree(kp, theirs);
      peers.set(cid, { key, c: null, queue: Promise.resolve(), rx: Date.now(), hb: 15000 });
      out('ack', { cid, pub });
    } catch {}
  });
  ch.on('broadcast', { event: 'm' }, ({ payload = {} }) => {
    const p = peers.get(payload.cid);
    if (!p) { if (payload.cid) out('who', { cid: payload.cid }); return; } // the screen was reloaded: ask the phone to say hello again
    p.rx = Date.now();
    p.queue = p.queue.then(async () => {
      let d; try { d = await unseal(p.key, payload); } catch { return; }
      if (!p.c) { // first sealed message: who the phone is (role, PIN or token)
        if (!d || d.t !== 'auth') return;
        p.hb = Math.min(60000, Math.max(2000, +d.hb || 3000)) * 4;
        const c = p.c = conn(d.meta || {});
        c.send = (x) => { if (!c.open) return false; seal(p.key, x).then((s) => out('m', { cid: payload.cid, ...s })); return true; };
        c.close = () => drop(payload.cid);
        onConn(c); c.emit('open');
        return;
      }
      if (d && d.t === 'ping') { p.c.send({ t: 'pong' }); return; }
      p.c.emit('data', d);
    });
  });
  ch.on('broadcast', { event: 'bye' }, ({ payload = {} }) => drop(payload.cid, false));
  // a phone that went silent (switched off, out of coverage) is let go
  setInterval(() => { const now = Date.now(); for (const [cid, p] of peers) if (now - p.rx > p.hb) drop(cid); }, 3000);

  // audience: no handshake, no heartbeat; a phone is known from its first message (hello or word)
  const crowd = new Map(), down = new Map(); // cid -> conn, cid -> its reply channel (posted to, never joined)
  const all = sb.channel(topic(room, 'a'));
  const to = (cid) => { let c = down.get(cid); if (!c) { c = sb.channel(topic(room, 'a-' + cid)); down.set(cid, c); } return c; };
  const member = (cid) => {
    let c = crowd.get(cid);
    if (c) return [c, false];
    c = conn({ role: 'audience' });
    c.send = (x) => { to(cid).send({ type: 'broadcast', event: 'm', payload: x }).catch(() => {}); return true; };
    c.close = () => { crowd.delete(cid); c.open = false; c.emit('close'); };
    crowd.set(cid, c);
    return [c, true];
  };
  const up = sb.channel(topic(room, 'up'));
  up.on('broadcast', { event: 'ah' }, ({ payload = {} }) => {
    if (typeof payload.cid !== 'string' || payload.cid.length > 32) return;
    const [c, fresh] = member(payload.cid);
    if (fresh) { onConn(c); c.emit('open'); } else c.emit('data', { t: 'hello' }); // back from another app: the current state again
  });
  up.on('broadcast', { event: 'aw' }, ({ payload = {} }) => {
    if (typeof payload.cid !== 'string' || payload.cid.length > 32) return;
    const [c, fresh] = member(payload.cid);
    if (fresh) { onConn(c); c.emit('open'); }
    c.emit('data', payload.d);
  });
  up.subscribe();

  await new Promise((res, rej) => {
    let first = true;
    const to = setTimeout(() => { if (first) { onStatus?.('offline'); rej(new Error('realtime')); } }, 15000);
    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') { onStatus?.('ready'); if (first) { first = false; clearTimeout(to); res(); } }
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') onStatus?.('reconnecting');
    });
  });
  return {
    // one message to every audience phone (the vote state), however many people are in the room
    broadcast: (d) => all.send({ type: 'broadcast', event: 'all', payload: d }).catch(() => {}),
  };
}

// ---------------------------------------------------------------- phone
// The phone says hello every few seconds until the screen answers, then keeps a heartbeat. When the phone
// comes back from another app it checks at once and starts over if the screen does not answer.
export async function join(opts) {
  if (opts.meta().role === 'audience') return joinAudience(opts);
  const { room, meta, onMessage, onStatus, hb = 3000 } = opts;
  const sb = await rt();
  await clearTopic(sb, topic(room, 'r'));
  const cid = randCode(16);
  let kp = null, key = null, ready = false, closed = false, lastPong = 0, helloT = 0, gen = 0;
  const ch = sb.channel(topic(room, 'r'), { config: { broadcast: { self: false } } });
  const out = (event, payload) => ch.send({ type: 'broadcast', event, payload }).catch(() => {});
  let queue = Promise.resolve();
  const send = (d) => { if (!key) return false; const k = key; queue = queue.then(async () => out('m', { cid, ...(await seal(k, d)) })); return true; };

  async function hello() {
    if (closed) return;
    const g = ++gen;
    ready = false; key = null;
    kp = await keypair();
    out('hello', { cid, pub: await pubOf(kp) });
    clearTimeout(helloT);
    helloT = setTimeout(() => { if (g === gen && !ready && !closed) { onStatus?.('no-screen'); hello(); } }, 4000);
  }
  function lost() { if (closed) return; if (ready) onStatus?.('lost'); hello(); }

  ch.on('broadcast', { event: 'ack' }, async ({ payload = {} }) => {
    if (payload.cid !== cid || !kp || ready) return;
    try { key = await agree(kp, payload.pub); } catch { return; }
    ready = true; lastPong = Date.now(); clearTimeout(helloT);
    send({ t: 'auth', meta: meta(), hb });
    onStatus?.('open');
  });
  ch.on('broadcast', { event: 'm' }, ({ payload = {} }) => {
    if (payload.cid !== cid || !key) return;
    const k = key;
    queue = queue.then(async () => {
      let d; try { d = await unseal(k, payload); } catch { return; }
      lastPong = Date.now();
      if (d && d.t === 'pong') return;
      onMessage(d);
    });
  });
  ch.on('broadcast', { event: 'who' }, ({ payload = {} }) => { if (payload.cid === cid) lost(); });
  ch.on('broadcast', { event: 'bye' }, ({ payload = {} }) => { if (payload.cid === cid && ready) lost(); });

  await new Promise((res, rej) => {
    let first = true;
    const to = setTimeout(() => { if (first) rej(new Error('realtime')); }, 15000);
    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') { if (first) { first = false; clearTimeout(to); res(); } hello(); } // (re)subscribed after a network change: handshake again
      else if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') && ready) { ready = false; onStatus?.('lost'); }
    });
  });

  const beat = setInterval(() => {
    if (closed || !ready) return;
    if (Date.now() - lastPong > hb * 3 + 2000) return lost();
    send({ t: 'ping' });
  }, hb);
  function check() {
    if (closed || document.visibilityState === 'hidden') return;
    if (!ready) return hello();
    const t = Date.now(); send({ t: 'ping' });
    setTimeout(() => { if (ready && lastPong < t) lost(); }, 2500);
  }
  const onVis = () => check();
  document.addEventListener('visibilitychange', onVis);
  addEventListener('pageshow', onVis); addEventListener('online', onVis); addEventListener('focus', onVis);
  return {
    send: (m) => (ready ? send(m) : (check(), false)),
    get open() { return ready; },
    check,
    close() {
      closed = true; clearInterval(beat); clearTimeout(helloT);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pageshow', onVis); removeEventListener('online', onVis); removeEventListener('focus', onVis);
      (ready ? out('bye', { cid }) : Promise.resolve()).finally(() => sb.removeChannel(ch));
    },
  };
}

// ---------------------------------------------------------------- audience phone
// Light on purpose (3G, hundreds of phones): listen to the room's vote state and to its own replies,
// post words over HTTPS. Coming back from another app asks the screen for the current state again.
async function joinAudience({ room, onMessage, onStatus }) {
  const sb = await rt();
  const cid = randCode(16);
  for (const k of ['a', 'a-' + cid, 'up']) await clearTopic(sb, topic(room, k));
  let heard = false, closed = false, helloT = 0;
  const me = sb.channel(topic(room, 'a-' + cid)), all = sb.channel(topic(room, 'a')), up = sb.channel(topic(room, 'up'));
  const got = (d) => { if (!heard) { heard = true; onStatus?.('open'); } clearTimeout(helloT); onMessage(d); };
  me.on('broadcast', { event: 'm' }, ({ payload }) => got(payload));
  all.on('broadcast', { event: 'all' }, ({ payload }) => got(payload));
  const post = (event, payload) => up.send({ type: 'broadcast', event, payload }).then((r) => r === 'ok').catch(() => false);
  function hello() {
    if (closed) return;
    post('ah', { cid });
    clearTimeout(helloT);
    helloT = setTimeout(() => { if (!closed) { if (!heard) onStatus?.('no-screen'); hello(); } }, heard ? 15000 : 5000);
  }
  await new Promise((res, rej) => {
    let first = true;
    const t = setTimeout(() => { if (first) rej(new Error('realtime')); }, 20000);
    me.subscribe((st) => { if (st === 'SUBSCRIBED') { if (first) { first = false; clearTimeout(t); res(); } hello(); } });
    all.subscribe();
  });
  const check = () => { if (!closed && document.visibilityState !== 'hidden') hello(); };
  document.addEventListener('visibilitychange', check);
  addEventListener('pageshow', check); addEventListener('online', check);
  return {
    send: (d) => { post('aw', { cid, d }); return true; },
    get open() { return heard; },
    check,
    close() {
      closed = true; clearTimeout(helloT);
      document.removeEventListener('visibilitychange', check); removeEventListener('pageshow', check); removeEventListener('online', check);
      sb.removeChannel(me); sb.removeChannel(all); sb.removeChannel(up);
    },
  };
}
