// Link between the screen and phones over the internet, with no server of our own: WebRTC data channels
// brokered by the public PeerJS service (STUN + TURN included), so it works from a static host
// (GitHub Pages) and the phone does not need to be on the same Wi-Fi as the screen.
//   screen  = host(room)      -> peer id "unfold-world-<ROOM>"
//   phone   = join(room, meta) where meta.role is 'remote' (presenter) or 'audience' (live words)
// The screen decides who may do what: remotes must prove a one-time PIN or a token it issued.

const PREFIX = 'unfold-world-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randCode = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHA[b % ALPHA.length]).join('');
export const cleanRoom = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loading = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  return (loading ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('lib/peerjs.min.js', import.meta.url).href;
    s.onload = res; s.onerror = () => rej(new Error('peerjs'));
    document.head.append(s);
  }));
}

// The broker link (not the phone links) can drop on a Wi-Fi blip or a sleeping laptop. Data channels
// already open survive that, but new phones could no longer find the screen: keep the id alive.
export async function host({ room, onConn, onStatus }) {
  await loadPeer();
  let peer;
  const make = async () => {
    for (let tries = 0; ; tries++) {
      let p;
      try {
        p = new window.Peer(PREFIX + room, { debug: 0 });
        await new Promise((res, rej) => {
          const to = setTimeout(() => rej(Object.assign(new Error('timeout'), { type: 'timeout' })), 12000);
          p.on('open', () => { clearTimeout(to); res(); });
          p.on('error', (e) => { clearTimeout(to); rej(e); });
        });
        return p;
      } catch (e) {
        p?.destroy();
        // after a reload the broker can hold the old id for a few seconds
        if (e.type === 'unavailable-id' && tries < 5) { await sleep(2500); continue; }
        if (e.type === 'unavailable-id') { onStatus?.('id-taken'); throw e; }
        if (tries < 3) { await sleep(2000); continue; }
        onStatus?.('offline'); throw e;
      }
    }
  };
  const wire = (p) => {
    p.on('connection', (c) => onConn(c));
    p.on('disconnected', () => { onStatus?.('reconnecting'); setTimeout(() => !p.destroyed && p.disconnected && p.reconnect(), 1200); });
    p.on('open', () => onStatus?.('ready'));
    p.on('error', (e) => console.warn('[peer]', e.type));
  };
  peer = await make(); wire(peer);
  let reviving = false;
  setInterval(async () => {
    if (reviving || !(peer.destroyed || peer.disconnected)) return;
    reviving = true;
    try {
      if (!peer.destroyed) peer.reconnect();
      else { const p = await make(); wire(p); peer = p; onStatus?.('ready'); }
    } catch {} finally { reviving = false; }
  }, 4000);
  addEventListener('online', () => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); });
  onStatus?.('ready');
  return peer;
}

// A phone that goes to another app gets frozen by its OS: the link can die without any 'close' event and
// still look open. So the phone pings the screen every 2 s and treats 6 s of silence as a lost link; on
// coming back to the page it checks at once and, if the screen does not answer within 1.5 s, rebuilds
// everything (a new broker id if needed, then a new channel). The token makes the screen take it back.
export async function join({ room, meta, onMessage, onStatus }) {
  await loadPeer();
  let peer = null, conn = null, closed = false, dialing = false, rt = 0, lastRx = 0;
  const newPeer = () => new Promise((res, rej) => {
    const p = new window.Peer({ debug: 0 });
    const to = setTimeout(() => { p.destroy(); rej(new Error('broker')); }, 15000);
    p.on('open', () => { clearTimeout(to); res(p); });
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') { onStatus?.('no-screen'); retry(2000); return; }
      console.warn('[peer]', e.type);
    });
    p.on('disconnected', () => !closed && setTimeout(() => !p.destroyed && p.disconnected && p.reconnect(), 1000));
  });
  peer = await newPeer();
  async function dial() {
    if (closed || dialing || conn) return;
    dialing = true;
    try {
      if (peer.destroyed || peer.disconnected) {
        try { peer.destroy(); } catch {}
        peer = await newPeer();
      }
      const c = peer.connect(PREFIX + room, { reliable: true, serialization: 'json', metadata: meta() });
      const stuck = setTimeout(() => { if (conn !== c) { try { c.close(); } catch {} retry(500); } }, 8000);
      c.on('open', () => { clearTimeout(stuck); if (closed) return c.close(); conn = c; lastRx = Date.now(); onStatus?.('open'); });
      c.on('data', (d) => { if (d && d.t === 'pong') { lastRx = Date.now(); return; } onMessage(d); });
      c.on('close', () => { if (conn === c) { conn = null; onStatus?.('lost'); retry(800); } });
      c.on('error', () => { if (conn === c) conn = null; retry(1500); });
    } catch { retry(2500); }
    finally { dialing = false; }
  }
  function retry(ms = 2000) { if (closed) return; clearTimeout(rt); rt = setTimeout(() => { if (!conn) dial(); }, ms); }
  function lost() {
    const c = conn; conn = null;
    try { c?.close(); } catch {}
    onStatus?.('lost'); retry(0);
  }
  const ping = () => { try { conn.send({ t: 'ping' }); } catch { lost(); } };
  const hb = setInterval(() => {
    if (closed || !conn) return;
    if (Date.now() - lastRx > 6000) return lost();
    ping();
  }, 2000);
  function check() {
    if (closed || document.visibilityState === 'hidden') return;
    if (!conn) { onStatus?.('lost'); return retry(0); }
    const t = Date.now(); ping();
    setTimeout(() => { if (conn && lastRx < t) lost(); }, 1500);
  }
  const onVis = () => check();
  document.addEventListener('visibilitychange', onVis);
  addEventListener('pageshow', onVis);
  addEventListener('online', onVis);
  addEventListener('focus', onVis);
  dial();
  return {
    send: (m) => { if (conn?.open) { try { conn.send(m); return true; } catch { lost(); } } else check(); return false; },
    get open() { return !!conn?.open; },
    check,
    close() {
      closed = true; clearTimeout(rt); clearInterval(hb);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pageshow', onVis); removeEventListener('online', onVis); removeEventListener('focus', onVis);
      try { peer.destroy(); } catch {}
    },
  };
}
