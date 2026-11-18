import { audit } from '../data/config.js';
import { S, isAdmin, loadItems, nav, normUser, saveUser, usersDB } from '../data/records.js';
import { loadInbox, tick } from '../data/reminders.js';
import { iso, today } from '../lib/dates.js';
import { logo } from '../lib/icons.js';
import { pwCheck, pwHash, pwPolicy } from '../lib/password.js';
import { store } from '../lib/store.js';
import { render } from '../router.js';
import { state } from '../state.js';
import { $, closeSheet, esc, fail, openSheet, toast } from '../ui/dom.js';
import { applyMode, keepRender, push } from '../ui/navigation.js';

/* ---------- sign in ---------- */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ADMIN_IDLE = 15 * 6e4,
  MAX_TRIES = 5,
  LOCK_MIN = 5;
export let authBusy = false; /* adminAuthAt: shared, see state.js */ /* adminAuthAt lives in memory only: a reload asks for the password again */
export const adminExists = () =>
  Object.values(usersDB()).some((u) => u && u.role === 'admin' && !u.suspended);
export const needSudo = () => !state.adminAuthAt || Date.now() - state.adminAuthAt > ADMIN_IDLE;
export const canAdmin = () => isAdmin() && !needSudo();

/* A reminder app keeps people signed in: the session has no expiry and ends only on sign-out or suspension.
   The back office is protected separately by asking for the admin's password (see needSudo). */
export function setSession() {
  store.set('cs_session', { email: state.user.email });
}
export function readSession() {
  const s = store.get('cs_session', null);
  if (typeof s === 'string') return { email: s }; /* written by earlier versions */
  return s && typeof s === 'object' && typeof s.email === 'string' ? s : null;
}
/* Runs on every tick: signs out when the session ended elsewhere or the account was suspended, and picks up role changes. */
export function guardSession() {
  const s = readSession(),
    rec = usersDB()[state.user.email];
  if (!s || s.email !== state.user.email) {
    logout();
    toast('ออกจากระบบแล้ว เข้าสู่ระบบอีกครั้งเมื่อต้องการใช้งาน');
    return false;
  }
  if (!rec || rec.suspended) {
    logout();
    toast(rec ? 'บัญชีนี้ถูกระงับ ติดต่อผู้ดูแลระบบ' : 'ไม่พบบัญชีนี้แล้ว เข้าสู่ระบบอีกครั้ง');
    return false;
  }
  const role = rec.role === 'admin' ? 'admin' : 'user';
  if (role !== state.user.role || !!rec.pro !== !!state.user.pro) {
    state.user.role = role;
    state.user.pro = !!rec.pro;
    keepRender();
  } else if (S.view.startsWith('ad') && needSudo()) keepRender();
  return true;
}

