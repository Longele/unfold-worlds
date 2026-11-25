// The stories app's offline worker. The library and what every page needs (the shell) are kept and refreshed in
// the background; a story the family downloaded (from the library page, into its own cache "tale-<id>-<version>")
// plays from the phone with no network. Sounds and videos ask for byte ranges: those are cut from the stored file.
// Anything not downloaded comes from the network as usual. Nothing about the family is stored or sent.
const SHELL = 'contes-shell';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const list = await fetch('files.json', { cache: 'reload' }).then((r) => r.json()).then((j) => j.shell).catch(() => ['./', 'index.html']);
    const c = await caches.open(SHELL);
    await Promise.all(list.map((p) => fetch(p, { cache: 'reload' }).then((r) => (r.ok ? c.put(new URL(p, self.registration.scope).href, r) : null)).catch(() => {})));
  })());
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const OPT = { ignoreSearch: true, ignoreVary: true };
const inShell = async (req) => (await caches.open(SHELL)).match(req, OPT);

// a byte range cut from a stored file (audio and video players ask for these)
async function ranged(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  if (!m) return new Response(buf, { status: 200, headers: res.headers });
  let a = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]), b = m[1] !== '' && m[2] !== '' ? Number(m[2]) : size - 1;
  b = Math.min(b, size - 1); if (a > b) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
}
// shell files: answer from the phone at once, and fetch a fresh copy for next time
function refresh(req) {
  return fetch(req.url, { cache: 'no-cache' }).then(async (r) => { if (r.ok && r.status === 200) await (await caches.open(SHELL)).put(req.url.split('?')[0], r); return r; }).catch(() => null);
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/files.json')) { // the list of versions: always the latest when there is a network
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(async (r) => { if (r.ok) await (await caches.open(SHELL)).put(new URL('files.json', self.registration.scope).href, r.clone()); return r; }).catch(async () => (await inShell(req)) || new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (req.mode === 'navigate') { // pages: the network first (always the latest story), the phone's copy without network
    e.respondWith((async () => {
      try { const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]); return r; } catch {}
      const hit = (await caches.match(req, OPT)) || (await caches.match(new URL('index.html', req.url).href, OPT));
      return hit || new Response('<meta charset="utf-8"><body style="background:#140a05;color:#fbf1e2;font:20px Georgia;padding:40px">Pas de réseau. Cette histoire n’est pas encore téléchargée.</body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }
  e.respondWith((async () => {
    const shell = await inShell(req);
    if (shell) { e.waitUntil(refresh(req)); return req.headers.has('range') ? ranged(req, shell) : shell; }
    const hit = await caches.match(req, OPT);
    if (hit) return req.headers.has('range') ? ranged(req, hit) : hit;
    try { return await fetch(req); } catch { return new Response('', { status: 504 }); }
  })());
});
