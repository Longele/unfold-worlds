// The stories app, on the library page: install it on the phone, and download stories to play them with no network.
// files.json (made by contes-src/app/build_files.py) lists each story's files, sizes and version. A downloaded
// story lives in its own cache "tale-<id>-<version>", marked complete by a last entry; a newer version replaces it
// by itself when the library opens online. sw.js answers from these caches.
const BASE = new URL('./', import.meta.url);
export const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
export const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canOffline = 'serviceWorker' in navigator && 'caches' in window;

export function register() {
  if (!canOffline) return Promise.resolve(null);
  return navigator.serviceWorker.register(new URL('sw.js', BASE), { scope: BASE.pathname }).catch((e) => { console.warn('offline worker', e); return null; });
}

let list = null;
export async function files() {
  if (list) return list;
  try { list = await fetch(new URL('files.json', BASE)).then((r) => r.json()); } catch { list = {}; }
  return list;
}
const cname = (t) => `tale-${t.id}-${t.v}`;
const doneUrl = (t) => new URL(`__done__/${t.id}`, BASE).href;

// 'ready' (this version is on the phone), 'old' (an older version is), or 'none'
export async function status(t) {
  if (!canOffline) return 'none';
  const keys = await caches.keys();
  if (keys.includes(cname(t)) && (await (await caches.open(cname(t))).match(doneUrl(t)))) return 'ready';
  for (const k of keys) if (k.startsWith(`tale-${t.id}-`) && (await (await caches.open(k)).match(doneUrl(t)))) return 'old';
  return 'none';
}

const running = new Map();
// download every file of a story (four at a time), then mark it complete and drop older versions
export function download(t, onProgress = () => {}) {
  if (running.has(t.id)) return running.get(t.id);
  const job = (async () => {
    try { await navigator.storage?.persist?.(); } catch {}
    const c = await caches.open(cname(t)); let got = 0; const todo = [...t.files];
    const one = async () => {
      for (let f = todo.shift(); f; f = todo.shift()) {
        const u = new URL(f.p, BASE).href;
        if (!(await c.match(u))) {
          let r = null; for (let i = 0; i < 3 && !(r && r.ok); i++) { try { r = await fetch(u, { cache: 'reload' }); } catch { r = null; } }
          if (!r || !r.ok) throw new Error('download failed: ' + f.p);
          await c.put(u, r);
        }
        got += f.s; onProgress(Math.min(1, got / t.size));
      }
    };
    await Promise.all([one(), one(), one(), one()]);
    await c.put(doneUrl(t), new Response(t.v));
    for (const k of await caches.keys()) if (k.startsWith(`tale-${t.id}-`) && k !== cname(t)) await caches.delete(k);
  })();
  running.set(t.id, job); job.finally(() => running.delete(t.id));
  return job;
}
export async function remove(t) { for (const k of await caches.keys()) if (k.startsWith(`tale-${t.id}-`)) await caches.delete(k); }
export async function used() { try { const e = await navigator.storage.estimate(); return e.usage || 0; } catch { return 0; } }
