let countdownInterval;
let resetTargetPhone = '';

function switchForm(targetFormId) {
  document.querySelectorAll('.card').forEach(form => form.classList.remove('active'));
  const target = document.getElementById(targetFormId);
  if (target) target.classList.add('active');
}

function togglePassword(icon) {
  const input = icon.previousElementSibling;
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('fa-eye', input.type === 'password');
  icon.classList.toggle('fa-eye-slash', input.type !== 'password');
}

function moveOtpFocus(current, event) {
  if (event.key === 'Backspace' && current.value === '') {
    const previous = current.previousElementSibling;
    if (previous) previous.focus();
  } else if (current.value.length === 1) {
    const next = current.nextElementSibling;
    if (next) next.focus();
  }
}

function showFieldError(id, message) {
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
  ['register-error', 'login-error', 'otp-error', 'reset-error'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  });
}

/**
 * Xử lý đăng nhập hệ thống & Phân quyền chuyển hướng theo đúng đối tượng (Admin / Thủ thư -> admin/, Bạn đọc -> user/)
 * Hỗ trợ linh hoạt:
 * 1. Khi có Backend PostgreSQL API (http://localhost:3000): Xác thực dữ liệu thực tế từ Database.
 * 2. Khi chạy Offline / Live Server: Tự động kích hoạt cơ chế tài khoản trải nghiệm mẫu (admin, thuthu, tannin / 123456).
 */
