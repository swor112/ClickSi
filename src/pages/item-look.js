import { byId, saveItems } from '../data/records.js';
import { HUES, HUE_NAME, ITEM_ICONS } from '../lib/constants.js';
import { baht } from '../lib/dates.js';
import { ic } from '../lib/icons.js';
import { readImg, syncDraft } from './item-edit.js';
import { state } from '../state.js';
import { $, esc, openSheet } from '../ui/dom.js';
import { tile } from '../ui/shared.js';
import { sfx } from '../ui/sound.js';

/* ---------- look of an item (kept apart from the bill details) ---------- */
export const decObj = () => (state.decT ? byId(state.decT) : state.draft);
export function decor(id) {
  state.decT = id || null;
  if (!id) syncDraft();
  renderDecor();
}
export function renderDecor() {
  const d = decObj();
  if (!d) return;
  const html = `<div class="sheet-head"><h2>แต่งหน้าตารายการ</h2><button type="button" class="iconbtn" onclick="closeSheet()" aria-label="ปิด">${ic('x')}</button></div>
  <div class="list"><div class="row">${tile(d, 42)}<span class="grow"><span class="t1">${esc(d.name) || 'ชื่อรายการ'}</span><span class="t2">ตัวอย่างที่จะแสดงในรายการ</span></span><span class="end"><span class="amt num">${baht(+d.amount || 0)}</span></span></div></div>
  <p class="f">สี</p><div class="swatches">${HUES.map((h) => `<button type="button" class="sw" style="--h:var(--hue-${h})" aria-pressed="${d.hue === h}" aria-label="สี${HUE_NAME[h]}" onclick="setDec('hue','${h}')"></button>`).join('')}</div>
  <p class="f">ไอคอน</p><div class="icons" style="--h:var(--hue-${d.hue})">${ITEM_ICONS.map((k) => `<button type="button" aria-pressed="${!d.image && d.icon === k}" aria-label="ไอคอน ${k}" onclick="setDec('icon','${k}')">${ic(k, 22)}</button>`).join('')}</div>
  <p class="f">หรือใช้รูปของคุณ</p>
  <label class="upload" for="imgFile">${d.image ? `<img src="${d.image}" alt="รูปที่เลือก"><span>แตะเพื่อเปลี่ยนรูป</span>` : `${ic('image', 22)}<span>อัปโหลดรูป เช่น รูปรถ หรือโลโก้ผู้ให้บริการ</span>`}<input id="imgFile" type="file" accept="image/*" hidden onchange="onImg(event)"></label>
  ${d.image ? `<button type="button" class="btn plain block sm top8" onclick="setDec('image',null)">ลบรูป แล้วใช้ไอคอนแทน</button>` : ''}
  <button type="button" class="btn block top16" onclick="closeSheet()">เสร็จแล้ว</button>`;
  const m = $('#modal'),
    sh = m.querySelector('.sheet.decor');
  if (!m.hidden && !m.classList.contains('closing') && sh) {
    const st = sh.scrollTop;
    sh.innerHTML = html;
    sh.scrollTop = st;
  } else openSheet(html, 'decor');
}
export function setDec(k, v) {
  const d = decObj();
  if (!d) return;
  sfx('tick');
  d[k] = v;
  if (k === 'icon') d.image = null;
  if (state.decT) saveItems();
  renderDecor();
}
export function onImg(e) {
  const f = e.target.files[0];
  if (!f) return;
  readImg(f, 160, (u) => {
    const d = decObj();
    if (!d) return;
    d.image = u;
    if (state.decT) saveItems();
    renderDecor();
  });
}
