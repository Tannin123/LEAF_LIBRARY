// Global UI icons
var ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
var ICON_LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
var ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
var ICON_PRINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;
var ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
var ICON_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
var ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
var ICON_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

function getActiveUserSession() {
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const emps = getEmployees();
  return emps[0] || {
    id: 'NV001',
    fullName: 'Quản trị viên',
    name: 'Quản trị viên',
    role: 'QUẢN TRỊ VIÊN',
    email: 'admin',
    phone: '0906.789.982',
    dob: '21 / 02 / 2026',
    gender: 'Nam',
    address: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM'
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // Kiểm tra phân quyền nhân viên / quản trị
  try {
    const rawSession = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (rawSession) {
      const parsedSession = JSON.parse(rawSession);
      const isReaderOnly = parsedSession.accountType === 'reader' || (parsedSession.role === 'Độc giả' && parsedSession.accountType !== 'employee');
      if (isReaderOnly) {
        window.location.href = '../user/index.html';
        return;
      }
      if (parsedSession.accountType === 'employee' && !isLibraryAdmin(parsedSession.role)) {
        const employeeLink = document.querySelector('.sidebar-item[href="index.html"]');
        if (employeeLink?.classList.contains('active')) {
          window.location.replace('books.html');
          return;
        }
        employeeLink?.remove();
      }
      if (parsedSession.accountType === 'employee') {
        try {
          const role = isLibraryAdmin(parsedSession.role) ? 'admin' : 'librarian';
          const result = await DataService.request('GET', `/config/permissions?role=${role}`);
          if (result.value?.reports?.view === false) {
            const reportsLink = document.querySelector('.sidebar-item[href="reports.html"]');
            if (reportsLink?.classList.contains('active')) {
              window.location.replace('books.html');
              return;
            }
            reportsLink?.remove();
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  function escapeAdminHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function showAdminOfflineBanner(message) {
    if (document.getElementById('adminOfflineBanner')) return;
    const target = document.querySelector('.content-section') || document.body;
    const banner = document.createElement('div');
    banner.id = 'adminOfflineBanner';
    banner.className = 'data-status-banner is-error';
    banner.setAttribute('role', 'alert');
    const text = document.createElement('span');
    text.textContent = message || 'Không thể kết nối máy chủ PostgreSQL. Đang hiển thị dữ liệu bộ nhớ đệm cục bộ.';
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.textContent = 'Thử lại';
    retryBtn.style.cssText = 'background:#fff;border:1px solid currentColor;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:600;color:inherit;';
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Đang kết nối...';
      try {
        DataService.init();
        await DataService.ready;
        banner.remove();
        window.location.reload();
      } catch (_) {
        retryBtn.disabled = false;
        retryBtn.textContent = 'Thử lại';
      }
    });
    banner.appendChild(text);
    banner.appendChild(retryBtn);
    target.insertBefore(banner, target.firstChild);
  }

  function openAdminConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false } = {}) {
    return new Promise(resolve => {
      let modal = document.getElementById('modalAdminConfirmGlobal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modalAdminConfirmGlobal';
        modal.innerHTML = `
          <div class="modal-box modal-box-sm" role="dialog" aria-modal="true" aria-labelledby="adminConfirmTitle" aria-describedby="adminConfirmMessage">
            <div class="modal-header">
              <div class="modal-title" id="adminConfirmTitle">Xác nhận</div>
              <button type="button" class="modal-close-btn" id="adminConfirmCloseBtn" aria-label="Đóng">✕</button>
            </div>
            <div class="modal-body">
              <p class="admin-confirm-message" id="adminConfirmMessage"></p>
              <div class="admin-confirm-actions">
                <button type="button" class="btn-action-gray" id="adminConfirmCancelBtn">Hủy</button>
                <button type="button" class="btn-action-blue" id="adminConfirmOkBtn">Xác nhận</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const titleEl = document.getElementById('adminConfirmTitle');
      const msgEl = document.getElementById('adminConfirmMessage');
      const okBtn = document.getElementById('adminConfirmOkBtn');
      const cancelBtn = document.getElementById('adminConfirmCancelBtn');
      const closeBtn = document.getElementById('adminConfirmCloseBtn');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (okBtn) {
        okBtn.textContent = confirmText;
        okBtn.style.backgroundColor = danger ? '#DC2626' : '';
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;

      const finish = (result) => {
        modal.classList.remove('active');
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
        closeBtn?.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };
      const onOk = () => finish(true);
      const onCancel = () => finish(false);
      const onBackdrop = (e) => { if (e.target === modal) finish(false); };
      const onEsc = (e) => { if (e.key === 'Escape') finish(false); };

      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);
      closeBtn?.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onEsc);

      modal.classList.add('active');
      okBtn?.focus();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModals = Array.from(document.querySelectorAll('.modal-overlay.active, .modal-overlay[style*="display: flex"]'));
    const topModal = openModals[openModals.length - 1];
    if (topModal && topModal.id !== 'modalAdminConfirmGlobal') {
      topModal.classList.remove('active');
      if (topModal.style.display === 'flex') topModal.style.display = 'none';
    }
  });

  try {
    initAdminData();
    await DataService.ready;
  } catch (error) {
    console.warn('Could not load library data from PostgreSQL:', error);
    showAdminOfflineBanner('Không thể kết nối máy chủ API PostgreSQL. Hệ thống tạm dùng dữ liệu bộ nhớ đệm cục bộ.');
  }
  window.addEventListener('ixs:data-error', event => {
    const message = event.detail?.message || 'Không lưu được dữ liệu vào PostgreSQL.';
    showToast(`Không lưu được thay đổi: ${message}`, 'error');
  });
  window.addEventListener('ixs:unsupported-data', event => {
    const key = event.detail?.key || 'Dữ liệu này';
    showToast(`${key}: ERD hiện không có bảng lưu mục này; thay đổi chỉ tồn tại trong bộ nhớ đến khi tải lại trang.`, 'warning');
  });
  const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const ICON_LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
  const ICON_PRINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;
  const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
  const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const ICON_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

  /**
   * Hiển thị thông báo Toast góc trên bên phải (an toàn XSS, hỗ trợ nút Hoàn tác)
   */
  function showToast(message, type = 'success', action = null) {
    let container = document.getElementById('leafToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'leafToastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.className = `toast-item toast-${type}`;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const msgSpan = document.createElement('span');
    msgSpan.textContent = String(message ?? '');
    item.appendChild(msgSpan);

    if (action && typeof action.onClick === 'function' && action.label) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'toast-undo-btn';
      undoBtn.textContent = action.label;
      undoBtn.addEventListener('click', () => {
        action.onClick();
        item.remove();
      });
      item.appendChild(undoBtn);
    }

    container.appendChild(item);
    const delay = action ? 5500 : 3000;
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.25s ease';
      setTimeout(() => item.remove(), 260);
    }, delay);
  }
  window.showToast = showToast;
  window.openAdminConfirmModal = openAdminConfirmModal;
  window.escapeAdminHtml = escapeAdminHtml;

  /**
   * Render khung Empty State khi bảng hoặc lưới chưa có dữ liệu
   */
  function renderEmptyState(isFiltered, addBtnLabel = 'Thêm mới +') {
    if (isFiltered) {
      return `<div class="empty-state-box">Không tìm thấy dữ liệu phù hợp.</div>`;
    }
    return `<div class="empty-state-box">Chưa có dữ liệu. Hãy nhấn nút [${addBtnLabel}] ở góc phải để bắt đầu tạo dữ liệu.</div>`;
  }

  /**
   * Widget quản lý tải ảnh từ máy (FileReader Base64) hoặc dán URL hình ảnh
   */
  function setupMediaUploadWidget(config) {
    const banner = document.getElementById(config.bannerId);
    const defaultGraphic = document.getElementById(config.defaultGraphicId);
    const placeholder = document.getElementById(config.placeholderId);
    const imgPreview = document.getElementById(config.imgPreviewId);
    const resetBtn = document.getElementById(config.resetBtnId);
    const fileInput = document.getElementById(config.fileInputId);
    const urlInput = document.getElementById(config.urlInputId);

    if (!banner || !imgPreview) {
      return { getValue: () => '', setState: () => {} };
    }

    let currentData = '';

    function renderState(mode, src = '') {
      currentData = src || '';
      if (mode === 'image' && src) {
        banner.classList.remove('is-placeholder');
        if (defaultGraphic) defaultGraphic.style.display = 'none';
        if (placeholder) placeholder.classList.remove('active');
        imgPreview.src = src;
        imgPreview.classList.add('active');
      } else if (mode === 'default') {
        banner.classList.remove('is-placeholder');
        if (defaultGraphic) defaultGraphic.style.display = 'flex';
        if (placeholder) placeholder.classList.remove('active');
        imgPreview.removeAttribute('src');
        imgPreview.classList.remove('active');
      } else {
        banner.classList.add('is-placeholder');
        if (defaultGraphic) defaultGraphic.style.display = 'none';
        if (placeholder) placeholder.classList.add('active');
        imgPreview.removeAttribute('src');
        imgPreview.classList.remove('active');
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        renderState('placeholder', '');
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target && ev.target.result) {
            if (urlInput) urlInput.value = '';
            renderState('image', ev.target.result);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const val = urlInput.value.trim();
        if (val) {
          renderState('image', val);
        } else {
          renderState('placeholder', '');
        }
      });
    }

    return {
      getValue: () => currentData,
      setState: (src, useDefaultWhenEmpty = false) => {
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = src && !src.startsWith('data:') ? src : '';
        if (src) {
          renderState('image', src);
        } else if (useDefaultWhenEmpty) {
          renderState('default', '');
        } else {
          renderState('placeholder', '');
        }
      }
    };
  }

  /**
   * Render thanh Phân trang chuẩn (< 1 2 3 ... >)
   */
  function renderDynamicPagination(containerId, totalItems, pageSize, currentPage, onPageSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    let html = `<button type="button" class="page-box ${safePage <= 1 ? 'disabled' : ''}" data-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>&lt;</button>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `<button type="button" class="page-box ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    html += `<button type="button" class="page-box ${safePage >= totalPages ? 'disabled' : ''}" data-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>&gt;</button>`;
    container.innerHTML = html;

    container.querySelectorAll('.page-box:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(target) && target >= 1 && target <= totalPages && target !== safePage) {
          onPageSelect(target);
        }
      });
    });
  }

  function formatTodayDate() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d} / ${m} / ${y}`;
  }

  function calculateExpiryDateStr(monthsToAdd) {
    const now = new Date();
    now.setMonth(now.getMonth() + (parseInt(monthsToAdd, 10) || 12));
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d} / ${m} / ${y}`;
  }

  function parseVNDate(str) {
    if (!str) return null;
    const cleaned = str.replace(/\s+/g, '');
    const parts = cleaned.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  }

  function parseNumberClean(val) {
    if (typeof val === 'number') return val;
    const cleaned = String(val || '').replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  function formatVND(num) {
    const n = parseNumberClean(num);
    return n.toLocaleString('vi-VN');
  }

  /**
   * Đồng bộ tổng số lượng tồn kho và sẵn sàng của Đầu sách từ danh sách Bản sao
   */
  function syncBookCountsWithCopies(bookId) {
    if (!bookId) return;
    const books = getBookTitles();
    const copies = getBookCopies();
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const bookCopies = copies.filter(c => c.bookId === bookId);
    book.total = bookCopies.length;
    book.available = bookCopies.filter(c => c.circulationStatus === 'SẴN SÀNG').length;
    saveBookTitles(books);
  }

  /**
   * Tự động sinh các bản sao cuốn sách (Mã cá biệt) khi tạo Đầu sách hoặc lập Phiếu nhập
   */
  function autoGenerateCopiesForBook(bookId, bookTitle, count, priceStr, coverUrl = '', shelfLocation = 'A1 - Ngăn 1') {
    const qty = parseInt(count, 10) || 0;
    if (qty <= 0) return [];
    const copies = getBookCopies();
    let maxIdx = 0;
    copies.forEach(c => {
      const m = String(c.id || '').match(/^CS(\d+)$/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (idx > maxIdx) maxIdx = idx;
      }
    });

    const createdIds = [];
    for (let i = 1; i <= qty; i++) {
      const copyId = `CS${String(maxIdx + i).padStart(3, '0')}`;
      copies.push({
        id: copyId,
        bookId: bookId,
        bookTitle: bookTitle,
        location: shelfLocation,
        physicalStatus: 'TỐT',
        circulationStatus: 'SẴN SÀNG',
        price: priceStr || '100.000',
        coverUrl: coverUrl || ''
      });
      createdIds.push(copyId);
    }
    saveBookCopies(copies);
    return createdIds;
  }

  function syncGreetingBanner() {
    const session = getActiveUserSession();
    const greetName = session.fullName || session.name || 'Quản trị viên';
    document.querySelectorAll('.greeting-name, #headerGreetingName').forEach(el => {
      el.textContent = greetName;
    });
    const dropName = document.getElementById('dropdownUserName');
    if (dropName) dropName.textContent = greetName;
    const dropCode = document.getElementById('dropdownUserCode');
    if (dropCode) dropCode.textContent = `Mã NV: ${session.id || 'NV001'}`;
    const dropRole = document.getElementById('dropdownUserRole');
    if (dropRole) dropRole.textContent = session.role || 'QUẢN TRỊ VIÊN';

    const avatarImg = document.getElementById('headerAvatarImg');
    const avatarIcon = document.getElementById('headerAvatarDefaultIcon');
    if (avatarImg && avatarIcon) {
      if (session.avatarUrl) {
        avatarImg.src = session.avatarUrl;
        avatarImg.style.display = 'block';
        avatarIcon.style.display = 'none';
      } else {
        avatarImg.style.display = 'none';
        avatarIcon.style.display = 'block';
      }
    }
  }

  syncGreetingBanner();

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarMenu = document.getElementById('sidebarMenu');
  if (sidebarToggle && sidebarMenu) {
    if (localStorage.getItem('ixs_sidebar_collapsed') === '1') {
      sidebarMenu.classList.add('collapsed');
      sidebarToggle.classList.add('collapsed');
    }
    sidebarToggle.addEventListener('click', () => {
      const isCol = sidebarMenu.classList.toggle('collapsed');
      sidebarToggle.classList.toggle('collapsed', isCol);
      localStorage.setItem('ixs_sidebar_collapsed', isCol ? '1' : '0');
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function setupHeaderUserMenu() {
    const btnUserAvatar = document.getElementById('btnUserAvatar');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const headerUserContainer = document.getElementById('headerUserContainer');

    if (btnUserAvatar && userDropdownMenu) {
      btnUserAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle('active');
      });
      document.addEventListener('click', (e) => {
        if (headerUserContainer && !headerUserContainer.contains(e.target)) {
          userDropdownMenu.classList.remove('active');
        }
      });
    }

    let selfModal = document.getElementById('modalSelfProfileGlobal');
    if (!selfModal) {
      selfModal = document.createElement('div');
      selfModal.className = 'modal-overlay';
      selfModal.id = 'modalSelfProfileGlobal';
      selfModal.innerHTML = `
        <div class="modal-box modal-box-md">
          <div class="modal-header">
            <div class="modal-title">LEAF LIBRARY - THÔNG TIN TÀI KHOẢN</div>
            <button type="button" class="modal-close-btn" data-close="modalSelfProfileGlobal">✕</button>
          </div>
          <div class="modal-body">
            <div class="supplier-form-stack">
              <div class="supplier-row-2col">
                <div class="supplier-field-block">
                  <label class="supplier-label-italic">Mã nhân viên</label>
                  <div class="supplier-code-readonly" id="selfProfileId">NV001</div>
                </div>
                <div class="supplier-field-block">
                  <label class="supplier-label-italic">Họ và tên hiển thị</label>
                  <input type="text" class="form-input-text" id="selfProfileName">
                </div>
              </div>
              <div class="supplier-row-equal">
                <div class="supplier-field-block">
                  <label class="supplier-label-italic">Số điện thoại</label>
                  <input type="text" class="form-input-text" id="selfProfilePhone">
                </div>
                <div class="supplier-field-block">
                  <label class="supplier-label-italic">Email</label>
                  <input type="text" class="form-input-text" id="selfProfileEmail">
                </div>
              </div>
              <div class="supplier-field-block">
                <label class="supplier-label-italic">Địa chỉ liên hệ</label>
                <input type="text" class="form-input-text" id="selfProfileAddress">
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                <button type="button" class="btn-action-gray" data-close="modalSelfProfileGlobal" style="width: 120px;">ĐÓNG</button>
                <button type="button" class="btn-action-blue" id="btnSaveSelfProfile" style="width: 170px;">LƯU HỒ SƠ</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(selfModal);
    }

    let pwdModal = document.getElementById('modalChangePasswordGlobal');
    if (!pwdModal) {
      pwdModal = document.createElement('div');
      pwdModal.className = 'modal-overlay';
      pwdModal.id = 'modalChangePasswordGlobal';
      pwdModal.innerHTML = `
        <div class="modal-box modal-box-sm">
          <div class="modal-header">
            <div class="modal-title">LEAF LIBRARY - ĐỔI MẬT KHẨU</div>
            <button type="button" class="modal-close-btn" data-close="modalChangePasswordGlobal">✕</button>
          </div>
          <div class="modal-body">
            <div class="supplier-form-stack">
              <div class="supplier-field-block">
                <label class="supplier-label-italic">Mật khẩu hiện tại</label>
                <input type="password" class="form-input-text" id="selfCurrentPwdInput" placeholder="Nhập mật khẩu hiện tại...">
              </div>
              <div class="supplier-field-block">
                <label class="supplier-label-italic">Mật khẩu mới</label>
                <input type="password" class="form-input-text" id="selfNewPwdInput" placeholder="Tối thiểu 6 ký tự...">
              </div>
              <div class="confirm-buttons-row" style="margin-top: 8px;">
                <button type="button" class="btn-action-gray" data-close="modalChangePasswordGlobal">HỦY BỎ</button>
                <button type="button" class="btn-action-blue" id="btnConfirmSelfChangePwd">CẬP NHẬT</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(pwdModal);
    }

    const btnOpenMyAccount = document.getElementById('btnOpenMyAccount');
    if (btnOpenMyAccount) {
      btnOpenMyAccount.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.classList.remove('active');
        const current = getActiveUserSession();
        document.getElementById('selfProfileId').textContent = current.id || 'NV001';
        document.getElementById('selfProfileName').value = current.fullName || current.name || '';
        document.getElementById('selfProfilePhone').value = current.phone || '';
        document.getElementById('selfProfileEmail').value = current.email || '';
        document.getElementById('selfProfileAddress').value = current.address || '';
        openModal('modalSelfProfileGlobal');
      });
    }

    const btnSaveSelf = document.getElementById('btnSaveSelfProfile');
    if (btnSaveSelf) {
      btnSaveSelf.addEventListener('click', () => {
        const current = getActiveUserSession();
        const newName = document.getElementById('selfProfileName').value.trim() || current.name || 'Quản trị viên';
        const newPhone = document.getElementById('selfProfilePhone').value.trim();
        const newEmail = document.getElementById('selfProfileEmail').value.trim();
        const newAddress = document.getElementById('selfProfileAddress').value.trim();

        current.fullName = newName;
        current.name = newName;
        current.phone = newPhone;
        current.email = newEmail;
        current.address = newAddress;

        localStorage.setItem('ixs_library_session', JSON.stringify(current));
        localStorage.setItem('ixs_library_current_user', JSON.stringify(current));

        const emps = getEmployees();
        const emp = emps.find(item => item.id === current.id);
        if (emp) {
          emp.name = newName;
          emp.phone = newPhone;
          emp.email = newEmail;
          emp.address = newAddress;
          saveEmployees(emps);
        }

        syncGreetingBanner();
        closeModal('modalSelfProfileGlobal');
        showToast('Đã cập nhật thông tin tài khoản!');
      });
    }

    const btnOpenChangePassword = document.getElementById('btnOpenChangePassword');
    if (btnOpenChangePassword) {
      btnOpenChangePassword.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.classList.remove('active');
        document.getElementById('selfCurrentPwdInput').value = '';
        document.getElementById('selfNewPwdInput').value = '';
        openModal('modalChangePasswordGlobal');
      });
    }

    const btnConfirmSelfChangePwd = document.getElementById('btnConfirmSelfChangePwd');
    if (btnConfirmSelfChangePwd) {
      btnConfirmSelfChangePwd.addEventListener('click', async () => {
        const currentPwd = document.getElementById('selfCurrentPwdInput').value;
        const newPwd = document.getElementById('selfNewPwdInput').value.trim();
        if (!currentPwd) {
          showToast('Vui lòng nhập mật khẩu hiện tại!', 'error');
          document.getElementById('selfCurrentPwdInput')?.focus();
          return;
        }
        if (!newPwd || newPwd.length < 8) {
          showToast('Mật khẩu mới phải có ít nhất 8 ký tự!', 'error');
          document.getElementById('selfNewPwdInput')?.focus();
          return;
        }
        if (newPwd === currentPwd) {
          showToast('Mật khẩu mới không được trùng mật khẩu hiện tại!', 'error');
          return;
        }
        const current = getActiveUserSession();
        const origText = btnConfirmSelfChangePwd.textContent;
        btnConfirmSelfChangePwd.disabled = true;
        btnConfirmSelfChangePwd.textContent = 'Đang xử lý...';
        try {
          await DataService.request('POST', '/auth/password/change', {
            username: current.username,
            currentPassword: currentPwd,
            newPassword: newPwd
          });
        } catch (error) {
          showToast(error.message || 'Không đổi được mật khẩu.', 'error');
          btnConfirmSelfChangePwd.disabled = false;
          btnConfirmSelfChangePwd.textContent = origText;
          return;
        }
        btnConfirmSelfChangePwd.disabled = false;
        btnConfirmSelfChangePwd.textContent = origText;
        addLog('CẬP NHẬT', current.id || 'NV001', `Đổi mật khẩu cá nhân cho tài khoản <strong>${escapeAdminHtml(current.name || 'Quản trị viên')}</strong>`);
        closeModal('modalChangePasswordGlobal');
        showToast('Đã đổi mật khẩu thành công!');
      });
    }

    const btnUserLogout = document.getElementById('btnUserLogout');
    if (btnUserLogout) {
      btnUserLogout.addEventListener('click', async () => {
        const ok = await openAdminConfirmModal({
          title: 'Đăng xuất tài khoản',
          message: 'Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?',
          confirmText: 'Đăng xuất',
          cancelText: 'Ở lại',
          danger: true
        });
        if (!ok) return;
        const current = getActiveUserSession();
        addLog('ĐĂNG NHẬP', current.id || 'NV001', `Nhân viên <strong>${escapeAdminHtml(current.name || 'Quản trị viên')}</strong> đã đăng xuất khỏi hệ thống.`);
        await DataService.request('POST', '/auth/logout').catch(() => {});
        sessionStorage.removeItem('ixs_library_token');
        sessionStorage.removeItem('ixs_library_session');
        sessionStorage.removeItem('ixs_library_current_user');
        localStorage.removeItem('ixs_library_session');
        localStorage.removeItem('ixs_library_current_user');
        window.location.href = '../login.html';
      });
    }
  }

  setupHeaderUserMenu();

  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      closeModal(closeBtn.getAttribute('data-close'));
    }
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  const subTabs = document.querySelectorAll('.subtab-item, .sub-tab');
  const tabPanels = document.querySelectorAll('.tab-content-panel');

  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subTabs.forEach(t => t.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab') || tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  /**
   * 1. PHÂN HỆ QUẢN LÝ NHÂN VIÊN (admin/index.html)
   */
  const employeeTableContent = document.getElementById('tableContent') || document.getElementById('employeeTableContent');

  if (employeeTableContent) {
    const searchEmpInput = document.getElementById('searchInput') || document.getElementById('searchEmployeeInput');
    const filterRoleSelect = document.getElementById('roleFilter') || document.getElementById('filterRoleSelect');

    const permRoleSelect = document.getElementById('permRoleSelect');
    const permTableContent = document.getElementById('permTableContent');

    const empUploadWidget = setupMediaUploadWidget({
      bannerId: 'empMediaBanner',
      defaultGraphicId: 'empDefaultAvatar',
      placeholderId: 'empUploadPlaceholder',
      imgPreviewId: 'empImagePreview',
      resetBtnId: 'btnResetEmpImage',
      fileInputId: 'empImageFileInput',
      urlInputId: 'empImageUrlInput'
    });

    let selectedEmpId = null;
    let isCreatingEmp = false;
    let empPage = 1;
    let logPage = 1;
    const EMP_PAGE_SIZE = 5;
    const LOG_PAGE_SIZE = 6;



    function populateLogUserDropdown() {
      const logUserSelect = document.getElementById('logUserSelect');
      if (!logUserSelect) return;
      const currentVal = logUserSelect.value || 'all';
      const employees = getEmployees();
      let html = `<option value="all">Tất cả nhân viên</option>`;
      employees.forEach(emp => {
        html += `<option value="${emp.name}">${emp.name}</option>`;
      });
      logUserSelect.innerHTML = html;
      if ([...logUserSelect.options].some(opt => opt.value === currentVal)) {
        logUserSelect.value = currentVal;
      }
    }

    function getRoleBadgeClass(role) {
      if (role === 'QUẢN TRỊ VIÊN') return 'badge-admin';
      if (role === 'THỦ THƯ') return 'badge-quay';
      return 'badge-nhanvien';
    }

    function renderEmployeeStatus(emp) {
      if (!emp.hasAccount || emp.status === 'Hồ sơ') {
        return `<span class="status-indicator status-badge"><span class="status-dot hoso"></span><span class="status-text hoso">Hồ sơ</span></span>`;
      }
      if (['KHÓA', 'LOCKED', 'BỊ KHÓA'].includes(String(emp.status).toUpperCase())) {
        return `<span class="status-indicator status-badge"><span class="status-dot locked"></span><span class="status-text locked">Đã khóa</span></span>`;
      }
      return `<span class="status-indicator status-badge"><span class="status-dot active"></span><span class="status-text active">Active</span></span>`;
    }

    function renderEmployeeActions(emp) {
      return `
        <div class="actions-group">
          <span class="action-icon" title="Xem / Sửa hồ sơ" data-action="view" data-id="${emp.id}">${ICON_EDIT}</span>
          <span class="action-icon" title="Khóa / Mở khóa tài khoản" data-action="lock" data-id="${emp.id}">${ICON_LOCK}</span>
          <span class="action-icon" title="Xóa nhân viên" data-action="delete" data-id="${emp.id}">${ICON_DELETE}</span>
        </div>
      `;
    }

    function renderEmployeeTable() {
      const employees = getEmployees();
      const keyword = (searchEmpInput ? searchEmpInput.value : '').trim().toLowerCase();
      const roleFilter = filterRoleSelect ? filterRoleSelect.value : 'all';
      const isFiltered = Boolean(keyword) || roleFilter !== 'all';

      const filtered = employees.filter(emp => {
        const matchRole = roleFilter === 'all' || emp.role === roleFilter;
        const matchQuery = !keyword ||
          emp.id.toLowerCase().includes(keyword) ||
          emp.name.toLowerCase().includes(keyword) ||
          (emp.phone && emp.phone.toLowerCase().includes(keyword)) ||
          (emp.email && emp.email.toLowerCase().includes(keyword));
        return matchRole && matchQuery;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / EMP_PAGE_SIZE));
      if (empPage > totalPages) empPage = totalPages;
      const start = (empPage - 1) * EMP_PAGE_SIZE;
      const paged = filtered.slice(start, start + EMP_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Thêm nhân viên +');
      } else {
        paged.forEach(emp => {
          const phoneLine = emp.phone
            ? `<div class="contact-line">${ICON_PHONE}<span>${emp.phone}</span></div>`
            : '';
          const mailLine = emp.email
            ? `<div class="contact-line">${ICON_MAIL}<span>${emp.email}</span></div>`
            : '';

          html += `
            <div class="table-row" data-id="${emp.id}">
              <div style="font-weight: 600;">${emp.id}</div>
              <div style="font-weight: 500;">${emp.name}</div>
              <div><span class="badge status-badge ${getRoleBadgeClass(emp.role)}">${emp.role}</span></div>
              <div>${phoneLine}${mailLine}</div>
              <div>${renderEmployeeStatus(emp)}</div>
              <div>${renderEmployeeActions(emp)}</div>
            </div>
          `;
        });
      }

      employeeTableContent.innerHTML = html;
      populateLogUserDropdown();
      renderDynamicPagination('empPagination', filtered.length, EMP_PAGE_SIZE, empPage, (newPage) => {
        empPage = newPage;
        renderEmployeeTable();
      });
    }

    if (searchEmpInput) {
      searchEmpInput.addEventListener('input', () => {
        empPage = 1;
        renderEmployeeTable();
      });
    }
    if (filterRoleSelect) {
      filterRoleSelect.addEventListener('change', () => {
        empPage = 1;
        renderEmployeeTable();
      });
    }

    function populateViewModal(emp) {
      selectedEmpId = emp.id;
      document.getElementById('viewName').value = emp.name || '';
      document.getElementById('viewGender').value = emp.gender || 'Nam';
      document.getElementById('viewDob').value = emp.dob || '';
      const cccdSelect = document.getElementById('viewCccd');
      cccdSelect.innerHTML = `<option value="${escapeAdminHtml(emp.cccd || '')}">${escapeAdminHtml(emp.cccd || 'Chưa cập nhật')}</option>`;
      document.getElementById('viewAddress').value = emp.address || '';
      document.getElementById('viewPhone').value = emp.phone || '';
      document.getElementById('viewEmail').value = emp.email
        ? (String(emp.email).includes('@') ? emp.email : `${emp.email}@gmail.com`)
        : '';
      document.getElementById('viewRole').value = emp.role || 'QUẢN TRỊ VIÊN';
      document.getElementById('viewIdLarge').textContent = emp.id;

      const viewImg = document.getElementById('viewEmpImagePreview');
      const viewDefault = document.getElementById('viewEmpDefaultAvatar');
      if (emp.avatarUrl) {
        if (viewDefault) viewDefault.style.display = 'none';
        if (viewImg) {
          viewImg.src = emp.avatarUrl;
          viewImg.classList.add('active');
        }
      } else {
        if (viewDefault) viewDefault.style.display = 'flex';
        if (viewImg) {
          viewImg.removeAttribute('src');
          viewImg.classList.remove('active');
        }
      }
    }

    function populateEditModal(emp, createMode = false) {
      isCreatingEmp = createMode;
      selectedEmpId = emp.id;
      const headerEl = document.getElementById('editModalHeaderTitle');
      if (headerEl) {
        headerEl.textContent = createMode
          ? 'LEAF LIBRARY - THÊM NHÂN VIÊN MỚI'
          : 'LEAF LIBRARY - CHỈNH SỬA THÔNG TIN NHÂN VIÊN';
      }
      document.getElementById('editFirstName').value = emp.firstName || '';
      document.getElementById('editLastName').value = emp.lastName || '';
      document.getElementById('editGender').value = emp.gender || 'Nam';
      const dobInput = document.getElementById('editDob');
      const today = new Date();
      dobInput.max = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
        .map(part => String(part).padStart(2, '0')).join('-');
      const savedDob = String(emp.dob || '');
      const dateParts = savedDob.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
      dobInput.value = dateParts
        ? [dateParts[3], dateParts[2].padStart(2, '0'), dateParts[1].padStart(2, '0')].join('-')
        : savedDob;
      document.getElementById('editEthnicity').value = emp.ethnicity || 'Kinh';
      document.getElementById('editEmployeeCccd').value = emp.cccd || '';
      document.getElementById('editAddress').value = emp.address || '';
      document.getElementById('editPhone').value = emp.phone ? emp.phone.replace(/\./g, '') : '';
      document.getElementById('editEmail').value = emp.email
        ? (emp.email.includes('@') ? emp.email : `${emp.email}@gmail.com`)
        : '';
      document.getElementById('editRole').value = isLibraryAdmin(emp.role) ? 'QUẢN TRỊ VIÊN' : 'THỦ THƯ';
      const workEl = document.getElementById('editWorkingStatus');
      if (workEl) {
        const status = emp.employmentStatus || emp.workingStatus;
        workEl.value = Array.from(workEl.options).some(option => option.value === status) ? status : 'DANG_LAM_VIEC';
      }
      document.getElementById('employeeInitialPassword').value = '';
      updateEmployeePasswordField(createMode || !emp.hasAccount);
      document.getElementById('btnEditResetPassword').hidden = createMode || !emp.hasAccount;
      document.getElementById('editIdLarge').textContent = emp.id;
      empUploadWidget.setState(emp.avatarUrl || '', !createMode);
    }

    function updateEmployeePasswordField(needsAccount) {
      const showPassword = needsAccount && isLibraryAdmin(document.getElementById('editRole').value);
      document.getElementById('employeePasswordRow').hidden = !showPassword;
      document.getElementById('employeeInitialPassword').required = showPassword;
    }

    document.getElementById('editRole').addEventListener('change', () => {
      const employee = getEmployees().find(item => item.id === selectedEmpId);
      updateEmployeePasswordField(isCreatingEmp || !employee?.hasAccount);
    });

    employeeTableContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const employees = getEmployees();
      const emp = employees.find(item => item.id === id);
      if (!emp) return;

      selectedEmpId = id;

      if (action === 'view') {
        populateViewModal(emp);
        openModal('modalViewEmployee');
      } else if (action === 'edit') {
        populateEditModal(emp, false);
        openModal('modalEditEmployee');
      } else if (action === 'delete') {
        document.getElementById('deleteEmployeeCode').textContent = emp.id;
        openModal('modalDeleteEmployee');
      } else if (action === 'lock') {
        document.getElementById('lockEmployeeCode').textContent = `${emp.id} (${emp.name})`;
        openModal('modalLockEmployee');
      }
    });

    document.getElementById('btnAddEmployee').addEventListener('click', () => {
      const nextId = DataService.generateNextId(DataService.KEYS.EMPLOYEES, 'NV', 3);
      populateEditModal({
        id: nextId,
        firstName: '',
        lastName: '',
        gender: 'Nam',
        dob: '',
        ethnicity: 'Kinh',
        address: '',
        phone: '',
        email: '',
        role: 'THỦ THƯ',
        status: 'Hồ sơ',
        hasAccount: false,
        avatarUrl: ''
      }, true);
      openModal('modalEditEmployee');
    });

    document.getElementById('btnViewEditInfo').addEventListener('click', () => {
      const emp = getEmployees().find(item => item.id === selectedEmpId);
      closeModal('modalViewEmployee');
      if (emp) {
        populateEditModal(emp, false);
        openModal('modalEditEmployee');
      }
    });

    document.getElementById('btnViewResetPassword').addEventListener('click', () => {
      closeModal('modalViewEmployee');
      document.getElementById('resetAccountCode').textContent = selectedEmpId || 'NV001';
      openModal('modalResetPassword');
    });

    document.getElementById('btnEditResetPassword').addEventListener('click', () => {
      closeModal('modalEditEmployee');
      document.getElementById('resetAccountCode').textContent = selectedEmpId || 'NV001';
      openModal('modalResetPassword');
    });

    document.getElementById('btnSaveEmployeeInfo').addEventListener('click', async event => {
      const employees = getEmployees();
      const fName = document.getElementById('editFirstName').value.trim();
      const lName = document.getElementById('editLastName').value.trim();
      const fullName = `${fName} ${lName}`.trim();

      if (!fullName) {
        showToast('Vui lòng nhập đầy đủ Họ đệm và Tên nhân viên!', 'error');
        document.getElementById('editFirstName')?.focus();
        return;
      }

      const dobInput = document.getElementById('editDob');
      const dobVal = dobInput.value;
      if (!dobInput.checkValidity()) {
        dobInput.reportValidity();
        return;
      }

      const rawPhone = document.getElementById('editPhone').value.trim();
      const phoneDigits = rawPhone.replace(/[\s.-]/g, '');
      if (rawPhone && !/^(\+84|0)\d{8,10}$/.test(phoneDigits)) {
        showToast('Số điện thoại không đúng định dạng Việt Nam (9–11 chữ số)!', 'error');
        document.getElementById('editPhone')?.focus();
        return;
      }
      const formattedPhone = phoneDigits.length === 10
        ? `${phoneDigits.slice(0, 4)}.${phoneDigits.slice(4, 7)}.${phoneDigits.slice(7)}`
        : rawPhone;

      const rawEmailInput = document.getElementById('editEmail').value.trim();
      if (rawEmailInput && rawEmailInput.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmailInput)) {
        showToast('Địa chỉ email không hợp lệ!', 'error');
        document.getElementById('editEmail')?.focus();
        return;
      }
      const normalizedEmail = rawEmailInput;

      if (phoneDigits && employees.some(e => e.id !== selectedEmpId && String(e.phone || '').replace(/[\s.-]/g, '') === phoneDigits)) {
        showToast('Số điện thoại này đã được sử dụng cho một nhân viên khác!', 'error');
        return;
      }
      if (normalizedEmail && employees.some(e => e.id !== selectedEmpId && String(e.email || '').toLowerCase() === normalizedEmail.toLowerCase())) {
        showToast('Email này đã được sử dụng cho một nhân viên khác!', 'error');
        return;
      }

      const newRole = document.getElementById('editRole').value;
      const workingStatusVal = document.getElementById('editWorkingStatus')?.value || 'DANG_LAM_VIEC';
      const existing = employees.find(item => item.id === selectedEmpId);
      if (!isCreatingEmp && !existing) return;
      const needsAccount = isCreatingEmp || !existing.hasAccount;
      const password = document.getElementById('employeeInitialPassword').value;
      if (needsAccount && !isLibraryAdmin(newRole) && !dobVal) {
        showToast('Nhập ngày sinh để tạo mật khẩu ban đầu của thủ thư.', 'error');
        document.getElementById('editDob').focus();
        return;
      }
      if (needsAccount && isLibraryAdmin(newRole) && password.length < 8) {
        showToast('Mật khẩu ban đầu của quản trị viên phải có ít nhất 8 ký tự.', 'error');
        document.getElementById('employeeInitialPassword').focus();
        return;
      }

      const record = {
        id: selectedEmpId,
        username: existing?.username || selectedEmpId,
        name: fullName,
        gender: document.getElementById('editGender').value,
        dob: dobVal,
        ethnicity: document.getElementById('editEthnicity').value,
        cccd: document.getElementById('editEmployeeCccd').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        phone: formattedPhone,
        email: normalizedEmail,
        role: newRole,
        employmentStatus: workingStatusVal,
        avatarUrl: empUploadWidget.getValue()
      };
      if (needsAccount && isLibraryAdmin(newRole)) record.password = password;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const path = isCreatingEmp ? '/employees' : `/employees/${encodeURIComponent(selectedEmpId)}`;
        const saved = await DataService.request(isCreatingEmp ? 'POST' : 'PUT', path, record);
        record.id = saved.id;
        addLog(isCreatingEmp ? 'TẠO MỚI' : 'CẬP NHẬT', record.id, `Lưu hồ sơ nhân viên <strong>${escapeAdminHtml(fullName)}</strong>`);
        closeModal('modalEditEmployee');
        showToast(needsAccount ? `Đã tạo tài khoản cho ${fullName}. Mã đăng nhập: ${record.id}.` : `Đã lưu hồ sơ ${fullName}.`, 'success');
        try {
          await DataService.hydrate(DataService.KEYS.EMPLOYEES, 'employees');
          renderEmployeeTable();
        } catch {
          showToast('Đã lưu hồ sơ. Tải lại trang để cập nhật danh sách.', 'warning');
        }
      } catch (error) {
        showToast(error.message || 'Không lưu được hồ sơ nhân viên.', 'error');
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById('btnConfirmResetPassword').addEventListener('click', () => {
      if (selectedEmpId) {
        addLog('RESET MẬT KHẨU', selectedEmpId, `Reset mật khẩu tài khoản <strong>${selectedEmpId}</strong> và gửi qua Gmail.`);
        showToast(`Đã reset mật khẩu cho tài khoản ${selectedEmpId}!`);
      }
      closeModal('modalResetPassword');
    });

    const btnConfirmLockEmp = document.getElementById('btnConfirmLockEmployee');
    if (btnConfirmLockEmp) {
      btnConfirmLockEmp.addEventListener('click', () => {
        const employees = getEmployees();
        const emp = employees.find(item => item.id === selectedEmpId);
        if (emp) {
          const isLocked = ['KHÓA', 'LOCKED', 'BỊ KHÓA'].includes(String(emp.status).toUpperCase());
          emp.status = isLocked ? 'Active' : 'Khóa';
          saveEmployees(employees);
          addLog(
            'KHÓA TÀI KHOẢN',
            emp.id,
            `${emp.status === 'Khóa' ? 'Khóa' : 'Mở khóa'} tài khoản nhân viên <strong>${emp.name}</strong>`
          );
          renderEmployeeTable();
          showToast(`Đã ${emp.status === 'Khóa' ? 'khóa' : 'mở khóa'} tài khoản ${emp.name}!`);
        }
        closeModal('modalLockEmployee');
      });
    }

    document.getElementById('btnConfirmDeleteEmployee').addEventListener('click', () => {
      let employees = getEmployees();
      const target = employees.find(item => item.id === selectedEmpId);
      if (target) {
        const loans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
        const imports = typeof getImportReceipts === 'function' ? getImportReceipts() : [];
        const fines = typeof getFines === 'function' ? getFines() : [];
        const logs = typeof getLogs === 'function' ? getLogs() : [];
        const hasTx = loans.some(l => String(l.employeeId) === String(target.id))
          || imports.some(r => String(r.employeeId) === String(target.id))
          || fines.some(f => String(f.employeeId) === String(target.id))
          || logs.some(lg => String(lg.userId) === String(target.id) && lg.action !== 'ĐĂNG NHẬP');
        if (hasTx) {
          closeModal('modalDeleteEmployee');
          showToast('Không thể xóa nhân viên đã có lịch sử xử lý giao dịch! Hãy chuyển trạng thái làm việc sang "Đã nghỉ" hoặc khóa tài khoản.', 'error');
          return;
        }
        employees = employees.filter(item => item.id !== selectedEmpId);
        saveEmployees(employees);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa nhân viên <strong>${escapeAdminHtml(target.name)}</strong> (Trạng thái 0: Đã nghỉ việc)`);
        renderEmployeeTable();
        showToast(`Đã xóa nhân viên ${target.name} khỏi danh sách!`);
      }
      closeModal('modalDeleteEmployee');
    });

    const savePermButton = document.getElementById('btnSavePerm');
    const rolePermissions = {};
    let savingPermissions = false;

    function selectedPermissionRole() {
      return isLibraryAdmin(permRoleSelect.value) ? 'admin' : 'librarian';
    }

    function renderPermissionMatrix() {
      const role = selectedPermissionRole();
      const config = rolePermissions[role];
      savePermButton.disabled = savingPermissions || !config;
      permTableContent.innerHTML = staffPermissionRows.map(row => {
        const permissions = ['view', 'add', 'edit', 'del'].map(action => {
          if (row.viewOnly && action !== 'view') return '<div>—</div>';
          const roleAllowed = !row.adminOnly || role === 'admin';
          const checked = roleAllowed && config?.[row.key]?.[action] !== false;
          const disabled = !roleAllowed || !config || savingPermissions;
          return `<div><input type="checkbox" class="perm-checkbox"
            aria-label="${row.label} · ${{ view: 'Xem', add: 'Thêm', edit: 'Sửa', del: 'Xóa' }[action]}"
            data-group="${row.key}" data-action="${action}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}></div>`;
        }).join('');
        return `<div class="perm-table-row"><div>${row.label}</div>${permissions}</div>`;
      }).join('');
    }

    async function loadPermissionMatrix() {
      const role = selectedPermissionRole();
      renderPermissionMatrix();
      if (rolePermissions[role]) return;
      try {
        const result = await DataService.request('GET', `/config/permissions?role=${role}`);
        rolePermissions[role] ??= result.value;
        renderPermissionMatrix();
      } catch (error) {
        showToast(error.message || 'Không tải được cấu hình quyền.', 'error');
      }
    }

    permRoleSelect.addEventListener('change', loadPermissionMatrix);
    document.querySelector('[data-tab="tabPermissions"]').addEventListener('click', loadPermissionMatrix);
    permTableContent.addEventListener('change', event => {
      const checkbox = event.target.closest('.perm-checkbox:not(:disabled)');
      const config = rolePermissions[selectedPermissionRole()];
      if (!checkbox || !config) return;
      const { group, action } = checkbox.dataset;
      (config[group] ??= {})[action] = checkbox.checked;
    });
    savePermButton.addEventListener('click', async () => {
      const role = selectedPermissionRole();
      const config = rolePermissions[role];
      if (!config || savingPermissions) return;
      const roleLabel = role === 'admin' ? 'Quản trị viên' : 'Thủ thư';
      savingPermissions = true;
      renderPermissionMatrix();
      try {
        await DataService.request('PUT', `/config/permissions?role=${role}`, { value: config });
        addLog('CẬP NHẬT', 'PHAN-QUYEN', `Lưu cấu hình phân quyền cho ${roleLabel}`);
        showToast(`Đã lưu quyền truy cập của ${roleLabel}.`, 'success');
      } catch (error) {
        showToast(error.message || 'Không lưu được cấu hình quyền.', 'error');
      } finally {
        savingPermissions = false;
        renderPermissionMatrix();
      }
    });

    const logTableContent = document.getElementById('logTableContent');
    const logUserSelect = document.getElementById('logUserSelect');
    const logActionSelect = document.getElementById('logActionSelect');
    const logSearchInput = document.getElementById('logSearchInput');
    const logDateFrom = document.getElementById('logDateFrom');
    const logDateTo = document.getElementById('logDateTo');

    function getLogBadgeClass(action) {
      if (action === 'ĐĂNG NHẬP') return 'badge-login';
      if (action === 'GIA HẠN') return 'badge-extend';
      if (action === 'TẠO MỚI' || action === 'CẤP TÀI KHOẢN') return 'badge-create';
      if (action === 'XÓA DỮ LIỆU' || action === 'KHÓA TÀI KHOẢN') return 'badge-delete';
      if (action === 'RESET MẬT KHẨU') return 'badge-reset';
      return 'badge-update';
    }

    function renderAuditLogs() {
      const logs = getLogs();
      const userFilter = logUserSelect.value;
      const actionFilter = logActionSelect.value;
      const keyword = (logSearchInput.value || '').trim().toLowerCase();
      const fromDate = parseVNDate(logDateFrom ? logDateFrom.value : '');
      const toDate = parseVNDate(logDateTo ? logDateTo.value : '');
      const isFiltered = userFilter !== 'all' || actionFilter !== 'all' || Boolean(keyword) || Boolean(fromDate) || Boolean(toDate);

      const filtered = logs.filter(log => {
        const matchUser = userFilter === 'all' || log.user === userFilter;
        const matchAction = actionFilter === 'all' || log.action === actionFilter;
        const matchSearch = !keyword ||
          log.target.toLowerCase().includes(keyword) ||
          log.detail.toLowerCase().includes(keyword) ||
          log.user.toLowerCase().includes(keyword);

        let matchDate = true;
        if (fromDate || toDate) {
          const logDate = parseVNDate(log.date);
          if (logDate) {
            if (fromDate && logDate < fromDate) matchDate = false;
            if (toDate && logDate > toDate) matchDate = false;
          }
        }
        return matchUser && matchAction && matchSearch && matchDate;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / LOG_PAGE_SIZE));
      if (logPage > totalPages) logPage = totalPages;
      const start = (logPage - 1) * LOG_PAGE_SIZE;
      const paged = filtered.slice(start, start + LOG_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = `<div class="empty-state-box">${isFiltered ? 'Không tìm thấy dữ liệu phù hợp.' : 'Chưa có nhật ký hoạt động nào được ghi nhận.'}</div>`;
      } else {
        paged.forEach(item => {
          html += `
            <div class="log-table-row">
              <div>
                <div class="log-time-main">${item.date}</div>
                <div class="log-time-sub">${item.time}</div>
              </div>
              <div>
                <div class="log-user-name">${item.user}</div>
                <div class="log-user-sub">(${item.userId})</div>
              </div>
              <div><span class="badge-log status-badge ${getLogBadgeClass(item.action)}">${item.action}</span></div>
              <div style="font-weight: 600; color: var(--primary-navy);">${item.target}</div>
              <div>${item.detail}</div>
            </div>
          `;
        });
      }

      logTableContent.innerHTML = html;
      renderDynamicPagination('logPagination', filtered.length, LOG_PAGE_SIZE, logPage, (newPage) => {
        logPage = newPage;
        renderAuditLogs();
      });
    }

    document.getElementById('btnApplyLogFilter').addEventListener('click', () => {
      logPage = 1;
      renderAuditLogs();
      showToast('Đã lọc nhật ký hoạt động!');
    });
    logUserSelect.addEventListener('change', () => {
      logPage = 1;
      renderAuditLogs();
    });
    logActionSelect.addEventListener('change', () => {
      logPage = 1;
      renderAuditLogs();
    });
    logSearchInput.addEventListener('input', () => {
      logPage = 1;
      renderAuditLogs();
    });

    renderPermissionMatrix();
    renderAuditLogs();
    document.querySelector('[data-tab="tabAuditLog"]').addEventListener('click', renderAuditLogs);
    window.addEventListener('ixs:data-loaded', event => {
      if (event.detail?.key === DataService.KEYS.LOGS) renderAuditLogs();
    });
    renderEmployeeTable();
  }

  /**
   * 2. PHÂN HỆ QUẢN LÝ KHO SÁCH (admin/books.html)
   */
  const bookCardsGrid = document.getElementById('bookTitlesGrid') || document.getElementById('bookCardsGrid');

  if (bookCardsGrid) {
    let selectedBookTitleId = null;
    let isCreatingBookTitle = false;
    let selectedBookCopyId = null;
    let isCreatingBookCopy = false;
    let selectedSupplierId = null;
    let isCreatingSupplier = false;

    let btPage = 1;
    let bcPage = 1;
    let impPage = 1;
    let supPage = 1;

    const BT_PAGE_SIZE = 4;
    const BC_PAGE_SIZE = 5;
    const IMP_PAGE_SIZE = 5;
    const SUP_PAGE_SIZE = 5;

    const btUploadWidget = setupMediaUploadWidget({
      bannerId: 'btMediaBanner',
      defaultGraphicId: 'btDefaultCover',
      placeholderId: 'btUploadPlaceholder',
      imgPreviewId: 'btImagePreview',
      resetBtnId: 'btnResetBtImage',
      fileInputId: 'btImageFileInput',
      urlInputId: 'btImageUrlInput'
    });

    const bcUploadWidget = setupMediaUploadWidget({
      bannerId: 'bcMediaBanner',
      defaultGraphicId: 'bcDefaultCover',
      placeholderId: 'bcUploadPlaceholder',
      imgPreviewId: 'bcImagePreview',
      resetBtnId: 'btnResetBcImage',
      fileInputId: 'bcImageFileInput',
      urlInputId: 'bcImageUrlInput'
    });

    const searchBookTitleInput = document.getElementById('searchBookTitleInput');
    const filterBookCategory = document.getElementById('filterBookCategory');

    function renderBookPosterGraphic(coverUrl, titleText) {
      if (coverUrl) {
        return `
          <div class="book-cover-box has-custom-img">
            <img class="book-cover-custom-img" src="${coverUrl}" alt="${titleText || 'Book Cover'}">
          </div>
        `;
      }
      return `
        <div class="book-cover-box">
          <div>
            <div class="book-cover-title">MANAGING<br>INFORMATION<br>TECHNOLOGY</div>
            <div class="book-cover-edition">SEVENTH EDITION</div>
          </div>
          <div class="book-cover-authors">
            CAROL V. BROWN<br>
            DANIEL W. DEHAYES<br>
            JEFFREY A. HOFFER<br>
            E. WAINRIGHT MARTIN<br>
            WILLIAM C. PERKINS
          </div>
        </div>
      `;
    }

    function renderBookTitlesGrid() {
      const books = getBookTitles();
      const q = (searchBookTitleInput.value || '').trim().toLowerCase();
      const cat = filterBookCategory.value;
      const isFiltered = Boolean(q) || cat !== 'all';

      const filtered = books.filter(b => {
        const matchCat = cat === 'all' || b.category === cat;
        const matchQ = !q ||
          b.id.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          b.authors.toLowerCase().includes(q) ||
          String(b.publishYear ?? '').includes(q);
        return matchCat && matchQ;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / BT_PAGE_SIZE));
      if (btPage > totalPages) btPage = totalPages;
      const start = (btPage - 1) * BT_PAGE_SIZE;
      const paged = filtered.slice(start, start + BT_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Thêm đầu sách +');
      } else {
        paged.forEach(b => {
          html += `
            <div class="book-card" data-id="${b.id}">
              ${renderBookPosterGraphic(b.coverUrl, b.title)}
              <div class="book-card-info">
                <div class="book-card-row-2col">
                  <div>
                    <div class="book-meta-label">Mã sách</div>
                    <div class="book-meta-value">${b.id}</div>
                  </div>
                  <div style="text-align: right;">
                    <div class="book-meta-label">Năm xuất bản</div>
                    <div class="book-meta-value">${b.publishYear || b.namXuatBan || '2021'}</div>
                  </div>
                </div>

                <div>
                  <div class="book-meta-label">Tên sách, tác giả</div>
                  <div class="book-title-main">${b.title}</div>
                  <div class="book-author-sub">${b.authors}</div>
                </div>

                <div class="book-card-row-2col">
                  <div>
                    <div class="book-meta-label">Nhà xuất bản</div>
                    <div class="book-meta-value">${b.publisher}</div>
                  </div>
                  <div style="text-align: right;">
                    <div class="book-meta-label">Thể loại</div>
                    <div class="book-meta-value">${b.category}</div>
                  </div>
                </div>

                <div class="book-card-footer">
                  <div class="book-card-actions">
                    <span class="link-view-copies" data-action="view-copies" data-id="${b.id}">Xem các bản sao →</span>
                    <span class="action-icon" title="Chỉnh sửa đầu sách" data-action="edit-book" data-id="${b.id}">${ICON_EDIT}</span>
                    <span class="action-icon" title="Xóa đầu sách" data-action="delete-book" data-id="${b.id}">${ICON_DELETE}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
      }

      bookCardsGrid.innerHTML = html;
      renderDynamicPagination('btPagination', filtered.length, BT_PAGE_SIZE, btPage, (newPage) => {
        btPage = newPage;
        renderBookTitlesGrid();
      });
    }

    const adminSuggestionsTableContent = document.getElementById('adminSuggestionsTableContent');
    const searchSuggestionAdminInput = document.getElementById('searchSuggestionAdminInput');
    const filterSuggestionAdminStatus = document.getElementById('filterSuggestionAdminStatus');

    function renderAdminSuggestionsTable() {
      if (!adminSuggestionsTableContent) return;
      const suggestions = typeof getBookSuggestions === 'function' ? getBookSuggestions() : [];
      const q = (searchSuggestionAdminInput?.value || '').trim().toLowerCase();
      const st = filterSuggestionAdminStatus?.value || 'all';

      const filtered = suggestions.filter(s => {
        const matchSt = st === 'all' || (s.status || '').toLowerCase() === st.toLowerCase();
        const matchQ = !q ||
          (s.id && s.id.toLowerCase().includes(q)) ||
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.author && s.author.toLowerCase().includes(q)) ||
          (s.readerId && s.readerId.toLowerCase().includes(q));
        return matchSt && matchQ;
      });

      if (!filtered.length) {
        adminSuggestionsTableContent.innerHTML = `
          <div style="padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 14px;">
            Không có đề xuất sách nào từ độc giả.
          </div>
        `;
        return;
      }

      adminSuggestionsTableContent.innerHTML = filtered.map(s => {
        const isPending = (s.status || '').includes('Chờ') || (s.status || '').toUpperCase().includes('CHO');
        const isApproved = (s.status || '').includes('duyệt') || (s.status || '').includes('Duyệt') || (s.status || '').toUpperCase().includes('DA DUYET');
        const badge = isPending
          ? `<span class="badge status-badge" style="background: #FEF3C7; color: #D97706; border-color: #FCD34D;">Chờ duyệt</span>`
          : (isApproved
            ? `<span class="badge status-badge badge-reader-valid">Đã duyệt</span>`
            : `<span class="badge status-badge badge-reader-locked">Từ chối</span>`);

        const actions = isPending ? `
          <div style="display: flex; justify-content: center; gap: 6px;">
            <button type="button" class="btn-action-blue btn-approve-sug" data-id="${s.id}" style="padding: 4px 8px; font-size: 11px; height: auto; background: #16A34A; border: none; border-radius: 4px; color: #fff; cursor: pointer;">Duyệt</button>
            <button type="button" class="btn-action-gray btn-reject-sug" data-id="${s.id}" style="padding: 4px 8px; font-size: 11px; height: auto; background: #EF4444; border: none; border-radius: 4px; color: #fff; cursor: pointer;">Từ chối</button>
          </div>
        ` : `<span style="font-size: 12px; color: #94A3B8;">${s.status}</span>`;

        return `
          <div class="supplier-table-row" style="grid-template-columns: 110px 1.5fr 1.2fr 100px 100px 120px 120px; display: grid; align-items: center; min-height: 52px; border-bottom: 1px solid var(--border-color); padding: 8px 12px; font-size: 13.5px;">
            <div style="font-weight: 600; color: var(--primary-navy);">${escapeAdminHtml(s.id)}</div>
            <div>
              <div style="font-weight: 600;">${escapeAdminHtml(s.title)}</div>
              ${s.reason ? `<div style="font-size: 11.5px; color: var(--text-muted);">Đề xuất: ${escapeAdminHtml(s.reason)}</div>` : ''}
              ${(s.rejectionReason || s.lyDoTuChoi) ? `<div style="font-size: 11.5px; color: #DC2626;">Lý do từ chối: ${escapeAdminHtml(s.rejectionReason || s.lyDoTuChoi)}</div>` : ''}
            </div>
            <div>${escapeAdminHtml(s.author || '—')} / ${escapeAdminHtml(s.publisher || '—')}</div>
            <div style="color: #0284C7; font-weight: 500;">${escapeAdminHtml(s.readerId || 'Độc giả')}</div>
            <div>${escapeAdminHtml(s.quantity || '1 bản')}</div>
            <div>${badge}</div>
            <div style="text-align: center;">${actions}</div>
          </div>
        `;
      }).join('');
    }

    if (searchSuggestionAdminInput) {
      searchSuggestionAdminInput.addEventListener('input', renderAdminSuggestionsTable);
    }
    if (filterSuggestionAdminStatus) {
      filterSuggestionAdminStatus.addEventListener('change', renderAdminSuggestionsTable);
    }
    let rejectingSuggestionId = null;
    if (adminSuggestionsTableContent) {
      adminSuggestionsTableContent.addEventListener('click', async (e) => {
        const btnApp = e.target.closest('.btn-approve-sug');
        if (btnApp) {
          const id = btnApp.getAttribute('data-id');
          const suggestions = getBookSuggestions();
          const target = suggestions.find(s => s.id === id);
          if (target) {
            try {
              await DataService.request('PUT', `/suggestions/${encodeURIComponent(id)}`, { status: 'Đã duyệt' });
            } catch (err) {
              showToast(err.message || 'Không thể duyệt đề xuất sách.', 'error');
              return;
            }
            await DataService.hydrate(DataService.KEYS.SUGGESTIONS, 'suggestions');
            addLog('DUYỆT ĐỀ XUẤT', id, `Phê duyệt đề xuất sách <strong>${escapeAdminHtml(target.title)}</strong> của độc giả ${escapeAdminHtml(target.readerId)}`);
            showToast(`Đã duyệt đề xuất sách "${target.title}"!`, 'success');
            renderAdminSuggestionsTable();
          }
          return;
        }

        const btnRej = e.target.closest('.btn-reject-sug');
        if (btnRej) {
          const id = btnRej.getAttribute('data-id');
          const suggestions = getBookSuggestions();
          const target = suggestions.find(s => s.id === id);
          if (!target) return;
          const modalRej = document.getElementById('modalRejectSuggestion');
          const titleDisp = document.getElementById('rejectSuggestionTitleDisplay');
          const reasonInput = document.getElementById('rejectSuggestionReason');
          if (modalRej && reasonInput) {
            rejectingSuggestionId = id;
            if (titleDisp) titleDisp.textContent = `${target.title} (${target.id})`;
            reasonInput.value = '';
            openModal('modalRejectSuggestion');
            reasonInput.focus();
          }
          return;
        }
      });
    }

    document.getElementById('btnConfirmRejectSuggestion')?.addEventListener('click', async () => {
      if (!rejectingSuggestionId) return;
      const reasonVal = document.getElementById('rejectSuggestionReason')?.value.trim() || '';
      if (!reasonVal) {
        showToast('Vui lòng nhập lý do từ chối đề xuất sách!', 'error');
        document.getElementById('rejectSuggestionReason')?.focus();
        return;
      }
      const suggestions = getBookSuggestions();
      const target = suggestions.find(s => s.id === rejectingSuggestionId);
      if (target) {
        try {
          await DataService.request('PUT', `/suggestions/${encodeURIComponent(target.id)}`, {
            status: 'Từ chối',
            rejectionReason: reasonVal
          });
        } catch (err) {
          showToast(err.message || 'Không thể từ chối đề xuất sách.', 'error');
          return;
        }
        await DataService.hydrate(DataService.KEYS.SUGGESTIONS, 'suggestions');
        addLog('TỪ CHỐI ĐỀ XUẤT', target.id, `Từ chối đề xuất sách <strong>${escapeAdminHtml(target.title)}</strong> - Lý do: ${escapeAdminHtml(reasonVal)}`);
        showToast(`Đã từ chối đề xuất sách "${target.title}".`, 'info');
        renderAdminSuggestionsTable();
      }
      rejectingSuggestionId = null;
      closeModal('modalRejectSuggestion');
    });

    window.addEventListener('ixs:data-loaded', renderAdminSuggestionsTable);
    window.addEventListener('ixs:data-changed', renderAdminSuggestionsTable);
    const tabSugBtn = document.querySelector('.subtab-item[data-tab="tabSuggestions"]');
    if (tabSugBtn) {
      tabSugBtn.addEventListener('click', renderAdminSuggestionsTable);
    }
    renderAdminSuggestionsTable();

    searchBookTitleInput.addEventListener('input', () => {
      btPage = 1;
      renderBookTitlesGrid();
    });
    filterBookCategory.addEventListener('change', () => {
      btPage = 1;
      renderBookTitlesGrid();
    });

    function openBookTitleModal(book, createMode = false) {
      isCreatingBookTitle = createMode;
      selectedBookTitleId = book.id;
      const headerEl = document.getElementById('modalBookTitleHeader');
      if (headerEl) {
        headerEl.textContent = createMode
          ? 'LEAF LIBRARY - THÊM ĐẦU SÁCH MỚI'
          : 'LEAF LIBRARY - THÔNG TIN ĐẦU SÁCH';
      }
      const codeEl = document.getElementById('btCodeDisplay');
      if (codeEl) codeEl.textContent = book.id;
      const yearDisp = document.getElementById('btPublishYearDisplay');
      if (yearDisp) yearDisp.textContent = book.publishYear || book.namXuatBan || '2021';
      
      const titleEl = document.getElementById('btTitle');
      if (titleEl) titleEl.value = book.title || '';
      const catEl = document.getElementById('btCategory');
      if (catEl) catEl.value = book.category || 'Công nghệ thông tin';
      const topicEl = document.getElementById('btTopic');
      if (topicEl) topicEl.value = book.topic || book.subject || book.chuDe || '';
      const deptEl = document.getElementById('btDepartment');
      if (deptEl) deptEl.value = book.faculty || book.department || book.khoa || '';
      document.getElementById('btEdition').value = book.edition ?? '';
      document.getElementById('btGenre').value = book.genre ?? '';
      document.getElementById('btPrice').value = book.price ?? '';
      const qtyEl = document.getElementById('btQuantity');
      if (qtyEl) qtyEl.value = book.total !== undefined ? book.total : 0;
      const pubEl = document.getElementById('btPubName');
      if (pubEl) pubEl.value = book.publisher || book.nhaXuatBan || '';
      const pubYearEl = document.getElementById('btPublishYear');
      if (pubYearEl) pubYearEl.value = book.publishYear || book.namXuatBan || '2021';
      const authorEl = document.getElementById('btAuthorName');
      if (authorEl) authorEl.value = book.authors || book.author || book.tacGia || '';

      btUploadWidget.setState(book.coverUrl || '', !createMode);
      openModal('modalBookTitle');
    }

    document.getElementById('btnAddBookTitle').addEventListener('click', () => {
      const nextId = DataService.generateNextId(DataService.KEYS.BOOK_TITLES, 'DS', 3);
      openBookTitleModal({
        id: nextId,
        title: '',
        authors: '',
        publisher: '',
        category: 'Công nghệ thông tin',
        edition: '1',
        price: 120000,
        total: 0,
        available: 0,
        coverUrl: ''
      }, true);
    });

    bookCardsGrid.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');
      const books = getBookTitles();
      const book = books.find(b => b.id === id);
      if (!book) return;

      if (action === 'edit-book') {
        openBookTitleModal(book, false);
      } else if (action === 'delete-book') {
        selectedBookTitleId = id;
        document.getElementById('deleteBookTitleCode').textContent = book.id;
        document.getElementById('deleteBookTitleName').textContent = book.title;
        openModal('modalDeleteBookTitle');
      } else if (action === 'view-copies') {
        const tabCopiesBtn = document.querySelector('.subtab-item[data-tab="tabBookCopies"], .sub-tab[data-target="tabBookCopies"]');
        if (tabCopiesBtn) tabCopiesBtn.click();
        const searchCopyInput = document.getElementById('searchBookCopyInput');
        if (searchCopyInput) {
          searchCopyInput.value = id;
          bcPage = 1;
          renderBookCopiesTable();
        }
      }
    });

    document.getElementById('btnSaveBookTitle').addEventListener('click', async () => {
      const btnSave = document.getElementById('btnSaveBookTitle');
      const books = getBookTitles();
      const valOf = (id, fallback = '') => (document.getElementById(id)?.value ?? fallback).toString().trim();
      const titleVal = valOf('btTitle');
      if (!titleVal) {
        showToast('Vui lòng nhập Tên đầu sách!', 'error');
        document.getElementById('btTitle')?.focus();
        return;
      }
      const qtyRaw = valOf('btQuantity', '0');
      const qtyNum = Number(qtyRaw);
      if (!Number.isInteger(qtyNum) || qtyNum < 0 || qtyNum > 500) {
        showToast('Số lượng bản sao phải là số nguyên từ 0 đến 500!', 'error');
        document.getElementById('btQuantity')?.focus();
        return;
      }
      const pubYearVal = valOf('btPublishYear');
      const curYear = new Date().getFullYear();
      if (pubYearVal) {
        const yNum = Number(pubYearVal);
        if (!Number.isInteger(yNum) || yNum < 1900 || yNum > curYear + 1) {
          showToast(`Năm xuất bản phải từ 1900 đến ${curYear + 1}!`, 'error');
          document.getElementById('btPublishYear')?.focus();
          return;
        }
      }
      const normalizedTitle = titleVal.toUpperCase();
      if (isCreatingBookTitle && books.some(b => String(b.title || '').trim().toUpperCase() === normalizedTitle)) {
        showToast('Đầu sách với tên này đã tồn tại trong thư viện!', 'error');
        document.getElementById('btTitle')?.focus();
        return;
      }

      const authorVal = valOf('btAuthorName') || 'Chưa cập nhật';
      const pubVal = valOf('btPubName') || 'Chưa cập nhật';
      const catVal = valOf('btCategory') || 'Chung';
      const topicVal = valOf('btTopic');
      const deptVal = valOf('btDepartment');
      const qtyVal = qtyNum;
      const priceVal = valOf('btPrice') === '' ? null : document.getElementById('btPrice').valueAsNumber;
      if (priceVal !== null && (!Number.isInteger(priceVal) || priceVal < 0)) {
        showToast('Giá đầu sách phải là số nguyên không âm.', 'error');
        document.getElementById('btPrice').focus();
        return;
      }
      const coverVal = btUploadWidget.getValue();

      const origText = btnSave ? btnSave.textContent : '';
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Đang lưu...';
      }

      try {
        if (isCreatingBookTitle) {
          // Theo phân biệt DAUSACH vs CUONSACH: tạo Đầu sách mới chỉ lưu thông tin tựa sách (0 bản sao vật lý cho đến khi lập phiếu nhập hoặc thêm cuốn sách)
          books.unshift({
            id: selectedBookTitleId,
            title: normalizedTitle,
            authors: authorVal,
            publisher: pubVal,
            category: catVal,
            subject: topicVal,
            faculty: deptVal,
            edition: valOf('btEdition'),
            genre: valOf('btGenre'),
            price: priceVal,
            total: 0,
            available: 0,
            publishYear: pubYearVal || String(curYear),
            coverUrl: coverVal
          });
          saveBookTitles(books);

          const ok = await DataService.waitForWrites([
            DataService.KEYS.BOOK_TITLES
          ]);
          if (!ok) return;

          addLog('TẠO MỚI', selectedBookTitleId, `Thêm đầu sách mới <strong>${escapeAdminHtml(normalizedTitle)}</strong> (0 bản sao vật lý) vào danh mục`);
          showToast(`Đã thêm đầu sách ${normalizedTitle}! Có thể nhập kho hoặc thêm cuốn sách riêng.`);
        } else {
          const b = books.find(item => item.id === selectedBookTitleId);
          if (b) {
            b.title = normalizedTitle;
            b.authors = authorVal;
            b.publisher = pubVal;
            b.category = catVal;
            b.subject = topicVal;
            b.faculty = deptVal;
            b.edition = valOf('btEdition');
            b.genre = valOf('btGenre');
            b.publishYear = pubYearVal || b.publishYear || '';
            b.price = priceVal;
            b.coverUrl = coverVal;
            saveBookTitles(books);
            syncBookCountsWithCopies(b.id);

            const ok = await DataService.waitForWrites([
              DataService.KEYS.BOOK_TITLES
            ]);
            if (!ok) return;

            addLog('CẬP NHẬT', b.id, `Cập nhật thông tin đầu sách <strong>${escapeAdminHtml(b.title)}</strong>`);
            showToast(`Đã cập nhật đầu sách ${b.title}!`);
          }
        }

        closeModal('modalBookTitle');
        renderBookTitlesGrid();
        renderBookCopiesTable();
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = origText || 'LƯU THÔNG TIN';
        }
      }
    });

    document.getElementById('btnConfirmDeleteBookTitle').addEventListener('click', () => {
      let books = getBookTitles();
      let copies = getBookCopies();
      const target = books.find(item => item.id === selectedBookTitleId);
      if (target) {
        const borrowedCopies = copies.filter(c => c.bookId === selectedBookTitleId && c.circulationStatus === 'ĐANG MƯỢN');
        if (borrowedCopies.length > 0) {
          closeModal('modalDeleteBookTitle');
          showToast(`Không thể xóa đầu sách ${target.id} vì đang có ${borrowedCopies.length} cuốn đang được độc giả mượn!`, 'error');
          return;
        }
        books = books.filter(item => item.id !== selectedBookTitleId);
        copies = copies.filter(c => c.bookId !== selectedBookTitleId);
        saveBookTitles(books);
        saveBookCopies(copies);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa đầu sách <strong>${target.title}</strong> và các bản sao khỏi danh mục kho`);
        renderBookTitlesGrid();
        renderBookCopiesTable();
        showToast(`Đã xóa đầu sách ${target.title}!`);
      }
      closeModal('modalDeleteBookTitle');
    });

    const bookCopiesTableContent = document.getElementById('bookCopiesTableContent');
    const searchBookCopyInput = document.getElementById('searchBookCopyInput');
    const filterShelfLocation = document.getElementById('filterShelfLocation');
    const filterPhysicalStatus = document.getElementById('filterPhysicalStatus');
    const bcPhysicalInput = document.getElementById('bcPhysicalInput');
    const bcCirculationInput = document.getElementById('bcCirculationInput');

    if (bcPhysicalInput && bcCirculationInput) {
      bcPhysicalInput.addEventListener('change', () => {
        const val = bcPhysicalInput.value.toUpperCase();
        if (val.includes('RÁCH NÁT') && bcCirculationInput.value === 'SẴN SÀNG') {
          const rules = getLibraryRules();
          if (!rules || rules.autoLockTornBooks === 'Bật') {
            bcCirculationInput.value = 'HƯ HỎNG';
            showToast('Sách rách nát được chuyển sang trạng thái Hư hỏng.', 'warning');
          }
        }
      });
    }

    function getPhysicalBadge(status) {
      if (status === 'TỐT') return `<span class="badge-copy status-badge badge-phys-good">TỐT</span>`;
      if (status === 'RÁCH NÁT') return `<span class="badge-copy status-badge badge-phys-torn">RÁCH NÁT</span>`;
      return `<span class="badge-copy status-badge badge-phys-worn">${status}</span>`;
    }

    function getCirculationBadge(status) {
      const st = String(status || '').toUpperCase();
      if (st === 'SẴN SÀNG' || st === 'SAN_SANG') return `<span class="badge-copy status-badge badge-circ-ready">SẴN SÀNG</span>`;
      if (st.includes('GIỮ')) return `<span class="badge-copy status-badge" style="background:#FEF3C7; color:#B45309; border-color:#FCD34D;">GIỮ CHỜ NGƯỜI CHỜ</span>`;
      if (st === 'KHÓA' || st === 'HƯ HỎNG' || st === 'MẤT' || st === 'ĐÃ THANH LÝ') return `<span class="badge-copy status-badge badge-circ-locked">${escapeAdminHtml(status)}</span>`;
      return `<span class="badge-copy status-badge badge-circ-borrowed">${escapeAdminHtml(status)}</span>`;
    }

    function updateBookCopyStockSummary(bookId) {
      const summary = document.getElementById('bcBookStockSummary');
      if (!summary) return;
      const book = getBookTitles().find(item => String(item.id) === String(bookId));
      if (!book) {
        summary.textContent = 'Chưa có thông tin tồn kho';
        return;
      }
      const copies = getBookCopies().filter(copy => String(copy.bookId || copy.bookTitleId) === String(bookId));
      const total = copies.length || Number(book.total || book.totalCopies || 0);
      const available = copies.length
        ? copies.filter(copy => copy.circulationStatus === 'SẴN SÀNG').length
        : Number(book.available || book.availableCopies || 0);
      summary.textContent = `${available} / ${total} cuốn sẵn có`;
    }

    const filterCirculationStatus = document.getElementById('filterCirculationStatus');

    function renderBookCopiesTable() {
      const copies = getBookCopies();
      const q = (searchBookCopyInput.value || '').trim().toLowerCase();
      const loc = filterShelfLocation.value;
      const phy = filterPhysicalStatus.value;
      const cir = filterCirculationStatus ? filterCirculationStatus.value : 'all';
      const isFiltered = Boolean(q) || loc !== 'all' || phy !== 'all' || cir !== 'all';

      const filtered = copies.filter(c => {
        const matchLoc = loc === 'all' || c.location === loc;
        const matchPhy = phy === 'all' || c.physicalStatus === phy;
        const matchCir = cir === 'all' || String(c.circulationStatus || '').toUpperCase() === cir.toUpperCase();
        const matchQ = !q ||
          c.id.toLowerCase().includes(q) ||
          String(c.barcode || '').toLowerCase().includes(q) ||
          (c.bookId && c.bookId.toLowerCase().includes(q)) ||
          c.bookTitle.toLowerCase().includes(q);
        return matchLoc && matchPhy && matchCir && matchQ;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / BC_PAGE_SIZE));
      if (bcPage > totalPages) bcPage = totalPages;
      const start = (bcPage - 1) * BC_PAGE_SIZE;
      const paged = filtered.slice(start, start + BC_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Thêm cuốn sách +');
      } else {
        paged.forEach(c => {
          html += `
            <div class="copies-table-row" data-id="${escapeAdminHtml(c.id)}">
              <div style="font-weight: 600;">${escapeAdminHtml(c.id)}</div>
              <div style="font-weight: 500;">${escapeAdminHtml(c.bookTitle)}</div>
              <div>${escapeAdminHtml(c.location)}</div>
              <div>${getPhysicalBadge(c.physicalStatus)}</div>
              <div>${getCirculationBadge(c.circulationStatus)}</div>
              <div>
                <div class="actions-group">
                  <span class="action-icon" title="Chỉnh sửa cuốn sách" data-action="edit-copy" data-id="${escapeAdminHtml(c.id)}">${ICON_EDIT}</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      bookCopiesTableContent.innerHTML = html;
      renderDynamicPagination('bcPagination', filtered.length, BC_PAGE_SIZE, bcPage, (newPage) => {
        bcPage = newPage;
        renderBookCopiesTable();
      });
    }

    if (filterCirculationStatus) {
      filterCirculationStatus.addEventListener('change', () => {
        bcPage = 1;
        renderBookCopiesTable();
      });
    }

    searchBookCopyInput.addEventListener('input', () => {
      bcPage = 1;
      renderBookCopiesTable();
    });
    filterShelfLocation.addEventListener('change', () => {
      bcPage = 1;
      renderBookCopiesTable();
    });
    filterPhysicalStatus.addEventListener('change', () => {
      bcPage = 1;
      renderBookCopiesTable();
    });

    document.getElementById('btnAddBookCopy').addEventListener('click', () => {
      const books = getBookTitles();
      isCreatingBookCopy = true;
      const firstBook = books[0] || { id: 'DS001', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', price: '120.000', coverUrl: '' };
      selectedBookCopyId = DataService.generateNextId(DataService.KEYS.BOOK_COPIES, 'CS', 3);

      document.getElementById('modalBookCopyHeader').textContent = 'LEAF LIBRARY - THÊM CUỐN SÁCH MỚI';
      const codeDisp = document.getElementById('bcCodeDisplay');
      if (codeDisp) codeDisp.textContent = selectedBookCopyId;
      document.getElementById('bcIdInput').value = selectedBookCopyId;
      document.getElementById('bcBarcodeInput').value = '';
      document.getElementById('bcTitleInput').value = firstBook.title;
      document.getElementById('bcLocationInput').value = 'A1 - Ngăn 1';
      document.getElementById('bcPriceInput').value = firstBook.price || '120.000';
      document.getElementById('bcPhysicalInput').value = 'TỐT';
      document.getElementById('bcCirculationInput').value = 'SẴN SÀNG';
      updateBookCopyStockSummary(firstBook.id);
      bcUploadWidget.setState(firstBook.coverUrl || '', false);
      openModal('modalBookCopy');
    });

    bookCopiesTableContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const copies = getBookCopies();
      const copy = copies.find(c => c.id === id);
      if (!copy) return;

      selectedBookCopyId = id;

      if (action === 'edit-copy') {
        isCreatingBookCopy = false;
        document.getElementById('modalBookCopyHeader').textContent = 'LEAF LIBRARY - THÔNG TIN CUỐN SÁCH';
        const codeDisp = document.getElementById('bcCodeDisplay');
        if (codeDisp) codeDisp.textContent = copy.id;
        document.getElementById('bcIdInput').value = copy.id;
        document.getElementById('bcBarcodeInput').value = copy.barcode ?? '';
        document.getElementById('bcTitleInput').value = copy.bookTitle;
        document.getElementById('bcLocationInput').value = copy.location;
        document.getElementById('bcPriceInput').value = copy.price || '120.000';
        document.getElementById('bcPhysicalInput').value = copy.physicalStatus;
        const supportedStatus = Array.from(bcCirculationInput.options).some(option => option.value === copy.circulationStatus);
        bcCirculationInput.value = supportedStatus ? copy.circulationStatus : '';
        updateBookCopyStockSummary(copy.bookId);
        bcUploadWidget.setState(copy.coverUrl || '', true);
        openModal('modalBookCopy');
      }
    });

    document.getElementById('btnSaveBookCopy').addEventListener('click', async () => {
      const btnSave = document.getElementById('btnSaveBookCopy');
      const copies = getBookCopies();
      const books = getBookTitles();
      const idVal = document.getElementById('bcIdInput').value.trim() || selectedBookCopyId;
      const barcode = document.getElementById('bcBarcodeInput').value.trim() || idVal;
      const titleVal = document.getElementById('bcTitleInput').value.trim().toUpperCase();
      if (!idVal || !titleVal) {
        showToast('Vui lòng nhập Mã cuốn sách và Tên cuốn sách!', 'error');
        return;
      }
      if (isCreatingBookCopy && copies.some(c => String(c.id).toUpperCase() === idVal.toUpperCase())) {
        showToast(`Mã cuốn sách ${idVal} đã tồn tại trong kho!`, 'error');
        document.getElementById('bcIdInput')?.focus();
        return;
      }
      const locVal = document.getElementById('bcLocationInput').value.trim() || 'A1 - Ngăn 1';
      const priceVal = document.getElementById('bcPriceInput').value.trim() || '120.000';
      if (Number(priceVal.replace(/[^\d]/g, '')) < 0) {
        showToast('Giá tiền không hợp lệ!', 'error');
        return;
      }
      const phyVal = document.getElementById('bcPhysicalInput').value.trim().toUpperCase() || 'TỐT';
      const existingCopy = isCreatingBookCopy ? undefined : copies.find(copy => copy.id === selectedBookCopyId);
      let cirVal = bcCirculationInput.value || existingCopy?.circulationStatus || 'SẴN SÀNG';
      const coverVal = bcUploadWidget.getValue();

      const rules = getLibraryRules();
      if (cirVal === 'SẴN SÀNG' && phyVal.includes('RÁCH NÁT') && (!rules || rules.autoLockTornBooks === 'Bật')) {
        cirVal = 'HƯ HỎNG';
      }

      const matchedBook = books.find(b => b.title.toUpperCase() === titleVal) ||
        books.find(b => idVal.startsWith(b.id)) ||
        books[0];
      const parentBookId = matchedBook ? matchedBook.id : idVal.split('-')[0];

      const origText = btnSave ? btnSave.textContent : '';
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Đang lưu...';
      }

      try {
        if (isCreatingBookCopy) {
          copies.unshift({
            id: idVal,
            bookId: parentBookId,
            barcode,
            bookTitle: matchedBook ? matchedBook.title : titleVal,
            location: locVal,
            physicalStatus: phyVal,
            circulationStatus: cirVal,
            price: priceVal,
            coverUrl: coverVal
          });
          saveBookCopies(copies);
          syncBookCountsWithCopies(parentBookId);
          addLog('TẠO MỚI', idVal, `Thêm bản sao cuốn sách <strong>${escapeAdminHtml(idVal)}</strong> tại kệ ${escapeAdminHtml(locVal)}`);
          const savesSucceeded = await DataService.waitForWrites([
            DataService.KEYS.BOOK_COPIES,
            DataService.KEYS.BOOK_TITLES
          ]);
          if (!savesSucceeded) return;
          showToast(`Đã thêm cuốn sách ${idVal}!`);
        } else {
          const copy = copies.find(c => c.id === selectedBookCopyId);
          if (copy) {
            copy.id = idVal;
            copy.barcode = barcode;
            copy.bookTitle = titleVal;
            copy.location = locVal;
            copy.price = priceVal;
            copy.physicalStatus = phyVal;
            copy.circulationStatus = cirVal;
            copy.coverUrl = coverVal;
            saveBookCopies(copies);
            syncBookCountsWithCopies(copy.bookId || parentBookId);
            const savesSucceeded = await DataService.waitForWrites([
              DataService.KEYS.BOOK_COPIES,
              DataService.KEYS.BOOK_TITLES
            ]);
            if (!savesSucceeded) return;
            addLog('CẬP NHẬT', idVal, `Cập nhật thông tin cuốn sách <strong>${escapeAdminHtml(idVal)}</strong> (${escapeAdminHtml(phyVal)} - ${escapeAdminHtml(cirVal)})`);
            showToast(`Đã cập nhật thông tin cuốn sách ${idVal}!`);
          }
        }

        closeModal('modalBookCopy');
        renderBookCopiesTable();
        renderBookTitlesGrid();
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = origText || 'LƯU THÔNG TIN';
        }
      }
    });



    const importReceiptsTableContent = document.getElementById('importReceiptsTableContent');
    const searchImportInput = document.getElementById('searchImportReceiptInput') || document.getElementById('searchImportInput');
    const impDateFrom = document.getElementById('impDateFrom');
    const impDateTo = document.getElementById('impDateTo');
    const impNewItemsBody = document.getElementById('impNewItemsBody');
    const btnAddImportRow = document.getElementById('btnAddImportRow');

    function renderImportReceiptsTable() {
      const receipts = getImportReceipts();
      const q = (searchImportInput ? searchImportInput.value : '').trim().toLowerCase();
      const fromDate = parseVNDate(impDateFrom ? impDateFrom.value : '');
      const toDate = parseVNDate(impDateTo ? impDateTo.value : '');
      const isFiltered = Boolean(q) || Boolean(fromDate) || Boolean(toDate);

      const filtered = receipts.filter(r => {
        const matchQ = !q ||
          r.id.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.creator.toLowerCase().includes(q);

        let matchDate = true;
        if (fromDate || toDate) {
          const rDate = parseVNDate(r.date);
          if (rDate) {
            if (fromDate && rDate < fromDate) matchDate = false;
            if (toDate && rDate > toDate) matchDate = false;
          }
        }
        return matchQ && matchDate;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / IMP_PAGE_SIZE));
      if (impPage > totalPages) impPage = totalPages;
      const start = (impPage - 1) * IMP_PAGE_SIZE;
      const paged = filtered.slice(start, start + IMP_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Tạo phiếu nhập mới +');
      } else {
        paged.forEach(r => {
          const isPending = String(r.status || '').toUpperCase().includes('CHỜ') || String(r.status || '').toUpperCase().includes('CHO_XAC_NHAN');
          const statusLabel = isPending ? '<span style="font-size:11px; color:#D97706; font-weight:600; display:block;">Chờ xác nhận</span>' : '<span style="font-size:11px; color:#16A34A; font-weight:600; display:block;">Đã xác nhận</span>';
          html += `
            <div class="import-table-row" data-id="${escapeAdminHtml(r.id)}">
              <div style="font-weight: 600;">${escapeAdminHtml(r.id)}${statusLabel}</div>
              <div>${escapeAdminHtml(r.date)}</div>
              <div>${escapeAdminHtml(r.supplier)}</div>
              <div>${escapeAdminHtml(r.totalBooks)}</div>
              <div style="font-weight: 700;">${escapeAdminHtml(r.totalAmount)}</div>
              <div>${escapeAdminHtml(r.creator)}</div>
              <div>
                <div class="actions-group">
                  ${isPending ? `<button type="button" class="btn-action-blue" data-action="confirm-receipt" data-id="${escapeAdminHtml(r.id)}" style="padding:3px 7px; font-size:11px; height:auto;">Xác nhận</button>` : ''}
                  <span class="action-icon" title="Xem chi tiết phiếu nhập" data-action="view-receipt" data-id="${escapeAdminHtml(r.id)}">${ICON_EYE}</span>
                  <span class="action-icon" title="In phiếu nhập" data-action="print-receipt" data-id="${escapeAdminHtml(r.id)}">${ICON_PRINT}</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      importReceiptsTableContent.innerHTML = html;
      renderDynamicPagination('impPagination', filtered.length, IMP_PAGE_SIZE, impPage, (newPage) => {
        impPage = newPage;
        renderImportReceiptsTable();
      });
    }

    if (searchImportInput) {
      searchImportInput.addEventListener('input', () => {
        impPage = 1;
        renderImportReceiptsTable();
      });
    }
    document.getElementById('btnFilterImportReceipt').addEventListener('click', () => {
      impPage = 1;
      renderImportReceiptsTable();
      showToast('Đã lọc danh sách phiếu nhập kho!');
    });

    function buildBookSelectOptionsHtml() {
      const books = getBookTitles();
      if (books.length === 0) {
        return `<option value="DS001" data-price="120000">DS001 - Clean Code</option>`;
      }
      return books.map(b => `<option value="${b.id}" data-price="${parseNumberClean(b.price) || 120000}">${b.id} - ${b.title}</option>`).join('');
    }

    function updateAllImportRowsTotals() {
      if (!impNewItemsBody) return;
      let grandTotal = 0;
      const rows = impNewItemsBody.querySelectorAll('tr');
      rows.forEach(tr => {
        const qtyEl = tr.querySelector('.imp-row-qty');
        const priceEl = tr.querySelector('.imp-row-price');
        const subEl = tr.querySelector('.imp-row-subtotal');
        const qty = Math.max(1, parseInt(qtyEl ? qtyEl.value : 1, 10) || 1);
        const price = Math.max(0, parseInt(priceEl ? priceEl.value : 0, 10) || 0);
        const sub = qty * price;
        grandTotal += sub;
        if (subEl) subEl.textContent = `${sub.toLocaleString('vi-VN')} đ`;
      });
      const totalDisplay = document.getElementById('impNewTotalDisplay');
      if (totalDisplay) totalDisplay.textContent = `${grandTotal.toLocaleString('vi-VN')} đ`;
    }

    function appendImportItemRow() {
      if (!impNewItemsBody) return;
      const books = getBookTitles();
      const firstPrice = books[0] ? (parseNumberClean(books[0].price) || 120000) : 120000;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <select class="form-select-control imp-row-book">
            ${buildBookSelectOptionsHtml()}
          </select>
        </td>
        <td>
          <input type="number" class="form-input-text imp-row-qty" value="5" min="1">
        </td>
        <td>
          <input type="number" class="form-input-text imp-row-price" value="${firstPrice}" min="1000" step="1000">
        </td>
        <td class="imp-row-subtotal" style="font-weight: 700;">${(5 * firstPrice).toLocaleString('vi-VN')} đ</td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-import-row" title="Xóa dòng">✕</button>
        </td>
      `;

      const bookSel = tr.querySelector('.imp-row-book');
      const qtyInput = tr.querySelector('.imp-row-qty');
      const priceInput = tr.querySelector('.imp-row-price');
      const removeBtn = tr.querySelector('.btn-remove-import-row');

      if (bookSel) {
        bookSel.addEventListener('change', () => {
          const opt = bookSel.options[bookSel.selectedIndex];
          const defaultPrice = opt ? opt.getAttribute('data-price') : '';
          if (defaultPrice && priceInput) {
            priceInput.value = defaultPrice;
          }
          updateAllImportRowsTotals();
        });
      }
      if (qtyInput) qtyInput.addEventListener('input', updateAllImportRowsTotals);
      if (priceInput) priceInput.addEventListener('input', updateAllImportRowsTotals);
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (impNewItemsBody.querySelectorAll('tr').length <= 1) {
            showToast('Phiếu nhập phải có ít nhất 1 dòng đầu sách!', 'warning');
            return;
          }
          tr.remove();
          updateAllImportRowsTotals();
        });
      }

      impNewItemsBody.appendChild(tr);
      updateAllImportRowsTotals();
    }

    if (btnAddImportRow) {
      btnAddImportRow.addEventListener('click', appendImportItemRow);
    }

    document.getElementById('btnCreateImportReceipt').addEventListener('click', () => {
      const suppliers = getSuppliers().filter(s => s.status !== 'NGỪNG GD');
      const nextId = DataService.generateNextId(DataService.KEYS.IMPORT_RECEIPTS, 'PN', 3);
      document.getElementById('impNewCodeDisplay').textContent = nextId;
      document.getElementById('impNewDateInput').value = formatTodayDate();

      const session = getActiveUserSession();
      document.getElementById('impNewCreatorInput').value = session.name || 'Quản trị viên';

      const supSelect = document.getElementById('impNewSupplierSelect');
      if (suppliers.length > 0) {
        supSelect.innerHTML = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
      } else {
        supSelect.innerHTML = `<option value="Công ty Cổ phần Phát hành Sách TP.HCM (FAHASA)">Công ty Cổ phần Phát hành Sách TP.HCM (FAHASA)</option>`;
      }

      if (impNewItemsBody) {
        impNewItemsBody.innerHTML = '';
        appendImportItemRow();
      }
      openModal('modalCreateImport');
    });

    document.getElementById('btnSaveImportReceipt').addEventListener('click', async () => {
      const btnSave = document.getElementById('btnSaveImportReceipt');
      const books = getBookTitles();
      const code = document.getElementById('impNewCodeDisplay').textContent.trim();
      const date = document.getElementById('impNewDateInput').value.trim() || formatTodayDate();
      const supplier = document.getElementById('impNewSupplierSelect').value;
      const creator = document.getElementById('impNewCreatorInput').value.trim() || (getActiveUserSession().name || 'Quản trị viên');

      if (!parseVNDate(date)) {
        showToast('Ngày nhập kho không hợp lệ (định dạng DD / MM / YYYY)!', 'error');
        document.getElementById('impNewDateInput')?.focus();
        return;
      }

      const rows = impNewItemsBody ? impNewItemsBody.querySelectorAll('tr') : [];
      if (rows.length === 0) {
        showToast('Vui lòng thêm ít nhất 1 dòng sách nhập!', 'error');
        return;
      }

      const items = [];
      let totalBooks = 0;
      let grandTotal = 0;

      for (const tr of rows) {
        const bookId = tr.querySelector('.imp-row-book').value;
        const qtyRaw = Number(tr.querySelector('.imp-row-qty').value);
        const priceRaw = Number(tr.querySelector('.imp-row-price').value);
        if (!Number.isInteger(qtyRaw) || qtyRaw < 1 || qtyRaw > 1000) {
          showToast('Số lượng nhập ở mỗi dòng phải là số nguyên từ 1 đến 1000!', 'error');
          return;
        }
        if (!Number.isFinite(priceRaw) || priceRaw < 0) {
          showToast('Đơn giá nhập không được âm!', 'error');
          return;
        }
        const qty = qtyRaw;
        const price = priceRaw;
        const subtotal = qty * price;
        const targetBook = books.find(b => b.id === bookId);
        const bookTitle = targetBook ? targetBook.title : bookId;

        items.push({
          bookId,
          bookTitle,
          qty,
          unitPriceValue: price,
          subtotalValue: subtotal,
          unitPrice: `${price.toLocaleString('vi-VN')} đ`,
          subtotal: `${subtotal.toLocaleString('vi-VN')} đ`
        });

        totalBooks += qty;
        grandTotal += subtotal;
      }

      const origText = btnSave ? btnSave.textContent : '';
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Đang lưu...';
      }

      // Theo State 5.4 / Seq 2.5.3: Phiếu nhập mới tạo luôn ở trạng thái CHỜ XÁC NHẬN, chưa sinh cuốn sách hay cộng tồn kho
      const receiptStatus = 'CHỜ XÁC NHẬN';

      try {
        const totalStr = `${grandTotal.toLocaleString('vi-VN')} đ`;

        const receipt = await DataService.request('POST', '/importReceipts', {
          id: code,
          employeeId: getActiveUserSession().id,
          date,
          supplier,
          creator,
          totalBooks: `${totalBooks} cuốn`,
          totalQuantity: totalBooks,
          totalAmount: totalStr,
          status: receiptStatus,
          items
        });

        addLog('TẠO MỚI', receipt.id, `Tạo phiếu nhập kho <strong>${escapeAdminHtml(receipt.id)}</strong> (${totalBooks} cuốn - ${escapeAdminHtml(receiptStatus)})`);
        await DataService.hydrate(DataService.KEYS.IMPORT_RECEIPTS, 'importReceipts');
        closeModal('modalCreateImport');
        renderImportReceiptsTable();
        renderBookTitlesGrid();
        renderBookCopiesTable();
        showToast(`Đã lập phiếu nhập ${receipt.id} ở trạng thái Chờ xác nhận! Hãy nhấn "Xác nhận" khi hoàn tất nhập kho.`);
      } catch (error) {
        showToast(error.message || 'Không thể lưu phiếu nhập.', 'error');
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = origText || 'LƯU PHIẾU NHẬP';
        }
      }
    });

    function openImportDetailPreview(rec) {
      document.getElementById('detailImpId').textContent = rec.id;
      document.getElementById('detailImpDate').textContent = rec.date;
      document.getElementById('detailImpSupplier').textContent = rec.supplier;
      document.getElementById('detailImpCreator').textContent = rec.creator;
      document.getElementById('detailImpTotal').textContent = rec.totalAmount;

      const tbody = document.getElementById('detailImpItemsBody');
      tbody.innerHTML = (rec.items || []).map(item => `
        <tr>
          <td style="font-weight: 600;">${item.bookId}</td>
          <td>${item.bookTitle}</td>
          <td>${item.qty} cuốn</td>
          <td>${item.unitPrice}</td>
          <td style="font-weight: 700;">${item.subtotal}</td>
        </tr>
      `).join('');

      openModal('modalDetailImport');
    }

    function openImportPrintPreview(rec) {
      document.getElementById('printImpId').textContent = rec.id;
      document.getElementById('printImpDate').textContent = rec.date;
      document.getElementById('printImpSupplier').textContent = rec.supplier;
      document.getElementById('printImpCreator').textContent = rec.creator;
      document.getElementById('printImpTotal').textContent = rec.totalAmount;

      const tbody = document.getElementById('printImpItemsBody');
      tbody.innerHTML = (rec.items || []).map((item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 600;">${item.bookId}</td>
          <td>${item.bookTitle}</td>
          <td style="text-align: center;">${item.qty}</td>
          <td>${item.unitPrice}</td>
          <td style="font-weight: 700;">${item.subtotal}</td>
        </tr>
      `).join('');

      openModal('modalPrintImport');
    }

    importReceiptsTableContent.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const receipts = getImportReceipts();
      const rec = receipts.find(r => r.id === id);
      if (!rec) return;

      if (action === 'confirm-receipt') {
        const ok = await openAdminConfirmModal({
          title: 'Xác nhận phiếu nhập sách',
          message: `Xác nhận phiếu nhập ${rec.id}? Hệ thống sẽ cộng tồn kho và sinh mã cá biệt cho các cuốn sách nhập.`,
          confirmText: 'Xác nhận nhập kho',
          cancelText: 'Hủy'
        });
        if (!ok) return;
        let apiConfirmed = false;
        try {
          await DataService.request('POST', `/importReceipts/${encodeURIComponent(rec.id)}/confirm`, {});
          apiConfirmed = true;
        } catch (err) {
          if (err && err.status !== 0 && err.status !== 404) {
            showToast(err.message || 'Không thể xác nhận phiếu nhập.', 'error');
            return;
          }
        }
        if (apiConfirmed) {
          rec.status = 'ĐÃ XÁC NHẬN';
          if (DataService._cache) DataService._cache[DataService.KEYS.IMPORT_RECEIPTS] = receipts;
          await Promise.all([
            DataService.hydrate(DataService.KEYS.BOOK_COPIES, 'bookCopies', []).catch(() => {}),
            DataService.hydrate(DataService.KEYS.BOOK_TITLES, 'bookTitles', []).catch(() => {}),
            DataService.hydrate(DataService.KEYS.IMPORT_RECEIPTS, 'importReceipts', []).catch(() => {})
          ]);
        } else {
          const books = getBookTitles();
          (rec.items || []).forEach(it => {
            const targetBook = books.find(b => String(b.id) === String(it.bookId));
            if (targetBook) {
              autoGenerateCopiesForBook(it.bookId, targetBook.title, Number(it.qty || 1), formatVND(it.unitPriceValue || 0), targetBook.coverUrl);
              syncBookCountsWithCopies(it.bookId);
            }
          });
          rec.status = 'ĐÃ XÁC NHẬN';
          saveImportReceipts(receipts);
        }
        addLog('CẬP NHẬT', rec.id, `Xác nhận phiếu nhập <strong>${escapeAdminHtml(rec.id)}</strong> và nhập kho sách`);
        renderImportReceiptsTable();
        renderBookTitlesGrid();
        renderBookCopiesTable();
        showToast(`Đã xác nhận phiếu nhập ${rec.id} và cập nhật tồn kho!`);
        return;
      }

      if (action === 'view-receipt') {
        openImportDetailPreview(rec);
      } else if (action === 'print-receipt') {
        openImportPrintPreview(rec);
      }
    });

    const btnTriggerPrintReceipt = document.getElementById('btnTriggerPrintReceipt');
    if (btnTriggerPrintReceipt) {
      btnTriggerPrintReceipt.addEventListener('click', () => {
        window.print();
      });
    }

    const suppliersTableContent = document.getElementById('suppliersTableContent');
    const searchSupplierInput = document.getElementById('searchSupplierInput');
    const filterSupplierStatus = document.getElementById('filterSupplierStatus');

    function renderSuppliersTable() {
      const suppliers = getSuppliers();
      const q = (searchSupplierInput.value || '').trim().toLowerCase();
      const st = filterSupplierStatus.value;
      const isFiltered = Boolean(q) || st !== 'all';

      const filtered = suppliers.filter(s => {
        const matchSt = st === 'all' || s.status === st;
        const matchQ = !q ||
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q);
        return matchSt && matchQ;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / SUP_PAGE_SIZE));
      if (supPage > totalPages) supPage = totalPages;
      const start = (supPage - 1) * SUP_PAGE_SIZE;
      const paged = filtered.slice(start, start + SUP_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Thêm nhà cung cấp +');
      } else {
        paged.forEach(s => {
          const badge = s.status === 'HOẠT ĐỘNG'
            ? `<span class="badge-supplier-active status-badge">HOẠT ĐỘNG</span>`
            : `<span class="badge-supplier-inactive status-badge">NGỪNG GD</span>`;

          html += `
            <div class="supplier-table-row" data-id="${s.id}">
              <div style="font-weight: 600;">${s.id}</div>
              <div>${s.name}</div>
              <div>${s.contact}</div>
              <div>${s.phone}</div>
              <div>${s.email}</div>
              <div>${badge}</div>
              <div>
                <div class="actions-group">
                  <span class="action-icon" title="Chỉnh sửa nhà cung cấp" data-action="edit-supplier" data-id="${s.id}">${ICON_EDIT}</span>
                  <span class="action-icon" title="Xóa đối tác" data-action="delete-supplier" data-id="${s.id}">${ICON_DELETE}</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      suppliersTableContent.innerHTML = html;
      renderDynamicPagination('supPagination', filtered.length, SUP_PAGE_SIZE, supPage, (newPage) => {
        supPage = newPage;
        renderSuppliersTable();
      });
    }

    searchSupplierInput.addEventListener('input', () => {
      supPage = 1;
      renderSuppliersTable();
    });
    filterSupplierStatus.addEventListener('change', () => {
      supPage = 1;
      renderSuppliersTable();
    });

    document.getElementById('btnAddSupplier').addEventListener('click', () => {
      isCreatingSupplier = true;
      selectedSupplierId = DataService.generateNextId(DataService.KEYS.SUPPLIERS, 'NC', 3);
      document.getElementById('modalSupplierHeader').textContent = 'LEAF LIBRARY - THÊM NHÀ CUNG CẤP MỚI';
      document.getElementById('supIdDisplay').textContent = selectedSupplierId;
      document.getElementById('supNameInput').value = '';
      document.getElementById('supContactInput').value = '';
      document.getElementById('supPhoneInput').value = '';
      document.getElementById('supEmailInput').value = '';
      document.getElementById('supAddressInput').value = '';
      openModal('modalSupplier');
    });

    suppliersTableContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const suppliers = getSuppliers();
      const sup = suppliers.find(s => s.id === id);
      if (!sup) return;

      selectedSupplierId = id;

      if (action === 'edit-supplier') {
        isCreatingSupplier = false;
        document.getElementById('modalSupplierHeader').textContent = 'LEAF LIBRARY - CẬP NHẬT NHÀ CUNG CẤP';
        document.getElementById('supIdDisplay').textContent = sup.id;
        document.getElementById('supNameInput').value = sup.name;
        document.getElementById('supContactInput').value = sup.contact;
        document.getElementById('supPhoneInput').value = sup.phone;
        document.getElementById('supEmailInput').value = sup.email;
        document.getElementById('supAddressInput').value = sup.address || '';
        openModal('modalSupplier');
      } else if (action === 'delete-supplier') {
        document.getElementById('deleteSupplierCode').textContent = `${sup.id} (${sup.name})`;
        openModal('modalDeleteSupplier');
      }
    });

    document.getElementById('btnSaveSupplier').addEventListener('click', async event => {
      const suppliers = getSuppliers();
      const nameVal = document.getElementById('supNameInput').value.trim();
      if (!nameVal) {
        showToast('Vui lòng nhập Tên đối tác / Đơn vị cung cấp!', 'error');
        document.getElementById('supNameInput')?.focus();
        return;
      }
      const contactVal = document.getElementById('supContactInput').value.trim() || 'Đại diện kinh doanh';
      const phoneVal = document.getElementById('supPhoneInput').value.trim();
      const phoneDigits = phoneVal.replace(/[\s.-]/g, '');
      if (phoneVal && !/^(\+84|0)\d{8,10}$/.test(phoneDigits)) {
        showToast('Số điện thoại nhà cung cấp không hợp lệ!', 'error');
        document.getElementById('supPhoneInput')?.focus();
        return;
      }
      const emailVal = document.getElementById('supEmailInput').value.trim();
      if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showToast('Email nhà cung cấp không hợp lệ!', 'error');
        document.getElementById('supEmailInput')?.focus();
        return;
      }
      const addrVal = document.getElementById('supAddressInput').value.trim() || 'TP.HCM';

      if (isCreatingSupplier) {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const created = await DataService.request('POST', '/suppliers', {
          id: selectedSupplierId,
          name: nameVal,
          contact: contactVal,
          phone: phoneVal || '0909123456',
          email: emailVal || 'contact@partner.vn',
          address: addrVal,
          status: 'HOẠT ĐỘNG'
          });
          await DataService.hydrate(DataService.KEYS.SUPPLIERS, 'suppliers');
          addLog('TẠO MỚI', created.id, `Thêm đối tác cung cấp mới <strong>${escapeAdminHtml(nameVal)}</strong>`);
          showToast(`Đã thêm nhà cung cấp ${nameVal} (${created.id})!`);
        } catch (error) {
          showToast(error.message || 'Không thể lưu nhà cung cấp.', 'error');
          return;
        } finally {
          button.disabled = false;
        }
      } else {
        const sup = suppliers.find(s => s.id === selectedSupplierId);
        if (sup) {
          sup.name = nameVal;
          sup.contact = contactVal;
          sup.phone = phoneVal || sup.phone;
          sup.email = emailVal || sup.email;
          sup.address = addrVal;
          saveSuppliers(suppliers);
          addLog('CẬP NHẬT', sup.id, `Cập nhật thông tin đối tác cung cấp <strong>${escapeAdminHtml(sup.name)}</strong>`);
          showToast(`Đã lưu thông tin nhà cung cấp ${sup.name}!`);
        }
      }

      closeModal('modalSupplier');
      renderSuppliersTable();
    });

    document.getElementById('btnConfirmDeleteSupplier').addEventListener('click', () => {
      let suppliers = getSuppliers();
      const target = suppliers.find(s => s.id === selectedSupplierId);
      if (target) {
        suppliers = suppliers.filter(s => s.id !== selectedSupplierId);
        saveSuppliers(suppliers);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa đối tác cung cấp <strong>${target.name}</strong>`);
        renderSuppliersTable();
        showToast(`Đã xóa đối tác ${target.name}!`);
      }
      closeModal('modalDeleteSupplier');
    });

    renderBookTitlesGrid();
    renderBookCopiesTable();
    renderImportReceiptsTable();
    renderSuppliersTable();

    function syncCategorySelects() {
      const cats = typeof getCategories === 'function' ? getCategories() : [];
      const btCat = document.getElementById('btCategory');
      const filterCat = document.getElementById('filterBookCategory');
      if (btCat && cats.length) {
        const cur = btCat.value;
        btCat.innerHTML = cats.map(c => `<option value="${escapeAdminHtml(c.name)}">${escapeAdminHtml(c.name)}</option>`).join('');
        if (cur && cats.some(c => c.name === cur)) btCat.value = cur;
      }
      if (filterCat && cats.length) {
        const cur = filterCat.value;
        filterCat.innerHTML = `<option value="all">Tất cả thể loại</option>` + cats.map(c => `<option value="${escapeAdminHtml(c.name)}">${escapeAdminHtml(c.name)}</option>`).join('');
        filterCat.value = cur || 'all';
      }
    }

    syncCategorySelects();
  }

  /**
   * 3. PHÂN HỆ QUẢN LÝ ĐỘC GIẢ (admin/readers.html)
   */
  const readersTableContent = document.getElementById('readersTableContent');

  if (readersTableContent) {
    let selectedReaderId = null;
    let rdPage = 1;
    let rhPage = 1;
    const RD_PAGE_SIZE = 5;
    const RH_PAGE_SIZE = 5;

    const rdUploadWidget = setupMediaUploadWidget({
      bannerId: 'rdMediaBanner',
      defaultGraphicId: 'rdDefaultAvatar',
      placeholderId: 'rdUploadPlaceholder',
      imgPreviewId: 'rdImagePreview',
      resetBtnId: 'btnResetRdImage',
      fileInputId: 'rdImageFileInput',
      urlInputId: 'rdImageUrlInput'
    });

    const searchReaderInput = document.getElementById('searchReaderInput');
    const filterReaderStatus = document.getElementById('filterReaderStatus');

    function getReaderStatusBadge(status) {
      if (status === 'PENDING') return '<span class="status-badge badge-reader-expired">CHỜ DUYỆT</span>';
      if (status === 'REJECTED') return '<span class="status-badge badge-reader-locked">TỪ CHỐI</span>';
      if (['HỢP LỆ', 'ACTIVE', 'HOẠT ĐỘNG'].includes(status)) return `<span class="badge-reader-valid status-badge">HỢP LỆ</span>`;
      if (status === 'HẾT HẠN') return `<span class="badge-reader-expired status-badge">HẾT HẠN</span>`;
      return `<span class="badge-reader-locked status-badge">BỊ KHÓA</span>`;
    }

    function renderReaderActions(reader) {
      if (reader.status === 'REJECTED') return '';
      if (reader.status === 'PENDING') {
        return '<button type="button" class="btn-action-gray" data-open-registration>Đi tới xét duyệt</button>';
      }
      return `
        <div class="actions-group">
          <span class="action-icon" title="Xem / In thẻ thư viện" data-action="print-card" data-id="${reader.id}">${ICON_PRINT}</span>
          <span class="action-icon" title="Chỉnh sửa thông tin độc giả" data-action="edit-reader" data-id="${reader.id}">${ICON_EDIT}</span>
          <span class="action-icon" title="Khóa / Mở khóa thẻ" data-action="lock-reader" data-id="${reader.id}">${ICON_LOCK}</span>
          <span class="action-icon" title="Xóa hồ sơ độc giả" data-action="delete-reader" data-id="${reader.id}">${ICON_DELETE}</span>
        </div>
      `;
    }

    function renderReadersTable() {
      const readers = getReaders();
      const q = (searchReaderInput.value || '').trim().toLowerCase();
      const st = filterReaderStatus.value;
      const isFiltered = Boolean(q) || st !== 'all';

      const filtered = readers.filter(r => {
        const matchSt = st === 'all' || r.status === st || (st === 'HỢP LỆ' && ['ACTIVE', 'HOẠT ĐỘNG'].includes(r.status));
        const matchQ = !q ||
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.cccd && r.cccd.toLowerCase().includes(q)) ||
          (r.phone && r.phone.toLowerCase().includes(q));
        return matchSt && matchQ;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / RD_PAGE_SIZE));
      if (rdPage > totalPages) rdPage = totalPages;
      const start = (rdPage - 1) * RD_PAGE_SIZE;
      const paged = filtered.slice(start, start + RD_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = renderEmptyState(isFiltered, 'Thêm độc giả +');
      } else {
        paged.forEach(r => {
          html += `
            <div class="readers-table-row" data-id="${r.id}">
              <div style="font-weight: 600;">${r.id}</div>
              <div>${r.name}</div>
              <div>${r.readerType}</div>
              <div>${r.issueDate}</div>
              <div>${r.expiryDate}</div>
              <div>${getReaderStatusBadge(r.status)}</div>
              <div>${renderReaderActions(r)}</div>
            </div>
          `;
        });
      }

      readersTableContent.innerHTML = html;
      renderDynamicPagination('rdPagination', filtered.length, RD_PAGE_SIZE, rdPage, (newPage) => {
        rdPage = newPage;
        renderReadersTable();
      });
    }

    const registrationTab = document.querySelector('[data-tab="tabRegistrationReview"]');
    const registrationTable = document.getElementById('registrationTableContent');
    const registrationSearch = document.getElementById('registrationSearch');
    const registrationCount = document.getElementById('registrationCount');
    const refreshRegistrations = document.getElementById('refreshRegistrations');
    let registrationPage = 1;
    let pendingRegistrations = [];
    let registrationLoadError = '';
    let registrationReviewing = false;

    function renderRegistrations() {
      const query = registrationSearch.value.trim().toLowerCase();
      const filtered = pendingRegistrations.filter(reader =>
        [reader.id, reader.name, reader.username, reader.email, reader.phone].some(field =>
          String(field ?? '').toLowerCase().includes(query)
        )
      );
      registrationPage = Math.min(registrationPage, Math.max(1, Math.ceil(filtered.length / RD_PAGE_SIZE)));
      const start = (registrationPage - 1) * RD_PAGE_SIZE;
      registrationCount.textContent = refreshRegistrations.disabled ? 'Đang tải hồ sơ…'
        : registrationLoadError ? '' : `${pendingRegistrations.length} hồ sơ chờ duyệt`;
      const emptyMessage = registrationLoadError || (refreshRegistrations.disabled ? 'Đang tải hồ sơ…'
        : query ? 'Không tìm thấy hồ sơ phù hợp.' : 'Không có hồ sơ đăng ký chờ duyệt.');
      const visible = filtered.slice(start, start + RD_PAGE_SIZE);
      registrationTable.innerHTML = visible.length ? visible.map(reader => `
        <div class="readers-table-row" data-id="${escapeAdminHtml(reader.id)}">
          <div>${escapeAdminHtml(reader.id)}</div>
          <div>
            <details>
              <summary>${escapeAdminHtml(reader.name)}</summary>
              <div>CCCD/CMND: ${escapeAdminHtml(reader.cccd || '—')}</div>
              <div>Giới tính: ${escapeAdminHtml(reader.gender || '—')}</div>
              <div>Ngày sinh: ${escapeAdminHtml(reader.dob || '—')}</div>
              <div>Địa chỉ: ${escapeAdminHtml(reader.address || '—')}</div>
              <div>Đối tượng: ${escapeAdminHtml(reader.readerType || '—')}</div>
            </details>
          </div>
          <div>${escapeAdminHtml(reader.username || '—')}</div>
          <div>${escapeAdminHtml(reader.email || '—')}</div>
          <div>${escapeAdminHtml(reader.phone || '—')}</div>
          <div>${getReaderStatusBadge(reader.status)}</div>
          <div class="registration-actions">
            <button type="button" class="btn-action-blue" data-registration-decision="approve">Duyệt</button>
            <button type="button" class="btn-action-gray" data-registration-decision="reject">Từ chối</button>
          </div>
        </div>
      `).join('') : `<div class="registration-empty">${escapeAdminHtml(emptyMessage)}</div>`;
      renderDynamicPagination('registrationPagination', filtered.length, RD_PAGE_SIZE, registrationPage, page => {
        registrationPage = page;
        renderRegistrations();
      });
    }

    async function loadRegistrations() {
      if (refreshRegistrations.disabled) return;
      refreshRegistrations.disabled = true;
      registrationLoadError = '';
      renderRegistrations();
      try {
        const readers = await DataService.hydrate(DataService.KEYS.READERS, 'readers');
        pendingRegistrations = readers.filter(reader => reader.status === 'PENDING');
        renderReadersTable();
      } catch (error) {
        registrationLoadError = error.message || 'Không tải được hồ sơ đăng ký.';
        pendingRegistrations = [];
      } finally {
        refreshRegistrations.disabled = false;
        renderRegistrations();
      }
    }

    const reloadRegistrationTab = () => {
      if (!registrationReviewing) return loadRegistrations();
    };
    registrationTab.addEventListener('click', reloadRegistrationTab);
    refreshRegistrations.addEventListener('click', reloadRegistrationTab);
    registrationSearch.addEventListener('input', () => {
      registrationPage = 1;
      renderRegistrations();
    });
    readersTableContent.addEventListener('click', event => {
      if (event.target.closest('[data-open-registration]')) registrationTab.click();
    });
    registrationTable.addEventListener('click', async event => {
      const button = event.target.closest('[data-registration-decision]');
      if (!button || registrationReviewing || refreshRegistrations.disabled) return;
      const row = button.closest('.readers-table-row');
      const reader = pendingRegistrations.find(item => String(item.id) === row.dataset.id);
      if (!reader) return;
      const decision = button.dataset.registrationDecision;
      const label = decision === 'approve' ? 'Duyệt đăng ký' : 'Từ chối đăng ký';
      registrationReviewing = true;
      const buttons = row.querySelectorAll('[data-registration-decision]');
      buttons.forEach(item => { item.disabled = true; });
      try {
        const confirmed = await openAdminConfirmModal({
          title: label,
          message: `Xác nhận xử lý đăng ký của ${reader.name} (${reader.username || reader.id})?`,
          confirmText: label,
          danger: decision === 'reject'
        });
        if (!confirmed) return;
        await DataService.request('POST', `/readers/${encodeURIComponent(reader.id)}/registration-decision`, { decision });
        pendingRegistrations = pendingRegistrations.filter(item => item !== reader);
        showToast(`${label} thành công.`, 'success');
        await loadRegistrations();
      } catch (error) {
        showToast(error.message || 'Không thể xử lý đăng ký.', 'error');
        if (error.status === 409) await loadRegistrations();
      } finally {
        registrationReviewing = false;
        buttons.forEach(item => { item.disabled = false; });
      }
    });

    searchReaderInput.addEventListener('input', () => {
      rdPage = 1;
      renderReadersTable();
    });
    filterReaderStatus.addEventListener('change', () => {
      rdPage = 1;
      renderReadersTable();
    });

    const btnAddReader = document.getElementById('btnAddReader') || document.getElementById('btnGoToIssueCard');
    if (btnAddReader) {
      btnAddReader.addEventListener('click', () => {
        const issueTabBtn = document.querySelector('.subtab-item[data-tab="tabIssueCard"], .sub-tab[data-target="tabIssueCard"]');
        if (issueTabBtn) issueTabBtn.click();
        const nameEl = document.getElementById('issueReaderName');
        if (nameEl) nameEl.focus();
      });
    }

    readersTableContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const readers = getReaders();
      const reader = readers.find(r => r.id === id);
      if (!reader) return;

      selectedReaderId = id;

      if (action === 'print-card') {
        document.getElementById('popupCardId').textContent = reader.id;
        document.getElementById('popupCardName').textContent = reader.name.toUpperCase();
        document.getElementById('popupCardType').textContent = reader.readerType;
        document.getElementById('popupCardExpiry').textContent = reader.expiryDate;
        openModal('modalPrintCard');
      } else if (action === 'edit-reader') {
        document.getElementById('rdCodeDisplay').textContent = reader.id;
        document.getElementById('rdNameInput').value = reader.name || '';
        document.getElementById('rdGenderInput').value = reader.gender || 'Nam';
        document.getElementById('rdCccdInput').value = reader.cccd || '';
        document.getElementById('rdDobInput').value = reader.dob || '';
        document.getElementById('rdIssueDateInput').value = reader.issueDate || '';
        document.getElementById('rdTypeSelect').value = reader.readerType || 'Sinh viên';
        document.getElementById('rdPhoneInput').value = reader.phone || '';
        document.getElementById('rdEmailInput').value = reader.email || '';
        document.getElementById('rdAddressInput').value = reader.address || '';
        document.getElementById('rdExpiryDateInput').value = reader.expiryDate || '';
        document.getElementById('rdStatusSelect').value = reader.status || 'HỢP LỆ';
        rdUploadWidget.setState(reader.avatarUrl || '', true);
        openModal('modalReaderInfo');
      } else if (action === 'lock-reader') {
        document.getElementById('lockReaderCode').textContent = `${reader.id} (${reader.name})`;
        openModal('modalLockReader');
      } else if (action === 'delete-reader') {
        document.getElementById('deleteReaderCode').textContent = `${reader.id} (${reader.name})`;
        openModal('modalDeleteReader');
      }
    });



    const btnTriggerPrintCard = document.getElementById('btnTriggerPrintCard');
    if (btnTriggerPrintCard) {
      btnTriggerPrintCard.addEventListener('click', () => {
        window.print();
      });
    }

    document.getElementById('btnSaveReaderInfo').addEventListener('click', () => {
      const readers = getReaders();
      const reader = readers.find(r => r.id === selectedReaderId);
      if (reader) {
        const newName = document.getElementById('rdNameInput').value.trim();
        const cccdVal = document.getElementById('rdCccdInput').value.trim();
        const dobVal = document.getElementById('rdDobInput').value.trim();
        const issueVal = document.getElementById('rdIssueDateInput').value.trim();
        const phoneVal = document.getElementById('rdPhoneInput').value.trim();
        const emailVal = document.getElementById('rdEmailInput').value.trim();
        const expiryVal = document.getElementById('rdExpiryDateInput').value.trim();

        if (!newName) {
          showToast('Vui lòng nhập Họ và tên độc giả!', 'error');
          document.getElementById('rdNameInput')?.focus();
          return;
        }
        if (cccdVal && !/^\d{9,12}$/.test(cccdVal)) {
          showToast('Số CCCD/CMND phải gồm 9 đến 12 chữ số!', 'error');
          document.getElementById('rdCccdInput')?.focus();
          return;
        }
        if (dobVal) {
          const d = parseVNDate(dobVal);
          if (!d || d > new Date()) {
            showToast('Ngày sinh độc giả không hợp lệ!', 'error');
            document.getElementById('rdDobInput')?.focus();
            return;
          }
        }
        if (phoneVal) {
          const pDigits = phoneVal.replace(/[\s.-]/g, '');
          if (!/^(\+84|0)\d{8,10}$/.test(pDigits)) {
            showToast('Số điện thoại độc giả không hợp lệ!', 'error');
            document.getElementById('rdPhoneInput')?.focus();
            return;
          }
        }
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          showToast('Địa chỉ Email độc giả không hợp lệ!', 'error');
          document.getElementById('rdEmailInput')?.focus();
          return;
        }
        if (issueVal && expiryVal) {
          const dI = parseVNDate(issueVal);
          const dE = parseVNDate(expiryVal);
          if (dI && dE && dE < dI) {
            showToast('Ngày hết hạn thẻ không thể sớm hơn ngày cấp!', 'error');
            document.getElementById('rdExpiryDateInput')?.focus();
            return;
          }
        }
        if (cccdVal && readers.some(r => r.id !== reader.id && String(r.cccd || '') === cccdVal)) {
          showToast('Số CCCD này đã tồn tại ở hồ sơ độc giả khác!', 'error');
          return;
        }

        reader.name = newName;
        reader.gender = document.getElementById('rdGenderInput').value.trim() || 'Nam';
        reader.cccd = cccdVal;
        reader.dob = dobVal;
        reader.issueDate = issueVal;
        reader.readerType = document.getElementById('rdTypeSelect').value;
        reader.phone = phoneVal;
        reader.email = emailVal;
        reader.address = document.getElementById('rdAddressInput').value.trim();
        reader.expiryDate = expiryVal;
        reader.status = document.getElementById('rdStatusSelect').value;
        reader.avatarUrl = rdUploadWidget.getValue();

        saveReaders(readers);
        addLog('CẬP NHẬT', reader.id, `Chỉnh sửa thông tin hồ sơ độc giả <strong>${escapeAdminHtml(reader.name)}</strong> (${escapeAdminHtml(reader.id)})`);
        renderReadersTable();
        showToast(`Đã cập nhật hồ sơ độc giả ${reader.name}!`);
      }
      closeModal('modalReaderInfo');
    });

    document.getElementById('btnConfirmLockReader').addEventListener('click', () => {
      const readers = getReaders();
      const reader = readers.find(r => r.id === selectedReaderId);
      if (reader) {
        reader.status = reader.status === 'BỊ KHÓA' ? 'HỢP LỆ' : 'BỊ KHÓA';
        saveReaders(readers);
        addLog('CẬP NHẬT', reader.id, `${reader.status === 'BỊ KHÓA' ? 'Khóa' : 'Mở khóa'} thẻ thư viện của độc giả <strong>${reader.name}</strong>`);
        renderReadersTable();
        showToast(`Đã ${reader.status === 'BỊ KHÓA' ? 'khóa' : 'mở khóa'} thẻ của độc giả ${reader.name}!`);
      }
      closeModal('modalLockReader');
    });

    document.getElementById('btnConfirmDeleteReader').addEventListener('click', () => {
      let readers = getReaders();
      const target = readers.find(r => r.id === selectedReaderId);
      if (target) {
        const loans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
        const fines = typeof getFines === 'function' ? getFines() : [];
        const hasActiveLoan = loans.some(l =>
          String(l.readerId) === String(target.id) &&
          !String(l.status || '').toLowerCase().includes('đã trả') &&
          !String(l.status || '').toLowerCase().includes('da tra')
        );
        const hasUnpaidFine = Number(target.outstandingFine || 0) > 0 || fines.some(f =>
          String(f.readerId) === String(target.id) &&
          !String(f.paymentStatus || f.status || '').toLowerCase().includes('đã thanh toán') &&
          !String(f.paymentStatus || f.status || '').toLowerCase().includes('da thanh toan')
        );
        if (hasActiveLoan || hasUnpaidFine) {
          closeModal('modalDeleteReader');
          showToast('Không thể xóa bạn đọc đang có giao dịch chưa xong (còn sách đang mượn hoặc còn nợ tiền phạt)!', 'error');
          return;
        }
        readers = readers.filter(r => r.id !== selectedReaderId);
        saveReaders(readers);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa hồ sơ độc giả <strong>${escapeAdminHtml(target.name)}</strong> khỏi hệ thống`);
        renderReadersTable();
        showToast(`Đã xóa hồ sơ độc giả ${target.name}!`);
      }
      closeModal('modalDeleteReader');
    });

    const issueReaderId = document.getElementById('issueReaderId');
    const issueReaderUsername = document.getElementById('issueReaderUsername');
    const issueReaderPassword = document.getElementById('issueReaderPassword');
    const issueReaderName = document.getElementById('issueReaderName');
    const issueReaderGender = document.getElementById('issueReaderGender');
    const issueReaderDob = document.getElementById('issueReaderDob');
    const issueReaderCccd = document.getElementById('issueReaderCccd');
    const issueReaderPhone = document.getElementById('issueReaderPhone');
    const issueReaderEmail = document.getElementById('issueReaderEmail');
    const issueReaderAddress = document.getElementById('issueReaderAddress');
    const issueReaderType = document.getElementById('issueReaderType');

    const previewCardId = document.getElementById('previewCardId');
    const previewCardName = document.getElementById('previewCardName');
    const previewCardType = document.getElementById('previewCardType');
    const previewCardExpiry = document.getElementById('previewCardExpiry');
    const issueFeeAmount = document.getElementById('issueFeeAmount');
    const issueFeeText = document.getElementById('issueFeeText');

    function getNextReaderCode() {
      return DataService.generateNextId(DataService.KEYS.READERS, 'BD', 3);
    }

    function numberToVietnameseWords(amount) {
      const n = Number(amount) || 0;
      if (n === 0) return 'Miễn phí (Không đồng)';
      if (n === 50000) return 'Năm mươi nghìn đồng';
      if (n === 30000) return 'Ba mươi nghìn đồng';
      if (n === 100000) return 'Một trăm nghìn đồng';
      return `${(n / 1000).toLocaleString('vi-VN')} nghìn đồng`;
    }

    function syncLiveCardPreview() {
      const rules = getLibraryRules();
      const validityMonths = (rules && rules.cardValidityMonths) ? Number(rules.cardValidityMonths) : 12;
      const defaultFee = (rules && rules.newCardFee !== undefined) ? Number(rules.newCardFee) : 50000;

      const idVal = issueReaderId.value.trim();
      const nameVal = issueReaderName.value.trim();
      const typeVal = issueReaderType.value;

      previewCardId.textContent = idVal || '0000000';
      previewCardName.textContent = nameVal ? nameVal.toUpperCase() : 'NHẬP CHỮ IN HOA CÓ DẤU...';
      previewCardType.textContent = typeVal || 'Đối tượng';

      if (typeVal || nameVal || idVal) {
        previewCardExpiry.textContent = calculateExpiryDateStr(validityMonths);
      } else {
        previewCardExpiry.textContent = 'DD / MM / YYYY';
      }

      if (typeVal === 'Giảng viên') {
        issueFeeAmount.textContent = '0';
        issueFeeText.textContent = 'Miễn phí đối với Giảng viên';
      } else {
        issueFeeAmount.textContent = defaultFee.toLocaleString('en-US');
        issueFeeText.textContent = numberToVietnameseWords(defaultFee);
      }
    }

    function resetIssueCardForm() {
      const nextCode = getNextReaderCode();
      issueReaderId.value = nextCode;
      issueReaderUsername.value = '';
      issueReaderPassword.value = '';
      issueReaderName.value = '';
      issueReaderGender.value = '';
      issueReaderDob.value = '';
      issueReaderCccd.value = '';
      issueReaderPhone.value = '';
      issueReaderEmail.value = '';
      issueReaderAddress.value = '';
      issueReaderType.value = '';
      syncLiveCardPreview();
    }

    [issueReaderId, issueReaderName, issueReaderType].forEach(el => {
      if (el) {
        el.addEventListener('input', syncLiveCardPreview);
        el.addEventListener('change', syncLiveCardPreview);
      }
    });

    document.getElementById('btnCancelIssueCard').addEventListener('click', resetIssueCardForm);

    document.getElementById('btnSubmitIssueCard').addEventListener('click', async event => {
      const readers = getReaders();
      const nameVal = issueReaderName.value.trim();
      const usernameVal = issueReaderUsername.value.trim();
      const passwordVal = issueReaderPassword.value;
      const cccdVal = issueReaderCccd.value.trim();
      const dobVal = issueReaderDob.value.trim();
      const phoneVal = issueReaderPhone.value.trim();
      const emailVal = issueReaderEmail.value.trim();
      const newId = issueReaderId.value.trim() || getNextReaderCode();

      if (!nameVal) {
        showToast('Vui lòng nhập Họ và tên độc giả để cấp thẻ!', 'error');
        issueReaderName.focus();
        return;
      }
      if (!usernameVal || usernameVal.length < 3 || /\s/.test(usernameVal)) {
        showToast('Tên đăng nhập bạn đọc phải từ 3 ký tự trở lên và không chứa khoảng trắng!', 'error');
        issueReaderUsername.focus();
        return;
      }
      if (passwordVal.length < 8) {
        showToast('Mật khẩu phải có ít nhất 8 ký tự!', 'error');
        issueReaderPassword.focus();
        return;
      }
      if (!/^(?:\d{9}|\d{12})$/.test(cccdVal)) {
        showToast('Số CCCD/CMND phải gồm 9 hoặc 12 chữ số!', 'error');
        issueReaderCccd.focus();
        return;
      }
      if (dobVal) {
        const d = parseVNDate(dobVal);
        if (!d || d > new Date()) {
          showToast('Ngày sinh không hợp lệ!', 'error');
          issueReaderDob.focus();
          return;
        }
      }
      const pDigits = phoneVal.replace(/[\s.-]/g, '');
      if (!/^\d{10,11}$/.test(pDigits)) {
        showToast('Số điện thoại phải gồm 10 hoặc 11 chữ số!', 'error');
        issueReaderPhone.focus();
        return;
      }
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showToast('Vui lòng nhập địa chỉ Email hợp lệ!', 'error');
        issueReaderEmail.focus();
        return;
      }

      if (readers.some(r => String(r.id) === newId)) {
        showToast(`Mã độc giả ${newId} đã tồn tại!`, 'error');
        issueReaderId.focus();
        return;
      }
      if (readers.some(r => String(r.username || '').toLowerCase() === usernameVal.toLowerCase())) {
        showToast(`Tên đăng nhập "${usernameVal}" đã được sử dụng!`, 'error');
        issueReaderUsername.focus();
        return;
      }
      if (readers.some(r => String(r.cccd || '') === cccdVal)) {
        showToast(`Số CCCD "${cccdVal}" đã được đăng ký cho độc giả khác!`, 'error');
        issueReaderCccd.focus();
        return;
      }
      if (readers.some(r => String(r.email || '').toLowerCase() === emailVal.toLowerCase())) {
        showToast(`Email "${emailVal}" đã được đăng ký cho độc giả khác!`, 'error');
        issueReaderEmail.focus();
        return;
      }

      const rules = getLibraryRules();
      const validityMonths = (rules && rules.cardValidityMonths) ? Number(rules.cardValidityMonths) : 12;

      const rType = issueReaderType.value || 'Sinh viên';
      const issueDate = formatTodayDate();
      const expiryDate = calculateExpiryDateStr(validityMonths);

      const newReader = {
        id: newId,
        username: usernameVal,
        password: passwordVal,
        name: nameVal,
        gender: issueReaderGender.value || 'Nam',
        dob: dobVal || null,
        cccd: cccdVal,
        phone: pDigits,
        email: emailVal,
        address: issueReaderAddress.value.trim() || null,
        readerType: rType,
        issueDate,
        expiryDate,
        status: 'HỢP LỆ',
        avatarUrl: ''
      };

      const button = event.currentTarget;
      button.disabled = true;
      try {
        const saved = await DataService.request('POST', '/readers', newReader);
        newReader.id = saved.id;
        await DataService.hydrate(DataService.KEYS.READERS, 'readers');
        addLog('TẠO MỚI', saved.id, `Cấp thẻ cho bạn đọc <strong>${escapeAdminHtml(nameVal)}</strong>`);
      } catch (error) {
        showToast(error.message || 'Không thể mở thẻ thư viện.', 'error');
        return;
      } finally {
        button.disabled = false;
      }

      resetIssueCardForm();
      renderReadersTable();

      const listTabBtn = document.querySelector('.subtab-item[data-tab="tabReadersList"], .sub-tab[data-target="tabReadersList"]');
      if (listTabBtn) listTabBtn.click();

      showToast(`Đã thêm bạn đọc ${newReader.name}!`);
    });

    const readerHistoryTableContent = document.getElementById('readerHistoryTableContent');
    const searchReaderHistoryInput = document.getElementById('searchReaderHistoryInput');
    const filterReaderHistoryStatus = document.getElementById('filterReaderHistoryStatus');

    function getHistoryBadge(status) {
      if (status === 'ĐANG MƯỢN') return `<span class="badge-copy status-badge badge-circ-borrowed">ĐANG MƯỢN</span>`;
      if (status === 'ĐÃ TRẢ') return `<span class="badge-copy status-badge badge-phys-good">ĐÃ TRẢ</span>`;
      return `<span class="badge-copy status-badge badge-phys-torn">QUÁ HẠN</span>`;
    }

    function renderReaderHistoryTable() {
      const history = getReaderHistory();
      const q = (searchReaderHistoryInput.value || '').trim().toLowerCase();
      const st = filterReaderHistoryStatus.value;
      const isFiltered = Boolean(q) || st !== 'all';

      const filtered = history.filter(h => {
        const matchSt = st === 'all' || h.status === st;
        const matchQ = !q ||
          h.loanId.toLowerCase().includes(q) ||
          h.readerId.toLowerCase().includes(q) ||
          h.readerName.toLowerCase().includes(q) ||
          h.bookTitle.toLowerCase().includes(q) ||
          h.copyId.toLowerCase().includes(q);
        return matchSt && matchQ;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / RH_PAGE_SIZE));
      if (rhPage > totalPages) rhPage = totalPages;
      const start = (rhPage - 1) * RH_PAGE_SIZE;
      const paged = filtered.slice(start, start + RH_PAGE_SIZE);

      let html = '';
      if (paged.length === 0) {
        html = `<div class="empty-state-box">${isFiltered ? 'Không tìm thấy dữ liệu phù hợp.' : 'Chưa có lịch sử mượn - trả sách nào được ghi nhận.'}</div>`;
      } else {
        paged.forEach(h => {
          html += `
            <div class="reader-history-row">
              <div style="font-weight: 600; color: var(--primary-navy);">${h.loanId}</div>
              <div>
                <div style="font-weight: 600;">${h.readerName}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Mã thẻ: ${h.readerId}</div>
              </div>
              <div>
                <div style="font-weight: 600;">${h.bookTitle}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Mã cá biệt: ${h.copyId}</div>
              </div>
              <div>${h.borrowDate}</div>
              <div>${h.dueDate}</div>
              <div>${h.returnDate}</div>
              <div>${getHistoryBadge(h.status)}</div>
            </div>
          `;
        });
      }

      readerHistoryTableContent.innerHTML = html;
      renderDynamicPagination('rhPagination', filtered.length, RH_PAGE_SIZE, rhPage, (newPage) => {
        rhPage = newPage;
        renderReaderHistoryTable();
      });
    }

    searchReaderHistoryInput.addEventListener('input', () => {
      rhPage = 1;
      renderReaderHistoryTable();
    });
    filterReaderHistoryStatus.addEventListener('change', () => {
      rhPage = 1;
      renderReaderHistoryTable();
    });

    resetIssueCardForm();
    renderReadersTable();
    renderReaderHistoryTable();
  }
});
// === 4 & 5. PHÂN HỆ QUẢN LÝ LƯU THÔNG & BÁO CÁO THỐNG KÊ ===
document.addEventListener('DOMContentLoaded', function () {
  const esc = typeof window.escapeAdminHtml === 'function'
    ? window.escapeAdminHtml
    : (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const toast = (msg, type = 'success', act = null) => {
    if (typeof window.showToast === 'function') window.showToast(msg, type, act);
  };
  const confirmDialog = async (opts) => {
    if (typeof window.openAdminConfirmModal === 'function') return window.openAdminConfirmModal(opts);
    return window.confirm(opts?.message || 'Xác nhận thao tác?');
  };

  function parseFlexDate(str) {
    const s = String(str || '').trim();
    if (!s || s === '—' || s === '-') return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.slice(0, 10).split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const parts = s.replace(/\s+/g, '').split(/[\/\-]/);
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const dt = new Date(y, m - 1, d);
        if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) return dt;
      }
    }
    return null;
  }

  function formatDMY(date) {
    const d = date instanceof Date ? date : new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function formatYMD(date) {
    const d = date instanceof Date ? date : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function renderSubPagination(containerId, totalItems, pageSize, currentPage, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    let html = `<button type="button" class="pagination-btn ${safePage <= 1 ? 'disabled' : ''}" data-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>&lt;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button type="button" class="pagination-btn ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button type="button" class="pagination-btn ${safePage >= totalPages ? 'disabled' : ''}" data-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>&gt;</button>`;
    container.innerHTML = html;
    container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(p) && p !== safePage) onSelect(p);
      });
    });
  }

  // Tab switcher cho Circulation & Reports (không xung đột trang khác)
  const loanTableBody = document.getElementById('loanTableBody');
  const borrowRequestsTableBody = document.getElementById('borrowRequestsTableBody');
  const violationTableBody = document.getElementById('violationTableBody');
  const renewalsTableBody = document.getElementById('renewalsTableBody');
  const repBookTableBody = document.getElementById('repBookTableBody');
  const isCirculationPage = Boolean(loanTableBody || borrowRequestsTableBody || violationTableBody || renewalsTableBody);
  const isReportsPage = Boolean(repBookTableBody);

  if (isCirculationPage || isReportsPage) {
    const subtabs = document.querySelectorAll('.subtab-item');
    const panels = document.querySelectorAll('.tab-content-panel');
    subtabs.forEach(tab => {
      tab.addEventListener('click', function () {
        const targetId = this.getAttribute('data-tab');
        if (!targetId) return;
        subtabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => {
          p.classList.remove('active');
          if (isReportsPage) p.style.display = 'none';
        });
        this.classList.add('active');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add('active');
          if (isReportsPage) targetPanel.style.display = 'block';
        }
      });
    });
  }

  // === 4. PHÂN HỆ QUẢN LÝ LƯU THÔNG (admin/circulation.html) ===
  if (isCirculationPage) {
    const PAGE_SIZE = 8;
    let loanPage = 1;
    let borrowReqPage = 1;
    let approvingBorrowRequest = false;
    let vioPage = 1;
    let renPage = 1;
    let waitingListCache = [];
    let borrowRequestsCache = null;
    let renewalsCache = null;
    let selectedCopiesForLoan = [];
    let editingLoanId = null;

    const searchLoanInput = document.getElementById('searchLoanInput');
    const filterLoanFrom = document.getElementById('filterLoanFromDate');
    const filterLoanTo = document.getElementById('filterLoanToDate');
    const filterLoanStatus = document.getElementById('filterLoanStatus');
    const searchBorrowReqInput = document.getElementById('searchBorrowReqInput');
    const filterBorrowReqStatus = document.getElementById('filterBorrowReqStatus');

    const searchVioInput = document.getElementById('searchViolationInput');
    const filterVioFrom = document.getElementById('filterViolationFromDate');
    const filterVioTo = document.getElementById('filterViolationToDate');
    const filterVioStatus = document.getElementById('filterViolationStatus');

    const searchRenInput = document.getElementById('searchRenewalInput');
    const filterRenFrom = document.getElementById('filterRenewalFromDate');
    const filterRenTo = document.getElementById('filterRenewalToDate');
    const filterRenStatus = document.getElementById('filterRenewalStatus');


    function getStatusBadgeHtml(status) {
      const s = String(status || '').toUpperCase();
      if (s.includes('ĐÃ TRẢ') || s.includes('DA TRA') || s.includes('HOÀN')) {
        return `<span class="badge status-badge badge-circ-ready" style="background:#DCFCE7; color:#166534; border-color:#86EFAC;">ĐÃ TRẢ</span>`;
      }
      if (s.includes('QUÁ HẠN') || s.includes('QUA HAN') || s.includes('HẾT HẠN')) {
        return `<span class="badge status-badge badge-circ-locked" style="background:#FEE2E2; color:#991B1B; border-color:#FCA5A5;">QUÁ HẠN</span>`;
      }
      return `<span class="badge status-badge badge-circ-borrowed" style="background:#EBF3F9; color:#1D5D86; border-color:#BAE6FD;">ĐANG MƯỢN</span>`;
    }

    function matchDateRange(dateStr, fromVal, toVal) {
      if (!fromVal && !toVal) return true;
      const dt = parseFlexDate(dateStr);
      if (!dt) return false;
      const fDt = fromVal ? parseFlexDate(fromVal) : null;
      const tDt = toVal ? parseFlexDate(toVal) : null;
      if (fDt && dt < fDt) return false;
      if (tDt && dt > tDt) return false;
      return true;
    }

    function renderLoansTable() {
      if (!loanTableBody) return;
      const loans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
      const q = (searchLoanInput?.value || '').trim().toLowerCase();
      const fromV = filterLoanFrom?.value || '';
      const toV = filterLoanTo?.value || '';
      const stV = filterLoanStatus?.value || 'all';

      const filtered = loans.filter(l => {
        const lid = String(l.id || l.loanId || '');
        const rName = String(l.readerName || l.readerId || '');
        const cid = String(l.copyId || l.bookCopyId || l.bookId || '');
        const bTitle = String(l.bookTitle || l.title || '');
        const st = String(l.status || 'Đang mượn');
        const matchQ = !q || [lid, l.readerId || '', rName, cid, bTitle].some(x => String(x).toLowerCase().includes(q));
        const matchSt = stV === 'all' || st.toLowerCase().includes(stV.toLowerCase());
        const matchDt = matchDateRange(l.borrowDate, fromV, toV);
        return matchQ && matchSt && matchDt;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (loanPage > totalPages) loanPage = totalPages;
      const paged = filtered.slice((loanPage - 1) * PAGE_SIZE, loanPage * PAGE_SIZE);

      if (!paged.length) {
        const emptyText = loans.length ? 'Không tìm thấy phiếu mượn phù hợp bộ lọc.' : 'Chưa có dữ liệu phiếu mượn. Nhấn nút [Thêm phiếu +] để tạo mới.';
        loanTableBody.innerHTML = `<tr><td colspan="8" style="padding: 0;"><div class="empty-state-container">${emptyText}</div></td></tr>`;
      } else {
        loanTableBody.innerHTML = paged.map(l => {
          const lid = l.id || l.loanId;
          const isReturned = String(l.status || '').toLowerCase().includes('đã trả') || String(l.status || '').toLowerCase().includes('da tra');
          const actionReturn = !isReturned
            ? `<button type="button" class="btn-action-blue btn-return-loan" data-id="${esc(lid)}" style="padding: 4px 10px; font-size: 11px; height: auto;">Trả sách</button>`
            : `<span style="color:#64748B; font-size:12px;">Đã hoàn</span>`;
          return `
            <tr style="border-bottom: 1px solid var(--border-color); height: 48px;">
              <td style="font-weight: 600; color: var(--primary-navy);">${esc(lid)}</td>
              <td style="font-weight: 500;">${esc(l.readerName || l.readerId || 'Độc giả')}</td>
              <td style="font-weight: 600; color: #0284C7;">${esc(l.copyId || l.bookCopyId || l.bookId || '—')}</td>
              <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(l.bookTitle || l.title || 'Sách mượn')}</td>
              <td>${esc(l.borrowDate || '—')}</td>
              <td>${esc(l.dueDate || '—')}</td>
              <td style="text-align: center;">${getStatusBadgeHtml(l.status)}</td>
              <td style="text-align: center;">
                <div style="display:flex; justify-content:center; gap:6px; align-items:center;">
                  ${actionReturn}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
      renderSubPagination('loanPagination', filtered.length, PAGE_SIZE, loanPage, p => { loanPage = p; renderLoansTable(); });
    }

    function renderViolationsTable() {
      if (!violationTableBody) return;
      const fines = typeof getFines === 'function' ? getFines() : [];
      const q = (searchVioInput?.value || '').trim().toLowerCase();
      const fromV = filterVioFrom?.value || '';
      const toV = filterVioTo?.value || '';
      const stV = filterVioStatus?.value || 'all';

      const filtered = fines.filter(f => {
        const paySt = String(f.paymentStatus || f.status || 'Chưa thanh toán');
        const isPaid = paySt.toLowerCase().includes('đã thanh toán') || paySt.toLowerCase().includes('da thanh toan');
        const matchQ = !q || [f.id, f.loanId, f.readerId, f.violation, f.lyDoPhat].some(x => String(x || '').toLowerCase().includes(q));
        const matchSt = stV === 'all'
          || (stV === 'ĐÃ THANH TOÁN' && isPaid)
          || (stV === 'CHƯA THANH TOÁN' && !isPaid);
        const matchDt = matchDateRange(f.ngayLap || f.date, fromV, toV);
        return matchQ && matchSt && matchDt;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (vioPage > totalPages) vioPage = totalPages;
      const paged = filtered.slice((vioPage - 1) * PAGE_SIZE, vioPage * PAGE_SIZE);

      if (!paged.length) {
        const emptyText = fines.length ? 'Không tìm thấy khoản phạt phù hợp.' : 'Chưa có dữ liệu vi phạm.';
        violationTableBody.innerHTML = `<tr><td colspan="8" style="padding: 0;"><div class="empty-state-container">${emptyText}</div></td></tr>`;
      } else {
        violationTableBody.innerHTML = paged.map(f => {
          const stText = String(f.paymentStatus || f.status || '');
          const isPaid = stText.toLowerCase().includes('đã thanh toán') || stText.toLowerCase().includes('da thanh toan');
          const badge = isPaid
            ? `<span class="badge status-badge badge-reader-valid">Đã thanh toán</span>`
            : `<span class="badge status-badge badge-reader-locked">Chưa thanh toán</span>`;
          const action = !isPaid
            ? `<button type="button" class="btn-action-blue btn-pay-fine" data-id="${esc(f.id)}" style="padding: 4px 10px; font-size: 11px; height: auto;">Thu tiền</button>`
            : `<span style="color:#64748B; font-size:12px;">Đã thu</span>`;
          return `
            <tr style="border-bottom: 1px solid var(--border-color); height: 48px;">
              <td style="font-weight: 600; color: var(--primary-navy);">${esc(f.id)}</td>
              <td>${esc(f.loanId || '—')}</td>
              <td>${esc(f.readerId || '—')}</td>
              <td>${esc(f.ngayLap || f.date || '—')}</td>
              <td>${esc(f.violation || f.lyDoPhat || 'Trễ hạn trả sách')}</td>
              <td style="font-weight: 600; color: #DC2626;">${Number(f.amount || f.soTien || 0).toLocaleString('vi-VN')} đ</td>
              <td style="text-align: center;">${badge}</td>
              <td style="text-align: center;"><div class="fine-row-actions">
                <button type="button" class="btn-action-gray" data-fine-detail="${esc(f.id)}">Chi tiết</button>
                ${action}
              </div></td>
            </tr>
          `;
        }).join('');
      }
      renderSubPagination('violationPagination', filtered.length, PAGE_SIZE, vioPage, p => { vioPage = p; renderViolationsTable(); });
    }

    function getBorrowRequests() {
      if (Array.isArray(borrowRequestsCache)) return borrowRequestsCache;
      try {
        const raw = localStorage.getItem('ixs_library_borrow_requests');
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    async function loadBorrowRequests() {
      if (!borrowRequestsTableBody) return;
      try {
        const res = await DataService.request('GET', '/borrowRequests');
        if (Array.isArray(res)) {
          borrowRequestsCache = res;
          localStorage.setItem('ixs_library_borrow_requests', JSON.stringify(res));
        }
      } catch (_) {}
      renderBorrowRequestsTable();
    }

    function renderBorrowRequestsTable() {
      if (!borrowRequestsTableBody) return;
      const list = getBorrowRequests();
      const q = (searchBorrowReqInput?.value || '').trim().toLowerCase();
      const stV = filterBorrowReqStatus?.value || 'all';
      const readers = getReaders();
      const titles = getBookTitles();
      const copies = getBookCopies();
      const loans = getReaderHistory();
      const fines = getFines();
      const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { maxBorrowBooks: 5 };
      const maxBorrow = Number(rules.maxBorrowBooks) || 5;

      const filtered = list.filter(req => {
        const normSt = String(req.status || 'CHO DUYET').toUpperCase();
        const matchQ = !q || [req.id, req.requestId, req.readerId, req.readerName, req.bookId, req.bookTitle, req.copyId].some(x => String(x || '').toLowerCase().includes(q));
        const matchSt = stV === 'all'
          || (stV === 'CHO DUYET' && (normSt.includes('CHO') || normSt.includes('CHỜ')))
          || (stV === 'DA DUYET' && (normSt.includes('DA DUYET') || normSt.includes('ĐÃ DUYỆT')))
          || (stV === 'TU CHOI' && (normSt.includes('TU CHOI') || normSt.includes('TỪ CHỐI')));
        return matchQ && matchSt;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (borrowReqPage > totalPages) borrowReqPage = totalPages;
      const paged = filtered.slice((borrowReqPage - 1) * PAGE_SIZE, borrowReqPage * PAGE_SIZE);

      if (!paged.length) {
        borrowRequestsTableBody.innerHTML = `<tr><td colspan="7" style="padding: 0;"><div class="empty-state-container">${list.length ? 'Không tìm thấy yêu cầu mượn phù hợp.' : 'Chưa có yêu cầu mượn sách nào từ bạn đọc.'}</div></td></tr>`;
      } else {
        borrowRequestsTableBody.innerHTML = paged.map(req => {
          const rid = req.id || req.requestId;
          const normSt = String(req.status || 'CHO DUYET').toUpperCase();
          const isPending = normSt.includes('CHO') || normSt.includes('CHỜ');
          const reader = readers.find(r => String(r.id) === String(req.readerId));
          const rStatus = String(req.readerStatus || reader?.status || 'ACTIVE');
          const rDebt = Number(req.outstandingFine ?? reader?.outstandingFine ?? 0);
          const hasUnpaidFines = rDebt > 0 || fines.some(f => String(f.readerId) === String(req.readerId) && !String(f.paymentStatus || '').toLowerCase().includes('đã thanh toán'));
          const activeLoansCount = req.activeLoans !== undefined
            ? Number(req.activeLoans)
            : loans.filter(l => String(l.readerId) === String(req.readerId) && !String(l.status || '').toLowerCase().includes('đã trả')).length;
          const cardBlocked = rStatus.toUpperCase().includes('KHÓA') || rStatus.toUpperCase().includes('LOCK') || rStatus.toUpperCase().includes('HẾT HẠN');
          const limitReached = activeLoansCount >= maxBorrow;
          const eligible = !cardBlocked && !hasUnpaidFines && !limitReached;

          const titleObj = titles.find(t => String(t.id) === String(req.bookId));
          const availableCopies = copies.filter(c => {
            if (String(c.bookId || c.bookTitleId) !== String(req.bookId)) return false;
            const st = String(c.circulationStatus || c.status || '').toUpperCase();
            return st.includes('SẴN SÀNG') || st.includes('SAN SANG') || st.includes('GIỮ CHỜ');
          });

          const copySelectHtml = isPending
            ? (availableCopies.length
              ? `<select class="form-select-control borrow-req-copy-select" data-req-id="${esc(rid)}" aria-label="Cuốn sách giao cho yêu cầu ${esc(rid)}">
                  ${availableCopies.map(c => `<option value="${esc(c.id)}" ${String(c.id) === String(req.copyId) ? 'selected' : ''}>${esc(c.id)} (${esc(c.location || 'Kho')})</option>`).join('')}
                 </select>`
              : `<span style="color:#DC2626;font-size:12px;font-weight:600;">Hết bản sao sẵn sàng</span>`)
            : `<span style="font-weight:600;color:var(--primary-navy);">${esc(req.copyId || '—')}</span>`;

          const condSummary = [
            cardBlocked ? `<span style="color:#DC2626;">Thẻ khóa/hết hạn</span>` : `<span style="color:#16A34A;">Thẻ OK</span>`,
            hasUnpaidFines ? `<span style="color:#DC2626;">Nợ phạt</span>` : `<span>Không nợ</span>`,
            `<span>Đang mượn: ${activeLoansCount}/${maxBorrow}</span>`
          ].join(' · ');

          const badge = isPending
            ? `<span class="badge status-badge" style="background: #FEF3C7; color: #D97706; border-color: #FCD34D;">Chờ duyệt</span>`
            : (normSt.includes('DA DUYET') || normSt.includes('ĐÃ DUYỆT')
              ? `<span class="badge status-badge badge-reader-valid">Đã duyệt</span>`
              : `<span class="badge status-badge badge-reader-locked">Từ chối</span>`);

          const actions = isPending ? `
            <div class="borrow-request-actions">
              <button type="button" class="btn-action-blue btn-approve-borrow-req" data-id="${esc(rid)}" ${!eligible || !availableCopies.length ? 'disabled' : ''}>Duyệt &amp; lập phiếu</button>
              <button type="button" class="btn-action-gray btn-reject-borrow-req" data-id="${esc(rid)}">Từ chối</button>
            </div>
          ` : `<span style="color:#64748B;font-size:12px;">${esc(req.requestDate || '—')}</span>`;

          return `
            <tr style="border-bottom: 1px solid var(--border-color); height: 52px;">
              <td style="font-weight: 600; color: var(--primary-navy);">${esc(rid)}</td>
              <td><strong>${esc(req.readerName || reader?.name || req.readerId)}</strong><div style="font-size:11px;color:#64748B;">${esc(req.readerId)}</div></td>
              <td style="font-size: 11.5px; line-height: 1.4;">${condSummary}</td>
              <td><strong>${esc(req.bookTitle || titleObj?.title || req.bookId)}</strong><div style="font-size:11px;color:#64748B;">Mã ĐS: ${esc(req.bookId)}</div></td>
              <td>${copySelectHtml}</td>
              <td style="text-align: center;">${badge}</td>
              <td style="text-align: center;">${actions}</td>
            </tr>
          `;
        }).join('');
      }
      renderSubPagination('borrowReqPagination', filtered.length, PAGE_SIZE, borrowReqPage, p => { borrowReqPage = p; renderBorrowRequestsTable(); });
    }

    function getLocalRenewals() {
      if (Array.isArray(renewalsCache)) return renewalsCache;
      try {
        const raw = localStorage.getItem('ixs_library_renewals');
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    async function loadRenewals() {
      if (!renewalsTableBody) return;
      try {
        const res = await DataService.request('GET', '/renewals');
        if (Array.isArray(res)) {
          renewalsCache = res;
          localStorage.setItem('ixs_library_renewals', JSON.stringify(res));
        }
      } catch (_) {}
      renderRenewalsTable();
    }

    function renderRenewalsTable() {
      if (!renewalsTableBody) return;
      const list = getLocalRenewals();
      const q = (searchRenInput?.value || '').trim().toLowerCase();
      const fromV = filterRenFrom?.value || '';
      const toV = filterRenTo?.value || '';
      const stV = filterRenStatus?.value || 'all';

      const filtered = list.filter(r => {
        const matchQ = !q || [r.id, r.loanId].some(x => String(x || '').toLowerCase().includes(q));
        const normSt = String(r.status || '').toUpperCase();
        const matchSt = stV === 'all'
          || (stV === 'CHO DUYET' && (normSt.includes('CHO') || normSt.includes('CHỜ')))
          || (stV === 'DA DUYET' && (normSt.includes('DA DUYET') || normSt.includes('ĐÃ DUYỆT')))
          || (stV === 'TU CHOI' && (normSt.includes('TU CHOI') || normSt.includes('TỪ CHỐI')));
        const matchDt = matchDateRange(r.requestDate, fromV, toV);
        return matchQ && matchSt && matchDt;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (renPage > totalPages) renPage = totalPages;
      const paged = filtered.slice((renPage - 1) * PAGE_SIZE, renPage * PAGE_SIZE);

      if (!paged.length) {
        renewalsTableBody.innerHTML = `<tr><td colspan="6" style="padding: 0;"><div class="empty-state-container">${list.length ? 'Không có yêu cầu gia hạn phù hợp.' : 'Không có yêu cầu gia hạn nào đang chờ xử lý.'}</div></td></tr>`;
      } else {
        renewalsTableBody.innerHTML = paged.map(r => {
          const isPending = (r.status || '').includes('CHO') || (r.status || '').includes('Chờ');
          const badge = isPending
            ? `<span class="badge status-badge" style="background: #FEF3C7; color: #D97706; border-color: #FCD34D;">Chờ duyệt</span>`
            : ((r.status || '').includes('DA DUYET') || (r.status || '').includes('Đã duyệt')
              ? `<span class="badge status-badge badge-reader-valid">Đã duyệt</span>`
              : `<span class="badge status-badge badge-reader-locked">Từ chối</span>`);
          const actions = isPending ? `
            <div style="display: flex; justify-content: center; gap: 6px;">
              <button type="button" class="btn-action-blue btn-app-ren" data-id="${esc(r.id)}" style="padding: 4px 8px; font-size: 11px; height: auto; background: #16A34A; border: none; border-radius: 4px; color: #fff; cursor: pointer;">Duyệt</button>
              <button type="button" class="btn-action-gray btn-rej-ren" data-id="${esc(r.id)}" style="padding: 4px 8px; font-size: 11px; height: auto; background: #EF4444; border: none; border-radius: 4px; color: #fff; cursor: pointer;">Từ chối</button>
            </div>
          ` : `<span style="color:#64748B; font-size:12px;">${esc(r.status)}</span>`;
          return `
            <tr style="border-bottom: 1px solid var(--border-color); height: 48px;">
              <td style="font-weight: 600; color: var(--primary-navy);">${esc(r.id)}</td>
              <td>${esc(r.loanId)}</td>
              <td>${esc(r.requestDate || '—')}</td>
              <td>${Number(r.days || 7)} ngày</td>
              <td style="text-align: center;">${badge}</td>
              <td style="text-align: center;">${actions}</td>
            </tr>
          `;
        }).join('');
      }
      renderSubPagination('renPagination', filtered.length, PAGE_SIZE, renPage, p => { renPage = p; renderRenewalsTable(); });
    }

    async function loadWaitingList() {
      try {
        const res = await DataService.request('GET', '/waitingList');
        if (Array.isArray(res)) waitingListCache = res;
      } catch (_) {}
    }

    [searchLoanInput, filterLoanFrom, filterLoanTo, filterLoanStatus].forEach(el => {
      el?.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', () => { loanPage = 1; renderLoansTable(); });
    });
    [searchVioInput, filterVioFrom, filterVioTo, filterVioStatus].forEach(el => {
      el?.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', () => { vioPage = 1; renderViolationsTable(); });
    });
    [searchBorrowReqInput, filterBorrowReqStatus].forEach(el => {
      el?.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { borrowReqPage = 1; renderBorrowRequestsTable(); });
    });
    [searchRenInput, filterRenFrom, filterRenTo, filterRenStatus].forEach(el => {
      el?.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', () => { renPage = 1; renderRenewalsTable(); });
    });

    // Modal Thêm phiếu mượn thực tế
    const modalCreateLoan = document.getElementById('modalCreateLoan');
    const btnShowCreateLoan = document.getElementById('btnShowCreateLoan');
    const loanReaderIdInput = document.getElementById('loanReaderIdInput');
    const loanReaderNameInput = document.getElementById('loanReaderNameInput');
    const loanCopyIdInput = document.getElementById('loanCopyIdInput');
    const loanSelectedBooksList = document.getElementById('loanSelectedBooksList');
    const loanBookCountInput = document.getElementById('loanBookCountInput');
    const loanFormError = document.getElementById('loanFormError');

    function setLoanFormErr(msg) {
      if (!loanFormError) return;
      loanFormError.textContent = msg || '';
      loanFormError.style.display = msg ? 'block' : 'none';
    }

    function renderSelectedLoanBooks() {
      if (!loanSelectedBooksList) return;
      if (loanBookCountInput) loanBookCountInput.value = String(selectedCopiesForLoan.length);
      if (!selectedCopiesForLoan.length) {
        loanSelectedBooksList.innerHTML = '<div style="text-align: center; color: #64748B; font-size: 13px; padding: 18px 8px;">Chưa chọn cuốn sách nào. Nhập mã cuốn sách ở trên và bấm (+).</div>';
        return;
      }
      loanSelectedBooksList.innerHTML = selectedCopiesForLoan.map(copy => `
        <div class="loan-book-item" data-copy-id="${esc(copy.id)}">
          <div class="loan-book-info">
            <div style="font-weight: 700; color: var(--primary-navy);">${esc(copy.id)}</div>
            <div>${esc(copy.bookTitle || copy.bookId)}</div>
            <div class="loan-book-stock">Vị trí: ${esc(copy.location || copy.shelfLocation || 'Kho thư viện')}</div>
          </div>
          <button type="button" class="loan-book-remove" data-remove-copy="${esc(copy.id)}" aria-label="Bỏ cuốn ${esc(copy.id)}" style="background:none;border:none;cursor:pointer;font-weight:700;">×</button>
        </div>
      `).join('');
    }

    function openLoanCreateModal() {
      if (!modalCreateLoan) return;
      editingLoanId = null;
      selectedCopiesForLoan = [];
      setLoanFormErr('');
      const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { borrowDays: 14 };
      const borrowDays = Number(rules.borrowDays || rules.maxBorrowDays) || 14;
      const now = new Date();
      const due = new Date(now.getTime() + borrowDays * 86400000);

      const idEl = document.getElementById('loanIdInput');
      if (idEl) idEl.value = DataService.generateNextId(DataService.KEYS.READER_HISTORY, 'PM', 3);
      const dateEl = document.getElementById('loanDateInput');
      if (dateEl) dateEl.value = formatDMY(now);
      const dueEl = document.getElementById('loanDueDateInput');
      if (dueEl) dueEl.value = formatDMY(due);
      const empEl = document.getElementById('loanEmpInput');
      if (empEl) {
        try {
          const s = JSON.parse(localStorage.getItem('ixs_library_session') || '{}');
          empEl.value = s.id || 'NV001';
        } catch (_) {
          empEl.value = 'NV001';
        }
      }
      if (loanReaderIdInput) loanReaderIdInput.value = '';
      if (loanReaderNameInput) loanReaderNameInput.value = '-';
      if (loanCopyIdInput) loanCopyIdInput.value = '';
      const statusWrap = document.getElementById('statusFieldWrapper');
      if (statusWrap) statusWrap.style.display = 'none';
      const titleEl = document.getElementById('loanModalTitle');
      if (titleEl) titleEl.textContent = 'THÊM PHIẾU MƯỢN';

      renderSelectedLoanBooks();
      modalCreateLoan.style.display = 'flex';
      modalCreateLoan.classList.add('active');
      loanReaderIdInput?.focus();
    }

    function closeLoanCreateModal() {
      if (!modalCreateLoan) return;
      modalCreateLoan.style.display = 'none';
      modalCreateLoan.classList.remove('active');
    }

    btnShowCreateLoan?.addEventListener('click', openLoanCreateModal);
    document.getElementById('btnCloseCreateLoan')?.addEventListener('click', closeLoanCreateModal);
    document.getElementById('btnCancelCreateLoan')?.addEventListener('click', closeLoanCreateModal);
    modalCreateLoan?.addEventListener('click', e => {
      if (e.target === modalCreateLoan) closeLoanCreateModal();
    });

    loanReaderIdInput?.addEventListener('input', () => {
      const rid = loanReaderIdInput.value.trim();
      const readers = typeof getReaders === 'function' ? getReaders() : [];
      const reader = readers.find(r => String(r.id).toLowerCase() === rid.toLowerCase());
      if (loanReaderNameInput) {
        loanReaderNameInput.value = reader
          ? `${reader.name} (${reader.status || 'HỢP LỆ'})`
          : (rid ? 'Không tìm thấy độc giả' : '-');
      }
    });

    function addCopyToLoanSelection() {
      setLoanFormErr('');
      const cid = (loanCopyIdInput?.value || '').trim();
      if (!cid) {
        setLoanFormErr('Vui lòng nhập hoặc quét mã cá biệt cuốn sách.');
        return;
      }
      const copies = typeof getBookCopies === 'function' ? getBookCopies() : [];
      const copy = copies.find(c => String(c.id).toLowerCase() === cid.toLowerCase());
      if (!copy) {
        setLoanFormErr(`Không tìm thấy cuốn sách có mã "${cid}" trong kho.`);
        return;
      }
      const st = String(copy.circulationStatus || copy.status || '').toUpperCase();
      if (st.includes('ĐANG MƯỢN') || st.includes('DANG MUON') || st.includes('KHÓA') || st.includes('MẤT')) {
        setLoanFormErr(`Cuốn sách ${copy.id} hiện ở trạng thái "${copy.circulationStatus || copy.status}", không thể cho mượn.`);
        return;
      }
      if (selectedCopiesForLoan.some(c => String(c.id) === String(copy.id))) {
        setLoanFormErr(`Cuốn sách ${copy.id} đã nằm trong danh sách chọn.`);
        return;
      }
      selectedCopiesForLoan.push(copy);
      if (loanCopyIdInput) loanCopyIdInput.value = '';
      renderSelectedLoanBooks();
    }

    document.getElementById('btnAddLoanBook')?.addEventListener('click', addCopyToLoanSelection);
    loanCopyIdInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCopyToLoanSelection();
      }
    });
    loanSelectedBooksList?.addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-copy]');
      if (!btn) return;
      const cid = btn.getAttribute('data-remove-copy');
      selectedCopiesForLoan = selectedCopiesForLoan.filter(c => String(c.id) !== String(cid));
      renderSelectedLoanBooks();
    });

    document.getElementById('btnSubmitLoan')?.addEventListener('click', async () => {
      const btnSubmit = document.getElementById('btnSubmitLoan');
      setLoanFormErr('');
      const readerId = (loanReaderIdInput?.value || '').trim();
      const readers = typeof getReaders === 'function' ? getReaders() : [];
      const reader = readers.find(r => String(r.id).toLowerCase() === readerId.toLowerCase());
      if (!reader) {
        setLoanFormErr('Mã độc giả không tồn tại trong hệ thống.');
        loanReaderIdInput?.focus();
        return;
      }
      const rStatus = String(reader.status || '').toUpperCase();
      if (rStatus.includes('KHÓA') || rStatus.includes('LOCK') || rStatus.includes('HẾT HẠN')) {
        setLoanFormErr(`Thẻ độc giả ${reader.id} đang "${reader.status}", không thể lập phiếu mượn.`);
        return;
      }
      const existingFines = typeof getFines === 'function' ? getFines() : [];
      const hasUnpaidFines = Number(reader.outstandingFine || 0) > 0 || existingFines.some(f => String(f.readerId) === String(reader.id) && !String(f.paymentStatus || '').toLowerCase().includes('đã thanh toán'));
      if (hasUnpaidFines) {
        setLoanFormErr(`Độc giả ${reader.id} đang còn khoản phạt chưa thanh toán. Vui lòng hoàn tất thanh toán trước khi lập phiếu mượn.`);
        return;
      }

      const bDateStr = (document.getElementById('loanDateInput')?.value || '').trim();
      const dDateStr = (document.getElementById('loanDueDateInput')?.value || '').trim();
      const bDt = parseFlexDate(bDateStr);
      const dDt = parseFlexDate(dDateStr);
      if (!bDt || !dDt || dDt < bDt) {
        setLoanFormErr('Ngày lập phiếu hoặc Hạn trả không hợp lệ (Hạn trả phải >= Ngày lập phiếu).');
        return;
      }
      if (!selectedCopiesForLoan.length) {
        setLoanFormErr('Vui lòng thêm ít nhất 1 cuốn sách hợp lệ vào phiếu mượn.');
        return;
      }

      const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { maxBorrowBooks: 5 };
      const maxBooks = Number(rules.maxBorrowBooks) || 5;
      const existingLoans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
      const readerActive = existingLoans.filter(l => String(l.readerId) === String(reader.id) && !String(l.status || '').toLowerCase().includes('đã trả'));
      if (readerActive.length + selectedCopiesForLoan.length > maxBooks) {
        setLoanFormErr(`Độc giả đang mượn ${readerActive.length} cuốn; thêm ${selectedCopiesForLoan.length} cuốn sẽ vượt giới hạn ${maxBooks} cuốn.`);
        return;
      }

      const baseId = (document.getElementById('loanIdInput')?.value || '').trim() || DataService.generateNextId(DataService.KEYS.READER_HISTORY, 'PM', 3);
      const baseMatch = baseId.match(/^PM(\d+)$/);
      const baseNum = baseMatch ? parseInt(baseMatch[1], 10) : null;
      const empId = (document.getElementById('loanEmpInput')?.value || 'NV001').trim();
      const origText = btnSubmit?.textContent || 'XÁC NHẬN';
      if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Đang lưu...'; }

      try {
        const copies = typeof getBookCopies === 'function' ? getBookCopies() : [];
        const titles = typeof getBookTitles === 'function' ? getBookTitles() : [];
        const newLoanEntries = selectedCopiesForLoan.map((copy, idx) => {
          const computedId = idx === 0
            ? baseId
            : (baseNum !== null ? `PM${String(baseNum + idx).padStart(3, '0')}` : DataService.generateNextId(DataService.KEYS.READER_HISTORY, 'PM', 3));
          return {
            id: computedId,
            loanId: computedId,
            readerId: reader.id,
            readerName: reader.name,
            copyId: copy.id,
            bookId: copy.bookId,
            bookTitle: copy.bookTitle || copy.bookId,
            employeeId: empId,
            borrowDate: bDateStr,
            dueDate: dDateStr,
            status: 'Đang mượn'
          };
        });

        for (const entry of newLoanEntries) {
          try {
            await DataService.request('POST', '/loans', {
              id: entry.id,
              readerId: entry.readerId,
              copyId: entry.copyId,
              employeeId: entry.employeeId,
              borrowDate: formatYMD(bDt),
              dueDate: formatYMD(dDt),
              status: 'Đang mượn'
            });
          } catch (err) {
            if (err && err.status !== 0) {
              setLoanFormErr(err.message || 'Không thể lưu phiếu mượn lên máy chủ.');
              return;
            }
          }
          const c = copies.find(item => String(item.id) === String(entry.copyId));
          if (c) { c.circulationStatus = 'ĐANG MƯỢN'; c.status = 'ĐANG MƯỢN'; }
          const t = titles.find(item => String(item.id) === String(entry.bookId));
          if (t && Number(t.available) > 0) t.available = Number(t.available) - 1;
        }

        if (DataService._cache) {
          DataService._cache[DataService.KEYS.READER_HISTORY] = [...newLoanEntries, ...existingLoans];
          DataService._cache[DataService.KEYS.BOOK_COPIES] = copies;
          DataService._cache[DataService.KEYS.BOOK_TITLES] = titles;
        }
        closeLoanCreateModal();
        renderLoansTable();
        toast(`Đã lập ${newLoanEntries.length} phiếu mượn cho độc giả ${reader.name}!`);
      } finally {
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = origText; }
      }
    });

    // Modal Trả sách & Kiểm tra tình trạng vật lý (Seq 2.8.2) + Lập phiếu phạt (Seq 2.9.1)
    const modalReturnBook = document.getElementById('modalReturnBook');
    const modalCreateFine = document.getElementById('modalCreateFine');
    let activeReturningLoanId = null;

    function computeLateDays(dueStr) {
      const dueDt = parseFlexDate(dueStr);
      if (!dueDt) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDt.setHours(0, 0, 0, 0);
      return Math.max(0, Math.floor((today - dueDt) / 86400000));
    }

    function updateReturnEstimate() {
      const loans = getReaderHistory();
      const loan = loans.find(l => String(l.id || l.loanId) === String(activeReturningLoanId));
      const cond = document.getElementById('returnConditionSelect')?.value || 'NGUYEN_VEN';
      const summaryEl = document.getElementById('returnLateSummary');
      if (!loan || !summaryEl) return;
      const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { lateFeePerDay: 5000, damageFee: 30000, lostCompensationPercent: 150 };
      const lateDays = computeLateDays(loan.dueDate);
      const lateFee = lateDays * (Number(rules.lateFeePerDay) || 5000);
      const copies = getBookCopies();
      const copy = copies.find(c => String(c.id) === String(loan.copyId));
      const bookPrice = Number(String(copy?.price || '120000').replace(/[^\d]/g, '')) || 120000;
      let condFee = 0;
      if (cond === 'HU_HONG') condFee = Number(rules.damageFee) || 30000;
      if (cond === 'MAT_SACH') condFee = Math.round(bookPrice * (Number(rules.lostCompensationPercent) || 150) / 100);
      const totalFee = lateFee + condFee;
      if (totalFee > 0) {
        summaryEl.innerHTML = `<strong style="color:#DC2626;">Phát sinh vi phạm:</strong> Quá hạn <strong>${lateDays} ngày</strong>${condFee > 0 ? ` + ${cond === 'MAT_SACH' ? 'Mất sách' : 'Hư hỏng'}` : ''}. Dự kiến lập phiếu phạt: <strong>${totalFee.toLocaleString('vi-VN')} đ</strong>.`;
      } else {
        summaryEl.innerHTML = `<span style="color:#16A34A; font-weight:600;">Trả đúng hạn & nguyên vẹn (${lateDays} ngày trễ).</span>`;
      }
    }

    function openReturnModal(loanId) {
      const loans = getReaderHistory();
      const loan = loans.find(l => String(l.id || l.loanId) === String(loanId));
      if (!loan) return;
      activeReturningLoanId = loanId;
      const lidEl = document.getElementById('returnLoanIdDisplay');
      const cidEl = document.getElementById('returnCopyIdDisplay');
      const condEl = document.getElementById('returnConditionSelect');
      if (lidEl) lidEl.value = loanId;
      if (cidEl) cidEl.value = loan.copyId || loan.bookId || '—';
      if (condEl) condEl.value = 'NGUYEN_VEN';
      updateReturnEstimate();
      if (modalReturnBook) {
        modalReturnBook.style.display = 'flex';
        modalReturnBook.classList.add('active');
      }
    }

    function closeReturnModal() {
      if (!modalReturnBook) return;
      modalReturnBook.style.display = 'none';
      modalReturnBook.classList.remove('active');
    }

    document.getElementById('returnConditionSelect')?.addEventListener('change', updateReturnEstimate);
    document.getElementById('btnCloseReturnBook')?.addEventListener('click', closeReturnModal);
    document.getElementById('btnCancelReturnBook')?.addEventListener('click', closeReturnModal);

    document.getElementById('btnConfirmReturnBook')?.addEventListener('click', async () => {
      if (!activeReturningLoanId) return;
      const loans = getReaderHistory();
      const loan = loans.find(l => String(l.id || l.loanId) === String(activeReturningLoanId));
      if (!loan) return;

      const cond = document.getElementById('returnConditionSelect')?.value || 'NGUYEN_VEN';
      const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { lateFeePerDay: 5000, damageFee: 30000, lostCompensationPercent: 150, maxLateDaysBeforeLock: 30 };
      const empId = getActiveUserSession().id || document.getElementById('loanEmpInput')?.value || 'NV001';

      let apiReturnRes = null;
      let offlineMode = false;
      try {
        apiReturnRes = await DataService.request('POST', `/loans/${encodeURIComponent(activeReturningLoanId)}/return`, {
          physicalCondition: cond,
          employeeId: empId,
          lateFeePerDay: Number(rules.lateFeePerDay) || 5000,
          damageFee: Number(rules.damageFee) || 30000,
          lostCompensationPercent: Number(rules.lostCompensationPercent) || 150,
          maxLateDaysBeforeLock: Number(rules.maxLateDaysBeforeLock) || 30
        });
      } catch (err) {
        if (err && err.status !== 0 && err.status !== 404) {
          toast(err.message || 'Không thể xử lý trả sách.', 'error');
          return;
        }
        offlineMode = true;
      }

      if (!offlineMode && apiReturnRes) {
        await Promise.all([
          DataService.hydrate(DataService.KEYS.READER_HISTORY, 'readerHistory', []).catch(() => {}),
          DataService.hydrate(DataService.KEYS.BOOK_COPIES, 'bookCopies', []).catch(() => {}),
          DataService.hydrate(DataService.KEYS.BOOK_TITLES, 'bookTitles', []).catch(() => {}),
          DataService.hydrate(DataService.KEYS.FINES, 'fines', []).catch(() => {}),
          DataService.hydrate(DataService.KEYS.READERS, 'readers', []).catch(() => {}),
          loadWaitingList()
        ]);
        const fineAmt = Number(apiReturnRes.totalFee || 0);
        if (fineAmt > 0) {
          toast(`Đã trả sách & tự động lập phiếu phạt ${fineAmt.toLocaleString('vi-VN')} đ!`, 'warning');
        } else if (apiReturnRes.promotedWaiterId) {
          toast(`Đã trả sách phiếu ${activeReturningLoanId} & giữ sách cho độc giả chờ #1 (${apiReturnRes.promotedWaiterId})!`, 'success');
        } else {
          toast(`Đã xác nhận trả sách cho phiếu ${activeReturningLoanId}!`, 'success');
        }
        closeReturnModal();
        renderLoansTable();
        renderViolationsTable();
        return;
      }

      const lateDays = computeLateDays(loan.dueDate);
      const lateFee = lateDays * (Number(rules.lateFeePerDay) || 5000);
      const copies = getBookCopies();
      const copy = copies.find(c => String(c.id) === String(loan.copyId));
      const bookPrice = Number(String(copy?.price || '120000').replace(/[^\d]/g, '')) || 120000;
      let condFee = 0;
      if (cond === 'HU_HONG') condFee = Number(rules.damageFee) || 30000;
      if (cond === 'MAT_SACH') condFee = Math.round(bookPrice * (Number(rules.lostCompensationPercent) || 150) / 100);
      const totalFee = lateFee + condFee;

      loan.status = 'Đã trả';
      loan.actualReturnDate = formatDMY(new Date());
      saveReaderHistory(loans);

      // Cập nhật bản sao & ưu tiên danh sách chờ (Seq 2.8.4)
      let promotedWaiter = null;
      if (cond === 'NGUYEN_VEN' || cond === 'SON_GAY') {
        const nextWaiter = (waitingListCache || []).find(w =>
          String(w.bookTitleId || w.bookId) === String(loan.bookId) &&
          String(w.status || '').toUpperCase().includes('DANG')
        );
        if (nextWaiter) {
          nextWaiter.status = 'SAN SANG';
          promotedWaiter = nextWaiter;
            }
      }

      if (copy) {
        if (cond === 'MAT_SACH') {
          copy.physicalStatus = 'MẤT';
          copy.circulationStatus = 'MẤT';
        } else if (cond === 'HU_HONG') {
          copy.physicalStatus = 'HƯ HỎNG';
          copy.circulationStatus = 'HƯ HỎNG';
        } else {
          copy.physicalStatus = cond === 'SON_GAY' ? 'SỜN GÁY SÁCH' : 'TỐT';
          copy.circulationStatus = promotedWaiter ? 'GIỮ CHỜ NGƯỜI CHỜ' : 'SẴN SÀNG';
        }
        copy.status = copy.circulationStatus;
        saveBookCopies(copies);
      }

      if (loan.bookId && (cond === 'NGUYEN_VEN' || cond === 'SON_GAY') && !promotedWaiter) {
        const titles = getBookTitles();
        const title = titles.find(t => String(t.id) === String(loan.bookId));
        if (title) {
          title.available = Math.min(Number(title.total || 30), Number(title.available || 0) + 1);
          saveBookTitles(titles);
        }
      }

      // Tạo phiếu phạt tự động nếu vi phạm (Seq 2.8.2 -> 2.9.1)
      if (totalFee > 0) {
        const fines = getFines();
        const reasons = [];
        if (lateDays > 0) reasons.push(`Trễ hạn ${lateDays} ngày`);
        if (cond === 'HU_HONG') reasons.push('Làm hỏng sách');
        if (cond === 'MAT_SACH') reasons.push('Làm mất sách');
        const newFine = {
          id: `PP-${Date.now().toString().slice(-6)}`,
          loanId: activeReturningLoanId,
          readerId: loan.readerId,
          employeeId: document.getElementById('loanEmpInput')?.value || 'NV001',
          ngayLap: formatDMY(new Date()),
          date: formatDMY(new Date()),
          violation: reasons.join(' + '),
          lyDoPhat: reasons.join(' + '),
          amount: totalFee,
          soTien: totalFee,
          paymentStatus: 'Chưa thanh toán',
          status: 'Chưa thanh toán'
        };
        saveFines([newFine, ...fines]);
        renderViolationsTable();

        // Cập nhật tổng nợ và khóa thẻ nếu quá hạn nặng (State 5.1 / 5.5)
        const readers = getReaders();
        const rd = readers.find(r => String(r.id) === String(loan.readerId));
        if (rd) {
          rd.outstandingFine = Number(rd.outstandingFine || 0) + totalFee;
          if (lateDays >= (Number(rules.maxLateDaysBeforeLock) || 30)) rd.status = 'BỊ KHÓA';
          saveReaders(readers);
        }
        toast(`Đã trả sách & tự động lập phiếu phạt ${totalFee.toLocaleString('vi-VN')} đ (${reasons.join(' + ')})!`, 'warning');
      } else if (promotedWaiter) {
        toast(`Đã trả sách phiếu ${activeReturningLoanId} & giữ sách cho độc giả chờ #1 (${promotedWaiter.readerId})!`, 'success');
      } else {
        toast(`Đã xác nhận trả sách cho phiếu ${activeReturningLoanId}!`, 'success');
      }

      closeReturnModal();
      renderLoansTable();
    });

    // Modal Lập phiếu phạt thủ công (Seq 2.9.1)
    function setFineFormErr(msg) {
      const el = document.getElementById('fineFormError');
      if (!el) return;
      el.textContent = msg || '';
      el.style.display = msg ? 'block' : 'none';
    }

    document.getElementById('btnShowCreateFine')?.addEventListener('click', () => {
      setFineFormErr('');
      const rIn = document.getElementById('fineReaderIdInput');
      const lIn = document.getElementById('fineLoanIdInput');
      const aIn = document.getElementById('fineAmountInput');
      if (rIn) rIn.value = '';
      if (lIn) lIn.value = '';
      if (aIn) aIn.value = '20000';
      if (modalCreateFine) {
        modalCreateFine.style.display = 'flex';
        modalCreateFine.classList.add('active');
        rIn?.focus();
      }
    });
    const closeCreateFine = () => {
      if (!modalCreateFine) return;
      modalCreateFine.style.display = 'none';
      modalCreateFine.classList.remove('active');
    };
    document.getElementById('btnCloseCreateFine')?.addEventListener('click', closeCreateFine);
    document.getElementById('btnCancelCreateFine')?.addEventListener('click', closeCreateFine);
    document.getElementById('btnSubmitFine')?.addEventListener('click', async () => {
      setFineFormErr('');
      const readerId = document.getElementById('fineReaderIdInput')?.value.trim() || '';
      const loanId = document.getElementById('fineLoanIdInput')?.value.trim() || '';
      const reason = document.getElementById('fineTypeSelect')?.value || 'Phạt trả quá hạn';
      const amount = Number(document.getElementById('fineAmountInput')?.value || 0);
      const readers = getReaders();
      const rd = readers.find(r => String(r.id).toLowerCase() === readerId.toLowerCase());
      if (!rd) {
        setFineFormErr('Không tìm thấy mã độc giả trong hệ thống.');
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setFineFormErr('Số tiền phạt phải lớn hơn 0 VNĐ.');
        return;
      }
      const newFine = {
        id: `PP-${Date.now().toString().slice(-6)}`,
        loanId: loanId || null,
        readerId: rd.id,
        employeeId: getActiveUserSession().id || 'NV001',
        ngayLap: formatDMY(new Date()),
        date: formatDMY(new Date()),
        violation: reason,
        lyDoPhat: reason,
        amount,
        soTien: amount,
        paymentStatus: 'Chưa thanh toán',
        status: 'Chưa thanh toán'
      };
      try {
        const saved = await DataService.request('POST', '/fines', newFine);
        newFine.id = saved.id;
        await Promise.all([
          DataService.hydrate(DataService.KEYS.FINES, 'fines'),
          DataService.hydrate(DataService.KEYS.READERS, 'readers')
        ]);
      } catch (error) {
        setFineFormErr(error.message || 'Không thể lập phiếu phạt.');
        return;
      }
      closeCreateFine();
      renderViolationsTable();
      toast(`Đã lập phiếu phạt ${newFine.id} (${amount.toLocaleString('vi-VN')} đ) cho độc giả ${rd.name}!`);
    });

    // Thao tác Trả sách / Thu phạt / Duyệt-Từ chối gia hạn / Hàng chờ
    document.addEventListener('click', async (e) => {
      // 1. Trả sách -> Mở modal chọn tình trạng vật lý (Seq 2.8.2)
      const btnRet = e.target.closest('.btn-return-loan');
      if (btnRet) {
        const id = btnRet.getAttribute('data-id');
        if (modalReturnBook) {
          openReturnModal(id);
        } else {
          activeReturningLoanId = id;
          document.getElementById('btnConfirmReturnBook')?.click();
        }
        return;
      }

      // 2. Thu tiền phạt + Cập nhật tổng nợ + Mở khóa thẻ nếu hết nợ (Seq 2.9.2 & State 5.1/5.5)
      const btnPay = e.target.closest('.btn-pay-fine');
      if (btnPay) {
        const fid = btnPay.getAttribute('data-id');
        const fines = getFines();
        const fine = fines.find(f => String(f.id) === String(fid));
        if (!fine) return;
        const amtNum = Number(fine.amount || fine.soTien || 0);
        const amt = amtNum.toLocaleString('vi-VN');
        const method = window.prompt('Nhập 1 nếu thu tiền mặt, hoặc 2 nếu đã đối soát chuyển khoản.');
        if (method === null) return;
        const paymentMethod = { '1': 'Tiền mặt', '2': 'Chuyển khoản' }[method.trim()];
        if (!paymentMethod) {
          toast('Phương thức thanh toán không hợp lệ.', 'error');
          return;
        }
        const ok = await confirmDialog({
          title: 'Xác nhận thu tiền phạt',
          message: `Xác nhận đã thu ${amt} đ cho phiếu ${fid} qua ${paymentMethod.toLowerCase()}?`,
          confirmText: 'Xác nhận đã thu',
          cancelText: 'Hủy'
        });
        if (!ok) return;
        try {
          await DataService.request('PUT', `/fines/${encodeURIComponent(fid)}`, { paymentMethod });
          await Promise.all([
            DataService.hydrate(DataService.KEYS.FINES, 'fines'),
            DataService.hydrate(DataService.KEYS.READERS, 'readers')
          ]);
        } catch (err) {
          toast(err.message || 'Không thể cập nhật thanh toán phạt.', 'error');
          return;
        }
        renderViolationsTable();
        toast(`Đã xác nhận thu tiền phiếu phạt ${fid} & cập nhật công nợ bạn đọc!`, 'success');
        return;
      }

      // 2b. Duyệt yêu cầu mượn sách & lập phiếu mượn (Seq 2.8.1)
      const btnAppBorrow = e.target.closest('.btn-approve-borrow-req');
      if (btnAppBorrow) {
        if (btnAppBorrow.disabled || approvingBorrowRequest) return;
        const rid = btnAppBorrow.dataset.id;
        const request = getBorrowRequests().find(item => String(item.id || item.requestId) === rid);
        if (!request) return;
        const copySelect = btnAppBorrow.closest('tr')?.querySelector('.borrow-req-copy-select');
        const copyId = copySelect?.value || request.copyId;
        if (!copyId) {
          toast('Chưa có cuốn sách sẵn sàng để lập phiếu mượn.', 'error');
          return;
        }

        approvingBorrowRequest = true;
        btnAppBorrow.disabled = true;
        const originalLabel = btnAppBorrow.textContent;
        try {
          const confirmed = await confirmDialog({
            title: 'Duyệt yêu cầu mượn',
            message: `Giao cuốn ${copyId} cho bạn đọc ${request.readerName || request.readerId} và lập phiếu mượn?`,
            confirmText: 'Duyệt & lập phiếu'
          });
          if (!confirmed) return;
          btnAppBorrow.textContent = 'Đang lập phiếu…';
          const loan = await DataService.request('POST', `/borrowRequests/${encodeURIComponent(rid)}/approve`, { copyId });
          request.status = 'DA DUYET';
          request.copyId = loan.copyId;
          renderBorrowRequestsTable();
          addLog('LẬP PHIẾU MƯỢN', loan.loanId, `Duyệt yêu cầu <strong>${esc(rid)}</strong> và giao cuốn <strong>${esc(loan.copyId)}</strong>`);
          toast(`Đã duyệt ${rid} và lập phiếu mượn ${loan.loanId}.`, 'success');
          await Promise.allSettled([
            DataService.hydrate(DataService.KEYS.READER_HISTORY, 'readerHistory', []),
            DataService.hydrate(DataService.KEYS.BOOK_COPIES, 'bookCopies', []),
            DataService.hydrate(DataService.KEYS.BOOK_TITLES, 'bookTitles', []),
            loadBorrowRequests()
          ]);
          renderLoansTable();
        } catch (error) {
          toast(error.message || 'Không thể duyệt yêu cầu mượn.', 'error');
        } finally {
          approvingBorrowRequest = false;
          btnAppBorrow.disabled = false;
          btnAppBorrow.textContent = originalLabel;
        }
        return;
      }

      // 2c. Từ chối yêu cầu mượn sách
      const btnRejBorrow = e.target.closest('.btn-reject-borrow-req');
      if (btnRejBorrow) {
        const rid = btnRejBorrow.getAttribute('data-id');
        const reason = window.prompt('Nhập lý do từ chối yêu cầu mượn (tối đa 255 ký tự).')?.trim();
        if (reason === undefined) return;
        if (!reason || reason.length > 255) {
          toast('Lý do từ chối phải từ 1 đến 255 ký tự.', 'error');
          return;
        }
        try {
          await DataService.request('POST', `/borrowRequests/${encodeURIComponent(rid)}/reject`, { reason });
        } catch (err) {
          toast(err.message || 'Không thể từ chối yêu cầu mượn.', 'error');
          return;
        }
        const list = getBorrowRequests();
        const reqItem = list.find(r => String(r.id || r.requestId) === String(rid));
        if (reqItem) reqItem.status = 'TU CHOI';
        localStorage.setItem('ixs_library_borrow_requests', JSON.stringify(list));
        toast(`Đã từ chối yêu cầu mượn ${rid}.`, 'info');
        renderBorrowRequestsTable();
        return;
      }

      // 3. Duyệt gia hạn (Seq 2.8.3: Kiểm tra không quá hạn, chưa vượt số lần gia hạn, không có người đặt chờ)
      const btnAppRen = e.target.closest('.btn-app-ren');
      if (btnAppRen) {
        const rid = btnAppRen.getAttribute('data-id');
        const list = getLocalRenewals();
        const item = list.find(r => String(r.id) === String(rid));
        if (!item) return;

        const loans = getReaderHistory();
        const loan = loans.find(l => String(l.id || l.loanId) === String(item.loanId));
        const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { maxRenewals: 2 };
        const maxRenewals = Number(rules.maxRenewals) || 2;

        if (loan) {
          const stLow = String(loan.status || '').toLowerCase();
          if (stLow.includes('đã trả') || stLow.includes('mất')) {
            toast('Phiếu mượn đã kết thúc, không thể duyệt gia hạn!', 'error');
            return;
          }
          const dueDt = parseFlexDate(loan.dueDate);
          const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
          if (stLow.includes('quá hạn') || (dueDt && dueDt < todayMid)) {
            toast('Phiếu mượn đã quá hạn, không đủ điều kiện gia hạn!', 'error');
            return;
          }
          const approvedCnt = list.filter(r => String(r.loanId) === String(item.loanId) && (String(r.status || '').toUpperCase().includes('DA DUYET') || String(r.status || '').toUpperCase().includes('ĐÃ DUYỆT'))).length;
          if (approvedCnt >= maxRenewals) {
            toast(`Phiếu mượn ${item.loanId} đã đạt tối đa ${maxRenewals} lần gia hạn!`, 'error');
            return;
          }
          const copies = getBookCopies();
          const copyObj = copies.find(c => String(c.id) === String(loan.copyId));
          const bookId = loan.bookId || copyObj?.bookId;
          if (bookId && (waitingListCache || []).some(w => String(w.bookTitleId || w.bookId || w.id) === String(bookId) && ['DANG CHO', 'DANG_CHO', 'SAN SANG', 'DA_GIU_SACH'].some(s => String(w.status || '').toUpperCase().includes(s)))) {
            toast('Sách này đang có độc giả trong hàng chờ, không thể duyệt gia hạn!', 'error');
            return;
          }
        }

        const ok = await confirmDialog({
          title: 'Phê duyệt gia hạn',
          message: `Duyệt yêu cầu gia hạn ${rid}? Hạn trả của phiếu mượn ${item.loanId} sẽ được cộng thêm ${Number(item.days || 7)} ngày.`,
          confirmText: 'Duyệt gia hạn',
          cancelText: 'Hủy'
        });
        if (!ok) return;

        try {
          await DataService.request('PUT', `/renewals/${encodeURIComponent(rid)}`, { status: 'DA DUYET', maxRenewals });
        } catch (err) {
          if (err && err.status !== 0 && err.status !== 404) {
            toast(err.message || 'Không thể duyệt yêu cầu gia hạn.', 'error');
            return;
          }
        }

        item.status = 'Đã duyệt';
        localStorage.setItem('ixs_library_renewals', JSON.stringify(list));
        if (loan) {
          loan.renewed = true;
          const d = parseFlexDate(loan.dueDate);
          if (d) {
            d.setDate(d.getDate() + Number(item.days || 7));
            loan.dueDate = formatDMY(d);
          }
          saveReaderHistory(loans);
        }
        toast(`Đã duyệt gia hạn phiếu ${item.loanId}!`, 'success');
        renderRenewalsTable();
        renderLoansTable();
        return;
      }

      // 4. Từ chối gia hạn (giữ nguyên hạn trả)
      const btnRejRen = e.target.closest('.btn-rej-ren');
      if (btnRejRen) {
        const rid = btnRejRen.getAttribute('data-id');
        const ok = await confirmDialog({
          title: 'Từ chối gia hạn',
          message: `Bạn có chắc muốn từ chối yêu cầu gia hạn ${rid}?`,
          confirmText: 'Từ chối',
          cancelText: 'Hủy',
          danger: true
        });
        if (!ok) return;
        try {
          await DataService.request('PUT', `/renewals/${encodeURIComponent(rid)}`, { status: 'TU CHOI' });
        } catch (err) {
          if (err && err.status !== 0 && err.status !== 404) {
            toast(err.message || 'Không thể từ chối yêu cầu gia hạn.', 'error');
            return;
          }
        }
        const list = getLocalRenewals();
        const item = list.find(r => String(r.id) === String(rid));
        if (item) {
          item.status = 'Từ chối';
          localStorage.setItem('ixs_library_renewals', JSON.stringify(list));
          toast(`Đã từ chối yêu cầu gia hạn ${rid}.`, 'info');
          renderRenewalsTable();
        }
        return;
      }

      // 5. Cập nhật trạng thái hàng chờ

    });

    window.addEventListener('ixs:data-loaded', () => {
      renderLoansTable();
      renderBorrowRequestsTable();
      renderViolationsTable();
      renderRenewalsTable();
      loadBorrowRequests();
      loadRenewals();
      loadWaitingList();
    });
    window.addEventListener('ixs:data-changed', () => {
      renderLoansTable();
      renderBorrowRequestsTable();
      renderViolationsTable();
      renderRenewalsTable();
    });

    renderLoansTable();
    renderBorrowRequestsTable();
    renderViolationsTable();
    renderRenewalsTable();
    loadBorrowRequests();
    loadRenewals();
    loadWaitingList();
  }

  // === 5. PHÂN HỆ BÁO CÁO THỐNG KÊ (admin/reports.html) ===
  if (isReportsPage) {
    const dateFromEl = document.getElementById('reportDateFrom');
    const dateToEl = document.getElementById('reportDateTo');
    const btnFilter = document.getElementById('btnFilterReport');
    const btnReset = document.getElementById('btnResetReport');
    const btnExport = document.getElementById('btnExportReport');

    const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EF4444', '#64748B'];

    function setTxt(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    }

    function renderPieAndLegend(pieId, legendId, slices) {
      const pieEl = document.getElementById(pieId);
      const legendEl = document.getElementById(legendId);
      const total = slices.reduce((s, item) => s + item.value, 0);
      if (!total) {
        if (pieEl) pieEl.style.background = 'conic-gradient(#CBD5E1 0deg 360deg)';
        if (legendEl) legendEl.innerHTML = '<span>Chưa có dữ liệu thống kê để vẽ biểu đồ.</span>';
        return;
      }
      let deg = 0;
      const stops = [];
      slices.forEach((sl, idx) => {
        const span = (sl.value / total) * 360;
        const color = PALETTE[idx % PALETTE.length];
        stops.push(`${color} ${deg.toFixed(1)}deg ${(deg + span).toFixed(1)}deg`);
        deg += span;
      });
      if (pieEl) pieEl.style.background = `conic-gradient(${stops.join(', ')})`;
      if (legendEl) {
        legendEl.innerHTML = `<div class="report-legend-list">${slices.map((sl, idx) => `
          <div class="report-legend-item">
            <span><span class="report-legend-dot" style="background:${PALETTE[idx % PALETTE.length]};"></span>${esc(sl.label)}</span>
            <strong>${sl.value} (${Math.round(sl.value / total * 100)}%)</strong>
          </div>
        `).join('')}</div>`;
      }
    }

    function getFilteredLoans() {
      const allLoans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
      const fromDt = dateFromEl?.value ? parseFlexDate(dateFromEl.value) : null;
      const toDt = dateToEl?.value ? parseFlexDate(dateToEl.value) : null;
      if (!fromDt && !toDt) return allLoans;
      return allLoans.filter(l => {
        const dt = parseFlexDate(l.borrowDate);
        if (!dt) return false;
        if (fromDt && dt < fromDt) return false;
        if (toDt && dt > toDt) return false;
        return true;
      });
    }

    function computeAndRenderReports() {
      const titles = typeof getBookTitles === 'function' ? getBookTitles() : [];
      const copies = typeof getBookCopies === 'function' ? getBookCopies() : [];
      const readers = typeof getReaders === 'function' ? getReaders() : [];
      const loans = getFilteredLoans();

      // 1. Tab Sách
      const totalCopies = copies.length || titles.reduce((s, t) => s + Number(t.total || 0), 0);
      const borrowedCount = copies.length
        ? copies.filter(c => String(c.circulationStatus || c.status || '').toUpperCase().includes('MƯỢN')).length
        : loans.filter(l => !String(l.status || '').toLowerCase().includes('đã trả')).length;
      const damagedCount = copies.filter(c => {
        const st = String(c.circulationStatus || c.status || '').toUpperCase();
        const phy = String(c.physicalStatus || '').toUpperCase();
        return st.includes('KHÓA') || st.includes('MẤT') || phy.includes('RÁCH') || phy.includes('HỎNG');
      }).length;
      const availCount = Math.max(0, totalCopies - borrowedCount - damagedCount);

      const loanCountByBook = new Map();
      loans.forEach(l => {
        const key = String(l.bookId || l.bookTitle || '');
        if (key) loanCountByBook.set(key, (loanCountByBook.get(key) || 0) + 1);
      });

      const bookRows = titles.map(t => {
        const tCopies = copies.filter(c => String(c.bookId || c.bookTitleId) === String(t.id));
        const qty = tCopies.length || Number(t.total || 0);
        const curBorrowed = tCopies.length
          ? tCopies.filter(c => String(c.circulationStatus || c.status || '').toUpperCase().includes('MƯỢN')).length
          : Math.max(0, qty - Number(t.available || 0));
        const remain = Math.max(0, qty - curBorrowed);
        const times = (loanCountByBook.get(String(t.id)) || 0) + (loanCountByBook.get(String(t.title)) || 0);
        return { title: t.title, category: t.category || 'Chung', qty, curBorrowed, remain, times };
      }).sort((a, b) => b.times - a.times || b.curBorrowed - a.curBorrowed);

      const topBook = bookRows[0]?.times > 0 ? bookRows[0].title : (bookRows[0]?.title || 'Chưa có dữ liệu');
      setTxt('repBookTotal', totalCopies);
      setTxt('repBookAvail', availCount);
      setTxt('repBookBorrowed', borrowedCount);
      setTxt('repBookDamaged', damagedCount);
      setTxt('repBookTop', topBook);

      const catTotals = new Map();
      bookRows.forEach(r => catTotals.set(r.category, (catTotals.get(r.category) || 0) + r.qty));
      const catSlices = Array.from(catTotals.entries()).slice(0, 5).map(([label, value]) => ({ label, value }));
      renderPieAndLegend('repBookPieChart', 'repBookChartLegend', catSlices);

      if (repBookTableBody) {
        repBookTableBody.innerHTML = bookRows.length
          ? bookRows.map((r, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="font-weight: 600;">${esc(r.title)}</td>
                <td>${esc(r.category)}</td>
                <td style="text-align: center;">${r.qty}</td>
                <td style="text-align: center; color: #1D5D86; font-weight: 600;">${r.curBorrowed}</td>
                <td style="text-align: center; color: #16A34A; font-weight: 600;">${r.remain}</td>
                <td style="text-align: center; font-weight: 700;">${r.times}</td>
              </tr>
            `).join('')
          : '<tr><td colspan="7" class="report-empty-cell">Chưa có dữ liệu sách trong hệ thống.</td></tr>';
      }

      // 2. Tab Độc giả
      const activeReaders = readers.filter(r => !String(r.status || '').toUpperCase().includes('KHÓA') && !String(r.status || '').toUpperCase().includes('HẾT HẠN')).length;
      const lockedReaders = readers.length - activeReaders;
      const readerLoansMap = new Map();
      const readerActiveMap = new Map();
      loans.forEach(l => {
        const rid = String(l.readerId || '');
        if (!rid) return;
        readerLoansMap.set(rid, (readerLoansMap.get(rid) || 0) + 1);
        if (!String(l.status || '').toLowerCase().includes('đã trả')) {
          readerActiveMap.set(rid, (readerActiveMap.get(rid) || 0) + 1);
        }
      });

      const readerRows = readers.map(r => ({
        name: r.name || r.id,
        type: r.readerType || 'Sinh viên',
        totalLoans: readerLoansMap.get(String(r.id)) || 0,
        activeLoans: readerActiveMap.get(String(r.id)) || 0,
        status: r.status || 'HỢP LỆ'
      })).sort((a, b) => b.totalLoans - a.totalLoans);

      const borrowingReaderCount = readerRows.filter(r => r.totalLoans > 0).length;
      const topReader = readerRows[0]?.totalLoans > 0 ? `${readerRows[0].name} (${readerRows[0].totalLoans} lượt)` : 'Chưa phát sinh';
      setTxt('repReaderTotal', readers.length);
      setTxt('repReaderActive', activeReaders);
      setTxt('repReaderLocked', lockedReaders);
      setTxt('repReaderBorrowing', borrowingReaderCount);
      setTxt('repReaderTop', topReader);

      const typeCounts = new Map();
      readers.forEach(r => {
        const tp = r.readerType || 'Sinh viên';
        typeCounts.set(tp, (typeCounts.get(tp) || 0) + 1);
      });
      renderPieAndLegend('repReaderPieChart', 'repReaderChartLegend', Array.from(typeCounts.entries()).map(([label, value]) => ({ label, value })));

      const repReaderBody = document.getElementById('repReaderTableBody');
      if (repReaderBody) {
        repReaderBody.innerHTML = readerRows.length
          ? readerRows.map((r, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="font-weight: 600;">${esc(r.name)}</td>
                <td>${esc(r.type)}</td>
                <td style="text-align: center; font-weight: 700;">${r.totalLoans}</td>
                <td style="text-align: center;">${r.activeLoans}</td>
                <td style="text-align: center;"><span class="badge status-badge ${String(r.status).toUpperCase().includes('KHÓA') ? 'badge-reader-locked' : 'badge-reader-valid'}">${esc(r.status)}</span></td>
              </tr>
            `).join('')
          : '<tr><td colspan="6" class="report-empty-cell">Chưa có dữ liệu độc giả.</td></tr>';
      }

      // 3. Tab Mượn trả
      const returnedCount = loans.filter(l => String(l.status || '').toLowerCase().includes('đã trả')).length;
      const overdueCount = loans.filter(l => String(l.status || '').toLowerCase().includes('quá hạn')).length;
      const stillBorrowingCount = loans.length - returnedCount;
      const onTimeRate = loans.length ? Math.round(((loans.length - overdueCount) / loans.length) * 100) : 100;

      setTxt('repLoanTotal', loans.length);
      setTxt('repLoanBorrowing', Math.max(0, stillBorrowingCount));
      setTxt('repLoanReturned', returnedCount);
      setTxt('repLoanOverdue', overdueCount);
      setTxt('repLoanOnTimeRate', `${onTimeRate}%`);

      renderPieAndLegend('repLoanPieChart', 'repLoanChartLegend', [
        { label: 'Đã trả', value: returnedCount },
        { label: 'Đang mượn', value: Math.max(0, stillBorrowingCount - overdueCount) },
        { label: 'Quá hạn', value: overdueCount }
      ].filter(x => x.value > 0));

      const byMonth = new Map();
      loans.forEach(l => {
        const dt = parseFlexDate(l.borrowDate);
        const key = dt ? `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` : 'Khác';
        if (!byMonth.has(key)) byMonth.set(key, { period: key, total: 0, returned: 0, unreturned: 0, overdue: 0 });
        const bucket = byMonth.get(key);
        bucket.total++;
        const st = String(l.status || '').toLowerCase();
        if (st.includes('đã trả')) bucket.returned++;
        else {
          bucket.unreturned++;
          if (st.includes('quá hạn')) bucket.overdue++;
        }
      });

      const repLoanBody = document.getElementById('repLoanTableBody');
      const monthRows = Array.from(byMonth.values());
      if (repLoanBody) {
        repLoanBody.innerHTML = monthRows.length
          ? monthRows.map((m, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="font-weight: 600;">${esc(m.period)}</td>
                <td style="text-align: center; font-weight: 700;">${m.total}</td>
                <td style="text-align: center; color: #16A34A;">${m.returned}</td>
                <td style="text-align: center; color: #1D5D86;">${m.unreturned}</td>
                <td style="text-align: center; color: #DC2626; font-weight: 600;">${m.overdue}</td>
              </tr>
            `).join('')
          : '<tr><td colspan="6" class="report-empty-cell">Chưa có dữ liệu mượn trả trong khoảng thời gian đã chọn.</td></tr>';
      }
    }

    btnFilter?.addEventListener('click', () => {
      if (dateFromEl?.value && dateToEl?.value && dateFromEl.value > dateToEl.value) {
        toast('Ngày bắt đầu không thể lớn hơn ngày kết thúc!', 'error');
        return;
      }
      computeAndRenderReports();
      toast('Đã cập nhật số liệu thống kê!');
    });

    btnReset?.addEventListener('click', () => {
      if (dateFromEl) dateFromEl.value = '';
      if (dateToEl) dateToEl.value = '';
      computeAndRenderReports();
      toast('Đã đặt lại bộ lọc báo cáo.', 'info');
    });

    btnExport?.addEventListener('click', () => {
      const activePanel = document.querySelector('.tab-content-panel.active') || document.getElementById('tabReportBook');
      const table = activePanel?.querySelector('table');
      if (!table) return;
      const lines = [];
      table.querySelectorAll('tr').forEach(tr => {
        const cols = Array.from(tr.querySelectorAll('th, td')).map(cell => {
          const text = cell.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""');
          return `"${text}"`;
        });
        if (cols.length) lines.push(cols.join(','));
      });
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-${activePanel.id}-${formatYMD(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Đã xuất file báo cáo CSV thành công!', 'success');
    });

    window.addEventListener('ixs:data-loaded', computeAndRenderReports);
    Promise.resolve(DataService.ready).catch(() => {}).then(computeAndRenderReports);
    computeAndRenderReports();
  }
});
