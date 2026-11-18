import { byDue, monthSum } from '../data/derived.js';
import { ID_RE, RM, S, isAdmin, nav, saveUser } from '../data/records.js';
import { TH_MF, TH_WD, TH_WDF } from '../lib/constants.js';
import { addDays, baht, fmtFull, iso, parse, today } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { installBanner } from './install.js';
import { render } from '../router.js';
import { state } from '../state.js';
import { $, esc, sheetSwap, toast } from '../ui/dom.js';
import { keepRender, openItem, tab } from '../ui/navigation.js';
import { itemRow, listOf } from '../ui/shared.js';

/* ---------- home ---------- */
export const CARD_COLORS = [
  ['jade', 'เขียวหยก', '#0C4F41'],
  ['navy', 'น้ำเงิน', '#1D3A6E'],
  ['teal', 'เขียวน้ำทะเล', '#0E5560'],
  ['plum', 'ม่วง', '#4B2A6B'],
  ['wine', 'แดงไวน์', '#7A2840'],
  ['cocoa', 'น้ำตาล', '#5A3A22'],
  ['ink', 'เทาเข้ม', '#26323A'],
  ['rose', 'ชมพูเข้ม', '#8A3358'],
];
export const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v || '');
export const cardHex = () =>
  isHex(state.user.card)
    ? state.user.card
    : (CARD_COLORS.find((c) => c[0] === state.user.card) || CARD_COLORS[0])[2];
export const cardName = () =>
  isHex(state.user.card)
    ? state.user.card.toUpperCase()
    : (CARD_COLORS.find((c) => c[0] === state.user.card) || CARD_COLORS[0])[1];
