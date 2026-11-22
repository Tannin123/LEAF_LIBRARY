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
const CATALOG_PAGE_SIZE = 4;

document.addEventListener('DOMContentLoaded', () => {
  if (!DataService.session().token && !location.pathname.endsWith('/catalog.html')) { location.replace('../login.html'); return; }
  // PHÂN QUYỀN TRUY CẬP: Đảm bảo độc giả truy cập trang user
  let rawSession = null;
  try {
    const raw = sessionStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) rawSession = JSON.parse(raw);
  } catch (_) {}

  if (rawSession && rawSession.accountType === 'employee') {
    const main = document.querySelector('main.content-section');
    if (main && !document.getElementById('employeeNoticeBanner')) {
      const banner = document.createElement('div');
      banner.id = 'employeeNoticeBanner';
      banner.className = 'data-status-banner';
      banner.innerHTML = '<span>Bạn đang đăng nhập bằng tài khoản Nhân viên/Quản trị viên ở giao diện Bạn đọc.</span>';
      const goAdmin = document.createElement('a');
      goAdmin.href = '../admin/index.html';
      goAdmin.className = 'data-status-banner-btn';
      goAdmin.textContent = 'Chuyển sang trang Quản trị';
      banner.appendChild(goAdmin);
      main.prepend(banner);
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
  initGlobalEscapeAndOfflineBanner();
});

function initGlobalEscapeAndOfflineBanner() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'));
    if (!activeModals.length) return;
    const topModal = activeModals[activeModals.length - 1];
    const closeTrigger = topModal.querySelector('.user-modal-close-btn, .library-card-modal-close, .btn-close-modal, [data-dismiss-modal]');
    if (closeTrigger) closeTrigger.click();
    else topModal.classList.remove('active');
  });

  const showOfflineBanner = (message) => {
    const main = document.querySelector('main.content-section');
    if (!main || document.getElementById('userOfflineBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'userOfflineBanner';
    banner.className = 'data-status-banner is-error';
    const text = document.createElement('span');
    text.textContent = message || 'Không thể kết nối đến máy chủ dữ liệu. Một số thay đổi có thể chưa được đồng bộ.';
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'data-status-banner-btn';
    retryBtn.textContent = 'Thử kết nối lại';
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Đang kiểm tra...';
      try {
        await DataService.request('GET', '/health');
        DataService.init();
        await DataService.ready;
        banner.remove();
        showToast('Đã khôi phục kết nối máy chủ dữ liệu!', 'success');
      } catch (_) {
        retryBtn.disabled = false;
        retryBtn.textContent = 'Thử kết nối lại';
        showToast('Máy chủ vẫn chưa phản hồi. Vui lòng kiểm tra backend.', 'error');
      }
    });
    banner.append(text, retryBtn);
    main.prepend(banner);
  };

  window.addEventListener('ixs:data-error', (ev) => {
    const msg = ev.detail?.message || 'Không thể đồng bộ dữ liệu với máy chủ.';
    showToast(msg, 'error');
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      showOfflineBanner();
    }
  });
}

