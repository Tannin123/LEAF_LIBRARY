/**
 * LEAF LIBRARY - USER DASHBOARD JAVASCRIPT
 * Module điều khiển giao diện Người dùng / Độc giả
 * Đồng bộ logic với Admin (Header, Sidebar toggle, Dropdown menu, Session)
 * Hỗ trợ 3 Modal:
 *  1. Thông tin cá nhân (Xem hồ sơ)
 *  2. Thẻ thư viện (Ảnh 1)
 *  3. Thay đổi thông tin cá nhân (Ảnh 2)
 */

let activeBorrowBook = null;
let catalogCurrentPage = 1;
const CATALOG_PAGE_SIZE = 6;

document.addEventListener('DOMContentLoaded', () => {
  // PHÂN QUYỀN TRUY CẬP: Đảm bảo độc giả truy cập trang user
  let rawSession = null;
  try {
    const raw = sessionStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) rawSession = JSON.parse(raw);
  } catch (_) {}

  if (rawSession && rawSession.accountType === 'employee') {
    // Nếu đang là nhân viên/admin, hỏi hoặc chuyển hướng sang trang admin
    if (confirm('Bạn đang đăng nhập bằng tài khoản Quản trị viên/Nhân viên. Chuyển đến trang Quản lý (Admin)?')) {
      window.location.href = '../admin/index.html';
      return;
    }
  }

  initUserSession();
  initSidebarToggle();
  initUserDropdown();
  initUserProfileModal();
  initEditProfileModal();
  initLibraryCardModal();
  initGlobalSearch();
  initBorrowRegistration();
  initBookshelfPage();
  initReaderHistoryPage();
  initPaymentPage();
  initSuggestionsPage();
  initNotifications();
  initLogoutActions();
});

/**
 * 1. Khởi tạo phiên làm việc và đồng bộ thông tin độc giả lên giao diện
 */
function initUserSession() {
  let session = null;
  try {
    const raw = sessionStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) {
      session = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Lỗi đọc session:', err);
  }

  // Thông tin mặc định nếu chưa có session
  const defaultUser = {
    id: '123456',
    name: 'Lưu Tấn Nin',
    fullName: 'Lưu Tấn Nin',
    role: 'Độc giả',
    readerType: 'Sinh viên',
    gender: 'Nam',
    dob: '10 / 11 / 2006',
    cccd: 'abc',
    address: 'O17, Ap 4, My An, Tay Ninh',
    phone: '0363894957',
    email: 'luutannin@gmail.com',
    avatarUrl: ''
  };

  const user = session || defaultUser;
  const displayName = user.fullName || user.name || 'Lưu Tấn Nin';
  const displayRole = user.role || user.readerType || 'Độc giả';
  const displayCode = user.id ? `Mã ĐG: ${user.id}` : 'Mã ĐG: 123456';

  // Đồng bộ header greeting
  const headerGreeting = document.getElementById('headerGreetingName');
  if (headerGreeting) headerGreeting.textContent = displayName;

  // Đồng bộ dropdown menu
  const dropdownName = document.getElementById('dropdownUserName');
  if (dropdownName) dropdownName.textContent = displayName;

  const dropdownCode = document.getElementById('dropdownUserCode');
  if (dropdownCode) dropdownCode.textContent = displayCode;

  const dropdownRole = document.getElementById('dropdownUserRole');
  if (dropdownRole) dropdownRole.textContent = displayRole;

  // Đồng bộ avatar
  if (user.avatarUrl) {
    const headerImg = document.getElementById('headerAvatarImg');
    const headerIcon = document.getElementById('headerAvatarDefaultIcon');
    if (headerImg) {
      headerImg.src = user.avatarUrl;
      headerImg.style.display = 'block';
      if (headerIcon) headerIcon.style.display = 'none';
    }

    ['profAvatarImg', 'editProfAvatarImg'].forEach(id => {
      const img = document.getElementById(id);
      if (img) {
        img.src = user.avatarUrl;
        img.style.display = 'block';
      }
    });

    ['profAvatarPlaceholder', 'editProfAvatarPlaceholder'].forEach(id => {
      const ph = document.getElementById(id);
      if (ph) ph.style.display = 'none';
    });
  }
}

/**
 * 2. Thu gọn / Mở rộng Sidebar (Chuẩn 100% Admin)
 */
function initSidebarToggle() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarMenu = document.getElementById('sidebarMenu');

  if (!sidebarToggle || !sidebarMenu) return;

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

/**
 * 3. Menu người dùng Header Dropdown (Chuẩn 100% Admin)
 */
