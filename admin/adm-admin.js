// 后台管理系统核心功能
document.addEventListener('DOMContentLoaded', async function() {
    console.log('后台管理系统开始初始化...');
    
    try {
        // 检查数据库对象是否存在
        if (!window.db) {
            throw new Error('数据库对象未找到，请检查database.js是否正确加载');
        }
        console.log('数据库对象检查通过');
        
        // 等待数据库初始化完成
        console.log('正在初始化数据库...');
        await window.db.init();
        console.log('后台管理系统：数据库初始化完成');
        
        // 测试数据库连接
        try {
            const restaurants = await window.db.getAllRestaurants();
            console.log(`数据库连接测试成功，获取到 ${restaurants.length} 个商家`);
        } catch (dbError) {
            console.error('数据库连接测试失败:', dbError);
            throw new Error(`数据库连接测试失败: ${dbError.message}`);
        }
        
        // 页面元素
        const loginPage = document.getElementById('loginPage');
        const mainPage = document.getElementById('mainPage');
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');
        const adminName = document.getElementById('adminName');
        
        // 商家管理元素
        const addRestaurantBtn = document.getElementById('addRestaurantBtn');
        const manageMenuBtn = document.getElementById('manageMenuBtn');
        const restaurantTableBody = document.getElementById('restaurantTableBody');
        
        // 模态框元素
        const restaurantModal = document.getElementById('restaurantModal');
        const menuModal = document.getElementById('menuModal');
        const menuItemModal = document.getElementById('menuItemModal');
        
        // 检查必要的DOM元素是否存在
        if (!loginPage || !mainPage || !loginForm) {
            throw new Error('必要的DOM元素未找到，请检查HTML结构');
        }
        
        console.log('DOM元素检查完成');
        
        // 全局变量
        let currentEditingRestaurant = null;
        let currentEditingMenuItem = null;
        let currentRestaurantForMenu = null;
        
        // 初始化
        await initSystem();
        
        // 初始化系统
        async function initSystem() {
            console.log('开始初始化系统...');
            
            // 检查登录状态
            checkLoginStatus();
            
            // 绑定事件
            bindEvents();
            
            // 加载初始数据
            await loadRestaurants();
            
            console.log('系统初始化完成');
        }
        
        // 检查登录状态
        function checkLoginStatus() {
            const isLoggedIn = localStorage.getItem('adminLoggedIn');
            console.log('检查登录状态:', isLoggedIn);
            
            // 为了安全考虑，每次打开页面都需要重新登录
            // 不自动跳转到管理界面
            showLoginPage();
        }
        
        // 显示登录页面
        function showLoginPage() {
            console.log('显示登录页面');
            loginPage.classList.remove('hidden');
            mainPage.classList.add('hidden');
        }
        
        // 显示主页面
        function showMainPage() {
            console.log('显示主页面');
            loginPage.classList.add('hidden');
            mainPage.classList.remove('hidden');
            const username = localStorage.getItem('adminUsername') || '管理员';
            adminName.textContent = username;
        }
        
        // 绑定事件
        function bindEvents() {
            console.log('绑定事件...');
            
            // 登录表单
            loginForm.addEventListener('submit', handleLogin);
            
            // 退出登录
            logoutBtn.addEventListener('click', handleLogout);
            
            // 商家管理
            addRestaurantBtn.addEventListener('click', () => showRestaurantModal());
            manageMenuBtn.addEventListener('click', handleManageMenu);
            
            // 模态框关闭
            document.getElementById('closeModal').addEventListener('click', hideRestaurantModal);
            document.getElementById('closeMenuModal').addEventListener('click', hideMenuModal);
            document.getElementById('closeMenuItemModal').addEventListener('click', hideMenuItemModal);
            document.getElementById('cancelBtn').addEventListener('click', hideRestaurantModal);
            document.getElementById('cancelMenuItemBtn').addEventListener('click', hideMenuItemModal);
            
            // 表单提交
            document.getElementById('restaurantForm').addEventListener('submit', handleRestaurantSubmit);
            document.getElementById('menuItemForm').addEventListener('submit', handleMenuItemSubmit);
            
            // 添加菜品按钮
            document.getElementById('addMenuItemBtn').addEventListener('click', () => showMenuItemModal());
            
            // 详细地址地图选点逻辑
            const addressInput = document.getElementById('restaurantAddress');
            if (addressInput) {
                addressInput.addEventListener('click', function() {
                    showMapModal();
                });
            }
            
            console.log('事件绑定完成');
        }
        
        // 监听地图选点回传
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'amap-location') {
                var input = document.getElementById('restaurantAddress');
                if (input) input.value = e.data.address;
                if (input) {
                    input.dataset.lng = e.data.lng || '';
                    input.dataset.lat = e.data.lat || '';
                }
            }
        });
        
        // 处理登录
        function handleLogin(e) {
            e.preventDefault();
            console.log('处理登录请求...');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            console.log('用户名:', username);
            console.log('密码长度:', password.length);
            
            // 简单的登录验证（实际项目中应该连接后端API）
            if (username === 'admin' && password === '123456') {
                console.log('登录验证成功');
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminUsername', username);
                showMainPage();
                console.log('已跳转到管理界面');
            } else {
                console.log('登录验证失败');
                alert('用户名或密码错误！\n默认账号：admin\n默认密码：123456');
            }
        }
        
        // 处理退出登录
        function handleLogout() {
            console.log('退出登录');
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminUsername');
            showLoginPage();
        }
        
        // 加载商家数据
        async function loadRestaurants() {
            try {
                const restaurants = await window.db.getAllRestaurants();
                renderRestaurantTable(restaurants);
            } catch (error) {
                console.error('加载商家数据失败:', error);
                alert('加载商家数据失败，请刷新页面重试');
            }
        }
        
        // 渲染商家表格
        function renderRestaurantTable(restaurants) {
            restaurantTableBody.innerHTML = '';
            
            if (restaurants.length === 0) {
                restaurantTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无商家数据</td></tr>';
                return;
            }
            
            restaurants.forEach(restaurant => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <img class="h-10 w-10 rounded-lg object-cover" src="${restaurant.image}" alt="${restaurant.name}">
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${restaurant.name}</div>
                                <div class="text-sm text-gray-500">配送时间：${restaurant.deliveryTime}分钟</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <i class="fa fa-star text-yellow-400 mr-1"></i>
                            <span class="text-sm text-gray-900">${restaurant.rating}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${restaurant.sales}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">¥${restaurant.minOrder}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">¥${restaurant.deliveryFee}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${restaurant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${restaurant.status === 'active' ? '营业中' : '暂停营业'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editRestaurant('${restaurant.id}')" class="text-primary hover:text-primary/80 mr-3">
                            <i class="fa fa-edit"></i> 编辑
                        </button>
                        <button onclick="deleteRestaurant('${restaurant.id}')" class="text-red-600 hover:text-red-800 mr-3">
                            <i class="fa fa-trash"></i> 删除
                        </button>
                        <button onclick="manageRestaurantMenu('${restaurant.id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fa fa-list"></i> 菜品
                        </button>
                    </td>
                `;
                restaurantTableBody.appendChild(row);
            });
        }
        
        // 显示商家模态框
        function showRestaurantModal(restaurant = null) {
            currentEditingRestaurant = restaurant;
            const modal = document.getElementById('restaurantModal');
            const title = document.getElementById('modalTitle');
            const form = document.getElementById('restaurantForm');
            
            if (restaurant) {
                title.textContent = '编辑商家';
                fillRestaurantForm(restaurant);
            } else {
                title.textContent = '添加商家';
                form.reset();
            }
            
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-95');
            modal.querySelector('.bg-white').classList.add('scale-100');
        }
        
        // 隐藏商家模态框
        function hideRestaurantModal() {
            const modal = document.getElementById('restaurantModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-100');
            modal.querySelector('.bg-white').classList.add('scale-95');
            currentEditingRestaurant = null;
        }
        
        // 填充商家表单
        function fillRestaurantForm(restaurant) {
            document.getElementById('restaurantName').value = restaurant.name;
            document.getElementById('restaurantImage').value = restaurant.image;
            document.getElementById('restaurantRating').value = restaurant.rating;
            document.getElementById('restaurantSales').value = restaurant.sales;
            document.getElementById('restaurantMinOrder').value = restaurant.minOrder;
            document.getElementById('restaurantDeliveryFee').value = restaurant.deliveryFee;
            document.getElementById('restaurantDeliveryTime').value = restaurant.deliveryTime;
            document.getElementById('restaurantStatus').value = restaurant.status;
            document.getElementById('restaurantAddress').value = restaurant.address;
            document.getElementById('restaurantPhone').value = restaurant.phone;
            document.getElementById('restaurantBackupPhone').value = restaurant.backupPhone;
        }
        
        // 处理商家表单提交
        async function handleRestaurantSubmit(e) {
            e.preventDefault();
            
            const restaurantData = {
                name: document.getElementById('restaurantName').value,
                image: document.getElementById('restaurantImage').value,
                rating: parseFloat(document.getElementById('restaurantRating').value),
                sales: parseInt(document.getElementById('restaurantSales').value),
                minOrder: parseFloat(document.getElementById('restaurantMinOrder').value),
                deliveryFee: parseFloat(document.getElementById('restaurantDeliveryFee').value),
                deliveryTime: document.getElementById('restaurantDeliveryTime').value,
                status: document.getElementById('restaurantStatus').value,
                address: document.getElementById('restaurantAddress').value,
                phone: document.getElementById('restaurantPhone').value,
                backupPhone: document.getElementById('restaurantBackupPhone').value
            };
            
            try {
                if (currentEditingRestaurant) {
                    // 编辑现有商家
                    restaurantData.id = currentEditingRestaurant.id;
                    await window.db.updateRestaurant(restaurantData);
                    alert('商家信息更新成功！');
                } else {
                    // 添加新商家
                    restaurantData.id = Date.now().toString();
                    await window.db.addRestaurant(restaurantData);
                    alert('商家添加成功！');
                }
                
                await loadRestaurants();
                hideRestaurantModal();
            } catch (error) {
                console.error('保存商家失败:', error);
                alert('保存失败，请重试');
            }
        }
        
        // 删除商家
        window.deleteRestaurant = async function(id) {
            if (confirm('确定要删除这个商家吗？删除后该商家的所有菜品也会被删除！')) {
                try {
                    // 先删除该商家的所有菜品
                    const menuItems = await window.db.getMenuItemsByRestaurant(id);
                    for (const item of menuItems) {
                        await window.db.deleteMenuItem(item.id);
                    }
                    
                    // 再删除商家
                    await window.db.deleteRestaurant(id);
                    await loadRestaurants();
                    alert('商家删除成功！');
                } catch (error) {
                    console.error('删除商家失败:', error);
                    alert('删除失败，请重试');
                }
            }
        };
        
        // 编辑商家
        window.editRestaurant = async function(id) {
            try {
                const restaurant = await window.db.getRestaurant(id);
                if (restaurant) {
                    showRestaurantModal(restaurant);
                }
            } catch (error) {
                console.error('获取商家信息失败:', error);
                alert('获取商家信息失败，请重试');
            }
        };
        
        // 处理菜品管理
        function handleManageMenu() {
            alert('请先选择一个商家来管理菜品');
        }
        
        // 管理商家菜品
        window.manageRestaurantMenu = async function(restaurantId) {
            try {
                const restaurant = await window.db.getRestaurant(restaurantId);
                if (restaurant) {
                    currentRestaurantForMenu = restaurant;
                    showMenuModal(restaurant);
                }
            } catch (error) {
                console.error('获取商家信息失败:', error);
                alert('获取商家信息失败，请重试');
            }
        };
        
        // 显示菜品管理模态框
        function showMenuModal(restaurant) {
            const modal = document.getElementById('menuModal');
            document.getElementById('currentRestaurantName').textContent = restaurant.name;
            
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-95');
            modal.querySelector('.bg-white').classList.add('scale-100');
            
            loadMenuItems(restaurant.id);
        }
        
        // 隐藏菜品管理模态框
        function hideMenuModal() {
            const modal = document.getElementById('menuModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-100');
            modal.querySelector('.bg-white').classList.add('scale-95');
            currentRestaurantForMenu = null;
        }
        
        // 加载菜品列表
        async function loadMenuItems(restaurantId) {
            try {
                const menuItems = await window.db.getMenuItemsByRestaurant(restaurantId);
                renderMenuItems(menuItems);
            } catch (error) {
                console.error('加载菜品失败:', error);
                alert('加载菜品失败，请重试');
            }
        }
        
        // 渲染菜品列表
        function renderMenuItems(menuItems) {
            const menuItemsList = document.getElementById('menuItemsList');
            menuItemsList.innerHTML = '';
            
            if (menuItems.length === 0) {
                menuItemsList.innerHTML = '<div class="text-center text-gray-500">暂无菜品</div>';
                return;
            }
            
            menuItems.forEach(item => {
                const menuItem = document.createElement('div');
                menuItem.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
                menuItem.innerHTML = `
                    <div class="flex items-center">
                        <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg">
                        <div class="ml-4">
                            <h4 class="font-medium">${item.name}</h4>
                            <p class="text-sm text-gray-500">${item.description}</p>
                            <p class="text-primary font-bold">¥${item.price}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="editMenuItem('${item.id}')" class="text-primary hover:text-primary/80">
                            <i class="fa fa-edit"></i> 编辑
                        </button>
                        <button onclick="deleteMenuItem('${item.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fa fa-trash"></i> 删除
                        </button>
                    </div>
                `;
                menuItemsList.appendChild(menuItem);
            });
        }
        
        // 显示菜品模态框
        function showMenuItemModal(menuItem = null) {
            currentEditingMenuItem = menuItem;
            const modal = document.getElementById('menuItemModal');
            const title = document.getElementById('menuItemModalTitle');
            const form = document.getElementById('menuItemForm');
            
            if (menuItem) {
                title.textContent = '编辑菜品';
                fillMenuItemForm(menuItem);
            } else {
                title.textContent = '添加菜品';
                form.reset();
            }
            
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-95');
            modal.querySelector('.bg-white').classList.add('scale-100');
        }
        
        // 隐藏菜品模态框
        function hideMenuItemModal() {
            const modal = document.getElementById('menuItemModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.querySelector('.bg-white').classList.remove('scale-100');
            modal.querySelector('.bg-white').classList.add('scale-95');
            currentEditingMenuItem = null;
        }
        
        // 填充菜品表单
        function fillMenuItemForm(menuItem) {
            document.getElementById('menuItemName').value = menuItem.name;
            document.getElementById('menuItemPrice').value = menuItem.price;
            document.getElementById('menuItemImage').value = menuItem.image;
            document.getElementById('menuItemDescription').value = menuItem.description;
        }
        
        // 处理菜品表单提交
        async function handleMenuItemSubmit(e) {
            e.preventDefault();
            
            if (!currentRestaurantForMenu) {
                alert('请先选择一个商家');
                return;
            }
            
            const menuItemData = {
                name: document.getElementById('menuItemName').value,
                price: parseFloat(document.getElementById('menuItemPrice').value),
                image: document.getElementById('menuItemImage').value,
                description: document.getElementById('menuItemDescription').value,
                restaurantId: currentRestaurantForMenu.id
            };
            
            try {
                if (currentEditingMenuItem) {
                    // 编辑现有菜品
                    menuItemData.id = currentEditingMenuItem.id;
                    await window.db.updateMenuItem(menuItemData);
                    alert('菜品更新成功！');
                } else {
                    // 添加新菜品
                    menuItemData.id = Date.now().toString();
                    await window.db.addMenuItem(menuItemData);
                    alert('菜品添加成功！');
                }
                
                await loadMenuItems(currentRestaurantForMenu.id);
                hideMenuItemModal();
            } catch (error) {
                console.error('保存菜品失败:', error);
                alert('保存失败，请重试');
            }
        }
        
        // 删除菜品
        window.deleteMenuItem = async function(id) {
            if (confirm('确定要删除这个菜品吗？')) {
                try {
                    await window.db.deleteMenuItem(id);
                    await loadMenuItems(currentRestaurantForMenu.id);
                    alert('菜品删除成功！');
                } catch (error) {
                    console.error('删除菜品失败:', error);
                    alert('删除失败，请重试');
                }
            }
        };
        
        // 编辑菜品
        window.editMenuItem = async function(id) {
            try {
                const menuItems = await window.db.getMenuItemsByRestaurant(currentRestaurantForMenu.id);
                const menuItem = menuItems.find(m => m.id === id);
                if (menuItem) {
                    showMenuItemModal(menuItem);
                }
            } catch (error) {
                console.error('获取菜品信息失败:', error);
                alert('获取菜品信息失败，请重试');
            }
        };

        // 高德地图POI搜索与定位弹窗逻辑
        window._AMapSecurityConfig = { securityJsCode: '88131e5e8d6707e00b465f86aae89504' };
        function showMapModal() {
          document.getElementById('mapModal').style.display = 'flex';
          if (!window._amapInited) {
            var script = document.createElement('script');
            script.src = 'https://webapi.amap.com/maps?v=2.0&key=c424814a68db2d5a6f11750e81458a69';
            script.onload = initAmapModal;
            document.body.appendChild(script);
            window._amapInited = true;
          }
        }
        function hideMapModal() {
          document.getElementById('mapModal').style.display = 'none';
        }
        function initAmapModal() {
          var map = new AMap.Map('map', { zoom: 13, center: [116.397428, 39.90923] });
          var marker = new AMap.Marker({ map: map });
          var infoWindow = null;
          var selectedAddress = '';
          document.getElementById('myLocationBtn').onclick = function() { locateMe(); };
          function locateMe() {
            AMap.plugin('AMap.Geolocation', function() {
              var geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 });
              geolocation.getCurrentPosition(function(status, result) {
                if (status === 'complete' && result.position) {
                  var lnglat = [result.position.lng, result.position.lat];
                  map.setCenter(lnglat);
                  marker.setPosition(lnglat);
                  if (infoWindow) infoWindow.close();
                  infoWindow = new AMap.InfoWindow({ content: '已定位到当前位置', offset: new AMap.Pixel(0, -30) });
                  infoWindow.open(map, lnglat);
                } else {
                  alert('定位失败，请检查浏览器权限或网络');
                }
              });
            });
          }
          function setAddressAndClose(addr) {
            var addrInput = document.getElementById('restaurantAddress');
            if(addrInput) addrInput.value = addr;
            hideMapModal();
          }
          AMap.plugin(['AMap.Geocoder', 'AMap.DistrictSearch', 'AMap.PlaceSearch'], function() {
            window.geocoder = new AMap.Geocoder();
            var placeSearch = new AMap.PlaceSearch({ map: map });
            window.infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });
            AMap.plugin('AMap.Autocomplete', function() {
              var autoComplete = new AMap.Autocomplete({ input: 'searchInput' });
              var searchInput = document.getElementById('searchInput');
              var searchResult = document.getElementById('searchResult');
              var activeIndex = -1;
              var tips = [];
              searchInput.oninput = function () {
                var inputVal = this.value.trim();
                searchResult.innerHTML = '';
                activeIndex = -1;
                tips = [];
                if (!inputVal) { searchResult.style.display = 'none'; return; }
                autoComplete.search(inputVal, function (status, data) {
                  if (status === 'complete' && data.tips.length) {
                    searchResult.innerHTML = '';
                    tips = data.tips.filter(function(item){ return item.name; });
                    tips.forEach(function(item, idx) {
                      var li = document.createElement('li');
                      li.innerText = item.name + (item.district ? '（' + item.district + '）' : '');
                      li.style.padding = '6px 12px';
                      li.style.cursor = 'pointer';
                      li.onmouseenter = function() { setActive(idx); };
                      li.onmouseleave = function() { setActive(-1); };
                      li.onclick = function () {
                        searchInput.value = item.name;
                        searchResult.style.display = 'none';
                        doPlaceSearch(item.name);
                      };
                      searchResult.appendChild(li);
                    });
                    searchResult.style.display = 'block';
                  } else {
                    searchResult.style.display = 'none';
                  }
                });
              };
              searchInput.onkeydown = function(e) {
                if (searchResult.style.display === 'block' && tips.length) {
                  if (e.key === 'ArrowDown') {
                    activeIndex = (activeIndex + 1) % tips.length;
                    setActive(activeIndex);
                    e.preventDefault();
                  } else if (e.key === 'ArrowUp') {
                    activeIndex = (activeIndex - 1 + tips.length) % tips.length;
                    setActive(activeIndex);
                    e.preventDefault();
                  } else if (e.key === 'Enter' && activeIndex >= 0) {
                    searchInput.value = tips[activeIndex].name;
                    searchResult.style.display = 'none';
                    doPlaceSearch(tips[activeIndex].name);
                    e.preventDefault();
                  }
                }
              };
              searchInput.onblur = function() { setTimeout(function(){ searchResult.style.display = 'none'; }, 200); };
              function setActive(idx) {
                Array.from(searchResult.children).forEach(function(li, i) {
                  li.style.background = (i === idx) ? '#e6f7ff' : '';
                });
                activeIndex = idx;
              }
            });
            document.getElementById('searchBtn').onclick = function() {
              var keyword = document.getElementById('searchInput').value.trim();
              if (!keyword) return;
              var district = new AMap.DistrictSearch({ subdistrict: 0, extensions: 'all', level: 'district' });
              district.search(keyword, function(status, result) {
                if (status === 'complete' && result.districtList && result.districtList.length && result.districtList[0].boundaries) {
                  if (window._districtPolygons) { window._districtPolygons.forEach(function(p) { map.remove(p); }); }
                  window._districtPolygons = [];
                  var bounds = result.districtList[0].boundaries;
                  for (var i = 0; i < bounds.length; i++) {
                    var polygon = new AMap.Polygon({ map: map, path: bounds[i], strokeColor: '#FF33FF', strokeWeight: 2, fillColor: '#1791fc', fillOpacity: 0.1 });
                    window._districtPolygons.push(polygon);
                  }
                  map.setFitView(window._districtPolygons);
                  document.getElementById('addressBar').textContent = '已为您高亮显示 "' + keyword + '" 的行政区划';
                } else {
                  doPlaceSearch(keyword);
                }
              });
            };
            map.on('click', function(e) {
              marker.setPosition(e.lnglat);
              window.geocoder.getAddress(e.lnglat, function(status, result) {
                if (status === 'complete' && result.regeocode) {
                  var addr = result.regeocode.formattedAddress;
                  document.getElementById('addressBar').textContent = '点击位置地址：' + addr;
                  // 每次都新建InfoWindow，避免被旧对象干扰
                  var infoHtml = '<div style="font-size:15px;max-width:220px;line-height:1.5;">' + addr + '<br>' + '<button id="confirmAddrBtn" data-address="' + (addr || '') + '" style="margin-top:8px;padding:4px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">确认</button>' + '</div>';
                  var tempInfoWindow = new AMap.InfoWindow({ content: infoHtml, offset: new AMap.Pixel(0, -30) });
                  tempInfoWindow.open(map, e.lnglat);
                  setTimeout(function() {
                    var btn = document.getElementById('confirmAddrBtn');
                    if (btn) {
                      btn.onclick = function() {
                        var addr = btn.getAttribute('data-address');
                        if(addr) setAddressAndClose(addr);
                        tempInfoWindow.close();
                      };
                    }
                  }, 300);
                } else {
                  document.getElementById('addressBar').textContent = '无法获取该点地址';
                }
              });
            });
          });
          function doPlaceSearch(keyword) {
            AMap.plugin('AMap.PlaceSearch', function() {
              var placeSearch = new AMap.PlaceSearch({ pageSize: 10, pageIndex: 1, city: '全国', map: null });
              placeSearch.search(keyword, function(status, result) {
                if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                  var firstPoi = result.poiList.pois[0];
                  if (firstPoi && firstPoi.location) {
                    map.setCenter(firstPoi.location);
                    marker.setPosition(firstPoi.location);
                    if (window.geocoder) {
                      window.geocoder.getAddress(firstPoi.location, function(status, result) {
                        var addr = '';
                        if (status === 'complete' && result.regeocode) {
                          addr = result.regeocode.formattedAddress;
                          selectedAddress = addr;
                        } else {
                          addr = '';
                          selectedAddress = '';
                        }
                        var infoHtml = '<div style="font-size:15px;max-width:220px;line-height:1.5;">' + (firstPoi.name ? '<b>' + firstPoi.name + '</b><br>' : '') + (addr ? addr + '<br>' : '') + '<button id="confirmAddrBtn" data-address="' + (addr || '') + '" style="margin-top:8px;padding:4px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">确定</button>' + '</div>';
                        if (window.infoWindow) window.infoWindow.close();
                        window.infoWindow = new AMap.InfoWindow({ content: infoHtml, offset: new AMap.Pixel(0, -30) });
                        window.infoWindow.open(map, firstPoi.location);
                        setTimeout(function() {
                          var btn = document.getElementById('confirmAddrBtn');
                          if (btn) {
                            btn.onclick = function() {
                              var addr = btn.getAttribute('data-address');
                              if(addr) setAddressAndClose(addr);
                              window.infoWindow.close();
                            };
                          }
                        }, 300);
                      });
                    }
                  }
                } else {
                  alert('未找到相关地点');
                }
              });
            });
          }
          document.getElementById('closeMapBtn').onclick = hideMapModal;
        }
    } catch (error) {
        console.error('后台管理系统初始化失败:', error);
        alert('后台管理系统初始化失败，请刷新页面重试');
    }
}); 