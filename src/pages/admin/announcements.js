import { audit } from '../../data/config.js';
import { uid } from '../../data/records.js';
import { ago, tick } from '../../data/reminders.js';
import { store } from '../../lib/store.js';
import { canAdmin } from '../auth.js';
import { state } from '../../state.js';
import { $, esc, toast } from '../../ui/dom.js';
import { keepRender } from '../../ui/navigation.js';
import { listOf, subHead } from '../../ui/shared.js';

/* announcements */
export function vAdNotice() {
  const L = store.get('cs_broadcasts', []);
  return (
    subHead('ประกาศถึงผู้ใช้') +
    `
  <section class="group"><h2>ประกาศใหม่</h2>
    <label class="f" for="b_t">หัวข้อ</label><input class="inp" id="b_t" maxlength="40" placeholder="เช่น ปิดปรับปรุงระบบคืนวันเสาร์">
    <label class="f" for="b_b">ข้อความ</label><textarea class="inp" id="b_b" rows="3" maxlength="200" placeholder="รายละเอียดที่อยากบอกผู้ใช้"></textarea>
    <div class="toggle"><div><p><b>ปักเป็นแบนเนอร์บนหน้าแรก</b></p><p class="hint">แสดงจนกว่าผู้ใช้จะกดปิด หรือคุณเอาออก</p></div><button type="button" class="switch" role="switch" id="b_pin" aria-checked="true" aria-label="ปักเป็นแบนเนอร์บนหน้าแรก" onclick="this.setAttribute('aria-checked',this.getAttribute('aria-checked')!=='true')"></button></div>
    <button type="button" class="btn block top12" onclick="sendBc()">ส่งประกาศถึงผู้ใช้ทุกคน</button>
  </section>
  <div class="sec"><h2>ที่ส่งไปแล้ว</h2></div>
  ${L.length ? listOf(L.map((b, i) => `<div class="row"><span class="grow"><span class="t1">${esc(b.title)}</span><span class="t2">${ago(b.ts)}</span></span>${b.pin ? `<button type="button" class="btn plain sm" onclick="unpin(${i})">เอาแบนเนอร์ออก</button>` : ''}</div>`)) : `<div class="list"><p class="rownote">ยังไม่เคยส่งประกาศ</p></div>`}`
  );
}
export function sendBc() {
  if (!canAdmin()) return;
  const t = $('#b_t').value.trim().slice(0, 40),
    b = $('#b_b').value.trim().slice(0, 200),
    pin = $('#b_pin').getAttribute('aria-checked') === 'true';
  if (!t || !b) return toast('ใส่หัวข้อและข้อความก่อนส่ง');
  const L = store.get('cs_broadcasts', []);
  if (pin) L.forEach((x) => (x.pin = false));
  L.unshift({ id: uid(), title: t, body: b, ts: Date.now(), by: state.user.email, pin });
  store.set('cs_broadcasts', L.slice(0, 20));
  audit('ส่งประกาศ ' + t);
  keepRender();
  tick();
  toast('ส่งประกาศแล้ว');
}
export function unpin(i) {
  const L = store.get('cs_broadcasts', []);
  if (!L[i] || !canAdmin()) return;
  L[i].pin = false;
  store.set('cs_broadcasts', L);
  audit('เอาแบนเนอร์ออก ' + L[i].title);
  keepRender();
  toast('เอาแบนเนอร์ออกแล้ว');
}
