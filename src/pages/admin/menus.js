import { saveCfg } from '../../data/config.js';
import { MENU_INFO } from './admin-home.js';
import { canAdmin } from '../auth.js';
import { state } from '../../state.js';
import { keepRender } from '../../ui/navigation.js';
import { subHead } from '../../ui/shared.js';

/* menus */
export function vAdMenus() {
  return (
    subHead('เมนูและฟีเจอร์') +
    `<div class="list">${Object.keys(MENU_INFO)
      .map(
        (k) =>
          `<div class="row"><span class="grow"><span class="t1">${MENU_INFO[k][0]}</span><span class="t2">${MENU_INFO[k][1]}</span></span><button type="button" class="switch" role="switch" aria-checked="${!!state.CFG.menus[k]}" aria-label="${MENU_INFO[k][0]}" onclick="adMenu('${k}')"></button></div>`,
      )
      .join('')}</div>
  <p class="hint top8">เปลี่ยนแล้วมีผลทันที</p>`
  );
}
export function adMenu(k) {
  if (!canAdmin() || !MENU_INFO[k]) return;
  state.CFG.menus[k] = !state.CFG.menus[k];
  saveCfg((state.CFG.menus[k] ? 'เปิด ' : 'ปิด ') + MENU_INFO[k][0]);
  keepRender();
}
