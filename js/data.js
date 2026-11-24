const CURRENT_DATA_VERSION = 'v7_normalized_ds_cs_pm_ids';

const defaultEmployees = [];
const defaultLogs = [];
const defaultCategories = [
  { id: 'DM01', name: 'Công nghệ thông tin' },
  { id: 'DM02', name: 'Kinh tế' },
  { id: 'DM03', name: 'Kỹ năng sống' },
  { id: 'DM04', name: 'Ngoại ngữ' },
  { id: 'DM05', name: 'Văn học' },
  { id: 'DM06', name: 'Toán học' },
  { id: 'DM07', name: 'Triết học' }
];
const defaultBookTitles = [
  {
    id: 'DS001',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: 'Robert C. Martin',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    category: 'Công nghệ thông tin',
    genre: 'Lập trình',
    subject: 'Phát triển phần mềm',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/cleancode.webp'
  },
  {
    id: 'DS002',
    title: 'Giáo trình Giải tích Tập 2',
    authors: 'Trần Đức Long - ĐHQG HN',
    author: 'Trần Đức Long - ĐHQG HN',
    publisher: 'Đại học Quốc gia Hà Nội',
    category: 'Toán học',
    genre: 'Giải tích',
    subject: 'Toán học',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/giatich.webp'
  },
  {
    id: 'DS003',
    title: 'Triết học',
    authors: 'Edward Craig',
    author: 'Edward Craig',
    publisher: 'NXB Tri Thức',
    category: 'Triết học',
    genre: 'Triết học',
    subject: 'Triết học nhập môn',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/triethoc.jpg'
  },
  {
    id: 'DS004',
    title: 'Lịch sử Văn minh Thế giới',
    authors: 'Đào Tuấn Thành (Chủ biên)',
    author: 'Đào Tuấn Thành (Chủ biên)',
    publisher: 'NXB Đại học Sư phạm',
    category: 'Lịch sử',
    genre: 'Lịch sử',
    subject: 'Văn minh thế giới',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/lichsuvanminhthegioi.jpg'
  },
  {
    id: 'DS005',
    title: 'Cây cam ngọt của tôi',
    authors: 'José Mauro de Vasconcelos',
    author: 'José Mauro de Vasconcelos',
    publisher: 'Nhã Nam',
    category: 'Văn học',
    genre: 'Tiểu thuyết',
    subject: 'Văn học nước ngoài',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/caycamngotcuatoi.jpg'
  },
  {
    id: 'DS006',
    title: 'Chiếc lá cuối cùng',
    authors: 'O. Henry',
    author: 'O. Henry',
    publisher: 'NXB Văn học',
    category: 'Văn học',
    genre: 'Truyện ngắn',
    subject: 'Văn học nước ngoài',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/chieclacuoicung.jpg'
  },
  {
    id: 'DS007',
    title: 'Dế Mèn phiêu lưu ký',
    authors: 'Tô Hoài',
    author: 'Tô Hoài',
    publisher: 'NXB Kim Đồng',
    category: 'Văn học',
    genre: 'Văn học thiếu nhi',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/demenphieuluuky.jpg'
  },
  {
    id: 'DS008',
    title: 'Làm đĩ',
    authors: 'Vũ Trọng Phụng',
    author: 'Vũ Trọng Phụng',
    publisher: 'NXB Văn học',
    category: 'Văn học',
    genre: 'Tiểu thuyết',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/lamdi.jpg'
  },
  {
    id: 'DS009',
    title: 'Đọc sách cộng hưởng',
    authors: 'Watanabe Yasuhiro',
    author: 'Watanabe Yasuhiro',
    publisher: 'NXB Lao Động',
    category: 'Kỹ năng đọc',
    genre: 'Kỹ năng đọc',
    subject: 'Phương pháp đọc sách',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/sachconghuon.jpg'
  },
  {
    id: 'DS010',
    title: 'Suối ấm mặt trời',
    authors: 'José Mauro de Vasconcelos',
    author: 'José Mauro de Vasconcelos',
    category: 'Văn học',
    genre: 'Tiểu thuyết',
    subject: 'Văn học nước ngoài',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/suoiammattroi.jpg'
  },
  {
    id: 'DS011',
    title: 'Số đỏ',
    authors: 'Vũ Trọng Phụng',
    author: 'Vũ Trọng Phụng',
    publisher: 'Lê Cường',
    category: 'Văn học',
    genre: 'Tiểu thuyết trào phúng',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/sodo.jpg'
  },
  {
    id: 'DS012',
    title: 'MANAGING INFORMATION TECHNOLOGY',
    authors: 'Francisco Castillo, Korina Monoso',
    author: 'Francisco Castillo, Korina Monoso',
    publisher: 'Springer',
    category: 'Công nghệ thông tin',
    genre: 'Công nghệ thông tin',
    subject: 'Quản trị công nghệ thông tin',
    total: 5,
    available: 5,
    isbn: '3031390156, 978-3031390159',
    coverUrl: '../assets/images/cleancode.webp'
  },
  {
    id: 'DS013',
    title: 'Lập trình C++ căn bản và nâng cao',
    authors: 'GS. Phạm Văn Ất',
    author: 'GS. Phạm Văn Ất',
    publisher: 'NXB Khoa học & Kỹ thuật',
    category: 'Công nghệ thông tin',
    genre: 'Lập trình',
    subject: 'Ngôn ngữ C++',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/cleancode.webp'
  },
  {
    id: 'DS014',
    title: 'Giáo trình Toán cao cấp - Giải tích 1',
    authors: 'Nguyễn Đình Trí (Chủ biên)',
    author: 'Nguyễn Đình Trí (Chủ biên)',
    publisher: 'NXB Giáo Dục',
    category: 'Toán học',
    genre: 'Giải tích',
    subject: 'Toán học',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/giatich.webp'
  },
  {
    id: 'DS015',
    title: 'Lịch sử Triết học phương Tây',
    authors: 'Bertrand Russell',
    author: 'Bertrand Russell',
    publisher: 'NXB Thế Giới',
    category: 'Triết học',
    genre: 'Triết học',
    subject: 'Triết học phương Tây',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/triethoc.jpg'
  },
  {
    id: 'DS016',
    title: 'Lịch sử Nền văn minh Ả Rập',
    authors: 'Will Durant',
    author: 'Will Durant',
    publisher: 'NXB Hồng Đức',
    category: 'Lịch sử',
    genre: 'Lịch sử',
    subject: 'Lịch sử thế giới',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/lichsuvanminhthegioi.jpg'
  },
  {
    id: 'DS017',
    title: 'Tôi thấy hoa vàng trên cỏ xanh',
    authors: 'Nguyễn Nhật Ánh',
    author: 'Nguyễn Nhật Ánh',
    publisher: 'NXB Trẻ',
    category: 'Văn học',
    genre: 'Truyện dài',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/caycamngotcuatoi.jpg'
  },
  {
    id: 'DS018',
    title: 'Mắt biếc',
    authors: 'Nguyễn Nhật Ánh',
    author: 'Nguyễn Nhật Ánh',
    publisher: 'NXB Trẻ',
    category: 'Văn học',
    genre: 'Truyện dài',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/demenphieuluuky.jpg'
  },
  {
    id: 'DS019',
    title: 'Tắt đèn',
    authors: 'Ngô Tất Tố',
    author: 'Ngô Tất Tố',
    publisher: 'NXB Văn học',
    category: 'Văn học',
    genre: 'Tiểu thuyết hiện thực',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/lamdi.jpg'
  },
  {
    id: 'DS020',
    title: 'Bỉ vỏ',
    authors: 'Nguyên Hồng',
    author: 'Nguyên Hồng',
    publisher: 'NXB Văn học',
    category: 'Văn học',
    genre: 'Tiểu thuyết',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/sodo.jpg'
  },
  {
    id: 'DS021',
    title: 'Tuổi thơ dữ dội',
    authors: 'Phùng Quán',
    author: 'Phùng Quán',
    publisher: 'NXB Kim Đồng',
    category: 'Văn học',
    genre: 'Tiểu thuyết chiến tranh',
    subject: 'Văn học Việt Nam',
    total: 5,
    available: 5,
    coverUrl: '../assets/images/chieclacuoicung.jpg'
  }
];
let _seedCopySeq = 0;
const defaultBookCopies = defaultBookTitles.flatMap(b =>
  ['A1 - Ngăn 1', 'A1 - Ngăn 2', 'B1 - Ngăn 1', 'B1 - Ngăn 2', 'B2 - Ngăn 1'].map(location => {
    _seedCopySeq += 1;
    const copyId = `CS${String(_seedCopySeq).padStart(3, '0')}`;
    return {
      id: copyId,
      bookId: b.id,
      bookTitleId: b.id,
      bookTitle: b.title,
      barcode: copyId,
      physicalStatus: 'TỐT',
      circulationStatus: 'SẴN SÀNG',
      status: 'SẴN SÀNG',
      location,
      coverUrl: b.coverUrl
    };
  })
);
const defaultImportReceipts = [];
const defaultSuppliers = [];
const defaultPublishers = [];
const defaultReaders = [
  {
    id: 'BD004',
    name: 'Lưu Tấn Nin',
    fullName: 'Lưu Tấn Nin',
    readerType: 'Sinh viên',
    issueDate: '15 / 11 / 2026',
    expiryDate: '15 / 11 / 2027',
    status: 'HỢP LỆ',
    phone: '0363894957',
    email: 'luutannin@gmail.com',
    cccd: '072202001234',
    address: 'Ô 17, Ấp 4, Mỹ An, Tây Ninh',
    gender: 'Nam',
    dob: '10 / 01 / 2006'
  }
];
const defaultReaderHistory = [
  {
    id: 'PM001',
    loanId: 'PM001',
    readerId: 'BD004',
    readerName: 'Lưu Tấn Nin',
    copyId: 'CS001',
    bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    borrowDate: '10/11/2026',
    dueDate: '24/11/2026',
    status: 'Đang mượn'
  }
];

