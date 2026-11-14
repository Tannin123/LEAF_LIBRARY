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

/** Authenticate against the PostgreSQL-backed API. */
async function handleLogin() {
  clearFieldErrors();
  const usernameInput = document.getElementById('demo-login-email');
  const passwordInput = document.getElementById('demo-login-pwd');
  const error = document.getElementById('login-error');
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  if (!username || !password) {
    if (error) { error.innerText = 'Please enter your username and password.'; error.style.display = 'block'; }
    return;
  }
  try {
    const result = await DataService.request('POST', '/auth/login', { username, password });
    const user = result && result.user;
    if (!user) throw new Error('Invalid credentials');
    const session = {
      id: user.id, username: user.username, fullName: user.fullName || user.name,
      name: user.fullName || user.name, role: user.role, accountType: user.accountType,
      email: user.email || '', phone: user.phone || '', cccd: user.cccd || '',
      dob: '', gender: '', address: '', avatarUrl: ''
    };
    localStorage.setItem('ixs_library_session', JSON.stringify(session));
    localStorage.setItem('ixs_library_current_user', JSON.stringify(session));
    if (typeof addLog === 'function') addLog('LOGIN', session.id, `User <strong>${session.name}</strong> signed in.`);
    window.location.href = user.accountType === 'reader' ? 'user/index.html' : 'admin/index.html';
  } catch (err) {
    if (error) {
      error.innerText = err.status === 403
        ? 'This account is blocked or inactive.'
        : err.status === 0
          ? 'Cannot connect to the server. Check that the backend is running.'
          : 'Incorrect username or password.';
      error.style.display = 'block';
    }
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
  if (!name) { showFieldError('err-reg-name', 'Please enter your full name.'); isValid = false; }
  if (!/^\d{10}$/.test(phone)) { showFieldError('err-reg-phone', 'Phone number must contain exactly 10 digits.'); isValid = false; }
  if (!identifier) { showFieldError('err-reg-email', 'Please enter an employee ID or email.'); isValid = false; }
  if (password.length < 8) { showFieldError('err-reg-pwd', 'Password must contain at least 8 characters.'); isValid = false; }
  if (!confirmation || password !== confirmation) { showFieldError('err-reg-pwd-confirm', 'Passwords do not match.'); isValid = false; }
  if (!terms) { error.innerText = 'Please accept the terms of use.'; error.style.display = 'block'; isValid = false; }
  if (!isValid) return;

  const username = identifier.toLowerCase();
  try {
    await DataService.request('POST', '/auth/register', {
      name, username, email: username.includes('@') ? username : '', phone, password
    });
  } catch (err) {
    error.innerText = err.status === 409
      ? 'Username already exists. Please choose another one.'
      : err.status === 0
        ? 'Cannot connect to the server. Check that the backend is running.'
        : 'Could not create the account. Check your details and try again.';
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
  if (loginError) { loginError.innerText = 'Account created. You can now sign in.'; loginError.style.display = 'block'; }
}

async function goToOTP() {
  clearFieldErrors();
  const input = document.getElementById('forgot-phone');
  const phone = input ? input.value.replace(/\D/g, '') : '';
  if (!/^\d{10}$/.test(phone)) {
    showFieldError('err-forgot-phone', 'Phone number must contain exactly 10 digits.');
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
      ? 'Wait one minute before requesting another code.'
      : error.status === 0
        ? 'Cannot connect to the server. Check that the backend is running.'
        : error.status === 502 || error.status === 503
          ? 'The SMS service is unavailable. Please contact an administrator.'
        : 'Could not request a reset code. Please try again.';
    if (resetTargetPhone) showFieldError('otp-error', message);
    else showFieldError('err-forgot-phone', message);
  }
}

function continuePasswordReset() {
  const otp = Array.from(document.querySelectorAll('.otp-box')).map(box => box.value.trim()).join('');
  if (!/^\d{6}$/.test(otp)) {
    window.alert('Enter the six-digit reset code.');
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
    error.innerText = 'Password must contain at least 8 characters.';
    error.style.display = 'block';
    return;
  }
  if (newPassword !== confirmation) {
    error.innerText = 'Passwords do not match.';
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
    loginError.innerText = 'Password updated. Sign in with your new password.';
    loginError.style.display = 'block';
  } catch (requestError) {
    error.innerText = requestError.status === 0
      ? 'Cannot connect to the server. Check that the backend is running.'
      : requestError.message || 'The reset code is invalid or expired.';
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
