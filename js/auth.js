function switchForm(targetFormId) {
  clearFieldErrors();
  const successEl = document.getElementById('login-success');
  if (successEl) {
    successEl.style.display = 'none';
    successEl.innerText = '';
  }
  document.querySelectorAll('.card').forEach(form => form.classList.remove('active'));
  const target = document.getElementById(targetFormId);
  if (target) {
    target.classList.add('active');
    const firstInput = target.querySelector('input:not([type="checkbox"])');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }
}

function togglePassword(trigger) {
  const wrapper = trigger?.closest('.input-wrapper');
  const input = wrapper ? wrapper.querySelector('input') : trigger?.previousElementSibling;
  const icon = trigger?.tagName === 'BUTTON' ? trigger.querySelector('i') : trigger;
  if (!input) return;
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  if (icon) {
    icon.classList.toggle('fa-eye', !showing);
    icon.classList.toggle('fa-eye-slash', showing);
  }
  if (trigger?.tagName === 'BUTTON') {
    trigger.setAttribute('aria-pressed', showing ? 'true' : 'false');
  }
}

function showFieldError(id, message, inputId = null) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = message;
    element.style.display = 'block';
  }
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) input.classList.add('is-invalid');
  }
}

function showBannerMessage(id, message) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = message;
    element.style.display = 'block';
  }
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(element => {
    element.style.display = 'none';
    element.innerText = '';
  });
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  ['register-error', 'login-error'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
      element.innerText = '';
    }
  });
}

function setButtonLoading(btnId, isLoading, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}