const defaultSuggestions = [
  {
    id: 'DX001',
    readerId: 'BD004',
    readerName: 'Lưu Tấn Nin',
    title: 'Thiết kế kiến trúc hệ thống phân tán (Distributed Systems)',
    author: 'Martin Kleppmann',
    publisher: 'NXB Thông tin & Truyền thông',
    year: '2024',
    quantity: '5 bản',
    edition: 'Lần 2',
    isbn: '978-604-80-4567-8',
    reason: 'Phục vụ học phần Kiến trúc phần mềm và Hệ phân tán nâng cao.',
    status: 'Chờ duyệt',
    type: 'Sách chuyên ngành',
    createdAt: '12/11/2026'
  },
  {
    id: 'DX002',
    readerId: 'BD004',
    readerName: 'Lưu Tấn Nin',
    title: 'Clean Architecture: Cấu trúc và Thiết kế Phần mềm',
    author: 'Robert C. Martin',
    publisher: 'NXB Khoa học & Kỹ thuật',
    year: '2023',
    quantity: '10 bản',
    edition: 'Lần 1',
    isbn: '978-604-67-1234-5',
    reason: 'Tài liệu tham khảo bắt buộc cho đồ án tốt nghiệp công nghệ phần mềm.',
    status: 'Đã duyệt',
    type: 'Sách giáo trình',
    createdAt: '05/11/2026'
  },
  {
    id: 'DX003',
    readerId: 'BD004',
    readerName: 'Lưu Tấn Nin',
    title: 'Machine Learning cơ bản và ứng dụng thực tế',
    author: 'Vũ Hữu Tiệp',
    publisher: 'NXB Đại học Quốc gia',
    year: '2022',
    quantity: '3 bản',
    edition: 'Lần 1',
    isbn: '978-604-58-9876-1',
    reason: 'Nghiên cứu về các mô hình học máy cơ bản.',
    status: 'Từ chối',
    type: 'Sách tham khảo',
    createdAt: '28/10/2026'
  }
];

