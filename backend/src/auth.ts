import { randomBytes } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { pool } from './db';

export type Principal = { username: string; id: string; role: string; kind: 'reader' | 'employee'; admin: boolean };
declare global { namespace Express { interface Request { auth?: Principal } } }
const sessions = new Map<string, { username: string; expires: number }>();
const normalize = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim();
export function issueSession(username: string): string {
  for (const [key, s] of sessions) if (s.expires <= Date.now()) sessions.delete(key);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { username, expires: Date.now() + 12 * 60 * 60 * 1000 });
  return token;
}
export function revokeSessions(username: string, except?: string) {
  for (const [key, s] of sessions) if (s.username.toLowerCase() === username.toLowerCase() && key !== except) sessions.delete(key);
}
export function revokeSession(token: string) { sessions.delete(token); }

// Deny by default. Reader ownership is resolved from the server session, never from browser role flags.
export async function authorize(req: Request, res: Response, next: NextFunction) {
  try {
    const path = req.path, method = req.method;
    const publicPost = ['/auth/login', '/auth/register', '/auth/password-reset/request', '/auth/password-reset'];
    if (path === '/health' || (method === 'POST' && publicPost.includes(path)) ||
        (method === 'GET' && ['/bookTitles', '/categories', '/bookCopies', '/config/library_rules'].includes(path))) return next();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    const session = sessions.get(token);
    if (!session || session.expires <= Date.now()) { sessions.delete(token); return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }); }
    const result = await pool.query(`SELECT a.tendangnhap,a.vaitro,a.trangthai,u.manguoidung,b.mabandoc,n.manhanvien
      FROM taikhoan a JOIN nguoidung u ON u.tendangnhap=a.tendangnhap
      LEFT JOIN bandoc b ON b.mabandoc=u.manguoidung LEFT JOIN nhanvien n ON n.manhanvien=u.manguoidung
      WHERE a.tendangnhap=$1`, [session.username]);
    const a = result.rows[0], status = normalize(a?.trangthai);
    if (!a || !['active', 'hoat dong', 'hop le', 'valid'].includes(status)) { sessions.delete(token); return res.status(401).json({ error: 'Tài khoản không còn hoạt động.' }); }
    const role = normalize(a.vaitro);
    req.auth = { username: a.tendangnhap, id: a.manguoidung, role: a.vaitro, kind: a.manhanvien ? 'employee' : 'reader', admin: Boolean(a.manhanvien) && (role.includes('quan tri') || role === 'admin') };
    const deny = () => res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    if (['/auth/me', '/auth/logout', '/auth/password/change'].includes(path)) {
      if (path === '/auth/password/change' && req.body.username && req.body.username !== req.auth.username) return deny();
      if (path === '/auth/password/change') req.body.username = req.auth.username;
      return next();
    }
    if (req.auth.kind === 'employee') {
      const adminOnly = /^\/(employees|accounts)(\/|$)/.test(path) || (path.startsWith('/config/') && !(method === 'GET' && path === '/config/library_rules')) || /^\/auth\/admin-/.test(path);
      if (adminOnly && !req.auth.admin) return deny();
      if (!req.auth.admin && path !== '/logs') {
        const configured = await pool.query("SELECT giatri FROM ixs_cauhinh WHERE macauhinh='permissions'");
        const permissions = configured.rows[0]?.giatri ?? {};
        const roleKey = Object.keys(permissions).find(key => normalize(key) === role);
        const groups = roleKey && Array.isArray(permissions[roleKey]) ? permissions[roleKey] : [];
        const items = groups.flatMap((group: { items?: { name: string; view?: boolean; add?: boolean; edit?: boolean; del?: boolean }[] }) => group.items ?? []);
        const resource = path.split('/')[1];
        const permissionName = ['bookTitles','categories'].includes(resource) ? 'dau sach & the loai'
          : resource === 'bookCopies' ? 'ban sao'
          : ['importReceipts','suppliers','publishers','suggestions','purchaseRequests'].includes(resource) ? 'nhap sach moi'
          : ['readers','readerRegistrations'].includes(resource) ? (method === 'GET' ? 'tra cuu thong tin' : 'cap moi')
          : resource === 'fines' ? 'xu ly vi pham'
          : ['loans','readerHistory','renewals','waitingList','borrowRequests'].includes(resource) ? 'lap phieu muon' : '';
        const item = items.find((entry: { name: string }) => permissionName && normalize(entry.name).includes(permissionName));
        const action = method === 'GET' ? 'view' : method === 'DELETE' ? 'del' : method === 'PUT' || /\/(approve|reject|return|confirm|liquidate)$/.test(path) ? 'edit' : 'add';
        if (!item || item[action] !== true) return deny();
      }
      if (!req.auth.admin && path === '/logs' && method !== 'POST') return deny();
      if (req.body && !['GET','DELETE'].includes(method)) {
        if (/\/(approve|reject|return|confirm|liquidate)$/.test(path) || /^\/(loans|fines|importReceipts)$/.test(path)) req.body.employeeId = req.auth.id;
        if (path === '/logs') { req.body.userId = req.auth.id; req.body.user = req.auth.username; }
      }
      return next();
    }
    const ownId = req.auth.id;
    const readerId = req.query.readerId ?? req.body?.readerId ?? req.body?.mabandoc;
    if (readerId !== undefined && String(readerId) !== ownId) return deny();
    const resource = path.split('/')[1];
    if (method === 'GET' && ['readers','readerHistory','loans','fines','suggestions','wishlist','waitingList','renewals','borrowRequests'].includes(resource)) {
      req.query.readerId = ownId;
      return next();
    }
    if (method === 'PUT' && path === `/readers/${ownId}`) {
      const allowed = new Set(['id','username','name','fullName','email','phone','cccd','gender','dob','address','avatarUrl']);
      if (Object.keys(req.body).some(k => !allowed.has(k)) || (req.body.username && req.body.username !== req.auth.username)) return deny();
      req.body.username = req.auth.username;
      return next();
    }
    if (method === 'POST' && (/^\/bookTitles\/[^/]+\/reserve$/.test(path) || ['wishlist','waitingList','suggestions','readerPayments'].includes(resource))) {
      req.body.readerId = ownId;
      if (resource === 'suggestions') req.body.status = 'Chờ duyệt';
      if (resource === 'waitingList') { req.body.status = 'DANG CHO'; delete req.body.position; }
      return next();
    }
    if (method === 'POST' && resource === 'renewals') {
      const loan = await pool.query('SELECT mabandoc FROM phieumuon WHERE maphieumuon=$1', [req.body.loanId ?? req.body.maPhieuMuon]);
      if (loan.rows[0]?.mabandoc !== ownId) return deny();
      req.body.status = 'CHO DUYET';
      return next();
    }
    if ((method === 'PUT' || method === 'DELETE') && /^\/wishlist\/[^/]+$/.test(path)) { req.body.readerId = ownId; req.query.readerId = ownId; return next(); }
    if (method === 'PUT' && /^\/waitingList\/[^/]+$/.test(path) && req.body.status === 'DA_HUY') { req.body.readerId = ownId; return next(); }
    if (method === 'DELETE' && /^\/waitingList\/[^/]+$/.test(path)) { req.query.readerId = ownId; return next(); }
    if (method === 'DELETE' && /^\/borrowRequests\/[^/]+$/.test(path)) {
      const found = await pool.query('SELECT mabandoc FROM ixs_borrow_requests WHERE madangky=$1', [decodeURIComponent(path.split('/')[2])]);
      if (found.rows[0]?.mabandoc !== ownId) return deny();
      return next();
    }
    if (method === 'POST' && path === '/logs') { req.body.userId = ownId; req.body.user = req.auth.username; return next(); }
    return deny();
  } catch (error) { next(error); }
}
