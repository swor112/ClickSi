import { repeatShort, status } from '../data/derived.js';
import { RM, S, nav } from '../data/records.js';
import { unread } from '../data/reminders.js';
import { baht, fmtDM } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { state } from '../state.js';
import { esc } from './dom.js';

/* ---------- shared pieces ---------- */
export function tile(it, size = 40) {
  const inner = it.image ? `<img src="${it.image}" alt="">` : ic(it.icon, Math.round(size * 0.5));
  return `<span class="tile" style="--h:var(--hue-${it.hue});width:${size}px;height:${size}px">${inner}</span>`;
}
export function itemRow(it, sub) {
  const s = status(it);
  return `<button type="button" class="row" onclick="openItem('${it.id}')">${tile(it, 42)}<span class="grow"><span class="t1">${esc(it.name)}</span><span class="t2">${sub || `<span>${it.done ? repeatShort(it) : fmtDM(it.due)}</span><span class="st ${s.k}">${s.t}</span>`}</span></span><span class="end"><span class="amt num">${baht(it.amount)}</span></span></button>`;
}
export const listOf = (rows) => `<div class="list">${rows.join('')}</div>`;
export function tabBar() {
  const n = unread(),
    cur = S.view === 'cal' ? 'items' : S.view,
    at = { home: 0, items: 1, notif: 3, me: 4 }[cur],
    from = nav.tabAt == null ? at : nav.tabAt;
  nav.tabAt = at;
  const b = (v, i, l) =>
    `<button type="button" data-tab="${v}" onclick="tab('${v}')"${cur === v ? ' aria-current="page"' : ''}>${ic(i, 23)}<span>${l}</span>${v === 'notif' && n ? `<span class="count">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
  return `<nav class="tabbar" aria-label="เมนูหลัก"><i class="tabind${from !== at && !RM() ? ' move' : ''}" style="--from:${from};--to:${at}"></i>${b('home', 'home', 'หน้าแรก')}${b('items', 'list', 'รายการ')}<button type="button" class="fab" onclick="startAdd()" aria-label="เพิ่มรายการ">${ic('plus', 26)}</button>${b('notif', 'bell', 'แจ้งเตือน')}${b('me', 'user', 'ฉัน')}</nav>`;
}
/* list or calendar: two ways to look at the same bills */
export const viewToggle = () =>
  state.CFG.menus.cal
    ? `<div class="seg vt" role="group" aria-label="มุมมอง"><button type="button" id="vwList" aria-pressed="${S.view === 'items'}" aria-label="ดูแบบรายการ" onclick="tab('items')">${ic('list', 18)}</button><button type="button" id="vwCal" aria-pressed="${S.view === 'cal'}" aria-label="ดูแบบปฏิทิน" onclick="tab('cal')">${ic('cal', 18)}</button></div>`
    : '';
export const subHead = (title, extra = '', close = false) =>
  `<header class="sub-head"><button type="button" class="iconbtn" onclick="back()" aria-label="${close ? 'ปิด' : 'ย้อนกลับ'}">${ic(close ? 'x' : 'back')}</button><h1>${title}</h1>${extra}</header>`;
