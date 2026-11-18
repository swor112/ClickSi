import tapUrl from '../assets/sounds/zen-tap.mp3';
import { store } from '../lib/store.js';
import { $, closeSheet, esc, openSheet, toast } from './dom.js';
import { keepRender } from './navigation.js';

/* ---------- sound effects ----------
   One sound for every action: the "select" tap from the Zen set of UI SFX (uisfx.com), public domain (CC0).
   It is a small file (assets/sounds), fetched and decoded the first time it is needed, and played with Web Audio.
   It plays only from a tap, which is what phones require before a page may make sound.
   On/off belongs to the device (kept in this browser), on by default. */
export let actx = null,
  sfxBuf = null;
export const soundOn = () => store.get('cs_sound', true) !== 'off' && store.get('cs_sound', true) !== false;
export function sfx() {
  if (!soundOn()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
    if (!sfxBuf)
      sfxBuf = fetch(tapUrl)
        .then((r) => r.arrayBuffer())
        .then((bin) => new Promise((ok, no) => actx.decodeAudioData(bin, ok, no)))
        .catch(() => null);
    sfxBuf.then((buf) => {
      if (!buf) return;
      const src = actx.createBufferSource(),
        g = actx.createGain();
      src.buffer = buf;
      g.gain.value = 0.85;
      src.connect(g);
      g.connect(actx.destination);
      src.start();
    });
  } catch (e) {}
}
export function toggleSound() {
  store.set('cs_sound', soundOn() ? 'off' : 'on');
  keepRender();
  sfx();
}
export function confirmSheet(title, body, okLabel, fn) {
  openSheet(
    `<h2>${esc(title)}</h2><p class="hint top8">${esc(body)}</p><div class="two top16"><button type="button" class="btn plain" onclick="closeSheet()">ไม่ใช่ตอนนี้</button><button type="button" class="btn" id="okBtn">${esc(okLabel)}</button></div>`,
  );
  $('#okBtn').onclick = () => {
    closeSheet();
    fn();
  };
}
export function copyText(t) {
  const ok = () => toast('คัดลอก ' + t + ' แล้ว');
  const fb = () => {
    const a = document.createElement('textarea');
    a.value = t;
    a.setAttribute('readonly', '');
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.select();
    try {
      document.execCommand('copy') ? ok() : toast('คัดลอกไม่สำเร็จ กดค้างที่ตัวเลขเพื่อคัดลอกเอง');
    } catch (e) {
      toast('คัดลอกไม่สำเร็จ กดค้างที่ตัวเลขเพื่อคัดลอกเอง');
    }
    a.remove();
  };
  try {
    navigator.clipboard.writeText(t).then(ok, fb);
  } catch (e) {
    fb();
  }
}
