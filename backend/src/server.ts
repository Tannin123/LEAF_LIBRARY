import 'dotenv/config';
import cors from 'cors';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { runMigrations } from './migrations';

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const sessions = new Map<string, { username: string; expiresAt: number }>();

function getSession(req: Request) {
  const token = req.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return undefined;
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  return { token, username: session.username };
}

function isActiveAccount(status: unknown): boolean {
  return ['active', 'hoat đong', 'hoat dong', 'hop le'].includes(normalizeStatus(status));
}

function isAdminRole(role: unknown): boolean {
  return ['admin', 'quan tri vien'].includes(normalizeStatus(role));
}

async function getStaffId(req: Request, adminOnly = false): Promise<string | undefined> {
  const session = getSession(req);
  if (!session) return undefined;
  const result = await pool.query(
    `SELECT n.manhanvien, a.trangthai, a.vaitro FROM taikhoan a
     JOIN nguoidung u ON u.tendangnhap=a.tendangnhap
     JOIN nhanvien n ON n.manhanvien=u.manguoidung WHERE a.tendangnhap=$1`,
    [session.username]
  );
  const account = result.rows[0];
  return account && isActiveAccount(account.trangthai) && (!adminOnly || isAdminRole(account.vaitro))
    ? String(account.manhanvien) : undefined;
}

async function getReaderId(req: Request): Promise<string | undefined> {
  const session = getSession(req);
  if (!session) return undefined;
  const result = await pool.query(
    `SELECT b.mabandoc, a.trangthai FROM taikhoan a
     JOIN nguoidung u ON u.tendangnhap=a.tendangnhap
     JOIN bandoc b ON b.mabandoc=u.manguoidung WHERE a.tendangnhap=$1`,
    [session.username]
  );
  const account = result.rows[0];
  return account && isActiveAccount(account.trangthai) ? String(account.mabandoc) : undefined;
}

type Resource = 'readers' | 'employees' | 'bookTitles' | 'bookCopies' | 'loans' | 'renewals' | 'importReceipts' | 'purchaseRequests' | 'fines' | 'categories' | 'accounts' | 'wishlist' | 'waitingList' | 'suppliers' | 'publishers' | 'logs' | 'suggestions';
type Row = Record<string, unknown>;

const value = (row: Row, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return null;
};
const str = (input: unknown) => input === null || input === undefined ? null : String(input);
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
  return String(status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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
function librarianInitialPassword(dob: unknown): string | undefined {
  const birthDate = dateValue(dob);
  if (!birthDate || !isValidCalendarDate(dob) || birthDate > new Date().toISOString().slice(0, 10)) return undefined;
  const [year, month, day] = birthDate.split('-');
  return day + month + year;
}

async function resolveCategoryId(input: unknown): Promise<string | null> {
  const category = str(input)?.trim();
  if (!category) return null;
  const existing = await pool.query('SELECT madanhmuc FROM danhmuc WHERE madanhmuc=$1 OR LOWER(tendanhmuc)=LOWER($1) LIMIT 1', [category]);
  if (existing.rows[0]) return String(existing.rows[0].madanhmuc);
  const id = await generateNextCode(pool, 'danhmuc', 'madanhmuc', 'DM');
  await pool.query('INSERT INTO danhmuc (madanhmuc,tendanhmuc) VALUES ($1,$2) ON CONFLICT (madanhmuc) DO NOTHING', [id, category]);
  return id;
}
async function generateNextCode(
  queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[] }> },
  table: string,
  column: string,
  prefix: string
): Promise<string> {
  const result = await queryable.query('SELECT next_library_code($1,$2,$3) AS code', [prefix, table, column]);
  return String(result.rows[0].code);
}
async function readerHasUnpaidFines(
  queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }> },
  readerId: string
): Promise<boolean> {
  const res = await queryable.query(
    "SELECT COALESCE(b.tongnophat, 0) AS debt, EXISTS(SELECT 1 FROM phieuphat fp WHERE fp.mabandoc=$1 AND COALESCE(fp.trangthaithanhtoan,'') NOT IN ('Đã thanh toán','ĐÃ THANH TOÁN','DA_THANH_TOAN')) AS has_unpaid FROM bandoc b WHERE b.mabandoc=$1",
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
    await queryable.query('UPDATE dausach SET soluongsan = COALESCE(soluongsan, 0) + 1 WHERE madausach=$1', [bookId]);
  }
}
const routes: Record<Resource, { select: string; from: string; map: (row: Row) => Row; id: string }> = {
  readers: { id: 'mabandoc', from: 'bandoc b JOIN nguoidung u ON u.manguoidung = b.mabandoc JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'b.mabandoc, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, b.loaibandoc, b.tongnophat, b.ngaycapthe, b.ngayhetthe, a.vaitro, a.trangthai', map: r => ({ id: str(r.mabandoc), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), readerType: str(r.loaibandoc), outstandingFine: Number(r.tongnophat ?? 0), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), issueDate: date(r.ngaycapthe), expiryDate: date(r.ngayhetthe), avatarUrl: str(r.anhdaidien) ?? '' }) },
  employees: { id: 'manhanvien', from: 'nhanvien n JOIN nguoidung u ON u.manguoidung = n.manhanvien JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'n.manhanvien, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, n.chucvu, n.trangthailamviec, n.dantoc, a.vaitro, a.trangthai', map: r => ({ id: str(r.manhanvien), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), position: str(r.chucvu), ethnicity: str(r.dantoc), employmentStatus: str(r.trangthailamviec), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), avatarUrl: str(r.anhdaidien) ?? '', password: null, hasAccount: !['profile', 'ho so'].includes(normalizeStatus(r.trangthai)) }) },
  bookTitles: { id: 'madausach', from: 'dausach d JOIN danhmuc c ON c.madanhmuc = d.madanhmuc', select: 'd.madausach, d.madanhmuc, c.tendanhmuc, d.tensach, d.tacgia, d.theloai, d.chude, d.khoa, d.soluongtong, d.soluongsan, d.nhaxuatban, d.namxuatban, d.phienban, d.gia, d.anhbia', map: r => ({ id: str(r.madausach), categoryId: str(r.madanhmuc), category: str(r.tendanhmuc), title: str(r.tensach), authors: str(r.tacgia), author: str(r.tacgia), genre: str(r.theloai), subject: str(r.chude), faculty: str(r.khoa), total: Number(r.soluongtong ?? 0), available: Number(r.soluongsan ?? 0), totalCopies: Number(r.soluongtong ?? 0), availableCopies: Number(r.soluongsan ?? 0), publisher: str(r.nhaxuatban), publishYear: r.namxuatban ? Number(r.namxuatban) : null, namXuatBan: r.namxuatban ? Number(r.namxuatban) : null, edition: str(r.phienban), price: r.gia === null ? null : Number(r.gia), coverUrl: str(r.anhbia) ?? '' }) },
  bookCopies: { id: 'macuonsach', from: 'cuonsach c JOIN dausach d ON d.madausach = c.madausach', select: 'c.macuonsach, c.madausach, c.mavach, c.tinhtrangvatly, c.trangthai, c.vitriluutru, c.gia, c.anhbia, d.tensach', map: r => ({ id: str(r.macuonsach), bookId: str(r.madausach), bookTitleId: str(r.madausach), bookTitle: str(r.tensach), barcode: str(r.mavach), physicalStatus: str(r.tinhtrangvatly), physicalCondition: str(r.tinhtrangvatly), circulationStatus: str(r.trangthai), status: str(r.trangthai), location: str(r.vitriluutru), price: r.gia === null ? null : Number(r.gia), coverUrl: str(r.anhbia) ?? '' }) },
  loans: { id: 'maphieumuon', from: 'phieumuon p LEFT JOIN nguoidung u ON u.manguoidung = p.mabandoc JOIN cuonsach c ON c.macuonsach = p.macuonsach JOIN dausach d ON d.madausach = c.madausach', select: 'p.maphieumuon, p.mabandoc, u.hoten, p.manhanvien, p.macuonsach, d.tensach, p.ngaymuon, p.ngayhentra, p.ngaytrathucte, p.trangthai', map: r => ({ id: str(r.maphieumuon), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), readerName: str(r.hoten), employeeId: str(r.manhanvien), copyId: str(r.macuonsach), bookTitle: str(r.tensach), borrowDate: date(r.ngaymuon), dueDate: date(r.ngayhentra), returnDate: date(r.ngaytrathucte), status: str(r.trangthai) }) },
  renewals: { id: 'magiahan', from: 'yeucaugiahan', select: '*', map: r => ({ id: str(r.magiahan), loanId: str(r.maphieumuon), requestDate: date(r.ngayyeucau), days: Number(r.songaygiahan), status: str(r.trangthaiduyet) }) },
  importReceipts: { id: 'maphieunhap', from: 'phieunhap p LEFT JOIN chitietphieunhap ci ON ci.maphieunhap=p.maphieunhap LEFT JOIN dausach d ON d.madausach=ci.madausach', select: 'p.maphieunhap,p.manhanvien,p.ngaynhap,p.trangthai,p.nhacungcap,p.nguoitao,COALESCE(SUM(ci.soluongnhap),p.tongsoluong,0) AS tongsoluong,COALESCE(SUM(ci.soluongnhap*ci.dongia),0) AS tongtien,COALESCE(jsonb_agg(jsonb_build_object(\'bookId\',ci.madausach,\'bookTitle\',d.tensach,\'qty\',ci.soluongnhap,\'unitPrice\',ci.dongia,\'subtotal\',ci.soluongnhap*ci.dongia)) FILTER (WHERE ci.madausach IS NOT NULL),\'[]\'::jsonb) AS items', map: r => ({ id: str(r.maphieunhap), employeeId: str(r.manhanvien), date: date(r.ngaynhap), supplier: str(r.nhacungcap) ?? '', creator: str(r.nguoitao) ?? '', totalBooks: `${Number(r.tongsoluong ?? 0)} cuốn`, totalQuantity: Number(r.tongsoluong ?? 0), totalAmount: `${Number(r.tongtien ?? 0).toLocaleString('vi-VN')} ₫`, status: str(r.trangthai), items: Array.isArray(r.items) ? r.items.map((item: Row) => ({ ...item, unitPrice: `${Number(item.unitPrice ?? 0).toLocaleString('vi-VN')} ₫`, subtotal: `${Number(item.subtotal ?? 0).toLocaleString('vi-VN')} ₫` })) : [] }) },
  purchaseRequests: { id: 'madexuat', from: '(SELECT * FROM phieudexuat WHERE mabandoc IS NULL) purchase_requests', select: '*', map: r => ({ id: str(r.madexuat), employeeId: str(r.manhanvien), bookInfo: str(r.thongtinsach), date: date(r.ngaydexuat), status: str(r.trangthaiduyet), rejectionReason: str(r.lydotuchoi) }) },
  fines: { id: 'maphieuphat', from: 'phieuphat fp LEFT JOIN phieumuon p ON p.maphieumuon = fp.maphieumuon LEFT JOIN cuonsach c ON c.macuonsach = p.macuonsach LEFT JOIN dausach d ON d.madausach = c.madausach', select: 'fp.maphieuphat, fp.maphieumuon, fp.mabandoc, fp.manhanvien, fp.ngaylap, fp.loaivipham, fp.sotien, fp.trangthaithanhtoan, fp.phuongthucthanhtoan, fp.ngaythanhtoan, d.tensach', map: r => ({ id: str(r.maphieuphat), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), employeeId: str(r.manhanvien), createdDate: date(r.ngaylap), date: date(r.ngaylap), ngayLap: date(r.ngaylap), violation: str(r.loaivipham), amount: Number(r.sotien ?? 0), paymentStatus: str(r.trangthaithanhtoan), paymentMethod: str(r.phuongthucthanhtoan), paidDate: date(r.ngaythanhtoan), bookTitle: str(r.tensach) }) },
  categories: { id: 'madanhmuc', from: 'danhmuc', select: '*', map: r => ({ id: str(r.madanhmuc), name: str(r.tendanhmuc) }) },
  accounts: { id: 'tendangnhap', from: 'taikhoan', select: 'tendangnhap, vaitro, trangthai', map: r => ({ id: str(r.tendangnhap), username: str(r.tendangnhap), role: str(r.vaitro), status: str(r.trangthai) }) },
  suppliers: { id: 'manhacungcap', from: 'nhacungcap', select: '*', map: r => ({ id: str(r.manhacungcap), name: str(r.tennhacungcap), contact: str(r.nguoilienhe), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), status: str(r.trangthai) }) },
  publishers: { id: 'manhaxuatban', from: 'nhaxuatban', select: '*', map: r => ({ id: str(r.manhaxuatban), name: str(r.tennhaxuatban), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), note: str(r.ghichu), status: str(r.trangthai) }) },
  logs: { id: 'manhatky', from: 'ixs_nhatky', select: "manhatky, TO_CHAR(thoigian,'DD / MM / YYYY') AS ngay, TO_CHAR(thoigian,'HH24:MI:SS') AS gio, nguoidung, manguoidung, hanhdong, doituong, chitiet", map: r => ({ id: String(r.manhatky), date: str(r.ngay), time: str(r.gio), user: str(r.nguoidung), userId: str(r.manguoidung), action: str(r.hanhdong), target: str(r.doituong), detail: str(r.chitiet) }) },
  wishlist: { id: 'madausach', from: 'tusachcanhan', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), addedAt: date(r.ngaythem) }) },
  waitingList: { id: 'madausach', from: 'danhsachcho', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), registeredAt: date(r.ngaydangky), position: Number(r.thutu ?? 0), status: str(r.trangthai) }) },
  suggestions: { id: 'id', from: 'phieudexuat p JOIN chitietdexuat ct ON ct.madexuat=p.madexuat', select: 'p.madexuat AS id, p.mabandoc AS reader_id, p.ngaydexuat AS submitted_at, p.trangthaiduyet AS status, p.lydotuchoi AS rejection_reason, ct.tensach AS title, ct.tacgia AS author, ct.nhaxuatban AS publisher, ct.namxuatban AS publication_year, ct.soluongdexuat AS requested_quantity, ct.lydodexuat AS reason, ct.lanxuatban AS edition, ct.isbn, ct.anhbia AS cover_url', map: r => ({ id: str(r.id), readerId: str(r.reader_id), title: str(r.title), author: str(r.author), publisher: str(r.publisher) ?? '', year: r.publication_year ? String(r.publication_year) : '', quantity: r.requested_quantity ? `${r.requested_quantity} bản` : '—', requestedQuantity: Number(r.requested_quantity ?? 0), edition: str(r.edition) ?? '', isbn: str(r.isbn) ?? '', reason: str(r.reason) ?? '', rejectionReason: str(r.rejection_reason) ?? '', coverUrl: str(r.cover_url) ?? '', status: str(r.status) ?? 'Chờ duyệt', submittedAt: date(r.submitted_at), type: 'Sách / giáo trình' }) }
};

