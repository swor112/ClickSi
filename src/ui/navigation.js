import { S, nav } from '../data/records.js';
import { render } from '../router.js';
import { state } from '../state.js';
import { sfx } from './sound.js';

/* ---------- navigation ---------- */
/* mode 'up' = the screen comes from the bottom (used for adding a bill) and leaves the same way */
export function push(view, extra, mode) {
  nav.stack.push({ view: S.view, detail: S.detail, y: window.scrollY, mode });
  Object.assign(S, extra || {});
  S.view = view;
  nav.anim = mode === 'up' ? 'up' : 'fwd';
  render();
  window.scrollTo(0, 0);
}
export function back() {
  const p = nav.stack.pop() || { view: 'home', y: 0 };
  if (p.mode === 'up' && state.draft) sfx('close');
  S.view = p.view;
  S.detail = p.detail;
  nav.anim = p.mode === 'up' ? 'down' : 'back';
  render();
  window.scrollTo(0, p.y || 0);
  const v = document.querySelector('#app .view');
  if (v) v.style.setProperty('--oy', (p.y || 0) + window.innerHeight / 2 + 'px');
}
export function tab(view) {
  nav.stack = [];
  nav.anim = S.view === view ? '' : 'tab';
  S.view = view;
  render();
  window.scrollTo(0, 0);
}
export function openItem(id) {
  S.histAll = false;
  push('detail', { detail: id });
}
export function keepRender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
export function applyMode() {
  const r = document.documentElement,
    m = state.user && state.user.mode;
  if (m === 'light' || m === 'dark') r.dataset.mode = m;
  else delete r.dataset.mode;
}