function openUserConfirmModal({ title = 'Xác nhận thao tác', message = '', confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', danger = false } = {}) {
  return new Promise(resolve => {
    let modal = document.getElementById('modalUserConfirmGlobal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-overlay confirm-modal';
      modal.id = 'modalUserConfirmGlobal';
      modal.innerHTML = `
        <div class="modal-box modal-box-sm" role="dialog" aria-modal="true" aria-labelledby="userConfirmTitle" style="max-width: 420px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(15,23,42,0.22);">
          <div class="user-modal-header">
            <div class="user-modal-title" id="userConfirmTitle">XÁC NHẬN</div>
            <button type="button" class="user-modal-close-btn" id="btnCloseUserConfirm" aria-label="Đóng">✕</button>
          </div>
          <div style="padding: 20px; display: flex; flex-direction: column; gap: 18px;">
            <p id="userConfirmMessage" style="margin: 0; font-size: 14px; color: #334155; line-height: 1.55;"></p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-profile-gray" id="btnCancelUserConfirm" style="width: auto; padding: 0 16px; height: 38px;">Hủy bỏ</button>
              <button type="button" class="btn-profile-primary" id="btnOkUserConfirm" style="width: auto; padding: 0 18px; height: 38px;">Xác nhận</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('userConfirmTitle');
    const msgEl = document.getElementById('userConfirmMessage');
    const btnOk = document.getElementById('btnOkUserConfirm');
    const btnCancel = document.getElementById('btnCancelUserConfirm');
    const btnClose = document.getElementById('btnCloseUserConfirm');

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnOk.textContent = confirmText;
    btnCancel.textContent = cancelText;
    btnOk.style.backgroundColor = danger ? '#DC2626' : '';

    const cleanup = (result) => {
      modal.classList.remove('active');
      btnOk.onclick = null;
      btnCancel.onclick = null;
      btnClose.onclick = null;
      modal.onclick = null;
      resolve(result);
    };

    btnOk.onclick = () => cleanup(true);
    btnCancel.onclick = () => cleanup(false);
    btnClose.onclick = () => cleanup(false);
    modal.onclick = (e) => { if (e.target === modal) cleanup(false); };

    modal.classList.add('active');
    setTimeout(() => btnOk.focus(), 50);
  });
}

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
    id: '220260004',
    name: 'Lưu Tấn Nin',
    fullName: 'Lưu Tấn Nin',
    role: 'Độc giả',
    readerType: 'Sinh viên',
    gender: 'Nam',
    dob: '10 / 11 / 2006',
    cccd: '',
    address: 'O17, Ap 4, My An, Tay Ninh',
    phone: '0363894957',
    email: 'luutannin@gmail.com',
    avatarUrl: ''
  };

  const user = session || defaultUser;
  const displayName = user.fullName || user.name || 'Lưu Tấn Nin';
  const displayRole = user.role || user.readerType || 'Độc giả';
  const displayCode = user.id ? `Mã ĐG: ${user.id}` : 'Mã ĐG: 220260004';

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
            <label for="userCurrentPwdInput" style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Mật khẩu hiện tại</label>
            <input type="password" class="profile-form-input" id="userCurrentPwdInput" placeholder="Nhập mật khẩu hiện tại..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div>
            <label for="userNewPwdInput" style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Mật khẩu mới (tối thiểu 8 ký tự)</label>
            <input type="password" class="profile-form-input" id="userNewPwdInput" placeholder="Nhập mật khẩu mới..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div>
            <label for="userConfirmPwdInput" style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Xác nhận mật khẩu mới</label>
            <input type="password" class="profile-form-input" id="userConfirmPwdInput" placeholder="Nhập lại mật khẩu mới..." style="width: 100%; height: 38px; border: 1px solid #DCE4EC; border-radius: 6px; padding: 0 12px; font-size: 13.5px;">
          </div>
          <div id="userChangePwdError" class="field-error-text" role="alert" style="display: none;"></div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button type="button" class="btn-profile-gray" id="btnCancelChangePwdGlobal" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #CBD5E1; background: #F1F5F9; color: #475569; cursor: pointer; font-weight: 600;">HỦY BỎ</button>
            <button type="button" class="btn-profile-primary" id="btnConfirmChangePwdGlobal" style="padding: 8px 18px; border-radius: 6px; border: none; background: #1D5D86; color: #fff; cursor: pointer; font-weight: 600;">CẬP NHẬT</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(pwdModal);

    const pwdErrorEl = document.getElementById('userChangePwdError');
    const showPwdErr = (msg) => {
      if (!pwdErrorEl) return;
      pwdErrorEl.textContent = msg || '';
      pwdErrorEl.style.display = msg ? 'block' : 'none';
    };

    const closePwd = () => {
      showPwdErr('');
      pwdModal.classList.remove('active');
    };
    document.getElementById('btnCloseChangePwdGlobal')?.addEventListener('click', closePwd);
    document.getElementById('btnCancelChangePwdGlobal')?.addEventListener('click', closePwd);
    pwdModal.addEventListener('click', (e) => {
      if (e.target === pwdModal) closePwd();
    });

    const submitPwdChange = async () => {
      const btnConfirm = document.getElementById('btnConfirmChangePwdGlobal');
      const cur = document.getElementById('userCurrentPwdInput').value;
      const nw = document.getElementById('userNewPwdInput').value.trim();
      const cf = document.getElementById('userConfirmPwdInput').value.trim();

      showPwdErr('');
      if (!cur || !nw) {
        showPwdErr('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
        return;
      }
      if (nw.length < 8) {
        showPwdErr('Mật khẩu mới phải có ít nhất 8 ký tự.');
        return;
      }
      if (nw === cur) {
        showPwdErr('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
        return;
      }
      if (nw !== cf) {
        showPwdErr('Xác nhận mật khẩu mới không khớp.');
        return;
      }

      let session = {};
      try {
        const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
        if (raw) session = JSON.parse(raw);
      } catch (_) {}

      const username = session.username || 'tannin';
      if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.dataset.origText = btnConfirm.textContent;
        btnConfirm.textContent = 'Đang cập nhật...';
      }

      try {
        await DataService.request('POST', '/auth/password/change', {
          username: username,
          currentPassword: cur,
          newPassword: nw
        });
        closePwd();
        showToast('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.', 'success');
      } catch (err) {
        const msg = err.status === 0
          ? 'Không thể kết nối máy chủ. Vui lòng thử lại khi có mạng.'
          : (err.message || 'Mật khẩu hiện tại không chính xác hoặc không thể cập nhật.');
        showPwdErr(msg);
      } finally {
        if (btnConfirm) {
          btnConfirm.disabled = false;
          btnConfirm.textContent = btnConfirm.dataset.origText || 'CẬP NHẬT';
        }
      }
    };

    document.getElementById('btnConfirmChangePwdGlobal')?.addEventListener('click', submitPwdChange);
    ['userCurrentPwdInput', 'userNewPwdInput', 'userConfirmPwdInput'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitPwdChange();
        }
      });
    });
  }

  const btnChangePass = document.getElementById('btnOpenChangePassword');
  if (btnChangePass) {
    btnChangePass.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
      document.getElementById('userCurrentPwdInput').value = '';
      document.getElementById('userNewPwdInput').value = '';
      document.getElementById('userConfirmPwdInput').value = '';
      const errEl = document.getElementById('userChangePwdError');
      if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
      }
      pwdModal.classList.add('active');
      document.getElementById('userCurrentPwdInput')?.focus();
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
    const readerRec = (typeof getReaders === 'function')
      ? getReaders().find(r => String(r.id) === String(session.id || session.readerId || '') || (session.username && r.username === session.username))
      : null;
    const merged = readerRec ? { ...session, ...readerRec } : session;
    if (merged.fullName || merged.name) {
      const name = merged.fullName || merged.name;
      const el = document.getElementById('profFullName');
      if (el) el.value = name;
    }
    if (merged.gender) {
      const el = document.getElementById('profGender');
      if (el) el.value = merged.gender;
    }
    if (merged.dob) {
      const el = document.getElementById('profDob');
      if (el) el.value = merged.dob;
    }
    const cccdEl = document.getElementById('profCccd');
    if (cccdEl) cccdEl.value = merged.cccd || '';
    if (merged.address) {
      const el = document.getElementById('profAddress');
      if (el) el.value = merged.address;
    }
    if (merged.phone) {
      const el = document.getElementById('profPhone');
      if (el) el.value = merged.phone;
    }
    if (merged.email) {
      const el = document.getElementById('profEmail');
      if (el) el.value = merged.email;
    }
    if (merged.id) {
      const el = document.getElementById('profCodeValue');
      if (el) el.textContent = merged.id;
    }
  }

  modal.classList.add('active');
}

function getProfileEditSnapshot() {
  return JSON.stringify({
    fullName: document.getElementById('editProfFullName')?.value.trim() || '',
    gender: document.getElementById('editProfGender')?.value || '',
    dob: document.getElementById('editProfDob')?.value.trim() || '',
    cccd: document.getElementById('editProfCccd')?.value.trim() || '',
    address: document.getElementById('editProfAddress')?.value.trim() || '',
    phone: document.getElementById('editProfPhone')?.value.trim() || '',
    email: document.getElementById('editProfEmail')?.value.trim() || ''
  });
}

function isValidDobString(dobStr) {
  const s = String(dobStr || '').trim();
  if (!s) return true;
  let day, month, year;
  let m = s.match(/^(\d{1,2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{4})$/);
  if (m) {
    day = parseInt(m[1], 10);
    month = parseInt(m[2], 10);
    year = parseInt(m[3], 10);
  } else {
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return false;
    year = parseInt(m[1], 10);
    month = parseInt(m[2], 10);
    day = parseInt(m[3], 10);
  }
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && d <= new Date();
}

function setEditProfileError(msg) {
  let errEl = document.getElementById('editProfileError');
  if (!errEl) {
    const body = document.querySelector('#modalEditUserProfile .user-modal-body');
    if (body) {
      errEl = document.createElement('div');
      errEl.id = 'editProfileError';
      errEl.className = 'field-error-text';
      errEl.setAttribute('role', 'alert');
      errEl.style.display = 'none';
      body.appendChild(errEl);
    }
  }
  if (!errEl) return;
  errEl.textContent = msg || '';
  errEl.style.display = msg ? 'block' : 'none';
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

  const closeAndReturn = async () => {
    const initial = modal.dataset.initialSnapshot || '';
    if (initial && getProfileEditSnapshot() !== initial) {
      const ok = await openUserConfirmModal({
        title: 'Bỏ thay đổi chưa lưu?',
        message: 'Bạn có thay đổi thông tin cá nhân chưa được lưu. Bạn có chắc muốn đóng biểu mẫu này?',
        confirmText: 'Đóng và bỏ thay đổi',
        cancelText: 'Tiếp tục chỉnh sửa'
      });
      if (!ok) return;
    }
    setEditProfileError('');
    modal.classList.remove('active');
    openUserProfileModal();
  };

  if (btnClose) btnClose.addEventListener('click', closeAndReturn);
  if (btnCancel) btnCancel.addEventListener('click', closeAndReturn);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAndReturn();
  });

  // Bấm "LƯU" -> Validate client + Lưu thông tin vào database và session, cập nhật giao diện
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const fullName = document.getElementById('editProfFullName')?.value.trim() || '';
      const gender = document.getElementById('editProfGender')?.value || 'Nam';
      const dob = document.getElementById('editProfDob')?.value.trim() || '';
      const cccd = document.getElementById('editProfCccd')?.value.trim() || '';
      const address = document.getElementById('editProfAddress')?.value.trim() || '';
      const phone = document.getElementById('editProfPhone')?.value.trim() || '';
      const email = document.getElementById('editProfEmail')?.value.trim() || '';

      setEditProfileError('');
      if (!fullName) {
        setEditProfileError('Vui lòng nhập họ và tên.');
        document.getElementById('editProfFullName')?.focus();
        return;
      }
      if (dob && !isValidDobString(dob)) {
        setEditProfileError('Ngày sinh không hợp lệ (định dạng DD / MM / YYYY và không vượt quá ngày hiện tại).');
        document.getElementById('editProfDob')?.focus();
        return;
      }
      if (cccd && !/^\d{9,12}$/.test(cccd)) {
        setEditProfileError('Số CCCD/CMND phải gồm 9 đến 12 chữ số.');
        document.getElementById('editProfCccd')?.focus();
        return;
      }
      if (phone) {
        const digits = phone.replace(/[\s.-]/g, '');
        if (!/^(\+84|0)\d{8,10}$/.test(digits)) {
          setEditProfileError('Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0363894957).');
          document.getElementById('editProfPhone')?.focus();
          return;
        }
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEditProfileError('Địa chỉ email không hợp lệ.');
        document.getElementById('editProfEmail')?.focus();
        return;
      }

      let session = {};
      try {
        const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
        if (raw) session = JSON.parse(raw);
      } catch (_) {}

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
        address: address
      };

      const origText = btnSave.textContent;
      btnSave.disabled = true;
      btnSave.textContent = 'Đang lưu...';
      try {
        await DataService.request('PUT', `/readers/${encodeURIComponent(readerId)}`, payload);
      } catch (err) {
        setEditProfileError(err.message || 'Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại dữ liệu.');
        return;
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = origText;
      }

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

      // Cập nhật lại cache reader nếu có
      if (typeof getReaders === 'function' && DataService._cache?.[DataService.KEYS.READERS]) {
        const list = DataService._cache[DataService.KEYS.READERS];
        const idx = list.findIndex(r => String(r.id) === String(readerId));
        if (idx !== -1) list[idx] = { ...list[idx], ...payload };
      }

      initUserSession();
      modal.dataset.initialSnapshot = '';
      modal.classList.remove('active');
      openUserProfileModal();
      showToast('Đã lưu thay đổi thông tin cá nhân!', 'success');
    });
  }
}

function openEditProfileModal() {
  const modal = document.getElementById('modalEditUserProfile');
  if (!modal) return;

  let session = null;
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  const profName = document.getElementById('profFullName')?.value || session?.fullName || session?.name || 'Lưu Tấn Nin';
  const profGender = document.getElementById('profGender')?.value || session?.gender || 'Nam';
  const profDob = document.getElementById('profDob')?.value || session?.dob || '10 / 11 / 2006';
  const profCccdRaw = document.getElementById('profCccd')?.value ?? session?.cccd ?? '';
  const profCccd = String(profCccdRaw).trim().toLowerCase() === 'abc' ? '' : profCccdRaw;
  const profAddress = document.getElementById('profAddress')?.value || session?.address || 'O17, Ap 4, My An, Tay Ninh';
  const profPhone = document.getElementById('profPhone')?.value || session?.phone || '0363894957';
  const profEmail = document.getElementById('profEmail')?.value || session?.email || 'luutannin@gmail.com';
  const profCode = document.getElementById('profCodeValue')?.textContent || session?.id || '220260004';

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

  setEditProfileError('');
  modal.dataset.initialSnapshot = getProfileEditSnapshot();
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

  let session = null;
  try {
    const raw = localStorage.getItem('ixs_library_session') || localStorage.getItem('ixs_library_current_user');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  const readerRec = (typeof getReaders === 'function' && session)
    ? getReaders().find(r => String(r.id) === String(session.id || session.readerId || '') || (session.username && r.username === session.username))
    : null;
  const info = { ...(session || {}), ...(readerRec || {}) };

  const currentName = info.fullName || info.name || document.getElementById('profFullName')?.value || 'LUU TAN NIN';
  const currentCode = info.id || document.getElementById('profCodeValue')?.textContent || '220260004';
  const currentRole = info.readerType || info.role || 'Sinh viên';
  const currentExpire = info.expiryDate || info.expireDate || '31 / 12 / 2026';

  const nameEl = document.getElementById('libCardName');
  if (nameEl) nameEl.textContent = currentName.toUpperCase();
  const codeEl = document.getElementById('libCardCode');
  if (codeEl) codeEl.textContent = currentCode;
  const roleEl = document.getElementById('libCardRole');
  if (roleEl) roleEl.textContent = currentRole;
  const expireEl = document.getElementById('libCardExpire');
  if (expireEl) expireEl.textContent = currentExpire;

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

  document.getElementById('btnResetCatalogFilters')?.addEventListener('click', () => {
    searchInput.value = '';
    if (clearButton) clearButton.style.display = 'none';
    ['filterCategory', 'filterAuthor', 'filterSort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
    catalogCurrentPage = 1;
    renderCatalog();
    searchInput.focus();
  });

  if (isCatalog) {
    document.getElementById('catalogPaginationControls')?.addEventListener('click', event => {
      const button = event.target.closest('[data-catalog-page]');
      if (!button || button.disabled) return;
      catalogCurrentPage = Number(button.dataset.catalogPage);
      renderCatalog();
    });

    const grid = document.getElementById('catalogBooksGrid');
    const featuredGrid = document.getElementById('catalogFeaturedBooksGrid');
    const detailView = document.getElementById('catalogBookDetail');

    featuredGrid?.addEventListener('click', event => {
      const card = event.target.closest('.featured-book-item[data-book-id]');
      if (card) {
        event.preventDefault();
        openCatalogBookDetail(card.dataset.bookId);
      }
    });

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
    detailView?.addEventListener('click', async event => {
      if (event.target.closest('[data-detail-action="back"]')) {
        renderCatalog();
        return;
      }
      if (event.target.closest('[data-detail-action="borrow"]')) {
        openBorrowRegistration(detailView.dataset.bookId);
        return;
      }
      if (event.target.closest('[data-detail-action="add-shelf"]')) {
        const bookId = detailView.dataset.bookId;
        const reader = getBorrowReaderProfile();
        try {
          await DataService.request('POST', '/wishlist', { readerId: reader.id, bookTitleId: bookId });
        } catch (apiErr) {
          if (apiErr && apiErr.status === 409) {
            showToast('Sách đã có trong tủ sách cá nhân của bạn!', 'warning');
            return;
          }
          showToast(apiErr.message || 'Không thể thêm sách vào tủ cá nhân.', 'error');
          return;
        }
        showToast('Đã thêm sách vào tủ sách cá nhân!', 'success');
        return;
      }
      if (event.target.closest('[data-detail-action="waitlist"]')) {
        const bookId = detailView.dataset.bookId;
        const reader = getBorrowReaderProfile();
        const btnWait = event.target.closest('[data-detail-action="waitlist"]');
        if (btnWait) { btnWait.disabled = true; btnWait.textContent = 'Đang đăng ký...'; }
        const entry = {
          readerId: reader.id,
          readerName: reader.fullName,
          bookTitleId: bookId,
          bookId,
          registeredAt: new Date().toISOString(),
          requestDate: new Date().toLocaleDateString('vi-VN'),
          status: 'DANG CHO'
        };
        try {
          const result = await DataService.request('POST', '/waitingList', entry);
          showToast(`Đăng ký chờ thành công! Thứ tự hàng đợi của bạn: #${result.position || entry.position}.`, 'success');
        } catch (err) {
          if (btnWait) { btnWait.disabled = false; btnWait.textContent = 'Đăng ký chờ mượn'; }
          showToast(err.message || 'Không thể đăng ký chờ mượn đầu sách này.', 'error');
          return;
        }
        if (btnWait) { btnWait.textContent = 'Đã đăng ký chờ'; btnWait.disabled = true; }
      }
    });

    window.applyCatalogSearch = query => {
      searchInput.value = query;
      catalogCurrentPage = 1;
      if (clearButton) clearButton.style.display = 'inline-flex';
      renderCatalog();
      searchInput.focus();
    };
    if (featuredGrid && !DataService.getAll(DataService.KEYS.BOOK_TITLES, []).length) {
      featuredGrid.innerHTML = '<div class="catalog-loading-state" style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; color: #64748B;">Đang tải danh mục sách...</div>';
    }
    Promise.resolve(DataService.ready).catch(() => {}).then(renderCatalog);
  }
}

