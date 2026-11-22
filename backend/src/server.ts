import 'dotenv/config';
import cors from 'cors';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { runMigrations } from './migrations';
import { authorize, issueSession, revokeSession, revokeSessions } from './auth';
import { isOtpProviderConfigured, sendPasswordResetOtp, verifyPasswordResetOtp } from './sms';

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

type PasswordResetChallenge = { username: string; requestId: string; expiresAt: number; attempts: number };
const passwordResetChallenges = new Map<string, PasswordResetChallenge>();
const passwordResetCooldowns = new Map<string, number>();

type Resource = 'readers' | 'employees' | 'bookTitles' | 'bookCopies' | 'loans' | 'renewals' | 'importReceipts' | 'purchaseRequests' | 'fines' | 'categories' | 'accounts' | 'wishlist' | 'waitingList' | 'suppliers' | 'publishers' | 'logs' | 'suggestions';
type Row = Record<string, unknown>;

const value = (row: Row, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return null;
};
const str = (input: unknown) => input === null || input === undefined ? null : String(input);
type Field = [string, string[], ((input: unknown) => unknown)?];
const hasField = (body: Row, keys: string[]) => keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
async function updateProvided(client: { query: typeof pool.query }, table: string, key: string, id: string, body: Row, fields: Field[]) {
  const assignments: string[] = [], params: unknown[] = [];
  for (const [column, aliases, convert] of fields) {
    const alias = aliases.find(name => Object.prototype.hasOwnProperty.call(body, name));
    if (!alias) continue;
    params.push(convert ? convert(body[alias]) : body[alias]);
    assignments.push(`${column}=$${params.length}`);
  }
  if (assignments.length) await client.query(`UPDATE ${table} SET ${assignments.join(',')} WHERE ${key}=$${params.length + 1}`, [...params, id]);
}
function supplierValidation(body: Row, create: boolean): string | null {
  if ((create || hasField(body, ['name','tenNhaCungCap'])) && !str(value(body,'name','tenNhaCungCap'))?.trim()) return 'Tên nhà cung cấp là bắt buộc.';
  const email = str(value(body,'email'))?.trim(), phone = str(value(body,'phone','soDienThoai'))?.trim();
  if (email && !isValidEmail(email)) return 'Email nhà cung cấp không hợp lệ.';
  if (phone && !isValidPhone(phone)) return 'Số điện thoại nhà cung cấp phải gồm 10 hoặc 11 chữ số.';
  if (hasField(body,['status','trangThai']) && !['HOẠT ĐỘNG','NGỪNG GD'].includes(String(value(body,'status','trangThai')))) return 'Trạng thái nhà cung cấp không hợp lệ.';
  return null;
}
async function syncBookCounts(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }> }, bookId: unknown) {
  await client.query('SELECT madausach FROM dausach WHERE madausach=$1 FOR UPDATE', [bookId]);
  await client.query(`UPDATE dausach SET soluongtong=(SELECT COUNT(*) FROM cuonsach WHERE madausach=$1),
    soluongsan=(SELECT COUNT(*) FROM cuonsach c WHERE c.madausach=$1 AND UPPER(COALESCE(c.trangthai,'')) IN ('SẴN SÀNG','SAN SANG','CÓ SẴN')
      AND NOT EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%')))
    WHERE madausach=$1`, [bookId]);
}
const date = (input: unknown) => {
  if (input instanceof Date) return `${String(input.getUTCDate()).padStart(2, '0')} / ${String(input.getUTCMonth() + 1).padStart(2, '0')} / ${input.getUTCFullYear()}`;
  const raw = str(input)?.trim();
  const iso = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]} / ${iso[2]} / ${iso[1]}` : raw;
};
const dateValue = (input: unknown) => {
  const raw = str(input)?.trim();
  if (!raw) return null;
  const local = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : raw;
};
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 210_000, 32, 'sha256').toString('hex');
  return `pbkdf2-sha256$210000$${salt}$${hash}`;
}
function verifyPassword(password: string, encoded: string): { valid: boolean; needsUpgrade: boolean } {
  const parts = encoded.split('$');
  if (parts.length === 4 && parts[0] === 'pbkdf2-sha256') {
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(parts[3], 'hex');
    const actual = pbkdf2Sync(password, parts[2], iterations, expected.length, 'sha256');
    return { valid: expected.length === actual.length && timingSafeEqual(expected, actual), needsUpgrade: false };
  }
  // Upgrade legacy plaintext values on successful login.
  const expected = Buffer.from(encoded);
  const actual = Buffer.from(password);
  return { valid: expected.length === actual.length && timingSafeEqual(expected, actual), needsUpgrade: true };
}
function normalizeStatus(status: unknown): string {
  return String(status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim();
}
function isBlockedAccountStatus(status: unknown): boolean {
  const normalized = normalizeStatus(status);
  if (!normalized || ['bi khoa', 'khoa', 'locked', 'het han', 'expired', 'disabled', 'inactive', 'deleted', 'rejected', 'pending', 'cho duyet', 'ho so', 'profile']
    .some(flag => normalized.includes(flag))) return true;
  return !['active', 'hop le', 'hoat dong', 'valid']
    .some(value => normalized === value || normalized.startsWith(`${value} `));
}
function cleanPhoneDigits(input: unknown): string {
  return String(input ?? '').replace(/[\s.-]/g, '').trim();
}
function isValidPhone(input: unknown): boolean {
  const digits = cleanPhoneDigits(input);
  return /^\d{10,11}$/.test(digits);
}
function isValidEmail(input: unknown): boolean {
  const email = String(input ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidCccd(input: unknown): boolean {
  const cccd = String(input ?? '').trim();
  return /^\d{9}$|^\d{12}$/.test(cccd);
}
function isValidCalendarDate(input: unknown): boolean {
  const iso = dateValue(input);
  if (!iso) return false;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
async function resolveCategoryId(input: unknown): Promise<string | null> {
  const category = str(input)?.trim();
  if (!category) return null;
  const existing = await pool.query('SELECT madanhmuc FROM danhmuc WHERE madanhmuc=$1 OR LOWER(tendanhmuc)=LOWER($1) LIMIT 1', [category]);
  if (existing.rows[0]) return String(existing.rows[0].madanhmuc);
  const id = `CAT${createHash('sha1').update(category.toLocaleLowerCase('vi')).digest('hex').slice(0, 12).toUpperCase()}`;
  await pool.query('INSERT INTO danhmuc (madanhmuc,tendanhmuc) VALUES ($1,$2) ON CONFLICT (madanhmuc) DO NOTHING', [id, category]);
  return id;
}
async function generateNextCode(
  queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[] }> },
  table: string,
  column: string,
  prefix: string,
  pad = 3
): Promise<string> {
  const res = await queryable.query(
    `SELECT COALESCE(MAX(substring(${column} FROM $1)::int), 0) AS max_seq FROM ${table} WHERE ${column} ~ $2`,
    [`^${prefix}([0-9]+)$`, `^${prefix}[0-9]+$`]
  );
  let nextNum = Number(res.rows[0]?.max_seq ?? 0) + 1;
  let candidate = `${prefix}${String(nextNum).padStart(pad, '0')}`;
  while (true) {
    const dup = await queryable.query(`SELECT 1 FROM ${table} WHERE ${column}=$1 LIMIT 1`, [candidate]);
    if (!dup.rows.length) return candidate;
    nextNum += 1;
    candidate = `${prefix}${String(nextNum).padStart(pad, '0')}`;
  }
}
async function readerHasUnpaidFines(
  queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }> },
  readerId: string
): Promise<boolean> {
  const res = await queryable.query(
    "SELECT COALESCE(b.tongnophat, 0) AS debt, EXISTS(SELECT 1 FROM phieuphat fp WHERE fp.mabandoc=$1 AND UPPER(COALESCE(fp.trangthaithanhtoan,'')) NOT LIKE '%ĐÃ THANH TOÁN%' AND UPPER(COALESCE(fp.trangthaithanhtoan,'')) NOT LIKE '%DA_THANH_TOAN%') AS has_unpaid FROM bandoc b WHERE b.mabandoc=$1",
    [readerId]
  );
  return Number(res.rows[0]?.debt ?? 0) > 0 || Boolean(res.rows[0]?.has_unpaid);
}
async function releaseHeldCopyOrPromoteNextWaiter(
  queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }> },
  bookId: string
): Promise<void> {
  const heldCopy = await queryable.query(
    "SELECT macuonsach FROM cuonsach WHERE madausach=$1 AND trangthai='GIỮ CHỜ NGƯỜI CHỜ' LIMIT 1 FOR UPDATE",
    [bookId]
  );
  if (!heldCopy.rowCount) return;
  const nextWaiter = await queryable.query(
    "SELECT mabandoc FROM danhsachcho WHERE madausach=$1 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO') ORDER BY thutu ASC, ngaydangky ASC LIMIT 1",
    [bookId]
  );
  if (nextWaiter.rowCount) {
    await queryable.query("UPDATE danhsachcho SET trangthai='SAN SANG' WHERE mabandoc=$1 AND madausach=$2", [nextWaiter.rows[0].mabandoc, bookId]);
  } else {
    await queryable.query("UPDATE cuonsach SET trangthai='SẴN SÀNG' WHERE macuonsach=$1", [heldCopy.rows[0].macuonsach]);
    await syncBookCounts(queryable, bookId);
  }
}
const routes: Record<Resource, { select: string; from: string; map: (row: Row) => Row; id: string }> = {
  readers: { id: 'mabandoc', from: 'bandoc b JOIN nguoidung u ON u.manguoidung = b.mabandoc JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'b.mabandoc, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, b.loaibandoc, b.tongnophat, b.ngaycapthe, b.ngayhetthe, a.vaitro, a.trangthai', map: r => ({ id: str(r.mabandoc), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), readerType: str(r.loaibandoc), outstandingFine: Number(r.tongnophat ?? 0), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), issueDate: date(r.ngaycapthe), expiryDate: date(r.ngayhetthe), avatarUrl: str(r.anhdaidien) ?? '' }) },
  employees: { id: 'manhanvien', from: 'nhanvien n JOIN nguoidung u ON u.manguoidung = n.manhanvien JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'n.manhanvien, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, n.chucvu, n.trangthailamviec, a.vaitro, a.trangthai', map: r => ({ id: str(r.manhanvien), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), position: str(r.chucvu), employmentStatus: str(r.trangthailamviec), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), avatarUrl: str(r.anhdaidien) ?? '', password: null, hasAccount: !['profile', 'ho so'].includes(normalizeStatus(r.trangthai)) }) },
  bookTitles: { id: 'madausach', from: 'dausach d JOIN danhmuc c ON c.madanhmuc = d.madanhmuc', select: 'd.madausach, d.madanhmuc, c.tendanhmuc, d.tensach, d.tacgia, d.theloai, d.chude, d.khoa, (SELECT COUNT(*) FROM cuonsach cx WHERE cx.madausach=d.madausach) AS soluongtong, (SELECT COUNT(*) FROM cuonsach cx WHERE cx.madausach=d.madausach AND UPPER(COALESCE(cx.trangthai,\'\')) IN (\'SẴN SÀNG\',\'SAN SANG\',\'CÓ SẴN\') AND NOT EXISTS (SELECT 1 FROM phieumuon px WHERE px.macuonsach=cx.macuonsach AND (LOWER(COALESCE(px.trangthai,\'\')) LIKE \'%đang mượn%\' OR LOWER(COALESCE(px.trangthai,\'\')) LIKE \'%quá hạn%\'))) AS soluongsan, d.nhaxuatban, d.namxuatban, d.anhbia', map: r => ({ id: str(r.madausach), categoryId: str(r.madanhmuc), category: str(r.tendanhmuc), title: str(r.tensach), authors: str(r.tacgia), author: str(r.tacgia), genre: str(r.theloai), subject: str(r.chude), faculty: str(r.khoa), total: Number(r.soluongtong ?? 0), available: Number(r.soluongsan ?? 0), totalCopies: Number(r.soluongtong ?? 0), availableCopies: Number(r.soluongsan ?? 0), publisher: str(r.nhaxuatban), publishYear: r.namxuatban ? Number(r.namxuatban) : null, namXuatBan: r.namxuatban ? Number(r.namxuatban) : null, coverUrl: str(r.anhbia) ?? '' }) },
  bookCopies: { id: 'macuonsach', from: 'cuonsach c JOIN dausach d ON d.madausach = c.madausach', select: 'c.macuonsach, c.madausach, c.mavach, c.tinhtrangvatly, c.trangthai, c.vitriluutru, c.gia, c.anhbia, EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach AND (LOWER(COALESCE(p.trangthai,\'\')) LIKE \'%đang mượn%\' OR LOWER(COALESCE(p.trangthai,\'\')) LIKE \'%quá hạn%\')) AS activeloan, d.tensach', map: r => ({ id: str(r.macuonsach), bookId: str(r.madausach), bookTitleId: str(r.madausach), bookTitle: str(r.tensach), barcode: str(r.mavach), physicalStatus: str(r.tinhtrangvatly), physicalCondition: str(r.tinhtrangvatly), circulationStatus: r.activeloan ? 'ĐANG MƯỢN' : str(r.trangthai), status: r.activeloan ? 'ĐANG MƯỢN' : str(r.trangthai), location: str(r.vitriluutru), price: r.gia === null ? null : Number(r.gia), coverUrl: str(r.anhbia) ?? '' }) },
  loans: { id: 'maphieumuon', from: 'phieumuon p LEFT JOIN nguoidung u ON u.manguoidung = p.mabandoc JOIN cuonsach c ON c.macuonsach = p.macuonsach JOIN dausach d ON d.madausach = c.madausach', select: 'p.maphieumuon, p.mabandoc, u.hoten, p.manhanvien, p.macuonsach, d.tensach, p.ngaymuon, p.ngayhentra, p.ngaytrathucte, p.trangthai', map: r => ({ id: str(r.maphieumuon), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), readerName: str(r.hoten), employeeId: str(r.manhanvien), copyId: str(r.macuonsach), bookTitle: str(r.tensach), borrowDate: date(r.ngaymuon), dueDate: date(r.ngayhentra), returnDate: date(r.ngaytrathucte), status: str(r.trangthai) }) },
  renewals: { id: 'magiahan', from: 'yeucaugiahan', select: '*', map: r => ({ id: str(r.magiahan), loanId: str(r.maphieumuon), requestDate: date(r.ngayyeucau), days: Number(r.songaygiahan), status: str(r.trangthaiduyet) }) },
  importReceipts: { id: 'maphieunhap', from: 'phieunhap p LEFT JOIN chitietphieunhap ci ON ci.maphieunhap=p.maphieunhap LEFT JOIN dausach d ON d.madausach=ci.madausach', select: 'p.maphieunhap,p.manhanvien,p.ngaynhap,p.trangthai,p.nhacungcap,p.nguoitao,COALESCE(SUM(ci.soluongnhap),p.tongsoluong,0) AS tongsoluong,COALESCE(SUM(ci.soluongnhap*ci.dongia),0) AS tongtien,COALESCE(jsonb_agg(jsonb_build_object(\'bookId\',ci.madausach,\'bookTitle\',d.tensach,\'qty\',ci.soluongnhap,\'unitPrice\',ci.dongia,\'subtotal\',ci.soluongnhap*ci.dongia)) FILTER (WHERE ci.madausach IS NOT NULL),\'[]\'::jsonb) AS items', map: r => ({ id: str(r.maphieunhap), employeeId: str(r.manhanvien), date: date(r.ngaynhap), supplier: str(r.nhacungcap) ?? '', creator: str(r.nguoitao) ?? '', totalBooks: `${Number(r.tongsoluong ?? 0)} cuốn`, totalQuantity: Number(r.tongsoluong ?? 0), totalAmount: `${Number(r.tongtien ?? 0).toLocaleString('vi-VN')} ₫`, status: str(r.trangthai), items: Array.isArray(r.items) ? r.items.map((item: Row) => ({ ...item, unitPrice: `${Number(item.unitPrice ?? 0).toLocaleString('vi-VN')} ₫`, subtotal: `${Number(item.subtotal ?? 0).toLocaleString('vi-VN')} ₫` })) : [] }) },
  purchaseRequests: { id: 'madexuat', from: 'phieudexuat', select: '*', map: r => ({ id: str(r.madexuat), employeeId: str(r.manhanvien), bookInfo: str(r.thongtinsach), date: date(r.ngaydexuat), status: str(r.trangthaiduyet), rejectionReason: str(r.lydotuchoi) }) },
  fines: { id: 'maphieuphat', from: 'phieuphat fp LEFT JOIN phieumuon p ON p.maphieumuon = fp.maphieumuon LEFT JOIN cuonsach c ON c.macuonsach = p.macuonsach LEFT JOIN dausach d ON d.madausach = c.madausach', select: 'fp.maphieuphat, fp.maphieumuon, fp.mabandoc, fp.manhanvien, fp.ngaylap, fp.loaivipham, fp.sotien, fp.trangthaithanhtoan, d.tensach', map: r => ({ id: str(r.maphieuphat), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), employeeId: str(r.manhanvien), createdDate: date(r.ngaylap), date: date(r.ngaylap), ngayLap: date(r.ngaylap), violation: str(r.loaivipham), amount: Number(r.sotien ?? 0), paymentStatus: str(r.trangthaithanhtoan), bookTitle: str(r.tensach) }) },
  categories: { id: 'madanhmuc', from: 'danhmuc', select: '*', map: r => ({ id: str(r.madanhmuc), name: str(r.tendanhmuc) }) },
  accounts: { id: 'tendangnhap', from: 'taikhoan', select: 'tendangnhap, vaitro, trangthai', map: r => ({ id: str(r.tendangnhap), username: str(r.tendangnhap), role: str(r.vaitro), status: str(r.trangthai) }) },
  suppliers: { id: 'manhacungcap', from: 'nhacungcap', select: '*', map: r => ({ id: str(r.manhacungcap), name: str(r.tennhacungcap), contact: str(r.nguoilienhe), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), status: str(r.trangthai) }) },
  publishers: { id: 'manhaxuatban', from: 'nhaxuatban', select: '*', map: r => ({ id: str(r.manhaxuatban), name: str(r.tennhaxuatban), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), note: str(r.ghichu), status: str(r.trangthai) }) },
  logs: { id: 'manhatky', from: 'ixs_nhatky', select: "manhatky, TO_CHAR(thoigian,'DD / MM / YYYY') AS ngay, TO_CHAR(thoigian,'HH24:MI:SS') AS gio, nguoidung, manguoidung, hanhdong, doituong, chitiet", map: r => ({ id: String(r.manhatky), date: str(r.ngay), time: str(r.gio), user: str(r.nguoidung), userId: str(r.manguoidung), action: str(r.hanhdong), target: str(r.doituong), detail: str(r.chitiet) }) },
  wishlist: { id: 'madausach', from: 'tusachcanhan', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), addedAt: date(r.ngaythem), note: str(r.ghichu) ?? '', status: str(r.trangthaidoc) ?? 'Chưa đọc', currentPage: Number(r.sotranghientai ?? 0), totalPages: Number(r.sotrangtong ?? 0) }) },
  waitingList: { id: 'madausach', from: 'danhsachcho', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), registeredAt: date(r.ngaydangky), position: Number(r.thutu ?? 0), status: str(r.trangthai) }) },
  suggestions: { id: 'id', from: 'ixs_reader_book_suggestions', select: '*', map: r => ({ id: str(r.id), readerId: str(r.reader_id), title: str(r.title), author: str(r.author), publisher: str(r.publisher) ?? '', year: r.publication_year ? String(r.publication_year) : '', quantity: r.requested_quantity ? `${r.requested_quantity} bản` : '—', requestedQuantity: Number(r.requested_quantity ?? 0), edition: str(r.edition) ?? '', isbn: str(r.isbn) ?? '', reason: str(r.reason) ?? '', rejectionReason: str(r.rejection_reason) ?? '', coverUrl: str(r.cover_url) ?? '', status: str(r.status) ?? 'Chờ duyệt', submittedAt: date(r.submitted_at), type: 'Sách / giáo trình' }) }
};

const resourceNames = Object.keys(routes) as Resource[];
function isResource(value: string): value is Resource { return resourceNames.includes(value as Resource); }

app.use('/api', authorize);
app.get('/api/auth/me', (req, res) => res.json({ user: req.auth }));
app.post('/api/auth/logout', (req, res) => {
  revokeSession(req.headers.authorization?.replace(/^Bearer\s+/i, '') || '');
  res.status(204).end();
});

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (error) { next(error); }
});

app.post('/api/bookTitles/:id/reserve', async (req, res, next) => {
  const bookId = req.params.id;
  const body = req.body as Row;
  const requestId = str(value(body, 'requestId'))?.trim();
  const readerId = str(value(body, 'readerId'))?.trim();
  const preferredCopyId = str(value(body, 'copyId'))?.trim();
  if (!requestId || !readerId) return res.status(400).json({ error: 'Mã yêu cầu và mã bạn đọc là bắt buộc.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const readerResult = await client.query(
      `SELECT b.mabandoc, b.ngayhetthe, a.trangthai
       FROM bandoc b
       JOIN nguoidung u ON u.manguoidung = b.mabandoc
       JOIN taikhoan a ON a.tendangnhap = u.tendangnhap
       WHERE b.mabandoc = $1
       LIMIT 1`,
      [readerId]
    );
    if (!readerResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ bạn đọc trong hệ thống.' });
    }
    const readerRow = readerResult.rows[0];
    const resolvedReaderId = String(readerRow.mabandoc);
    const readerStatus = normalizeStatus(readerRow.trangthai);
    if (isBlockedAccountStatus(readerStatus)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Thẻ bạn đọc đang bị khóa hoặc hết hạn, không thể đăng ký mượn sách.' });
    }
    if (readerRow.ngayhetthe && new Date(readerRow.ngayhetthe) < new Date(new Date().toISOString().slice(0, 10))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Thẻ bạn đọc đã hết hạn sử dụng. Vui lòng gia hạn thẻ tại quầy thư viện.' });
    }

    const activeBookLoan = await client.query(
      `SELECT p.maphieumuon
       FROM phieumuon p
       JOIN cuonsach c ON c.macuonsach = p.macuonsach
       WHERE p.mabandoc = $1 AND c.madausach = $2
         AND LOWER(COALESCE(p.trangthai, '')) LIKE '%đang mượn%'
       LIMIT 1`,
      [resolvedReaderId, bookId]
    );
    if (activeBookLoan.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Bạn đang mượn một bản sao của đầu sách này rồi.' });
    }

    const rulesResult = await client.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules' LIMIT 1");
    const maxBorrowBooks = Number(rulesResult.rows[0]?.giatri?.maxBorrowBooks ?? 5);
    if (Number.isFinite(maxBorrowBooks) && maxBorrowBooks > 0) {
      const activeLoansCount = await client.query(
        "SELECT COUNT(*)::int AS cnt FROM phieumuon WHERE mabandoc=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%')",
        [resolvedReaderId]
      );
      if (Number(activeLoansCount.rows[0]?.cnt ?? 0) >= maxBorrowBooks) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Bạn đã đạt giới hạn mượn tối đa ${maxBorrowBooks} cuốn sách cùng lúc.` });
      }
    }

    const bookResult = await client.query(
      'SELECT soluongtong, soluongsan FROM dausach WHERE madausach=$1 FOR UPDATE',
      [bookId]
    );
    if (!bookResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy đầu sách yêu cầu.' });
    }
    const copyResult = preferredCopyId
      ? await client.query(
          "SELECT macuonsach FROM cuonsach c WHERE madausach=$1 AND macuonsach=$2 AND trangthai='SẴN SÀNG' AND NOT EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%')) LIMIT 1",
          [bookId, preferredCopyId]
        )
      : await client.query(
          "SELECT macuonsach FROM cuonsach c WHERE madausach=$1 AND trangthai='SẴN SÀNG' AND NOT EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%')) ORDER BY macuonsach LIMIT 1",
          [bookId]
        );
    if (!copyResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: preferredCopyId ? `Cuốn sách ${preferredCopyId} hiện không còn sẵn sàng để mượn.` : 'Hiện không có bản sao vật lý nào sẵn sàng.' });
    }

    if (await readerHasUnpaidFines(client, resolvedReaderId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Bạn đọc đang còn khoản phạt chưa thanh toán. Vui lòng hoàn tất thanh toán trước khi đăng ký mượn.' });
    }

    const dupRequest = await client.query(
      "SELECT madangky FROM ixs_borrow_requests WHERE mabandoc=$1 AND madausach=$2 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYỆT') LIMIT 1",
      [resolvedReaderId, bookId]
    );
    if (dupRequest.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Bạn đã gửi yêu cầu mượn đầu sách này và đang chờ thủ thư duyệt.' });
    }

    // Theo Seq 2.8.1: Bạn đọc chỉ ghi nhận yêu cầu mượn ('CHO DUYET'), KHÔNG tự ý chuyển sách sang ĐANG MƯỢN hay lập PHIEUMUON khi chưa qua Thủ thư
    const copyId = String(copyResult.rows[0].macuonsach);
    await client.query(
      'INSERT INTO ixs_borrow_requests (madangky,mabandoc,madausach,macuonsach,trangthai) VALUES ($1,$2,$3,$4,$5)',
      [requestId, resolvedReaderId, bookId, copyId, 'CHO DUYET']
    );
    await client.query('COMMIT');
    return res.status(201).json({
      id: requestId,
      readerId: resolvedReaderId,
      bookId,
      copyId,
      status: 'CHO DUYET',
      total: Number(bookResult.rows[0].soluongtong ?? 0),
      available: Number(bookResult.rows[0].soluongsan ?? 0)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

// Seq 2.8.1 Phần 2: Thủ thư tiếp nhận danh sách yêu cầu mượn sách, kiểm tra điều kiện và lập phiếu mượn
app.get('/api/borrowRequests', async (req, res, next) => {
  try {
    const readerId = req.query.readerId ? String(req.query.readerId) : null;
    const result = await pool.query(
      `SELECT r.madangky, r.mabandoc, u.hoten AS reader_name, b.tongnophat, a.trangthai AS account_status,
              b.ngayhetthe, r.madausach, d.tensach AS book_title, d.soluongsan, r.macuonsach,
              r.ngaydangky, r.trangthai,
              (SELECT COUNT(*)::int FROM phieumuon pm WHERE pm.mabandoc=r.mabandoc AND (LOWER(COALESCE(pm.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(pm.trangthai,'')) LIKE '%quá hạn%')) AS active_loans
       FROM ixs_borrow_requests r
       JOIN bandoc b ON b.mabandoc = r.mabandoc
       JOIN nguoidung u ON u.manguoidung = b.mabandoc
       JOIN taikhoan a ON a.tendangnhap = u.tendangnhap
       JOIN dausach d ON d.madausach = r.madausach
       ${readerId ? 'WHERE r.mabandoc=$1' : ''}
       ORDER BY r.ngaydangky DESC`,
      readerId ? [readerId] : []
    );
    res.json(result.rows.map(r => ({
      id: str(r.madangky),
      requestId: str(r.madangky),
      readerId: str(r.mabandoc),
      readerName: str(r.reader_name) ?? '',
      outstandingFine: Number(r.tongnophat ?? 0),
      readerStatus: str(r.account_status) ?? 'ACTIVE',
      expiryDate: date(r.ngayhetthe),
      activeLoans: Number(r.active_loans ?? 0),
      bookId: str(r.madausach),
      bookTitle: str(r.book_title) ?? '',
      bookAvailable: Number(r.soluongsan ?? 0),
      copyId: str(r.macuonsach),
      requestDate: date(r.ngaydangky),
      status: str(r.trangthai) ?? 'CHO DUYET'
    })));
  } catch (error) { next(error); }
});

app.post('/api/borrowRequests/:id/approve', async (req, res, next) => {
  const requestId = req.params.id;
  const body = req.body as Row;
  const employeeId = str(value(body, 'employeeId', 'maNhanVien'))?.trim() || '12026001';
  const requestedCopyId = str(value(body, 'copyId', 'maCuonSach'))?.trim();
  const providedLoanId = str(value(body, 'loanId', 'maPhieuMuon'))?.trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loanId = providedLoanId && /^PM\d{3,}$/.test(providedLoanId)
      ? providedLoanId
      : await generateNextCode(client, 'phieumuon', 'maphieumuon', 'PM', 3);
    const reqRes = await client.query(
      'SELECT * FROM ixs_borrow_requests WHERE madangky=$1 FOR UPDATE',
      [requestId]
    );
    if (!reqRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu mượn sách.' });
    }
    const reqRow = reqRes.rows[0];
    if (!normalizeStatus(reqRow.trangthai).includes('cho')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Yêu cầu mượn này đã được xử lý trước đó.' });
    }
    const readerId = String(reqRow.mabandoc);
    const bookId = String(reqRow.madausach);
    const targetCopyId = requestedCopyId || String(reqRow.macuonsach);

    // Kiểm tra điều kiện mượn của bạn đọc: trạng thái thẻ, hạn thẻ, nợ phạt, hạn mức
    const readerRes = await client.query(
      'SELECT b.mabandoc, b.tongnophat, b.ngayhetthe, a.trangthai FROM bandoc b JOIN nguoidung u ON u.manguoidung=b.mabandoc JOIN taikhoan a ON a.tendangnhap=u.tendangnhap WHERE b.mabandoc=$1 FOR UPDATE',
      [readerId]
    );
    const rInfo = readerRes.rows[0];
    if (!rInfo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ bạn đọc.' });
    }
    const rSt = normalizeStatus(rInfo.trangthai);
    if (isBlockedAccountStatus(rSt)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Thẻ bạn đọc đang bị khóa hoặc hết hạn.' });
    }
    if (rInfo.ngayhetthe && new Date(rInfo.ngayhetthe) < new Date(new Date().toISOString().slice(0, 10))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Thẻ bạn đọc đã hết hạn sử dụng.' });
    }
    if (await readerHasUnpaidFines(client, readerId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Từ chối lập phiếu: bạn đọc còn khoản phạt chưa thanh toán.' });
    }

    const rulesRes = await client.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules' LIMIT 1");
    const rules = rulesRes.rows[0]?.giatri ?? {};
    const maxBorrowBooks = Number(rules.maxBorrowBooks ?? 5);
    const borrowDays = Number(rules.maxBorrowDays ?? rules.borrowDays ?? 14);
    const activeLoans = await client.query(
      "SELECT COUNT(*)::int AS cnt FROM phieumuon WHERE mabandoc=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%')",
      [readerId]
    );
    if (Number(activeLoans.rows[0]?.cnt ?? 0) >= maxBorrowBooks) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Bạn đọc đã đạt giới hạn mượn tối đa ${maxBorrowBooks} cuốn.` });
    }

    const copyRes = await client.query(
      "SELECT macuonsach, madausach FROM cuonsach c WHERE macuonsach=$1 AND madausach=$2 AND trangthai IN ('SẴN SÀNG','GIỮ CHỜ NGƯỜI CHỜ') AND NOT EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%')) FOR UPDATE SKIP LOCKED",
      [targetCopyId, bookId]
    );
    if (!copyRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Cuốn sách vật lý ${targetCopyId} không khả dụng để cho mượn.` });
    }

    const prevWasReady = String((await client.query('SELECT trangthai FROM cuonsach WHERE macuonsach=$1', [targetCopyId])).rows[0]?.trangthai) === 'SẴN SÀNG';
    await client.query("UPDATE cuonsach SET trangthai='ĐANG MƯỢN' WHERE macuonsach=$1", [targetCopyId]);
    if (prevWasReady) {
      await syncBookCounts(client, bookId);
    }
    await client.query(
      `INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, trangthai)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($5 || ' days')::interval, 'Đang mượn')`,
      [loanId, readerId, employeeId, targetCopyId, String(borrowDays)]
    );
    await client.query(
      "UPDATE ixs_borrow_requests SET macuonsach=$1, trangthai='DA DUYET' WHERE madangky=$2",
      [targetCopyId, requestId]
    );
    await client.query(
      "UPDATE danhsachcho SET trangthai='DA_NHAN' WHERE mabandoc=$1 AND madausach=$2 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH')",
      [readerId, bookId]
    );
    await client.query('COMMIT');
    return res.status(201).json({ id: loanId, loanId, requestId, readerId, copyId: targetCopyId, status: 'Đang mượn' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

app.post('/api/borrowRequests/:id/reject', async (req, res, next) => {
  try {
    const result = await pool.query(
      "UPDATE ixs_borrow_requests SET trangthai='TU CHOI' WHERE madangky=$1 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYỆT')",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Không tìm thấy yêu cầu đang chờ duyệt.' });
    return res.json({ id: req.params.id, status: 'TU CHOI' });
  } catch (error) { next(error); }
});

app.delete('/api/borrowRequests/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM ixs_borrow_requests WHERE madangky=$1 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYET')",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Chỉ có thể hủy yêu cầu mượn đang chờ duyệt.' });
    return res.status(204).end();
  } catch (error) { next(error); }
});

// Seq 2.8.2: Thủ thư xác nhận trả sách + kiểm tra tình trạng vật lý + xử lý chờ + phạt quá hạn/hư hỏng/mất
app.post('/api/loans/:id/return', async (req, res, next) => {
  const loanId = req.params.id;
  const body = req.body as Row;
  const condition = str(value(body, 'physicalCondition', 'condition')) || 'NGUYEN_VEN';
  if (!['NGUYEN_VEN','SON_GAY','HU_HONG','MAT_SACH'].includes(condition)) return res.status(400).json({ error: 'Tình trạng sách trả không hợp lệ.' });
  const employeeId = str(value(body, 'employeeId', 'maNhanVien')) || '12026001';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loanRes = await client.query(
      `SELECT p.*, c.madausach, c.gia
       FROM phieumuon p
       JOIN cuonsach c ON c.macuonsach = p.macuonsach
       WHERE p.maphieumuon=$1 FOR UPDATE`,
      [loanId]
    );
    if (!loanRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy phiếu mượn.' });
    }
    const loan = loanRes.rows[0];
    if (normalizeStatus(loan.trangthai).includes('da tra')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Phiếu mượn này đã được trả trước đó.' });
    }

    const rulesRes = await client.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules' LIMIT 1");
    const rules = rulesRes.rows[0]?.giatri ?? {};
    const lateFeePerDay = Number(rules.lateFeePerDay ?? 5000);
    const damageFee = Number(rules.damageFee ?? 30000);
    const lostPercent = Number(rules.lostCompensationPercent ?? 150);
    const maxLateDaysBeforeLock = Number(rules.maxLateDaysBeforeLock ?? 30);

    const dueDate = loan.ngayhentra ? new Date(loan.ngayhentra) : new Date();
    const today = new Date();
    const lateDays = Math.max(0, Math.floor((new Date(today.toISOString().slice(0, 10)).getTime() - new Date(dueDate.toISOString().slice(0, 10)).getTime()) / 86400000));
    const lateFee = lateDays * lateFeePerDay;
    const bookPrice = Number(loan.gia ?? 120000) || 120000;
    let condFee = 0;
    if (condition === 'HU_HONG') condFee = damageFee;
    if (condition === 'MAT_SACH') condFee = Math.round(bookPrice * lostPercent / 100);
    const totalFee = lateFee + condFee;

    await client.query("UPDATE phieumuon SET ngaytrathucte=CURRENT_TIMESTAMP, trangthai='Đã trả' WHERE maphieumuon=$1", [loanId]);

    let promotedReaderId: string | null = null;
    if (condition === 'NGUYEN_VEN' || condition === 'SON_GAY') {
      const waitRes = await client.query(
        "SELECT mabandoc FROM danhsachcho WHERE madausach=$1 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO') ORDER BY COALESCE(thutu, 999999), ngaydangky ASC LIMIT 1 FOR UPDATE",
        [loan.madausach]
      );
      if (waitRes.rowCount) {
        promotedReaderId = String(waitRes.rows[0].mabandoc);
        await client.query("UPDATE danhsachcho SET trangthai='SAN SANG' WHERE mabandoc=$1 AND madausach=$2", [promotedReaderId, loan.madausach]);
        await client.query(
          "UPDATE cuonsach SET tinhtrangvatly=$1, trangthai='GIỮ CHỜ NGƯỜI CHỜ' WHERE macuonsach=$2",
          [condition === 'SON_GAY' ? 'SỜN GÁY SÁCH' : 'TỐT', loan.macuonsach]
        );
      } else {
        await client.query(
          "UPDATE cuonsach SET tinhtrangvatly=$1, trangthai='SẴN SÀNG' WHERE macuonsach=$2",
          [condition === 'SON_GAY' ? 'SỜN GÁY SÁCH' : 'TỐT', loan.macuonsach]
        );
        await syncBookCounts(client, loan.madausach);
      }
    } else if (condition === 'HU_HONG') {
      await client.query("UPDATE cuonsach SET tinhtrangvatly='HƯ HỎNG', trangthai='HƯ HỎNG' WHERE macuonsach=$1", [loan.macuonsach]);
    } else if (condition === 'MAT_SACH') {
      await client.query("UPDATE cuonsach SET tinhtrangvatly='MẤT', trangthai='MẤT' WHERE macuonsach=$1", [loan.macuonsach]);
    }

    let createdFine: Row | null = null;
    if (totalFee > 0) {
      const reasons: string[] = [];
      if (lateDays > 0) reasons.push(`Trễ hạn ${lateDays} ngày`);
      if (condition === 'HU_HONG') reasons.push('Làm hỏng sách');
      if (condition === 'MAT_SACH') reasons.push('Làm mất sách');
      const fineId = `PP-${Date.now().toString().slice(-6)}`;
      const violationText = reasons.join(' + ');
      await client.query(
        "INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, ngaylap, loaivipham, sotien, trangthaithanhtoan) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,'Chưa thanh toán')",
        [fineId, loanId, loan.mabandoc, employeeId, violationText, totalFee]
      );
      await client.query('UPDATE bandoc SET tongnophat=COALESCE(tongnophat,0)+$1 WHERE mabandoc=$2', [totalFee, loan.mabandoc]);
      if (lateDays >= maxLateDaysBeforeLock) {
        await client.query(
          "UPDATE taikhoan a SET trangthai='LOCKED' FROM nguoidung u WHERE u.tendangnhap=a.tendangnhap AND u.manguoidung=$1",
          [loan.mabandoc]
        );
      }
      createdFine = { id: fineId, loanId, readerId: loan.mabandoc, violation: violationText, amount: totalFee, paymentStatus: 'Chưa thanh toán' };
    }

    await client.query('COMMIT');
    return res.json({ id: loanId, status: 'Đã trả', promotedReaderId, fine: createdFine });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

// Seq 2.5.3 & State 5.4: Xác nhận phiếu nhập sách mới cập nhật tồn kho và sinh cuốn sách
app.post('/api/importReceipts/:id/confirm', async (req, res, next) => {
  const receiptId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('import-receipt-codes'))");
    const recRes = await client.query('SELECT * FROM phieunhap WHERE maphieunhap=$1 FOR UPDATE', [receiptId]);
    if (!recRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho.' });
    }
    if (normalizeStatus(recRes.rows[0].trangthai).includes('da xac nhan') || normalizeStatus(recRes.rows[0].trangthai).includes('hoan thanh')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Phiếu nhập này đã được xác nhận trước đó.' });
    }
    const itemsRes = await client.query('SELECT madausach, soluongnhap, dongia FROM chitietphieunhap WHERE maphieunhap=$1', [receiptId]);
    if (!itemsRes.rowCount || itemsRes.rows.some(item => !Number.isInteger(Number(item.soluongnhap)) || Number(item.soluongnhap) < 1 || Number(item.dongia) < 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Phiếu nhập cần ít nhất một dòng có số lượng và đơn giá hợp lệ.' });
    }
    const generatedCopies: Row[] = [];
    for (const item of itemsRes.rows) {
      const bookId = String(item.madausach);
      const qty = Number(item.soluongnhap ?? 0);
      const price = Number(item.dongia ?? 0);
      const titleRes = await client.query('SELECT tensach, anhbia FROM dausach WHERE madausach=$1', [bookId]);
      const titleName = String(titleRes.rows[0]?.tensach ?? bookId);
      const coverUrl = str(titleRes.rows[0]?.anhbia) ?? '';
      for (let i = 0; i < qty; i++) {
        const copyId = await generateNextCode(client, 'cuonsach', 'macuonsach', 'CS', 3);
        await client.query(
          "INSERT INTO cuonsach (macuonsach, madausach, mavach, tinhtrangvatly, trangthai, vitriluutru, gia, anhbia) VALUES ($1,$2,$3,'TỐT','SẴN SÀNG','A1 - Ngăn 1',$4,$5) ON CONFLICT (macuonsach) DO NOTHING",
          [copyId, bookId, copyId, price, coverUrl]
        );
        generatedCopies.push({ id: copyId, bookId, bookTitle: titleName, physicalStatus: 'TỐT', circulationStatus: 'SẴN SÀNG', location: 'A1 - Ngăn 1', price });
      }
      await syncBookCounts(client, bookId);
    }
    await client.query("UPDATE phieunhap SET trangthai='ĐÃ XÁC NHẬN' WHERE maphieunhap=$1", [receiptId]);
    await client.query('COMMIT');
    return res.json({ id: receiptId, status: 'ĐÃ XÁC NHẬN', generatedCopies });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

// Seq 2.5.4: Thanh lý cuốn sách cụ thể (chặn nếu đang mượn, bảo toàn lịch sử)
app.post('/api/bookCopies/:id/liquidate', async (req, res, next) => {
  const copyId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const copyRes = await client.query('SELECT macuonsach, madausach, trangthai FROM cuonsach WHERE macuonsach=$1 FOR UPDATE', [copyId]);
    if (!copyRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy cuốn sách.' });
    }
    const copy = copyRes.rows[0];
    if ((await client.query("SELECT 1 FROM phieumuon WHERE macuonsach=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%')",[copyId])).rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cuốn sách có phiếu mượn đang hoạt động.' });
    }
    if (normalizeStatus(copy.trangthai).includes('dang muon')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Không thể thanh lý sách đang trong trạng thái mượn.' });
    }
    if (normalizeStatus(copy.trangthai).includes('thanh ly')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cuốn sách này đã được thanh lý trước đó.' });
    }
    const wasReady = normalizeStatus(copy.trangthai).includes('san sang');
    await client.query("UPDATE cuonsach SET trangthai='ĐÃ THANH LÝ' WHERE macuonsach=$1", [copyId]);
    if (wasReady) {
      await syncBookCounts(client, copy.madausach);
    }
    await client.query('COMMIT');
    return res.json({ id: copyId, status: 'ĐÃ THANH LÝ' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

app.get('/api/config/:key', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT giatri FROM ixs_cauhinh WHERE macauhinh=$1', [req.params.key]);
    res.json({ key: req.params.key, value: result.rows[0]?.giatri ?? null });
  } catch (error) { next(error); }
});

app.put('/api/config/:key', async (req, res, next) => {
  try {
    const configValue = value(req.body as Row, 'value');
    if (configValue === null) return res.status(400).json({ error: 'value is required' });
    await pool.query(
      'INSERT INTO ixs_cauhinh (macauhinh, giatri) VALUES ($1, $2::jsonb) ON CONFLICT (macauhinh) DO UPDATE SET giatri=EXCLUDED.giatri, capnhatluc=NOW()',
      [req.params.key, JSON.stringify(configValue)]
    );
    res.json({ key: req.params.key, value: configValue });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = str(req.body?.username)?.trim();
    const password = str(req.body?.password);
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const phoneDigits = username.replace(/\D/g, '');
    const result = await pool.query(
      `SELECT a.tendangnhap, a.matkhau, a.vaitro, a.trangthai,
              u.manguoidung, u.hoten, u.email, u.sodienthoai, u.cccd,
              b.mabandoc, n.manhanvien
       FROM taikhoan a
       LEFT JOIN nguoidung u ON u.tendangnhap = a.tendangnhap
       LEFT JOIN bandoc b ON b.mabandoc = u.manguoidung
       LEFT JOIN nhanvien n ON n.manhanvien = u.manguoidung
       WHERE LOWER(a.tendangnhap) = LOWER($1)
          OR LOWER(COALESCE(u.email, '')) = LOWER($1)
          OR LOWER(COALESCE(u.manguoidung, '')) = LOWER($1)
          OR ($2 <> '' AND regexp_replace(COALESCE(u.sodienthoai, ''), '[^0-9]', '', 'g') = $2)
       LIMIT 1`,
      [username, phoneDigits]
    );
    const account = result.rows[0];
    if (!account) return res.status(401).json({ error: 'Invalid username or password' });
    const passwordResult = verifyPassword(password, String(account.matkhau));
    if (!passwordResult.valid) return res.status(401).json({ error: 'Invalid username or password' });
    if (!account.mabandoc && !account.manhanvien) return res.status(403).json({ error: 'Account has no reader or employee profile' });
    const status = normalizeStatus(account.trangthai);
    if (isBlockedAccountStatus(status)) {
      return res.status(403).json({ error: 'Account is inactive or blocked' });
    }
    if (passwordResult.needsUpgrade) {
      await pool.query('UPDATE taikhoan SET matkhau=$1 WHERE tendangnhap=$2', [hashPassword(password), account.tendangnhap]);
    }
    const user = {
      id: String(account.manguoidung ?? account.tendangnhap),
      username: String(account.tendangnhap),
      fullName: String(account.hoten ?? account.tendangnhap),
      name: String(account.hoten ?? account.tendangnhap),
      role: String(account.vaitro),
      accountType: account.mabandoc ? 'reader' : account.manhanvien ? 'employee' : 'account',
      email: String(account.email ?? ''),
      phone: String(account.sodienthoai ?? ''),
      cccd: String(account.cccd ?? '')
    };
    return res.json({ user, token: issueSession(user.username), expiresIn: 43200 });
  } catch (error) { next(error); }
});

app.post('/api/auth/password/change', async (req, res, next) => {
  try {
    const username = str(req.body?.username)?.trim();
    const currentPassword = str(req.body?.currentPassword);
    const newPassword = str(req.body?.newPassword);
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ error: 'username, currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must contain at least 8 characters' });
    const result = await pool.query('SELECT matkhau,trangthai FROM taikhoan WHERE LOWER(tendangnhap)=LOWER($1)', [username]);
    const account = result.rows[0];
    if (!account || !verifyPassword(currentPassword, String(account.matkhau)).valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const status = normalizeStatus(account.trangthai);
    if (isBlockedAccountStatus(status)) return res.status(403).json({ error: 'Account is inactive or blocked' });
    await pool.query('UPDATE taikhoan SET matkhau=$1 WHERE LOWER(tendangnhap)=LOWER($2)', [hashPassword(newPassword), username]);
    revokeSessions(username, req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    return res.json({ message: 'Password updated successfully' });
  } catch (error) { next(error); }
});

app.post('/api/auth/admin-reset-password', async (req, res, next) => {
  try {
    const employeeId = str(req.body.employeeId)?.trim(), password = str(req.body.newPassword);
    if (!employeeId || !password || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Nhập nhân viên và mật khẩu mới từ 8 đến 128 ký tự.' });
    const target = await pool.query('SELECT u.tendangnhap,a.trangthai FROM nguoidung u JOIN nhanvien n ON n.manhanvien=u.manguoidung JOIN taikhoan a ON a.tendangnhap=u.tendangnhap WHERE n.manhanvien=$1', [employeeId]);
    if (!target.rowCount) return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    if (['profile','ho so'].includes(normalizeStatus(target.rows[0].trangthai))) return res.status(409).json({ error: 'Hồ sơ chưa được cấp tài khoản.' });
    await pool.query('UPDATE taikhoan SET matkhau=$1 WHERE tendangnhap=$2', [hashPassword(password), target.rows[0].tendangnhap]);
    revokeSessions(target.rows[0].tendangnhap);
    res.json({ message: 'Đã đặt lại mật khẩu.' });
  } catch (error) { next(error); }
});

app.post('/api/auth/register', async (req, res, next) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const name = str(req.body?.name)?.trim();
    const username = str(req.body?.username)?.trim().toLowerCase();
    const password = str(req.body?.password);
    const phone = cleanPhoneDigits(req.body?.phone);
    const cccd = str(req.body?.cccd)?.trim() || null;
    const emailInput = str(req.body?.email)?.trim().toLowerCase() ?? '';
    const email = emailInput.includes('@') ? emailInput : null;
    if (!name || !username || !password || !phone) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, tên đăng nhập, số điện thoại và mật khẩu.' });
    if (name.length > 255) return res.status(400).json({ error: 'Họ và tên không được vượt quá 255 ký tự.' });
    if (username.length < 3 || /\s/.test(username)) return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự và không chứa khoảng trắng.' });
    if (email && !isValidEmail(email)) return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
    if (cccd && !isValidCccd(cccd)) return res.status(400).json({ error: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' });
    if (password.length < 8) return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 8 ký tự.' });
    if (!/^\d{10,11}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại phải gồm 10 hoặc 11 chữ số.' });

    const dupCheck = await client.query(
      `SELECT manguoidung FROM nguoidung
       WHERE regexp_replace(COALESCE(sodienthoai,''), '[^0-9]', '', 'g')=$1
          OR ($2 <> '' AND LOWER(COALESCE(email,''))=$2)
          OR ($3 <> '' AND COALESCE(cccd,'')=$3)
       LIMIT 1`,
      [phone, email ?? '', cccd ?? '']
    );
    if (dupCheck.rowCount) {
      return res.status(409).json({ error: 'Số điện thoại, Email hoặc CCCD đã được sử dụng trong hệ thống.' });
    }

    // Registration is reviewed by library staff before the reader can sign in.
    const id = `22026${String(Math.floor(1000 + Math.random() * 9000))}`;
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('INSERT INTO taikhoan (tendangnhap,matkhau,vaitro,trangthai) VALUES ($1,$2,$3,$4)', [username, hashPassword(password), 'Sinh viên', 'PENDING']);
    await client.query('INSERT INTO nguoidung (manguoidung,tendangnhap,hoten,email,sodienthoai,cccd,gioitinh,ngaysinh,diachi,anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, username, name, email, phone, cccd, req.body.gender ?? 'Nam', dateValue(req.body.dob), req.body.address ?? null, req.body.avatarUrl ?? null]);
    await client.query("INSERT INTO bandoc (mabandoc,loaibandoc,tongnophat) VALUES ($1,'Sinh viên',0)", [id]);
    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({ message: 'Đăng ký đã được gửi để thư viện xét duyệt.', user: { id, username, fullName: name, name, role: 'Sinh viên', accountType: 'reader', status: 'PENDING', email: email ?? '', phone, cccd: cccd ?? '' } });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.post('/api/readerRegistrations/:id/approve', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE taikhoan a SET trangthai='ACTIVE'
       FROM nguoidung u JOIN bandoc b ON b.mabandoc=u.manguoidung
       WHERE a.tendangnhap=u.tendangnhap AND u.manguoidung=$1
         AND UPPER(COALESCE(a.trangthai,'')) IN ('PENDING','CHO DUYET','CHỜ DUYỆT')
       RETURNING a.tendangnhap`,
      [req.params.id]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ đăng ký đang chờ duyệt.' });
    }
    const rules = await client.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules' LIMIT 1");
    const configuredMonths = Number(rules.rows[0]?.giatri?.cardValidityMonths ?? 12);
    const validityMonths = Number.isInteger(configuredMonths) && configuredMonths >= 1 && configuredMonths <= 60 ? configuredMonths : 12;
    await client.query("UPDATE bandoc SET ngaycapthe=CURRENT_DATE, ngayhetthe=CURRENT_DATE + ($1 * INTERVAL '1 month') WHERE mabandoc=$2", [validityMonths, req.params.id]);
    await client.query('COMMIT');
    return res.json({ id: req.params.id, status: 'ACTIVE' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.post('/api/readerRegistrations/:id/reject', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE taikhoan a SET trangthai='REJECTED'
       FROM nguoidung u JOIN bandoc b ON b.mabandoc=u.manguoidung
       WHERE a.tendangnhap=u.tendangnhap AND u.manguoidung=$1
         AND UPPER(COALESCE(a.trangthai,'')) IN ('PENDING','CHO DUYET','CHỜ DUYỆT')
       RETURNING a.tendangnhap`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Không tìm thấy hồ sơ đăng ký đang chờ duyệt.' });
    return res.json({ id: req.params.id, status: 'REJECTED' });
  } catch (error) { next(error); }
});

app.post('/api/readerPayments', async (req, res, next) => {
  const readerId = str(req.body?.readerId)?.trim();
  const method = str(req.body?.method)?.trim();
  const paymentStatus = method === 'BANK_TRANSFER'
    ? 'CHỜ ĐỐI SOÁT CHUYỂN KHOẢN'
    : method === 'AT_DESK' ? 'CHỜ THU TẠI QUẦY' : null;
  if (!readerId || !paymentStatus) return res.status(400).json({ error: 'Mã bạn đọc và hình thức thanh toán hợp lệ là bắt buộc.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reader = await client.query('SELECT 1 FROM bandoc WHERE mabandoc=$1 FOR UPDATE', [readerId]);
    if (!reader.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ bạn đọc.' });
    }
    const result = await client.query(
      `UPDATE phieuphat SET trangthaithanhtoan=$1
       WHERE mabandoc=$2
         AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%ĐÃ THANH TOÁN%'
         AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%DA_THANH_TOAN%'
       RETURNING maphieuphat`,
      [paymentStatus, readerId]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Bạn đọc hiện không có khoản phạt cần thanh toán.' });
    }
    await client.query('COMMIT');
    return res.json({ readerId, method, status: paymentStatus, fineIds: result.rows.map(row => String(row.maphieuphat)) });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally { client.release(); }
});

app.post('/api/auth/password-reset/request', async (req, res, next) => {
  try {
    const phone = str(req.body?.phone)?.replace(/\D/g, '') ?? '';
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must contain 10 digits' });
    try {
      if (!isOtpProviderConfigured()) return res.status(503).json({ error: 'SMS service is not configured' });
    } catch (error) {
      console.error('SMS provider configuration error:', error);
      return res.status(503).json({ error: 'SMS service is unavailable' });
    }

    const now = Date.now();
    const allowedAt = passwordResetCooldowns.get(phone) ?? 0;
    if (now < allowedAt) return res.status(429).json({ error: 'Please wait before requesting another code' });
    passwordResetCooldowns.set(phone, now + 60_000);

    const accountResult = await pool.query(
      `SELECT a.tendangnhap
       FROM nguoidung u
       JOIN taikhoan a ON a.tendangnhap=u.tendangnhap
       LEFT JOIN bandoc b ON b.mabandoc=u.manguoidung
       LEFT JOIN nhanvien n ON n.manhanvien=u.manguoidung
       WHERE regexp_replace(COALESCE(u.sodienthoai,''), '[^0-9]', '', 'g')=$1
         AND (b.mabandoc IS NOT NULL OR n.manhanvien IS NOT NULL)
       LIMIT 1`,
      [phone]
    );
    const account = accountResult.rows[0];
    if (!account) return res.status(202).json({ message: 'If the account exists, a reset code has been sent.' });

    let otpRequest: { requestId: string; expiresIn: number };
    try {
      otpRequest = await sendPasswordResetOtp(phone);
    } catch (error) {
      console.error('Password reset OTP request failed:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(502).json({ error: 'Could not request a reset code. Please try again later.' });
    }

    passwordResetChallenges.set(phone, {
      username: String(account.tendangnhap),
      requestId: otpRequest.requestId,
      expiresAt: now + otpRequest.expiresIn * 1000,
      attempts: 0
    });
    return res.status(202).json({ message: 'If the account exists, a reset code has been sent.' });
  } catch (error) { next(error); }
});

app.post('/api/auth/password-reset', async (req, res, next) => {
  try {
    const phone = str(req.body?.phone)?.replace(/\D/g, '') ?? '';
    const otp = str(req.body?.otp)?.trim() ?? '';
    const newPassword = str(req.body?.newPassword) ?? '';
    if (!/^\d{10}$/.test(phone) || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'A valid phone number and six-digit code are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters' });

    const challenge = passwordResetChallenges.get(phone);
    if (!challenge || challenge.expiresAt < Date.now()) {
      passwordResetChallenges.delete(phone);
      return res.status(400).json({ error: 'Reset code is invalid or expired' });
    }
    let verification: 'verified' | 'invalid' | 'expired';
    try {
      verification = await verifyPasswordResetOtp(challenge.requestId, phone, otp);
    } catch (error) {
      console.error('Password reset OTP verification failed:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(502).json({ error: 'Could not verify the reset code. Please try again.' });
    }
    if (verification === 'expired') {
      passwordResetChallenges.delete(phone);
      return res.status(400).json({ error: 'Reset code is invalid or expired' });
    }
    if (verification === 'invalid') {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) passwordResetChallenges.delete(phone);
      return res.status(400).json({ error: 'Reset code is invalid or expired' });
    }

    const result = await pool.query(
      'UPDATE taikhoan SET matkhau=$1 WHERE tendangnhap=$2',
      [hashPassword(newPassword), challenge.username]
    );
    if (!result.rowCount) {
      passwordResetChallenges.delete(phone);
      return res.status(400).json({ error: 'Reset code is invalid or expired' });
    }
    passwordResetChallenges.delete(phone);
    passwordResetCooldowns.delete(phone);
    return res.json({ message: 'Password updated successfully' });
  } catch (error) { next(error); }
});

app.get('/api/:resource', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    const route = routes[requested];
    if (requested === 'loans') {
      const readerId = req.query.readerId ? String(req.query.readerId) : null;
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE p.mabandoc=$1' : ''}`, readerId ? [readerId] : []);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'fines') {
      const readerId = req.query.readerId ? String(req.query.readerId) : null;
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE fp.mabandoc=$1' : ''}`, readerId ? [readerId] : []);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'suggestions') {
      const readerId = req.query.readerId ? String(req.query.readerId) : null;
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE reader_id=$1' : ''} ORDER BY submitted_at DESC`, readerId ? [readerId] : []);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'wishlist') {
      const readerId = String(req.query.readerId ?? '');
      if (!readerId) return res.status(400).json({ error: 'readerId query parameter is required' });
      const result = await pool.query('SELECT * FROM tusachcanhan WHERE mabandoc=$1', [readerId]);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'waitingList') {
      const readerId = req.query.readerId ? String(req.query.readerId) : null;
      const result = await pool.query(
        `SELECT * FROM danhsachcho${readerId ? ' WHERE mabandoc=$1' : ''} ORDER BY ngaydangky DESC`,
        readerId ? [readerId] : []
      );
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'renewals') {
      const readerId = req.query.readerId ? String(req.query.readerId) : null;
      const result = await pool.query(
        `SELECT y.* FROM yeucaugiahan y JOIN phieumuon p ON p.maphieumuon=y.maphieumuon${readerId ? ' WHERE p.mabandoc=$1' : ''} ORDER BY y.ngayyeucau DESC`,
        readerId ? [readerId] : []
      );
      return res.json(result.rows.map(route.map));
    }
    const activePeople = requested === 'readers' || requested === 'employees' ? " WHERE UPPER(COALESCE(a.trangthai,'')) <> 'DELETED'" : '';
    const ownReader = requested === 'readers' && req.auth?.kind === 'reader';
    const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${activePeople}${ownReader ? ' AND b.mabandoc=$1' : ''}${requested === 'importReceipts' ? ' GROUP BY p.maphieunhap' : ''}`, ownReader ? [req.auth!.id] : []);
    res.json(result.rows.map(route.map));
  } catch (error) { next(error); }
});

app.post('/api/:resource', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    const resource = requested;
    const body = req.body as Row;
    if (resource === 'readers' || resource === 'employees') {
      const reader = resource === 'readers';
      const id = str(value(body, 'id', 'maBanDoc', 'maNhanVien'))?.trim();
      const requestedUsername = str(value(body, 'username', 'tenDangNhap'))?.trim();
      const name = str(value(body, 'name', 'hoTen'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'sodienthoai'))?.trim() ?? '';
      const cccdVal = str(value(body, 'cccd'))?.trim() ?? '';
      const dobVal = value(body, 'dob', 'ngaySinh');
      if (!id || !name) return res.status(400).json({ error: 'Mã và họ tên là bắt buộc.' });
      if (emailVal && emailVal.includes('@') && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại phải gồm 10 hoặc 11 chữ số.' });
      if (cccdVal && !isValidCccd(cccdVal)) return res.status(400).json({ error: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' });
      if (dobVal && !isValidCalendarDate(dobVal)) return res.status(400).json({ error: 'Ngày sinh không hợp lệ (định dạng DD / MM / YYYY).' });
      const outstandingFine = Number(value(body, 'outstandingFine', 'tongnophat') ?? 0);
      if (!Number.isFinite(outstandingFine) || outstandingFine < 0) return res.status(400).json({ error: 'Tổng nợ phạt phải lớn hơn hoặc bằng 0.' });
      const hasAccount = reader || value(body, 'hasAccount') !== false;
      const suppliedPassword = str(value(body, 'password', 'matkhau'));
      if (hasAccount && (!requestedUsername || !suppliedPassword || suppliedPassword.length < 8)) {
        return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu tối thiểu 8 ký tự là bắt buộc khi cấp tài khoản.' });
      }
      const username = requestedUsername ?? `profile_${id.toLowerCase()}`;
      const password = suppliedPassword ?? randomBytes(32).toString('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existingAcc = await client.query('SELECT tendangnhap FROM taikhoan WHERE LOWER(tendangnhap)=LOWER($1)', [username]);
        if (existingAcc.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại.' }); }

        await client.query('INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai) VALUES ($1, $2, $3, $4)', [username, hashPassword(password), str(value(body, 'role', 'vaitro')) ?? (reader ? 'BẠN ĐỌC' : 'NHÂN VIÊN'), str(value(body, 'status', 'trangthai')) ?? 'HOẠT ĐỘNG']);
        await client.query('INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi, anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, username, name, str(value(body, 'email')), str(value(body, 'phone', 'sodienthoai')), str(value(body, 'cccd')), value(body, 'gender', 'gioiTinh'), dateValue(value(body, 'dob', 'ngaySinh')), str(value(body, 'address', 'diaChi')), str(value(body, 'avatarUrl', 'anhDaiDien'))]);
        if (reader) await client.query('INSERT INTO bandoc (mabandoc, loaibandoc, tongnophat, ngaycapthe, ngayhetthe) VALUES ($1, $2, $3, $4, $5)', [id, str(value(body, 'readerType', 'loaibandoc')), Number(value(body, 'outstandingFine', 'tongnophat') ?? 0), dateValue(value(body, 'issueDate', 'ngayCapThe')), dateValue(value(body, 'expiryDate', 'ngayHetHanThe'))]);
        else await client.query('INSERT INTO nhanvien (manhanvien, chucvu, trangthailamviec) VALUES ($1, $2, $3)', [id, str(value(body, 'position', 'chucvu')), str(value(body, 'employmentStatus', 'workingStatus', 'trangthailamviec')) ?? 'ĐANG LÀM']);
        await client.query('COMMIT');
        return res.status(201).json({ ...body, username, hasAccount, status: hasAccount ? value(body, 'status') : 'PROFILE' });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'bookTitles') {
      const rawId = str(value(body, 'id', 'maDauSach'))?.trim();
      const id = rawId || await generateNextCode(pool, 'dausach', 'madausach', 'DS', 3);
      if (!/^DS\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã đầu sách phải đúng định dạng DS001, DS002...' });
      const categoryId = await resolveCategoryId(value(body, 'categoryId', 'category', 'maDanhMuc'));
      const title = str(value(body, 'title', 'tenSach'))?.trim();
      if (!id || !categoryId || !title) return res.status(400).json({ error: 'Mã đầu sách, thể loại và tên sách là bắt buộc.' });
      const stock = await pool.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE UPPER(COALESCE(trangthai,'')) IN ('SẴN SÀNG','SAN SANG','CÓ SẴN'))::int AS available FROM cuonsach WHERE madausach=$1",[id]);
      const total = stock.rows[0].total, available = stock.rows[0].available;
      const publishYearRaw = value(body, 'publishYear', 'namXuatBan');
      const publishYear = publishYearRaw ? Number(publishYearRaw) : 2021;
      if (!Number.isInteger(total) || total < 0 || !Number.isInteger(available) || available < 0 || available > total) {
        return res.status(400).json({ error: 'Số lượng tổng và số lượng sẵn có phải là số nguyên không âm và số sẵn có không vượt quá tổng.' });
      }
      if (!Number.isInteger(publishYear) || publishYear < 1800 || publishYear > 2100) {
        return res.status(400).json({ error: 'Năm xuất bản phải nằm trong khoảng 1800 đến 2100.' });
      }
      await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,namxuatban,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [id, categoryId, title, value(body, 'authors', 'author', 'tacGia'), value(body, 'genre', 'theLoai'), value(body, 'subject', 'topic', 'chuDe'), value(body, 'faculty', 'department', 'khoa'), total, available, value(body,'publisher','nhaXuatBan'), publishYear, value(body,'coverUrl')]);
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'categories') {
      const id = str(value(body, 'id', 'maDanhMuc')); const name = str(value(body, 'name', 'tenDanhMuc'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      await pool.query('INSERT INTO danhmuc (madanhmuc, tendanhmuc) VALUES ($1,$2)', [id, name]);
      return res.status(201).json(body);
    }
    if (resource === 'bookCopies') {
      const rawId = str(value(body, 'id', 'maCuonSach'))?.trim();
      const id = rawId || await generateNextCode(pool, 'cuonsach', 'macuonsach', 'CS', 3);
      if (!/^CS\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã cuốn sách phải đúng định dạng CS001, CS002...' });
      const bookId = str(value(body, 'bookId', 'bookTitleId', 'maDauSach'))?.trim();
      if (!id || !bookId) return res.status(400).json({ error: 'Mã cuốn sách và mã đầu sách là bắt buộc.' });
      const priceNum = Number(String(value(body, 'price') ?? 0).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Giá trị cuốn sách phải là số không âm.' });
      const titleExists = await pool.query('SELECT 1 FROM dausach WHERE madausach=$1 LIMIT 1', [bookId]);
      if (!titleExists.rowCount) return res.status(404).json({ error: `Đầu sách ${bookId} không tồn tại.` });
      const client = await pool.connect();
      try { await client.query('BEGIN');
      await client.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, bookId, value(body, 'barcode', 'maVach') ?? id, value(body, 'physicalStatus', 'physicalCondition', 'tinhTrangVatLy'), value(body, 'circulationStatus', 'status', 'trangThai'), value(body, 'location', 'viTriLuuTru'), priceNum, value(body,'coverUrl')]);
        await syncBookCounts(client, bookId);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'loans') {
      const rawId = str(value(body, 'id', 'maPhieuMuon'))?.trim();
      const id = rawId || await generateNextCode(pool, 'phieumuon', 'maphieumuon', 'PM', 3);
      if (!/^PM\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã phiếu mượn phải đúng định dạng PM001, PM002...' });
      const readerId = str(value(body, 'readerId', 'maBanDoc'))?.trim();
      const employeeId = str(value(body, 'employeeId', 'maNhanVien'))?.trim() || '12026001';
      const copyId = str(value(body, 'copyId', 'maCuonSach'))?.trim();
      if (!id || !readerId || !copyId) return res.status(400).json({ error: 'Mã phiếu mượn, mã bạn đọc và mã cuốn sách là bắt buộc.' });
      const borrowIso = dateValue(value(body,'borrowDate','ngayMuon'));
      const dueIso = dateValue(value(body,'dueDate','ngayHenTra'));
      if (borrowIso && dueIso && new Date(dueIso) < new Date(borrowIso)) {
        return res.status(400).json({ error: 'Hạn trả không được nhỏ hơn ngày mượn.' });
      }
      const borrowRules = await pool.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules'");
      const maxBorrow = Number(borrowRules.rows[0]?.giatri?.maxBorrowBooks ?? 5);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const readerCheck = await client.query(
          `SELECT b.mabandoc, b.ngayhetthe, a.trangthai AS account_status
           FROM bandoc b
           JOIN nguoidung u ON u.manguoidung = b.mabandoc
           JOIN taikhoan a ON a.tendangnhap = u.tendangnhap
           WHERE b.mabandoc=$1 LIMIT 1`,
          [readerId]
        );
        if (!readerCheck.rowCount) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Bạn đọc ${readerId} không tồn tại.` });
        }
        const r = readerCheck.rows[0];
        if (isBlockedAccountStatus(r.account_status)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Thẻ bạn đọc hiện không ở trạng thái hoạt động (ACTIVE).' });
        }
        if (r.ngayhetthe && new Date(String(r.ngayhetthe)) < new Date(new Date().toISOString().slice(0, 10))) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Thẻ bạn đọc đã hết hạn sử dụng.' });
        }
        if (await readerHasUnpaidFines(client, readerId)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Bạn đọc đang còn khoản phạt chưa thanh toán.' });
        }
        const activeCountRes = await client.query(
          "SELECT COUNT(*)::int AS cnt FROM phieumuon WHERE mabandoc=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%')",
          [readerId]
        );
        if (Number(activeCountRes.rows[0]?.cnt ?? 0) >= maxBorrow) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: `Bạn đọc đã đạt hạn mức tối đa (${maxBorrow} cuốn đang mượn).` });
        }
        const copyRes = await client.query(
          'SELECT macuonsach, madausach, trangthai FROM cuonsach WHERE macuonsach=$1 FOR UPDATE',
          [copyId]
        );
        if (!copyRes.rowCount) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Cuốn sách ${copyId} không tồn tại.` });
        }
        const copyNorm = normalizeStatus(copyRes.rows[0].trangthai);
        const canLend = copyNorm === 'san sang' || copyNorm === 'co san' || copyNorm === 'giu cho nguoi cho';
        if (!canLend) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: `Cuốn sách ${copyId} đang ở trạng thái "${copyRes.rows[0].trangthai}", không thể cho mượn.` });
        }
        const activeLoanOnCopy = await client.query(
          "SELECT maphieumuon FROM phieumuon WHERE macuonsach=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%') LIMIT 1",
          [copyId]
        );
        if (activeLoanOnCopy.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: `Cuốn sách ${copyId} đang được gắn với một phiếu mượn hoạt động khác.` });
        }

        await client.query(
          'INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, readerId, employeeId, copyId, borrowIso, dueIso, null, 'Đang mượn']
        );
        await client.query("UPDATE cuonsach SET trangthai='ĐANG MƯỢN' WHERE macuonsach=$1", [copyId]);
        if (copyNorm === 'san sang' || copyNorm === 'co san') {
          await syncBookCounts(client, copyRes.rows[0].madausach);
        }
        await client.query(
          "UPDATE danhsachcho SET trangthai='DA_NHAN' WHERE mabandoc=$1 AND madausach=$2 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH')",
          [readerId, copyRes.rows[0].madausach]
        );
        await client.query('COMMIT');
        return res.status(201).json({ ...body, id });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    if (resource === 'fines') {
      const id = str(value(body, 'id', 'maPhieuPhat'))?.trim(); const loanId = str(value(body, 'loanId', 'maPhieuMuon')) || null;
      const readerId = str(value(body, 'readerId', 'maBanDoc'))?.trim();
      const employeeId = str(value(body, 'employeeId', 'maNhanVien'))?.trim() || '12026001';
      if (!id || !readerId) return res.status(400).json({ error: 'Mã phiếu phạt và mã bạn đọc là bắt buộc.' });
      const fineAmount = Number(value(body,'amount','soTien') ?? 0);
      if (!Number.isFinite(fineAmount) || fineAmount < 0) return res.status(400).json({ error: 'Số tiền phạt phải lớn hơn hoặc bằng 0.' });
      const payStatus = str(value(body,'paymentStatus','trangThaiThanhToan')) || 'Chưa thanh toán';
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, ngaylap, loaivipham, sotien, trangthaithanhtoan) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_TIMESTAMP),$6,$7,$8)', [id, loanId, readerId, employeeId, dateValue(value(body,'ngayLap','date','createdDate')), value(body,'violation','loaiViPham'), fineAmount, payStatus]);
        if (!normalizeStatus(payStatus).includes('da thanh toan')) {
          await client.query('UPDATE bandoc SET tongnophat = COALESCE(tongnophat, 0) + $1 WHERE mabandoc=$2', [fineAmount, readerId]);
        }
        await client.query('COMMIT');
        return res.status(201).json(body);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'renewals') {
      const id = str(value(body, 'id', 'maGiaHan'))?.trim();
      const loanId = str(value(body, 'loanId', 'maPhieuMuon'))?.trim();
      const requestDate = value(body, 'requestDate', 'ngayYeuCau');
      const days = Number(value(body, 'days', 'soNgayGiaHan'));
      const renewalRules = await pool.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='library_rules'");
      const maxRenewals = Number(renewalRules.rows[0]?.giatri?.maxRenewals ?? 2);
      if (!id || !loanId || !requestDate || !Number.isInteger(days) || days < 1 || days > 30) {
        return res.status(400).json({ error: 'Yêu cầu gia hạn cần mã gia hạn, mã phiếu mượn, ngày yêu cầu và số ngày gia hạn từ 1 đến 30.' });
      }
      const loanRes = await pool.query(
        `SELECT pm.maphieumuon, pm.ngayhentra, pm.trangthai, c.madausach
         FROM phieumuon pm
         JOIN cuonsach c ON c.macuonsach = pm.macuonsach
         WHERE pm.maphieumuon=$1 LIMIT 1`,
        [loanId]
      );
      if (!loanRes.rowCount) {
        return res.status(404).json({ error: `Không tìm thấy phiếu mượn ${loanId}.` });
      }
      const loanRow = loanRes.rows[0];
      const loanNorm = normalizeStatus(loanRow.trangthai);
      if (loanNorm.includes('da tra') || loanNorm.includes('mat')) {
        return res.status(409).json({ error: `Phiếu mượn ${loanId} đã kết thúc, không thể gia hạn.` });
      }
      const dueDateObj = loanRow.ngayhentra ? new Date(String(loanRow.ngayhentra)) : null;
      const todayIso = new Date().toISOString().slice(0, 10);
      if (loanNorm.includes('qua han') || (dueDateObj && dueDateObj < new Date(todayIso))) {
        return res.status(409).json({ error: `Phiếu mượn ${loanId} đã quá hạn, không đủ điều kiện gia hạn.` });
      }
      const approvedCountRes = await pool.query(
        "SELECT COUNT(*)::int AS cnt FROM yeucaugiahan WHERE maphieumuon=$1 AND UPPER(COALESCE(trangthaiduyet,'')) IN ('DA DUYET','ĐÃ DUYỆT','DA_DUYET')",
        [loanId]
      );
      if (Number(approvedCountRes.rows[0]?.cnt ?? 0) >= maxRenewals) {
        return res.status(409).json({ error: `Phiếu mượn ${loanId} đã đạt số lần gia hạn tối đa (${maxRenewals} lần).` });
      }
      const waitingRes = await pool.query(
        "SELECT 1 FROM danhsachcho WHERE madausach=$1 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH') LIMIT 1",
        [loanRow.madausach]
      );
      if (waitingRes.rowCount) {
        return res.status(409).json({ error: 'Sách này đang có bạn đọc khác đăng ký hàng chờ, không thể gia hạn.' });
      }
      const existingPending = await pool.query(
        "SELECT magiahan FROM yeucaugiahan WHERE maphieumuon=$1 AND UPPER(COALESCE(trangthaiduyet,'')) IN ('CHO DUYET', 'CHỜ DUYỆT') LIMIT 1",
        [loanId]
      );
      if (existingPending.rowCount) {
        return res.status(409).json({ error: `Phiếu mượn ${loanId} đã có yêu cầu gia hạn đang chờ duyệt.` });
      }
      await pool.query(
        'INSERT INTO yeucaugiahan (magiahan, maphieumuon, ngayyeucau, songaygiahan, trangthaiduyet) VALUES ($1,$2,$3,$4,$5)',
        [id, loanId, dateValue(requestDate), days, value(body, 'status', 'trangThaiDuyet') ?? 'CHO DUYET']
      );
      return res.status(201).json(body);
    }
    if (resource === 'importReceipts') {
      const id = str(value(body, 'id', 'maPhieuNhap'));
      const employeeId = str(value(body, 'employeeId', 'maNhanVien'));
      const receiptDate = dateValue(value(body, 'date', 'ngayNhap'));
      if (!id || !employeeId || !receiptDate) return res.status(400).json({ error: 'id, employeeId and date are required' });
      const quantity = Number(value(body, 'totalQuantity', 'tongSoLuong') ?? 0);
      if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: 'totalQuantity must be a non-negative integer' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO phieunhap (maphieunhap,manhanvien,ngaynhap,tongsoluong,trangthai,nhacungcap,nguoitao) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, employeeId, receiptDate, quantity, value(body, 'status', 'trangThai') ?? 'CHỜ XÁC NHẬN', value(body,'supplier'), value(body,'creator')]
        );
        const items = Array.isArray(body.items) ? body.items as Row[] : [];
        for (const item of items) {
          const bookId = str(value(item, 'bookId', 'maDauSach'));
          const qty = Number(value(item, 'qty', 'quantity'));
          const rawPrice = value(item, 'unitPriceValue', 'price', 'donGia') ?? value(item, 'unitPrice');
          const price = Number(String(rawPrice ?? 0).replace(/[^0-9.-]/g, ''));
          if (!bookId || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
            throw new Error('Each import item requires bookId, positive qty and non-negative unit price');
          }
          await client.query(
            'INSERT INTO chitietphieunhap (maphieunhap,madausach,soluongnhap,dongia) VALUES ($1,$2,$3,$4)',
            [id, bookId, qty, price]
          );
        }
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
      return res.status(201).json(body);
    }
    if (resource === 'purchaseRequests') {
      const id = str(value(body, 'id', 'maDeXuat'));
      const employeeId = str(value(body, 'employeeId', 'maNhanVien'));
      const bookInfo = str(value(body, 'bookInfo', 'thongTinSach'));
      const requestDate = value(body, 'date', 'ngayDeXuat');
      if (!id || !employeeId || !bookInfo || !requestDate) {
        return res.status(400).json({ error: 'id, employeeId, bookInfo and date are required' });
      }
      await pool.query(
        'INSERT INTO phieudexuat (madexuat, manhanvien, thongtinsach, ngaydexuat, trangthaiduyet, lydotuchoi) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, employeeId, bookInfo, requestDate, value(body, 'status', 'trangThaiDuyet') ?? 'CHO DUYET', value(body, 'rejectionReason', 'lyDoTuChoi')]
      );
      return res.status(201).json(body);
    }
    if (resource === 'suggestions') {
      const id = str(value(body, 'id')) || `DX-${Date.now()}`;
      const readerId = str(value(body, 'readerId', 'reader_id', 'mabandoc'))?.trim();
      const title = str(value(body, 'title'))?.trim();
      const author = str(value(body, 'author'))?.trim();
      if (!readerId || !title || !author) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên sách, tác giả và mã bạn đọc.' });
      }
      const publisher = str(value(body, 'publisher'))?.trim() || null;
      const yearRaw = value(body, 'year', 'publication_year');
      const year = yearRaw ? Number(yearRaw) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1800 || year > 2100)) {
        return res.status(400).json({ error: 'Năm xuất bản phải nằm trong khoảng 1800 đến 2100.' });
      }
      const rawQty = str(value(body, 'quantity', 'requested_quantity')) || '';
      const qtyMatch = rawQty.match(/\d+/);
      const requestedQuantity = qtyMatch ? Number(qtyMatch[0]) : null;
      if (requestedQuantity !== null && (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 1000)) {
        return res.status(400).json({ error: 'Số lượng đề xuất phải từ 1 đến 1000 bản.' });
      }
      const edition = str(value(body, 'edition'))?.trim() || null;
      const isbn = str(value(body, 'isbn'))?.trim() || null;
      const reason = str(value(body, 'reason'))?.trim() || null;
      const coverUrl = str(value(body, 'coverUrl', 'cover_url'));
      const status = str(value(body, 'status')) || 'Chờ duyệt';
      await pool.query(
        `INSERT INTO ixs_reader_book_suggestions (id, reader_id, title, author, publisher, publication_year, requested_quantity, edition, isbn, reason, cover_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, readerId, title, author, publisher, year, requestedQuantity, edition, isbn, reason, coverUrl, status]
      );
      return res.status(201).json({ ...body, id, readerId, status });
    }
    if (resource === 'wishlist' || resource === 'waitingList') {
      const readerId = str(value(body, 'readerId', 'mabandoc')); const bookId = str(value(body, 'bookTitleId', 'madausach'));
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId are required' });
      let createdPosition: number | null = null;
      if (resource === 'wishlist') {
        const dup = await pool.query('SELECT 1 FROM tusachcanhan WHERE mabandoc=$1 AND madausach=$2', [readerId, bookId]);
        if (dup.rowCount) return res.status(409).json({ error: 'Sách đã có trong tủ sách cá nhân.' });
        const note = str(body.note) ?? '', addedAt = dateValue(body.addedAt);
        if (note.length > 2000 || (addedAt && !isValidCalendarDate(addedAt))) return res.status(400).json({ error: 'Ghi chú tối đa 2000 ký tự và ngày thêm phải hợp lệ.' });
        await pool.query('INSERT INTO tusachcanhan (mabandoc, madausach, ngaythem, ghichu) VALUES ($1,$2,COALESCE($3::timestamp,CURRENT_TIMESTAMP),$4)', [readerId, bookId, addedAt, note]);
      } else {
        const existingWait = await pool.query(
          "SELECT 1 FROM danhsachcho WHERE mabandoc=$1 AND madausach=$2 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH')",
          [readerId, bookId]
        );
        if (existingWait.rowCount) return res.status(409).json({ error: 'Bạn đã đăng ký chờ đầu sách này rồi.' });
        const posRes = await pool.query(
          "SELECT COALESCE(MAX(thutu), 0) + 1 AS nextpos FROM danhsachcho WHERE madausach=$1 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH')",
          [bookId]
        );
        const nextPos = Number(value(body, 'position') ?? posRes.rows[0]?.nextpos ?? 1);
        createdPosition = nextPos;
        const status = str(value(body, 'status')) || 'DANG CHO';
        await pool.query('INSERT INTO danhsachcho (mabandoc, madausach, ngaydangky, thutu, trangthai) VALUES ($1,$2,COALESCE($3::timestamp, CURRENT_TIMESTAMP),$4,$5)', [readerId, bookId, value(body, 'registeredAt'), nextPos, status]);
      }
      return res.status(201).json({ ...body, ...(createdPosition === null ? {} : { position: createdPosition }), id: `${readerId}:${bookId}` });
    }
    if (resource === 'suppliers') {
      const invalid = supplierValidation(body, true);
      if (invalid) return res.status(400).json({ error: invalid });
      const id = str(value(body, 'id', 'maNhaCungCap'))?.trim();
      const name = str(value(body, 'name', 'tenNhaCungCap'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      if (!id || !name) return res.status(400).json({ error: 'Mã và tên nhà cung cấp là bắt buộc.' });
      if (emailVal && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Email nhà cung cấp không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại nhà cung cấp phải gồm 10 hoặc 11 chữ số.' });
      await pool.query('INSERT INTO nhacungcap (manhacungcap,tennhacungcap,nguoilienhe,sodienthoai,email,diachi,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,value(body,'contact','nguoiLienHe'),phoneVal || null,emailVal || null,value(body,'address','diaChi'),value(body,'status','trangThai')]);
      return res.status(201).json(body);
    }
    if (resource === 'publishers') {
      const id = str(value(body, 'id', 'maNhaXuatBan'))?.trim();
      const name = str(value(body, 'name', 'tenNhaXuatBan'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      if (!id || !name) return res.status(400).json({ error: 'Mã và tên nhà xuất bản là bắt buộc.' });
      if (emailVal && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Email nhà xuất bản không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại nhà xuất bản phải gồm 10 hoặc 11 chữ số.' });
      await pool.query('INSERT INTO nhaxuatban (manhaxuatban,tennhaxuatban,sodienthoai,email,diachi,ghichu,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,phoneVal || null,emailVal || null,value(body,'address','diaChi'),value(body,'note','ghiChu'),value(body,'status','trangThai')]);
      return res.status(201).json(body);
    }
    if (resource === 'logs') {
      const logDate = dateValue(value(body, 'date'));
      const timestamp = logDate ? `${logDate} ${str(value(body, 'time')) ?? '00:00:00'}` : null;
      const result = await pool.query('INSERT INTO ixs_nhatky (thoigian,nguoidung,manguoidung,hanhdong,doituong,chitiet) VALUES (COALESCE($1::timestamp,NOW()),$2,$3,$4,$5,$6) RETURNING manhatky', [timestamp,value(body,'user'),value(body,'userId'),value(body,'action'),value(body,'target'),value(body,'detail')]);
      return res.status(201).json({ ...body, id: String(result.rows[0].manhatky) });
    }
    return res.status(501).json({ error: `Create is not implemented for ${resource}` });
  } catch (error) { next(error); }
});

app.put('/api/:resource/:id', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    const resource = requested; const id = req.params.id; const body = req.body as Row;
    if (resource === 'wishlist') {
      const readerId = str(body.readerId) ?? String(req.query.readerId ?? '');
      const found = await pool.query('SELECT * FROM tusachcanhan WHERE mabandoc=$1 AND madausach=$2',[readerId,id]);
      if (!found.rowCount) return res.status(404).json({ error: 'Không tìm thấy sách trong tủ cá nhân.' });
      const old = found.rows[0];
      const current = body.currentPage === undefined ? Number(old.sotranghientai) : Number(body.currentPage);
      const total = body.totalPages === undefined ? Number(old.sotrangtong) : Number(body.totalPages);
      const status = body.status === undefined ? old.trangthaidoc : body.status;
      const note = body.note === undefined ? old.ghichu : str(body.note) ?? '';
      if (!Number.isInteger(current) || !Number.isInteger(total) || current < 0 || total < 0 || (total > 0 && current > total) || !['Chưa đọc','Đang đọc','Đã đọc'].includes(String(status)) || note.length > 2000) return res.status(400).json({ error: 'Tiến độ đọc hoặc ghi chú không hợp lệ.' });
      await pool.query('UPDATE tusachcanhan SET sotranghientai=$1,sotrangtong=$2,trangthaidoc=$3,ghichu=$4 WHERE mabandoc=$5 AND madausach=$6',[status === 'Đã đọc' && total > 0 ? total : current,total,status,note,readerId,id]);
      return res.json({ id,readerId,status,currentPage:current,totalPages:total,note });
    }
    if (resource === 'categories') {
      await pool.query('INSERT INTO danhmuc (madanhmuc,tendanhmuc) VALUES ($1,$2) ON CONFLICT (madanhmuc) DO UPDATE SET tendanhmuc=EXCLUDED.tendanhmuc', [id, value(body,'name','tenDanhMuc')]);
      return res.json({ ...body, id });
    }
    if (resource === 'suppliers') {
      const invalid = supplierValidation(body, false);
      if (invalid) return res.status(400).json({ error: invalid });
      if (!(await pool.query('SELECT 1 FROM nhacungcap WHERE manhacungcap=$1',[id])).rowCount) return res.status(404).json({ error: 'Record not found' });
      await updateProvided(pool, 'nhacungcap','manhacungcap',id,body,[['tennhacungcap',['name','tenNhaCungCap']],['nguoilienhe',['contact','nguoiLienHe']],['sodienthoai',['phone','soDienThoai']],['email',['email']],['diachi',['address','diaChi']],['trangthai',['status','trangThai']]]);
      return res.json({ ...body, id });
    }
    if (resource === 'publishers') {
      const result = await pool.query('UPDATE nhaxuatban SET tennhaxuatban=COALESCE($1,tennhaxuatban),sodienthoai=$2,email=$3,diachi=$4,ghichu=$5,trangthai=$6 WHERE manhaxuatban=$7', [value(body,'name','tenNhaXuatBan'),value(body,'phone','soDienThoai'),value(body,'email'),value(body,'address','diaChi'),value(body,'note','ghiChu'),value(body,'status','trangThai'),id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'bookTitles') {
      const categoryId = await resolveCategoryId(value(body,'categoryId','category','maDanhMuc'));
      const title = str(value(body,'title','tenSach'))?.trim();
      if (!categoryId || !title) return res.status(400).json({ error: 'Thể loại và tên đầu sách là bắt buộc.' });
      const stock = await pool.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE UPPER(COALESCE(trangthai,'')) IN ('SẴN SÀNG','SAN SANG','CÓ SẴN'))::int AS available FROM cuonsach WHERE madausach=$1",[id]);
      const total = stock.rows[0].total, available = stock.rows[0].available;
      const publishYearRaw = value(body,'publishYear','namXuatBan');
      const publishYear = publishYearRaw ? Number(publishYearRaw) : 2021;
      if (!Number.isInteger(total) || total < 0 || !Number.isInteger(available) || available < 0 || available > total) {
        return res.status(400).json({ error: 'Số lượng tổng và số sẵn có không hợp lệ.' });
      }
      if (!Number.isInteger(publishYear) || publishYear < 1800 || publishYear > 2100) {
        return res.status(400).json({ error: 'Năm xuất bản phải nằm trong khoảng 1800 đến 2100.' });
      }
      await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,namxuatban,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (madausach) DO UPDATE SET madanhmuc=EXCLUDED.madanhmuc,tensach=EXCLUDED.tensach,tacgia=EXCLUDED.tacgia,theloai=EXCLUDED.theloai,chude=EXCLUDED.chude,khoa=EXCLUDED.khoa,nhaxuatban=EXCLUDED.nhaxuatban,namxuatban=EXCLUDED.namxuatban,anhbia=EXCLUDED.anhbia', [id, categoryId, title, value(body,'authors','author','tacGia'), value(body,'genre','theLoai'), value(body,'subject','topic','chuDe'), value(body,'faculty','department','khoa'), total, available, value(body,'publisher','nhaXuatBan'), publishYear, value(body,'coverUrl')]);
      return res.json({ ...body, id });
    }
    if (resource === 'readers' || resource === 'employees') {
      const reader = resource === 'readers';
      const name = str(value(body, 'name', 'hoTen'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      const cccdVal = str(value(body, 'cccd'))?.trim() ?? '';
      const dobVal = value(body, 'dob', 'ngaySinh');
      const newPassword = str(value(body, 'password'));
      if (hasField(body, ['name','hoTen']) && !name) return res.status(400).json({ error: 'Họ tên không được để trống.' });
      if (newPassword && newPassword.length < 8) return res.status(400).json({ error: 'Mật khẩu tài khoản phải có tối thiểu 8 ký tự.' });
      if (emailVal && emailVal.includes('@') && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại phải gồm 10 hoặc 11 chữ số.' });
      if (dobVal && !isValidCalendarDate(dobVal)) return res.status(400).json({ error: 'Ngày sinh không hợp lệ (định dạng DD / MM / YYYY).' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query('SELECT u.tendangnhap, u.cccd FROM nguoidung u WHERE u.manguoidung=$1', [id]);
        if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy hồ sơ cần cập nhật.' }); }
        const oldUsername = current.rows[0].tendangnhap;
        const existingCccd = String(current.rows[0].cccd ?? '').trim();
        if (cccdVal && cccdVal !== existingCccd && !isValidCccd(cccdVal)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' });
        }
        await updateProvided(client,'nguoidung','manguoidung',id,body,[['hoten',['name','hoTen']],['email',['email']],['sodienthoai',['phone','soDienThoai']],['cccd',['cccd']],['gioitinh',['gender','gioiTinh']],['ngaysinh',['dob','ngaySinh'],dateValue],['diachi',['address','diaChi']],['anhdaidien',['avatarUrl','anhDaiDien']]]);
        await client.query('UPDATE taikhoan SET vaitro=COALESCE($1,vaitro),trangthai=COALESCE($2,trangthai),matkhau=COALESCE($3,matkhau) WHERE tendangnhap=$4', [value(body,'role','vaiTro'), value(body,'status','trangThai'), newPassword ? hashPassword(newPassword) : null, oldUsername]);
        if (reader) await updateProvided(client,'bandoc','mabandoc',id,body,[['loaibandoc',['readerType','loaiBanDoc']],['tongnophat',['outstandingFine','tongNoPhat']],['ngaycapthe',['issueDate','ngayCapThe'],dateValue],['ngayhetthe',['expiryDate','ngayHetHanThe'],dateValue]]);
        else await updateProvided(client,'nhanvien','manhanvien',id,body,[['chucvu',['position','chucVu']],['trangthailamviec',['employmentStatus','workingStatus','trangThaiLamViec']]]);
        await client.query('COMMIT');
        return res.json({ ...body, id });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'importReceipts') {
      await pool.query('UPDATE phieunhap SET tongsoluong=COALESCE($1,tongsoluong),trangthai=COALESCE($2,trangthai),nhacungcap=COALESCE($3,nhacungcap),nguoitao=COALESCE($4,nguoitao) WHERE maphieunhap=$5', [value(body,'totalQuantity','tongSoLuong'), value(body,'status','trangThai'), value(body,'supplier'), value(body,'creator'), id]);
      const items = Array.isArray(body.items) ? body.items as Row[] : [];
      if (items.length) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM chitietphieunhap WHERE maphieunhap=$1', [id]);
          for (const item of items) {
            const bookId = str(value(item, 'bookId', 'maDauSach'));
            const qty = Number(value(item, 'qty', 'quantity'));
            const price = Number(String(value(item, 'unitPriceValue', 'price', 'donGia', 'unitPrice') ?? 0).replace(/[^0-9.-]/g, ''));
            if (!bookId || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(price) || price < 0) throw new Error('Invalid import receipt item');
            await client.query('INSERT INTO chitietphieunhap (maphieunhap,madausach,soluongnhap,dongia) VALUES ($1,$2,$3,$4)', [id, bookId, qty, price]);
          }
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      }
      return res.json({ ...body, id });
    }
    if (resource === 'bookCopies') {
      const client = await pool.connect();
      try { await client.query('BEGIN');
        const old = await client.query('SELECT madausach FROM cuonsach WHERE macuonsach=$1 FOR UPDATE',[id]);
        const active = await client.query("SELECT 1 FROM phieumuon WHERE macuonsach=$1 AND (LOWER(COALESCE(trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(trangthai,'')) LIKE '%quá hạn%')",[id]);
        if (active.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Cuốn sách đang được mượn. Hãy xử lý qua nghiệp vụ trả sách.' }); }
      await client.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (macuonsach) DO UPDATE SET madausach=EXCLUDED.madausach,mavach=EXCLUDED.mavach,tinhtrangvatly=EXCLUDED.tinhtrangvatly,trangthai=EXCLUDED.trangthai,vitriluutru=EXCLUDED.vitriluutru,gia=EXCLUDED.gia,anhbia=EXCLUDED.anhbia', [id, value(body,'bookId','bookTitleId','maDauSach'), value(body,'barcode','maVach'), value(body,'physicalStatus','physicalCondition','tinhTrangVatLy'), value(body,'circulationStatus','status','trangThai'), value(body,'location','viTriLuuTru'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
        if (old.rowCount) await syncBookCounts(client, old.rows[0].madausach);
        await syncBookCounts(client, value(body,'bookId','bookTitleId','maDauSach'));
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      return res.json({ ...body, id });
    }
    if (resource === 'loans') {
      if (normalizeStatus(value(body,'status','trangThai')).includes('da tra') || value(body,'returnDate','ngayTraThucTe')) return res.status(409).json({ error: 'Hãy dùng nghiệp vụ trả sách để cập nhật phiếu và tồn kho cùng lúc.' });
      const result = await pool.query('UPDATE phieumuon SET ngayhentra=COALESCE($1,ngayhentra), ngaytrathucte=$2, trangthai=COALESCE($3,trangthai) WHERE maphieumuon=$4', [dateValue(value(body,'dueDate','ngayHenTra')), dateValue(value(body,'returnDate','ngayTraThucTe')), value(body,'status','trangThai'), id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'fines') {
      const amtRaw = value(body,'amount','soTien');
      if (amtRaw !== null && amtRaw !== undefined) {
        const amt = Number(amtRaw);
        if (!Number.isFinite(amt) || amt < 0) return res.status(400).json({ error: 'Số tiền phạt phải lớn hơn hoặc bằng 0.' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const fineRes = await client.query(
          'UPDATE phieuphat SET trangthaithanhtoan=COALESCE($1,trangthaithanhtoan), sotien=COALESCE($2,sotien), loaivipham=COALESCE($3,loaivipham) WHERE maphieuphat=$4 RETURNING mabandoc',
          [value(body,'paymentStatus','trangThaiThanhToan'), value(body,'amount','soTien'), value(body,'violation','loaiViPham'), id]
        );
        if (!fineRes.rowCount) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Record not found' });
        }
        const readerId = String(fineRes.rows[0].mabandoc);
        const debtRes = await client.query(
          "SELECT COALESCE(SUM(sotien), 0) AS total_debt FROM phieuphat WHERE mabandoc=$1 AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%ĐÃ THANH TOÁN%' AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%DA_THANH_TOAN%'",
          [readerId]
        );
        const newDebt = Number(debtRes.rows[0]?.total_debt ?? 0);
        await client.query('UPDATE bandoc SET tongnophat=$1 WHERE mabandoc=$2', [newDebt, readerId]);
        if (newDebt <= 0) {
          await client.query(
            "UPDATE taikhoan a SET trangthai='ACTIVE' FROM nguoidung u WHERE u.tendangnhap=a.tendangnhap AND u.manguoidung=$1 AND UPPER(COALESCE(a.trangthai,''))='LOCKED'",
            [readerId]
          );
        }
        await client.query('COMMIT');
        return res.json({ ...body, id, readerId, outstandingFine: newDebt });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'renewals') {
      const daysRaw = value(body, 'days', 'soNgayGiaHan');
      if (daysRaw !== null && daysRaw !== undefined) {
        const d = Number(daysRaw);
        if (!Number.isInteger(d) || d < 1 || d > 30) return res.status(400).json({ error: 'Số ngày gia hạn phải từ 1 đến 30.' });
      }
      const nextStatus = str(value(body, 'status', 'trangThaiDuyet'));
      const maxRenewals = Number(value(body, 'maxRenewals') ?? 2);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const reqRes = await client.query(
          `SELECT y.magiahan, y.maphieumuon, y.songaygiahan, y.trangthaiduyet, pm.ngayhentra, pm.trangthai AS loan_status, c.madausach
           FROM yeucaugiahan y
           JOIN phieumuon pm ON pm.maphieumuon = y.maphieumuon
           JOIN cuonsach c ON c.macuonsach = pm.macuonsach
           WHERE y.magiahan=$1 FOR UPDATE`,
          [id]
        );
        if (!reqRes.rowCount) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Record not found' });
        }
        const row = reqRes.rows[0];
        const daysToAdd = Number(daysRaw ?? row.songaygiahan ?? 7);
        const normNext = normalizeStatus(nextStatus);
        const isApproving = normNext.includes('da duyet') && !normalizeStatus(row.trangthaiduyet).includes('da duyet');

        if (isApproving) {
          const loanNorm = normalizeStatus(row.loan_status);
          if (loanNorm.includes('da tra') || loanNorm.includes('mat')) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Phiếu mượn đã kết thúc, không thể duyệt gia hạn.' });
          }
          const todayIso = new Date().toISOString().slice(0, 10);
          if (loanNorm.includes('qua han') || (row.ngayhentra && new Date(String(row.ngayhentra)) < new Date(todayIso))) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Phiếu mượn đã quá hạn, không đủ điều kiện duyệt gia hạn.' });
          }
          const approvedCntRes = await client.query(
            "SELECT COUNT(*)::int AS cnt FROM yeucaugiahan WHERE maphieumuon=$1 AND UPPER(COALESCE(trangthaiduyet,'')) IN ('DA DUYET','ĐÃ DUYỆT','DA_DUYET')",
            [row.maphieumuon]
          );
          if (Number(approvedCntRes.rows[0]?.cnt ?? 0) >= maxRenewals) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: `Phiếu mượn ${row.maphieumuon} đã đạt số lần gia hạn tối đa (${maxRenewals}).` });
          }
          const waitingRes = await client.query(
            "SELECT 1 FROM danhsachcho WHERE madausach=$1 AND UPPER(COALESCE(trangthai,'')) IN ('DANG CHO','DANG_CHO','SAN SANG','DA_GIU_SACH') LIMIT 1",
            [row.madausach]
          );
          if (waitingRes.rowCount) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Đầu sách đang có bạn đọc khác chờ mượn, không thể duyệt gia hạn.' });
          }
          await client.query(
            "UPDATE phieumuon SET ngayhentra = COALESCE(ngayhentra, CURRENT_DATE) + ($1 * INTERVAL '1 day') WHERE maphieumuon=$2",
            [daysToAdd, row.maphieumuon]
          );
        }

        await client.query(
          'UPDATE yeucaugiahan SET trangthaiduyet=COALESCE($1,trangthaiduyet), songaygiahan=COALESCE($2,songaygiahan) WHERE magiahan=$3',
          [nextStatus, daysRaw ?? null, id]
        );
        await client.query('COMMIT');
        return res.json({ ...body, id });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'waitingList') {
      const readerId = str(value(body, 'readerId', 'mabandoc'));
      const bookId = str(value(body, 'bookTitleId', 'madausach')) || id;
      const nextStatus = str(value(body, 'status', 'trangThai'));
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId are required' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const prevRes = await client.query('SELECT trangthai FROM danhsachcho WHERE mabandoc=$1 AND madausach=$2 FOR UPDATE', [readerId, bookId]);
        if (!prevRes.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Record not found' }); }
        const prevNorm = normalizeStatus(prevRes.rows[0].trangthai);
        const nextNorm = normalizeStatus(nextStatus);
        await client.query('UPDATE danhsachcho SET trangthai=COALESCE($1,trangthai) WHERE mabandoc=$2 AND madausach=$3', [nextStatus, readerId, bookId]);
        if ((prevNorm === 'san sang' || prevNorm === 'da_giu_sach') && (nextNorm.includes('huy') || nextNorm.includes('het han'))) {
          await releaseHeldCopyOrPromoteNextWaiter(client, bookId);
        }
        await client.query('COMMIT');
        return res.json({ ...body, id });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'purchaseRequests') {
      const result = await pool.query(
        'UPDATE phieudexuat SET trangthaiduyet=COALESCE($1,trangthaiduyet), lydotuchoi=COALESCE($2,lydotuchoi) WHERE madexuat=$3',
        [value(body, 'status', 'trangThaiDuyet'), value(body, 'rejectionReason', 'lyDoTuChoi'), id]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'suggestions') {
      const result = await pool.query(
        'UPDATE ixs_reader_book_suggestions SET status=COALESCE($1,status), rejection_reason=COALESCE($2,rejection_reason) WHERE id=$3',
        [value(body, 'status', 'trangThaiDuyet'), value(body, 'rejectionReason', 'lyDoTuChoi'), id]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    return res.status(501).json({ error: `Update is not implemented for ${resource}` });
  } catch (error) { next(error); }
});

app.delete('/api/:resource/:id', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    const resource = requested; const id = req.params.id;
    if (resource === 'suggestions') {
      const result = await pool.query('DELETE FROM ixs_reader_book_suggestions WHERE id=$1', [id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.status(204).end();
    }
    if (resource === 'wishlist') {
      const readerId = String(req.query.readerId ?? ''); const bookId = String(req.query.bookTitleId ?? id);
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId query parameters are required' });
      const result = await pool.query('DELETE FROM tusachcanhan WHERE mabandoc=$1 AND madausach=$2', [readerId, bookId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.status(204).end();
    }
    if (resource === 'waitingList') {
      const readerId = String(req.query.readerId ?? ''); const bookId = String(req.query.bookTitleId ?? id);
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId query parameters are required' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = await client.query('DELETE FROM danhsachcho WHERE mabandoc=$1 AND madausach=$2 RETURNING trangthai', [readerId, bookId]);
        if (!cur.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Record not found' }); }
        const curNorm = normalizeStatus(cur.rows[0].trangthai);
        if (curNorm === 'san sang' || curNorm === 'da_giu_sach') {
          await releaseHeldCopyOrPromoteNextWaiter(client, bookId);
        }
        await client.query('COMMIT');
        return res.status(204).end();
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'readers' || resource === 'employees') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userTable = resource === 'readers' ? 'bandoc' : 'nhanvien';
        const userColumn = resource === 'readers' ? 'mabandoc' : 'manhanvien';
        const lookup = await client.query(`SELECT u.tendangnhap FROM nguoidung u JOIN ${userTable} x ON x.${userColumn}=u.manguoidung WHERE u.manguoidung=$1`, [id]);
        if (!lookup.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Record not found' }); }
        const { tendangnhap } = lookup.rows[0];

        if (resource === 'readers') {
          const activeLoans = await client.query(
            "SELECT 1 FROM phieumuon WHERE mabandoc=$1 AND UPPER(COALESCE(trangthai,'')) NOT LIKE '%ĐÃ TRẢ%' AND UPPER(COALESCE(trangthai,'')) NOT LIKE '%DA_TRA%' LIMIT 1",
            [id]
          );
          const unpaidFines = await client.query(
            "SELECT 1 FROM phieuphat WHERE mabandoc=$1 AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%ĐÃ THANH TOÁN%' AND UPPER(COALESCE(trangthaithanhtoan,'')) NOT LIKE '%DA_THANH_TOAN%' LIMIT 1",
            [id]
          );
          if (activeLoans.rowCount || unpaidFines.rowCount) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Không thể xóa bạn đọc đang có giao dịch chưa xong (còn sách đang mượn hoặc còn nợ tiền phạt).' });
          }
          if (tendangnhap) {
            await client.query("UPDATE taikhoan SET trangthai='DELETED' WHERE tendangnhap=$1", [tendangnhap]);
          }
        } else {
          const hasTx = await client.query(
            'SELECT 1 FROM phieumuon WHERE manhanvien=$1 UNION ALL SELECT 1 FROM phieunhap WHERE manhanvien=$1 UNION ALL SELECT 1 FROM phieuphat WHERE manhanvien=$1 LIMIT 1',
            [id]
          );
          if (hasTx.rowCount) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Không thể xóa nhân viên đã có lịch sử xử lý giao dịch.' });
          }
          await client.query("UPDATE nhanvien SET trangthailamviec='DA_NGHI' WHERE manhanvien=$1", [id]);
          if (tendangnhap) {
            await client.query("UPDATE taikhoan SET trangthai='DELETED' WHERE tendangnhap=$1", [tendangnhap]);
          }
        }
        await client.query('COMMIT');
        return res.status(204).end();
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'categories') {
      const hasTitles = await pool.query('SELECT 1 FROM dausach WHERE madanhmuc=$1 LIMIT 1', [id]);
      if (hasTitles.rowCount) return res.status(409).json({ error: 'Không thể xóa danh mục đã chứa tài liệu.' });
    }
    if (resource === 'bookTitles') {
      const hasCopies = await pool.query('SELECT 1 FROM cuonsach WHERE madausach=$1 LIMIT 1', [id]);
      if (hasCopies.rowCount) return res.status(409).json({ error: 'Không thể xóa đầu sách đang có cuốn sách liên kết.' });
    }
    if (resource === 'bookCopies') {
      const client = await pool.connect();
      try { await client.query('BEGIN');
        const old = await client.query('SELECT madausach FROM cuonsach WHERE macuonsach=$1 FOR UPDATE',[id]);
        if (!old.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy cuốn sách.' }); }
        if ((await client.query('SELECT 1 FROM phieumuon WHERE macuonsach=$1 LIMIT 1',[id])).rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Cuốn sách có lịch sử mượn, không thể xóa.' }); }
        await client.query('DELETE FROM cuonsach WHERE macuonsach=$1',[id]);
        await syncBookCounts(client, old.rows[0].madausach);
        await client.query('COMMIT');
        return res.status(204).end();
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    if (resource === 'importReceipts') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM chitietphieunhap WHERE maphieunhap=$1', [id]);
        const result = await client.query('DELETE FROM phieunhap WHERE maphieunhap=$1', [id]);
        if (!result.rowCount) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Record not found' });
        }
        await client.query('COMMIT');
        return res.status(204).end();
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    const deleteSql: Partial<Record<Resource, string>> = { bookTitles: 'DELETE FROM dausach WHERE madausach=$1', bookCopies: 'DELETE FROM cuonsach WHERE macuonsach=$1', categories: 'DELETE FROM danhmuc WHERE madanhmuc=$1', loans: 'DELETE FROM phieumuon WHERE maphieumuon=$1', renewals: 'DELETE FROM yeucaugiahan WHERE magiahan=$1', purchaseRequests: 'DELETE FROM phieudexuat WHERE madexuat=$1', fines: 'DELETE FROM phieuphat WHERE maphieuphat=$1', suppliers: 'DELETE FROM nhacungcap WHERE manhacungcap=$1', publishers: 'DELETE FROM nhaxuatban WHERE manhaxuatban=$1', logs: 'DELETE FROM ixs_nhatky WHERE manhatky=$1' };
    if (!deleteSql[resource]) return res.status(501).json({ error: `Delete is not implemented for ${resource}` });
    const result = await pool.query(deleteSql[resource]!, [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    const constraint = 'constraint' in error ? String(error.constraint) : '';
    if (code === '23505') {
      return res.status(409).json({ error: constraint.includes('taikhoan') ? 'Tên đăng nhập đã tồn tại trong hệ thống.' : 'Dữ liệu với mã định danh này đã tồn tại.' });
    }
    if (code === '23503') return res.status(409).json({ error: 'Không thể thao tác vì dữ liệu đang được liên kết bởi bản ghi khác.' });
    if (code === '22P02' || code === '22007' || code === '22008') {
      return res.status(400).json({ error: 'Định dạng dữ liệu hoặc ngày tháng không hợp lệ.' });
    }
  }
  res.status(500).json({ error: 'Lỗi hệ thống khi xử lý yêu cầu. Vui lòng thử lại sau.' });
});

async function start(): Promise<void> {
  await runMigrations();
  await pool.query('ALTER TABLE ixs_reader_book_suggestions ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
  app.listen(port, () => console.log(`IXS Library API listening on port ${port}`));
}

start().catch(error => {
  console.error('Could not initialize the PostgreSQL schema:', error);
  process.exitCode = 1;
});