const resourceNames = Object.keys(routes) as Resource[];
function isResource(value: string): value is Resource { return resourceNames.includes(value as Resource); }

const permissionGroups: Record<string, string> = {
  bookTitles: 'books', bookCopies: 'books', categories: 'books',
  importReceipts: 'imports', suppliers: 'imports', publishers: 'imports',
  suggestions: 'suggestions', purchaseRequests: 'suggestions',
  readers: 'readers',
  borrowRequests: 'circulation', loans: 'circulation', readerHistory: 'circulation',
  renewals: 'circulation', waitingList: 'circulation',
  fines: 'fines', employees: 'employees', accounts: 'employees'
};
const permissionActions: Record<string, string> = { GET: 'view', POST: 'add', PUT: 'edit', DELETE: 'del' };
const permissionKeys = [...new Set(Object.values(permissionGroups)), 'reports'];
const permissionStorageKeys = {
  admin: 'admin_permissions_v2',
  librarian: 'staff_permissions_v2'
};

function isPermissionStorageKey(key: string): boolean {
  return Object.values(permissionStorageKeys).includes(key);
}

async function loadStaffPermissions(isAdmin: boolean) {
  const permissionStorageKey = isAdmin ? permissionStorageKeys.admin : permissionStorageKeys.librarian;
  const result = await pool.query('SELECT giatri FROM ixs_cauhinh WHERE macauhinh=$1', [permissionStorageKey]);
  return (result.rows[0]?.giatri ?? {}) as Record<string, Record<string, boolean>>;
}

const permissionGroupByPath = new Map(
  Object.entries(permissionGroups).map(([resource, group]) => [resource.toLowerCase(), group])
);

app.use('/api', async (req, res, next) => {
  const [, resource, , operation] = req.path.toLowerCase().split('/');
  const group = permissionGroupByPath.get(resource);
  if (!group || !getSession(req) || operation === 'reserve') return next();
  const action = req.method === 'POST' && operation ? 'edit' : permissionActions[req.method];
  if (!action) return next();
  try {
    const staffId = await getStaffId(req);
    if (!staffId) return next();
    const permissions = await loadStaffPermissions(Boolean(await getStaffId(req, true)));
    if (permissions[group]?.[action] === false) {
      return res.status(403).json({ error: 'Nhóm của bạn chưa được cấp quyền thực hiện thao tác này.' });
    }
    return next();
  } catch (error) { return next(error); }
});

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (error) { next(error); }
});