function renderCatalogSearch(query) {
  const emptyFrame = document.getElementById('catalogEmptyFrame');
  const featuredGrid = document.getElementById('catalogFeaturedBooksGrid');
  const grid = document.getElementById('catalogBooksGrid');
  const detailView = document.getElementById('catalogBookDetail');
  const filtersRow = document.querySelector('.catalog-filters-row');
  const paginationRow = document.getElementById('catalogPaginationRow');
  const paginationControls = document.getElementById('catalogPaginationControls');
  const countWrapper = document.getElementById('catalogResultCountWrapper');
  const count = document.getElementById('catalogResultCount');
  const heading = document.getElementById('catalogHeading');
  if (!emptyFrame || !featuredGrid) return;

  if (detailView) detailView.style.display = 'none';
  if (grid) grid.style.display = 'none';
  if (filtersRow) filtersRow.style.display = '';
  emptyFrame.style.display = 'flex';

  const categoryFilter = document.getElementById('filterCategory');
  const selectedCategory = categoryFilter?.selectedIndex > 0 ? categoryFilter.selectedOptions[0].textContent.trim() : '';
  const searchTerms = normalizeCatalogText(query).split(/\s+/).filter(Boolean);
  const copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, []);
  const allCopies = copies;
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const books = databaseBooks;

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
    results.sort((a, b) => borrowedCopies(b.id, allCopies) - borrowedCopies(a.id, allCopies));
  }

  const totalPages = Math.ceil(results.length / CATALOG_PAGE_SIZE);
  catalogCurrentPage = Math.max(1, Math.min(catalogCurrentPage, totalPages || 1));
  const pageResults = results.slice((catalogCurrentPage - 1) * CATALOG_PAGE_SIZE, catalogCurrentPage * CATALOG_PAGE_SIZE);
  const hasFilters = Boolean(searchTerms.length || selectedCategory);

  if (heading) {
    heading.textContent = hasFilters ? `Kết quả tìm kiếm (${results.length} sách)` : 'Tất cả sách trong thư viện';
  }
  if (countWrapper) countWrapper.style.display = hasFilters ? 'block' : 'none';
  if (count) count.textContent = String(results.length);

  if (paginationRow) {
    paginationRow.style.display = totalPages > 1 ? 'flex' : 'none';
  }
  if (paginationControls) {
    paginationControls.innerHTML = totalPages > 1
      ? renderCatalogPaginationControls(catalogCurrentPage, totalPages)
      : '';
  }

  if (!results.length) {
    featuredGrid.innerHTML = '<div class="catalog-no-results" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #64748B; font-size: 15px;">Không tìm thấy sách phù hợp trong thư viện. Hãy thử tìm kiếm bằng từ khóa hoặc thể loại khác.</div>';
    return;
  }

  featuredGrid.innerHTML = pageResults.map(book => {
    const bookCopies = allCopies.filter(copy => String(copy.bookId || copy.bookTitleId) === String(book.id));
    const total = bookCopies.length || Number(book.total || book.totalCopies || 0);
    const available = bookCopies.length
      ? bookCopies.filter(copy => normalizeCatalogText(copy.circulationStatus || copy.status).includes('san sang')).length
      : Number(book.available || book.availableCopies || 0);
    const cover = book.coverUrl
      ? `<img src="${escapeCatalogHtml(book.coverUrl)}" alt="Bìa ${escapeCatalogHtml(book.title || 'sách')}" loading="lazy">`
      : '<div class="catalog-cover-placeholder"><span>LEAF<br>LIBRARY</span></div>';

    const authorText = book.authors || book.author || 'Tác giả chưa cập nhật';
    const publisherText = book.publisher ? ` · ${escapeCatalogHtml(book.publisher)}` : '';
    const categoryText = book.category || book.genre || 'Chung';

    return `
      <a href="javascript:void(0)" class="featured-book-item" data-book-id="${escapeCatalogHtml(book.id)}" aria-label="${escapeCatalogHtml(book.title || 'Sách')}, xem chi tiết">
        <div class="fbook-cover-frame">
          ${cover}
        </div>
        <div class="featured-book-detail">
          <strong>${escapeCatalogHtml(book.title || 'Chưa có tên sách')}</strong>
          <span>${escapeCatalogHtml(authorText)}</span>
          <span>${escapeCatalogHtml(categoryText)}${publisherText}</span>
          <small>Số lượng còn sẵn: <strong>${available} / ${total}</strong> cuốn</small>
          <b>Xem chi tiết sách <span aria-hidden="true">→</span></b>
        </div>
        <div class="fbook-meta">
          <div class="fbook-title" title="${escapeCatalogHtml(book.title || '')}">${escapeCatalogHtml(book.title || 'Chưa có tên sách')}</div>
          <div class="fbook-sub">${escapeCatalogHtml(authorText)}${book.publisher ? ' - ' + escapeCatalogHtml(book.publisher) : ''}</div>
        </div>
      </a>
    `;
  }).join('');
}

function renderCatalogPaginationControls(currentPage, totalPages) {
  const pageButton = (page, label = String(page), active = false) =>
    `<button type="button" class="page-box${active ? ' active' : ''}" data-catalog-page="${page}" aria-label="Trang ${page}"${active ? ' aria-current="page"' : ''}>${label}</button>`;
  const pages = [];

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
  } else if (currentPage <= 4) {
    for (let page = 1; page <= 4; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
    pages.push('<span class="page-dots" style="padding:0 4px;color:#94A3B8;" aria-hidden="true">...</span>', pageButton(totalPages));
  } else if (currentPage >= totalPages - 3) {
    pages.push(pageButton(1), '<span class="page-dots" style="padding:0 4px;color:#94A3B8;" aria-hidden="true">...</span>');
    for (let page = totalPages - 3; page <= totalPages; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
  } else {
    pages.push(pageButton(1), '<span class="page-dots" style="padding:0 4px;color:#94A3B8;" aria-hidden="true">...</span>');
    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) pages.push(pageButton(page, String(page), page === currentPage));
    pages.push('<span class="page-dots" style="padding:0 4px;color:#94A3B8;" aria-hidden="true">...</span>', pageButton(totalPages));
  }

  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages;

  return `
    <button type="button" class="page-box${prevDisabled ? ' disabled' : ''}" data-catalog-page="${currentPage - 1}" aria-label="Trang trước"${prevDisabled ? ' disabled' : ''}>&lt;</button>
    ${pages.join('')}
    <button type="button" class="page-box${nextDisabled ? ' disabled' : ''}" data-catalog-page="${currentPage + 1}" aria-label="Trang sau"${nextDisabled ? ' disabled' : ''}>&gt;</button>
  `;
}

function openCatalogBookDetail(bookId) {
  const detailView = document.getElementById('catalogBookDetail');
  const grid = document.getElementById('catalogBooksGrid');
  const emptyFrame = document.getElementById('catalogEmptyFrame');
  const filtersRow = document.querySelector('.catalog-filters-row');
  const paginationRow = document.getElementById('catalogPaginationRow');
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const books = databaseBooks;
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
        ${available > 0
          ? `<button type="button" class="btn-borrow-now catalog-detail-borrow" data-detail-action="borrow">Đăng ký mượn ngay</button>`
          : `<button type="button" class="btn-borrow-now catalog-detail-borrow" data-detail-action="waitlist" style="background: #D97706;">Đăng ký chờ mượn</button>`
        }
        <button type="button" class="btn-profile-outline" data-detail-action="add-shelf" style="width: 100%; margin-top: 8px; height: 38px; border-radius: 8px; font-weight: 600;">+ Thêm vào tủ sách</button>
        <p class="catalog-detail-note">${available > 0 ? 'Thời gian mượn tiêu chuẩn là 14 ngày. Vui lòng liên hệ thủ thư để hoàn tất đăng ký.' : 'Đầu sách hiện đã hết bản sao sẵn có. Bạn có thể đăng ký chờ để được ưu tiên giữ sách khi có người trả.'}</p>
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

  const setBorrowErr = (msg) => {
    let errEl = document.getElementById('borrowRegistrationError');
    if (!errEl) {
      const footer = registrationModal.querySelector('.modal-footer, .user-modal-footer');
      if (footer && footer.parentElement) {
        errEl = document.createElement('div');
        errEl.id = 'borrowRegistrationError';
        errEl.className = 'field-error-text';
        errEl.setAttribute('role', 'alert');
        errEl.style.display = 'none';
        footer.parentElement.insertBefore(errEl, footer);
      }
    }
    if (errEl) {
      errEl.textContent = msg || '';
      errEl.style.display = msg ? 'block' : 'none';
    }
  };

  confirmButton.addEventListener('click', async () => {
    const book = getActiveBorrowBook();
    if (!book) return;
    const reader = getBorrowReaderProfile();
    const copySelect = document.getElementById('borrowSelectCopy');
    const selectedCopyId = copySelect ? copySelect.value : '';

    setBorrowErr('');
    if (!selectedCopyId) {
      setBorrowErr('Hiện chưa có bản sao sẵn sàng để đăng ký mượn. Vui lòng chọn đầu sách khác hoặc liên hệ thủ thư.');
      return;
    }

    // Kiểm tra trạng thái thẻ bạn đọc, nợ phạt và giới hạn số sách mượn
    const allReaders = typeof getReaders === 'function' ? getReaders() : [];
    const readerRec = allReaders.find(r => String(r.id) === String(reader.id));
    if (readerRec) {
      const rStatus = normalizeCatalogText(readerRec.status || '');
      if (rStatus.includes('khoa') || rStatus.includes('het han')) {
        setBorrowErr('Thẻ thư viện của bạn đang bị khóa hoặc đã hết hạn. Vui lòng liên hệ thủ thư để gia hạn/mở khóa.');
        return;
      }
      if (Number(readerRec.outstandingFine || 0) > 0) {
        setBorrowErr('Bạn đang còn khoản phạt chưa thanh toán. Vui lòng thanh toán trước khi gửi yêu cầu mượn.');
        return;
      }
    }

    const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { borrowDays: 14, maxBorrowBooks: 5 };
    const borrowDays = Number(rules.borrowDays) || 14;
    const maxBooks = Number(rules.maxBorrowBooks) || 5;
    const existingLoans = typeof getReaderHistory === 'function' ? getReaderHistory() : [];
    const activeLoans = existingLoans.filter(l =>
      String(l.readerId || '') === String(reader.id) &&
      !normalizeCatalogText(l.status || '').includes('da tra')
    );
    if (activeLoans.length >= maxBooks) {
      setBorrowErr(`Bạn đang mượn ${activeLoans.length} cuốn (tối đa ${maxBooks} cuốn theo quy định). Vui lòng trả bớt sách trước khi mượn thêm.`);
      return;
    }
    if (activeLoans.some(l => String(l.bookId || l.bookTitleId || '') === String(book.id))) {
      setBorrowErr('Bạn đang mượn một bản sao của đầu sách này.');
      return;
    }

    const now = new Date();
    const request = {
      id: `YCM-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      requestId: `YCM-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      bookId: book.id,
      bookTitle: book.title,
      copyId: selectedCopyId,
      readerId: reader.id,
      readerName: reader.fullName,
      requestDate: new Intl.DateTimeFormat('vi-VN').format(now),
      borrowDate: new Intl.DateTimeFormat('vi-VN').format(now),
      dueDate: `Chờ lập phiếu (${borrowDays} ngày)`,
      status: 'CHO DUYET'
    };

    confirmButton.disabled = true;
    confirmButton.textContent = 'Đang gửi yêu cầu...';
    try {
      await DataService.request(
        'POST',
        `/bookTitles/${encodeURIComponent(book.id)}/reserve`,
        { requestId: request.id, readerId: reader.id, copyId: selectedCopyId }
      );

      // Theo Seq 2.8.1: Bạn đọc chỉ tạo yêu cầu CHO DUYET; không tự chuyển trạng thái cuốn sách sang ĐANG MƯỢN hay tạo PHIEUMUON khi chưa qua Thủ thư
      document.getElementById('borrowSuccessCode').textContent = request.id;
      document.getElementById('borrowSuccessBookTitle').textContent = `${book.title} (Đầu sách: ${book.id}${selectedCopyId ? ` · Dự kiến cuốn: ${selectedCopyId}` : ''})`;
      document.getElementById('borrowSuccessReaderName').textContent = reader.fullName;
      document.getElementById('borrowSuccessReaderCode').textContent = reader.id;
      document.getElementById('borrowSuccessDate').textContent = request.requestDate;
      closeRegistration();

      const detailView = document.getElementById('catalogBookDetail');
      if (detailView?.style.display === 'block' && detailView.dataset.bookId === String(book.id)) {
        openCatalogBookDetail(book.id);
      } else {
        renderCatalogSearch(document.getElementById('globalSearchInput')?.value || book.title);
      }
      successModal.classList.add('active');
      showToast('Đã gửi yêu cầu mượn sách! Vui lòng chờ thủ thư duyệt và lập phiếu mượn.', 'success');
    } catch (error) {
      setBorrowErr(error.message || 'Chưa thể gửi yêu cầu mượn sách này. Hãy thử lại sau.');
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Xác nhận đăng ký mượn';
    }
  });
}

