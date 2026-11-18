import { S, saveUser } from '../data/records.js';
import { deviceOk } from '../data/reminders.js';
import { ic } from '../lib/icons.js';
import { state } from '../state.js';
import { closeSheet, toast } from '../ui/dom.js';
import { keepRender, push } from '../ui/navigation.js';
import { subHead } from '../ui/shared.js';

/* ---------- add to home screen ----------
   iPhone has no install button for websites, so the page walks people through Safari's own steps.
   Android Chrome can show its install dialog from our button once the live site has a manifest and service worker. */
export const UA = navigator.userAgent || '';
export const isIOS =
  /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isAndroid = /Android/i.test(UA);
export const inAppBrowser = /Line\/|FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly/i.test(UA);
export const isStandalone = () =>
  !!(
    (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true
  );
/* installEvt: shared, see state.js */
export function installBanner() {
  if (!state.CFG.menus.install || isStandalone() || (+state.user.installHide || 0) > Date.now()) return '';
  return `<div class="ibanner">${ic('phone', 20)}<p class="grow"><b>เพิ่ม Click Si ลงหน้าจอโฮม</b><span>รับแจ้งเตือนบิลบนมือถือ</span></p><button type="button" class="btn sm" onclick="installGo()">${state.installEvt ? 'ติดตั้งเลย' : 'ดูวิธีติดตั้ง'}</button><button type="button" class="iconbtn later" onclick="installLater()" aria-label="ไว้ทีหลัง">${ic('x', 18)}</button></div>`;
}
export function installGo() {
  if (state.installEvt) return doInstall();
  push('install');
}
export function installLater() {
  state.user.installHide = Date.now() + 7 * 864e5;
  saveUser();
  keepRender();
  toast('จะชวนอีกครั้งใน 7 วัน ดูวิธีติดตั้งได้ที่แท็บฉัน');
}
export async function doInstall() {
  if (!state.installEvt) return toast('เบราว์เซอร์นี้ไม่มีปุ่มติดตั้งให้เว็บ ทำตามขั้นตอนด้านบนแทน');
  try {
    state.installEvt.prompt();
    const r = await state.installEvt.userChoice;
    state.installEvt = null;
    if (r && r.outcome === 'accepted') toast('กำลังติดตั้ง Click Si');
    if (S.view === 'home' || S.view === 'install') keepRender();
  } catch (e) {
    state.installEvt = null;
    toast('ติดตั้งจากปุ่มไม่สำเร็จ ลองใช้เมนูของเบราว์เซอร์แทน');
  }
}
export function installHelp() {
  closeSheet();
  if (S.view !== 'install') push('install');
}
export function vInstall() {
  const dev = S.dev || (isAndroid ? 'android' : 'ios'),
    done = isStandalone(),
    on = state.user.notif.device && deviceOk();
  const st = (n, t, d) =>
    `<li><span class="stepno">${n}</span><div><b>${t}</b>${d ? `<p class="hint">${d}</p>` : ''}</div></li>`;
  const ios =
    st(1, 'เปิดเว็บนี้ใน Safari', 'ถ้าเปิดมาจาก LINE หรือ Facebook ให้คัดลอกลิงก์ด้านล่างไปวางใน Safari') +
    st(2, 'แตะปุ่มแชร์ ' + ic('share', 18), 'อยู่ที่แถบด้านล่างของ Safari') +
    st(3, 'เลือก “เพิ่มไปยังหน้าจอโฮม” ' + ic('plusq', 18), 'เลื่อนรายการลงมาจนเจอ') +
    st(4, 'แตะ “เพิ่ม” ที่มุมขวาบน', 'ไอคอน Click Si จะขึ้นบนหน้าจอโฮม') +
    st(5, 'เปิดจากไอคอน แล้วกดเปิดการแจ้งเตือน', 'ต้องเปิดจากไอคอนเท่านั้น iPhone จึงจะยอมให้เปิดแจ้งเตือน');
  const and =
    st(1, 'เปิดเว็บนี้ใน Chrome', '') +
    st(
      2,
      'แตะปุ่ม “ติดตั้ง Click Si” ด้านล่าง',
      'ถ้าไม่มีหน้าต่างขึ้น ให้แตะเมนู ' + ic('dots', 16) + ' มุมขวาบน แล้วเลือกเพิ่มลงในหน้าจอหลัก',
    ) +
    st(3, 'แตะ “ติดตั้ง” เพื่อยืนยัน', 'ไอคอน Click Si จะขึ้นบนหน้าจอ') +
    st(4, 'กดเปิดการแจ้งเตือน', 'บน Android เปิดได้เลย แม้ยังไม่ได้ติดตั้ง');
  return (
    subHead('ติดตั้งแอปบนมือถือ') +
    `
  <div class="list"><div class="row"><span class="lead">${ic(done ? 'check' : 'phone')}</span><span class="grow"><span class="t1">${done ? 'ติดตั้งบนเครื่องนี้แล้ว' : 'ยังไม่ได้ติดตั้งบนเครื่องนี้'}</span><span class="t2">${done ? 'เปิด Click Si จากไอคอนบนหน้าจอได้เลย' : 'ติดตั้งแล้วจะเปิดได้เต็มจอเหมือนแอป และรับการแจ้งเตือนได้'}</span></span></div></div>
  ${inAppBrowser && !done ? `<p class="warnbox top12">ตอนนี้คุณเปิดอยู่ในเบราว์เซอร์ของแอปอื่น ซึ่งติดตั้งไม่ได้ ให้เปิดลิงก์นี้ใน ${isAndroid ? 'Chrome' : 'Safari'} ก่อน</p>` : ''}
  <div class="seg top16"><button type="button" aria-pressed="${dev === 'ios'}" onclick="S.dev='ios';keepRender()">iPhone และ iPad</button><button type="button" aria-pressed="${dev === 'android'}" onclick="S.dev='android';keepRender()">Android</button></div>
  <section class="group top12"><h2>${dev === 'ios' ? 'ขั้นตอนบน iPhone' : 'ขั้นตอนบน Android'}</h2><ol class="isteps">${dev === 'ios' ? ios : and}</ol></section>
  <div class="stack top16">
    ${done ? '' : dev === 'android' ? `<button type="button" class="btn block" onclick="doInstall()">${ic('download', 18)}ติดตั้ง Click Si</button>` : `<button type="button" class="btn block" onclick="copyText(location.href.split('#')[0])">${ic('copy', 18)}คัดลอกลิงก์ไปเปิดใน Safari</button>`}
    <button type="button" class="btn ${done ? '' : 'plain '}block" onclick="toggleDevice()"${on ? ' disabled' : ''}>${ic('bell', 18)}${on ? 'เปิดการแจ้งเตือนแล้ว' : 'เปิดการแจ้งเตือน'}</button>
  </div>
  <p class="note top16">ต้นแบบที่เปิดใน Claude ยังติดตั้งจริงไม่ได้ ขั้นตอนนี้ใช้ได้เมื่อเว็บขึ้นโดเมนของตัวเอง</p>`
  );
}
