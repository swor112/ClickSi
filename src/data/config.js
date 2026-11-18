import { DEF_BANKS, DEF_CATS, DEF_TEMPLATES, HUES, ITEM_ICONS, REP } from '../lib/constants.js';
import { store } from '../lib/store.js';
import { state } from '../state.js';

/* ---------- settings the admin controls (these live on the server once the site is real) ---------- */
export const DEFAULT_CFG = {
  priceM: 39,
  priceY: 349,
  freePay: 2,
  menus: {
    cal: true,
    insights: true,
    history: true,
    templates: true,
    line: true,
    pro: true,
    signup: true,
    install: true,
  },
  cats: DEF_CATS,
  banks: DEF_BANKS,
  templates: DEF_TEMPLATES,
  remind: { days: [7, 3, 1], time: '08:00', overdue: true },
  msg: {
    before: '{name} ครบกำหนดอีก {days} วัน ยอด {amount}',
    due: '{name} ครบกำหนดวันนี้ ยอด {amount}',
    over: '{name} เลยกำหนดมาแล้ว {days} วัน ยอด {amount}',
    digest: 'วันนี้มี {count} รายการต้องจ่าย รวม {amount}',
  },
};
export function loadCfg() {
  const d = JSON.parse(JSON.stringify(DEFAULT_CFG));
  let c = store.get('cs_config', null);
  if (!c || typeof c !== 'object') c = {};
  const strs = (x, f) => {
    const L = Array.isArray(x)
      ? x.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim().slice(0, 40))
      : [];
    return L.length ? L : f;
  };
  const o = {
    priceM: +c.priceM > 0 ? +c.priceM : d.priceM,
    priceY: +c.priceY > 0 ? +c.priceY : d.priceY,
    freePay: Number.isInteger(c.freePay) && c.freePay >= 0 ? c.freePay : d.freePay,
    menus: d.menus,
    cats: strs(c.cats, d.cats),
    banks: strs(c.banks, d.banks),
    remind: d.remind,
    msg: d.msg,
  };
  if (c.menus && typeof c.menus === 'object')
    for (const k in d.menus) if (k in c.menus) o.menus[k] = !!c.menus[k];
  if (!o.cats.includes('อื่นๆ')) o.cats.push('อื่นๆ');
  o.templates = (Array.isArray(c.templates) ? c.templates : d.templates)
    .filter((t) => t && typeof t.n === 'string' && t.n.trim())
    .map((t) => ({
      n: t.n.trim().slice(0, 20),
      i: ITEM_ICONS.includes(t.i) ? t.i : 'star',
      h: HUES.includes(t.h) ? t.h : 'green',
      r: REP[t.r] ? t.r : 'monthly',
      c: o.cats.includes(t.c) ? t.c : 'อื่นๆ',
    }));
  if (c.remind && typeof c.remind === 'object') {
    const days = Array.isArray(c.remind.days)
      ? c.remind.days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 365)
      : [];
    if (days.length) o.remind.days = days;
    if (/^\d\d:\d\d$/.test(c.remind.time || '')) o.remind.time = c.remind.time;
    if ('overdue' in c.remind) o.remind.overdue = !!c.remind.overdue;
  }
  if (c.msg && typeof c.msg === 'object')
    for (const k in d.msg)
      if (typeof c.msg[k] === 'string' && c.msg[k].trim()) o.msg[k] = c.msg[k].slice(0, 120);
  return o;
}
/* CFG: shared, see state.js */
export function audit(text) {
  const L = store.get('cs_audit', []);
  L.unshift({ ts: Date.now(), by: state.user ? state.user.email : '', text });
  store.set('cs_audit', L.slice(0, 100));
}
export function saveCfg(note) {
  store.set('cs_config', state.CFG);
  if (note) audit(note);
}