app.post('/api/bookTitles/:id/reserve', async (req, res, next) => {
  const bookId = req.params.id;
  const body = req.body as Row;
  let readerId: string | undefined;
  try { readerId = await getReaderId(req); } catch (error) { return next(error); }
  if (!readerId) return res.status(403).json({ error: 'Vui lòng đăng nhập bằng tài khoản bạn đọc.' });
  const preferredCopyId = str(value(body, 'copyId'))?.trim();

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
    if (!isActiveAccount(readerStatus)) {
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
    if (Number(bookResult.rows[0].soluongsan ?? 0) < 1) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Đầu sách này hiện đã hết bản sao sẵn sàng trong kho.' });
    }

    const copyResult = preferredCopyId
      ? await client.query(
          "SELECT macuonsach FROM cuonsach WHERE madausach=$1 AND macuonsach=$2 AND trangthai='SẴN SÀNG' LIMIT 1",
          [bookId, preferredCopyId]
        )
      : await client.query(
          "SELECT macuonsach FROM cuonsach WHERE madausach=$1 AND trangthai='SẴN SÀNG' ORDER BY macuonsach LIMIT 1",
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
      "SELECT mayeucau FROM yeucaumuon WHERE mabandoc=$1 AND madausach=$2 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYỆT') LIMIT 1",
      [resolvedReaderId, bookId]
    );
    if (dupRequest.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Bạn đã gửi yêu cầu mượn đầu sách này và đang chờ thủ thư duyệt.' });
    }

    // Theo Seq 2.8.1: Bạn đọc chỉ ghi nhận yêu cầu mượn ('CHO DUYET'), KHÔNG tự ý chuyển sách sang ĐANG MƯỢN hay lập PHIEUMUON khi chưa qua Thủ thư
    const copyId = String(copyResult.rows[0].macuonsach);
    const requestId = await generateNextCode(client, 'yeucaumuon', 'mayeucau', 'YM');
    await client.query(
      'INSERT INTO yeucaumuon (mayeucau,mabandoc,madausach,macuonsach,trangthai) VALUES ($1,$2,$3,$4,$5)',
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
    const staffId = await getStaffId(req);
    const readerId = staffId ? String(req.query.readerId ?? '') : await getReaderId(req);
    if (!staffId && (!readerId || (req.query.readerId && String(req.query.readerId) !== readerId))) {
      return res.status(403).json({ error: 'Bạn không có quyền xem yêu cầu mượn này.' });
    }
    const result = await pool.query(
      `SELECT r.mayeucau, r.mabandoc, u.hoten AS reader_name, b.tongnophat, a.trangthai AS account_status,
              b.ngayhetthe, r.madausach, d.tensach AS book_title, d.soluongsan, r.macuonsach,
              r.ngayyeucau, r.trangthai, r.lydotuchoi,
              (SELECT COUNT(*)::int FROM phieumuon pm WHERE pm.mabandoc=r.mabandoc AND (LOWER(COALESCE(pm.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(pm.trangthai,'')) LIKE '%quá hạn%')) AS active_loans
       FROM yeucaumuon r
       JOIN bandoc b ON b.mabandoc = r.mabandoc
       JOIN nguoidung u ON u.manguoidung = b.mabandoc
       JOIN taikhoan a ON a.tendangnhap = u.tendangnhap
       JOIN dausach d ON d.madausach = r.madausach
       ${readerId ? 'WHERE r.mabandoc=$1' : ''}
       ORDER BY r.ngayyeucau DESC`,
      readerId ? [readerId] : []
    );
    res.json(result.rows.map(r => ({
      id: str(r.mayeucau),
      requestId: str(r.mayeucau),
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
      requestDate: date(r.ngayyeucau),
      status: str(r.trangthai) ?? 'CHO DUYET',
      rejectionReason: str(r.lydotuchoi) ?? ''
    })));
  } catch (error) { next(error); }
});