const defaultFines = [
  {
    id: 'PH0001',
    readerId: 'BD004',
    violation: 'Phí trễ hạn mượn sách',
    bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    amount: 100000,
    paymentStatus: 'Chưa thanh toán',
    date: '15/11/2026'
  },
  {
    id: 'PH0002',
    readerId: 'BD004',
    violation: 'Phí làm lại thẻ thư viện',
    amount: 100000,
    paymentStatus: 'Chưa thanh toán',
    date: '15/11/2026'
  }
];

function isLibraryAdmin(role) {
  const normalized = String(role ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'quan tri vien';
}

const staffPermissionRows = [
  { key: 'books', label: 'Đầu sách và cuốn sách' },
  { key: 'imports', label: 'Nhập sách và nhà cung cấp' },
  { key: 'suggestions', label: 'Đề xuất sách' },
  { key: 'readers', label: 'Quản lý độc giả và duyệt đăng ký' },
  { key: 'circulation', label: 'Mượn, trả và gia hạn' },
  { key: 'fines', label: 'Quản lý vi phạm' },
  { key: 'reports', label: 'Báo cáo, thống kê', viewOnly: true },
  { key: 'employees', label: 'Quản lý nhân viên', adminOnly: true }
];

const defaultLibraryRules = {
  maxBorrowBooks: 5,
  maxBorrowDays: 14,
  maxRenewals: 2,
  renewalDays: 7,
  newCardFee: 50000,
  renewCardFee: 50000,
  cardValidityMonths: 12,
  holdBookHours: 48,
  lateFeePerDay: 5000,
  damageFee: 30000,
  lostCompensationPercent: 100,
  maxLateDaysBeforeLock: 30,
  minCopiesInStock: 1,
  autoLockTornBooks: 'Bật',
  allowBookPurchaseRequest: 'Bật',
  allowOnlineRenewal: 'Bật',
  updatedAt: '21 / 02 / 2026',
  updatedBy: 'Quản trị viên'
};

/**
 * DataService / Repository Pattern chuẩn bị kết nối RESTful API / Backend
 */
const DataService = {
  API_BASE_URL: 'http://localhost:3000/api',
  KEYS: {
    VERSION: 'ixs_data_version',
    EMPLOYEES: 'ixs_library_employees',
    LOGS: 'ixs_library_logs',
    BOOK_TITLES: 'ixs_library_book_titles',
    BOOK_COPIES: 'ixs_library_book_copies',
    IMPORT_RECEIPTS: 'ixs_library_import_receipts',
    SUPPLIERS: 'ixs_library_suppliers',
    PUBLISHERS: 'ixs_library_publishers',
    READERS: 'ixs_library_readers',
    READER_HISTORY: 'ixs_library_reader_history',
    FINES: 'ixs_library_fines',
    SUGGESTIONS: 'ixs_library_suggestions',
    CATEGORIES: 'ixs_library_categories',
    RULES: 'ixs_library_rules'
  },

  init() {
    this._cache = {};
    const defaultData = {
      [this.KEYS.EMPLOYEES]: defaultEmployees,
      [this.KEYS.LOGS]: defaultLogs,
      [this.KEYS.BOOK_TITLES]: defaultBookTitles,
      [this.KEYS.BOOK_COPIES]: defaultBookCopies,
      [this.KEYS.IMPORT_RECEIPTS]: defaultImportReceipts,
      [this.KEYS.SUPPLIERS]: defaultSuppliers,
      [this.KEYS.PUBLISHERS]: defaultPublishers,
      [this.KEYS.READERS]: defaultReaders,
      [this.KEYS.READER_HISTORY]: defaultReaderHistory,
      [this.KEYS.FINES]: defaultFines,
      [this.KEYS.SUGGESTIONS]: defaultSuggestions,
      [this.KEYS.CATEGORIES]: defaultCategories,
      [this.KEYS.RULES]: defaultLibraryRules
    };

    Object.entries(this.KEYS).forEach(([name, key]) => {
      let stored = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw) stored = JSON.parse(raw);
      } catch (_) {}

      const fallback = defaultData[key] || [];
      if (stored && Array.isArray(stored) && stored.length > 0) {
        this._cache[key] = stored;
      } else if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        this._cache[key] = stored;
      } else {
        this._cache[key] = fallback;
      }
    });

    this._snapshots = {};
    this._writes = {};
    this._writeErrors = {};
    const resources = Object.entries(this.KEYS)
      .map(([name, key]) => ({ key, resource: this.resourceForKey(key), fallback: defaultData[key] || [] }))
      .filter(item => item.resource);
    this.ready = Promise.all(resources.map(item => this.hydrate(item.key, item.resource, item.fallback).catch(() => this._cache[item.key])));
  },

  resourceForKey(key) {
    return {
      [this.KEYS.EMPLOYEES]: 'employees',
      [this.KEYS.LOGS]: 'logs',
      [this.KEYS.BOOK_TITLES]: 'bookTitles',
      [this.KEYS.BOOK_COPIES]: 'bookCopies',
      [this.KEYS.IMPORT_RECEIPTS]: 'importReceipts',
      [this.KEYS.SUPPLIERS]: 'suppliers',
      [this.KEYS.PUBLISHERS]: 'publishers',
      [this.KEYS.READERS]: 'readers',
      [this.KEYS.READER_HISTORY]: 'readerHistory',
      [this.KEYS.FINES]: 'fines',
      [this.KEYS.SUGGESTIONS]: 'suggestions',
      [this.KEYS.CATEGORIES]: 'categories',
      [this.KEYS.RULES]: 'config:library_rules'
    }[key] || null;
  },

  request(method, path, body) {
    const token = sessionStorage.getItem('ixs_library_token');
    return fetch(`${this.API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    }).then(async response => {
      if (!response.ok) {
        let payload = {};
        try { payload = await response.json(); } catch (_) {}
        const error = new Error(payload.error || `API ${method} ${path} failed (${response.status})`);
        error.status = response.status;
        throw error;
      }
      return response.status === 204 ? null : response.json();
    }).catch(error => {
      if (error instanceof TypeError && error.status === undefined) error.status = 0;
      throw error;
    });
  },

  getAll(key, fallback = []) {
    return this._cache?.[key] ?? fallback;
  },

  async hydrate(key, resource, fallback = []) {
    if (resource.startsWith('config:')) {
      const configKey = resource.slice('config:'.length);
      const result = await this.request('GET', `/config/${encodeURIComponent(configKey)}`);
      const value = result?.value ?? fallback;
      this._cache[key] = value;
      this._snapshots[key] = this.clone(value);
      window.dispatchEvent(new CustomEvent('ixs:data-loaded', { detail: { key } }));
      return value;
    }
    let path = `/${resource}`;
    if (resource === 'readerHistory' || resource === 'fines' || resource === 'suggestions') {
      const isAdminPage = typeof window !== 'undefined' && window.location.pathname.includes('/admin/');
      let session = {};
      try { session = JSON.parse(localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user') || '{}'); } catch (_) {}
      const isEmployee = session.accountType === 'employee';
      if (!isAdminPage && !isEmployee) {
        const readerId = session.id || session.readerId || session.maBanDoc;
        if (!readerId) {
          this._cache[key] = [];
          this._snapshots[key] = [];
          return [];
        }
        path += `?readerId=${encodeURIComponent(readerId)}`;
      }
    }
    let data;
    try {
      data = await this.request('GET', path);
    } catch (error) {
      throw error;
    }
    this._cache[key] = data;
    this._snapshots[key] = this.clone(data);
    window.dispatchEvent(new CustomEvent('ixs:data-loaded', { detail: { key } }));
    return data;
  },

  saveAll(key, data) {
    if (!this._cache) this._cache = {};
    if (!this._writes) this._writes = {};
    if (!this._writeErrors) this._writeErrors = {};
    if (!this._snapshots) this._snapshots = {};

    const resource = this.resourceForKey(key);
    if (!resource) {
      this._cache[key] = this.clone(data);
      window.dispatchEvent(new CustomEvent('ixs:unsupported-data', { detail: { key } }));
      return data;
    }
    const safeData = Array.isArray(data) ? data.map(item => {
      if (!item || typeof item !== 'object') return item;
      const { password, ...safeItem } = item;
      return safeItem;
    }) : data;
    this._cache[key] = safeData;
    this._writeErrors[key] = null;
    const target = this.clone(data);
    const prior = this._writes[key] || Promise.resolve();
    this._writes[key] = prior.catch(() => {}).then(() => this.persist(key, resource, target)).then(() => {
      this._writeErrors[key] = null;
    }).catch(async error => {
      this._writeErrors[key] = error;
      console.error(`PostgreSQL save failed for ${resource}:`, error.message);
      try { await this.hydrate(key, resource, this._snapshots[key]); } catch (refreshError) { console.error('Could not reload PostgreSQL data:', refreshError.message); }
      window.dispatchEvent(new CustomEvent('ixs:data-error', { detail: { key, message: error.message } }));
    });
    return safeData;
  },

  async waitForWrites(keys) {
    await Promise.all(keys.map(key => this._writes[key] || Promise.resolve()));
    return keys.every(key => !this._writeErrors[key]);
  },

  async persist(key, resource, data) {
    if (resource.startsWith('config:')) {
      const configKey = resource.slice('config:'.length);
      await this.request('PUT', `/config/${encodeURIComponent(configKey)}`, { value: data });
      this._cache[key] = this.clone(data);
      this._snapshots[key] = this.clone(data);
      return data;
    }
    const before = Array.isArray(this._snapshots[key]) ? this._snapshots[key] : [];
    const next = Array.isArray(data) ? data : [];
    const persistedNext = next.map(item => this.clone(item));
    const oldById = new Map(before.filter(item => item?.id != null).map(item => [String(item.id), item]));
    const newById = new Map(persistedNext.filter(item => item?.id != null).map(item => [String(item.id), item]));
    for (const item of persistedNext) {
      if (item?.id == null) continue;
      const id = String(item.id);
      const old = oldById.get(id);
      if (!old) {
        const created = await this.request('POST', `/${resource}`, item);
        if (created && typeof created === 'object') {
          const { password, ...safeCreated } = created;
          Object.assign(item, safeCreated);
          const cachedItem = Array.isArray(this._cache[key])
            ? this._cache[key].find(entry => entry && String(entry.id) === id)
            : null;
          if (cachedItem) Object.assign(cachedItem, safeCreated);
        }
      } else if (JSON.stringify(old) !== JSON.stringify(item)) {
        await this.request('PUT', `/${resource}/${encodeURIComponent(id)}`, item);
      }
    }
    for (const old of before) {
      if (old?.id == null || newById.has(String(old.id))) continue;
      await this.request('DELETE', `/${resource}/${encodeURIComponent(old.id)}`);
    }
    const current = persistedNext.map(item => {
      if (!item || typeof item !== 'object') return item;
      const { password, ...safeItem } = item;
      return safeItem;
    });
    this._cache[key] = current;
    this._snapshots[key] = this.clone(current);
    return current;
  },

  clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  },

  create(key, item, prepend = false) {
    const list = [...this.getAll(key, [])];
    if (prepend) list.unshift(item); else list.push(item);
    this.saveAll(key, list);
    return item;
  },

  getById(key, id, idField = 'id') {
    return this.getAll(key, []).find(item => item && String(item[idField]) === String(id)) || null;
  },

  update(key, id, updates, idField = 'id') {
    const list = [...this.getAll(key, [])];
    const index = list.findIndex(item => item && String(item[idField]) === String(id));
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    this.saveAll(key, list);
    return list[index];
  },

  remove(key, id, idField = 'id') {
    const list = [...this.getAll(key, [])];
    const filtered = list.filter(item => item && String(item[idField]) !== String(id));
    this.saveAll(key, filtered);
    return filtered;
  },

  generateNextId(key, prefix, padLength, idField = 'id') {
    const list = this.getAll(key, []);
    let maxNum = 0;
    list.forEach(item => {
      const rawId = item && item[idField] ? String(item[idField]) : '';
      if (rawId.startsWith(prefix)) {
        const suffix = rawId.slice(prefix.length);
        if (/^\d+$/.test(suffix)) {
          const numPart = parseInt(suffix, 10);
          if (numPart > maxNum) maxNum = numPart;
        }
      }
    });
    return prefix + String(maxNum + 1).padStart(padLength, '0');
  }
};

function initAdminData() {
  DataService.init();
}

function getEmployees() {
  return DataService.getAll(DataService.KEYS.EMPLOYEES, defaultEmployees);
}

function saveEmployees(list) {
  return DataService.saveAll(DataService.KEYS.EMPLOYEES, list);
}

function getLogs() {
  return DataService.getAll(DataService.KEYS.LOGS, defaultLogs);
}

function addLog(action, target, detail) {
  if (!DataService.resourceForKey(DataService.KEYS.LOGS)) return;
  const logs = getLogs();
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  let activeUser = 'Quản trị viên';
  let activeId = 'NV001';
  try {
    const sessionRaw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (sessionRaw) {
      const s = JSON.parse(sessionRaw);
      activeUser = s.fullName || s.name || activeUser;
      activeId = s.id || activeId;
    }
  } catch (e) {}

  logs.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: `${d} / ${m} / ${y}`,
    time: `${hh}:${mm}:${ss}`,
    user: activeUser,
    userId: activeId,
    action,
    target,
    detail
  });

  DataService.saveAll(DataService.KEYS.LOGS, logs);
}

function getBookTitles() {
  return DataService.getAll(DataService.KEYS.BOOK_TITLES, defaultBookTitles);
}

function saveBookTitles(list) {
  return DataService.saveAll(DataService.KEYS.BOOK_TITLES, list);
}

function getBookCopies() {
  return DataService.getAll(DataService.KEYS.BOOK_COPIES, defaultBookCopies);
}

function saveBookCopies(list) {
  return DataService.saveAll(DataService.KEYS.BOOK_COPIES, list);
}

function getImportReceipts() {
  return DataService.getAll(DataService.KEYS.IMPORT_RECEIPTS, defaultImportReceipts);
}

function saveImportReceipts(list) {
  return DataService.saveAll(DataService.KEYS.IMPORT_RECEIPTS, list);
}

function getSuppliers() {
  return DataService.getAll(DataService.KEYS.SUPPLIERS, defaultSuppliers);
}

function saveSuppliers(list) {
  return DataService.saveAll(DataService.KEYS.SUPPLIERS, list);
}

function getPublishers() {
  return DataService.getAll(DataService.KEYS.PUBLISHERS, defaultPublishers);
}

function savePublishers(list) {
  return DataService.saveAll(DataService.KEYS.PUBLISHERS, list);
}

function getReaders() {
  return DataService.getAll(DataService.KEYS.READERS, defaultReaders);
}

function saveReaders(list) {
  return DataService.saveAll(DataService.KEYS.READERS, list);
}

function getReaderHistory() {
  return DataService.getAll(DataService.KEYS.READER_HISTORY, defaultReaderHistory);
}

function saveReaderHistory(list) {
  return DataService.saveAll(DataService.KEYS.READER_HISTORY, list);
}

function getFines() {
  return DataService.getAll(DataService.KEYS.FINES, defaultFines);
}

function saveFines(list) {
  return DataService.saveAll(DataService.KEYS.FINES, list);
}

function getBookSuggestions() {
  return DataService.getAll(DataService.KEYS.SUGGESTIONS, defaultSuggestions);
}

function saveBookSuggestions(list) {
  return DataService.saveAll(DataService.KEYS.SUGGESTIONS, list);
}

function getCategories() {
  return DataService.getAll(DataService.KEYS.CATEGORIES, defaultCategories);
}

function saveCategories(list) {
  return DataService.saveAll(DataService.KEYS.CATEGORIES, list);
}

function getLibraryRules() {
  return DataService.getAll(DataService.KEYS.RULES, defaultLibraryRules);
}

function saveLibraryRules(rules) {
  return DataService.saveAll(DataService.KEYS.RULES, rules);
}

function resetLibraryRulesToDefault() {
  const copy = JSON.parse(JSON.stringify(defaultLibraryRules));
  saveLibraryRules(copy);
  return copy;
}

if (typeof DataService !== 'undefined' && !DataService._cache) {
  DataService.init();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(DataService.KEYS).includes(e.key)) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed) {
          DataService._cache[e.key] = parsed;
          window.dispatchEvent(new CustomEvent('ixs:data-loaded', { detail: { key: e.key } }));
        }
      } catch (_) {}
    }
  });
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-fine-detail]');
  if (!button || button.disabled || document.getElementById('fineDetailDialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'fineDetailDialog';
  dialog.className = 'fine-detail-dialog';
  dialog.setAttribute('aria-labelledby', 'fineDetailTitle');
  dialog.innerHTML = `
    <h2 id="fineDetailTitle">Chi tiết phiếu phạt</h2>
    <div data-fine-content aria-live="polite">Đang tải phiếu phạt…</div>
    <form method="dialog"><button type="submit" class="btn-action-gray">Đóng</button></form>
  `;
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();
  const content = dialog.querySelector('[data-fine-content]');
  const currency = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
  const addField = (list, label, value) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value || '—';
    list.append(term, description);
  };
  try {
    const fine = await DataService.request('GET', `/fines/${encodeURIComponent(button.dataset.fineDetail)}`);
    const summary = document.createElement('dl');
    addField(summary, 'Mã phiếu phạt', fine.id);
    addField(summary, 'Mã phiếu mượn', fine.loanId);
    addField(summary, 'Ngày lập', fine.createdDate);
    addField(summary, 'Tổng tiền', currency(fine.amount));
    addField(summary, 'Thanh toán', fine.paymentStatus);
    if (fine.paymentMethod) addField(summary, 'Phương thức', fine.paymentMethod);
    if (fine.paidDate) addField(summary, 'Ngày thanh toán', fine.paidDate);
    const violations = document.createElement('ul');
    for (const item of fine.details) {
      const row = document.createElement('li');
      const parts = [item.copyId, item.violation, item.lateDays > 0 ? item.lateDays + ' ngày quá hạn' : '', item.damage, currency(item.amount), item.note];
      row.textContent = parts.filter(Boolean).join(' · ');
      violations.appendChild(row);
    }
    if (!violations.childElementCount && fine.violation) {
      const row = document.createElement('li');
      row.textContent = fine.violation;
      violations.appendChild(row);
    }
    content.replaceChildren(summary, violations);
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết phiếu phạt.';
  }
});
