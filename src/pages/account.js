import { stats } from '../data/derived.js';
import { isAdmin, saveItems, saveUser } from '../data/records.js';
import { saveInbox } from '../data/reminders.js';
import { baht } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { cardName } from './home.js';
import { isStandalone } from './install.js';
import { state } from '../state.js';
import { $, closeSheet, esc, openSheet, toast } from '../ui/dom.js';
import { applyMode, keepRender, tab } from '../ui/navigation.js';
import { confirmSheet, sfx, soundOn } from '../ui/sound.js';

/* ---------- account ---------- */
export function proSheet(reason) {
  if (!state.CFG.menus.pro) return;
  const save = Math.round((1 - state.CFG.priceY / (state.CFG.priceM * 12)) * 100),
    perks = ['บันทึก QR และเลขบัญชีได้ไม่จำกัด'];
  if (state.CFG.menus.line) perks.push('รับแจ้งเตือนผ่าน LINE');
  perks.push('สำรองข้อมูลและใช้ได้หลายเครื่อง', 'แพ็กครอบครัวและผู้ดูแลสำรอง');
  openSheet(`<div class="sheet-head"><h2>Click Si Pro</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div>
  ${reason ? `<p class="note">${esc(reason)}</p>` : ''}
  <ul class="checks">${perks.map((x) => `<li>${ic('check', 18)}<span>${x}</span></li>`).join('')}</ul>
  <div class="plans"><button type="button" class="plan" id="planM" aria-pressed="false" onclick="pickPlan('M')"><span>รายเดือน</span><b>${baht(state.CFG.priceM)}</b><span>ต่อเดือน</span></button><button type="button" class="plan" id="planY" aria-pressed="true" onclick="pickPlan('Y')"><span>รายปี</span><b>${baht(state.CFG.priceY)}</b><span>${save > 0 ? 'ประหยัด ' + save + '%' : 'ต่อปี'}</span></button></div>
  <button type="button" class="btn block top16" onclick="tryPro()">ทดลองใช้ Pro แบบเดโม</button>
  <p class="hint center top8">ต้นแบบนี้ยังไม่มีการเก็บเงินจริง</p>`);
}
export function pickPlan(k) {
  $('#planM').setAttribute('aria-pressed', k === 'M');
  $('#planY').setAttribute('aria-pressed', k === 'Y');
}
export function tryPro() {
  state.user.pro = true;
  saveUser();
  closeSheet();
  keepRender();
  toast('เปิดใช้ Pro แบบเดโมแล้ว');
}
export function editProfile() {
  openSheet(`<h2>ชื่อที่แสดง</h2><label class="f" for="p_name">ชื่อเล่น</label><input class="inp" id="p_name" maxlength="30" value="${esc(state.user.name)}">
  <div class="two top16"><button type="button" class="btn plain" onclick="closeSheet()">ยกเลิก</button><button type="button" class="btn" onclick="saveProfile()">บันทึก</button></div>`);
}
export function saveProfile() {
  const v = $('#p_name').value.trim();
  if (!v) return toast('ใส่ชื่อก่อนบันทึก');
  state.user.name = v;
  saveUser();
  closeSheet();
  keepRender();
  toast('บันทึกชื่อแล้ว');
}
export function setPayday(v) {
  state.user.payday = +v || 0;
  saveUser();
  toast(
    state.user.payday ? 'ตั้งวันเงินเดือนเข้าเป็นวันที่ ' + state.user.payday + ' แล้ว' : 'ปิดการแสดงวันเงินเดือนเข้าแล้ว',
  );
}
export function setMode(m) {
  state.user.mode = m;
  saveUser();
  applyMode();
  keepRender();
}
export function askClear() {
  confirmSheet(
    'ล้างข้อมูลทั้งหมด',
    'รายการ ประวัติการจ่าย และการแจ้งเตือนทั้งหมดของบัญชีนี้จะถูกลบ และกู้คืนไม่ได้',
    'ล้างข้อมูล',
    () => {
      state.items = [];
      saveItems();
      state.inbox = [];
      saveInbox();
      store.del('cs_fired_' + state.user.email);
      state.user.snooze = [];
      saveUser();
      tab('home');
      sfx('remove');
      toast('ล้างข้อมูลแล้ว');
    },
  );
}
export function vMe() {
  const st = stats(),
    chev = ic('chevR', 18).replace('class="i"', 'class="i chev"');
  const go = (icn, l, view, val = '') =>
    `<button type="button" class="row" onclick="push('${view}')"><span class="mi">${ic(icn)}</span><span class="grow"><span class="t1">${l}</span></span>${val ? `<span class="val">${val}</span>` : ''}${chev}</button>`;
  const demo = state.user.email === 'demo@clicksi.app';
  const mine =
    (state.CFG.menus.insights ? go('chart', 'สรุปรายจ่าย', 'insights') : '') +
    (state.CFG.menus.history ? go('history', 'ประวัติการจ่าย', 'history') : '') +
    go('gear', 'ตั้งค่าการแจ้งเตือน', 'notifSet');
  return `<header class="head"><h1>ฉัน</h1></header>
  <div class="profile"><span class="avatar">${esc(Array.from(state.user.name.trim())[0] || 'C')}</span><div class="grow"><span class="nm">${esc(state.user.name)}</span><span class="hint">${esc(state.user.email)}</span></div><span class="pill${state.user.pro || isAdmin() ? ' pro' : ''}">${isAdmin() ? 'แอดมิน' : state.user.pro ? 'Pro' : 'ฟรี'}</span></div>
  <div class="kpis"><div><b>${state.items.length}</b><span>รายการ</span></div><div><b>${st.n}</b><span>ครั้งที่จ่ายแล้ว</span></div><div><b>${st.streak}</b><span>ตรงเวลาต่อเนื่อง</span></div></div>
  ${state.user.pro || !state.CFG.menus.pro ? '' : `<div class="probox"><div class="grow"><b>Click Si Pro</b><p>QR และเลขบัญชีไม่จำกัด${state.CFG.menus.line ? ' พร้อมเตือนผ่าน LINE' : ''}</p></div><button type="button" class="btn sm" onclick="proSheet()">ดูแพ็กเกจ</button></div>`}
  ${isAdmin() ? `<div class="sec"><h2>ผู้ดูแลระบบ</h2></div><div class="list menu"><button type="button" class="row" onclick="openAdmin()"><span class="mi">${ic('shield')}</span><span class="grow"><span class="t1">หลังบ้าน</span><span class="t2">ต้องยืนยันรหัสผ่านก่อนเข้า</span></span>${chev}</button></div>` : ''}
  <div class="sec"><h2>ข้อมูลของฉัน</h2></div>
  <div class="list menu">${mine}</div>
  <div class="sec"><h2>ตั้งค่า</h2></div>
  <div class="list menu">
    <button type="button" class="row" onclick="editProfile()"><span class="mi">${ic('user')}</span><span class="grow"><span class="t1">ชื่อที่แสดง</span></span><span class="val">${esc(state.user.name)}</span>${chev}</button>
    ${demo ? '' : `<button type="button" class="row" onclick="pwSheet()"><span class="mi">${ic('lock')}</span><span class="grow"><span class="t1">เปลี่ยนรหัสผ่าน</span></span>${chev}</button>`}
    <div class="row"><span class="mi">${ic('wallet')}</span><label class="grow" for="paydaySel"><span class="t1">วันเงินเดือนเข้า</span></label><select id="paydaySel" class="mini" onchange="setPayday(this.value)"><option value="0"${!+state.user.payday ? ' selected' : ''}>ไม่ระบุ</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${+state.user.payday === i + 1 ? ' selected' : ''}>วันที่ ${i + 1}</option>`).join('')}</select></div>
    <button type="button" class="row" onclick="cardSheet()"><span class="mi">${ic('palette')}</span><span class="grow"><span class="t1">สีการ์ดสรุป</span></span><span class="val">${esc(cardName())}</span>${chev}</button>
    <div class="row"><span class="mi">${ic(soundOn() ? 'volume' : 'mute')}</span><span class="grow"><span class="t1">เสียงเอฟเฟกต์</span><span class="t2">ตอนเพิ่ม บันทึก จ่าย และลบรายการ</span></span><button type="button" class="switch" id="soundSw" role="switch" aria-checked="${soundOn()}" aria-label="เสียงเอฟเฟกต์" onclick="toggleSound()"></button></div>
    <div class="row"><span class="mi">${ic(state.user.mode === 'dark' ? 'moon' : 'sun')}</span><span class="grow"><span class="t1">โหมดสี</span></span><div class="seg">${[
      ['auto', 'ตามระบบ'],
      ['light', 'สว่าง'],
      ['dark', 'มืด'],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" aria-pressed="${state.user.mode === k}" onclick="setMode('${k}')">${l}</button>`,
      )
      .join('')}</div></div>
    ${state.user.pro && state.CFG.menus.pro && !isAdmin() ? `<button type="button" class="row" onclick="state.user.pro=false;saveUser();keepRender();toast('กลับเป็นแพ็กเกจฟรีแล้ว')"><span class="mi">${ic('crown')}</span><span class="grow"><span class="t1">กลับเป็นแพ็กเกจฟรี</span><span class="t2">สำหรับทดสอบในเดโม</span></span></button>` : ''}
  </div>
  <div class="sec"><h2>อื่นๆ</h2></div>
  <div class="list menu">
    <button type="button" class="row" onclick="push('install')"><span class="mi">${ic('phone')}</span><span class="grow"><span class="t1">ติดตั้งแอปบนมือถือ</span></span><span class="val">${isStandalone() ? 'ติดตั้งแล้ว' : 'ยังไม่ได้ติดตั้ง'}</span>${chev}</button>
    <button type="button" class="row" onclick="logout()"><span class="mi">${ic('logout')}</span><span class="grow"><span class="t1">ออกจากระบบ</span></span></button>
    <button type="button" class="row danger" onclick="askClear()"><span class="mi">${ic('trash')}</span><span class="grow"><span class="t1">ล้างข้อมูลทั้งหมด</span></span></button>
  </div>
  <p class="foot-note">Click Si ต้นแบบ 0.8 ข้อมูลเก็บในเครื่องนี้เท่านั้น<br>เสียงเอฟเฟกต์จาก UI SFX (uisfx.com) สาธารณสมบัติ CC0</p>`;
}