function initUserDropdown() {
  const btnAvatar = document.getElementById('btnUserAvatar');
  const dropdownMenu = document.getElementById('userDropdownMenu');

  if (!btnAvatar || !dropdownMenu) return;

  btnAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !btnAvatar.contains(e.target)) {
      dropdownMenu.classList.remove('active');
    }
  });

  // Bấm vào Thông tin tài khoản -> Mở Modal Thông tin cá nhân
  const btnOpenAccount = document.getElementById('btnOpenMyAccount');
  if (btnOpenAccount) {
    btnOpenAccount.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
      openUserProfileModal();
    });
  }

    // Setup modal đổi mật khẩu dùng chung nếu chưa có trên DOM
  let pwdModal = document.getElementById('modalChangePasswordGlobal');
  if (!pwdModal) {
    pwdModal = document.createElement('div');
    pwdModal.className = 'modal-overlay';
    pwdModal.id = 'modalChangePasswordGlobal';
    pwdModal.innerHTML = `
      <div class="modal-box modal-box-sm" style="max-width: 420px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin: auto;">
        <div class="user-modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
          <div class="user-modal-title" style="font-size: 16px; font-weight: 700; color: #1D5D86;">ĐỔI MẬT KHẨU TÀI KHOẢN</div>
          <button type="button" class="user-modal-close-btn" id="btnCloseChangePwdGlobal" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748B;">✕</button>
        </div>
        <div class="user-modal-body" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Mật khẩu hiện tại</label>
            <input type="password" class="profile-form-input" id="userCurrentPwdInput" placeholder="Nhập mật khẩu hiện tại..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Mật khẩu mới (tối thiểu 8 ký tự)</label>
            <input type="password" class="profile-form-input" id="userNewPwdInput" placeholder="Nhập mật khẩu mới..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Xác nhận mật khẩu mới</label>
            <input type="password" class="profile-form-input" id="userConfirmPwdInput" placeholder="Nhập lại mật khẩu mới..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button type="button" class="btn-profile-gray" id="btnCancelChangePwdGlobal" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #CBD5E1; background: #F1F5F9; color: #475569; cursor: pointer; font-weight: 600;">HỦY BỎ</button>
            <button type="button" class="btn-profile-primary" id="btnConfirmChangePwdGlobal" style="padding: 8px 18px; border-radius: 6px; border: none; background: #1D5D86; color: #fff; cursor: pointer; font-weight: 600;">CẬP NHẬT</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(pwdModal);

    const closePwd = () => pwdModal.classList.remove('active');
    document.getElementById('btnCloseChangePwdGlobal')?.addEventListener('click', closePwd);
    document.getElementById('btnCancelChangePwdGlobal')?.addEventListener('click', closePwd);
    pwdModal.addEventListener('click', (e) => {
      if (e.target === pwdModal) closePwd();
    });

    document.getElementById('btnConfirmChangePwdGlobal')?.addEventListener('click', async () => {
      const cur = document.getElementById('userCurrentPwdInput').value;
      const nw = document.getElementById('userNewPwdInput').value.trim();
      const cf = document.getElementById('userConfirmPwdInput').value.trim();

      if (!cur || !nw) {
        showToast('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!', 'error');
        return;
      }
      if (nw.length < 8) {
        showToast('Mật khẩu mới phải có ít nhất 8 ký tự!', 'error');
        return;
      }
      if (nw !== cf) {
        showToast('Xác nhận mật khẩu mới không khớp!', 'error');
        return;
      }

      let session = {};
      try {
        const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
        if (raw) session = JSON.parse(raw);
      } catch (_) {}

      const username = session.username || 'tannin';

      try {
        await DataService.request('POST', '/auth/password/change', {
          username: username,
          currentPassword: cur,
          newPassword: nw
        });
        closePwd();
        showToast('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.', 'success');
      } catch (err) {
        showToast(err.message || 'Mật khẩu hiện tại không chính xác hoặc không thể cập nhật.', 'error');
      }
    });
  }

  const btnChangePass = document.getElementById('btnOpenChangePassword');
  if (btnChangePass) {
    btnChangePass.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
      document.getElementById('userCurrentPwdInput').value = '';
      document.getElementById('userNewPwdInput').value = '';
      document.getElementById('userConfirmPwdInput').value = '';
      pwdModal.classList.add('active');
    });
  }
}

/**
 * 4. Modal Thông tin cá nhân (Xem hồ sơ)
 */
function initUserProfileModal() {
  const modal = document.getElementById('modalUserProfile');
  if (!modal) return;

  const btnClose = document.getElementById('btnCloseUserProfileModal');
  const btnExit = document.getElementById('btnExitProfile');
  const btnEdit = document.getElementById('btnEditProfile');
  const btnViewCard = document.getElementById('btnViewReaderCard');

  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnExit) btnExit.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Bấm "CHỈNH SỬA THÔNG TIN" -> Mở modal Thay đổi thông tin cá nhân (Ảnh 2)
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      modal.classList.remove('active');
      openEditProfileModal();
    });
  }

  // Bấm "XEM THẺ ĐỘC GIẢ" -> Mở modal Thẻ thư viện (Ảnh 1)
  if (btnViewCard) {
    btnViewCard.addEventListener('click', () => {
      modal.classList.remove('active');
      openLibraryCardModal();
    });
  }
}

function openUserProfileModal() {
  const modal = document.getElementById('modalUserProfile');
  if (!modal) return;

  let session = null;
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  if (session) {
    if (session.fullName || session.name) {
      const name = session.fullName || session.name;
      const el = document.getElementById('profFullName');
      if (el) el.value = name;
    }
    if (session.gender) {
      const el = document.getElementById('profGender');
      if (el) el.value = session.gender;
    }
    if (session.dob) {
      const el = document.getElementById('profDob');
      if (el) el.value = session.dob;
    }
    if (session.cccd) {
      const el = document.getElementById('profCccd');
      if (el) el.value = session.cccd;
    }
    if (session.address) {
      const el = document.getElementById('profAddress');
      if (el) el.value = session.address;
    }
    if (session.phone) {
      const el = document.getElementById('profPhone');
      if (el) el.value = session.phone;
    }
    if (session.email) {
      const el = document.getElementById('profEmail');
      if (el) el.value = session.email;
    }
    if (session.id) {
      const el = document.getElementById('profCodeValue');
      if (el) el.textContent = session.id;
    }
  }

  modal.classList.add('active');
}

/**
 * 5. Modal Thay đổi thông tin cá nhân (Chuẩn Ảnh 2)
 */
function initEditProfileModal() {
  const modal = document.getElementById('modalEditUserProfile');
  if (!modal) return;

  const btnClose = document.getElementById('btnCloseEditUserProfileModal');
  const btnCancel = document.getElementById('btnCancelEditProfile');
  const btnSave = document.getElementById('btnSaveEditProfile');

  const closeAndReturn = () => {
    modal.classList.remove('active');
    openUserProfileModal();
  };

  if (btnClose) btnClose.addEventListener('click', closeAndReturn);
  if (btnCancel) btnCancel.addEventListener('click', closeAndReturn);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAndReturn();
  });

  // Bấm "LƯU" -> Lưu thông tin vào database và session, cập nhật giao diện
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const fullName = document.getElementById('editProfFullName')?.value.trim() || 'Lưu Tấn Nin';
      const gender = document.getElementById('editProfGender')?.value || 'Nam';
      const dob = document.getElementById('editProfDob')?.value.trim() || '10 / 11 / 2006';
      const cccd = document.getElementById('editProfCccd')?.value.trim() || 'abc';
      const address = document.getElementById('editProfAddress')?.value.trim() || 'O17, Ap 4, My An, Tay Ninh';
      const phone = document.getElementById('editProfPhone')?.value.trim() || '0363894957';
      const email = document.getElementById('editProfEmail')?.value.trim() || 'luutannin@gmail.com';

      // Cập nhật session
      let session = {};
      try {
        const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
        if (raw) session = JSON.parse(raw);
      } catch (_) {}

      session.fullName = fullName;
      session.name = fullName;
      session.gender = gender;
      session.dob = dob;
      session.cccd = cccd;
      session.address = address;
      session.phone = phone;
      session.email = email;

      const readerId = session.id || session.readerId || '220260004';
      const payload = {
        id: readerId,
        username: session.username || 'tannin',
        name: fullName,
        fullName: fullName,
        email: email,
        phone: phone,
        cccd: cccd,
        gender: gender,
        dob: dob,
        address: address,
        readerType: session.readerType || session.role || 'Sinh viên',
        status: session.status || 'HOẠT ĐỘNG'
      };

      try {
        await DataService.request('PUT', `/readers/${encodeURIComponent(readerId)}`, payload);
      } catch (err) {
        console.warn('Không thể cập nhật hồ sơ trực tiếp qua backend:', err);
      }

      localStorage.setItem('ixs_library_session', JSON.stringify(session));
      localStorage.setItem('ixs_library_current_user', JSON.stringify(session));

      // Cập nhật lại giao diện người dùng
      initUserSession();

      modal.classList.remove('active');
      openUserProfileModal();
      showToast('Đã lưu thay đổi thông tin cá nhân và đồng bộ hệ thống!', 'success');
    });
  }
}

function openEditProfileModal() {
  const modal = document.getElementById('modalEditUserProfile');
  if (!modal) return;

  // Lấy dữ liệu hiện tại từ modal xem hoặc session
  let session = null;
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  const profName = document.getElementById('profFullName')?.value || session?.fullName || 'Lưu Tấn Nin';
  const profGender = document.getElementById('profGender')?.value || session?.gender || 'Nam';
  const profDob = document.getElementById('profDob')?.value || session?.dob || '10 / 11 / 2006';
  const profCccd = document.getElementById('profCccd')?.value || session?.cccd || 'abc';
  const profAddress = document.getElementById('profAddress')?.value || session?.address || 'O17, Ap 4, My An, Tay Ninh';
  const profPhone = document.getElementById('profPhone')?.value || session?.phone || '0363894957';
  const profEmail = document.getElementById('profEmail')?.value || session?.email || 'luutannin@gmail.com';
  const profCode = document.getElementById('profCodeValue')?.textContent || session?.id || '123456';

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('editProfFullName', profName);
  setVal('editProfGender', profGender);
  setVal('editProfDob', profDob);
  setVal('editProfCccd', profCccd);
  setVal('editProfAddress', profAddress);
  setVal('editProfPhone', profPhone);
  setVal('editProfEmail', profEmail);

  const codeEl = document.getElementById('editProfCodeValue');
  if (codeEl) codeEl.textContent = profCode;

  modal.classList.add('active');
}

/**
 * 6. Modal Thẻ thư viện (Chuẩn Ảnh 1)
 */
function initLibraryCardModal() {
  const modal = document.getElementById('modalLibraryCard');
  if (!modal) return;

  const btnClose = document.getElementById('btnCloseLibraryCardModal');
  const btnExit = document.getElementById('btnExitLibraryCard');
  const btnPrint = document.getElementById('btnPrintLibraryCard');

  const closeAndReturn = () => {
    modal.classList.remove('active');
    openUserProfileModal();
  };

  if (btnClose) btnClose.addEventListener('click', closeAndReturn);
  if (btnExit) btnExit.addEventListener('click', closeAndReturn);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAndReturn();
  });

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}

function openLibraryCardModal() {
  const modal = document.getElementById('modalLibraryCard');
  if (!modal) return;

  // Đồng bộ tên lên thẻ
  let session = null;
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  const currentName = session?.fullName || session?.name || document.getElementById('profFullName')?.value || 'LUU TAN NIN';
  const nameEl = document.getElementById('libCardName');
  if (nameEl) {
    nameEl.textContent = currentName.toUpperCase();
  }

  modal.classList.add('active');
}

/**
 * 7. Thanh tìm kiếm nhanh
 */
function initGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  if (!searchInput) return;

  const isCatalog = window.location.pathname.includes('catalog.html');
  const clearButton = document.getElementById('btnClearSearch');
  const renderCatalog = () => renderCatalogSearch(searchInput.value);
  const urlQuery = new URLSearchParams(window.location.search).get('search');
  if (urlQuery) searchInput.value = urlQuery;

  searchInput.addEventListener('input', () => {
    if (isCatalog) {
      catalogCurrentPage = 1;
      renderCatalog();
    }
    if (clearButton) clearButton.style.display = searchInput.value ? 'inline-flex' : 'none';
  });
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !isCatalog && searchInput.value.trim()) {
      window.location.href = `catalog.html?search=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      clearButton.style.display = 'none';
      catalogCurrentPage = 1;
      renderCatalog();
      searchInput.focus();
    });
  }

  ['filterCategory', 'filterAuthor', 'filterSort'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      catalogCurrentPage = 1;
      renderCatalog();
    });
  });

  if (isCatalog) {
    document.getElementById('catalogPaginationControls')?.addEventListener('click', event => {
      const button = event.target.closest('[data-catalog-page]');
      if (!button || button.disabled) return;
      catalogCurrentPage = Number(button.dataset.catalogPage);
      renderCatalog();
    });

    const grid = document.getElementById('catalogBooksGrid');
    const detailView = document.getElementById('catalogBookDetail');

    grid?.addEventListener('click', event => {
      const borrowButton = event.target.closest('[data-borrow-book-id]');
      if (borrowButton) {
        openBorrowRegistration(borrowButton.dataset.borrowBookId);
        return;
      }
      if (event.target.closest('button, a')) return;
      const card = event.target.closest('.catalog-book-card[data-book-id]');
      if (card) openCatalogBookDetail(card.dataset.bookId);
    });
    grid?.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.catalog-book-card[data-book-id]')) {
        event.preventDefault();
        openCatalogBookDetail(event.target.dataset.bookId);
      }
    });
    detailView?.addEventListener('click', event => {
      if (event.target.closest('[data-detail-action="back"]')) {
        renderCatalog();
        return;
      }
      if (event.target.closest('[data-detail-action="borrow"]')) {
        openBorrowRegistration(detailView.dataset.bookId);
      }
    });

    window.applyCatalogSearch = query => {
      searchInput.value = query;
      catalogCurrentPage = 1;
      if (clearButton) clearButton.style.display = 'inline-flex';
      renderCatalog();
      searchInput.focus();
    };
    Promise.resolve(DataService.ready).catch(() => {}).then(renderCatalog);
  }
}

