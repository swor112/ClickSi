import { remindSummary, repeatLong, status } from '../data/derived.js';
import { RM, S, byId, saveItems } from '../data/records.js';
import { resolveInbox, saveInbox } from '../data/reminders.js';
import { addMonths, baht, daysLeft, fmtDMY, iso, parse, today } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { state } from '../state.js';
import { $, closeSheet, esc, openSheet, toast } from '../ui/dom.js';
import { back, keepRender } from '../ui/navigation.js';
import { listOf, subHead, tile } from '../ui/shared.js';
import { confirmSheet, sfx } from '../ui/sound.js';

/* ---------- item page ---------- */
export function vDetail() {
  const it = byId(S.detail),
    s = status(it),
    id = it.id;
  let pay = '';
  if (it.payType === 'qr')
    pay = `<img class="qr" src="${it.qr}" alt="QR สำหรับจ่าย ${esc(it.name)}"><p class="hint center">กดค้างที่รูปเพื่อบันทึก แล้วเปิดแอปธนาคารสแกนจากรูป</p><button type="button" class="btn plain block sm top12" onclick="zoomQR('${id}')">${ic('zoom', 16)}ขยาย QR</button>`;
  if (it.payType === 'bank')
    pay = `<p class="hint">${esc(it.bank)}</p><p class="acc-no num">${esc(it.accNo)}</p><p>${esc(it.accName)}</p><button type="button" class="btn soft block sm top12" onclick="copyText('${esc(String(it.accNo).replace(/\D/g, ''))}')">${ic('copy', 16)}คัดลอกเลขบัญชี</button>`;
  if (it.payType === 'promptpay')
    pay = `<p class="hint">พร้อมเพย์</p><p class="acc-no num">${esc(it.ppNo)}</p><p>${esc(it.accName)}</p><button type="button" class="btn soft block sm top12" onclick="copyText('${esc(String(it.ppNo).replace(/\D/g, ''))}')">${ic('copy', 16)}คัดลอกเลขพร้อมเพย์</button>`;
  const hist = it.history.slice().reverse(),
    shown = S.histAll ? hist : hist.slice(0, 3),
    last = hist[0];
  const fresh = !!(S.stamp && S.stamp.id === id && !RM());
  const stamp =
    (it.done || fresh) && last
      ? `<div class="stamp${fresh ? ' fresh' : ''}${it.done ? '' : ' gone'}" aria-hidden="true"><b>จ่ายแล้ว</b><small>${fmtDMY(last.date)}</small></div>`
      : '';
  return (
    subHead(
      'รายละเอียด',
      `<button type="button" class="iconbtn" onclick="decor('${id}')" aria-label="แต่งหน้าตา">${ic('palette')}</button>`,
    ) +
    `
  <section class="slip${fresh ? ' thud' : ''}">
    <div class="slip-top">
      <div class="who">${tile(it, 46)}<div><h2>${esc(it.name)}</h2><p class="hint">${repeatLong(it)}</p></div></div>
      <p class="slip-amt num">${baht(it.amount)}</p>
      <p class="slip-due"><span>ครบกำหนด <b>${fmtDMY(it.due)}</b></span><span class="pill ${s.k}">${s.t}</span></p>
      ${stamp}
    </div>
    <div class="perf"></div>
    <div class="slip-stub">
      <div class="stub-head"><h3>ช่องทางจ่ายเงิน</h3>${pay ? `<button type="button" class="chipbtn" onclick="startEdit('${id}','pay')">แก้ไข</button>` : ''}</div>
      ${pay || `<p class="hint">ยังไม่ได้บันทึก QR หรือเลขบัญชี</p><button type="button" class="btn soft block sm top12" onclick="startEdit('${id}','pay')">${ic('plus', 16)}เพิ่มช่องทางจ่ายเงิน</button>`}
    </div>
  </section>
  <div class="list top12">
    <button type="button" class="row" id="remRow" onclick="startEdit('${id}','rem')"><span class="lead">${ic('bell')}</span><span class="grow"><span class="t1">การเตือน</span><span class="t2">${remindSummary(it)} เวลา ${esc(it.time)} น.</span></span><span class="link">แก้ไข</span></button>
    ${it.note ? `<div class="row"><span class="lead">${ic('scroll')}</span><span class="grow"><span class="t1">โน้ต</span><span class="t2 wrap">${esc(it.note)}</span></span></div>` : ''}
  </div>
  <div class="sec"><h2>ประวัติการจ่าย</h2>${hist.length ? `<button type="button" class="link" onclick="askUndo('${id}')">ยกเลิกครั้งล่าสุด</button>` : ''}</div>
  ${hist.length ? listOf(shown.map((h) => `<div class="row"><span class="grow"><span class="t1">จ่ายวันที่ ${fmtDMY(h.date)}</span><span class="t2"><span class="st ${h.onTime ? 'done' : 'over'}">${h.onTime ? 'ตรงเวลา' : 'จ่ายช้า'}</span></span></span><span class="end"><span class="amt num">${baht(h.amount)}</span></span></div>`)) + (hist.length > shown.length ? `<button type="button" class="btn plain block sm top8" id="histMore" onclick="S.histAll=true;keepRender()">ดูทั้งหมด ${hist.length} ครั้ง</button>` : '') : `<p class="hint">ยังไม่มีประวัติการจ่าย</p>`}
  <div class="stack top16" style="margin-top:28px"><button type="button" class="btn plain block" onclick="startEdit('${id}')">แก้ไขข้อมูลรายการ</button><button type="button" class="btn quiet-danger block" onclick="askDel('${id}')">ลบรายการ</button></div>
  ${it.done ? '' : `<div class="actbar"><button type="button" class="btn block" onclick="payOpen('${id}')">${ic('check', 18)}จ่ายแล้ว</button></div>`}`
  );
}
export function zoomQR(id) {
  const it = byId(id);
  if (!it || !it.qr) return;
  openSheet(
    `<div class="sheet-head"><h2>${esc(it.name)}</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div><img class="qr big" src="${it.qr}" alt="QR ขนาดใหญ่"><p class="hint center">เพิ่มความสว่างหน้าจอ แล้วใช้อีกเครื่องสแกนได้เลย</p>`,
  );
}
export function payOpen(id) {
  const it = byId(id);
  if (!it) return;
  openSheet(`<h2>บันทึกว่าจ่ายแล้ว</h2><p class="hint top8">${esc(it.name)} รอบครบกำหนด ${fmtDMY(it.due)}</p>
  <label class="f" for="payAmt">ยอดที่จ่ายจริง (บาท)</label><input class="inp" id="payAmt" type="number" inputmode="decimal" min="0" step="any" value="${it.amount}">
  <div class="two top16"><button type="button" class="btn plain" onclick="closeSheet()">ยกเลิก</button><button type="button" class="btn" onclick="payConfirm('${id}')">ยืนยัน</button></div>`);
}
export let stampT;
export function payConfirm(id) {
  const it = byId(id);
  if (!it) return;
  const raw = $('#payAmt').value,
    amt = raw === '' ? it.amount : +raw;
  if (!(amt >= 0)) {
    sfx('error');
    return toast('ใส่ยอดเป็นตัวเลขที่ไม่ติดลบ');
  }
  it.history.push({
    date: iso(today()),
    due: it.due,
    amount: amt,
    onTime: daysLeft(it) >= 0,
    ts: Date.now(),
  });
  resolveInbox(id, it.due, true);
  if (it.repeat === 'monthly') it.due = iso(addMonths(parse(it.due), 1, it.anchor));
  else if (it.repeat === 'yearly') it.due = iso(addMonths(parse(it.due), 12, it.anchor));
  else it.done = true;
  it.since = Date.now();
  S.stamp = { id };
  clearTimeout(stampT);
  stampT = setTimeout(() => {
    S.stamp = null;
    const e = document.querySelector('.stamp.gone');
    if (e) e.remove();
    const sl = document.querySelector('.slip.thud');
    if (sl) sl.classList.remove('thud');
  }, 2400);
  saveItems();
  closeSheet();
  keepRender();
  sfx('pay');
  toast(it.done ? 'บันทึกว่าจ่ายแล้ว' : 'บันทึกว่าจ่ายแล้ว รอบถัดไป ' + fmtDMY(it.due), {
    label: 'เลิกทำ',
    fn: () => undoPay(id),
  });
}
export function undoPay(id) {
  const it = byId(id);
  if (!it || !it.history.length) return;
  const h = it.history.pop();
  if (h.due) it.due = h.due;
  else if (it.repeat !== 'none' && !it.done)
    it.due = iso(addMonths(parse(it.due), it.repeat === 'monthly' ? -1 : -12, it.anchor));
  it.done = false;
  it.since = Date.now();
  S.stamp = null;
  resolveInbox(id, it.due, false);
  saveItems();
  keepRender();
  sfx('undo');
  toast('ยกเลิกการจ่ายครั้งล่าสุดแล้ว');
}
export function askUndo(id) {
  const it = byId(id);
  if (!it || !it.history.length) return;
  const h = it.history[it.history.length - 1];
  confirmSheet(
    'ยกเลิกการจ่ายครั้งล่าสุด',
    `ลบบันทึกการจ่ายวันที่ ${fmtDMY(h.date)} ยอด ${baht(h.amount)} แล้วรายการจะกลับไปรอจ่าย`,
    'ยกเลิกการจ่ายนี้',
    () => undoPay(id),
  );
}
export function askDel(id) {
  const it = byId(id);
  if (!it) return;
  confirmSheet(
    'ลบ ' + it.name,
    'ประวัติการจ่ายและการแจ้งเตือนของรายการนี้จะถูกลบไปด้วย และกู้คืนไม่ได้',
    'ลบรายการ',
    () => {
      state.items = state.items.filter((i) => i.id !== id);
      saveItems();
      state.inbox = state.inbox.filter((n) => n.itemId !== id);
      saveInbox();
      back();
      sfx('remove');
      toast('ลบรายการแล้ว');
    },
  );
}
