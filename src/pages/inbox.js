import { upcoming } from '../data/derived.js';
import { S, byId, saveUser, uid } from '../data/records.js';
import { ago, deviceNotify, deviceOk, refreshBadge, saveInbox, tick } from '../data/reminders.js';
import { TH_M } from '../lib/constants.js';
import { addDays, iso, pad, today } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { installHelp, isIOS, isStandalone } from './install.js';
import { payOpen } from './item-detail.js';
import { state } from '../state.js';
import { closeSheet, esc, openSheet, toast } from '../ui/dom.js';
import { keepRender, openItem, tab } from '../ui/navigation.js';
import { listOf, tile } from '../ui/shared.js';

/* ---------- inbox ---------- */
export function noteCard(n) {
  const it = n.itemId ? byId(n.itemId) : null,
    live = it && !it.done && it.due === n.cycle && !n.done;
  const lead = it
    ? tile(it)
    : `<span class="lead">${ic(n.type === 'system' ? 'mega' : n.type === 'digest' ? 'list' : 'bell')}</span>`;
  return `<div class="nt${n.read ? ' read' : ''}">${lead}<div class="nb">
    <button type="button" class="nmain" onclick="openNote('${n.id}')"><span class="ntitle">${n.read ? '' : '<i class="dotu"></i>'}${esc(n.title)}</span><span class="nbody">${esc(n.body)}</span><span class="ntime"><span>${ago(n.ts)}</span>${n.done ? '<span class="st done">จ่ายแล้ว</span>' : ''}</span></button>
    ${live ? `<div class="nacts"><button type="button" class="btn sm" onclick="notePay('${n.id}')">จ่ายแล้ว</button><button type="button" class="btn plain sm" onclick="snoozeSheet('${n.id}')">เตือนอีกครั้ง</button></div>` : ''}
  </div></div>`;
}
export const noteById = (id) => state.inbox.find((n) => n.id === id);
export function openNote(id) {
  const n = noteById(id);
  if (!n) return;
  if (!n.read) {
    n.read = true;
    saveInbox();
  }
  const it = n.itemId && byId(n.itemId);
  if (it) return openItem(it.id);
  keepRender();
  if (n.type === 'system')
    openSheet(
      `<div class="sheet-head"><h2>${esc(n.title)}</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(n.body)}</p><p class="hint top12">ประกาศจากผู้ดูแลระบบ ${ago(n.ts)}</p>`,
    );
}
export function notePay(id) {
  const n = noteById(id);
  if (!n) return;
  payOpen(n.itemId);
}
export function readAll() {
  state.inbox.forEach((n) => (n.read = true));
  saveInbox();
  keepRender();
}
export function snoozeSheet(id) {
  const n = noteById(id);
  if (!n) return;
  const now = Date.now(),
    eve = today();
  eve.setHours(18, 0, 0, 0);
  const tom = addDays(today(), 1);
  tom.setHours(8, 0, 0, 0);
  const opts = [['อีก 1 ชั่วโมง', now + 36e5]];
  if (eve.getTime() - now > 36e5) opts.push(['เย็นนี้ 18:00 น.', eve.getTime()]);
  opts.push(['พรุ่งนี้ 08:00 น.', tom.getTime()]);
  openSheet(
    `<h2>เตือนอีกครั้งเมื่อไร</h2><p class="hint top8">${esc(n.body)}</p><div class="stack top16">${opts.map(([l, at]) => `<button type="button" class="btn plain block" onclick="snooze('${id}',${at})">${l}</button>`).join('')}</div>`,
  );
}
export function snooze(id, at) {
  const n = noteById(id);
  if (!n) return;
  state.user.snooze.push({ itemId: n.itemId, cycle: n.cycle, at });
  saveUser();
  n.read = true;
  saveInbox();
  closeSheet();
  keepRender();
  const d = new Date(at);
  toast(
    'จะเตือนอีกครั้ง' +
      (iso(d) === iso(today()) ? 'วันนี้ ' : 'พรุ่งนี้ ') +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ' น.',
  );
}
export function vNotif() {
  const fresh = state.inbox.filter((n) => !n.read),
    old = state.inbox.filter((n) => n.read).slice(0, 30),
    up = upcoming().slice(0, 8);
  return `<header class="head"><h1>การแจ้งเตือน</h1><button type="button" class="iconbtn" onclick="push('notifSet')" aria-label="ตั้งค่าการแจ้งเตือน">${ic('gear')}</button></header>
  ${fresh.length ? `<div class="sec" style="margin-top:0"><h2>ยังไม่ได้อ่าน</h2><button type="button" class="link" onclick="readAll()">อ่านทั้งหมดแล้ว</button></div><div class="list">${fresh.map(noteCard).join('')}</div>` : `<div class="list"><p class="rownote">ไม่มีการแจ้งเตือนใหม่ เมื่อถึงเวลาเตือนของรายการใด ข้อความจะมาแสดงที่นี่</p></div>`}
  ${old.length ? `<div class="sec"><h2>ก่อนหน้านี้</h2></div><div class="list">${old.map(noteCard).join('')}</div>` : ''}
  <div class="sec"><h2>กำหนดการเตือนถัดไป</h2></div>
  ${
    up.length
      ? listOf(
          up.map((r) => {
            const d = new Date(r.at);
            return `<button type="button" class="row" onclick="openItem('${r.it.id}')"><span class="datebox"><b>${d.getDate()}</b><span>${TH_M[d.getMonth()]}</span></span><span class="grow"><span class="t1">${esc(r.it.name)}</span><span class="t2">${r.label} เวลา ${pad(d.getHours())}:${pad(d.getMinutes())} น.</span></span></button>`;
          }),
        )
      : `<div class="list"><p class="rownote">ยังไม่มีการเตือนใน 30 วันข้างหน้า</p></div>`
  }`;
}
export function notifState() {
  if (!('Notification' in window)) return 'เบราว์เซอร์นี้ไม่รองรับ';
  return (
    {
      granted: state.user.notif.device ? 'เปิดอยู่' : 'อนุญาตแล้ว แต่ปิดไว้',
      denied: 'ถูกปิดไว้ในการตั้งค่าของเบราว์เซอร์',
      default: 'ยังไม่ได้เปิด',
    }[Notification.permission] || 'ยังไม่ได้เปิด'
  );
}
export async function toggleDevice() {
  if (state.user.notif.device && deviceOk()) {
    state.user.notif.device = false;
    saveUser();
    return keepRender();
  }
  try {
    if (!('Notification' in window)) throw 0;
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw 0;
    state.user.notif.device = true;
    saveUser();
    keepRender();
    toast('เปิดการแจ้งเตือนบนเครื่องนี้แล้ว');
  } catch (e) {
    if (S.view === 'install')
      toast(
        isIOS && !isStandalone()
          ? 'iPhone ให้เปิดแจ้งเตือนได้หลังติดตั้งและเปิดจากไอคอนเท่านั้น'
          : 'เบราว์เซอร์นี้ยังไม่อนุญาตการแจ้งเตือนของเว็บนี้',
      );
    else installHelp();
  }
}
export function setNotif(k, v) {
  state.user.notif[k] = v;
  saveUser();
  keepRender();
  tick();
}
export function testNotif(body) {
  const n = {
    id: uid(),
    key: 'test|' + Date.now(),
    type: 'test',
    title: 'ทดสอบการแจ้งเตือน',
    body: body || 'ถ้าเห็นข้อความนี้ กล่องแจ้งเตือนในแอปทำงานปกติ',
    ts: Date.now(),
    read: false,
  };
  state.inbox.unshift(n);
  saveInbox();
  const dev = deviceNotify(n.title, n.body, n.key);
  keepRender();
  refreshBadge(false);
  toast(dev ? 'ส่งแล้ว ทั้งในแอปและบนเครื่องนี้' : 'ส่งเข้ากล่องแจ้งเตือนในแอปแล้ว', {
    label: 'ดู',
    fn: () => tab('notif'),
  });
}
