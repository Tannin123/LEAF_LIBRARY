const CURRENT_DATA_VERSION = 'v6_postgresql_source_of_truth';

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
  API_BASE_URL: 'http://localhost:3000/api',
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
    this._cache = {
      [this.KEYS.EMPLOYEES]: [], [this.KEYS.PERMISSIONS]: defaultPermissions,
      [this.KEYS.LOGS]: [], [this.KEYS.BOOK_TITLES]: [], [this.KEYS.BOOK_COPIES]: [],
      [this.KEYS.IMPORT_RECEIPTS]: [], [this.KEYS.SUPPLIERS]: [], [this.KEYS.PUBLISHERS]: [],
      [this.KEYS.READERS]: [], [this.KEYS.READER_HISTORY]: [], [this.KEYS.RULES]: defaultLibraryRules
    };
    this._snapshots = {};
    this._writes = {};
    this._writeErrors = {};
    const resources = Object.entries(this.KEYS)
      .map(([name, key]) => ({ key, resource: this.resourceForKey(key), fallback: name === 'PERMISSIONS' ? defaultPermissions : name === 'RULES' ? defaultLibraryRules : [] }))
      .filter(item => item.resource);
    this.ready = Promise.all(resources.map(item => this.hydrate(item.key, item.resource, item.fallback)));
  },

  resourceForKey(key) {
    return {
      [this.KEYS.EMPLOYEES]: 'employees',
      [this.KEYS.PERMISSIONS]: 'config:permissions',
      [this.KEYS.LOGS]: 'logs',
      [this.KEYS.BOOK_TITLES]: 'bookTitles',
      [this.KEYS.BOOK_COPIES]: 'bookCopies',
      [this.KEYS.IMPORT_RECEIPTS]: 'importReceipts',
      [this.KEYS.SUPPLIERS]: 'suppliers',
      [this.KEYS.PUBLISHERS]: 'publishers',
      [this.KEYS.READERS]: 'readers',
      [this.KEYS.READER_HISTORY]: 'readerHistory',
      [this.KEYS.RULES]: 'config:library_rules'
    }[key] || null;
  },

  request(method, path, body) {
    return fetch(`${this.API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
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
    if (resource === 'readerHistory') {
      let session = {};
      try { session = JSON.parse(localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user') || '{}'); } catch (_) {}
      const readerId = session.id || session.readerId || session.maBanDoc;
      if (!readerId) {
        this._cache[key] = [];
        this._snapshots[key] = [];
        return [];
      }
      path += `?readerId=${encodeURIComponent(readerId)}`;
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
    const unsupportedFields = [...new Set(next.flatMap(item => this.erdUnsupportedFields(resource, item)))];
    if (unsupportedFields.length) window.dispatchEvent(new CustomEvent('ixs:erd-unsupported', { detail: { resource, fields: unsupportedFields } }));
    const persistedNext = next.map(item => this.toErdRecord(resource, item));
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

  toErdRecord(resource, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const record = this.clone(item);
    this.erdUnsupportedFields(resource, item).forEach(field => delete record[field]);
    return record;
  },

  erdUnsupportedFields(resource, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const fieldsByResource = {
      readers: [],
      employees: [],
      bookTitles: [],
      bookCopies: [],
      importReceipts: []
    };
    return (fieldsByResource[resource] || []).filter(field => item[field] !== undefined && item[field] !== null && item[field] !== '');
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
        const numPart = parseInt(rawId.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
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
