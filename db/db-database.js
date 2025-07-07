// 本地数据库管理模块 - 使用IndexedDB
// 用户表相关常量
const USER_STORE = 'users';

class LocalDatabase {
    constructor() {
        this.dbName = 'TakeoutSystemDB';
        this.dbVersion = 3;
        this.db = null;
        this.isInitialized = false;
    }

    // 初始化数据库
    async init() {
        if (this.isInitialized) {
            return this.db;
        }
        // 检查数据库表结构是否完整，不完整则删除数据库强制重建
        let dbs = [];
        if (typeof indexedDB.databases === 'function') {
            try {
                dbs = await indexedDB.databases();
            } catch (e) {
                dbs = [];
            }
        }
        if (Array.isArray(dbs)) {
            const dbInfo = dbs.find(d => d.name === this.dbName);
            if (dbInfo) {
                // 尝试打开数据库，检查表结构
                const checkReq = indexedDB.open(this.dbName, this.dbVersion);
                checkReq.onsuccess = (event) => {
                    const db = event.target.result;
                    const requiredStores = ['restaurants', 'menuItems', 'orders', 'userAddresses', 'riders', 'users'];
                    let missing = false;
                    for (const store of requiredStores) {
                        if (!db.objectStoreNames.contains(store)) {
                            missing = true;
                            break;
                        }
                    }
                    db.close();
                    if (missing) {
                        // 删除数据库并刷新页面
                        indexedDB.deleteDatabase(this.dbName).onsuccess = () => {
                            location.reload();
                        };
                    }
                };
            }
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('数据库打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('数据库连接成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建商家表
                if (!db.objectStoreNames.contains('restaurants')) {
                    const restaurantStore = db.createObjectStore('restaurants', { keyPath: 'id' });
                    restaurantStore.createIndex('name', 'name', { unique: false });
                    restaurantStore.createIndex('status', 'status', { unique: false });
                }

                // 创建菜品表
                if (!db.objectStoreNames.contains('menuItems')) {
                    const menuStore = db.createObjectStore('menuItems', { keyPath: 'id' });
                    menuStore.createIndex('restaurantId', 'restaurantId', { unique: false });
                    menuStore.createIndex('name', 'name', { unique: false });
                }

                // 创建订单表
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('restaurantId', 'restaurantId', { unique: false });
                    orderStore.createIndex('status', 'status', { unique: false });
                    orderStore.createIndex('createTime', 'createTime', { unique: false });
                }

                // 创建用户地址表
                if (!db.objectStoreNames.contains('userAddresses')) {
                    const addressStore = db.createObjectStore('userAddresses', { keyPath: 'id' });
                    addressStore.createIndex('userId', 'userId', { unique: false });
                }

                // 创建骑手表
                if (!db.objectStoreNames.contains('riders')) {
                    const riderStore = db.createObjectStore('riders', { keyPath: 'id' });
                    riderStore.createIndex('status', 'status', { unique: false });
                }

                // 创建用户表
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }

                console.log('数据库表创建完成');
            };
        });
    }

    // 等待数据库初始化完成
    async waitForDB() {
        if (!this.isInitialized) {
            await this.init();
        }
        return this.db;
    }

    // 商家相关操作
    async addRestaurant(restaurant) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readwrite');
            const store = transaction.objectStore('restaurants');
            const request = store.add(restaurant);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateRestaurant(restaurant) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readwrite');
            const store = transaction.objectStore('restaurants');
            const request = store.put(restaurant);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRestaurant(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readwrite');
            const store = transaction.objectStore('restaurants');
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRestaurant(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readonly');
            const store = transaction.objectStore('restaurants');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRestaurants() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readonly');
            const store = transaction.objectStore('restaurants');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getActiveRestaurants() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['restaurants'], 'readonly');
            const store = transaction.objectStore('restaurants');
            const index = store.index('status');
            const request = index.getAll('active');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 菜品相关操作
    async addMenuItem(menuItem) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['menuItems'], 'readwrite');
            const store = transaction.objectStore('menuItems');
            const request = store.add(menuItem);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateMenuItem(menuItem) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['menuItems'], 'readwrite');
            const store = transaction.objectStore('menuItems');
            const request = store.put(menuItem);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteMenuItem(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['menuItems'], 'readwrite');
            const store = transaction.objectStore('menuItems');
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMenuItemsByRestaurant(restaurantId) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['menuItems'], 'readonly');
            const store = transaction.objectStore('menuItems');
            const index = store.index('restaurantId');
            const request = index.getAll(restaurantId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllMenuItems() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['menuItems'], 'readonly');
            const store = transaction.objectStore('menuItems');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 订单相关操作
    async addOrder(order) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const request = store.add(order);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateOrder(order) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const request = store.put(order);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 新增：彻底删除订单
    async deleteOrder(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const request = store.delete(String(id));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllOrders() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getOrder(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const request = store.get(parseInt(id));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 用户地址相关操作
    async saveUserAddress(address) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['userAddresses'], 'readwrite');
            const store = transaction.objectStore('userAddresses');
            address.id = address.userId;
            const request = store.put(address);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserAddress() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['userAddresses'], 'readonly');
            const store = transaction.objectStore('userAddresses');
            const request = store.getAll();

            request.onsuccess = () => {
                const addresses = request.result;
                resolve(addresses.length > 0 ? addresses[0] : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllUserAddresses() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['userAddresses'], 'readonly');
            const store = transaction.objectStore('userAddresses');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 用户信息相关操作
    async saveUserInfo(userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }
    async getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
    async removeUserInfo() {
        localStorage.removeItem('userInfo');
    }

    // 骑手相关操作
    async addRider(rider) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['riders'], 'readwrite');
            const store = transaction.objectStore('riders');
            const request = store.add(rider);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async updateRider(rider) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['riders'], 'readwrite');
            const store = transaction.objectStore('riders');
            const request = store.put(rider);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getAllRiders() {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['riders'], 'readonly');
            const store = transaction.objectStore('riders');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getRider(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['riders'], 'readonly');
            const store = transaction.objectStore('riders');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 删除骑手
    async deleteRider(id) {
        const db = await this.waitForDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['riders'], 'readwrite');
            const store = transaction.objectStore('riders');
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 用户表相关
    async addUser(user) {
        await this.init();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = function(event) {
                const db = event.target.result;
                const tx = db.transaction(USER_STORE, 'readwrite');
                const store = tx.objectStore(USER_STORE);
                const addReq = store.add(user);
                addReq.onsuccess = function() { db.close(); resolve(true); };
                addReq.onerror = function(e) { db.close(); reject(e); };
            };
            request.onerror = reject;
        });
    }
    // 通过id获取用户
    async getUserById(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = function(event) {
                const db = event.target.result;
                const tx = db.transaction(USER_STORE, 'readonly');
                const store = tx.objectStore(USER_STORE);
                const getReq = store.get(id);
                getReq.onsuccess = function() { db.close(); resolve(getReq.result); };
                getReq.onerror = function(e) { db.close(); reject(e); };
            };
            request.onerror = reject;
        });
    }
    // 获取所有用户
    async getAllUsers() {
        await this.init();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = function(event) {
                const db = event.target.result;
                const tx = db.transaction(USER_STORE, 'readonly');
                const store = tx.objectStore(USER_STORE);
                const getAllReq = store.getAll();
                getAllReq.onsuccess = function() { db.close(); resolve(getAllReq.result); };
                getAllReq.onerror = function(e) { db.close(); reject(e); };
            };
            request.onerror = reject;
        });
    }
    // 校验id+密码
    async validateUser(id, password) {
        const user = await this.getUserById(id);
        if (user && user.password === password) return user;
        return null;
    }

    // 删除用户
    async deleteUser(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = function(event) {
                const db = event.target.result;
                const tx = db.transaction(USER_STORE, 'readwrite');
                const store = tx.objectStore(USER_STORE);
                const delReq = store.delete(id);
                delReq.onsuccess = function() { db.close(); resolve(true); };
                delReq.onerror = function(e) { db.close(); reject(e); };
            };
            request.onerror = reject;
        });
    }
}

// 创建全局数据库实例
window.db = new LocalDatabase();

// 检测用户窗口渲染
window.renderUserCheckWindow = async function() {
  const userListTable = document.getElementById('userListTable');
  if (!userListTable) return;
  const users = await window.db.getAllUsers();
  if (!users || users.length === 0) {
    userListTable.innerHTML = '<div class="text-gray-400">暂无注册用户</div>';
    return;
  }
  userListTable.innerHTML = `<table class="min-w-full text-sm"><thead><tr><th class="px-2 py-1">ID</th><th class="px-2 py-1">昵称</th><th class="px-2 py-1">头像</th><th class="px-2 py-1">密码</th></tr></thead><tbody>${users.map(u => `<tr><td class="border px-2 py-1">${u.id}</td><td class="border px-2 py-1">${u.nickname}</td><td class="border px-2 py-1"><img src="${u.avatar}" class="w-8 h-8 rounded-full" /></td><td class="border px-2 py-1">${u.password}</td></tr>`).join('')}</tbody></table>`;
};
// 页面加载时自动渲染
if (document.getElementById('userListTable')) window.renderUserCheckWindow();
