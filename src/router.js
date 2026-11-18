import { RM, S, byId, isAdmin, nav } from './data/records.js';
import { TABS } from './lib/constants.js';
import { vMe } from './pages/account.js';
import { vAdmin } from './pages/admin/admin-home.js';
import { vAdNotice } from './pages/admin/announcements.js';
import { vAdLog } from './pages/admin/audit-log.js';
import { vAdLists } from './pages/admin/lists.js';
import { vAdMenus } from './pages/admin/menus.js';
import { vAdNotif } from './pages/admin/notifications.js';
import { vAdPlans } from './pages/admin/plans.js';
import { vAdUsers } from './pages/admin/users.js';
import { canAdmin, needSudo, vAuth } from './pages/auth.js';
import { vCal } from './pages/calendar.js';
import { vHistory } from './pages/history.js';
import { countUp, vHome } from './pages/home.js';
import { vNotif } from './pages/inbox.js';
import { vInsights } from './pages/insights.js';
import { vInstall } from './pages/install.js';
import { vDetail } from './pages/item-detail.js';
import { vEdit } from './pages/item-edit.js';
import { vItems } from './pages/items.js';
import { vNotifSet } from './pages/notification-settings.js';
import { state } from './state.js';
import { $, toast } from './ui/dom.js';
import { tabBar } from './ui/shared.js';
import { dropGhost, snap } from './ui/transitions.js';

/* ---------- render ---------- */
export const VIEWS = {
  home: vHome,
  items: vItems,
  cal: vCal,
  notif: vNotif,
  me: vMe,
  detail: vDetail,
  edit: vEdit,
  notifSet: vNotifSet,
  install: vInstall,
  insights: vInsights,
  history: vHistory,
  admin: vAdmin,
  adUsers: vAdUsers,
  adPlans: vAdPlans,
  adMenus: vAdMenus,
  adLists: vAdLists,
  adNotif: vAdNotif,
  adNotice: vAdNotice,
  adLog: vAdLog,
};
export const BAR_VIEWS = ['edit', 'adPlans', 'adNotif'];
export function render() {
  const app = $('#app');
  if (!state.user) {
    const a = nav.anim;
    nav.anim = '';
    nav.last = null;
    nav.tabAt = null;
    dropGhost();
    app.className = '';
    app.innerHTML = vAuth();
    if (a && !RM()) app.firstElementChild.classList.add(a === 'boot' ? 'boot' : 'enter');
    return;
  }
  const v = S.view,
    adminView = v.startsWith('ad');
  if (adminView && isAdmin() && needSudo())
    setTimeout(() => toast('หมดเวลาใช้งานหลังบ้าน ยืนยันรหัสผ่านอีกครั้งเพื่อเข้าใหม่'), 60);
  const lost =
    !VIEWS[v] ||
    (v === 'detail' && !byId(S.detail)) ||
    (v === 'edit' && !state.draft) ||
    (adminView && !canAdmin()) ||
    (v === 'adNotif' && !S.an) ||
    (v === 'cal' && !state.CFG.menus.cal) ||
    (v === 'insights' && !state.CFG.menus.insights) ||
    (v === 'history' && !state.CFG.menus.history);
  if (lost) {
    S.view = 'home';
    nav.stack = [];
  }
  if (S.view.startsWith('ad')) state.adminAuthAt = Date.now(); /* working in the back office keeps it open */
  const isTab = TABS.includes(S.view),
    wasTab = TABS.includes(nav.last),
    a = nav.anim,
    motion = !!a && !RM();
  nav.anim = '';
  if (motion) snap(a, isTab && wasTab);
  else dropGhost();
  if (!isTab) nav.tabAt = null;
  app.innerHTML =
    `<div class="view"${a ? ` data-anim="${a}"` : ''}>${VIEWS[S.view]()}</div>` + (isTab ? tabBar() : '');
  const ab = app.querySelector('.view .actbar');
  if (ab) {
    app.appendChild(ab);
    if (motion) ab.classList.add('rise');
  }
  const tb = app.querySelector('.tabbar');
  if (tb && motion && !wasTab) tb.classList.add('rise');
  app.className = isTab
    ? 'tabs'
    : BAR_VIEWS.includes(S.view) || (S.view === 'detail' && !byId(S.detail).done)
      ? 'bar'
      : '';
  nav.last = S.view;
  if (S.view === 'home') countUp(a === 'boot' ? 1150 : a === 'enter' ? 200 : 0);
}
