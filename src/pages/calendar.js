import { monthEntries, nextPayday, status } from '../data/derived.js';
import { RM, S } from '../data/records.js';
import { TH_MF, TH_WD } from '../lib/constants.js';
import { baht, dim, fmtDM, parse, today } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { state } from '../state.js';
import { esc } from '../ui/dom.js';
import { keepRender } from '../ui/navigation.js';
import { listOf, tile, viewToggle } from '../ui/shared.js';

/* ---------- calendar ---------- */
export function calMove(k) {
  let m = S.calM + k,
    y = S.calY;
  if (m < 0) {
    m = 11;
    y--;
  }
  if (m > 11) {
    m = 0;
    y++;
  }
  const t = today();
  S.calY = y;
  S.calM = m;
  S.calD = y === t.getFullYear() && m === t.getMonth() ? t.getDate() : 1;
  S.calSlide = k > 0 ? 'next' : 'prev';
  keepRender();
}
export function calToday() {
  const t = today(),
    d = S.calY == null ? 0 : (S.calY - t.getFullYear()) * 12 + S.calM - t.getMonth();
  S.calSlide = d > 0 ? 'prev' : d < 0 ? 'next' : null;
  S.calY = null;
  keepRender();
}
export function calPick(d) {
  S.calD = d;
  keepRender();
  const el = document.querySelector('.daylist');
  if (el && !RM()) el.classList.add('swap');
}
export function vCal() {
  const t = today();
  if (S.calY == null) {
    S.calY = t.getFullYear();
    S.calM = t.getMonth();
    S.calD = t.getDate();
  }
  const y = S.calY,
    m = S.calM,
    n = dim(y, m),
    start = new Date(y, m, 1).getDay(),
    isCur = y === t.getFullYear() && m === t.getMonth();
  if (S.calD > n) S.calD = n;
  const sl = S.calSlide && !RM() ? ' ' + S.calSlide : '';
  S.calSlide = null;
  const ents = monthEntries(y, m),
    by = {};
  ents.forEach((e) => (by[e.day] = by[e.day] || []).push(e));
  const total = ents.reduce((s, e) => s + e.amount, 0),
    pd = +state.user.payday ? Math.min(+state.user.payday, n) : 0;
  let cells = TH_WD.map((h) => `<span class="wd">${h}</span>`).join('');
  for (let i = 0; i < start; i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++) {
    const L = by[d] || [];
    cells += `<button type="button" class="day${isCur && d === t.getDate() ? ' today' : ''}" aria-pressed="${d === S.calD}" aria-label="${d} ${TH_MF[m]} ${L.length} รายการ" onclick="calPick(${d})">${d}${d === pd ? '<span class="pd">฿</span>' : ''}<span class="dots">${L.slice(
      0,
      3,
    )
      .map((e) => `<i${e.paid ? ' class="p"' : ''} style="--h:var(--hue-${e.it.hue})"></i>`)
      .join('')}</span></button>`;
  }
  const sel = by[S.calD] || [];
  const np = isCur ? nextPayday() : null,
    before = np
      ? state.items.filter((i) => !i.done && parse(i.due) < np).reduce((a, i) => a + i.amount, 0)
      : 0;
  const payLine = !np
    ? ''
    : np - t === 0
      ? 'วันนี้เงินเดือนเข้า'
      : before > 0
        ? `ก่อนเงินเดือนเข้า ${fmtDM(np)} ต้องจ่ายอีก ${baht(before)}`
        : `ไม่มีบิลครบกำหนดก่อนเงินเดือนเข้า ${fmtDM(np)}`;
  return `<header class="head"><h1>ปฏิทิน</h1>${viewToggle()}</header>
  <div class="cal-title"><b class="${sl.trim()}">${TH_MF[m]} ${y + 543}</b><div class="hbtns"><button type="button" class="iconbtn" onclick="calMove(-1)" aria-label="เดือนก่อนหน้า">${ic('chevL')}</button><button type="button" class="btn plain sm" onclick="calToday()">วันนี้</button><button type="button" class="iconbtn" onclick="calMove(1)" aria-label="เดือนถัดไป">${ic('chevR')}</button></div></div>
  <div class="cal${sl}">${cells}</div>
  <p class="cal-legend"><span><i></i>ยังไม่จ่าย</span><span><i class="p"></i>จ่ายแล้ว</span>${pd ? '<span><b>฿</b>วันเงินเดือนเข้า</span>' : ''}<span>รวมทั้งเดือน ${baht(total)}</span></p>
  ${payLine ? `<p class="cal-pay">${ic('wallet', 16)}<span>${payLine}</span></p>` : ''}
  <div class="sec"><h2>${S.calD} ${TH_MF[m]}</h2><span class="meta">${sel.length ? baht(sel.reduce((s, e) => s + e.amount, 0)) : ''}</span></div>
  <div class="daylist">${sel.length ? listOf(sel.map((e) => `<button type="button" class="row" onclick="openItem('${e.it.id}')">${tile(e.it, 42)}<span class="grow"><span class="t1">${esc(e.it.name)}</span><span class="t2">${e.paid ? '<span class="st done">จ่ายแล้ว</span>' : e.projected ? 'รอบถัดไป' : `<span class="st ${status(e.it).k}">${status(e.it).t}</span>`}</span></span><span class="end"><span class="amt num">${baht(e.amount)}</span></span></button>`)) : `<p class="hint">ไม่มีรายการในวันนี้</p>`}</div>`;
}
