import { payments } from '../data/derived.js';
import { TH_MF } from '../lib/constants.js';
import { baht, fmtDM, parse } from '../lib/dates.js';
import { esc } from '../ui/dom.js';
import { listOf, subHead, tile } from '../ui/shared.js';

export function vHistory() {
  const p = payments();
  if (!p.length)
    return (
      subHead('ประวัติการจ่าย') +
      `<div class="list"><p class="rownote">ยังไม่มีประวัติการจ่าย เมื่อบันทึกว่าจ่ายแล้ว รายการจะมาแสดงที่นี่</p></div>`
    );
  const groups = [];
  p.forEach((x) => {
    const d = parse(x.h.date),
      k = d.getFullYear() * 12 + d.getMonth();
    let g = groups[groups.length - 1];
    if (!g || g.k !== k) {
      g = { k, y: d.getFullYear(), m: d.getMonth(), rows: [], sum: 0 };
      groups.push(g);
    }
    g.rows.push(x);
    g.sum += +x.h.amount || 0;
  });
  return (
    subHead('ประวัติการจ่าย') +
    groups
      .map(
        (g, gi) =>
          `<div class="sec"${gi ? '' : ' style="margin-top:0"'}><h2>${TH_MF[g.m]} ${g.y + 543}</h2><span class="meta">${baht(g.sum)}</span></div>${listOf(g.rows.map(({ h, it }) => `<button type="button" class="row" onclick="openItem('${it.id}')">${tile(it)}<span class="grow"><span class="t1">${esc(it.name)}</span><span class="t2">จ่ายวันที่ ${fmtDM(h.date)}</span></span><span class="end"><span class="amt num">${baht(h.amount)}</span><span class="st ${h.onTime ? 'done' : 'over'}">${h.onTime ? 'ตรงเวลา' : 'จ่ายช้า'}</span></span></button>`))}`,
      )
      .join('')
  );
}
