// Kalulu and the great tug of war: the eight pages. Each page sets its stage, then runs as a little script:
// voices, puppet moves, sounds, and the moments where the child's hand moves the story on.
import { W, H, sleep, tapZone, dragAlong, rapid, swipeAcross, choose, hint } from './engine.js?v=202610240140';

const SPEAKER = { k: 'kalulu', e: 'elephant', h: 'hippo' };
const GROUND = 930;

export function makeStory(api) {
  const { stage, audio, say, ui, t } = api;
  const A = (n) => stage.actor(n);
  const sfx = (n, v = 1, r = 1) => audio.sfx(`sfx/${n}.mp3`, v, r);
  const amb = (n) => audio.loop('amb', `sfx/${n}.mp3`, 'amb', 1);
  const shake = (px = 10, ms = 600) => { const el = stage.root; el.classList.remove('shake'); void el.offsetWidth; el.style.setProperty('--sh', px + 'px'); el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), ms); };
  const grass = (y = 965, dark = true) => { for (const x of [-120, 980]) stage.prop('grass', { x, y, s: 1.05, cls: dark ? 'ink fg' : 'fg' }); };
  const birds = () => {
    ['bird1', 'bird2', 'bird3'].forEach((b, i) => {
      const el = stage.prop(b, { x: 500 + i * 140, y: 640 + i * 30, s: 0.55, cls: 'ink fly', layer: 'actors' });
      el.style.animationDelay = `${i * 0.25}s`;
    });
    sfx('flutter', 0.9);
  };
  // the vine between two points (stage coords), as a stretched paper strip
  const vine = (a, b, cls = '') => {
    const el = stage.prop('liana', { x: 0, y: 0, cls: 'ink vine ' + cls, layer: 'actors' });
    const set = (p, q, jitter = 0) => {
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      el.style.width = len + 'px'; el.style.height = '64px'; el.style.left = p.x + 'px'; el.style.top = (p.y - 32 + jitter) + 'px';
      el.style.transformOrigin = '0 50%'; el.style.transform = `rotate(${ang}deg)`;
    };
    set(a, b); el.set = set; return el;
  };

  const pages = [
    // 1 · dawn under the baobab
    {
      bg: 'bg-1-dawn', amb: 'amb-dawn',
      setup() {
        A('kalulu').place({ x: 1180, y: GROUND, s: 0.42, flip: false, mode: 'sleep' });
        grass(); stage.sky.className = 'sky predawn';
      },
      async run(c) {
        await say('p1a'); c();
        A('kalulu').mode = 'idle';
        await say('p1b'); c();
        say('p1c');
        await tapZone(stage, { x: 650, y: 60, w: 900, h: 380 }, null, () => say('p1c')); c();
        stage.sky.className = 'sky'; sfx('sunrise', 1); stage.fx.burst(1120, 330, 'spark', 40);
        await sleep(600); birds(); A('kalulu').mode = 'alert';
        await A('kalulu').to({ x: 1260 }, 900, { hop: 2 }); c();
        A('kalulu').mode = 'idle';
        await say('p1d');
      },
    },
    // 2 · the proud elephant
    {
      bg: 'bg-2-clearing', amb: 'amb-dawn',
      setup() {
        A('kalulu').place({ x: 560, y: GROUND, s: 0.42, flip: false });
        A('elephant').place({ x: 2300, y: GROUND + 10, s: 0.95, flip: true });
        grass();
      },
      async run(c) {
        say('p2a');
        sfx('stomp', 0.8); setTimeout(() => sfx('stomp', 0.7), 700); setTimeout(() => sfx('stomp', 0.8), 1400);
        await A('elephant').to({ x: 1320 }, 2400); c(); shake(6);
        await sleep(400); c();
        await say('p2b'); c();
        await say('p2c'); c();
        A('elephant').mode = 'laugh';
        await say('p2d'); c();
        A('elephant').mode = 'idle';
        say('p2e');
        await tapZone(stage, { x: 950, y: 380, w: 720, h: 560 }, null, () => say('p2e')); c();
        A('elephant').mode = 'trumpet'; sfx('trumpet', 1); shake(14, 900); stage.fx.burst(1320, GROUND, 'dust', 18);
        A('kalulu').to({ x: 470, lift: 0 }, 400, { hop: 1 });
        await sleep(1800); A('elephant').mode = 'idle';
      },
    },
    // 3 · the hippo in the river
    {
      bg: 'bg-3-river', amb: 'amb-river',
      setup() {
        stage.prop('rocks', { x: 250, y: 880, s: 1.6, cls: 'ink', layer: 'actors' });
        A('kalulu').place({ x: 400, y: 905, s: 0.42, flip: false });
        A('hippo').place({ x: 1260, y: 1010, s: 0.78, flip: true, clip: 32 });
        stage.prop('reeds', { x: 1650, y: 640, s: 1.1, cls: 'ink' }); stage.prop('reeds', { x: 40, y: 660, s: 1, cls: 'ink' });
      },
      async run(c) {
        await say('p3a'); c();
        await say('p3b'); c();
        A('kalulu').mode = 'alert';
        await say('p3c'); c();
        A('kalulu').mode = 'idle';
        say('p3d');
        await tapZone(stage, { x: 900, y: 650, w: 760, h: 380 }, null, () => say('p3d')); c();
        sfx('bubbles', 1); stage.fx.burst(1260, 880, 'bubbles', 30);
        await sleep(500); A('hippo').mode = 'yawn'; sfx('yawn', 1);
        await sleep(2200); A('hippo').mode = 'idle';
      },
    },
    // 4 · the longest vine, and a choice
    {
      bg: 'bg-4-forest', amb: 'amb-forest',
      setup() {
        A('kalulu').place({ x: -200, y: GROUND, s: 0.42, flip: false });
      },
      async run(c) {
        say('p4a');
        await A('kalulu').to({ x: 300 }, 1600, { hop: 4 }); c();
        await sleep(1800); c();
        say('p4b');
        const v = stage.prop('liana', { x: 420, y: 845, s: 1, cls: 'ink reveal', layer: 'actors' });
        v.style.setProperty('--k', '0%');
        let swish = 0;
        await dragAlong(stage, 420, 1590, 900, (k) => { v.style.setProperty('--k', `${(k * 100).toFixed(1)}%`); if (performance.now() - swish > 380) { swish = performance.now(); sfx('pull', 0.6); } }, () => say('p4b')); c();
        v.style.setProperty('--k', '100%'); sfx('chime', 1); stage.fx.burst(1590, 900, 'spark', 30);
        A('kalulu').mode = 'laugh'; await sleep(900); A('kalulu').mode = 'idle';
        await say('p4c'); c();
        api.order = (await choose(stage, [{ label: t('elephant'), img: 'thumb-elephant.webp' }, { label: t('hippo'), img: 'thumb-hippo.webp' }])) === 0 ? 'eh' : 'he';
        sfx('tap', 1);
      },
    },
    // 5 · the two challenges, in the order the child chose, then Kalulu hides
    {
      bg: 'bg-2-clearing', amb: 'amb-dawn',
      setup() {},
      async run(c) {
        const order = api.order || 'eh';
        for (const who of order) {
          stage.clearActors(); stage.clearProps();
          if (who === 'e') {
            await stage.setBg('bg-2-clearing', 600); amb('amb-dawn');
            A('kalulu').place({ x: 620, y: GROUND, s: 0.42, flip: false });
            A('elephant').place({ x: 1320, y: GROUND + 10, s: 0.95, flip: true });
            stage.prop('coil', { x: 690, y: 760, s: 0.32, cls: 'ink', layer: 'actors' }); grass();
            await say('p5e1'); c();
            A('elephant').mode = 'laugh'; await say('p5e2'); c(); A('elephant').mode = 'idle';
          } else {
            await stage.setBg('bg-3-river', 600); amb('amb-river');
            stage.prop('rocks', { x: 250, y: 880, s: 1.6, cls: 'ink', layer: 'actors' });
            A('kalulu').place({ x: 400, y: 905, s: 0.42, flip: false });
            A('hippo').place({ x: 1260, y: 1010, s: 0.78, flip: true, clip: 32 });
            stage.prop('coil', { x: 480, y: 735, s: 0.3, cls: 'ink', layer: 'actors' });
            stage.prop('reeds', { x: 1650, y: 640, s: 1.1, cls: 'ink' });
            await say('p5h1'); c();
            A('hippo').mode = 'laugh'; await say('p5h2'); c(); A('hippo').mode = 'idle';
          }
          sfx('page', 0.7);
        }
        stage.clearActors(); stage.clearProps();
        await stage.setBg('bg-5-panorama', 700); amb('amb-dawn');
        A('kalulu').place({ x: 560, y: 900, s: 0.36, flip: false });
        stage.prop('bush', { x: 755, y: 640, s: 0.7, cls: 'ink' });
        say('p5z');
        await A('kalulu').to({ x: 960, y: 900 }, 1600, { hop: 3 }); c();
        A('kalulu').mode = 'alert';
        A('kalulu').el.classList.add('peek');
        await A('kalulu').to({ y: 800 }, 700); c(); // only the ears peek over the bush
        await sleep(2600);
      },
    },
    // 6 · the great tug of war
    {
      bg: 'bg-5-panorama', amb: 'amb-dawn',
      setup() {
        A('elephant').place({ x: 360, y: 900, s: 0.8, flip: false });
        A('hippo').place({ x: 1600, y: 1000, s: 0.68, flip: true, clip: 30 });
        A('kalulu').place({ x: 960, y: 800, s: 0.36, flip: false, mode: 'alert' }); A('kalulu').el.classList.add('peek');
        stage.prop('bush', { x: 755, y: 640, s: 0.7, cls: 'ink' });
        api.vineL = vine({ x: 630, y: 850 }, { x: 960, y: 805 });
        api.vineR = vine({ x: 960, y: 805 }, { x: 1310, y: 785 });
      },
      async run(c) {
        let tension = 0;
        stage.onFrame = (now) => {
          const j = Math.sin(now / 40) * tension * 4;
          api.vineL?.set({ x: 630, y: 850 }, { x: 960, y: 805 }, j);
          api.vineR?.set({ x: 960, y: 805 }, { x: 1310, y: 785 }, -j);
        };
        await say('p6a'); c();
        A('elephant').mode = 'pull'; A('hippo').mode = 'pull'; tension = 1;
        audio.loop('stretch', 'sfx/stretch.mp3', 'fx', 0.7);
        await say('p6b'); c();
        await say('p6c'); c();
        await say('p6d'); c();
        say('p6e');
        await rapid(stage, 14, (p, k) => { sfx('tap', 0.7, 0.9 + k * 0.6); stage.fx.burst(p.x, p.y, 'spark', 8); tension = 1 + k * 2; if (Math.random() < 0.3) shake(4, 250); }); c();
        sfx('cheer', 0.9); tension = 1.4;
        A('kalulu').mode = 'laugh';
        await say('p6f'); c();
        A('kalulu').mode = 'alert';
      },
      leave() { audio.stopLoop('stretch', 0.4); stage.onFrame = null; },
    },
    // 7 · the vine snaps
    {
      bg: 'bg-5-panorama', amb: 'amb-dawn',
      setup() {
        A('elephant').place({ x: 360, y: 900, s: 0.8, flip: false, mode: 'pull' });
        A('hippo').place({ x: 1600, y: 1000, s: 0.68, flip: true, clip: 30, mode: 'pull' });
        A('kalulu').place({ x: 960, y: 800, s: 0.36, flip: false, mode: 'alert' }); A('kalulu').el.classList.add('peek');
        stage.prop('bush', { x: 755, y: 640, s: 0.7, cls: 'ink' });
        stage.prop('bush-s2', { x: 40, y: 790, s: 1.3, cls: 'ink' });
        api.vineL = vine({ x: 630, y: 850 }, { x: 960, y: 805 });
        api.vineR = vine({ x: 960, y: 805 }, { x: 1310, y: 785 });
        stage.sky.className = 'sky sunset';
        audio.loop('stretch', 'sfx/stretch.mp3', 'fx', 0.6);
        stage.onFrame = (now) => { const j = Math.sin(now / 40) * 4; api.vineL.set({ x: 630, y: 850 }, { x: 960, y: 805 }, j); api.vineR.set({ x: 960, y: 805 }, { x: 1310, y: 785 }, -j); };
      },
      async run(c) {
        await say('p7a'); c();
        say('p7b');
        await swipeAcross(stage, { x: 690, y: 700 }, { x: 720, y: 960 }, () => say('p7b')); c();
        stage.onFrame = null; audio.stopLoop('stretch', 0.2);
        sfx('snap', 1); stage.fx.burst(720, 760, 'spark', 30);
        api.vineL.classList.add('fallL'); api.vineR.classList.add('fallR');
        A('elephant').mode = 'idle'; A('hippo').mode = 'idle';
        A('elephant').to({ x: 170, rot: -28, y: 940 }, 900);
        A('hippo').to({ x: 1760, rot: 30, y: 1090, clip: 55 }, 900);
        await sleep(700); c();
        sfx('crash', 1); stage.fx.burst(230, 860, 'leaves', 30); shake(12, 700);
        await sleep(250); sfx('splash', 1); stage.fx.burst(1700, 960, 'splash', 46);
        A('kalulu').mode = 'laugh';
        await sleep(900); c();
        await say('p7c'); c();
        await sleep(600);
      },
      leave() { audio.stopLoop('stretch', 0.2); stage.onFrame = null; },
    },
    // 8 · friends under the moon
    {
      bg: 'bg-6-night', amb: 'amb-night', night: true,
      setup() {
        A('elephant').place({ x: 520, y: GROUND + 10, s: 0.82, flip: false });
        A('hippo').place({ x: 1420, y: GROUND + 15, s: 0.66, flip: true });
        A('kalulu').place({ x: 960, y: GROUND + 20, s: 0.4, flip: false });
        grass(975);
        stage.fx.setFireflies(16);
      },
      async run(c) {
        await say('p8a'); c();
        await say('p8b'); c();
        A('hippo').mode = 'laugh'; await say('p8c'); c(); A('hippo').mode = 'idle';
        await say('p8d'); c();
        for (const n of ['kalulu', 'elephant', 'hippo']) A(n).mode = 'laugh';
        setTimeout(() => { for (const n of ['kalulu', 'elephant', 'hippo']) if (stage.actors[n]) stage.actors[n].mode = 'idle'; }, 3500);
        audio.loop('music', 'sfx/theme.mp3', 'music', 1, 3);
        await say('p8e'); c();
        say('p8f');
        api.fireflyTaps = true;
        await sleep(9000); c();
        ui.end();
      },
      leave() { api.fireflyTaps = false; stage.fx.setFireflies(0); },
    },
  ];
  return pages;
}
export { SPEAKER };
