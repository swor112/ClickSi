import { saveCfg } from '../../data/config.js';
import { S } from '../../data/records.js';
import { fmtMsg } from '../../data/reminders.js';
import { baht } from '../../lib/dates.js';
import { canAdmin } from '../auth.js';
import { testNotif } from '../inbox.js';
import { state } from '../../state.js';
import { esc, fail, toast } from '../../ui/dom.js';
import { back, keepRender, push } from '../../ui/navigation.js';
import { subHead } from '../../ui/shared.js';

/* reminder defaults and wording */
export const AN_SAMPLE = () => ({ name: 'งวดรถ', days: 3, amount: baht(8900), date: '13 พ.ย.', count: 2 });
export function openAdNotif() {
  S.an = JSON.parse(JSON.stringify({ remind: state.CFG.remind, msg: state.CFG.msg }));
  push('adNotif');
}
export function syncAn() {
  if (!S.an) return;
  const t = document.getElementById('r_time');
  if (t && t.value) S.an.remind.time = t.value;
  for (const k in S.an.msg) {
    const el = document.getElementById('m_' + k);
    if (el) S.an.msg[k] = el.value;
  }
}
export function adDay(n) {
  syncAn();
  const d = S.an.remind.days,
    i = d.indexOf(n);
  if (i >= 0) d.splice(i, 1);
  else d.push(n);
  keepRender();
}
export function adOver() {
  syncAn();
  S.an.remind.overdue = !S.an.remind.overdue;
  keepRender();
}
export function msgPv(k) {
  const el = document.getElementById('m_' + k),
    p = document.getElementById('pv_' + k);
  if (el && p) p.textContent = 'ตัวอย่าง: ' + fmtMsg(el.value, AN_SAMPLE());
}
export function vAdNotif() {
  const r = S.an.remind,
    m = S.an.msg;
  const field = (k, l) =>
    `<label class="f" for="m_${k}">${l}</label><textarea class="inp" id="m_${k}" rows="2" maxlength="120" oninput="msgPv('${k}')">${esc(m[k])}</textarea><p class="hint" id="pv_${k}">${esc('ตัวอย่าง: ' + fmtMsg(m[k], AN_SAMPLE()))}</p>`;
  return (
    subHead('การแจ้งเตือนของระบบ') +
    `<div class="stack">
  <section class="group"><h2>ค่าเริ่มต้นของรายการใหม่</h2>
    <p class="f">เตือนล่วงหน้า</p><div class="chips">${[30, 14, 7, 3, 1, 0].map((n) => `<button type="button" class="chip" aria-pressed="${r.days.includes(n)}" onclick="adDay(${n})">${n === 0 ? 'วันครบกำหนด' : n + ' วันก่อน'}</button>`).join('')}</div>
    <label class="f" for="r_time">เวลาเตือน</label><input class="inp" id="r_time" type="time" value="${esc(r.time)}">
    <p class="hint top8">ผู้ใช้ยังปรับของแต่ละรายการเองได้</p>
  </section>
  <section class="group"><div class="toggle" style="padding-top:0"><div><p><b>เตือนซ้ำทุกวันเมื่อเลยกำหนด</b></p><p class="hint">เตือนต่อจนกว่าผู้ใช้จะบันทึกว่าจ่ายแล้ว</p></div><button type="button" class="switch" role="switch" aria-checked="${!!r.overdue}" aria-label="เตือนซ้ำทุกวันเมื่อเลยกำหนด" onclick="adOver()"></button></div></section>
  <section class="group"><h2>ข้อความแจ้งเตือน</h2><p class="hint">ใช้ตัวแปรได้ {name} {days} {amount} {date} และ {count} สำหรับสรุปรายวัน</p>
    ${field('before', 'เตือนล่วงหน้า')}${field('due', 'วันครบกำหนด')}${field('over', 'เลยกำหนด')}${field('digest', 'สรุปรายวัน')}
  </section>
  <section class="group"><h2>ทดสอบ</h2><p class="hint">ส่งข้อความเตือนล่วงหน้าตามที่ตั้งไว้ด้านบนเข้ากล่องแจ้งเตือนของคุณ</p><button type="button" class="btn plain block top12" onclick="adTest()">ส่งแจ้งเตือนทดสอบถึงตัวเอง</button></section>
  </div>
  <div class="actbar"><button type="button" class="btn block" onclick="saveAdNotif()">บันทึก</button></div>`
  );
}
export function adTest() {
  syncAn();
  testNotif(fmtMsg(S.an.msg.before, AN_SAMPLE()));
}
export function saveAdNotif() {
  if (!canAdmin()) return;
  syncAn();
  const a = S.an;
  if (!a.remind.days.length) return toast('เลือกวันเตือนล่วงหน้าอย่างน้อย 1 วัน');
  for (const k in a.msg) {
    a.msg[k] = String(a.msg[k]).slice(0, 120);
    if (!a.msg[k].trim()) return fail('m_' + k, 'ข้อความแจ้งเตือนต้องไม่เว้นว่าง');
  }
  a.remind.days.sort((x, y) => y - x);
  state.CFG.remind = a.remind;
  state.CFG.msg = a.msg;
  S.an = null;
  saveCfg('แก้ค่าเริ่มต้นและข้อความแจ้งเตือนของระบบ');
  back();
  toast('บันทึกการแจ้งเตือนของระบบแล้ว');
}
