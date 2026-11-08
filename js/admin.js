document.addEventListener('DOMContentLoaded', () => {
  const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const ICON_LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
  const ICON_PRINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;
  const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
  const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const ICON_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

  /**
   * Hiển thị thông báo Toast góc trên bên phải
   */
  function showToast(message, type = 'success') {
    let container = document.getElementById('leafToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'leafToastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.className = `toast-item toast-${type}`;
    item.innerHTML = `<span>${message}</span>`;
    container.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.25s ease';
      setTimeout(() => item.remove(), 260);
    }, 2800);
  }

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
    const existingForBook = copies.filter(c => c.bookId === bookId);
    let maxIdx = 0;
    existingForBook.forEach(c => {
      const parts = String(c.id).split('-');
      const idx = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(idx) && idx > maxIdx) maxIdx = idx;
    });

    const createdIds = [];
    for (let i = 1; i <= qty; i++) {
      const nextNum = String(maxIdx + i).padStart(2, '0');
      const copyId = `${bookId}-${nextNum}`;
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

  function getActiveUserSession() {
    try {
      const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const emps = getEmployees();
    return emps[0] || {
      id: '12026001',
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

  function syncGreetingBanner() {
    const session = getActiveUserSession();
    const greetName = session.fullName || session.name || 'Quản trị viên';
    document.querySelectorAll('.greeting-name, #headerGreetingName').forEach(el => {
      el.textContent = greetName;
    });
    const dropName = document.getElementById('dropdownUserName');
    if (dropName) dropName.textContent = greetName;
    const dropCode = document.getElementById('dropdownUserCode');
    if (dropCode) dropCode.textContent = `Mã NV: ${session.id || '12026001'}`;
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
                  <div class="supplier-code-readonly" id="selfProfileId">12026001</div>
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
        document.getElementById('selfProfileId').textContent = current.id || '12026001';
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
      btnConfirmSelfChangePwd.addEventListener('click', () => {
        const newPwd = document.getElementById('selfNewPwdInput').value.trim();
        if (!newPwd || newPwd.length < 6) {
          showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
          return;
        }
        const current = getActiveUserSession();
        const emps = getEmployees();
        const emp = emps.find(item => item.id === current.id);
        if (emp) {
          emp.password = newPwd;
          saveEmployees(emps);
        }
        addLog('CẬP NHẬT', current.id || '12026001', `Đổi mật khẩu cá nhân cho tài khoản <strong>${current.name || 'Quản trị viên'}</strong>`);
        closeModal('modalChangePasswordGlobal');
        showToast('Đã đổi mật khẩu thành công!');
      });
    }

    const btnUserLogout = document.getElementById('btnUserLogout');
    if (btnUserLogout) {
      btnUserLogout.addEventListener('click', () => {
        const current = getActiveUserSession();
        addLog('ĐĂNG NHẬP', current.id || '12026001', `Nhân viên <strong>${current.name || 'Quản trị viên'}</strong> đã đăng xuất khỏi hệ thống.`);
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
   * 1. PHÂN HỆ QUẢN LÝ HỆ THỐNG (admin/index.html)
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
      if (role === 'THỦ THƯ KHO') return 'badge-kho';
      if (role === 'THỦ THƯ QUẦY') return 'badge-quay';
      return 'badge-nhanvien';
    }

    function renderEmployeeStatus(emp) {
      if (!emp.hasAccount || emp.status === 'Hồ sơ') {
        return `<span class="status-indicator status-badge"><span class="status-dot hoso"></span><span class="status-text hoso">Hồ sơ</span></span>`;
      }
      if (emp.status === 'Khóa') {
        return `<span class="status-indicator status-badge"><span class="status-dot locked"></span><span class="status-text locked">Đã khóa</span></span>`;
      }
      return `<span class="status-indicator status-badge"><span class="status-dot active"></span><span class="status-text active">Active</span></span>`;
    }

    function renderEmployeeActions(emp) {
      if (!emp.hasAccount || emp.status === 'Hồ sơ') {
        return `
          <div class="actions-group">
            <button type="button" class="btn-cap-tk" title="Cấp tài khoản" data-action="grant" data-id="${emp.id}"><span>CẤP</span><span>TK</span></button>
            <span class="action-icon" title="Chỉnh sửa" data-action="edit" data-id="${emp.id}">${ICON_EDIT}</span>
            <span class="action-icon" title="Xóa" data-action="delete" data-id="${emp.id}">${ICON_DELETE}</span>
          </div>
        `;
      }
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
      renderDynamicPagination('empPagination', filtered.length, EMP_PAGE_SIZE, empPage, (newPage) => {
        empPage = newPage;
        renderEmployeeTable();
      });
      populateLogUserDropdown();
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
      cccdSelect.innerHTML = `<option value="${emp.cccd || ''}">${emp.cccd || '079204001234'}</option>`;
      document.getElementById('viewAddress').value = emp.address || '';
      document.getElementById('viewPhone').value = emp.phone || '';
      document.getElementById('viewEmail').value = emp.email ? `${emp.email}@gmail.com` : '';
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
      document.getElementById('editDob').value = emp.dob || '';
      document.getElementById('editEthnicity').value = emp.ethnicity || 'Kinh';
      document.getElementById('editReligion').value = emp.religion || 'Không';
      document.getElementById('editAddress').value = emp.address || '';
      document.getElementById('editPhone').value = emp.phone ? emp.phone.replace(/\./g, '') : '';
      document.getElementById('editEmail').value = emp.email
        ? (emp.email.includes('@') ? emp.email : `${emp.email}@gmail.com`)
        : '';
      document.getElementById('editRole').value = emp.role || 'NHÂN VIÊN';
      const accStatusEl = document.getElementById('editAccountStatus');
      if (accStatusEl) {
        if (!emp.hasAccount || emp.status === 'Hồ sơ') {
          accStatusEl.value = 'Hồ sơ';
        } else if (emp.status === 'Khóa') {
          accStatusEl.value = 'Khóa';
        } else {
          accStatusEl.value = 'Active';
        }
      }
      document.getElementById('editIdLarge').textContent = emp.id;
      empUploadWidget.setState(emp.avatarUrl || '', !createMode);
    }

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
      } else if (action === 'grant') {
        document.getElementById('grantEmployeeCode').textContent = emp.id;
        document.getElementById('grantRoleSelect').value = emp.role || 'NHÂN VIÊN';
        openModal('modalGrantAccount');
      } else if (action === 'delete') {
        document.getElementById('deleteEmployeeCode').textContent = emp.id;
        openModal('modalDeleteEmployee');
      } else if (action === 'lock') {
        document.getElementById('lockEmployeeCode').textContent = `${emp.id} (${emp.name})`;
        openModal('modalLockEmployee');
      }
    });

    document.getElementById('btnAddEmployee').addEventListener('click', () => {
      const nextId = DataService.generateNextId(DataService.KEYS.EMPLOYEES, '12026', 3);
      populateEditModal({
        id: nextId,
        firstName: '',
        lastName: '',
        gender: 'Nam',
        dob: formatTodayDate(),
        ethnicity: 'Kinh',
        religion: 'Không',
        address: '',
        phone: '',
        email: '',
        role: 'NHÂN VIÊN',
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
      document.getElementById('resetAccountCode').textContent = selectedEmpId || '12026001';
      openModal('modalResetPassword');
    });

    document.getElementById('btnEditResetPassword').addEventListener('click', () => {
      closeModal('modalEditEmployee');
      document.getElementById('resetAccountCode').textContent = selectedEmpId || '12026001';
      openModal('modalResetPassword');
    });

    document.getElementById('btnSaveEmployeeInfo').addEventListener('click', () => {
      const employees = getEmployees();
      const fName = document.getElementById('editFirstName').value.trim();
      const lName = document.getElementById('editLastName').value.trim();
      const fullName = `${fName} ${lName}`.trim();

      if (!fullName) {
        showToast('Vui lòng nhập đầy đủ Họ đệm và Tên nhân viên!', 'error');
        return;
      }

      const rawPhone = document.getElementById('editPhone').value.trim();
      const formattedPhone = rawPhone.length === 10
        ? `${rawPhone.slice(0, 4)}.${rawPhone.slice(4, 7)}.${rawPhone.slice(7)}`
        : rawPhone;
      const rawEmail = document.getElementById('editEmail').value.trim().split('@')[0];
      const newRole = document.getElementById('editRole').value;
      const accStatusEl = document.getElementById('editAccountStatus');
      const selectedAccStatus = accStatusEl ? accStatusEl.value : 'Active';
      const hasAccountFlag = selectedAccStatus !== 'Hồ sơ';
      const avatarVal = empUploadWidget.getValue();

      if (isCreatingEmp) {
        employees.push({
          id: selectedEmpId,
          name: fullName,
          firstName: fName,
          lastName: lName,
          gender: document.getElementById('editGender').value,
          dob: document.getElementById('editDob').value.trim() || formatTodayDate(),
          ethnicity: document.getElementById('editEthnicity').value,
          religion: document.getElementById('editReligion').value,
          address: document.getElementById('editAddress').value.trim(),
          phone: formattedPhone,
          email: rawEmail,
          role: newRole,
          status: selectedAccStatus,
          hasAccount: hasAccountFlag,
          avatarUrl: avatarVal
        });
        saveEmployees(employees);
        addLog('TẠO MỚI', selectedEmpId, `Tạo mới hồ sơ nhân viên <strong>${fullName}</strong> (${selectedEmpId}) - Trạng thái: ${selectedAccStatus}`);
        showToast(`Đã thêm nhân viên ${fullName} (${selectedEmpId})!`);
      } else {
        const emp = employees.find(item => item.id === selectedEmpId);
        if (emp) {
          emp.firstName = fName;
          emp.lastName = lName;
          emp.name = fullName;
          emp.gender = document.getElementById('editGender').value;
          emp.dob = document.getElementById('editDob').value.trim();
          emp.ethnicity = document.getElementById('editEthnicity').value;
          emp.religion = document.getElementById('editReligion').value;
          emp.address = document.getElementById('editAddress').value.trim();
          emp.phone = formattedPhone;
          emp.email = rawEmail;
          emp.role = newRole;
          emp.status = selectedAccStatus;
          emp.hasAccount = hasAccountFlag;
          emp.avatarUrl = avatarVal;
          saveEmployees(employees);
          addLog('CẬP NHẬT', emp.id, `Cập nhật hồ sơ nhân viên <strong>${emp.name}</strong> - Nhóm quyền: ${newRole}`);
          showToast(`Đã lưu thông tin nhân viên ${emp.name}!`);
        }
      }

      closeModal('modalEditEmployee');
      renderEmployeeTable();
      renderAuditLogs();
    });

    document.getElementById('btnConfirmResetPassword').addEventListener('click', () => {
      if (selectedEmpId) {
        addLog('RESET MẬT KHẨU', selectedEmpId, `Reset mật khẩu tài khoản <strong>${selectedEmpId}</strong> và gửi qua Gmail.`);
        renderAuditLogs();
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
          emp.status = emp.status === 'Active' ? 'Khóa' : 'Active';
          saveEmployees(employees);
          addLog(
            'KHÓA TÀI KHOẢN',
            emp.id,
            `${emp.status === 'Khóa' ? 'Khóa' : 'Mở khóa'} tài khoản nhân viên <strong>${emp.name}</strong>`
          );
          renderEmployeeTable();
          renderAuditLogs();
          showToast(`Đã ${emp.status === 'Khóa' ? 'khóa' : 'mở khóa'} tài khoản ${emp.name}!`);
        }
        closeModal('modalLockEmployee');
      });
    }

    document.getElementById('btnConfirmDeleteEmployee').addEventListener('click', () => {
      let employees = getEmployees();
      const target = employees.find(item => item.id === selectedEmpId);
      if (target) {
        employees = employees.filter(item => item.id !== selectedEmpId);
        saveEmployees(employees);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa nhân viên <strong>${target.name}</strong> (Trạng thái 0: Đã nghỉ việc)`);
        renderEmployeeTable();
        renderAuditLogs();
        showToast(`Đã xóa nhân viên ${target.name} khỏi danh sách!`);
      }
      closeModal('modalDeleteEmployee');
    });

    document.getElementById('btnConfirmGrantAccount').addEventListener('click', () => {
      const employees = getEmployees();
      const emp = employees.find(item => item.id === selectedEmpId);
      const selectedRole = document.getElementById('grantRoleSelect').value;
      if (emp) {
        emp.hasAccount = true;
        emp.status = 'Active';
        emp.role = selectedRole;
        if (!emp.email) {
          emp.email = emp.id.toLowerCase();
        }
        saveEmployees(employees);
        addLog('CẤP TÀI KHOẢN', emp.id, `Cấp tài khoản cho nhân viên <strong>${emp.name}</strong> với nhóm quyền ${selectedRole}`);
        renderEmployeeTable();
        renderAuditLogs();
        showToast(`Đã cấp tài khoản thành công cho ${emp.name}!`);
      }
      closeModal('modalGrantAccount');
    });

    function renderPermissionMatrix() {
      const role = permRoleSelect.value;
      const perms = getPermissions();
      const roleData = perms[role] || [];

      let html = '';
      roleData.forEach((group, gIdx) => {
        html += `<div class="perm-table-row" style="background-color: #F8FAFC;"><div class="perm-module-name" style="grid-column: 1 / -1; color: var(--primary-navy);">${group.group}</div></div>`;
        group.items.forEach((item, iIdx) => {
          html += `
            <div class="perm-table-row">
              <div>${item.name}</div>
              <div><input type="checkbox" class="perm-checkbox" data-g="${gIdx}" data-i="${iIdx}" data-k="view" ${item.view ? 'checked' : ''}></div>
              <div><input type="checkbox" class="perm-checkbox" data-g="${gIdx}" data-i="${iIdx}" data-k="add" ${item.add ? 'checked' : ''}></div>
              <div><input type="checkbox" class="perm-checkbox" data-g="${gIdx}" data-i="${iIdx}" data-k="edit" ${item.edit ? 'checked' : ''}></div>
              <div><input type="checkbox" class="perm-checkbox" data-g="${gIdx}" data-i="${iIdx}" data-k="del" ${item.del ? 'checked' : ''}></div>
            </div>
          `;
        });
      });

      permTableContent.innerHTML = html;
    }

    permRoleSelect.addEventListener('change', renderPermissionMatrix);

    document.getElementById('btnSavePerm').addEventListener('click', () => {
      const role = permRoleSelect.value;
      const perms = getPermissions();
      const roleData = perms[role];
      if (!roleData) return;

      const checkboxes = permTableContent.querySelectorAll('.perm-checkbox');
      checkboxes.forEach(cb => {
        const g = parseInt(cb.getAttribute('data-g'), 10);
        const i = parseInt(cb.getAttribute('data-i'), 10);
        const k = cb.getAttribute('data-k');
        roleData[g].items[i][k] = cb.checked;
      });

      savePermissions(perms);
      addLog('CẬP NHẬT', 'PHAN-QUYEN', `Lưu cấu hình ma trận phân quyền cho nhóm <strong>${role}</strong>`);
      renderAuditLogs();
      showToast(`Đã lưu cấu hình phân quyền cho nhóm ${role}!`);
    });

    const rulesStatusInfo = document.getElementById('rulesStatusInfo');
    const rulesFeedbackBadge = document.getElementById('rulesFeedbackBadge');
    const btnSaveRules = document.getElementById('btnSaveRules');
    const btnRestoreDefaultRules = document.getElementById('btnRestoreDefaultRules');

    function showRulesFeedback(msg, isError = false) {
      if (!rulesFeedbackBadge) return;
      rulesFeedbackBadge.textContent = msg;
      rulesFeedbackBadge.classList.toggle('error', isError);
      rulesFeedbackBadge.classList.add('visible');
      setTimeout(() => {
        rulesFeedbackBadge.classList.remove('visible');
      }, 3200);
    }

    function renderRulesForm() {
      const rules = getLibraryRules();
      document.getElementById('ruleMaxBorrowBooks').value = rules.maxBorrowBooks;
      document.getElementById('ruleMaxBorrowDays').value = rules.maxBorrowDays;
      document.getElementById('ruleMaxRenewals').value = rules.maxRenewals;
      document.getElementById('ruleRenewalDays').value = rules.renewalDays;
      document.getElementById('ruleNewCardFee').value = rules.newCardFee;
      document.getElementById('ruleRenewCardFee').value = rules.renewCardFee;
      document.getElementById('ruleCardValidityMonths').value = rules.cardValidityMonths;
      document.getElementById('ruleHoldBookHours').value = rules.holdBookHours;
      document.getElementById('ruleLateFeePerDay').value = rules.lateFeePerDay;
      document.getElementById('ruleDamageFee').value = rules.damageFee;
      document.getElementById('ruleLostCompensationPercent').value = rules.lostCompensationPercent;
      document.getElementById('ruleMaxLateDaysBeforeLock').value = rules.maxLateDaysBeforeLock;
      document.getElementById('ruleMinCopiesInStock').value = rules.minCopiesInStock;
      document.getElementById('ruleAutoLockTornBooks').value = rules.autoLockTornBooks;
      document.getElementById('ruleAllowBookPurchaseRequest').value = rules.allowBookPurchaseRequest;
      document.getElementById('ruleAllowOnlineRenewal').value = rules.allowOnlineRenewal;

      if (rulesStatusInfo) {
        rulesStatusInfo.textContent = `Cập nhật lần cuối: ${rules.updatedAt || '21 / 02 / 2026'} bởi ${rules.updatedBy || 'Quản trị viên'}`;
      }
    }

    if (btnSaveRules) {
      btnSaveRules.addEventListener('click', () => {
        const numericIds = [
          'ruleMaxBorrowBooks', 'ruleMaxBorrowDays', 'ruleMaxRenewals', 'ruleRenewalDays',
          'ruleNewCardFee', 'ruleRenewCardFee', 'ruleCardValidityMonths', 'ruleHoldBookHours',
          'ruleLateFeePerDay', 'ruleDamageFee', 'ruleLostCompensationPercent',
          'ruleMaxLateDaysBeforeLock', 'ruleMinCopiesInStock'
        ];

        for (const id of numericIds) {
          const el = document.getElementById(id);
          const val = Number(el.value);
          if (el.value.trim() === '' || isNaN(val) || val < 0) {
            showRulesFeedback('Lỗi: Các thông số quy định phải là số lớn hơn hoặc bằng 0!', true);
            showToast('Thông số quy định không hợp lệ!', 'error');
            el.focus();
            return;
          }
        }

        const todayStr = formatTodayDate();
        const session = getActiveUserSession();
        const newRules = {
          maxBorrowBooks: Number(document.getElementById('ruleMaxBorrowBooks').value),
          maxBorrowDays: Number(document.getElementById('ruleMaxBorrowDays').value),
          maxRenewals: Number(document.getElementById('ruleMaxRenewals').value),
          renewalDays: Number(document.getElementById('ruleRenewalDays').value),
          newCardFee: Number(document.getElementById('ruleNewCardFee').value),
          renewCardFee: Number(document.getElementById('ruleRenewCardFee').value),
          cardValidityMonths: Number(document.getElementById('ruleCardValidityMonths').value),
          holdBookHours: Number(document.getElementById('ruleHoldBookHours').value),
          lateFeePerDay: Number(document.getElementById('ruleLateFeePerDay').value),
          damageFee: Number(document.getElementById('ruleDamageFee').value),
          lostCompensationPercent: Number(document.getElementById('ruleLostCompensationPercent').value),
          maxLateDaysBeforeLock: Number(document.getElementById('ruleMaxLateDaysBeforeLock').value),
          minCopiesInStock: Number(document.getElementById('ruleMinCopiesInStock').value),
          autoLockTornBooks: document.getElementById('ruleAutoLockTornBooks').value,
          allowBookPurchaseRequest: document.getElementById('ruleAllowBookPurchaseRequest').value,
          allowOnlineRenewal: document.getElementById('ruleAllowOnlineRenewal').value,
          updatedAt: todayStr,
          updatedBy: session.name || 'Quản trị viên'
        };

        saveLibraryRules(newRules);
        renderRulesForm();
        showRulesFeedback('Đã lưu thiết lập quy định thành công!');
        showToast('Đã lưu thiết lập quy định hệ thống!');
        addLog('CẬP NHẬT', 'QUY-DINH', 'Cập nhật thông số Thiết lập quy định hệ thống thư viện LEAF LIBRARY');
        renderAuditLogs();
      });
    }

    if (btnRestoreDefaultRules) {
      btnRestoreDefaultRules.addEventListener('click', () => {
        const defaults = resetLibraryRulesToDefault();
        defaults.updatedAt = formatTodayDate();
        saveLibraryRules(defaults);
        renderRulesForm();
        showRulesFeedback('Đã khôi phục thông số mặc định!');
        showToast('Đã khôi phục quy định mặc định!');
        addLog('CẬP NHẬT', 'QUY-DINH', 'Khôi phục thông số mặc định cho Thiết lập quy định thư viện');
        renderAuditLogs();
      });
    }

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

    renderEmployeeTable();
    renderPermissionMatrix();
    renderRulesForm();
    renderAuditLogs();
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
    let selectedPublisherId = null;

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
      const copies = getBookCopies();
      const q = (searchBookTitleInput.value || '').trim().toLowerCase();
      const cat = filterBookCategory.value;
      const isFiltered = Boolean(q) || cat !== 'all';

      const filtered = books.filter(b => {
        const matchCat = cat === 'all' || b.category === cat;
        const matchQ = !q ||
          b.id.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          b.authors.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q);
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
          const bookCopies = copies.filter(c => c.bookId === b.id);
          const totalCount = bookCopies.length > 0 ? bookCopies.length : (b.total || 0);
          const borrowedCount = bookCopies.length > 0
            ? bookCopies.filter(c => c.circulationStatus === 'ĐANG MƯỢN').length
            : Math.max(0, (b.total || 0) - (b.available || 0));
          const availCount = bookCopies.length > 0
            ? bookCopies.filter(c => c.circulationStatus === 'SẴN SÀNG').length
            : (b.available || 0);

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
                    <div class="book-meta-label">Mã ISBN-10, ISBN-13</div>
                    <div class="book-meta-value">${b.isbn}</div>
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
                  <div>
                    <div class="book-meta-label">Tổng tồn kho (${borrowedCount} cuốn đang mượn)</div>
                    <div class="book-stock-value">${availCount} / ${totalCount}</div>
                  </div>
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
      document.getElementById('modalBookTitleHeader').textContent = createMode
        ? 'LEAF LIBRARY - THÊM ĐẦU SÁCH MỚI'
        : 'LEAF LIBRARY - THÔNG TIN ĐẦU SÁCH';
      document.getElementById('btCodeDisplay').textContent = book.id;
      document.getElementById('btIsbnDisplay').textContent = book.isbn13 || '978-3031390159';
      document.getElementById('btTitle').value = book.title || '';
      document.getElementById('btCategory').value = book.category || 'Công nghệ thông tin';
      document.getElementById('btEdition').value = book.edition || '1';
      document.getElementById('btPrice').value = book.price || '120.000';
      document.getElementById('btQuantity').value = book.total !== undefined ? book.total : 5;
      document.getElementById('btPubName').value = book.publisher || '';
      document.getElementById('btPubCode').value = book.publisherCode || 'NXB260001';
      document.getElementById('btPubPhone').value = book.pubPhone || '';
      document.getElementById('btPubEmail').value = book.pubEmail || '';
      document.getElementById('btPubAddress').value = book.pubAddress || '';
      document.getElementById('btAuthorName').value = book.authors || '';
      document.getElementById('btAuthorCode').value = book.authorCode || 'TG2026001';
      document.getElementById('btAuthorBirth').value = book.publishYear || '2026';
      document.getElementById('btAuthorDeath').value = book.authorDeath || '';
      document.getElementById('btAuthorNationality').value = book.nationality || 'Việt Nam';
      document.getElementById('btAuthorPenName').value = book.penName || '';
      document.getElementById('btAuthorBio').value = book.bio || '';
      btUploadWidget.setState(book.coverUrl || '', !createMode);
      openModal('modalBookTitle');
    }

    document.getElementById('btnAddBookTitle').addEventListener('click', () => {
      const nextId = DataService.generateNextId(DataService.KEYS.BOOK_TITLES, 'DSIT', 4);
      openBookTitleModal({
        id: nextId,
        isbn: '3031390156, 978-3031390159',
        isbn13: '978-3031390159',
        title: '',
        authors: '',
        publisher: '',
        publisherCode: 'NXB260001',
        category: 'Công nghệ thông tin',
        edition: '1',
        price: '120.000',
        total: 5,
        available: 5,
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

    document.getElementById('btnSaveBookTitle').addEventListener('click', () => {
      const books = getBookTitles();
      const titleVal = document.getElementById('btTitle').value.trim();
      if (!titleVal) {
        showToast('Vui lòng nhập Tên đầu sách!', 'error');
        return;
      }
      const authorVal = document.getElementById('btAuthorName').value.trim() || 'Nhiều tác giả';
      const pubVal = document.getElementById('btPubName').value.trim() || 'NXB Tổng hợp';
      const catVal = document.getElementById('btCategory').value;
      const qtyVal = Math.max(0, parseInt(document.getElementById('btQuantity').value, 10) || 0);
      const priceVal = document.getElementById('btPrice').value.trim() || '120.000';
      const coverVal = btUploadWidget.getValue();

      if (isCreatingBookTitle) {
        books.unshift({
          id: selectedBookTitleId,
          isbn: '3031390156, 978-3031390159',
          isbn13: '978-3031390159',
          title: titleVal.toUpperCase(),
          authors: authorVal,
          publisher: pubVal,
          publisherCode: document.getElementById('btPubCode').value.trim(),
          pubPhone: document.getElementById('btPubPhone').value.trim(),
          pubEmail: document.getElementById('btPubEmail').value.trim(),
          pubAddress: document.getElementById('btPubAddress').value.trim(),
          category: catVal,
          edition: document.getElementById('btEdition').value.trim() || '1',
          price: priceVal,
          total: qtyVal,
          available: qtyVal,
          authorCode: document.getElementById('btAuthorCode').value.trim(),
          publishYear: document.getElementById('btAuthorBirth').value.trim(),
          nationality: document.getElementById('btAuthorNationality').value,
          penName: document.getElementById('btAuthorPenName').value.trim(),
          bio: document.getElementById('btAuthorBio').value.trim(),
          coverUrl: coverVal
        });
        saveBookTitles(books);

        if (qtyVal > 0) {
          autoGenerateCopiesForBook(selectedBookTitleId, titleVal.toUpperCase(), qtyVal, priceVal, coverVal);
          syncBookCountsWithCopies(selectedBookTitleId);
        }

        addLog('TẠO MỚI', selectedBookTitleId, `Thêm đầu sách mới <strong>${titleVal.toUpperCase()}</strong> (${qtyVal} bản sao) vào kho sách`);
        showToast(`Đã thêm đầu sách ${titleVal.toUpperCase()} (${qtyVal} bản sao)!`);
      } else {
        const b = books.find(item => item.id === selectedBookTitleId);
        if (b) {
          b.title = titleVal.toUpperCase();
          b.authors = authorVal;
          b.publisher = pubVal;
          b.publisherCode = document.getElementById('btPubCode').value.trim();
          b.pubPhone = document.getElementById('btPubPhone').value.trim();
          b.pubEmail = document.getElementById('btPubEmail').value.trim();
          b.pubAddress = document.getElementById('btPubAddress').value.trim();
          b.category = catVal;
          b.edition = document.getElementById('btEdition').value.trim();
          b.price = priceVal;
          b.total = qtyVal;
          b.authorCode = document.getElementById('btAuthorCode').value.trim();
          b.publishYear = document.getElementById('btAuthorBirth').value.trim();
          b.nationality = document.getElementById('btAuthorNationality').value;
          b.penName = document.getElementById('btAuthorPenName').value.trim();
          b.bio = document.getElementById('btAuthorBio').value.trim();
          b.coverUrl = coverVal;
          saveBookTitles(books);

          const copies = getBookCopies();
          const currentCopies = copies.filter(c => c.bookId === b.id);
          if (qtyVal > currentCopies.length) {
            autoGenerateCopiesForBook(b.id, b.title, qtyVal - currentCopies.length, b.price, b.coverUrl);
          }
          syncBookCountsWithCopies(b.id);

          addLog('CẬP NHẬT', b.id, `Cập nhật thông tin đầu sách <strong>${b.title}</strong>`);
          showToast(`Đã cập nhật đầu sách ${b.title}!`);
        }
      }

      closeModal('modalBookTitle');
      renderBookTitlesGrid();
      renderBookCopiesTable();
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
        if (val.includes('RÁCH NÁT')) {
          const rules = getLibraryRules();
          if (!rules || rules.autoLockTornBooks === 'Bật') {
            bcCirculationInput.value = 'KHÓA';
            showToast('Theo quy định hệ thống: Sách "Rách nát" tự động chuyển sang trạng thái KHÓA lưu thông!', 'warning');
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
      if (status === 'SẴN SÀNG') return `<span class="badge-copy status-badge badge-circ-ready">SẴN SÀNG</span>`;
      if (status === 'KHÓA') return `<span class="badge-copy status-badge badge-circ-locked">KHÓA</span>`;
      return `<span class="badge-copy status-badge badge-circ-borrowed">${status}</span>`;
    }

    function renderBookCopiesTable() {
      const copies = getBookCopies();
      const q = (searchBookCopyInput.value || '').trim().toLowerCase();
      const loc = filterShelfLocation.value;
      const phy = filterPhysicalStatus.value;
      const isFiltered = Boolean(q) || loc !== 'all' || phy !== 'all';

      const filtered = copies.filter(c => {
        const matchLoc = loc === 'all' || c.location === loc;
        const matchPhy = phy === 'all' || c.physicalStatus === phy;
        const matchQ = !q ||
          c.id.toLowerCase().includes(q) ||
          (c.bookId && c.bookId.toLowerCase().includes(q)) ||
          c.bookTitle.toLowerCase().includes(q);
        return matchLoc && matchPhy && matchQ;
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
            <div class="copies-table-row" data-id="${c.id}">
              <div style="font-weight: 600;">${c.id}</div>
              <div style="font-weight: 500;">${c.bookTitle}</div>
              <div>${c.location}</div>
              <div>${getPhysicalBadge(c.physicalStatus)}</div>
              <div>${getCirculationBadge(c.circulationStatus)}</div>
              <div>
                <div class="actions-group">
                  <span class="action-icon" title="Chỉnh sửa cuốn sách" data-action="edit-copy" data-id="${c.id}">${ICON_EDIT}</span>
                  <span class="action-icon" title="Xóa cuốn sách" data-action="delete-copy" data-id="${c.id}">${ICON_DELETE}</span>
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
      const firstBook = books[0] || { id: 'DSIT0001', title: 'MANAGING INFORMATION TECHNOLOGY', price: '120.000', coverUrl: '' };
      const copies = getBookCopies().filter(c => c.bookId === firstBook.id);
      const nextNum = String(copies.length + 1).padStart(2, '0');
      selectedBookCopyId = `${firstBook.id}-${nextNum}`;

      document.getElementById('modalBookCopyHeader').textContent = 'LEAF LIBRARY - THÊM CUỐN SÁCH MỚI';
      const codeDisp = document.getElementById('bcCodeDisplay');
      if (codeDisp) codeDisp.textContent = selectedBookCopyId;
      document.getElementById('bcIdInput').value = selectedBookCopyId;
      document.getElementById('bcTitleInput').value = firstBook.title;
      document.getElementById('bcLocationInput').value = 'A1 - Ngăn 1';
      document.getElementById('bcPriceInput').value = firstBook.price || '120.000';
      document.getElementById('bcPhysicalInput').value = 'TỐT';
      document.getElementById('bcCirculationInput').value = 'SẴN SÀNG';
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
        document.getElementById('bcTitleInput').value = copy.bookTitle;
        document.getElementById('bcLocationInput').value = copy.location;
        document.getElementById('bcPriceInput').value = copy.price || '120.000';
        document.getElementById('bcPhysicalInput').value = copy.physicalStatus;
        document.getElementById('bcCirculationInput').value = copy.circulationStatus;
        bcUploadWidget.setState(copy.coverUrl || '', true);
        openModal('modalBookCopy');
      } else if (action === 'delete-copy') {
        document.getElementById('deleteBookCopyCode').textContent = copy.id;
        openModal('modalDeleteBookCopy');
      }
    });

    document.getElementById('btnSaveBookCopy').addEventListener('click', () => {
      const copies = getBookCopies();
      const books = getBookTitles();
      const idVal = document.getElementById('bcIdInput').value.trim() || selectedBookCopyId;
      const titleVal = document.getElementById('bcTitleInput').value.trim().toUpperCase();
      if (!idVal || !titleVal) {
        showToast('Vui lòng nhập Mã cuốn sách và Tên cuốn sách!', 'error');
        return;
      }
      const locVal = document.getElementById('bcLocationInput').value.trim() || 'A1 - Ngăn 1';
      const priceVal = document.getElementById('bcPriceInput').value.trim() || '120.000';
      const phyVal = document.getElementById('bcPhysicalInput').value.trim().toUpperCase() || 'TỐT';
      let cirVal = document.getElementById('bcCirculationInput').value.trim().toUpperCase() || 'SẴN SÀNG';
      const coverVal = bcUploadWidget.getValue();

      const rules = getLibraryRules();
      if (phyVal.includes('RÁCH NÁT') && (!rules || rules.autoLockTornBooks === 'Bật')) {
        cirVal = 'KHÓA';
      }

      const matchedBook = books.find(b => b.title.toUpperCase() === titleVal) ||
        books.find(b => idVal.startsWith(b.id)) ||
        books[0];
      const parentBookId = matchedBook ? matchedBook.id : idVal.split('-')[0];

      if (isCreatingBookCopy) {
        copies.unshift({
          id: idVal,
          bookId: parentBookId,
          bookTitle: matchedBook ? matchedBook.title : titleVal,
          location: locVal,
          physicalStatus: phyVal,
          circulationStatus: cirVal,
          price: priceVal,
          coverUrl: coverVal
        });
        saveBookCopies(copies);
        syncBookCountsWithCopies(parentBookId);
        addLog('TẠO MỚI', idVal, `Thêm bản sao cuốn sách <strong>${idVal}</strong> tại kệ ${locVal}`);
        showToast(`Đã thêm cuốn sách ${idVal}!`);
      } else {
        const copy = copies.find(c => c.id === selectedBookCopyId);
        if (copy) {
          copy.id = idVal;
          copy.bookTitle = titleVal;
          copy.location = locVal;
          copy.price = priceVal;
          copy.physicalStatus = phyVal;
          copy.circulationStatus = cirVal;
          copy.coverUrl = coverVal;
          saveBookCopies(copies);
          syncBookCountsWithCopies(copy.bookId || parentBookId);
          addLog('CẬP NHẬT', idVal, `Cập nhật thông tin cuốn sách <strong>${idVal}</strong> (${phyVal} - ${cirVal})`);
          showToast(`Đã cập nhật thông tin cuốn sách ${idVal}!`);
        }
      }

      closeModal('modalBookCopy');
      renderBookCopiesTable();
      renderBookTitlesGrid();
    });

    document.getElementById('btnConfirmDeleteBookCopy').addEventListener('click', () => {
      let copies = getBookCopies();
      const target = copies.find(c => c.id === selectedBookCopyId);
      if (target) {
        if (target.circulationStatus === 'ĐANG MƯỢN') {
          closeModal('modalDeleteBookCopy');
          showToast(`Không thể xóa bản sao ${target.id} vì sách đang được độc giả mượn!`, 'error');
          return;
        }
        const parentId = target.bookId;
        copies = copies.filter(c => c.id !== selectedBookCopyId);
        saveBookCopies(copies);
        syncBookCountsWithCopies(parentId);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa bản sao cuốn sách <strong>${target.id}</strong> khỏi kho lưu trữ`);
        renderBookCopiesTable();
        renderBookTitlesGrid();
        showToast(`Đã xóa cuốn sách ${target.id}!`);
      }
      closeModal('modalDeleteBookCopy');
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
          html += `
            <div class="import-table-row" data-id="${r.id}">
              <div style="font-weight: 600;">${r.id}</div>
              <div>${r.date}</div>
              <div>${r.supplier}</div>
              <div>${r.totalBooks}</div>
              <div style="font-weight: 700;">${r.totalAmount}</div>
              <div>${r.creator}</div>
              <div>
                <div class="actions-group">
                  <span class="action-icon" title="Xem chi tiết phiếu nhập" data-action="view-receipt" data-id="${r.id}">${ICON_EYE}</span>
                  <span class="action-icon" title="In phiếu nhập" data-action="print-receipt" data-id="${r.id}">${ICON_PRINT}</span>
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
        return `<option value="DSIT0001" data-price="120000">DSIT0001 - MANAGING INFORMATION TECHNOLOGY</option>`;
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
      const nextId = DataService.generateNextId(DataService.KEYS.IMPORT_RECEIPTS, 'PNH26', 4);
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

    document.getElementById('btnSaveImportReceipt').addEventListener('click', () => {
      const receipts = getImportReceipts();
      const books = getBookTitles();
      const code = document.getElementById('impNewCodeDisplay').textContent.trim();
      const date = document.getElementById('impNewDateInput').value.trim() || formatTodayDate();
      const supplier = document.getElementById('impNewSupplierSelect').value;
      const creator = document.getElementById('impNewCreatorInput').value.trim() || 'Quản trị viên';

      const rows = impNewItemsBody ? impNewItemsBody.querySelectorAll('tr') : [];
      if (rows.length === 0) {
        showToast('Vui lòng thêm ít nhất 1 dòng sách nhập!', 'error');
        return;
      }

      const items = [];
      let totalBooks = 0;
      let grandTotal = 0;

      rows.forEach(tr => {
        const bookId = tr.querySelector('.imp-row-book').value;
        const qty = Math.max(1, parseInt(tr.querySelector('.imp-row-qty').value, 10) || 1);
        const price = Math.max(0, parseInt(tr.querySelector('.imp-row-price').value, 10) || 0);
        const subtotal = qty * price;
        const targetBook = books.find(b => b.id === bookId);
        const bookTitle = targetBook ? targetBook.title : 'MANAGING INFORMATION TECHNOLOGY';

        items.push({
          bookId,
          bookTitle,
          qty,
          unitPrice: `${price.toLocaleString('vi-VN')} đ`,
          subtotal: `${subtotal.toLocaleString('vi-VN')} đ`
        });

        totalBooks += qty;
        grandTotal += subtotal;

        if (targetBook) {
          autoGenerateCopiesForBook(bookId, targetBook.title, qty, formatVND(price), targetBook.coverUrl);
          syncBookCountsWithCopies(bookId);
        }
      });

      const totalStr = `${grandTotal.toLocaleString('vi-VN')} đ`;

      receipts.unshift({
        id: code,
        date,
        supplier,
        totalBooks: `${totalBooks} cuốn`,
        totalAmount: totalStr,
        creator,
        items
      });

      saveImportReceipts(receipts);
      addLog('TẠO MỚI', code, `Tạo phiếu nhập kho <strong>${code}</strong> (${totalBooks} cuốn - Tổng tiền ${totalStr}) và tự động sinh mã cá biệt`);
      closeModal('modalCreateImport');
      renderImportReceiptsTable();
      renderBookTitlesGrid();
      renderBookCopiesTable();
      showToast(`Đã tạo phiếu nhập ${code} và sinh ${totalBooks} cuốn sách vào kho!`);
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

    importReceiptsTableContent.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const receipts = getImportReceipts();
      const rec = receipts.find(r => r.id === id);
      if (!rec) return;

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
      selectedSupplierId = DataService.generateNextId(DataService.KEYS.SUPPLIERS, 'NCC26', 4);
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

    document.getElementById('btnSaveSupplier').addEventListener('click', () => {
      const suppliers = getSuppliers();
      const nameVal = document.getElementById('supNameInput').value.trim();
      if (!nameVal) {
        showToast('Vui lòng nhập Tên đối tác / Đơn vị cung cấp!', 'error');
        return;
      }
      const contactVal = document.getElementById('supContactInput').value.trim() || 'Đại diện kinh doanh';
      const phoneVal = document.getElementById('supPhoneInput').value.trim() || '0909123456';
      const emailVal = document.getElementById('supEmailInput').value.trim() || 'contact@partner.vn';
      const addrVal = document.getElementById('supAddressInput').value.trim() || 'TP.HCM';

      if (isCreatingSupplier) {
        suppliers.push({
          id: selectedSupplierId,
          name: nameVal,
          contact: contactVal,
          phone: phoneVal,
          email: emailVal,
          address: addrVal,
          status: 'HOẠT ĐỘNG'
        });
        saveSuppliers(suppliers);
        addLog('TẠO MỚI', selectedSupplierId, `Thêm đối tác cung cấp mới <strong>${nameVal}</strong>`);
        showToast(`Đã thêm nhà cung cấp ${nameVal}!`);
      } else {
        const sup = suppliers.find(s => s.id === selectedSupplierId);
        if (sup) {
          sup.name = nameVal;
          sup.contact = contactVal;
          sup.phone = phoneVal;
          sup.email = emailVal;
          sup.address = addrVal;
          saveSuppliers(suppliers);
          addLog('CẬP NHẬT', sup.id, `Cập nhật thông tin đối tác cung cấp <strong>${sup.name}</strong>`);
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

    document.getElementById('btnAddPublisher').addEventListener('click', () => {
      const nextCode = DataService.generateNextId(DataService.KEYS.PUBLISHERS, 'NXB26', 4);
      document.getElementById('pubAddCodeInput').value = nextCode;
      document.getElementById('pubAddNameInput').value = '';
      document.getElementById('pubAddPhoneInput').value = '';
      document.getElementById('pubAddEmailInput').value = '';
      document.getElementById('pubAddAddressInput').value = '';
      document.getElementById('pubAddNoteInput').value = '';
      openModal('modalAddPublisher');
    });

    document.getElementById('btnConfirmAddPublisher').addEventListener('click', () => {
      const pubs = getPublishers();
      const code = document.getElementById('pubAddCodeInput').value.trim() || 'NXB260001';
      const name = document.getElementById('pubAddNameInput').value.trim();
      if (!name) {
        showToast('Vui lòng nhập Tên nhà xuất bản!', 'error');
        return;
      }
      const phone = document.getElementById('pubAddPhoneInput').value.trim();
      const email = document.getElementById('pubAddEmailInput').value.trim();
      const address = document.getElementById('pubAddAddressInput').value.trim();
      const note = document.getElementById('pubAddNoteInput').value.trim();

      const newPub = { id: code, name, phone, email, address, note, status: 'HOẠT ĐỘNG' };
      pubs.push(newPub);
      savePublishers(pubs);
      addLog('TẠO MỚI', code, `Thêm Nhà xuất bản mới <strong>${name}</strong>`);

      closeModal('modalAddPublisher');
      selectedPublisherId = code;
      document.getElementById('pubEditCodeInput').value = newPub.id;
      document.getElementById('pubEditNameInput').value = newPub.name;
      document.getElementById('pubEditPhoneInput').value = newPub.phone;
      document.getElementById('pubEditEmailInput').value = newPub.email;
      document.getElementById('pubEditAddressInput').value = newPub.address;
      document.getElementById('pubEditNoteInput').value = newPub.note;
      document.getElementById('pubEditStatusSelect').value = newPub.status;
      showToast(`Đã thêm NXB ${name}!`);
      openModal('modalEditPublisher');
    });

    document.getElementById('btnConfirmEditPublisher').addEventListener('click', () => {
      const pubs = getPublishers();
      const pub = pubs.find(p => p.id === selectedPublisherId) || pubs[pubs.length - 1];
      if (pub) {
        pub.id = document.getElementById('pubEditCodeInput').value.trim() || pub.id;
        pub.name = document.getElementById('pubEditNameInput').value.trim() || pub.name;
        pub.phone = document.getElementById('pubEditPhoneInput').value.trim();
        pub.email = document.getElementById('pubEditEmailInput').value.trim();
        pub.address = document.getElementById('pubEditAddressInput').value.trim();
        pub.note = document.getElementById('pubEditNoteInput').value.trim();
        pub.status = document.getElementById('pubEditStatusSelect').value;
        savePublishers(pubs);
        addLog('CẬP NHẬT', pub.id, `Cập nhật thông tin Nhà xuất bản <strong>${pub.name}</strong>`);
        showToast(`Đã cập nhật thông tin NXB ${pub.name}!`);
      }
      closeModal('modalEditPublisher');
    });

    renderBookTitlesGrid();
    renderBookCopiesTable();
    renderImportReceiptsTable();
    renderSuppliersTable();
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
      if (status === 'HỢP LỆ') return `<span class="badge-reader-valid status-badge">HỢP LỆ</span>`;
      if (status === 'HẾT HẠN') return `<span class="badge-reader-expired status-badge">HẾT HẠN</span>`;
      return `<span class="badge-reader-locked status-badge">BỊ KHÓA</span>`;
    }

    function renderReaderActions(reader) {
      return `
        <div class="actions-group">
          <span class="action-icon" title="Xem / In thẻ thư viện" data-action="print-card" data-id="${reader.id}">${ICON_PRINT}</span>
          <span class="action-icon" title="Chỉnh sửa thông tin độc giả" data-action="edit-reader" data-id="${reader.id}">${ICON_EDIT}</span>
          <span class="action-icon" title="Gia hạn / Cấp lại thẻ" data-action="renew-card" data-id="${reader.id}">${ICON_REFRESH}</span>
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
        const matchSt = st === 'all' || r.status === st;
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
      } else if (action === 'renew-card') {
        const rules = getLibraryRules();
        const renewFee = (rules && rules.renewCardFee !== undefined) ? Number(rules.renewCardFee) : 50000;
        const defaultMonths = (rules && rules.cardValidityMonths) ? String(rules.cardValidityMonths) : '12';

        document.getElementById('renewReaderId').textContent = reader.id;
        document.getElementById('renewReaderName').textContent = reader.name;
        document.getElementById('renewReaderType').textContent = reader.readerType;
        document.getElementById('renewOldExpiry').textContent = reader.expiryDate;

        const durSelect = document.getElementById('renewDurationSelect');
        if (durSelect) {
          durSelect.value = defaultMonths === '6' ? '6' : '12';
        }
        document.getElementById('renewNewExpiryInput').value = calculateExpiryDateStr(durSelect ? durSelect.value : 12);
        document.getElementById('renewFeeInput').value = `${renewFee.toLocaleString('en-US')} VNĐ`;
        openModal('modalRenewCard');
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
        if (!newName) {
          showToast('Vui lòng nhập Họ và tên độc giả!', 'error');
          return;
        }
        reader.name = newName;
        reader.gender = document.getElementById('rdGenderInput').value.trim() || 'Nam';
        reader.cccd = document.getElementById('rdCccdInput').value.trim();
        reader.dob = document.getElementById('rdDobInput').value.trim();
        reader.issueDate = document.getElementById('rdIssueDateInput').value.trim();
        reader.readerType = document.getElementById('rdTypeSelect').value;
        reader.phone = document.getElementById('rdPhoneInput').value.trim();
        reader.email = document.getElementById('rdEmailInput').value.trim();
        reader.address = document.getElementById('rdAddressInput').value.trim();
        reader.expiryDate = document.getElementById('rdExpiryDateInput').value.trim();
        reader.status = document.getElementById('rdStatusSelect').value;
        reader.avatarUrl = rdUploadWidget.getValue();

        saveReaders(readers);
        addLog('CẬP NHẬT', reader.id, `Chỉnh sửa thông tin hồ sơ độc giả <strong>${reader.name}</strong> (${reader.id})`);
        renderReadersTable();
        showToast(`Đã cập nhật hồ sơ độc giả ${reader.name}!`);
      }
      closeModal('modalReaderInfo');
    });

    const renewDurationSelect = document.getElementById('renewDurationSelect');
    if (renewDurationSelect) {
      renewDurationSelect.addEventListener('change', () => {
        const months = parseInt(renewDurationSelect.value, 10) || 12;
        document.getElementById('renewNewExpiryInput').value = calculateExpiryDateStr(months);
      });
    }

    document.getElementById('btnConfirmRenewCard').addEventListener('click', () => {
      const readers = getReaders();
      const reader = readers.find(r => r.id === selectedReaderId);
      if (reader) {
        const newExp = document.getElementById('renewNewExpiryInput').value.trim() || calculateExpiryDateStr(12);
        const reason = document.getElementById('renewReasonSelect').value;
        reader.expiryDate = newExp;
        reader.status = 'HỢP LỆ';
        saveReaders(readers);
        addLog('GIA HẠN', reader.id, `${reason} cho độc giả <strong>${reader.name}</strong> đến ngày ${newExp}`);
        renderReadersTable();
        showToast(`Đã gia hạn thẻ cho độc giả ${reader.name} đến ${newExp}!`);
      }
      closeModal('modalRenewCard');
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
        readers = readers.filter(r => r.id !== selectedReaderId);
        saveReaders(readers);
        addLog('XÓA DỮ LIỆU', target.id, `Xóa hồ sơ độc giả <strong>${target.name}</strong> khỏi hệ thống`);
        renderReadersTable();
        showToast(`Đã xóa hồ sơ độc giả ${target.name}!`);
      }
      closeModal('modalDeleteReader');
    });

    const issueReaderId = document.getElementById('issueReaderId');
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
      return DataService.generateNextId(DataService.KEYS.READERS, '22026', 4);
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

    document.getElementById('btnSubmitIssueCard').addEventListener('click', () => {
      const nameVal = issueReaderName.value.trim();
      const cccdVal = issueReaderCccd.value.trim();
      const phoneVal = issueReaderPhone.value.trim();
      const emailVal = issueReaderEmail.value.trim();

      if (!nameVal) {
        showToast('Vui lòng nhập Họ và tên độc giả để cấp thẻ!', 'error');
        issueReaderName.focus();
        return;
      }
      if (!cccdVal) {
        showToast('Vui lòng nhập Số CCCD của độc giả!', 'error');
        issueReaderCccd.focus();
        return;
      }
      if (!phoneVal) {
        showToast('Vui lòng nhập Số điện thoại liên hệ!', 'error');
        issueReaderPhone.focus();
        return;
      }
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showToast('Vui lòng nhập địa chỉ Email hợp lệ!', 'error');
        issueReaderEmail.focus();
        return;
      }

      const rules = getLibraryRules();
      const validityMonths = (rules && rules.cardValidityMonths) ? Number(rules.cardValidityMonths) : 12;

      const readers = getReaders();
      const newId = issueReaderId.value.trim() || getNextReaderCode();
      const rType = issueReaderType.value || 'Sinh viên';
      const issueDate = formatTodayDate();
      const expiryDate = calculateExpiryDateStr(validityMonths);

      const newReader = {
        id: newId,
        name: nameVal,
        gender: issueReaderGender.value || 'Nam',
        dob: issueReaderDob.value.trim() || '15 / 08 / 2004',
        cccd: cccdVal,
        phone: phoneVal,
        email: emailVal,
        address: issueReaderAddress.value.trim() || 'TP.HCM',
        readerType: rType,
        issueDate,
        expiryDate,
        status: 'HỢP LỆ',
        avatarUrl: ''
      };

      readers.unshift(newReader);
      saveReaders(readers);
      addLog('TẠO MỚI', newId, `Cấp thẻ thư viện mới cho độc giả <strong>${nameVal}</strong> (${newId} - ${rType})`);

      resetIssueCardForm();
      renderReadersTable();

      const listTabBtn = document.querySelector('.subtab-item[data-tab="tabReadersList"], .sub-tab[data-target="tabReadersList"]');
      if (listTabBtn) listTabBtn.click();

      document.getElementById('popupCardId').textContent = newReader.id;
      document.getElementById('popupCardName').textContent = newReader.name.toUpperCase();
      document.getElementById('popupCardType').textContent = newReader.readerType;
      document.getElementById('popupCardExpiry').textContent = newReader.expiryDate;
      showToast(`Đã cấp thẻ thành công cho độc giả ${newReader.name}!`);
      openModal('modalPrintCard');
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
