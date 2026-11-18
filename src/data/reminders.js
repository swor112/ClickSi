import { ID_RE, S, byId, saveUser, uid } from './records.js';
import { addDays, baht, daysLeft, fmtDM, iso, pad, parse, today } from '../lib/dates.js';
import { store } from '../lib/store.js';
import { guardSession } from '../pages/auth.js';
import { state } from '../state.js';
import { toast } from '../ui/dom.js';
import { keepRender, tab } from '../ui/navigation.js';

/* ---------- reminder engine ----------
   Works out which reminders have come due, files them in the user's inbox and shows them.
   In this prototype it runs while the app is open and catches up the next time it is opened.
   On the live site a scheduled server job does the same work and pushes to the phone. */
export const unread = () => state.inbox.filter((n) => !n.read).length;
export function loadInbox() {
  const L = store.get('cs_inbox_' + state.user.email, []);
  state.inbox = (Array.isArray(L) ? L : [])
    .filter(
      (n) =>
        n &&
        typeof n === 'object' &&
        ID_RE.test(n.id) &&
        typeof n.title === 'string' &&
        typeof n.body === 'string',
    )
    .map((n) => {
      if (n.itemId && !ID_RE.test(n.itemId)) n.itemId = null;
      n.ts = +n.ts || 0;
      return n;
    });
}
export function saveInbox() {
  state.inbox = state.inbox.slice(0, 80);
  store.set('cs_inbox_' + state.user.email, state.inbox);
}
export const fmtMsg = (tpl, v) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
/* Reminder slots of the current cycle that are already in the past, oldest first. */
export function occurrences(it, now) {
  const out = [],
    due = parse(it.due),
    t = today(),
    from = addDays(t, -2),
    p = String(it.time).split(':').map(Number);
  const at = (d) => {
    const x = new Date(d);
    x.setHours(p[0] || 0, p[1] || 0, 0, 0);
    return x.getTime();
  };
  const key = (k) => it.id + '|' + it.due + '|' + k;
  if (it.daily) {
    let d = addDays(due, -it.dailyFrom);
    if (d < from) d = from;
    for (; d <= t; d = addDays(d, 1)) out.push({ key: key('d' + iso(d)), at: at(d) });
  } else {
    it.remind.forEach((n) => {
      const d = addDays(due, -n);
      if (d <= t) out.push({ key: key('b' + n), at: at(d) });
    });
    if (state.CFG.remind.overdue) {
      let d = addDays(due, 1);
      if (d < from) d = from;
      for (; d <= t; d = addDays(d, 1)) out.push({ key: key('o' + iso(d)), at: at(d) });
    }
  }
  return out.filter((o) => o.at <= now).sort((a, b) => a.at - b.at);
}
export function dueNote(it, key) {
  const d = daysLeft(it),
    v = { name: it.name, days: Math.abs(d), amount: baht(it.amount), date: fmtDM(it.due) };
  return {
    id: uid(),
    key,
    type: 'due',
    itemId: it.id,
    cycle: it.due,
    title: d < 0 ? 'เลยกำหนด' : d === 0 ? 'ครบกำหนดวันนี้' : 'ใกล้ครบกำหนด',
    body: fmtMsg(d < 0 ? state.CFG.msg.over : d === 0 ? state.CFG.msg.due : state.CFG.msg.before, v),
    ts: Date.now(),
    read: false,
  };
}
export function resolveInbox(itemId, cycle, done) {
  let hit = false;
  state.inbox.forEach((n) => {
    if (n.itemId === itemId && n.cycle === cycle) {
      n.done = done;
      if (done) n.read = true;
      hit = true;
    }
  });
  if (hit) saveInbox();
}
export function tick() {
  if (!state.user || !guardSession()) return;
  const now = Date.now(),
    fk = 'cs_fired_' + state.user.email,
    fresh = [];
  let fired = store.get(fk, {});
  if (!fired || typeof fired !== 'object') fired = {};
  state.items.forEach((it) => {
    if (it.done) return;
    const occ = occurrences(it, now).filter((o) => !fired[o.key]);
    if (!occ.length) return;
    occ.forEach((o) => (fired[o.key] = now));
    const last = occ[occ.length - 1];
    if (last.at >= it.since)
      fresh.push(
        dueNote(it, last.key),
      ); /* slots from before the item was created or rescheduled stay silent */
  });
  let dirty = false;
  const keep = state.user.snooze.filter((z) => {
    if (z.at > now) return true;
    const it = byId(z.itemId);
    if (it && !it.done && it.due === z.cycle) fresh.push(dueNote(it, it.id + '|' + it.due + '|s' + z.at));
    return false;
  });
  if (keep.length !== state.user.snooze.length) {
    state.user.snooze = keep;
    dirty = true;
  }
  if (state.user.notif.digest) {
    const k = 'digest|' + iso(today()),
      p = state.user.notif.digestTime.split(':').map(Number),
      at = today();
    at.setHours(p[0] || 0, p[1] || 0, 0, 0);
    if (!fired[k] && now >= at.getTime()) {
      fired[k] = now;
      const L = state.items.filter((i) => !i.done && daysLeft(i) <= 0);
      if (L.length)
        fresh.push({
          id: uid(),
          key: k,
          type: 'digest',
          title: 'สรุปวันนี้',
          body: fmtMsg(state.CFG.msg.digest, {
            count: L.length,
            amount: baht(L.reduce((a, i) => a + i.amount, 0)),
          }),
          ts: now,
          read: false,
        });
    }
  }
  const bcs = store.get('cs_broadcasts', []).filter((b) => b && b.ts > state.user.seenBc);
  if (bcs.length) {
    bcs.forEach((b) =>
      fresh.push({
        id: uid(),
        key: 'bc|' + b.id,
        type: 'system',
        title: String(b.title),
        body: String(b.body),
        ts: b.ts,
        read: false,
      }),
    );
    state.user.seenBc = Math.max(...bcs.map((b) => b.ts));
    dirty = true;
  }
  const live = new Set(state.items.map((i) => i.id + '|' + i.due)),
    td = iso(today());
  for (const k in fired) {
    const q = k.split('|');
    if (q[0] === 'digest' ? q[1] !== td : !live.has(q[0] + '|' + q[1])) delete fired[k];
  }
  store.set(fk, fired);
  if (dirty) saveUser();
  if (fresh.length) {
    state.inbox = fresh.concat(state.inbox).sort((a, b) => b.ts - a.ts);
    saveInbox();
    announce(fresh);
  }
  refreshBadge(fresh.length > 0);
}
export function announce(fresh) {
  if (document.visibilityState === 'visible')
    toast(
      fresh.length === 1 ? fresh[0].body : 'มีการแจ้งเตือนใหม่ ' + fresh.length + ' รายการ',
      S.view === 'notif' ? null : { label: 'ดู', fn: () => tab('notif') },
    );
  if (state.user.notif.device) fresh.slice(0, 3).forEach((n) => deviceNotify(n.title, n.body, n.key));
}
export const deviceOk = () => 'Notification' in window && Notification.permission === 'granted';
export function deviceNotify(title, body, tag) {
  try {
    if (!deviceOk()) return false;
    new Notification(title, { body, tag });
    return true;
  } catch (e) {
    return false;
  }
}
export function refreshBadge(changed) {
  const b = document.querySelector('.tabbar [data-tab="notif"]');
  if (b) {
    const n = unread();
    let c = b.querySelector('.count');
    if (n) {
      if (!c) {
        c = document.createElement('span');
        c.className = 'count';
        b.appendChild(c);
      }
      c.textContent = n > 99 ? '99+' : n;
      if (changed) {
        c.classList.remove('bump');
        void c.offsetWidth;
        c.classList.add('bump');
      }
    } else if (c) c.remove();
  }
  if (changed && S.view === 'notif') keepRender();
}
export function ago(ts) {
  const m = Math.floor(Math.max(0, Date.now() - ts) / 6e4),
    d = new Date(ts),
    hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return m + ' นาทีที่แล้ว';
  const d0 = new Date(d);
  d0.setHours(0, 0, 0, 0);
  const days = Math.round((today() - d0) / 864e5);
  return days === 0 ? 'วันนี้ ' + hm : days === 1 ? 'เมื่อวาน ' + hm : fmtDM(d) + ' ' + hm;
}
