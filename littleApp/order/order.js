// 这里恢复为最初订单页地图和订单展示的基础功能，如需保留部分基础函数请补充说明。

import { bindCityFilter, bindSearchFilter, loadRestaurantsAndRender } from './cityFilter/city-filter.js';

// 计算两点之间的距离（公里）
function calculateDistance(point1, point2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1) + 'km';
}

// 获取两点的中点
function getMidPoint(point1, point2) {
    return {
        lng: (point1.lng + point2.lng) / 2,
        lat: (point1.lat + point2.lat) / 2
    };
}

// 在文件顶部或markOrderAddressesOnMap函数外部添加全局变量声明
let arriveShopTime = null;
let pickupTime = null;
let completedTime = null;

// 前台点餐系统核心功能
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 等待数据库初始化完成
        await window.db.init();
        console.log('前台系统：数据库初始化完成');
        
        // 页面元素
        const restaurantList = document.getElementById('restaurantList');
        const searchInput = document.getElementById('searchInput');
        const viewOrdersBtn = document.getElementById('viewOrdersBtn');
        const cartSidebar = document.getElementById('cartSidebar');
        const closeCartBtn = document.getElementById('closeCartBtn');
        const menuModal = document.getElementById('menuModal');
        const closeMenuModal = document.getElementById('closeMenuModal');
        const menuItems = document.getElementById('menuItems');
        const citySelect = document.getElementById('citySelect');
        const cityDropdown = document.getElementById('cityDropdown');

        // 全局变量
        let carts = {}; // { [restaurantId]: [cartItems] }
        let currentRestaurantId = null; // 当前操作的商家ID
        let currentRestaurant = null;
        let allRestaurants = [];
        window._isUserLoggedIn = false;
        window._userInfo = null;
        window.amapInstance = null;
        window.marker = null;
        window.infoWindow = null;
        window.geocoder = null;
        window.placeSearch = null;
        let lastMapOrderId = null;

        // 获取本地存储的用户信息
        function getStoredUserInfo() {
            const userInfo = localStorage.getItem('userInfo');
            return userInfo ? JSON.parse(userInfo) : null;
        }
        // 设置本地存储的用户信息
        function setStoredUserInfo(userInfo) {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
        // 移除本地存储的用户信息
        function removeStoredUserInfo() {
            localStorage.removeItem('userInfo');
        }

        // 加载所有商家购物车
        function loadCarts() {
            carts = JSON.parse(localStorage.getItem('carts') || '{}');
        }
        // 保存所有商家购物车
        function saveCarts() {
            localStorage.setItem('carts', JSON.stringify(carts));
        }
        // 获取当前商家购物车
        function getCurrentCart() {
            if (!currentRestaurantId) return [];
            if (!carts[currentRestaurantId]) carts[currentRestaurantId] = [];
            return carts[currentRestaurantId];
        }
        // 设置当前商家购物车
        function setCurrentCart(cartArr) {
            if (!currentRestaurantId) return;
            carts[currentRestaurantId] = cartArr;
            saveCarts();
        }

        // 页面初始化时优先从localStorage恢复登录态
        const stored = localStorage.getItem('userInfo');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                if (user && user.id) {
                    window._isUserLoggedIn = true;
                    window._userInfo = user;
                }
            } catch (e) {}
        }

        // 新增：根据URL参数自动切换tab
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'order') {
            setTimeout(() => switchTab('order'), 0);
        }

        // 初始化
        loadCarts();
        // await window.db.initDefaultData(); // 已删除自动初始化数据逻辑
        initSystem();

        // 初始化系统
        async function initSystem() {
            // 绑定城市切换和搜索
            bindCityFilter(citySelect, cityDropdown, searchInput, restaurantList, renderRestaurants);
            bindSearchFilter(searchInput, citySelect, restaurantList, renderRestaurants);
            // 加载并渲染商家
            await loadRestaurantsAndRender(window.db, searchInput, restaurantList, renderRestaurants);
            // 绑定其他事件
            bindEvents();
        }

        // 绑定事件
        function bindEvents() {
            // 购物车相关
            if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
            
            // 菜品模态框
            if (closeMenuModal) closeMenuModal.addEventListener('click', hideMenuModal);
            
            // 点击模态框外部关闭
            if (menuModal) menuModal.addEventListener('click', (e) => {
                if (e.target === menuModal) {
                    hideMenuModal();
                }
            });
        }

        // 查看菜单
        window.viewMenu = async function(restaurantId) {
            currentRestaurantId = restaurantId;
            if (!carts[currentRestaurantId]) carts[currentRestaurantId] = [];
            try {
                const restaurant = await window.db.getRestaurant(restaurantId);
                if (!restaurant) {
                    alert('商家信息不存在');
                    return;
                }
                currentRestaurant = restaurant;
                // 设置弹窗头部标题为店名
                const menuModalTitle = document.getElementById('menuModalTitle');
                if (menuModalTitle) menuModalTitle.textContent = restaurant.name;
                // 渲染详细地址和电话到restaurantInfoBar
                const infoBar = document.getElementById('restaurantInfoBar');
                if (infoBar) {
                    const address = restaurant.address || '西关大街68号商业街';
                    const phone = restaurant.phone || '188888888';
                    const backupPhone = restaurant.backupPhone || '199999999';
                    infoBar.innerHTML = `
                        <div class="flex flex-col text-gray-500 text-sm">
                            <div class="flex items-center">
                                <span>${address}</span>
                                <i class="bi bi-geo-alt-fill ml-1" style="color:#ff4d4f;font-size:1em;"></i>
                            </div>
                            <div class="flex items-center mt-1">
                                <i class="bi bi-telephone-fill mr-1" style="color:#1890ff;font-size:1em;"></i>
                                <span>${phone}</span>
                                <span class="mx-2">/</span>
                                <span>${backupPhone}</span>
                            </div>
                        </div>
                    `;
                }
                // 渲染菜品
                const menuItemsList = await window.db.getMenuItemsByRestaurant(restaurantId);
                renderMenuItems(menuItemsList, false);
                showMenuModal();
            } catch (error) {
                console.error('加载菜单失败:', error);
                alert('加载菜单失败，请重试');
            }
        };

        // 渲染菜品列表
        function renderMenuItems(items, showInfo = true) {
            menuItems.innerHTML = '';
            // 只在showInfo为true时插入地址和电话
            if (showInfo && currentRestaurant) {
                const address = currentRestaurant.address || '西关大街68号商业街';
                const phone = currentRestaurant.phone || '188888888';
                const backupPhone = currentRestaurant.backupPhone || '199999999';
                const infoDiv = document.createElement('div');
                infoDiv.className = 'restaurant-address mb-4';
                infoDiv.innerHTML = `
                    <div class="flex flex-col text-gray-500 text-sm">
                        <div class="flex items-center">
                            <span>${address}</span>
                            <i class="bi bi-geo-alt-fill ml-1" style="color:#ff4d4f;font-size:1em;"></i>
                        </div>
                        <div class="flex items-center mt-1">
                            <i class="bi bi-telephone-fill mr-1" style="color:#1890ff;font-size:1em;"></i>
                            <span>${phone}</span>
                            <span class="mx-2">/</span>
                            <span>${backupPhone}</span>
                        </div>
                    </div>
                `;
                menuItems.appendChild(infoDiv);
            }
            // 渲染菜品项
            const cart = getCurrentCart();
            items.forEach(item => {
                const cartItem = cart.find(ci => ci.id === item.id);
                const quantity = cartItem ? cartItem.quantity : 0;
                const menuItem = document.createElement('div');
                menuItem.className = 'flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0';
                menuItem.innerHTML = `
                    <div class="flex items-center">
                        <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                        <div class="ml-4">
                            <h4 class="font-medium text-dark">${item.name}</h4>
                            <p class="text-sm text-gray-500">${item.description}</p>
                            <p class="text-primary font-bold">¥${item.price}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="updateMenuItemQuantity('${item.id}', -1, this)" class="w-8 h-8 border border-gray-300 rounded text-lg flex items-center justify-center hover:bg-gray-100">-</button>
                        <span id="qty-${item.id}" class="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white text-base">${quantity}</span>
                        <button onclick="updateMenuItemQuantity('${item.id}', 1, this)" class="w-8 h-8 border border-gray-300 rounded text-lg flex items-center justify-center hover:bg-gray-100">+</button>
                    </div>
                `;
                menuItems.appendChild(menuItem);
            });
            renderMenuFooter();
        }

        // 菜品加减数量（只更新数量和底部栏，不整体重渲染）
        window.updateMenuItemQuantity = function(itemId, delta, btn) {
            let cart = getCurrentCart();
            const item = cart.find(i => i.id === itemId);
            if (item) {
                item.quantity += delta;
                if (item.quantity <= 0) {
                    window.removeFromCart(itemId);
                } else {
                    setCurrentCart(cart);
                }
            } else if (delta > 0) {
                // 获取item信息
                const div = btn.closest('.flex.items-center.justify-between');
                const img = div.querySelector('img');
                const h4 = div.querySelector('h4');
                const price = div.querySelector('.text-primary.font-bold');
                window.addToCart(itemId, h4.textContent, parseFloat(price.textContent.replace('¥','')), img.src);
            }
            // 只更新数量span和底部栏
            const qtySpan = document.getElementById('qty-' + itemId);
            const newItem = getCurrentCart().find(i => i.id === itemId);
            qtySpan.textContent = newItem ? newItem.quantity : 0;
            renderMenuFooter();
        };

        // 添加到购物车
        window.addToCart = function(itemId, name, price, image) {
            if (!currentRestaurant || !currentRestaurantId) {
                alert('请先选择商家');
                return;
            }
            let cart = getCurrentCart();
            const existingItem = cart.find(item => item.id === itemId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: itemId,
                    name: name,
                    price: price,
                    image: image,
                    quantity: 1
                });
            }
            setCurrentCart(cart);
        };

        // 从购物车移除
        window.removeFromCart = function(itemId) {
            let cart = getCurrentCart();
            const index = cart.findIndex(item => item.id === itemId);
            if (index !== -1) {
                cart.splice(index, 1);
                setCurrentCart(cart);
            }
        };

        // 更新购物车数量
        window.updateCartQuantity = function(itemId, delta) {
            let cart = getCurrentCart();
            const item = cart.find(item => item.id === itemId);
            if (item) {
                item.quantity += delta;
                if (item.quantity <= 0) {
                    window.removeFromCart(itemId);
                } else {
                    setCurrentCart(cart);
                }
            }
        };

        // 菜单底部结算栏
        function renderMenuFooter() {
            let footer = document.getElementById('menuFooter');
            if (!footer) {
                footer = document.createElement('div');
                footer.id = 'menuFooter';
                footer.className = 'absolute left-0 right-0 bottom-0 z-60 flex items-center justify-between px-6 py-4 bg-green-100 border-t border-green-400 rounded-b-2xl';
                menuModal.querySelector('.bg-white').appendChild(footer);
            }
            // 统计数量和金额
            const cart = getCurrentCart();
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            footer.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fa fa-shopping-cart text-green-600 text-2xl"></i>
                    <span class="font-bold text-lg">${totalItems}</span>
                    <span class="text-base text-gray-700">件商品</span>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-xl font-bold text-green-700">¥${total.toFixed(2)}</span>
                    <button id="menuCheckoutBtn" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-base font-semibold transition-colors duration-200" ${totalItems === 0 ? 'disabled style=\"opacity:0.5;cursor:not-allowed;\"' : ''}>去结算</button>
                </div>
            `;
            document.getElementById('menuCheckoutBtn').onclick = async function() {
                // 防呆：必须有商家和商品
                if (!currentRestaurant || getCurrentCart().length === 0) {
                    alert('请先选择商品并加入购物车');
                    console.log('去结算时currentRestaurant:', currentRestaurant);
                    console.log('去结算时购物车:', getCurrentCart());
                    return;
                }
                console.log('下单时商家信息:', currentRestaurant);
                console.log('去结算时currentRestaurant:', currentRestaurant);
                console.log('去结算时购物车:', getCurrentCart());
                // 先生成订单并写入localStorage
                if (!window._isUserLoggedIn || !window._userInfo || !window._userInfo.id) {
                    document.getElementById('authModal').classList.remove('hidden');
                    return;
                }
                const allAddresses = JSON.parse(localStorage.getItem('userAddresses') || '{}');
                const userId = window._userInfo.id;
                const orderId = String(Date.now());
                const order = {
                    id: orderId,
                    restaurantName: currentRestaurant ? currentRestaurant.name : '',
                    restaurantAddress: currentRestaurant ? currentRestaurant.address : '',
                    restaurantPhone: currentRestaurant ? currentRestaurant.phone : '',
                    restaurantBackupPhone: currentRestaurant ? currentRestaurant.backupPhone : '',
                    total: getCurrentCart().reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    items: getCurrentCart(),
                    status: 'pending',
                    createTime: new Date().toISOString(),
                    userId: userId
                };
                console.log('即将写入localStorage的订单对象:', order);
                const orderList = JSON.parse(localStorage.getItem('orderList') || '[]');
                orderList.push(order);
                localStorage.setItem('orderList', JSON.stringify(orderList));
                localStorage.setItem('currentOrderId', orderId);
                console.log('写入localStorage后orderList:', orderList);
                // 下单后清空当前商家的购物车
                carts[currentRestaurantId] = [];
                saveCarts();
                // 再关闭弹窗
                hideMenuModal();
                // 延迟跳转，确保localStorage写入完成
                if (allAddresses[userId]) {
                    setTimeout(() => {
                        window.location.href = '/waimai-system/littleApp/pay/payment.html';
                    }, 100);
                } else {
                    setTimeout(() => {
                        window.location.href = '/waimai-system/littleApp/address/address.html';
                    }, 100);
                }
            };
        }

        // 加载购物车（已废弃，保留空实现防止报错）
        function loadCart() {}

        // 切换购物车显示
        function toggleCart() {
            cartSidebar.classList.toggle('translate-x-full');
        }

        // 显示菜品模态框
        function showMenuModal() {
            menuModal.classList.remove('opacity-0', 'pointer-events-none');
            menuModal.querySelector('.bg-white').classList.remove('scale-95');
            menuModal.querySelector('.bg-white').classList.add('scale-100');
            // 设置菜单内容区可滚动，底部栏固定
            const modalContent = menuModal.querySelector('.bg-white');
            menuItems.style.maxHeight = 'calc(80vh - 120px)';
            menuItems.style.overflowY = 'auto';
            menuItems.style.marginBottom = '80px'; // 给底部栏留空间
        }

        // 隐藏菜品模态框
        function hideMenuModal() {
            menuModal.classList.add('opacity-0', 'pointer-events-none');
            menuModal.querySelector('.bg-white').classList.remove('scale-100');
            menuModal.querySelector('.bg-white').classList.add('scale-95');
            currentRestaurant = null;
            currentRestaurantId = null;
            // 移除底部结算栏
            const footer = document.getElementById('menuFooter');
            if (footer) footer.remove();
        }

        // 底部导航栏切换
        function switchTab(tab) {
            document.getElementById('tab-order').classList.add('hidden');
            document.getElementById('tab-dynamic').classList.add('hidden');
            document.getElementById('tab-mine').classList.add('hidden');
            document.getElementById('navOrder').classList.remove('text-primary');
            document.getElementById('navOrder').classList.add('text-gray-500');
            document.getElementById('navDynamic').classList.remove('text-primary');
            document.getElementById('navDynamic').classList.add('text-gray-500');
            document.getElementById('navMine').classList.remove('text-primary');
            document.getElementById('navMine').classList.add('text-gray-500');
            if (tab === 'order') {
                document.getElementById('tab-order').classList.remove('hidden');
                document.getElementById('navOrder').classList.add('text-primary');
                document.getElementById('navOrder').classList.remove('text-gray-500');
            } else if (tab === 'dynamic') {
                document.getElementById('tab-dynamic').classList.remove('hidden');
                document.getElementById('navDynamic').classList.add('text-primary');
                document.getElementById('navDynamic').classList.remove('text-gray-500');
                renderDynamicOrders();
            } else if (tab === 'mine') {
                document.getElementById('tab-mine').classList.remove('hidden');
                document.getElementById('navMine').classList.add('text-primary');
                document.getElementById('navMine').classList.remove('text-gray-500');
            }
        }
        const navOrder = document.getElementById('navOrder');
        const navDynamic = document.getElementById('navDynamic');
        const navMine = document.getElementById('navMine');
        if (navOrder) navOrder.onclick = () => switchTab('order');
        if (navDynamic) navDynamic.onclick = () => switchTab('dynamic');
        if (navMine) navMine.onclick = () => switchTab('mine');

        // 我的tab：展示用户信息
        async function renderUserInfo() {
            const userInfoBox = document.getElementById('userInfoBox');
            const myAddressBox = document.getElementById('myAddressBox');
            if (!window._isUserLoggedIn) {
                // 未登录，美化样式+未登录按钮，全部居中纵向排列
                userInfoBox.innerHTML = `
                  <div class=\"flex flex-col items-center justify-center mt-16\">
                    <div class=\"w-28 h-28 rounded-full border-2 border-gray-300 shadow bg-gray-200 flex items-center justify-center text-gray-400 text-3xl mb-4\"></div>
                    <button id=\"loginBtn\" class=\"text-xl text-gray-600 border border-gray-300 px-6 py-3 rounded-lg shadow hover:bg-gray-100 font-semibold mt-2\">未登录</button>
                  </div>
                `;
                document.getElementById('loginBtn').onclick = function() {
                    showAuthModal('login');
                    document.getElementById('loginId').value = '';
                    document.getElementById('loginPassword').value = '';
                };
                if (myAddressBox) myAddressBox.innerHTML = '';
                return;
            } else {
                // 已登录，美化样式，全部居中纵向排列
                const user = window._userInfo;
                let showName = user.nickname;
                if (/^1[3-9]\d{9}$/.test(user.nickname)) {
                    showName = user.nickname.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                }
                userInfoBox.innerHTML = `
                  <div class=\"flex flex-col items-center justify-center mt-16\">
                    <img src=\"${user.avatar}\" class=\"w-28 h-28 rounded-full border-2 border-primary shadow mb-4 object-cover\" />
                    <span class=\"text-2xl font-bold text-gray-800 mt-2\">${showName}</span>
                    <span class=\"text-xl text-green-600 font-semibold mt-1\">已登录</span>
                    <button id=\"logoutBtn\" class=\"mt-6 px-6 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition\">退出登录</button>
                  </div>
                `;
                document.getElementById('logoutBtn').onclick = function() {
                    localStorage.removeItem('userInfo');
                    window._isUserLoggedIn = false;
                    window._userInfo = null;
                    renderUserInfo();
                };
            }
            // 渲染地址功能块
            if (myAddressBox) {
                // 获取当前用户地址
                const userInfo = window._userInfo;
                let addressStr = '暂无地址，请先添加';
                let phoneStr = '';
                let detailStr = '';
                try {
                    const allAddresses = JSON.parse(localStorage.getItem('userAddresses') || '{}');
                    const addressObj = allAddresses[userInfo.id];
                    if (addressObj) {
                        addressStr = addressObj.address || '';
                        phoneStr = addressObj.phone || '';
                        detailStr = addressObj.detail || '';
                    }
                } catch (e) {}
                myAddressBox.innerHTML = `
                    <div class="bg-white rounded-xl shadow p-6 mt-6 max-w-md mx-auto">
                        <div class="flex justify-between items-center mb-2">
                            <div class="font-bold text-lg">我的地址</div>
                            <button id="editAddressBtn" class="text-primary text-sm border border-primary px-3 py-1 rounded hover:bg-primary hover:text-white transition">修改</button>
                        </div>
                        <div class="text-gray-700 mb-1"><b>地址：</b>${addressStr}</div>
                        <div class="text-gray-700 mb-1"><b>电话：</b>${phoneStr}</div>
                        <div class="text-gray-700"><b>备注：</b>${detailStr}</div>
                    </div>
                `;
                // 绑定修改按钮事件
                document.getElementById('editAddressBtn').onclick = function() {
                    window.location.href = '../address/address.html';
                };
            }
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

        // 登录逻辑
        if (confirmLoginBtn) confirmLoginBtn.onclick = async function() {
            const id = document.getElementById('loginId').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!id || !password) {
                alert('ID和密码不能为空');
                return;
            }
            const user = await window.db.validateUser(id, password);
            if (user) {
                window._isUserLoggedIn = true;
                window._userInfo = user;
                localStorage.setItem('userInfo', JSON.stringify(user));
                alert('登录成功');
                location.reload(); // 强制刷新页面，确保所有状态生效
            } else {
                alert('ID或密码错误');
            }
        };
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
            confirmRegisterBtn.disabled = true;
            confirmRegisterBtn.textContent = '注册中...';
            try {
                await window.db.addUser({ id, nickname, avatar, password });
                alert(`注册成功！请记住你的ID：${id}`);
                showAuthModal('login');
                document.getElementById('loginId').value = id;
            } catch (e) {
                alert('注册失败：' + (e && e.message ? e.message : JSON.stringify(e)));
                console.error('注册失败详细信息：', e);
            } finally {
                confirmRegisterBtn.disabled = false;
                confirmRegisterBtn.textContent = '注册';
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
        // 拦截"去结算"按钮逻辑（假设id为menuCheckoutBtn）
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'menuCheckoutBtn') {
                if (!requireLoginBeforeCheckout()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });

        // 默认显示点餐tab
        switchTab('order');
        // 页面初始化时渲染一次用户信息，防止首次进入"我的"tab按钮不可用
        renderUserInfo();

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

        // 渲染商家列表
        function renderRestaurants(restaurants) {
            restaurantList.innerHTML = '';
            if (!restaurants || restaurants.length === 0) {
                restaurantList.innerHTML = '<div class="col-span-full text-center text-gray-500">暂无商家</div>';
                return;
            }
            restaurants.forEach(restaurant => {
                const restaurantCard = document.createElement('div');
                restaurantCard.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group border border-gray-100 hover:border-primary';
                restaurantCard.innerHTML = `
                  <img src="${restaurant.image}" alt="${restaurant.name}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300">
                  <div class="p-6">
                    <h3 class="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors duration-300">${restaurant.name}</h3>
                    <div class="flex items-center mb-2">
                      <i class="fa fa-star text-yellow-400 mr-1"></i>
                      <span class="text-sm text-gray-600">${restaurant.rating}</span>
                      <span class="text-sm text-gray-500 ml-2">月售 ${restaurant.sales}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
                      <span>起送 ¥${restaurant.minOrder}</span>
                      <span>配送费 ¥${restaurant.deliveryFee}</span>
                      <span>${restaurant.deliveryTime}分钟</span>
                    </div>
                  </div>
                `;
                restaurantCard.addEventListener('click', () => {
                  window.viewMenu(restaurant.id);
                });
                restaurantList.appendChild(restaurantCard);
            });
        }

        // 页面初始化时只通过过滤逻辑渲染商家列表
        await loadRestaurantsAndRender(window.db, searchInput, restaurantList, renderRestaurants);
        // 挂载到全局，方便控制台调试
        window.renderRestaurants = renderRestaurants;

        // ========== 地图初始化相关函数 ========== //
        // 移除自动标注骑手、顾客、商家相关逻辑，只保留搜索、点击、定位等功能
        // 1. 注释或删除autoMarkOrderAddresses、drawRiderToShopLine、drawLineAndDistance等相关函数和调用
        // 2. 保留initOrderMap、doOrderPlaceSearch、showOrderInfoWindow等核心地图搜索与定位逻辑
        // ========== 订单地图弹窗地图功能，完全复用address.js核心逻辑 ========== //
        function initOrderMap() {
          if (!window.amapInstance) {
            window.amapInstance = new AMap.Map('amapContainer', {
              zoom: 13,
              center: [101.78445, 36.623178]
            });
            window.marker = new AMap.Marker({ map: window.amapInstance });
            window.infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });
            // 加载MoveAnimation插件，确保moveAlong可用
            AMap.plugin(['AMap.MoveAnimation'], function() {
              // 插件加载完成后可安全使用moveAlong
            });
            AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], function() {
              window.geocoder = new AMap.Geocoder();
              window.placeSearch = new AMap.PlaceSearch({ map: window.amapInstance });
              // 搜索结果区域可选
              // createSearchResultArea();
              // 自动绑定地图点击、搜索按钮、我的位置
              window.amapInstance.on('click', function(e) {
                window.marker.setPosition(e.lnglat);
                window.geocoder.getAddress(e.lnglat, function(status, result) {
                  if (status === 'complete' && result.regeocode) {
                    showOrderInfoWindow(result.regeocode.formattedAddress, e.lnglat);
                  } else {
                    alert('无法获取该点地址');
                  }
                });
              });
              const searchBtn = document.getElementById('mapSearchBtn');
              const searchInput = document.getElementById('tipinput');
              if (searchBtn && searchInput) {
                searchBtn.onclick = function() {
                  var keyword = searchInput.value.trim();
                  if (!keyword) return;
                  doOrderPlaceSearch(keyword);
                };
              }
              const myLocationBtn = document.getElementById('myLocationBtn');
              if (myLocationBtn) {
                myLocationBtn.onclick = function() {
                  AMap.plugin('AMap.Geolocation', function() {
                    var geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 });
                    geolocation.getCurrentPosition(function(status, result) {
                      if (status === 'complete' && result.position) {
                        var lnglat = [result.position.lng, result.position.lat];
                        window.amapInstance.setCenter(lnglat);
                        window.marker.setPosition(lnglat);
                        if (window.infoWindow) window.infoWindow.close();
                        window.geocoder.getAddress(lnglat, function(status, result) {
                          if (status === 'complete' && result.regeocode) {
                            showOrderInfoWindow(result.regeocode.formattedAddress, lnglat);
                          } else {
                            alert('定位成功，但无法获取详细地址');
                          }
                        });
                      } else {
                        alert('定位失败，请检查浏览器权限或网络');
                      }
                    });
                  });
                };
              }
            });
            // 动画启动逻辑放到地图渲染完成后
            window.amapInstance.on('complete', function() {
              setTimeout(function() {
                // 只有在riderMarker、shopMarker、customerMarker都存在时才启动动画
                if (window.riderMarker && window.shopMarker && window.customerMarker) {
                  let speed = 98 * 1000 / 3600; // 98km/h, 单位: m/s
                  let riderPos = toLngLatArray(window.riderMarker.getPosition());
                  let shopPos = toLngLatArray(window.shopMarker.getPosition());
                  let customerPos = toLngLatArray(window.customerMarker.getPosition());
                  // 动画前只setPosition一次到起点
                  window.riderMarker.setPosition(riderPos);
                  console.log('动画前riderMarker位置', window.riderMarker.getPosition(), '应为起点', riderPos);
                  // 第一阶段：骑手到商家
                  console.log('准备启动第一阶段动画');
                  startMoveAlong(
                    window.riderMarker,
                    [riderPos, shopPos],
                    speed,
                    '#FF8C00',
                    'toShop',
                    () => {
                      // 到达商家后，第二阶段：商家到顾客
                      console.log('准备启动第二阶段动画');
                      // 暂停5秒后再进行第二阶段
                      setTimeout(() => {
                        startMoveAlong(
                          window.riderMarker,
                          [shopPos, customerPos],
                          speed,
                          '#0066CC',
                          'toCustomer',
                          () => {
                            // 到达顾客，动画结束
                            window.orderAnimationState[order.id].currentStage = 'arrived';
                            completedTime = new Date();
                            if (window.riderTimeLabel) {
                              window.riderTimeLabel.setPosition(customerPos);
                              updateRiderTimeLabelV2(customerPos[0], customerPos[1], '', '', '#FF8C00', 'arrived');
                            }
                            renderOrderDeliveryDetail();
                          }
                        );
                      }, 5000);
                    }
                  );
                }
              }, 300);
            });
          }
        }

        function doOrderPlaceSearch(keyword) {
          AMap.plugin('AMap.PlaceSearch', function() {
            var placeSearch = new AMap.PlaceSearch({ pageSize: 10, pageIndex: 1, city: '全国', map: null });
            placeSearch.search(keyword, function(status, result) {
              if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                var firstPoi = result.poiList.pois[0];
                if (firstPoi && firstPoi.location) {
                  window.amapInstance.setCenter(firstPoi.location);
                  window.marker.setPosition(firstPoi.location);
                  if (window.geocoder) {
                    window.geocoder.getAddress(firstPoi.location, function(status, result) {
                      var addr = '';
                      if (status === 'complete' && result.regeocode) {
                        addr = result.regeocode.formattedAddress;
                      }
                      showOrderInfoWindow(addr, firstPoi.location);
                    });
                  }
                }
              } else {
                alert('未找到相关地点');
              }
            });
          });
        }

        function showOrderInfoWindow(address, lnglat) {
          var infoHtml = '<div style="font-size:15px;max-width:220px;line-height:1.5;">' +
            (address ? address + '<br>' : '') +
            '</div>';
          if (window.infoWindow) window.infoWindow.close();
          window.infoWindow = new AMap.InfoWindow({ content: infoHtml, offset: new AMap.Pixel(0, -30) });
          window.infoWindow.open(window.amapInstance, lnglat);
        }

        // 重写动态订单渲染函数，卡片布局和进度条参考用户示例
        async function renderDynamicOrders() {
          const dynamicOrderList = document.getElementById('dynamicOrderList');
          if (!dynamicOrderList) return;
          dynamicOrderList.innerHTML = '';
          if (!window.db) {
            dynamicOrderList.innerHTML = '<div class="text-center text-gray-400 mt-12">数据库未初始化</div>';
            return;
          }
          const allOrders = await window.db.getAllOrders();
          // 只显示支付成功但未送达的订单
          const ongoingOrders = allOrders.filter(order => ['paid','preparing','delivering'].includes(order.status));
          if (!ongoingOrders || ongoingOrders.length === 0) {
            dynamicOrderList.innerHTML = '<div class="text-center text-gray-400 mt-12">暂无进行中订单</div>';
            return;
          }
          ongoingOrders.forEach(order => {
            // 状态判断
            const statusMap = {
              pending: 0,
              paid: 1,
              preparing: 1,
              delivering: 2,
              completed: 3,
              cancelled: -1
            };
            const statusStep = statusMap[order.status] ?? 0;
            // 时间信息
            const pickupTime = order.pickupTime || '--';
            const arriveShopTime = order.arriveShopTime || '--';
            const estimateArriveTime = order.estimateArriveTime || '--';
            const completedTime = order.completedTime || '--';
            // 获取订单中的骑手速度，单位km/h，转为m/s
            let speed = 98 * 1000 / 3600;
            if (order && order.riderSpeed) {
              let s = parseFloat(order.riderSpeed);
              if (!isNaN(s) && s > 0) speed = s * 1000 / 3600;
            }
            // 卡片HTML
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8';
            card.innerHTML = `
              <h2 class="text-2xl font-bold text-gray-800 mb-6">订单号：${order.id}</h2>
              <div class="relative">
                <div class="flex justify-between items-center relative">
                  <div class="z-10 flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
                      <i class="fa fa-shopping-basket"></i>
                    </div>
                    <p class="mt-2 text-sm">取货中</p>
                  </div>
                  <div class="absolute top-5 left-[12.5%] right-[12.5%] h-2 bg-blue-200 rounded-full"></div>
                  <div class="z-10 flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white shadow-lg">
                      <i class="fa fa-cutlery"></i>
                    </div>
                    <p class="mt-2 text-sm">到商家</p>
                  </div>
                  <div class="absolute top-5 left-[37.5%] right-[37.5%] h-2 bg-yellow-200 rounded-full"></div>
                  <div class="z-10 flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                      <i class="fa fa-home"></i>
                    </div>
                    <p class="mt-2 text-sm">到顾客家</p>
                  </div>
                </div>
                <div class="mt-10 bg-gray-50 rounded-lg p-5">
                  <h3 class="font-semibold text-gray-800 mb-3">配送详情</h3>
                  <div class="space-y-3">
                    <div class="flex items-start">
                      <div class="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">配送员已取货</p>
                        <p class="text-xs text-gray-500">${pickupTime}</p>
                      </div>
                    </div>
                    <div class="flex items-start">
                      <div class="w-2 h-2 rounded-full bg-yellow-500 mt-2 mr-3"></div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">配送员已到达商家</p>
                        <p class="text-xs text-gray-500">${arriveShopTime}</p>
                      </div>
                    </div>
                    <div class="flex items-start">
                      <div class="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">配送员正在前往您的地址</p>
                        <p class="text-xs text-gray-500">${estimateArriveTime}</p>
                      </div>
                    </div>
                    ${statusStep>=3?`
                    <div class="flex items-start">
                      <div class="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">已送达，感谢您的等待</p>
                        <p class="text-xs text-gray-500">${completedTime}</p>
                      </div>
                    </div>
                    `:''}
                  </div>
                </div>
              </div>
              <div class="mt-8 flex flex-col sm:flex-row gap-3">
                <button class="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center">
                  <i class="fa fa-phone mr-2"></i> 联系配送员
                </button>
                <button class="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center dynamic-order-map-btn">
                  <i class="fa fa-map-marker mr-2"></i> 查看地图
                </button>
              </div>
            `;
            dynamicOrderList.appendChild(card);
          });
        }

        // ========== 动画状态全局管理 ==========
        if (!window.orderAnimationState) window.orderAnimationState = {};

        // 修改markOrderAddressesOnMap，增加forceRestart参数
        async function markOrderAddressesOnMap(order, opts = {}) {
          const forceRestart = opts.forceRestart;
          window._debugOrder = order; // 方便控制台调试
          if (!order) return;
          if (!window.amapInstance || !window.AMap) return;
          // 动画状态判断
          if (!forceRestart && window.orderAnimationState[order.id]?.started) {
            // 只显示当前marker，不重启动画
            // 只显示已存在的marker和路径
            if (window.orderMarkers && window.orderMarkers.length) {
              window.amapInstance.setFitView(window.orderMarkers);
            }
            return;
          }
          // 彻底清除地图上所有marker，防止残留
          const allMarkers = window.amapInstance.getAllOverlays('marker');
          if (allMarkers && allMarkers.length) {
            window.amapInstance.remove(allMarkers);
          }
          // 清除之前的路径和标签
          if (window.orderPaths) {
            window.orderPaths.forEach(path => window.amapInstance.remove(path));
          }
          if (window.orderLabels) {
            window.orderLabels.forEach(label => window.amapInstance.remove(label));
          }
          window.orderMarkers = [];
          let riderMarker = null, shopMarker = null, customerMarker = null;
          const tasks = [];
          // 先骑手
          if (order.riderAddress) {
            tasks.push(new Promise(resolve => {
              const riderSearch = new window.AMap.PlaceSearch({ city: '全国' });
              riderSearch.search(order.riderAddress, function(status, result) {
                if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                  const poi = result.poiList.pois[0];
                  riderMarker = new window.AMap.Marker({
                    position: poi.location,
                    map: window.amapInstance,
                    content: `
                      <span class=\"iconfont\" style=\"font-size:48px;color:#ff9800;\">&#xe60a;</span>
                    `,
                    offset: new window.AMap.Pixel(-24, -48),
                    animation: 'AMAP_ANIMATION_NONE',
                    draggable: true,
                    title: '无人机'
                  });
                }
                resolve();
              });
            }));
          }
          // 再商家
          if (order.restaurantAddress) {
            tasks.push(new Promise(resolve => {
              const shopSearch = new window.AMap.PlaceSearch({ city: '全国' });
              shopSearch.search(order.restaurantAddress, function(status, result) {
                if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                  const poi = result.poiList.pois[0];
                  shopMarker = new window.AMap.Marker({
                    position: poi.location,
                    map: window.amapInstance,
                    content: `
                      <div style="position: relative; display: inline-block;">
                        <span class="iconfont" style="font-size:48px;color:red;">&#xe601;</span>
                        <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: red; color: black; padding: 2px 6px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">取货点</div>
                      </div>
                    `,
                    offset: new window.AMap.Pixel(-24, -48),
                    title: '商家'
                  });
                }
                resolve();
              });
            }));
          }
          // 最后顾客
          if (order.address && order.address.address) {
            tasks.push(new Promise(resolve => {
              const userSearch = new window.AMap.PlaceSearch({ city: '全国' });
              userSearch.search(order.address.address, function(status, result) {
                if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                  const poi = result.poiList.pois[0];
                  customerMarker = new window.AMap.Marker({
                    position: poi.location,
                    map: window.amapInstance,
                    content: `
                      <div style="position: relative; display: inline-block;">
                        <span class="iconfont" style="font-size:48px;color:blue;">&#xe603;</span>
                        <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: blue; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">送达点</div>
                      </div>
                    `,
                    offset: new window.AMap.Pixel(-24, -48),
                    title: '顾客'
                  });
                }
                resolve();
              });
            }));
          }
          await Promise.all(tasks);
          // 只在全部有结果时才画线和标签
          if (riderMarker && shopMarker && customerMarker) {
            window.orderMarkers = [riderMarker, shopMarker, customerMarker];
            // 路线：骑手到商家（橙色），商家到顾客（蓝色）
            const riderToShopPath = new window.AMap.Polyline({
              path: [riderMarker.getPosition(), shopMarker.getPosition()],
              strokeColor: '#FF8C00',
              strokeWeight: 8,
              strokeStyle: 'solid',
              showDir: true,
              map: window.amapInstance
            });
            const shopToCustomerPath = new window.AMap.Polyline({
              path: [shopMarker.getPosition(), customerMarker.getPosition()],
              strokeColor: '#0066CC',
              strokeWeight: 8,
              strokeStyle: 'solid',
              showDir: true,
              map: window.amapInstance
            });
            window.orderPaths = [riderToShopPath, shopToCustomerPath];
            window.amapInstance.setFitView([riderMarker, shopMarker, customerMarker]);

            // 工具函数：强制转换为[lng, lat]数组
            function toLngLatArray(pos) {
              if (!pos) return [NaN, NaN];
              if (typeof pos.getLng === 'function' && typeof pos.getLat === 'function') {
                return [pos.getLng(), pos.getLat()];
              }
              if (typeof pos.lng === 'number' && typeof pos.lat === 'number') {
                return [pos.lng, pos.lat];
              }
              if (Array.isArray(pos) && pos.length === 2) {
                return pos;
              }
              return [NaN, NaN];
            }
            function isValidLngLat(obj) {
              return obj && typeof obj.lng === 'number' && typeof obj.lat === 'number'
                && isFinite(obj.lng) && isFinite(obj.lat) && !isNaN(obj.lng) && !isNaN(obj.lat);
            }
            // 全局getDistance函数
            function getDistance(p1, p2) {
              const R = 6371000;
              const dLat = (p2[1] - p1[1]) * Math.PI / 180;
              const dLng = (p2[0] - p1[0]) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              return R * c;
            }
            // 用setInterval手动实现动画
            function startMoveAlong(marker, path, speed, labelColor, labelType, onArrive) {
              if (!marker || !path || path.length < 2) return;
              const arrPath = path.map(toLngLatArray);
              if (arrPath.some(p => p.some(v => isNaN(v) || !isFinite(v)))) {
                alert('路径点非法，终止动画');
                return;
              }
              // 终止前一个动画
              if (marker._moveTimer) clearInterval(marker._moveTimer);
              // 计算距离和时间
              const totalDistance = getDistance(arrPath[0], arrPath[1]);
              const totalTime = totalDistance / speed; // 秒
              const startTime = Date.now();
              marker.setPosition(arrPath[0]);
              updateRiderTimeLabelV2(arrPath[0][0], arrPath[0][1], '', '', '#FF8C00', 'toShop');
              marker._moveTimer = setInterval(function() {
                const elapsed = (Date.now() - startTime) / 1000;
                let percent = Math.min(elapsed / totalTime, 1);
                let lng = arrPath[0][0] + (arrPath[1][0] - arrPath[0][0]) * percent;
                let lat = arrPath[0][1] + (arrPath[1][1] - arrPath[0][1]) * percent;
                marker.setPosition([lng, lat]);
                // 剩余时间
                let remain = Math.max(0, totalTime - elapsed);
                let remainMin = Math.ceil(remain / 60);
                // 剩余距离（米）
                let remainDistM = Math.max(0, totalDistance - percent * totalDistance);
                let remainDistStr = remainDistM >= 1000 ? (remainDistM/1000).toFixed(1) + 'km' : Math.round(remainDistM) + 'm';
                updateRiderTimeLabelV2(lng, lat, remainMin, remainDistStr, labelColor, labelType);
                if (percent >= 1) {
                  clearInterval(marker._moveTimer);
                  marker.setPosition(arrPath[1]);
                  if (onArrive) onArrive();
                }
              }, 1000/30);
            }
            // 启动动画：第一阶段
            if (riderMarker && shopMarker && customerMarker) {
              // 标记动画已启动
              window.orderAnimationState[order.id] = { started: true, currentStage: 'toShop' };
              let speed = 98 * 1000 / 3600; // 默认98km/h, 单位: m/s
              if (order && order.riderSpeed) {
                let s = parseFloat(order.riderSpeed);
                if (!isNaN(s) && s > 0) speed = s * 1000 / 3600;
              }
              let riderPos = toLngLatArray(riderMarker.getPosition());
              let shopPos = toLngLatArray(shopMarker.getPosition());
              let customerPos = toLngLatArray(customerMarker.getPosition());
              riderMarker.setPosition(riderPos);
              // 第一阶段动画
              startMoveAlong(
                riderMarker,
                [riderPos, shopPos],
                speed,
                '#FF8C00',
                'toShop',
                () => {
                  // 到达商家，切换到第二阶段
                  window.orderAnimationState[order.id].currentStage = 'toCustomer';
                  arriveShopTime = new Date();
                  pickupTime = arriveShopTime;
                  // 暂停5秒后再进行第二阶段
                  setTimeout(() => {
                    startMoveAlong(
                      riderMarker,
                      [shopPos, customerPos],
                      speed,
                      '#0066CC',
                      'toCustomer',
                      () => {
                        // 到达顾客，动画结束
                        window.orderAnimationState[order.id].currentStage = 'arrived';
                        completedTime = new Date();
                        if (window.riderTimeLabel) {
                          window.riderTimeLabel.setPosition(customerPos);
                          updateRiderTimeLabelV2(customerPos[0], customerPos[1], '', '', '#FF8C00', 'arrived');
                        }
                        renderOrderDeliveryDetail();
                      }
                    );
                  }, 5000);
                }
              );
            }
          } else {
            // 只显示已找到的marker
            window.orderMarkers = [riderMarker, shopMarker, customerMarker].filter(Boolean);
            window.amapInstance.setFitView(window.orderMarkers);
          }
        }
        // 配送详情渲染函数，动态显示时间（精确到秒，格式：12时34分56秒）
        function renderOrderDeliveryDetail() {
          const detailBox = document.querySelector('.bg-gray-50.rounded-lg.p-5 .space-y-3');
          if (!detailBox) return;
          function formatTime(t) {
            if (!t) return '';
            if (typeof t === 'string') t = new Date(t);
            if (!(t instanceof Date) || isNaN(t.getTime())) return '';
            return `${t.getHours().toString().padStart(2, '0')}时${t.getMinutes().toString().padStart(2, '0')}分${t.getSeconds().toString().padStart(2, '0')}秒`;
          }
          const html = `
            <div class="flex items-start">
              <div class="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
              <div>
                <p class="text-sm font-medium text-gray-800">配送员已取货</p>
                <p class="text-xs text-gray-500">${pickupTime ? formatTime(pickupTime) : ''}</p>
              </div>
            </div>
            <div class="flex items-start">
              <div class="w-2 h-2 rounded-full bg-yellow-500 mt-2 mr-3"></div>
              <div>
                <p class="text-sm font-medium text-gray-800">配送员已到达商家</p>
                <p class="text-xs text-gray-500">${arriveShopTime ? formatTime(arriveShopTime) : ''}</p>
              </div>
            </div>
            <div class="flex items-start">
              <div class="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <p class="text-sm font-medium text-gray-800">配送员正在前往您的地址</p>
                <p class="text-xs text-gray-500"></p>
              </div>
            </div>
            ${completedTime ? `<div class="flex items-start">
              <div class="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <p class="text-sm font-medium text-gray-800">已送达，感谢您的等待</p>
                <p class="text-xs text-gray-500">${formatTime(completedTime)}</p>
              </div>
            </div>` : ''}
          `;
          detailBox.innerHTML = html;
        }
        // 修改bindDynamicOrderMapBtns，点击"查看地图"时只显示地图和marker，不重启动画
        function bindDynamicOrderMapBtns() {
          document.body.addEventListener('click', async function(e) {
            const btn = e.target.closest('.dynamic-order-map-btn');
            if (btn) {
              // 获取订单id
              const card = btn.closest('.bg-white');
              let orderId = '';
              if (card) {
                const h2 = card.querySelector('h2');
                if (h2) {
                  const match = h2.textContent.match(/订单号：(.+)/);
                  if (match) orderId = match[1].trim();
                }
              }
              // 显示地图弹窗
              const mapModal = document.getElementById('mapModal');
              if (mapModal) {
                mapModal.classList.remove('hidden');
                if (!window.amapInstance) {
                  initOrderMap();
                } else {
                  setTimeout(() => { window.amapInstance && window.amapInstance.resize && window.amapInstance.resize(); }, 200);
                }
              }
              // 只显示，不重启动画
              if (orderId && window.db && window.db.getAllOrders) {
                await window.db.init();
                const allOrders = await window.db.getAllOrders();
                const order = allOrders.find(o => String(o.id) === orderId);
                if (order) {
                  // 兼容骑手地址
                  if (!order.riderAddress && order.riderId && window.db.getRider) {
                    try {
                      const rider = await window.db.getRider(order.riderId);
                      if (rider && rider.address) order.riderAddress = rider.address;
                    } catch(e) {}
                  }
                  markOrderAddressesOnMap(order, { forceRestart: false });
                }
              }
            }
          });
          // 关闭按钮
          const closeBtn = document.getElementById('closeMapModalBtn');
          if (closeBtn) {
            closeBtn.onclick = function() {
              document.getElementById('mapModal').classList.add('hidden');
            };
          }
        }
        // 页面加载后绑定
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', bindDynamicOrderMapBtns);
        } else {
          bindDynamicOrderMapBtns();
        }

        // 派单事件驱动动画启动
        window.addEventListener('orderAssignedToRider', function(e) {
          if (!window.amapInstance) return;
          window.db.getAllOrders().then(allOrders => {
            const order = allOrders.find(o => String(o.id) === String(e.detail.orderId));
            if (order) {
              if (!order.riderAddress && order.riderId && window.db.getRider) {
                window.db.getRider(order.riderId).then(rider => {
                  if (rider && rider.address) order.riderAddress = rider.address;
                  markOrderAddressesOnMap(order, { forceRestart: true });
                });
              } else {
                markOrderAddressesOnMap(order, { forceRestart: true });
              }
            }
          });
        });

        // 在markOrderAddressesOnMap函数作用域下定义updateRiderTimeLabelV2，供所有动画阶段调用
        function updateRiderTimeLabelV2(lng, lat, remainMin, remainDist, labelColor, labelType) {
          let html = '';
          // 获取当前速度
          let speed = 98;
          if (window._debugOrder && window._debugOrder.riderSpeed) {
            let s = parseFloat(window._debugOrder.riderSpeed);
            if (!isNaN(s) && s > 0) speed = s;
          }
          let speedInfo = `<div style=\"font-size:11px;font-weight:normal;\">当前速度：${speed} km/h</div>`;
          let triangle = `<div style=\"width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:10px solid ${labelColor};margin:0 auto;\"></div>`;
          if (labelType === 'toShop') {
            html = `<div style=\"background-color: ${labelColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap; text-align:center;\">到商家还有${remainMin}分<br>距离商家还有${remainDist}<br>${speedInfo}</div>${triangle}`;
          } else if (labelType === 'toCustomer') {
            html = `<div style=\"background-color: ${labelColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap; text-align:center;\">到顾客还有${remainMin}分<br>距离顾客还有${remainDist}<br>${speedInfo}</div>${triangle}`;
          } else if (labelType === 'arrived') {
            html = `<div style=\"background-color: #FF8C00; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;\">已送达<br>${speedInfo}</div>${triangle}`;
          }
          if (!window.riderTimeLabel) {
            window.riderTimeLabel = new window.AMap.Marker({
              position: [lng, lat],
              map: window.amapInstance,
              content: html,
              offset: new window.AMap.Pixel(-80, -120)
            });
          } else {
            window.riderTimeLabel.setPosition([lng, lat]);
            window.riderTimeLabel.setContent(html);
          }
        }
    } catch (error) {
        console.error('前台系统初始化失败:', error);
        // 如果初始化失败，显示错误信息
        restaurantList.innerHTML = '<div class="col-span-full text-center text-gray-500">前台系统初始化失败，请刷新页面重试</div>';
    }
}); 
