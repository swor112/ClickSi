import { saveCfg } from '../../data/config.js';
import { canAdmin } from '../auth.js';
import { state } from '../../state.js';
import { $, fail, toast } from '../../ui/dom.js';
import { back } from '../../ui/navigation.js';
import { subHead } from '../../ui/shared.js';

/* plans */
export function vAdPlans() {
  return (
    subHead('แพ็กเกจและราคา') +
    `<div class="stack">
  <section class="group"><h2>ราคา Pro</h2>
    <div class="two"><div><label class="f" for="c_pm">รายเดือน (บาท)</label><input class="inp" id="c_pm" type="number" inputmode="numeric" min="1" value="${state.CFG.priceM}"></div><div><label class="f" for="c_py">รายปี (บาท)</label><input class="inp" id="c_py" type="number" inputmode="numeric" min="1" value="${state.CFG.priceY}"></div></div>
  </section>
  <section class="group"><h2>โควตาของแพ็กเกจฟรี</h2>
    <label class="f" for="c_fp">จำนวนรายการที่บันทึกช่องทางจ่ายเงินได้ฟรี</label><input class="inp" id="c_fp" type="number" inputmode="numeric" min="0" max="99" value="${state.CFG.freePay}">
    <p class="hint top8">เกินจำนวนนี้ ผู้ใช้จะเห็นหน้าแนะนำ Pro</p>
  </section></div>
  <div class="actbar"><button type="button" class="btn block" onclick="savePlans()">บันทึก</button></div>`
  );
}
export function savePlans() {
  if (!canAdmin()) return;
  const pm = +$('#c_pm').value,
    py = +$('#c_py').value,
    raw = $('#c_fp').value.trim(),
    fp = Number(raw);
  if (!(pm > 0 && py > 0)) return toast('ราคาต้องมากกว่า 0 บาท');
  if (raw === '' || !Number.isInteger(fp) || fp < 0 || fp > 99)
    return fail('c_fp', 'โควตาฟรีต้องเป็นจำนวนเต็ม 0 ถึง 99');
  state.CFG.priceM = pm;
  state.CFG.priceY = py;
  state.CFG.freePay = fp;
  saveCfg('ตั้งราคา Pro ' + pm + ' และ ' + py + ' บาท โควตาฟรี ' + fp + ' รายการ');
  back();
  toast('บันทึกแพ็กเกจแล้ว');
}