app.post('/api/borrowRequests/:id/approve', async (req, res, next) => {
  const requestId = req.params.id;
  const body = req.body as Row;
  let employeeId: string | undefined;
  try { employeeId = await getStaffId(req); } catch (error) { return next(error); }
  if (!employeeId) return res.status(403).json({ error: 'Bạn không có quyền duyệt yêu cầu mượn.' });
  const requestedCopyId = str(value(body, 'copyId', 'maCuonSach'))?.trim();
  const providedLoanId = str(value(body, 'loanId', 'maPhieuMuon'))?.trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loanId = providedLoanId && /^PM\d{3,}$/.test(providedLoanId)
      ? providedLoanId
      : await generateNextCode(client, 'phieumuon', 'maphieumuon', 'PM');
    const reqRes = await client.query(
      'SELECT * FROM yeucaumuon WHERE mayeucau=$1 FOR UPDATE',
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
    if (!isActiveAccount(rInfo.trangthai)) {
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
      "SELECT macuonsach, madausach FROM cuonsach WHERE macuonsach=$1 AND madausach=$2 AND trangthai IN ('SẴN SÀNG','GIỮ CHỜ NGƯỜI CHỜ') FOR UPDATE SKIP LOCKED",
      [targetCopyId, bookId]
    );
    if (!copyRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Cuốn sách vật lý ${targetCopyId} không khả dụng để cho mượn.` });
    }

    const prevWasReady = String((await client.query('SELECT trangthai FROM cuonsach WHERE macuonsach=$1', [targetCopyId])).rows[0]?.trangthai) === 'SẴN SÀNG';
    await client.query("UPDATE cuonsach SET trangthai='ĐANG MƯỢN' WHERE macuonsach=$1", [targetCopyId]);
    if (prevWasReady) {
      await client.query('UPDATE dausach SET soluongsan=GREATEST(COALESCE(soluongsan,0)-1,0) WHERE madausach=$1', [bookId]);
    }
    await client.query(
      `INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, trangthai)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($5 || ' days')::interval, 'Đang mượn')`,
      [loanId, readerId, employeeId, targetCopyId, String(borrowDays)]
    );
    await client.query(
      "UPDATE yeucaumuon SET macuonsach=$1, trangthai='DA DUYET', manhanvienduyet=$3 WHERE mayeucau=$2",
      [targetCopyId, requestId, employeeId]
    );
    await client.query(
      'UPDATE chitietphieumuon SET mayeucau=$1 WHERE maphieumuon=$2 AND macuonsach=$3',
      [requestId, loanId, targetCopyId]
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
    const staffId = await getStaffId(req);
    if (!staffId) return res.status(403).json({ error: 'Bạn không có quyền từ chối yêu cầu mượn.' });
    const reason = str(req.body?.reason)?.trim();
    if (!reason || reason.length > 255) return res.status(400).json({ error: 'Lý do từ chối phải từ 1 đến 255 ký tự.' });
    const result = await pool.query(
      "UPDATE yeucaumuon SET trangthai='TU CHOI', lydotuchoi=$2, manhanvienduyet=$3 WHERE mayeucau=$1 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYỆT')",
      [req.params.id, reason, staffId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Không tìm thấy yêu cầu đang chờ duyệt.' });
    return res.json({ id: req.params.id, status: 'TU CHOI' });
  } catch (error) { next(error); }
});

app.delete('/api/borrowRequests/:id', async (req, res, next) => {
  try {
    const readerId = await getReaderId(req);
    if (!readerId) return res.status(403).json({ error: 'Vui lòng đăng nhập bằng tài khoản bạn đọc.' });
    const result = await pool.query(
      "DELETE FROM yeucaumuon WHERE mayeucau=$1 AND mabandoc=$2 AND UPPER(COALESCE(trangthai,'')) IN ('CHO DUYET','CHỜ DUYET')",
      [req.params.id, readerId]
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
  if (!['NGUYEN_VEN','SON_GAY','HU_HONG','MAT_SACH'].includes(condition)) return res.status(400).json({ error: 'Tình trạng trả sách không hợp lệ.' });
  let employeeId: string | undefined;
  try { employeeId = await getStaffId(req); } catch (error) { return next(error); }
  if (!employeeId) return res.status(403).json({ error: 'Bạn không có quyền ghi nhận trả sách.' });
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
    if (loan.ngaytrathucte || normalizeStatus(loan.trangthai).includes('đa tra')) {
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

    await client.query(
      'UPDATE chitietphieumuon SET tinhtrangkhitra=$1 WHERE maphieumuon=$2 AND macuonsach=$3',
      [condition, loanId, loan.macuonsach]
    );

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
        await client.query(
          'UPDATE dausach SET soluongsan=LEAST(COALESCE(soluongtong, soluongsan+1), COALESCE(soluongsan,0)+1) WHERE madausach=$1',
          [loan.madausach]
        );
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
      const fineId = await generateNextCode(client, 'phieuphat', 'maphieuphat', 'PP');
      const violationText = reasons.join(' + ');
      await client.query(
        "INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, ngaylap, loaivipham, sotien, trangthaithanhtoan) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,'Chưa thanh toán')",
        [fineId, loanId, loan.mabandoc, employeeId, violationText, totalFee]
      );
      const violations = [];
      if (lateDays > 0) violations.push(['Quá hạn', lateDays, null, lateFee]);
      if (condition === 'HU_HONG') violations.push(['Hư hỏng', 0, condition, condFee]);
      if (condition === 'MAT_SACH') violations.push(['Mất sách', 0, null, condFee]);
      for (const [type, days, damage, amount] of violations) {
        await client.query(
          `INSERT INTO chitietphieuphat (machitietphat,maphieuphat,machitietmuon,loaivipham,songayquahan,mucdohuhong,sotienphat)
           SELECT next_library_code('CP','chitietphieuphat','machitietphat'),$1,machitietmuon,$2,$3,$4,$5 FROM chitietphieumuon WHERE maphieumuon=$6 AND macuonsach=$7`,
          [fineId, type, days, damage, amount, loanId, loan.macuonsach]
        );
      }
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
    if (!await getStaffId(req)) return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    await client.query('BEGIN');
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
    const generatedCopies: Row[] = [];
    for (const item of itemsRes.rows) {
      const bookId = String(item.madausach);
      const qty = Number(item.soluongnhap ?? 0);
      const price = Number(item.dongia ?? 0);
      const titleRes = await client.query('SELECT tensach, anhbia FROM dausach WHERE madausach=$1', [bookId]);
      const titleName = String(titleRes.rows[0]?.tensach ?? bookId);
      const coverUrl = str(titleRes.rows[0]?.anhbia) ?? '';
      for (let i = 0; i < qty; i++) {
        const copyId = await generateNextCode(client, 'cuonsach', 'macuonsach', 'CS');
        await client.query(
          "INSERT INTO cuonsach (macuonsach, madausach, mavach, tinhtrangvatly, trangthai, vitriluutru, gia, anhbia) VALUES ($1,$2,$3,'TỐT','SẴN SÀNG','A1 - Ngăn 1',$4,$5) ON CONFLICT (macuonsach) DO NOTHING",
          [copyId, bookId, copyId, price, coverUrl]
        );
        generatedCopies.push({ id: copyId, bookId, bookTitle: titleName, physicalStatus: 'TỐT', circulationStatus: 'SẴN SÀNG', location: 'A1 - Ngăn 1', price });
      }
      await client.query(
        'UPDATE dausach SET soluongtong=COALESCE(soluongtong,0)+$1, soluongsan=COALESCE(soluongsan,0)+$1 WHERE madausach=$2',
        [qty, bookId]
      );
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
    if (!await getStaffId(req)) return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    await client.query('BEGIN');
    const copyRes = await client.query('SELECT macuonsach, madausach, trangthai FROM cuonsach WHERE macuonsach=$1 FOR UPDATE', [copyId]);
    if (!copyRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy cuốn sách.' });
    }
    const copy = copyRes.rows[0];
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
      await client.query('UPDATE dausach SET soluongsan=GREATEST(COALESCE(soluongsan,0)-1,0) WHERE madausach=$1', [copy.madausach]);
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
    if (isPermissionStorageKey(req.params.key)) return res.sendStatus(404);
    if (req.params.key === 'permissions') {
      if (!await getStaffId(req, req.query.role === 'admin')) return res.status(403).json({ error: 'Bạn không có quyền xem cấu hình phân quyền.' });
      return res.json({ key: 'permissions', value: await loadStaffPermissions(req.query.role === 'admin') });
    }
    const result = await pool.query('SELECT giatri FROM ixs_cauhinh WHERE macauhinh=$1', [req.params.key]);
    res.json({ key: req.params.key, value: result.rows[0]?.giatri ?? null });
  } catch (error) { next(error); }
});

app.put('/api/config/:key', async (req, res, next) => {
  try {
    const isPermissions = req.params.key === 'permissions';
    if (isPermissionStorageKey(req.params.key) || !await getStaffId(req, isPermissions)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    }
    const configValue = value(req.body as Row, 'value');
    if (configValue === null) return res.status(400).json({ error: 'value is required' });
    if (isPermissions) {
      const valid = typeof configValue === 'object' && !Array.isArray(configValue)
        && Object.entries(configValue).every(([group, actions]) =>
          permissionKeys.includes(group) && actions && typeof actions === 'object' && !Array.isArray(actions)
          && Object.entries(actions).every(([action, allowed]) =>
            Object.values(permissionActions).includes(action) && typeof allowed === 'boolean'
          )
        );
      if (!valid) return res.status(400).json({ error: 'Cấu hình phân quyền không hợp lệ.' });
    }
    await pool.query(
      'INSERT INTO ixs_cauhinh (macauhinh, giatri) VALUES ($1, $2::jsonb) ON CONFLICT (macauhinh) DO UPDATE SET giatri=EXCLUDED.giatri, capnhatluc=NOW()',
      [isPermissions ? permissionStorageKeys[req.query.role === 'admin' ? 'admin' : 'librarian'] : req.params.key, JSON.stringify(configValue)]
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
    if (!isActiveAccount(account.trangthai)) {
      return res.status(403).json({ error: 'Tài khoản đang chờ duyệt, bị từ chối hoặc đã bị khóa.' });
    }
    if (passwordResult.needsUpgrade) {
      await pool.query('UPDATE taikhoan SET matkhau=$1 WHERE tendangnhap=$2', [hashPassword(password), account.tendangnhap]);
    }
    const user = {
      id: String(account.manguoidung ?? account.tendangnhap),
      username: String(account.tendangnhap),
      fullName: String(account.hoten ?? account.tendangnhap),
      name: String(account.hoten ?? account.tendangnhap),
      role: account.manhanvien ? (isAdminRole(account.vaitro) ? 'QUẢN TRỊ VIÊN' : 'THỦ THƯ') : String(account.vaitro),
      accountType: account.mabandoc ? 'reader' : account.manhanvien ? 'employee' : 'account',
      email: String(account.email ?? ''),
      phone: String(account.sodienthoai ?? ''),
      cccd: String(account.cccd ?? '')
    };
    const now = Date.now();
    for (const [expiredToken, session] of sessions) {
      if (session.expiresAt <= now) sessions.delete(expiredToken);
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { username: user.username, expiresAt: now + 8 * 60 * 60 * 1000 });
    return res.json({ user, token });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  return res.sendStatus(204);
});

app.post('/api/readers/:id/registration-decision', async (req, res, next) => {
  try {
    if (!await getStaffId(req)) return res.status(403).json({ error: 'Chỉ thủ thư hoặc quản trị viên được xét duyệt đăng ký.' });
    const { decision } = req.body ?? {};
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ error: 'Quyết định xét duyệt không hợp lệ.' });
    }
    const status = decision === 'approve' ? 'ACTIVE' : 'REJECTED';
    const result = await pool.query(
      `UPDATE taikhoan a SET trangthai=$1
       FROM nguoidung u JOIN bandoc b ON b.mabandoc=u.manguoidung
       WHERE u.tendangnhap=a.tendangnhap AND b.mabandoc=$2 AND a.trangthai='PENDING'`,
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Tài khoản không còn chờ duyệt.' });
    return res.json({ id: req.params.id, status });
  } catch (error) { next(error); }
});

app.post('/api/auth/password/change', async (req, res, next) => {
  try {
    const username = getSession(req)?.username;
    if (!username) return res.status(401).json({ error: 'Vui lòng đăng nhập lại.' });
    const currentPassword = str(req.body?.currentPassword);
    const newPassword = str(req.body?.newPassword);
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ error: 'username, currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must contain at least 8 characters' });
    const result = await pool.query('SELECT matkhau,trangthai FROM taikhoan WHERE LOWER(tendangnhap)=LOWER($1)', [username]);
    const account = result.rows[0];
    if (!account || !verifyPassword(currentPassword, String(account.matkhau)).valid) return res.status(401).json({ error: 'Current password is incorrect' });
    if (!isActiveAccount(account.trangthai)) return res.status(403).json({ error: 'Tài khoản không hoạt động.' });
    await pool.query('UPDATE taikhoan SET matkhau=$1 WHERE LOWER(tendangnhap)=LOWER($2)', [hashPassword(newPassword), username]);
    return res.json({ message: 'Password updated successfully' });
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
    const email = str(req.body?.email)?.trim().toLowerCase() ?? '';
    const gender = str(req.body?.gender)?.trim() || 'Nam';
    const readerType = str(req.body?.readerType)?.trim() || 'Sinh viên';
    const dob = dateValue(req.body?.dob);
    const address = str(req.body?.address)?.trim() || null;
    if (!name || !username || !password || !phone) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, tên đăng nhập, số điện thoại và mật khẩu.' });
    if (name.length > 255) return res.status(400).json({ error: 'Họ và tên không được vượt quá 255 ký tự.' });
    if (username.length < 3 || /\s/.test(username)) return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự và không chứa khoảng trắng.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
    if (!isValidCccd(cccd)) return res.status(400).json({ error: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' });
    if (!['Nam', 'Nữ', 'Khác'].includes(gender) || !['Sinh viên', 'Giảng viên', 'Khách tự do'].includes(readerType)) {
      return res.status(400).json({ error: 'Giới tính hoặc đối tượng bạn đọc không hợp lệ.' });
    }
    if (dob) {
      const parsedDob = new Date(dob + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob.startsWith('0000-') || !Number.isFinite(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dob || dob > new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })) {
        return res.status(400).json({ error: 'Ngày sinh không hợp lệ.' });
      }
    }
    if (password.length < 8) return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 8 ký tự.' });
    if (!/^\d{10,11}$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại phải gồm 10 hoặc 11 chữ số.' });

    await client.query('BEGIN');
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock(781235901246::bigint)");
    const existingAccount = await client.query('SELECT 1 FROM taikhoan WHERE LOWER(tendangnhap)=$1', [username]);
    if (existingAccount.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng.' });
    }
    const dupCheck = await client.query(
      `SELECT manguoidung FROM nguoidung
       WHERE regexp_replace(COALESCE(sodienthoai,''), '[^0-9]', '', 'g')=$1
          OR ($2 <> '' AND LOWER(COALESCE(email,''))=$2)
          OR ($3 <> '' AND COALESCE(cccd,'')=$3)
       LIMIT 1`,
      [phone, email ?? '', cccd ?? '']
    );
    if (dupCheck.rowCount) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({ error: 'Số điện thoại, Email hoặc CCCD đã được sử dụng trong hệ thống.' });
    }

    const id = await generateNextCode(client, 'nguoidung', 'manguoidung', 'BD');
    await client.query('INSERT INTO taikhoan (tendangnhap,matkhau,vaitro,trangthai) VALUES ($1,$2,$3,$4)', [username, hashPassword(password), 'BẠN ĐỌC', 'PENDING']);
    await client.query('INSERT INTO nguoidung (manguoidung,tendangnhap,hoten,email,sodienthoai,cccd,gioitinh,ngaysinh,diachi,anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, username, name, email, phone, cccd, gender, dob, address, req.body.avatarUrl ?? null]);
    await client.query("INSERT INTO bandoc (mabandoc,loaibandoc,tongnophat,ngaycapthe,ngayhetthe) VALUES ($1,$2,0,CURRENT_DATE,CURRENT_DATE + INTERVAL '1 year')", [id, readerType]);
    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({ user: { id, username, fullName: name, name, role: 'BẠN ĐỌC', status: 'PENDING', accountType: 'reader', email: email ?? '', phone, cccd: cccd ?? '' } });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.get('/api/fines/:id', async (req, res, next) => {
  try {
    const staffId = await getStaffId(req);
    const readerId = staffId ? undefined : await getReaderId(req);
    if (!staffId && !readerId) return res.status(403).json({ error: 'Vui lòng đăng nhập để xem phiếu phạt.' });
    const route = routes.fines;
    const result = await pool.query(
      `SELECT ${route.select} FROM ${route.from}
       WHERE fp.maphieuphat=$1${readerId ? ' AND fp.mabandoc=$2' : ''}`,
      readerId ? [req.params.id, readerId] : [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Không tìm thấy phiếu phạt.' });
    const details = await pool.query(
      `SELECT ct.loaivipham AS violation, ct.songayquahan AS "lateDays",
              ct.mucdohuhong AS damage, ct.sotienphat AS amount, loan.macuonsach AS "copyId"
       FROM chitietphieuphat ct JOIN chitietphieumuon loan USING (machitietmuon)
       WHERE ct.maphieuphat=$1 ORDER BY ct.machitietphat`,
      [req.params.id]
    );
    return res.json({ ...route.map(result.rows[0]), details: details.rows });
  } catch (error) { next(error); }
});

app.get('/api/:resource', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    if (['employees', 'accounts'].includes(requested) && !await getStaffId(req, true)) {
      return res.status(403).json({ error: 'Chỉ quản trị viên được quản lý nhân viên.' });
    }
    const route = routes[requested];
    if (requested === 'readers' || requested === 'employees' || requested === 'loans' || requested === 'renewals') {
      const staffId = await getStaffId(req);
      const readerId = staffId ? String(req.query.readerId ?? '') : await getReaderId(req);
      if (!staffId && (!readerId || requested === 'employees' || (req.query.readerId && String(req.query.readerId) !== readerId))) {
        return res.status(403).json({ error: 'Bạn không có quyền xem dữ liệu này.' });
      }
      if (requested === 'readers' || requested === 'employees') {
        const result = await pool.query(
          `SELECT ${route.select} FROM ${route.from}
           WHERE UPPER(COALESCE(a.trangthai,'')) <> 'DELETED'${readerId && requested === 'readers' ? ' AND b.mabandoc=$1' : ''}`,
          readerId && requested === 'readers' ? [readerId] : []
        );
        return res.json(result.rows.map(route.map));
      }
      if (requested === 'renewals') {
        const result = await pool.query(
          `SELECT y.* FROM yeucaugiahan y JOIN phieumuon p ON p.maphieumuon=y.maphieumuon${readerId ? ' WHERE p.mabandoc=$1' : ''}`,
          readerId ? [readerId] : []
        );
        return res.json(result.rows.map(route.map));
      }
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE p.mabandoc=$1' : ''}`, readerId ? [readerId] : []);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'fines') {
      const staffId = await getStaffId(req);
      const readerId = staffId ? String(req.query.readerId ?? '') : await getReaderId(req);
      if (!staffId && (!readerId || (req.query.readerId && String(req.query.readerId) !== readerId))) {
        return res.status(403).json({ error: 'Bạn không có quyền xem dữ liệu của bạn đọc này.' });
      }
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE fp.mabandoc=$1' : ''}`, readerId ? [readerId] : []);
      return res.json(result.rows.map(route.map));
    }
    if (requested === 'suggestions') {
      const staffId = await getStaffId(req);
      const readerId = staffId ? String(req.query.readerId ?? '') : await getReaderId(req);
      if (!staffId && (!readerId || (req.query.readerId && String(req.query.readerId) !== readerId))) {
        return res.status(403).json({ error: 'Bạn không có quyền xem dữ liệu của bạn đọc này.' });
      }
      const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${readerId ? ' WHERE p.mabandoc=$1' : ''} ORDER BY submitted_at DESC`, readerId ? [readerId] : []);
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
    const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${requested === 'importReceipts' ? ' GROUP BY p.maphieunhap' : ''}`);
    res.json(result.rows.map(route.map));
  } catch (error) { next(error); }
});

