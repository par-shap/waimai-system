// 商家管理模块（seller.js）
// 负责商家信息的增删查改，基于 IndexedDB

const RESTAURANT_STORE = 'restaurants';

// 初始化 restaurants 表（如未存在）
export async function initRestaurantStore(dbName, dbVersion) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(RESTAURANT_STORE)) {
                const restaurantStore = db.createObjectStore(RESTAURANT_STORE, { keyPath: 'id' });
                restaurantStore.createIndex('name', 'name', { unique: false });
                restaurantStore.createIndex('status', 'status', { unique: false });
            }
        };
        request.onsuccess = function(event) {
            event.target.result.close();
            resolve();
        };
        request.onerror = function(event) {
            reject(event);
        };
    });
}

// 新增商家
export async function addRestaurant(dbName, dbVersion, restaurant) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readwrite');
            const store = tx.objectStore(RESTAURANT_STORE);
            const addReq = store.add(restaurant);
            addReq.onsuccess = function() { db.close(); resolve(true); };
            addReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 更新商家
export async function updateRestaurant(dbName, dbVersion, restaurant) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readwrite');
            const store = tx.objectStore(RESTAURANT_STORE);
            const putReq = store.put(restaurant);
            putReq.onsuccess = function() { db.close(); resolve(true); };
            putReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 删除商家
export async function deleteRestaurant(dbName, dbVersion, id) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readwrite');
            const store = tx.objectStore(RESTAURANT_STORE);
            const delReq = store.delete(id);
            delReq.onsuccess = function() { db.close(); resolve(true); };
            delReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取单个商家
export async function getRestaurant(dbName, dbVersion, id) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readonly');
            const store = tx.objectStore(RESTAURANT_STORE);
            const getReq = store.get(id);
            getReq.onsuccess = function() { db.close(); resolve(getReq.result); };
            getReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取所有商家
export async function getAllRestaurants(dbName, dbVersion) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readonly');
            const store = tx.objectStore(RESTAURANT_STORE);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = function() { db.close(); resolve(getAllReq.result); };
            getAllReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取所有激活商家
export async function getActiveRestaurants(dbName, dbVersion) {
    await initRestaurantStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RESTAURANT_STORE, 'readonly');
            const store = tx.objectStore(RESTAURANT_STORE);
            const index = store.index('status');
            const getAllReq = index.getAll('active');
            getAllReq.onsuccess = function() { db.close(); resolve(getAllReq.result); };
            getAllReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
} 