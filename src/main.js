/* Start-up: load styles, expose the functions that the screens' onclick="…" attributes call,
   load the admin settings, then wire events and show the first screen. */
import './styles/index.css';
import { state } from './state.js';
import { loadCfg } from './data/config.js';
import * as m0 from './data/config.js';
import * as m1 from './data/demo.js';
import * as m2 from './data/derived.js';
import * as m3 from './data/records.js';
import * as m4 from './data/reminders.js';
import * as m5 from './lib/constants.js';
import * as m6 from './lib/dates.js';
import * as m7 from './lib/icons.js';
import * as m8 from './lib/password.js';
import * as m9 from './lib/store.js';
import * as m10 from './pages/account.js';
import * as m11 from './pages/admin/admin-home.js';
import * as m12 from './pages/admin/announcements.js';
import * as m13 from './pages/admin/audit-log.js';
import * as m14 from './pages/admin/lists.js';
import * as m15 from './pages/admin/menus.js';
import * as m16 from './pages/admin/notifications.js';
import * as m17 from './pages/admin/plans.js';
import * as m18 from './pages/admin/users.js';
import * as m19 from './pages/auth.js';
import * as m20 from './pages/calendar.js';
import * as m21 from './pages/history.js';
import * as m22 from './pages/home.js';
import * as m23 from './pages/inbox.js';
import * as m24 from './pages/insights.js';
import * as m25 from './pages/install.js';
import * as m26 from './pages/item-detail.js';
import * as m27 from './pages/item-edit.js';
import * as m28 from './pages/item-look.js';
import * as m29 from './pages/items.js';
import * as m30 from './pages/notification-settings.js';
import * as m31 from './router.js';
import * as m32 from './ui/dom.js';
import * as m33 from './ui/navigation.js';
import * as m34 from './ui/shared.js';
import * as m35 from './ui/sound.js';
import * as m36 from './ui/transitions.js';
import { RM, S, loadItems, nav, normUser, usersDB } from './data/records.js';
import { loadInbox, tick } from './data/reminders.js';
import { OLD_EMOJI } from './lib/constants.js';
import { hash, store } from './lib/store.js';
import { readSession, setSession } from './pages/auth.js';
import { render } from './router.js';
import { $, closeSheet, toast } from './ui/dom.js';
import { applyMode, keepRender } from './ui/navigation.js';

// Screens are HTML strings with inline handlers such as onclick="openItem('x')", so those functions must be global.
for (const m of [
  m0,
  m1,
  m2,
  m3,
  m4,
  m5,
  m6,
  m7,
  m8,
  m9,
  m10,
  m11,
  m12,
  m13,
  m14,
  m15,
  m16,
  m17,
  m18,
  m19,
  m20,
  m21,
  m22,
  m23,
  m24,
  m25,
  m26,
  m27,
  m28,
  m29,
  m30,
  m31,
  m32,
  m33,
  m34,
  m35,
  m36,
])
  Object.assign(window, m);
window.state = state;

state.CFG = loadCfg();

Object.entries({
  '🚗': 'car',
  '🏠': 'house',
  '📶': 'wifi',
  '💡': 'zap',
  '💧': 'droplet',
  '📱': 'smartphone',
  '💳': 'card',
  '🧾': 'receipt',
  '🛡️': 'shield',
  '🎬': 'film',
  '🎵': 'music',
  '🏍️': 'bike',
  '🪪': 'idcard',
  '🛂': 'idcard',
  '🏥': 'health',
  '🎓': 'school',
  '🐶': 'pet',
  '🏋️': 'gym',
  '☁️': 'cloud',
  '🍼': 'star',
  '🧸': 'star',
  '✈️': 'plane',
  '📦': 'box',
  '⭐': 'star',
}).forEach(([k, v]) => (OLD_EMOJI[k.replace(/️/g, '')] = v));
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installEvt = e;
  if (state.user && (S.view === 'home' || S.view === 'install')) keepRender();
});
window.addEventListener('appinstalled', () => {
  state.installEvt = null;
  if (state.user) {
    toast('ติดตั้ง Click Si แล้ว เปิดจากไอคอนบนหน้าจอได้เลย');
    if (S.view === 'home' || S.view === 'install') keepRender();
  }
});
$('#modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSheet();
});
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tick();
});
window.addEventListener('storage', (e) => {
  if (state.user && (e.key === 'cs_session' || e.key === 'cs_users')) tick();
}); /* sign-out or suspension in another tab applies here too */
window.addEventListener('hashchange', () => {
  if (!state.user && location.hash === '#admin') {
    S.authTab = 'admin';
    render();
  }
});
/* One-time clean-up: earlier versions shipped a sample admin with a known password. */
(function secMigrate() {
  if (store.get('cs_sec_v', 0) >= 1) return;
  const db = usersDB(),
    a = 'admin@clicksi.app',
    d = 'demo@clicksi.app';
  let dirty = false;
  if (db[a] && db[a].pass === hash('admin')) {
    delete db[a];
    dirty = true;
    ['cs_items_', 'cs_inbox_', 'cs_fired_'].forEach((k) => store.del(k + a));
    const ss = store.get('cs_session', null);
    if (ss === a || (ss && ss.email === a)) store.del('cs_session');
  }
  if (db[d] && db[d].pass === hash('demo')) {
    db[d].pass = '!demo';
    dirty = true;
  }
  if (dirty) store.set('cs_users', db);
  store.set('cs_sec_v', 1);
})();
(function init() {
  const had = store.get('cs_session', null),
    s = readSession(),
    db = usersDB();
  if (s && db[s.email] && !db[s.email].suspended) {
    state.user = normUser(db[s.email]);
    loadItems();
    loadInbox();
    setSession();
  } else if (had) store.del('cs_session');
  if (!state.user && location.hash === '#admin') S.authTab = 'admin';
  applyMode();
  nav.anim = 'boot';
  render();
  tick();
  const sp = $('#splash');
  if (sp) {
    if (RM()) sp.remove();
    else setTimeout(() => sp.remove(), 1800);
  }
})();
