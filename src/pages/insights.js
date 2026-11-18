import { payments, perMonth } from '../data/derived.js';
import { S } from '../data/records.js';
import { TH_M, TH_MF } from '../lib/constants.js';
import { baht, parse, today } from '../lib/dates.js';
import { state } from '../state.js';
import { esc } from '../ui/dom.js';
import { subHead } from '../ui/shared.js';

/* ---------- spending summary ---------- */
export function vInsights() {
  const total = state.items.reduce((s, i) => s + perMonth(i), 0);
  const cats = state.CFG.cats
    .map((c) => ({ c, v: state.items.filter((i) => i.cat === c).reduce((s, i) => s + perMonth(i), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const max = cats.length ? cats[0].v : 1,
    t = today(),
    months = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(t.getFullYear(), t.getMonth() - k, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth(), v: 0 });
  }
  payments().forEach(({ h }) => {
    const d = parse(h.date),
      mo = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (mo) mo.v += +h.amount || 0;
  });
  const mx = Math.max(1, ...months.map((x) => x.v));
  if (!(S.insM >= 0 && S.insM <= 5)) S.insM = 5;
  const sel = months[S.insM];
  return (
    subHead('สรุปรายจ่าย') +
    `<div class="stack">
  <section class="group"><p class="hint">รายจ่ายประจำต่อเดือน</p><p class="bigfig">${baht(Math.round(total))}</p><p class="hint">รวมรายการรายเดือน กับรายการรายปีที่เฉลี่ยเป็นรายเดือน</p></section>
  <section class="group"><h2>แยกตามหมวด</h2>
    ${cats.length ? `<div class="barlist">${cats.map((x) => `<div class="br"><span>${esc(x.c)}</span><span class="bt"><i class="bf" style="width:${((x.v / max) * 100).toFixed(1)}%"></i></span><span class="bv num">${baht(Math.round(x.v))}</span></div>`).join('')}</div>` : '<p class="hint top8">ยังไม่มีรายการที่จ่ายเป็นประจำ</p>'}
  </section>
  <section class="group"><h2>ยอดที่จ่ายจริง 6 เดือนล่าสุด</h2>
    <p class="top8">${TH_MF[sel.m]} ${sel.y + 543} จ่ายไป <b>${baht(sel.v)}</b></p>
    <div class="cols" role="group" aria-label="ยอดจ่ายรายเดือน แตะแท่งเพื่อดูยอด">${months.map((x, i) => `<button type="button" class="col" aria-pressed="${i === S.insM}" aria-label="${TH_MF[x.m]} จ่าย ${baht(x.v)}" onclick="S.insM=${i};keepRender()"><i style="height:${x.v ? Math.max(3, (x.v / mx) * 100).toFixed(1) : 0}%"></i></button>`).join('')}</div>
    <div class="colx">${months.map((x, i) => `<span${i === S.insM ? ' class="on"' : ''}>${TH_M[x.m]}</span>`).join('')}</div>
    <p class="hint top8">แตะแท่งเพื่อดูยอดของเดือนนั้น</p>
    ${state.CFG.menus.history ? `<button type="button" class="btn plain block sm top12" onclick="push('history')">ดูประวัติการจ่ายทั้งหมด</button>` : ''}
  </section></div>`
  );
}
