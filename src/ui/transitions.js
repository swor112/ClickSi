import { $ } from './dom.js';

/* The screen being left: a still copy that stays put (or moves away) while the next screen arrives. */
export const GHOST = { fwd: '', back: ' top', up: '', down: ' top', tab: ' top' };
export let ghostT;
export function dropGhost() {
  clearTimeout(ghostT);
  document.querySelectorAll('.ghost').forEach((g) => g.remove());
}
export function snap(a, sameBar) {
  dropGhost();
  const app = $('#app'),
    v = app.querySelector('.view');
  if (!v || !(a in GHOST)) return;
  const g = document.createElement('div'),
    box = document.createElement('div'),
    c = v.cloneNode(true);
  g.className = 'ghost' + GHOST[a];
  g.dataset.anim = a;
  g.setAttribute('aria-hidden', 'true');
  box.className = 'gbox';
  c.removeAttribute('data-anim');
  c.style.transform = 'translateY(' + -window.scrollY + 'px)';
  box.appendChild(c);
  if (!sameBar) {
    const bar = app.querySelector('.tabbar,.actbar');
    if (bar) {
      const k = bar.cloneNode(true);
      k.classList.remove('rise');
      box.appendChild(k);
    }
  }
  box.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  g.appendChild(box);
  document.body.appendChild(g);
  ghostT = setTimeout(dropGhost, a === 'tab' ? 320 : 540);
}