function renderCatalogSearch(query) {
  const emptyFrame = document.getElementById('catalogEmptyFrame');
  const grid = document.getElementById('catalogBooksGrid');
  const detailView = document.getElementById('catalogBookDetail');
  const filtersRow = document.querySelector('.catalog-filters-row');
  const paginationRow = document.getElementById('catalogPaginationRow');
  const paginationControls = document.getElementById('catalogPaginationControls');
  const countWrapper = document.getElementById('catalogResultCountWrapper');
  const count = document.getElementById('catalogResultCount');
  if (!emptyFrame || !grid) return;

  if (detailView) detailView.style.display = 'none';
  if (filtersRow) filtersRow.style.display = '';
  if (paginationRow) paginationRow.style.display = 'none';

  const categoryFilter = document.getElementById('filterCategory');
  const selectedCategory = categoryFilter?.selectedIndex > 0 ? categoryFilter.selectedOptions[0].textContent.trim() : '';
  const searchTerms = normalizeCatalogText(query).split(/\s+/).filter(Boolean);
  const copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, []);
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const books = [
    ...databaseBooks,
    ...defaultBookTitles.filter(sample => !databaseBooks.some(book =>
      normalizeCatalogText(book.title) === normalizeCatalogText(sample.title)
    ))
  ];

  const results = books.filter(book => {
    const searchableText = normalizeCatalogText([
      book.id, book.title, book.authors, book.author, book.category,
      book.genre, book.subject, book.publisher, book.isbn, book.isbn13
    ].filter(Boolean).join(' '));
    const matchesQuery = searchTerms.every(term => searchableText.includes(term));
    const matchesCategory = !selectedCategory || normalizeCatalogText(`${book.category || ''} ${book.genre || ''} ${book.subject || ''}`).includes(normalizeCatalogText(selectedCategory));
    return matchesQuery && matchesCategory;
  });

  const sortBy = document.getElementById('filterSort')?.value || 'relevant';
  if (sortBy === 'az') results.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi'));
  if (sortBy === 'newest') results.sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), 'vi'));
  if (sortBy === 'popular') {
    results.sort((a, b) => borrowedCopies(b.id, copies) - borrowedCopies(a.id, copies));
  }

  const totalPages = Math.ceil(results.length / CATALOG_PAGE_SIZE);
  catalogCurrentPage = Math.max(1, Math.min(catalogCurrentPage, totalPages || 1));
  const pageResults = results.slice((catalogCurrentPage - 1) * CATALOG_PAGE_SIZE, catalogCurrentPage * CATALOG_PAGE_SIZE);
  const hasFilters = Boolean(searchTerms.length || selectedCategory);
  emptyFrame.style.display = hasFilters ? 'none' : 'flex';
  grid.style.display = hasFilters ? 'grid' : 'none';
  if (countWrapper) countWrapper.style.display = hasFilters ? 'block' : 'none';
  if (count) count.textContent = String(results.length);
  if (paginationRow) paginationRow.style.display = hasFilters && totalPages > 1 ? 'flex' : 'none';
  if (paginationControls) paginationControls.innerHTML = totalPages > 1
    ? renderCatalogPaginationControls(catalogCurrentPage, totalPages)
    : '';

  if (!hasFilters) return;
  if (!results.length) {
    grid.innerHTML = '<div class="catalog-no-results">Không tìm thấy sách phù hợp. Hãy thử từ khóa khác.</div>';
    return;
  }

  grid.innerHTML = pageResults.map(book => {
    const bookCopies = copies.filter(copy => String(copy.bookId || copy.bookTitleId) === String(book.id));
    const total = bookCopies.length || Number(book.total || book.totalCopies || 0);
    const available = bookCopies.length
      ? bookCopies.filter(copy => normalizeCatalogText(copy.circulationStatus || copy.status).includes('san sang')).length
      : Number(book.available || book.availableCopies || 0);
    const cover = book.coverUrl
      ? `<img src="${escapeCatalogHtml(book.coverUrl)}" alt="Bìa ${escapeCatalogHtml(book.title || 'sách')}" loading="lazy">`
      : '<span class="catalog-cover-fallback">LEAF<br>LIBRARY</span>';

    return `<article class="catalog-book-card" data-book-id="${escapeCatalogHtml(book.id)}" tabindex="0" aria-label="Xem chi tiết ${escapeCatalogHtml(book.title || 'sách')}">
      <div class="catalog-book-cover">${cover}</div>
      <div class="catalog-book-info">
        <div class="catalog-book-header-row"><div><div class="catalog-field-title-small">Mã sách</div><div class="catalog-code-badge">${escapeCatalogHtml(book.id || '—')}</div></div></div>
        <div class="catalog-book-title-block"><div class="catalog-field-title-small">Tên sách, tác giả</div><div class="catalog-book-title" title="${escapeCatalogHtml(book.title || '')}">${escapeCatalogHtml(book.title || 'Chưa có tên sách')}</div><div class="catalog-book-author">${escapeCatalogHtml(book.authors || book.author || 'Chưa cập nhật tác giả')}</div></div>
        <div class="catalog-meta-row"><div class="catalog-meta-item"><span class="meta-label">Nhà xuất bản</span><span class="meta-val">${escapeCatalogHtml(book.publisher || 'Chưa cập nhật')}</span></div><div class="catalog-meta-item text-right"><span class="meta-label">Thể loại</span><span class="meta-val">${escapeCatalogHtml(book.category || book.genre || 'Chưa phân loại')}</span></div></div>
        <div class="catalog-book-bottom-row"><div class="catalog-stock-block"><span class="catalog-stock-label">Số lượng còn sẵn</span><span class="catalog-stock-qty">${available} / ${total}</span></div><button type="button" class="btn-borrow-now" data-borrow-book-id="${escapeCatalogHtml(book.id)}"${available > 0 ? '' : ' disabled'}>Mượn ngay</button></div>
      </div>
    </article>`;
  }).join('');
}

