// The block editor: a program is a vertical list of blocks; "Répéter" holds its own list. Tap a block of the
// palette to add it where the orange caret is, tap a block of the program to select it (caret after it, ✕ to
// remove), drag to move, drag out of the program to throw away. Same with mouse, finger or keyboard.
import { BLOCKS } from './levels.js';
import { count } from './vm.js';

let uid = 0;
export const mk = (op, n) => ({ id: 'k' + ++uid, op, ...(op === 'repeat' ? { n: n || 3, body: [] } : {}) });
export const fromSpec = (spec) => spec.map((s) => (typeof s === 'string' ? mk(s) : { ...mk('repeat', s.n), body: fromSpec(s.body) }));

const ICON = {
  fwd: '<svg viewBox="0 0 24 24"><path d="M12 20V5M6 11l6-6 6 6"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M18 20v-7a5 5 0 0 0-5-5H5M9 4 5 8l4 4"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M6 20v-7a5 5 0 0 1 5-5h8M15 4l4 4-4 4"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
};

export class Editor {
  constructor(el, palette, { onChange, onFull, sound } = {}) {
    this.el = el; this.pal = palette; this.onChange = onChange; this.onFull = onFull; this.sound = sound;
    this.prog = []; this.caret = { list: this.prog, i: 0 }; this.sel = null; this.limit = Infinity; this.locked = false; this.offered = [];
    this.el.addEventListener('pointerdown', (e) => this.down(e));
    this.pal.addEventListener('pointerdown', (e) => this.downPal(e));
  }
  setup({ blocks, limit, program, locked }) {
    this.offered = blocks || []; this.limit = limit || Infinity; this.locked = !!locked;
    this.prog = program ? fromSpec(program) : []; this.caret = { list: this.prog, i: this.prog.length }; this.sel = null;
    this.palette(); this.render();
  }
  get size() { return count(this.prog); }
  palette() {
    this.pal.innerHTML = this.offered.map((op) => `<button class="pb op-${op}" data-op="${op}" style="--c:${BLOCKS[op].color}"><i>${ICON[op]}</i><span>${BLOCKS[op].short || BLOCKS[op].label}</span><kbd>${BLOCKS[op].key}</kbd></button>`).join('');
    this.pal.classList.toggle('none', !this.offered.length);
  }
  // ------------------------------------------------------------ model
  find(id, list = this.prog, parent = null) {
    for (let i = 0; i < list.length; i++) { const b = list[i]; if (b.id === id) return { list, i, b, parent }; if (b.body) { const r = this.find(id, b.body, b); if (r) return r; } }
    return null;
  }
  insert(op) {
    if (this.locked) return false;
    if (this.size + 1 > this.limit) { this.sound?.full(); this.el.closest('.panel')?.classList.remove('shake'); void this.el.offsetWidth; this.el.closest('.panel')?.classList.add('shake'); this.onFull?.(); return false; }
    const b = mk(op); this.caret.list.splice(this.caret.i, 0, b);
    // a new loop opens: the caret goes inside it, so the next block lands in the loop
    if (op === 'repeat') this.caret = { list: b.body, i: 0 }; else this.caret.i++;
    this.sel = null; this.sound?.block(); this.render(b.id); this.onChange?.(); return true;
  }
  remove(id) {
    const f = this.find(id); if (!f || this.locked) return;
    f.list.splice(f.i, 1); this.caret = { list: f.list, i: f.i }; this.sel = null; this.sound?.remove(); this.render(); this.onChange?.();
  }
  removeLast() { if (this.sel) return this.remove(this.sel); const l = this.caret.list; if (this.caret.i > 0) this.remove(l[this.caret.i - 1].id); }
  clear() { if (this.locked) return; this.prog.length = 0; this.caret = { list: this.prog, i: 0 }; this.sel = null; this.render(); this.onChange?.(); }
  setN(id, d) { const f = this.find(id); if (!f || this.locked) return; f.b.n = Math.max(2, Math.min(12, f.b.n + d)); this.sound?.tick(); this.render(); this.onChange?.(); }
  // a number per block, in reading order (the coach says "bloc 4")
  numbers() { const m = new Map(); let k = 0; const walk = (l) => l.forEach((b) => { m.set(b.id, ++k); if (b.body) walk(b.body); }); walk(this.prog); return m; }
  // ------------------------------------------------------------ view
  render(pop) {
    const nums = this.numbers(), c = this.caret;
    const caret = (list, i) => (!this.locked && c.list === list && c.i === i ? '<div class="caret"></div>' : '');
    const html = (list, depth) => {
      let s = '';
      list.forEach((b, i) => {
        s += caret(list, i);
        const B = BLOCKS[b.op], cls = `blk op-${b.op}${this.sel === b.id ? ' sel' : ''}${pop === b.id ? ' pop' : ''}`;
        if (b.op === 'repeat') {
          s += `<div class="${cls}" data-id="${b.id}" style="--c:${B.color}"><div class="rh"><b class="no">${nums.get(b.id)}</b><i>${ICON.repeat}</i><span>Répéter</span>
            <span class="step"><button data-n="-1" aria-label="moins">−</button><em>${b.n}</em><button data-n="1" aria-label="plus">+</button></span><span>fois</span>${this.locked ? '' : '<button class="x" aria-label="retirer">✕</button>'}</div>
            <div class="body" data-body="${b.id}">${html(b.body, depth + 1)}${caret(b.body, b.body.length)}${b.body.length ? '' : '<div class="hole">Mets des blocs ici</div>'}</div><div class="rf"></div></div>`;
        } else s += `<div class="${cls}" data-id="${b.id}" style="--c:${B.color}"><b class="no">${nums.get(b.id)}</b><i>${ICON[b.op]}</i><span>${B.label}</span>${this.locked ? '' : '<button class="x" aria-label="retirer">✕</button>'}</div>`;
      });
      return s;
    };
    this.el.innerHTML = html(this.prog, 0) + caret(this.prog, this.prog.length) + (this.prog.length ? '' : `<div class="empty">${this.locked ? '' : 'Touche un bloc ci-dessous pour écrire le programme de ROVA.'}</div>`);
    this.el.querySelector('.caret')?.scrollIntoView({ block: 'nearest' });
  }
  mark(id, cls) { this.el.querySelector(`[data-id="${id}"]`)?.classList.add(cls); }
  unmark(cls) { for (const e of this.el.querySelectorAll('.' + cls)) e.classList.remove(cls); }
  running(id) { this.unmark('run'); if (id) { const e = this.el.querySelector(`[data-id="${id}"]`); if (e) { e.classList.add('run'); e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } } }
  // ------------------------------------------------------------ pointer
  down(e) {
    const x = e.target.closest('.x'), st = e.target.closest('[data-n]'), blk = e.target.closest('.blk');
    if (this.locked) return;
    if (st) { e.preventDefault(); this.setN(blk.dataset.id, +st.dataset.n); return; }
    if (x) { e.preventDefault(); this.remove(blk.dataset.id); return; }
    if (!blk) { // a tap on empty space: caret at the end (of the loop body when tapping inside one)
      const body = e.target.closest('.body'); const f = body && this.find(body.dataset.body);
      this.caret = f ? { list: f.b.body, i: f.b.body.length } : { list: this.prog, i: this.prog.length }; this.sel = null; this.render(); return;
    }
    // a tap on the empty part of a loop's body puts the caret inside that loop
    const body = e.target.closest('.body'); if (body && body.dataset.body === blk.dataset.id) { const f = this.find(blk.dataset.id); this.caret = { list: f.b.body, i: f.b.body.length }; this.sel = null; this.render(); return; }
    this.drag(e, { id: blk.dataset.id, el: blk });
  }
  downPal(e) { const b = e.target.closest('.pb'); if (!b || this.locked) return; this.drag(e, { op: b.dataset.op, el: b }); }
  drag(e, src) {
    const x0 = e.clientX, y0 = e.clientY; let ghost = null, target = null;
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7) return;
      if (!ghost) {
        ghost = src.el.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('sel'); document.body.append(ghost);
        const r = src.el.getBoundingClientRect(); ghost.style.width = Math.min(r.width, 340) + 'px'; this.el.classList.add('dragging'); if (src.id) src.el.classList.add('lifted');
      }
      ghost.style.transform = `translate(${ev.clientX - 30}px, ${ev.clientY - 24}px) rotate(-2deg)`;
      target = this.dropAt(ev.clientX, ev.clientY, src.id); this.showDrop(target);
      document.body.classList.toggle('trash', !!src.id && !target);
    };
    const up = (ev) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      document.body.classList.remove('trash'); this.el.classList.remove('dragging');
      if (!ghost) { // a tap
        if (src.op) this.insert(src.op);
        else { const f = this.find(src.id); this.sel = this.sel === src.id ? null : src.id; this.caret = { list: f.list, i: f.i + 1 }; this.sound?.tick(); this.render(); }
        return;
      }
      ghost.remove(); this.showDrop(null);
      if (src.op) { if (target) { this.caret = target; this.insert(src.op); } return; }
      const f = this.find(src.id); if (!f) return;
      if (!target) { this.remove(src.id); return; }
      if (f.b.body && this.inside(target.list, f.b)) { this.render(); return; } // a loop cannot go into itself
      f.list.splice(f.i, 1); let i = target.i; if (target.list === f.list && f.i < i) i--;
      target.list.splice(i, 0, f.b); this.caret = { list: target.list, i: i + 1 }; this.sel = null; this.sound?.block(); this.render(f.b.id); this.onChange?.();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  inside(list, loop) { if (list === loop.body) return true; return loop.body.some((b) => b.body && this.inside(list, b)); }
  // where a block dropped at (x, y) goes: the list (program or a loop's body) and the index
  dropAt(x, y, dragId) {
    this.el.querySelector('.drop')?.remove(); // measure the blocks without the drop marker pushing them down
    const pr = this.el.getBoundingClientRect(); if (x < pr.left - 30 || x > pr.right + 30 || y < pr.top - 30 || y > pr.bottom + 30) return null;
    // the deepest loop body under the pointer
    let list = this.prog, host = this.el;
    for (const b of this.el.querySelectorAll('.body')) { const r = b.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top - 6 && y <= r.bottom + 6 && b.dataset.body !== dragId) { const f = this.find(b.dataset.body); if (f) { list = f.b.body; host = b; } } }
    const kids = [...host.children].filter((c) => c.classList.contains('blk'));
    let i = kids.length; for (let k = 0; k < kids.length; k++) { const r = kids[k].getBoundingClientRect(); if (y < r.top + Math.min(r.height, 44) / 2) { i = k; break; } }
    return { list, i, host };
  }
  showDrop(t) {
    this.el.querySelector('.drop')?.remove(); if (!t) return;
    const d = document.createElement('div'); d.className = 'drop'; const kids = [...t.host.children].filter((c) => c.classList.contains('blk'));
    if (kids[t.i]) t.host.insertBefore(d, kids[t.i]); else { const hole = t.host.querySelector(':scope > .hole'); if (hole) t.host.insertBefore(d, hole); else t.host.append(d); }
  }
}
