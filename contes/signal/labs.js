// Le signal: the investigation labs, plugged into the comic reader as interactions. Each one fills the panel with a
// small instrument the reader works with (finger, mouse or keyboard), and ends when the reader has found or
// understood something. The numbers are the real ones: the 1967 pulsar beats every 1.337 s, a star comes back
// 3 min 56 s earlier each night, the Sun would fly apart if it turned once in less than about 2.8 hours, a white
// dwarf in less than about 13 s, a neutron star only below about a millisecond.
export function labs(env) {
  const { $, sfx, hint, burst, word } = env;
  const fr = () => env.lang() === 'fr';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- sound made here (no files)
  const A = () => env.ctx();
  function tone(f, d, { type = 'sine', v = 0.25, at = 0, slide = 0 } = {}) {
    const c = A(); if (!c) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  let noiseBuf = null;
  function noise(d, { v = 0.3, f = 1800, q = 0.7, at = 0 } = {}) {
    const c = A(); if (!c) return; if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const x = noiseBuf.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; }
    const t = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = noiseBuf; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl).connect(g).connect(c.destination); s.start(t, Math.random()); s.stop(t + d + 0.05);
  }
  // one pulsar beat: a soft thump with a click on top, as radio astronomers play them
  const beat = (v = 0.5) => { tone(90, 0.18, { v: v * 0.6, slide: 0.6 }); noise(0.05, { v: v * 0.5, f: 2400, q: 1.2 }); };
  const wrong = () => { sfx('wrong'); tone(220, 0.15, { type: 'square', v: 0.05 }); };

  // ---------------------------------------------------------------- the lab frame
  // A dark glass panel over the picture with a canvas, a title strip and a row of controls under it.
  function lab(title, { dim = 0.86, ctrl = true } = {}) {
    const el = document.createElement('div'); el.className = 'lab'; el.style.setProperty('--dim', dim);
    el.innerHTML = `<div class="lab-h">${title}</div><canvas class="lab-c"></canvas><div class="lab-ctl"></div>`;
    $('panel').append(el); $('panel').classList.add('labon'); requestAnimationFrame(() => el.classList.add('in'));
    const c = el.querySelector('canvas'), k = c.getContext('2d'), box = el.querySelector('.lab-ctl'); if (!ctrl) box.remove();
    const g0 = env.gen(); let W = 0, H = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; k.setTransform(d, 0, 0, d, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    const o = {
      el, c, k, box, get W() { return W; }, get H() { return H; }, alive: () => env.gen() === g0 && el.isConnected,
      btn(label, cls = '') { const b = document.createElement('button'); b.className = 'lb ' + cls; b.innerHTML = label; box.append(b); return b; },
      info(html) { let i = el.querySelector('.lab-i'); if (!i) { i = document.createElement('div'); i.className = 'lab-i'; el.insertBefore(i, box || null); } i.innerHTML = html; return i; },
      loop(f) { let t0 = performance.now(), last = t0; const step = (now) => { if (!o.alive() || o.closed) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; f(dt, (now - t0) / 1000); requestAnimationFrame(step); }; requestAnimationFrame(step); },
      pos(e) { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; },
      close() { o.closed = true; ro.disconnect(); env.key(null); el.classList.remove('in'); $('panel').classList.remove('labon'); setTimeout(() => el.remove(), 450); hint(''); },
    };
    return o;
  }
  const done = async (L, res, ms = 900) => { sfx('found'); await sleep(ms); L.close(); await sleep(300); res(); };
  const fmt = (x, n = 2) => x.toFixed(n).replace('.', fr() ? ',' : '.');

  // ---------------------------------------------------------------- the suspects notebook (stays on the panel's corner)
  const SUSPECTS = [{ i: '📡', fr: 'Un parasite humain', en: 'Human interference' }, { i: '🔧', fr: 'Une panne', en: 'A fault' }, { i: '⭐', fr: 'Un astre inconnu', en: 'An unknown star' }, { i: '👽', fr: 'Des extraterrestres', en: 'Aliens' }];
  const state = ['', '', '', ''];
  function carnet(show = true) {
    let el = document.getElementById('carnet');
    if (!el) { el = document.createElement('button'); el.id = 'carnet'; $('panel').append(el); el.onpointerdown = (e) => { e.stopPropagation(); el.classList.toggle('open'); }; }
    el.innerHTML = `<b>${fr() ? 'Suspects' : 'Suspects'}</b>` + SUSPECTS.map((s, i) => `<span class="${state[i]}"><i>${s.i}</i><em>${s[env.lang()]}</em></span>`).join('');
    el.classList.toggle('on', show);
  }
  function mark(list, how) { for (const i of list || []) state[i] = how; carnet(); const el = document.getElementById('carnet'); el?.classList.add('open', 'flash'); setTimeout(() => el?.classList.remove('open', 'flash'), 2600); }

  return {
    // ================================================================ the sky's noise from the loudspeaker
    static: (a) => new Promise((res) => {
      hint(fr() ? 'Touche le haut-parleur pour écouter le ciel' : 'Touch the loudspeaker to hear the sky');
      const b = document.createElement('button'); b.className = 'speaker'; b.innerHTML = '<span>🔊</span>'; b.style.left = a.at[0] * 100 + '%'; b.style.top = a.at[1] * 100 + '%'; $('spots').append(b);
      const go = async () => { b.onpointerdown = null; env.key(null); b.classList.add('on'); for (let i = 0; i < 14; i++) { noise(0.35, { v: 0.12 + Math.random() * 0.1, f: 600 + Math.random() * 3000, q: 0.5, at: i * 0.22 }); } if (a.blip) for (const t of [0.9, 2.1]) tone(1200, 0.08, { type: 'square', v: 0.05, at: t }); await sleep(3300); b.remove(); hint(''); res(); };
      b.onpointerdown = (e) => { e.stopPropagation(); go(); }; env.key((e, d) => { if (d && e.key === ' ') { go(); return true; } });
    }),

    // ================================================================ the long recording: find the scruff
    tape: (a) => new Promise((res) => {
      const L = lab(fr() ? 'L’enregistrement de la nuit · 20 h → 6 h' : 'Tonight’s recording · 8 pm → 6 am');
      hint(fr() ? 'Fais défiler la bande avec ton doigt (ou les flèches). Cherche ce qui ne ressemble à rien d’autre.' : 'Slide the tape with your finger (or the arrows). Look for what looks like nothing else.');
      const N = 6000, SCR = 4630, data = new Float32Array(N); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      let wander = 0; for (let i = 0; i < N; i++) { wander += (rnd() - 0.5) * 0.03; wander *= 0.98; data[i] = (rnd() + rnd() + rnd() - 1.5) * 0.22 + wander; }
      // human interference: tall clean spikes in tight groups (a radar, a car, a phone mast)
      for (const at of [700, 1650, 2300, 3400, 5300]) for (let j = 0; j < 6; j++) { const i = at + j * 7; data[i] += (j % 2 ? -1 : 1) * (2.2 + rnd()); }
      // the scruff: a patch of dense, fuzzy, medium flickers
      for (let i = SCR - 40; i < SCR + 40; i++) data[i] += Math.sin(i * 2.7) * (0.9 + rnd() * 0.7) * Math.exp(-Math.pow((i - SCR) / 26, 2));
      let off = 0, held = 0, found = false, vel = 0; const t0 = performance.now();
      const view = () => L.W / 2.4; // samples across the screen
      L.loop((dt) => {
        const k = L.k, W = L.W, H = L.H, cy = H * 0.46, amp = H * 0.11, vw = view();
        off = Math.max(0, Math.min(N - vw, off + vel * dt)); vel *= 0.9;
        k.clearRect(0, 0, W, H);
        // paper strip with a grid
        k.fillStyle = '#f2eedf'; k.fillRect(0, cy - amp * 2.6, W, amp * 5.2);
        k.strokeStyle = 'rgba(70,110,150,.18)'; k.lineWidth = 1;
        for (let s = Math.ceil(off / 25) * 25; s < off + vw; s += 25) { const x = (s - off) / vw * W; k.beginPath(); k.moveTo(x, cy - amp * 2.6); k.lineTo(x, cy + amp * 2.6); k.stroke(); }
        for (let r = -2; r <= 2; r++) { k.beginPath(); k.moveTo(0, cy + r * amp); k.lineTo(W, cy + r * amp); k.stroke(); }
        // the hours
        k.fillStyle = '#5a6b80'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.textAlign = 'center';
        for (let s = 0; s <= N; s += 600) { const x = (s - off) / vw * W; if (x > -40 && x < W + 40) k.fillText(`${(20 + s / 600) % 24} h`, x, cy + amp * 3.2); }
        // the ink line
        k.strokeStyle = '#1d2a4a'; k.lineWidth = 1.6; k.beginPath();
        for (let x = 0; x <= W; x += 1) { const s = off + x / W * vw, i = Math.floor(s), v = data[i] ?? 0; const y = cy - v * amp; x ? k.lineTo(x, y) : k.moveTo(x, y); } k.stroke();
        // the magnifier in the middle: three times closer
        const mx = W / 2, my = cy, R = W * 0.17;
        k.save(); k.beginPath(); k.arc(mx, my, R, 0, 7); k.clip(); k.fillStyle = '#fbf8ee'; k.fillRect(mx - R, my - R, R * 2, R * 2);
        k.strokeStyle = '#1d2a4a'; k.lineWidth = 2.4; k.beginPath(); const zs = vw / 3;
        for (let x = -R; x <= R; x += 1) { const s = off + vw / 2 + (x / W) * zs, i = Math.floor(s), v = data[i] ?? 0; const y = my - v * amp * 2.2; x > -R ? k.lineTo(mx + x, y) : k.moveTo(mx + x, y); } k.stroke(); k.restore();
        k.lineWidth = 8; k.strokeStyle = '#b5862f'; k.beginPath(); k.arc(mx, my, R, 0, 7); k.stroke();
        k.lineCap = 'round'; k.lineWidth = 14; k.strokeStyle = '#5a3a1c'; k.beginPath(); k.moveTo(mx + R * 0.72, my + R * 0.72); k.lineTo(mx + R * 1.25, my + R * 1.25); k.stroke(); k.lineCap = 'butt';
        // where we are in the night
        const bw = W * 0.8, bx = W * 0.1, by = H * 0.86; k.fillStyle = 'rgba(255,255,255,.15)'; k.fillRect(bx, by, bw, 6); k.fillStyle = '#7fe0ff'; k.fillRect(bx + off / N * bw, by - 2, Math.max(6, vw / N * bw), 10);
        if (!found) {
          const centre = off + vw / 2;
          held = Math.abs(centre - SCR) < 45 && Math.abs(vel) < 320 ? held + dt : 0;
          if (performance.now() - t0 > 30000 && centre < SCR) { k.fillStyle = 'rgba(127,224,255,' + (0.4 + Math.sin(performance.now() / 200) * 0.3) + ')'; k.font = `800 ${Math.round(W * 0.05)}px system-ui`; k.textAlign = 'right'; k.fillText(fr() ? 'plus loin →' : 'further →', W * 0.95, cy - amp * 3); }
          if (held > 0.35) { found = true; k.strokeStyle = '#ff9a3c'; burst(0.5, 0.46, 40); word(fr() ? 'LÀ !' : 'THERE!', [0.5, 0.3]); done(L, res, 1400); }
        }
      });
      let dx0 = null;
      L.c.onpointerdown = (e) => { L.c.setPointerCapture(e.pointerId); dx0 = L.pos(e)[0]; vel = 0; };
      L.c.onpointermove = (e) => { if (dx0 == null) return; const x = L.pos(e)[0]; const ds = -(x - dx0) / L.W * view(); off = Math.max(0, Math.min(N - view(), off + ds)); vel = ds * 40; dx0 = x; };
      L.c.onpointerup = L.c.onpointercancel = () => { dx0 = null; };
      L.c.onwheel = (e) => { e.preventDefault(); off = Math.max(0, Math.min(N - view(), off + (e.deltaY + e.deltaX) * 0.6)); };
      env.key((e, d) => { if (!d) return; if (e.key === 'ArrowRight') { vel = 450; return true; } if (e.key === 'ArrowLeft') { vel = -450; return true; } });
    }),

    // ================================================================ the suspects board
    board: (a) => new Promise((res) => {
      hint(fr() ? 'Pose chaque hypothèse sur le tableau' : 'Pin each hypothesis on the board');
      const box = document.createElement('div'); box.className = 'cards'; $('panel').append(box); let pinned = 0;
      const slots = [[0.28, 0.2], [0.62, 0.22], [0.3, 0.42], [0.64, 0.44]];
      const pins = [];
      SUSPECTS.forEach((s, i) => {
        const c = document.createElement('div'); c.className = 'card'; c.innerHTML = `<i>${s.i}</i><span>${s[env.lang()]}</span>`;
        c.style.left = (8 + i * 22) + '%'; c.style.top = '78%'; box.append(c);
        const pin = (x, y) => { c.classList.add('pinned'); c.style.left = x * 100 + '%'; c.style.top = y * 100 + '%'; c.style.setProperty('--r', ((i % 2 ? 1 : -1) * (2 + i)) + 'deg'); sfx('pin'); burst(x, y, 14); if (++pinned === 4) { hint(''); setTimeout(() => { box.classList.add('keep'); carnet(true); res(); }, 900); } };
        pins.push(() => { if (!c.classList.contains('pinned')) pin(slots[i][0], slots[i][1]); });
        let st = null;
        c.onpointerdown = (e) => { if (c.classList.contains('pinned')) return; e.stopPropagation(); c.setPointerCapture(e.pointerId); const r = $('panel').getBoundingClientRect(); st = { x: e.clientX, y: e.clientY, r, moved: false }; c.classList.add('drag'); };
        c.onpointermove = (e) => { if (!st) return; const x = (e.clientX - st.r.left) / st.r.width, y = (e.clientY - st.r.top) / st.r.height; if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6) st.moved = true; c.style.left = (x - 0.1) * 100 + '%'; c.style.top = (y - 0.03) * 100 + '%'; };
        c.onpointerup = (e) => { if (!st) return; const y = (e.clientY - st.r.top) / st.r.height, x = (e.clientX - st.r.left) / st.r.width; const moved = st.moved; st = null; c.classList.remove('drag');
          if (!moved || y < 0.64) pin(moved ? Math.max(0.12, Math.min(0.7, x - 0.1)) : slots[i][0], moved ? Math.max(0.1, Math.min(0.55, y - 0.03)) : slots[i][1]); else { c.style.left = (8 + i * 22) + '%'; c.style.top = '78%'; } };
      });
      env.key((e, d) => { if (d && e.key === ' ') { const i = [...box.children].findIndex((c) => !c.classList.contains('pinned')); if (i >= 0) pins[i](); return true; } });
    }),
    cross: (a) => { mark(a.list, a.how || 'out'); return sleep(1600); },

    // ================================================================ five nights on the clock
    clock: (a) => new Promise((res) => {
      const L = lab(fr() ? 'À quelle heure revient le gribouillis ?' : 'When does the scruff come back?');
      hint(fr() ? 'Touche chaque nuit pour placer l’heure sur l’horloge' : 'Touch each night to put its time on the clock');
      const nights = [16, 12, 8, 4, 0].map((m, i) => ({ n: i + 1, m: 120 + m })); // 2 h 16, 2 h 12 ... 2 h 00 (3 min 56 s earlier each night, rounded)
      const placed = []; let hand = 0, handTo = 0;
      const col = ['#ffb35c', '#ffd27a', '#9df0c0', '#7fe0ff', '#c6a8ff'];
      const row = L.info(''); const draw = () => { row.innerHTML = nights.map((x, i) => `<button class="night ${placed.includes(i) ? 'done' : ''}" data-i="${i}" style="--c:${col[i]}">${fr() ? 'Nuit' : 'Night'} ${x.n}<b>${Math.floor(x.m / 60)} h ${String(x.m % 60).padStart(2, '0')}</b></button>`).join(''); };
      draw();
      row.onpointerdown = (e) => { const b = e.target.closest('.night'); if (!b) return; e.stopPropagation(); const i = +b.dataset.i; if (placed.includes(i)) return; placed.push(i); handTo = nights[i].m; sfx('tap'); draw(); if (placed.length === 5) setTimeout(ask, 1200); };
      env.key((e, d) => { if (d && e.key === ' ') { const i = [0, 1, 2, 3, 4].find((j) => !placed.includes(j)); if (i != null) row.querySelector(`[data-i="${i}"]`)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; } });
      L.loop((dt) => {
        const k = L.k, W = L.W, H = L.H, cx = W / 2, cy = H * 0.36, R = Math.min(W, H) * 0.3; hand += (handTo - hand) * Math.min(1, dt * 4);
        k.clearRect(0, 0, W, H);
        k.fillStyle = '#f4f1e8'; k.beginPath(); k.arc(cx, cy, R, 0, 7); k.fill(); k.lineWidth = 6; k.strokeStyle = '#2b3550'; k.stroke();
        k.fillStyle = '#2b3550'; k.font = `700 ${Math.round(R * 0.16)}px system-ui`; k.textAlign = 'center'; k.textBaseline = 'middle';
        for (let h = 1; h <= 12; h++) { const ang = h / 12 * 6.283 - 1.5708; k.fillText(h, cx + Math.cos(ang) * R * 0.8, cy + Math.sin(ang) * R * 0.8); }
        for (let m = 0; m < 60; m++) { const ang = m / 60 * 6.283 - 1.5708, r0 = m % 5 ? R * 0.93 : R * 0.88; k.lineWidth = m % 5 ? 1.5 : 3; k.beginPath(); k.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); k.lineTo(cx + Math.cos(ang) * R * 0.98, cy + Math.sin(ang) * R * 0.98); k.stroke(); }
        // the nights' marks on the minute ring
        placed.forEach((i, j) => { const m = nights[i].m % 60, ang = m / 60 * 6.283 - 1.5708; k.fillStyle = col[i]; k.beginPath(); k.arc(cx + Math.cos(ang) * (R + 14 + j * 4), cy + Math.sin(ang) * (R + 14 + j * 4), 9, 0, 7); k.fill(); });
        // hands
        const hA = (hand / 60) / 12 * 6.283 - 1.5708, mA = (hand % 60) / 60 * 6.283 - 1.5708;
        k.lineCap = 'round'; k.strokeStyle = '#2b3550'; k.lineWidth = 8; k.beginPath(); k.moveTo(cx, cy); k.lineTo(cx + Math.cos(hA) * R * 0.5, cy + Math.sin(hA) * R * 0.5); k.stroke();
        k.lineWidth = 5; k.strokeStyle = '#d0533a'; k.beginPath(); k.moveTo(cx, cy); k.lineTo(cx + Math.cos(mA) * R * 0.82, cy + Math.sin(mA) * R * 0.82); k.stroke(); k.lineCap = 'butt';
        // the zoom: the 20 minutes around two o'clock, where the marks are
        if (placed.length) {
          const zx = W * 0.1, zy = H * 0.72, zw = W * 0.8; k.fillStyle = 'rgba(255,255,255,.08)'; k.fillRect(zx, zy - 22, zw, 44);
          k.fillStyle = '#cfd8ea'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`;
          for (let m = 0; m <= 20; m += 4) { const x = zx + m / 20 * zw; k.fillRect(x, zy + 14, 2, 10); k.fillText(`2 h ${String(m).padStart(2, '0')}`, x, zy + 38); }
          placed.forEach((i) => { const x = zx + (nights[i].m - 120) / 20 * zw; k.fillStyle = col[i]; k.beginPath(); k.arc(x, zy, 11, 0, 7); k.fill(); k.fillStyle = '#111'; k.fillText(nights[i].n, x, zy + 1); });
        }
      });
      const ask = () => {
        const q = L.info(`<p class="q">${fr() ? 'Qu’est-ce que tu remarques ?' : 'What do you notice?'}</p>` + [fr() ? 'Il revient toujours à la même heure' : 'It always comes back at the same time', fr() ? 'Il arrive 4 minutes plus tôt chaque nuit' : 'It comes 4 minutes earlier every night', fr() ? 'Il arrive au hasard' : 'It comes at random'].map((t, i) => `<button class="opt" data-k="${i}">${t}</button>`).join(''));
        q.onpointerdown = (e) => { const b = e.target.closest('.opt'); if (!b) return; e.stopPropagation(); if (b.dataset.k === '1') { b.classList.add('ok'); done(L, res, 1100); } else { b.classList.add('no'); wrong(); setTimeout(() => b.classList.remove('no'), 700); } };
        env.key((e, d) => { if (d && ['1', '2', '3'].includes(e.key)) { q.querySelector(`[data-k="${+e.key - 1}"]`)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; } });
      };
    }),

    // ================================================================ why 4 minutes: the Earth turns and travels
    earth: (a) => new Promise((res) => {
      const L = lab(fr() ? 'La Terre tourne… et avance autour du Soleil' : 'The Earth spins… and travels round the Sun');
      hint(fr() ? 'Appuie sur « + 1 jour » et regarde quand l’antenne fait face à l’étoile' : 'Press “+ 1 day” and watch when the antenna faces the star');
      let day = 0, anim = 0, spin = 0; const log = [];
      const btn = L.btn(fr() ? '+ 1 jour' : '+ 1 day', 'main');
      const go = () => { if (anim > 0 || day >= 3) return; anim = 1; sfx('whoosh', 0.5); };
      btn.onpointerdown = (e) => { e.stopPropagation(); go(); }; env.key((e, d) => { if (d && e.key === ' ') { go(); return true; } });
      const info = L.info('');
      const show = () => { info.innerHTML = `<div class="cmp"><div><i>📡</i>${fr() ? 'Une antenne humaine' : 'A human transmitter'}<b>${'2 h 16'}</b></div><div><i>⭐</i>${fr() ? 'Le signal' : 'The signal'}<b>${['2 h 16', '2 h 12', '2 h 08', '2 h 04'][day]}</b></div></div>` + (day ? `<p class="small">${fr() ? 'Jour' : 'Day'} ${day + 1} : ${fr() ? 'le ciel revient' : 'the sky comes back'} <b>${fr() ? '4 minutes plus tôt' : '4 minutes earlier'}</b></p>` : ''); };
      show();
      L.loop((dt) => {
        const k = L.k, W = L.W, H = L.H, cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.3;
        if (anim > 0) { anim -= dt / 2.2; spin += dt / 2.2 * 6.283; if (anim <= 0) { anim = 0; day++; spin = 0; tone(880, 0.2, { v: 0.12 }); show(); if (day >= 3) { btn.disabled = true; done(L, res, 1800); } } }
        k.clearRect(0, 0, W, H);
        // the far star, straight up, always in the same direction
        k.fillStyle = '#fff'; k.font = `800 ${Math.round(W * 0.06)}px system-ui`; k.textAlign = 'center'; k.fillText('⭐', cx, H * 0.06 + 10);
        k.fillStyle = '#cfe7ff'; k.font = `600 ${Math.round(W * 0.028)}px system-ui`; k.fillText(fr() ? 'l’étoile du signal, très loin' : 'the signal’s star, far away', cx, H * 0.06 + 34);
        // the Sun and the orbit
        k.strokeStyle = 'rgba(255,255,255,.18)'; k.setLineDash([4, 6]); k.beginPath(); k.arc(cx, cy, R, 0, 7); k.stroke(); k.setLineDash([]);
        const sg = k.createRadialGradient(cx, cy, 2, cx, cy, R * 0.22); sg.addColorStop(0, '#fff6c8'); sg.addColorStop(0.5, '#ffc53d'); sg.addColorStop(1, 'rgba(255,150,40,0)'); k.fillStyle = sg; k.beginPath(); k.arc(cx, cy, R * 0.22, 0, 7); k.fill();
        // the Earth: moves along its orbit (exaggerated here, 12 degrees a day instead of 1, to see it)
        const orb = -1.2 + (day + (anim ? 1 - anim : 0)) * 0.21, ex = cx + Math.cos(orb) * R, ey = cy + Math.sin(orb) * R, er = R * 0.14;
        k.save(); k.translate(ex, ey);
        k.fillStyle = '#2f7fd6'; k.beginPath(); k.arc(0, 0, er, 0, 7); k.fill();
        const toSun = Math.atan2(cy - ey, cx - ex); k.fillStyle = 'rgba(0,0,20,.55)'; k.beginPath(); k.arc(0, 0, er, toSun + 1.5708, toSun + 4.712); k.fill();
        const aAng = -1.5708 + spin + orb * 0; k.fillStyle = '#ff9a3c'; k.beginPath(); k.arc(Math.cos(aAng) * er, Math.sin(aAng) * er, 5, 0, 7); k.fill();
        k.strokeStyle = 'rgba(255,154,60,.7)'; k.lineWidth = 2; k.beginPath(); k.moveTo(Math.cos(aAng) * er, Math.sin(aAng) * er); k.lineTo(Math.cos(aAng) * er * 2.2, Math.sin(aAng) * er * 2.2); k.stroke();
        k.restore();
        k.fillStyle = '#9fb0cc'; k.font = `600 ${Math.round(W * 0.026)}px system-ui`; k.fillText(fr() ? '(mouvement exagéré pour le voir)' : '(motion exaggerated to see it)', cx, H * 0.8);
      });
    }),

    // ================================================================ the fast recording: tap with the beats
    beat: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Enregistrement très rapide' : 'Very fast recording');
      hint(fr() ? 'Tape en même temps que chaque battement (bouton ou barre d’espace)' : 'Tap with every beat (button or space bar)');
      const P = 1.337, taps = [], beats = []; let tNext = 0.8, finished = false;
      const tapB = L.btn(fr() ? 'TAPE !' : 'TAP!', 'main big');
      const info = L.info(`<p class="small">${fr() ? 'Temps entre deux battements :' : 'Time between two beats:'} <b>…</b></p>`);
      let clock = 0;
      const tap = () => { if (finished) return; taps.push(clock); tapB.classList.remove('hit'); void tapB.offsetWidth; tapB.classList.add('hit'); tone(1500, 0.04, { type: 'square', v: 0.05 });
        const iv = taps.slice(1).map((t, i) => t - taps[i]).filter((d) => d > 0.6 && d < 2.4);
        if (iv.length) { const m = iv.slice(-6).reduce((s, x) => s + x, 0) / Math.min(6, iv.length); info.innerHTML = `<p class="small">${fr() ? 'Temps entre deux battements :' : 'Time between two beats:'} <b>${fmt(m)} s</b> <span>(${iv.length} ${fr() ? 'mesures' : 'measures'})</span></p>`;
          if (iv.length >= 6 || taps.length >= 14) { finished = true; info.innerHTML = `<p class="small">${fr() ? 'Mesuré' : 'Measured'} : <b>${fmt(m)} s</b> · ${fr() ? 'les astronomes' : 'astronomers'} : <b>1,337 s</b></p>`; done(L, res, 2200); } } };
      tapB.onpointerdown = (e) => { e.stopPropagation(); tap(); }; env.key((e, d) => { if (d && e.key === ' ') { tap(); return true; } });
      L.loop((dt) => {
        clock += dt; if (clock >= tNext) { beats.push(tNext); tNext += P; beat(0.6); }
        const k = L.k, W = L.W, H = L.H, cy = H * 0.36, win = 6; k.clearRect(0, 0, W, H);
        k.fillStyle = '#06131f'; k.fillRect(0, cy - H * 0.2, W, H * 0.4); k.strokeStyle = 'rgba(127,224,255,.15)';
        for (let s = Math.floor(clock - win); s <= clock; s += 0.5) { const x = W - (clock - s) / win * W; k.beginPath(); k.moveTo(x, cy - H * 0.2); k.lineTo(x, cy + H * 0.2); k.stroke(); }
        k.strokeStyle = '#7fe0ff'; k.lineWidth = 2; k.shadowColor = '#7fe0ff'; k.shadowBlur = 8; k.beginPath();
        for (let x = 0; x <= W; x += 2) { const t = clock - (1 - x / W) * win; let v = (Math.sin(t * 91) + Math.sin(t * 57)) * 0.04; for (const b of beats) { const d = t - b; if (d > 0 && d < 0.06) v += Math.sin(d / 0.06 * Math.PI) * 0.9; } const y = cy - v * H * 0.18; x ? k.lineTo(x, y) : k.moveTo(x, y); } k.stroke(); k.shadowBlur = 0;
        // the reader's taps, under the trace
        k.fillStyle = '#ffb35c'; for (const t of taps) { const x = W - (clock - t) / win * W; if (x > 0) { k.beginPath(); k.moveTo(x, cy + H * 0.22); k.lineTo(x - 7, cy + H * 0.27); k.lineTo(x + 7, cy + H * 0.27); k.fill(); } }
        k.fillStyle = '#9fb0cc'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.textAlign = 'left'; k.fillText(fr() ? '▲ tes tapes' : '▲ your taps', 10, cy + H * 0.32);
      });
    }),

    // ================================================================ your own rhythm, against the signal's
    rhythm: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Toi contre le signal' : 'You against the signal');
      hint(fr() ? 'Tape 10 fois, le plus régulièrement possible' : 'Tap 10 times, as evenly as you can');
      const taps = []; let clock = 0, over = false;
      const tapB = L.btn(fr() ? 'TAPE !' : 'TAP!', 'main big'); const info = L.info('');
      const tap = () => { if (over) return; taps.push(clock); tapB.classList.remove('hit'); void tapB.offsetWidth; tapB.classList.add('hit'); tone(1300, 0.04, { type: 'square', v: 0.05 });
        if (taps.length >= 11) { over = true; const iv = taps.slice(1).map((t, i) => t - taps[i]), m = iv.reduce((s, x) => s + x, 0) / iv.length, sd = Math.sqrt(iv.reduce((s, x) => s + (x - m) ** 2, 0) / iv.length);
          info.innerHTML = `<div class="cmp"><div><i>🙋</i>${fr() ? 'Ton rythme varie de' : 'Your rhythm varies by'}<b>± ${fmt(sd, 3)} s</b></div><div><i>⭐</i>${fr() ? 'Le signal' : 'The signal'}<b>${fr() ? 'ne varie pas' : 'never varies'}</b></div></div><p class="small">${fr() ? 'Même mesuré pendant des années, son rythme moyen ne change pas.' : 'Even measured for years, its average rhythm does not change.'}</p>`; done(L, res, 3200); } };
      tapB.onpointerdown = (e) => { e.stopPropagation(); tap(); }; env.key((e, d) => { if (d && e.key === ' ') { tap(); return true; } });
      L.loop((dt) => {
        clock += dt; const k = L.k, W = L.W, H = L.H; k.clearRect(0, 0, W, H);
        const iv = taps.slice(1).map((t, i) => t - taps[i]), m = iv.length ? iv.reduce((s, x) => s + x, 0) / iv.length : 1, base = H * 0.42, sc = H * 0.5;
        k.strokeStyle = '#7fe0ff'; k.lineWidth = 3; k.setLineDash([]); k.beginPath(); k.moveTo(W * 0.08, base); k.lineTo(W * 0.92, base); k.stroke();
        k.fillStyle = '#7fe0ff'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.textAlign = 'right'; k.fillText(fr() ? 'le signal : toujours pareil' : 'the signal: always the same', W * 0.92, base - 10);
        iv.forEach((d, i) => { const x = W * 0.1 + i * W * 0.08, y = base - (d - m) / m * sc; k.fillStyle = '#ffb35c'; k.beginPath(); k.arc(x, y, 8, 0, 7); k.fill(); k.strokeStyle = 'rgba(255,179,92,.5)'; k.lineWidth = 2; k.beginPath(); k.moveTo(x, base); k.lineTo(x, y); k.stroke(); });
        k.fillStyle = '#ffb35c'; k.textAlign = 'left'; k.fillText(fr() ? `toi : ${Math.max(0, taps.length)} / 11 tapes` : `you: ${Math.max(0, taps.length)} / 11 taps`, W * 0.08, H * 0.12);
      });
    }),

    // ================================================================ the siren: the sound rises as it comes, falls as it goes
    siren: (a) => new Promise((res) => {
      const L = lab(fr() ? 'L’effet de la sirène' : 'The siren effect');
      hint(fr() ? 'Fais passer l’ambulance devant l’oreille, vite, dans un sens puis dans l’autre (ou les flèches)' : 'Drive the ambulance past the ear, fast, one way then the other (or the arrows)');
      const c = A(); let osc = null, g = null; if (c) { osc = c.createOscillator(); g = c.createGain(); osc.type = 'triangle'; g.gain.value = 0; osc.connect(g).connect(c.destination); osc.start(); }
      let x = 0.12, vx = 0, last = 0.12, passes = 0, side = -1, auto = 0;
      L.loop((dt, t) => {
        if (auto) { x += auto * dt * 0.9; if (x > 0.92 || x < 0.08) auto = 0; }
        vx = (x - last) / Math.max(dt, 0.001); last = x;
        const k = L.k, W = L.W, H = L.H, road = H * 0.5, ex = W / 2, ey = H * 0.72;
        // sound: two-tone siren, pitch shifted by the speed toward the ear (Doppler, exaggerated for a small screen)
        const toward = -Math.sign(x - 0.5) * vx * 70, f = (Math.floor(t * 2) % 2 ? 760 : 960) * 340 / Math.max(120, 340 - toward), dist = Math.abs(x - 0.5) * 3 + 0.4;
        if (osc) { osc.frequency.setTargetAtTime(f, c.currentTime, 0.02); g.gain.setTargetAtTime(Math.min(0.16, 0.09 / dist), c.currentTime, 0.05); }
        const s = Math.sign(x - 0.5); if (s && s !== side) { if (Math.abs(vx) > 0.35) { passes++; sfx('whoosh', 0.4); } side = s; }
        k.clearRect(0, 0, W, H);
        k.fillStyle = '#2a2f3a'; k.fillRect(0, road - H * 0.09, W, H * 0.18); k.strokeStyle = '#d9d2a8'; k.setLineDash([24, 18]); k.lineWidth = 3; k.beginPath(); k.moveTo(0, road); k.lineTo(W, road); k.stroke(); k.setLineDash([]);
        // the ambulance
        const ax = x * W, aw = W * 0.2, ah = H * 0.08; k.fillStyle = '#f5f5f0'; k.fillRect(ax - aw / 2, road - ah - 6, aw, ah); k.fillRect(ax + (vx >= 0 ? aw / 2 - 2 : -aw / 2 - aw * 0.22 + 2), road - ah * 0.7 - 6, aw * 0.22, ah * 0.7);
        k.fillStyle = '#d33'; k.fillRect(ax - 7, road - ah * 0.8, 14, ah * 0.5); k.fillRect(ax - ah * 0.25 + 0, road - ah * 0.63, ah * 0.5, 14);
        k.fillStyle = Math.floor(t * 6) % 2 ? '#3d7cff' : '#ff3d3d'; k.fillRect(ax - 12, road - ah - 14, 24, 8);
        k.fillStyle = '#111'; for (const dx of [-aw * 0.3, aw * 0.3]) { k.beginPath(); k.arc(ax + dx, road - 4, 9, 0, 7); k.fill(); }
        // sound rings squeezed in front, stretched behind
        k.strokeStyle = 'rgba(255,255,255,.25)'; k.lineWidth = 2; for (let i = 1; i <= 4; i++) { const r = ((t * 120 + i * 40) % 160); k.beginPath(); k.ellipse(ax + vx * W * 0.02 * i, road - ah / 2, r, r * 0.6, 0, 0, 7); k.stroke(); }
        // the ear and the pitch meter
        k.font = `${Math.round(W * 0.09)}px system-ui`; k.textAlign = 'center'; k.fillText('👂', ex, ey);
        const pitch = Math.max(-1, Math.min(1, toward / 140)); k.fillStyle = 'rgba(255,255,255,.12)'; k.fillRect(W * 0.86, H * 0.6, 14, H * 0.25); k.fillStyle = pitch > 0 ? '#ffb35c' : '#7fe0ff'; k.fillRect(W * 0.86, H * 0.725 - pitch * H * 0.12, 14, 6);
        k.fillStyle = '#cfd8ea'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.fillText(fr() ? 'aigu' : 'high', W * 0.87, H * 0.585); k.fillText(fr() ? 'grave' : 'low', W * 0.87, H * 0.88);
        if (passes >= 2 && !L.closed) { if (g) g.gain.setTargetAtTime(0, c.currentTime, 0.1); setTimeout(() => osc?.stop(), 400); done(L, res, 900); passes = -99; }
      });
      let p0 = null; L.c.onpointerdown = (e) => { L.c.setPointerCapture(e.pointerId); p0 = 1; auto = 0; x = Math.max(0.08, Math.min(0.92, L.pos(e)[0] / L.W)); last = x; };
      L.c.onpointermove = (e) => { if (p0) x = Math.max(0.08, Math.min(0.92, L.pos(e)[0] / L.W)); };
      L.c.onpointerup = L.c.onpointercancel = () => { p0 = null; };
      env.key((e, d) => { if (!d) return; if (e.key === 'ArrowRight') { auto = 1; return true; } if (e.key === 'ArrowLeft') { auto = -1; return true; } });
      const stopSound = () => { if (g && c) g.gain.setTargetAtTime(0, c.currentTime, 0.05); }; L.el.addEventListener('transitionend', () => { if (L.closed) stopSound(); });
      const iv = setInterval(() => { if (!L.alive()) { stopSound(); try { osc?.stop(); } catch {} clearInterval(iv); } }, 300);
    }),

    // ================================================================ a planet would make the beat wobble
    orbit: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Le test de la planète' : 'The planet test');
      hint(fr() ? 'Mesure le vrai signal pendant trois semaines, et compare' : 'Measure the real signal for three weeks, and compare');
      let measured = 0, mtime = 0; const btn = L.btn(fr() ? 'Mesurer 3 semaines' : 'Measure 3 weeks', 'main');
      btn.onpointerdown = (e) => { e.stopPropagation(); if (measured) return; measured = 1; sfx('whoosh', 0.4); btn.disabled = true; };
      env.key((e, d) => { if (d && e.key === ' ' && !measured) { btn.onpointerdown({ stopPropagation() {} }); return true; } });
      let asked = false;
      L.loop((dt, t) => {
        const k = L.k, W = L.W, H = L.H; if (measured) mtime = Math.min(1, mtime + dt / 3);
        k.clearRect(0, 0, W, H);
        // the imagined alien planet circling its star, sending beats
        const cx = W * 0.5, cy = H * 0.2, R = W * 0.22, ang = t * 1.2, px = cx + Math.cos(ang) * R, py = cy + Math.sin(ang) * R * 0.35;
        k.strokeStyle = 'rgba(255,255,255,.2)'; k.beginPath(); k.ellipse(cx, cy, R, R * 0.35, 0, 0, 7); k.stroke();
        k.fillStyle = '#ffd27a'; k.beginPath(); k.arc(cx, cy, 14, 0, 7); k.fill(); k.fillStyle = '#7fd67f'; k.beginPath(); k.arc(px, py, 9, 0, 7); k.fill();
        k.font = `${Math.round(W * 0.05)}px system-ui`; k.textAlign = 'center'; k.fillText('👽', px, py - 14);
        k.fillStyle = '#cfd8ea'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.fillText(fr() ? 'Si le signal venait d’une planète…' : 'If the signal came from a planet…', cx, cy + R * 0.35 + 30);
        // the graph: time between beats over three weeks
        const gx = W * 0.1, gw = W * 0.8, gy = H * 0.62, amp = H * 0.1;
        k.strokeStyle = 'rgba(255,255,255,.2)'; k.lineWidth = 1; k.beginPath(); k.moveTo(gx, gy); k.lineTo(gx + gw, gy); k.stroke();
        k.fillStyle = '#9fb0cc'; k.textAlign = 'left'; k.fillText(fr() ? 'temps entre deux battements' : 'time between beats', gx, gy - amp - 18); k.textAlign = 'right'; k.fillText(fr() ? '3 semaines →' : '3 weeks →', gx + gw, gy + amp + 28);
        k.strokeStyle = '#7fd67f'; k.lineWidth = 3; k.setLineDash([8, 6]); k.beginPath(); for (let i = 0; i <= 100; i++) { const x = gx + i / 100 * gw, y = gy - Math.sin(i / 100 * 6.283 * 2 + t * 0.6) * amp; i ? k.lineTo(x, y) : k.moveTo(x, y); } k.stroke(); k.setLineDash([]);
        k.fillStyle = '#7fd67f'; k.textAlign = 'left'; k.fillText(fr() ? '- - planète (imaginé)' : '- - planet (imagined)', gx, gy + amp + 28);
        if (measured) { k.strokeStyle = '#ffb35c'; k.lineWidth = 4; k.beginPath(); k.moveTo(gx, gy); k.lineTo(gx + gw * mtime, gy); k.stroke(); k.fillStyle = '#ffb35c'; k.fillText(fr() ? '— notre signal (mesuré)' : '— our signal (measured)', gx, gy + amp + 52); }
        if (mtime >= 1 && !asked) { asked = true; ask(); }
      });
      const ask = () => {
        const q = L.info(`<p class="q">${fr() ? 'Qu’est-ce que ça veut dire ?' : 'What does it mean?'}</p>` + [fr() ? 'Il vient d’une planète qui tourne' : 'It comes from an orbiting planet', fr() ? 'Pas de planète qui tourne autour de la source' : 'No planet orbiting around the source', fr() ? 'L’ambulance était trop rapide' : 'The ambulance was too fast'].map((t, i) => `<button class="opt" data-k="${i}">${t}</button>`).join(''));
        q.onpointerdown = (e) => { const b = e.target.closest('.opt'); if (!b) return; e.stopPropagation(); if (b.dataset.k === '1') { b.classList.add('ok'); done(L, res, 1100); } else { b.classList.add('no'); wrong(); setTimeout(() => b.classList.remove('no'), 700); } };
        env.key((e, d) => { if (d && ['1', '2', '3'].includes(e.key)) { q.querySelector(`[data-k="${+e.key - 1}"]`)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; } });
      };
    }),

    // ================================================================ the sky through the magnifier: a second pulsar
    sky: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Une autre partie du ciel' : 'Another part of the sky', { dim: 0, ctrl: false });
      hint(fr() ? 'Promène la loupe sur le ciel (doigt, souris ou flèches). Une étoile bat…' : 'Move the glass over the sky (finger, mouse or arrows). One star beats…');
      const art = $('art'), tgt = a.at; let pos = [0.4, 0.55], held = 0, found = false;
      L.loop((dt, t) => {
        const k = L.k, W = L.W, H = L.H; k.clearRect(0, 0, W, H);
        const blink = Math.pow(Math.max(0, Math.sin(t * 6.283 / 0.71)), 12); // its own rhythm, 0.71 s
        k.fillStyle = `rgba(200,235,255,${0.12 + blink * 0.25})`; k.beginPath(); k.arc(tgt[0] * W, tgt[1] * H, 2.5, 0, 7); k.fill();
        const x = pos[0] * W, y = pos[1] * H, R = W * 0.2, z = 2.6;
        k.save(); k.beginPath(); k.arc(x, y, R, 0, 7); k.clip();
        if (art?.naturalWidth) { const sw = art.naturalWidth / z, sh = art.naturalHeight / z; k.drawImage(art, pos[0] * art.naturalWidth - sw * pos[0], pos[1] * art.naturalHeight - sh * pos[1], sw, sh, 0, 0, W, H); }
        const zx = x + (tgt[0] - pos[0]) * W * z, zy = y + (tgt[1] - pos[1]) * H * z;
        const gr = k.createRadialGradient(zx, zy, 0, zx, zy, 26 + blink * 30); gr.addColorStop(0, `rgba(230,248,255,${0.3 + blink * 0.7})`); gr.addColorStop(1, 'rgba(120,200,255,0)'); k.fillStyle = gr; k.beginPath(); k.arc(zx, zy, 60, 0, 7); k.fill();
        k.restore(); k.lineWidth = 8; k.strokeStyle = '#b5862f'; k.beginPath(); k.arc(x, y, R, 0, 7); k.stroke();
        k.lineCap = 'round'; k.lineWidth = 14; k.strokeStyle = '#5a3a1c'; k.beginPath(); k.moveTo(x + R * 0.72, y + R * 0.72); k.lineTo(x + R * 1.2, y + R * 1.2); k.stroke(); k.lineCap = 'butt';
        if (blink > 0.5 && !found && Math.hypot((pos[0] - tgt[0]) * W, (pos[1] - tgt[1]) * H) < R * 0.6) beat(0.25);
        if (!found) { held = Math.hypot((pos[0] - tgt[0]) * W, (pos[1] - tgt[1]) * H) < R * 0.45 ? held + dt : 0; if (held > 0.9) { found = true; burst(tgt[0], tgt[1], 40); word(fr() ? 'UN DEUXIÈME !' : 'A SECOND ONE!', [Math.min(0.75, tgt[0]), tgt[1] - 0.12]); done(L, res, 1500); } }
      });
      const mv = (e) => { const p = L.pos(e); pos = [p[0] / L.W, p[1] / L.H]; };
      L.c.onpointerdown = (e) => { L.c.setPointerCapture(e.pointerId); mv(e); }; L.c.onpointermove = (e) => { if (e.buttons || e.pointerType === 'mouse') mv(e); };
      env.key((e, d) => { if (!d) return; const m = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key]; if (!m) return; pos = [Math.max(0, Math.min(1, pos[0] + m[0])), Math.max(0, Math.min(1, pos[1] + m[1]))]; return true; });
    }),

    // ================================================================ spin a star until it turns once every 1.3 s
    spin: (a) => new Promise((res) => {
      const L = lab(fr() ? 'La toupie cosmique' : 'The cosmic spinning top');
      hint(fr() ? 'Fais tourner l’astre avec ton doigt (ou maintiens la flèche →) jusqu’à un tour en 1,3 seconde' : 'Spin the star with your finger (or hold →) until it turns once every 1.3 seconds');
      const STARS = [{ fr: 'Soleil', en: 'Sun', size: fr() ? '1,4 million de km' : '1.4 million km', crit: 10000, r: 0.3, col: ['#fff3b0', '#ffb030'] },
        { fr: 'Naine blanche', en: 'White dwarf', size: fr() ? 'la taille de la Terre' : 'the size of the Earth', crit: 13, r: 0.12, col: ['#ffffff', '#b8d4ff'] },
        { fr: 'Étoile à neutrons', en: 'Neutron star', size: fr() ? '20 km : une ville' : '20 km: a city', crit: 0.0005, r: 0.035, col: ['#ffffff', '#7fe0ff'] }];
      let which = 0, unlocked = 1, s = 0, ang = 0, broken = 0, parts = [], ok = false;
      const period = () => 864000 * Math.pow(1.337 / 864000, s); // from ten days down to 1.337 s, on a log scale
      const row = L.info(''); const draw = () => { row.innerHTML = STARS.map((x, i) => `<button class="star ${i === which ? 'on' : ''}" data-i="${i}" ${i >= unlocked ? 'disabled' : ''}><b>${x[env.lang()]}</b><span>${x.size}</span></button>`).join(''); };
      draw(); row.onpointerdown = (e) => { const b = e.target.closest('.star'); if (!b || b.disabled) return; e.stopPropagation(); which = +b.dataset.i; s = 0; broken = 0; parts = []; draw(); };
      const tell = (t) => { const p = L.el.querySelector('.lab-say') || L.el.appendChild(Object.assign(document.createElement('div'), { className: 'lab-say' })); p.textContent = t; p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); };
      const human = (p) => p > 86400 * 1.5 ? `${fmt(p / 86400, 1)} ${fr() ? 'jours' : 'days'}` : p > 3600 * 1.5 ? `${fmt(p / 3600, 1)} h` : p > 90 ? `${Math.round(p / 60)} min` : `${fmt(p, 1)} s`;
      L.loop((dt) => {
        const k = L.k, W = L.W, H = L.H, cx = W / 2, cy = H * 0.36, st = STARS[which], P = period();
        if (keyHeld) s = Math.min(1, s + dt * 0.22);
        if (!broken) ang += dt * Math.min(30, 6.283 / Math.max(0.2, Math.log10(P + 1) * 0.6));
        k.clearRect(0, 0, W, H);
        const flat = broken ? 0 : Math.min(0.6, Math.pow(st.crit / P, 0.5) * 0.6), r = Math.min(W, H) * st.r;
        if (!broken) {
          k.save(); k.translate(cx, cy); k.scale(1 + flat * 0.6, 1 - flat * 0.4);
          const gr = k.createRadialGradient(0, 0, r * 0.1, 0, 0, r); gr.addColorStop(0, st.col[0]); gr.addColorStop(1, st.col[1]); k.fillStyle = gr; k.shadowColor = st.col[1]; k.shadowBlur = 30; k.beginPath(); k.arc(0, 0, r, 0, 7); k.fill(); k.shadowBlur = 0;
          k.strokeStyle = 'rgba(0,0,0,.25)'; k.lineWidth = Math.max(1.5, r * 0.06); for (let i = 0; i < 3; i++) { k.beginPath(); k.ellipse(0, 0, Math.abs(Math.cos(ang + i * 1.05)) * r, r, 0, -1.5708, 1.5708, Math.cos(ang + i * 1.05) < 0); k.stroke(); }
          k.restore();
          if (P < st.crit) { broken = 1; sfx('bonk'); noise(1.2, { v: 0.4, f: 300, q: 0.4 }); for (let i = 0; i < 160; i++) { const a2 = Math.random() * 6.283, v = (0.5 + Math.random()) * W * 0.5; parts.push({ x: cx + Math.cos(a2) * r, y: cy + Math.sin(a2) * r * 0.6, vx: Math.cos(a2) * v, vy: Math.sin(a2) * v * 0.6, c: st.col[Math.random() < 0.5 ? 0 : 1] }); }
            tell(which === 0 ? (fr() ? 'Le Soleil se disloque ! Trop gros.' : 'The Sun flies apart! Too big.') : (fr() ? 'La naine blanche explose aussi !' : 'The white dwarf flies apart too!'));
            setTimeout(() => { if (!L.alive()) return; unlocked = Math.max(unlocked, which + 2); which = Math.min(2, which + 1); s = 0; broken = 0; parts = []; draw(); }, 2600); }
        }
        for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; k.fillStyle = p.c; k.fillRect(p.x, p.y, 3, 3); }
        if (which === 2 && !broken) { k.fillStyle = '#cfe7ff'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.textAlign = 'center'; k.fillText(fr() ? '(agrandie : en vrai, minuscule)' : '(enlarged: really tiny)', cx, cy + r + 30); }
        // the speed readout and the goal
        k.fillStyle = '#fff'; k.font = `800 ${Math.round(W * 0.06)}px system-ui`; k.textAlign = 'center'; k.fillText(`${fr() ? '1 tour en' : '1 turn in'} ${human(P)}`, cx, H * 0.75);
        k.fillStyle = '#9fb0cc'; k.font = `600 ${Math.round(W * 0.032)}px system-ui`; k.fillText(`${fr() ? 'objectif' : 'goal'} : 1,3 s`, cx, H * 0.75 + 28);
        const bw = W * 0.7, bx = W * 0.15, by = H * 0.84; k.fillStyle = 'rgba(255,255,255,.12)'; k.fillRect(bx, by, bw, 10); k.fillStyle = '#ffb35c'; k.fillRect(bx, by, bw * s, 10);
        if (which === 2 && s >= 0.999 && !ok) { ok = true; tell(fr() ? 'Elle tient ! Minuscule et ultra-serrée.' : 'It holds! Tiny and ultra-dense.'); burst(0.5, 0.36, 50); done(L, res, 2200); }
      });
      let keyHeld = false, prevA = null;
      const center = () => [L.W / 2, L.H * 0.36];
      L.c.onpointerdown = (e) => { L.c.setPointerCapture(e.pointerId); const p = L.pos(e), c = center(); prevA = Math.atan2(p[1] - c[1], p[0] - c[0]); };
      L.c.onpointermove = (e) => { if (prevA == null || broken) return; const p = L.pos(e), c = center(), a2 = Math.atan2(p[1] - c[1], p[0] - c[0]); let d = a2 - prevA; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; prevA = a2; s = Math.max(0, Math.min(1, s + Math.abs(d) * 0.045)); };
      L.c.onpointerup = L.c.onpointercancel = () => { prevA = null; };
      env.key((e, d) => { if (e.key === 'ArrowRight' || e.key === ' ') { keyHeld = d; return true; } });
    }),

    // ================================================================ the cosmic lighthouse: match the beat
    beam: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Le phare cosmique' : 'The cosmic lighthouse');
      hint(fr() ? 'Règle la vitesse pour que les bips de la Terre suivent le vrai signal' : 'Set the speed so the Earth’s blips follow the real signal');
      let P = 3.0, ang = 0, ok = false; const blips = [], real = []; let clock = 0, nextReal = 0.5, prevA = 0;
      const minus = L.btn('−'), lbl = L.btn('', 'ro'), plus = L.btn('+');
      const set = (d) => { P = Math.max(0.5, Math.min(4, Math.round((P + d) * 10) / 10)); lbl.innerHTML = `${fr() ? '1 tour en' : '1 turn in'} <b>${fmt(P, 1)} s</b>`; sfx('tap'); };
      set(0); minus.onpointerdown = (e) => { e.stopPropagation(); set(P > 1.5 ? -0.5 : -0.1); }; plus.onpointerdown = (e) => { e.stopPropagation(); set(P >= 1.5 ? 0.5 : 0.1); };
      env.key((e, d) => { if (!d) return; if (e.key === 'ArrowLeft' || e.key === '-') { minus.onpointerdown({ stopPropagation() {} }); return true; } if (e.key === 'ArrowRight' || e.key === '+') { plus.onpointerdown({ stopPropagation() {} }); return true; } });
      L.loop((dt) => {
        clock += dt; ang += dt * 6.283 / P; const k = L.k, W = L.W, H = L.H, cx = W * 0.32, cy = H * 0.3, earth = [W * 0.86, H * 0.3];
        const a2 = ang % 6.283; if (prevA > a2) { blips.push(clock); beat(0.45); } prevA = a2; // the beam crosses the Earth once a turn (it points at angle 0)
        if (clock >= nextReal) { real.push(nextReal); nextReal += 1.337; }
        k.clearRect(0, 0, W, H);
        // two beams from the tiny star
        for (const off of [0, Math.PI]) { const b = ang + off; k.save(); k.translate(cx, cy); k.rotate(b); const gr = k.createLinearGradient(0, 0, W * 0.6, 0); gr.addColorStop(0, 'rgba(200,240,255,.85)'); gr.addColorStop(1, 'rgba(200,240,255,0)'); k.fillStyle = gr; k.beginPath(); k.moveTo(0, 0); k.lineTo(W * 0.6, -W * 0.05); k.lineTo(W * 0.6, W * 0.05); k.closePath(); k.fill(); k.restore(); }
        k.fillStyle = '#fff'; k.shadowColor = '#7fe0ff'; k.shadowBlur = 24; k.beginPath(); k.arc(cx, cy, 8, 0, 7); k.fill(); k.shadowBlur = 0;
        const hit = Math.cos(ang) > 0.985; k.font = `${Math.round(W * 0.08)}px system-ui`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('🌍', earth[0], earth[1]); if (hit) { k.strokeStyle = '#fff'; k.lineWidth = 3; k.beginPath(); k.arc(earth[0], earth[1], W * 0.06, 0, 7); k.stroke(); }
        // two recorder strips: the real signal, and what the Earth receives from this star
        const strip = (y, list, col, label) => { k.fillStyle = 'rgba(255,255,255,.06)'; k.fillRect(W * 0.06, y - 24, W * 0.88, 48); k.fillStyle = col; for (const t of list) { const x = W * 0.94 - (clock - t) / 8 * W * 0.88; if (x > W * 0.06) k.fillRect(x - 2, y - 18, 4, 36); } k.fillStyle = '#cfd8ea'; k.font = `600 ${Math.round(W * 0.03)}px system-ui`; k.textAlign = 'left'; k.textBaseline = 'alphabetic'; k.fillText(label, W * 0.06, y - 30); };
        strip(H * 0.66, real, '#ffb35c', fr() ? 'le vrai signal' : 'the real signal'); strip(H * 0.86, blips, '#7fe0ff', fr() ? 'ce que reçoit la Terre' : 'what the Earth receives');
        if (!ok && Math.abs(P - 1.337) < 0.07) { ok = true; word(fr() ? 'MÊME RYTHME !' : 'SAME BEAT!', [0.5, 0.48]); burst(0.86, 0.3, 40); done(L, res, 2600); }
      });
    }),

    // ================================================================ a teaspoon of neutron star on the scale
    spoon: (a) => new Promise((res) => {
      hint(fr() ? 'Glisse la cuillère sur la balance' : 'Slide the spoon onto the scale');
      const s = document.createElement('div'); s.className = 'spoon'; s.innerHTML = '<i></i>'; s.style.left = a.from[0] * 100 + '%'; s.style.top = a.from[1] * 100 + '%'; $('panel').append(s);
      const drop = async () => { s.onpointerdown = null; env.key(null); s.style.left = a.to[0] * 100 + '%'; s.style.top = a.to[1] * 100 + '%'; await sleep(450); sfx('crack'); noise(0.6, { v: 0.5, f: 200 }); $('panel').classList.add('quake'); setTimeout(() => $('panel').classList.remove('quake'), 700);
        const lab2 = document.createElement('div'); lab2.className = 'weight'; lab2.innerHTML = `<b>1 000 000 000</b><span>${fr() ? 'tonnes' : 'tonnes'}</span>`; lab2.style.left = a.to[0] * 100 + '%'; lab2.style.top = (a.to[1] - 0.2) * 100 + '%'; $('layer').append(lab2); burst(a.to[0], a.to[1], 50); hint(''); await sleep(1800); s.remove(); res(); };
      let st = null; s.onpointerdown = (e) => { e.stopPropagation(); s.setPointerCapture(e.pointerId); st = $('panel').getBoundingClientRect(); };
      s.onpointermove = (e) => { if (!st) return; const x = (e.clientX - st.left) / st.width, y = (e.clientY - st.top) / st.height; s.style.left = x * 100 + '%'; s.style.top = y * 100 + '%'; if (Math.hypot(x - a.to[0], y - a.to[1]) < 0.12) { st = null; drop(); } };
      s.onpointerup = () => { if (st) { st = null; drop(); } };
      env.key((e, d) => { if (d && (e.key === ' ' || e.key === 'Enter')) { drop(); return true; } });
    }),

    // ================================================================ listen to pulsars
    listen: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Écoute les pulsars' : 'Listen to pulsars', { dim: 0.7 });
      hint(fr() ? 'Écoute les trois' : 'Listen to all three');
      const PS = [{ fr: 'Le nôtre', en: 'Ours', p: 1.337, d: fr() ? '1 battement toutes les 1,3 s' : '1 beat every 1.3 s' }, { fr: 'Vela', en: 'Vela', p: 0.0893, d: fr() ? '11 battements par seconde' : '11 beats a second' }, { fr: 'Le Crabe', en: 'The Crab', p: 0.0337, d: fr() ? '30 battements par seconde' : '30 beats a second' }];
      const heard = new Set(); let playing = -1, until = 0, next = 0, glow = [0, 0, 0];
      const row = L.info(PS.map((x, i) => `<button class="psr" data-i="${i}"><i></i><b>${x[env.lang()]}</b><span>${x.d}</span></button>`).join(''));
      const play = (i) => { playing = i; until = performance.now() + 4200; next = performance.now(); heard.add(i); row.querySelector(`[data-i="${i}"]`).classList.add('heard'); };
      row.onpointerdown = (e) => { const b = e.target.closest('.psr'); if (!b) return; e.stopPropagation(); play(+b.dataset.i); };
      env.key((e, d) => { if (d && ['1', '2', '3'].includes(e.key)) { play(+e.key - 1); return true; } });
      L.loop((dt) => {
        const now = performance.now();
        if (playing >= 0) { while (next <= now && now < until) { const v = PS[playing].p < 0.1 ? 0.25 : 0.6; beat(v); glow[playing] = 1; next += PS[playing].p * 1000; } if (now >= until) { playing = -1; if (heard.size === 3 && !L.closed) done(L, res, 600); } }
        glow = glow.map((g) => Math.max(0, g - dt * 4));
        row.querySelectorAll('.psr i').forEach((el, i) => { el.style.transform = `scale(${1 + glow[i] * 0.5})`; el.style.opacity = 0.4 + glow[i] * 0.6; });
        L.k.clearRect(0, 0, L.W, L.H);
      });
    }),

    // ================================================================ make your own pulsar: spin the beam
    toy: (a) => new Promise((res) => {
      const L = lab(fr() ? 'Fabrique ton pulsar' : 'Make your own pulsar');
      hint(fr() ? 'Fais tourner le faisceau avec ton doigt (ou maintiens la barre d’espace)' : 'Spin the beam with your finger (or hold the space bar)');
      let ang = 0, w = 0, flashes = 0, prevA = null, keyHeld = false, prevHit = false; const stamps = [];
      L.loop((dt) => {
        if (keyHeld) w = Math.min(14, w + dt * 8); w *= 0.985; ang += w * dt;
        const k = L.k, W = L.W, H = L.H, cx = W / 2, cy = H * 0.42, fx2 = W * 0.88, fy = H * 0.42;
        const hit = Math.cos(ang) > 0.97 && w > 0.5; if (hit && !prevHit) { flashes++; stamps.push(performance.now()); tone(1100, 0.06, { v: 0.1 }); } prevHit = hit;
        k.clearRect(0, 0, W, H);
        for (const off of [0, Math.PI]) { k.save(); k.translate(cx, cy); k.rotate(ang + off); const gr = k.createLinearGradient(0, 0, W * 0.45, 0); gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); k.fillStyle = gr; k.beginPath(); k.moveTo(0, 0); k.lineTo(W * 0.45, -W * 0.06); k.lineTo(W * 0.45, W * 0.06); k.closePath(); k.fill(); k.restore(); }
        k.fillStyle = '#fff'; k.shadowColor = '#ffd27a'; k.shadowBlur = 26; k.beginPath(); k.arc(cx, cy, 14, 0, 7); k.fill(); k.shadowBlur = 0;
        k.font = `${Math.round(W * 0.09)}px system-ui`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText(hit ? '😲' : '🙂', fx2, fy);
        if (hit) { k.fillStyle = 'rgba(255,250,220,.35)'; k.fillRect(0, 0, W, H); }
        const recent = stamps.filter((t) => performance.now() - t < 3000).length / 3;
        k.fillStyle = '#fff'; k.font = `800 ${Math.round(W * 0.055)}px system-ui`; k.textBaseline = 'alphabetic'; k.fillText(`${flashes} flash${flashes > 1 ? 's' : ''}`, cx, H * 0.78);
        k.fillStyle = '#9fb0cc'; k.font = `600 ${Math.round(W * 0.032)}px system-ui`; k.fillText(`${fmt(recent, 1)} ${fr() ? 'flashs par seconde' : 'flashes a second'}`, cx, H * 0.78 + 28);
        if (flashes >= 12 && !L.closed) { flashes = -999; burst(0.88, 0.42, 40); done(L, res, 1200); }
      });
      const c0 = () => [L.W / 2, L.H * 0.42];
      L.c.onpointerdown = (e) => { L.c.setPointerCapture(e.pointerId); const p = L.pos(e), c = c0(); prevA = Math.atan2(p[1] - c[1], p[0] - c[0]); };
      L.c.onpointermove = (e) => { if (prevA == null) return; const p = L.pos(e), c = c0(), a2 = Math.atan2(p[1] - c[1], p[0] - c[0]); let d = a2 - prevA; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; prevA = a2; w = Math.max(-16, Math.min(16, w + d * 3)); };
      L.c.onpointerup = L.c.onpointercancel = () => { prevA = null; };
      env.key((e, d) => { if (e.key === ' ' || e.key === 'ArrowRight') { keyHeld = d; return true; } });
    }),

    // ================================================================ a label that appears on the picture (the LGM-1 note)
    note: (a) => new Promise((res) => {
      hint(fr() ? 'Touche le petit papier' : 'Touch the little note');
      const b = document.createElement('button'); b.className = 'spot soft'; b.style.left = a.at[0] * 100 + '%'; b.style.top = a.at[1] * 100 + '%'; b.style.width = b.style.height = '18%'; $('spots').append(b);
      const go = () => { b.remove(); env.key(null); sfx('chime'); const el = document.createElement('div'); el.className = 'lgm'; el.textContent = a.text; el.style.left = a.at[0] * 100 + '%'; el.style.top = a.at[1] * 100 + '%'; $('layer').append(el); hint(''); setTimeout(res, 900); };
      b.onpointerdown = (e) => { e.stopPropagation(); go(); }; env.key((e, d) => { if (d && e.key === ' ') { go(); return true; } });
    }),
    // several dishes to wake up
    dishes: (a) => new Promise((res) => {
      hint(fr() ? 'Touche les antennes pour les réveiller' : 'Touch the dishes to wake them up'); let n = 0;
      for (const at of a.spots) { const b = document.createElement('button'); b.className = 'spot soft'; b.style.left = at[0] * 100 + '%'; b.style.top = at[1] * 100 + '%'; b.style.width = b.style.height = '20%'; $('spots').append(b);
        b.onpointerdown = (e) => { e.stopPropagation(); b.remove(); n++; tone(380 + n * 120, 0.5, { type: 'sine', v: 0.12, slide: 1.5 }); noise(0.4, { v: 0.08, f: 900 }); burst(at[0], at[1], 24, 190); if (n === a.spots.length) { hint(''); env.key(null); setTimeout(res, 800); } }; }
      env.key((e, d) => { if (d && e.key === ' ') { $('spots').querySelector('.spot')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; } });
    }),
    carnet: () => { carnet(true); return Promise.resolve(); },
  };
}