/* five wrong passwords in a row pause sign-in for that email for five minutes */
export function lockState() {
  const L = store.get('cs_lock', {});
  return L && typeof L === 'object' && !Array.isArray(L) ? L : {};
}
export function lockedMin(email) {
  const x = lockState()[email];
  return x && x.until > Date.now() ? Math.ceil((x.until - Date.now()) / 6e4) : 0;
}
export function noteFail(email) {
  const L = lockState(),
    x = L[email] && typeof L[email] === 'object' ? L[email] : { n: 0, until: 0 };
  x.n = (+x.n || 0) + 1;
  if (x.n >= MAX_TRIES) {
    x.n = 0;
    x.until = Date.now() + LOCK_MIN * 6e4;
  }
  L[email] = x;
  const ks = Object.keys(L);
  if (ks.length > 50) delete L[ks[0]];
  store.set('cs_lock', L);
  return x.until > Date.now();
}
export function clearFail(email) {
  const L = lockState();
  if (L[email]) {
    delete L[email];
    store.set('cs_lock', L);
  }
}
export const DUMMY_PW = 'pbkdf2$150000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
export async function signIn(email, pw, adminOnly) {
  const mins = lockedMin(email);
  if (mins) return { msg: 'ลองผิดหลายครั้งเกินไป ลองใหม่ได้ในอีก ' + mins + ' นาที' };
  const db = usersDB(),
    u = db[email];
  const good = (await pwCheck(pw, u ? u.pass : DUMMY_PW)) && !!u && (!adminOnly || u.role === 'admin');
  if (!good) {
    const locked = noteFail(email);
    if (adminOnly) audit('เข้าสู่ระบบผู้ดูแลไม่สำเร็จ ' + email);
    return {
      msg: locked
        ? 'ลองผิดครบ ' + MAX_TRIES + ' ครั้ง พักการเข้าสู่ระบบของอีเมลนี้ ' + LOCK_MIN + ' นาที'
        : adminOnly
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ไม่มีสิทธิ์ผู้ดูแล'
          : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    };
  }
  if (u.suspended) return { msg: 'บัญชีนี้ถูกระงับ ติดต่อผู้ดูแลระบบ' };
  clearFail(email);
  if (!String(u.pass).startsWith('pbkdf2$')) {
    u.pass = await pwHash(pw);
    store.set('cs_users', db);
  }
  return { ok: true, user: normUser(u) };
}
export function vAuth() {
  const mode = S.authTab,
    admin = mode === 'admin',
    setup = admin && !adminExists(),
    reg = mode === 'reg',
    closed = reg && !state.CFG.menus.signup,
    create = reg || setup;
  const form = closed
    ? `<p class="note top12">ตอนนี้ปิดรับสมัครสมาชิกใหม่ชั่วคราว ผู้ที่มีบัญชีแล้วยังเข้าสู่ระบบได้ตามปกติ</p>`
    : `<form id="authForm" onsubmit="doAuth(event)" novalidate>
      ${create ? `<label class="f" for="a_name">${setup ? 'ชื่อผู้ดูแล' : 'ชื่อเล่น'}</label><input class="inp" id="a_name" maxlength="30" autocomplete="nickname">` : ''}
      <label class="f" for="a_email">อีเมล</label><input class="inp" id="a_email" type="email" inputmode="email" maxlength="100" autocomplete="${admin ? 'username' : 'email'}" placeholder="you@email.com">
      <label class="f" for="a_pass">รหัสผ่าน</label><input class="inp" id="a_pass" type="password" maxlength="100" autocomplete="${create ? 'new-password' : 'current-password'}" placeholder="${create ? 'อย่างน้อย ' + (setup ? 10 : 8) + ' ตัวอักษร' : ''}">
      ${create ? `<label class="f" for="a_pass2">ยืนยันรหัสผ่าน</label><input class="inp" id="a_pass2" type="password" maxlength="100" autocomplete="new-password">` : ''}
      <button class="btn block top16" type="submit">${setup ? 'สร้างบัญชีผู้ดูแล' : reg ? 'สร้างบัญชี' : admin ? 'เข้าสู่หลังบ้าน' : 'เข้าสู่ระบบ'}</button>
    </form>`;
  if (admin)
    return `<div class="auth">
    <div class="brand">${logo(36)}<b>Click Si</b><span class="pill pro">ผู้ดูแลระบบ</span></div>
    <div><h1>${setup ? 'ตั้งค่าผู้ดูแลระบบ' : 'เข้าสู่ระบบผู้ดูแล'}</h1><p class="lead-p">${setup ? 'ยังไม่มีบัญชีผู้ดูแลในระบบนี้ สร้างบัญชีแรกเพื่อใช้หลังบ้าน' : 'สำหรับผู้ดูแลระบบเท่านั้น การเข้าใช้ทุกครั้งถูกบันทึกไว้'}</p></div>
    <div class="group">${form}</div>
    ${setup ? `<p class="note">บนเว็บจริง บัญชีผู้ดูแลคนแรกจะถูกสร้างที่ฐานข้อมูลโดยเจ้าของระบบ หน้าตั้งค่านี้จะไม่เปิดให้คนทั่วไปเห็น</p>` : ''}
    <button type="button" class="link" onclick="S.authTab='login';render()">กลับไปหน้าเข้าสู่ระบบของผู้ใช้</button>
  </div>`;
  return `<div class="auth">
    <div class="brand">${logo(36)}<b>Click Si</b></div>
    <div><h1>บิลและวันหมดอายุทั้งหมด อยู่ในที่เดียว</h1><p class="lead-p">ตั้งเตือนล่วงหน้า เก็บ QR หรือเลขบัญชีไว้กับบิล พอถึงวันจ่ายก็เปิดจ่ายได้ทันที</p></div>
    <div class="group">
      <div class="seg"><button type="button" aria-pressed="${!reg}" onclick="S.authTab='login';render()">เข้าสู่ระบบ</button><button type="button" aria-pressed="${reg}" onclick="S.authTab='reg';render()">สมัครสมาชิก</button></div>
      ${form}
    </div>
    <button type="button" class="btn plain block" onclick="demoLogin()">ลองใช้ด้วยบัญชีตัวอย่าง</button>
    <p class="hint">เวอร์ชันต้นแบบ ข้อมูลเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น</p>
    <button type="button" class="link" onclick="S.authTab='admin';render()">สำหรับผู้ดูแลระบบ</button>
  </div>`;
}
export async function doAuth(e) {
  e.preventDefault();
  if (authBusy) return;
  const mode = S.authTab,
    admin = mode === 'admin',
    email = $('#a_email').value.trim().toLowerCase(),
    pw = $('#a_pass').value;
  if (!EMAIL_RE.test(email) || email.length > 100) return fail('a_email', 'ใส่อีเมลให้ถูกต้อง เช่น you@email.com');
  if (!pw) return fail('a_pass', 'ใส่รหัสผ่าน');
  const btn = $('#authForm button[type=submit]');
  authBusy = true;
  if (btn) {
    btn.disabled = true;
    btn.classList.add('busy');
  }
  try {
    if (mode === 'login' || (admin && adminExists())) {
      const r = await signIn(email, pw, admin);
      if (!r.ok) return toast(r.msg);
      state.user = r.user;
      state.adminAuthAt = admin ? Date.now() : 0;
      if (admin) audit('เข้าสู่ระบบผู้ดูแล');
      loadItems();
      enter();
      if (admin) push('admin');
      return;
    }
    if (!admin && !state.CFG.menus.signup) return toast('ตอนนี้ปิดรับสมัครสมาชิกใหม่ชั่วคราว');
    const name = $('#a_name').value.trim().slice(0, 30),
      bad = pwPolicy(pw, admin);
    if (!name) return fail('a_name', admin ? 'ใส่ชื่อผู้ดูแล' : 'ใส่ชื่อเล่นก่อนสมัคร');
    if (bad) return fail('a_pass', bad);
    if (pw !== $('#a_pass2').value) return fail('a_pass2', 'รหัสผ่านสองช่องไม่ตรงกัน');
    if (usersDB()[email]) return fail('a_email', 'อีเมลนี้มีบัญชีอยู่แล้ว เลือกเข้าสู่ระบบแทน');
    const pass = await pwHash(pw);
    if (admin && adminExists()) return toast('มีบัญชีผู้ดูแลอยู่แล้ว เข้าสู่ระบบแทน');
    state.user = normUser({
      email,
      pass,
      name,
      payday: admin ? 0 : 25,
      pro: admin,
      role: admin ? 'admin' : 'user',
      mode: 'auto',
      created: iso(today()),
      seenBc: Date.now(),
    });
    saveUser();
    state.adminAuthAt = admin ? Date.now() : 0;
    if (admin) audit('ตั้งค่าบัญชีผู้ดูแลคนแรก');
    loadItems();
    enter();
    if (admin) push('admin');
  } finally {
    authBusy = false;
    const b = $('#authForm button[type=submit]');
    if (b) {
      b.disabled = false;
      b.classList.remove('busy');
    }
  }
}
export function enter() {
  setSession();
  applyMode();
  loadInbox();
  nav.stack = [];
  Object.assign(S, { view: 'home', q: '', cat: 'all', sort: 'due', calY: null, uq: '' });
  state.lastDue = null;
  nav.anim = 'enter';
  render();
  window.scrollTo(0, 0);
  tick();
}
export function logout() {
  store.del('cs_session');
  state.adminAuthAt = 0;
  clearTimeout(state.toastT);
  $('#toast').classList.remove('on');
  $('#toast').innerHTML = '';
  state.user = null;
  state.items = [];
  state.inbox = [];
  state.draft = null;
  nav.stack = [];
  S.authTab = 'login';
  S.an = null;
  closeSheet();
  applyMode();
  nav.anim = 'enter';
  render();
  window.scrollTo(0, 0);
}