async function handleLogin() {
  clearFieldErrors();
  const usernameInput = document.getElementById('demo-login-email');
  const passwordInput = document.getElementById('demo-login-pwd');
  const error = document.getElementById('login-error');
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    if (error) {
      error.innerText = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!';
      error.style.display = 'block';
    }
    return;
  }

  let user = null;
  let apiConnected = false;

  // 1. Thử xác thực với Backend API PostgreSQL
  try {
    if (typeof DataService !== 'undefined' && typeof DataService.request === 'function') {
      const result = await DataService.request('POST', '/auth/login', { username, password });
      user = result && result.user;
      apiConnected = true;
    }
  } catch (err) {
    if (err && err.status === 403) {
      if (error) {
        error.innerText = 'Tài khoản của bạn đã bị khóa hoặc chưa được cấp quyền hoạt động!';
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

    try {
      if (typeof addLog === 'function') {
        addLog('ĐĂNG NHẬP', session.id, `Người dùng <strong>${session.name}</strong> (${session.role}) đăng nhập thành công.`);
      }
    } catch (e) {
      console.warn('Logging skipped:', e);
    }

    // Chuyển hướng đúng đối tượng
    window.location.href = isReader ? 'user/index.html' : 'admin/index.html';
    return;
  }

  // 3. Cơ chế dự phòng trải nghiệm mẫu (Offline / Seed Accounts Fallback)
  // Khi Backend chưa chạy hoặc CSDL mới khởi tạo chưa có tài khoản mẫu
  const q = username.toLowerCase();
  let mockUser = null;

  if (q === 'admin' || q === 'admin@leaflibrary.vn') {
    mockUser = {
      id: '12026001',
      username: 'admin',
      fullName: 'Quản trị viên',
      name: 'Quản trị viên',
      role: 'QUẢN TRỊ VIÊN',
      accountType: 'employee',
      email: 'admin@leaflibrary.vn',
      phone: '0906.789.982',
      password: '123456'
    };
  } else if (q === 'thuthu' || q === 'thuthu@leaflibrary.vn') {
    mockUser = {
      id: '12026002',
      username: 'thuthu',
      fullName: 'Thủ thư quầy',
      name: 'Thủ thư quầy',
      role: 'THỦ THƯ QUẦY',
      accountType: 'employee',
      email: 'thuthu@leaflibrary.vn',
      phone: '0909.123.456',
      password: '123456'
    };
  } else if (q === 'tannin' || q === 'tannin@gmail.com' || q === '220260001') {
    mockUser = {
      id: '220260001',
      username: 'tannin',
      fullName: 'Nguyễn Tấn Nin',
      name: 'Nguyễn Tấn Nin',
      role: 'Sinh viên',
      accountType: 'reader',
      email: 'tannin@gmail.com',
      phone: '0912.345.678',
      cccd: '079204001234',
      password: '123456'
    };
  }

  if (mockUser) {
    if (password !== (mockUser.password || '123456')) {
      if (error) {
        error.innerText = 'Mật khẩu không chính xác!';
        error.style.display = 'block';
      }
      return;
    }

    const isReader = mockUser.accountType === 'reader';
    const session = {
      id: mockUser.id,
      username: mockUser.username,
      fullName: mockUser.fullName,
      name: mockUser.name,
      role: mockUser.role,
      accountType: mockUser.accountType,
      userType: isReader ? 'READER' : 'EMPLOYEE',
      readerType: isReader ? mockUser.role : undefined,
      email: mockUser.email || '',
      phone: mockUser.phone || '',
      cccd: mockUser.cccd || '',
      dob: '',
      gender: 'Nam',
      address: 'Thành phố Hồ Chí Minh',
      avatarUrl: ''
    };

    localStorage.setItem('ixs_library_session', JSON.stringify(session));
    localStorage.setItem('ixs_library_current_user', JSON.stringify(session));

    try {
      if (typeof addLog === 'function') {
        addLog('ĐĂNG NHẬP', session.id, `Người dùng <strong>${session.name}</strong> (${session.role}) đăng nhập thành công.`);
      }
    } catch (e) {
      console.warn('Logging skipped:', e);
    }

    // Chuyển hướng đúng đối tượng
    window.location.href = isReader ? 'user/index.html' : 'admin/index.html';
    return;
  }

  // 4. Nếu không khớp cả Backend lẫn Mock
  if (error) {
    if (apiConnected) {
      error.innerText = 'Tên đăng nhập hoặc mật khẩu không chính xác!';
    } else {
      error.innerText = 'Không thể kết nối máy chủ Backend. Bạn có thể trải nghiệm bằng tài khoản mẫu: admin / thuthu / tannin (Mật khẩu: 123456).';
    }
    error.style.display = 'block';
  }
}

/** Register an employee account in PostgreSQL. */
async function validateRegister() {
  clearFieldErrors();
  let isValid = true;
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim().replace(/[\s.-]/g, '');
  const identifier = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pwd').value;
  const confirmation = document.getElementById('reg-pwd-confirm').value;
  const terms = document.getElementById('reg-terms').checked;
  const error = document.getElementById('register-error');
  if (!name) { showFieldError('err-reg-name', 'Vui lòng nhập họ và tên.'); isValid = false; }
  if (!/^\d{10}$/.test(phone)) { showFieldError('err-reg-phone', 'Số điện thoại phải bao gồm đúng 10 chữ số.'); isValid = false; }
  if (!identifier) { showFieldError('err-reg-email', 'Vui lòng nhập mã nhân viên hoặc email.'); isValid = false; }
  if (password.length < 8) { showFieldError('err-reg-pwd', 'Mật khẩu phải có tối thiểu 8 ký tự.'); isValid = false; }
  if (!confirmation || password !== confirmation) { showFieldError('err-reg-pwd-confirm', 'Mật khẩu xác nhận không khớp.'); isValid = false; }
  if (!terms) { error.innerText = 'Vui lòng đồng ý với Điều khoản sử dụng.'; error.style.display = 'block'; isValid = false; }
  if (!isValid) return;

  const username = identifier.toLowerCase();
  try {
    await DataService.request('POST', '/auth/register', {
      name, username, email: username.includes('@') ? username : '', phone, password
    });
  } catch (err) {
    error.innerText = err.status === 409
      ? 'Tên đăng nhập hoặc email đã tồn tại trong hệ thống.'
      : err.status === 0
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.'
        : 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.';
    error.style.display = 'block';
    return;
  }
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-phone').value = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-pwd').value = '';
  document.getElementById('reg-pwd-confirm').value = '';
  document.getElementById('reg-terms').checked = true;
  const loginInput = document.getElementById('demo-login-email');
  if (loginInput) loginInput.value = username;
  switchForm('form-login');
  const loginError = document.getElementById('login-error');
  if (loginError) { loginError.innerText = 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.'; loginError.style.display = 'block'; }
}

async function goToOTP() {
  clearFieldErrors();
  const input = document.getElementById('forgot-phone');
  const phone = input ? input.value.replace(/\D/g, '') : '';
  if (!/^\d{10}$/.test(phone)) {
    showFieldError('err-forgot-phone', 'Số điện thoại phải bao gồm đúng 10 chữ số.');
    return;
  }
  try {
    await DataService.request('POST', '/auth/password-reset/request', { phone });
    resetTargetPhone = phone;
    document.querySelectorAll('.otp-box').forEach(box => { box.value = ''; });
    document.getElementById('display-phone').innerText = `${phone.slice(0, 2)}******${phone.slice(-2)}`;
    switchForm('form-otp');
    startCountdown(300);
  } catch (error) {
    const message = error.status === 429
      ? 'Vui lòng chờ 1 phút trước khi yêu cầu gửi lại mã.'
      : error.status === 0
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.'
        : error.status === 502 || error.status === 503
          ? 'Dịch vụ SMS tạm thời không khả dụng. Vui lòng liên hệ quản trị viên.'
        : 'Không thể gửi mã xác nhận. Vui lòng thử lại sau.';
    if (resetTargetPhone) showFieldError('otp-error', message);
    else showFieldError('err-forgot-phone', message);
  }
}

function continuePasswordReset() {
  const otp = Array.from(document.querySelectorAll('.otp-box')).map(box => box.value.trim()).join('');
  if (!/^\d{6}$/.test(otp)) {
    window.alert('Vui lòng nhập đủ 6 chữ số mã xác thực OTP.');
    return;
  }
  switchForm('form-reset');
}

function resendPasswordResetCode() {
  goToOTP();
}

function startCountdown(seconds) {
  clearInterval(countdownInterval);
  let timeLeft = seconds;
  const timerDisplay = document.getElementById('countdown-timer');
  timerDisplay.innerText = timeLeft + ' giây';

  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      timerDisplay.innerText = timeLeft + ' giây';
    } else {
      clearInterval(countdownInterval);
      timerDisplay.innerText = '0 giây (Đã hết hạn)';
    }
  }, 1000);
}