async function handleLogin() {
  clearFieldErrors();
  const successBanner = document.getElementById('login-success');
  if (successBanner) successBanner.style.display = 'none';

  const usernameInput = document.getElementById('demo-login-email');
  const passwordInput = document.getElementById('demo-login-pwd');
  const error = document.getElementById('login-error');
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  let valid = true;
  if (!username) {
    showFieldError('err-login-username', 'Vui lòng nhập tên đăng nhập, email hoặc số điện thoại.', 'demo-login-email');
    valid = false;
  }
  if (!password) {
    showFieldError('err-login-pwd', 'Vui lòng nhập mật khẩu.', 'demo-login-pwd');
    valid = false;
  }
  if (!valid) {
    const firstInvalid = document.querySelector('#form-login .is-invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  let user = null;
  let apiConnected = false;
  setButtonLoading('btn-login-submit', true, 'Đang đăng nhập...');

  try {
    // 1. Thử xác thực với Backend API PostgreSQL
    try {
      if (typeof DataService !== 'undefined' && typeof DataService.request === 'function') {
        const result = await DataService.request('POST', '/auth/login', { username, password });
        user = result?.user;
        if (result?.token) sessionStorage.setItem('ixs_library_token', result.token);
        apiConnected = true;
      }
    } catch (err) {
      if (err && err.status === 403) {
        if (error) {
          error.innerText = err.message;
          error.style.display = 'block';
        }
        return;
      }
      if (err && err.status === 401) {
        apiConnected = true;
      }
    }

    // 2. Nếu đăng nhập thành công qua Backend API
    if (user) {
      const isReader = user.accountType === 'reader' ||
        (user.role && (user.role.toLowerCase().includes('độc giả') || user.role.toLowerCase().includes('bạn đọc') || user.role.toLowerCase().includes('sinh viên')));

      const session = {
        id: String(user.id),
        username: String(user.username || username),
        fullName: String(user.fullName || user.name || (isReader ? 'Bạn đọc' : 'Quản trị viên')),
        name: String(user.fullName || user.name || (isReader ? 'Bạn đọc' : 'Quản trị viên')),
        role: String(user.role || (isReader ? 'Sinh viên' : 'QUẢN TRỊ VIÊN')),
        accountType: isReader ? 'reader' : 'employee',
        userType: isReader ? 'READER' : 'EMPLOYEE',
        readerType: isReader ? (user.role || 'Sinh viên') : undefined,
        email: String(user.email || ''),
        phone: String(user.phone || ''),
        cccd: String(user.cccd || ''),
        dob: String(user.dob || ''),
        gender: String(user.gender || 'Nam'),
        address: String(user.address || ''),
        avatarUrl: String(user.avatarUrl || '')
      };

      localStorage.setItem('ixs_library_session', JSON.stringify(session));
      localStorage.setItem('ixs_library_current_user', JSON.stringify(session));
      sessionStorage.setItem('ixs_library_session', JSON.stringify(session));
      sessionStorage.setItem('ixs_library_current_user', JSON.stringify(session));

      try {
        if (typeof addLog === 'function') {
          addLog('ĐĂNG NHẬP', session.id, `Người dùng <strong>${session.name}</strong> (${session.role}) đăng nhập thành công.`);
        }
      } catch (e) {
        console.warn('Logging skipped:', e);
      }

      window.location.href = isReader ? 'user/index.html' : isLibraryAdmin(user.role) ? 'admin/index.html' : 'admin/books.html';
      return;
    }

    if (error) {
      if (apiConnected) {
        error.innerText = 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      } else {
        error.innerText = 'Không thể kết nối máy chủ Backend.';
      }
      error.style.display = 'block';
    }
  } finally {
    setButtonLoading('btn-login-submit', false);
  }
}

/** Register a reader account in PostgreSQL (Seq 2.1.2). */
async function validateRegister() {
  clearFieldErrors();
  let isValid = true;
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim().replace(/[\s.-]/g, '');
  const cccdEl = document.getElementById('reg-cccd');
  const cccd = cccdEl ? cccdEl.value.trim() : '';
  const identifier = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pwd').value;
  const confirmation = document.getElementById('reg-pwd-confirm').value;
  const terms = document.getElementById('reg-terms').checked;
  const error = document.getElementById('register-error');

  if (!name) { showFieldError('err-reg-name', 'Vui lòng nhập họ và tên.', 'reg-name'); isValid = false; }
  if (!/^\d{10,11}$/.test(phone)) { showFieldError('err-reg-phone', 'Số điện thoại phải gồm 10 hoặc 11 chữ số.', 'reg-phone'); isValid = false; }
  if (cccd && !/^\d{9}$|^\d{12}$/.test(cccd)) { showFieldError('err-reg-cccd', 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.', 'reg-cccd'); isValid = false; }
  if (!identifier || identifier.length < 3 || /\s/.test(identifier)) {
    showFieldError('err-reg-email', 'Vui lòng nhập tên đăng nhập hoặc email hợp lệ (tối thiểu 3 ký tự, không khoảng trắng).', 'reg-email');
    isValid = false;
  } else if (identifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    showFieldError('err-reg-email', 'Địa chỉ email không đúng định dạng.', 'reg-email');
    isValid = false;
  }
  if (password.length < 8) { showFieldError('err-reg-pwd', 'Mật khẩu phải có tối thiểu 8 ký tự.', 'reg-pwd'); isValid = false; }
  if (!confirmation || password !== confirmation) { showFieldError('err-reg-pwd-confirm', 'Mật khẩu xác nhận không khớp.', 'reg-pwd-confirm'); isValid = false; }
  if (!terms) { error.innerText = 'Vui lòng đồng ý với Điều khoản sử dụng.'; error.style.display = 'block'; isValid = false; }
  if (!isValid) {
    const firstInvalid = document.querySelector('#form-register .is-invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const username = identifier.toLowerCase();
  setButtonLoading('btn-register-submit', true, 'Đang tạo tài khoản...');
  try {
    await DataService.request('POST', '/auth/register', {
      name, username, email: username.includes('@') ? username : '', phone, cccd, password, accountType: 'reader'
    });
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-phone').value = '';
    if (cccdEl) cccdEl.value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pwd').value = '';
    document.getElementById('reg-pwd-confirm').value = '';
    document.getElementById('reg-terms').checked = true;
    const loginInput = document.getElementById('demo-login-email');
    if (loginInput) loginInput.value = username;
    switchForm('form-login');
    showBannerMessage('login-success', 'Đăng ký tài khoản bạn đọc thành công! Tài khoản đang chờ thủ thư hoặc quản trị viên duyệt.');
  } catch (err) {
    error.innerText = err.status === 409
      ? (err.message || 'Tên đăng nhập, email, số điện thoại hoặc CCCD đã tồn tại trong hệ thống.')
      : err.status === 0
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.'
        : err.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.';
    error.style.display = 'block';
  } finally {
    setButtonLoading('btn-register-submit', false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const bindEnter = (selector, handler) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handler();
        }
      });
    });
  };

  bindEnter('#form-login input', handleLogin);
  bindEnter('#form-register input:not([type="checkbox"])', validateRegister);
});
