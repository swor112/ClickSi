import { payCount, payFull, remindSummary } from '../data/derived.js';
import { S, byId, nav, norm, saveItems, uid } from '../data/records.js';
import { tick } from '../data/reminders.js';
import { PAY, REP } from '../lib/constants.js';
import { addDays, iso, parse, today } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { proSheet } from './account.js';
import { render } from '../router.js';
import { state } from '../state.js';
import { $, esc, fail, toast } from '../ui/dom.js';
import { back, keepRender, push } from '../ui/navigation.js';
import { subHead, tile } from '../ui/shared.js';
import { sfx } from '../ui/sound.js';

/* ---------- add and edit ---------- */
export function startAdd() {
  state.draft = {
    id: null,
    name: '',
    icon: 'star',
    hue: 'green',
    image: null,
    amount: '',
    due: iso(addDays(today(), 7)),
    repeat: 'monthly',
    cat: 'อื่นๆ',
    remind: state.CFG.remind.days.slice(),
    daily: false,
    dailyFrom: 7,
    time: state.CFG.remind.time,
    payType: 'none',
    qr: null,
    bank: state.CFG.banks[0],
    accNo: '',
    accName: '',
    ppNo: '',
    note: '',
    tpl: null,
  };
  S.grp = {};
  S.grpJust = null;
  sfx('open');
  push('edit', null, 'up');
}
export function startEdit(id, focus) {
  const it = byId(id);
  if (!it) return;
  state.draft = JSON.parse(JSON.stringify(it));
  state.draft.bank = state.draft.bank || state.CFG.banks[0];
  ['accNo', 'accName', 'ppNo', 'note'].forEach((k) => (state.draft[k] = state.draft[k] || ''));
  S.grp = {};
  S.grpJust = null;
  if (focus) S.grp[focus] = true;
  push('edit');
  if (focus)
    requestAnimationFrame(() => {
      const el = document.getElementById('g_' + focus);
      if (el) el.scrollIntoView({ block: 'start' });
    });
}
export function toggleGroup(k) {
  syncDraft();
  S.grp[k] = !S.grp[k];
  S.grpJust = S.grp[k] ? k : null;
  keepRender();
}
export function syncDraft() {
  if (!state.draft) return;
  const map = {
    d_name: 'name',
    d_amount: 'amount',
    d_due: 'due',
    d_time: 'time',
    d_note: 'note',
    d_accNo: 'accNo',
    d_accName: 'accName',
    d_ppNo: 'ppNo',
    d_bank: 'bank',
    d_cat: 'cat',
  };
  for (const id in map) {
    const el = document.getElementById(id);
    if (el) state.draft[map[id]] = el.value;
  }
  const df = document.getElementById('d_dailyFrom');
  if (df) state.draft.dailyFrom = Math.min(60, Math.max(1, parseInt(df.value) || 7));
}
export function setD(k, v) {
  syncDraft();
  state.draft[k] = v;
  sfx('tick');
  keepRender();
}
export function pickTpl(i) {
  syncDraft();
  const t = state.CFG.templates[i];
  if (!t) return;
  const stock = JSON.stringify(state.draft.remind),
    base = state.CFG.remind.days.slice();
  if (!state.draft.name.trim() || state.CFG.templates.some((x) => x.n === state.draft.name))
    state.draft.name = t.n;
  Object.assign(state.draft, {
    tpl: i,
    icon: t.i,
    hue: t.h,
    repeat: t.r,
    cat: state.CFG.cats.includes(t.c) ? t.c : 'อื่นๆ',
    image: null,
  });
  if (stock === JSON.stringify(base) || stock === '[30,7,1]')
    state.draft.remind = t.r === 'yearly' ? [30, 7, 1] : base;
  keepRender();
}
export function toggleRemind(n) {
  sfx('tick');
  syncDraft();
  const r = state.draft.remind,
    i = r.indexOf(n);
  if (i >= 0) r.splice(i, 1);
  else r.push(n);
  keepRender();
}
export function addCustomRemind() {
  syncDraft();
  const v = parseInt($('#d_custom').value);
  if (!(v >= 0 && v <= 365)) return toast('ใส่จำนวนวันเป็นตัวเลข 0 ถึง 365');
  if (!state.draft.remind.includes(v)) state.draft.remind.push(v);
  keepRender();
}
export function setPay(t) {
  sfx('tick');
  syncDraft();
  if (t !== 'none' && state.draft.payType === 'none' && payFull(state.draft))
    return proSheet('แพ็กเกจฟรีบันทึกช่องทางจ่ายเงินได้ ' + state.CFG.freePay + ' รายการ และคุณใช้ครบแล้ว');
  state.draft.payType = t;
  keepRender();
}
export function readImg(file, max, cb) {
  if (!file) return;
  if (file.type && !/^image\//.test(file.type)) return toast('เลือกไฟล์รูปภาพเท่านั้น');
  const r = new FileReader();
  r.onerror = () => toast('อ่านไฟล์ไม่สำเร็จ ลองเลือกรูปใหม่');
  r.onload = () => {
    const im = new Image();
    im.onerror = () => toast('เปิดรูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG');
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height)),
        c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * s));
      c.height = Math.max(1, Math.round(im.height * s));
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.88));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}
export function onQR(e) {
  const f = e.target.files[0];
  if (!f) return;
  syncDraft();
  readImg(f, 600, (u) => {
    if (!state.draft) return;
    state.draft.qr = u;
    keepRender();
  });
}
export function pv() {}
export function vEdit() {
  const d = state.draft,
    isNew = !d.id,
    full = payFull(d),
    left = state.CFG.freePay - payCount(d.id) - (d.payType !== 'none' ? 1 : 0);
  const just = S.grpJust;
  S.grpJust = null;
  const chev = ic('chevR', 18).replace('class="i"', 'class="i chev"');
  const rChip = (n, l) =>
    `<button type="button" class="chip" aria-pressed="${d.remind.includes(n)}" onclick="toggleRemind(${n})">${l}</button>`;
  const std = d.repeat === 'yearly' ? [30, 7, 3, 1, 0] : [7, 3, 1, 0],
    extra = d.remind.filter((n) => !std.includes(n)).sort((a, b) => b - a);
  /* a folded row: title, what is set now, and the fields only when it is open */
  const sec = (k, icn, title, sum, body, badge = '') =>
    `<section class="dsec" id="g_${k}"><button type="button" class="disc" id="h_${k}" aria-expanded="${!!S.grp[k]}" onclick="toggleGroup('${k}')"><span class="lead">${ic(icn)}</span><span class="grow"><span class="dt">${title}${badge}</span><span class="dv">${sum}</span></span>${chev}</button>${S.grp[k] ? `<div class="dbody${just === k ? ' reveal' : ''}">${body}</div>` : ''}</section>`;
  const remBody = `<div class="toggle"><div><p><b>เตือนทุกวัน</b></p><p class="hint">เตือนทุกวันจนกว่าจะบันทึกว่าจ่ายแล้ว</p></div><button type="button" class="switch" role="switch" aria-checked="${!!d.daily}" aria-label="เตือนทุกวัน" onclick="setD('daily',${!d.daily})"></button></div>
    ${
      d.daily
        ? `<label class="f" for="d_dailyFrom">เริ่มเตือนก่อนครบกำหนดกี่วัน</label><input class="inp" id="d_dailyFrom" type="number" inputmode="numeric" min="1" max="60" value="${d.dailyFrom}">`
        : `<p class="f">เตือนล่วงหน้า เลือกได้หลายวัน</p><div class="chips">${std.map((n) => rChip(n, n === 0 ? 'วันครบกำหนด' : n + ' วันก่อน')).join('')}${extra.map((n) => rChip(n, n + ' วันก่อน')).join('')}</div>
    <div class="inline"><input class="inp" id="d_custom" type="number" inputmode="numeric" min="0" max="365" placeholder="กำหนดเอง เช่น 14" aria-label="จำนวนวันล่วงหน้าที่กำหนดเอง"><button type="button" class="btn soft" onclick="addCustomRemind()">เพิ่ม</button></div>`
    }
    <label class="f" for="d_time">เวลาเตือน</label><input class="inp" id="d_time" type="time" value="${esc(d.time)}">`;
  const payBody = `<p class="hint">บันทึกไว้กับรายการ ถึงวันจ่ายก็เปิดดูได้ทันที</p>
    <div class="opts top12">${Object.keys(PAY)
      .map(
        (k) =>
          `<button type="button" class="opt" aria-pressed="${d.payType === k}" onclick="setPay('${k}')">${ic(PAY[k].i, 18)}<span>${PAY[k].l}</span>${k !== 'none' && d.payType === 'none' && full ? `<span class="lk">${ic('lock', 14)}</span>` : ''}</button>`,
      )
      .join('')}</div>
    ${d.payType === 'qr' ? `<label class="upload top12" for="qrFile">${d.qr ? `<img src="${d.qr}" alt="QR ที่บันทึกไว้"><span>แตะเพื่อเปลี่ยนรูป</span>` : `${ic('qr', 22)}<span>อัปโหลดรูป QR จากบิล หรือภาพแคปหน้าจอ</span>`}<input id="qrFile" type="file" accept="image/*" hidden onchange="onQR(event)"></label>` : ''}
    ${
      d.payType === 'bank'
        ? `<label class="f" for="d_bank">ธนาคาร</label><select class="inp" id="d_bank">${state.CFG.banks.map((b) => `<option${d.bank === b ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>
      <label class="f" for="d_accNo">เลขบัญชี</label><input class="inp" id="d_accNo" inputmode="numeric" maxlength="20" value="${esc(d.accNo)}" placeholder="xxx-x-xxxxx-x">
      <label class="f" for="d_accName">ชื่อบัญชี</label><input class="inp" id="d_accName" maxlength="60" value="${esc(d.accName)}" placeholder="ชื่อผู้รับเงิน">`
        : ''
    }
    ${
      d.payType === 'promptpay'
        ? `<label class="f" for="d_ppNo">เบอร์โทร เลขบัตรประชาชน หรือเลขผู้เสียภาษี</label><input class="inp" id="d_ppNo" inputmode="numeric" maxlength="20" value="${esc(d.ppNo)}" placeholder="08x-xxx-xxxx">
      <label class="f" for="d_accName">ชื่อผู้รับ</label><input class="inp" id="d_accName" maxlength="60" value="${esc(d.accName)}" placeholder="ชื่อผู้รับเงิน">`
        : ''
    }`;
  const moreBody = `<label class="f" for="d_cat">หมวด</label><select class="inp" id="d_cat">${state.CFG.cats.map((c) => `<option${d.cat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <label class="f" for="d_note">โน้ต ไม่ใส่ก็ได้</label><textarea class="inp" id="d_note" rows="2" maxlength="300" placeholder="เช่น เลขสัญญา หรือจ่ายผ่านแอปไหน">${esc(d.note)}</textarea>`;
  const paySum =
    d.payType === 'qr'
      ? d.qr
        ? 'บันทึก QR Code แล้ว'
        : 'QR Code ยังไม่ได้อัปโหลดรูป'
      : d.payType === 'bank'
        ? esc((d.bank + ' ' + d.accNo).trim())
        : d.payType === 'promptpay'
          ? esc(('พร้อมเพย์ ' + d.ppNo).trim())
          : 'ยังไม่ได้บันทึก QR หรือเลขบัญชี';
  const showQuota = !state.user.pro && state.CFG.menus.pro && d.payType === 'none';
  const quota = showQuota && !full ? `<span class="quota">ฟรีอีก ${left} รายการ</span>` : '';
  const paySumHtml =
    showQuota && full
      ? `<span class="quota full">${ic('lock', 12)}ใช้ฟรีครบ ${state.CFG.freePay} รายการแล้ว</span>`
      : paySum;
  return (
    subHead(isNew ? 'เพิ่มรายการ' : 'แก้ไขรายการ', '', isNew) +
    `
  ${isNew && state.CFG.menus.templates && state.CFG.templates.length ? `<div class="tpls" role="group" aria-label="เริ่มจากแบบสำเร็จรูป">${state.CFG.templates.map((t, i) => `<button type="button" aria-pressed="${d.tpl === i}" onclick="pickTpl(${i})"><span class="tile" style="--h:var(--hue-${t.h});width:30px;height:30px">${ic(t.i, 16)}</span>${esc(t.n)}</button>`).join('')}</div>` : ''}
  <section class="group basics">
    <label class="f" for="d_name">ชื่อรายการ</label>
    <div class="namerow"><button type="button" class="tilebtn" id="decorBtn" onclick="decor()" aria-label="แต่งหน้าตารายการ">${tile(d, 52)}<span class="pen">${ic('pen', 11)}</span></button><input class="inp" id="d_name" maxlength="40" value="${esc(d.name)}" placeholder="เช่น งวดรถ ค่าเน็ตบ้าน"></div>
    <div class="two"><div><label class="f" for="d_amount">ยอดจ่าย (บาท)</label><input class="inp" id="d_amount" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.amount)}" placeholder="0"></div>
    <div><label class="f" for="d_due">วันครบกำหนด</label><input class="inp" id="d_due" type="date" value="${esc(d.due)}"></div></div>
    <p class="f">รอบการจ่าย</p><div class="seg">${Object.keys(REP)
      .map(
        (k) =>
          `<button type="button" aria-pressed="${d.repeat === k}" onclick="setD('repeat','${k}')">${REP[k]}</button>`,
      )
      .join('')}</div>
  </section>
  ${sec('rem', 'bell', 'การเตือน', remindSummary(d) + ' เวลา ' + esc(d.time || '08:00') + ' น.', remBody)}
  ${sec('pay', 'qr', 'ช่องทางจ่ายเงิน', paySumHtml, payBody, quota)}
  ${sec('more', 'tag', 'หมวดและโน้ต', esc(d.cat) + (d.note.trim() ? ' มีโน้ต' : ''), moreBody)}
  <div class="actbar"><button type="button" class="btn block" onclick="saveDraft()">${isNew ? 'บันทึกรายการ' : 'บันทึกการแก้ไข'}</button></div>`
  );
}
export function saveDraft() {
  syncDraft();
  const d = state.draft;
  d.name = d.name.trim();
  if (!d.name) return fail('d_name', 'ใส่ชื่อรายการก่อนบันทึก');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.due) || isNaN(parse(d.due)))
    return fail('d_due', 'เลือกวันครบกำหนดก่อนบันทึก');
  if (+d.amount < 0) return fail('d_amount', 'ยอดจ่ายต้องไม่ติดลบ');
  if (!d.daily && !d.remind.length) return fail('g_rem', 'เลือกวันเตือนอย่างน้อย 1 วัน หรือเปิดเตือนทุกวัน', 'rem');
  if (d.payType === 'qr' && !d.qr) return fail('g_pay', 'อัปโหลดรูป QR ก่อนบันทึก หรือเปลี่ยนเป็นไม่บันทึก', 'pay');
  if (d.payType === 'bank' && !d.accNo.trim())
    return fail('d_accNo', 'ใส่เลขบัญชีก่อนบันทึก หรือเปลี่ยนเป็นไม่บันทึก', 'pay');
  if (d.payType === 'promptpay' && !d.ppNo.trim())
    return fail('d_ppNo', 'ใส่เลขพร้อมเพย์ก่อนบันทึก หรือเปลี่ยนเป็นไม่บันทึก', 'pay');
  d.amount = +d.amount || 0;
  d.anchor = parse(d.due).getDate();
  d.time = d.time || '08:00';
  delete d.tpl;
  const isNew = !d.id,
    sched = (x) => JSON.stringify([x.due, x.remind, !!x.daily, +x.dailyFrom, x.time]);
  if (isNew) {
    d.id = uid();
    d.history = [];
    d.done = false;
    d.since = Date.now();
    state.items.push(norm(d));
  } else {
    const i = state.items.findIndex((x) => x.id === d.id);
    if (i < 0) return back();
    if (state.items[i].done && (d.repeat !== 'none' || d.due !== state.items[i].due)) d.done = false;
    if (sched(state.items[i]) !== sched(d)) d.since = Date.now();
    state.items[i] = norm(d);
  }
  saveItems();
  state.draft = null;
  if (isNew) {
    const top = nav.stack[nav.stack.length - 1];
    if (top) top.mode = null;
    S.view = 'detail';
    S.detail = d.id;
    S.histAll = false;
    nav.anim = 'fwd';
    render();
    window.scrollTo(0, 0);
    toast('เพิ่ม ' + d.name + ' แล้ว');
  } else {
    back();
    toast('บันทึกการแก้ไขแล้ว');
  }
  sfx('save');
  tick();
}
