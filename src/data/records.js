import { HUES, ITEM_ICONS, OLD_COLOR, OLD_EMOJI, PAY, REP } from '../lib/constants.js';
import { parse } from '../lib/dates.js';
import { store } from '../lib/store.js';
import { state } from '../state.js';

/* ---------- state ---------- */
export const S = {
  view: 'home',
  authTab: 'login',
  detail: null,
  q: '',
  cat: 'all',
  sort: 'due',
  calY: null,
  calM: null,
  calD: null,
  insM: 5,
  uq: '',
  uList: [],
  tpl: null,
  tplI: -1,
  an: null,
  grp: {},
  grpJust: null,
  histAll: false,
  stamp: null,
};
export const nav = { stack: [], anim: '', last: null, tabAt: null };
export const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
/* user, items, inbox, draft, decT: shared, see state.js */

export const usersDB = () => {
  const d = store.get('cs_users', {});
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
};
export const ID_RE = /^[A-Za-z0-9_-]{1,40}$/,
  DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const okDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !isNaN(parse(v));
export const okImg = (v) =>
  typeof v === 'string' && v.length < 600000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
/* Role and suspension belong to the admin: a user's own save never overwrites them. */
export function saveUser() {
  const db = usersDB(),
    old = db[state.user.email];
  if (old) {
    state.user.role = old.role === 'admin' ? 'admin' : 'user';
    state.user.suspended = !!old.suspended;
  }
  db[state.user.email] = state.user;
  store.set('cs_users', db);
}
export function loadItems() {
  const L = store.get('cs_items_' + state.user.email, []);
  state.items = (Array.isArray(L) ? L : [])
    .filter((x) => x && typeof x === 'object' && ID_RE.test(x.id) && okDate(x.due))
    .map(norm);
}
export function saveItems() {
  store.set('cs_items_' + state.user.email, state.items);
}
export const byId = (id) => state.items.find((i) => i.id === id);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* Bring records saved by earlier versions up to the current shape. */
export function norm(it) {
  if (!ITEM_ICONS.includes(it.icon)) it.icon = OLD_EMOJI[String(it.emoji || '').replace(/️/g, '')] || 'star';
  if (!HUES.includes(it.hue)) it.hue = OLD_COLOR[String(it.color || '').toUpperCase()] || 'green';
  it.name = String(it.name || 'รายการ').slice(0, 60);
  it.amount = +it.amount || 0;
  it.history = Array.isArray(it.history) ? it.history : [];
  it.remind = Array.isArray(it.remind) ? it.remind.filter((n) => Number.isFinite(n) && n >= 0) : [3, 1];
  it.repeat = REP[it.repeat] ? it.repeat : 'none';
  it.cat = state.CFG.cats.includes(it.cat) ? it.cat : 'อื่นๆ';
  it.payType = PAY[it.payType] ? it.payType : 'none';
  it.time = /^\d\d:\d\d$/.test(it.time) ? it.time : '08:00';
  it.dailyFrom = +it.dailyFrom || 7;
  it.anchor = +it.anchor || parse(it.due).getDate();
  it.done = !!it.done;
  it.since = +it.since || 0;
  it.image = okImg(it.image) ? it.image : null;
  it.qr = okImg(it.qr) ? it.qr : null;
  if (it.payType === 'qr' && !it.qr) it.payType = 'none';
  it.history = it.history
    .filter((h) => h && okDate(h.date))
    .map((h) => ({
      date: h.date,
      due: okDate(h.due) ? h.due : undefined,
      amount: +h.amount || 0,
      onTime: !!h.onTime,
      ts: +h.ts || 0,
    }));
  return it;
}
export function normUser(u) {
  if (!['auto', 'light', 'dark'].includes(u.mode)) u.mode = 'auto';
  u.payday = Number.isFinite(+u.payday) ? +u.payday : 25;
  u.name = String(u.name || 'เพื่อน').slice(0, 30);
  u.role = u.role === 'admin' ? 'admin' : 'user';
  u.suspended = !!u.suspended;
  u.notif = Object.assign(
    { device: false, digest: false, digestTime: '08:00' },
    u.notif && typeof u.notif === 'object' ? u.notif : {},
  );
  if (!/^\d\d:\d\d$/.test(u.notif.digestTime)) u.notif.digestTime = '08:00';
  u.snooze = Array.isArray(u.snooze) ? u.snooze : [];
  u.seenBc = +u.seenBc || 0;
  return u;
}

/* ---------- admin: settings that apply to every account ----------
   Rights are checked in the page here. On the live site the server has to check the role on every request. */
export const isAdmin = () => !!state.user && state.user.role === 'admin';
