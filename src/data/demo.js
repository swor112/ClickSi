import { loadItems, norm, normUser, saveItems, saveUser, uid, usersDB } from './records.js';
import { addDays, addMonths, iso, today } from '../lib/dates.js';
import { store } from '../lib/store.js';
import { enter } from '../pages/auth.js';
import { state } from '../state.js';
import { toast } from '../ui/dom.js';

export function fakeQR() {
  const c = document.createElement('canvas');
  c.width = c.height = 210;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 210, 210);
  x.fillStyle = '#12211C';
  let s = 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 21; i++)
    for (let j = 0; j < 21; j++) if (rnd() > 0.55) x.fillRect(i * 10, j * 10, 10, 10);
  [
    [0, 0],
    [140, 0],
    [0, 140],
  ].forEach(([a, b]) => {
    x.fillStyle = '#12211C';
    x.fillRect(a, b, 70, 70);
    x.fillStyle = '#fff';
    x.fillRect(a + 10, b + 10, 50, 50);
    x.fillStyle = '#12211C';
    x.fillRect(a + 20, b + 20, 30, 30);
  });
  x.fillStyle = '#fff';
  x.fillRect(55, 90, 100, 30);
  x.fillStyle = '#B3362A';
  x.font = 'bold 16px sans-serif';
  x.textAlign = 'center';
  x.fillText('ตัวอย่าง', 105, 111);
  return c.toDataURL();
}
export function seedDemo() {
  const t = today();
  const mk = (offset, o) => {
    const due = addDays(t, offset);
    const it = Object.assign(
      {
        id: uid(),
        due: iso(due),
        anchor: due.getDate(),
        remind: [7, 3, 1, 0],
        daily: false,
        dailyFrom: 7,
        time: '08:00',
        payType: 'none',
        history: [],
        note: '',
        done: false,
        image: null,
      },
      o,
    );
    for (let k = o.past || 0; k >= 1; k--) {
      const d = addMonths(due, (it.repeat === 'yearly' ? -12 : -1) * k, it.anchor),
        late = o.lateAt === k,
        paid = addDays(d, late ? 2 : -1);
      it.history.push({
        date: iso(paid),
        due: iso(d),
        amount: o.vary ? Math.round(it.amount * (1 + (((k * 37) % 11) - 5) / 50)) : it.amount,
        onTime: !late,
        ts: paid.getTime() + k,
      });
    }
    delete it.past;
    delete it.lateAt;
    delete it.vary;
    return norm(it);
  };
  return [
    mk(-1, {
      name: 'บัตรเครดิต',
      icon: 'card',
      hue: 'slate',
      amount: 3500,
      repeat: 'monthly',
      cat: 'ผ่อน',
      daily: true,
      dailyFrom: 5,
      past: 5,
      vary: true,
    }),
    mk(2, {
      name: 'งวดรถ Yaris',
      icon: 'car',
      hue: 'blue',
      amount: 8900,
      repeat: 'monthly',
      cat: 'ผ่อน',
      payType: 'qr',
      qr: fakeQR(),
      note: 'สัญญาเลขที่ 12-3456',
      past: 5,
    }),
    mk(5, {
      name: 'ค่าเน็ตบ้าน',
      icon: 'wifi',
      hue: 'violet',
      amount: 599,
      repeat: 'monthly',
      cat: 'บิล',
      note: 'จ่ายผ่านแอปธนาคาร',
      past: 5,
    }),
    mk(9, {
      name: 'ค่าไฟ',
      icon: 'zap',
      hue: 'amber',
      amount: 1240,
      repeat: 'monthly',
      cat: 'บิล',
      remind: [3, 1],
      past: 5,
      vary: true,
      lateAt: 4,
    }),
    mk(12, {
      name: 'Netflix',
      icon: 'film',
      hue: 'rose',
      amount: 419,
      repeat: 'monthly',
      cat: 'สมาชิก',
      remind: [1],
      past: 5,
    }),
    mk(Math.round((addDays(addMonths(t, 1), -5) - t) / 864e5), {
      name: 'ค่าโทรศัพท์',
      icon: 'smartphone',
      hue: 'teal',
      amount: 399,
      repeat: 'monthly',
      cat: 'บิล',
      remind: [3, 1],
      past: 5,
    }),
    mk(40, {
      name: 'ภาษีรถและ พ.ร.บ.',
      icon: 'receipt',
      hue: 'green',
      amount: 1900,
      repeat: 'yearly',
      cat: 'ต่ออายุ',
      remind: [30, 7, 1],
      past: 1,
    }),
  ];
}
export function demoLogin() {
  const email = 'demo@clicksi.app',
    db = usersDB();
  if (db[email] && db[email].suspended) return toast('บัญชีตัวอย่างถูกระงับโดยผู้ดูแล');
  if (db[email] && db[email].role === 'admin') {
    db[email].role = 'user';
    store.set('cs_users', db);
  } /* the sample account never carries admin rights */
  state.user = normUser(
    db[email] || {
      email,
      pass: '!demo',
      name: 'มาร์ค',
      payday: 25,
      pro: false,
      role: 'user',
      mode: 'auto',
      created: iso(today()),
    },
  );
  state.adminAuthAt = 0;
  saveUser();
  loadItems();
  if (!state.items.length || store.get('cs_seed_v', 0) < 3) {
    store.set('cs_seed_v', 3);
    state.items = seedDemo();
    saveItems();
  }
  enter();
}