/* the back office asks for the password again after a reload or 15 idle minutes */
export function openAdmin() {
  if (!isAdmin()) return;
  if (!needSudo()) return push('admin');
  sudoSheet();
}
export function sudoSheet() {
  openSheet(`<h2>ยืนยันตัวตนผู้ดูแล</h2><p class="hint top8">ใส่รหัสผ่านของ ${esc(state.user.email)} เพื่อเข้าหลังบ้าน</p>
  <form id="sudoForm" onsubmit="sudoGo(event)" novalidate><label class="f" for="s_pass">รหัสผ่าน</label><input class="inp" id="s_pass" type="password" maxlength="100" autocomplete="current-password">
  <div class="two top16"><button type="button" class="btn plain" onclick="closeSheet()">ยกเลิก</button><button class="btn" type="submit">ยืนยัน</button></div></form>`);
}
export async function sudoGo(e) {
  e.preventDefault();
  if (authBusy || !isAdmin()) return;
  const pw = $('#s_pass').value;
  if (!pw) return fail('s_pass', 'ใส่รหัสผ่าน');
  authBusy = true;
  try {
    const r = await signIn(state.user.email, pw, true);
    if (!r.ok) return toast(r.msg);
    state.adminAuthAt = Date.now();
    audit('ยืนยันตัวตนเข้าหลังบ้าน');
    closeSheet();
    push('admin');
  } finally {
    authBusy = false;
  }
}
export function pwSheet() {
  openSheet(`<h2>เปลี่ยนรหัสผ่าน</h2><form id="pwForm" onsubmit="pwSave(event)" novalidate>
  <label class="f" for="pw_old">รหัสผ่านปัจจุบัน</label><input class="inp" id="pw_old" type="password" maxlength="100" autocomplete="current-password">
  <label class="f" for="pw_new">รหัสผ่านใหม่</label><input class="inp" id="pw_new" type="password" maxlength="100" autocomplete="new-password" placeholder="อย่างน้อย ${isAdmin() ? 10 : 8} ตัวอักษร">
  <label class="f" for="pw_new2">ยืนยันรหัสผ่านใหม่</label><input class="inp" id="pw_new2" type="password" maxlength="100" autocomplete="new-password">
  <div class="two top16"><button type="button" class="btn plain" onclick="closeSheet()">ยกเลิก</button><button class="btn" type="submit">บันทึก</button></div></form>`);
}
export async function pwSave(e) {
  e.preventDefault();
  if (authBusy) return;
  const o = $('#pw_old').value,
    n = $('#pw_new').value,
    bad = pwPolicy(n, isAdmin());
  if (!o) return fail('pw_old', 'ใส่รหัสผ่านปัจจุบัน');
  if (bad) return fail('pw_new', bad);
  if (n !== $('#pw_new2').value) return fail('pw_new2', 'รหัสผ่านสองช่องไม่ตรงกัน');
  if (n === o) return fail('pw_new', 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
  const mins = lockedMin(state.user.email);
  if (mins) return toast('ลองผิดหลายครั้งเกินไป ลองใหม่ได้ในอีก ' + mins + ' นาที');
  authBusy = true;
  try {
    if (!(await pwCheck(o, state.user.pass))) {
      noteFail(state.user.email);
      return fail('pw_old', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    clearFail(state.user.email);
    state.user.pass = await pwHash(n);
    saveUser();
    if (isAdmin()) audit('เปลี่ยนรหัสผ่านผู้ดูแล');
    closeSheet();
    toast('เปลี่ยนรหัสผ่านแล้ว');
  } finally {
    authBusy = false;
  }
}