function openBorrowRegistration(bookId, preferredCopyId) {
  const modal = document.getElementById('modalBorrowRegistration');
  const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
  const book = databaseBooks.find(item => String(item.id) === String(bookId));
  if (!book || !modal) return;

  const reader = getBorrowReaderProfile();
  activeBorrowBook = book;
  document.getElementById('borrowReaderName').value = reader.fullName;
  document.getElementById('borrowReaderGender').value = reader.gender;
  document.getElementById('borrowReaderDob').value = reader.dob;
  document.getElementById('borrowReaderCccd').value = String(reader.cccd || '').trim().toLowerCase() === 'abc' ? '' : (reader.cccd || '');
  document.getElementById('borrowReaderAddress').value = reader.address;
  document.getElementById('borrowReaderPhone').value = reader.phone;
  document.getElementById('borrowReaderEmail').value = reader.email;
  document.getElementById('borrowReaderCode').textContent = reader.id;
  document.getElementById('borrowRequestBookTitle').textContent = book.title;
  document.getElementById('borrowRequestBookMeta').textContent = `Đầu sách: ${book.id} · ${book.category || book.genre || 'Chưa phân loại'}`;

  const errEl = document.getElementById('borrowRegistrationError');
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  const confirmButton = document.getElementById('btnConfirmBorrow');

  // Đổ danh sách các cuốn sách (bản sao) sẵn sàng vào select
  const copySelect = document.getElementById('borrowSelectCopy');
  if (copySelect) {
    let allCopies = [];
    try {
      allCopies = DataService.getAll(DataService.KEYS.BOOK_COPIES, []);
    } catch (_) {}
    const bookCopies = allCopies.filter(c => String(c.bookId || c.bookTitleId) === String(book.id));
    const availableCopies = bookCopies.filter(c => {
      const st = normalizeCatalogText(c.circulationStatus || c.status || '');
      return !st.includes('dang muon') && !st.includes('khoa') && !st.includes('mat') && !st.includes('hong');
    });

    if (availableCopies.length > 0) {
      copySelect.innerHTML = availableCopies.map(c => `
        <option value="${escapeCatalogHtml(c.id)}" ${preferredCopyId && String(c.id) === String(preferredCopyId) ? 'selected' : ''}>
          ${escapeCatalogHtml(c.id)} (${escapeCatalogHtml(c.shelfLocation || c.location || 'Kệ thư viện')}) - ${escapeCatalogHtml(c.physicalStatus || c.physicalCondition || 'Tốt')}
        </option>
      `).join('');
      if (confirmButton) confirmButton.disabled = false;
    } else {
      copySelect.innerHTML = '<option value="">Hiện không còn bản sao sẵn sàng trong kho</option>';
      if (confirmButton) confirmButton.disabled = true;
      if (errEl) {
        errEl.textContent = 'Đầu sách này hiện không còn bản sao sẵn sàng để đăng ký mượn.';
        errEl.style.display = 'block';
      }
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
    id: '220260004', fullName: 'Lưu Tấn Nin', name: 'Lưu Tấn Nin', gender: 'Nam',
    dob: '10 / 11 / 2006', cccd: '', address: 'O17, Ap 4, My An, Tay Ninh',
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
  return databaseBooks.find(book => String(book.id) === String(bookId)) || null;
}

function initBookshelfPage() {
  const list = document.getElementById('bookshelfBookList');
  if (!list) return;

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
  let shelfCache = [];

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
      copies = DataService.getAll(DataService.KEYS.BOOK_COPIES, []);
    } catch (_) {}
    const bookCopies = copies.filter(c => String(c.bookId || c.bookTitleId) === String(bookId));

    if (title) title.textContent = `DANH SÁCH BẢN SAO - ${bookId}`;

    if (!bookCopies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="padding: 20px 14px; text-align: center; color: #64748B;">
            Hiện chưa có bản sao nào được ghi nhận cho đầu sách này.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = bookCopies.map(c => {
        const isReady = (c.circulationStatus || c.status || '').toUpperCase().includes('SẴN SÀNG') || (c.circulationStatus || c.status || '').toUpperCase().includes('SAN SANG');
        const badgeClass = isReady ? 'badge-reader-valid' : 'badge-reader-locked';
        const statusText = c.circulationStatus || c.status || 'SẴN SÀNG';
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 10px 14px; font-weight: 600; color: #1D5D86;">${escapeCatalogHtml(c.id)}</td>
            <td style="padding: 10px 14px;">${escapeCatalogHtml(c.shelfLocation || c.location || 'Kệ A1 - Ngăn 1')}</td>
            <td style="padding: 10px 14px;"><span class="badge status-badge ${badgeClass}">${escapeCatalogHtml(statusText)}</span></td>
          </tr>
        `;
      }).join('');
    }
    modal.classList.add('active');
  }

  const getShelf = () => {
    return shelfCache;
  };
  const saveShelf = shelf => { shelfCache = shelf; };
  const getBooks = () => {
    const databaseBooks = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
    return databaseBooks;
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
      allCopies = DataService.getAll(DataService.KEYS.BOOK_COPIES, []);
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
                <div class="book-meta-value">${escapeCatalogHtml(book.id || 'DS001')}</div>
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
                <div class="book-meta-value">${escapeCatalogHtml(book.publisher || 'Chưa cập nhật')}</div>
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
                <button type="button" class="action-icon" title="Chỉnh sửa tiến độ đọc" aria-label="Chỉnh sửa tiến độ đọc" data-shelf-action="edit" data-id="${escapeCatalogHtml(book.id)}">${ICON_EDIT}</button>
                <button type="button" class="action-icon" title="Xóa khỏi tủ sách" aria-label="Xóa khỏi tủ sách" data-shelf-action="remove" data-id="${escapeCatalogHtml(book.id)}">${ICON_DELETE}</button>
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
      addCover.onerror = () => { addCover.onerror = null; addCover.src = '../assets/images/logo-leaf.png'; };
      addCover.src = book.coverUrl || '../assets/images/logo-leaf.png';
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

  addForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const book = getBooks().find(item => String(item.id) === String(bookSelect?.value));
    if (!book) {
      showToast('Vui lòng chọn đầu sách hợp lệ để thêm vào tủ.', 'error');
      return;
    }
    const reader = getBorrowReaderProfile();
    const addedAt = document.getElementById('bookshelfAddDate')?.value || new Date().toISOString().slice(0, 10);
    const note = document.getElementById('bookshelfAddNote')?.value.trim() || '';
    try {
      await DataService.request('POST', '/wishlist', { readerId: reader.id, bookTitleId: book.id, note, addedAt });
    } catch (apiErr) {
      if (apiErr && apiErr.status === 409) {
        showToast('Đầu sách này đã có trong tủ sách cá nhân.', 'warning');
        return;
      }
      showToast(apiErr.message || 'Không thể thêm sách vào tủ cá nhân.', 'error');
      return;
    }
    saveShelf([...getShelf(), {
      bookId: book.id,
      status: 'Chưa đọc',
      currentPage: 0,
      totalPages: 0,
      addedAt,
      note
    }]);
    addForm.reset();
    const dateInput = document.getElementById('bookshelfAddDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    closeAddModal();
    render();
    showToast(`Đã thêm “${book.title}” vào tủ cá nhân.`, 'success');
  });

  const setShelfErr = (msg) => {
    const errEl = document.getElementById('editShelfError');
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.style.display = msg ? 'block' : 'none';
  };

  list.addEventListener('click', async event => {
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
      setShelfErr('');
      editModal.classList.add('active');
      document.getElementById('editShelfStatus')?.focus();
      return;
    }

    if (actionButton.dataset.shelfAction === 'remove') {
      const book = getBooks().find(item => String(item.id) === bookId);
      const ok = await openUserConfirmModal({
        title: 'Xóa sách khỏi tủ cá nhân',
        message: `Bạn có chắc muốn xóa “${book?.title || 'sách này'}” khỏi tủ sách cá nhân?`,
        confirmText: 'Xóa khỏi tủ',
        cancelText: 'Giữ lại',
        danger: true
      });
      if (!ok) return;
      const reader = getBorrowReaderProfile();
      try {
        await DataService.request('DELETE', `/wishlist/${encodeURIComponent(bookId)}?readerId=${encodeURIComponent(reader.id)}`);
      } catch (err) {
        showToast(err.message || 'Không thể xóa sách khỏi tủ cá nhân.', 'error');
        return;
      }
      saveShelf(shelf.filter(entry => String(entry.bookId) !== bookId));
      render();
      showToast(`Đã xóa “${book?.title || 'sách'}” khỏi tủ cá nhân.`, 'success');
    }
  });

  editForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editingBookId) return;
    const totalRaw = Number(document.getElementById('editShelfTotalPages').value);
    const currentRaw = Number(document.getElementById('editShelfCurrentPage').value);
    const status = document.getElementById('editShelfStatus').value;

    setShelfErr('');
    if (!Number.isFinite(totalRaw) || totalRaw < 0 || !Number.isFinite(currentRaw) || currentRaw < 0) {
      setShelfErr('Số trang phải là số không âm.');
      return;
    }
    const totalPages = Math.floor(totalRaw);
    let currentPage = Math.floor(currentRaw);
    if (totalPages > 0 && currentPage > totalPages) {
      setShelfErr(`Trang đang đọc (${currentPage}) không thể lớn hơn tổng số trang (${totalPages}).`);
      document.getElementById('editShelfCurrentPage')?.focus();
      return;
    }
    if (status === 'Đã đọc' && totalPages > 0) currentPage = totalPages;

    const submit = editForm.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      await DataService.request('PUT', `/wishlist/${encodeURIComponent(editingBookId)}`, { readerId: getBorrowReaderProfile().id, status, currentPage, totalPages });
    } catch (error) { setShelfErr(error.message || 'Không lưu được tiến độ đọc.'); return; }
    finally { submit.disabled = false; }

    saveShelf(getShelf().map(entry => String(entry.bookId) === editingBookId
      ? { ...entry, status, currentPage, totalPages }
      : entry));
    closeEditModal();
    render();
    showToast('Đã cập nhật tiến độ đọc.', 'success');
  });

  Promise.resolve(DataService.ready).catch(() => {}).then(async () => {
    try {
      const reader = getBorrowReaderProfile();
      const apiWishlist = await DataService.request('GET', `/wishlist?readerId=${encodeURIComponent(reader.id)}`);
      if (Array.isArray(apiWishlist)) {
        saveShelf(apiWishlist.map(w => ({ bookId: String(w.bookTitleId || w.id), status: w.status || 'Chưa đọc', currentPage: w.currentPage || 0, totalPages: w.totalPages || 0, note: w.note || '', addedAt: w.addedAt || '' })));
      }
    } catch (error) {
      showToast(error.message || 'Không tải được tủ sách từ máy chủ.', 'error');
    }
    render();
  });
}

function initReaderHistoryPage() {
  const rows = document.getElementById('readerHistoryRows');
  if (!rows) return;

  const summary = document.getElementById('historyPageSummary');
  const pagination = document.getElementById('historyPagination');
  const searchInput = document.getElementById('historySearchInput');
  let currentFilter = 'Đang mượn';
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let waitingCache = null;
  let borrowReqCache = null;
  let renewalsCache = null;

  const getReaderWaiting = () => {
    if (Array.isArray(waitingCache)) return waitingCache;
    return [];
  };

  const getReaderBorrowRequests = () => {
    if (Array.isArray(borrowReqCache)) return borrowReqCache;
    return [];
  };

  async function refreshReaderWaiting() {
    try {
      const reader = getBorrowReaderProfile();
      const res = await DataService.request('GET', `/waitingList?readerId=${encodeURIComponent(reader.id)}`);
      if (Array.isArray(res)) waitingCache = res;
    } catch (_) {}
    if (currentFilter === 'Hàng chờ') render('Hàng chờ');
  }

  async function refreshBorrowRequests() {
    try {
      const reader = getBorrowReaderProfile();
      const res = await DataService.request('GET', `/borrowRequests?readerId=${encodeURIComponent(reader.id)}`);
      if (Array.isArray(res)) borrowReqCache = res;
    } catch (_) {}
    if (currentFilter === 'Yêu cầu mượn') render('Yêu cầu mượn');
  }

  async function refreshReaderRenewals() {
    try {
      const reader = getBorrowReaderProfile();
      const res = await DataService.request('GET', `/renewals?readerId=${encodeURIComponent(reader.id)}`);
      if (Array.isArray(res)) renewalsCache = res;
    } catch (_) {}
    render(currentFilter);
  }

  const normalizeStatus = st => {
    const s = String(st || '').toLowerCase().trim();
    if (s.includes('đang mượn') || s.includes('dang muon') || s.includes('borrowing')) return 'Đang mượn';
    if (s.includes('đã trả') || s.includes('da tra') || s.includes('returned')) return 'Đã trả';
    if (s.includes('quá hạn') || s.includes('qua han') || s.includes('overdue')) return 'Quá hạn';
    return st || 'Đang mượn';
  };

  const getPendingRenewals = () => {
    if (Array.isArray(renewalsCache)) return renewalsCache;
    return [];
  };

  const renderPagination = (totalItems) => {
    if (!pagination) return;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    let html = `<button type="button" class="page-box ${currentPage <= 1 ? 'disabled' : ''}" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button type="button" class="page-box ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button type="button" class="page-box ${currentPage >= totalPages ? 'disabled' : ''}" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&gt;</button>`;
    pagination.innerHTML = html;
  };

  const render = (status) => {
    if (status && status !== currentFilter) {
      currentFilter = status;
      currentPage = 1;
    }
    if (currentFilter === 'Yêu cầu mượn') {
      const titles = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
      const q = normalizeCatalogText(searchInput?.value || '');
      const reqList = getReaderBorrowRequests().map(r => {
        const bId = r.bookId || r.bookTitleId || '';
        const bObj = titles.find(t => String(t.id) === String(bId));
        return {
          id: r.id || r.requestId || '—',
          copyId: r.copyId || bId || '—',
          title: r.bookTitle || bObj?.title || bId,
          requestDate: r.requestDate || r.borrowDate || '—',
          dueDate: 'Chờ thủ thư lập phiếu',
          status: r.status || 'CHO DUYET'
        };
      }).filter(r => !q || normalizeCatalogText(`${r.id} ${r.copyId} ${r.title}`).includes(q));

      const isTable = rows.tagName.toLowerCase() === 'tbody';
      renderPagination(reqList.length);
      const startIdx = (currentPage - 1) * PAGE_SIZE;
      const pageItems = reqList.slice(startIdx, startIdx + PAGE_SIZE);
      if (!pageItems.length) {
        rows.innerHTML = isTable
          ? '<tr><td class="workflow-empty-cell" colspan="6" style="text-align: center; padding: 24px 16px; color: #64748B;">Bạn chưa gửi yêu cầu mượn sách nào.</td></tr>'
          : '<div class="table-row empty-row" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 14px; min-height: 70px; background-color: #FFFFFF;">Bạn chưa gửi yêu cầu mượn sách nào.</div>';
        if (summary) summary.textContent = 'Không có yêu cầu mượn';
        return;
      }

      rows.innerHTML = pageItems.map(item => {
        const stUp = String(item.status || 'CHO DUYET').toUpperCase();
        const isPending = stUp.includes('CHO');
        let stText = 'Chờ duyệt';
        let stCls = 'badge-circ-borrowed';
        if (stUp.includes('DA DUYET') || stUp.includes('ĐÃ DUYỆT')) { stText = 'Đã duyệt (Đã lập phiếu)'; stCls = 'badge-phys-good'; }
        else if (stUp.includes('TU CHOI') || stUp.includes('TỪ CHỐI')) { stText = 'Từ chối'; stCls = 'badge-phys-torn'; }
        const cancelBtn = isPending
          ? `<button type="button" class="btn-renew-pill" data-cancel-borrow-req="${escapeCatalogHtml(item.id)}" style="background:#FEE2E2;color:#B91C1C;border-color:#FCA5A5;">Hủy</button>`
          : '';
        if (isTable) {
          return `<tr>
            <td style="font-weight: 700; color: #1E293B;">${escapeCatalogHtml(item.id)}</td>
            <td style="font-weight: 600; color: #1D5D86;">${escapeCatalogHtml(item.copyId)}</td>
            <td class="history-book-title">${escapeCatalogHtml(item.title)}</td>
            <td style="text-align: center;">${escapeCatalogHtml(String(item.requestDate).replace(/\s*\/\s*/g, '/'))}</td>
            <td style="text-align: center; color: #64748B; font-size: 12.5px;">${escapeCatalogHtml(item.dueDate)}</td>
            <td><div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;"><span class="badge-copy status-badge ${stCls}">${stText}</span>${cancelBtn}</div></td>
          </tr>`;
        }
        return `<div class="table-row user-history-row">
          <div>${escapeCatalogHtml(item.id)}</div>
          <div>${escapeCatalogHtml(item.copyId)}</div>
          <div class="history-book-title">${escapeCatalogHtml(item.title)}</div>
          <div>${escapeCatalogHtml(String(item.requestDate).replace(/\s*\/\s*/g, '/'))}</div>
          <div style="color: #64748B; font-size: 12.5px;">${escapeCatalogHtml(item.dueDate)}</div>
          <div><div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;"><span class="badge-copy status-badge ${stCls}">${stText}</span>${cancelBtn}</div></div>
        </div>`;
      }).join('');
      if (summary) summary.textContent = `Hiển thị ${startIdx + 1} - ${Math.min(startIdx + PAGE_SIZE, reqList.length)} trên tổng số ${reqList.length} yêu cầu mượn`;
      return;
    }

    if (currentFilter === 'Hàng chờ') {
      const titles = DataService.getAll(DataService.KEYS.BOOK_TITLES, []);
      const q = normalizeCatalogText(searchInput?.value || '');
      const waitList = getReaderWaiting().map((w, idx) => {
        const bId = w.bookTitleId || w.bookId || w.id || '';
        const bObj = titles.find(t => String(t.id) === String(bId));
        return {
          bookId: bId,
          title: w.bookTitle || bObj?.title || bId,
          registeredAt: w.registeredAt || w.requestDate || '—',
          position: w.position || w.thutu || (idx + 1),
          status: w.status || 'DANG CHO'
        };
      }).filter(w => !q || normalizeCatalogText(`${w.bookId} ${w.title}`).includes(q));

      const isTable = rows.tagName.toLowerCase() === 'tbody';
      renderPagination(waitList.length);
      const startIdx = (currentPage - 1) * PAGE_SIZE;
      const pageItems = waitList.slice(startIdx, startIdx + PAGE_SIZE);
      if (!pageItems.length) {
        rows.innerHTML = isTable
          ? '<tr><td class="workflow-empty-cell" colspan="6" style="text-align: center; padding: 24px 16px; color: #64748B;">Bạn chưa đăng ký chờ cuốn sách nào.</td></tr>'
          : '<div class="table-row empty-row" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 14px; min-height: 70px; background-color: #FFFFFF;">Bạn chưa đăng ký chờ cuốn sách nào.</div>';
        if (summary) summary.textContent = 'Không có đăng ký chờ';
        return;
      }

      rows.innerHTML = pageItems.map(item => {
        const stUp = String(item.status || 'DANG CHO').toUpperCase();
        const isActive = stUp.includes('DANG') || stUp.includes('SAN SANG') || stUp.includes('GIU');
        let stText = 'Đang chờ';
        let stCls = 'badge-circ-borrowed';
        if (stUp.includes('SAN SANG') || stUp.includes('GIU')) { stText = 'Đã có sách (Giữ 48h)'; stCls = 'badge-phys-good'; }
        else if (stUp.includes('DA NHAN') || stUp.includes('HOAN TAT')) { stText = 'Hoàn tất'; stCls = 'badge-phys-good'; }
        else if (stUp.includes('HUY')) { stText = 'Đã hủy'; stCls = 'badge-phys-torn'; }

        const cancelBtn = isActive
          ? `<button type="button" class="btn-renew-pill" data-cancel-wait-book="${escapeCatalogHtml(item.bookId)}" style="background:#FEE2E2;color:#B91C1C;border-color:#FCA5A5;">Hủy chờ</button>`
          : '';
        const dateFormatted = String(item.registeredAt).slice(0, 10);
        if (isTable) {
          return `<tr>
            <td style="font-weight: 700; color: #1E293B;">#${escapeCatalogHtml(item.position)}</td>
            <td style="font-weight: 600; color: #1D5D86;">${escapeCatalogHtml(item.bookId)}</td>
            <td class="history-book-title">${escapeCatalogHtml(item.title)}</td>
            <td style="text-align: center;">${escapeCatalogHtml(dateFormatted)}</td>
            <td style="text-align: center;">Thứ tự #${escapeCatalogHtml(item.position)}</td>
            <td><div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;"><span class="badge-copy status-badge ${stCls}">${stText}</span>${cancelBtn}</div></td>
          </tr>`;
        }
        return `<div class="table-row user-history-row">
          <div>#${escapeCatalogHtml(item.position)}</div>
          <div>${escapeCatalogHtml(item.bookId)}</div>
          <div class="history-book-title">${escapeCatalogHtml(item.title)}</div>
          <div>${escapeCatalogHtml(dateFormatted)}</div>
          <div>Hàng chờ</div>
          <div><div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;"><span class="badge-copy status-badge ${stCls}">${stText}</span>${cancelBtn}</div></div>
        </div>`;
      }).join('');
      if (summary) summary.textContent = `Hiển thị ${startIdx + 1} - ${Math.min(startIdx + PAGE_SIZE, waitList.length)} trên tổng số ${waitList.length} đăng ký chờ`;
      return;
    }

    const pendingRenewalIds = new Set(
      getPendingRenewals()
        .filter(r => String(r.status || '').toUpperCase().includes('CHO'))
        .map(r => String(r.loanId))
    );
    const historyList = (typeof getReaderHistory === 'function' ? getReaderHistory() : []).map(item => {
      const id = item.id || item.loanId || item.code || 'PM001';
      return {
        id,
        copyId: item.copyId || item.bookCopyId || item.macuonsach || '—',
        borrowDate: item.borrowDate || '—',
        title: item.bookTitle || item.title || 'Sách mượn',
        dueDate: item.dueDate || '—',
        status: normalizeStatus(item.status),
        renewed: Boolean(item.renewed || pendingRenewalIds.has(String(id)))
      };
    });

    const q = normalizeCatalogText(searchInput?.value || '');
    const byStatus = currentFilter === 'Tất cả'
      ? historyList
      : historyList.filter(item => item.status === currentFilter);
    const filtered = q
      ? byStatus.filter(item => normalizeCatalogText(`${item.id} ${item.copyId} ${item.title}`).includes(q))
      : byStatus;

    const isTable = rows.tagName.toLowerCase() === 'tbody';
    const totalItems = filtered.length;
    renderPagination(totalItems);

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    if (!pageItems.length) {
      rows.innerHTML = isTable
        ? '<tr><td class="workflow-empty-cell" colspan="6" style="text-align: center; padding: 24px 16px; color: #64748B;">Không có lượt mượn nào phù hợp.</td></tr>'
        : '<div class="table-row empty-row" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 14px; min-height: 70px; background-color: #FFFFFF;">Không có lượt mượn nào phù hợp.</div>';
      if (summary) summary.textContent = 'Không có phiếu mượn';
      return;
    }

    rows.innerHTML = pageItems.map(item => {
      const canRenew = item.status === 'Đang mượn' && !item.renewed;
      const renewBtn = canRenew
        ? `<button type="button" class="btn-renew-pill" data-renew-loan-id="${escapeCatalogHtml(item.id)}" title="Gia hạn sách thêm 7 ngày">Gia hạn</button>`
        : (item.renewed ? `<span style="font-size: 12px; color: #1D5D86; font-weight: 500; margin-left: 6px;">(Chờ duyệt)</span>` : '');
      const bDate = String(item.borrowDate || '—').replace(/\s*\/\s*/g, '/');
      const dDate = String(item.dueDate || '—').replace(/\s*\/\s*/g, '/');
      let statusBadge = '';
      if (item.status === 'Đang mượn') {
        statusBadge = `<span class="badge-copy status-badge badge-history-borrowing">ĐANG MƯỢN</span>`;
      } else if (item.status === 'Đã trả') {
        statusBadge = `<span class="badge-copy status-badge badge-phys-good">ĐÃ TRẢ</span>`;
      } else if (item.status === 'Quá hạn') {
        statusBadge = `<span class="badge-copy status-badge badge-phys-torn">QUÁ HẠN</span>`;
      } else {
        statusBadge = `<span class="badge-copy status-badge badge-history-default">${escapeCatalogHtml(item.status)}</span>`;
      }

      if (isTable) {
        return `<tr>
          <td style="font-weight: 700; color: #1E293B; white-space: nowrap;">${escapeCatalogHtml(item.id)}</td>
          <td style="font-weight: 600; color: #1D5D86; white-space: nowrap;">${escapeCatalogHtml(item.copyId)}</td>
          <td class="history-book-title">${escapeCatalogHtml(item.title)}</td>
          <td style="text-align: center; white-space: nowrap;">${escapeCatalogHtml(bDate)}</td>
          <td style="text-align: center; white-space: nowrap;">${escapeCatalogHtml(dDate)}</td>
          <td>
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
              ${statusBadge}
              ${renewBtn}
            </div>
          </td>
        </tr>`;
      }

      return `<div class="table-row user-history-row">
        <div>${escapeCatalogHtml(item.id)}</div>
        <div>${escapeCatalogHtml(item.copyId)}</div>
        <div class="history-book-title">${escapeCatalogHtml(item.title)}</div>
        <div>${escapeCatalogHtml(bDate)}</div>
        <div>${escapeCatalogHtml(dDate)}</div>
        <div>
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            ${statusBadge}
            ${renewBtn}
          </div>
        </div>
      </div>`;
    }).join('');

    if (summary) summary.textContent = `Hiển thị ${startIdx + 1} - ${Math.min(startIdx + PAGE_SIZE, totalItems)} trên tổng số ${totalItems} phiếu`;
  };

  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    render();
  });

  if (pagination) {
    pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-box:not(.disabled)');
      if (!btn) return;
      const p = parseInt(btn.dataset.page, 10);
      if (!isNaN(p) && p !== currentPage) {
        currentPage = p;
        render();
      }
    });
  }

  document.querySelectorAll('[data-history-status]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-history-status]').forEach(item => {
        const isTarget = item === button;
        item.classList.toggle('active', isTarget);
        item.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      render(button.dataset.historyStatus);
    });
  });

  rows.addEventListener('click', async (e) => {
    const cancelBorrowBtn = e.target.closest('[data-cancel-borrow-req]');
    if (cancelBorrowBtn) {
      const reqId = cancelBorrowBtn.getAttribute('data-cancel-borrow-req');
      const ok = await openUserConfirmModal({
        title: 'Hủy yêu cầu mượn sách',
        message: `Bạn có chắc muốn hủy yêu cầu mượn ${reqId}?`,
        confirmText: 'Hủy yêu cầu',
        cancelText: 'Giữ lại',
        danger: true
      });
      if (!ok) return;
      try {
        await DataService.request('DELETE', `/borrowRequests/${encodeURIComponent(reqId)}`);
      } catch (err) {
        showToast(err.message || 'Không thể hủy yêu cầu mượn.', 'error');
        return;
      }
      if (Array.isArray(borrowReqCache)) borrowReqCache = borrowReqCache.filter(r => String(r.id) !== String(reqId));
      showToast(`Đã hủy yêu cầu mượn ${reqId}.`, 'info');
      render('Yêu cầu mượn');
      return;
    }

    const cancelWaitBtn = e.target.closest('[data-cancel-wait-book]');
    if (cancelWaitBtn) {
      const bookId = cancelWaitBtn.getAttribute('data-cancel-wait-book');
      const ok = await openUserConfirmModal({
        title: 'Hủy đăng ký chờ mượn sách',
        message: `Bạn có chắc muốn hủy đăng ký chờ đầu sách ${bookId}?`,
        confirmText: 'Hủy đăng ký chờ',
        cancelText: 'Giữ lại',
        danger: true
      });
      if (!ok) return;
      const reader = getBorrowReaderProfile();
      try {
        await DataService.request('PUT', `/waitingList/${encodeURIComponent(bookId)}`, {
          readerId: reader.id,
          bookTitleId: bookId,
          status: 'DA_HUY'
        });
      } catch (err) {
        showToast(err.message || 'Không thể hủy đăng ký chờ.', 'error');
        return;
      }
      if (Array.isArray(waitingCache)) {
        const w = waitingCache.find(x => String(x.bookTitleId || x.bookId || x.id) === String(bookId));
        if (w) w.status = 'DA_HUY';
      }
      showToast(`Đã hủy đăng ký chờ đầu sách ${bookId}.`, 'info');
      render('Hàng chờ');
      return;
    }

    const btn = e.target.closest('[data-renew-loan-id]');
    if (!btn || btn.disabled) return;
    const loanId = btn.getAttribute('data-renew-loan-id');

    const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { allowOnlineRenewal: 'Bật' };
    if (String(rules.allowOnlineRenewal || 'Bật').toLowerCase().includes('tắt')) {
      showToast('Chức năng gia hạn trực tuyến hiện đang tạm khóa theo quy định thư viện.', 'error');
      return;
    }

    const ok = await openUserConfirmModal({
      title: 'Xác nhận yêu cầu gia hạn',
      message: `Gửi yêu cầu gia hạn thêm 7 ngày cho phiếu mượn ${loanId}? Yêu cầu sẽ chờ thủ thư phê duyệt.`,
      confirmText: 'Gửi yêu cầu gia hạn',
      cancelText: 'Hủy'
    });
    if (!ok) return;

    const renewalId = `GH-${Date.now().toString().slice(-6)}`;
    const renItem = {
      id: renewalId,
      loanId: loanId,
      requestDate: new Date().toLocaleDateString('vi-VN'),
      days: 7,
      status: 'CHO DUYET'
    };

    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';

    try {
      await DataService.request('POST', '/renewals', {
        id: renewalId,
        loanId: loanId,
        requestDate: new Date().toISOString().slice(0, 10),
        days: 7,
        status: 'CHO DUYET'
      });
      const renewals = [renItem, ...getPendingRenewals().filter(r => r.id !== renewalId)];
      renewalsCache = renewals;
      window.dispatchEvent(new CustomEvent('ixs:data-changed', { detail: { key: 'ixs_library_renewals' } }));
      showToast(`Đã gửi yêu cầu gia hạn cho phiếu mượn ${loanId}. Chờ thủ thư phê duyệt!`, 'success');
      render();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = origText;
      showToast(err.message || `Không thể gia hạn phiếu mượn ${loanId}.`, 'error');
    }
  });

  const activeBtn = document.querySelector('[data-history-status].active');
  currentFilter = activeBtn ? activeBtn.dataset.historyStatus : 'Đang mượn';
  render(currentFilter);

  Promise.resolve(DataService.ready).catch(() => {}).then(() => {
    refreshReaderWaiting();
    refreshBorrowRequests();
    refreshReaderRenewals();
    render(currentFilter);
  });
  window.addEventListener('ixs:data-loaded', event => {
    if (event.detail?.key === DataService.KEYS.READER_HISTORY) render(currentFilter);
  });
}

