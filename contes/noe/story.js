// Noah and the ark (Genesis 6 to 9): the seven pages. Each page sets its stage, then runs as a little script:
// voices, puppet moves, sounds, and the moments where the child's hand moves the story on.
import { W, H, sleep, tapZone, dragAlong, rapid, swipeAcross, hint } from './engine.js?v=202610240100';

export const SPEAKER = { o: 'noe' };
const GROUND = 975;
// the ark on dry land: its box in stage coordinates, and where its doorway is
const ARK = { x: 200, s: 1.4, bottom: 960 };
const arkTop = (a) => a.bottom - 428 * a.s;
const doorX = (a) => a.x + 457 * a.s;

export function makeStory(api) {
  const { stage, audio, say, ui } = api;
  const A = (n) => stage.actor(n);
  const sfx = (n, v = 1, r = 1) => audio.sfx(`sfx/${n}.mp3`, v, r);
  const amb = (n) => audio.loop('amb', `sfx/${n}.mp3`, 'amb', 1);
  const flash = () => { const f = document.getElementById('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); };
  const grass = () => { stage.prop('grass', { x: -60, y: 905, s: 1.15 }); stage.prop('grass2', { x: 1560, y: 900, s: 1.2 }); };
  // the ark (and its door) as props; build = how much of it stands (0..1)
  const ark = (o = ARK, door = false) => {
    const el = stage.prop('ark', { x: o.x, y: arkTop(o), s: o.s, layer: 'actors', cls: 'ark' });
    let d = null;
    if (door !== null) {
      d = stage.prop('door', { x: o.x + 385 * o.s, y: arkTop(o) + 238 * o.s, layer: 'actors', cls: 'door' + (door ? ' shut' : '') });
      d.style.width = 145 * o.s + 'px'; d.style.height = 194 * o.s + 'px'; d.style.transform = '';
    }
    return { el, d };
  };
  const shut = (d, on) => d.classList.toggle('shut', on);
  // an animal walks somewhere; facing the way it goes
  const walk = async (id, x, ms, hop = 0) => { const a = A(id); a.flip = x < a.x; await a.to({ x }, ms, hop ? { hop } : {}); };
  const intoArk = async (id, o = ARK) => {
    const a = A(id);
    await walk(id, doorX(o), 1300);
    await a.to({ alpha: 0, s: a.s * 0.85 }, 450);
    stage.dismiss(id);
  };
  // a pair of animals arrives from the right and waits to be touched
  const pair = async (kind, s, line, sound, c) => {
    A(kind).place({ x: 2150, y: GROUND, s, flip: true });
    A(kind + '#2').place({ x: 2350, y: GROUND + 8, s: s * 0.94, flip: true });
    sfx('hooves', 0.6);
    await Promise.all([walk(kind, 1520, 1800), walk(kind + '#2', 1720, 2000)]); c();
    for (const id of [kind, kind + '#2']) A(id).flip = true;
    await tapZone(stage, { x: 1380, y: GROUND - 330, w: 480, h: 360 }, null, () => say('p3b')); c();
    sfx(sound, 0.8); say(line);
    for (const id of [kind, kind + '#2']) { const a = A(id); const y = a.y; a.to({ y }, 500, { hop: 1 }); }
    await sleep(600);
    sfx('hooves', 0.7);
    await Promise.all([intoArk(kind), sleep(350).then(() => intoArk(kind + '#2'))]); c();
  };

  const pages = [
    // 1 · Noé, who loved God
    {
      bg: 'bg-1-dawn', amb: 'amb-hills',
      setup() {
        A('noe').place({ x: 760, y: GROUND - 10, s: 0.78, mode: 'idle' });
        grass();
      },
      async run(c) {
        await say('p1a'); c();
        await say('p1b'); c();
        say('p1c');
        const n = A('noe');
        await tapZone(stage, { x: n.x - 190, y: n.y - 560, w: 380, h: 560 }, null, () => say('p1c')); c();
        n.mode = 'wave'; sfx('glass', 0.8); stage.fx.burst(n.x + 60, n.y - 380, 'spark', 14);
        await say('p1d'); c();
        n.mode = 'idle';
        // the call: a warm beam from the sky, Noé looks up
        stage.sky.className = 'sky beam'; sfx('sunrise', 0.8);
        await sleep(600); n.mode = 'look';
        await say('p1e'); c();
        await sleep(400);
      },
    },
    // 2 · building the ark, plank after plank
    {
      bg: 'bg-2-meadow', amb: 'amb-meadow',
      setup() {
        stage.prop('ark', { x: ARK.x, y: arkTop(ARK), s: ARK.s, layer: 'actors', cls: 'ghost' }); // where it will stand
        const { el } = ark(ARK, null);
        el.classList.add('build'); el.style.setProperty('--b', '100%');
        stage.prop('planks', { x: 1180, y: 905, s: 0.9, layer: 'actors' });
        A('noe').place({ x: 1680, y: GROUND, s: 0.56, flip: true, mode: 'idle' });
      },
      async run(c) {
        sfx('saw', 0.7);
        await say('p2a'); c();
        say('p2b');
        const el = stage.props.find((p) => p.classList.contains('ark'));
        const n = A('noe');
        for (let i = 1; i <= 3; i++) {
          await tapZone(stage, { x: ARK.x + 100, y: 420, w: 1080, h: 540 }, null, () => say('p2b')); c();
          sfx('hammer', 0.9); setTimeout(() => sfx('beam', 0.7), 350);
          n.mode = 'raise'; setTimeout(() => { if (n.mode === 'raise') n.mode = 'idle'; }, 700);
          el.style.setProperty('--b', `${100 - i * 34}%`);
          for (let k = 0; k < 3; k++) stage.fx.burst(ARK.x + 200 + Math.random() * 900, 960 - i * 150, 'dust', 6);
          await sleep(900);
          if (i === 1) await say('p2c');
          if (i === 2) await say('p2d');
        }
        el.style.setProperty('--b', '0%'); sfx('chime', 0.6);
        await sleep(500); c();
        await say('p2e'); c();
        n.mode = 'laugh'; setTimeout(() => (n.mode = 'idle'), 1600);
        await say('p2f'); c();
      },
    },
    // 3 · two by two
    {
      bg: 'bg-2-meadow', amb: 'amb-meadow',
      setup() {
        ark(ARK, null);
        A('noe').place({ x: 560, y: GROUND, s: 0.56, mode: 'idle' });
      },
      async run(c) {
        await say('p3a'); c();
        say('p3b');
        await pair('elephant', 0.6, 'p3c', 'trumpet', c);
        await pair('giraffe', 0.62, 'p3d', 'hooves', c);
        await pair('lion', 0.58, 'p3e', 'roar', c);
        await pair('sheep', 0.5, 'p3f', 'baa', c);
        A('noe').mode = 'wave';
        await say('p3g'); c();
        A('noe').mode = 'idle';
      },
    },
    // 4 · the door is shut, the rain falls, the water rises
    {
      bg: 'bg-3-storm', amb: 'amb-storm',
      setup() {
        const { d } = ark(ARK, false);
        stage.page = { d };
        A('noe').place({ x: 1150, y: GROUND, s: 0.56, flip: true, mode: 'idle' });
        stage.sky.className = 'sky storm';
      },
      async run(c) {
        const { d } = stage.page;
        say('p4a');
        await sleep(1200);
        await walk('noe', doorX(ARK), 2200); c();
        await A('noe').to({ alpha: 0, s: 0.5 }, 500); stage.dismiss('noe');
        await sleep(900); c();
        shut(d, true); sfx('door', 1);
        await sleep(1500); c();
        sfx('thunder', 0.8); flash();
        say('p4b');
        await sleep(900);
        let level = 0.2; stage.fx.setRain(level); sfx('rainstart', 0.5);
        await rapid(stage, 12, (p, k) => { level = 0.2 + k * 1.6; stage.fx.setRain(level); sfx('glass', 0.35, 0.8 + k); if (Math.random() < 0.18) { flash(); sfx('thunder', 0.5); } }); c();
        stage.fx.setRain(1.8);
        // the water rises over the meadow and lifts the ark
        const w = stage.prop('waves-front', { x: -121, y: 739, layer: 'actors', cls: 'flood' });
        w.style.width = '2162px'; w.style.height = '405px';
        const el = stage.props.find((p) => p.classList.contains('ark'));
        await say('p4c'); c();
        el.classList.add('afloat'); d.classList.add('afloat');
        await sleep(1200);
      },
      leave() { stage.fx.setRain(0); },
    },
    // 5 · afloat: rock the ark
    {
      bg: 'bg-4-sea', amb: 'amb-sea',
      setup() {
        // the ark and the nearest waves live inside the picture itself, so they move exactly with it
        const g = stage.group('float', 'bg');
        g.style.cssText = 'left:0;top:0;width:2000px;height:1160px';
        const box = stage.group('bob'); g.append(box);
        box.style.cssText = 'left:520px;top:450px;width:960px;height:450px;transform-origin:50% 90%';
        const a = stage.prop('ark', { x: 0, y: 0, s: 1.05, parent: box });
        const d = stage.prop('door', { x: 385 * 1.05, y: 238 * 1.05, parent: box, cls: 'door shut' }); d.style.width = 145 * 1.05 + 'px'; d.style.height = 194 * 1.05 + 'px'; d.style.transform = '';
        const wv = stage.prop('waves-front', { x: -39, y: 771, parent: g }); wv.style.width = '2079px'; wv.style.height = '389px';
        stage.page = { box };
        stage.fx.setRain(0.7);
      },
      async run(c) {
        const { box } = stage.page;
        await say('p5a'); c();
        say('p5b');
        let last = 0;
        await dragAlong(stage, 560, 1360, 640, (k) => {
          box.style.setProperty('--rock', `${Math.sin(k * Math.PI * 4) * 5}deg`);
          if (k - last > 0.22) { last = k; sfx('creak', 0.6, 0.9 + Math.random() * 0.2); }
        }, () => say('p5b')); c();
        box.style.setProperty('--rock', '0deg');
        stage.fx.setRain(0.35);
        await say('p5c'); c();
        stage.fx.setRain(0.1);
        await sleep(800);
      },
      leave() { stage.fx.setRain(0); },
    },
    // 6 · the rain stops, the ark rests, the dove
    {
      bg: 'bg-5-mountain', amb: 'amb-calm',
      setup() {
        ark({ x: 1300, s: 0.58, bottom: 705 }, true);
        stage.sky.className = 'sky glow';
      },
      async run(c) {
        sfx('sunrise', 0.9);
        await say('p6a'); c();
        await say('p6b'); c();
        say('p6c');
        await swipeAcross(stage, { x: 1100, y: 470 }, { x: 1850, y: 470 }, () => say('p6c')); c();
        const dv = stage.prop('dove1', { x: 1500, y: 470, s: 0.55, layer: 'actors', cls: 'dove out' });
        sfx('flutter', 0.9); sfx('coo', 0.5);
        await sleep(3400); dv.remove(); c();
        const back = stage.prop('dove2', { x: 1420, y: 400, s: 0.5, layer: 'actors', cls: 'dove back' });
        sfx('flutter', 0.8);
        await sleep(2600); sfx('coo', 0.7); sfx('chime', 0.6);
        stage.fx.burst(1520, 480, 'spark', 18);
        await say('p6d'); c();
        back.classList.add('perch');
        await sleep(500);
      },
    },
    // 7 · out of the ark, the rainbow and the promise
    {
      bg: 'bg-6-land', amb: 'amb-land',
      setup() {
        const o = { x: 80, s: 1.0, bottom: 930 };
        const { d } = ark(o, true);
        stage.page = { d, o };
        stage.prop('bush', { x: 1660, y: 800, s: 0.9 });
        stage.prop('grass', { x: 1380, y: 905, s: 1.0 });
      },
      async run(c) {
        const { d, o } = stage.page;
        say('p7a');
        await tapZone(stage, { x: o.x + 360 * o.s, y: o.bottom - 250 * o.s - 60, w: 200 * o.s + 40, h: 260 * o.s + 60 }, null, () => say('p7a')); c();
        shut(d, false); sfx('door', 0.7); sfx('cheer', 0.8);
        const dx = doorX(o);
        // two rows: the tall ones further back, the small ones in front
        const slots = [
          ['elephant', 0.5, 1020, 948], ['elephant#2', 0.48, 1200, 952], ['giraffe', 0.52, 1390, 944], ['giraffe#2', 0.5, 1530, 948], ['camel', 0.48, 1690, 950], ['camel#2', 0.46, 1830, 954],
          ['lion', 0.5, 820, 1008], ['lion#2', 0.48, 990, 1012], ['zebra', 0.5, 1170, 1010], ['zebra#2', 0.48, 1340, 1016], ['sheep', 0.44, 1520, 1022], ['sheep#2', 0.42, 1670, 1026],
        ];
        say('p7b');
        let i = 0;
        for (const [id, s, tx, ty] of slots) {
          const a = A(id).place({ x: dx, y: GROUND - 20, s: s * 0.8, alpha: 0, flip: false });
          setTimeout(async () => {
            await a.to({ alpha: 1, s }, 350);
            sfx('hooves', 0.4, 0.9 + Math.random() * 0.3);
            await a.to({ x: tx, y: ty }, 1800 + Math.random() * 400, { hop: 3 });
          }, i++ * 420);
        }
        await sleep(i * 420 + 2400); c();
        A('noe').place({ x: dx, y: GROUND - 10, s: 0.5, alpha: 0 });
        await A('noe').to({ alpha: 1, s: 0.56 }, 500);
        await walk('noe', 560, 1600); A('noe').flip = false; c();
        say('p7c');
        // the rainbow, painted by the finger across the sky
        const rb = document.getElementById('rainbow'); rb.classList.add('on'); rb.style.setProperty('--k', 0);
        let lastK = 0;
        await dragAlong(stage, 360, 1560, 330, (k) => {
          rb.style.setProperty('--k', k);
          if (k - lastK > 0.12) { lastK = k; sfx('glass', 0.35, 0.8 + k * 0.9); }
        }, () => say('p7c')); c();
        rb.style.setProperty('--k', 1); sfx('rainbow', 1); stage.fx.burst(960, 300, 'spark', 30);
        A('noe').mode = 'look';
        await say('p7d'); c();
        A('noe').mode = 'raise';
        await say('p7e'); c();
        A('noe').mode = 'idle';
        await say('p7f'); c();
        await sleep(1500); c();
        ui.end();
      },
      leave() { document.getElementById('rainbow').classList.remove('on'); },
    },
  ];
  return pages;
}
