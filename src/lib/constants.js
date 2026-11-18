/* ---------- constants ---------- */
export const HUES = ['green', 'blue', 'violet', 'rose', 'amber', 'clay', 'teal', 'slate'];
export const HUE_NAME = {
  green: 'เขียว',
  blue: 'น้ำเงิน',
  violet: 'ม่วง',
  rose: 'ชมพู',
  amber: 'เหลืองทอง',
  clay: 'ส้มอิฐ',
  teal: 'เขียวน้ำทะเล',
  slate: 'เทา',
};
export const ITEM_ICONS = [
  'car',
  'bike',
  'house',
  'key',
  'wifi',
  'zap',
  'droplet',
  'smartphone',
  'card',
  'bank',
  'receipt',
  'shield',
  'health',
  'idcard',
  'school',
  'film',
  'music',
  'game',
  'cloud',
  'gym',
  'pet',
  'plane',
  'box',
  'star',
];
export const OLD_COLOR = {
  '#BFE8D6': 'green',
  '#FFD6C2': 'clay',
  '#DCD3FF': 'violet',
  '#CDE7FF': 'blue',
  '#FFF0B3': 'amber',
  '#FFD3E2': 'rose',
  '#D7EBC4': 'teal',
  '#F5E1C8': 'slate',
};
export const OLD_EMOJI = {};
export const REP = { none: 'ครั้งเดียว', monthly: 'ทุกเดือน', yearly: 'ทุกปี' };
export const PAY = {
  none: { l: 'ไม่บันทึก', i: 'none' },
  qr: { l: 'QR Code', i: 'qr' },
  bank: { l: 'เลขบัญชี', i: 'bank' },
  promptpay: { l: 'พร้อมเพย์', i: 'phone' },
};
export const DEF_CATS = ['ผ่อน', 'บิล', 'ต่ออายุ', 'สมาชิก', 'อื่นๆ'];
export const DEF_TEMPLATES = [
  { n: 'งวดรถ', i: 'car', h: 'blue', r: 'monthly', c: 'ผ่อน' },
  { n: 'งวดบ้าน', i: 'house', h: 'clay', r: 'monthly', c: 'ผ่อน' },
  { n: 'บัตรเครดิต', i: 'card', h: 'slate', r: 'monthly', c: 'ผ่อน' },
  { n: 'ค่าเช่า', i: 'key', h: 'teal', r: 'monthly', c: 'บิล' },
  { n: 'ค่าเน็ต', i: 'wifi', h: 'violet', r: 'monthly', c: 'บิล' },
  { n: 'ค่าไฟ', i: 'zap', h: 'amber', r: 'monthly', c: 'บิล' },
  { n: 'ค่าน้ำ', i: 'droplet', h: 'blue', r: 'monthly', c: 'บิล' },
  { n: 'ค่าโทรศัพท์', i: 'smartphone', h: 'rose', r: 'monthly', c: 'บิล' },
  { n: 'ภาษีรถ', i: 'receipt', h: 'green', r: 'yearly', c: 'ต่ออายุ' },
  { n: 'พ.ร.บ.', i: 'shield', h: 'teal', r: 'yearly', c: 'ต่ออายุ' },
  { n: 'ประกัน', i: 'health', h: 'clay', r: 'yearly', c: 'ต่ออายุ' },
  { n: 'สตรีมมิ่ง', i: 'film', h: 'violet', r: 'monthly', c: 'สมาชิก' },
];
export const DEF_BANKS = [
  'กสิกรไทย',
  'ไทยพาณิชย์',
  'กรุงเทพ',
  'กรุงไทย',
  'กรุงศรีอยุธยา',
  'ทหารไทยธนชาต (ttb)',
  'ออมสิน',
  'ธ.ก.ส.',
  'อาคารสงเคราะห์',
  'ยูโอบี',
  'ซีไอเอ็มบี ไทย',
  'เกียรตินาคินภัทร',
  'แลนด์ แอนด์ เฮ้าส์',
];
export const TH_M = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];
export const TH_MF = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];
export const TH_WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const TH_WDF = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const TABS = ['home', 'items', 'cal', 'notif', 'me'];
