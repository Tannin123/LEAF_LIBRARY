const CURRENT_DATA_VERSION = 'v5_zero_mock_full_interactive';

const defaultEmployees = [];
const defaultLogs = [];
const defaultBookTitles = [];
const defaultBookCopies = [];
const defaultImportReceipts = [];
const defaultSuppliers = [];
const defaultPublishers = [];
const defaultReaders = [];
const defaultReaderHistory = [];

const defaultPermissions = {
  'QUẢN TRỊ VIÊN': [
    {
      group: '1. Quản lý Kho sách & Tài liệu',
      items: [
        { name: 'Quản lý Đầu sách & Thể loại', view: true, add: true, edit: true, del: true },
        { name: 'Quản lý Bản sao (Đánh mã vạch, vị trí kệ)', view: true, add: true, edit: true, del: true },
        { name: 'Nhập sách mới & Quản lý Nhà cung cấp', view: true, add: true, edit: true, del: true }
      ]
    },
    {
      group: '2. Quản lý Độc giả',
      items: [
        { name: 'Cấp mới, gia hạn & khóa thẻ thư viện', view: true, add: true, edit: true, del: true },
        { name: 'Tra cứu thông tin & lịch sử mượn của độc giả', view: true, add: true, edit: true, del: true }
      ]
    },
    {
      group: '3. Quản lý Mượn - Trả (Lưu thông)',
      items: [
        { name: 'Lập phiếu mượn, ghi nhận trả sách & gia hạn', view: true, add: true, edit: true, del: true },
        { name: 'Xử lý vi phạm (Phạt trễ hạn, làm mất/hỏng sách)', view: true, add: true, edit: true, del: true }
      ]
    },
    {
      group: '4. Báo cáo & Quản trị hệ thống',
      items: [
        { name: 'Xem biểu đồ thống kê & xuất báo cáo', view: true, add: true, edit: true, del: true },
        { name: 'Quản lý hồ sơ nhân viên & Cấp tài khoản', view: true, add: true, edit: true, del: true },
        { name: 'Thiết lập quy định & Phân quyền hệ thống', view: true, add: true, edit: true, del: true }
      ]
    }
  ],
  'THỦ THƯ KHO': [
    {
      group: '1. Quản lý Kho sách & Tài liệu',
      items: [
        { name: 'Quản lý Đầu sách & Thể loại', view: true, add: true, edit: true, del: false },
        { name: 'Quản lý Bản sao (Đánh mã vạch, vị trí kệ)', view: true, add: true, edit: true, del: false },
        { name: 'Nhập sách mới & Quản lý Nhà cung cấp', view: true, add: true, edit: true, del: false }
      ]
    },
    {
      group: '2. Quản lý Độc giả',
      items: [
        { name: 'Cấp mới, gia hạn & khóa thẻ thư viện', view: false, add: false, edit: false, del: false },
        { name: 'Tra cứu thông tin & lịch sử mượn của độc giả', view: true, add: false, edit: false, del: false }
      ]
    },
    {
      group: '3. Quản lý Mượn - Trả (Lưu thông)',
      items: [
        { name: 'Lập phiếu mượn, ghi nhận trả sách & gia hạn', view: false, add: false, edit: false, del: false },
        { name: 'Xử lý vi phạm (Phạt trễ hạn, làm mất/hỏng sách)', view: false, add: false, edit: false, del: false }
      ]
    },
    {
      group: '4. Báo cáo & Quản trị hệ thống',
      items: [
        { name: 'Xem biểu đồ thống kê & xuất báo cáo', view: true, add: true, edit: false, del: false },
        { name: 'Quản lý hồ sơ nhân viên & Cấp tài khoản', view: false, add: false, edit: false, del: false },
        { name: 'Thiết lập quy định & Phân quyền hệ thống', view: false, add: false, edit: false, del: false }
      ]
    }
  ],
  'THỦ THƯ QUẦY': [
    {
      group: '1. Quản lý Kho sách & Tài liệu',
      items: [
        { name: 'Quản lý Đầu sách & Thể loại', view: true, add: false, edit: false, del: false },
        { name: 'Quản lý Bản sao (Đánh mã vạch, vị trí kệ)', view: true, add: false, edit: true, del: false },
        { name: 'Nhập sách mới & Quản lý Nhà cung cấp', view: false, add: false, edit: false, del: false }
      ]
    },
    {
      group: '2. Quản lý Độc giả',
      items: [
        { name: 'Cấp mới, gia hạn & khóa thẻ thư viện', view: true, add: true, edit: true, del: false },
        { name: 'Tra cứu thông tin & lịch sử mượn của độc giả', view: true, add: true, edit: true, del: false }
      ]
    },
    {
      group: '3. Quản lý Mượn - Trả (Lưu thông)',
      items: [
        { name: 'Lập phiếu mượn, ghi nhận trả sách & gia hạn', view: true, add: true, edit: true, del: false },
        { name: 'Xử lý vi phạm (Phạt trễ hạn, làm mất/hỏng sách)', view: true, add: true, edit: true, del: false }
      ]
    },
    {
      group: '4. Báo cáo & Quản trị hệ thống',
      items: [
        { name: 'Xem biểu đồ thống kê & xuất báo cáo', view: true, add: false, edit: false, del: false },
        { name: 'Quản lý hồ sơ nhân viên & Cấp tài khoản', view: false, add: false, edit: false, del: false },
        { name: 'Thiết lập quy định & Phân quyền hệ thống', view: false, add: false, edit: false, del: false }
      ]
    }
  ],
  'NHÂN VIÊN': [
    {
      group: '1. Quản lý Kho sách & Tài liệu',
      items: [
        { name: 'Quản lý Đầu sách & Thể loại', view: true, add: false, edit: false, del: false },
        { name: 'Quản lý Bản sao (Đánh mã vạch, vị trí kệ)', view: true, add: false, edit: false, del: false },
        { name: 'Nhập sách mới & Quản lý Nhà cung cấp', view: false, add: false, edit: false, del: false }
      ]
    },
    {
      group: '2. Quản lý Độc giả',
      items: [
        { name: 'Cấp mới, gia hạn & khóa thẻ thư viện', view: true, add: false, edit: false, del: false },
        { name: 'Tra cứu thông tin & lịch sử mượn của độc giả', view: true, add: false, edit: false, del: false }
      ]
    },
    {
      group: '3. Quản lý Mượn - Trả (Lưu thông)',
      items: [
        { name: 'Lập phiếu mượn, ghi nhận trả sách & gia hạn', view: true, add: false, edit: false, del: false },
        { name: 'Xử lý vi phạm (Phạt trễ hạn, làm mất/hỏng sách)', view: false, add: false, edit: false, del: false }
      ]
    },
    {
      group: '4. Báo cáo & Quản trị hệ thống',
      items: [
        { name: 'Xem biểu đồ thống kê & xuất báo cáo', view: false, add: false, edit: false, del: false },
        { name: 'Quản lý hồ sơ nhân viên & Cấp tài khoản', view: false, add: false, edit: false, del: false },
        { name: 'Thiết lập quy định & Phân quyền hệ thống', view: false, add: false, edit: false, del: false }
      ]
    }
  ]
};

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
  KEYS: {
    VERSION: 'ixs_data_version',
    EMPLOYEES: 'ixs_library_employees',
    PERMISSIONS: 'ixs_library_permissions',
    LOGS: 'ixs_library_logs',
    BOOK_TITLES: 'ixs_library_book_titles',
    BOOK_COPIES: 'ixs_library_book_copies',
    IMPORT_RECEIPTS: 'ixs_library_import_receipts',
    SUPPLIERS: 'ixs_library_suppliers',
    PUBLISHERS: 'ixs_library_publishers',
    READERS: 'ixs_library_readers',
    READER_HISTORY: 'ixs_library_reader_history',
    RULES: 'ixs_library_rules'
  },

  init() {
    const savedVersion = localStorage.getItem(this.KEYS.VERSION);
    if (savedVersion !== CURRENT_DATA_VERSION) {
      localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(defaultEmployees));
      localStorage.setItem(this.KEYS.PERMISSIONS, JSON.stringify(defaultPermissions));
      localStorage.setItem(this.KEYS.LOGS, JSON.stringify(defaultLogs));
      localStorage.setItem(this.KEYS.BOOK_TITLES, JSON.stringify(defaultBookTitles));
      localStorage.setItem(this.KEYS.BOOK_COPIES, JSON.stringify(defaultBookCopies));
      localStorage.setItem(this.KEYS.IMPORT_RECEIPTS, JSON.stringify(defaultImportReceipts));
      localStorage.setItem(this.KEYS.SUPPLIERS, JSON.stringify(defaultSuppliers));
      localStorage.setItem(this.KEYS.PUBLISHERS, JSON.stringify(defaultPublishers));
      localStorage.setItem(this.KEYS.READERS, JSON.stringify(defaultReaders));
      localStorage.setItem(this.KEYS.READER_HISTORY, JSON.stringify(defaultReaderHistory));
      localStorage.setItem(this.KEYS.RULES, JSON.stringify(defaultLibraryRules));
      localStorage.setItem(this.KEYS.VERSION, CURRENT_DATA_VERSION);
      return;
    }

    const defaults = [
      [this.KEYS.EMPLOYEES, defaultEmployees],
      [this.KEYS.PERMISSIONS, defaultPermissions],
      [this.KEYS.LOGS, defaultLogs],
      [this.KEYS.BOOK_TITLES, defaultBookTitles],
      [this.KEYS.BOOK_COPIES, defaultBookCopies],
      [this.KEYS.IMPORT_RECEIPTS, defaultImportReceipts],
      [this.KEYS.SUPPLIERS, defaultSuppliers],
      [this.KEYS.PUBLISHERS, defaultPublishers],
      [this.KEYS.READERS, defaultReaders],
      [this.KEYS.READER_HISTORY, defaultReaderHistory],
      [this.KEYS.RULES, defaultLibraryRules]
    ];

    defaults.forEach(([key, fallback]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(fallback));
      }
    });
  },

  getAll(key, fallback = []) {
    // TODO: Backend API Integration point (GET /api/{resource})
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  saveAll(key, data) {
    // TODO: Backend API Integration point (PUT /api/{resource})
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },

  getById(key, id, idField = 'id') {
    // TODO: Backend API Integration point (GET /api/{resource}/:id)
    const list = this.getAll(key, []);
    return list.find(item => item && item[idField] === id) || null;
  },

  create(key, item, prepend = false) {
    // TODO: Backend API Integration point (POST /api/{resource})
    const list = this.getAll(key, []);
    if (prepend) {
      list.unshift(item);
    } else {
      list.push(item);
    }
    this.saveAll(key, list);
    return item;
  },

  update(key, id, updates, idField = 'id') {
    // TODO: Backend API Integration point (PATCH /api/{resource}/:id)
    const list = this.getAll(key, []);
    const index = list.findIndex(item => item && item[idField] === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    this.saveAll(key, list);
    return list[index];
  },

  remove(key, id, idField = 'id') {
    // TODO: Backend API Integration point (DELETE /api/{resource}/:id)
    const list = this.getAll(key, []);
    const filtered = list.filter(item => item && item[idField] !== id);
    this.saveAll(key, filtered);
    return filtered;
  },

  generateNextId(key, prefix, padLength, idField = 'id') {
    const list = this.getAll(key, []);
    let maxNum = 0;
    list.forEach(item => {
      const rawId = item && item[idField] ? String(item[idField]) : '';
      if (rawId.startsWith(prefix)) {
        const numPart = parseInt(rawId.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
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

function getPermissions() {
  return DataService.getAll(DataService.KEYS.PERMISSIONS, defaultPermissions);
}

function savePermissions(perms) {
  return DataService.saveAll(DataService.KEYS.PERMISSIONS, perms);
}

function getLogs() {
  return DataService.getAll(DataService.KEYS.LOGS, defaultLogs);
}

function addLog(action, target, detail) {
  const logs = getLogs();
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  let activeUser = 'Quản trị viên';
  let activeId = '12026001';
  try {
    const sessionRaw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (sessionRaw) {
      const s = JSON.parse(sessionRaw);
      activeUser = s.fullName || s.name || activeUser;
      activeId = s.id || activeId;
    }
  } catch (e) {}

  logs.unshift({
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

initAdminData();
