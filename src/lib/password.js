import { hash } from './store.js';

/* ---------- passwords ----------
   Kept as salted PBKDF2-SHA256, never as the password itself. Web Crypto does the work; the plain-JS
   version is for browsers without it. Records made by earlier versions are upgraded at the next sign-in. */
export const primes = (n) => {
  const p = [];
  for (let x = 2; p.length < n; x++) {
    let ok = true;
    for (let i = 2; i * i <= x; i++)
      if (x % i === 0) {
        ok = false;
        break;
      }
    if (ok) p.push(x);
  }
  return p;
};
export const SHA_K = primes(64).map((p) => ((Math.cbrt(p) % 1) * 4294967296) >>> 0),
  SHA_H = primes(8).map((p) => ((Math.sqrt(p) % 1) * 4294967296) >>> 0);
export function sha256(msg) {
  const l = msg.length,
    bl = ((l + 72) >> 6) << 6,
    m = new Uint8Array(bl),
    dv = new DataView(m.buffer),
    w = new Uint32Array(64),
    H = SHA_H.slice();
  m.set(msg);
  m[l] = 0x80;
  dv.setUint32(bl - 8, Math.floor(l / 0x20000000));
  dv.setUint32(bl - 4, (l << 3) >>> 0);
  for (let o = 0; o < bl; o += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(o + t * 4);
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15],
        y = w[t - 2];
      w[t] =
        w[t - 16] +
        (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) +
        w[t - 7] +
        (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10));
    }
    let a = H[0],
      b = H[1],
      c = H[2],
      d = H[3],
      e = H[4],
      f = H[5],
      g = H[6],
      h = H[7];
    for (let t = 0; t < 64; t++) {
      const t1 =
          (h +
            (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
            ((e & f) ^ (~e & g)) +
            SHA_K[t] +
            w[t]) |
          0,
        t2 =
          ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
            ((a & b) ^ (a & c) ^ (b & c))) |
          0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }
  const out = new Uint8Array(32),
    ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i] >>> 0);
  return out;
}
export function hmac256(key, msg) {
  if (key.length > 64) key = sha256(key);
  const ip = new Uint8Array(64 + msg.length),
    op = new Uint8Array(96);
  for (let i = 0; i < 64; i++) {
    const k = key[i] || 0;
    ip[i] = k ^ 0x36;
    op[i] = k ^ 0x5c;
  }
  ip.set(msg, 64);
  op.set(sha256(ip), 64);
  return sha256(op);
}
export function pbkdf2js(pw, salt, iter) {
  const key = new TextEncoder().encode(pw),
    s1 = new Uint8Array(salt.length + 4);
  s1.set(salt);
  s1[salt.length + 3] = 1;
  let u = hmac256(key, s1);
  const out = u.slice();
  for (let i = 1; i < iter; i++) {
    u = hmac256(key, u);
    for (let j = 0; j < 32; j++) out[j] ^= u[j];
  }
  return out;
}
export const hasSubtle = !!(window.crypto && crypto.subtle && crypto.subtle.deriveBits);
export async function kdf(pw, salt, iter) {
  if (hasSubtle) {
    try {
      const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, [
        'deriveBits',
      ]);
      return new Uint8Array(
        await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256),
      );
    } catch (e) {}
  }
  return pbkdf2js(pw, salt, iter);
}
export const b64 = (u) => btoa(String.fromCharCode.apply(null, u)),
  unb64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
export async function pwHash(pw) {
  const salt = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(salt);
  else for (let i = 0; i < 16; i++) salt[i] = Math.random() * 256;
  const iter = hasSubtle ? 150000 : 20000;
  return 'pbkdf2$' + iter + '$' + b64(salt) + '$' + b64(await kdf(pw, salt, iter));
}
export async function pwCheck(pw, rec) {
  if (typeof rec !== 'string' || !pw) return false;
  if (rec.startsWith('pbkdf2$')) {
    try {
      const p = rec.split('$'),
        iter = +p[1];
      if (!(iter >= 1000 && iter <= 1e6)) return false;
      return b64(await kdf(pw, unb64(p[2]), iter)) === p[3];
    } catch (e) {
      return false;
    }
  }
  return rec === hash(pw);
}
export const WEAK_PW = [
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  '11111111',
  '00000000',
  'qwertyui',
  'qwerty123',
  'abcd1234',
  'iloveyou',
];
export function pwPolicy(pw, admin) {
  const min = admin ? 10 : 8;
  if (pw.length < min) return 'รหัสผ่านต้องยาวอย่างน้อย ' + min + ' ตัวอักษร';
  if (admin && !(/[A-Za-z\u0E00-\u0E7F]/.test(pw) && /\d/.test(pw))) return 'รหัสผ่านผู้ดูแลต้องมีทั้งตัวอักษรและตัวเลข';
  if (/^(.)\1+$/.test(pw) || WEAK_PW.includes(pw.toLowerCase())) return 'รหัสผ่านนี้เดาง่ายเกินไป ลองใช้รหัสอื่น';
  return '';
}
