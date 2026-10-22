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

export async function host({ room, onConn, onStatus }) {
  await loadPeer();
  let peer;
  for (let tries = 0; ; tries++) {
    try {
      peer = new window.Peer(PREFIX + room, { debug: 0 });
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(Object.assign(new Error('timeout'), { type: 'timeout' })), 12000);
        peer.on('open', () => { clearTimeout(to); res(); });
        peer.on('error', (e) => { clearTimeout(to); rej(e); });
      });
      break;
    } catch (e) {
      peer.destroy();
      // after a reload the broker can hold the old id for a few seconds
      if (e.type === 'unavailable-id' && tries < 5) { await sleep(2500); continue; }
      if (e.type === 'unavailable-id') { onStatus?.('id-taken'); throw e; }
      if (tries < 3) { await sleep(2000); continue; }
      onStatus?.('offline'); throw e;
    }
  }
  peer.on('connection', (c) => onConn(c));
  peer.on('disconnected', () => { onStatus?.('reconnecting'); setTimeout(() => !peer.destroyed && peer.reconnect(), 1200); });
  peer.on('open', () => onStatus?.('ready'));
  peer.on('error', (e) => console.warn('[peer]', e.type));
  onStatus?.('ready');
  return peer;
}

export async function join({ room, meta, onMessage, onStatus }) {
  await loadPeer();
  let conn = null, closed = false, rt = 0;
  const peer = new window.Peer({ debug: 0 });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('broker')), 15000);
    peer.on('open', () => { clearTimeout(to); res(); });
    peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') { onStatus?.('no-screen'); retry(); return; }
      console.warn('[peer]', e.type);
    });
  });
  peer.on('disconnected', () => !closed && setTimeout(() => !peer.destroyed && peer.reconnect(), 1000));
  function dial() {
    if (closed) return;
    const c = peer.connect(PREFIX + room, { reliable: true, serialization: 'json', metadata: meta() });
    c.on('open', () => { conn = c; onStatus?.('open'); });
    c.on('data', (d) => onMessage(d));
    c.on('close', () => { if (conn === c) { conn = null; onStatus?.('lost'); retry(); } });
    c.on('error', () => retry());
  }
  function retry() { if (closed) return; clearTimeout(rt); rt = setTimeout(() => { if (!conn) dial(); }, 2000); }
  dial();
  return {
    send: (m) => { if (conn?.open) { conn.send(m); return true; } return false; },
    get open() { return !!conn?.open; },
    close() { closed = true; clearTimeout(rt); peer.destroy(); },
  };
}
