import { saveCfg } from '../../data/config.js';
import { S, norm, saveItems } from '../../data/records.js';
import { HUES, HUE_NAME, ITEM_ICONS, REP } from '../../lib/constants.js';
import { ic } from '../../lib/icons.js';
import { canAdmin } from '../auth.js';
import { state } from '../../state.js';
import { $, closeSheet, esc, fail, sheetSwap, toast } from '../../ui/dom.js';
import { keepRender } from '../../ui/navigation.js';
import { listOf, subHead } from '../../ui/shared.js';

/* templates, categories, banks */
export function vAdLists() {
  const chev = ic('chevR', 18).replace('class="i"', 'class="i chev"');
  const pills = (key, lock) =>
    state.CFG[key]
      .map(
        (v, i) =>
          `<span class="rm">${esc(v)}${v === lock ? '' : `<button type="button" aria-label="ลบ ${esc(v)}" onclick="rmList('${key}',${i})">${ic('x', 14)}</button>`}</span>`,
      )
      .join('');
  return (
    subHead('แบบสำเร็จรูป หมวด และธนาคาร') +
    `
  <div class="sec" style="margin-top:0"><h2>แบบสำเร็จรูป</h2><button type="button" class="chipbtn" onclick="tplSheet(-1)">เพิ่ม</button></div>
  ${state.CFG.templates.length ? listOf(state.CFG.templates.map((t, i) => `<button type="button" class="row" onclick="tplSheet(${i})"><span class="tile" style="--h:var(--hue-${t.h});width:40px;height:40px">${ic(t.i, 20)}</span><span class="grow"><span class="t1">${esc(t.n)}</span><span class="t2"><span>${esc(t.c)}</span><span>${REP[t.r]}</span></span></span>${chev}</button>`)) : `<div class="list"><p class="rownote">ยังไม่มีแบบสำเร็จรูป</p></div>`}
  <div class="sec"><h2>หมวด</h2></div>
  <div class="group"><div class="chips">${pills('cats', 'อื่นๆ')}</div><div class="inline"><input class="inp" id="newCat" maxlength="16" placeholder="ชื่อหมวดใหม่" aria-label="ชื่อหมวดใหม่"><button type="button" class="btn soft" onclick="addList('cats','newCat')">เพิ่ม</button></div><p class="hint top8">ลบหมวดแล้ว รายการในหมวดนั้นจะย้ายไปอยู่หมวดอื่นๆ</p></div>
  <div class="sec"><h2>ธนาคาร</h2></div>
  <div class="group"><div class="chips">${pills('banks', null)}</div><div class="inline"><input class="inp" id="newBank" maxlength="30" placeholder="ชื่อธนาคารใหม่" aria-label="ชื่อธนาคารใหม่"><button type="button" class="btn soft" onclick="addList('banks','newBank')">เพิ่ม</button></div></div>`
  );
}
export function addList(key, inputId) {
  if (!canAdmin()) return;
  const v = document
    .getElementById(inputId)
    .value.trim()
    .slice(0, key === 'cats' ? 16 : 30);
  if (!v) return fail(inputId, key === 'cats' ? 'ใส่ชื่อหมวดก่อนเพิ่ม' : 'ใส่ชื่อธนาคารก่อนเพิ่ม');
  if (state.CFG[key].includes(v)) return fail(inputId, 'มีชื่อนี้อยู่แล้ว');
  if (key === 'cats') {
    const k = state.CFG.cats.indexOf('อื่นๆ');
    state.CFG.cats.splice(k < 0 ? state.CFG.cats.length : k, 0, v);
  } else state.CFG.banks.push(v);
  saveCfg((key === 'cats' ? 'เพิ่มหมวด ' : 'เพิ่มธนาคาร ') + v);
  keepRender();
  toast('เพิ่ม ' + v + ' แล้ว');
}
export function rmList(key, i) {
  if (!canAdmin()) return;
  const L = state.CFG[key],
    v = L[i];
  if (v === undefined || (key === 'cats' && v === 'อื่นๆ')) return;
  if (key === 'banks' && L.length <= 1) return toast('ต้องเหลือธนาคารอย่างน้อย 1 แห่ง');
  L.splice(i, 1);
  if (key === 'cats') {
    state.CFG.templates.forEach((t) => {
      if (t.c === v) t.c = 'อื่นๆ';
    });
    state.items.forEach(norm);
    saveItems();
  }
  saveCfg((key === 'cats' ? 'ลบหมวด ' : 'ลบธนาคาร ') + v);
  keepRender();
  toast('ลบ ' + v + ' แล้ว');
}
export function tplSheet(i) {
  S.tplI = i;
  S.tpl =
    i >= 0
      ? Object.assign({}, state.CFG.templates[i])
      : { n: '', i: 'star', h: 'green', r: 'monthly', c: state.CFG.cats[0] };
  renderTpl();
}
export function syncTpl() {
  const n = document.getElementById('t_n');
  if (!n || !S.tpl) return;
  S.tpl.n = n.value;
  S.tpl.c = $('#t_c').value;
  S.tpl.r = $('#t_r').value;
}
export function setTpl(k, v) {
  syncTpl();
  S.tpl[k] = v;
  renderTpl();
}
export function renderTpl() {
  const t = S.tpl;
  if (!t) return;
  sheetSwap(
    'tplsheet',
    `<div class="sheet-head"><h2>${S.tplI >= 0 ? 'แก้ไขแบบสำเร็จรูป' : 'เพิ่มแบบสำเร็จรูป'}</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div>
  <label class="f" for="t_n" style="margin-top:0">ชื่อ</label><input class="inp" id="t_n" maxlength="20" value="${esc(t.n)}" placeholder="เช่น ค่าหอพัก">
  <div class="two"><div><label class="f" for="t_c">หมวด</label><select class="inp" id="t_c">${state.CFG.cats.map((c) => `<option${t.c === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div><label class="f" for="t_r">รอบการจ่าย</label><select class="inp" id="t_r">${Object.keys(
    REP,
  )
    .map((k) => `<option value="${k}"${t.r === k ? ' selected' : ''}>${REP[k]}</option>`)
    .join('')}</select></div></div>
  <p class="f">สี</p><div class="swatches">${HUES.map((h) => `<button type="button" class="sw" style="--h:var(--hue-${h})" aria-pressed="${t.h === h}" aria-label="สี${HUE_NAME[h]}" onclick="setTpl('h','${h}')"></button>`).join('')}</div>
  <p class="f">ไอคอน</p><div class="icons" style="--h:var(--hue-${t.h})">${ITEM_ICONS.map((k) => `<button type="button" aria-pressed="${t.i === k}" aria-label="ไอคอน ${k}" onclick="setTpl('i','${k}')">${ic(k, 22)}</button>`).join('')}</div>
  <div class="two top16">${S.tplI >= 0 ? `<button type="button" class="btn quiet-danger" onclick="delTpl()">ลบแบบนี้</button>` : `<button type="button" class="btn plain" onclick="closeSheet()">ยกเลิก</button>`}<button type="button" class="btn" onclick="saveTpl()">บันทึก</button></div>`,
  );
}
export function saveTpl() {
  if (!canAdmin()) return;
  syncTpl();
  const t = S.tpl;
  t.n = t.n.trim().slice(0, 20);
  if (!t.n) return fail('t_n', 'ใส่ชื่อแบบสำเร็จรูปก่อนบันทึก');
  if (S.tplI >= 0) state.CFG.templates[S.tplI] = t;
  else state.CFG.templates.push(t);
  saveCfg((S.tplI >= 0 ? 'แก้ไขแบบสำเร็จรูป ' : 'เพิ่มแบบสำเร็จรูป ') + t.n);
  S.tpl = null;
  closeSheet();
  keepRender();
  toast('บันทึกแบบสำเร็จรูปแล้ว');
}
export function delTpl() {
  if (!canAdmin() || S.tplI < 0) return;
  const t = state.CFG.templates.splice(S.tplI, 1)[0];
  saveCfg('ลบแบบสำเร็จรูป ' + t.n);
  S.tpl = null;
  closeSheet();
  keepRender();
  toast('ลบแบบสำเร็จรูปแล้ว');
}
