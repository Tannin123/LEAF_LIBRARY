let countdownInterval;
let resetTargetPhone = '';

/**
 * Chuyển đổi qua lại giữa các thẻ Card (Đăng nhập / Đăng ký / Quên mật khẩu / OTP)
 */
function switchForm(targetFormId) {
  const forms = document.querySelectorAll('.card');
  forms.forEach(form => {
    form.classList.remove('active');
  });
  const targetForm = document.getElementById(targetFormId);
  if (targetForm) {
    targetForm.classList.add('active');
  }
}

/**
 * Ẩn / Hiện mật khẩu trong ô input
 */
function togglePassword(icon) {
  const input = icon.previousElementSibling;
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function moveOtpFocus(current, event) {
  if (event.key === 'Backspace' && current.value === '') {
    const prev = current.previousElementSibling;
    if (prev) prev.focus();
  } else if (current.value.length === 1) {
    const next = current.nextElementSibling;
    if (next) next.focus();
  }
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = msg;
    el.style.display = 'block';
  }
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.style.display = 'none';
    el.innerText = '';
  });
  const regErr = document.getElementById('register-error');
  if (regErr) regErr.style.display = 'none';
  const loginErr = document.getElementById('login-error');
  if (loginErr) loginErr.style.display = 'none';
}

/**
 * Xử lý đăng nhập hệ thống (Hỗ trợ tạo phiên tạm thời khi bảng employees đang rỗng)
 */
function handleLogin() {
  clearFieldErrors();
  const emailInput = document.getElementById('demo-login-email');
  const pwdInput = document.getElementById('demo-login-pwd');
  const loginErr = document.getElementById('login-error');

  const rawUser = emailInput ? emailInput.value.trim() : '';
  const rawPwd = pwdInput ? pwdInput.value.trim() : '';

  if (!rawUser || !rawPwd) {
    if (loginErr) {
      loginErr.innerText = 'Vui lòng nhập đầy đủ tên người dùng và mật khẩu!';
      loginErr.style.display = 'block';
    }
    return;
  }

  const employees = typeof getEmployees === 'function' ? getEmployees() : [];
  const q = rawUser.toLowerCase();

  let matchedUser = employees.find(emp => {
    const matchId = emp.id && emp.id.toLowerCase() === q;
    const matchUsername = emp.username && emp.username.toLowerCase() === q;
    const matchEmail = emp.email && emp.email.toLowerCase() === q;
    const matchEmailDomain = emp.email && `${emp.email.toLowerCase()}@leaflibrary.vn` === q;
    const matchPhone = emp.phone && emp.phone.replace(/\./g, '') === rawUser.replace(/\s+|\./g, '');
    return matchId || matchUsername || matchEmail || matchEmailDomain || matchPhone;
  });

  if (!matchedUser && employees.length === 0) {
    const displayName = rawUser.includes('@') ? 'Quản trị viên' : (rawUser || 'Quản trị viên');
    matchedUser = {
      id: '12026001',
      fullName: displayName,
      name: displayName,
      role: 'QUẢN TRỊ VIÊN',
      email: rawUser.split('@')[0] || 'admin',
      phone: '0906.789.982',
      status: 'Active',
      hasAccount: true
    };
  }

  if (!matchedUser) {
    if (loginErr) {
      loginErr.innerText = 'Tài khoản không tồn tại trong hệ thống!';
      loginErr.style.display = 'block';
    }
    return;
  }

  if (matchedUser.password && rawPwd !== matchedUser.password) {
    if (loginErr) {
      loginErr.innerText = 'Mật khẩu không chính xác!';
      loginErr.style.display = 'block';
    }
    return;
  }

  if (matchedUser.hasAccount === false || matchedUser.status === 'Hồ sơ' || matchedUser.status === 'Khóa' || matchedUser.status === 'Bị khóa') {
    if (loginErr) {
      loginErr.innerText = 'Tài khoản chưa được cấp quyền hoặc đã bị khóa!';
      loginErr.style.display = 'block';
    }
    return;
  }

  const sessionPayload = {
    id: matchedUser.id || '12026001',
    fullName: matchedUser.fullName || matchedUser.name || 'Quản trị viên',
    name: matchedUser.fullName || matchedUser.name || 'Quản trị viên',
    role: matchedUser.role || 'QUẢN TRỊ VIÊN',
    email: matchedUser.email || '',
    phone: matchedUser.phone || '',
    dob: matchedUser.dob || '',
    gender: matchedUser.gender || 'Nam',
    address: matchedUser.address || '',
    avatarUrl: matchedUser.avatarUrl || ''
  };

  localStorage.setItem('ixs_library_session', JSON.stringify(sessionPayload));
  localStorage.setItem('ixs_library_current_user', JSON.stringify(sessionPayload));

  if (typeof addLog === 'function') {
    addLog('ĐĂNG NHẬP', sessionPayload.id, `Người dùng <strong>${sessionPayload.name}</strong> đăng nhập vào hệ thống quản trị.`);
  }

  window.location.href = 'admin/index.html';
}

/**
 * Xử lý đăng ký tài khoản nhân viên mới từ trang login.html
 */