function cancelOTP() {
  clearInterval(countdownInterval);
  resetTargetPhone = '';
  switchForm('form-phone');
}

async function handlePasswordReset() {
  const newPassword = document.getElementById('demo-new-pwd').value;
  const confirmation = document.getElementById('demo-confirm-new-pwd').value;
  const otp = Array.from(document.querySelectorAll('.otp-box')).map(box => box.value.trim()).join('');
  const error = document.getElementById('reset-error');
  error.style.display = 'none';
  if (newPassword.length < 8) {
    error.innerText = 'Mật khẩu phải có tối thiểu 8 ký tự.';
    error.style.display = 'block';
    return;
  }
  if (newPassword !== confirmation) {
    error.innerText = 'Mật khẩu xác nhận không khớp.';
    error.style.display = 'block';
    return;
  }
  try {
    await DataService.request('POST', '/auth/password-reset', { phone: resetTargetPhone, otp, newPassword });
    clearInterval(countdownInterval);
    document.getElementById('demo-new-pwd').value = '';
    document.getElementById('demo-confirm-new-pwd').value = '';
    document.querySelectorAll('.otp-box').forEach(box => { box.value = ''; });
    switchForm('form-login');
    const loginError = document.getElementById('login-error');
    loginError.innerText = 'Cập nhật mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.';
    loginError.style.display = 'block';
  } catch (requestError) {
    error.innerText = requestError.status === 0
      ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.'
      : requestError.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.';
    error.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginEmailInput = document.getElementById('demo-login-email');
  const loginPwdInput = document.getElementById('demo-login-pwd');

  [loginEmailInput, loginPwdInput].forEach(el => {
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLogin();
        }
      });
    }
  });
});
