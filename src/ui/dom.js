import { RM, S } from '../data/records.js';
import { state } from '../state.js';
import { keepRender } from './navigation.js';
import { sfx } from './sound.js';

/* ---------- small ui helpers ---------- */
export const $ = (s) => document.querySelector(s);
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
/* toastT: shared, see state.js */
export function toast(msg, act) {
  const t = $('#toast');
  t.innerHTML =
    `<span>${esc(msg)}</span>` +
    (act ? `<button type="button" id="toastAct">${esc(act.label)}</button>` : '');
  if (act)
    $('#toastAct').onclick = () => {
      t.classList.remove('on');
      act.fn();
    };
  t.classList.add('on');
  clearTimeout(state.toastT);
  state.toastT = setTimeout(() => t.classList.remove('on'), act ? 6000 : 2800);
}
export let sheetT;
export function openSheet(html, cls = '') {
  const m = $('#modal');
  clearTimeout(sheetT);
  m.classList.remove('closing');
  m.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
}
export function closeSheet() {
  const m = $('#modal'),
    wasDecor = !!m.querySelector('.decor');
  if (m.hidden) return;
  clearTimeout(sheetT);
  if (RM()) {
    m.hidden = true;
    m.innerHTML = '';
  } else {
    m.classList.add('closing');
    sheetT = setTimeout(() => {
      m.hidden = true;
      m.innerHTML = '';
      m.classList.remove('closing');
    }, 180);
  }
  if (wasDecor) {
    state.decT = null;
    keepRender();
  }
}
export function sheetSwap(cls, html) {
  const m = $('#modal'),
    sh = m.querySelector('.sheet.' + cls);
  if (!m.hidden && !m.classList.contains('closing') && sh) {
    const st = sh.scrollTop;
    sh.innerHTML = html;
    sh.scrollTop = st;
  } else openSheet(html, cls);
}
export function fail(id, msg, grp) {
  sfx('error');
  toast(msg);
  if (grp && !S.grp[grp]) {
    S.grp[grp] = true;
    S.grpJust = grp;
    keepRender();
  }
  const el = id && document.getElementById(id);
  if (el) {
    if (el.focus) el.focus();
    el.scrollIntoView({ block: 'center' });
  }
}
