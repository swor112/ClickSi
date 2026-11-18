import { normUser, usersDB } from '../../data/records.js';
import { baht } from '../../lib/dates.js';
import { ic } from '../../lib/icons.js';
import { store } from '../../lib/store.js';
import { state } from '../../state.js';
import { subHead } from '../../ui/shared.js';

export const MENU_INFO = {
  cal: ['ปฏิทิน', 'แท็บปฏิทิน และแถบเส้นเวลาบนหน้าแรก'],
  insights: ['สรุปรายจ่าย', 'หน้าสรุปตามหมวดและยอดย้อนหลัง'],
  history: ['ประวัติการจ่าย', 'รายการที่จ่ายแล้วทั้งหมด'],
  templates: ['แบบสำเร็จรูป', 'ตัวเลือกลัดในหน้าเพิ่มรายการ'],
  line: ['แจ้งเตือนผ่าน LINE', 'ตัวเลือก LINE ในการตั้งค่าและในแพ็กเกจ Pro'],
  pro: ['ขายแพ็กเกจ Pro', 'ปิดแล้วทุกคนใช้ได้ไม่จำกัด และไม่แสดงหน้าแนะนำ Pro'],
  signup: ['รับสมัครสมาชิกใหม่', 'ปิดแล้วหน้าสมัครจะแจ้งว่าปิดรับชั่วคราว'],
  install: ['แถบชวนติดตั้งแอป', 'แถบบนหน้าแรกที่ชวนเพิ่ม Click Si ลงหน้าจอโฮม'],
};
export function allUsers() {
  return Object.values(usersDB())
    .filter((u) => u && u.email)
    .map(normUser)
    .sort((a, b) => a.email.localeCompare(b.email));
}
export function userStats(email) {
  const L = store.get('cs_items_' + email, []),
    N = store.get('cs_inbox_' + email, []);
  return {
    items: Array.isArray(L) ? L.length : 0,
    pays: Array.isArray(L)
      ? L.reduce((s, i) => s + (i && Array.isArray(i.history) ? i.history.length : 0), 0)
      : 0,
    notes: Array.isArray(N) ? N.length : 0,
  };
}
export function vAdmin() {
  const U = allUsers(),
    tot = U.reduce(
      (a, u) => {
        const s = userStats(u.email);
        a.items += s.items;
        a.notes += s.notes;
        return a;
      },
      { items: 0, notes: 0 },
    );
  const keys = Object.keys(MENU_INFO),
    on = keys.filter((k) => state.CFG.menus[k]).length,
    chev = ic('chevR', 18).replace('class="i"', 'class="i chev"');
  const row = (icn, l, act, val = '') =>
    `<button type="button" class="row" onclick="${act}"><span class="mi">${ic(icn)}</span><span class="grow"><span class="t1">${l}</span></span>${val ? `<span class="val">${val}</span>` : ''}${chev}</button>`;
  return (
    subHead('หลังบ้าน') +
    `
  <p class="note">ต้นแบบนี้เก็บการตั้งค่าไว้ในเครื่อง จึงมีผลกับทุกบัญชีในเครื่องนี้ เมื่อเปิดเว็บจริง การตั้งค่าจะอยู่บนเซิร์ฟเวอร์และมีผลกับผู้ใช้ทุกคน</p>
  <div class="kpis k4"><div><b>${U.length}</b><span>ผู้ใช้</span></div><div><b>${U.filter((u) => u.pro).length}</b><span>Pro</span></div><div><b>${tot.items}</b><span>รายการ</span></div><div><b>${tot.notes}</b><span>แจ้งเตือน</span></div></div>
  <div class="sec"><h2>ผู้ใช้และแพ็กเกจ</h2></div>
  <div class="list menu">${row('users', 'ผู้ใช้', "push('adUsers')", U.length + ' คน')}${row('tag', 'แพ็กเกจและราคา', "push('adPlans')", baht(state.CFG.priceM) + ' ต่อเดือน')}</div>
  <div class="sec"><h2>เนื้อหาในแอป</h2></div>
  <div class="list menu">${row('sliders', 'เมนูและฟีเจอร์', "push('adMenus')", 'เปิด ' + on + ' จาก ' + keys.length)}${row('grid', 'แบบสำเร็จรูป หมวด และธนาคาร', "push('adLists')")}</div>
  <div class="sec"><h2>การแจ้งเตือน</h2></div>
  <div class="list menu">${row('bell', 'การแจ้งเตือนของระบบ', 'openAdNotif()')}${row('mega', 'ประกาศถึงผู้ใช้', "push('adNotice')")}</div>
  <div class="sec"><h2>บันทึก</h2></div>
  <div class="list menu">${row('scroll', 'ประวัติการแก้ไข', "push('adLog')")}</div>`
  );
}
