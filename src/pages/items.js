import { byDue } from '../data/derived.js';
import { RM, S } from '../data/records.js';
import { baht, daysLeft } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { state } from '../state.js';
import { $, esc } from '../ui/dom.js';
import { keepRender } from '../ui/navigation.js';
import { itemRow, listOf, viewToggle } from '../ui/shared.js';

/* ---------- all items ---------- */
export function itemsList() {
  const q = S.q.trim().toLowerCase();
  const L = state.items.filter(
    (i) => (S.cat === 'all' || i.cat === S.cat) && (!q || i.name.toLowerCase().includes(q)),
  );
  if (!state.items.length)
    return `<div class="empty top12"><h2>ยังไม่มีรายการ</h2><p>กดปุ่มบวกด้านล่างเพื่อเพิ่มบิลหรือวันหมดอายุ</p></div>`;
  if (!L.length)
    return `<div class="list top12"><p class="rownote">ไม่พบรายการที่ตรงกับคำค้นหรือหมวดที่เลือก</p></div>`;
  if (S.sort === 'amount')
    return `<div class="top12">${listOf(
      L.slice()
        .sort((a, b) => b.amount - a.amount || byDue(a, b))
        .map((i) => itemRow(i)),
    )}</div>`;
  if (S.sort === 'name')
    return `<div class="top12">${listOf(
      L.slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'th'))
        .map((i) => itemRow(i)),
    )}</div>`;
  const open = L.filter((i) => !i.done).sort(byDue);
  const g = [
    ['เลยกำหนด', open.filter((i) => daysLeft(i) < 0)],
    [
      'ภายใน 7 วัน',
      open.filter((i) => {
        const d = daysLeft(i);
        return d >= 0 && d <= 7;
      }),
    ],
    ['หลังจากนี้', open.filter((i) => daysLeft(i) > 7)],
    ['จ่ายครบแล้ว', L.filter((i) => i.done)],
  ];
  return g
    .filter((x) => x[1].length)
    .map(
      ([h, rows]) =>
        `<div class="sec${h === 'เลยกำหนด' ? ' late' : ''}"><h2>${h}</h2><span class="meta">${baht(rows.reduce((s, i) => s + i.amount, 0))}</span></div>${listOf(rows.map((i) => itemRow(i)))}`,
    )
    .join('');
}
export function refreshItems(swap) {
  const el = $('#itemsList');
  if (!el) return;
  el.innerHTML = itemsList();
  if (swap && !RM()) {
    el.classList.remove('swap');
    void el.offsetWidth;
    el.classList.add('swap');
  }
}
export function setCat(i) {
  S.cat = i < 0 ? 'all' : state.CFG.cats[i];
  keepRender();
  const el = $('#itemsList');
  if (el && !RM()) el.classList.add('swap');
}
export function vItems() {
  if (S.cat !== 'all' && !state.CFG.cats.includes(S.cat)) S.cat = 'all';
  const cnt = (c) => state.items.filter((i) => c === 'all' || i.cat === c).length;
  const chip = (c, l, i) =>
    `<button type="button" class="chip" aria-pressed="${S.cat === c}" onclick="setCat(${i})">${esc(l)}<small>${cnt(c)}</small></button>`;
  return `<header class="head"><h1>รายการ</h1>${viewToggle()}</header>
  <div class="searchrow"><label class="search" for="q">${ic('search', 18)}<input id="q" type="search" placeholder="ค้นหาชื่อรายการ" value="${esc(S.q)}" oninput="S.q=this.value;refreshItems()"></label>
  <label class="sortbtn${S.sort === 'due' ? '' : ' on'}" id="sortBtn" title="เรียงลำดับ">${ic('sort', 18)}<select id="sortSel" aria-label="เรียงลำดับ" onchange="S.sort=this.value;document.getElementById('sortBtn').classList.toggle('on',S.sort!=='due');refreshItems(true)">${[
    ['due', 'เรียงตามวันครบกำหนด'],
    ['amount', 'เรียงตามยอดเงิน'],
    ['name', 'เรียงตามชื่อ'],
  ]
    .map(([v, l]) => `<option value="${v}"${S.sort === v ? ' selected' : ''}>${l}</option>`)
    .join('')}</select></label></div>
  <div class="chips scroll">${chip('all', 'ทั้งหมด', -1)}${state.CFG.cats.map((c, i) => (cnt(c) ? chip(c, c, i) : '')).join('')}</div>
  <div id="itemsList">${itemsList()}</div>`;
}
