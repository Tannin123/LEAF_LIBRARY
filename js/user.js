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
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
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

  const btnChangePass = document.getElementById('btnOpenChangePassword');
  if (btnChangePass) {
    btnChangePass.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
      showToast('Tính năng Đổi mật khẩu đang cập nhật!', 'info');
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

  // Bấm "LƯU" -> Lưu thông tin vào session và cập nhật giao diện
  if (btnSave) {
    btnSave.addEventListener('click', () => {
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

      localStorage.setItem('ixs_library_session', JSON.stringify(session));
      localStorage.setItem('ixs_library_current_user', JSON.stringify(session));

      // Cập nhật lại giao diện người dùng
      initUserSession();

      modal.classList.remove('active');
      openUserProfileModal();
      showToast('Đã lưu thay đổi thông tin cá nhân thành công!', 'success');
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
  const authorFilter = document.getElementById('filterAuthor');
  const selectedCategory = categoryFilter?.selectedIndex > 0 ? categoryFilter.selectedOptions[0].textContent : '';
  const selectedAuthor = authorFilter?.selectedIndex > 0 ? authorFilter.selectedOptions[0].textContent : '';
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
    const matchesCategory = !selectedCategory || normalizeCatalogText(`${book.category || ''} ${book.genre || ''}`).includes(normalizeCatalogText(selectedCategory));
    const matchesAuthor = !selectedAuthor || normalizeCatalogText(book.authors || book.author || '').includes(normalizeCatalogText(selectedAuthor));
    return matchesQuery && matchesCategory && matchesAuthor;
  });

  const sortBy = document.getElementById('filterSort')?.value;
  if (sortBy === 'az') results.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi'));
  if (sortBy === 'newest') results.sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), 'vi'));
  if (sortBy === 'popular') {
    results.sort((a, b) => borrowedCopies(b.id, copies) - borrowedCopies(a.id, copies));
  }

  const totalPages = Math.ceil(results.length / CATALOG_PAGE_SIZE);
  catalogCurrentPage = Math.max(1, Math.min(catalogCurrentPage, totalPages || 1));
  const pageResults = results.slice((catalogCurrentPage - 1) * CATALOG_PAGE_SIZE, catalogCurrentPage * CATALOG_PAGE_SIZE);
  const hasFilters = Boolean(searchTerms.length || selectedCategory || selectedAuthor);
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
        <div class="catalog-detail-row"><span>Mã ISBN</span><strong>${escapeCatalogHtml(book.isbn13 || book.isbn || 'Chưa cập nhật')}</strong></div>
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
    const databaseBook = DataService.getAll(DataService.KEYS.BOOK_TITLES, [])
      .find(item => String(item.id) === String(book.id));
    if (!databaseBook) {
      showToast('Không tìm thấy đầu sách trong cơ sở dữ liệu. Vui lòng tải lại trang.', 'error');
      return;
    }
    if (Number(databaseBook.available ?? databaseBook.availableCopies ?? 0) < 1) {
      showToast('Sách đã hết bản sẵn có.', 'warning');
      return;
    }

    const now = new Date();
    const request = {
      id: `DKM-${now.getFullYear()}-${now.getTime()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      bookId: book.id,
      bookTitle: book.title,
      readerId: reader.id,
      readerName: reader.fullName,
      requestDate: now.toISOString(),
      status: 'Chờ thủ thư xác nhận'
    };

    confirmButton.disabled = true;
    confirmButton.textContent = 'Đang xử lý...';
    try {
      const reservation = await DataService.request(
        'POST',
        `/bookTitles/${encodeURIComponent(book.id)}/reserve`,
        { requestId: request.id, readerId: reader.id }
      );
      request.copyId = reservation.copyId;
      try {
        const requests = JSON.parse(localStorage.getItem('ixs_library_borrow_requests') || '[]');
        localStorage.setItem('ixs_library_borrow_requests', JSON.stringify([request, ...requests]));
      } catch (_) {}

      await Promise.all([
        DataService.hydrate(DataService.KEYS.BOOK_TITLES, 'bookTitles'),
        DataService.hydrate(DataService.KEYS.BOOK_COPIES, 'bookCopies')
      ]);

      document.getElementById('borrowSuccessCode').textContent = request.id;
      document.getElementById('borrowSuccessBookTitle').textContent = `${book.title} (${book.id})`;
      document.getElementById('borrowSuccessReaderName').textContent = reader.fullName;
      document.getElementById('borrowSuccessReaderCode').textContent = reader.id;
      document.getElementById('borrowSuccessDate').textContent = new Intl.DateTimeFormat('vi-VN').format(now);
      closeRegistration();

      const detailView = document.getElementById('catalogBookDetail');
      if (detailView?.style.display === 'block' && detailView.dataset.bookId === String(book.id)) {
        openCatalogBookDetail(book.id);
      } else {
        renderCatalogSearch(document.getElementById('globalSearchInput')?.value || book.title);
      }
      successModal.classList.add('active');
    } catch (error) {
      const message = error.status === 409
        ? 'Không còn bản sao sẵn sàng để mượn.'
        : 'Chưa thể đăng ký mượn. Hãy thử lại sau.';
      showToast(message, 'error');
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Xác nhận đăng ký mượn';
    }

  });
}

function openBorrowRegistration(bookId) {
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
  document.getElementById('borrowRequestBookMeta').textContent = `Mã sách: ${book.id} · ${book.category || book.genre || 'Chưa phân loại'}`;
  modal.classList.add('active');
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
    { bookId: 'SEED0001', status: 'Đang đọc', currentPage: 240, totalPages: 320 },
    { bookId: 'SEED0004', status: 'Đang đọc', currentPage: 70, totalPages: 350 }
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
      list.innerHTML = '<div class="bookshelf-empty-state">Không tìm thấy sách trong tủ của bạn.</div>';
      return;
    }

    list.innerHTML = entries.map(entry => {
      const book = entry.book;
      const totalPages = Number(entry.totalPages) || 0;
      const currentPage = Number(entry.currentPage) || 0;
      const progress = totalPages ? Math.min(100, Math.round(currentPage / totalPages * 100)) : 0;
      const cover = book.coverUrl
        ? `<img src="${escapeCatalogHtml(book.coverUrl)}" alt="Bìa ${escapeCatalogHtml(book.title)}">`
        : '<span class="catalog-cover-fallback">LEAF</span>';
      const progressLabel = totalPages
        ? `Trang ${currentPage} / ${totalPages} (${progress}%)`
        : 'Chưa cập nhật tiến độ đọc';
      const statusClass = entry.status === 'Đã đọc' ? 'is-read' : entry.status === 'Đang đọc' ? 'is-reading' : 'is-unread';

      return `<article class="bookshelf-book-card">
        <div class="bookshelf-book-cover">${cover}</div>
        <div class="bookshelf-book-info">
          <div class="bookshelf-book-tags"><span class="bookshelf-status-tag ${statusClass}">${escapeCatalogHtml(entry.status)}</span><span class="bookshelf-book-code">Mã: ${escapeCatalogHtml(book.id)}</span></div>
          <h2>${escapeCatalogHtml(book.title)}</h2>
          <p>Tác giả: ${escapeCatalogHtml(book.authors || book.author || 'Chưa cập nhật')}</p>
          <div class="bookshelf-progress-track"><span style="width: ${progress}%"></span></div>
          <span class="bookshelf-progress-label">${progressLabel}</span>
        </div>
        <div class="bookshelf-card-actions user-actions-group">
          <a class="user-action-icon" href="catalog.html?search=${encodeURIComponent(book.title)}" title="Xem chi tiết" aria-label="Xem chi tiết ${escapeCatalogHtml(book.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg></a>
          <button type="button" class="user-action-icon" data-shelf-action="edit" title="Chỉnh sửa tiến độ" aria-label="Chỉnh sửa tiến độ ${escapeCatalogHtml(book.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
          <button type="button" class="user-action-icon is-danger" data-shelf-action="remove" title="Xóa khỏi tủ" aria-label="Xóa ${escapeCatalogHtml(book.title)} khỏi tủ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg></button>
          <span class="bookshelf-entry-id" hidden>${escapeCatalogHtml(book.id)}</span>
        </div>
      </article>`;
    }).join('');
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

  searchInput?.addEventListener('input', render);
  statusFilter?.addEventListener('change', render);
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
    const actionButton = event.target.closest('[data-shelf-action]');
    if (!actionButton) return;
    const card = actionButton.closest('.bookshelf-book-card');
    const bookId = card?.querySelector('.bookshelf-entry-id')?.textContent;
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

  const history = [
    { borrowDate: '10/10/2024', title: 'Clean Code', dueDate: '30/10/2024', status: 'Đang mượn' },
    { borrowDate: '05/09/2024', title: 'Design Patterns', dueDate: '25/09/2024', status: 'Đã trả' },
    { borrowDate: '12/08/2024', title: 'Dune', dueDate: '01/09/2024', status: 'Đã trả' },
    { borrowDate: '02/08/2024', title: 'Atomic Habits', dueDate: '22/08/2024', status: 'Quá hạn' }
  ];
  const summary = document.getElementById('historyPageSummary');
  const render = status => {
    const filtered = status === 'Tất cả' ? history : history.filter(item => item.status === status);
    rows.innerHTML = filtered.length ? filtered.map(item => {
      return `<tr><td>${escapeCatalogHtml(item.borrowDate)}</td><td class="history-book-name">${escapeCatalogHtml(item.title)}</td><td>${escapeCatalogHtml(item.dueDate)}</td><td class="history-status-text">${escapeCatalogHtml(item.status)}</td></tr>`;
    }).join('') : '<tr><td class="workflow-empty-cell" colspan="4">Không có lượt mượn nào trong trạng thái này.</td></tr>';
    if (summary) summary.textContent = filtered.length ? `Hiển thị 1 - ${filtered.length} trên tổng số ${filtered.length} phiếu` : 'Không có phiếu mượn';
  };

  document.querySelectorAll('[data-history-status]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-history-status]').forEach(item => item.classList.toggle('active', item === button));
      render(button.dataset.historyStatus);
    });
  });
  render(document.querySelector('[data-history-status].active')?.dataset.historyStatus || 'Đang mượn');
}

function initPaymentPage() {
  const debtList = document.getElementById('paymentDebtList');
  const detailView = document.getElementById('paymentDetailView');
  const backButton = document.getElementById('btnBackToPaymentDebts');
  const receiptToggle = document.getElementById('btnTogglePaymentBreakdown');
  const breakdown = document.getElementById('paymentBreakdown');
  const modal = document.getElementById('modalPaymentNotice');
  const button = document.getElementById('btnSubmitPayment');
  if (!debtList || !detailView) return;

  document.querySelectorAll('[data-open-payment-detail]').forEach(debt => {
    debt.addEventListener('click', () => {
      debtList.hidden = true;
      detailView.hidden = false;
      document.body.classList.add('payment-detail-open');
    });
  });
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

  if (!modal || !button) return;
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

function initSuggestionsPage() {
  const rows = document.getElementById('suggestionRows');
  if (!rows) return;

  const storageKey = 'ixs_library_book_suggestions';
  const initialSuggestions = [
    { id: 'DX-2024-001', title: 'Pattern Recognition and Machine Learning', author: 'Christopher M. Bishop / Springer', year: '2022', quantity: '50 bản', status: 'Chờ duyệt' },
    { id: 'DX-2024-002', title: 'Data Science from Scratch: First Principles', author: "Joel Grus / O’Reilly Media", year: '2023', quantity: '30 bản', status: 'Đã duyệt' },
    { id: 'DX-2024-003', title: "Web Application Security: Beginner's Guide", author: 'Andrew Hoffman / O’Reilly', year: '2020', quantity: '10 bản', status: 'Từ chối' }
  ];
  const modal = document.getElementById('modalCreateSuggestion');
  const form = document.getElementById('formCreateSuggestion');
  const coverInput = document.getElementById('suggestionCover');
  const coverPreview = document.getElementById('suggestionCoverPreview');
  const coverPrompt = document.getElementById('suggestionCoverPrompt');
  const search = document.getElementById('suggestionSearch');
  let coverData = '';

  const getSuggestions = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? initialSuggestions : JSON.parse(saved);
    } catch (_) {
      return initialSuggestions;
    }
  };
  const render = () => {
    const query = normalizeCatalogText(search?.value);
    const suggestions = getSuggestions().filter(item => !query || normalizeCatalogText(`${item.id} ${item.title}`).includes(query));
    rows.innerHTML = suggestions.length ? suggestions.map(item => {
      const statusClass = item.status === 'Đã duyệt' ? 'suggestion-approved' : item.status === 'Từ chối' ? 'suggestion-rejected' : 'suggestion-pending';
      return `<tr><td>${escapeCatalogHtml(item.id)}</td><td><strong>${escapeCatalogHtml(item.title)}</strong><small>${escapeCatalogHtml(item.type || 'Sách / giáo trình')}</small></td><td>${escapeCatalogHtml(item.author || 'Chưa cập nhật')}</td><td>${escapeCatalogHtml(item.year || '—')} · ${escapeCatalogHtml(item.quantity || '—')}</td><td><span class="suggestion-status ${statusClass}">${escapeCatalogHtml(item.status)}</span></td><td><button type="button" class="user-action-icon" title="Xem chi tiết" aria-label="Xem đề xuất ${escapeCatalogHtml(item.title)}" data-suggestion-id="${escapeCatalogHtml(item.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg></button></td></tr>`;
    }).join('') : '<tr><td class="workflow-empty-cell" colspan="6">Không tìm thấy đề xuất phù hợp.</td></tr>';
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
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const now = new Date();
    const suggestion = {
      id: `DX-${now.getFullYear()}-${String(now.getTime()).slice(-3)}`,
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
      localStorage.setItem(storageKey, JSON.stringify([suggestion, ...getSuggestions()]));
    } catch (_) {
      showToast('Không thể lưu đề xuất trên thiết bị này.', 'error');
      return;
    }
    form.reset();
    resetCover();
    closeModal();
    render();
    showToast('Đã ghi nhận đề xuất sách mới.', 'success');
  });

  render();
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