function renderCatalogPaginationControls(currentPage, totalPages) {
  const pageButton = (page, label = String(page), active = false) =>
    `<button type="button" class="page-btn${active ? ' active' : ''}" data-catalog-page="${page}" aria-label="Trang ${page}"${active ? ' aria-current="page"' : ''}>${label}</button>`;
  const pages = [];

  if (totalPages <= 5) {
    for (let page = 1; page <= totalPages; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
  } else if (currentPage <= 3) {
    for (let page = 1; page <= 3; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
    pages.push('<span class="page-dots" aria-hidden="true">...</span>', pageButton(totalPages));
  } else if (currentPage >= totalPages - 2) {
    pages.push(pageButton(1), '<span class="page-dots" aria-hidden="true">...</span>');
    for (let page = totalPages - 2; page <= totalPages; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
  } else {
    pages.push(pageButton(1), '<span class="page-dots" aria-hidden="true">...</span>');
    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
    pages.push('<span class="page-dots" aria-hidden="true">...</span>', pageButton(totalPages));
  }

  return `<button type="button" class="page-btn" data-catalog-page="${currentPage - 1}" aria-label="Trang trước"${currentPage === 1 ? ' disabled' : ''}>&lt;</button>${pages.join('')}<button type="button" class="page-btn" data-catalog-page="${currentPage + 1}" aria-label="Trang sau"${currentPage === totalPages ? ' disabled' : ''}>&gt;</button>`;
}

function openCatalogBookDetail(bookId) {
  const detailView = document.getElementById('catalogBookDetail');
  const grid = document.getElementById('catalogBooksGrid');
  const emptyFrame = document.getElementById('catalogEmptyFrame');
  const filtersRow = document.querySelector('.catalog-filters-row');
  const paginationRow = document.getElementById('catalogPaginationRow');
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const books = [
    ...databaseBooks,
    ...defaultBookTitles.filter(sample => !databaseBooks.some(book =>
      normalizeCatalogText(book.title) === normalizeCatalogText(sample.title)
    ))
  ];
  const book = books.find(item => String(item.id) === String(bookId));
  if (!book || !detailView) return;

  const copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, [])
    .filter(copy => String(copy.bookId || copy.bookTitleId) === String(book.id));
  const total = copies.length || Number(book.total || book.totalCopies || 0);
  const available = copies.length
    ? copies.filter(copy => normalizeCatalogText(copy.circulationStatus || copy.status).includes('san sang')).length
    : Number(book.available || book.availableCopies || 0);
  const locations = [...new Set(copies.map(copy => copy.location).filter(Boolean))].join(', ') || 'Chưa cập nhật';
  const cover = book.coverUrl
    ? `<img src="${escapeCatalogHtml(book.coverUrl)}" alt="Bìa ${escapeCatalogHtml(book.title || 'sách')}">`
    : '<span class="catalog-cover-fallback">LEAF<br>LIBRARY</span>';
  const status = available > 0 ? `Sẵn sàng cho mượn (${available} cuốn)` : 'Tạm hết sách';

  if (grid) grid.style.display = 'none';
  if (emptyFrame) emptyFrame.style.display = 'none';
  if (filtersRow) filtersRow.style.display = 'none';
  if (paginationRow) paginationRow.style.display = 'none';
  detailView.dataset.bookId = String(book.id);
  detailView.style.display = 'block';
  detailView.innerHTML = `
    <div class="catalog-detail-breadcrumb">
      <div>Trang chủ <span>›</span> Tra cứu sách <span>›</span> <strong>Chi tiết sách: ${escapeCatalogHtml(book.title)}</strong></div>
      <button type="button" data-detail-action="back">Quay lại tra cứu sách</button>
    </div>
    <div class="catalog-detail-panel">
      <div class="catalog-detail-main">
        <div class="catalog-detail-intro">
          <div class="catalog-detail-cover">${cover}</div>
          <div class="catalog-detail-heading">
            <h1>${escapeCatalogHtml(book.title || 'Chưa có tên sách')}</h1>
            <p class="catalog-detail-subtitle">${escapeCatalogHtml(book.subject || book.genre || '')}</p>
            <div class="catalog-detail-facts">
              <div><span>Tác giả</span><strong>${escapeCatalogHtml(book.authors || book.author || 'Chưa cập nhật')}</strong></div>
              <div><span>Thể loại</span><strong>${escapeCatalogHtml(book.category || book.genre || 'Chưa phân loại')}</strong></div>
              <div><span>Nhà xuất bản</span><strong>${escapeCatalogHtml(book.publisher || 'Chưa cập nhật')}</strong></div>
              <div><span>Phiên bản</span><strong>${escapeCatalogHtml(book.edition || 'Chưa cập nhật')}</strong></div>
            </div>
          </div>
        </div>
        <section class="catalog-detail-summary">
          <h2>Tóm tắt nội dung</h2>
          <p>${escapeCatalogHtml(book.summary || book.description || 'Chưa có nội dung tóm tắt cho đầu sách này.')}</p>
        </section>
      </div>
      <aside class="catalog-detail-sidebar">
        <h2>Thông tin cuốn sách</h2>
        <div class="catalog-detail-row"><span>Mã sách</span><strong>${escapeCatalogHtml(book.id)}</strong></div>
        <div class="catalog-detail-row"><span>Trạng thái</span><strong class="${available > 0 ? 'is-available' : 'is-unavailable'}">${escapeCatalogHtml(status)}</strong></div>
        <div class="catalog-detail-row"><span>Vị trí lưu kho</span><strong>${escapeCatalogHtml(locations)}</strong></div>
        <div class="catalog-detail-row"><span>Năm xuất bản</span><strong>${escapeCatalogHtml(book.publishYear || book.namXuatBan || '2021')}</strong></div>
        <div class="catalog-detail-row"><span>Số lượng còn</span><strong>${available} / ${total} cuốn</strong></div>
        <button type="button" class="btn-borrow-now catalog-detail-borrow" data-detail-action="borrow"${available > 0 ? '' : ' disabled'}>Đăng ký mượn ngay</button>
        <p class="catalog-detail-note">Thời gian mượn tiêu chuẩn là 14 ngày. Vui lòng liên hệ thủ thư để hoàn tất đăng ký.</p>
      </aside>
    </div>`;
}

function normalizeCatalogText(value) {
  return String(value || '').toLocaleLowerCase('vi')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

function initBorrowRegistration() {
  const registrationModal = document.getElementById('modalBorrowRegistration');
  const successModal = document.getElementById('modalBorrowSuccess');
  const confirmButton = document.getElementById('btnConfirmBorrow');
  if (!registrationModal || !successModal || !confirmButton) return;

  const closeRegistration = () => registrationModal.classList.remove('active');
  const closeSuccess = () => successModal.classList.remove('active');
  document.getElementById('btnCloseBorrowRegistration')?.addEventListener('click', closeRegistration);
  document.getElementById('btnCancelBorrow')?.addEventListener('click', closeRegistration);
  document.getElementById('btnCloseBorrowSuccess')?.addEventListener('click', closeSuccess);
  document.getElementById('btnCloseBorrowSuccessFooter')?.addEventListener('click', closeSuccess);
  registrationModal.addEventListener('click', event => {
    if (event.target === registrationModal) closeRegistration();
  });
  successModal.addEventListener('click', event => {
    if (event.target === successModal) closeSuccess();
  });

  confirmButton.addEventListener('click', async () => {
    const book = getActiveBorrowBook();
    if (!book) return;
    const reader = getBorrowReaderProfile();
    const copySelect = document.getElementById('borrowSelectCopy');
    const selectedCopyId = copySelect ? copySelect.value : `${book.id}-01`;

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const request = {
      id: `PM-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      loanId: `PM-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      bookId: book.id,
      bookTitle: book.title,
      copyId: selectedCopyId,
      readerId: reader.id,
      readerName: reader.fullName,
      employeeId: '12026001',
      borrowDate: new Intl.DateTimeFormat('vi-VN').format(now),
      dueDate: new Intl.DateTimeFormat('vi-VN').format(dueDate),
      requestDate: now.toISOString(),
      status: 'Đang mượn'
    };

    confirmButton.disabled = true;
    confirmButton.textContent = 'Đang xử lý...';
    try {
      try {
        await DataService.request(
          'POST',
          `/bookTitles/${encodeURIComponent(book.id)}/reserve`,
          { requestId: request.id, readerId: reader.id, copyId: selectedCopyId }
        );
      } catch (_) {}

      // Cập nhật trạng thái cuốn sách thành ĐANG MƯỢN
      try {
        const copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, typeof defaultBookCopies !== 'undefined' ? defaultBookCopies : []);
        const targetCopy = copies.find(c => String(c.id) === String(selectedCopyId));
        if (targetCopy) {
          targetCopy.circulationStatus = 'ĐANG MƯỢN';
          targetCopy.status = 'ĐANG MƯỢN';
          DataService.saveAll(DataService.KEYS.BOOK_COPIES, copies);
        }
      } catch (_) {}

      // Giảm số lượng cuốn sẵn sàng của đầu sách
      try {
        const titles = DataService.getAll(DataService.KEYS.BOOK_TITLES, typeof defaultBookTitles !== 'undefined' ? defaultBookTitles : []);
        const targetTitle = titles.find(t => String(t.id) === String(book.id));
        if (targetTitle && Number(targetTitle.available) > 0) {
          targetTitle.available = Number(targetTitle.available) - 1;
          DataService.saveAll(DataService.KEYS.BOOK_TITLES, titles);
        }
      } catch (_) {}

      // Lưu vào Lịch sử mượn trả
      try {
        const loans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
        saveReaderHistory([request, ...loans]);
      } catch (_) {}

      try {
        const requests = JSON.parse(localStorage.getItem('ixs_library_borrow_requests') || '[]');
        localStorage.setItem('ixs_library_borrow_requests', JSON.stringify([request, ...requests]));
      } catch (_) {}

      document.getElementById('borrowSuccessCode').textContent = request.id;
      document.getElementById('borrowSuccessBookTitle').textContent = `${book.title} (Cuốn: ${selectedCopyId})`;
      document.getElementById('borrowSuccessReaderName').textContent = reader.fullName;
      document.getElementById('borrowSuccessReaderCode').textContent = reader.id;
      document.getElementById('borrowSuccessDate').textContent = request.borrowDate;
      closeRegistration();

      const detailView = document.getElementById('catalogBookDetail');
      if (detailView?.style.display === 'block' && detailView.dataset.bookId === String(book.id)) {
        openCatalogBookDetail(book.id);
      } else {
        renderCatalogSearch(document.getElementById('globalSearchInput')?.value || book.title);
      }
      successModal.classList.add('active');
    } catch (error) {
      showToast('Chưa thể đăng ký mượn cuốn sách này. Hãy thử lại sau.', 'error');
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Xác nhận đăng ký mượn';
    }

  });
}

function openBorrowRegistration(bookId, preferredCopyId) {
  const modal = document.getElementById('modalBorrowRegistration');
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const book = [...databaseBooks, ...defaultBookTitles.filter(sample => !databaseBooks.some(item =>
    normalizeCatalogText(item.title) === normalizeCatalogText(sample.title)
  ))].find(item => String(item.id) === String(bookId));
  if (!book || !modal) return;

  const reader = getBorrowReaderProfile();
  activeBorrowBook = book;
  document.getElementById('borrowReaderName').value = reader.fullName;
  document.getElementById('borrowReaderGender').value = reader.gender;
  document.getElementById('borrowReaderDob').value = reader.dob;
  document.getElementById('borrowReaderCccd').value = reader.cccd;
  document.getElementById('borrowReaderAddress').value = reader.address;
  document.getElementById('borrowReaderPhone').value = reader.phone;
  document.getElementById('borrowReaderEmail').value = reader.email;
  document.getElementById('borrowReaderCode').textContent = reader.id;
  document.getElementById('borrowRequestBookTitle').textContent = book.title;
  document.getElementById('borrowRequestBookMeta').textContent = `Đầu sách: ${book.id} · ${book.category || book.genre || 'Chưa phân loại'}`;

  // Đổ danh sách các cuốn sách (bản sao) sẵn sàng vào select
  const copySelect = document.getElementById('borrowSelectCopy');
  if (copySelect) {
    let allCopies = [];
    try {
      allCopies = DataService.getAll(DataService.KEYS.BOOK_COPIES, typeof defaultBookCopies !== 'undefined' ? defaultBookCopies : []);
    } catch (_) {}
    const availableCopies = allCopies.filter(c => 
      String(c.bookId || c.bookTitleId) === String(book.id) &&
      !((c.circulationStatus || c.status || '').toUpperCase().includes('ĐANG MƯỢN') || (c.circulationStatus || c.status || '').toUpperCase().includes('DANG MUON') || (c.circulationStatus || c.status || '').toUpperCase().includes('KHÓA'))
    );

    if (availableCopies.length > 0) {
      copySelect.innerHTML = availableCopies.map(c => `
        <option value="${c.id}" ${preferredCopyId && String(c.id) === String(preferredCopyId) ? 'selected' : ''}>
          ${c.id} (${c.shelfLocation || c.location || 'Kệ A1 - Ngăn 1'}) - ${c.physicalStatus || c.physicalCondition || 'Tốt'}
        </option>
      `).join('');
    } else {
      copySelect.innerHTML = `<option value="${book.id}-01">${book.id}-01 (Kệ A1 - Ngăn 1) - Tốt</option>`;
    }
  }

  modal.classList.add('active');
}

function getSessionUser() {
  const defaults = {
    id: '220260004',
    fullName: 'Lưu Tấn Nin',
    name: 'Lưu Tấn Nin',
    readerType: 'Sinh viên'
  };
  try {
    const raw = sessionStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (_) {}
  return defaults;
}

function getBorrowReaderProfile() {
  const defaults = {
    id: '123456', fullName: 'Lưu Tấn Nin', name: 'Lưu Tấn Nin', gender: 'Nam',
    dob: '10 / 11 / 2006', cccd: 'ABC', address: 'Mỹ An, Tây Ninh',
    phone: '0363894957', email: 'luutannin@gmail.com'
  };
  try {
    const session = JSON.parse(localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user') || '{}');
    return { ...defaults, ...session, fullName: session.fullName || session.name || defaults.fullName };
  } catch (_) {
    return defaults;
  }
}

function getActiveBorrowBook() {
  const bookId = document.getElementById('catalogBookDetail')?.dataset.bookId;
  if (activeBorrowBook && (!bookId || String(activeBorrowBook.id) === String(bookId))) return activeBorrowBook;
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  return [...databaseBooks, ...defaultBookTitles].find(book => String(book.id) === String(bookId)) || null;
}

function initBookshelfPage() {
  const list = document.getElementById('bookshelfBookList');
  if (!list) return;

  const storageKey = 'ixs_library_personal_bookshelf';
  const initialShelf = [
    { bookId: 'DSIT0001', status: 'Đang đọc', currentPage: 240, totalPages: 320 },
    { bookId: 'SEED0001', status: 'Đang đọc', currentPage: 70, totalPages: 350 },
    { bookId: 'SEED0002', status: 'Chưa đọc', currentPage: 0, totalPages: 280 },
    { bookId: 'SEED0004', status: 'Đã đọc', currentPage: 350, totalPages: 350 }
  ];
  const searchInput = document.getElementById('bookshelfSearchInput');
  const statusFilter = document.getElementById('bookshelfStatusFilter');
  const addModal = document.getElementById('modalAddToBookshelf');
  const bookSelect = document.getElementById('bookshelfAddBookSelect');
  const addForm = document.getElementById('formAddToBookshelf');
  const addCover = document.getElementById('bookshelfAddBookCover');
  const addTitle = document.getElementById('bookshelfAddBookPreviewTitle');
  const addMeta = document.getElementById('bookshelfAddBookPreviewMeta');
  const editModal = document.getElementById('modalEditShelfEntry');
  const editForm = document.getElementById('formEditShelfEntry');
  let editingBookId = null;

  const BS_PAGE_SIZE = 4;
  let bsPage = 1;

  const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;

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

  function openCopiesModal(bookId) {
    const modal = document.getElementById('modalBookCopies');
    const title = document.getElementById('copiesModalTitle');
    const tbody = document.getElementById('copiesModalTableBody');
    if (!modal || !tbody) return;

    let copies = [];
    try {
      copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, typeof defaultBookCopies !== 'undefined' ? defaultBookCopies : []);
    } catch (_) {}
    const bookCopies = copies.filter(c => String(c.bookId || c.bookTitleId) === String(bookId));

    if (title) title.textContent = `DANH SÁCH BẢN SAO - ${bookId}`;

    if (!bookCopies.length) {
      tbody.innerHTML = `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 14px; font-weight: 600; color: #1D5D86;">${bookId}-01</td>
          <td style="padding: 10px 14px;">Kệ A1 - Ngăn 1</td>
          <td style="padding: 10px 14px;"><span class="badge status-badge badge-reader-valid">SẴN SÀNG</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 14px; font-weight: 600; color: #1D5D86;">${bookId}-02</td>
          <td style="padding: 10px 14px;">Kệ A1 - Ngăn 1</td>
          <td style="padding: 10px 14px;"><span class="badge status-badge badge-reader-valid">SẴN SÀNG</span></td>
        </tr>
      `;
    } else {
      tbody.innerHTML = bookCopies.map(c => {
        const isReady = (c.circulationStatus || c.status || '').toUpperCase().includes('SẴN SÀNG') || (c.circulationStatus || c.status || '').toUpperCase().includes('SAN SANG');
        const badgeClass = isReady ? 'badge-reader-valid' : 'badge-reader-locked';
        const statusText = c.circulationStatus || c.status || 'SẴN SÀNG';
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 14px; font-weight: 600; color: #1D5D86;">${c.id}</td>
            <td style="padding: 10px 14px;">${c.shelfLocation || c.location || 'Kệ A1 - Ngăn 1'}</td>
            <td style="padding: 10px 14px;"><span class="badge status-badge ${badgeClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }
    modal.classList.add('active');
  }

  const getShelf = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? initialShelf : JSON.parse(saved);
    } catch (_) {
      return initialShelf;
    }
  };
  const saveShelf = shelf => {
    localStorage.setItem(storageKey, JSON.stringify(shelf));
  };
  const getBooks = () => {
    const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
    return [...databaseBooks, ...defaultBookTitles.filter(sample => !databaseBooks.some(book =>
      normalizeCatalogText(book.title) === normalizeCatalogText(sample.title)
    ))];
  };

  function render() {
    const books = getBooks();
    const query = normalizeCatalogText(searchInput?.value);
    const status = statusFilter?.value || 'all';
    const entries = getShelf().map(entry => ({
      ...entry,
      book: books.find(book => String(book.id) === String(entry.bookId))
    })).filter(entry => entry.book)
      .filter(entry => !query || normalizeCatalogText(`${entry.book.title} ${entry.book.authors || entry.book.author}`).includes(query))
      .filter(entry => status === 'all' || entry.status === status);

    if (!entries.length) {
      list.innerHTML = '<div class="bookshelf-empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #64748B; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;">Không tìm thấy sách trong tủ của bạn.</div>';
      const pag = document.getElementById('bookshelfPagination');
      if (pag) pag.innerHTML = '';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(entries.length / BS_PAGE_SIZE));
    if (bsPage > totalPages) bsPage = totalPages;
    const start = (bsPage - 1) * BS_PAGE_SIZE;
    const pagedEntries = entries.slice(start, start + BS_PAGE_SIZE);

    let allCopies = [];
    try {
      allCopies = DataService.getAll(DataService.KEYS.BOOK_COPIES, typeof defaultBookCopies !== 'undefined' ? defaultBookCopies : []);
    } catch (_) {}

    list.innerHTML = pagedEntries.map(entry => {
      const book = entry.book;
      const totalPages = Number(entry.totalPages) || 0;
      const currentPage = Number(entry.currentPage) || 0;
      const progress = totalPages ? Math.min(100, Math.round(currentPage / totalPages * 100)) : 0;
      const progressLabel = totalPages
        ? `Trang ${currentPage} / ${totalPages} (${progress}%)`
        : 'Chưa cập nhật tiến độ';

      return `
        <div class="book-card" data-id="${escapeCatalogHtml(book.id)}">
          ${renderBookPosterGraphic(book.coverUrl, book.title)}
          <div class="book-card-info">
            <div class="book-card-row-2col">
              <div>
                <div class="book-meta-label">Mã đầu sách</div>
                <div class="book-meta-value">${escapeCatalogHtml(book.id || 'DSIT0001')}</div>
              </div>
              <div style="text-align: right;">
                <div class="book-meta-label">Trạng thái</div>
                <div style="margin-top: 2px;">
                  <span class="badge status-badge ${entry.status === 'Đã đọc' ? 'badge-reader-valid' : (entry.status === 'Đang đọc' ? 'badge-circ-borrowed' : 'badge-admin')}">${escapeCatalogHtml(entry.status || 'Đang đọc')}</span>
                </div>
              </div>
            </div>

            <div>
              <div class="book-meta-label">Tên sách, tác giả</div>
              <div class="book-title-main">${escapeCatalogHtml(book.title)}</div>
              <div class="book-author-sub">${escapeCatalogHtml(book.authors || book.author || 'Francisco Castillo, Korina Monoso')}</div>
            </div>

            <div class="book-card-row-2col">
              <div>
                <div class="book-meta-label">Nhà xuất bản</div>
                <div class="book-meta-value">${escapeCatalogHtml(book.publisher || 'Springer')}</div>
              </div>
              <div style="text-align: right;">
                <div class="book-meta-label">Thể loại</div>
                <div class="book-meta-value">${escapeCatalogHtml(book.category || 'Công nghệ thông tin')}</div>
              </div>
            </div>

            <div class="book-card-footer">
              <div>
                <div class="book-meta-label">Tiến độ đọc</div>
                <div class="book-stock-value" style="font-size: 13px; color: var(--primary-navy); font-weight: 600;">${progressLabel}</div>
              </div>
              <div class="book-card-actions">
                <span class="action-icon" title="Chỉnh sửa tiến độ đọc" data-shelf-action="edit" data-id="${escapeCatalogHtml(book.id)}">${ICON_EDIT}</span>
                <span class="action-icon" title="Xóa khỏi tủ sách" data-shelf-action="remove" data-id="${escapeCatalogHtml(book.id)}">${ICON_DELETE}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderDynamicPagination('bookshelfPagination', entries.length, BS_PAGE_SIZE, bsPage, (newPage) => {
      bsPage = newPage;
      render();
    });
  }

  function refreshAddOptions() {
    if (!bookSelect) return;
    const existingIds = new Set(getShelf().map(entry => String(entry.bookId)));
    const availableBooks = getBooks().filter(book => !existingIds.has(String(book.id)));
    bookSelect.innerHTML = availableBooks.length
      ? availableBooks.map(book => `<option value="${escapeCatalogHtml(book.id)}">${escapeCatalogHtml(book.title)}</option>`).join('')
      : '<option value="">Không còn sách để thêm</option>';
    const submit = addForm?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = availableBooks.length === 0;
    updateAddPreview();
  }

  function updateAddPreview() {
    const book = getBooks().find(item => String(item.id) === String(bookSelect?.value));
    if (!book) return;
    if (addCover) {
      addCover.src = book.coverUrl || '';
      addCover.alt = `Bìa ${book.title}`;
    }
    if (addTitle) addTitle.textContent = book.title;
    if (addMeta) addMeta.textContent = `${book.authors || book.author || 'Chưa cập nhật tác giả'} · Mã ${book.id}`;
  }

  searchInput?.addEventListener('input', () => { bsPage = 1; render(); });
  statusFilter?.addEventListener('change', () => { bsPage = 1; render(); });
  bookSelect?.addEventListener('change', updateAddPreview);

  document.getElementById('btnOpenAddToBookshelf')?.addEventListener('click', () => {
    refreshAddOptions();
    const dateInput = document.getElementById('bookshelfAddDate');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    addModal?.classList.add('active');
  });

  const closeAddModal = () => addModal?.classList.remove('active');
  document.getElementById('btnCloseAddToBookshelf')?.addEventListener('click', closeAddModal);
  document.getElementById('btnCancelAddToBookshelf')?.addEventListener('click', closeAddModal);
  addModal?.addEventListener('click', event => {
    if (event.target === addModal) closeAddModal();
  });

  const closeEditModal = () => editModal?.classList.remove('active');
  document.getElementById('btnCloseEditShelfEntry')?.addEventListener('click', closeEditModal);
  document.getElementById('btnCancelEditShelfEntry')?.addEventListener('click', closeEditModal);
  editModal?.addEventListener('click', event => {
    if (event.target === editModal) closeEditModal();
  });

  // Modal bản sao
  const modalCopies = document.getElementById('modalBookCopies');
  const closeCopies = () => modalCopies?.classList.remove('active');
  document.getElementById('btnCloseCopiesModal')?.addEventListener('click', closeCopies);
  document.getElementById('btnExitCopiesModal')?.addEventListener('click', closeCopies);
  modalCopies?.addEventListener('click', (e) => {
    if (e.target === modalCopies) closeCopies();
  });

  addForm?.addEventListener('submit', event => {
    event.preventDefault();
    const book = getBooks().find(item => String(item.id) === String(bookSelect?.value));
    if (!book) return;
    saveShelf([...getShelf(), {
      bookId: book.id,
      status: 'Chưa đọc',
      currentPage: 0,
      totalPages: 0,
      addedAt: document.getElementById('bookshelfAddDate')?.value || new Date().toISOString().slice(0, 10),
      note: document.getElementById('bookshelfAddNote')?.value || ''
    }]);
    closeAddModal();
    render();
    showToast('Đã thêm sách vào tủ cá nhân.', 'success');
  });

  list.addEventListener('click', event => {
    // 1. Xem các bản sao
    const copiesBtn = event.target.closest('[data-action="view-copies"]');
    if (copiesBtn) {
      const bookId = copiesBtn.dataset.id;
      if (bookId) openCopiesModal(bookId);
      return;
    }

    // 2. Sửa tiến độ / Xóa khỏi tủ
    const actionButton = event.target.closest('[data-shelf-action]');
    if (!actionButton) return;
    const card = actionButton.closest('.book-card');
    const bookId = actionButton.dataset.id || card?.dataset.id;
    if (!bookId) return;

    const shelf = getShelf();
    if (actionButton.dataset.shelfAction === 'edit') {
      const entry = shelf.find(item => String(item.bookId) === bookId);
      const book = getBooks().find(item => String(item.id) === bookId);
      if (!entry || !book || !editModal) return;
      editingBookId = bookId;
      document.getElementById('editShelfBookTitle').textContent = book.title;
      document.getElementById('editShelfStatus').value = entry.status || 'Chưa đọc';
      document.getElementById('editShelfCurrentPage').value = Number(entry.currentPage) || 0;
      document.getElementById('editShelfTotalPages').value = Number(entry.totalPages) || 0;
      editModal.classList.add('active');
      return;
    }

    if (actionButton.dataset.shelfAction === 'remove') {
      const book = getBooks().find(item => String(item.id) === bookId);
      if (!window.confirm(`Xóa “${book?.title || 'sách này'}” khỏi tủ sách cá nhân?`)) return;
      saveShelf(shelf.filter(entry => String(entry.bookId) !== bookId));
      render();
    }
  });

  editForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!editingBookId) return;
    const totalPages = Math.max(0, Number(document.getElementById('editShelfTotalPages').value) || 0);
    let currentPage = Math.max(0, Number(document.getElementById('editShelfCurrentPage').value) || 0);
    const status = document.getElementById('editShelfStatus').value;
    currentPage = totalPages ? Math.min(currentPage, totalPages) : currentPage;
    if (status === 'Đã đọc' && totalPages) currentPage = totalPages;
    saveShelf(getShelf().map(entry => String(entry.bookId) === editingBookId
      ? { ...entry, status, currentPage, totalPages }
      : entry));
    closeEditModal();
    render();
    showToast('Đã cập nhật tiến độ đọc.', 'success');
  });

  Promise.resolve(DataService.ready).catch(() => {}).then(render);
}

function initReaderHistoryPage() {
  const rows = document.getElementById('readerHistoryRows');
  if (!rows) return;

  const summary = document.getElementById('historyPageSummary');
  let currentFilter = 'Tất cả';

  const normalizeStatus = st => {
    const s = String(st || '').toLowerCase().trim();
    if (s.includes('đang mượn') || s.includes('dang muon') || s.includes('borrowing')) return 'Đang mượn';
    if (s.includes('đã trả') || s.includes('da tra') || s.includes('returned')) return 'Đã trả';
    if (s.includes('quá hạn') || s.includes('qua han') || s.includes('overdue')) return 'Quá hạn';
    return st || 'Đang mượn';
  };

  const render = (status) => {
    if (status) currentFilter = status;
    const historyList = (typeof getReaderHistory === 'function' ? getReaderHistory() : []).map(item => ({
      id: item.id || item.loanId || item.code || 'PM001',
      copyId: item.copyId || item.bookCopyId || item.macuonsach || '—',
      borrowDate: item.borrowDate || '—',
      title: item.bookTitle || item.title || 'Sách mượn',
      dueDate: item.dueDate || '—',
      status: normalizeStatus(item.status),
      renewed: item.renewed || false
    }));

    const filtered = currentFilter === 'Tất cả' ? historyList : historyList.filter(item => item.status === currentFilter);
    rows.innerHTML = filtered.length ? filtered.map(item => {
      const canRenew = item.status === 'Đang mượn' && !item.renewed;
      const renewBtn = canRenew
        ? `<button type="button" class="btn-profile-primary" data-renew-loan-id="${escapeCatalogHtml(item.id)}" style="padding: 4px 10px; font-size: 12px; height: auto; border-radius: 4px;">Gia hạn</button>`
        : `<span style="font-size: 12px; color: #94A3B8;">—</span>`;
      return `<tr>
        <td style="font-weight: 600; color: #1D5D86;">${escapeCatalogHtml(item.id)}</td>
        <td style="font-weight: 600; color: #0284C7;">${escapeCatalogHtml(item.copyId)}</td>
        <td class="history-book-name">${escapeCatalogHtml(item.title)}</td>
        <td>${escapeCatalogHtml(item.borrowDate)}</td>
        <td>${escapeCatalogHtml(item.dueDate)}</td>
        <td class="history-status-text">${escapeCatalogHtml(item.status)}</td>
        <td style="text-align: center;">${renewBtn}</td>
      </tr>`;
    }).join('') : '<tr><td class="workflow-empty-cell" colspan="7">Không có lượt mượn nào trong trạng thái này.</td></tr>';
    if (summary) summary.textContent = filtered.length ? `Hiển thị 1 - ${filtered.length} trên tổng số ${filtered.length} phiếu` : 'Không có phiếu mượn';
  };

  document.querySelectorAll('[data-history-status]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-history-status]').forEach(item => item.classList.toggle('active', item === button));
      render(button.dataset.historyStatus);
    });
  });

  rows.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-renew-loan-id]');
    if (!btn) return;
    const loanId = btn.getAttribute('data-renew-loan-id');
    const renewalId = `GH-${Date.now().toString().slice(-6)}`;
    const renItem = {
      id: renewalId,
      loanId: loanId,
      requestDate: new Date().toLocaleDateString('vi-VN'),
      days: 7,
      status: 'CHO DUYET'
    };
    let renewals = [];
    try {
      const raw = localStorage.getItem('ixs_library_renewals');
      if (raw) renewals = JSON.parse(raw);
    } catch (_) {}
    renewals = [renItem, ...renewals.filter(r => r.id !== renewalId)];
    localStorage.setItem('ixs_library_renewals', JSON.stringify(renewals));
    window.dispatchEvent(new CustomEvent('ixs:data-changed', { detail: { key: 'ixs_library_renewals' } }));

    try {
      await DataService.request('POST', '/renewals', {
        id: renewalId,
        loanId: loanId,
        requestDate: new Date().toISOString().slice(0, 10),
        days: 7,
        status: 'CHO DUYET'
      });
      showToast(`Đã gửi yêu cầu gia hạn cho phiếu mượn ${loanId}. Chờ thủ thư phê duyệt!`, 'success');
      btn.disabled = true;
      btn.textContent = 'Đã gửi';
      btn.style.opacity = '0.7';
    } catch (err) {
      showToast(`Đã ghi nhận yêu cầu gia hạn phiếu mượn ${loanId} (Chờ duyệt).`, 'success');
      btn.disabled = true;
      btn.textContent = 'Đã gửi';
    }
  });

  const activeBtn = document.querySelector('[data-history-status].active');
  render(activeBtn ? activeBtn.dataset.historyStatus : 'Tất cả');

  Promise.resolve(DataService.ready).catch(() => {}).then(() => {
    render();
  });
  window.addEventListener('ixs:data-loaded', event => {
    if (event.detail?.key === DataService.KEYS.READER_HISTORY) render();
  });
}

function initPaymentPage() {
  const debtList = document.getElementById('paymentDebtList');
  const detailView = document.getElementById('paymentDetailView');
  const backButton = document.getElementById('btnBackToPaymentDebts');
  const receiptToggle = document.getElementById('btnTogglePaymentBreakdown');
  const breakdown = document.getElementById('paymentBreakdown');
  const modal = document.getElementById('modalPaymentNotice');
  const button = document.getElementById('btnSubmitPayment');
  const container = document.getElementById('paymentDebtItemsContainer');
  const summaryCount = document.getElementById('paymentSummaryCount');
  const summaryTotal = document.getElementById('paymentSummaryTotal');
  const paymentTotal = document.getElementById('paymentTotal');
  if (!debtList || !detailView) return;

  const renderFines = () => {
    const fines = (typeof getFines === 'function' ? getFines() : []).filter(item => {
      const st = String(item.paymentStatus || '').toLowerCase();
      return !st.includes('đã thanh toán') && !st.includes('da thanh toan') && !st.includes('paid');
    });

    const total = fines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const formattedTotal = `${total.toLocaleString('vi-VN')} VND`;

    if (summaryCount) summaryCount.textContent = fines.length ? `${fines.length} khoản nợ chưa thanh toán` : 'Khoản nợ chưa thanh toán';
    if (summaryTotal) summaryTotal.textContent = fines.length ? `${fines.length} khoản · ${formattedTotal}` : '0 VND';
    if (paymentTotal) paymentTotal.textContent = formattedTotal;

    if (!fines.length) {
      if (container) {
        container.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: var(--text-muted, #64748B); font-size: 15px;">Bạn hiện không có khoản nợ hay phí phạt nào chưa thanh toán.</div>';
      }
      if (breakdown) {
        breakdown.innerHTML = '<div style="padding: 12px; color: var(--text-muted, #64748B);">Không có khoản nợ chi tiết nào.</div>';
      }
      return;
    }

    if (container) {
      container.innerHTML = fines.map(item => {
        const title = item.violation || 'Phí vi phạm thư viện';
        const dateStr = item.ngayLap || item.createdDate || item.date || '15/11/2026';
        const sub = item.bookTitle ? `${item.bookTitle} · Ngày lập: ${dateStr}` : `Phiếu: ${item.id} · Ngày lập: ${dateStr}`;
        const amt = `${Number(item.amount || 0).toLocaleString('vi-VN')} VND`;
        return `
          <button type="button" class="payment-debt-item" data-open-payment-detail>
            <span class="payment-debt-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18.6A1.6 1.6 0 0 0 3.2 21h17.6a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></span>
            <span class="payment-debt-copy"><strong>${escapeCatalogHtml(title)}</strong><small>${escapeCatalogHtml(sub)}</small><span class="payment-debt-due">Chưa thanh toán</span></span>
            <strong class="payment-debt-amount">${escapeCatalogHtml(amt)}</strong>
            <svg class="payment-debt-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        `;
      }).join('');

      container.querySelectorAll('[data-open-payment-detail]').forEach(debt => {
        debt.addEventListener('click', () => {
          debtList.hidden = true;
          detailView.hidden = false;
          document.body.classList.add('payment-detail-open');
        });
      });
    }

    if (breakdown) {
      breakdown.innerHTML = fines.map(item => {
        const title = item.violation || (item.bookTitle ? `Phí phạt: ${item.bookTitle}` : `Khoản phạt ${item.id}`);
        const amt = `${Number(item.amount || 0).toLocaleString('vi-VN')} VND`;
        return `<div><span>${escapeCatalogHtml(title)}</span><strong>${escapeCatalogHtml(amt)}</strong></div>`;
      }).join('');
    }
  };

  backButton?.addEventListener('click', () => {
    detailView.hidden = true;
    debtList.hidden = false;
    document.body.classList.remove('payment-detail-open');
  });
  receiptToggle?.addEventListener('click', () => {
    if (!breakdown) return;
    breakdown.hidden = !breakdown.hidden;
    receiptToggle.setAttribute('aria-expanded', String(!breakdown.hidden));
  });

  if (modal && button) {
    const close = () => modal.classList.remove('active');
    document.getElementById('btnClosePaymentNotice')?.addEventListener('click', close);
    document.getElementById('btnConfirmPaymentNotice')?.addEventListener('click', close);
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    button.addEventListener('click', () => {
      document.getElementById('paymentNoticeText').textContent = 'Cổng thanh toán VietQR/Napas247 chưa được kết nối. Vui lòng liên hệ quầy thư viện để hoàn tất thanh toán.';
      modal.classList.add('active');
    });
  }

  renderFines();
  Promise.resolve(DataService.ready).catch(() => {}).then(() => {
    renderFines();
  });
  window.addEventListener('ixs:data-loaded', event => {
    if (event.detail?.key === DataService.KEYS.FINES) renderFines();
  });
}

function initSuggestionsPage() {
  const rows = document.getElementById('suggestionRows');
  if (!rows) return;

  const modal = document.getElementById('modalCreateSuggestion');
  const form = document.getElementById('formCreateSuggestion');
  const coverInput = document.getElementById('suggestionCover');
  const coverPreview = document.getElementById('suggestionCoverPreview');
  const coverPrompt = document.getElementById('suggestionCoverPrompt');
  const search = document.getElementById('suggestionSearch');
  let coverData = '';

  const getSuggestions = () => {
    return typeof getBookSuggestions === 'function' ? getBookSuggestions() : [];
  };

  const render = () => {
    const query = normalizeCatalogText(search?.value);
    const suggestions = getSuggestions().filter(item => !query || normalizeCatalogText(`${item.id} ${item.title}`).includes(query));
    rows.innerHTML = suggestions.length ? suggestions.map(item => {
      const st = String(item.status || '').toLowerCase();
      const statusClass = (st.includes('đã duyệt') || st.includes('da duyet')) ? 'suggestion-approved' : (st.includes('từ chối') || st.includes('tu choi')) ? 'suggestion-rejected' : 'suggestion-pending';
      return `<tr><td>${escapeCatalogHtml(item.id)}</td><td><strong>${escapeCatalogHtml(item.title)}</strong><small>${escapeCatalogHtml(item.type || 'Sách / giáo trình')}</small></td><td>${escapeCatalogHtml(item.author || 'Chưa cập nhật')}</td><td>${escapeCatalogHtml(item.year || '—')} · ${escapeCatalogHtml(item.quantity || '—')}</td><td><span class="suggestion-status ${statusClass}">${escapeCatalogHtml(item.status || 'Chờ duyệt')}</span></td><td><button type="button" class="user-action-icon" title="Xem chi tiết" aria-label="Xem đề xuất ${escapeCatalogHtml(item.title)}" data-suggestion-id="${escapeCatalogHtml(item.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg></button></td></tr>`;
    }).join('') : '<tr><td class="workflow-empty-cell" colspan="6">Chưa có đề xuất nào được gửi.</td></tr>';
    const summary = document.getElementById('suggestionSummary');
    if (summary) summary.textContent = suggestions.length ? `Hiển thị 1 - ${suggestions.length} trên tổng số ${suggestions.length} đề xuất` : 'Không có đề xuất';
  };
  const closeModal = () => modal?.classList.remove('active');
  const resetCover = () => {
    coverData = '';
    coverInput.value = '';
    coverPreview.src = '';
    coverPreview.hidden = true;
    coverPrompt.hidden = false;
  };

  document.getElementById('btnOpenSuggestionForm')?.addEventListener('click', () => modal?.classList.add('active'));
  document.getElementById('btnCloseSuggestionForm')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelSuggestionForm')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  search?.addEventListener('input', render);
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-suggestion-id]');
    if (!button) return;
    const suggestion = getSuggestions().find(item => item.id === button.dataset.suggestionId);
    if (suggestion) showToast(suggestion.reason || `Trạng thái đề xuất: ${suggestion.status}`, 'info');
  });
  coverInput?.addEventListener('change', () => {
    const file = coverInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      coverInput.value = '';
      showToast('Ảnh bìa không được vượt quá 5 MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      coverData = String(reader.result || '');
      coverPreview.src = coverData;
      coverPreview.hidden = false;
      coverPrompt.hidden = true;
    });
    reader.readAsDataURL(file);
  });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const session = getSessionUser();
    const now = new Date();
    const suggestion = {
      id: `DX-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`,
      readerId: session.id || '220260004',
      title: document.getElementById('suggestionTitle').value.trim(),
      author: document.getElementById('suggestionAuthor').value.trim(),
      publisher: document.getElementById('suggestionPublisher').value.trim(),
      year: document.getElementById('suggestionYear').value,
      quantity: document.getElementById('suggestionQuantity').value ? `${document.getElementById('suggestionQuantity').value} bản` : '—',
      edition: document.getElementById('suggestionEdition').value,
      isbn: document.getElementById('suggestionIsbn').value.trim(),
      reason: document.getElementById('suggestionReason').value.trim(),
      coverUrl: coverData,
      status: 'Chờ duyệt',
      type: 'Sách / giáo trình'
    };
    try {
      const current = getSuggestions();
      if (typeof saveBookSuggestions === 'function') {
        saveBookSuggestions([suggestion, ...current]);
      }
    } catch (_) {
      showToast('Không thể lưu đề xuất sách.', 'error');
      return;
    }
    form.reset();
    resetCover();
    closeModal();
    render();
    showToast('Đã gửi đề xuất sách thành công và lưu vào hệ thống!', 'success');
  });

  render();
  Promise.resolve(DataService.ready).catch(() => {}).then(() => {
    render();
  });
  window.addEventListener('ixs:data-loaded', event => {
    if (event.detail?.key === DataService.KEYS.SUGGESTIONS) render();
  });
}

function escapeCatalogHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function borrowedCopies(bookId, copies) {
  return copies.filter(copy => String(copy.bookId || copy.bookTitleId) === String(bookId)
    && normalizeCatalogText(copy.circulationStatus || copy.status).includes('dang muon')).length;
}

/**
 * 8. Chuông thông báo
 */
function initNotifications() {
  const btnNotif = document.getElementById('btnNotification');
  if (btnNotif) {
    btnNotif.addEventListener('click', () => {
      showToast('Bạn có 2 thông báo mới từ thư viện!', 'info');
    });
  }
}

/**
 * 9. Xử lý Đăng xuất
 */
function initLogoutActions() {
  const btnLogout = document.getElementById('btnUserLogout');
  if (!btnLogout) return;

  btnLogout.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      localStorage.removeItem('ixs_library_session');
      localStorage.removeItem('ixs_library_current_user');
      window.location.href = '../login.html';
    }
  });
}

/**
 * Toast Notification Helper (Đồng bộ admin.css)
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;cursor:pointer;color:inherit;font-size:16px;line-height:1;" aria-label="Đóng">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3500);
}
