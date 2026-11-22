// Business data comes from PostgreSQL. Only editable configuration has local defaults.
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
 * Repository frontend: authenticated REST requests, in-memory cache and queued writes.
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
    FINES: 'ixs_library_fines',
    SUGGESTIONS: 'ixs_library_suggestions',
    CATEGORIES: 'ixs_library_categories',
    RULES: 'ixs_library_rules'
  },

  session() {
    try { return JSON.parse(sessionStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_session') || '{}'); } catch (_) { return {}; }
  },
  async logout() {
    try { await this.request('POST', '/auth/logout', {}); } catch (_) {}
    this.clearSession();
  },
  clearSession() {
    for (const storage of [sessionStorage, localStorage]) for (const key of ['ixs_library_session','ixs_library_current_user']) storage.removeItem(key);
    this._cache = {}; this._snapshots = {};
  },
  init() {
    this._cache = {};
    const defaultData = {
      [this.KEYS.PERMISSIONS]: defaultPermissions,
      [this.KEYS.RULES]: defaultLibraryRules
    };

    Object.values(this.KEYS).forEach(key => {
      const fallback = defaultData[key] || [];
      this._cache[key] = Array.isArray(fallback) ? [] : fallback;
    });

    this._snapshots = {};
    this._writes = {};
    this._writeErrors = {};
    const resources = Object.values(this.KEYS)
      .map(key => ({ key, resource: this.resourceForKey(key), fallback: defaultData[key] || [] }))
      .filter(item => {
        if (!item.resource) return false;
        if (['bookTitles','bookCopies','categories','config:library_rules'].includes(item.resource)) return true;
        const session = this.session();
        if (!session.token) return false;
        if (session.accountType === 'employee') return ['config:permissions','employees'].includes(item.resource)
          ? /quản trị|admin/i.test(session.role || '') : true;
        return ['readers','readerHistory','fines','suggestions'].includes(item.resource);
      });
    this.ready = Promise.all(resources.map(item => this.hydrate(item.key, item.resource, item.fallback).catch(() => this._cache[item.key])));
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
      [this.KEYS.FINES]: 'fines',
      [this.KEYS.SUGGESTIONS]: 'suggestions',
      [this.KEYS.CATEGORIES]: 'categories',
      [this.KEYS.RULES]: 'config:library_rules'
    }[key] || null;
  },

  request(method, path, body) {
    return fetch(`${this.API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.session().token ? { Authorization: 'Bearer ' + this.session().token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    }).then(async response => {
      if (!response.ok) {
        let payload = {};
        try { payload = await response.json(); } catch (_) {}
        const error = new Error(payload.error || `API ${method} ${path} failed (${response.status})`);
        error.status = response.status;
        if (response.status === 401 && path !== '/auth/login') {
          this.clearSession();
          if (/\/(admin|user)\//.test(location.pathname) && !location.pathname.endsWith('/catalog.html')) location.replace('../login.html');
        }
        throw error;
      }
      return response.status === 204 ? null : response.json();
    }).catch(error => {
      if (error instanceof TypeError && error.status === undefined) error.status = 0;
      throw error;
    });
  },

  getAll(key, fallback = []) {
    return this._cache?.[key] ?? (Array.isArray(fallback) ? [] : fallback);
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
  return DataService.getAll(DataService.KEYS.EMPLOYEES);
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
  return DataService.getAll(DataService.KEYS.LOGS);
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
  return DataService.getAll(DataService.KEYS.BOOK_TITLES);
}

function saveBookTitles(list) {
  return DataService.saveAll(DataService.KEYS.BOOK_TITLES, list);
}

function getBookCopies() {
  return DataService.getAll(DataService.KEYS.BOOK_COPIES);
}

function saveBookCopies(list) {
  return DataService.saveAll(DataService.KEYS.BOOK_COPIES, list);
}

function getImportReceipts() {
  return DataService.getAll(DataService.KEYS.IMPORT_RECEIPTS);
}

function saveImportReceipts(list) {
  return DataService.saveAll(DataService.KEYS.IMPORT_RECEIPTS, list);
}

function getSuppliers() {
  return DataService.getAll(DataService.KEYS.SUPPLIERS);
}

function saveSuppliers(list) {
  return DataService.saveAll(DataService.KEYS.SUPPLIERS, list);
}

function getPublishers() {
  return DataService.getAll(DataService.KEYS.PUBLISHERS);
}

function savePublishers(list) {
  return DataService.saveAll(DataService.KEYS.PUBLISHERS, list);
}

function getReaders() {
  return DataService.getAll(DataService.KEYS.READERS);
}

function saveReaders(list) {
  return DataService.saveAll(DataService.KEYS.READERS, list);
}

function getReaderHistory() {
  return DataService.getAll(DataService.KEYS.READER_HISTORY);
}

function saveReaderHistory(list) {
  return DataService.saveAll(DataService.KEYS.READER_HISTORY, list);
}

function getFines() {
  return DataService.getAll(DataService.KEYS.FINES);
}

function saveFines(list) {
  return DataService.saveAll(DataService.KEYS.FINES, list);
}

function getBookSuggestions() {
  return DataService.getAll(DataService.KEYS.SUGGESTIONS);
}

function saveBookSuggestions(list) {
  return DataService.saveAll(DataService.KEYS.SUGGESTIONS, list);
}

function getCategories() {
  return DataService.getAll(DataService.KEYS.CATEGORIES);
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
