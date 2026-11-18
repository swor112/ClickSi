import { ago } from '../../data/reminders.js';
import { store } from '../../lib/store.js';
import { esc } from '../../ui/dom.js';
import { listOf, subHead } from '../../ui/shared.js';

/* audit trail */
export function vAdLog() {
  const L = store.get('cs_audit', []);
  return (
    subHead('ประวัติการแก้ไข') +
    (L.length
      ? listOf(
          L.map(
            (a) =>
              `<div class="row"><span class="grow"><span class="t1">${esc(a.text)}</span><span class="t2"><span>${esc(a.by)}</span><span>${ago(a.ts)}</span></span></span></div>`,
          ),
        )
      : `<div class="list"><p class="rownote">ยังไม่มีการแก้ไขจากแอดมิน</p></div>`)
  );
}