function validateRegister() {
  clearFieldErrors();
  let isValid = true;

  const name = document.getElementById('reg-name').value.trim();
  const phoneRaw = document.getElementById('reg-phone').value.trim();
  const phone = phoneRaw.replace(/\s+|\./g, '');
  const email = document.getElementById('reg-email').value.trim();
  const pwd = document.getElementById('reg-pwd').value.trim();
  const pwdConfirm = document.getElementById('reg-pwd-confirm').value.trim();
  const isTermsChecked = document.getElementById('reg-terms').checked;
  const mainError = document.getElementById('register-error');

  if (!name) {
    showFieldError('err-reg-name', 'Vui lòng nhập họ và tên');
    isValid = false;
  }

  if (!phone) {
    showFieldError('err-reg-phone', 'Vui lòng nhập số điện thoại');
    isValid = false;
  } else if (!/^\d{10}$/.test(phone)) {
    showFieldError('err-reg-phone', 'Số điện thoại phải bao gồm đúng 10 chữ số');
    isValid = false;
  }

  if (!email) {
    showFieldError('err-reg-email', 'Vui lòng nhập mã nhân viên hoặc email');
    isValid = false;
  }

  if (!pwd) {
    showFieldError('err-reg-pwd', 'Vui lòng nhập mật khẩu');
    isValid = false;
  } else if (pwd.length < 6) {
    showFieldError('err-reg-pwd', 'Mật khẩu phải có tối thiểu 6 ký tự');
    isValid = false;
  }

  if (!pwdConfirm) {
    showFieldError('err-reg-pwd-confirm', 'Vui lòng xác nhận mật khẩu');
    isValid = false;
  } else if (pwd !== pwdConfirm) {
    showFieldError('err-reg-pwd-confirm', 'Mật khẩu xác nhận không khớp');
    isValid = false;
  }

  if (!isTermsChecked) {
    mainError.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Vui lòng đồng ý với Điều khoản sử dụng!';
    mainError.style.display = 'block';
    isValid = false;
  }

  if (!isValid) return;

  if (typeof getEmployees === 'function' && typeof saveEmployees === 'function') {
    const list = getEmployees();
    const parts = name.split(' ');
    const lastName = parts.slice(-1).join(' ');
    const firstName = parts.slice(0, -1).join(' ') || name;
    const newId = typeof DataService !== 'undefined'
      ? DataService.generateNextId(DataService.KEYS.EMPLOYEES, '12026', 3)
      : ('12026' + String(list.length + 1).padStart(3, '0'));
    const formattedPhone = phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1.$2.$3');

    list.push({
      id: newId,
      name,
      firstName,
      lastName,
      role: list.length === 0 ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN',
      phone: formattedPhone,
      email: email.replace('@leaflibrary.vn', ''),
      password: pwd,
      status: 'Active',
      hasAccount: true,
      gender: 'Nam',
      dob: '21 / 02 / 2026',
      ethnicity: 'Kinh',
      religion: 'Không',
      address: 'Thành phố Hồ Chí Minh'
    });
    saveEmployees(list);

    if (typeof addLog === 'function') {
      addLog('TẠO MỚI', newId, `Đăng ký tài khoản nhân viên mới <strong>${name}</strong> (${newId}).`);
    }
  }

  document.getElementById('reg-name').value = '';
  document.getElementById('reg-phone').value = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-pwd').value = '';
  document.getElementById('reg-pwd-confirm').value = '';
  document.getElementById('reg-terms').checked = true;

  const loginEmail = document.getElementById('demo-login-email');
  if (loginEmail) loginEmail.value = email;

  switchForm('form-login');
}

function goToOTP() {
  clearFieldErrors();
  const phoneInput = document.getElementById('forgot-phone').value.trim();
  const phone = phoneInput.replace(/\s+|\./g, '');

  if (!phone) {
    showFieldError('err-forgot-phone', 'Vui lòng nhập số điện thoại');
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    showFieldError('err-forgot-phone', 'Số điện thoại phải bao gồm đúng 10 chữ số');
    return;
  }

  resetTargetPhone = phone;
  const maskedPhone = phone.length === 10
    ? phone.substring(0, 2) + '******' + phone.substring(8, 10)
    : phone;

  document.getElementById('display-phone').innerText = maskedPhone;
  switchForm('form-otp');
  startCountdown(101);
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
  switchForm('form-phone');
}

function handlePasswordReset() {
  const newPwd = document.getElementById('demo-new-pwd').value.trim();
  if (!newPwd) return;

  if (typeof getEmployees === 'function' && typeof saveEmployees === 'function') {
    const list = getEmployees();
    const target = list.find(emp => emp.phone && emp.phone.replace(/\./g, '') === resetTargetPhone) || list[0];
    if (target) {
      target.password = newPwd;
      saveEmployees(list);
      if (typeof addLog === 'function') {
        addLog('RESET MẬT KHẨU', target.id, `Cập nhật mật khẩu mới cho tài khoản <strong>${target.id}</strong>.`);
      }
    }
  }

  document.getElementById('demo-new-pwd').value = '';
  document.getElementById('demo-cur-pwd').value = '';
  switchForm('form-login');
}

function fillDemoLogin() {
  document.getElementById('demo-login-email').value = 'admin@leaflibrary.vn';
  document.getElementById('demo-login-pwd').value = '123456';
}

function fillDemoOTP() {
  const otpBoxes = document.querySelectorAll('.otp-box');
  const demoOTP = ['8', '4', '2', '9', '1', '5'];
  otpBoxes.forEach((box, index) => {
    box.value = demoOTP[index];
  });
}

function fillDemoReset() {
  document.getElementById('demo-new-pwd').value = 'MatKhauMoi@2026';
  document.getElementById('demo-cur-pwd').value = 'MatKhauCu@2025';
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
