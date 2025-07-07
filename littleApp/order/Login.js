// 登录/注册弹窗与逻辑模块（Login.js）
// 负责注册、登录弹窗、明文/暗文切换、注册/登录逻辑

// 密码明文/暗文切换
function setupPasswordToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;
  btn.onclick = function() {
    if (input.type === 'password') {
      input.type = 'text';
      btn.querySelector('i').classList.remove('fa-eye');
      btn.querySelector('i').classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      btn.querySelector('i').classList.remove('fa-eye-slash');
      btn.querySelector('i').classList.add('fa-eye');
    }
  };
}

// 登录/注册弹窗逻辑
const authModal = document.getElementById('authModal');
const authTabLogin = document.getElementById('authTabLogin');
const authTabRegister = document.getElementById('authTabRegister');
const authLoginBox = document.getElementById('authLoginBox');
const authRegisterBox = document.getElementById('authRegisterBox');
const closeAuthModal = document.getElementById('closeAuthModal');
const confirmLoginBtn = document.getElementById('confirmLoginBtn');
const confirmRegisterBtn = document.getElementById('confirmRegisterBtn');
const registerAvatar = document.getElementById('registerAvatar');

function showAuthModal(tab = 'login') {
  authModal.classList.remove('hidden');
  if (tab === 'login') {
    authLoginBox.classList.remove('hidden');
    authRegisterBox.classList.add('hidden');
    authTabLogin.classList.add('text-primary', 'border-primary');
    authTabRegister.classList.remove('text-primary', 'border-primary');
    setupPasswordToggle('loginPassword', 'toggleLoginPwd');
  } else {
    authLoginBox.classList.add('hidden');
    authRegisterBox.classList.remove('hidden');
    authTabLogin.classList.remove('text-primary', 'border-primary');
    authTabRegister.classList.add('text-primary', 'border-primary');
    // 自动生成头像
    if (registerAvatar) registerAvatar.src = `https://picsum.photos/seed/avatar${Math.floor(Math.random()*10000)}/96/96`;
    setupPasswordToggle('registerPassword', 'toggleRegisterPwd');
  }
}
if (authTabLogin) authTabLogin.onclick = () => showAuthModal('login');
if (authTabRegister) authTabRegister.onclick = () => showAuthModal('register');
if (closeAuthModal) closeAuthModal.onclick = () => authModal.classList.add('hidden');

// 注册逻辑
if (confirmRegisterBtn) confirmRegisterBtn.onclick = async function() {
  const id = document.getElementById('registerId').value.trim();
  const nickname = document.getElementById('registerNickname').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const avatar = registerAvatar ? registerAvatar.src : '';
  if (!id || !nickname || !password) {
    alert('用户ID、昵称和密码不能为空');
    return;
  }
  // 校验id唯一性
  const exist = await window.db.getUserById(id);
  if (exist) {
    alert('该ID已被注册，请更换ID');
    return;
  }
  // 禁用注册按钮防止重复点击
  confirmRegisterBtn.disabled = true;
  confirmRegisterBtn.textContent = '注册中...';
  // 保存到IndexedDB
  try {
    await window.db.addUser({ id, nickname, avatar, password });
    alert(`注册成功！请记住你的ID：${id}`);
    showAuthModal('login');
    document.getElementById('loginId').value = id;
  } catch (e) {
    alert('注册失败: ' + (e && e.message ? e.message : JSON.stringify(e)));
  } finally {
    confirmRegisterBtn.disabled = false;
    confirmRegisterBtn.textContent = '注册';
  }
};
// 登录逻辑
if (confirmLoginBtn) confirmLoginBtn.onclick = async function() {
  const idInput = document.getElementById('loginId');
  const pwdInput = document.getElementById('loginPassword');
  const id = idInput.value.trim();
  const password = pwdInput.value.trim();
  if (!id || !password) {
    alert('ID和密码不能为空');
    idInput.classList.add('border-red-400');
    pwdInput.classList.add('border-red-400');
    return;
  }
  const user = await window.db.validateUser(id, password);
  if (user) {
    window._isUserLoggedIn = true;
    window._userInfo = user;
    localStorage.setItem('userInfo', JSON.stringify(user));
    authModal.classList.add('hidden');
    alert('登录成功');
    if (typeof renderUserInfo === 'function') renderUserInfo();
    if (typeof switchTab === 'function') switchTab('mine');
  } else {
    alert('ID或密码错误，请重试');
    idInput.classList.add('border-red-400');
    pwdInput.classList.add('border-red-400');
  }
};
// 去结算前判断登录
function requireLoginBeforeCheckout() {
  if (!window._isUserLoggedIn || !window._userInfo || !window._userInfo.id) {
    showAuthModal('login');
    return false;
  }
  return true;
}
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'menuCheckoutBtn') {
    if (!requireLoginBeforeCheckout()) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}); 