import { addDays, daysLeft, dim, fmtDM, fmtDMY, parse, today } from '../lib/dates.js';
import { state } from '../state.js';

/* ---------- derived data ---------- */
export function status(it) {
  if (it.done) return { t: 'จ่ายครบแล้ว', k: 'done' };
  const d = daysLeft(it);
  if (d < 0) return { t: 'เลยกำหนด ' + -d + ' วัน', k: 'over' };
  if (d === 0) return { t: 'ครบกำหนดวันนี้', k: 'over' };
  if (d === 1) return { t: 'พรุ่งนี้', k: 'soon' };
  if (d <= 7) return { t: 'อีก ' + d + ' วัน', k: 'soon' };
  return { t: 'อีก ' + d + ' วัน', k: 'ok' };
}
export function repeatShort(it) {
  if (it.repeat === 'monthly') return it.anchor >= 31 ? 'ทุกสิ้นเดือน' : 'ทุกวันที่ ' + it.anchor;
  if (it.repeat === 'yearly') return 'ทุกปี ' + fmtDM(it.due);
  return fmtDMY(it.due);
}
export function repeatLong(it) {
  if (it.repeat === 'monthly') return it.anchor >= 31 ? 'จ่ายทุกสิ้นเดือน' : 'จ่ายทุกเดือน วันที่ ' + it.anchor;
  if (it.repeat === 'yearly') return 'จ่ายทุกปี วันที่ ' + fmtDM(it.due);
  return 'จ่ายครั้งเดียว';
}
export const byDue = (a, b) => parse(a.due) - parse(b.due) || a.name.localeCompare(b.name, 'th');
export function remindsToday(it) {
  if (it.done) return false;
  const d = daysLeft(it);
  if (d < 0) return true;
  return it.daily ? d <= it.dailyFrom : it.remind.includes(d);
}
export function remindLabel(it) {
  if (it.daily) return ['ทุกวัน เริ่ม ' + it.dailyFrom + ' วันก่อนครบกำหนด'];
  return it.remind
    .slice()
    .sort((a, b) => b - a)
    .map((n) => (n === 0 ? 'วันครบกำหนด' : 'ล่วงหน้า ' + n + ' วัน'));
}
/* One line for the same thing: "ล่วงหน้า 7, 3, 1 วัน และวันครบกำหนด" */
export function remindSummary(it) {
  if (it.daily) return 'ทุกวัน เริ่ม ' + it.dailyFrom + ' วันก่อนครบกำหนด';
  const r = it.remind.slice().sort((a, b) => b - a),
    pre = r.filter((n) => n > 0),
    day = r.includes(0);
  if (!pre.length) return day ? 'วันครบกำหนด' : 'ยังไม่ได้เลือกวันเตือน';
  return 'ล่วงหน้า ' + pre.join(', ') + ' วัน' + (day ? ' และวันครบกำหนด' : '');
}
export function upcoming() {
  const out = [],
    now = Date.now(),
    lim = now + 30 * 864e5,
    t = today();
  const atOf = (d, it) => {
    const p = String(it.time).split(':').map(Number),
      x = new Date(d);
    x.setHours(p[0] || 0, p[1] || 0, 0, 0);
    return x.getTime();
  };
  const nextDaily = (it, from) => {
    let d = from < t ? t : from;
    if (atOf(d, it) <= now) d = addDays(d, 1);
    return atOf(d, it);
  };
  state.items
    .filter((i) => !i.done)
    .forEach((it) => {
      const due = parse(it.due);
      if (it.daily) {
        const at = nextDaily(it, addDays(due, -it.dailyFrom));
        if (at <= lim) out.push({ it, at, label: 'เตือนทุกวันจนกว่าจะจ่าย' });
      } else {
        it.remind.forEach((n) => {
          const at = atOf(addDays(due, -n), it);
          if (at > now && at <= lim)
            out.push({ it, at, label: n === 0 ? 'เตือนวันครบกำหนด' : 'เตือนล่วงหน้า ' + n + ' วัน' });
        });
        if (state.CFG.remind.overdue && due < t)
          out.push({ it, at: nextDaily(it, t), label: 'เตือนซ้ำเพราะเลยกำหนด' });
      }
    });
  return out.sort((a, b) => a.at - b.at || a.it.name.localeCompare(b.it.name, 'th')).slice(0, 20);
}
/* Unpaid amounts due by the end of the month (overdue carried in) plus what was paid for that month. */
export function monthSum(y, m) {
  const end = new Date(y, m + 1, 0);
  let due = 0,
    paid = 0;
  state.items.forEach((it) => {
    if (!it.done && parse(it.due) <= end) due += it.amount;
    it.history.forEach((h) => {
      const d = parse(h.due || h.date);
      if (d.getFullYear() === y && d.getMonth() === m) paid += +h.amount || 0;
    });
  });
  return { due, paid, total: due + paid };
}
/* Every bill instance that falls in a month: paid ones from history, unpaid ones from the due date or its repeat. */
export function monthEntries(y, m) {
  const out = [],
    cur = new Date(y, m, 1),
    n = dim(y, m);
  state.items.forEach((it) => {
    it.history.forEach((h) => {
      const d = parse(h.due || h.date);
      if (d.getFullYear() === y && d.getMonth() === m)
        out.push({ day: d.getDate(), it, paid: true, amount: +h.amount || 0 });
    });
    if (it.done) return;
    const d = parse(it.due),
      same = d.getFullYear() === y && d.getMonth() === m;
    if (cur < new Date(d.getFullYear(), d.getMonth(), 1)) return;
    let day;
    if (same) day = d.getDate();
    else if (it.repeat === 'monthly') day = Math.min(it.anchor, n);
    else if (it.repeat === 'yearly' && d.getMonth() === m) day = Math.min(it.anchor, n);
    else return;
    out.push({ day, it, paid: false, amount: it.amount, projected: !same });
  });
  return out.sort((a, b) => a.day - b.day || a.it.name.localeCompare(b.it.name, 'th'));
}
export function payments() {
  const out = [];
  state.items.forEach((it) => it.history.forEach((h) => out.push({ h, it })));
  const key = (x) => x.h.ts || parse(x.h.date).getTime();
  return out.sort((a, b) => key(b) - key(a));
}
export function stats() {
  const p = payments();
  let streak = 0;
  for (const x of p) {
    if (x.h.onTime) streak++;
    else break;
  }
  return { n: p.length, on: p.filter((x) => x.h.onTime).length, streak };
}
export const perMonth = (i) =>
  i.done ? 0 : i.repeat === 'monthly' ? i.amount : i.repeat === 'yearly' ? i.amount / 12 : 0;
export function nextPayday() {
  const p = +state.user.payday;
  if (!p) return null;
  const t = today();
  let d = new Date(t.getFullYear(), t.getMonth(), Math.min(p, dim(t.getFullYear(), t.getMonth())));
  if (d < t) {
    const x = new Date(t.getFullYear(), t.getMonth() + 1, 1);
    d = new Date(x.getFullYear(), x.getMonth(), Math.min(p, dim(x.getFullYear(), x.getMonth())));
  }
  return d;
}
export const payCount = (excludeId) =>
  state.items.filter((i) => i.payType !== 'none' && i.id !== excludeId).length;
export const payFull = (d) => !state.user.pro && state.CFG.menus.pro && payCount(d.id) >= state.CFG.freePay;
