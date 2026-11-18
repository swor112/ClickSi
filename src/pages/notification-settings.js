import { deviceOk } from '../data/reminders.js';
import { ic } from '../lib/icons.js';
import { proSheet } from './account.js';
import { notifState } from './inbox.js';
import { state } from '../state.js';
import { esc, toast } from '../ui/dom.js';
import { subHead } from '../ui/shared.js';

export function lineBtn() {
  if (state.user.pro || !state.CFG.menus.pro) toast('เชื่อมต่อ LINE แบบเดโมแล้ว');
  else proSheet('การแจ้งเตือนผ่าน LINE อยู่ในแพ็กเกจ Pro');
}
export function vNotifSet() {
  const nf = state.user.notif;
  return (
    subHead('ตั้งค่าการแจ้งเตือน') +
    `
  <div class="list">
    <div class="row"><span class="lead">${ic('bell')}</span><span class="grow"><span class="t1">แจ้งเตือนในแอป</span><span class="t2">เปิดอยู่เสมอ ดูได้ที่แท็บแจ้งเตือน</span></span></div>
    <div class="row"><span class="lead">${ic('phone')}</span><span class="grow"><span class="t1">แจ้งเตือนบนเครื่องนี้</span><span class="t2">${notifState()}</span></span><button type="button" class="switch" role="switch" aria-checked="${!!nf.device && deviceOk()}" aria-label="แจ้งเตือนบนเครื่องนี้" onclick="toggleDevice()"></button></div>
    ${state.CFG.menus.line ? `<div class="row"><span class="lead">${ic('msg')}</span><span class="grow"><span class="t1">แจ้งเตือนผ่าน LINE</span><span class="t2">${state.user.pro || !state.CFG.menus.pro ? 'พร้อมเชื่อมต่อ' : 'สำหรับแพ็กเกจ Pro'}</span></span><button type="button" class="btn plain sm" onclick="lineBtn()">เชื่อมต่อ</button></div>` : ''}
  </div>
  <div class="sec"><h2>สรุปรายวัน</h2></div>
  <div class="group"><div class="toggle" style="padding-top:0"><div><p><b>ส่งสรุปทุกเช้า</b></p><p class="hint">บอกจำนวนรายการและยอดรวมที่ต้องจ่ายในวันนั้น</p></div><button type="button" class="switch" role="switch" aria-checked="${!!nf.digest}" aria-label="ส่งสรุปทุกเช้า" onclick="setNotif('digest',${!nf.digest})"></button></div>
    ${nf.digest ? `<label class="f" for="n_dt">เวลาส่งสรุป</label><input class="inp" id="n_dt" type="time" value="${esc(nf.digestTime)}" onchange="setNotif('digestTime',this.value||'08:00')">` : ''}
  </div>
  <div class="sec"><h2>ทดสอบ</h2></div>
  <div class="group"><p class="hint">ส่งข้อความตัวอย่างเข้ากล่องแจ้งเตือนของคุณ เพื่อดูว่าแต่ละช่องทางทำงานหรือไม่</p><button type="button" class="btn plain block top12" onclick="testNotif()">ส่งแจ้งเตือนทดสอบ</button></div>
  <p class="note top16">ต้นแบบนี้เตือนเมื่อเปิดแอปอยู่ และเก็บรายการที่พลาดไว้ให้เมื่อเปิดครั้งถัดไป การเตือนขณะปิดแอปต้องใช้เซิร์ฟเวอร์ ซึ่งจะทำงานเมื่อเปิดเว็บจริง</p>`
  );
}