function initPaymentPage() {
  const viewClear = document.getElementById('viewPaymentClear');
  const viewNotice = document.getElementById('viewPaymentNotice');
  const viewMethod = document.getElementById('viewPaymentMethod');
  const viewOnline = document.getElementById('viewPaymentOnline');

  const noticeFeeCount = document.getElementById('noticeFeeCount');
  const noticePaymentTotal = document.getElementById('noticePaymentTotal');
  const noticeDebtItemsContainer = document.getElementById('noticeDebtItemsContainer');
  const btnGoToChooseMethod = document.getElementById('btnGoToChooseMethod');

  const btnBackToNotice = document.getElementById('btnBackToNotice');
  const chooseMethodTotal = document.getElementById('chooseMethodTotal');
  const choicePayAtDesk = document.getElementById('choicePayAtDesk');
  const choicePayOnline = document.getElementById('choicePayOnline');

  const btnBackToChooseMethod = document.getElementById('btnBackToChooseMethod');
  const paymentTotal = document.getElementById('paymentTotal');
  const breakdown = document.getElementById('paymentBreakdown');
  const receiptToggle = document.getElementById('btnTogglePaymentBreakdown');
  const btnSubmitPayment = document.getElementById('btnSubmitPayment');

  const modalNotice = document.getElementById('modalPaymentNotice');
  const qrModalAmount = document.getElementById('qrModalAmount');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const qrTransferContent = document.getElementById('qrTransferContent');

  const modalDesk = document.getElementById('modalPayAtDesk');
  const deskModalAmount = document.getElementById('deskModalAmount');
  const deskReaderInfo = document.getElementById('deskReaderInfo');

  if (!viewNotice && !paymentTotal) return;

  const showView = (viewToShow) => {
    [viewClear, viewNotice, viewMethod, viewOnline].forEach(v => {
      if (v) v.style.display = 'none';
    });
    if (viewToShow) {
      viewToShow.style.display = 'block';
      viewToShow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderFines = () => {
    const reader = getBorrowReaderProfile();
    const readerId = reader.id || '220260004';
    const readerName = reader.fullName || reader.name || 'Độc giả';

    const fines = (typeof getFines === 'function' ? getFines() : []).filter(item => {
      const belongsToReader = !item.readerId || String(item.readerId) === String(readerId);
      const st = normalizeCatalogText(item.paymentStatus || '');
      return belongsToReader && !st.includes('da thanh toan') && !st.includes('paid');
    });
    const paymentPending = fines.length > 0 && fines.every(item => {
      const status = normalizeCatalogText(item.paymentStatus || '');
      return status.includes('cho doi soat') || status.includes('cho thu tai quay');
    });
    const paymentBadge = document.getElementById('noticePaymentStatusBadge');
    if (paymentBadge) {
      paymentBadge.textContent = paymentPending
        ? (fines.every(f => normalizeCatalogText(f.paymentStatus).includes('cho thu tai quay')) ? 'CHỜ THU TẠI QUẦY' : 'CHỜ ĐỐI SOÁT')
        : 'CHƯA THANH TOÁN';
      paymentBadge.style.backgroundColor = paymentPending ? '#FEF3C7' : '#FEE2E2';
      paymentBadge.style.color = paymentPending ? '#92400E' : '#DC2626';
    }

    const total = fines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const formattedTotal = `${total.toLocaleString('vi-VN')} VND`;

    if (noticeFeeCount) noticeFeeCount.textContent = String(fines.length);
    if (noticePaymentTotal) noticePaymentTotal.textContent = formattedTotal;
    if (chooseMethodTotal) chooseMethodTotal.textContent = formattedTotal;
    if (paymentTotal) paymentTotal.textContent = formattedTotal;
    if (qrModalAmount) qrModalAmount.textContent = formattedTotal;
    if (deskModalAmount) deskModalAmount.textContent = formattedTotal;

    const transferNote = `IXS PHAT ${readerId}`;
    if (qrTransferContent) qrTransferContent.textContent = transferNote;
    if (deskReaderInfo) deskReaderInfo.textContent = `${readerName} - ${readerId}`;
    if (qrCodeImg) {
      const qrData = encodeURIComponent(`VietQR|IXS_LIBRARY|${readerId}|${total}|${transferNote}`);
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
    }

    if (!fines.length || total <= 0) {
      if (viewClear) {
        showView(viewClear);
      } else {
        if (noticeDebtItemsContainer) {
          noticeDebtItemsContainer.innerHTML = '<div style="padding: 16px; color: #16A34A; font-weight: 600;">Bạn hiện không có khoản phạt nào cần thanh toán.</div>';
        }
        if (btnGoToChooseMethod) btnGoToChooseMethod.disabled = true;
      }
      return;
    }

    if (btnGoToChooseMethod) btnGoToChooseMethod.disabled = paymentPending;
    if (paymentPending && noticeDebtItemsContainer) {
      noticeDebtItemsContainer.innerHTML = '<div style="padding:16px;color:#92400E;font-weight:600;">Yêu cầu thanh toán đang chờ thư viện xác nhận.</div>';
    }
    if (viewMethod?.style.display !== 'block' && viewOnline?.style.display !== 'block') {
      showView(viewNotice);
    }

    const itemsHtml = fines.map(item => {
      const title = item.violation || (item.bookTitle ? `Phí phạt: ${item.bookTitle}` : `Khoản phạt ${item.id}`);
      const amt = `${Number(item.amount || 0).toLocaleString('vi-VN')} VND`;
      return `
        <div class="payment-breakdown-item">
          <span class="breakdown-bullet">•</span>
          <span class="breakdown-name">${escapeCatalogHtml(title)}</span>
          <span class="breakdown-amount">${escapeCatalogHtml(amt)}</span>
        </div>
      `;
    }).join('');

    if (noticeDebtItemsContainer) noticeDebtItemsContainer.innerHTML = itemsHtml;
    if (breakdown) breakdown.innerHTML = itemsHtml;
  };

  // Chuyển bước
  btnGoToChooseMethod?.addEventListener('click', () => {
    showView(viewMethod);
  });

  btnBackToNotice?.addEventListener('click', () => {
    showView(viewNotice);
  });

  btnBackToChooseMethod?.addEventListener('click', () => {
    showView(viewMethod);
  });

  choicePayOnline?.addEventListener('click', () => {
    showView(viewOnline);
  });

  choicePayAtDesk?.addEventListener('click', () => {
    if (modalDesk) modalDesk.classList.add('active');
  });

  const submitPaymentRequest = async method => {
    const reader = getBorrowReaderProfile();
    const readerId = reader.id || reader.readerId || reader.maBanDoc;
    if (!readerId) {
      showToast('Không xác định được mã bạn đọc để gửi yêu cầu thanh toán.', 'error');
      return false;
    }
    try {
      await DataService.request('POST', '/readerPayments', { readerId, method });
      await DataService.hydrate(DataService.KEYS.FINES, 'fines', []);
      renderFines();
      showToast(method === 'BANK_TRANSFER'
        ? 'Đã gửi yêu cầu đối soát chuyển khoản. Khoản phạt sẽ được cập nhật sau khi thư viện xác nhận.'
        : 'Đã báo thanh toán tại quầy. Thủ thư sẽ xác nhận khoản thu.', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Không thể gửi yêu cầu thanh toán.', 'error');
      return false;
    }
  };

  // Modal bàn thủ thư
  if (modalDesk) {
    const closeDesk = () => modalDesk.classList.remove('active');
    document.getElementById('btnClosePayAtDeskModal')?.addEventListener('click', closeDesk);
    document.getElementById('btnConfirmPayAtDesk')?.addEventListener('click', async () => {
      if (await submitPaymentRequest('AT_DESK')) closeDesk();
    });
    modalDesk.addEventListener('click', e => {
      if (e.target === modalDesk) closeDesk();
    });
  }

  // Thu gọn / mở rộng biên lai
  receiptToggle?.addEventListener('click', () => {
    if (!breakdown) return;
    const isHidden = breakdown.style.display === 'none';
    breakdown.style.display = isHidden ? 'flex' : 'none';
    const arrow = receiptToggle.querySelector('.arrow-icon');
    if (arrow) arrow.textContent = isHidden ? '›' : '‹';
  });

  // Modal QR
  if (modalNotice && btnSubmitPayment) {
    const closeQr = () => modalNotice.classList.remove('active');
    document.getElementById('btnClosePaymentNotice')?.addEventListener('click', closeQr);
    document.getElementById('btnConfirmPaymentNotice')?.addEventListener('click', async () => {
      if (await submitPaymentRequest('BANK_TRANSFER')) closeQr();
    });
    modalNotice.addEventListener('click', e => {
      if (e.target === modalNotice) closeQr();
    });
    btnSubmitPayment.addEventListener('click', () => {
      modalNotice.classList.add('active');
    });
  }

  renderFines();
  Promise.resolve(DataService.ready).catch(() => {}).then(renderFines);
  window.addEventListener('ixs:data-loaded', event => {
    if (event.detail?.key === DataService.KEYS.FINES) renderFines();
  });
}

function initSuggestionsPage() {
  const rows = document.getElementById('suggestionRows');
  if (!rows) return;

  const modal = document.getElementById('modalCreateSuggestion');
  const detailModal = document.getElementById('modalSuggestionDetail');
  const form = document.getElementById('formCreateSuggestion');
  const errBox = document.getElementById('suggestionFormError');
  const submitBtn = document.getElementById('btnSubmitSuggestion');
  const coverInput = document.getElementById('suggestionCover');
  const coverPreview = document.getElementById('suggestionCoverPreview');
  const coverPrompt = document.getElementById('suggestionCoverPrompt');
  const search = document.getElementById('suggestionSearch');
  const pagination = document.getElementById('suggestionPagination');
  let currentFilter = 'all';
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let coverData = '';

  const normalizeStatus = st => {
    const s = String(st || '').toLowerCase().trim();
    if (s.includes('đã duyệt') || s.includes('da duyet') || s.includes('approved') || s.includes('chap nhan')) return 'Đã duyệt';
    if (s.includes('từ chối') || s.includes('tu choi') || s.includes('rejected')) return 'Từ chối';
    return 'Chờ duyệt';
  };

  const getSuggestions = () => {
    if (typeof getBookSuggestions === 'function') {
      const list = getBookSuggestions();
      return Array.isArray(list) ? list : [];
    }
    return [];
  };

  const setSuggestionErr = (msg) => {
    if (!errBox) return;
    errBox.textContent = msg || '';
    errBox.style.display = msg ? 'block' : 'none';
  };

  const renderPagination = (totalItems) => {
    if (!pagination) return;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    let html = `<button type="button" class="page-box ${currentPage <= 1 ? 'disabled' : ''}" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button type="button" class="page-box ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button type="button" class="page-box ${currentPage >= totalPages ? 'disabled' : ''}" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&gt;</button>`;
    pagination.innerHTML = html;
  };

  const render = () => {
    const query = normalizeCatalogText(search?.value);
    const allSuggestions = getSuggestions();
    const suggestions = allSuggestions.filter(item => {
      const matchQ = !query || normalizeCatalogText(`${item.id} ${item.title} ${item.author || ''}`).includes(query);
      const stNorm = normalizeStatus(item.status);
      const matchStatus = currentFilter === 'all' || stNorm === currentFilter;
      return matchQ && matchStatus;
    });

    const isTable = rows.tagName.toLowerCase() === 'tbody';
    const totalItems = suggestions.length;
    renderPagination(totalItems);

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = suggestions.slice(startIdx, startIdx + PAGE_SIZE);

    if (!pageItems.length) {
      rows.innerHTML = isTable
        ? '<tr><td class="workflow-empty-cell" colspan="6" style="text-align: center; padding: 24px 16px; color: #64748B;">Chưa có đề xuất nào phù hợp.</td></tr>'
        : '<div class="empty-state-box" style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 36px 16px; color: #64748B; font-size: 14px; background-color: #FFFFFF;">Không có đề xuất nào trong trạng thái này.</div>';
      const summary = document.getElementById('suggestionSummary');
      if (summary) summary.textContent = 'Không có đề xuất';
      return;
    }

    rows.innerHTML = pageItems.map(item => {
      const stNorm = normalizeStatus(item.status);
      let statusBadge = '';
      if (stNorm === 'Đã duyệt') {
        statusBadge = '<span class="badge-copy status-badge badge-phys-good">ĐÃ DUYỆT</span>';
      } else if (stNorm === 'Từ chối') {
        statusBadge = '<span class="badge-copy status-badge badge-phys-torn">TỪ CHỐI</span>';
      } else {
        statusBadge = '<span class="badge-copy status-badge badge-circ-borrowed">CHỜ DUYỆT</span>';
      }

      const actionBtn = `<button type="button" class="user-action-icon" title="Xem chi tiết" aria-label="Xem đề xuất ${escapeCatalogHtml(item.title)}" data-suggestion-id="${escapeCatalogHtml(item.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg></button>`;

      if (isTable) {
        return `<tr>
          <td style="font-weight: 700; color: #1E293B;">${escapeCatalogHtml(item.id)}</td>
          <td><strong>${escapeCatalogHtml(item.title)}</strong><br><small style="color: #64748B;">${escapeCatalogHtml(item.type || 'Sách / giáo trình')}</small></td>
          <td>${escapeCatalogHtml(item.author || 'Chưa cập nhật')}</td>
          <td style="text-align: center;">${escapeCatalogHtml(item.year || '—')} · ${escapeCatalogHtml(item.quantity || '—')}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">${actionBtn}</td>
        </tr>`;
      }

      return `<div class="table-row user-suggestion-row">
        <div>${escapeCatalogHtml(item.id)}</div>
        <div>
          <div style="font-weight: 600; color: #1E293B; line-height: 1.4;">${escapeCatalogHtml(item.title)}</div>
          <small style="color: #64748B; font-size: 12px;">${escapeCatalogHtml(item.type || 'Sách / giáo trình')}</small>
        </div>
        <div>${escapeCatalogHtml(item.author || 'Chưa cập nhật')}</div>
        <div>${escapeCatalogHtml(item.year || '—')} · ${escapeCatalogHtml(item.quantity || '—')}</div>
        <div>${statusBadge}</div>
        <div>${actionBtn}</div>
      </div>`;
    }).join('');

    const summary = document.getElementById('suggestionSummary');
    if (summary) summary.textContent = `Hiển thị ${startIdx + 1} - ${Math.min(startIdx + PAGE_SIZE, totalItems)} trên tổng số ${totalItems} đề xuất`;
  };

  if (pagination) {
    pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-box:not(.disabled)');
      if (!btn) return;
      const p = parseInt(btn.dataset.page, 10);
      if (!isNaN(p) && p !== currentPage) {
        currentPage = p;
        render();
      }
    });
  }

  document.querySelectorAll('[data-suggestion-status]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-suggestion-status]').forEach(item => {
        const isTarget = item === button;
        item.classList.toggle('active', isTarget);
        item.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      currentFilter = button.dataset.suggestionStatus || 'all';
      currentPage = 1;
      render();
    });
  });

  const resetCover = () => {
    coverData = '';
    if (coverInput) coverInput.value = '';
    if (coverPreview) { coverPreview.src = ''; coverPreview.hidden = true; }
    if (coverPrompt) coverPrompt.hidden = false;
  };

  const hasSuggestionDraft = () => {
    if (!form) return false;
    return ['suggestionTitle', 'suggestionAuthor', 'suggestionPublisher', 'suggestionYear', 'suggestionQuantity', 'suggestionIsbn', 'suggestionReason']
      .some(id => (document.getElementById(id)?.value || '').trim().length > 0) || Boolean(coverData);
  };

  const closeModal = async (force = false) => {
    if (!force && hasSuggestionDraft()) {
      const ok = await openUserConfirmModal({
        title: 'Hủy đề xuất chưa gửi?',
        message: 'Biểu mẫu đề xuất sách đang có nội dung bạn đã nhập. Bạn có chắc muốn đóng?',
        confirmText: 'Đóng biểu mẫu',
        cancelText: 'Tiếp tục nhập'
      });
      if (!ok) return;
    }
    setSuggestionErr('');
    modal?.classList.remove('active');
  };

  document.getElementById('btnOpenSuggestionForm')?.addEventListener('click', () => {
    const rules = typeof getLibraryRules === 'function' ? getLibraryRules() : { allowBookPurchaseRequest: 'Bật' };
    if (String(rules.allowBookPurchaseRequest || 'Bật').toLowerCase().includes('tắt')) {
      showToast('Chức năng đề xuất mua sách mới hiện đang tạm khóa theo quy định thư viện.', 'error');
      return;
    }
    setSuggestionErr('');
    modal?.classList.add('active');
    document.getElementById('suggestionTitle')?.focus();
  });
  document.getElementById('btnCloseSuggestionForm')?.addEventListener('click', () => closeModal(false));
  document.getElementById('btnCancelSuggestionForm')?.addEventListener('click', () => closeModal(false));
  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal(false);
  });

  if (detailModal) {
    const closeDetail = () => detailModal.classList.remove('active');
    document.getElementById('btnCloseSuggestionDetail')?.addEventListener('click', closeDetail);
    document.getElementById('btnExitSuggestionDetail')?.addEventListener('click', closeDetail);
    detailModal.addEventListener('click', e => {
      if (e.target === detailModal) closeDetail();
    });
  }

  search?.addEventListener('input', () => {
    currentPage = 1;
    render();
  });

  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-suggestion-id]');
    if (!button) return;
    const suggestion = getSuggestions().find(item => String(item.id) === String(button.dataset.suggestionId));
    if (!suggestion) return;
    if (detailModal) {
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
      setTxt('sugDetailCode', suggestion.id);
      setTxt('sugDetailTitle', suggestion.title);
      setTxt('sugDetailAuthor', suggestion.author || 'Chưa cập nhật');
      setTxt('sugDetailPublisher', suggestion.publisher || 'Chưa cập nhật');
      setTxt('sugDetailYearQty', `${suggestion.year || '—'} · ${suggestion.quantity || '—'}`);
      setTxt('sugDetailIsbn', suggestion.isbn || 'Chưa có');
      setTxt('sugDetailStatus', normalizeStatus(suggestion.status));
      const rejectNote = suggestion.rejectionReason || suggestion.lyDoTuChoi;
      const reasonDisplay = rejectNote
        ? `${suggestion.reason || '—'}\n\nLý do từ chối từ thủ thư: ${rejectNote}`
        : (suggestion.reason || 'Không có ghi chú lý do.');
      setTxt('sugDetailReason', reasonDisplay);
      detailModal.classList.add('active');
    } else {
      showToast(suggestion.reason || `Trạng thái đề xuất: ${suggestion.status}`, 'info');
    }
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
    setSuggestionErr('');

    const title = document.getElementById('suggestionTitle').value.trim();
    const author = document.getElementById('suggestionAuthor').value.trim();
    const publisher = document.getElementById('suggestionPublisher').value.trim();
    const yearRaw = document.getElementById('suggestionYear').value.trim();
    const qtyRaw = document.getElementById('suggestionQuantity').value.trim();
    const edition = document.getElementById('suggestionEdition').value;
    const isbn = document.getElementById('suggestionIsbn').value.trim();
    const reason = document.getElementById('suggestionReason').value.trim();

    if (!title) {
      setSuggestionErr('Vui lòng nhập tên sách đề xuất.');
      document.getElementById('suggestionTitle')?.focus();
      return;
    }
    if (!author) {
      setSuggestionErr('Vui lòng nhập tên tác giả.');
      document.getElementById('suggestionAuthor')?.focus();
      return;
    }
    const curYear = new Date().getFullYear();
    if (yearRaw) {
      const y = Number(yearRaw);
      if (!Number.isInteger(y) || y < 1900 || y > curYear + 1) {
        setSuggestionErr(`Năm xuất bản phải từ 1900 đến ${curYear + 1}.`);
        document.getElementById('suggestionYear')?.focus();
        return;
      }
    }
    if (qtyRaw) {
      const q = Number(qtyRaw);
      if (!Number.isInteger(q) || q < 1 || q > 500) {
        setSuggestionErr('Số lượng bản đề xuất phải là số nguyên từ 1 đến 500.');
        document.getElementById('suggestionQuantity')?.focus();
        return;
      }
    }

    const session = getSessionUser();
    const now = new Date();
    const suggestion = {
      id: `DX-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`,
      readerId: session.id || '220260004',
      title,
      author,
      publisher,
      year: yearRaw,
      quantity: qtyRaw ? `${qtyRaw} bản` : '—',
      edition,
      isbn,
      reason,
      coverUrl: coverData,
      status: 'Chờ duyệt',
      type: 'Sách / giáo trình'
    };

    const origBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang gửi...';
    }

    try {
      const current = getSuggestions();
      saveBookSuggestions([suggestion, ...current]);
      const ok = await DataService.waitForWrites([DataService.KEYS.SUGGESTIONS]);
      if (!ok) {
        const writeErr = DataService._writeErrors?.[DataService.KEYS.SUGGESTIONS];
        setSuggestionErr(writeErr?.message || 'Không thể lưu đề xuất sách lên máy chủ. Kiểm tra kết nối và thử lại.');
        return;
      } else {
        showToast('Đã gửi đề xuất sách thành công!', 'success');
      }
      form.reset();
      resetCover();
      closeModal(true);
      render();
    } catch (err) {
      setSuggestionErr(err.message || 'Không thể gửi đề xuất sách.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText || 'Gửi đề xuất';
      }
    }
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
 * 8. Chuông thông báo & Khung dropdown thông báo
 */