app.post('/api/:resource', async (req, res, next) => {
  try {
    const requested = req.params.resource === 'readerHistory' ? 'loans' : req.params.resource;
    if (!isResource(requested)) return res.status(404).json({ error: 'Unknown resource' });
    const resource = requested;
    if (['loans', 'bookTitles', 'bookCopies', 'suppliers', 'importReceipts', 'purchaseRequests', 'categories'].includes(resource) && !await getStaffId(req)) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật dữ liệu nghiệp vụ này.' });
    }
    const body = req.body as Row;
    if (resource === 'readers' || resource === 'employees') {
      if (!await getStaffId(req, resource === 'employees')) return res.status(403).json({ error: 'Bạn không có quyền quản lý hồ sơ.' });
      const reader = resource === 'readers';
      const role = reader ? 'BẠN ĐỌC' : isAdminRole(value(body, 'role', 'vaitro')) ? 'QUẢN TRỊ VIÊN' : 'THỦ THƯ';
      const id = await generateNextCode(pool, 'nguoidung', 'manguoidung', reader ? 'BD' : 'NV');
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
      const username = reader ? requestedUsername : id;
      const password = role === 'THỦ THƯ' ? librarianInitialPassword(dobVal) : str(value(body, 'password', 'matkhau'));
      if (!password && role === 'THỦ THƯ') return res.status(400).json({ error: 'Cần ngày sinh hợp lệ để tạo mật khẩu ban đầu của thủ thư.' });
      if (!username || !password || password.length < 8) {
        return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu tối thiểu 8 ký tự là bắt buộc khi cấp tài khoản.' });
      }
      const status = reader ? str(value(body, 'status', 'trangthai')) ?? 'HOẠT ĐỘNG' : 'ACTIVE';
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existingAcc = await client.query('SELECT 1 FROM taikhoan WHERE LOWER(tendangnhap)=LOWER($1)', [username]);
        if (existingAcc.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng.' });
        }
        await client.query('INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai) VALUES ($1, $2, $3, $4)', [username, hashPassword(password), role, status]);
        await client.query('INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi, anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, username, name, str(value(body, 'email')), str(value(body, 'phone', 'sodienthoai')), str(value(body, 'cccd')), value(body, 'gender', 'gioiTinh'), dateValue(value(body, 'dob', 'ngaySinh')), str(value(body, 'address', 'diaChi')), str(value(body, 'avatarUrl', 'anhDaiDien'))]);
        if (reader) await client.query('INSERT INTO bandoc (mabandoc, loaibandoc, tongnophat, ngaycapthe, ngayhetthe) VALUES ($1, $2, $3, $4, $5)', [id, str(value(body, 'readerType', 'loaibandoc')), Number(value(body, 'outstandingFine', 'tongnophat') ?? 0), dateValue(value(body, 'issueDate', 'ngayCapThe')), dateValue(value(body, 'expiryDate', 'ngayHetHanThe'))]);
        else await client.query('INSERT INTO nhanvien (manhanvien, chucvu, dantoc, trangthailamviec) VALUES ($1, $2, $3, $4)', [id, str(value(body, 'position', 'chucvu')), value(body, 'ethnicity', 'danToc'), str(value(body, 'employmentStatus', 'trangthailamviec')) ?? 'ĐANG LÀM']);
        await client.query('COMMIT');
        return res.status(201).json({ id, username, name, role, hasAccount: true, status });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'bookTitles') {
      const rawId = str(value(body, 'id', 'maDauSach'))?.trim();
      const id = rawId || await generateNextCode(pool, 'dausach', 'madausach', 'DS');
      if (!/^DS\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã đầu sách phải đúng định dạng DS001, DS002...' });
      const categoryId = await resolveCategoryId(value(body, 'categoryId', 'category', 'maDanhMuc'));
      const title = str(value(body, 'title', 'tenSach'))?.trim();
      if (!id || !categoryId || !title) return res.status(400).json({ error: 'Mã đầu sách, thể loại và tên sách là bắt buộc.' });
      const total = Number(value(body, 'total', 'totalCopies', 'soLuongTong') ?? 0);
      const available = Number(value(body, 'available', 'availableCopies', 'soLuongSan') ?? 0);
      const publishYearRaw = value(body, 'publishYear', 'namXuatBan');
      const publishYear = publishYearRaw ? Number(publishYearRaw) : 2021;
      if (!Number.isInteger(total) || total < 0 || !Number.isInteger(available) || available < 0 || available > total) {
        return res.status(400).json({ error: 'Số lượng tổng và số lượng sẵn có phải là số nguyên không âm và số sẵn có không vượt quá tổng.' });
      }
      if (!Number.isInteger(publishYear) || publishYear < 1800 || publishYear > 2100) {
        return res.status(400).json({ error: 'Năm xuất bản phải nằm trong khoảng 1800 đến 2100.' });
      }
      await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,namxuatban,anhbia,phienban,gia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)', [id, categoryId, title, value(body, 'authors', 'author', 'tacGia'), value(body, 'genre', 'theLoai'), value(body, 'subject', 'chuDe'), value(body, 'faculty', 'khoa'), total, available, value(body,'publisher','nhaXuatBan'), publishYear, value(body,'coverUrl'), str(value(body,'edition','phienban')), value(body,'price','gia') ?? null]);
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'categories') {
      const id = await generateNextCode(pool, 'danhmuc', 'madanhmuc', 'DM'); const name = str(value(body, 'name', 'tenDanhMuc'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      await pool.query('INSERT INTO danhmuc (madanhmuc, tendanhmuc) VALUES ($1,$2)', [id, name]);
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'bookCopies') {
      const rawId = str(value(body, 'id', 'maCuonSach'))?.trim();
      const id = rawId || await generateNextCode(pool, 'cuonsach', 'macuonsach', 'CS');
      if (!/^CS\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã cuốn sách phải đúng định dạng CS001, CS002...' });
      const bookId = str(value(body, 'bookId', 'bookTitleId', 'maDauSach'))?.trim();
      if (!id || !bookId) return res.status(400).json({ error: 'Mã cuốn sách và mã đầu sách là bắt buộc.' });
      const priceNum = Number(String(value(body, 'price') ?? 0).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Giá trị cuốn sách phải là số không âm.' });
      const titleExists = await pool.query('SELECT 1 FROM dausach WHERE madausach=$1 LIMIT 1', [bookId]);
      if (!titleExists.rowCount) return res.status(404).json({ error: `Đầu sách ${bookId} không tồn tại.` });
      await pool.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, bookId, value(body, 'barcode', 'maVach') ?? id, value(body, 'physicalStatus', 'physicalCondition', 'tinhTrangVatLy'), value(body, 'circulationStatus', 'status', 'trangThai'), value(body, 'location', 'viTriLuuTru'), priceNum, value(body,'coverUrl')]);
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'loans') {
      const rawId = str(value(body, 'id', 'maPhieuMuon'))?.trim();
      const id = rawId || await generateNextCode(pool, 'phieumuon', 'maphieumuon', 'PM');
      if (!/^PM\d{3,}$/.test(id)) return res.status(400).json({ error: 'Mã phiếu mượn phải đúng định dạng PM001, PM002...' });
      const readerId = str(value(body, 'readerId', 'maBanDoc'))?.trim();
      const employeeId = str(value(body, 'employeeId', 'maNhanVien'))?.trim() || 'NV001';
      const copyId = str(value(body, 'copyId', 'maCuonSach'))?.trim();
      if (!id || !readerId || !copyId) return res.status(400).json({ error: 'Mã phiếu mượn, mã bạn đọc và mã cuốn sách là bắt buộc.' });
      const borrowIso = dateValue(value(body,'borrowDate','ngayMuon'));
      const dueIso = dateValue(value(body,'dueDate','ngayHenTra'));
      if (borrowIso && dueIso && new Date(dueIso) < new Date(borrowIso)) {
        return res.status(400).json({ error: 'Hạn trả không được nhỏ hơn ngày mượn.' });
      }
      const maxBorrow = Number(value(body, 'maxBorrowBooks') ?? 5);
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
        if (!isActiveAccount(r.account_status)) {
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
          [id, readerId, employeeId, copyId, borrowIso, dueIso, dateValue(value(body,'returnDate','ngayTraThucTe')), value(body,'status','trangThai') ?? 'Đang mượn']
        );
        await client.query("UPDATE cuonsach SET trangthai='ĐANG MƯỢN' WHERE macuonsach=$1", [copyId]);
        if (copyNorm === 'san sang' || copyNorm === 'co san') {
          await client.query('UPDATE dausach SET soluongsan = GREATEST(0, COALESCE(soluongsan, 0) - 1) WHERE madausach=$1', [copyRes.rows[0].madausach]);
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
      const employeeId = await getStaffId(req);
      if (!employeeId) return res.status(403).json({ error: 'Bạn không có quyền cập nhật phiếu phạt.' });
      const id = await generateNextCode(pool, 'phieuphat', 'maphieuphat', 'PP'); const loanId = str(value(body, 'loanId', 'maPhieuMuon')) || null;
      const readerId = str(value(body, 'readerId', 'maBanDoc'))?.trim();
      if (!id || !readerId || !loanId) return res.status(400).json({ error: 'Mã phiếu phạt, mã phiếu mượn và mã bạn đọc là bắt buộc.' });
      const fineAmount = Number(value(body,'amount','soTien') ?? 0);
      if (!Number.isFinite(fineAmount) || fineAmount < 0) return res.status(400).json({ error: 'Số tiền phạt phải lớn hơn hoặc bằng 0.' });
      const payStatus = 'Chưa thanh toán';
      const violation = str(value(body,'violation','loaiViPham'))?.trim();
      if (!violation || violation.length > 255) return res.status(400).json({ error: 'Nội dung vi phạm không hợp lệ.' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const detail = await client.query(
          `SELECT ct.machitietmuon FROM chitietphieumuon ct
           JOIN phieumuon pm ON pm.maphieumuon=ct.maphieumuon
           WHERE pm.maphieumuon=$1 AND pm.mabandoc=$2 AND ct.macuonsach=pm.macuonsach`,
          [loanId, readerId]
        );
        if (!detail.rowCount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Phiếu mượn không thuộc bạn đọc đã chọn.' });
        }
        await client.query('INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, ngaylap, loaivipham, sotien, trangthaithanhtoan) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_TIMESTAMP),$6,$7,$8)', [id, loanId, readerId, employeeId, dateValue(value(body,'ngayLap','date','createdDate')), violation, fineAmount, payStatus]);
        await client.query(
          `INSERT INTO chitietphieuphat (machitietphat,maphieuphat,machitietmuon,loaivipham,sotienphat) VALUES (next_library_code('CP','chitietphieuphat','machitietphat'),$1,$2,$3,$4)`,
          [id, detail.rows[0].machitietmuon, violation, fineAmount]
        );
        await client.query('UPDATE bandoc SET tongnophat = COALESCE(tongnophat, 0) + $1 WHERE mabandoc=$2', [fineAmount, readerId]);
        await client.query('COMMIT');
        return res.status(201).json({ ...body, id, paymentStatus: payStatus });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'renewals') {
      const id = await generateNextCode(pool, 'yeucaugiahan', 'magiahan', 'GH');
      const loanId = str(value(body, 'loanId', 'maPhieuMuon'))?.trim();
      const requestDate = value(body, 'requestDate', 'ngayYeuCau');
      const readerId = await getReaderId(req);
      if (!readerId) return res.status(403).json({ error: 'Vui lòng đăng nhập bằng tài khoản bạn đọc.' });
      const days = Number(value(body, 'days', 'soNgayGiaHan'));
      const maxRenewals = Number(value(body, 'maxRenewals') ?? 2);
      if (!id || !loanId || !requestDate || !Number.isInteger(days) || days < 1 || days > 30) {
        return res.status(400).json({ error: 'Yêu cầu gia hạn cần mã gia hạn, mã phiếu mượn, ngày yêu cầu và số ngày gia hạn từ 1 đến 30.' });
      }
      const loanRes = await pool.query(
        `SELECT pm.maphieumuon, pm.ngayhentra, pm.trangthai, c.madausach, ct.machitietmuon
         FROM phieumuon pm
         JOIN cuonsach c ON c.macuonsach = pm.macuonsach
         JOIN chitietphieumuon ct ON ct.maphieumuon=pm.maphieumuon AND ct.macuonsach=pm.macuonsach
         WHERE pm.maphieumuon=$1 AND pm.mabandoc=$2 LIMIT 1`,
        [loanId, readerId]
      );
      if (!loanRes.rowCount) {
        return res.status(404).json({ error: `Không tìm thấy phiếu mượn ${loanId}.` });
      }
      const loanRow = loanRes.rows[0];
      const loanNorm = normalizeStatus(loanRow.trangthai);
      if (loanNorm.includes('da tra') || loanNorm.includes('đa tra') || loanNorm.includes('mat')) {
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
        'INSERT INTO yeucaugiahan (magiahan, maphieumuon, ngayyeucau, songaygiahan, trangthaiduyet, machitietmuon) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, loanId, dateValue(requestDate), days, 'CHO DUYET', loanRow.machitietmuon]
      );
      return res.status(201).json({ ...body, id, status: 'CHO DUYET' });
    }
    if (resource === 'importReceipts') {
      const id = await generateNextCode(pool, 'phieunhap', 'maphieunhap', 'PN');
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
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'purchaseRequests') {
      const id = await generateNextCode(pool, 'phieudexuat', 'madexuat', 'DX');
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
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'suggestions') {
      const id = await generateNextCode(pool, 'phieudexuat', 'madexuat', 'DX');
      const readerId = str(value(body, 'readerId', 'reader_id', 'mabandoc'))?.trim();
      if (!readerId || readerId !== await getReaderId(req)) {
        return res.status(403).json({ error: 'Bạn đọc chỉ có thể gửi đề xuất cho tài khoản của mình.' });
      }
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
      const status = 'Chờ duyệt';
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO phieudexuat (madexuat, mabandoc, thongtinsach, ngaydexuat, trangthaiduyet)
           VALUES ($1,$2,LEFT($3,255),CURRENT_TIMESTAMP,$4)`,
          [id, readerId, title, status]
        );
        await client.query(
          `INSERT INTO chitietdexuat
           (machitietdexuat,madexuat,tensach,tacgia,nhaxuatban,namxuatban,soluongdexuat,lydodexuat,lanxuatban,isbn,anhbia)
           VALUES (next_library_code('CD','chitietdexuat','machitietdexuat'),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, title, author, publisher, year, requestedQuantity ?? 1, reason, edition, isbn, coverUrl]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      return res.status(201).json({ ...body, id, readerId, status });
    }
    if (resource === 'wishlist' || resource === 'waitingList') {
      const readerId = str(value(body, 'readerId', 'mabandoc')); const bookId = str(value(body, 'bookTitleId', 'madausach'));
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId are required' });
      if (resource === 'wishlist') {
        const dup = await pool.query('SELECT 1 FROM tusachcanhan WHERE mabandoc=$1 AND madausach=$2', [readerId, bookId]);
        if (dup.rowCount) return res.status(409).json({ error: 'Sách đã có trong tủ sách cá nhân.' });
        const added = await pool.query('INSERT INTO tusachcanhan (mabandoc, madausach) VALUES ($1,$2) RETURNING ngaythem', [readerId, bookId]);
        return res.status(201).json({ id: bookId, readerId, bookTitleId: bookId, addedAt: date(added.rows[0].ngaythem) });
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
        const status = str(value(body, 'status')) || 'DANG CHO';
        await pool.query('INSERT INTO danhsachcho (mabandoc, madausach, ngaydangky, thutu, trangthai) VALUES ($1,$2,COALESCE($3::timestamp, CURRENT_TIMESTAMP),$4,$5)', [readerId, bookId, value(body, 'registeredAt'), nextPos, status]);
      }
      return res.status(201).json({ ...body, id: `${readerId}:${bookId}` });
    }
    if (resource === 'suppliers') {
      const id = await generateNextCode(pool, 'nhacungcap', 'manhacungcap', 'NC');
      const name = str(value(body, 'name', 'tenNhaCungCap'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      if (!id || !name) return res.status(400).json({ error: 'Mã và tên nhà cung cấp là bắt buộc.' });
      if (emailVal && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Email nhà cung cấp không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại nhà cung cấp phải gồm 10 hoặc 11 chữ số.' });
      await pool.query('INSERT INTO nhacungcap (manhacungcap,tennhacungcap,nguoilienhe,sodienthoai,email,diachi,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,value(body,'contact','nguoiLienHe'),phoneVal || null,emailVal || null,value(body,'address','diaChi'),value(body,'status','trangThai')]);
      return res.status(201).json({ ...body, id });
    }
    if (resource === 'publishers') {
      const id = await generateNextCode(pool, 'nhaxuatban', 'manhaxuatban', 'XB');
      const name = str(value(body, 'name', 'tenNhaXuatBan'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      if (!id || !name) return res.status(400).json({ error: 'Mã và tên nhà xuất bản là bắt buộc.' });
      if (emailVal && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Email nhà xuất bản không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại nhà xuất bản phải gồm 10 hoặc 11 chữ số.' });
      await pool.query('INSERT INTO nhaxuatban (manhaxuatban,tennhaxuatban,sodienthoai,email,diachi,ghichu,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,phoneVal || null,emailVal || null,value(body,'address','diaChi'),value(body,'note','ghiChu'),value(body,'status','trangThai')]);
      return res.status(201).json({ ...body, id });
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
    if (['loans', 'bookTitles', 'bookCopies', 'suppliers', 'importReceipts', 'purchaseRequests', 'categories'].includes(resource) && !await getStaffId(req)) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật dữ liệu nghiệp vụ này.' });
    }
    if (resource === 'categories') {
      await pool.query('INSERT INTO danhmuc (madanhmuc,tendanhmuc) VALUES ($1,$2) ON CONFLICT (madanhmuc) DO UPDATE SET tendanhmuc=EXCLUDED.tendanhmuc', [id, value(body,'name','tenDanhMuc')]);
      return res.json({ ...body, id });
    }
    if (resource === 'suppliers') {
      const result = await pool.query('UPDATE nhacungcap SET tennhacungcap=COALESCE($1,tennhacungcap),nguoilienhe=$2,sodienthoai=$3,email=$4,diachi=$5,trangthai=$6 WHERE manhacungcap=$7', [value(body,'name','tenNhaCungCap'),value(body,'contact','nguoiLienHe'),value(body,'phone','soDienThoai'),value(body,'email'),value(body,'address','diaChi'),value(body,'status','trangThai'),id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
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
      const total = Number(value(body,'total','totalCopies','soLuongTong') ?? 0);
      const available = Number(value(body,'available','availableCopies','soLuongSan') ?? 0);
      const publishYearRaw = value(body,'publishYear','namXuatBan');
      const publishYear = publishYearRaw ? Number(publishYearRaw) : 2021;
      if (!Number.isInteger(total) || total < 0 || !Number.isInteger(available) || available < 0 || available > total) {
        return res.status(400).json({ error: 'Số lượng tổng và số sẵn có không hợp lệ.' });
      }
      if (!Number.isInteger(publishYear) || publishYear < 1800 || publishYear > 2100) {
        return res.status(400).json({ error: 'Năm xuất bản phải nằm trong khoảng 1800 đến 2100.' });
      }
      await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,namxuatban,anhbia,phienban,gia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (madausach) DO UPDATE SET madanhmuc=EXCLUDED.madanhmuc,tensach=EXCLUDED.tensach,tacgia=EXCLUDED.tacgia,theloai=EXCLUDED.theloai,chude=EXCLUDED.chude,khoa=EXCLUDED.khoa,soluongtong=EXCLUDED.soluongtong,soluongsan=EXCLUDED.soluongsan,nhaxuatban=EXCLUDED.nhaxuatban,namxuatban=EXCLUDED.namxuatban,anhbia=EXCLUDED.anhbia,phienban=COALESCE(EXCLUDED.phienban,dausach.phienban),gia=COALESCE(EXCLUDED.gia,dausach.gia)', [id, categoryId, title, value(body,'authors','author','tacGia'), value(body,'genre','theLoai'), value(body,'subject','chuDe'), value(body,'faculty','khoa'), total, available, value(body,'publisher','nhaXuatBan'), publishYear, value(body,'coverUrl'), str(value(body,'edition','phienban')), value(body,'price','gia') ?? null]);
      return res.json({ ...body, id });
    }
    if (resource === 'readers' || resource === 'employees') {
      const reader = resource === 'readers';
      const staffId = await getStaffId(req, !reader);
      if (!staffId && (!reader || id !== await getReaderId(req))) {
        return res.status(403).json({ error: 'Bạn không có quyền cập nhật hồ sơ này.' });
      }
      const username = str(value(body, 'username', 'tenDangNhap'))?.trim();
      const name = str(value(body, 'name', 'hoTen'))?.trim();
      const emailVal = str(value(body, 'email'))?.trim() ?? '';
      const phoneVal = str(value(body, 'phone', 'soDienThoai'))?.trim() ?? '';
      const cccdVal = str(value(body, 'cccd'))?.trim() ?? '';
      const dobVal = value(body, 'dob', 'ngaySinh');
      if (!username || !name) return res.status(400).json({ error: 'Tên đăng nhập và họ tên là bắt buộc.' });
      if (emailVal && emailVal.includes('@') && !isValidEmail(emailVal)) return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      if (phoneVal && !isValidPhone(phoneVal)) return res.status(400).json({ error: 'Số điện thoại phải gồm 10 hoặc 11 chữ số.' });
      if (dobVal && !isValidCalendarDate(dobVal)) return res.status(400).json({ error: 'Ngày sinh không hợp lệ (định dạng DD / MM / YYYY).' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const profileJoin = reader ? 'JOIN bandoc b ON b.mabandoc=u.manguoidung' : 'JOIN nhanvien n ON n.manhanvien=u.manguoidung';
        const current = await client.query(`SELECT u.tendangnhap, u.cccd, a.trangthai, a.vaitro FROM nguoidung u ${profileJoin} JOIN taikhoan a ON a.tendangnhap=u.tendangnhap WHERE u.manguoidung=$1 FOR UPDATE OF a`, [id]);
        if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy hồ sơ cần cập nhật.' }); }
        const oldUsername = current.rows[0].tendangnhap;
        const existingCccd = String(current.rows[0].cccd ?? '').trim();
        if (cccdVal && cccdVal !== existingCccd && !isValidCccd(cccdVal)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' });
        }
        const requestedRole = value(body,'role','vaiTro');
        const role = !reader && requestedRole ? (isAdminRole(requestedRole) ? 'QUẢN TRỊ VIÊN' : 'THỦ THƯ') : null;
        const needsAccount = !reader && ['profile', 'ho so'].includes(normalizeStatus(current.rows[0].trangthai));
        let initialHash: string | null = null;
        if (needsAccount) {
          const isAdmin = isAdminRole(role ?? current.rows[0].vaitro);
          const password = isAdmin ? str(value(body, 'password', 'matkhau')) : librarianInitialPassword(dobVal);
          if (!password || password.length < 8) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: isAdmin ? 'Mật khẩu ban đầu của quản trị viên phải có ít nhất 8 ký tự.' : 'Cần ngày sinh hợp lệ để tạo mật khẩu ban đầu của thủ thư.'
            });
          }
          initialHash = hashPassword(password);
        }
        await client.query('UPDATE nguoidung SET hoten=$1,email=$2,sodienthoai=$3,cccd=$4,gioitinh=$5,ngaysinh=$6,diachi=$7,anhdaidien=$8 WHERE manguoidung=$9', [name, value(body,'email'), value(body,'phone','soDienThoai'), value(body,'cccd'), value(body,'gender','gioiTinh'), dateValue(dobVal), value(body,'address','diaChi'), value(body,'avatarUrl','anhDaiDien'), id]);
        if (staffId) await client.query(
          `UPDATE taikhoan SET vaitro=COALESCE($1,vaitro),
           trangthai=CASE WHEN trangthai IN ('PENDING','REJECTED') THEN trangthai ELSE COALESCE($2,trangthai) END,
           matkhau=COALESCE($4,matkhau) WHERE tendangnhap=$3`,
          [role, needsAccount ? 'ACTIVE' : value(body,'status','trangThai'), oldUsername, initialHash]
        );
        if (staffId && reader) await client.query('UPDATE bandoc SET loaibandoc=$1,tongnophat=COALESCE($2,tongnophat),ngaycapthe=$3,ngayhetthe=$4 WHERE mabandoc=$5', [value(body,'readerType','loaiBanDoc'), value(body,'outstandingFine','tongNoPhat'), dateValue(value(body,'issueDate','ngayCapThe')), dateValue(value(body,'expiryDate','ngayHetHanThe')), id]);
        else if (staffId) await client.query('UPDATE nhanvien SET chucvu=$1,trangthailamviec=$2,dantoc=COALESCE($3,dantoc) WHERE manhanvien=$4', [value(body,'position','chucVu'), value(body,'employmentStatus','trangThaiLamViec'), value(body,'ethnicity','danToc'), id]);
        await client.query('COMMIT');
        return res.json({ id, username: oldUsername, name, role: role ?? current.rows[0].vaitro, status: needsAccount ? 'ACTIVE' : value(body, 'status', 'trangThai') ?? current.rows[0].trangthai });
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
      await pool.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (macuonsach) DO UPDATE SET madausach=EXCLUDED.madausach,mavach=EXCLUDED.mavach,tinhtrangvatly=EXCLUDED.tinhtrangvatly,trangthai=EXCLUDED.trangthai,vitriluutru=EXCLUDED.vitriluutru,gia=EXCLUDED.gia,anhbia=EXCLUDED.anhbia', [id, value(body,'bookId','bookTitleId','maDauSach'), value(body,'barcode','maVach'), value(body,'physicalStatus','physicalCondition','tinhTrangVatLy'), value(body,'circulationStatus','status','trangThai'), value(body,'location','viTriLuuTru'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
      return res.json({ ...body, id });
    }
    if (resource === 'loans') {
      const result = await pool.query('UPDATE phieumuon SET ngayhentra=COALESCE($1,ngayhentra), ngaytrathucte=$2, trangthai=COALESCE($3,trangthai) WHERE maphieumuon=$4', [dateValue(value(body,'dueDate','ngayHenTra')), dateValue(value(body,'returnDate','ngayTraThucTe')), value(body,'status','trangThai'), id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'fines') {
      if (!await getStaffId(req)) return res.status(403).json({ error: 'Bạn không có quyền cập nhật phiếu phạt.' });
      const paymentMethod = str(value(body,'paymentMethod','phuongThucThanhToan'));
      if (paymentMethod !== 'Tiền mặt' && paymentMethod !== 'Chuyển khoản') {
        return res.status(400).json({ error: 'Chọn phương thức xác nhận thanh toán.' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const fineRes = await client.query(
          `UPDATE phieuphat
           SET trangthaithanhtoan='Đã thanh toán', phuongthucthanhtoan=$1, ngaythanhtoan=CURRENT_DATE
           WHERE maphieuphat=$2 AND COALESCE(trangthaithanhtoan,'') NOT IN ('Đã thanh toán','ĐÃ THANH TOÁN','DA_THANH_TOAN')
           RETURNING mabandoc`,
          [paymentMethod, id]
        );
        if (!fineRes.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Phiếu phạt không còn chờ thanh toán.' });
        }
        const readerId = String(fineRes.rows[0].mabandoc);
        const debtRes = await client.query(
          "SELECT COALESCE(SUM(sotien), 0) AS total_debt FROM phieuphat WHERE mabandoc=$1 AND COALESCE(trangthaithanhtoan,'') NOT IN ('Đã thanh toán','ĐÃ THANH TOÁN','DA_THANH_TOAN')",
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
        return res.json({ id, readerId, paymentStatus: 'Đã thanh toán', paymentMethod, outstandingFine: newDebt });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'renewals') {
      const staffId = await getStaffId(req);
      if (!staffId) return res.status(403).json({ error: 'Bạn không có quyền xét duyệt gia hạn.' });
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
        const isApproving = ['da duyet', 'đa duyet'].includes(normNext);
        if (!isApproving && normNext !== 'tu choi') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Quyết định gia hạn không hợp lệ.' });
        }
        if (normalizeStatus(row.trangthaiduyet).replace(/_/g, ' ') !== 'cho duyet') {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Yêu cầu gia hạn không còn chờ duyệt.' });
        }
        if (isApproving && (!Number.isSafeInteger(daysToAdd) || daysToAdd < 1 || daysToAdd > 30)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Số ngày gia hạn không hợp lệ.' });
        }

        if (isApproving) {
          const loanNorm = normalizeStatus(row.loan_status);
          if (loanNorm.includes('da tra') || loanNorm.includes('đa tra') || loanNorm.includes('mat')) {
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
          'UPDATE yeucaugiahan SET trangthaiduyet=COALESCE($1,trangthaiduyet), songaygiahan=COALESCE($2,songaygiahan), manhanvienduyet=$4 WHERE magiahan=$3',
          [nextStatus, daysRaw ?? null, id, staffId]
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
        'UPDATE phieudexuat SET trangthaiduyet=COALESCE($1,trangthaiduyet), lydotuchoi=COALESCE($2,lydotuchoi) WHERE madexuat=$3 AND mabandoc IS NULL',
        [value(body, 'status', 'trangThaiDuyet'), value(body, 'rejectionReason', 'lyDoTuChoi'), id]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'suggestions') {
      const staffId = await getStaffId(req);
      if (!staffId) return res.status(403).json({ error: 'Bạn không có quyền xét duyệt đề xuất.' });
      const decision = normalizeStatus(value(body, 'status', 'trangThaiDuyet'));
      const reason = str(value(body, 'rejectionReason', 'lyDoTuChoi'))?.trim();
      if (!['da duyet', 'đa duyet', 'tu choi'].includes(decision)) return res.status(400).json({ error: 'Quyết định xét duyệt không hợp lệ.' });
      if (decision === 'tu choi' && !reason) return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối.' });
      if (reason && reason.length > 255) return res.status(400).json({ error: 'Lý do từ chối tối đa 255 ký tự.' });
      const result = await pool.query(
        `UPDATE phieudexuat SET trangthaiduyet=$1, lydotuchoi=$2, manhanvien=$4
         WHERE madexuat=$3 AND mabandoc IS NOT NULL
           AND (trangthaiduyet = 'Chờ duyệt' OR UPPER(trangthaiduyet) IN ('CHỜ DUYỆT','CHO DUYET','CHO_DUYET'))`,
        [decision === 'tu choi' ? 'Từ chối' : 'Đã duyệt', decision === 'tu choi' ? reason : null, id, staffId]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'Đề xuất không còn chờ duyệt.' });
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
    if (['loans', 'bookTitles', 'bookCopies', 'suppliers', 'importReceipts', 'purchaseRequests', 'categories', 'renewals', 'suggestions'].includes(resource) && !await getStaffId(req)) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật dữ liệu nghiệp vụ này.' });
    }
    if (resource === 'suggestions') {
      const result = await pool.query('DELETE FROM phieudexuat WHERE madexuat=$1 AND mabandoc IS NOT NULL', [id]);
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
      if (!await getStaffId(req, resource === 'employees')) return res.status(403).json({ error: 'Bạn không có quyền quản lý hồ sơ.' });
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
            "SELECT 1 FROM phieuphat WHERE mabandoc=$1 AND COALESCE(trangthaithanhtoan,'') NOT IN ('Đã thanh toán','ĐÃ THANH TOÁN','DA_THANH_TOAN') LIMIT 1",
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
      const activeCopy = await pool.query("SELECT 1 FROM phieumuon WHERE macuonsach=$1 AND UPPER(COALESCE(trangthai,'')) NOT LIKE '%ĐÃ TRẢ%' LIMIT 1", [id]);
      if (activeCopy.rowCount) return res.status(409).json({ error: 'Không thể xóa cuốn sách đang được mượn.' });
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
    if (resource === 'fines' && !await getStaffId(req)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa phiếu phạt.' });
    }
    const deleteSql: Partial<Record<Resource, string>> = { bookTitles: 'DELETE FROM dausach WHERE madausach=$1', bookCopies: 'DELETE FROM cuonsach WHERE macuonsach=$1', categories: 'DELETE FROM danhmuc WHERE madanhmuc=$1', loans: 'DELETE FROM phieumuon WHERE maphieumuon=$1', renewals: 'DELETE FROM yeucaugiahan WHERE magiahan=$1', purchaseRequests: 'DELETE FROM phieudexuat WHERE madexuat=$1 AND mabandoc IS NULL', fines: 'DELETE FROM phieuphat WHERE maphieuphat=$1', suppliers: 'DELETE FROM nhacungcap WHERE manhacungcap=$1', publishers: 'DELETE FROM nhaxuatban WHERE manhaxuatban=$1', logs: 'DELETE FROM ixs_nhatky WHERE manhatky=$1' };
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
  app.listen(port, () => console.log(`IXS Library API listening on port ${port}`));
}

start().catch(error => {
  console.error('Could not initialize the PostgreSQL schema:', error);
  process.exitCode = 1;
});
