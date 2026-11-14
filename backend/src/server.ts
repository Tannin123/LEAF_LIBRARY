import 'dotenv/config';
import cors from 'cors';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { runMigrations } from './migrations';
import { isOtpProviderConfigured, sendPasswordResetOtp, verifyPasswordResetOtp } from './sms';

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

type PasswordResetChallenge = { username: string; requestId: string; expiresAt: number; attempts: number };
const passwordResetChallenges = new Map<string, PasswordResetChallenge>();
const passwordResetCooldowns = new Map<string, number>();

type Resource = 'readers' | 'employees' | 'bookTitles' | 'bookCopies' | 'loans' | 'renewals' | 'importReceipts' | 'purchaseRequests' | 'fines' | 'categories' | 'accounts' | 'wishlist' | 'waitingList' | 'suppliers' | 'publishers' | 'logs';
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
async function resolveCategoryId(input: unknown): Promise<string | null> {
  const category = str(input)?.trim();
  if (!category) return null;
  const existing = await pool.query('SELECT madanhmuc FROM danhmuc WHERE madanhmuc=$1 OR LOWER(tendanhmuc)=LOWER($1) LIMIT 1', [category]);
  if (existing.rows[0]) return String(existing.rows[0].madanhmuc);
  const id = `CAT${createHash('sha1').update(category.toLocaleLowerCase('vi')).digest('hex').slice(0, 12).toUpperCase()}`;
  await pool.query('INSERT INTO danhmuc (madanhmuc,tendanhmuc) VALUES ($1,$2) ON CONFLICT (madanhmuc) DO NOTHING', [id, category]);
  return id;
}
const routes: Record<Resource, { select: string; from: string; map: (row: Row) => Row; id: string }> = {
  readers: { id: 'mabandoc', from: 'bandoc b JOIN nguoidung u ON u.manguoidung = b.mabandoc JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'b.mabandoc, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, b.loaibandoc, b.tongnophat, b.ngaycapthe, b.ngayhetthe, a.vaitro, a.trangthai', map: r => ({ id: str(r.mabandoc), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), readerType: str(r.loaibandoc), outstandingFine: Number(r.tongnophat ?? 0), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), issueDate: date(r.ngaycapthe), expiryDate: date(r.ngayhetthe), avatarUrl: str(r.anhdaidien) ?? '' }) },
  employees: { id: 'manhanvien', from: 'nhanvien n JOIN nguoidung u ON u.manguoidung = n.manhanvien JOIN taikhoan a ON a.tendangnhap = u.tendangnhap', select: 'n.manhanvien, u.hoten, u.email, u.sodienthoai, u.cccd, u.gioitinh, u.ngaysinh, u.diachi, u.anhdaidien, u.tendangnhap, n.chucvu, n.trangthailamviec, a.vaitro, a.trangthai', map: r => ({ id: str(r.manhanvien), name: str(r.hoten), fullName: str(r.hoten), email: str(r.email), phone: str(r.sodienthoai), cccd: str(r.cccd), username: str(r.tendangnhap), position: str(r.chucvu), employmentStatus: str(r.trangthailamviec), role: str(r.vaitro), status: str(r.trangthai), gender: str(r.gioitinh), dob: date(r.ngaysinh), address: str(r.diachi), avatarUrl: str(r.anhdaidien) ?? '', password: null, hasAccount: !['profile', 'ho so'].includes(normalizeStatus(r.trangthai)) }) },
  bookTitles: { id: 'madausach', from: 'dausach d JOIN danhmuc c ON c.madanhmuc = d.madanhmuc', select: 'd.madausach, d.madanhmuc, c.tendanhmuc, d.tensach, d.tacgia, d.theloai, d.chude, d.khoa, d.soluongtong, d.soluongsan, d.nhaxuatban, d.phienban, d.gia, d.anhbia', map: r => ({ id: str(r.madausach), categoryId: str(r.madanhmuc), category: str(r.tendanhmuc), title: str(r.tensach), authors: str(r.tacgia), author: str(r.tacgia), genre: str(r.theloai), subject: str(r.chude), faculty: str(r.khoa), total: Number(r.soluongtong ?? 0), available: Number(r.soluongsan ?? 0), totalCopies: Number(r.soluongtong ?? 0), availableCopies: Number(r.soluongsan ?? 0), publisher: str(r.nhaxuatban), edition: str(r.phienban), price: r.gia === null ? null : Number(r.gia), coverUrl: str(r.anhbia) ?? '' }) },
  bookCopies: { id: 'macuonsach', from: 'cuonsach c JOIN dausach d ON d.madausach = c.madausach', select: 'c.macuonsach, c.madausach, c.mavach, c.tinhtrangvatly, c.trangthai, c.vitriluutru, c.gia, c.anhbia, d.tensach', map: r => ({ id: str(r.macuonsach), bookId: str(r.madausach), bookTitleId: str(r.madausach), bookTitle: str(r.tensach), barcode: str(r.mavach), physicalStatus: str(r.tinhtrangvatly), physicalCondition: str(r.tinhtrangvatly), circulationStatus: str(r.trangthai), status: str(r.trangthai), location: str(r.vitriluutru), price: r.gia === null ? null : Number(r.gia), coverUrl: str(r.anhbia) ?? '' }) },
  loans: { id: 'maphieumuon', from: 'phieumuon p LEFT JOIN nguoidung u ON u.manguoidung = p.mabandoc JOIN cuonsach c ON c.macuonsach = p.macuonsach JOIN dausach d ON d.madausach = c.madausach', select: 'p.maphieumuon, p.mabandoc, u.hoten, p.manhanvien, p.macuonsach, d.tensach, p.ngaymuon, p.ngayhentra, p.ngaytrathucte, p.trangthai', map: r => ({ id: str(r.maphieumuon), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), readerName: str(r.hoten), employeeId: str(r.manhanvien), copyId: str(r.macuonsach), bookTitle: str(r.tensach), borrowDate: date(r.ngaymuon), dueDate: date(r.ngayhentra), returnDate: date(r.ngaytrathucte), status: str(r.trangthai) }) },
  renewals: { id: 'magiahan', from: 'yeucaugiahan', select: '*', map: r => ({ id: str(r.magiahan), loanId: str(r.maphieumuon), requestDate: date(r.ngayyeucau), days: Number(r.songaygiahan), status: str(r.trangthaiduyet) }) },
  importReceipts: { id: 'maphieunhap', from: 'phieunhap p LEFT JOIN chitietphieunhap ci ON ci.maphieunhap=p.maphieunhap LEFT JOIN dausach d ON d.madausach=ci.madausach', select: 'p.maphieunhap,p.manhanvien,p.ngaynhap,p.trangthai,p.nhacungcap,p.nguoitao,COALESCE(SUM(ci.soluongnhap),p.tongsoluong,0) AS tongsoluong,COALESCE(SUM(ci.soluongnhap*ci.dongia),0) AS tongtien,COALESCE(jsonb_agg(jsonb_build_object(\'bookId\',ci.madausach,\'bookTitle\',d.tensach,\'qty\',ci.soluongnhap,\'unitPrice\',ci.dongia,\'subtotal\',ci.soluongnhap*ci.dongia)) FILTER (WHERE ci.madausach IS NOT NULL),\'[]\'::jsonb) AS items', map: r => ({ id: str(r.maphieunhap), employeeId: str(r.manhanvien), date: date(r.ngaynhap), supplier: str(r.nhacungcap) ?? '', creator: str(r.nguoitao) ?? '', totalBooks: `${Number(r.tongsoluong ?? 0)} cuốn`, totalQuantity: Number(r.tongsoluong ?? 0), totalAmount: `${Number(r.tongtien ?? 0).toLocaleString('vi-VN')} ₫`, status: str(r.trangthai), items: Array.isArray(r.items) ? r.items.map((item: Row) => ({ ...item, unitPrice: `${Number(item.unitPrice ?? 0).toLocaleString('vi-VN')} ₫`, subtotal: `${Number(item.subtotal ?? 0).toLocaleString('vi-VN')} ₫` })) : [] }) },
  purchaseRequests: { id: 'madexuat', from: 'phieudexuat', select: '*', map: r => ({ id: str(r.madexuat), employeeId: str(r.manhanvien), bookInfo: str(r.thongtinsach), date: date(r.ngaydexuat), status: str(r.trangthaiduyet), rejectionReason: str(r.lydotuchoi) }) },
  fines: { id: 'maphieuphat', from: 'phieuphat', select: '*', map: r => ({ id: str(r.maphieuphat), loanId: str(r.maphieumuon), readerId: str(r.mabandoc), employeeId: str(r.manhanvien), violation: str(r.loaivipham), amount: Number(r.sotien), paymentStatus: str(r.trangthaithanhtoan) }) },
  categories: { id: 'madanhmuc', from: 'danhmuc', select: '*', map: r => ({ id: str(r.madanhmuc), name: str(r.tendanhmuc) }) },
  accounts: { id: 'tendangnhap', from: 'taikhoan', select: 'tendangnhap, vaitro, trangthai', map: r => ({ id: str(r.tendangnhap), username: str(r.tendangnhap), role: str(r.vaitro), status: str(r.trangthai) }) },
  suppliers: { id: 'manhacungcap', from: 'nhacungcap', select: '*', map: r => ({ id: str(r.manhacungcap), name: str(r.tennhacungcap), contact: str(r.nguoilienhe), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), status: str(r.trangthai) }) },
  publishers: { id: 'manhaxuatban', from: 'nhaxuatban', select: '*', map: r => ({ id: str(r.manhaxuatban), name: str(r.tennhaxuatban), phone: str(r.sodienthoai), email: str(r.email), address: str(r.diachi), note: str(r.ghichu), status: str(r.trangthai) }) },
  logs: { id: 'manhatky', from: 'ixs_nhatky', select: "manhatky, TO_CHAR(thoigian,'DD / MM / YYYY') AS ngay, TO_CHAR(thoigian,'HH24:MI:SS') AS gio, nguoidung, manguoidung, hanhdong, doituong, chitiet", map: r => ({ id: String(r.manhatky), date: str(r.ngay), time: str(r.gio), user: str(r.nguoidung), userId: str(r.manguoidung), action: str(r.hanhdong), target: str(r.doituong), detail: str(r.chitiet) }) },
  wishlist: { id: 'madausach', from: 'tusachcanhan', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), addedAt: date(r.ngaythem) }) },
  waitingList: { id: 'madausach', from: 'danhsachcho', select: '*', map: r => ({ readerId: str(r.mabandoc), bookTitleId: str(r.madausach), id: str(r.madausach), registeredAt: date(r.ngaydangky), position: Number(r.thutu ?? 0), status: str(r.trangthai) }) }
};

