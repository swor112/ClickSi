import { TH_M, TH_MF } from './constants.js';

/* ---------- dates and money ---------- */
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parse = (s) => {
  const a = String(s).split('-').map(Number);
  return new Date(a[0], a[1] - 1, a[2]);
};
export const asDate = (d) => (typeof d === 'string' ? parse(d) : d);
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dim = (y, m) => new Date(y, m + 1, 0).getDate();
export function addMonths(d, n, anchor) {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(
    t.getFullYear(),
    t.getMonth(),
    Math.min(anchor || d.getDate(), dim(t.getFullYear(), t.getMonth())),
  );
}
export const fmtDM = (d) => {
  d = asDate(d);
  return d.getDate() + ' ' + TH_M[d.getMonth()];
};
export const fmtDMY = (d) => {
  d = asDate(d);
  return fmtDM(d) + ' ' + String(d.getFullYear() + 543).slice(2);
};
export const fmtFull = (d) => {
  d = asDate(d);
  return d.getDate() + ' ' + TH_MF[d.getMonth()] + ' ' + (d.getFullYear() + 543);
};
export const baht = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const daysLeft = (it) => Math.round((parse(it.due) - today()) / 864e5);
