import { toast } from '../ui/dom.js';

/* ---------- storage: localStorage with an in-memory fallback ---------- */
/* localStorage is the single source of truth, so a change made in another tab is seen here too.
   The in-memory copy is used only for keys that could not be written (storage blocked or full). */
export const mem = {};
export let quotaWarned = false;
export const store = {
  get(k, d) {
    if (k in mem) return mem[k];
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      delete mem[k];
      return true;
    } catch (e) {
      mem[k] = v;
      if (e && /quota/i.test(String(e.name) + String(e.message)) && !quotaWarned) {
        quotaWarned = true;
        setTimeout(() => toast('พื้นที่เก็บข้อมูลในเครื่องเต็ม รูปที่เพิ่มล่าสุดอาจไม่ถูกบันทึกถาวร'), 60);
      }
      return false;
    }
  },
  del(k) {
    delete mem[k];
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
};
export const hash = (s) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 'h' + h;
}; /* only to recognise records from earlier versions */