export function lum(h) {
  const c = [1, 3, 5].map((i) => {
    let v = parseInt(h.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const cardCls = (h) => (lum(h) > 0.3 ? ' lightcard' : '') + (isHex(state.user.card) ? '' : ' preset');
export const kfmt = (v) =>
  v >= 10000
    ? '฿' + Math.round(v / 100) / 10 + 'k'
    : v >= 1000
      ? '฿' + (Math.round(v / 100) / 10).toString().replace(/\.0$/, '') + 'k'
      : '฿' + Math.round(v);
export function monthCard() {
  const t = today(),
    y = t.getFullYear(),
    m = t.getMonth(),
    ms = monthSum(y, m);
  const pct = ms.total ? Math.round((ms.paid / ms.total) * 100) : 0;
  let week = '';
  for (let k = 0; k < 7; k++) {
    const d = addDays(t, k),
      L = state.items.filter((i) => !i.done && i.due === iso(d)),
      sum = L.reduce((a, i) => a + i.amount, 0);
    week += `<button type="button" class="wd7${k === 0 ? ' today' : ''}${L.length ? ' has' : ''}" onclick="weekDay('${iso(d)}')" aria-label="${fmtFull(d)} ${L.length ? L.length + ' รายการ ' + baht(sum) : 'ไม่มีรายการ'}"><span class="w">${k === 0 ? 'วันนี้' : TH_WD[d.getDay()]}</span><span class="d">${d.getDate()}</span><span class="a"></span></button>`;
  }
  return `<section class="month${cardCls(cardHex())}" id="monthCard" style="--hc:${cardHex()}" aria-label="สรุปเดือนนี้">
    <div class="mtop"><div><p class="lbl">ยังต้องจ่ายเดือน${TH_MF[m]}</p><p class="big num" id="mBig" data-v="${ms.due}">${baht(ms.due)}</p></div><button type="button" class="iconbtn" onclick="cardSheet()" aria-label="เปลี่ยนสีการ์ด">${ic('palette', 17)}</button></div>
    ${ms.total ? `<div class="mbar" role="img" aria-label="จ่ายแล้ว ${pct}%"><i style="width:${pct}%"></i></div>` : ''}
    <p class="paid">${ms.total ? (ms.due ? `จ่ายแล้ว ${baht(ms.paid)} จาก ${baht(ms.total)}` : `จ่ายครบแล้ว ${baht(ms.paid)}`) : 'ยังไม่มีรายการในเดือนนี้'}</p>
    <div class="mperf"></div>
    <div class="week" aria-label="7 วันข้างหน้า">${week}</div>
  </section>`;
}
/* The total on the card counts from the figure it showed last time to the new one. */
/* lastDue: shared, see state.js */
export function countUp(wait = 0) {
  const el = $('#mBig');
  if (!el) return;
  const to = +el.dataset.v || 0,
    from = state.lastDue == null ? 0 : state.lastDue;
  state.lastDue = to;
  if (RM() || from === to) return;
  const D = 700;
  el.textContent = baht(Math.round(from));
  const run = () => {
    const t0 = performance.now(),
      step = (now) => {
        if (!el.isConnected) return;
        const q = Math.min(1, (now - t0) / D),
          e = 1 - Math.pow(1 - q, 3);
        el.textContent = q < 1 ? baht(Math.round(from + (to - from) * e)) : baht(to);
        if (q < 1) requestAnimationFrame(step);
      };
    requestAnimationFrame(step);
  };
  wait ? setTimeout(run, wait) : run();
}
export function weekDay(d) {
  const L = state.items.filter((i) => !i.done && i.due === d);
  if (L.length === 1) return openItem(L[0].id);
  if (state.CFG.menus.cal) {
    const x = parse(d);
    S.calY = x.getFullYear();
    S.calM = x.getMonth();
    S.calD = x.getDate();
    nav.stack = [];
    S.view = 'cal';
    nav.anim = 'tab';
    render();
    window.scrollTo(0, 0);
    return;
  }
  tab('items');
}
export function cardSheet() {
  const cur = cardHex(),
    custom = isHex(state.user.card);
  sheetSwap(
    'cardsheet',
    `<div class="sheet-head"><h2>สีการ์ดสรุป</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div>
  <p class="f" style="margin-top:0">สีแนะนำ</p>
  <div class="cards">${CARD_COLORS.map(([k, l, h]) => `<button type="button" class="cardsw preset${lum(h) > 0.3 ? ' lightcard' : ''}" style="--hc:${h}" aria-pressed="${!custom && (state.user.card || 'jade') === k}" onclick="setCard('${k}')">${l}</button>`).join('')}</div>
  <p class="f">เลือกเฉดสีเอง</p>
  <div class="picker"><label class="cpick${custom ? ' on' : ''}" for="cardPick" style="--hc:${cur}"><input id="cardPick" type="color" value="${cur}" oninput="previewCard(this.value)" onchange="setCard(this.value)" aria-label="เลือกสีการ์ด"></label>
    <div class="grow"><label class="hint" for="cardHexIn">รหัสสี</label><input class="inp" id="cardHexIn" maxlength="7" value="${cur.toUpperCase()}" autocapitalize="characters" spellcheck="false" onchange="hexIn(this.value)"></div></div>
  <p class="hint top8">แตะช่องสีเพื่อเปิดวงล้อสี หรือพิมพ์รหัสสี เช่น #1D3A6E ถ้าเลือกสีอ่อน ตัวหนังสือบนการ์ดจะเปลี่ยนเป็นสีเข้มให้เอง</p>
  <button type="button" class="btn block top16" onclick="closeSheet()">เสร็จแล้ว</button>`,
  );
}
export function previewCard(h) {
  const m = $('#monthCard');
  if (m) {
    m.style.setProperty('--hc', h);
    m.className = 'month' + (lum(h) > 0.3 ? ' lightcard' : '');
  }
  const p = $('.cpick');
  if (p) p.style.setProperty('--hc', h);
  const x = $('#cardHexIn');
  if (x) x.value = h.toUpperCase();
}
export function hexIn(v) {
  v = v.trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (!isHex(v)) return toast('รหัสสีต้องเป็นแบบ #RRGGBB เช่น #1D3A6E');
  setCard(v.toLowerCase());
}
export function setCard(k) {
  state.user.card = k;
  saveUser();
  keepRender();
  cardSheet();
}
export function vHome() {
  const t = today();
  const open = state.items.filter((i) => !i.done).sort(byDue),
    show = open.slice(0, 5);
  const bc = store.get('cs_broadcasts', []).find((b) => b && b.pin && ID_RE.test(b.id));
  const head =
    `<header class="head"><div><p class="sub">วัน${TH_WDF[t.getDay()]}ที่ ${fmtFull(t)}</p><h1>สวัสดี ${esc(state.user.name)}</h1></div>${isAdmin() ? '<span class="pill pro">แอดมิน</span>' : ''}</header>` +
    (bc && state.user.hideBc !== bc.id
      ? `<div class="notice">${ic('mega')}<div class="grow"><b>${esc(bc.title)}</b><p>${esc(bc.body)}</p></div><button type="button" onclick="hideBc('${bc.id}')" aria-label="ปิดประกาศ">${ic('x', 18)}</button></div>`
      : '');
  if (!state.items.length)
    return (
      head +
      `<div class="empty"><h2>เริ่มจากบิลแรกของคุณ</h2><p>ใส่ชื่อ ยอด และวันครบกำหนด แล้ว Click Si จะเตือนก่อนถึงวันจ่ายให้เอง</p><button type="button" class="btn top8" onclick="startAdd()">${ic('plus', 18)}เพิ่มรายการ</button></div>` +
      installBanner()
    );
  return (
    head +
    monthCard() +
    installBanner() +
    `<div class="sec"><h2>${open.length ? 'ต้องจ่ายเร็วๆ นี้' : 'ไม่มีบิลค้างจ่าย'}</h2><button type="button" class="link" onclick="tab('items')">ดูทั้งหมด</button></div>` +
    (show.length
      ? listOf(show.map((i) => itemRow(i)))
      : `<p class="hint">จ่ายครบทุกรายการแล้ว รายการที่จ่ายเป็นรอบจะกลับมาแสดงเมื่อใกล้ถึงกำหนด</p>`)
  );
}
export function hideBc(id) {
  state.user.hideBc = id;
  saveUser();
  keepRender();
}