const NOTIF_STORAGE_KEY = 'ixs_library_user_notifications';

function getUserNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  const defaults = [
    {
      id: 'NOTIF-001',
      type: 'penalty',
      title: 'Khoản phí trễ hạn mượn sách',
      desc: 'Bạn có khoản phí trễ hạn 100.000 VND cho cuốn sách "Giáo trình Giải tích Tập 2" (quá hạn 5 ngày). Vui lòng thanh toán sớm để tiếp tục mượn sách.',
      time: '10 phút trước',
      targetUrl: 'penalties.html',
      isRead: false,
      actionText: 'Thanh toán ngay'
    },
    {
      id: 'NOTIF-002',
      type: 'card',
      title: 'Thẻ thư viện cần gia hạn / làm lại',
      desc: 'Thẻ thư viện của bạn đã quá hạn hoặc có yêu cầu cấp lại thẻ. Phí dịch vụ: 100.000 VND. Nhấn để thanh toán trực tuyến hoặc tại quầy.',
      time: '1 giờ trước',
      targetUrl: 'penalties.html',
      isRead: false,
      actionText: 'Thanh toán ngay'
    },
    {
      id: 'NOTIF-003',
      type: 'loan',
      title: 'Gia hạn mượn sách thành công',
      desc: 'Sách "Clean Code: A Handbook of Agile Software Craftsmanship" đã được gia hạn mượn thêm 14 ngày. Hạn trả mới: 28/11/2026.',
      time: 'Hôm qua',
      targetUrl: 'history.html',
      isRead: true,
      actionText: 'Xem lịch sử'
    }
  ];

  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveUserNotifications(notifs) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  } catch (_) {}
}

