import { audit } from '../../data/config.js';
import { S, normUser, usersDB } from '../../data/records.js';
import { fmtDMY } from '../../lib/dates.js';
import { ic } from '../../lib/icons.js';
import { store } from '../../lib/store.js';
import { allUsers, userStats } from './admin-home.js';
import { canAdmin } from '../auth.js';
import { state } from '../../state.js';
import { $, closeSheet, esc, openSheet, toast } from '../../ui/dom.js';
import { keepRender } from '../../ui/navigation.js';
import { listOf, subHead } from '../../ui/shared.js';

/* users */
export function userList() {
  const q = S.uq.trim().toLowerCase();
  S.uList = allUsers().filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q));
  if (!S.uList.length) return `<div class="list"><p class="rownote">ไม่พบผู้ใช้ที่ตรงกับคำค้น</p></div>`;
  return listOf(
    S.uList.map(
      (u, i) =>
        `<button type="button" class="row" onclick="userSheet(${i})"><span class="avatar sm">${esc(Array.from(u.name.trim())[0] || 'C')}</span><span class="grow"><span class="t1">${esc(u.name)}</span><span class="t2">${esc(u.email)}</span></span><span class="end">${u.suspended ? '<span class="st over">ระงับ</span>' : u.role === 'admin' ? '<span class="st done">แอดมิน</span>' : `<span class="st">${u.pro ? 'Pro' : 'ฟรี'}</span>`}</span></button>`,
    ),
  );
}
export function refreshUsers() {
  const el = $('#userList');
  if (el) el.innerHTML = userList();
}
export function vAdUsers() {
  return (
    subHead('ผู้ใช้') +
    `<label class="search" for="uq">${ic('search', 18)}<input id="uq" type="search" placeholder="ค้นหาชื่อหรืออีเมล" value="${esc(S.uq)}" oninput="S.uq=this.value;refreshUsers()"></label>
  <div id="userList" class="top12">${userList()}</div>
  <p class="hint top8">แอดมินเห็นเฉพาะข้อมูลบัญชีและจำนวนรายการ ไม่เห็น QR เลขบัญชี หรือรายละเอียดบิลของผู้ใช้</p>`
  );
}
export function userSheet(i) {
  const u = S.uList[i];
  if (!u) return;
  const st = userStats(u.email),
    me = u.email === state.user.email;
  openSheet(`<div class="sheet-head"><h2>${esc(u.name)}</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div>
  <p class="hint">${esc(u.email)}${u.created ? ' สมัครเมื่อ ' + fmtDMY(u.created) : ''}</p>
  <div class="kpis"><div><b>${st.items}</b><span>รายการ</span></div><div><b>${st.pays}</b><span>ครั้งที่จ่าย</span></div><div><b>${st.notes}</b><span>แจ้งเตือน</span></div></div>
  <div class="stack top16">
    <button type="button" class="btn plain block" onclick="adUser(${i},'pro')">${u.pro ? 'ยกเลิกสิทธิ์ Pro' : 'ให้สิทธิ์ Pro'}</button>
    <button type="button" class="btn plain block"${me ? ' disabled' : ''} onclick="adUser(${i},'role')">${u.role === 'admin' ? 'ถอนสิทธิ์แอดมิน' : 'ตั้งเป็นแอดมิน'}</button>
    <button type="button" class="btn quiet-danger block"${me ? ' disabled' : ''} onclick="adUser(${i},'ban')">${u.suspended ? 'ปลดระงับบัญชี' : 'ระงับบัญชี'}</button>
  </div>
  ${me ? '<p class="hint center top8">แก้สิทธิ์แอดมินหรือระงับบัญชีของตัวเองไม่ได้</p>' : ''}`);
}
export function adUser(i, act) {
  const t = S.uList[i];
  if (!t || !canAdmin()) return;
  const db = usersDB(),
    u = db[t.email];
  if (!u) return;
  if (act !== 'pro' && t.email === state.user.email) return;
  if (act === 'role' && t.email === 'demo@clicksi.app') return toast('บัญชีตัวอย่างตั้งเป็นผู้ดูแลไม่ได้');
  if (act === 'pro') {
    u.pro = !u.pro;
    audit((u.pro ? 'ให้สิทธิ์ Pro แก่ ' : 'ยกเลิกสิทธิ์ Pro ของ ') + u.email);
  }
  if (act === 'role') {
    u.role = u.role === 'admin' ? 'user' : 'admin';
    audit((u.role === 'admin' ? 'ตั้งเป็นแอดมิน ' : 'ถอนสิทธิ์แอดมินของ ') + u.email);
  }
  if (act === 'ban') {
    u.suspended = !u.suspended;
    audit((u.suspended ? 'ระงับบัญชี ' : 'ปลดระงับบัญชี ') + u.email);
  }
  store.set('cs_users', db);
  if (t.email === state.user.email) state.user = normUser(u);
  closeSheet();
  keepRender();
  toast('บันทึกแล้ว');
}