const resourceNames = Object.keys(routes) as Resource[];
function isResource(value: string): value is Resource { return resourceNames.includes(value as Resource); }

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (error) { next(error); }
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
    if (['bi khoa', 'khoa', 'locked', 'disabled', 'inactive', 'deleted', 'ho so', 'profile', 'cho duyet', 'pending'].some(value => status.includes(value))) {
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
    return res.json({ user });
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
    if (['disabled', 'locked', 'bi khoa', 'khoa', 'profile', 'inactive', 'deleted'].some(value => status.includes(value))) return res.status(403).json({ error: 'Account is inactive or blocked' });
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
    const phone = str(req.body?.phone)?.replace(/[.\s-]/g, '');
    const emailInput = str(req.body?.email)?.trim().toLowerCase() ?? '';
    const email = emailInput.includes('@') ? emailInput : null;
    if (!name || !username || !password || !phone) return res.status(400).json({ error: 'Name, username, phone and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must contain 10 digits' });
    const id = `STF${randomBytes(4).toString('hex').toUpperCase()}`;
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('INSERT INTO taikhoan (tendangnhap,matkhau,vaitro,trangthai) VALUES ($1,$2,$3,$4)', [username, hashPassword(password), 'NHÂN VIÊN', 'HOẠT ĐỘNG']);
    await client.query('INSERT INTO nguoidung (manguoidung,tendangnhap,hoten,email,sodienthoai,gioitinh,ngaysinh,diachi,anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, username, name, email, phone, req.body.gender ?? null, dateValue(req.body.dob), req.body.address ?? null, req.body.avatarUrl ?? null]);
    await client.query('INSERT INTO nhanvien (manhanvien,chucvu,trangthailamviec) VALUES ($1,$2,$3)', [id, 'NHÂN VIÊN', 'ĐANG LÀM']);
    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({ user: { id, username, fullName: name, name, role: 'NHÂN VIÊN', accountType: 'employee', email: email ?? '', phone } });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    next(error);
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
    if (requested === 'wishlist' || requested === 'waitingList') {
      const readerId = String(req.query.readerId ?? '');
      if (!readerId) return res.status(400).json({ error: 'readerId query parameter is required' });
      const table = requested === 'wishlist' ? 'tusachcanhan' : 'danhsachcho';
      const result = await pool.query(`SELECT * FROM ${table} WHERE mabandoc=$1`, [readerId]);
      return res.json(result.rows.map(route.map));
    }
    const activePeople = requested === 'readers' || requested === 'employees' ? " WHERE UPPER(COALESCE(a.trangthai,'')) <> 'DELETED'" : '';
    const result = await pool.query(`SELECT ${route.select} FROM ${route.from}${activePeople}${requested === 'importReceipts' ? ' GROUP BY p.maphieunhap' : ''}`);
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
      const id = str(value(body, 'id', 'maBanDoc', 'maNhanVien'));
      const requestedUsername = str(value(body, 'username', 'tenDangNhap'));
      const name = str(value(body, 'name', 'hoTen'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      const hasAccount = reader || value(body, 'hasAccount') !== false;
      const suppliedPassword = str(value(body, 'password', 'matkhau'));
      if (hasAccount && (!requestedUsername || !suppliedPassword || suppliedPassword.length < 8)) {
        return res.status(400).json({ error: 'username and a password of at least 8 characters are required for an active account' });
      }
      const username = requestedUsername ?? `profile_${id.toLowerCase()}`;
      const password = suppliedPassword ?? randomBytes(32).toString('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai) VALUES ($1, $2, $3, $4)', [username, hashPassword(password), str(value(body, 'role', 'vaitro')) ?? (reader ? 'BẠN ĐỌC' : 'NHÂN VIÊN'), str(value(body, 'status', 'trangthai')) ?? 'HOẠT ĐỘNG']);
        await client.query('INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi, anhdaidien) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, username, name, str(value(body, 'email')), str(value(body, 'phone', 'sodienthoai')), str(value(body, 'cccd')), value(body, 'gender', 'gioiTinh'), dateValue(value(body, 'dob', 'ngaySinh')), str(value(body, 'address', 'diaChi')), str(value(body, 'avatarUrl', 'anhDaiDien'))]);
        if (reader) await client.query('INSERT INTO bandoc (mabandoc, loaibandoc, tongnophat, ngaycapthe, ngayhetthe) VALUES ($1, $2, $3, $4, $5)', [id, str(value(body, 'readerType', 'loaibandoc')), Number(value(body, 'outstandingFine', 'tongnophat') ?? 0), dateValue(value(body, 'issueDate', 'ngayCapThe')), dateValue(value(body, 'expiryDate', 'ngayHetHanThe'))]);
        else await client.query('INSERT INTO nhanvien (manhanvien, chucvu, trangthailamviec) VALUES ($1, $2, $3)', [id, str(value(body, 'position', 'chucvu')), str(value(body, 'employmentStatus', 'trangthailamviec')) ?? 'ĐANG LÀM']);
        await client.query('COMMIT');
        return res.status(201).json({ ...body, username, hasAccount, status: hasAccount ? value(body, 'status') : 'PROFILE' });
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (resource === 'bookTitles') {
      const id = str(value(body, 'id', 'maDauSach')); const categoryId = await resolveCategoryId(value(body, 'categoryId', 'category', 'maDanhMuc')); const title = str(value(body, 'title', 'tenSach'));
      if (!id || !categoryId || !title) return res.status(400).json({ error: 'id, categoryId and title are required' });
      await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,phienban,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [id, categoryId, title, value(body, 'authors', 'author', 'tacGia'), value(body, 'genre', 'theLoai'), value(body, 'subject', 'chuDe'), value(body, 'faculty', 'khoa'), Number(value(body, 'total', 'totalCopies', 'soLuongTong') ?? 0), Number(value(body, 'available', 'availableCopies', 'soLuongSan') ?? 0), value(body,'publisher'), value(body,'edition'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
      return res.status(201).json(body);
    }
    if (resource === 'categories') {
      const id = str(value(body, 'id', 'maDanhMuc')); const name = str(value(body, 'name', 'tenDanhMuc'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      await pool.query('INSERT INTO danhmuc (madanhmuc, tendanhmuc) VALUES ($1,$2)', [id, name]);
      return res.status(201).json(body);
    }
    if (resource === 'bookCopies') {
      const id = str(value(body, 'id', 'maCuonSach')); const bookId = str(value(body, 'bookId', 'bookTitleId', 'maDauSach'));
      if (!id || !bookId) return res.status(400).json({ error: 'id and bookTitleId are required' });
      await pool.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, bookId, value(body, 'barcode', 'maVach'), value(body, 'physicalStatus', 'physicalCondition', 'tinhTrangVatLy'), value(body, 'circulationStatus', 'status', 'trangThai'), value(body, 'location', 'viTriLuuTru'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
      return res.status(201).json(body);
    }
    if (resource === 'loans') {
      const id = str(value(body, 'id', 'maPhieuMuon')); const readerId = str(value(body, 'readerId', 'maBanDoc')); const employeeId = str(value(body, 'employeeId', 'maNhanVien')); const copyId = str(value(body, 'copyId', 'maCuonSach'));
      if (!id || !readerId || !employeeId || !copyId) return res.status(400).json({ error: 'id, readerId, employeeId and copyId are required' });
      await pool.query('INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, readerId, employeeId, copyId, value(body,'borrowDate','ngayMuon'), value(body,'dueDate','ngayHenTra'), value(body,'returnDate','ngayTraThucTe'), value(body,'status','trangThai')]);
      return res.status(201).json(body);
    }
    if (resource === 'fines') {
      const id = str(value(body, 'id', 'maPhieuPhat')); const loanId = str(value(body, 'loanId', 'maPhieuMuon')); const readerId = str(value(body, 'readerId', 'maBanDoc')); const employeeId = str(value(body, 'employeeId', 'maNhanVien'));
      if (!id || !loanId || !readerId || !employeeId) return res.status(400).json({ error: 'id, loanId, readerId and employeeId are required' });
      await pool.query('INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, loaivipham, sotien, trangthaithanhtoan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, loanId, readerId, employeeId, value(body,'violation','loaiViPham'), Number(value(body,'amount','soTien') ?? 0), value(body,'paymentStatus','trangThaiThanhToan')]);
      return res.status(201).json(body);
    }
    if (resource === 'renewals') {
      const id = str(value(body, 'id', 'maGiaHan'));
      const loanId = str(value(body, 'loanId', 'maPhieuMuon'));
      const requestDate = value(body, 'requestDate', 'ngayYeuCau');
      const days = Number(value(body, 'days', 'soNgayGiaHan'));
      if (!id || !loanId || !requestDate || !Number.isInteger(days) || days < 1) {
        return res.status(400).json({ error: 'id, loanId, requestDate and positive days are required' });
      }
      await pool.query(
        'INSERT INTO yeucaugiahan (magiahan, maphieumuon, ngayyeucau, songaygiahan, trangthaiduyet) VALUES ($1,$2,$3,$4,$5)',
        [id, loanId, requestDate, days, value(body, 'status', 'trangThaiDuyet') ?? 'CHO DUYET']
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
          [id, employeeId, receiptDate, quantity, value(body, 'status', 'trangThai') ?? 'HOAN THANH', value(body,'supplier'), value(body,'creator')]
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
    if (resource === 'wishlist' || resource === 'waitingList') {
      const readerId = str(value(body, 'readerId', 'mabandoc')); const bookId = str(value(body, 'bookTitleId', 'madausach'));
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId are required' });
      if (resource === 'wishlist') await pool.query('INSERT INTO tusachcanhan (mabandoc, madausach) VALUES ($1,$2)', [readerId, bookId]);
      else await pool.query('INSERT INTO danhsachcho (mabandoc, madausach, ngaydangky, thutu, trangthai) VALUES ($1,$2,COALESCE($3::timestamp, CURRENT_TIMESTAMP),$4,$5)', [readerId, bookId, value(body,'registeredAt'), value(body,'position'), value(body,'status')]);
      return res.status(201).json({ ...body, id: `${readerId}:${bookId}` });
    }
    if (resource === 'suppliers') {
      const id = str(value(body, 'id', 'maNhaCungCap'));
      const name = str(value(body, 'name', 'tenNhaCungCap'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      await pool.query('INSERT INTO nhacungcap (manhacungcap,tennhacungcap,nguoilienhe,sodienthoai,email,diachi,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,value(body,'contact','nguoiLienHe'),value(body,'phone','soDienThoai'),value(body,'email'),value(body,'address','diaChi'),value(body,'status','trangThai')]);
      return res.status(201).json(body);
    }
    if (resource === 'publishers') {
      const id = str(value(body, 'id', 'maNhaXuatBan'));
      const name = str(value(body, 'name', 'tenNhaXuatBan'));
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
      await pool.query('INSERT INTO nhaxuatban (manhaxuatban,tennhaxuatban,sodienthoai,email,diachi,ghichu,trangthai) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name,value(body,'phone','soDienThoai'),value(body,'email'),value(body,'address','diaChi'),value(body,'note','ghiChu'),value(body,'status','trangThai')]);
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
      if (!categoryId) return res.status(400).json({ error: 'category is required' });
      const result = await pool.query('INSERT INTO dausach (madausach,madanhmuc,tensach,tacgia,theloai,chude,khoa,soluongtong,soluongsan,nhaxuatban,phienban,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (madausach) DO UPDATE SET madanhmuc=EXCLUDED.madanhmuc,tensach=EXCLUDED.tensach,tacgia=EXCLUDED.tacgia,theloai=EXCLUDED.theloai,chude=EXCLUDED.chude,khoa=EXCLUDED.khoa,soluongtong=EXCLUDED.soluongtong,soluongsan=EXCLUDED.soluongsan,nhaxuatban=EXCLUDED.nhaxuatban,phienban=EXCLUDED.phienban,gia=EXCLUDED.gia,anhbia=EXCLUDED.anhbia', [id, categoryId, value(body,'title','tenSach'), value(body,'authors','author','tacGia'), value(body,'genre','theLoai'), value(body,'subject','chuDe'), value(body,'faculty','khoa'), value(body,'total','totalCopies','soLuongTong') ?? 0, value(body,'available','availableCopies','soLuongSan') ?? 0, value(body,'publisher'), value(body,'edition'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
      return res.json({ ...body, id });
    }
    if (resource === 'readers' || resource === 'employees') {
      const reader = resource === 'readers';
      const username = str(value(body, 'username', 'tenDangNhap'));
      const name = str(value(body, 'name', 'hoTen'));
      if (!username || !name) return res.status(400).json({ error: 'username and name are required' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query('SELECT u.tendangnhap FROM nguoidung u WHERE u.manguoidung=$1', [id]);
        if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Record not found' }); }
        const oldUsername = current.rows[0].tendangnhap;
        await client.query('UPDATE nguoidung SET hoten=$1,email=$2,sodienthoai=$3,cccd=$4,gioitinh=$5,ngaysinh=$6,diachi=$7,anhdaidien=$8 WHERE manguoidung=$9', [name, value(body,'email'), value(body,'phone','soDienThoai'), value(body,'cccd'), value(body,'gender','gioiTinh'), dateValue(value(body,'dob','ngaySinh')), value(body,'address','diaChi'), value(body,'avatarUrl','anhDaiDien'), id]);
        await client.query('UPDATE taikhoan SET vaitro=COALESCE($1,vaitro),trangthai=COALESCE($2,trangthai) WHERE tendangnhap=$3', [value(body,'role','vaiTro'), value(body,'status','trangThai'), oldUsername]);
        if (reader) await client.query('UPDATE bandoc SET loaibandoc=$1,tongnophat=COALESCE($2,tongnophat),ngaycapthe=$3,ngayhetthe=$4 WHERE mabandoc=$5', [value(body,'readerType','loaiBanDoc'), value(body,'outstandingFine','tongNoPhat'), dateValue(value(body,'issueDate','ngayCapThe')), dateValue(value(body,'expiryDate','ngayHetHanThe')), id]);
        else await client.query('UPDATE nhanvien SET chucvu=$1,trangthailamviec=$2 WHERE manhanvien=$3', [value(body,'position','chucVu'), value(body,'employmentStatus','trangThaiLamViec'), id]);
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
      await pool.query('INSERT INTO cuonsach (macuonsach,madausach,mavach,tinhtrangvatly,trangthai,vitriluutru,gia,anhbia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (macuonsach) DO UPDATE SET madausach=EXCLUDED.madausach,mavach=EXCLUDED.mavach,tinhtrangvatly=EXCLUDED.tinhtrangvatly,trangthai=EXCLUDED.trangthai,vitriluutru=EXCLUDED.vitriluutru,gia=EXCLUDED.gia,anhbia=EXCLUDED.anhbia', [id, value(body,'bookId','bookTitleId','maDauSach'), value(body,'barcode','maVach'), value(body,'physicalStatus','physicalCondition','tinhTrangVatLy'), value(body,'circulationStatus','status','trangThai'), value(body,'location','viTriLuuTru'), Number(String(value(body,'price') ?? 0).replace(/[^0-9.-]/g,'')), value(body,'coverUrl')]);
      return res.json({ ...body, id });
    }
    if (resource === 'loans') {
      const result = await pool.query('UPDATE phieumuon SET ngayhentra=COALESCE($1,ngayhentra), ngaytrathucte=$2, trangthai=COALESCE($3,trangthai) WHERE maphieumuon=$4', [value(body,'dueDate','ngayHenTra'), value(body,'returnDate','ngayTraThucTe'), value(body,'status','trangThai'), id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'fines') {
      const result = await pool.query('UPDATE phieuphat SET trangthaithanhtoan=COALESCE($1,trangthaithanhtoan), sotien=COALESCE($2,sotien), loaivipham=COALESCE($3,loaivipham) WHERE maphieuphat=$4', [value(body,'paymentStatus','trangThaiThanhToan'), value(body,'amount','soTien'), value(body,'violation','loaiViPham'), id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'renewals') {
      const result = await pool.query(
        'UPDATE yeucaugiahan SET trangthaiduyet=COALESCE($1,trangthaiduyet), songaygiahan=COALESCE($2,songaygiahan) WHERE magiahan=$3',
        [value(body, 'status', 'trangThaiDuyet'), value(body, 'days', 'soNgayGiaHan'), id]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.json({ ...body, id });
    }
    if (resource === 'purchaseRequests') {
      const result = await pool.query(
        'UPDATE phieudexuat SET trangthaiduyet=COALESCE($1,trangthaiduyet), lydotuchoi=COALESCE($2,lydotuchoi) WHERE madexuat=$3',
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
    if (resource === 'wishlist' || resource === 'waitingList') {
      const readerId = String(req.query.readerId ?? ''); const bookId = String(req.query.bookTitleId ?? id);
      if (!readerId || !bookId) return res.status(400).json({ error: 'readerId and bookTitleId query parameters are required' });
      const table = resource === 'wishlist' ? 'tusachcanhan' : 'danhsachcho';
      const result = await pool.query(`DELETE FROM ${table} WHERE mabandoc=$1 AND madausach=$2`, [readerId, bookId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Record not found' });
      return res.status(204).end();
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
        await client.query('UPDATE taikhoan SET trangthai=$1 WHERE tendangnhap=$2', ['BỊ KHÓA', tendangnhap]);
        await client.query('UPDATE taikhoan SET trangthai=$1 WHERE tendangnhap=$2', ['DISABLED', tendangnhap]);
        await client.query('UPDATE taikhoan SET trangthai=$1 WHERE tendangnhap=$2', ['DELETED', tendangnhap]);
        await client.query('COMMIT');
        return res.status(204).end();
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
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
      return res.status(409).json({ error: constraint.includes('taikhoan') ? 'Username already exists' : 'A record with this identifier already exists' });
    }
    if (code === '23503') return res.status(409).json({ error: 'This record is still referenced by related data' });
  }
  const message = error instanceof Error ? error.message : 'Database request failed';
  res.status(500).json({ error: message });
});

async function start(): Promise<void> {
  await runMigrations();
  app.listen(port, () => console.log(`IXS Library API listening on port ${port}`));
}

start().catch(error => {
  console.error('Could not initialize the PostgreSQL schema:', error);
  process.exitCode = 1;
});
