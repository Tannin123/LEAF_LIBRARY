let countdownInterval;
let resetTargetPhone = '';

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

function moveOtpFocus(current, event) {
  current.value = current.value.replace(/\D/g, '').slice(0, 1);
  if (event.key === 'Backspace' && current.value === '') {
    const previous = current.previousElementSibling;
    if (previous) previous.focus();
  } else if (current.value.length === 1) {
    const next = current.nextElementSibling;
    if (next) next.focus();
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
  ['register-error', 'login-error', 'otp-error', 'reset-error'].forEach(id => {
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

/**
 * Xử lý đăng nhập hệ thống & Phân quyền chuyển hướng theo đúng đối tượng (Admin / Thủ thư -> admin/, Bạn đọc -> user/)
 * Backend PostgreSQL xác thực tài khoản và cấp phiên; frontend chuyển hướng theo vai trò.
 */
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
  let resultToken = null;
  setButtonLoading('btn-login-submit', true, 'Đang đăng nhập...');

  try {
    // 1. Thử xác thực với Backend API PostgreSQL
    try {
      if (typeof DataService !== 'undefined' && typeof DataService.request === 'function') {
        const result = await DataService.request('POST', '/auth/login', { username, password });
        user = result && result.user;
        resultToken = result && result.token;
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
        token: resultToken,
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

      window.location.href = isReader ? 'user/index.html' : 'admin/index.html';
      return;
    }

    if (error) {
      if (apiConnected) {
        error.innerText = 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      } else {
        error.innerText = 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
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
    const result = await DataService.request('POST', '/auth/register', {
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
    showBannerMessage('login-success', result?.message || 'Đăng ký thành công. Vui lòng chờ thư viện xét duyệt trước khi đăng nhập.');
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

async function goToOTP() {
  clearFieldErrors();
  const input = document.getElementById('forgot-phone');
  const phone = input ? input.value.replace(/\D/g, '') : '';
  if (!/^\d{10}$/.test(phone)) {
    showFieldError('err-forgot-phone', 'Số điện thoại phải bao gồm đúng 10 chữ số.', 'forgot-phone');
    if (input) input.focus();
    return;
  }
  setButtonLoading('btn-forgot-submit', true, 'Đang gửi mã OTP...');
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
          : error.message || 'Không thể gửi mã xác nhận. Vui lòng thử lại sau.';
    if (resetTargetPhone) showBannerMessage('otp-error', message);
    else showFieldError('err-forgot-phone', message, 'forgot-phone');
  } finally {
    setButtonLoading('btn-forgot-submit', false);
  }
}

function continuePasswordReset() {
  clearFieldErrors();
  const otp = Array.from(document.querySelectorAll('.otp-box')).map(box => box.value.trim()).join('');
  if (!/^\d{6}$/.test(otp)) {
    showBannerMessage('otp-error', 'Vui lòng nhập đủ 6 chữ số mã xác thực OTP.');
    const firstEmpty = Array.from(document.querySelectorAll('.otp-box')).find(b => !b.value.trim());
    if (firstEmpty) firstEmpty.focus();
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
  clearFieldErrors();
  const newPassword = document.getElementById('demo-new-pwd').value;
  const confirmation = document.getElementById('demo-confirm-new-pwd').value;
  const otp = Array.from(document.querySelectorAll('.otp-box')).map(box => box.value.trim()).join('');
  const error = document.getElementById('reset-error');
  let valid = true;

  if (newPassword.length < 8) {
    showFieldError('err-reset-pwd', 'Mật khẩu phải có tối thiểu 8 ký tự.', 'demo-new-pwd');
    valid = false;
  }
  if (!confirmation || newPassword !== confirmation) {
    showFieldError('err-reset-confirm', 'Mật khẩu xác nhận không khớp.', 'demo-confirm-new-pwd');
    valid = false;
  }
  if (!valid) return;

  setButtonLoading('btn-reset-submit', true, 'Đang cập nhật...');
  try {
    await DataService.request('POST', '/auth/password-reset', { phone: resetTargetPhone, otp, newPassword });
    clearInterval(countdownInterval);
    document.getElementById('demo-new-pwd').value = '';
    document.getElementById('demo-confirm-new-pwd').value = '';
    document.querySelectorAll('.otp-box').forEach(box => { box.value = ''; });
    switchForm('form-login');
    showBannerMessage('login-success', 'Cập nhật mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
  } catch (requestError) {
    error.innerText = requestError.status === 0
      ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.'
      : requestError.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.';
    error.style.display = 'block';
  } finally {
    setButtonLoading('btn-reset-submit', false);
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
  bindEnter('#form-phone input', goToOTP);
  bindEnter('#form-otp input', continuePasswordReset);
  bindEnter('#form-reset input', handlePasswordReset);

  // Hỗ trợ dán 6 chữ số OTP trực tiếp
  const otpBoxes = document.querySelectorAll('.otp-box');
  otpBoxes.forEach((box, idx) => {
    box.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits.length > 1) {
        e.preventDefault();
        otpBoxes.forEach((b, i) => { b.value = digits[i] || ''; });
        const focusIdx = Math.min(digits.length, otpBoxes.length - 1);
        otpBoxes[focusIdx]?.focus();
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && idx > 0) otpBoxes[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
    });
  });
});