function initNotifications() {
  const btnNotif = document.getElementById('btnNotification');
  if (!btnNotif) return;

  const parent = btnNotif.parentElement;
  if (!parent) return;

  parent.style.position = 'relative';

  // Dropdown container
  let dropdown = parent.querySelector('.user-notif-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'user-notif-dropdown';
    dropdown.id = 'userNotifDropdown';
    parent.appendChild(dropdown);
  }

  // Modal đọc chi tiết thông báo
  let modalDetail = document.getElementById('modalNotificationDetail');
  if (!modalDetail) {
    modalDetail = document.createElement('div');
    modalDetail.className = 'modal-overlay';
    modalDetail.id = 'modalNotificationDetail';
    modalDetail.innerHTML = `
      <div class="modal-box notif-detail-modal-box">
        <div class="notif-modal-header">
          <div class="notif-modal-title-wrap">
            <div class="notif-item-icon-box" id="notifModalIconBox"></div>
            <div>
              <h3 class="notif-modal-title" id="notifModalTitle">Chi tiết thông báo</h3>
              <span class="notif-modal-time" id="notifModalTime"></span>
            </div>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseNotifModal" title="Đóng">✕</button>
        </div>
        <div class="notif-modal-body">
          <div class="notif-modal-desc" id="notifModalDesc"></div>
          <div class="notif-modal-meta">
            <span>Trạng thái: <strong id="notifModalStatus" style="color: #059669;">Đã đọc</strong></span>
            <span id="notifModalTag" style="font-weight: 600; color: #1D5D86;"></span>
          </div>
        </div>
        <div class="notif-modal-footer">
          <button type="button" class="btn btn-secondary" id="btnDismissNotifModal" style="padding: 8px 16px; font-size: 13.5px; border-radius: 8px;">Đóng</button>
          <button type="button" class="btn-notif-action" id="btnGoToNotifPage">
            <span id="notifActionText">Chuyển sang trang này</span> &rarr;
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDetail);

    // Sự kiện đóng modal
    const closeModal = () => modalDetail.classList.remove('active');
    modalDetail.querySelector('#btnCloseNotifModal')?.addEventListener('click', closeModal);
    modalDetail.querySelector('#btnDismissNotifModal')?.addEventListener('click', closeModal);
    modalDetail.addEventListener('click', (e) => {
      if (e.target === modalDetail) closeModal();
    });
  }

  const icons = {
    penalty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    loan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
  };

  // Hàm mở modal đọc chi tiết
  function openNotificationModal(notif) {
    if (!modalDetail) return;
    const iconBox = modalDetail.querySelector('#notifModalIconBox');
    const titleEl = modalDetail.querySelector('#notifModalTitle');
    const timeEl = modalDetail.querySelector('#notifModalTime');
    const descEl = modalDetail.querySelector('#notifModalDesc');
    const statusEl = modalDetail.querySelector('#notifModalStatus');
    const tagEl = modalDetail.querySelector('#notifModalTag');
    const actionBtn = modalDetail.querySelector('#btnGoToNotifPage');
    const actionText = modalDetail.querySelector('#notifActionText');

    if (iconBox) {
      iconBox.className = 'notif-item-icon-box ' + notif.type;
      iconBox.innerHTML = icons[notif.type] || icons.penalty;
    }
    if (titleEl) titleEl.textContent = notif.title;
    if (timeEl) timeEl.textContent = notif.time;
    if (descEl) descEl.textContent = notif.desc;
    if (statusEl) statusEl.textContent = 'Đã đọc';
    if (tagEl) tagEl.textContent = notif.type === 'penalty' ? 'Phí quá hạn: 100.000 VND' : (notif.type === 'card' ? 'Phí làm thẻ: 100.000 VND' : 'Mượn/Trả sách');

    if (actionText) {
      actionText.textContent = notif.targetUrl === 'penalties.html' ? 'Chuyển sang trang Thanh toán' : 'Chuyển sang trang Lịch sử';
    }

    if (actionBtn) {
      actionBtn.onclick = () => {
        modalDetail.classList.remove('active');
        navigateToTarget(notif.targetUrl);
      };
    }

    modalDetail.classList.add('active');
  }

  // Hàm điều hướng
  function navigateToTarget(targetUrl) {
    if (!targetUrl) return;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === targetUrl || (currentPage === '' && targetUrl === 'index.html')) {
      if (targetUrl === 'penalties.html') {
        const card = document.querySelector('.payment-checkout-card');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.outline = '2px solid #2563EB';
          setTimeout(() => { card.style.outline = 'none'; }, 2000);
        }
      }
      if (typeof showToast === 'function') {
        showToast('Bạn đang ở trang ' + (targetUrl === 'penalties.html' ? 'Thanh toán' : 'này'), 'info');
      }
    } else {
      window.location.href = targetUrl;
    }
  }

  function renderDropdown() {
    const notifs = getUserNotifications();
    const unreadCount = notifs.filter(n => !n.isRead).length;

    let badge = btnNotif.querySelector('.topbar-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'topbar-badge badge-red';
      btnNotif.appendChild(badge);
    }

    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    dropdown.innerHTML = `
      <div class="user-notif-header">
        <div class="notif-header-title-wrap">
          <h3 class="notif-header-title">Thông báo</h3>
          <span class="notif-badge-pill ${unreadCount === 0 ? 'empty' : ''}">${unreadCount > 0 ? unreadCount + ' mới' : '0 mới'}</span>
        </div>
        ${unreadCount > 0 ? '<button type="button" class="btn-notif-mark-all" id="btnMarkAllNotifsRead">Đánh dấu đã đọc</button>' : ''}
      </div>

      <div class="user-notif-list">
        ${notifs.length === 0 ? `
          <div class="user-notif-empty">Hiện không có thông báo nào từ thư viện</div>
        ` : notifs.map(n => `
          <div class="notif-item ${!n.isRead ? 'unread' : ''}" data-id="${n.id}" data-url="${n.targetUrl}" title="Nhấn để đọc và chuyển sang trang">
            <div class="notif-item-icon-box ${n.type}">
              ${icons[n.type] || icons.penalty}
            </div>
            <div class="notif-item-content">
              <div class="notif-item-title-row">
                <h4 class="notif-item-title">${n.title}</h4>
                ${!n.isRead ? '<span class="notif-item-unread-dot" title="Chưa đọc"></span>' : ''}
              </div>
              <p class="notif-item-desc">${n.desc}</p>
              <div class="notif-item-meta">
                <span class="notif-item-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${n.time}
                </span>
                <span class="notif-item-action-link" data-action="direct">${n.actionText || 'Xem chi tiết'} &rarr;</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="user-notif-footer">
        <a href="penalties.html" class="btn-notif-view-all">Xem các khoản phí cần thanh toán &rarr;</a>
      </div>
    `;

    const btnMarkAll = dropdown.querySelector('#btnMarkAllNotifsRead');
    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = notifs.map(n => ({ ...n, isRead: true }));
        saveUserNotifications(updated);
        renderDropdown();
        if (typeof showToast === 'function') {
          showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
        }
      });
    }

    const items = dropdown.querySelectorAll('.notif-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const notifId = item.getAttribute('data-id');
        const targetUrl = item.getAttribute('data-url');

        // Đánh dấu đã đọc
        const curNotifs = getUserNotifications();
        const found = curNotifs.find(n => n.id === notifId);
        const updated = curNotifs.map(n => n.id === notifId ? { ...n, isRead: true } : n);
        saveUserNotifications(updated);

        dropdown.classList.remove('active');
        renderDropdown();

        // Nếu người dùng bấm trực tiếp vào liên kết hành động -> chuyển trang ngay
        const isDirectAction = e.target.closest('.notif-item-action-link');
        if (isDirectAction) {
          navigateToTarget(targetUrl);
        } else {
          // Bấm vào thân thông báo -> Mở modal đọc chi tiết, tại modal có nút chuyển sang trang đó
          if (found) {
            openNotificationModal({ ...found, isRead: true });
          } else {
            navigateToTarget(targetUrl);
          }
        }
      });
    });
  }

  renderDropdown();

  btnNotif.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
      renderDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btnNotif.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dropdown.classList.contains('active')) dropdown.classList.remove('active');
      if (modalDetail && modalDetail.classList.contains('active')) modalDetail.classList.remove('active');
    }
  });
}

/**
 * 9. Xử lý Đăng xuất
 */
function initLogoutActions() {
  const btnLogout = document.getElementById('btnUserLogout');
  if (!btnLogout) return;

  btnLogout.addEventListener('click', async () => {
    const ok = await openUserConfirmModal({
      title: 'Đăng xuất tài khoản',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống thư viện?',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      danger: true
    });
    if (ok) {
      await DataService.logout();
      window.location.href = '../login.html';
    }
  });
}

/**
 * Toast Notification Helper (Đồng bộ admin.css, an toàn XSS và hỗ trợ Hoàn tác)
 */
function showToast(message, type = 'info', action = null) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const msgSpan = document.createElement('span');
  msgSpan.textContent = String(message || '');
  toast.appendChild(msgSpan);

  if (action && typeof action.onClick === 'function' && action.label) {
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = action.label;
    undoBtn.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.appendChild(undoBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:inherit;font-size:16px;line-height:1;';
  closeBtn.setAttribute('aria-label', 'Đóng thông báo');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => toast.remove());
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  const duration = action ? 6000 : 3500;
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, duration);
}
